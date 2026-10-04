
/* ============================================================
   SPRITES
   ------------------------------------------------------------
   Os sprites de Doom/Heretic foram fotografados de miniaturas de
   argila e reduzidos para a paleta de 256 cores do VGA. Isso deixa
   tres marcas que nenhum desenho chapado tem: volume (cada membro e
   um cilindro com borda escura, meio-tom e brilho), dithering (o
   xadrez nas transicoes, residuo da reducao de cores) e ausencia de
   contorno (o escuro da silhueta vem da forma virando pra sombra).

   Aqui o processo e o mesmo: desenha-se com gradientes de verdade e
   depois quantiza-se para uma paleta fixa com dither ordenado.
   ============================================================ */
function hexPal(list){
  return list.map(s=>[parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)]);
}
const BAYER4 = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];

/* alfa duro + quantizacao com dither ordenado.
   Quando um pixel cai entre dois tons da paleta, alterna entre eles
   num xadrez proporcional a distancia -- exatamente o que a reducao
   para 256 cores fazia. */
/* Os dois tons de paleta mais proximos de uma cor.

   A conta depende so da cor, e um modelo de voxel pinta milhares de pixels
   com um punhado de tons -- vem tudo das mesmas rampas. Guardar o resultado
   por cor nao muda pixel nenhum e economiza uns 10% do carregamento. Nao e
   aqui que o tempo mora: mora no canvas, em p3b.js. */
const VIZINHOS = new Map();
function doisVizinhos(pal, r, g, b){
  let mapa = VIZINHOS.get(pal);
  if (!mapa){ mapa = new Map(); VIZINHOS.set(pal, mapa); }
  const chave = (r<<16) | (g<<8) | b;
  let v = mapa.get(chave);
  if (v === undefined){
    let b0=0, b1=0, s0=1e9, s1=1e9;
    for (let k=0;k<pal.length;k++){
      const p = pal[k], dr = r-p[0], dg = g-p[1], db = b-p[2];
      const s = dr*dr + dg*dg + db*db;
      if (s < s0){ s1=s0; b1=b0; s0=s; b0=k; }
      else if (s < s1){ s1=s; b1=k; }
    }
    v = [b0, b1, s0, s1];
    mapa.set(chave, v);
  }
  return v;
}

function crispen(id, pal, rim){
  const d = id.data, w = id.width, h = id.height;
  for (let i=3;i<d.length;i+=4) d[i] = d[i] >= 112 ? 255 : 0;
  if (pal && pal.length){
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){
      const i = (y*w+x)*4;
      if (!d[i+3]) continue;
      const viz = doisVizinhos(pal, d[i], d[i+1], d[i+2]);
      const b0 = viz[0], b1 = viz[1], s0 = viz[2], s1 = viz[3];
      let pick = b0;
      if (s1 < 5200){                                  // so mistura tons vizinhos
        const r0 = Math.sqrt(s0), r1 = Math.sqrt(s1);
        const mix = r0/(r0+r1+1e-6);
        if (mix > (BAYER4[(y&3)*4+(x&3)] + 0.5)/16) pick = b1;
      }
      const p = pal[pick]; d[i]=p[0]; d[i+1]=p[1]; d[i+2]=p[2];
    }
  }
  if (rim){                          // escurece um passo, nao vira traco preto
    const src = new Uint8ClampedArray(d);
    const op = (x,y)=> (x<0||y<0||x>=w||y>=h) ? 0 : src[(y*w+x)*4+3];
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){
      const i=(y*w+x)*4;
      if (!src[i+3]) continue;
      if (op(x-1,y) && op(x+1,y) && op(x,y-1) && op(x,y+1)) continue;
      d[i]=src[i]*rim|0; d[i+1]=src[i+1]*rim|0; d[i+2]=src[i+2]*(rim+0.03)|0;
    }
  }
}
function makeSpr(w,h,pal,draw,rim){
  const c = document.createElement("canvas"); c.width=w; c.height=h;
  const g = c.getContext("2d",{willReadFrequently:true});
  draw(g,w,h);
  const id = g.getImageData(0,0,w,h);
  crispen(id, pal, rim);
  /* o crispen ja deixou cada pixel em cima da paleta: da para indexar exato
     e dividir a tabela com todo sprite que usa a mesma paleta */
  return shadeStack(new Uint32Array(id.data.buffer).slice(), w, h, 0,
                    (pal && pal.length) ? tabelaDaPaleta(pal, 0) : null);
}

/* ---------- primitivas volumetricas ---------- */
function tapPath(g,x1,y1,w1,x2,y2,w2){
  const a = Math.atan2(y2-y1,x2-x1), nx = -Math.sin(a), ny = Math.cos(a);
  g.beginPath();
  g.moveTo(x1+nx*w1/2, y1+ny*w1/2);
  g.lineTo(x2+nx*w2/2, y2+ny*w2/2);
  g.lineTo(x2-nx*w2/2, y2-ny*w2/2);
  g.lineTo(x1-nx*w1/2, y1-ny*w1/2);
  g.closePath();
}
function polyPath(g,p){
  g.beginPath(); g.moveTo(p[0],p[1]);
  for (let i=2;i<p.length;i+=2) g.lineTo(p[i],p[i+1]);
  g.closePath();
}
function poly(g,col,p){ polyPath(g,p); g.fillStyle=col; g.fill(); }
function box(g,col,x,y,w,h){ g.fillStyle=col; g.fillRect(x|0,y|0,Math.max(1,w|0),Math.max(1,h|0)); }
const at = (R,t)=> R[Math.min(R.length-1, Math.max(0, Math.round(t*(R.length-1))))];

/* cilindro: escuro na borda, brilho do lado da luz, sombra do outro */
function cyl(g, R, x1,y1,w1, x2,y2,w2, lit){
  const a = Math.atan2(y2-y1,x2-x1), nx = -Math.sin(a), ny = Math.cos(a);
  const cx = (x1+x2)/2, cy = (y1+y2)/2, mw = Math.max(w1,w2)/2 + 0.5;
  const gr = g.createLinearGradient(cx-nx*mw, cy-ny*mw, cx+nx*mw, cy+ny*mw);
  const s = (lit < 0)
    ? [[0,.28],[.20,1],[.46,.70],[.76,.38],[1,.04]]
    : [[0,.04],[.24,.38],[.54,.70],[.80,1],[1,.28]];
  for (let i=0;i<s.length;i++) gr.addColorStop(s[i][0], at(R,s[i][1]));
  tapPath(g,x1,y1,w1,x2,y2,w2); g.fillStyle = gr; g.fill();
}
/* esfera / massa arredondada */
function sph(g, R, cx, cy, rx, ry, lx, ly){
  const gr = g.createRadialGradient(cx+lx*rx*0.44, cy+ly*ry*0.44, Math.min(rx,ry)*0.08,
                                    cx, cy, Math.max(rx,ry)*1.08);
  gr.addColorStop(0, at(R,1)); gr.addColorStop(.32, at(R,.80));
  gr.addColorStop(.60, at(R,.58)); gr.addColorStop(.84, at(R,.30));
  gr.addColorStop(1, at(R,.02));
  g.save(); g.beginPath(); g.ellipse(cx,cy,rx,ry,0,0,TAU); g.clip();
  g.fillStyle = gr; g.fillRect(cx-rx-2, cy-ry-2, rx*2+4, ry*2+4); g.restore();
}
/* placa/painel com gradiente diagonal */
function slab(g, R, p, lx, ly, lo, hi){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for (let i=0;i<p.length;i+=2){
    if (p[i]<x0) x0=p[i]; if (p[i]>x1) x1=p[i];
    if (p[i+1]<y0) y0=p[i+1]; if (p[i+1]>y1) y1=p[i+1];
  }
  const cx=(x0+x1)/2, cy=(y0+y1)/2, rx=(x1-x0)/2+1, ry=(y1-y0)/2+1;
  const gr = g.createLinearGradient(cx+lx*rx, cy+ly*ry, cx-lx*rx, cy-ly*ry);
  gr.addColorStop(0, at(R, hi===undefined?1:hi));
  gr.addColorStop(.5, at(R,.55));
  gr.addColorStop(1, at(R, lo===undefined?.06:lo));
  polyPath(g,p); g.fillStyle=gr; g.fill();
}

/* ============================================================
   PALETAS  --  rampas de 6 a 8 tons, como as do VGA
   ============================================================ */
const R_IMPSKIN = ["#2a0c06","#4d1409","#78200f","#a03418","#c85428","#e8823f","#f5b378"];
const R_IMPDARK = ["#1a0703","#2e0d06","#4a140a","#6b1f0f","#8c2e18"];
const R_BONE    = ["#241a12","#4a3a26","#7a6644","#a89066","#d2bd94","#f0e2c4"];
const R_GOBSKIN = ["#16220c","#253a14","#3a5620","#55762e","#74963f","#96b657","#bdd47e"];
const R_LEATH   = ["#140d06","#2e2010","#47311a","#644828","#866138","#a87c4c"];
const R_STEEL   = ["#0c0f14","#171c25","#262f3d","#3c4859","#566579","#778799","#9dabbd","#c8d6e8"];
const R_CLOAK   = ["#050a12","#0b1424","#131f36","#1c2c4c","#264066"];
const R_ROBE    = ["#0a0510","#150b1e","#241234","#351c4c","#492868","#603786","#7c4ea6"];
const R_WOOD    = ["#1a1006","#2e1c0c","#472c14","#634020","#855a30","#a87a46"];
const R_BRASS   = ["#241804","#412c0a","#634516","#8a6424","#b58a38","#dcb45e","#f4dda0"];
const R_FLESH   = ["#2a1a10","#4a2f1c","#6b4530","#8f6446","#b3865e","#d2aa80","#ecd0ab"];
const R_FIRE    = ["#2a0a00","#5c1a02","#8c2e04","#c04a08","#e2760e","#ffab2a","#ffe08a","#fff6d0"];
const R_RUNE    = ["#050f1e","#0a1c38","#123a70","#1d5aa8","#2b8ad8","#5cb4f4","#9ad8ff","#e0f4ff"];
const R_VIOL    = ["#1a041e","#330a3c","#5a1470","#8a1f9c","#b52ba8","#e64ad0","#ff8ae8","#ffd0f6"];
const R_GREENG  = ["#04180f","#08301e","#0f5a38","#188f60","#28c088","#5ee8b0","#a8ffd8"];
const R_RED     = ["#2a0604","#520c08","#7d1410","#a82018","#d03828","#f06048","#ff9c88"];
const R_LTHR    = ["#2a1410","#4a201a","#6b2f22"];
const R_PAGE    = ["#8f7c58","#b3a180","#d2c4a0","#ecdfc0","#f7eed8"];

/* Estas paletas nao desenham mais nada aqui: quem as usa sao os materiais
   dos modelos de voxel em p3c.js. Vivem neste arquivo porque e onde as
   rampas de cor moram. */
const P_IMP   = hexPal(R_IMPSKIN.concat(R_IMPDARK, R_BONE, ["#ffe45c","#fffbe0","#1a0602"]));
const P_GOB   = hexPal(R_GOBSKIN.concat(R_LEATH, R_BONE.slice(2), R_WOOD.slice(1,4),
                                        ["#ff9a2a","#ffd08a","#141008"]));
const P_WR    = hexPal(R_STEEL.concat(R_CLOAK, R_RUNE.slice(3), R_BRASS.slice(2,5), ["#05070a"]));
const P_BOSS  = hexPal(R_ROBE.concat(R_BONE, R_VIOL, R_WOOD.slice(1,5), R_BRASS.slice(2,6),
                                     ["#ffffff","#0a0508"]));
const P_ITEM  = hexPal(R_RED.concat(R_RUNE, R_BRASS, R_GREENG, R_LEATH.slice(1,5),
                                    R_BONE.slice(2,6), R_STEEL.slice(2,7), R_WOOD.slice(1,5),
                                    R_GOBSKIN.slice(2,5), ["#ffffff"]));
const P_TORCH = hexPal(R_FIRE.concat(R_WOOD, R_BRASS.slice(1,6), ["#ffffff"]));
const P_WPN   = hexPal(R_FLESH.concat(R_ROBE, R_BRASS, R_STEEL, R_RUNE, R_WOOD, R_FIRE,
                                      R_LTHR, R_PAGE, ["#ffffff"]));
const P_FACE  = hexPal(R_FLESH.concat(R_LEATH, R_RED.slice(1,5), ["#f0e8d8","#141010"]));

/* ============================================================
   ITENS E PROJETEIS
   ============================================================ */
function drawPotion(g,w,h){
  const cx=w/2, by=h-4;
  cyl(g,R_LEATH, cx,by-30,9, cx,by-24,9, -1);
  cyl(g,R_BONE, cx,by-26,10, cx,by-23,10, -1);
  cyl(g,R_RED, cx,by-24,8, cx,by-18,10, -1);
  sph(g,R_RED, cx,by-10, 11,10, -.5,-.5);
  poly(g,R_RED[6],[cx-7,by-14, cx-3,by-15, cx-2,by-8, cx-6,by-6]);
  box(g,"#ff9c88", cx-6,by-13,2,4);
}
function drawMana(g,w,h){
  const cx=w/2, by=h-5;
  polyPath(g,[cx,by-28, cx+9,by-14, cx,by, cx-9,by-14]);
  const gr = g.createLinearGradient(cx-9,by-24, cx+9,by-4);
  gr.addColorStop(0,R_RUNE[7]); gr.addColorStop(.3,R_RUNE[5]);
  gr.addColorStop(.62,R_RUNE[3]); gr.addColorStop(1,R_RUNE[1]);
  g.fillStyle=gr; g.fill();
  poly(g,R_RUNE[7],[cx-1,by-24, cx+3,by-14, cx-1,by-6, cx-4,by-14]);
  box(g,"#e0f4ff", cx-2,by-20,2,5);
}
function drawShield(g,w,h){
  const cx=w/2, by=h-3;
  slab(g,R_BRASS, [cx-13,by-27, cx+13,by-27, cx+11,by-9, cx,by, cx-11,by-9], -.5,-.6);
  slab(g,R_STEEL, [cx-9,by-24, cx+9,by-24, cx+8,by-10, cx,by-3, cx-8,by-10], -.5,-.6);
  sph(g,R_RUNE, cx,by-15, 5,5, -.5,-.5);
}
function drawSoul(g,w,h){
  const cx=w/2, cy=h-18;
  for (let i=0;i<5;i++){
    const r = 18-i*3.4;
    polyPath(g,[cx,cy-r, cx+r,cy, cx,cy+r, cx-r,cy]);
    g.fillStyle = R_GREENG[2+Math.min(4,i)]; g.fill();
  }
  for (let i=0;i<4;i++){ const a=i*TAU/4+0.78;
    box(g,R_GREENG[4], cx+Math.cos(a)*16-1, cy+Math.sin(a)*16-1, 3,3); }
}
function drawKey(g,w,h){
  const cx=w/2, by=h-5;
  slab(g,R_RUNE, [cx-9,by-29, cx+9,by-29, cx+9,by-16, cx-9,by-16], -.5,-.6);
  poly(g,"#050f1e",[cx-4,by-25, cx+4,by-25, cx+4,by-20, cx-4,by-20]);
  cyl(g,R_RUNE, cx,by-17,7, cx,by,6, -1);
  slab(g,R_RUNE, [cx+3,by-9, cx+11,by-9, cx+11,by-5, cx+3,by-5], -.5,-.6);
  slab(g,R_RUNE, [cx+3,by-15, cx+9,by-15, cx+9,by-12, cx+3,by-12], -.5,-.6);
  box(g,R_RUNE[7], cx-2,by-27,2,24);
}
function flame(g, col, x, y, s){
  poly(g,col,[x, y-46*s, x+12*s, y-19*s, x+6*s, y-7*s, x+10*s, y+4*s,
              x, y+8*s, x-10*s, y+4*s, x-6*s, y-7*s, x-12*s, y-19*s]);
}
function drawTorch(g,w,h,f){
  const cx=w/2, by=h-3, s = f?1.08:0.92, o = f?1:-1;
  cyl(g,R_WOOD, cx,by-28,9, cx,by,8, -1);
  cyl(g,R_BRASS, cx,by-33,17, cx,by-27,14, -1);
  flame(g,R_FIRE[2], cx+o, by-32, 1.30*s);
  flame(g,R_FIRE[3], cx+o, by-33, 1.06*s);
  flame(g,R_FIRE[4], cx,    by-34, 0.82*s);
  flame(g,R_FIRE[5], cx-o,  by-34, 0.56*s);
  flame(g,R_FIRE[7], cx,    by-34, 0.28*s);
}
function orb(g,w,h,R){
  const cx=w/2, cy=h/2;
  for (let i=0;i<5;i++){
    const r=(w/2-1)*(1-i*0.18), p=[];
    for (let k=0;k<8;k++){ const a=k*TAU/8+TAU/16; p.push(cx+Math.cos(a)*r, cy+Math.sin(a)*r); }
    poly(g, R[Math.min(R.length-1, 2+i)], p);
  }
  box(g,"#ffffff", cx-3,cy-4,2,2);
}
function drawArrow(g,w,h){
  const cx=w/2, cy=h/2;
  cyl(g,R_WOOD, cx-12,cy,4, cx+8,cy,4, -1);
  poly(g,R_BONE[4],[cx+14,cy, cx+5,cy-4, cx+6,cy, cx+5,cy+4]);
  poly(g,R_GOBSKIN[3],[cx-14,cy-4, cx-8,cy-2, cx-8,cy+2, cx-14,cy+4]);
}


/* ============================================================
   ARANHA DA CRIPTA  --  rasteira, rapida, obriga a mirar pra baixo
   ============================================================ */
const R_CHITIN = ["#0e0a10","#1a1220","#2a1c34","#3d2a48","#54395f","#6d4c78"];
const R_FANG   = ["#2a2018","#4a3c28","#786244","#a88c62","#d0bb90"];
const P_SPIDER = hexPal(R_CHITIN.concat(R_FANG, ["#8c1410","#ff3a2a","#ffb0a0","#050308"]));

/* ============================================================
   MORCEGO-SOMBRA  --  voa em senoide, obriga a mirar pra cima
   ============================================================ */
const R_BATFUR = ["#140f0c","#241a14","#38281e","#4e392a","#68503c","#8a6e52"];
const R_MEMB   = ["#150a0e","#2a1218","#421c24","#5c2a34","#7a3f4a"];
const P_BAT = hexPal(R_BATFUR.concat(R_MEMB, R_FANG.slice(2),
                     ["#ffb400","#ffe8a0","#050308"]));

/* ---------- registro ---------- */
/* As criaturas nao estao aqui: todas elas sao modelos de voxel, assados em
   p3c.js. O que sobra sao os itens, as tochas e os projeteis, que sao chapados
   de proposito -- nunca precisaram girar. */
const SPR = {
  potion: [makeSpr(32,40,P_ITEM,drawPotion,0.6)],
  mana:   [makeSpr(32,40,P_ITEM,drawMana,0.6)],
  shield: [makeSpr(32,40,P_ITEM,drawShield,0.6)],
  soul:   [makeSpr(40,44,P_ITEM,drawSoul)],
  key:    [makeSpr(32,40,P_ITEM,drawKey,0.6)],
  torch:  [makeSpr(32,64,P_TORCH,(g,w,h)=>drawTorch(g,w,h,0)),
           makeSpr(32,64,P_TORCH,(g,w,h)=>drawTorch(g,w,h,1))],
  bolt:   [makeSpr(24,24,P_ITEM,(g,w,h)=>orb(g,w,h,R_RUNE))],
  fire:   [makeSpr(28,28,P_TORCH,(g,w,h)=>orb(g,w,h,R_FIRE))],
  dark:   [makeSpr(28,28,P_BOSS,(g,w,h)=>orb(g,w,h,R_VIOL))],
  arrow:  [makeSpr(28,24,P_ITEM,drawArrow,0.6)]
};

/* ============================================================
   ARMAS EM PRIMEIRA PESSOA  --  172x120, escala 1:1 na tela
   ============================================================ */
const WW = 172, WH2 = 120;
function wcan(draw){
  const c = document.createElement("canvas"); c.width=WW; c.height=WH2;
  const g = c.getContext("2d",{willReadFrequently:true});
  draw(g,WW,WH2);
  const id = g.getImageData(0,0,WW,WH2);
  crispen(id, P_WPN, 0.66);
  g.putImageData(id,0,0);
  return c;
}

/* Antebraco do mago. (hx,hy) e o centro do punho; o braco inteiro
   gira com a arma e entra pela borda de baixo da tela. */
function mageArm(g, hx, hy, ang, side){
  g.save(); g.translate(hx,hy); g.rotate(ang);
  const ex = -side*26, ey = 104;
  cyl(g,R_ROBE, ex,ey,54, 0,14,30, -side);                 // manga
  poly(g,R_ROBE[1],[-side*6,20, -side*14,90, -side*4,92, side*2,22]);
  slab(g,R_BRASS, [-17,2, 17,2, 15,16, -15,16], -.5,-.6);  // bracelete
  poly(g,R_BRASS[6],[-14,4, -4,4, -4,8, -14,8]);
  cyl(g,R_FLESH, -13,0,17, 13,0,15, -1);                   // dorso da mao
  for (let k=0;k<4;k++){                                   // dedos sobre o cabo
    const fx = -12+k*6.5;
    cyl(g,R_FLESH, fx,7,7, fx+1,-7,6, -1);
    sph(g,R_FLESH, fx+0.5,-8, 3.4,3.2, -.5,-.5);
    poly(g,R_FLESH[0],[fx+3.4,7, fx+4.2,7, fx+5,-8, fx+4.2,-8]);
  }
  cyl(g,R_FLESH, 9,6,9, 17,-9,8, 1);                       // polegar por cima
  sph(g,R_FLESH, 18,-11, 4.5,4, -.4,-.5);
  g.restore();
}
const gripAt = (x,y,a,ly)=> [x - ly*Math.sin(a), y + ly*Math.cos(a)];

function daggerAt(g, x, y, a, glow){
  g.save(); g.translate(x,y); g.rotate(a);
  const T=R_STEEL, BR=R_BRASS, LT=R_LTHR, RU=R_RUNE;
  polyPath(g,[-8,4, 8,4, 5,-64, 0,-78, -5,-64]);               // lamina
  const bl = g.createLinearGradient(-8,0,8,0);
  bl.addColorStop(0,T[2]); bl.addColorStop(.22,T[7]); bl.addColorStop(.42,T[5]);
  bl.addColorStop(.62,T[4]); bl.addColorStop(1,T[1]);
  g.fillStyle=bl; g.fill();
  poly(g,T[2],[-2,2, 2,2, 1,-58, -1,-58]);                     // canaleta
  poly(g,T[7],[-4,0, -2,0, -1,-62, -3,-58]);                   // fio brilhante
  for (let k=0;k<4;k++){
    poly(g,RU[glow?7:2],[-2,-16-k*11, 2,-16-k*11, 2,-14-k*11, -2,-14-k*11]);
    poly(g,RU[glow?6:1],[-1,-23-k*11, 1,-23-k*11, 1,-18-k*11, -1,-18-k*11]);
  }
  slab(g,BR, [-17,11, 17,11, 13,1, -13,1], -.5,-.7);           // guarda
  poly(g,BR[1],[-17,11, -24,6, -22,13, -15,13]);
  poly(g,BR[1],[17,11, 24,6, 22,13, 15,13]);
  cyl(g,LT, 0,11,13, 0,37,11, -1);                             // cabo de couro
  for (let k=0;k<5;k++) poly(g,LT[0],[-6,13+k*5, 6,13+k*5, 6,15+k*5, -6,15+k*5]);
  sph(g,BR, 0,41, 9,6, -.5,-.6);
  poly(g,RU[6],[-3,39, 3,39, 2,44, -2,44]);
  g.restore();
}
function slash(g, x, y, r, a0, a1){
  g.save(); g.translate(x,y);
  const C=[R_RUNE[3],R_RUNE[5],R_RUNE[7]];
  for (let k=0;k<3;k++){
    g.strokeStyle=C[k]; g.lineWidth=8-k*2.4;
    g.beginPath(); g.arc(0,0,r-k*3,a0,a1); g.stroke();
  }
  g.restore();
}
function staffAt(g, x, y, a, fire){
  g.save(); g.translate(x,y); g.rotate(a);
  const WD=R_WOOD, BR=R_BRASS, RU=R_RUNE, LT=R_LTHR;
  cyl(g,WD, 0,6,13, 0,100,17, -1);                             // haste
  for (let k=0;k<4;k++){                                       // nos da madeira
    sph(g,WD, -1,26+k*22, 7,4, -.6,-.5);
    poly(g,WD[1],[-6,24+k*22, 5,23+k*22, 6,27+k*22, -5,29+k*22]);
  }
  cyl(g,LT, 0,52,17, 0,78,17, -1);                             // empunhadura
  for (let k=0;k<6;k++) poly(g,LT[0],[-8,54+k*4, 8,52+k*4, 8,54+k*4, -8,56+k*4]);
  slab(g,BR, [-10,45, 10,45, 9,54, -9,54], -.5,-.7);
  slab(g,BR, [-10,76, 10,76, 9,85, -9,85], -.5,-.7);
  slab(g,BR, [-9,2, 9,2, 10,12, 0,17, -10,12], -.5,-.7);       // garra
  poly(g,BR[2],[-10,10, -16,-6, -12,-4, -7,7]);
  poly(g,BR[2],[10,10, 16,-6, 12,-4, 7,7]);
  polyPath(g,[0,-43, 16,-17, 0,6, -16,-17]);                   // cristal
  const cg = g.createLinearGradient(-14,-36, 12,3);
  cg.addColorStop(0, RU[fire?7:6]); cg.addColorStop(.30, RU[fire?6:5]);
  cg.addColorStop(.60, RU[fire?5:3]); cg.addColorStop(1, RU[fire?3:1]);
  g.fillStyle=cg; g.fill();
  poly(g,RU[7],[-3,-34, 4,-24, -2,-12, -8,-20]);               // faceta brilhante
  if (fire){                                    // clarao contido: nucleo branco pequeno
    for (let k=0;k<6;k++){ const t=k*TAU/6 + 0.5;
      poly(g,RU[6],[Math.cos(t)*17, -17+Math.sin(t)*17,
                    Math.cos(t)*24-2, -17+Math.sin(t)*24,
                    Math.cos(t)*24+2, -17+Math.sin(t)*24]); }
    poly(g,"#ffffff",[0,-25, 5,-17, 0,-9, -5,-17]);
  }
  g.restore();
}
function tomeAt(g, x, y, cast){
  g.save(); g.translate(x,y);
  const LE=R_LTHR, PG=R_PAGE, BR=R_BRASS, FR=R_FIRE;
  slab(g,LE, [-58,34, -50,-14, 0,-6, 50,-14, 58,34, 0,40], -.5,-.6);
  slab(g,PG, [-53,29, -47,-10, -3,-3, -3,33], -.5,-.6);
  slab(g,PG, [53,29, 47,-10, 3,-3, 3,33], .5,-.6);
  g.strokeStyle=LE[1]; g.lineWidth=1;
  for (let i=0;i<7;i++){
    g.beginPath(); g.moveTo(-44,2+i*3.6); g.lineTo(-9,6+i*3.6); g.stroke();
    g.beginPath(); g.moveTo(9,6+i*3.6); g.lineTo(44,2+i*3.6); g.stroke();
  }
  poly(g,cast?FR[5]:LE[1],[-42,-2, -33,-2, -33,10, -42,10]);
  cyl(g,BR, 0,-6,9, 0,38,9, -1);
  slab(g,BR, [-58,30, -46,32, -47,38, -58,36], -.5,-.6);
  slab(g,BR, [58,30, 46,32, 47,38, 58,36], .5,-.6);
  if (cast){
    flame(g,FR[1],  0,-12, 1.46);
    flame(g,FR[2],  1,-13, 1.20);
    flame(g,FR[4], -1,-15, 0.92);
    flame(g,FR[5],  0,-16, 0.64);
    flame(g,FR[7],  0,-17, 0.34);
  }
  g.restore();
}
function dagger(g,x,y,a,glow,arc){
  daggerAt(g,x,y,a,glow);
  const p = gripAt(x,y,a,24); mageArm(g,p[0],p[1],a,1);
  if (arc) slash(g,arc[0],arc[1],arc[2],arc[3],arc[4]);
}
function staff(g,x,y,a,fire){
  staffAt(g,x,y,a,fire);
  const p = gripAt(x,y,a,65); mageArm(g,p[0],p[1],a,1);
}
const WSPR = {
  dagger: [
    wcan((g)=>dagger(g, 122, 80, -0.30, 0)),
    wcan((g)=>dagger(g, 104, 72, -0.75, 1, [112,86,64,-2.5,-1.0])),
    wcan((g)=>dagger(g,  86, 62, -1.25, 0, [108,82,70,-3.0,-1.7]))
  ],
  staff: [
    wcan((g)=>staff(g, 128, 40, 0.26, 0)),
    wcan((g)=>staff(g, 126, 44, 0.26, 1))
  ],
  tome: [
    wcan((g)=>{ tomeAt(g, 86, 62, 0);
                mageArm(g, 38, 92,  0.55, -1); mageArm(g, 134, 92, -0.55, 1); }),
    wcan((g)=>{ tomeAt(g, 86, 68, 1);
                mageArm(g, 38, 96,  0.55, -1); mageArm(g, 134, 96, -0.55, 1); })
  ]
};

/* ============================================================
   ROSTO DO HUD
   ============================================================ */
function faceCan(draw){
  const c=document.createElement("canvas"); c.width=32; c.height=30;
  const g=c.getContext("2d",{willReadFrequently:true});
  draw(g);
  const id=g.getImageData(0,0,32,30); crispen(id,P_FACE); g.putImageData(id,0,0);
  return c;
}
function drawFace(g, tier, mood){
  const SK=R_FLESH, HD=R_LEATH, RD=R_RED;
  box(g,"#141010", 0,0,32,30);
  slab(g,HD, [2,30, 2,13, 8,5, 16,2, 24,5, 30,13, 30,30], -.5,-.6);
  const dead = mood==="dead";
  sph(g, dead ? ["#2a1a10","#4a2f1c","#6b4530","#8f6446","#a8845e"] : SK,
       16,17, 9,10, -.5,-.5);
  slab(g,HD, [6,12, 26,12, 25,6, 7,6], -.5,-.6);
  if (dead){
    poly(g,RD[1],[9,13, 15,18, 14,19, 8,14]); poly(g,RD[1],[15,13, 9,18, 10,19, 16,14]);
    poly(g,RD[1],[17,13, 23,18, 22,19, 16,14]); poly(g,RD[1],[23,13, 17,18, 18,19, 24,14]);
    box(g,RD[3], 12,22,9,2); box(g,RD[2], 20,4,3,24);
    return;
  }
  box(g,"#f0e8d8", 10,14,5,4); box(g,"#f0e8d8", 18,14,5,4);
  const lk = mood==="evil" ? 1 : 0;
  box(g,"#141010", 11+lk,15,3,3); box(g,"#141010", 19+lk,15,3,3);
  if (mood==="pain"){ poly(g,HD[1],[9,10, 16,13, 16,15, 9,12]);
                      poly(g,HD[1],[24,10, 17,13, 17,15, 24,12]); }
  else if (mood==="evil"){ poly(g,HD[1],[9,14, 16,11, 16,13, 9,16]);
                           poly(g,HD[1],[24,14, 17,11, 17,13, 24,16]); }
  else { box(g,HD[1], 9,12,6,2); box(g,HD[1], 18,12,6,2); }
  if (mood==="pain"){ poly(g,"#2a1410",[12,21, 20,21, 19,25, 13,25]);
                      box(g,"#f0e8d8", 13,22,6,1); }
  else if (mood==="evil"){ box(g,"#2a1410", 11,22,10,2);
                           box(g,"#f0e8d8", 12,20,2,2); box(g,"#f0e8d8", 18,20,2,2); }
  else box(g,SK[1], 12,23,8,2);
  slab(g,HD, [10,26, 22,26, 20,30, 12,30], -.5,-.6);
  if (tier>=1) box(g,RD[3], 22,13,3,7);
  if (tier>=2){ box(g,RD[3], 8,19,4,3); box(g,RD[2], 24,20,3,4); }
  if (tier>=3){ box(g,RD[4], 13,9,7,3); box(g,RD[3], 6,15,3,6); }
  if (tier>=4){ box(g,RD[2], 9,21,14,4); box(g,RD[4], 11,7,10,3); }
}
const FACES = {
  norm: [0,1,2,3,4].map(t=>faceCan(g=>drawFace(g,t,"norm"))),
  pain: [0,1,2,3,4].map(t=>faceCan(g=>drawFace(g,t,"pain"))),
  evil: [0,1,2,3,4].map(t=>faceCan(g=>drawFace(g,t,"evil"))),
  dead: faceCan(g=>drawFace(g,4,"dead"))
};
