/* ============================================================
   TUDO.JS -- A BATERIA COMPLETA DE TESTES
   ------------------------------------------------------------
   Roda o build do jogo, todas as 24 suites de teste e o verifica.js.
   Imprime uma linha por arquivo com a contagem de sucessos e falhas,
   e no fim o total geral. Sai com codigo 1 se algo falhar.
   Uso: node mundo-perigoso/teste/tudo.js
   ============================================================ */
"use strict";

const { execSync } = require("child_process");
const path = require("path");

/* raiz do projeto (onde fica mundo-perigoso/) */
const raiz = path.resolve(__dirname, "..", "..");

const TESTES = [
  "mundo-perigoso/teste/atelie.test.js",
  "mundo-perigoso/teste/conversor.test.js",
  "mundo-perigoso/teste/wgvox.test.js",
  "mundo-perigoso/teste/jogo.test.js",
  "mundo-perigoso/teste/motor3d.test.js",
  "mundo-perigoso/teste/mapa.test.js",
  "mundo-perigoso/teste/ilha.test.js",
  "mundo-perigoso/teste/conversa.test.js",
  "mundo-perigoso/teste/regras.test.js",
  "mundo-perigoso/teste/personagem.test.js",
  "mundo-perigoso/teste/pecas.test.js",
  "mundo-perigoso/teste/estilos.test.js",
  "mundo-perigoso/teste/canteiro.test.js",
  "mundo-perigoso/teste/refazer.test.js",
  "mundo-perigoso/teste/andar.test.js",
  "mundo-perigoso/teste/modelo.test.js",
  "mundo-perigoso/teste/jogadores.test.js",
  "mundo-perigoso/teste/catalogo.test.js",
  "mundo-perigoso/teste/validacao.test.js",
  "mundo-perigoso/teste/planta.test.js",
  "mundo-perigoso/teste/canvas.test.js",
  "mundo-perigoso/teste/pronto.test.js",
  "mundo-perigoso/teste/olhar.test.js",
  "mundo-perigoso/teste/forno.test.js"
];

/* 1. rodar o build */
try {
  execSync("node mundo-perigoso/build.js", { cwd: raiz, stdio: ["ignore", "pipe", "pipe"] });
} catch (err) {
  console.error("falha ao rodar mundo-perigoso/build.js:\n" + (err.stderr || err.stdout || err.message));
  process.exit(1);
}

let totalPassou = 0;
let totalFalhou = 0;
let falhasDetalhadas = [];

/* 2. rodar cada arquivo de teste na ordem do README */
for (const rel of TESTES) {
  let saida = "";
  let falhouSuite = false;
  try {
    saida = execSync("node " + rel, { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    falhouSuite = true;
    saida = (err.stdout || "") + "\n" + (err.stderr || "");
  }

  const mPassou = saida.match(/(\d+)\s+passaram/);
  const mFalhou = saida.match(/(\d+)\s+falharam/);

  let passou = mPassou ? parseInt(mPassou[1], 10) : (saida.match(/^\s*ok\s+/gm) || []).length;
  let falhou = mFalhou ? parseInt(mFalhou[1], 10) : (saida.match(/^\s*XX\s+/gm) || []).length;

  if (falhouSuite && falhou === 0) falhou = 1;

  totalPassou += passou;
  totalFalhou += falhou;

  if (falhou > 0) {
    falhasDetalhadas.push({ arquivo: rel, saida: saida.trim() });
  }

  console.log(rel + ": " + passou + " passaram, " + falhou + " falharam");
}

/* 3. rodar o verifica.js */
let saidaVerifica = "";
let falhouVerifica = false;
try {
  saidaVerifica = execSync("node mundo-perigoso/teste/verifica.js", { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (err) {
  falhouVerifica = true;
  saidaVerifica = (err.stdout || "") + "\n" + (err.stderr || "");
}

const vOks = (saidaVerifica.match(/^\s*ok\s+/gm) || []).length;
const vFails = (saidaVerifica.match(/^\s*XX\s+/gm) || []).length;
if (falhouVerifica && vFails === 0) totalFalhou += 1;
else totalFalhou += vFails;

console.log("mundo-perigoso/teste/verifica.js: " + vOks + " de 8 no verifica (" + (vFails === 0 && !falhouVerifica ? "0 falhas" : vFails + " falhas") + ")");

/* 4. resumo final */
console.log("\ntotal: " + TESTES.length + " arquivos, " + totalPassou + " e " + totalFalhou + ", e " + vOks + " de 8 no verifica");

if (falhasDetalhadas.length > 0) {
  console.log("\n=== DETALHE DAS FALHAS ===");
  for (const f of falhasDetalhadas) {
    console.log("\n--- " + f.arquivo + " ---\n" + f.saida);
  }
}

if (totalFalhou > 0 || falhouVerifica) {
  process.exit(1);
}
process.exit(0);
