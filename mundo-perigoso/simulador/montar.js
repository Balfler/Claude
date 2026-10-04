/* Junta o simulador num arquivo so, para publicar como link.

   A pagina do repositorio carrega src/regras.js e simulador.js por fora,
   que e o que deixa o jogo e o simulador dividirem as mesmas regras. Um link
   publicado precisa de tudo dentro. Isto embute os dois scripts e tira o
   esqueleto do documento, que o publicador poe de volta.

   Uso: node mundo-perigoso/simulador/montar.js saida.html */
const fs = require("fs");
const path = require("path");

const saida = process.argv[2];
if (!saida){ console.error("uso: node mundo-perigoso/simulador/montar.js saida.html"); process.exit(1); }

const aqui = __dirname;
let html = fs.readFileSync(path.join(aqui, "simulador.html"), "utf8");
const embute = function(rel){
  return function(){ return "<script>\n" + fs.readFileSync(path.join(aqui, rel), "utf8") + "\n</script>"; };
};
html = html
  .replace('<script src="../src/regras.js"></script>', embute("../src/regras.js"))
  .replace('<script src="simulador.js"></script>', embute("simulador.js"));
if (/<script src=/.test(html)){ console.error("sobrou script por fora"); process.exit(1); }

html = html
  .replace(/<!doctype html>\s*/i, "")
  .replace(/<\/?html[^>]*>\s*/gi, "")
  .replace(/<\/?head>\s*/gi, "")
  .replace(/<\/?body[^>]*>\s*/gi, "")
  .replace(/<meta charset[^>]*>\s*/i, "")
  .replace(/<meta name="viewport"[^>]*>\s*/i, "");

const k = html.split("").findIndex(function(c){ return c.charCodeAt(0) > 127; });
if (k >= 0){ console.error("caractere nao-ASCII na posicao " + k); process.exit(1); }
fs.writeFileSync(saida, html);
console.log("montado: " + saida + " (" + html.length + " bytes)");
