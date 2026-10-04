/* ============================================================
   SONDAGEM 17 -- O GERADOR LOCAL CONTRA O SORCERESS
   ------------------------------------------------------------
   A mesma folha do guerreiro pelos dois caminhos: o modelo do Sorceress
   (Arte/personagens/guerreiro.wgvox, forma e cor dele) e o gerador local (a
   forma do Hunyuan3D-2mv turbo, pintada com o desenho pelo tresvistas.js).
   Para cada .glb dado, grava o corpo inteiro de 6 angulos e a cabeca de
   perto, com o Sorceress em cima e o local embaixo (o olhar.js da sondagem
   15).

   Uso: node mundo-perigoso/sondagens/17-gerador-local/comparar.js <folha.png> <forma.glb|.wgvox>... [--saida pasta]
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const T = require("../7-tres-vistas/tresvistas.js"), O = require("../15-lapidar-o-guerreiro/olhar.js");
const C = require(path.join(RAIZ, "atelie", "corpo.js"));

const ANGULOS = [0, 35, 70, 110, 145, 180];

/* a altura do voxel mais alto e do mais baixo */
function alturas(f){
  let z0 = 1e9, z1 = -1;
  for (let z = 0; z < f.gz; z++) for (let y = 0; y < f.gy; y++) for (let x = 0; x < f.gx; x++) if (f.rgb(x, y, z)){ if (z < z0) z0 = z; if (z > z1) z1 = z; }
  return [z0, z1];
}
/* As duas fontes na mesma escala: a do Sorceress tem 257 de altura, a do
   tresvistas 250; a de baixo e reamostrada para a altura da de cima. */
function naAltura(f, alto){
  const [z0, z1] = alturas(f), k = (z1 - z0 + 1)/alto;
  if (Math.abs(k - 1) < 0.01) return f;
  const gx = Math.ceil(f.gx/k), gy = Math.ceil(f.gy/k), gz = alto + 2;
  return {gx, gy, gz, rgb: (x, y, z) => {
    const a = Math.floor((x + 0.5)*k), b = Math.floor((y + 0.5)*k), c = z0 + Math.floor((z - 1 + 0.5)*k);
    return a < f.gx && b < f.gy && c >= 0 && c < f.gz && z >= 1 ? f.rgb(a, b, c) : null;
  }};
}
/* a caixa da cabeca, no espaco da vista: 90 de largo, do topo ate 75 abaixo */
function caixaDaCabeca(f){
  const R0 = Math.ceil(Math.hypot(f.gx, f.gy)/2) + 1, z1 = alturas(f)[1];
  return [R0 - 45, z1 - 72, R0 + 45, z1 + 3];
}
function comparar(sorc, local, saida, rotulo){
  const [a, b] = alturas(sorc), l = naAltura(local, b - a + 1);
  const corpo = f => O.linha(ANGULOS.map(g => O.vista(f, g, null, 1)));
  const cabeca = f => O.linha(ANGULOS.map(g => O.vista(f, g, caixaDaCabeca(f), 3)));
  const arqs = [path.join(saida, "corpo-" + rotulo + ".png"), path.join(saida, "cabeca-" + rotulo + ".png")];
  O.empilhar(arqs[0], [corpo(sorc), corpo(l)]);
  O.empilhar(arqs[1], [cabeca(sorc), cabeca(l)]);
  return arqs;
}

module.exports = {comparar, naAltura, alturas};

if (require.main === module){
  const args = process.argv.slice(2), pos = args.filter(s => !s.startsWith("--"));
  const saida = (args.find(s => s.startsWith("--saida=")) || "").slice(8) || __dirname;
  if (pos.length < 2){ console.log("uso: comparar.js <folha.png> <forma.glb|.wgvox>... [--saida=pasta]"); process.exit(1); }
  const [folha, ...formas] = pos;
  const sorc = C.lerWgvox(fs.readFileSync(path.join(RAIZ, "Arte", "personagens", "guerreiro.wgvox")));
  for (const forma of formas){
    const t0 = Date.now(), R = T.processar(folha, {forma: forma, nome: "guerreiro"});
    const rotulo = path.basename(path.dirname(forma)) === "." ? path.basename(forma, path.extname(forma)) : path.basename(path.dirname(forma));
    const arqs = comparar(sorc, T.fonteDoVolume(R.V, R.P), saida, rotulo);
    console.log(rotulo + ": fidelidade " + JSON.stringify(R.fidelidade) + ", cor " + JSON.stringify(R.P.fonte) + ", " + ((Date.now() - t0)/1000).toFixed(1) + " s -> " + arqs.map(a => path.basename(a)).join(", "));
  }
}
