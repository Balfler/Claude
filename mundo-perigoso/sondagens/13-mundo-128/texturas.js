/* As texturas em si, 64 (?mundo=64) e 128, lado a lado e ampliadas: a do
   telhado da ilha, a telha dos estilos, a calcada, a grama.
   Uso: node mundo-perigoso/sondagens/13-mundo-128/texturas.js */
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const M = require(path.join(RAIZ, "src", "mapa.js")), png = require(path.join(RAIZ, "editor", "png.js"));
const { carregar } = require(path.join(RAIZ, "teste", "harness"));
const mapa = () => { const m = M.lerMapa(fs.readFileSync(path.join(RAIZ, "mapas", "ilha.mapa"), "utf8")).mapa; if (m.versao < 2) M.converterMapa(m); return m; };
const abrir = b => { const { D } = carregar(path.join(RAIZ, "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta" + b, canvas: "software"}); D.trocarMundo("?mapa=canteiro", mapa()); return D; };
const A = abrir("&mundo=64"), B = abrir("");
const quais = [["telhado-da-ilha", D => D.TEX.ilhaTelhado], ["telha-do-estilo", D => D.texturaDoEstilo("madeira-pescador", "telha", 0)],
               ["calcada", D => D.TEX.ilhaCalcada], ["grama", D => D.TEX.ilhaGrama], ["parede-de-tabua", D => D.texturaDoEstilo("madeira-pescador", "parede", 0)]];
for (const [nome, f] of quais){
  const ts = [f(A), f(B)], lado = 256, W = lado*2 + 8, o = new Uint8Array(W*lado*4).fill(255);
  ts.forEach((t, k) => {
    for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++){
      const c = t.cm[t.px[Math.floor(y*t.h/lado)*t.w + Math.floor(x*t.w/lado)]], d = (y*W + k*(lado + 8) + x)*4;
      o[d] = c & 255; o[d + 1] = (c >> 8) & 255; o[d + 2] = (c >> 16) & 255; o[d + 3] = 255;
    }
  });
  fs.writeFileSync(path.join(__dirname, "textura-" + nome + "-64-x-128.png"), png.codificar(W, lado, o));
}
console.log("ok");
