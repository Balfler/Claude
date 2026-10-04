/* ============================================================
   CANTEIRO -- A LINHA DE COMANDO
   ------------------------------------------------------------
   O mesmo que a tela faz, sem navegador: para converter, conferir e
   desenhar mapa de dentro de um script ou de um teste.

     node mundo-perigoso/canteiro/cli.js converter <mapa.mapa> [saida.mapa]
         le um MAPA 1 (ou 2) e grava em MAPA 2. Sem saida, grava por cima.

     node mundo-perigoso/canteiro/cli.js validar <mapa.mapa ...> [--rapido]
         confere os mapas dados junto com os de mapas/: o formato, as
         ligacoes entre eles, as pecas e, com o motor, o alcance andando e o
         pior quadro, medido desenhando (no node, perto do navegador).
         --rapido pula o motor. Sai com 1 se houver erro.

     node mundo-perigoso/canteiro/cli.js exportar <mapa.mapa ...> [nome] [--rapido] [--sem-build]
         confere como o validar e, sem erro, grava em mapas/<nome>.mapa -- o
         nome do arquivo, se nao disser outro -- e monta o jogo. Com varios
         mapas (a ilha e a dungeon dela, que um confere o outro), cada um vai
         com o nome do arquivo. Com erro, nao grava nada.

     node mundo-perigoso/canteiro/cli.js planta <mapa.mapa> [saida.png] [--escala=N] [--regioes] [--problemas] [--degraus=N]
         a vista de cima num PNG, com a cor do macro: o relevo, o penhasco
         em vermelho, as pecas em planta e as coisas. --regioes tinge as
         regioes; --problemas marca os problemas da validacao sem motor. A
         escala padrao deixa o lado maior com uns 1300 pixels.

     node mundo-perigoso/canteiro/cli.js vista <mapa.mapa> x,y[,graus[,inclinacao]] [saida.png] [--altura=z]
         um quadro do jogo, de dentro do mapa, desenhado pelo motor: graus 0
         olha para leste e 90 para o sul; --altura voa acima do chao.

     node mundo-perigoso/canteiro/cli.js ver <mapa.mapa>
         o que o arquivo tem: tamanho, terreno, pecas, coisas.

     node mundo-perigoso/canteiro/cli.js catalogo [estilo|auto] [saida.png]
         a folha do catalogo: a miniatura de cada tipo de peca, desenhada
         pelo proprio motor, com o nome embaixo. "auto" usa o estilo da
         categoria de cada tipo (castelo em pedra de fortaleza, e assim por
         diante). Sem saida, grava catalogo.png aqui.

   A vista e o validar usam o jogo montado (cripta-vhalgorn.html) no
   harness dos testes.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const Pc = require("../src/pecas.js");
const V = require("./validacao.js");
const Pl = require("./planta.js");
/* --inclinado liga o chao inclinado no jogo que mede (e --degraus=N muda o limite) */
const BUSCA_CHAO = process.argv.includes("--inclinado")
  ? "&chao=inclinado" + (process.argv.find(a => a.startsWith("--degraus=")) ? "&degraus=" + process.argv.find(a => a.startsWith("--degraus=")).slice(10) : "") : "";

const args = process.argv.slice(2);
const cmd = args[0];
function sair(msg){ console.error(msg); process.exit(1); }
function abrir(arq){
  if (!arq) sair("falta o arquivo do mapa");
  const r = M.lerMapa(fs.readFileSync(arq, "utf8"));
  if (!r.mapa){
    for (const e of r.erros) console.error("  linha " + e.linha + ": " + e.msg);
    sair(arq + ": " + r.erros.length + " erro(s) -- o mapa nao abre pela metade");
  }
  return r.mapa;
}
const kb = n => (n/1024).toFixed(0) + " KB";

if (cmd === "converter"){
  const entrada = args[1], saida = args[2] || entrada;
  const m = abrir(entrada);
  const antes = fs.statSync(entrada).size, versao = m.versao;
  M.converterMapa(m);
  const texto = M.escreverMapa(m);
  const naoAscii = [...texto].findIndex(c => c.charCodeAt(0) > 127);
  if (naoAscii >= 0) sair("o mapa tem caractere que nao e ASCII na posicao " + naoAscii);
  /* ler de volta antes de gravar: nada de trocar um arquivo bom por um que
     nao volta */
  const volta = M.lerMapa(texto);
  if (!volta.mapa) sair("o mapa convertido nao le de volta: " + JSON.stringify(volta.erros.slice(0, 3)));
  if (M.escreverMapa(volta.mapa) !== texto) sair("o mapa convertido nao da ida e volta igual");
  fs.writeFileSync(saida, texto);
  console.log("MAPA " + versao + " -> MAPA 2: " + path.basename(saida) + ", de " + kb(antes) + " para " + kb(texto.length) +
    " (" + m.larg + "x" + m.alt + ", " + m.pecas.length + " pecas, " + m.coisas.length + " coisas)");
}
else if (cmd === "validar" || cmd === "exportar"){
  /* O conjunto: os mapas de mapas/, que o jogo embute, e os dados na linha,
     que sao os conferidos. Exportar confere um so, com o nome que ele vai
     ter no jogo -- e esse nome tira o de mapas/ do conjunto, que e o que ele
     vai substituir. */
  const rapido = args.includes("--rapido");
  const soArgs = args.slice(1).filter(a => !a.startsWith("--"));
  if (!soArgs.length) sair("falta o arquivo do mapa");
  /* exportar leva um mapa com o nome dado, ou varios com o nome do arquivo
     de cada -- o par de uma entrada e da saida vai junto, e um confere o
     outro */
  const arquivos = soArgs.filter(a => /\.mapa$/i.test(a));
  const nomeDado = cmd === "exportar" ? soArgs.find(a => !/\.mapa$/i.test(a)) : null;
  if (!arquivos.length) sair("falta o arquivo do mapa");
  if (nomeDado && arquivos.length > 1) sair("com mais de um mapa, cada um vai com o nome do arquivo dele");
  const nomes = arquivos.map(a => V.nomeDoMapa(nomeDado || a));
  const dirMapas = path.join(__dirname, "..", "mapas");
  const conj = new Map();
  for (const f of fs.readdirSync(dirMapas))
    if (/^[a-z0-9-]+\.mapa$/.test(f)) conj.set(f.slice(0, -5), {nome: f.slice(0, -5), mapa: abrir(path.join(dirMapas, f)), conferir: false});
  arquivos.forEach(function(arq, i){
    const m = abrir(arq);
    if (m.versao < 2) M.converterMapa(m);
    conj.set(nomes[i], {nome: nomes[i], mapa: m, conferir: true, arquivo: arq});
  });
  const lista = [...conj.values()];
  let problemas = V.validarConjunto(lista, {completo: true});
  const quadros = [];
  if (!rapido){
    /* o motor montado no node, como no teste: o alcance e o pior quadro de
       cada mapa conferido */
    const {carregar} = require("../teste/harness");
    const html = path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
    if (!fs.existsSync(html)) sair("falta o jogo montado: rode node mundo-perigoso/build.js (ou use --rapido)");
    const {D, avaliar} = carregar(html, {busca: "?mapa=cripta" + BUSCA_CHAO, canvas: "software",
      extras: [path.join(__dirname, "..", "src", "andar.js"), path.join(__dirname, "alcance.js")]});
    const conferir = avaliar(`(function(m, nome){
      const jog = m.coisas.find(function(c){ return c.tipo === "jogador"; });
      let achados = [];
      if (jog){
        const mundo = mundoDoMotor();
        achados = comPortasAbertas(function(){
          const g = montarGradeDeAndar(mundo, m.larg, m.alt);
          const k = estadoDaGrade(g, jog.x + 0.5, jog.y + 0.5, floorAt(jog.x, jog.y), STEP);
          return problemasDoAlcance(m, nome, g, percorrerGrade(g, mundo, k));
        });
      }
      /* as texturas vem do canvas de software (teste/canvas.js): sem elas o
         mundo saia transparente, nada escrevia no z-buffer e o tempo do
         quadro no node nao dizia nada */
      const pior = custoDoQuadro(m);
      return {achados: achados.concat(problemasDoQuadro(nome, pior)), pior: pior, texto: textoDoQuadro(pior)};
    })`);
    for (const e of lista){
      if (!e.conferir) continue;
      const t0 = Date.now();
      D.trocarMundo("?mapa=canteiro", e.mapa);
      D.G.mode = "play"; D.P.god = true;
      const r = conferir(e.mapa, e.nome);
      problemas = problemas.concat(r.achados);
      quadros.push(e.nome + ": " + r.texto + " -- no node; conferido com o motor em " + ((Date.now() - t0)/1000).toFixed(1) + " s");
    }
    problemas = V.juntarRepetidos(problemas);
  }
  for (const p of problemas){
    console.log("  " + V.textoDoProblema(p));
    if (p.vezes > 1) console.log("      " + p.lugares.slice(0, 6).map(l => l.x + "," + l.y).join("  ") + (p.lugares.length > 6 ? "  ..." : ""));
  }
  for (const q of quadros) console.log("  " + q);
  const n = V.contarNiveis(problemas);
  console.log(nomes.join(", ") + ": " + n.erros + " erro(s), " + n.avisos + " aviso(s)" +
              (rapido ? " -- sem o motor: o alcance e o quadro ficaram de fora" : "") +
              " (conferido com " + (lista.length - arquivos.length) + " mapa(s) de mapas/)");
  if (n.erros) sair(cmd === "exportar" ? "com erro, nao exportei" : "com erro");
  if (cmd === "exportar"){
    /* o que vai para mapas/: MAPA 2, ASCII, e que le de volta igual -- os
       textos conferidos todos antes de gravar o primeiro */
    const textos = nomes.map(function(n){
      const texto = M.escreverMapa(conj.get(n).mapa);
      if (/[^\x00-\x7f]/.test(texto)) sair(n + ": o mapa tem caractere que nao e ASCII");
      const volta = M.lerMapa(texto);
      if (!volta.mapa || M.escreverMapa(volta.mapa) !== texto) sair(n + ": o mapa nao da ida e volta igual: nao exportei");
      return texto;
    });
    nomes.forEach(function(n, i){
      fs.writeFileSync(path.join(dirMapas, n + ".mapa"), textos[i]);
      console.log("exportado: mapas/" + n + ".mapa (" + kb(textos[i].length) + ")");
    });
    if (!args.includes("--sem-build")){
      const r = require("child_process").spawnSync(process.execPath, [path.join(__dirname, "..", "build.js")], {encoding: "utf8"});
      process.stdout.write(r.stdout || "");
      if (r.status !== 0){ process.stderr.write(r.stderr || ""); sair("o build falhou"); }
    }
  }
}
else if (cmd === "planta"){
  /* a vista de cima, com a cor do macro; --problemas marca os da validacao
     sem motor, --regioes tinge as regioes */
  const soArgs = args.slice(1).filter(a => !a.startsWith("--"));
  const m = abrir(soArgs[0]);
  if (m.versao < 2) M.converterMapa(m);
  const saida = soArgs[1] || V.nomeDoMapa(soArgs[0]) + ".png";
  const pedida = args.find(a => a.startsWith("--escala="));
  const escala = pedida ? Math.max(1, Math.min(16, +pedida.slice(9) | 0)) : Math.max(1, Math.floor(1300/Math.max(m.larg, m.alt)));
  const problemas = args.includes("--problemas")
    ? V.validarConjunto([{nome: V.nomeDoMapa(soArgs[0]), mapa: m, conferir: true}], {completo: false}) : [];
  const t0 = Date.now();
  const p = Pl.planta(m, {escala: escala, regiao: args.includes("--regioes"), problemas: problemas,
                          degraus: args.find(a => a.startsWith("--degraus=")) ? +args.find(a => a.startsWith("--degraus=")).slice(10) : undefined});
  fs.writeFileSync(saida, require("../editor/png.js").codificar(p.w, p.h, p.rgba));
  console.log(saida + ": " + p.w + "x" + p.h + " (" + escala + " px por tile), " + (Date.now() - t0) + " ms" +
    (problemas.length ? ", " + problemas.length + " problema(s) marcado(s)" : ""));
}
else if (cmd === "vista"){
  /* Um quadro do jogo, de dentro do mapa: o motor montado no node, com as
     texturas desenhadas no canvas de software (teste/canvas.js). O ponto e
     x,y[,graus[,inclinacao]] -- graus 0 olha para leste, 90 para o sul;
     inclinacao negativa olha para baixo --, e a altura e a do chao, ou
     --altura=z acima dele (voando). */
  const soArgs = args.slice(1).filter(a => !a.startsWith("--"));
  const m = abrir(soArgs[0]);
  if (m.versao < 2) M.converterMapa(m);
  const ponto = String(soArgs[1] || "").split(",").map(Number);
  if (!(ponto.length >= 2 && ponto.every(isFinite))) sair("o ponto e x,y[,graus[,inclinacao]]: vista mapa.mapa 120,80,90");
  const saida = soArgs[2] || V.nomeDoMapa(soArgs[0]) + "-" + ponto.slice(0, 2).join("-") + ".png";
  const acima = args.find(a => a.startsWith("--altura="));
  const {carregar} = require("../teste/harness");
  const html = path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
  if (!fs.existsSync(html)) sair("falta o jogo montado: rode node mundo-perigoso/build.js");
  const t0 = Date.now();
  const {D} = carregar(html, {busca: "?mapa=cripta" + BUSCA_CHAO, canvas: "software"});
  D.trocarMundo("?mapa=canteiro", m);
  D.G.mode = "play"; D.G.terceira = false;
  const tx = Math.floor(ponto[0]), ty = Math.floor(ponto[1]);
  D.P.x = ponto[0]; D.P.y = ponto[1];
  D.P.z = D.floorAt(tx, ty) + (acima ? +acima.slice(9) : 0);
  D.P.ang = (ponto[2] || 0)*Math.PI/180; D.P.pitch = (ponto[3] || 0)*Math.PI/180; D.P.bob = 0;
  D.setCamera(0); D.renderWorld(); D.renderEntities();
  const W = D.RW, H = D.RH, buf = D.buf, rgba = new Uint8Array(W*H*4);
  for (let i = 0; i < W*H; i++){
    const v = buf[i];
    rgba[4*i] = v & 255; rgba[4*i + 1] = (v >> 8) & 255; rgba[4*i + 2] = (v >> 16) & 255; rgba[4*i + 3] = 255;
  }
  fs.writeFileSync(saida, require("../editor/png.js").codificar(W, H, rgba));
  console.log(saida + ": " + W + "x" + H + ", de " + ponto[0] + "," + ponto[1] + " a " + D.P.z.toFixed(2) + " de altura, olhando a " +
    (ponto[2] || 0) + " graus; " + D.nQuads() + " faces, " + (Date.now() - t0) + " ms");
}
else if (cmd === "ver"){
  const m = abrir(args[1]);
  const conta = {};
  for (const t of m.terreno){ const id = M.TERRENOS[t].id; conta[id] = (conta[id] || 0) + 1; }
  let alto = 0;
  for (const h of m.altura) if (h > alto) alto = h;
  console.log(path.basename(args[1]) + ": MAPA " + m.versao + ", " + m.larg + "x" + m.alt +
    ", passo " + m.passo + ", mar " + m.mar);
  console.log("  terreno: " + Object.keys(conta).sort((a, b) => conta[b] - conta[a])
    .map(k => k + " " + conta[k]).join(", "));
  console.log("  altura maxima: " + alto + " degraus (" + (alto*m.passo).toFixed(2) + " tiles)");
  const porTipo = {};
  for (const p of m.pecas) porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1;
  console.log("  pecas: " + m.pecas.length + (m.pecas.length ? " (" + Object.keys(porTipo).map(k => k + " " + porTipo[k]).join(", ") + ")" : "") +
    " em " + m.construcoes.length + " construcao(oes)");
  const coisas = {};
  for (const c of m.coisas) coisas[c.tipo] = (coisas[c.tipo] || 0) + 1;
  console.log("  coisas: " + m.coisas.length + (m.coisas.length ? " (" + Object.keys(coisas).map(k => k + " " + coisas[k]).join(", ") + ")" : ""));
  const desconhecidos = m.pecas.filter(p => !Pc.TIPOS_DE_PECA[p.tipo]).map(p => p.tipo);
  if (desconhecidos.length) console.log("  tipos de peca que este codigo nao conhece: " + [...new Set(desconhecidos)].join(", "));
}
else if (cmd === "catalogo"){
  /* o motor montado no node, como no teste: o HTML do build com o harness */
  const {carregar} = require("../teste/harness");
  const PNG = require("../editor/png.js");
  const html = path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
  if (!fs.existsSync(html)) sair("falta o jogo montado: rode node mundo-perigoso/build.js");
  const {D} = carregar(html, {busca: "?mapa=cripta" + BUSCA_CHAO});
  const estilo = args[1] || "auto", saida = args[2] || "catalogo.png";
  if (estilo !== "auto" && !Pc.ESTILOS[estilo]) sair("estilo desconhecido: " + estilo + " (ha " + Object.keys(Pc.ESTILOS).join(", ") + ")");
  const daCategoria = {};
  for (const id in Pc.ESTILOS) if (!daCategoria[Pc.ESTILOS[id].categoria]) daCategoria[Pc.ESTILOS[id].categoria] = id;
  const tipos = [];
  for (const cat of Pc.CATEGORIAS_DE_PECA) for (const t in Pc.TIPOS_DE_PECA) if (Pc.TIPOS_DE_PECA[t].categoria === cat) tipos.push(t);
  const L = 96, rotulo = 12, cols = 10, rows = Math.ceil(tipos.length/cols);
  const W = cols*L, H = rows*(L + rotulo), rgba = new Uint8Array(W*H*4);
  for (let i = 0; i < W*H; i++){ rgba[4*i] = 27; rgba[4*i+1] = 21; rgba[4*i+2] = 16; rgba[4*i+3] = 255; }
  const t0 = Date.now();
  tipos.forEach(function(t, k){
    const est = estilo === "auto" ? (daCategoria[Pc.TIPOS_DE_PECA[t].categoria] || "madeira-pescador") : estilo;
    const px = D.miniaturaDaPeca(t, est, L);
    const ox = (k % cols)*L, oy = Math.floor(k/cols)*(L + rotulo);
    if (px) for (let y = 0; y < L; y++) for (let x = 0; x < L; x++){
      const v = px[y*L + x]; if (!v) continue;
      const o = ((oy + y)*W + ox + x)*4;
      rgba[o] = v & 255; rgba[o+1] = (v >> 8) & 255; rgba[o+2] = (v >> 16) & 255;
    }
    escrever(rgba, W, ox + 3, oy + L + 3, t.toUpperCase().slice(0, 23), [230, 216, 192]);
  });
  fs.writeFileSync(saida, PNG.codificar(W, H, rgba));
  console.log(saida + ": " + tipos.length + " tipos em " + (estilo === "auto" ? "estilo de cada categoria" : estilo) +
    ", " + (Date.now() - t0) + " ms");
}
else {
  console.log(fs.readFileSync(__filename, "utf8").split("============================================================ */")[0]
    .split("\n").slice(3).join("\n"));
}

/* Letra de 3x5 pixels, para o nome embaixo da miniatura: sem canvas no node,
   a folha escreve na mao. Cada letra sao cinco linhas de tres bits. */
function escrever(rgba, W, x0, y0, texto, cor){
  const F = {
    A:"7 5 7 5 5", B:"6 5 6 5 6", C:"7 4 4 4 7", D:"6 5 5 5 6", E:"7 4 6 4 7", F:"7 4 6 4 4", G:"7 4 5 5 7",
    H:"5 5 7 5 5", I:"7 2 2 2 7", J:"1 1 1 5 7", K:"5 5 6 5 5", L:"4 4 4 4 7", M:"5 7 7 5 5", N:"6 5 5 5 5",
    O:"7 5 5 5 7", P:"7 5 7 4 4", Q:"7 5 5 7 1", R:"7 5 6 5 5", S:"7 4 7 1 7", T:"7 2 2 2 2", U:"5 5 5 5 7",
    V:"5 5 5 5 2", W:"5 5 7 7 5", X:"5 5 2 5 5", Y:"5 5 2 2 2", Z:"7 1 2 4 7", "-":"0 0 7 0 0", " ":"0 0 0 0 0",
    "0":"7 5 5 5 7", "1":"2 6 2 2 7", "2":"7 1 7 4 7", "3":"7 1 3 1 7", "4":"5 5 7 1 1", "5":"7 4 7 1 7",
    "6":"7 4 7 5 7", "7":"7 1 1 1 1", "8":"7 5 7 5 7", "9":"7 5 7 1 7"
  };
  [...texto].forEach(function(c, i){
    const linhas = (F[c] || F[" "]).split(" ");
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++){
      if (!((+linhas[y] >> (2 - x)) & 1)) continue;
      const px = x0 + i*4 + x, py = y0 + y;
      if (px >= W) continue;
      const o = (py*W + px)*4;
      rgba[o] = cor[0]; rgba[o+1] = cor[1]; rgba[o+2] = cor[2];
    }
  });
}
