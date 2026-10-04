/* Testes do cenario em 64 voxels por tile (DESIGN.md, a densidade): desligado,
   as arvores saem como sempre; com ?cenario=64 o modelo, que e bola e capsula
   por codigo, cresce na conta e sai com mais voxels para o MESMO tamanho no
   mundo. Uso: node mundo-perigoso/teste/cenario.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const mapa = () => { const m = M.lerMapa(fs.readFileSync(path.join(__dirname, "..", "mapas", "ilha.mapa"), "utf8")).mapa; if (m.versao < 2) M.converterMapa(m); return m; };
const abrir = busca => { const { D } = carregar(arquivo, {busca: "?mapa=cripta" + busca}); D.trocarMundo("?mapa=canteiro", mapa()); return D; };
const largura = im => im.w || im.largura || im.width || (im.px && im.px.length ? Math.round(Math.sqrt(im.px.length)) : 0);

try {
  const a = abrir("&mundo=64"), b = abrir("&mundo=64&cenario=64");      // o cenario de 37 e o do mundo de 64
  const A = a.CENARIO_AGORA, B = b.CENARIO_AGORA;
  check("o cenario existe nos dois", !!A && !!B && !!A.arvore && !!B.arvore);
  let iguais = true, maiores = true;
  for (const nome of Object.keys(A)){
    const ta = A[nome], tb = B[nome];
    if (!ta || !tb || !ta.imgs || !tb.imgs) continue;
    if (Math.abs(ta.larg - tb.larg) > 1e-9 || Math.abs(ta.alto - tb.alto) > 1e-9) iguais = false;
  }
  check("o tamanho no mundo nao muda: cada tipo tem a mesma largura e a mesma altura em tiles", iguais);
  const ia = A.arvore.imgs[0], ib = B.arvore.imgs[0];
  const chave = Object.keys(ia).filter(k => typeof ia[k] === "number").sort();
  const razoes = chave.filter(k => ia[k] > 20 && ib[k] > 20).map(k => ib[k]/ia[k]);
  /* em 37 cada voxel e 2x2 pixels no sprite; acima, 1 pixel por voxel (p3d.js, ESC_CENARIO):
     com 1,72 vez os voxels, a imagem fica com 0,86 do lado */
  check("em 64 a arvore tem 1,72 vez os voxels, um pixel por voxel: 0,86 do lado da imagem", razoes.length >= 2 && razoes.every(r => r > 0.78 && r < 0.94), razoes.map(r => r.toFixed(2)).join(" "));
  check("em 64 a arvore leva as copias para longe, metade e um quarto", !ia.longe && ib.longe && ib.longe.longe && Math.abs(ib.porTile - 64) < 0.5);
  check("o raio que barra a passagem e o mesmo", A.arvore.raio === B.arvore.raio && A.pinheiro.raio === B.pinheiro.raio);
} catch (e){
  check("EXCECAO: " + e.message + " @ " + (e.stack.split("\n")[1] || "").trim(), false);
}
fim();
