/* ============================================================
   BANCADA -- GEOMETRIA EM PEDACOS E COLISAO COM PECAS
   ------------------------------------------------------------
   Tres medidas do motor novo que nao dependem de desenhar:

   1. Montar a ilha de 650x650 uma vez so, em pedacos de P x P tiles:
      quantos quads, quanta memoria, quanto tempo, e quanto leva remontar
      UM pedaco depois de uma edicao. Piso igual vizinho (mesma altura,
      mesmo terreno) funde num quad so, ate F x F tiles.
   2. Colisao com peca: a fortaleza da bancada vira solidos (prismas
      convexos com piso e topo), guardados por tile; mede-se a pergunta
      "bate?" e "qual o chao aqui?" que a fisica faz a cada passo.
   3. A grade de andar em varios andares: cada meio tile guarda os pisos
      onde se fica de pe; mede-se montar e percorrer (o alcance da
      validacao e a busca de caminho dos inimigos usam a mesma).

     node mundo-perigoso/canteiro/bancada/pedacos.js [arquivo.mapa]
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const M = require("../../src/mapa.js");

const arq = process.argv[2] || path.join(__dirname, "..", "..", "Arte", "ilha 2.mapa");
const m = M.lerMapa(fs.readFileSync(arq, "utf8")).mapa;
const W = m.larg, H = m.alt;
const piso = new Float32Array(W*H);
for (let i = 0; i < W*H; i++){
  const t = M.TERRENOS[m.terreno[i]];
  piso[i] = t.tipo === "agua" ? m.mar*0.25 - 0.12 : t.tipo === "parede" ? (m.altura[i] + (t.alto || 6))*0.25 : m.altura[i]*0.25;
}

/* 1. pedacos ------------------------------------------------------------ */
function montarPedaco(px, py, P, F, saida){
  let quads = 0;
  const x1 = Math.min(W, px + P), y1 = Math.min(H, py + P);
  const feito = new Uint8Array(P*P);
  for (let y = py; y < y1; y++) for (let x = px; x < x1; x++){
    const k = (y - py)*P + (x - px);
    if (feito[k]) continue;
    const i = y*W + x, h = piso[i], t = m.terreno[i];
    let w = 1; while (x + w < x1 && w < F && !feito[k + w] && piso[i + w] === h && m.terreno[i + w] === t) w++;
    let d = 1;
    fora: while (y + d < y1 && d < F){
      for (let j = 0; j < w; j++){ const ii = (y + d)*W + x + j; if (feito[(y + d - py)*P + x - px + j] || piso[ii] !== h || m.terreno[ii] !== t) break fora; }
      d++;
    }
    for (let dy = 0; dy < d; dy++) for (let dx = 0; dx < w; dx++) feito[(y - py + dy)*P + x - px + dx] = 1;
    quads++;
    if (saida) saida.push(x, y, h, x + w, y + d, h, t, 0);
  }
  /* degraus: uma face por aresta de tile onde o vizinho e mais alto */
  for (let y = py; y < y1; y++) for (let x = px; x < x1; x++){
    const i = y*W + x, h = piso[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (piso[ny*W + nx] > h + 0.001){ quads++; if (saida) saida.push(x, y, h, nx, ny, piso[ny*W + nx], 0, 1); }
    }
  }
  return quads;
}
const BYTES_POR_QUAD = 16*4 + 4;            // 12 coordenadas + 4 de textura em Float32, e o indice da textura
console.log(path.basename(arq) + " " + W + "x" + H);
for (const [P, F] of [[16, 1], [16, 4], [16, 8], [32, 8], [32, 16]]){
  const t0 = process.hrtime.bigint();
  let total = 0, pedacos = 0, maior = 0;
  for (let py = 0; py < H; py += P) for (let px = 0; px < W; px += P){ const q = montarPedaco(px, py, P, F); total += q; pedacos++; if (q > maior) maior = q; }
  const ms = Number(process.hrtime.bigint() - t0)/1e6;
  /* remontar um pedaco: o de mais relevo */
  let pior = null, qpior = -1;
  for (let py = 0; py < H; py += P) for (let px = 0; px < W; px += P){ const q = montarPedaco(px, py, P, F); if (q > qpior){ qpior = q; pior = [px, py]; } }
  const t1 = process.hrtime.bigint();
  for (let r = 0; r < 200; r++) montarPedaco(pior[0], pior[1], P, F, []);
  const umMs = Number(process.hrtime.bigint() - t1)/1e6/200;
  console.log("pedaco " + P + ", funde ate " + F + "x" + F + ": " + total + " quads em " + pedacos + " pedacos (" +
    (total*BYTES_POR_QUAD/1048576).toFixed(1) + " MB), a ilha inteira em " + ms.toFixed(0) + " ms; o pedaco mais cheio tem " +
    maior + " quads e remonta em " + umMs.toFixed(2) + " ms");
}
/* o que o jogo de hoje emite por quadro no mesmo raio de 60, sem fundir */
{
  let q = 0; const cx = 325, cy = 325;
  for (let y = cy - 60; y < cy + 60; y++) for (let x = cx - 60; x < cx + 60; x++) if ((x - cx)*(x - cx) + (y - cy)*(y - cy) < 3600) q++;
  console.log("(no raio de 60 tiles cabem " + q + " tiles: sem fundir, sao no minimo " + q + " quads de piso por quadro, todo quadro)");
}

/* 2. colisao ------------------------------------------------------------ */
/* Solido: poligono convexo no chao (anti-horario), de z0 a z1. A fortaleza
   da bancada tem 5099 quads; aqui, os solidos dela. */
const solidos = [];
function caixa(x0, y0, z0, x1, y1, z1){ solidos.push({pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0: z0, z1: z1}); }
function prisma(cx, cy, r, z0, z1, n){ const pts = []; for (let i = 0; i < n; i++){ const a = i/n*Math.PI*2; pts.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]); } solidos.push({pts: pts, z0: z0, z1: z1}); }
{
  const z = 2, cx = 80, cy = 80, h = 20;
  for (let t = -h + 2.5; t < h - 2.5; t++){
    caixa(cx + t, cy - h - 0.5, z, cx + t + 1, cy - h + 0.5, z + 4); caixa(cx + t, cy + h - 0.5, z, cx + t + 1, cy + h + 0.5, z + 4);
    caixa(cx - h - 0.5, cy + t, z, cx - h + 0.5, cy + t + 1, z + 4); caixa(cx + h - 0.5, cy + t, z, cx + h + 0.5, cy + t + 1, z + 4);
    for (const mm of [0, 0.5]){
      caixa(cx + t + mm, cy - h - 0.5, z + 4, cx + t + mm + 0.25, cy - h - 0.25, z + 4.5);
      caixa(cx + t + mm, cy + h + 0.25, z + 4, cx + t + mm + 0.25, cy + h + 0.5, z + 4.5);
    }
  }
  for (const c of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) prisma(cx + c[0]*h, cy + c[1]*h, 2.5, z, z + 6, 16);
  for (let k = 0; k < 12; k++){
    const hx = cx - h + 5 + (k % 4)*7.5, hy = cy - h + 6 + ((k/4) | 0)*9.5, e = 0.125;
    for (let a = 0; a < 2; a++){
      const zb = z + a*1.5;
      caixa(hx, hy, zb, hx + 5, hy + e, zb + 1.5); caixa(hx, hy + 4 - e, zb, hx + 5, hy + 4, zb + 1.5);
      caixa(hx, hy, zb, hx + e, hy + 4, zb + 1.5); caixa(hx + 5 - e, hy, zb, hx + 5, hy + 4, zb + 1.5);
      caixa(hx, hy, zb + 1.38, hx + 5, hy + 4, zb + 1.5);                           // laje do andar de cima / forro
    }
    caixa(hx + 1.5, hy - 1, z + 1.38, hx + 3.5, hy, z + 1.5);                           // sacada
  }
}
const GW = 160, porTile = Array.from({length: GW*GW}, () => []);
solidos.forEach(function(s, k){
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of s.pts){ x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  s.caixa = [x0, y0, x1, y1];
  for (let y = Math.floor(y0); y <= Math.floor(y1 - 1e-9); y++) for (let x = Math.floor(x0); x <= Math.floor(x1 - 1e-9); x++) porTile[y*GW + x].push(k);
});
/* distancia do circulo ao poligono convexo: dentro, ou perto de uma aresta */
function circuloToca(s, x, y, r){
  const c = s.caixa;
  if (x + r < c[0] || x - r > c[2] || y + r < c[1] || y - r > c[3]) return false;
  const p = s.pts, n = p.length;
  let dentro = true;
  for (let i = 0; i < n; i++){
    const a = p[i], b = p[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1];
    if (ex*(y - a[1]) - ey*(x - a[0]) < 0){ dentro = false; break; }
  }
  if (dentro) return true;
  for (let i = 0; i < n; i++){
    const a = p[i], b = p[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1];
    let t = ((x - a[0])*ex + (y - a[1])*ey)/(ex*ex + ey*ey); t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - a[0] - ex*t, dy = y - a[1] - ey*t;
    if (dx*dx + dy*dy < r*r) return true;
  }
  return false;
}
const STEP = 0.42;
let visto = new Uint32Array(solidos.length), marca = 0;
function bate(x, y, r, z, h){
  marca++;
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++){
    const l = porTile[ty*GW + tx];
    for (let k = 0; k < l.length; k++){
      const j = l[k]; if (visto[j] === marca) continue; visto[j] = marca;
      const s = solidos[j];
      if (s.z1 <= z + STEP || s.z0 >= z + h) continue;
      if (circuloToca(s, x, y, r)) return true;
    }
  }
  return false;
}
function chao(x, y, r, z){
  let best = 2; marca++;
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++){
    const l = porTile[ty*GW + tx];
    for (let k = 0; k < l.length; k++){
      const j = l[k]; if (visto[j] === marca) continue; visto[j] = marca;
      const s = solidos[j];
      if (s.z1 > z + STEP || s.z1 <= best) continue;
      if (circuloToca(s, x, y, r)) best = s.z1;
    }
  }
  return best;
}
{
  const N = 400000;
  let rnd = 12345; const sorte = () => (rnd = (rnd*1664525 + 1013904223) >>> 0)/4294967296;
  const pts = []; for (let i = 0; i < N; i++) pts.push([58 + sorte()*44, 58 + sorte()*44, 2 + (sorte() < 0.3 ? 1.5 : 0)]);
  let t0 = process.hrtime.bigint(), n = 0;
  for (const p of pts) if (bate(p[0], p[1], 0.26, p[2], 0.85)) n++;
  const tb = Number(process.hrtime.bigint() - t0)/N;
  t0 = process.hrtime.bigint(); let s = 0;
  for (const p of pts) s += chao(p[0], p[1], 0.26, p[2]);
  const tc = Number(process.hrtime.bigint() - t0)/N;
  let maxL = 0; for (const l of porTile) maxL = Math.max(maxL, l.length);
  console.log("colisao: " + solidos.length + " solidos na fortaleza, ate " + maxL + " por tile; 'bate?' " + (tb/1000).toFixed(2) +
    " us, 'qual o chao?' " + (tc/1000).toFixed(2) + " us por pergunta (" + (100*n/N).toFixed(0) + "% dos pontos batem)");
  console.log("  um passo de 1/60 s com o jogador e 30 criaturas faz umas " + (5 + 30*4) + " perguntas: " + ((5 + 30*4)*Math.max(tb, tc)/1e6).toFixed(3) + " ms");
}

/* 3. a grade de andar ---------------------------------------------------- */
/* Cada meio tile guarda a lista dos pisos onde se fica de pe: o chao do
   terreno e o topo de cada solido, se sobra 0,85 de altura livre em cima.
   Andar para o vizinho vale se algum piso dele fica ate STEP acima (ou
   qualquer quanto abaixo) e nada bate no meio do caminho. */
{
  const C = 2, GN = GW*C, t0 = process.hrtime.bigint();
  const pisos = new Array(GN*GN);
  let camadas = 0, multiplos = 0;
  for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++){
    const x = (gx + 0.5)/C, y = (gy + 0.5)/C, tops = [2];
    const l = porTile[Math.floor(y)*GW + Math.floor(x)];
    for (const j of l){ const s = solidos[j]; if (circuloToca(s, x, y, 0.01)) tops.push(s.z1); }
    const ok = [];
    for (const zt of tops){
      let livre = true;
      for (const j of l){ const s = solidos[j]; if (s.z0 < zt + 0.85 && s.z1 > zt + 0.01 && circuloToca(s, x, y, 0.2)){ livre = false; break; } }
      if (livre) ok.push(zt);
    }
    pisos[gy*GN + gx] = ok; camadas += ok.length; if (ok.length > 1) multiplos++;
  }
  const tMontar = Number(process.hrtime.bigint() - t0)/1e6;
  /* percorrer tudo a partir de um canto, como o alcance da validacao */
  const t1 = process.hrtime.bigint();
  const chave = (g, k) => g*4 + k, vistoG = new Uint8Array(GN*GN*4), fila = [chave(0, 0)];
  vistoG[fila[0]] = 1; let alcancados = 0;
  while (fila.length){
    const c = fila.pop(), g = c >> 2, k = c & 3, zc = pisos[g][k], gx = g % GN, gy = (g/GN) | 0;
    alcancados++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
      const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= GN || ny >= GN) continue;
      const ps = pisos[ny*GN + nx];
      for (let j = 0; j < ps.length; j++){
        if (ps[j] > zc + STEP) continue;
        const cc = chave(ny*GN + nx, j); if (vistoG[cc]) continue;
        if (bate((nx + 0.5)/C, (ny + 0.5)/C, 0.2, ps[j], 0.85)) continue;
        vistoG[cc] = 1; fila.push(cc);
      }
    }
  }
  const tAndar = Number(process.hrtime.bigint() - t1)/1e6;
  console.log("grade de andar em meio tile, 160x160 tiles com a fortaleza: " + camadas + " pisos, " + multiplos +
    " celulas com mais de um andar; montar " + tMontar.toFixed(0) + " ms, percorrer tudo " + tAndar.toFixed(0) + " ms (" + alcancados + " pisos alcancados)");
  console.log("  na ilha de 650x650 isso escala para uns " + (tMontar*(650*650)/(160*160)).toFixed(0) + " ms e " + (tAndar*(650*650)/(160*160)).toFixed(0) + " ms");
}
