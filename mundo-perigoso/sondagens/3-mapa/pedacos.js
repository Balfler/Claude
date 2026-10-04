/* ============================================================
   SONDAGEM 3 -- O MAPA AOS PEDACOS, PELO SERVIDOR
   ------------------------------------------------------------
   A pergunta: da para o segredo nao ir no cliente?

   Hoje o build embute o mapa inteiro no HTML: quem abre o arquivo tem a
   ilha toda, as passagens secretas e o sorteio delas. A tese do jogo pede o
   contrario -- o servidor manda o mapa aos pedacos, conforme o jogador
   chega, e o segredo so quando descoberto.

   Esta sondagem mede, no node, com o mapa e o motor de verdade:

     1. quanto pesa cada pedaco de 32x32 do MAPA 2 (a unidade que o formato
        ja tem), cru e comprimido;
     2. quanto o servidor manda numa caminhada pela ilha de 650, contra o
        mapa inteiro;
     3. o que o servidor esconde: dos segredos, so a alternativa sorteada
        existe, e nem ela vai antes de ser achada;
     4. quanto custa ao motor RECEBER um pedaco com o jogo rodando -- o
        mesmo refazer-so-o-que-mudou que o canteiro usa -- e se o mundo
        refeito sai igual ao da ilha montada inteira;
     5. quanto pesa o resumo do relevo para a silhueta alem da nevoa, que
        precisa enxergar mais longe que os pedacos recebidos.

   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/3-mapa/pedacos.js
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const M = require("../../src/mapa.js");
const { carregar } = require("../../teste/harness");

const RAIZ = path.join(__dirname, "..", "..");
const PED = M.PEDACO_MAPA || 32;
const f1 = x => x.toFixed(1), kb = b => (b/1024).toFixed(1) + " KB";

function ler(nome){
  const r = M.lerMapa(fs.readFileSync(path.join(RAIZ, "mapas", nome), "utf8"));
  if (!r.mapa) throw new Error(nome + ": " + JSON.stringify(r.erros));
  return r.mapa;
}

/* O mapa escrito, repartido por pedaco: as linhas de grade ja comecam com
   "px py"; peca e coisa vao para o pedaco da posicao delas; a construcao vai
   junto com a primeira peca dela em cada pedaco. O cabecalho vai uma vez. */
function repartir(m){
  const texto = M.escreverMapa(m), linhas = texto.split("\n");
  const pedacos = new Map(), cabeca = [];
  const pedaco = (px, py) => { const k = px + "," + py; if (!pedacos.has(k)) pedacos.set(k, {px, py, linhas: [], coisas: []}); return pedacos.get(k); };
  const construcao = new Map();
  let secao = null;
  for (const l of linhas){
    if (!l || l.startsWith("//")) continue;
    if (l[0] === "["){ secao = l; continue; }
    if (!secao){ cabeca.push(l); continue; }
    const p = l.split(" ");
    if (/ 32\]$/.test(secao)) pedaco(+p[0], +p[1]).linhas.push(secao + " " + l);
    else if (secao === "[pecas]"){
      if (p[0] === "c") construcao.set(p[1], l);
      else if (p[0] === "p"){
        const ped = pedaco(Math.floor(+p[3]/PED), Math.floor(+p[4]/PED));
        const c = construcao.get(p[1]);
        if (c && !ped.linhas.includes(c)) ped.linhas.push(c);
        ped.linhas.push(l);
      } else cabeca.push(l);
    } else if (secao === "[coisas]"){
      const ped = pedaco(Math.floor(+p[0]/PED), Math.floor(+p[1]/PED));
      ped.coisas.push({linha: l, x: +p[0], y: +p[1], tipo: p[2], grupo: (l.match(/grupo=([^ ]+)/) || [])[1]});
    } else cabeca.push(secao + " " + l);
  }
  return {texto, cabeca, pedacos};
}

/* o que o servidor manda de um pedaco: as grades, as pecas, e das coisas
   so as que o cliente pode saber -- nenhum segredo antes de achado */
function carga(ped, achados){
  const coisas = ped.coisas.filter(c => c.tipo !== "segredo" || achados.has(c));
  return ped.linhas.concat(coisas.map(c => c.linha)).join("\n");
}

function comprimido(s){ return zlib.deflateRawSync(Buffer.from(s)).length; }

/* 1 */
function medirPedacos(nome){
  const m = ler(nome), r = repartir(m);
  const tam = [...r.pedacos.values()].map(p => ({cru: carga(p, new Set()).length, zip: comprimido(carga(p, new Set()))}));
  tam.sort((a, b) => a.cru - b.cru);
  const soma = k => tam.reduce((s, t) => s + t[k], 0);
  return {nome, larg: m.larg, alt: m.alt, arquivo: r.texto.length, arquivoZip: comprimido(r.texto), pedacos: tam.length,
          mediana: tam[tam.length >> 1], maior: tam[tam.length - 1], soma: soma("cru"), somaZip: soma("zip"),
          cabeca: r.cabeca.join("\n").length, m, r};
}

/* 2: a caminhada. Do inicio do jogador, de marco em marco (o mais perto
   que ainda nao foi visitado), em linha reta; o servidor manda todo pedaco
   com algum tile a ate ALCANCE tiles -- o jogo desenha ate 60, e a folga
   deixa o pedaco chegar antes de entrar na vista. */
function caminhar(med, alcance){
  const {m, r} = med;
  const marcos = m.coisas.filter(c => c.tipo !== "segredo");
  const inicio = m.coisas.find(c => c.tipo === "jogador") || marcos[0];
  const falta = marcos.filter(c => c !== inicio);
  const rota = [inicio];
  while (falta.length){
    const a = rota[rota.length - 1];
    let k = 0, dm = 1e9;
    falta.forEach((c, i) => { const d = Math.hypot(c.x - a.x, c.y - a.y); if (d < dm){ dm = d; k = i; } });
    rota.push(falta.splice(k, 1)[0]);
  }
  const enviados = new Set();
  let andado = 0, bytes = r.cabeca.join("\n").length, bytesZip = comprimido(r.cabeca.join("\n")), primeiro = 0;
  const mandar = (x, y) => {
    const a = Math.ceil(alcance/PED);
    for (let py = Math.floor(y/PED) - a; py <= Math.floor(y/PED) + a; py++)
      for (let px = Math.floor(x/PED) - a; px <= Math.floor(x/PED) + a; px++){
        const k = px + "," + py;
        if (enviados.has(k) || !r.pedacos.has(k)) continue;
        /* distancia do jogador ao retangulo do pedaco */
        const dx = Math.max(px*PED - x, 0, x - (px + 1)*PED), dy = Math.max(py*PED - y, 0, y - (py + 1)*PED);
        if (Math.max(dx, dy) > alcance) continue;
        enviados.add(k);
        const s = carga(r.pedacos.get(k), new Set());
        bytes += s.length; bytesZip += comprimido(s);
      }
  };
  mandar(inicio.x, inicio.y);
  primeiro = bytesZip;
  for (let i = 1; i < rota.length; i++){
    const a = rota[i - 1], b = rota[i], d = Math.hypot(b.x - a.x, b.y - a.y);
    for (let t = 0; t <= d; t += 4) mandar(a.x + (b.x - a.x)*t/d, a.y + (b.y - a.y)*t/d);
    andado += d;
  }
  return {marcos: rota.length, andado, pedacos: enviados.size, de: r.pedacos.size, bytes, bytesZip, primeiro};
}

/* 3: os segredos -- o que o arquivo de hoje entrega e o que o servidor entregaria */
function segredos(med){
  const {m} = med;
  const todos = m.coisas.filter(c => c.tipo === "segredo");
  const sorteio = M.sortearSegredos(m);
  return {noArquivo: todos.length, grupos: sorteio.size, valem: [...sorteio.values()].length, semente: m.semente};
}

/* 4: o motor recebendo um pedaco. A ilha de 650 abre com um pedaco de
   32x32 apagado (mar fundo); depois as grades de verdade chegam e o motor
   refaz so o que mudou. Confere que o chao sai igual ao da ilha montada
   inteira. */
function receber(){
  const montado = path.join(RAIZ, "..", "cripta-vhalgorn.html");
  const {D} = carregar(montado, {busca: "?mapa=cripta"});
  const cheio = ler("ilha-650.mapa");
  D.trocarMundo("?mapa=ilha-650", cheio);
  const chaoCheio = Float32Array.from(D.FLOORZ || []);
  const resultados = [];
  /* tres pedacos: um de mar, um da serra, um de Pedra Alta */
  for (const [px, py] of [[1, 1], [9, 6], [6, 15]]){
    const falho = ler("ilha-650.mapa");
    const tiles = [];
    for (let y = py*PED; y < (py + 1)*PED && y < falho.alt; y++) for (let x = px*PED; x < (px + 1)*PED && x < falho.larg; x++){
      const i = y*falho.larg + x;
      falho.terreno[i] = M.TERRENO_POR_CHAR["~"]; falho.altura[i] = 0; falho.teto[i] = 0;
      tiles.push(i);
    }
    D.trocarMundo("?mapa=ilha-650", falho);
    /* o jogador ja esta la, com o alcance montado -- montar o alcance ao
       abrir o mapa (uns 300 ms) e o que ja acontece hoje, e nao entra na conta */
    D.P.x = px*PED + PED/2; D.P.y = py*PED + PED/2; D.setCamera(0);
    D.remontarSujos();
    /* o pedaco chega */
    const t0 = process.hrtime.bigint();
    for (const i of tiles){ falho.terreno[i] = cheio.terreno[i]; falho.altura[i] = cheio.altura[i]; falho.teto[i] = cheio.teto[i]; }
    D.atualizarTerreno(tiles);
    D.remontarSujos();
    const ms = Number(process.hrtime.bigint() - t0)/1e6;
    let dif = 0;
    const chao = D.FLOORZ;
    for (let i = 0; i < chaoCheio.length; i++) if (Math.abs(chao[i] - chaoCheio[i]) > 1e-6) dif++;
    resultados.push({px, py, ms, tilesDiferentes: dif});
  }
  return resultados;
}

/* 5: o resumo do relevo para a silhueta do horizonte -- a maior altura de
   cada bloco de 8x8, um byte por bloco */
function resumoDoRelevo(med, bloco){
  const {m} = med, bw = Math.ceil(m.larg/bloco), bh = Math.ceil(m.alt/bloco), a = new Uint8Array(bw*bh);
  let maior = 0;
  for (let y = 0; y < m.alt; y++) for (let x = 0; x < m.larg; x++) maior = Math.max(maior, m.altura[y*m.larg + x]);
  for (let y = 0; y < m.alt; y++) for (let x = 0; x < m.larg; x++){
    const k = Math.floor(y/bloco)*bw + Math.floor(x/bloco), v = Math.round(255*m.altura[y*m.larg + x]/Math.max(1, maior));
    if (v > a[k]) a[k] = v;
  }
  return {blocos: bw + "x" + bh, bytes: a.length, zip: zlib.deflateRawSync(Buffer.from(a)).length};
}

const R = {};
console.log("1. OS PEDACOS DE 32x32 (cru / comprimido com deflate, o que o WebSocket ja faz)");
for (const nome of ["ilha-650.mapa", "ilha.mapa", "gruta.mapa"]){
  const med = medirPedacos(nome);
  R[nome] = {larg: med.larg, alt: med.alt, arquivo: med.arquivo, arquivoZip: med.arquivoZip, pedacos: med.pedacos,
             mediana: med.mediana, maior: med.maior, soma: med.soma, somaZip: med.somaZip};
  console.log("   " + nome.padEnd(14) + " " + med.larg + "x" + med.alt + ": arquivo " + kb(med.arquivo) + " (" + kb(med.arquivoZip) + " comprimido), " +
              med.pedacos + " pedacos; mediana " + med.mediana.cru + " B (" + med.mediana.zip + " B), maior " + kb(med.maior.cru) + " (" + kb(med.maior.zip) + ")");
  if (nome === "ilha-650.mapa") R.med650 = med;
}

console.log("\n2. UMA CAMINHADA PELA ILHA DE 650, DE MARCO EM MARCO");
for (const alcance of [60, 96]){
  const c = caminhar(R.med650, alcance);
  R["caminhada" + alcance] = c;
  console.log("   alcance " + alcance + " tiles: " + c.marcos + " marcos, " + f1(c.andado) + " tiles andados (" + f1(c.andado/3/60) + " min a 3 tiles/s); " +
              c.pedacos + " de " + c.de + " pedacos; " + kb(c.bytesZip) + " comprimido no total, " + kb(c.primeiro) + " para comecar a jogar");
}

console.log("\n3. OS SEGREDOS");
for (const nome of ["ilha-650.mapa", "ilha.mapa", "gruta.mapa"]){
  const s = segredos({m: ler(nome)});
  console.log("   " + nome.padEnd(14) + " " + s.noArquivo + " passagens secretas no arquivo, " + s.grupos + " grupos; o cliente de hoje recebe todas e a semente (" + s.semente + ")");
}
console.log("   com o servidor: o cliente recebe 0 ate achar; a semente e as alternativas que nao valem nunca saem de la");

console.log("\n4. O MOTOR RECEBENDO UM PEDACO DE 32x32, COM O JOGO RODANDO");
R.receber = receber();
for (const r of R.receber)
  console.log("   pedaco " + r.px + "," + r.py + ": " + f1(r.ms) + " ms para refazer; tiles de chao diferentes da ilha inteira: " + r.tilesDiferentes);

console.log("\n5. O RESUMO DO RELEVO PARA A SILHUETA ALEM DA NEVOA");
for (const b of [8, 16]){
  const s = resumoDoRelevo(R.med650, b);
  R["relevo" + b] = s;
  console.log("   blocos de " + b + "x" + b + ": " + s.blocos + " = " + kb(s.bytes) + " (" + kb(s.zip) + " comprimido), uma vez por mapa");
}

delete R.med650;
fs.writeFileSync(path.join(__dirname, "pedacos.json"), JSON.stringify(R, null, 1));
