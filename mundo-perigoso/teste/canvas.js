/* ============================================================
   UM CANVAS 2D EM SOFTWARE, PARA O NODE
   ------------------------------------------------------------
   As texturas do chao, das paredes, do ceu e os sprites sao desenhados
   com a API do canvas (src/p2.js, src/p3.js). No harness o canvas era de
   mentira e elas saiam vazias: o motor desenhava o mundo transparente, nada
   escrevia no z-buffer, e a "vista" em PNG e o tempo do quadro no node nao
   diziam nada. Aqui esta o bastante daquela API, em pixels:

   - retangulo, caminho (reta, arco, elipse, curva quadratica e cubica),
     preencher com a regra do nao-zero e tracar com espessura e ponta
     redonda;
   - cor em #rgb, #rrggbb, rgb() e rgba(); gradiente linear e radial;
   - save/restore, translate/rotate/scale, globalAlpha, recorte (clip) e
     "source-atop";
   - getImageData, putImageData, createImageData e drawImage de outro
     canvas destes.

   A borda e suavizada: cada linha de pixel e varrida em quatro sublinhas, e
   o pixel ganha a fracao da area coberta -- perto do que o navegador faz,
   nao igual. A sombra (shadowBlur) e ignorada. E o bastante para a textura
   ter a cara dela; o jogo, no navegador, continua usando o canvas de
   verdade.
   ============================================================ */
"use strict";

function corDaString(s){
  if (typeof s !== "string") return [0, 0, 0, 1];
  s = s.trim().toLowerCase();
  if (s[0] === "#"){
    if (s.length === 4) return [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16), 1];
    return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
  }
  const m = /^rgba?\(([^)]*)\)$/.exec(s);
  if (m){
    const p = m[1].split(",").map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  if (s === "transparent") return [0, 0, 0, 0];
  if (s === "white") return [255, 255, 255, 1];
  return [0, 0, 0, 1];
}

function Gradiente(tipo, a){ this.tipo = tipo; this.a = a; this.paradas = []; }
Gradiente.prototype.addColorStop = function(t, cor){
  this.paradas.push({t: t, c: corDaString(cor)});
  this.paradas.sort(function(x, y){ return x.t - y.t; });
};
Gradiente.prototype.em = function(x, y){
  const a = this.a;
  let t;
  if (this.tipo === "linear"){
    const dx = a[2] - a[0], dy = a[3] - a[1], l2 = dx*dx + dy*dy;
    t = l2 > 0 ? ((x - a[0])*dx + (y - a[1])*dy)/l2 : 0;
  } else {
    /* o radial com os dois centros: o t cujo circulo passa pelo ponto
       (o caso comum -- centros perto -- sem resolver a quadratica inteira) */
    const cx = a[0] + (a[3] - a[0]), cy = a[1] + (a[4] - a[1]);
    const d = Math.hypot(x - cx, y - cy), r0 = a[2], r1 = a[5];
    t = r1 !== r0 ? (d - r0)/(r1 - r0) : 0;
  }
  const p = this.paradas;
  if (!p.length) return [0, 0, 0, 0];
  if (t <= p[0].t) return p[0].c;
  if (t >= p[p.length - 1].t) return p[p.length - 1].c;
  for (let i = 1; i < p.length; i++) if (t <= p[i].t){
    const u = (t - p[i - 1].t)/((p[i].t - p[i - 1].t) || 1), c0 = p[i - 1].c, c1 = p[i].c;
    return [c0[0] + (c1[0] - c0[0])*u, c0[1] + (c1[1] - c0[1])*u, c0[2] + (c1[2] - c0[2])*u, c0[3] + (c1[3] - c0[3])*u];
  }
  return p[p.length - 1].c;
};

function Contexto(canvas){
  this.canvas = canvas;
  this.fillStyle = "#000"; this.strokeStyle = "#000"; this.lineWidth = 1; this.lineCap = "butt"; this.lineJoin = "miter";
  this.globalAlpha = 1; this.globalCompositeOperation = "source-over";
  this.shadowBlur = 0; this.shadowColor = "transparent"; this.imageSmoothingEnabled = true;
  this.font = "10px sans-serif"; this.textAlign = "left"; this.textBaseline = "alphabetic";
  this.m = [1, 0, 0, 1, 0, 0];
  this.recorte = null;
  this.pilha = [];
  this.subs = [];            // o caminho: listas de pontos ja em pixels, com a transformacao aplicada
  this.atual = null;
}
Contexto.prototype.dados = function(){
  const c = this.canvas;
  if (!c._px || c._px.length !== c.width*c.height*4) c._px = new Uint8ClampedArray(c.width*c.height*4);
  return c._px;
};
/* ---------- estado ---------- */
Contexto.prototype.save = function(){
  this.pilha.push({m: this.m.slice(), recorte: this.recorte, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle,
    lineWidth: this.lineWidth, lineCap: this.lineCap, globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation});
};
Contexto.prototype.restore = function(){
  const s = this.pilha.pop();
  if (s) Object.assign(this, s);
};
Contexto.prototype.setTransform = function(a, b, c, d, e, f){ this.m = [a, b, c, d, e, f]; };
Contexto.prototype.resetTransform = function(){ this.m = [1, 0, 0, 1, 0, 0]; };
Contexto.prototype.transform = function(a, b, c, d, e, f){
  const m = this.m;
  this.m = [m[0]*a + m[2]*b, m[1]*a + m[3]*b, m[0]*c + m[2]*d, m[1]*c + m[3]*d, m[0]*e + m[2]*f + m[4], m[1]*e + m[3]*f + m[5]];
};
Contexto.prototype.translate = function(x, y){ this.transform(1, 0, 0, 1, x, y); };
Contexto.prototype.scale = function(x, y){ this.transform(x, 0, 0, y, 0, 0); };
Contexto.prototype.rotate = function(a){ const c = Math.cos(a), s = Math.sin(a); this.transform(c, s, -s, c, 0, 0); };
Contexto.prototype.pt = function(x, y){ const m = this.m; return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; };
/* de volta ao espaco do usuario, para o gradiente */
Contexto.prototype.inverso = function(){
  const m = this.m, det = m[0]*m[3] - m[1]*m[2] || 1;
  return [m[3]/det, -m[1]/det, -m[2]/det, m[0]/det, (m[2]*m[5] - m[3]*m[4])/det, (m[1]*m[4] - m[0]*m[5])/det];
};
/* ---------- o caminho ---------- */
Contexto.prototype.beginPath = function(){ this.subs = []; this.atual = null; };
Contexto.prototype.moveTo = function(x, y){ this.atual = [this.pt(x, y)]; this.atual.u = [x, y]; this.atual.u0 = [x, y]; this.subs.push(this.atual); };
Contexto.prototype.lineTo = function(x, y){
  if (!this.atual) return this.moveTo(x, y);
  this.atual.push(this.pt(x, y)); this.atual.u = [x, y];
};
Contexto.prototype.closePath = function(){
  if (this.atual && this.atual.length){ this.atual.fechado = true; const p = this.atual[0], u = this.atual.u0 || null; this.atual = [p]; this.atual.u = u; this.atual.u0 = u; this.subs.push(this.atual); }
};
Contexto.prototype.rect = function(x, y, w, h){ this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); };
Contexto.prototype.ellipse = function(cx, cy, rx, ry, rot, a0, a1, anti){
  const TAU = Math.PI*2;
  let da = a1 - a0;
  if (!anti && da < 0) da = da % TAU + TAU;
  if (anti && da > 0) da = da % TAU - TAU;
  if (Math.abs(a1 - a0) >= TAU) da = anti ? -TAU : TAU;
  const n = Math.max(8, Math.ceil(Math.abs(da)*Math.max(rx, ry)*Math.hypot(this.m[0], this.m[1])/1.5));
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i <= n; i++){
    const a = a0 + da*i/n, ex = rx*Math.cos(a), ey = ry*Math.sin(a);
    const x = cx + ex*cr - ey*sr, y = cy + ex*sr + ey*cr;
    if (i === 0 && !this.atual) this.moveTo(x, y); else this.lineTo(x, y);
  }
};
Contexto.prototype.arc = function(cx, cy, r, a0, a1, anti){ this.ellipse(cx, cy, r, r, 0, a0, a1, anti); };
Contexto.prototype.quadraticCurveTo = function(qx, qy, x, y){
  const u = this.atual && this.atual.u ? this.atual.u : [qx, qy];
  for (let i = 1; i <= 12; i++){
    const t = i/12, s = 1 - t;
    this.lineTo(s*s*u[0] + 2*s*t*qx + t*t*x, s*s*u[1] + 2*s*t*qy + t*t*y);
  }
};
Contexto.prototype.bezierCurveTo = function(ax, ay, bx, by, x, y){
  const u = this.atual && this.atual.u ? this.atual.u : [ax, ay];
  for (let i = 1; i <= 16; i++){
    const t = i/16, s = 1 - t;
    this.lineTo(s*s*s*u[0] + 3*s*s*t*ax + 3*s*t*t*bx + t*t*t*x, s*s*s*u[1] + 3*s*s*t*ay + 3*s*t*t*by + t*t*t*y);
  }
};
/* ---------- rasterizar ----------
   Os poligonos (em pixels) viram cobertura por pixel, com a regra do
   nao-zero: quatro sublinhas por linha, e a fracao horizontal exata de cada
   trecho coberto. */
const SUB = 4;
Contexto.prototype.cobertura = function(polis){
  const W = this.canvas.width, H = this.canvas.height;
  let y0 = Infinity, y1 = -Infinity;
  const arestas = [];
  for (const p of polis){
    if (p.length < 2) continue;
    for (let i = 0; i < p.length; i++){
      const a = p[i], b = p[(i + 1) % p.length];
      if (a[1] === b[1]) continue;
      arestas.push(a[1] < b[1] ? {x0: a[0], y0: a[1], x1: b[0], y1: b[1], w: 1} : {x0: b[0], y0: b[1], x1: a[0], y1: a[1], w: -1});
      y0 = Math.min(y0, a[1], b[1]); y1 = Math.max(y1, a[1], b[1]);
    }
  }
  const cob = new Map();
  if (!arestas.length) return cob;
  const ya = Math.max(0, Math.floor(y0)), yb = Math.min(H - 1, Math.ceil(y1));
  for (let y = ya; y <= yb; y++){
    let linha = null;
    for (let s = 0; s < SUB; s++){
      const sy = y + (s + 0.5)/SUB, cruza = [];
      for (const e of arestas) if (sy >= e.y0 && sy < e.y1) cruza.push({x: e.x0 + (sy - e.y0)*(e.x1 - e.x0)/(e.y1 - e.y0), w: e.w});
      if (!cruza.length) continue;
      cruza.sort(function(a, b){ return a.x - b.x; });
      let volta = 0;
      for (let i = 0; i < cruza.length - 1; i++){
        volta += cruza[i].w;
        if (volta === 0) continue;
        const xa = Math.max(0, cruza[i].x), xb = Math.min(W, cruza[i + 1].x);
        if (xb <= xa) continue;
        if (!linha) linha = new Float32Array(W);
        for (let x = Math.floor(xa); x < Math.ceil(xb) && x < W; x++){
          const c = Math.min(x + 1, xb) - Math.max(x, xa);
          if (c > 0) linha[x] += c/SUB;
        }
      }
    }
    if (linha) cob.set(y, linha);
  }
  return cob;
};
/* o traco: cada segmento vira um retangulo, e cada juncao um disco -- todos
   no mesmo sentido, para a regra do nao-zero somar em vez de furar */
function sentido(p){ let a = 0; for (let i = 0; i < p.length; i++){ const q = p[i], r = p[(i + 1) % p.length]; a += q[0]*r[1] - r[0]*q[1]; } return a; }
function noSentido(p){ return sentido(p) < 0 ? p.slice().reverse() : p; }
Contexto.prototype.tracoEmPolis = function(){
  const m = this.m, esc = Math.sqrt(Math.abs(m[0]*m[3] - m[1]*m[2])) || 1, r = Math.max(0.5, this.lineWidth*esc/2);
  const polis = [], disco = function(c){ const d = []; for (let i = 0; i < 12; i++){ const a = i/12*Math.PI*2; d.push([c[0] + r*Math.cos(a), c[1] + r*Math.sin(a)]); } return d; };
  for (const sub of this.subs){
    const pts = sub.fechado ? sub.concat([sub[0]]) : sub;
    for (let i = 0; i + 1 < pts.length; i++){
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      if (l < 1e-9) continue;
      const nx = -dy/l*r, ny = dx/l*r;
      polis.push(noSentido([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]));
      if (i > 0 || sub.fechado || this.lineCap === "round") polis.push(noSentido(disco(a)));
    }
    if (pts.length > 1 && this.lineCap === "round") polis.push(noSentido(disco(pts[pts.length - 1])));
  }
  return polis;
};
/* pinta a cobertura com o estilo -- cor ou gradiente --, no recorte e na
   composicao de agora */
Contexto.prototype.pintar = function(cob, estilo){
  const W = this.canvas.width, px = this.dados(), ga = this.globalAlpha, atop = this.globalCompositeOperation === "source-atop";
  const grad = estilo instanceof Gradiente ? estilo : null, cor = grad ? null : corDaString(estilo), inv = grad ? this.inverso() : null;
  const rec = this.recorte;
  cob.forEach(function(linha, y){
    for (let x = 0; x < W; x++){
      let k = linha[x];
      if (!(k > 0.001)) continue;
      if (k > 1) k = 1;
      if (rec) k *= rec[y*W + x];
      if (!(k > 0.001)) continue;
      let c = cor;
      if (grad){ const ux = inv[0]*(x + 0.5) + inv[2]*(y + 0.5) + inv[4], uy = inv[1]*(x + 0.5) + inv[3]*(y + 0.5) + inv[5]; c = grad.em(ux, uy); }
      const a = c[3]*ga*k, o = (y*W + x)*4, da = px[o + 3]/255;
      if (atop){
        if (da <= 0) continue;
        px[o] = c[0]*a + px[o]*(1 - a); px[o + 1] = c[1]*a + px[o + 1]*(1 - a); px[o + 2] = c[2]*a + px[o + 2]*(1 - a);
        continue;
      }
      const na = a + da*(1 - a);
      if (na <= 0) continue;
      px[o]     = (c[0]*a + px[o]*da*(1 - a))/na;
      px[o + 1] = (c[1]*a + px[o + 1]*da*(1 - a))/na;
      px[o + 2] = (c[2]*a + px[o + 2]*da*(1 - a))/na;
      px[o + 3] = na*255;
    }
  });
};
Contexto.prototype.fill = function(){ this.pintar(this.cobertura(this.subs), this.fillStyle); };
Contexto.prototype.stroke = function(){ this.pintar(this.cobertura(this.tracoEmPolis()), this.strokeStyle); };
Contexto.prototype.clip = function(){
  const W = this.canvas.width, H = this.canvas.height, novo = new Float32Array(W*H), velho = this.recorte;
  this.cobertura(this.subs).forEach(function(linha, y){ for (let x = 0; x < W; x++) novo[y*W + x] = Math.min(1, linha[x])*(velho ? velho[y*W + x] : 1); });
  this.recorte = novo;
};
Contexto.prototype.retanguloEmPoli = function(x, y, w, h){ return [this.pt(x, y), this.pt(x + w, y), this.pt(x + w, y + h), this.pt(x, y + h)]; };
Contexto.prototype.fillRect = function(x, y, w, h){ this.pintar(this.cobertura([this.retanguloEmPoli(x, y, w, h)]), this.fillStyle); };
Contexto.prototype.strokeRect = function(x, y, w, h){
  const subs = this.subs, atual = this.atual;
  this.beginPath(); this.rect(x, y, w, h); this.stroke();
  this.subs = subs; this.atual = atual;
};
Contexto.prototype.clearRect = function(x, y, w, h){
  const W = this.canvas.width, px = this.dados();
  this.cobertura([this.retanguloEmPoli(x, y, w, h)]).forEach(function(linha, yy){
    for (let xx = 0; xx < W; xx++) if (linha[xx] >= 0.5){ const o = (yy*W + xx)*4; px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; }
  });
};
/* ---------- pixels ---------- */
Contexto.prototype.createImageData = function(w, h){
  if (typeof w === "object") return {data: new Uint8ClampedArray(w.width*w.height*4), width: w.width, height: w.height};
  return {data: new Uint8ClampedArray(w*h*4), width: w, height: h};
};
Contexto.prototype.getImageData = function(x, y, w, h){
  const W = this.canvas.width, H = this.canvas.height, px = this.dados(), out = new Uint8ClampedArray(w*h*4);
  for (let j = 0; j < h; j++){
    const yy = y + j;
    if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < w; i++){
      const xx = x + i;
      if (xx < 0 || xx >= W) continue;
      const o = (yy*W + xx)*4, d = (j*w + i)*4;
      out[d] = px[o]; out[d + 1] = px[o + 1]; out[d + 2] = px[o + 2]; out[d + 3] = px[o + 3];
    }
  }
  return {data: out, width: w, height: h};
};
Contexto.prototype.putImageData = function(img, x, y){
  const W = this.canvas.width, H = this.canvas.height, px = this.dados();
  for (let j = 0; j < img.height; j++){
    const yy = y + j;
    if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < img.width; i++){
      const xx = x + i;
      if (xx < 0 || xx >= W) continue;
      const o = (yy*W + xx)*4, d = (j*img.width + i)*4;
      px[o] = img.data[d]; px[o + 1] = img.data[d + 1]; px[o + 2] = img.data[d + 2]; px[o + 3] = img.data[d + 3];
    }
  }
};
/* outro canvas destes, no lugar: so translacao e escala inteira bastam */
Contexto.prototype.drawImage = function(img, dx, dy, dw, dh){
  if (!img || !img.getContext || arguments.length > 5) return;
  const src = img.getContext("2d").dados(), sw = img.width, sh = img.height;
  dw = dw === undefined ? sw : dw; dh = dh === undefined ? sh : dh;
  const W = this.canvas.width, H = this.canvas.height, px = this.dados(), o0 = this.pt(dx, dy);
  for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++){
    const xx = Math.floor(o0[0] + i), yy = Math.floor(o0[1] + j);
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const s = (Math.floor(j*sh/dh)*sw + Math.floor(i*sw/dw))*4, a = src[s + 3]/255*this.globalAlpha;
    if (a <= 0) continue;
    const o = (yy*W + xx)*4, da = px[o + 3]/255, na = a + da*(1 - a);
    for (let k = 0; k < 3; k++) px[o + k] = (src[s + k]*a + px[o + k]*da*(1 - a))/na;
    px[o + 3] = na*255;
  }
};
Contexto.prototype.createLinearGradient = function(x0, y0, x1, y1){ return new Gradiente("linear", [x0, y0, x1, y1]); };
Contexto.prototype.createRadialGradient = function(x0, y0, r0, x1, y1, r1){ return new Gradiente("radial", [x0, y0, r0, x1, y1, r1]); };
/* texto nao entra em textura; a tela de verdade (o HUD) continua no stub */
Contexto.prototype.measureText = function(t){ return {width: String(t).length*6}; };
Contexto.prototype.fillText = function(){};
Contexto.prototype.strokeText = function(){};

function canvasDeSoftware(w, h){
  const c = {width: w || 300, height: h || 150, style: {}, on: {},
             addEventListener: function(t, fn){ (c.on[t] = c.on[t] || []).push(fn); },
             focus: function(){}, requestPointerLock: function(){},
             getBoundingClientRect: function(){ return {x: 0, y: 0, width: c.width, height: c.height}; }};
  let ctx = null;
  c.getContext = function(){ return ctx || (ctx = new Contexto(c)); };
  return c;
}

module.exports = {canvasDeSoftware, Contexto, corDaString};
