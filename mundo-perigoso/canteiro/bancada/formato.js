/* ============================================================
   BANCADA -- O TAMANHO DO ARQUIVO
   ------------------------------------------------------------
   Mede no rascunho de 650x650 quanto cada jeito de escrever as grades
   ocupa, quanto leva para ler, e quanto uma edicao pequena mexe no arquivo
   (o que o git mostra de diferenca). Roda no node:

     node mundo-perigoso/canteiro/bancada/formato.js [arquivo.mapa]
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const M = require("../../src/mapa.js");

const arq = process.argv[2] || path.join(__dirname, "..", "..", "Arte", "ilha 2.mapa");
const texto = fs.readFileSync(arq, "utf8");
let t0 = Date.now();
const m = M.lerMapa(texto).mapa;
const tLer1 = Date.now() - t0;
const W = m.larg, H = m.alt;

/* corridas por linha: valor em base 36, "*n" quando repete */
function linhaCorrida(g, y, cel){
  const out = [];
  for (let x = 0; x < W; ){
    const v = g[y*W + x];
    let n = 1; while (x + n < W && g[y*W + x + n] === v) n++;
    out.push(cel(v) + (n > 1 ? "*" + n.toString(36) : ""));
    x += n;
  }
  return out.join(" ");
}
/* pedacos de P x P: uma linha por pedaco, corridas ao longo do pedaco;
   pedaco todo igual vira um valor so */
function pedacos(g, cel, P){
  const linhas = [];
  for (let py = 0; py < H; py += P) for (let px = 0; px < W; px += P){
    const vals = [];
    for (let y = py; y < Math.min(H, py + P); y++) for (let x = px; x < Math.min(W, px + P); x++) vals.push(g[y*W + x]);
    const out = [];
    for (let i = 0; i < vals.length; ){
      let n = 1; while (i + n < vals.length && vals[i + n] === vals[i]) n++;
      out.push(cel(vals[i]) + (n > 1 ? "*" + n.toString(36) : ""));
      i += n;
    }
    linhas.push((px/P) + " " + (py/P) + " " + out.join(" "));
  }
  return linhas.join("\n");
}
const celT = v => M.TERRENOS[v].c, celN = v => v.toString(36);
const grades = [["terreno", m.terreno, celT], ["altura", m.altura, celN], ["teto", m.teto, celN]];

const kb = n => (n/1024).toFixed(0) + " KB";
console.log(path.basename(arq) + ": " + W + "x" + H + ", MAPA 1 = " + kb(texto.length) + ", lido em " + tLer1 + " ms");
let totalLinha = 0, totalP = {};
for (const [nome, g, cel] of grades){
  let s = "";
  for (let y = 0; y < H; y++) s += linhaCorrida(g, y, cel) + "\n";
  totalLinha += s.length;
  let r = nome.padEnd(8) + " corrida por linha " + kb(s.length).padStart(7);
  for (const P of [16, 32, 64]){ const p = pedacos(g, cel, P); totalP[P] = (totalP[P] || 0) + p.length; r += "   pedaco " + P + ": " + kb(p.length).padStart(6); }
  console.log(r);
}
console.log("total    corrida por linha " + kb(totalLinha).padStart(7) + "   pedaco 16: " + kb(totalP[16]) + "   pedaco 32: " + kb(totalP[32]) + "   pedaco 64: " + kb(totalP[64]));

/* ler as corridas de volta, para ter o tempo */
t0 = Date.now();
let lido = 0;
for (let rep = 0; rep < 3; rep++) for (const [nome, g, cel] of grades){
  for (let y = 0; y < H; y++){
    const toks = linhaCorrida(g, y, cel).split(" ");
    for (const t of toks){ const k = t.indexOf("*"); lido += k < 0 ? 1 : parseInt(t.slice(k + 1), 36); }
  }
}
console.log("ler as tres grades em corrida: " + ((Date.now() - t0)/3).toFixed(0) + " ms (escrever + ler, " + lido/3 + " celulas)");

/* uma edicao tipica: um traco de pincel de 9 tiles de largura atravessando
   40 tiles no meio da ilha. Quantas linhas do arquivo mudam? */
const antes = {linha: [], p32: []}, depois = {linha: [], p32: []};
const g2 = m.altura.slice();
for (let k = 0; k < 40; k++) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++){
  const x = 300 + k + dx, y = 320 + (k >> 1) + dy;
  g2[y*W + x] = Math.min(35, g2[y*W + x] + 1);
}
const conta = function(ga, gb, P){
  if (!P){ let n = 0; for (let y = 0; y < H; y++) if (linhaCorrida(ga, y, celN) !== linhaCorrida(gb, y, celN)) n++; return n; }
  const a = pedacos(ga, celN, P).split("\n"), b = pedacos(gb, celN, P).split("\n");
  let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n;
};
console.log("um traco de pincel 9x40 muda: " + conta(m.altura, g2) + " linhas em corrida por linha, " + conta(m.altura, g2, 32) + " em pedacos de 32");

/* pecas: uma linha por peca. Quanto pesam 5000? */
const exemplo = "p 1234 parede-janela madeira-pescador 123.25 88.5 3.25 90 c17";
console.log("5000 pecas, uma linha cada (" + exemplo.length + " caracteres): " + kb(5000*(exemplo.length + 1)));
