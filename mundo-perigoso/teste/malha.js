/* A peca vista de fora: desenhada de 65 direcoes, uma vez com todas as
   faces dos dois lados e outra so com as de frente -- a regra do motor: a
   face e desenhada do lado para onde aponta a normal de Newell dos cantos
   (fecharFace, em src/p2b.js). Onde a mais perto e um avesso, a peca mostra
   o que nao devia: um buraco, ou uma face virada para dentro, que de fora
   some e deixa ver o avesso do fundo -- a peca "folha".

   Um chao falso no fundo da peca entra nas duas: o fundo aberto de quem
   assenta no chao nao conta. Devolve a pior fracao de pixels errados entre
   as direcoes, e a direcao.

   So para teste: nao entra no jogo. */
"use strict";
function normal(pts){
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++){
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1])*(a[2] + b[2]); ny += (a[2] - b[2])*(a[0] + b[0]); nz += (a[0] - b[0])*(a[1] + b[1]);
  }
  const L = Math.hypot(nx, ny, nz) || 1;
  return [nx/L, ny/L, nz/L];
}
const LADO = 72;
const DIRECOES = (function(){
  const out = [];
  for (const el of [-25, 0, 30, 60, 89]) for (let az = 0; az < 360; az += (el === 89 ? 360 : 360/16)){
    const e = el*Math.PI/180, a = az*Math.PI/180;
    out.push([-Math.cos(e)*Math.cos(a), -Math.cos(e)*Math.sin(a), -Math.sin(e)]);
  }
  return out;
})();
function vistaDaPeca(g){
  const N = LADO;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const f of g.faces) for (const p of f.pts){
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
  }
  const m = 0.02, chao = [[x0 - m, y0 - m, z0], [x1 + m, y0 - m, z0], [x1 + m, y1 + m, z0], [x0 - m, y1 + m, z0]];
  const faces = g.faces.map(function(f){ return {pts: f.pts, n: normal(f.pts)}; });
  const c = [(x0 + x1)/2, (y0 + y1)/2, (z0 + z1)/2], R = Math.hypot(x1 - x0, y1 - y0, z1 - z0)/2 + 0.01;
  let pior = 0, piorDir = null;
  for (const d of DIRECOES){
    const up = Math.abs(d[2]) > 0.99 ? [1, 0, 0] : [0, 0, 1];
    let r = [d[1]*up[2] - d[2]*up[1], d[2]*up[0] - d[0]*up[2], d[0]*up[1] - d[1]*up[0]];
    const lr = Math.hypot(r[0], r[1], r[2]); r = [r[0]/lr, r[1]/lr, r[2]/lr];
    const u = [r[1]*d[2] - r[2]*d[1], r[2]*d[0] - r[0]*d[2], r[0]*d[1] - r[1]*d[0]];
    const todos = new Float32Array(N*N).fill(Infinity), frente = new Float32Array(N*N).fill(Infinity);
    const proj = function(p){
      const q = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
      return [(q[0]*r[0] + q[1]*r[1] + q[2]*r[2])/(2*R)*N + N/2, (q[0]*u[0] + q[1]*u[1] + q[2]*u[2])/(2*R)*N + N/2,
              q[0]*d[0] + q[1]*d[1] + q[2]*d[2]];
    };
    const tri = function(a, b, cc, buf){
      const xa = Math.max(0, Math.floor(Math.min(a[0], b[0], cc[0]))), xb = Math.min(N - 1, Math.ceil(Math.max(a[0], b[0], cc[0])));
      const ya = Math.max(0, Math.floor(Math.min(a[1], b[1], cc[1]))), yb = Math.min(N - 1, Math.ceil(Math.max(a[1], b[1], cc[1])));
      const den = (b[1] - cc[1])*(a[0] - cc[0]) + (cc[0] - b[0])*(a[1] - cc[1]);
      if (Math.abs(den) < 1e-12) return;
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){
        const px = x + 0.5, py = y + 0.5;
        const l1 = ((b[1] - cc[1])*(px - cc[0]) + (cc[0] - b[0])*(py - cc[1]))/den;
        const l2 = ((cc[1] - a[1])*(px - cc[0]) + (a[0] - cc[0])*(py - cc[1]))/den;
        const l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        const z = l1*a[2] + l2*b[2] + l3*cc[2], k = y*N + x;
        if (z < buf[k]) buf[k] = z;
      }
    };
    const desenhar = function(pts, buf){
      const q = pts.map(proj);
      for (let i = 1; i + 1 < q.length; i++) tri(q[0], q[i], q[i + 1], buf);
    };
    desenhar(chao, todos); desenhar(chao, frente);
    for (const f of faces){
      desenhar(f.pts, todos);
      if (f.n[0]*d[0] + f.n[1]*d[1] + f.n[2]*d[2] < 0) desenhar(f.pts, frente);
    }
    let cheios = 0, errados = 0;
    for (let k = 0; k < N*N; k++){
      if (todos[k] === Infinity) continue;
      cheios++;
      if (frente[k] > todos[k] + 1e-3*R) errados++;
    }
    const fr = cheios ? errados/cheios : 0;
    if (fr > pior){ pior = fr; piorDir = d; }
  }
  return {pior: pior, direcao: piorDir};
}
module.exports = {vistaDaPeca, normal};
