/* Mede a esquiva com o robo do simulador (atraso.js), no Chromium sem tela:
   um duelo contra o diabrete, o robo da dash para tras quando VE o golpe
   comecar, depois de um tempo de reacao. Duas tabelas: reacao perfeita e
   humana com o preparo de hoje (0,19 s), e preparos maiores com reacao
   humana. O robo e tosco -- volta perto cedo demais e nao passa de uns 25%
   nem no caso facil --, entao a tabela vale pelas pontas, nao pelo meio.
   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/2-rede/montar-atraso.js
        node mundo-perigoso/sondagens/2-rede/medir-esquiva.js     (precisa do playwright) */
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright");
const PAGINA = "file://" + path.join(__dirname, "atraso.html").split(path.sep).join("/");

async function duelo(nav, rtt, reacao, preparo){
  const pag = await nav.newPage();
  await pag.goto(PAGINA + "?atraso=" + rtt);
  await pag.waitForTimeout(1000);
  await pag.keyboard.press("Enter");
  await pag.waitForTimeout(150);
  const r = await pag.evaluate(([re, p]) => window.__ATR_DBG.medirEsquiva(60, re, "diabrete", p), [reacao, preparo]);
  await pag.close();
  return Math.round(100*(1 - r.golpes/r.ataques));
}
(async () => {
  const nav = await chromium.launch();
  const R = {reacao: [], preparo: []};
  console.log("preparo de hoje (0,19 s): quanto se desvia");
  for (const rtt of [0, 50, 100, 150, 200, 300]){
    const a = await duelo(nav, rtt, 0, 0.19), b = await duelo(nav, rtt, 0.2, 0.19);
    R.reacao.push({rtt, perfeita: a, humana: b});
    console.log("  " + String(rtt).padStart(3) + " ms: reacao perfeita " + a + "%, reacao humana (0,2 s) " + b + "%");
  }
  console.log("reacao humana (0,2 s), preparos maiores");
  for (const p of [0.35, 0.5, 0.7]){
    const linha = {preparo: p};
    for (const rtt of [0, 100, 150, 200, 300]) linha[rtt] = await duelo(nav, rtt, 0.2, p);
    R.preparo.push(linha);
    console.log("  " + p.toFixed(2) + " s: " + [0, 100, 150, 200, 300].map(r => r + " ms " + linha[r] + "%").join(", "));
  }
  fs.writeFileSync(path.join(__dirname, "esquiva.json"), JSON.stringify(R, null, 1));
  await nav.close();
})();
