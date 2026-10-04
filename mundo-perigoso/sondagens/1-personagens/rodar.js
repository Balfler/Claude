/* Roda a sondagem 1 no Chromium sem tela e grava resultado.json e as fotos.
   Uso: node mundo-perigoso/sondagens/1-personagens/rodar.js
   Precisa do playwright (npm i -g playwright) e do jogo montado (build.js). */
const path = require("path"), fs = require("fs"), http = require("http");
const { chromium } = require("playwright");
const RAIZ = path.join(__dirname, "..", "..", "..");
const AQUI = __dirname;

function servir(){
  const tipos = {".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".json": "application/json"};
  const s = http.createServer((req, res) => {
    const p = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, {"content-type": tipos[path.extname(p)] || "application/octet-stream"});
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => s.listen(0, () => r(s)));
}

(async () => {
  const srv = await servir(), porta = srv.address().port;
  const nav = await chromium.launch({args: ["--enable-precise-memory-info", "--js-flags=--expose-gc"]});
  const pag = await nav.newPage({viewport: {width: 1400, height: 900}});
  pag.on("pageerror", e => console.error("erro na pagina:", e.message));
  await pag.goto("http://localhost:" + porta + "/mundo-perigoso/sondagens/1-personagens/praca.html");
  await pag.waitForFunction(() => window.PRONTO, null, {timeout: 600000, polling: 500});
  console.log(await pag.$eval("#saida", e => e.textContent));
  const R = await pag.evaluate(() => window.RESULTADOS);
  R.navegador = await nav.version();
  fs.writeFileSync(path.join(AQUI, "resultado.json"), JSON.stringify(R, null, 1));
  if (R.fotoPronta){
    await pag.evaluate(() => window.FOTO_PERTO());
    await (await pag.$("#screen")).screenshot({path: path.join(AQUI, "praca-perto.png")});
    await pag.evaluate(() => window.FOTO_LONGE());
    await (await pag.$("#screen")).screenshot({path: path.join(AQUI, "praca-30.png")});
  }
  await nav.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
