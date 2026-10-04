/* ============================================================
   CANTEIRO -- A PLANTA
   ------------------------------------------------------------
   O mapa visto de cima, em pixels: a cor de cada tile -- a do terreno, com o
   relevo acendendo a encosta virada para o sol da tarde, a oeste --, e por
   cima o penhasco em vermelho, as pecas em planta e as coisas. O macro pinta
   a base dele com a mesma cor (corDoTile), e a linha de comando grava a
   planta inteira num PNG (cli.js planta), para olhar um mapa sem abrir nada.

   Puro: sem DOM. Devolve {w, h, rgba}, e o PNG e com editor/png.js.
   ============================================================ */
"use strict";
(function(){
  if (typeof module === "undefined") return;
  const usar = function(o){ for (const k in o) if (typeof globalThis[k] === "undefined") globalThis[k] = o[k]; };
  if (typeof TERRENOS === "undefined") usar(require("../src/mapa.js"));
  if (typeof geometriaDaPeca === "undefined") usar(require("../src/pecas.js"));
})();

const RGB_DO_TERRENO = [];
function rgbDoTerreno(k){
  if (!RGB_DO_TERRENO.length)
    for (const t of TERRENOS){
      const n = parseInt(t.cor.slice(1), 16);
      RGB_DO_TERRENO.push([n >> 16 & 255, n >> 8 & 255, n & 255]);
    }
  return RGB_DO_TERRENO[k];
}
/* A cor de um tile. `relevo`: a sombra do sol baixo a oeste; `regiao`: a
   cor da regiao tingindo o tile, para a fronteira aparecer de longe. */
function corDoTile(m, i, opcoes){
  const W = m.larg, x = i % W, y = (i / W) | 0;
  const k = m.terreno[i], t = TERRENOS[k], rgb = rgbDoTerreno(k), h = m.altura[i];
  let f = 1;
  if (!opcoes || opcoes.relevo !== false){
    const hO = x > 0 ? m.altura[i-1] : h;
    const hN = y > 0 ? m.altura[i-W] : h;
    const d = (h - hO) + 0.5*(h - hN);
    f += Math.max(-0.45, Math.min(0.45, d*0.14));
    f += (h - (m.mar === null ? 0 : m.mar))*0.012;
  }
  if (t.tipo === "agua" && m.mar !== null) f -= Math.min(0.4, Math.max(0, m.mar - 1 - h)*0.1);
  let r = rgb[0]*f, g = rgb[1]*f, b = rgb[2]*f;
  if (m.teto[i] > 0 && t.tipo !== "parede"){ r = r*0.55 + 74*0.45; g = g*0.55 + 42*0.45; b = b*0.55 + 64*0.45; }
  if (opcoes && opcoes.regiao && m.regiao && m.regiao[i]){
    const c = corDaRegiao(m.regiao[i]);
    r = r*0.55 + c[0]*0.45; g = g*0.55 + c[1]*0.45; b = b*0.55 + c[2]*0.45;
  }
  return [Math.max(0, Math.min(255, r)) | 0, Math.max(0, Math.min(255, g)) | 0, Math.max(0, Math.min(255, b)) | 0];
}
/* cor estavel por numero de regiao, sem ninguem escolher cor nenhuma */
function corDaRegiao(id){
  const t = (id*47)%360, s = 0.55, l = 0.55;
  const k = function(n){
    const a = (n + t/30) % 12;
    return Math.round(255*(l - s*Math.min(l, 1-l)*Math.max(-1, Math.min(Math.min(a-3, 9-a), 1))));
  };
  return [k(0), k(8), k(4)];
}

/* A planta inteira. `escala` e pixels por tile; `regiao` tinge as regioes;
   `problemas` sao os da validacao, marcados em volta dos lugares deles. */
function planta(m, opcoes){
  opcoes = opcoes || {};
  const E = Math.max(1, opcoes.escala | 0 || 1), W = m.larg*E, H = m.alt*E;
  const rgba = new Uint8Array(W*H*4);
  const por = function(x, y, c, a){
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y*W + x)*4, k = a === undefined ? 1 : a;
    rgba[o] = rgba[o]*(1 - k) + c[0]*k; rgba[o+1] = rgba[o+1]*(1 - k) + c[1]*k; rgba[o+2] = rgba[o+2]*(1 - k) + c[2]*k; rgba[o+3] = 255;
  };
  /* o terreno */
  for (let ty = 0; ty < m.alt; ty++) for (let tx = 0; tx < m.larg; tx++){
    const c = corDoTile(m, ty*m.larg + tx, {regiao: opcoes.regiao});
    for (let y = 0; y < E; y++) for (let x = 0; x < E; x++) por(tx*E + x, ty*E + y, c);
  }
  /* o penhasco -- dois degraus ou mais, que ja nao se sobe andando --, na
     borda entre os dois tiles. Com o chao inclinado ligado, e o que passa do
     limite de degraus dele (opcoes.degraus). */
  const penhasco = (opcoes.degraus || 1) + 1;
  const vermelho = [255, 96, 64];
  if (E >= 2) for (let ty = 0; ty < m.alt; ty++) for (let tx = 0; tx < m.larg; tx++){
    const i = ty*m.larg + tx, h = m.altura[i];
    if (tx + 1 < m.larg && Math.abs(h - m.altura[i + 1]) >= penhasco)
      for (let y = 0; y < E; y++) por((tx + 1)*E, ty*E + y, vermelho, 0.8);
    if (ty + 1 < m.alt && Math.abs(h - m.altura[i + m.larg]) >= penhasco)
      for (let x = 0; x < E; x++) por(tx*E + x, (ty + 1)*E, vermelho, 0.8);
  }
  /* as pecas em planta: o chao que cada solido ocupa, pixel a pixel pelo
     meio do pixel */
  const estilos = estilosDasConstrucoes(m), ouro = [232, 184, 96];
  for (const p of m.pecas || []){
    const g = TIPOS_DE_PECA[p.tipo] ? geometriaDaPeca(p, estiloDaPeca(p, estilos)) : null;
    if (!g) continue;
    for (const s of g.solidos){
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const q of s.pts){ x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      for (let py = Math.floor(y0*E); py <= Math.ceil(y1*E); py++) for (let px = Math.floor(x0*E); px <= Math.ceil(x1*E); px++){
        const cx = (px + 0.5)/E, cy = (py + 0.5)/E;
        let dentro = false;
        for (let a = 0, b = s.pts.length - 1; a < s.pts.length; b = a++){
          const pa = s.pts[a], pb = s.pts[b];
          if ((pa[1] > cy) !== (pb[1] > cy) && cx < (pb[0] - pa[0])*(cy - pa[1])/(pb[1] - pa[1]) + pa[0]) dentro = !dentro;
        }
        /* a peca fina -- a parede de 1/8 -- some entre dois pixels: o pixel
           que ela atravessa conta */
        if (dentro || (x1 - x0)*E < 1.5 && px === Math.floor((x0 + x1)/2*E) && cy >= y0 && cy <= y1 ||
            (y1 - y0)*E < 1.5 && py === Math.floor((y0 + y1)/2*E) && cx >= x0 && cx <= x1) por(px, py, ouro, 0.7);
      }
    }
  }
  /* as coisas: um ponto da cor delas, do tamanho que a escala deixa */
  const r = Math.max(0.5, E*0.36);
  for (const c of m.coisas){
    const def = COISA_POR_ID[c.tipo];
    if (!def) continue;
    const n = parseInt(def.cor.slice(1), 16), cor = [n >> 16 & 255, n >> 8 & 255, n & 255];
    const cx = (c.x + 0.5)*E, cy = (c.y + 0.5)*E;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) por(x, y, cor);
  }
  /* os problemas: um quadrado em volta de cada lugar, vermelho no erro */
  for (const p of opcoes.problemas || []){
    const cor = p.nivel === "erro" ? [255, 40, 30] : [255, 220, 120];
    for (const l of p.lugares || [p]){
      if (!(l.x >= 0)) continue;
      const lado = Math.max(3, E*2), x0 = Math.round((l.x + 0.5)*E - lado/2), y0 = Math.round((l.y + 0.5)*E - lado/2);
      for (let k = 0; k <= lado; k++){ por(x0 + k, y0, cor); por(x0 + k, y0 + lado, cor); por(x0, y0 + k, cor); por(x0 + lado, y0 + k, cor); }
    }
  }
  return {w: W, h: H, rgba: rgba};
}

if (typeof module !== "undefined") module.exports = {corDoTile, corDaRegiao, planta};
