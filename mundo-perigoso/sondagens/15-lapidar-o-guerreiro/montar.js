/* ============================================================
   O GUERREIRO LAPIDADO: o projeto do Leandro com a cor nova
   ------------------------------------------------------------
   O Leandro corrigiu o rig do guerreiro no atelie e melhorou o andar (o
   guerreiro.atelie da Area de Trabalho, 1/10). Aquele projeto perdeu a fonte
   de alta resolucao. Aqui:
   1. a fonte e o modelo do Sorceress, forma e cor (o padrao, desde que o
      leitor do .wgvox foi consertado: a cor dele e limpa), ou, com
      --cor=desenho, a forma dele pintada com o desenho (tresvistas.js: cada
      vista alinhada por si, a cabeca pelo rosto, o guia da cor do Sorceress);
   2. o corpo de 117 recebe as cores novas, mantendo a forma e os pesos do
      projeto do Leandro (a forma e a mesma: so a cor muda);
   3. o projeto vai para Arte/personagens/guerreiro.atelie, com a fonte;
   4. e o .personagem de 256 do jogo (compactado) e refeito dele.

   Uso: node mundo-perigoso/sondagens/15-lapidar-o-guerreiro/montar.js <projeto-do-leandro.atelie>
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const T = require("../7-tres-vistas/tresvistas.js");
const C = require(path.join(RAIZ, "atelie", "corpo.js")), Ar = require(path.join(RAIZ, "atelie", "arquivos.js"));
const Rs = require(path.join(RAIZ, "atelie", "resolucao.js")), V = require(path.join(RAIZ, "atelie", "validar.js"));
const { compactarPersonagem } = require(path.join(RAIZ, "editor", "compacto.js"));

const projArq = process.argv[2];
if (!projArq){ console.log("uso: montar.js <projeto.atelie>"); process.exit(1); }
const FORMA = path.join(RAIZ, "Arte", "personagens", "guerreiro.wgvox"), FOLHA = path.join(RAIZ, "Arte", "personagens", "Referência", "guerreiro-folha.png");

let t0 = Date.now(), fonte;
if (process.argv.includes("--cor=desenho")){
  const R = T.processar(FOLHA, {forma: FORMA, nome: "guerreiro"});
  fonte = T.fonteDoVolume(R.V, R.P);
  console.log("fonte pintada com o desenho em " + (Date.now() - t0) + " ms; fontes da cor " + JSON.stringify(R.P.fonte));
} else {
  fonte = C.lerWgvox(fs.readFileSync(FORMA));
  console.log("fonte: o modelo do Sorceress, forma e cor");
}

const proj = Ar.lerProjeto(fs.readFileSync(projArq, "utf8"));
const novo = C.importarModelo(fonte, {nome: proj.nome, altura: 115});
/* a forma tem que ser a mesma, voxel a voxel: so a cor muda */
const a = proj.corpo, n = novo;
if (a.bx !== n.bx || a.by !== n.by || a.bz !== n.bz) throw new Error("a caixa do corpo mudou");
let difForma = 0;
for (let i = 0; i < a.cor.length; i++) if (!!a.cor[i] !== !!n.cor[i]) difForma++;
console.log("voxels de forma diferentes: " + difForma);
if (difForma) throw new Error("a forma do corpo de 117 mudou: nao da para levar os pesos do Leandro");
a.paleta = n.paleta; a.cor = n.cor; a.versao = (a.versao || 0) + 1;
proj.fonte = Rs.fonteCompacta(fonte, 255);
const v = V.validarProjeto(proj);
console.log("validacao em 117: " + v.erros.length + " erro(s), " + v.avisos.length + " aviso(s)" + (v.erros.length ? "\n  " + v.erros.join("\n  ") : ""));
const destino = path.join(RAIZ, "Arte", "personagens", "guerreiro.atelie");
fs.writeFileSync(destino, Ar.salvarProjeto(proj));
console.log("gravado " + path.relative(RAIZ, destino));

/* o de 256 para o jogo */
t0 = Date.now();
const voltar = Rs.usarResolucao(256/117);
try {
  const d = Rs.projetoEm(proj, 256/117), vd = V.validarProjeto(d, {rapido: true});
  const fora = vd.quadros.reduce((s, q) => s + q.fora, 0);
  fs.writeFileSync(path.join(RAIZ, "personagens", "guerreiro.personagem"), compactarPersonagem(Ar.exportarPersonagem(d, vd)));
  console.log("personagens/guerreiro.personagem em 256, " + ((Date.now() - t0)/1000).toFixed(0) + " s" + (fora ? "; " + fora + " voxels fora da grade, somando os quadros" : ""));
} finally { voltar(); }
console.log("agora: node mundo-perigoso/build.js");
