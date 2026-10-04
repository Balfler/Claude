/* ============================================================
   CANTEIRO -- O QUE SE VE E O QUE FALTA
   ------------------------------------------------------------
   Duas perguntas de quem desenha o mundo, respondidas sobre o mapa de cima:

   - o VAZIO: quantos tiles se anda, de cada chao, ate a coisa interessante
     mais perto -- um marco (morador, placa, entrada, bau), uma construcao.
     A regra do DESIGN e algo novo a cada 20 a 40 segundos de caminhada, uns
     60 a 120 tiles: o calor pinta de vermelho o que passa disso. A conta
     anda pela terra (agua e rocha nao se atravessam) em oito direcoes, com a
     diagonal custando 1,5 -- perto da distancia de verdade, sem raiz;
   - a VISTA: de um ponto, na altura do olho, que tiles se ve ate o alcance
     do motor (60 tiles). Um raio para cada tile, que o relevo e a rocha
     tapam; as pecas nao entram -- e a pergunta de onde por a torre, o marco
     que se ve de longe, a curva que esconde o que vem.

   Puro: sem DOM. O macro pinta as duas por cima do mapa.
   ============================================================ */
"use strict";
(function(){
  if (typeof module === "undefined") return;
  const usar = function(o){ for (const k in o) if (typeof globalThis[k] === "undefined") globalThis[k] = o[k]; };
  if (typeof TERRENOS === "undefined") usar(require("../src/mapa.js"));
})();

/* o que conta como coisa interessante: todo marco menos o inicio, e toda
   peca -- uma construcao se ve de longe */
const MARCO_INTERESSA = function(c){
  const d = COISA_POR_ID[c.tipo];
  return d && d.grupo === "marco" && c.tipo !== "jogador" && c.tipo !== "luz" && c.tipo !== "som";
};
const VAZIO_BOM = 60, VAZIO_RUIM = 120;           // em tiles: 20 e 40 segundos a 3 tiles por segundo

/* Devolve {dist: Float32Array por tile (Infinity no chao aonde nenhuma
   fonte chega, NaN onde nao ha chao), fontes}. */
function calorDoVazio(m){
  const W = m.larg, H = m.alt, n = W*H;
  const dist = new Float32Array(n).fill(Infinity);
  const anda = new Uint8Array(n);
  for (let i = 0; i < n; i++){ const t = TERRENOS[m.terreno[i]].tipo; anda[i] = t === "chao" || t === "porta" ? 1 : 0; }
  /* as fontes: o tile do marco e o de cada peca, mesmo que a peca esteja
     num tile que nao se anda -- a torre na rocha tambem se ve */
  const fontes = [];
  const fonte = function(x, y){
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y*W + x;
    if (dist[i] === 0) return;
    dist[i] = 0; fontes.push(i);
  };
  for (const c of m.coisas) if (MARCO_INTERESSA(c)) fonte(c.x, c.y);
  for (const p of m.pecas || []) fonte(Math.floor(p.x), Math.floor(p.y));
  /* Dijkstra com fila de baldes: os custos sao 2 (reto) e 3 (diagonal),
     meios tiles -- entao o balde e o custo, e a fila anda em ordem */
  const baldes = [fontes.slice()], custo = new Int32Array(n).fill(-1);
  for (const i of fontes) custo[i] = 0;
  const VIZ = [[1, 0, 2], [-1, 0, 2], [0, 1, 2], [0, -1, 2], [1, 1, 3], [-1, 1, 3], [1, -1, 3], [-1, -1, 3]];
  for (let c = 0; c < baldes.length; c++){
    const b = baldes[c];
    if (!b) continue;
    for (let k = 0; k < b.length; k++){
      const i = b[k];
      if (custo[i] !== c) continue;
      const x = i % W, y = (i / W) | 0;
      for (const v of VIZ){
        const nx = x + v[0], ny = y + v[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny*W + nx;
        if (!anda[j]) continue;
        /* a diagonal so passa se os dois lados retos passam: nada de
           atravessar a quina da agua */
        if (v[2] === 3 && (!anda[y*W + nx] || !anda[ny*W + x])) continue;
        const nc = c + v[2];
        if (custo[j] >= 0 && custo[j] <= nc) continue;
        custo[j] = nc;
        (baldes[nc] || (baldes[nc] = [])).push(j);
      }
    }
    baldes[c] = null;
  }
  /* o chao que nenhuma fonte alcanca -- do outro lado do rio -- e o vazio
     inteiro (Infinity); o que nao e chao nao tem conta (NaN) */
  for (let i = 0; i < n; i++){
    if (custo[i] >= 0 && (anda[i] || dist[i] === 0)) dist[i] = custo[i]/2;
    else if (!anda[i]) dist[i] = NaN;
  }
  return {dist: dist, fontes: fontes.length};
}
/* a cor do calor: nada perto de uma fonte, amarelo chegando no bom,
   vermelho no ruim e alem; sem cor onde nao ha chao */
function corDoVazio(d){
  if (d !== d) return null;
  if (d === Infinity) return [255, 30, 20, 170];
  if (d <= VAZIO_BOM/2) return null;
  if (d <= VAZIO_BOM){ const t = (d - VAZIO_BOM/2)/(VAZIO_BOM/2); return [Math.round(120 + 135*t), 200, 60, Math.round(40 + 50*t)]; }
  const t = Math.min(1, (d - VAZIO_BOM)/(VAZIO_RUIM - VAZIO_BOM));
  return [255, Math.round(200 - 170*t), Math.round(60 - 40*t), Math.round(90 + 80*t)];
}

/* ---------- a vista ----------
   A altura do que tapa em cada tile: o chao, o alto da rocha (como o motor
   faz, tileDoMotor em src/ilha.js) e a agua pela superficie. */
function topoDoTile(m, i){
  const t = TERRENOS[m.terreno[i]], W = m.larg, x = i % W, y = (i / W) | 0, passo = m.passo;
  if (t.tipo === "agua") return m.mar === null ? m.altura[i]*passo : Math.max(m.altura[i], m.mar)*passo;
  if (t.tipo === "parede"){
    let base = m.altura[i];
    for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]]){
      const xx = x + d[0], yy = y + d[1];
      if (xx < 0 || yy < 0 || xx >= W || yy >= m.alt) continue;
      const j = yy*W + xx;
      if (TERRENOS[m.terreno[j]].tipo === "chao") base = Math.max(base, m.altura[j]);
    }
    return (base + (m.teto[i] > 0 ? m.teto[i] : (t.alto || 6)))*passo;
  }
  return m.altura[i]*passo;
}
/* Devolve {x0, y0, lado, ve: Uint8Array lado*lado}: 1 onde se ve o chao do
   tile, 0 onde algo tapa, e fora do alcance tambem 0. O olho fica a
   `olho` tiles acima do chao de (x, y). */
function vistaDe(m, x, y, olho, alcance){
  const R = alcance || 60, W = m.larg, H = m.alt;
  const x0 = x - R, y0 = y - R, lado = 2*R + 1, ve = new Uint8Array(lado*lado);
  const ox = x + 0.5, oy = y + 0.5, oz = topoDoTile(m, y*W + x) + (olho === undefined ? 0.6 : olho);
  const topo = function(tx, ty){ return tx < 0 || ty < 0 || tx >= W || ty >= H ? -Infinity : topoDoTile(m, ty*W + tx); };
  for (let ty = y - R; ty <= y + R; ty++) for (let tx = x - R; tx <= x + R; tx++){
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
    const dx = tx + 0.5 - ox, dy = ty + 0.5 - oy, d = Math.hypot(dx, dy);
    if (d > R) continue;
    const alvo = topo(tx, ty) + 0.05, passos = Math.ceil(d*2);
    let visto = true;
    /* o raio, de meio em meio tile: tapa se o que esta no caminho sobe
       acima da linha do olho ao chao do alvo */
    for (let s = 1; s < passos; s++){
      const t = s/passos, px = ox + dx*t, py = oy + dy*t;
      const cx = Math.floor(px), cy = Math.floor(py);
      if (cx === tx && cy === ty) break;
      if (topo(cx, cy) > oz + (alvo - oz)*t){ visto = false; break; }
    }
    if (visto) ve[(ty - y0)*lado + (tx - x0)] = 1;
  }
  return {x0: x0, y0: y0, lado: lado, ve: ve, olho: oz};
}

if (typeof module !== "undefined") module.exports = {VAZIO_BOM, VAZIO_RUIM, calorDoVazio, corDoVazio, topoDoTile, vistaDe};
