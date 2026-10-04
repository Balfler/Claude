/* O parado de pernas retas: o repouso refeito do rig (rig.js, repousoDoRig,
   agora com a perna como foi esculpida) e as animacoes escritas refeitas dele
   -- parado, respirar, pulo, atacar, conjurar, bloquear, arco. Andar e correr
   (a captura, e o andar que o Leandro mexeu) ficam como estao.
   Uso: node mundo-perigoso/sondagens/15-lapidar-o-guerreiro/repouso.js <projeto.atelie> */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const Ar = require(path.join(RAIZ, "atelie", "arquivos.js")), Rig = require(path.join(RAIZ, "atelie", "rig.js"));
const An = require(path.join(RAIZ, "atelie", "animacao.js")), V = require(path.join(RAIZ, "atelie", "validar.js"));
const arq = process.argv[2], proj = Ar.lerProjeto(fs.readFileSync(arq, "utf8"));
const ini = An.animacoesIniciais(proj.juntas, proj.corpo);
proj.repouso = ini.repouso;
const trocadas = [];
for (const nome in ini.animacoes) if (nome !== "andar" && nome !== "correr"){ proj.animacoes[nome] = ini.animacoes[nome]; trocadas.push(nome); }
const v = V.validarProjeto(proj);
fs.writeFileSync(arq, Ar.salvarProjeto(proj));
console.log("refeitas: " + trocadas.join(", ") + "; " + v.erros.length + " erro(s)" + (v.erros.length ? ": " + v.erros.join(" | ") : ""));
