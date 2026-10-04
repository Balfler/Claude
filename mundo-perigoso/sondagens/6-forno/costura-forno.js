/* Monta a pagina da sondagem 6: o jogo montado (cripta-vhalgorn.html) com
   forno.js dentro, abrindo na cripta. Abre direto do disco.
   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/6-forno/costura-forno.js
   Sai mundo-perigoso/sondagens/6-forno/forno.html. */
"use strict";
const fs = require("fs"), path = require("path");
const MONTADO = path.join(__dirname, "..", "..", "..", "cripta-vhalgorn.html");

function trocarUma(js, de, para){
  const n = js.split(de).length - 1;
  if (n !== 1) throw new Error("costura do forno: esperava 1 ocorrencia, achei " + n + " de: " + de.slice(0, 80));
  return js.replace(de, () => para);
}
function montarForno(html, codigo){
  const m = html.match(/<script>\n([\s\S]*)<\/script>/);
  if (!m) throw new Error("nao achei o bloco <script> do jogo montado");
  let js = trocarUma(m[1], "(location.search || \"\")",
    "(/mapa=/.test(location.search || \"\") ? location.search : \"?mapa=cripta\")");
  js = trocarUma(js, "requestAnimationFrame(frame);\ncvs.focus();\n})();", codigo + "\nrequestAnimationFrame(frame);\ncvs.focus();\n})();");
  let saida = html.replace(m[1], () => js);
  saida = saida.replace(/<title>[^<]*<\/title>/, "<title>A Cripta de Vhalgorn - forno no worker</title>");
  const nao = [...saida].findIndex(c => c.charCodeAt(0) > 127);
  if (nao >= 0) throw new Error("caractere nao-ASCII na posicao " + nao);
  return saida;
}

if (require.main === module){
  const saida = montarForno(fs.readFileSync(MONTADO, "utf8"), fs.readFileSync(path.join(__dirname, "forno.js"), "utf8"));
  const destino = path.join(__dirname, "forno.html");
  fs.writeFileSync(destino, saida);
  console.log("montado: " + path.relative(process.cwd(), destino) + " (" + saida.length + " bytes)");
}
module.exports = { montarForno };
