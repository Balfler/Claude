/* Mede o forno no worker contra o forno na linha principal, num navegador
   sem tela, com o jogo rodando na cripta. Grava medidas.json.
   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/6-forno/costura-forno.js
        node mundo-perigoso/sondagens/6-forno/medir.js      (precisa do playwright) */
"use strict";
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");
const PAGINA = "file://" + path.join(__dirname, "forno.html");
/* quatro visuais diferentes: quatro jogadores chegando na praca */
const ESCOLHAS = [
  {armadura: "couro", elmo: "fechado", capa: "capa", corCapa: 2, arma: "adaga"},
  {armadura: "malha", elmo: "capuz", corRoupa: 1, arma: "cajado"},
  {armadura: "placas", elmo: "elmo", arma: "espada"},
  {armadura: "roupa", cabelo: "longo", enfeite: "pena", arma: "arco"}
];
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(nav){
  const pag = await nav.newPage({viewport: {width: 1300, height: 760}});
  const erros = [];
  pag.on("pageerror", e => erros.push(e.message));
  /* a fonte do Google nao carrega na maquina da nuvem: nao e erro do jogo */
  pag.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
  await pag.goto(PAGINA);
  await esperar(1500);
  await pag.keyboard.press("Enter");
  await esperar(1500);
  pag.erros = erros;
  return pag;
}
const f1 = x => Math.round(x*10)/10;
function linha(nome, r){
  return nome.padEnd(28) + (f1(r.ms/1000) + " s").padStart(9) + "   quadros: p50 " + f1(r.intervalos.p50) + " ms, p95 " + f1(r.intervalos.p95) +
         " ms, pior " + f1(r.intervalos.max) + " ms" + (r.trabalho && r.trabalho.n ? "   forno por quadro: pior " + f1(r.trabalho.max) + " ms" : "");
}

(async () => {
  const nav = await chromium.launch();
  const R = {};
  try {
    const A = await abrir(nav);
    R.fonteDoWorker = await A.evaluate(() => window.__FORNO_DBG.tamanhoDaFonte());
    R.comparar = await A.evaluate(e => window.__FORNO_DBG.comparar(e), ESCOLHAS[0]);
    console.log("worker e linha principal assam igual: " + R.comparar.iguais + " quadros iguais, " + R.comparar.diferentes + " diferentes");
    R.ligar = await A.evaluate(() => window.__FORNO_DBG.msLigar());
    console.log("o worker sobe (carrega o jogo) em " + f1(R.ligar) + " ms");
    R.parado = await A.evaluate(() => window.__FORNO_DBG.parado(3000));
    console.log(linha("nada assando", R.parado));
    R.principal1 = await A.evaluate(e => window.__FORNO_DBG.principal(e), ESCOLHAS.slice(0, 1));
    console.log(linha("1 visual, linha principal", R.principal1) + "   maior tarefa " + f1(R.principal1.tarefas.max) + " ms");
    R.worker1 = await A.evaluate(e => window.__FORNO_DBG.worker(e), ESCOLHAS.slice(1, 2));
    console.log(linha("1 visual, 1 worker", R.worker1) + "   recebendo: " + f1(R.worker1.msMensagens) + " ms em " + R.worker1.mensagens + " mensagens, a maior " + f1(R.worker1.maiorMensagem) + " ms");
    R.principal4 = await A.evaluate(e => window.__FORNO_DBG.principal(e), ESCOLHAS);
    console.log(linha("4 visuais, linha principal", R.principal4) + "   maior tarefa " + f1(R.principal4.tarefas.max) + " ms");
    R.worker4 = await A.evaluate(e => window.__FORNO_DBG.worker(e), ESCOLHAS.map(e => Object.assign({}, e, {corRoupa: 2})));
    console.log(linha("4 visuais, 1 worker", R.worker4) + "   recebendo: " + f1(R.worker4.msMensagens) + " ms em " + R.worker4.mensagens + " mensagens, a maior " + f1(R.worker4.maiorMensagem) + " ms");
    R.errosA = A.erros;
    await A.close();

    const B = await abrir(nav);
    R.worker4em3 = await B.evaluate(e => window.__FORNO_DBG.worker(e, 3), ESCOLHAS.map(e => Object.assign({}, e, {corRoupa: 3})));
    console.log(linha("4 visuais, 3 workers", R.worker4em3) + "   (subir os 3: " + f1(R.worker4em3.msLigar) + " ms)");
    R.errosB = B.erros;
    await B.close();
    console.log("erros nas paginas: " + (R.errosA.length + R.errosB.length ? R.errosA.concat(R.errosB).slice(0, 3).join(" | ") : "nenhum"));
  } finally {
    await nav.close();
    fs.writeFileSync(path.join(__dirname, "medidas.json"), JSON.stringify(R, null, 1));
  }
})().catch(e => { console.error(e); process.exit(1); });
