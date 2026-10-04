/* ============================================================
   A COR INDEXADA
   ------------------------------------------------------------
   A paleta, a COLORMAP e o indexador -- a maquinaria que faz uma imagem
   caber num byte por pixel e escurecer em bandas, como o Doom. Ficava no
   meio das texturas do jogo, que precisam de canvas; aqui e puro, entao o
   node tambem usa: e por isso que o canteiro consegue desenhar textura de
   estilo e folha de catalogo sem navegador.
   ============================================================ */
const LEV   = 16;                        // niveis de luz (colormap estilo Doom)

/* ---------- cor indexada ----------
   A imagem guarda um byte por pixel -- um indice -- e a cor sai da tabela na
   hora de desenhar. Foi assim que o Doom coube na memoria de 1993, e resolve
   aqui o mesmo problema por outro motivo: antes cada imagem carregava 16
   copias sombreadas de si mesma, 64 bytes por pixel. O diabrete em voxel, com
   3 poses e 8 rotacoes, pesava 4,7 MB; converter as seis criaturas passaria
   de 25 MB. Indexado, o mesmo diabrete cabe em 74 KB, e a tabela de 16 KB
   ainda e dividida por todo mundo que usa a mesma paleta.

   O indice 0 e sempre o vazio, para o teste de transparencia continuar sendo
   um "se der zero, pula". */

/* Levanta uma paleta a partir da propria imagem: as cores mais usadas ficam,
   o resto cai na mais parecida. Para textura desenhada com poucos tons isso e
   exato; so gradiente longo chega perto do limite de 255. */
function paletaDe(src){
  const conta = new Map();
  for (let i=0;i<src.length;i++){
    const c = src[i];
    if ((c>>>24) < 8) continue;
    const k = c & 0xFFFFFF;
    conta.set(k, (conta.get(k)||0) + 1);
  }
  let chaves = Array.from(conta.keys());
  if (chaves.length > 255){
    chaves.sort(function(a,b){ return conta.get(b) - conta.get(a); });
    chaves = chaves.slice(0, 255);
  }
  const idx = new Map();
  const pal = [];
  for (let i=0;i<chaves.length;i++){
    const k = chaves[i];
    pal.push([k & 255, k>>>8 & 255, k>>>16 & 255]);
    idx.set(k, i+1);
  }
  return {pal:pal, idx:idx};
}

/* A COLORMAP: uma linha de 256 cores por nivel de luz. */
function fazColormap(pal, fog){
  const fr = fog ? (fog & 255) : 0,
        fg = fog ? (fog>>>8 & 255) : 0,
        fb = fog ? (fog>>>16 & 255) : 0;
  const cm = new Uint32Array(LEV*256);
  const n = Math.min(pal.length, 255);
  for (let L=0; L<LEV; L++){
    const f = Math.max(0, 1 - L/17), g1 = 1 - f, base = L*256;
    for (let k=0;k<n;k++){
      const p = pal[k];
      const r = (p[0]*f + fr*g1) | 0,
            g = (p[1]*f + fg*g1) | 0,
            b = (p[2]*f + fb*g1) | 0;
      cm[base + k + 1] = 0xFF000000 | (b<<16) | (g<<8) | r;
    }
  }
  return cm;
}

/* Tabelas de paleta conhecida sao compartilhadas: os sprites ja passam pelo
   crispen, que forca cada pixel para uma paleta fixa, entao dezenas deles
   dividem uma tabela so -- e, de quebra, a memoria de conversao. */
const TABELAS = new Map();
function tabelaDaPaleta(pal, fog){
  let porNevoa = TABELAS.get(pal);
  if (!porNevoa){ porNevoa = new Map(); TABELAS.set(pal, porNevoa); }
  const k = fog || 0;
  let t = porNevoa.get(k);
  if (!t){ t = {pal:pal, idx:new Map(), cm:fazColormap(pal, k)}; porNevoa.set(k, t); }
  return t;
}

function indexar(src, tab){
  const px = new Uint8Array(src.length);
  const idx = tab.idx, pal = tab.pal, n = Math.min(pal.length, 255);
  for (let i=0;i<src.length;i++){
    const c = src[i];
    if ((c>>>24) < 8) continue;                 // ja e 0
    const k = c & 0xFFFFFF;
    let v = idx.get(k);
    if (v === undefined){
      const r = k & 255, g = k>>>8 & 255, b = k>>>16 & 255;
      let melhor = 1, dist = 1e9;
      for (let j=0;j<n;j++){
        const p = pal[j], dr = r-p[0], dg = g-p[1], db = b-p[2];
        const s = dr*dr + dg*dg + db*db;
        if (s < dist){ dist = s; melhor = j+1; }
      }
      v = melhor;
      idx.set(k, v);                            // a proxima ocorrencia sai de graca
    }
    px[i] = v;
  }
  return px;
}

function shadeStack(src, w, h, fog, tab){
  let t = tab;
  if (!t){ t = paletaDe(src); t.cm = fazColormap(t.pal, fog); }
  return {px: indexar(src, t), cm: t.cm, w:w, h:h};
}


/* As copias menores de uma textura (o mip): metade, um quarto... ate 8 de
   lado, para o chao longe nao cintilar quando um pixel da tela cobre mais de
   dois texels (o rasterizador escolhe, p5a.js). A textura e de indice na
   paleta, entao nao se tira media: cada texel novo fica com o indice que mais
   aparece nos quatro que ele cobre (empate: o de cima a esquerda). So as
   texturas de 128 por tile tem (o padrao; com ?mundo=64, nenhuma).

   Com a tabela de cor (cm), em vez da maioria fica, dos quatro, o que tem a
   cor mais perto da media deles: a maioria escurecia a calcada longe, porque
   o rejunte e um indice so e as pedras sao varios. */
function comMips(t){
  const lista = [], cm = t.cm;
  let px = t.px, w = t.w, h = t.h;
  while (w > 8 && h > 8){
    const w2 = w >> 1, h2 = h >> 1, q = new Uint8Array(w2*h2);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++){
      const o = 2*y*w + 2*x, a = px[o], b = px[o + 1], c = px[o + w], d = px[o + w + 1];
      if (!cm){ q[y*w2 + x] = (a === b || a === c || a === d) ? a : (b === c || b === d) ? b : c === d ? c : a; continue; }
      const k = [a, b, c, d];
      let mr = 0, mg = 0, mb = 0;
      for (const i of k){ const v = cm[i]; mr += v & 255; mg += (v >> 8) & 255; mb += (v >> 16) & 255; }
      mr /= 4; mg /= 4; mb /= 4;
      let melhor = a, dist = Infinity;
      for (const i of k){ const v = cm[i], dr = (v & 255) - mr, dg = ((v >> 8) & 255) - mg, db = ((v >> 16) & 255) - mb, e = dr*dr + dg*dg + db*db; if (e < dist){ dist = e; melhor = i; } }
      q[y*w2 + x] = melhor;
    }
    lista.push({px: q, w: w2, h: h2});
    px = q; w = w2; h = h2;
  }
  t.mips = lista;
  return t;
}

if (typeof module !== "undefined") module.exports = {
  LEV, paletaDe, fazColormap, TABELAS, tabelaDaPaleta, indexar, shadeStack, comMips
};
