/* Verificacao estatica e barata do arquivo montado: sintaxe, formato do mapa,
   topologia (da pra chegar na chave e na saida?) e higiene de texto.
   Nao executa o jogo -- isso e trabalho de jogo.test.js e motor3d.test.js.

   Uso: node mundo-perigoso/teste/verifica.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const arquivo = process.argv[2] ||
  path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const html = fs.readFileSync(arquivo, "utf8");
const falhas = [];
const diga = (ok, msg) => { console.log((ok ? "  ok  " : "  XX  ") + msg); if (!ok) falhas.push(msg); };

/* ---------- 1. sintaxe ---------- */
const m = html.match(/<script>\n([\s\S]*)<\/script>/);
if (!m){ console.log("  XX  nao achei o bloco <script>"); process.exit(1); }
const js = m[1];
try {
  new vm.Script(js, { filename: "cripta.js" });
  diga(true, "sintaxe JS (" + js.split("\n").length + " linhas)");
} catch (e) {
  diga(false, "sintaxe JS: " + e.message);
}

/* ---------- 2. o mapa ---------- */
const mm = js.match(/const MAPA_CRIPTA = \[\n([\s\S]*?)\n\];/);
if (!mm){ diga(false, "nao achei o MAP"); }
else {
  const linhas = mm[1].split("\n").map(l => (l.match(/"([^"]*)"/) || [])[1]).filter(Boolean);
  const larguras = new Set(linhas.map(l => l.length));
  diga(larguras.size === 1 && linhas.length === 32,
    "mapa " + linhas[0].length + "x" + linhas.length +
    (larguras.size === 1 ? "" : " -- larguras diferentes: " + [...larguras].join(",")));

  /* topologia: inundacao a partir do jogador, portas contam como passaveis
     porque podem ser abertas. Alturas nao entram aqui -- quem cuida disso e
     o motor3d.test.js ("rampa leva ao mezanino sem pular"). */
  const H = linhas.length, W = linhas[0].length;
  const parede = c => "#=Rx".includes(c);
  let ini = null;
  const alvos = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const c = linhas[y][x];
    if (c === "p") ini = [x, y];
    if ("kxAL".includes(c)) (alvos[c] = alvos[c] || []).push([x, y]);
    if (c === "x") (alvos.x = alvos.x || []).push([x, y]);
  }
  if (!ini) diga(false, "mapa sem ponto de partida 'p'");
  else {
    const visto = new Set([ini[1] * W + ini[0]]);
    const fila = [ini];
    while (fila.length){
      const [x, y] = fila.pop();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (visto.has(k)) continue;
        if (parede(linhas[ny][nx])) continue;      // '#' '=' 'R' 'x' barram
        visto.add(k); fila.push([nx, ny]);
      }
    }
    const alcanca = (x, y) => [[1,0],[-1,0],[0,1],[0,-1]]
      .some(([dx,dy]) => visto.has((y+dy)*W + (x+dx))) || visto.has(y*W + x);
    for (const [nome, simbolo] of [["chave runica","k"],["alma do segredo","A"],["portal de saida","x"]]){
      const pos = (alvos[simbolo] || [])[0];
      if (!pos) { diga(false, "nao achei " + nome + " no mapa"); continue; }
      diga(alcanca(pos[0], pos[1]), "da pra chegar em: " + nome);
    }
  }
}

/* ---------- 3. higiene de texto ---------- */
const naoAscii = html.split("").findIndex(c => c.charCodeAt(0) > 127);
diga(naoAscii < 0, naoAscii < 0 ? "arquivo e ASCII puro"
  : "caractere nao-ASCII na posicao " + naoAscii);

/* escapes unicode mutilados por shell viram "00b7"/"2014" no meio do texto */
const ruinas = (js.match(/["'][^"'\n]*["']/g) || [])
  .filter(s => /[A-Za-z] {1,3}(00|20)[0-9a-f]{2} {1,3}[A-Za-z]/.test(s));
diga(ruinas.length === 0, ruinas.length ? "escape mutilado: " + ruinas.join(" ; ")
  : "escapes unicode intactos");

/* o canteiro abre do disco, sem passar pelo build: as fontes dele e os
   mapas que ele escreve tambem sao ASCII -- o acento vai como ç */
const raiz = path.join(__dirname, "..");
const fontes = [];
for (const dir of ["canteiro", "src", "mapas"])
  for (const f of fs.readdirSync(path.join(raiz, dir)))
    if (/\.(js|html|mapa)$/.test(f)) fontes.push(path.join(dir, f));
const sujos = fontes.filter(f => /[^\x00-\x7f]/.test(fs.readFileSync(path.join(raiz, f), "utf8")));
diga(sujos.length === 0, sujos.length ? "nao-ASCII em: " + sujos.join(", ")
  : "fontes do canteiro e mapas em ASCII (" + fontes.length + " arquivos)");

console.log(falhas.length ? "\n" + falhas.length + " problema(s)" : "\ntudo certo");
process.exit(falhas.length ? 1 : 0);
