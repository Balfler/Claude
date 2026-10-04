/* ============================================================
   SONDAGEM 7 -- A FOLHA DE COMPARACAO
   ------------------------------------------------------------
   Poe lado a lado, na mesma escala e com a mesma luz, o corpo que saiu das
   tres vistas e o humano do Sorceress (Arte/personagens/humano.atelie), de
   frente, de lado e de costas.

   Uso: node mundo-perigoso/sondagens/7-tres-vistas/comparar.js <nosso.atelie> <saida.png>
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const Ar = require("../../atelie/arquivos.js"), F = require("../../atelie/folha.js"), png = require("../../editor/png.js");

const [nosso, saida] = process.argv.slice(2);
if (!saida){ console.log("uso: node comparar.js <nosso.atelie> <saida.png>"); process.exit(1); }
const ler = a => Ar.lerProjeto(fs.readFileSync(a, "utf8")).corpo;
const corpos = [ler(nosso), ler(path.join(__dirname, "..", "..", "Arte", "personagens", "humano.atelie"))];
const folhas = corpos.map(c => F.montarFolha([c.cor], c.paleta, {vistas: ["frente", "lado", "costas"], escala: 3, grade: {DX: c.bx, DY: c.by, DZ: c.bz}}));
const W = folhas.reduce((s, f) => s + f.w, 0), H = Math.max.apply(null, folhas.map(f => f.h));
const px = new Uint8Array(W*H*4);
let ox = 0;
for (const f of folhas){
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++){
    const s = (y*f.w + x)*4, d = (y*W + ox + x)*4;
    px[d] = f.px[s]; px[d + 1] = f.px[s + 1]; px[d + 2] = f.px[s + 2]; px[d + 3] = 255;
  }
  ox += f.w;
}
fs.writeFileSync(saida, png.codificar(W, H, px));
console.log("gravado " + saida + " (" + W + "x" + H + "): a esquerda o nosso, a direita o do Sorceress");
