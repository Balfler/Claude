/* ============================================================
   SONDAGEM 7 -- O CORPO PELAS TRES VISTAS, SEM IA
   ------------------------------------------------------------
   A medicao do caminho "so vistas" do prompts/personagem-do-desenho.md:
   uma folha com frente, perfil e costas (T-pose, fundo liso) vira o corpo
   do atelie, e da para olhar e medir.

     1. recorta: tira o fundo por enchente a partir da borda (o contorno
        escuro do desenho fecha a silhueta), joga fora o texto e separa as
        tres vistas pelas colunas vazias;
     2. esculpe: o volume e o cruzamento das tres silhuetas; cada fatia
        horizontal vira elipses (superelipse) em vez de caixas, e o braco
        em T-pose, que de lado se esconde atras do tronco, vira um cilindro
        com a grossura que a frente mostra;
     3. pinta: cada voxel da superficie pega a cor da vista que mais encara
        ele e que o enxerga; o lado sem vista copia o lado espelhado; o
        contorno pintado na borda sai;
     4. entrega ao atelie (importarModelo): 115 de altura, 54 cores, macio
        por dentro -- e dai o rig proposto e a folha de contato.

   Uso:
     node mundo-perigoso/sondagens/7-tres-vistas/tresvistas.js <folha.png> <pasta-de-saida>
          [--nome=guerreiro] [--perfil=direita|esquerda] [--res=2] [--p=2.5]
   --perfil: para onde o personagem olha na vista de perfil (sem, adivinha
   pelos pes). --res: quantas vezes 115 o volume de trabalho tem de altura.
   --p: o expoente da superelipse das fatias (2 e elipse; maior, mais caixa).
   --forma: usa a forma de um .wgvox ou .glb (T-pose, a mesma pessoa da folha) e so
   pinta com a cor do desenho -- a forma redonda da IA, a cor limpa do desenho.
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const png = require("../../editor/png.js");
const C = require("../../atelie/corpo.js"), Ar = require("../../atelie/arquivos.js"), F = require("../../atelie/folha.js");
const vox = require("../../editor/vox.js");
const N = require("../../atelie/nucleo.js"), Resolucao = require("../../atelie/resolucao.js");

const luz = (r, g, b) => 0.299*r + 0.587*g + 0.114*b;
const dist2 = (a, b) => (a[0] - b[0])**2 + (a[1] - b[1])**2 + (a[2] - b[2])**2;

/* ---------- 1. recortar ---------- */
function fundoDaBorda(img){
  const L = img.largura, H = img.altura, rs = [], gs = [], bs = [];
  const pega = (x, y) => { const i = (y*L + x)*4; rs.push(img.rgba[i]); gs.push(img.rgba[i + 1]); bs.push(img.rgba[i + 2]); };
  for (let x = 0; x < L; x += 4){ pega(x, 0); pega(x, H - 1); }
  for (let y = 0; y < H; y += 4){ pega(0, y); pega(L - 1, y); }
  const med = a => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}
/* fundo = o que se alcanca da borda andando por cor parecida com a do fundo */
function mascara(img, fundo, tol){
  const L = img.largura, H = img.altura, n = L*H, fora = new Uint8Array(n), fila = new Int32Array(n);
  let ini = 0, fim = 0;
  const t2 = tol*tol;
  const parecido = i => dist2([img.rgba[i*4], img.rgba[i*4 + 1], img.rgba[i*4 + 2]], fundo) < t2;
  const semear = i => { if (!fora[i] && parecido(i)){ fora[i] = 1; fila[fim++] = i; } };
  for (let x = 0; x < L; x++){ semear(x); semear((H - 1)*L + x); }
  for (let y = 0; y < H; y++){ semear(y*L); semear(y*L + L - 1); }
  while (ini < fim){
    const i = fila[ini++], x = i % L, y = (i - x)/L;
    if (x > 0) semear(i - 1); if (x < L - 1) semear(i + 1); if (y > 0) semear(i - L); if (y < H - 1) semear(i + L);
  }
  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++) m[i] = fora[i] ? 0 : 1;
  /* so os pedacos grandes: o texto embaixo e os pontos soltos saem */
  const rot = new Int32Array(n).fill(-1), areas = [];
  for (let s = 0; s < n; s++){
    if (!m[s] || rot[s] >= 0) continue;
    const id = areas.length; let a = 0; ini = 0; fim = 0; fila[fim++] = s; rot[s] = id;
    while (ini < fim){
      const i = fila[ini++], x = i % L, y = (i - x)/L; a++;
      for (const j of [x > 0 ? i - 1 : -1, x < L - 1 ? i + 1 : -1, y > 0 ? i - L : -1, y < H - 1 ? i + L : -1])
        if (j >= 0 && m[j] && rot[j] < 0){ rot[j] = id; fila[fim++] = j; }
    }
    areas.push(a);
  }
  return {m: m, rot: rot, areas: areas};
}
/* As vistas sao os tres maiores pedacos, da esquerda para a direita; pedaco
   grande que sobra vai para a vista mais perto. Depois disso m[i] diz de que
   vista e o pixel (1, 2, 3; 0 e fundo) -- a mao da frente pode estar na mesma
   coluna que a capa do perfil. */
function separarVistas(msk, L, H){
  const {m, rot, areas} = msk, n = L*H;
  const maior = Math.max.apply(null, areas), cx = areas.map(() => 0);
  for (let i = 0; i < n; i++) if (m[i]) cx[rot[i]] += i % L;
  const grandes = areas.map((a, id) => id).filter(id => areas[id] >= maior*0.03);
  const tres = grandes.slice().sort((a, b) => areas[b] - areas[a]).slice(0, 3).sort((a, b) => cx[a]/areas[a] - cx[b]/areas[b]);
  if (tres.length < 3) throw new Error("achei " + tres.length + " vistas; a folha precisa de frente, perfil e costas lado a lado");
  const vistaDe = new Int32Array(areas.length);
  for (const id of grandes){
    let melhor = 0, d = 1e9;
    tres.forEach(function(t, k){ const dd = Math.abs(cx[id]/areas[id] - cx[t]/areas[t]); if (dd < d){ d = dd; melhor = k + 1; } });
    vistaDe[id] = melhor;
  }
  for (let i = 0; i < n; i++) m[i] = m[i] ? vistaDe[rot[i]] : 0;
  return [1, 2, 3].map(function(code){
    let x0 = L, x1 = -1, y0 = H, y1 = -1;
    for (let i = 0; i < n; i++) if (m[i] === code){ const x = i % L, y = (i - x)/L; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    /* o meio do tronco: o centro da mascara entre 40% e 60% da altura */
    let sx = 0, nn = 0;
    for (let y = Math.round(y0 + (y1 - y0)*0.4); y <= Math.round(y0 + (y1 - y0)*0.6); y++)
      for (let x = x0; x <= x1; x++) if (m[y*L + x] === code){ sx += x; nn++; }
    return {code: code, x0: x0, x1: x1, y0: y0, y1: y1, cx: nn ? sx/nn : (x0 + x1)/2};
  });
}
/* no perfil, o pe aponta para a frente: a ponta dos pes contra a canela */
function perfilOlhaPara(m, L, v){
  const h = v.y1 - v.y0, centro = (ya, yb) => {
    let s = 0, n = 0;
    for (let y = ya; y <= yb; y++) for (let x = v.x0; x <= v.x1; x++) if (m[y*L + x] === v.code){ s += x; n++; }
    return n ? s/n : 0;
  };
  const pe = centro(Math.round(v.y1 - h*0.025), v.y1), canela = centro(Math.round(v.y0 + h*0.78), Math.round(v.y0 + h*0.86));
  return pe >= canela ? "direita" : "esquerda";
}
/* o contorno pintado: na casca da silhueta, o pixel bem mais escuro que o de
   dentro mais perto troca pela cor de dentro */
function semContorno(img, m, v, casca){
  const L = img.largura, out = new Uint8Array(img.rgba);
  const W = v.x1 - v.x0 + 1, Hh = v.y1 - v.y0 + 1, n = W*Hh;
  const d = new Int32Array(n).fill(-1), fila = new Int32Array(n);
  let ini = 0, fim = 0;
  const glob = k => { const x = v.x0 + k % W, y = v.y0 + ((k/W) | 0); return y*L + x; };
  for (let k = 0; k < n; k++){
    if (m[glob(k)] !== v.code) continue;
    const x = k % W, y = (k/W) | 0;
    const borda = x === 0 || y === 0 || x === W - 1 || y === Hh - 1 || m[glob(k - 1)] !== v.code || m[glob(k + 1)] !== v.code || m[glob(k - W)] !== v.code || m[glob(k + W)] !== v.code;
    if (borda){ d[k] = 0; fila[fim++] = k; }
  }
  while (ini < fim){
    const k = fila[ini++], x = k % W, y = (k/W) | 0;
    for (const j of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < Hh - 1 ? k + W : -1])
      if (j >= 0 && d[j] < 0 && m[glob(j)] === v.code){ d[j] = d[k] + 1; fila[fim++] = j; }
  }
  /* de dentro para fora: cada pixel da casca herda a cor de dentro mais perto */
  const origem = new Int32Array(n).fill(-1);
  ini = 0; fim = 0;
  for (let k = 0; k < n; k++) if (d[k] === casca + 1){ origem[k] = k; fila[fim++] = k; }
  while (ini < fim){
    const k = fila[ini++], x = k % W, y = (k/W) | 0;
    for (const j of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < Hh - 1 ? k + W : -1])
      if (j >= 0 && origem[j] < 0 && d[j] >= 0 && d[j] <= casca){ origem[j] = origem[k]; fila[fim++] = j; }
  }
  let trocados = 0;
  for (let k = 0; k < n; k++){
    if (d[k] < 0 || d[k] > casca || origem[k] < 0) continue;
    const a = glob(k)*4, b = glob(origem[k])*4;
    if (luz(img.rgba[a], img.rgba[a + 1], img.rgba[a + 2]) < 0.6*luz(img.rgba[b], img.rgba[b + 1], img.rgba[b + 2])){
      out[a] = img.rgba[b]; out[a + 1] = img.rgba[b + 1]; out[a + 2] = img.rgba[b + 2]; trocados++;
    }
  }
  return {rgba: out, trocados: trocados};
}

/* ---------- 2. esculpir ---------- */
function esculpir(folha, opcoes){
  const {img, m, frente, perfil, costas, olha} = folha, L = img.largura;
  const NZ = opcoes.alto ? Math.round(opcoes.alto) : Math.round(115*(opcoes.res || 2)), p = opcoes.p || 2.5;
  const sF = NZ/(frente.y1 - frente.y0 + 1), sB = NZ/(costas.y1 - costas.y0 + 1), sS = NZ/(perfil.y1 - perfil.y0 + 1);
  const NX = Math.ceil(Math.max((frente.x1 - frente.x0 + 1)*sF, (costas.x1 - costas.x0 + 1)*sB)) + 4;
  const NY = Math.ceil((perfil.x1 - perfil.x0 + 1)*sS) + 2;
  const ic = NX/2;
  const M = (v, x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && x < L && y >= 0 && y < img.altura && m[y*L + x] === v.code; };
  /* onde cada voxel cai em cada vista (u: coluna, v: linha da imagem) */
  const proj = {
    frente: (i, j, k) => [frente.cx + (i + 0.5 - ic)/sF, frente.y1 + 1 - (k + 0.5)/sF],
    costas: (i, j, k) => [costas.cx - (i + 0.5 - ic)/sB, costas.y1 + 1 - (k + 0.5)/sB],
    perfil: (i, j, k) => [olha === "direita" ? perfil.x1 + 1 - (j + 0.5)/sS : perfil.x0 + (j + 0.5)/sS, perfil.y1 + 1 - (k + 0.5)/sS]
  };
  const idx = (i, j, k) => (k*NY + j)*NX + i;
  const cheio = new Uint8Array(NX*NY*NZ);
  const linhaF = new Uint8Array(NX*NZ), linhaS = new Uint8Array(NY*NZ);
  for (let k = 0; k < NZ; k++){
    for (let i = 0; i < NX; i++){ const a = proj.frente(i, 0, k), b = proj.costas(i, 0, k); linhaF[k*NX + i] = M(frente, a[0], a[1]) && M(costas, b[0], b[1]) ? 1 : 0; }
    for (let j = 0; j < NY; j++){ const s = proj.perfil(0, j, k); linhaS[k*NY + j] = M(perfil, s[0], s[1]) ? 1 : 0; }
  }
  /* o sovaco: descendo da cabeca, a primeira linha em que a largura cai de
     envergadura para tronco; acima dela e fora do tronco, e braco */
  const largura = k => { let a = -1, b = -1; for (let i = 0; i < NX; i++) if (linhaF[k*NX + i]){ if (a < 0) a = i; b = i; } return a < 0 ? 0 : b - a + 1; };
  let maxL = 0, kMax = 0;
  for (let k = 0; k < NZ; k++){ const l = largura(k); if (l > maxL){ maxL = l; kMax = k; } }
  let kSovaco = kMax;
  while (kSovaco > 0 && largura(kSovaco) > maxL*0.6) kSovaco--;
  /* o tronco no sovaco: o trecho da linha que contem o meio, uns voxels abaixo */
  const kT = Math.max(0, kSovaco - Math.round(NZ*0.02));
  let tl = Math.floor(ic), tr = Math.floor(ic);
  while (tl > 0 && linhaF[kT*NX + tl - 1]) tl--;
  while (tr < NX - 1 && linhaF[kT*NX + tr + 1]) tr++;
  const temBraco = maxL > (tr - tl + 1)*1.6;
  const ehBraco = (i, k) => temBraco && k > kSovaco - Math.round(NZ*0.01) && (i < tl || i > tr);
  /* as fatias: produto dos trechos da frente pelos do perfil, cada um uma superelipse */
  const trechos = (linha, n0, n) => { const t = []; let a = -1; for (let q = 0; q <= n; q++){ const on = q < n && linha[n0 + q]; if (on && a < 0) a = q; if (!on && a >= 0){ t.push([a, q - 1]); a = -1; } } return t; };
  for (let k = 0; k < NZ; k++){
    const TX = [];
    for (const [a, b] of trechos(linhaF, k*NX, NX)){
      /* na altura dos bracos, a elipse do tronco so vai de tl a tr */
      if (temBraco && k > kSovaco - Math.round(NZ*0.01)){ const a2 = Math.max(a, tl), b2 = Math.min(b, tr); if (a2 <= b2) TX.push([a2, b2]); }
      else TX.push([a, b]);
    }
    const TY = trechos(linhaS, k*NY, NY);
    for (const [xa, xb] of TX) for (const [ya, yb] of TY){
      const cx = (xa + xb)/2, cy = (ya + yb)/2, rx = (xb - xa + 1)/2, ry = (yb - ya + 1)/2;
      for (let j = ya; j <= yb; j++) for (let i = xa; i <= xb; i++){
        const q = Math.pow(Math.abs((i - cx)/rx), p) + Math.pow(Math.abs((j - cy)/ry), p);
        if (q <= 1.0001) cheio[idx(i, j, k)] = 1;
      }
    }
  }
  /* o braco: cada coluna x fora do tronco e um circulo no plano y-z, com o
     alto e o baixo que a frente mostra, no meio da profundidade do ombro */
  let braco = 0;
  if (temBraco){
    let sj = 0, nj = 0;
    for (let k = kSovaco; k < NZ; k++) for (let j = 0; j < NY; j++) if (linhaS[k*NY + j]) { sj += j; nj++; }
    const jc = nj ? sj/nj : NY/2;
    for (let i = 0; i < NX; i++){
      if (i >= tl && i <= tr) continue;
      /* os trechos da coluna i acima do sovaco */
      let a = -1;
      for (let k = Math.max(0, kSovaco - Math.round(NZ*0.01)); k <= NZ; k++){
        const on = k < NZ && linhaF[k*NX + i];
        if (on && a < 0) a = k;
        if (!on && a >= 0){
          const zm = (a + k - 1)/2, r = (k - a)/2;
          for (let kk = a; kk < k; kk++) for (let j = 0; j < NY; j++)
            if ((j - jc)*(j - jc) + (kk - zm)*(kk - zm) <= r*r + 0.25){ cheio[idx(i, j, kk)] = 1; braco++; }
          a = -1;
        }
      }
    }
  }
  return {NX, NY, NZ, cheio, idx, proj, ic, sF, sB, sS, kSovaco, tl, tr, temBraco, linhaF, linhaS};
}

/* ---------- 3. pintar ---------- */
function pintar(folha, V, cores){
  if (V.guia === undefined) V.guia = null;
  const {NX, NY, NZ, cheio, idx, proj, ic} = V, L = folha.img.largura;
  const vazio = (i, j, k) => i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ || !cheio[idx(i, j, k)];
  /* o que cada vista enxerga: o primeiro cheio ao longo do raio */
  const visto = {frente: new Uint8Array(cheio.length), costas: new Uint8Array(cheio.length), perfil: new Uint8Array(cheio.length)};
  for (let k = 0; k < NZ; k++){
    for (let i = 0; i < NX; i++){
      for (let j = 0; j < NY; j++) if (cheio[idx(i, j, k)]){ visto.frente[idx(i, j, k)] = 1; break; }
      for (let j = NY - 1; j >= 0; j--) if (cheio[idx(i, j, k)]){ visto.costas[idx(i, j, k)] = 1; break; }
    }
    for (let j = 0; j < NY; j++){
      if (folha.olha === "direita"){ for (let i = 0; i < NX; i++) if (cheio[idx(i, j, k)]){ visto.perfil[idx(i, j, k)] = 1; break; } }
      else { for (let i = NX - 1; i >= 0; i--) if (cheio[idx(i, j, k)]){ visto.perfil[idx(i, j, k)] = 1; break; } }
    }
  }
  /* a normal de fora de cada voxel: a soma das direcoes vazias em volta */
  const NORMAL = {frente: [0, -1, 0], costas: [0, 1, 0], perfil: folha.olha === "direita" ? [-1, 0, 0] : [1, 0, 0]};
  const ESPELHO = [-NORMAL.perfil[0], 0, 0];
  /* a mediana dos 3x3 pixels em volta: tira o ruido do JPEG sem misturar as
     cores de dois pixels de arte vizinhos, como a media misturava */
  const amostra = (vista, i, j, k) => {
    const [u, v] = proj[vista](i, j, k), img = cores[vista];
    const rs = [], gs = [], bs = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      const x = Math.floor(u) + dx, y = Math.floor(v) + dy;
      if (x < 0 || y < 0 || x >= L || y >= folha.img.altura || folha.m[y*L + x] !== folha[vista].code) continue;
      const q = (y*L + x)*4; rs.push(img[q]); gs.push(img[q + 1]); bs.push(img[q + 2]);
    }
    if (!rs.length) return null;
    const med = a => a.sort((x, y) => x - y)[a.length >> 1];
    return [med(rs), med(gs), med(bs)];
  };
  const cor = new Array(cheio.length).fill(null), fonte = {frente: 0, costas: 0, perfil: 0, espelho: 0, vizinho: 0};
  const superficie = [];
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++){
    const q = idx(i, j, k);
    if (!cheio[q]) continue;
    if (!(vazio(i - 1, j, k) || vazio(i + 1, j, k) || vazio(i, j - 1, k) || vazio(i, j + 1, k) || vazio(i, j, k - 1) || vazio(i, j, k + 1))) continue;
    superficie.push(q);
    let nx = 0, ny = 0, nz = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      if ((dx || dy || dz) && vazio(i + dx, j + dy, k + dz)){ const l = Math.hypot(dx, dy, dz); nx += dx/l; ny += dy/l; nz += dz/l; }
    const ln = Math.hypot(nx, ny, nz) || 1; nx /= ln; ny /= ln; nz /= ln;
    /* Os candidatos: cada vista que enxerga o voxel, e o perfil espelhado para
       o lado sem vista. A nota e o quanto a normal encara a vista; com o guia
       (a cor da forma, V.guia), perde nota a cor que foge muito dele -- e o
       que escolhe a pele da capa em vez do cabelo quando as costas, um pouco
       fora, pintariam o cabelo na nuca. Diferenca pequena nao conta: o guia
       e salpicado e o desenho e que tem o detalhe. */
    const g = V.guia ? V.guia(q) : null;
    let melhor = null, nota = -1e9, corMelhor = null;
    const ie = Math.round(2*ic - 1 - i), qe = ie >= 0 && ie < NX ? idx(ie, j, k) : -1;
    const candidatos = [];
    for (const vista of ["frente", "costas", "perfil"]){
      if (!visto[vista][q]) continue;
      const d = nx*NORMAL[vista][0] + ny*NORMAL[vista][1] + nz*NORMAL[vista][2];
      candidatos.push([vista, d, i]);
    }
    if (qe >= 0 && cheio[qe] && visto.perfil[qe]) candidatos.push(["espelho", nx*ESPELHO[0], ie]);
    for (const [vista, d, ii] of candidatos){
      /* de raspao a vista nao vale: o topo do ombro e da gola nenhuma vista
         encara, e pegava a cor do rosto ou do cabelo que passava ao lado */
      if (d < (V.guia ? 0.3 : -0.2)) continue;
      const c = amostra(vista === "espelho" ? "perfil" : vista, ii, j, k);
      if (!c) continue;
      let n = d;
      if (g){ const dc = Math.sqrt(dist2(c, g)); n -= Math.max(0, dc - 55)/60; }
      if (n > nota){ nota = n; melhor = vista; corMelhor = c; }
    }
    if (corMelhor){ cor[q] = corMelhor; fonte[melhor]++; continue; }
  }
  /* Com o guia, o que nenhuma vista encara de frente (o topo dos ombros, da
     gola, da cabeca) pega, entre as cores ja pintadas ate 3 voxels dali, a
     mais perto da cor da forma ali -- o cabelo em cima da cabeca, a pele da
     capa em cima da gola --, crescendo de fora para dentro em passadas. */
  if (V.guia){
    let resta = superficie.filter(q => !cor[q]);
    for (let passada = 0; passada < 12 && resta.length; passada++){
      const novos = [];
      for (const q of resta){
        const i = q % NX, j = ((q/NX) | 0) % NY, k = (q/(NX*NY)) | 0, g = V.guia(q);
        let melhor = null, dm = 1e9;
        for (let dz = -3; dz <= 3; dz++) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++){
          const a = i + dx, b = j + dy, c = k + dz;
          if (a < 0 || b < 0 || c < 0 || a >= NX || b >= NY || c >= NZ) continue;
          const cc = cor[idx(a, b, c)];
          if (!cc) continue;
          const d = g ? dist2(cc, g) : dx*dx + dy*dy + dz*dz;
          if (d < dm){ dm = d; melhor = cc; }
        }
        if (melhor) novos.push([q, melhor]);
      }
      for (const [q, c] of novos){ cor[q] = c; fonte.guia = (fonte.guia || 0) + 1; }
      resta = resta.filter(q => !cor[q]);
    }
  }
  /* o que ninguem viu herda do vizinho pintado mais perto */
  let fila = superficie.filter(q => cor[q]), ini = 0;
  const falta = new Set(superficie.filter(q => !cor[q]));
  while (ini < fila.length && falta.size){
    const q = fila[ini++], i = q % NX, j = ((q/NX) | 0) % NY, k = (q/(NX*NY)) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      const a = i + dx, b = j + dy, c = k + dz;
      if (a < 0 || b < 0 || c < 0 || a >= NX || b >= NY || c >= NZ) continue;
      const r = idx(a, b, c);
      if (falta.has(r)){ cor[r] = cor[q]; falta.delete(r); fila.push(r); fonte.vizinho++; }
    }
  }
  /* o miolo pega a cor da casca mais perto: ao reduzir para 115, o atelie
     tira a media de blocos, e miolo sem cor sujaria a casca */
  fila = superficie.filter(q => cor[q]); ini = 0;
  while (ini < fila.length){
    const q = fila[ini++], i = q % NX, j = ((q/NX) | 0) % NY, k = (q/(NX*NY)) | 0;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]){
      const a = i + dx, b = j + dy, c = k + dz;
      if (a < 0 || b < 0 || c < 0 || a >= NX || b >= NY || c >= NZ) continue;
      const r = idx(a, b, c);
      if (cheio[r] && !cor[r]){ cor[r] = cor[q]; fila.push(r); }
    }
  }
  return {cor, fonte, superficie: superficie.length};
}

/* ---------- 4. medir: quanto a silhueta do volume bate com a do desenho ---------- */
function fidelidade(folha, V){
  const {NX, NY, NZ, cheio, idx, proj} = V, L = folha.img.largura;
  const M = (v, x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && x < L && y >= 0 && y < folha.img.altura && folha.m[y*L + x] === v.code; };
  const r = {};
  for (const vista of ["frente", "costas", "perfil"]){
    let inter = 0, uniao = 0;
    const W = vista === "perfil" ? NY : NX;
    for (let k = 0; k < NZ; k++) for (let w = 0; w < W; w++){
      let temVol = false;
      if (vista === "perfil"){ for (let i = 0; i < NX && !temVol; i++) if (cheio[idx(i, w, k)]) temVol = true; }
      else { for (let j = 0; j < NY && !temVol; j++) if (cheio[idx(w, j, k)]) temVol = true; }
      const [u, v] = vista === "perfil" ? proj.perfil(0, w, k) : proj[vista](w, 0, k);
      const temDes = M(folha[vista], u, v);
      if (temVol && temDes) inter++;
      if (temVol || temDes) uniao++;
    }
    r[vista] = uniao ? +(inter/uniao).toFixed(3) : 0;
  }
  return r;
}

/* ---------- a forma de fora, a cor do desenho ----------
   A forma vem de outro lugar (o .wgvox do Sorceress, um .glb voxelizado): so
   quais voxels existem. A cor e projetada do desenho, como acima -- o
   .wgvox deles tem a forma redonda que tres silhuetas nao dao, mas a cor
   salpicada de uma textura de IA. O volume e alinhado as vistas pela altura
   (os pes e a cabeca) e pelo meio do tronco. */
function volumeDeFora(fonte, folha){
  const NX = fonte.gx, NY = fonte.gy, NZ = fonte.gz, idx = (i, j, k) => (k*NY + j)*NX + i;
  const cheio = new Uint8Array(NX*NY*NZ);
  let z0 = 1e9, z1 = -1;
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++)
    if (fonte.rgb(i, j, k)){ cheio[idx(i, j, k)] = 1; if (k < z0) z0 = k; if (k > z1) z1 = k; }
  if (z1 < 0) throw new Error("a forma esta vazia");
  const h = z1 - z0 + 1;
  let sx = 0, sy = 0, nn = 0;
  for (let k = z0 + Math.round(h*0.4); k <= z0 + Math.round(h*0.6); k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++)
    if (cheio[idx(i, j, k)]){ sx += i; sy += j; nn++; }
  const icx = sx/nn + 0.5, icy = sy/nn + 0.5, {frente, perfil, costas, olha} = folha;
  const alto = v => v.y1 - v.y0 + 1, sF = h/alto(frente), sB = h/alto(costas), sS = h/alto(perfil);
  /* O alinhamento fino: a folha e a forma nao sao exatamente o mesmo desenho
     (o Sorceress re-enquadra a imagem). Para CADA vista se procura uma escala
     e um deslocamento, nos dois eixos dela, que maximizem a interseccao sobre
     a uniao da silhueta da forma com a do desenho, no espaco dos voxels.

     1/10, a pedido do Leandro: com um so alinhamento para frente e costas, as
     costas ficavam fora uns voxels e o cabelo pintava a pele da capa na nuca;
     e a cabeca do desenho tem outra proporcao que a da forma, entao o olho de
     frente caia esticado na lateral do rosto. Agora cada vista tem o dela, e
     a cabeca (acima do pescoco) o seu proprio, emendado no do corpo em 6
     voxels. */
  const L = folha.img.largura, Hh = folha.img.altura, m = folha.m;
  const Ff = new Uint8Array(NX*NZ), Fp = new Uint8Array(NY*NZ);
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (cheio[idx(i, j, k)]){ Ff[k*NX + i] = 1; Fp[k*NY + j] = 1; }
  const no = (v, u, w) => { u = Math.floor(u); w = Math.floor(w); return u >= 0 && w >= 0 && u < L && w < Hh && m[w*L + u] === v.code; };
  const VISTAS = {
    frente: {v: frente, s: sF, W: NX, sil: Ff, u: (w, par) => frente.cx + ((w + 0.5 - icx)*par.mx + par.dx)/sF},
    costas: {v: costas, s: sB, W: NX, sil: Ff, u: (w, par) => costas.cx - ((w + 0.5 - icx)*par.mx + par.dx)/sB},
    perfil: {v: perfil, s: sS, W: NY, sil: Fp, u: (w, par) => perfil.cx + (olha === "direita" ? icy - (w + 0.5) : (w + 0.5) - icy)*par.mx/sS + par.dx/sS}
  };
  const linhaDaFolha = (V, k, par) => V.v.y1 + 1 - ((k - z0 + 0.5)*par.mz + par.dz)/V.s;
  function iou(nome, par, kMin, kMax){
    const V = VISTAS[nome];
    let inter = 0, uniao = 0;
    for (let k = kMin; k <= kMax; k++){
      const w = linhaDaFolha(V, k, par);
      for (let x = 0; x < V.W; x++){
        const A = V.sil[k*V.W + x] === 1, B = no(V.v, V.u(x, par), w);
        if (A && B) inter++;
        if (A || B) uniao++;
      }
    }
    return uniao ? inter/uniao : 0;
  }
  function buscar(nome, kMin, kMax, inicio){
    let melhor = inicio || {mx: 1, mz: 1, dx: 0, dz: 0}, nota = iou(nome, melhor, kMin, kMax);
    const antes = nota;
    /* grossa (escala 6%, deslocamento 8 voxels) e depois fina, em volta do melhor */
    for (const [pe, pd] of [[0.03, 4], [0.01, 1.5], [0.004, 0.6]]){
      const centro = melhor;
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) for (let d = -2; d <= 2; d++){
        const par = {mx: centro.mx + a*pe, mz: centro.mz + b*pe, dx: centro.dx + c*pd, dz: centro.dz + d*pd};
        const n = iou(nome, par, kMin, kMax);
        if (n > nota + 1e-9){ nota = n; melhor = par; }
      }
    }
    return {par: melhor, antes: +antes.toFixed(3), depois: +nota.toFixed(3)};
  }
  /* o queixo: subindo de 78% da altura (a gola, o ombro), a primeira linha em
     que a silhueta de frente fica com menos de 55% da largura dali -- e onde a
     gola acaba e comeca a cabeca. A mais estreita nao servia: a gola de pele
     cobre o pescoco, e a mais estreita caia na testa. */
  const largura = k => { let n = 0; for (let i = 0; i < NX; i++) n += Ff[k*NX + i]; return n; };
  const kBase = z0 + Math.round(h*0.78), lBase = largura(kBase);
  let kPesc = z0 + Math.round(h*0.87);
  for (let k = kBase; k <= z0 + Math.round(h*0.95); k++) if (largura(k) < lBase*0.55){ kPesc = k; break; }
  /* a forma sem cor (a do gerador local, so malha) nao serve de guia: tudo
     cinza puxaria a escolha para a vista de cor mais apagada */
  const guia = fonte.semCor ? null : mediaDaCor(fonte, cheio, NX, NY, NZ, 2);
  /* O rosto: a silhueta da cabeca inclui o cabelo, e o cabelo do desenho e
     da forma nao tem a mesma largura que o rosto -- o olho de frente caia na
     bochecha. Na frente e no perfil, a cabeca se acerta de novo pela PELE: o
     que e cor de pele no desenho contra o que e cor de pele na forma (pela
     cor do Sorceress, o guia), so nas linhas da cabeca. */
  const ePele = c => c && c[0] > 110 && c[0] > c[1] + 15 && c[1] > c[2] && c[0] - c[2] > 45 && c[0] < 252;
  const peleF = new Uint8Array(NX*NZ), peleP = new Uint8Array(NY*NZ), img = folha.img.rgba;
  for (let k = kPesc; k <= z1 && guia; k++){
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) if (cheio[idx(i, j, k)]){ peleF[k*NX + i] = ePele(guia(idx(i, j, k))) ? 1 : 0; break; }
    for (let j = 0; j < NY; j++){
      if (olha === "direita"){ for (let i = 0; i < NX; i++) if (cheio[idx(i, j, k)]){ peleP[k*NY + j] = ePele(guia(idx(i, j, k))) ? 1 : 0; break; } }
      else { for (let i = NX - 1; i >= 0; i--) if (cheio[idx(i, j, k)]){ peleP[k*NY + j] = ePele(guia(idx(i, j, k))) ? 1 : 0; break; } }
    }
  }
  const peleNaFolha = (v, u, w) => { u = Math.floor(u); w = Math.floor(w); if (!no(v, u, w)) return false; const q = (w*L + u)*4; return ePele([img[q], img[q + 1], img[q + 2]]); };
  function iouPele(nome, par){
    const V = VISTAS[nome], P = nome === "perfil" ? peleP : peleF;
    let inter = 0, uniao = 0;
    for (let k = kPesc; k <= z1; k++){
      const w = linhaDaFolha(V, k, par);
      for (let x = 0; x < V.W; x++){
        const A = P[k*V.W + x] === 1, B = peleNaFolha(V.v, V.u(x, par), w);
        if (A && B) inter++;
        if (A || B) uniao++;
      }
    }
    return {n: uniao, iou: uniao ? inter/uniao : 0};
  }
  function buscarPele(nome, inicio){
    let melhor = inicio, nota = iouPele(nome, inicio).iou;
    const antes = nota;
    for (const [pe, pd] of [[0.02, 2], [0.008, 0.8], [0.003, 0.3]]){
      const centro = melhor;
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) for (let d = -2; d <= 2; d++){
        const par = {mx: centro.mx + a*pe, mz: centro.mz + b*pe, dx: centro.dx + c*pd, dz: centro.dz + d*pd};
        const n = iouPele(nome, par).iou;
        if (n > nota + 1e-9){ nota = n; melhor = par; }
      }
    }
    return {par: melhor, antes: +antes.toFixed(3), depois: +nota.toFixed(3)};
  }
  const al = {}, rel = {};
  for (const nome of ["frente", "costas", "perfil"]){
    if (folha.semAlinhar){ al[nome] = {corpo: {mx: 1, mz: 1, dx: 0, dz: 0}, cabeca: {mx: 1, mz: 1, dx: 0, dz: 0}}; continue; }
    const c = buscar(nome, z0, z1);
    let cab = buscar(nome, kPesc, z1, c.par);
    /* frente e perfil: o rosto manda, se a forma tem rosto de cor de pele bastante */
    if (guia && nome !== "costas" && iouPele(nome, cab.par).n > 150){
      const pele = buscarPele(nome, cab.par);
      if (pele.depois > pele.antes + 0.02) cab = Object.assign({}, cab, {par: pele.par, pele: pele});
    }
    al[nome] = {corpo: c.par, cabeca: cab.par};
    rel[nome] = {corpo: c, cabeca: cab};
  }
  /* o alinhamento de um voxel: o do corpo, o da cabeca, ou a mistura no pescoco */
  const mistura = (nome, k) => {
    const A = al[nome], f = Math.max(0, Math.min(1, (k - (kPesc - 3))/6));
    if (f <= 0) return A.corpo;
    if (f >= 1) return A.cabeca;
    const r = {};
    for (const c of ["mx", "mz", "dx", "dz"]) r[c] = A.corpo[c]*(1 - f) + A.cabeca[c]*f;
    return r;
  };
  const proj = {};
  for (const nome of ["frente", "costas", "perfil"]){
    const V = VISTAS[nome];
    proj[nome] = nome === "perfil" ? (i, j, k) => { const par = mistura(nome, k); return [V.u(j, par), linhaDaFolha(V, k, par)]; }
                                   : (i, j, k) => { const par = mistura(nome, k); return [V.u(i, par), linhaDaFolha(V, k, par)]; };
  }
  /* A cor do Sorceress como guia: salpicada voxel a voxel, mas na media de um
     cubo de 5 ela diz o que e cabelo, pele de capa, pele de rosto, metal. O
     pintar usa para nao aceitar de uma vista uma cor que nao tem nada a ver
     com o que a forma tem ali (o cabelo na pelugem da nuca). */
  return {NX, NY, NZ, cheio, idx, proj, ic: icx, sF, sB, sS, temBraco: true, guia, kPescoco: kPesc,
          alinhamento: {pescoco: kPesc, vistas: rel}};
}
/* a media da cor dos voxels cheios num cubo de lado 2r+1, separavel (tres passadas) */
function mediaDaCor(fonte, cheio, NX, NY, NZ, r){
  const N = NX*NY*NZ, s = [new Float32Array(N), new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++){
    const q = (k*NY + j)*NX + i;
    if (!cheio[q]) continue;
    const c = fonte.rgb(i, j, k);
    s[0][q] = c[0]; s[1][q] = c[1]; s[2][q] = c[2]; s[3][q] = 1;
  }
  const passo = [1, NX, NX*NY], tam = [NX, NY, NZ], tmp = new Float32Array(Math.max(NX, NY, NZ));
  for (let eixo = 0; eixo < 3; eixo++){
    const st = passo[eixo], n = tam[eixo];
    for (let q0 = 0; q0 < N; q0++){
      /* so as linhas que comecam no inicio do eixo */
      const pos = eixo === 0 ? q0 % NX : eixo === 1 ? ((q0/NX) | 0) % NY : (q0/(NX*NY)) | 0;
      if (pos !== 0) continue;
      for (const a of s){
        let soma = 0;
        for (let x = 0; x < Math.min(r, n); x++) soma += a[q0 + x*st];
        for (let x = 0; x < n; x++){
          if (x + r < n) soma += a[q0 + (x + r)*st];
          if (x - r - 1 >= 0) soma -= a[q0 + (x - r - 1)*st];
          tmp[x] = soma;
        }
        for (let x = 0; x < n; x++) a[q0 + x*st] = tmp[x];
      }
    }
  }
  return function(q){ const n = s[3][q]; return n ? [s[0][q]/n, s[1][q]/n, s[2][q]/n] : null; };
}
/* as mesmas capturas da receita do humano (Arte/personagens/humano.receita.json) */
function aplicarCapturas(proj){
  const Cap = require("../../atelie/captura.js"), dir = path.join(__dirname, "..", "..", "Arte", "personagens");
  const rec = JSON.parse(fs.readFileSync(path.join(dir, "humano.receita.json"), "utf8"));
  for (const cap of rec.capturas){
    const clipe = Cap.lerCaptura(fs.readFileSync(path.join(dir, cap.arquivo), "utf8"), path.extname(cap.arquivo));
    proj.animacoes[cap.animacao] = Cap.animacaoDaCaptura(proj, clipe, cap.animacao, cap.opcoes || {}).quadros;
  }
}
function carregarForma(arq){
  const dados = fs.readFileSync(arq), ext = path.extname(arq).toLowerCase();
  if (ext === ".wgvox") return C.lerWgvox(dados);
  if (ext === ".glb"){
    const Glb = require("../../editor/glb.js"), m = Glb.lerGlb(dados), f = Glb.voxelizar(m, {alto: 250});
    /* sem textura (o gerador local so faz a forma), a cor e so a cor base */
    if (!m.textura) f.semCor = true;
    return f;
  }
  throw new Error("forma de formato desconhecido: " + ext + " (vale .wgvox ou .glb)");
}

function processar(arquivo, opcoes){
  const t0 = Date.now();
  const img = png.decodificar(fs.readFileSync(arquivo));
  const fundo = fundoDaBorda(img);
  const msk = mascara(img, fundo, opcoes.tol || 38), m = msk.m;
  const [frente, perfil, costas] = separarVistas(msk, img.largura, img.altura);
  const olha = opcoes.perfil || perfilOlhaPara(m, img.largura, perfil);
  const folha = {img, m, frente, perfil, costas, olha, fundo};
  const casca = Math.max(1, Math.round((frente.y1 - frente.y0)/115*1.2));
  const cores = {}, trocados = {};
  for (const [nome, v] of [["frente", frente], ["perfil", perfil], ["costas", costas]]){
    const s = semContorno(img, m, v, casca); cores[nome] = s.rgba; trocados[nome] = s.trocados;
  }
  const t1 = Date.now();
  const V = opcoes.forma ? volumeDeFora(carregarForma(opcoes.forma), folha) : esculpir(folha, opcoes);
  const t2 = Date.now();
  const P = pintar(folha, V, cores);
  const t3 = Date.now();
  const fonteDoAtelie = {gx: V.NX, gy: V.NY, gz: V.NZ, rgb: (x, y, z) => cheioCor(V, P, x, y, z)};
  const corpo = C.importarModelo(fonteDoAtelie, {nome: opcoes.nome || "tresvistas"});
  const t4 = Date.now();
  return {folha, V, P, corpo, casca, trocados, fidelidade: fidelidade(folha, V),
          tempos: {recortar: t1 - t0, esculpir: t2 - t1, pintar: t3 - t2, atelie: t4 - t3}};
}
function cheioCor(V, P, x, y, z){
  const q = V.idx(x, y, z);
  if (!V.cheio[q]) return null;
  return P.cor[q] || [128, 128, 128];
}

/* ---------- o modelo cru, sem passar pelo atelie ----------
   Para comparar na resolucao da fonte (o .wgvox do Sorceress tem 257 de
   altura). A vista e a da folha do atelie: frente de y pequeno, lado de x
   grande, costas de y grande, com a mesma luz pela profundidade. */
function vistaDaFonte(f, vista){
  const w = vista === "lado" ? f.gy : f.gx, h = f.gz, prof = new Float32Array(w*h).fill(1e9), cor = new Array(w*h).fill(null);
  for (let z = 0; z < f.gz; z++) for (let u = 0; u < w; u++){
    const Lr = vista === "lado" ? f.gx : f.gy;
    for (let s = 0; s < Lr; s++){
      let x, y;
      if (vista === "lado"){ x = f.gx - 1 - s; y = u; }
      else if (vista === "costas"){ x = f.gx - 1 - u; y = f.gy - 1 - s; }
      else { x = u; y = s; }
      const c = f.rgb(x, y, z);
      if (c){ const i = (f.gz - 1 - z)*w + u; prof[i] = s; cor[i] = c; break; }
    }
  }
  const px = new Uint8Array(w*h*4);
  for (let yy = 0; yy < h; yy++) for (let u = 0; u < w; u++){
    const i = yy*w + u, c = cor[i];
    if (!c) continue;
    const d = prof[i], dl = u > 0 && cor[i - 1] ? prof[i - 1] : d + 2, dc = yy > 0 && cor[i - w] ? prof[i - w] : d + 2;
    const luzP = Math.max(0.55, Math.min(1.15, 0.9 + 0.12*(dl - d) + 0.1*(dc - d)));
    px[i*4] = Math.min(255, c[0]*luzP); px[i*4 + 1] = Math.min(255, c[1]*luzP); px[i*4 + 2] = Math.min(255, c[2]*luzP); px[i*4 + 3] = 255;
  }
  return {w, h, px};
}
/* varias fontes lado a lado, cada uma com frente, lado e costas empilhados */
function folhaDeFontes(fontes, esc){
  esc = esc || 2;
  const vistas = ["frente", "lado", "costas"], vao = 6;
  const imgs = fontes.map(f => vistas.map(v => vistaDaFonte(f, v)));
  const colW = imgs.map(col => Math.max.apply(null, col.map(i => i.w)));
  const W = (colW.reduce((a, b) => a + b, 0) + vao*(fontes.length + 1))*esc;
  const H = Math.max.apply(null, imgs.map(col => col.reduce((s, i) => s + i.h + vao, vao)))*esc;
  const px = new Uint8Array(W*H*4);
  for (let i = 0; i < W*H; i++){ px[i*4] = 24; px[i*4 + 1] = 22; px[i*4 + 2] = 30; px[i*4 + 3] = 255; }
  let ox = vao;
  imgs.forEach(function(col, ci){
    let oy = vao;
    for (const img of col){
      const x0 = ox + ((colW[ci] - img.w) >> 1);
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++){
        const s = (y*img.w + x)*4;
        if (!img.px[s + 3]) continue;
        for (let ey = 0; ey < esc; ey++) for (let ex = 0; ex < esc; ex++){
          const d = (((oy + y)*esc + ey)*W + (x0 + x)*esc + ex)*4;
          px[d] = img.px[s]; px[d + 1] = img.px[s + 1]; px[d + 2] = img.px[s + 2];
        }
      }
      oy += img.h + vao;
    }
    ox += colW[ci] + vao;
  });
  return {w: W, h: H, px};
}
/* o volume de trabalho como fonte: so o que tem voxel, com a cor pintada */
function fonteDoVolume(V, P){
  return {gx: V.NX, gy: V.NY, gz: V.NZ, rgb: (x, y, z) => cheioCor(V, P, x, y, z)};
}
/* o volume cru em .vox: ate 255 cores, e cada eixo ate 256 */
function voxDoVolume(V, P){
  if (V.NX > 256 || V.NY > 256 || V.NZ > 256) throw new Error("o .vox so aceita ate 256 por eixo: " + [V.NX, V.NY, V.NZ].join("x"));
  const f = fonteDoVolume(V, P), cores = [];
  for (let z = 0; z < V.NZ; z++) for (let y = 0; y < V.NY; y++) for (let x = 0; x < V.NX; x++){ const c = f.rgb(x, y, z); if (c) cores.push(c); }
  const paleta = C.reduzirCores(cores, 255);
  const g = new Uint8Array(V.NX*V.NY*V.NZ);
  for (let z = 0; z < V.NZ; z++) for (let y = 0; y < V.NY; y++) for (let x = 0; x < V.NX; x++){
    const c = f.rgb(x, y, z);
    if (c) g[(z*V.NY + y)*V.NX + x] = C.corMaisPerto(paleta, c);
  }
  return {buf: vox.codificar({DX: V.NX, DY: V.NY, DZ: V.NZ}, g, paleta), cores: paleta.length};
}

module.exports = {fundoDaBorda, mascara, separarVistas, perfilOlhaPara, semContorno, esculpir, pintar, fidelidade, processar,
                  vistaDaFonte, folhaDeFontes, fonteDoVolume, voxDoVolume, volumeDeFora};

/* ---------- a linha de comando ---------- */
if (require.main === module){
  const args = process.argv.slice(2), opc = {}, pos = [];
  for (const a of args){ if (a.startsWith("--")){ const [k, v] = a.slice(2).split("="); opc[k] = v === undefined ? true : (isNaN(+v) ? v : +v); } else pos.push(a); }
  if (pos.length < 2){ console.log("uso: node tresvistas.js <folha.png> <pasta-de-saida> [--nome=x] [--perfil=direita|esquerda] [--res=2] [--p=2.5] [--forma=arquivo.wgvox|.glb]"); process.exit(1); }
  const [entrada, saida] = pos, nome = opc.nome || path.basename(entrada, ".png");
  fs.mkdirSync(saida, {recursive: true});
  const R = processar(entrada, Object.assign({nome: nome}, opc));
  const c = R.corpo;
  /* o corpo em .vox, para abrir no MagicaVoxel */
  fs.writeFileSync(path.join(saida, nome + ".vox"), vox.codificar({DX: c.bx, DY: c.by, DZ: c.bz}, c.cor, c.paleta));
  /* o projeto do atelie: rig proposto, peso e animacoes de partida */
  let avisos = [];
  try {
    const proj = Ar.novoProjeto(c, {pano: true});
    /* a fonte de alta resolucao, para o atelie mostrar o corpo em 117, 165 ou 256 voxels */
    proj.fonte = Resolucao.fonteCompacta(fonteDoVolume(R.V, R.P), 255);
    avisos = proj.avisosDoRig || [];
    /* andar e correr da captura da CMU, como na receita do humano: sem elas o
       corpo fica com as animacoes escritas de partida, que sao duras */
    if (!opc.semCaptura) aplicarCapturas(proj);
    fs.writeFileSync(path.join(saida, nome + ".atelie"), Ar.salvarProjeto(proj));
  } catch (e){ avisos = ["o rig nao saiu: " + e.message]; }
  /* a folha de contato do corpo: frente, lado e costas */
  const fo = F.montarFolha([c.cor], c.paleta, {vistas: ["frente", "lado", "costas"], escala: 4, grade: {DX: c.bx, DY: c.by, DZ: c.bz}});
  fs.writeFileSync(path.join(saida, nome + "-corpo.png"), png.codificar(fo.w, fo.h, fo.px));
  /* com --alto, tambem o modelo cru nessa altura, e a comparacao com o do
     Sorceress (Arte/personagens/modelos vox/humano.wgvox) na resolucao cheia */
  let cru = null;
  if (opc.alto){
    const vx = voxDoVolume(R.V, R.P);
    fs.writeFileSync(path.join(saida, nome + "-" + opc.alto + ".vox"), vx.buf);
    const sorc = C.lerWgvox(fs.readFileSync(path.join(__dirname, "..", "..", "Arte", "personagens", "modelos vox", "humano.wgvox")));
    const fo2 = folhaDeFontes([fonteDoVolume(R.V, R.P), sorc], 2);
    fs.writeFileSync(path.join(saida, nome + "-" + opc.alto + "-comparacao.png"), png.codificar(fo2.w, fo2.h, fo2.px));
    let n = 0; for (const v of R.V.cheio) if (v) n++;
    cru = {grade: [R.V.NX, R.V.NY, R.V.NZ], voxels: n, cores_no_vox: vx.cores, sorceress: [sorc.gx, sorc.gy, sorc.gz]};
  }
  let voxels = 0; for (const v of c.cor) if (v) voxels++;
  const rel = {
    entrada: path.basename(entrada), perfil_olha_para: R.folha.olha, casca_do_contorno_px: R.casca,
    vistas: {frente: R.folha.frente, perfil: R.folha.perfil, costas: R.folha.costas},
    volume_de_trabalho: [R.V.NX, R.V.NY, R.V.NZ], braco_em_t: R.V.temBraco,
    corpo: {grade: [c.bx, c.by, c.bz], voxels: voxels, cores: c.paleta.length}, modelo_cru: cru,
    cor_da_superficie: R.P.fonte, fidelidade_da_silhueta: R.fidelidade, tempos_ms: R.tempos, avisos_do_rig: avisos
  };
  fs.writeFileSync(path.join(saida, nome + ".json"), JSON.stringify(rel, null, 1));
  console.log(JSON.stringify(rel, null, 1));
}
