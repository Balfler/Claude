/* ============================================================
   SONDAGEM 2 -- O SERVIDOR RODANDO O CODIGO DO JOGO, SEM REDE
   ------------------------------------------------------------
   Carrega o jogo montado no node (o mesmo harness dos testes), com a
   costura de varios jogadores, e roda a cripta com N jogadores robos a 60
   passos por segundo, o mais rapido que der. Mede:

     - quanto custa um passo do servidor com 1, 2, 4, 8, 16, 32 e 64
       jogadores (os 20 bichos da cripta junto);
     - quanto pesa o retrato do mundo que cada jogador recebe, em texto
       (JSON) e em binario, a 20 retratos por segundo.

   Os robos andam, viram, atiram, dao dash e pulam ao acaso. Quem morre
   renasce na entrada, e os bichos mortos voltam, para o mundo nao esvaziar
   no meio da medicao.

   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/2-rede/servidor-mudo.js
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { carregar } = require("../../teste/harness");
const { costurar } = require("./costura");

const MONTADO = path.join(__dirname, "..", "..", "..", "cripta-vhalgorn.html");

function jogoCosturado(busca){
  const html = fs.readFileSync(MONTADO, "utf8").replace(/\r\n/g, "\n");
  const m = html.match(/<script>\n([\s\S]*)<\/script>/);
  const tmp = path.join(os.tmpdir(), "cripta-costurada-" + process.pid + ".html");
  fs.writeFileSync(tmp, html.replace(m[1], () => costurar(m[1])));
  const J = carregar(tmp, {busca: busca});
  fs.unlinkSync(tmp);
  return J;
}

/* um jogador novo e uma copia do estado inicial do global */
function novoJogador(R, base, i){
  const J = JSON.parse(JSON.stringify(base));
  J.id = i;
  J.x = base.x + (i % 4)*0.3 - 0.45; J.y = base.y - Math.floor(i/4)*0.35;
  J.z = R.floorAt(Math.floor(J.x), Math.floor(J.y));
  J.robo = {girar: 0, troca: 0};
  return J;
}
function renascer(R, J, base){
  Object.assign(J, JSON.parse(JSON.stringify(base)), {id: J.id, robo: J.robo, base: J.base});
}
/* a entrada de um robo: a mesma forma que lerEntrada() devolve */
function entradaDoRobo(J, t, sorte){
  const r = J.robo;
  if (t >= r.troca){ r.troca = t + 0.4 + sorte()*1.2; r.girar = sorte() < 0.5 ? 0 : (sorte() < 0.5 ? -1 : 1); r.frente = sorte() < 0.8 ? 1 : -1; }
  const acoes = [];
  if (sorte() < 0.01) acoes.push({tipo: "pular"});
  return {frente: r.frente, lado: 0, girar: r.girar, subir: false, agachar: false,
          dash: sorte() < 0.005, atirar: sorte() < 0.05, acoes: acoes};
}

/* O retrato que um jogador recebe: ele, os outros e o que se mexe perto.
   Binario: jogador 14 bytes (id 2, x/y/z 6 em ponto fixo, rumo 1, olhar 1,
   pose 1, vida 1, arma 1, estado 1), bicho 10 (id 2, x/y/z 6, rumo 1,
   pose 1), projetil 8 (x/y/z 6, tipo 1, dono 1), e 6 de cabecalho. */
function retrato(R, J, raio){
  const perto = (o) => Math.abs(o.x - J.x) < raio && Math.abs(o.y - J.y) < raio;
  const jog = R.jogadores().filter(perto).map(o => [o.id, +o.x.toFixed(2), +o.y.toFixed(2), +o.z.toFixed(2), +o.ang.toFixed(2), +o.pitch.toFixed(2), o.anim > 0 ? 1 : 0, Math.round(o.hp), o.wpn, o.dead ? 1 : 0]);
  const bichos = R.ents().filter(e => e.kind === "enemy" && !e.gone && perto(e)).map(e => [e.id || 0, +e.x.toFixed(2), +e.y.toFixed(2), +e.z.toFixed(2), +(e.ang || 0).toFixed(2), e.dead ? 1 : 0]);
  const tiros = R.projs().filter(perto).map(p => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), p.type === "arrow" ? 1 : 0]);
  const texto = JSON.stringify({j: jog, b: bichos, t: tiros});
  return {json: texto.length, bin: 6 + jog.length*14 + bichos.length*10 + tiros.length*8, n: jog.length + bichos.length + tiros.length};
}

/* espalhados: cada jogador nasce a dois tiles de um bicho, para todos os
   bichos acordarem -- o pior caso da cripta */
function medir(R, base, bichosIniciais, n, segundos, espalhados){
  const jogadores = [], bichos = [...bichosIniciais.keys()];
  for (let i = 0; i < n; i++){
    const J = novoJogador(R, base, i);
    if (espalhados){
      const b = bichosIniciais.get(bichos[i % bichos.length]);
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [0, 0]]){
        const x = b.x + dx, y = b.y + dy;
        if (Math.abs(R.floorAt(Math.floor(x), Math.floor(y)) - b.z) < 0.3){ J.x = x; J.y = y; J.z = R.floorAt(Math.floor(x), Math.floor(y)); break; }
      }
      J.base = {x: J.x, y: J.y, z: J.z};
    }
    jogadores.push(J);
  }
  R.jogadores(jogadores);
  let s = 7;
  const sorte = () => { s = (s*16807) % 2147483647; return s/2147483647; };
  const dt = 1/60, passos = Math.round(segundos/dt);
  const tempos = [], retratos = [];
  let mortes = 0, vivos = 0;
  R.G.mode = "play";
  for (let k = 0; k < passos; k++){
    const t = k*dt;
    const t0 = process.hrtime.bigint();
    for (const J of jogadores) R.passoDoJogador(J, dt, entradaDoRobo(J, t, sorte));
    R.passoDoMundo(dt);
    tempos.push(Number(process.hrtime.bigint() - t0)/1e6);
    for (const J of jogadores) if (J.dead){ mortes++; renascer(R, J, base); if (J.base) Object.assign(J, J.base); }
    /* bicho morto volta, para o mundo nao esvaziar */
    if (k % 120 === 0) for (const e of R.ents()) if (e.kind === "enemy" && e.dead){
      const b = bichosIniciais.get(e); Object.assign(e, b, {dead: false, gone: false});
    }
    if (k % 3 === 0) for (const J of jogadores) retratos.push(retrato(R, J, 30));
    vivos += R.ents().filter(e => e.kind === "enemy" && !e.dead).length;
  }
  tempos.sort((a, b) => a - b);
  const med = tempos.reduce((a, b) => a + b, 0)/tempos.length;
  const rj = retratos.reduce((a, r) => a + r.json, 0)/retratos.length, rb = retratos.reduce((a, r) => a + r.bin, 0)/retratos.length;
  return {n, passo: med, p99: tempos[Math.floor(tempos.length*0.99)], max: tempos[tempos.length-1],
          jsonKBs: rj*20/1024, binKBs: rb*20/1024, coisas: retratos.reduce((a, r) => a + r.n, 0)/retratos.length,
          mortes, bichosVivos: vivos/passos};
}

module.exports = {jogoCosturado, novoJogador, renascer, entradaDoRobo, retrato};

if (require.main === module){
  const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2), f3 = x => x.toFixed(3);
  const { D } = (function(){ const J = jogoCosturado("?mapa=cripta"); return {D: J}; })();
  const R = D.S.__rede;
  if (!R) throw new Error("a costura nao expos __rede");
  const base = JSON.parse(JSON.stringify(R.P));
  const bichosIniciais = new Map();
  for (const e of R.ents()) if (e.kind === "enemy") bichosIniciais.set(e, {x: e.x, y: e.y, z: e.z, hp: e.hp, ang: e.ang});
  console.log("cripta: " + bichosIniciais.size + " bichos | 60 passos por segundo | retrato a 20 por segundo, raio de 30 tiles\n");
  console.log("jogadores | passo medio | p99     | pior    | por jogador | retrato JSON | binario   | coisas no retrato | mortes");
  const linhas = [];
  for (const [n, esp] of [[1], [2], [4], [8], [16], [32], [64], [4, 1], [20, 1], [64, 1]]){
    const m = medir(R, base, bichosIniciais, n, 20, !!esp);
    m.espalhados = !!esp;
    if (esp && !linhas.some(l => l.espalhados)) console.log("-- espalhados: cada jogador ao lado de um bicho, todos os bichos acordados --");
    linhas.push(m);
    console.log(String(n).padStart(9) + " | " + (f3(m.passo) + " ms").padStart(11) + " | " + (f2(m.p99) + " ms").padStart(7) + " | " + (f2(m.max) + " ms").padStart(7) +
                " | " + (f3(m.passo/n) + " ms").padStart(11) + " | " + (f1(m.jsonKBs) + " KB/s").padStart(12) + " | " + (f1(m.binKBs) + " KB/s").padStart(9) +
                " | " + f1(m.coisas).padStart(17) + " | " + m.mortes);
  }
  fs.writeFileSync(path.join(__dirname, "servidor-mudo.json"), JSON.stringify({maquina: os.cpus()[0].model + " x" + os.cpus().length, node: process.version, linhas}, null, 1));
}
