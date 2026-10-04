/* O guerreiro de 256 assado com a camera mais alta: 0, 30, 55 e 80 graus acima
   dele (o `inclina` do assador). E o que um sprite de pe nao mostra: de cima o
   cartaz vira um risco no chao.
   Uso: node mundo-perigoso/sondagens/14-de-cima/inclinar.js */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", ".."), png = require(path.join(RAIZ, "editor", "png.js"));
const { carregar } = require(path.join(RAIZ, "teste", "harness"));
const { D } = carregar(path.join(RAIZ, "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta", canvas: "software"});
D.usarCorpoDesenhado(D.lerPersonagem(fs.readFileSync(path.join(RAIZ, "personagens", "guerreiro.personagem"), "utf8")));
const DM = D.DIM_PERSONAGEM, mats = D.materiaisDoPersonagem(D.PERSONAGEM_PADRAO);
const g = D.gradeDoPersonagem(D.PERSONAGEM_PADRAO, 2), pele = D.peleDoModelo(g, DM.DX, DM.DY, DM.DZ);
const graus = (process.argv[2] || "0,30,55,80").split(",").map(Number), ims = [];
let t0 = Date.now();
for (const gr of graus) ims.push(D.assarRotacoes(pele, DM.DX, DM.DY, DM.DZ, mats, 1, 1, D.P_PERSONAGEM, D.CONTORNO_DO_PERSONAGEM, gr*Math.PI/180, Math.PI*0.25, 0)[0]);
console.log("4 inclinacoes de um rumo: " + (Date.now() - t0) + " ms");
const E = 2, W = ims.reduce((s, q) => s + q.w*E + 10, 0), H = Math.max(...ims.map(q => q.h))*E, o = new Uint8Array(W*H*4).fill(255);
let x0 = 0;
for (const q of ims){
  for (let y = 0; y < q.h*E; y++) for (let x = 0; x < q.w*E; x++){
    const c = q.cm[q.px[((y/E) | 0)*q.w + ((x/E) | 0)]], d = (y*W + x0 + x)*4;
    if (c){ o[d] = c & 255; o[d + 1] = (c >> 8) & 255; o[d + 2] = (c >> 16) & 255; o[d + 3] = 255; }
    else { o[d] = o[d + 1] = o[d + 2] = 200; o[d + 3] = 255; }
  }
  x0 += q.w*E + 10;
}
fs.writeFileSync(path.join(__dirname, "inclinacoes.png"), png.codificar(W, H, o));
