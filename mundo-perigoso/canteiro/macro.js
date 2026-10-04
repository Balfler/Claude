/* ============================================================
   CANTEIRO -- O MACRO
   ------------------------------------------------------------
   O mapa inteiro visto de cima: a geografia. O mesmo arquivo e o mesmo
   desfazer do micro -- Tab troca de um para o outro NO MESMO PONTO.

   O mapa vive numa imagem de um pixel por tile, que o canvas estica com o
   zoom; pintar um tile e trocar um pixel, entao 650x650 desenha em qualquer
   zoom sem engasgar. O que precisa de nitidez -- grade, curvas de nivel,
   pecas em planta, coisas, regua -- vai por cima, so para o que esta na
   tela. E a mesma ideia do editor de mapa, que aguentou a ilha de 200.

   As ferramentas sao as de editor/operacoes.js, ja testadas: pincel, balde,
   retangulo, suavizar, espalhar, e as novas -- a rampa entre dois pontos e o
   traco de estrada, rio ou muro, que acertam o relevo embaixo deles.
   ============================================================ */
"use strict";
const MACRO = {
  ligado: false,
  mapa: null,
  cam: {x: 0, y: 0, zoom: 4},              // x, y: tile do canto; zoom: pixels por tile
  camada: "terreno",
  ferr: "pincel",
  tamanho: 3,
  largura: 3,
  valor: {terreno: 3, altura: 4, teto: 5, coisa: "arvore", regiao: 1},
  modoAltura: "subir",
  relevoDoTraco: "rampa",
  densidade: 0.15,
  vista: {grade: true, relevo: true, curvas: true, coisas: true, pecas: true},
  mouse: {tx: -1, ty: -1, sx: 0, sy: 0, dentro: false},
  arrasto: null,
  medida: null,
  destaque: null,                          // o problema clicado na lista: {x, y, lugares, ate}
  carimbo: null,                           // o pedaco na mao (editor/operacoes.js, recortar)
  ref: null,                               // a imagem de referencia por baixo: {img, opac}
  ferrAntes: "pincel",                     // a ferramenta de antes do conta-gotas
  vazio: {img: null, velho: true, quando: 0},   // o calor do vazio (olhar.js), refeito quando o mapa muda
  visao: null,                             // a vista de um ponto: {x, y, img, x0, y0, lado, vistos}
  relevo: {amplitude: 6, escala: 16, semente: 1, andavel: true},
  pedido: false
};
let baseMacro = null, baseCtxMacro = null, baseImgMacro = null;
/* a cor do tile e a da planta (planta.js): o macro e a linha de comando
   pintam igual */
function corDoTileMacro(i){
  const c = corDoTile(MACRO.mapa, i, {relevo: MACRO.vista.relevo, regiao: MACRO.camada === "regiao"});
  const p = i*4, px = baseImgMacro.data;
  px[p] = c[0]; px[p+1] = c[1]; px[p+2] = c[2]; px[p+3] = 255;
}
function prepararBaseMacro(m){
  MACRO.mapa = m;
  baseMacro = document.createElement("canvas");
  baseMacro.width = m.larg; baseMacro.height = m.alt;
  baseCtxMacro = baseMacro.getContext("2d");
  baseImgMacro = baseCtxMacro.createImageData(m.larg, m.alt);
  MACRO.tingido = MACRO.camada === "regiao";
  recalcularBaseMacro();
}
function recalcularBaseMacro(){
  const n = MACRO.mapa.larg*MACRO.mapa.alt;
  for (let i = 0; i < n; i++) corDoTileMacro(i);
  baseCtxMacro.putImageData(baseImgMacro, 0, 0);
}
/* o relevo de um tile depende do vizinho de oeste e do de norte, entao quem
   muda tambem muda a sombra do vizinho de leste e do de sul */
function recalcularTilesMacro(tiles){
  const m = MACRO.mapa, W = m.larg;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const t of tiles){
    const x = t[0], y = t[1];
    if (x < 0 || y < 0 || x >= W || y >= m.alt) continue;
    const i = y*W + x;
    corDoTileMacro(i);
    if (x + 1 < W) corDoTileMacro(i + 1);
    if (y + 1 < m.alt) corDoTileMacro(i + W);
    if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1;
    if (y < y0) y0 = y; if (y + 1 > y1) y1 = y + 1;
  }
  if (x1 < 0) return;
  /* so o retangulo mexido volta para o canvas: mandar a imagem inteira de
     650x650 custava 2 ms por passo de pincel */
  baseCtxMacro.putImageData(baseImgMacro, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}

/* ---------- o vazio e a vista (olhar.js), em imagem ---------- */
function atualizarVazio(m){
  const c = calorDoVazio(m), W = m.larg, H = m.alt;
  const img = document.createElement("canvas");
  img.width = W; img.height = H;
  const cx = img.getContext("2d"), dados = cx.createImageData(W, H), px = dados.data;
  let ruins = 0;
  for (let i = 0; i < W*H; i++){
    const cor = corDoVazio(c.dist[i]);
    if (!cor) continue;
    px[4*i] = cor[0]; px[4*i + 1] = cor[1]; px[4*i + 2] = cor[2]; px[4*i + 3] = cor[3];
    if (!(c.dist[i] <= VAZIO_RUIM)) ruins++;
  }
  cx.putImageData(dados, 0, 0);
  MACRO.vazio = {img: img, velho: false, quando: performance.now(), ruins: ruins, fontes: c.fontes};
}
function mostrarVisao(m, x, y, olho){
  const v = vistaDe(m, x, y, olho, 60), img = document.createElement("canvas");
  img.width = v.lado; img.height = v.lado;
  const cx = img.getContext("2d"), dados = cx.createImageData(v.lado, v.lado), px = dados.data;
  let vistos = 0;
  for (let j = 0; j < v.lado; j++) for (let i = 0; i < v.lado; i++){
    const tx = v.x0 + i, ty = v.y0 + j, k = j*v.lado + i;
    if (tx < 0 || ty < 0 || tx >= m.larg || ty >= m.alt || Math.hypot(i - 60, j - 60) > 60) continue;
    if (v.ve[k]){ px[4*k] = 255; px[4*k + 1] = 240; px[4*k + 2] = 180; px[4*k + 3] = 70; vistos++; }
    else { px[4*k] = 10; px[4*k + 1] = 8; px[4*k + 2] = 20; px[4*k + 3] = 150; }
  }
  cx.putImageData(dados, 0, 0);
  MACRO.visao = {mapa: m, x: x, y: y, img: img, x0: v.x0, y0: v.y0, lado: v.lado, vistos: vistos, olho: olho};
  return vistos;
}

/* ---------- camera ---------- */
function telaDoMacro(){ const c = document.getElementById("mapa2d"); return {c: c, w: c.clientWidth, h: c.clientHeight}; }
function ajustarCanvasMacro(){
  const t = telaDoMacro(), dpr = window.devicePixelRatio || 1;
  t.c.width = Math.max(1, Math.round(t.w*dpr));
  t.c.height = Math.max(1, Math.round(t.h*dpr));
}
function telaParaTileMacro(sx, sy){
  const z = MACRO.cam.zoom;
  return {tx: Math.floor(MACRO.cam.x + sx/z), ty: Math.floor(MACRO.cam.y + sy/z)};
}
function zoomMacro(sx, sy, fator){
  const z = MACRO.cam.zoom, nz = Math.max(0.5, Math.min(64, z*fator));
  const wx = MACRO.cam.x + sx/z, wy = MACRO.cam.y + sy/z;
  MACRO.cam.zoom = nz; MACRO.cam.x = wx - sx/nz; MACRO.cam.y = wy - sy/nz;
}
function enquadrarMacro(){
  const t = telaDoMacro(), m = MACRO.mapa;
  if (!m || t.w < 40) return;
  const z = Math.max(0.5, Math.min(t.w/m.larg, t.h/m.alt)*0.94);
  MACRO.cam.zoom = z;
  MACRO.cam.x = (m.larg - t.w/z)/2;
  MACRO.cam.y = (m.alt - t.h/z)/2;
}
function centrarMacro(tx, ty){
  const t = telaDoMacro(), z = MACRO.cam.zoom;
  MACRO.cam.x = tx + 0.5 - t.w/z/2;
  MACRO.cam.y = ty + 0.5 - t.h/z/2;
}

/* ---------- desenho ---------- */
function desenharMacro(){
  const m = MACRO.mapa;
  if (!m || !baseMacro) return;
  const t = telaDoMacro(), ctx2 = t.c.getContext("2d");
  const dpr = window.devicePixelRatio || 1, cw = t.c.width/dpr, ch = t.c.height/dpr;
  ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx2.fillStyle = "#0b0907";
  ctx2.fillRect(0, 0, cw, ch);
  const z = MACRO.cam.zoom, ox = -MACRO.cam.x*z, oy = -MACRO.cam.y*z;
  const X = function(tx){ return ox + tx*z; }, Y = function(ty){ return oy + ty*z; };
  ctx2.imageSmoothingEnabled = false;
  ctx2.drawImage(baseMacro, ox, oy, m.larg*z, m.alt*z);
  /* a imagem de referencia -- o esboco da ilha feito fora daqui --,
     esticada sobre o mapa inteiro; nao vai para o arquivo */
  if (MACRO.ref){
    ctx2.globalAlpha = MACRO.ref.opac;
    ctx2.imageSmoothingEnabled = true;
    ctx2.drawImage(MACRO.ref.img, ox, oy, m.larg*z, m.alt*z);
    ctx2.imageSmoothingEnabled = false;
    ctx2.globalAlpha = 1;
  }
  /* o chao sem caminho do inicio do jogador; velho, mais apagado */
  if (MACRO.vista.alcance && typeof ALCANCE !== "undefined" && ALCANCE.img && ALCANCE.mapa === m){
    ctx2.globalAlpha = ALCANCE.estado === "velho" ? 0.4 : 1;
    ctx2.drawImage(ALCANCE.img, ox, oy, m.larg*z, m.alt*z);
    ctx2.globalAlpha = 1;
  }

  /* o calor do vazio: refeito no maximo uma vez por segundo enquanto se
     mexe no mapa -- na ilha de 650 a conta leva uns 70 ms */
  if (MACRO.vista.vazio){
    if (!MACRO.vazio.img || (MACRO.vazio.velho && performance.now() - MACRO.vazio.quando > 1000)) atualizarVazio(m);
    const V = MACRO.vazio;
    ctx2.globalAlpha = V.velho ? 0.5 : 1;
    ctx2.drawImage(V.img, ox, oy, m.larg*z, m.alt*z);
    ctx2.globalAlpha = 1;
  }
  /* a vista de um ponto: o que se ve claro, o que algo tapa escuro */
  if (MACRO.visao && MACRO.visao.mapa === m){
    const v = MACRO.visao;
    ctx2.drawImage(v.img, X(v.x0), Y(v.y0), v.lado*z, v.lado*z);
    ctx2.strokeStyle = "#ffe8a0"; ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.arc(X(v.x) + z/2, Y(v.y) + z/2, Math.max(4, z*0.8), 0, Math.PI*2); ctx2.stroke();
  }

  const tx0 = Math.max(0, Math.floor(MACRO.cam.x)), ty0 = Math.max(0, Math.floor(MACRO.cam.y));
  const tx1 = Math.min(m.larg - 1, Math.floor(MACRO.cam.x + cw/z)), ty1 = Math.min(m.alt - 1, Math.floor(MACRO.cam.y + ch/z));

  /* Curvas de nivel: fina onde o piso muda um degrau, que se sobe andando, e
     vermelha onde muda dois ou mais, que ja e parede. E o que mais falta
     olhando de cima: por onde da para subir. */
  if (MACRO.vista.curvas && z >= 2){
    const suave = new Path2D(), penhasco = new Path2D();
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++){
      const i = ty*m.larg + tx, h = m.altura[i];
      if (tx + 1 < m.larg){
        const d = Math.abs(h - m.altura[i+1]);
        if (d){ const p = d >= 2 ? penhasco : suave; p.moveTo(X(tx+1), Y(ty)); p.lineTo(X(tx+1), Y(ty+1)); }
      }
      if (ty + 1 < m.alt){
        const d = Math.abs(h - m.altura[i + m.larg]);
        if (d){ const p = d >= 2 ? penhasco : suave; p.moveTo(X(tx), Y(ty+1)); p.lineTo(X(tx+1), Y(ty+1)); }
      }
    }
    ctx2.lineWidth = z >= 10 ? 2 : 1;
    ctx2.strokeStyle = "rgba(0,0,0,.45)"; ctx2.stroke(suave);
    ctx2.strokeStyle = "rgba(255,96,64,.9)"; ctx2.stroke(penhasco);
  }
  if (MACRO.vista.grade && z >= 1.5){
    const p = new Path2D();
    for (let tx = Math.ceil(tx0/10)*10; tx <= tx1 + 1; tx += 10){ p.moveTo(X(tx) + .5, Y(ty0)); p.lineTo(X(tx) + .5, Y(ty1 + 1)); }
    for (let ty = Math.ceil(ty0/10)*10; ty <= ty1 + 1; ty += 10){ p.moveTo(X(tx0), Y(ty) + .5); p.lineTo(X(tx1 + 1), Y(ty) + .5); }
    ctx2.lineWidth = 1; ctx2.strokeStyle = "rgba(255,226,170,.13)"; ctx2.stroke(p);
  }
  /* as pecas em planta: o chao que cada solido ocupa */
  if (MACRO.vista.pecas && z >= 1.5 && m.pecas.length){
    ctx2.fillStyle = "rgba(232,184,96,.55)";
    ctx2.strokeStyle = "rgba(40,24,10,.65)";
    ctx2.lineWidth = 1;
    for (const peca of m.pecas){
      if (peca.x < tx0 - 3 || peca.x > tx1 + 3 || peca.y < ty0 - 3 || peca.y > ty1 + 3) continue;
      const g = geometriaDaPeca(peca);
      if (!g) continue;
      for (const s of g.solidos){
        ctx2.beginPath();
        s.pts.forEach(function(p, i){ const px = X(p[0]), py = Y(p[1]); if (i) ctx2.lineTo(px, py); else ctx2.moveTo(px, py); });
        ctx2.closePath();
        ctx2.fill();
        if (z >= 8) ctx2.stroke();
      }
    }
  }
  if (MACRO.vista.coisas){
    const r = Math.max(1.5, z*0.36);
    ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
    ctx2.font = "bold " + (Math.max(8, z*0.5) | 0) + "px 'Lucida Console', monospace";
    for (const c of m.coisas){
      if (c.x < tx0 || c.x > tx1 || c.y < ty0 || c.y > ty1) continue;
      const def = COISA_POR_ID[c.tipo], cx = X(c.x) + z/2, cy = Y(c.y) + z/2;
      ctx2.fillStyle = def ? def.cor : "#ff00ff";
      ctx2.beginPath(); ctx2.arc(cx, cy, r, 0, Math.PI*2); ctx2.fill();
      if (z >= 6){ ctx2.strokeStyle = "rgba(0,0,0,.65)"; ctx2.lineWidth = 1; ctx2.stroke(); }
      if (def && def.letra && z >= 10){ ctx2.fillStyle = "#140e0a"; ctx2.fillText(def.letra, cx, cy + 1); }
    }
    /* a coisa escolhida no formulario ganha um anel */
    const esc = typeof MACRO.coisaEscolhida === "function" ? MACRO.coisaEscolhida() : null;
    if (esc){
      ctx2.strokeStyle = "#ffe8a0"; ctx2.lineWidth = 2;
      ctx2.beginPath(); ctx2.arc(X(esc.x) + z/2, Y(esc.y) + z/2, r + 3, 0, Math.PI*2); ctx2.stroke();
    }
  }
  /* onde a camera do micro esta, e para onde ela olha */
  {
    const cx = X(P.x), cy = Y(P.y), r = Math.max(4, z*0.5);
    ctx2.strokeStyle = "#ffd88a"; ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(cx + Math.cos(P.ang)*r*1.6, cy + Math.sin(P.ang)*r*1.6);
    ctx2.lineTo(cx + Math.cos(P.ang + 2.4)*r, cy + Math.sin(P.ang + 2.4)*r);
    ctx2.lineTo(cx + Math.cos(P.ang - 2.4)*r, cy + Math.sin(P.ang - 2.4)*r);
    ctx2.closePath(); ctx2.stroke();
  }
  /* o caminho da regua, andando */
  if (MACRO.medida && MACRO.medida.caminho){
    const c = MACRO.medida.caminho;
    ctx2.lineWidth = Math.max(2, Math.min(4, z*0.25)); ctx2.lineJoin = "round";
    ctx2.strokeStyle = "rgba(20,12,6,.7)";
    ctx2.beginPath(); c.forEach(function(p, i){ if (i) ctx2.lineTo(X(p.x), Y(p.y)); else ctx2.moveTo(X(p.x), Y(p.y)); });
    ctx2.stroke();
    ctx2.lineWidth = Math.max(1, Math.min(2, z*0.12));
    ctx2.strokeStyle = "#8fe0ff";
    ctx2.stroke();
  }
  /* o problema clicado na lista da validacao: todos os lugares dele
     marcados, e um anel que pulsa no que se foi ver */
  const d = MACRO.destaque;
  if (d && performance.now() < d.ate){
    const lado = Math.max(3, z);
    ctx2.strokeStyle = "rgba(255,90,60,.9)"; ctx2.lineWidth = 1;
    for (const l of d.lugares || []) if (l.x >= 0) ctx2.strokeRect(X(l.x) - 0.5, Y(l.y) - 0.5, lado, lado);
    const fase = (performance.now() % 900)/900, cx = X(d.x) + z/2, cy = Y(d.y) + z/2;
    ctx2.strokeStyle = "rgba(255,232,160," + (1 - fase).toFixed(2) + ")"; ctx2.lineWidth = 3;
    ctx2.beginPath(); ctx2.arc(cx, cy, Math.max(8, z) + fase*Math.max(14, z*1.5), 0, Math.PI*2); ctx2.stroke();
    ctx2.strokeStyle = "#ffe8a0"; ctx2.lineWidth = 2;
    ctx2.strokeRect(X(d.x) - 1, Y(d.y) - 1, lado + 2, lado + 2);
  }
  desenharPreviaMacro(ctx2, X, Y, z);
  ctx2.strokeStyle = "rgba(200,150,60,.55)"; ctx2.lineWidth = 1;
  ctx2.strokeRect(ox - .5, oy - .5, m.larg*z + 1, m.alt*z + 1);
}
/* o que a ferramenta vai fazer, antes de fazer */
function desenharPreviaMacro(ctx2, X, Y, z){
  const mo = MACRO.mouse, a = MACRO.arrasto;
  if (!mo.dentro && !a) return;
  ctx2.lineWidth = 2;
  ctx2.strokeStyle = "#ffd070";
  /* o carimbo na mao: o pedaco com as cores dele, e as pecas em pontos */
  const c = MACRO.carimbo;
  if (MACRO.ferr === "carimbo" && c && mo.dentro){
    const k = cantoDoCarimbo(c, mo.tx, mo.ty);
    ctx2.globalAlpha = 0.55;
    for (let cy = 0; cy < c.alt; cy++) for (let cx = 0; cx < c.larg; cx++){
      const t = c.terreno[cy*c.larg + cx];
      if (t < 0) continue;
      ctx2.fillStyle = TERRENOS[t].cor;
      ctx2.fillRect(X(k.x + cx), Y(k.y + cy), z, z);
    }
    ctx2.globalAlpha = 1;
    ctx2.fillStyle = "#e8b860";
    for (const p of c.pecas || []) ctx2.fillRect(X(k.x + p.x) - 1, Y(k.y + p.y) - 1, 3, 3);
    ctx2.strokeRect(X(k.x), Y(k.y), c.larg*z, c.alt*z);
    return;
  }
  if (a && (MACRO.ferr === "retangulo" || MACRO.ferr === "lote" || MACRO.ferr === "carimbo" || MACRO.ferr === "relevo")){
    const x0 = Math.min(a.x0, mo.tx), x1 = Math.max(a.x0, mo.tx);
    const y0 = Math.min(a.y0, mo.ty), y1 = Math.max(a.y0, mo.ty);
    ctx2.strokeRect(X(x0), Y(y0), (x1 - x0 + 1)*z, (y1 - y0 + 1)*z);
    return;
  }
  if (a && (MACRO.ferr === "rampa" || MACRO.ferr === "traco" || MACRO.ferr === "regua")){
    ctx2.beginPath();
    ctx2.moveTo(X(a.x0) + z/2, Y(a.y0) + z/2);
    ctx2.lineTo(X(mo.tx) + z/2, Y(mo.ty) + z/2);
    ctx2.stroke();
    if (MACRO.ferr !== "regua" && MACRO.largura > 1){
      ctx2.globalAlpha = 0.35;
      for (const t of tilesDaLinha(a.x0, a.y0, mo.tx, mo.ty, MACRO.largura))
        ctx2.fillRect(X(t[0]), Y(t[1]), z, z);
      ctx2.globalAlpha = 1;
    }
    return;
  }
  if (MACRO.ferr === "pincel" || MACRO.ferr === "suavizar" || MACRO.ferr === "espalhar"){
    ctx2.globalAlpha = 0.5;
    ctx2.strokeStyle = "#ffe0a0";
    for (const t of tilesDoPincel(mo.tx, mo.ty, MACRO.tamanho)) ctx2.strokeRect(X(t[0]) + .5, Y(t[1]) + .5, z - 1, z - 1);
    ctx2.globalAlpha = 1;
    return;
  }
  ctx2.strokeRect(X(mo.tx) + .5, Y(mo.ty) + .5, z - 1, z - 1);
}

/* ---------- o que cada ferramenta faz ----------
   Toda mudanca passa por acaoDoCanteiro, entao cada traco e um Ctrl+Z so e
   o desfazer e o mesmo do micro. */
function aplicarPincelMacro(h, m, tx, ty, mexidos){
  const tiles = tilesDoPincel(tx, ty, MACRO.tamanho);
  let mudou = false;
  if (MACRO.camada === "terreno"){
    for (const t of tiles) if (pintar(h, m, "terreno", t[0], t[1], MACRO.valor.terreno)) mudou = true;
  } else if (MACRO.camada === "altura"){
    for (const t of tiles){
      if (MACRO.modoAltura === "subir") mudou = ajustarAltura(h, m, t[0], t[1], 1, mexidos) || mudou;
      else if (MACRO.modoAltura === "descer") mudou = ajustarAltura(h, m, t[0], t[1], -1, mexidos) || mudou;
      else if (MACRO.modoAltura === "nivelar") mudou = pintar(h, m, "altura", t[0], t[1], MACRO.valor.altura) || mudou;
      else if (MACRO.modoAltura === "suavizar") mudou = suavizar(h, m, t[0], t[1]) || mudou;
    }
  } else if (MACRO.camada === "teto"){
    for (const t of tiles) if (pintar(h, m, "teto", t[0], t[1], MACRO.valor.teto)) mudou = true;
  } else if (MACRO.camada === "regiao"){
    for (const t of tiles) if (pintar(h, m, "regiao", t[0], t[1], MACRO.valor.regiao)) mudou = true;
  }
  if (mudou) recalcularTilesMacro(tiles);
  return mudou;
}
