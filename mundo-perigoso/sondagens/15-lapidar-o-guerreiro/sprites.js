/* Os sprites do jogo do guerreiro de 256 (personagens/guerreiro.personagem),
   parado, nos 8 rumos e de cima, como o assador do jogo os faz: a cabeca
   ampliada e o corpo inteiro.
   Uso: node mundo-perigoso/sondagens/15-lapidar-o-guerreiro/sprites.js [saida.png] [pose] */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", ".."), png = require(path.join(RAIZ, "editor", "png.js"));
const { carregar } = require(path.join(RAIZ, "teste", "harness"));
const { D } = carregar(path.join(RAIZ, "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta", canvas: "software"});
D.usarCorpoDesenhado(D.lerPersonagem(fs.readFileSync(path.join(RAIZ, "personagens", "guerreiro.personagem"), "utf8")));
const saida = process.argv[2] || path.join(__dirname, "sprites.png"), pose = +(process.argv[3] || 0);
const DM = D.DIM_PERSONAGEM, mats = D.materiaisDoPersonagem(D.PERSONAGEM_PADRAO);
const g = D.gradeDoPersonagem(D.PERSONAGEM_PADRAO, pose), pele = D.peleDoModelo(g, DM.DX, DM.DY, DM.DZ);
const assar = (giro, inc) => D.assarRotacoes(pele, DM.DX, DM.DY, DM.DZ, mats, 1, 1, D.P_PERSONAGEM, D.CONTORNO_DO_PERSONAGEM, inc || 0, giro, 0)[0];
const corpos = [0, 1, 2, 3, 4].map(r => assar(r*Math.PI/4)), cabecas = [0, 1, 2, 3, 4].map(r => assar(r*Math.PI/4)).concat([assar(0, -Math.PI/2)]);
function bloco(q, y0, h, e){ const o = {w: q.w*e, h: h*e, px: new Uint8Array(q.w*e*h*e*4)};
  for (let y = 0; y < h*e; y++) for (let x = 0; x < q.w*e; x++){ const c = q.cm[q.px[(y0 + ((y/e) | 0))*q.w + ((x/e) | 0)]], d = (y*o.w + x)*4;
    if (c){ o.px[d] = c & 255; o.px[d + 1] = (c >> 8) & 255; o.px[d + 2] = (c >> 16) & 255; } else { o.px[d] = 44; o.px[d + 1] = 42; o.px[d + 2] = 52; } o.px[d + 3] = 255; }
  return o; }
const linhas = [cabecas.map((q, i) => bloco(q, i < 5 ? 0 : 60, 90, 3)), corpos.map(q => bloco(q, 0, q.h, 1))];
const imgs = linhas.map(l => { const W = l.reduce((s, b) => s + b.w + 6, -6), H = Math.max(...l.map(b => b.h)), o = new Uint8Array(W*H*4).fill(255); let x0 = 0;
  for (const b of l){ for (let y = 0; y < b.h; y++) o.set(b.px.subarray(y*b.w*4, (y + 1)*b.w*4), (y*W + x0)*4); x0 += b.w + 6; } return {w: W, h: H, px: o}; });
const W = Math.max(...imgs.map(i => i.w)), H = imgs.reduce((s, i) => s + i.h + 6, -6), o = new Uint8Array(W*H*4).fill(255); let y0 = 0;
for (const i of imgs){ for (let y = 0; y < i.h; y++) o.set(i.px.subarray(y*i.w*4, (y + 1)*i.w*4), (y0 + y)*W*4); y0 += i.h + 6; }
fs.writeFileSync(saida, png.codificar(W, H, o));
console.log("cores do corpo: " + D.CORPO_DESENHADO.cores.length);
