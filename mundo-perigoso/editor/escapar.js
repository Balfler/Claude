/* Troca todo caractere nao-ASCII por escape: \uXXXX em .js, &#xXXXX; em .html.
   O fonte do projeto e ASCII puro; isto deixa escrever com acento e
   converter antes de gravar no git.

   Uso: node mundo-perigoso/editor/escapar.js arquivo [arquivo...] */
const fs = require("fs");
let total = 0;
for (const f of process.argv.slice(2)){
  const s = fs.readFileSync(f, "utf8");
  const html = /\.html?$/i.test(f);
  let n = 0;
  const out = Array.from(s).map(function(c){
    const cp = c.codePointAt(0);
    if (cp < 128) return c;
    n++;
    if (html) return "&#x" + cp.toString(16) + ";";
    if (cp > 0xFFFF) throw new Error(f + ": caractere fora do plano basico: " + c);
    return "\\u" + cp.toString(16).padStart(4, "0");
  }).join("");
  if (n) fs.writeFileSync(f, out);
  console.log(f + ": " + n + " escapado(s)");
  total += n;
}
