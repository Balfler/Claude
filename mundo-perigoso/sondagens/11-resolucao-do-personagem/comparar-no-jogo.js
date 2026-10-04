/* ============================================================
   SONDAGEM 11 -- O GUERREIRO NO JOGO, EM 117 E EM 165 VOXELS
   ------------------------------------------------------------
   O Leandro achou os bloquinhos do personagem grandes. O jogo desenha em
   640x360: a 1,6 tile (a camera de terceira pessoa) o personagem de 117
   voxels tem uns 164 pixels de altura, 1,4 por voxel. Este teste faz a
   pergunta de outro jeito: o MESMO guerreiro, assado pelo assador do jogo em
   117 e em 165 voxels de altura (1,41 vezes), lado a lado na mesma tela, de
   frente e de costas, de perto e de longe.

   Nao mexe em nada do projeto: escala por um momento a grade, a caixa e o
   centro do atelie dentro deste processo, refaz o corpo a partir do volume
   de alta resolucao (forma do Sorceress, cor do desenho), o rig e o peso, poe
   na pose parada, e assa com o mesmo codigo do jogo (assarRotacoes, com as
   rampas de cor desenhada e o contorno do personagem). O sprite vai para o
   jogo como os do cenario.

   Uso: node mundo-perigoso/sondagens/11-resolucao-do-personagem/comparar-no-jogo.js
          <folha.png> <forma.wgvox> <projeto.atelie> <pasta-de-saida> [--Ks=1,1.41,2.19]
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const T = require("../7-tres-vistas/tresvistas.js");
const N = require(path.join(RAIZ, "atelie", "nucleo.js")), C = require(path.join(RAIZ, "atelie", "corpo.js"));
const Ar = require(path.join(RAIZ, "atelie", "arquivos.js")), P = require(path.join(RAIZ, "atelie", "pesos.js")), Df = require(path.join(RAIZ, "atelie", "deformar.js"));
const M = require(path.join(RAIZ, "src", "mapa.js")), png = require(path.join(RAIZ, "editor", "png.js"));
const { carregar } = require(path.join(RAIZ, "teste", "harness"));

const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith("--")), opc = {};
for (const a of args) if (a.startsWith("--")){ const [k, v] = a.slice(2).split("="); opc[k] = v === undefined ? true : +v; }
if (pos.length < 4){ console.log("uso: comparar-no-jogo.js <folha.png> <forma.wgvox> <projeto.atelie> <saida> [--Ks=1,1.41,2.19]"); process.exit(1); }
const [folhaPng, formaArq, projArq, saida] = pos, KS = (process.argv.find(a => a.startsWith("--Ks=")) || "--Ks=1," + (165/117)).slice(5).split(",").map(Number);
fs.mkdirSync(saida, {recursive: true});

/* 1. o volume de alta resolucao: a forma do Sorceress com a cor do desenho */
const R = T.processar(folhaPng, {forma: formaArq, nome: "guerreiro", semAlinhar: false});
const fonte = T.fonteDoVolume(R.V, R.P);
const projBase = Ar.lerProjeto(fs.readFileSync(projArq, "utf8"));

/* 2. o corpo posado na grade escalada */
function escalarAtelie(K){
  const salvo = {CAIXA: Object.assign({}, C.CAIXA), CENTRO: Object.assign({}, N.CENTRO), GRADE: Object.assign({}, N.GRADE)};
  const r = v => Math.round(v*K);
  Object.assign(C.CAIXA, {ox: r(-30), oy: r(-4), oz: r(-3), bx: r(140), by: r(64), bz: r(124)});
  Object.assign(N.CENTRO, {CX: r(40), CY: r(28)});
  Object.assign(N.GRADE, {DX: r(80), DY: r(56), DZ: r(117)});
  return function(){ Object.assign(C.CAIXA, salvo.CAIXA); Object.assign(N.CENTRO, salvo.CENTRO); Object.assign(N.GRADE, salvo.GRADE); };
}
function postoEm(K){
  const restaurar = escalarAtelie(K);
  try {
    const corpo = C.importarModelo(fonte, {nome: "guerreiro-" + K.toFixed(2), altura: Math.round(115*K)});
    const juntas = {};
    for (const k in projBase.juntas) juntas[k] = projBase.juntas[k].map(v => v*K);
    const larguras = {};
    for (const k in projBase.larguras) larguras[k] = projBase.larguras[k]*K;
    const t0 = Date.now();
    P.calcularPesos(corpo, juntas, {larguras: larguras, pano: true});
    const p0 = projBase.animacoes.parado[0], pose = {raiz: p0.raiz.map(v => v*K), rot: p0.rot};
    const G = {DX: Math.round(80*K), DY: Math.round(56*K), DZ: Math.round(117*K)};
    const r = Df.posarCorpo(corpo, juntas, pose, {grade: G});
    let n = 0; for (const v of r.g) if (v) n++;
    return {g: r.g, DX: G.DX, DY: G.DY, DZ: G.DZ, paleta: corpo.paleta.map(c => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("")),
            voxels: n, fora: r.fora, msPesos: Date.now() - t0, K: K};
  } finally { restaurar(); }
}
/* Acima de 3x (512 de altura) nao ha o que refazer da fonte: ela tem 257 e o
   desenho uns 125 pixels de arte. Fica a forma do de metade da escala, com os
   voxels partidos em 8 e as quinas arredondadas (a ocupacao interpolada, corte
   em 0,5), e a cor do voxel de origem: mostra como fica o volume mais fino,
   nao dado novo. O peso e a pose sao os da escala de metade. */
function ampliarSuave(v){
  const DX = v.DX*2, DY = v.DY*2, DZ = v.DZ*2, g2 = new Uint8Array(DX*DY*DZ), g = v.g, sx = v.DX, sy = v.DY, sz = v.DZ;
  const occ = (x, y, z) => x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz ? 0 : (g[(z*sy + y)*sx + x] ? 1 : 0);
  let n = 0;
  for (let z = 0; z < DZ; z++){
    const fz = (z + 0.5)/2 - 0.5, z0 = Math.floor(fz), tz = fz - z0;
    for (let y = 0; y < DY; y++){
      const fy = (y + 0.5)/2 - 0.5, y0 = Math.floor(fy), ty = fy - y0;
      for (let x = 0; x < DX; x++){
        const fx = (x + 0.5)/2 - 0.5, x0 = Math.floor(fx), tx = fx - x0;
        const a = (occ(x0, y0, z0)*(1 - tx) + occ(x0 + 1, y0, z0)*tx)*(1 - ty) + (occ(x0, y0 + 1, z0)*(1 - tx) + occ(x0 + 1, y0 + 1, z0)*tx)*ty;
        const b = (occ(x0, y0, z0 + 1)*(1 - tx) + occ(x0 + 1, y0, z0 + 1)*tx)*(1 - ty) + (occ(x0, y0 + 1, z0 + 1)*(1 - tx) + occ(x0 + 1, y0 + 1, z0 + 1)*tx)*ty;
        if (a*(1 - tz) + b*tz < 0.5) continue;
        /* a cor: a do voxel de origem mais perto que tem cor */
        let c = 0;
        const cx = Math.max(0, Math.min(sx - 1, Math.floor(x/2))), cy = Math.max(0, Math.min(sy - 1, Math.floor(y/2))), cz = Math.max(0, Math.min(sz - 1, Math.floor(z/2)));
        c = g[(cz*sy + cy)*sx + cx];
        for (let r = 1; !c && r <= 2; r++) for (let dz = -r; dz <= r && !c; dz++) for (let dy = -r; dy <= r && !c; dy++) for (let dx = -r; dx <= r && !c; dx++){
          const qx = cx + dx, qy = cy + dy, qz = cz + dz;
          if (qx >= 0 && qy >= 0 && qz >= 0 && qx < sx && qy < sy && qz < sz) c = g[(qz*sy + qy)*sx + qx];
        }
        if (c){ g2[(z*DY + y)*DX + x] = c; n++; }
      }
    }
  }
  return {g: g2, DX: DX, DY: DY, DZ: DZ, paleta: v.paleta, voxels: n, fora: v.fora, msPesos: v.msPesos, K: v.K*2, suave: true};
}
const variantes = KS.map(K => K > 3 ? ampliarSuave(postoEm(K/2)) : postoEm(K));
for (const v of variantes) console.log("K " + v.K.toFixed(2) + ": grade " + v.DX + "x" + v.DY + "x" + v.DZ + ", " + v.voxels + " voxels, " + v.paleta.length + " cores, fora da grade " + v.fora + ", peso " + v.msPesos + " ms");

/* 3. o jogo: assa com o assador dele e poe na ilha, lado a lado */
const mapa = M.lerMapa(fs.readFileSync(path.join(RAIZ, "mapas", "ilha-650.mapa"), "utf8")).mapa; if (mapa.versao < 2) M.converterMapa(mapa);
const { D } = carregar(path.join(RAIZ, "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta", canvas: "software"});
D.trocarMundo("?mapa=canteiro", mapa);
/* a tela do jogo e 320x180 vezes ESC: 2 = 640x360 (hoje), 3 = 960x540, 4 = 1280x720 */
const ESCJ = +((process.argv.find(a => a.startsWith("--esc=")) || "--esc=2").slice(6));
if (ESCJ !== 2){ D.alocarTela(ESCJ); D.prepararCamera(); }
const FAT = ESCJ/2;
const t0 = Date.now();
const sprites = variantes.map(function(e){
  const rampas = e.paleta.map(function(h){ return {tons: D.rampaDaCor(h), plano: 1}; });
  const pal = D.hexPal([].concat.apply([], rampas.map(function(r){ return r.tons; })));
  const pele = D.peleDoModelo(e.g, e.DX, e.DY, e.DZ), imgs = [];
  for (let r = 0; r < (e.suave ? 1 : 8); r++) imgs.push(D.assarRotacoes(pele, e.DX, e.DY, e.DZ, rampas, 1, 1, pal, D.CONTORNO_DO_PERSONAGEM, 0, r*Math.PI*2/8, 0)[0]);
  return imgs;
});
console.log("assado em " + (Date.now() - t0) + " ms");

/* um chao plano e livre, de grama, para os dois */
const W = D.MW, H = D.MH;
let lugar = null;
for (let y = 200; y < H - 20 && !lugar; y += 4) for (let x = 100; x < W - 20 && !lugar; x += 4){
  const z0 = D.floorAt(x, y); let ok = z0 > 0.9;
  for (let dy = -6; dy <= 6 && ok; dy++) for (let dx = -6; dx <= 6 && ok; dx++){ if (D.floorAt(x + dx, y + dy) !== z0 || D.cellAt(x + dx, y + dy) !== ".") ok = false; }
  if (ok) lugar = [x + 0.5, y + 0.5, z0];
}
if (!lugar) throw new Error("nao achei um chao plano");
console.log("chao plano em " + lugar.map(v => v.toFixed(1)).join(", "));

const relatorio = [];
function quadro(nome, dist, rumoIdx, pitch, tamanho){
  D.ents.length = 0;
  /* a camera olha para oeste: y maior aparece a esquerda; a menor resolucao fica a esquerda */
  const sep = variantes.length > 2 ? 0.75 : 0.9, lado = variantes.map((v, i) => (variantes.length - 1)/2*sep - i*sep);
  variantes.forEach(function(v, i){
    /* o voxel de cada versao tem 1/(128*K'): a altura no mundo e a mesma (117/128 tile) */
    const altoMundo = 117/128, largMundo = v.DX/v.DZ*altoMundo;
    D.ents.push({kind: "cena", type: "teste", x: lugar[0], y: lugar[1] + lado[i], z: lugar[2], larg: largMundo, alto: altoMundo,
                 img: sprites[i][rumoIdx], raio: 0, fala: ""});
  });
  D.G.mode = "play"; D.G.terceira = false;
  D.P.x = lugar[0] + dist; D.P.y = lugar[1]; D.P.z = lugar[2]; D.P.ang = Math.PI; D.P.pitch = pitch; D.P.bob = 0;
  D.setCamera(0); D.renderWorld(); D.renderEntities();
  const RW = D.RW, RH = D.RH, buf = D.buf, rgba = new Uint8Array(RW*RH*4);
  for (let i = 0; i < RW*RH; i++){ const v = buf[i]; rgba[4*i] = v & 255; rgba[4*i + 1] = (v >> 8) & 255; rgba[4*i + 2] = (v >> 16) & 255; rgba[4*i + 3] = 255; }
  /* a tela inteira, e um recorte ampliado 3x (o pixel do jogo vira 3 do monitor) */
  fs.writeFileSync(path.join(saida, nome + ".png"), png.codificar(RW, RH, rgba));
  if (nome === "frente-1.6") console.log("tela " + RW + "x" + RH + ", quadro medio " + (function(){ const t = process.hrtime.bigint(); for (let i = 0; i < 6; i++){ D.setCamera(0); D.renderWorld(); D.renderEntities(); } return (Number(process.hrtime.bigint() - t)/6e6).toFixed(1); })() + " ms");
  const cw = Math.round((variantes.length > 2 ? 480 : 360)*FAT), ch = Math.round(300*FAT), cx0 = (RW - cw) >> 1, cy0 = Math.round(20*FAT), esc = ESCJ > 2 ? 2 : 3, o = new Uint8Array(cw*esc*ch*esc*4);
  for (let y = 0; y < ch*esc; y++) for (let x = 0; x < cw*esc; x++){
    const s = ((cy0 + ((y/esc) | 0))*RW + cx0 + ((x/esc) | 0))*4, d = (y*cw*esc + x)*4;
    o[d] = rgba[s]; o[d + 1] = rgba[s + 1]; o[d + 2] = rgba[s + 2]; o[d + 3] = 255;
  }
  fs.writeFileSync(path.join(saida, nome + "-x3.png"), png.codificar(cw*esc, ch*esc, o));
  relatorio.push({quadro: nome, distancia_tiles: dist});
}
/* o rumo de costas para a camera: a camera esta a leste (+x) olhando para oeste; o sprite que encara a camera e o de 4/8 de volta ou o de 0 */
const SOPERTO = process.argv.includes("--soPerto"), DIST = +((process.argv.find(a => a.startsWith("--dist=")) || "--dist=1.0").slice(7)), CROP = ((process.argv.find(a => a.startsWith("--crop=")) || "--crop=260,330,10").slice(7)).split(",").map(Number);
if (!SOPERTO){
quadro("frente-1.6", 1.6, 0, 0.0);
quadro("costas-1.6", 1.6, 4, 0.0);
quadro("frente-3", 3.0, 0, 0.0);
quadro("costas-3", 3.0, 4, 0.0);
}
fs.writeFileSync(path.join(saida, "relatorio.json"), JSON.stringify({Ks: KS, variantes: variantes.map(v => ({K: v.K, grade: [v.DX, v.DY, v.DZ], voxels: v.voxels, cores: v.paleta.length, foraDaGrade: v.fora})), quadros: relatorio}, null, 1));
console.log("gravado em " + saida);

/* ---------- de perto: cada versao sozinha, a 0,8 tile, lado a lado na imagem ----------
   A 1,6 tile o personagem de 256 tem menos de um pixel por voxel e o jogo
   amostra o sprite sem media (o vizinho mais perto): o que sobra de detalhe
   e sorteado. De perto (conversa, provador) cada voxel tem mais de um pixel e
   a resolucao aparece. */
{
  const tiras = [];
  variantes.forEach(function(v, i){
    D.ents.length = 0;
    const altoMundo = 117/128, largMundo = v.DX/v.DZ*altoMundo;
    D.ents.push({kind: "cena", type: "teste", x: lugar[0], y: lugar[1], z: lugar[2], larg: largMundo, alto: altoMundo, img: sprites[i][0], raio: 0, fala: ""});
    D.G.mode = "play"; D.G.terceira = false;
    const dist = DIST;
    D.P.x = lugar[0] + dist; D.P.y = lugar[1]; D.P.z = lugar[2]; D.P.ang = Math.PI; D.P.pitch = 0.22; D.P.bob = 0;
    D.setCamera(0); D.renderWorld(); D.renderEntities();
    const RW = D.RW, RH = D.RH, buf = D.buf;
    const cw = Math.round(CROP[0]*FAT), ch = Math.round(CROP[1]*FAT), cx0 = (RW - cw) >> 1, cy0 = Math.round(CROP[2]*FAT), esc = ESCJ > 2 ? 2 : 3, o = new Uint8Array(cw*esc*ch*esc*4);
    for (let y = 0; y < ch*esc; y++) for (let x = 0; x < cw*esc; x++){
      const px = buf[(cy0 + ((y/esc) | 0))*RW + cx0 + ((x/esc) | 0)], d = (y*cw*esc + x)*4;
      o[d] = px & 255; o[d + 1] = (px >> 8) & 255; o[d + 2] = (px >> 16) & 255; o[d + 3] = 255;
    }
    tiras.push({w: cw*esc, h: ch*esc, px: o});
  });
  const W3 = tiras.reduce((s, t) => s + t.w, 0), H3 = tiras[0].h, out = new Uint8Array(W3*H3*4);
  let ox = 0;
  for (const t of tiras){
    for (let y = 0; y < t.h; y++) out.set(t.px.subarray(y*t.w*4, (y + 1)*t.w*4), (y*W3 + ox)*4);
    ox += t.w;
  }
  fs.writeFileSync(path.join(saida, "perto-" + DIST + "-ampliado.png"), png.codificar(W3, H3, out));
  console.log("gravado perto-" + DIST + "-ampliado.png");
}
