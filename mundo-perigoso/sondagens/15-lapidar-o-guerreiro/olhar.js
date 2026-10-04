/* ============================================================
   SONDAGEM 15 -- LAPIDAR O GUERREIRO
   ------------------------------------------------------------
   O Leandro (1/10), olhando o andarilho no jogo: o rosto esta estranho, na
   nuca a cor do cabelo contaminou a pelugem da capa, e de perto o corpo todo
   precisa de ajuste. Aqui se olha a FONTE (o volume de 257 de altura, forma do
   Sorceress e cor do desenho) de varios lados, de perto, para achar de onde
   vem cada defeito, e se compara o jeito de pintar de hoje com o novo.

   Uso: node mundo-perigoso/sondagens/15-lapidar-o-guerreiro/olhar.js <forma.wgvox> <folha.png> [saida]
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const T = require("../7-tres-vistas/tresvistas.js"), C = require(path.join(RAIZ, "atelie", "corpo.js")), png = require(path.join(RAIZ, "editor", "png.js"));

/* Uma vista ortografica do volume girado em volta do eixo vertical (graus;
   0 = de frente, 90 = do lado direito dele, 180 = de costas), com a luz pela
   profundidade e o contorno, como a do atelie. `caixa` recorta [x0, z0, x1, z1]
   em voxels do volume (z de baixo para cima). */
function vista(f, graus, caixa, esc){
  const a = graus*Math.PI/180, ca = Math.cos(a), sa = Math.sin(a), cx = f.gx/2, cy = f.gy/2;
  const R = Math.ceil(Math.hypot(f.gx, f.gy)/2) + 1, W = 2*R, H = f.gz;
  const prof = new Float32Array(W*H).fill(1e9), cor = new Array(W*H).fill(null);
  for (let z = 0; z < f.gz; z++) for (let y = 0; y < f.gy; y++) for (let x = 0; x < f.gx; x++){
    const c = f.rgb(x, y, z);
    if (!c) continue;
    const ox = x + 0.5 - cx, oy = y + 0.5 - cy;
    const u = ox*ca - oy*sa, d = ox*sa + oy*ca;        // u: para a direita na tela; d: profundidade (menor = mais perto)
    const pu = Math.floor(u + R), pv = H - 1 - z, i = pv*W + pu;
    if (pu < 0 || pu >= W) continue;
    if (d < prof[i]){ prof[i] = d; cor[i] = c; }
  }
  const [x0, z0, x1, z1] = caixa || [0, 0, W, H], w = x1 - x0, h = z1 - z0, e = esc || 1, px = new Uint8Array(w*e*h*e*4);
  for (let yy = 0; yy < h*e; yy++) for (let xx = 0; xx < w*e; xx++){
    const u = x0 + ((xx/e) | 0), v = H - 1 - (z0 + h - 1 - ((yy/e) | 0)), i = v*W + u, o = (yy*w*e + xx)*4;
    px[o] = 40; px[o + 1] = 38; px[o + 2] = 46; px[o + 3] = 255;
    if (u < 0 || u >= W || v < 0 || v >= H || !cor[i]) continue;
    const dd = prof[i], dl = u > 0 && cor[i - 1] ? prof[i - 1] : dd + 3, dc = v > 0 && cor[i - W] ? prof[i - W] : dd + 3;
    const L = Math.max(0.55, Math.min(1.15, 0.92 + 0.08*(dl - dd) + 0.07*(dc - dd)));
    px[o] = Math.min(255, cor[i][0]*L); px[o + 1] = Math.min(255, cor[i][1]*L); px[o + 2] = Math.min(255, cor[i][2]*L);
  }
  return {w: w*e, h: h*e, px, R};
}
function lado(saida, imgs, vao){
  vao = vao || 6;
  const W = imgs.reduce((s, i) => s + i.w + vao, -vao), H = Math.max(...imgs.map(i => i.h)), o = new Uint8Array(W*H*4).fill(255);
  let x0 = 0;
  for (const i of imgs){ for (let y = 0; y < i.h; y++) o.set(i.px.subarray(y*i.w*4, (y + 1)*i.w*4), (y*W + x0)*4); x0 += i.w + vao; }
  fs.writeFileSync(saida, png.codificar(W, H, o));
}
function empilhar(saida, linhas){
  const W = Math.max(...linhas.map(l => l.w)), H = linhas.reduce((s, l) => s + l.h + 6, -6), o = new Uint8Array(W*H*4).fill(255);
  let y0 = 0;
  for (const l of linhas){ for (let y = 0; y < l.h; y++) o.set(l.px.subarray(y*l.w*4, (y + 1)*l.w*4), ((y0 + y)*W)*4); y0 += l.h + 6; }
  fs.writeFileSync(saida, png.codificar(W, H, o));
}
function linha(imgs, vao){
  vao = vao || 6;
  const W = imgs.reduce((s, i) => s + i.w + vao, -vao), H = Math.max(...imgs.map(i => i.h)), o = new Uint8Array(W*H*4).fill(255);
  let x0 = 0;
  for (const i of imgs){ for (let y = 0; y < i.h; y++) o.set(i.px.subarray(y*i.w*4, (y + 1)*i.w*4), (y*W + x0)*4); x0 += i.w + vao; }
  return {w: W, h: H, px: o};
}

module.exports = {vista, lado, linha, empilhar};

if (require.main === module){
  const [formaArq, folhaArq, saidaArg] = process.argv.slice(2), saida = saidaArg || __dirname;
  const forma = C.lerWgvox(fs.readFileSync(formaArq));
  const R = T.processar(folhaArq, {forma: formaArq, nome: "guerreiro"});
  const pintado = T.fonteDoVolume(R.V, R.P);
  console.log("alinhamento", JSON.stringify(R.V.alinhamento), "fontes", JSON.stringify(R.P.fonte));
  /* a cabeca: do alto ate o meio do peito, nos dois */
  const H = forma.gz, R0 = Math.ceil(Math.hypot(forma.gx, forma.gy)/2) + 1, cab = [R0 - 45, H - 75, R0 + 45, H];
  const angulos = [0, 35, 70, 110, 145, 180];
  const lin = f => linha(angulos.map(g => vista(f, g, cab, 3)));
  empilhar(path.join(saida, "cabeca-sorceress-x-desenho.png"), [lin(forma), lin(pintado)]);
  const corpo = [0, 0, 2*R0, H];
  empilhar(path.join(saida, "corpo-sorceress-x-desenho.png"), [linha(angulos.map(g => vista(forma, g, corpo, 1))), linha(angulos.map(g => vista(pintado, g, corpo, 1)))]);
  console.log("gravado");
}

/* de cima: o voxel mais alto de cada coluna, com a luz pela altura */
function deCima(f, caixa, esc){
  const [x0, y0, x1, y1] = caixa || [0, 0, f.gx, f.gy], w = x1 - x0, h = y1 - y0, e = esc || 1, alt = new Int32Array(w*h).fill(-1), cor = new Array(w*h).fill(null);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) for (let z = f.gz - 1; z >= 0; z--){ const c = f.rgb(x, y, z); if (c){ alt[(y - y0)*w + x - x0] = z; cor[(y - y0)*w + x - x0] = c; break; } }
  const px = new Uint8Array(w*e*h*e*4);
  for (let yy = 0; yy < h*e; yy++) for (let xx = 0; xx < w*e; xx++){
    const u = (xx/e) | 0, v = (yy/e) | 0, i = v*w + u, o = (yy*w*e + xx)*4;
    px[o] = 40; px[o + 1] = 38; px[o + 2] = 46; px[o + 3] = 255;
    if (!cor[i]) continue;
    const dl = u > 0 && cor[i - 1] ? alt[i] - alt[i - 1] : 0, L = Math.max(0.6, Math.min(1.2, 0.95 + 0.05*dl));
    px[o] = Math.min(255, cor[i][0]*L); px[o + 1] = Math.min(255, cor[i][1]*L); px[o + 2] = Math.min(255, cor[i][2]*L);
  }
  return {w: w*e, h: h*e, px};
}
module.exports.deCima = deCima;
