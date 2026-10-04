/* ============================================================
   CONVERTER UM PERSONAGEM DESENHADO
   ------------------------------------------------------------
   Uso: node mundo-perigoso/editor/personagem.js [nome]      (padrao: humano)

   Le mundo-perigoso/Arte/personagens/Refer\u00eancia/<nome>.png, desenhado sobre o molde
   (Arte/molde-humano.png), e grava mundo-perigoso/personagens/<nome>.personagem.
   Depois e rodar o build: ele embute o personagem no jogo e no provador.

   O tamanho da grade e as juntas vem do jogo montado, entao o build tem que
   estar em dia antes.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { carregar } = require("../teste/harness");
const { decodificar } = require("./png");
const { converter, escrever } = require("./conversor");

const nome = (process.argv[2] || "humano").toLowerCase();
if (!/^[a-z0-9-]+$/.test(nome)){ console.error("nome de personagem so com letras minusculas, numeros e hifen"); process.exit(1); }
const RAIZ = path.join(__dirname, "..", "..");
const entrada = path.join(RAIZ, "mundo-perigoso", "Arte", "personagens", "Refer\u00eancia", nome + ".png");
const saida = path.join(RAIZ, "mundo-perigoso", "personagens", nome + ".personagem");
if (!fs.existsSync(entrada)){
  console.error("nao achei " + path.relative(RAIZ, entrada) + ": desenhe sobre o molde e grave ali");
  process.exit(1);
}

const { D } = carregar(path.join(RAIZ, "cripta-vhalgorn.html"));
const s = D.esqueletoDaFormula(0);
const conv = converter(decodificar(fs.readFileSync(entrada)), D.DIM_PERSONAGEM, {alturaDoPe: s.peE[2] + 3});
fs.mkdirSync(path.dirname(saida), {recursive: true});
fs.writeFileSync(saida, escrever(conv, nome));

let cheios = 0;
for (let i = 0; i < conv.g.length; i++) if (conv.g[i]) cheios++;
console.log("gravado " + path.relative(RAIZ, saida) + ": " + cheios + " voxels, " + conv.cores.length + " cores");
for (const a of conv.avisos) console.log("aviso: " + a);
console.log("agora: node mundo-perigoso/build.js");
