/* O mundo em 128 por tile (?mundo=128, proposta de 1/10; DESIGN.md,
   *densidade e tela*): as texturas da ilha e dos estilos saem em 128 com o
   mip, o cenario sobe para 128 voxels por tile com as copias para longe, e
   sem o endereco nada muda.
   Uso: node mundo-perigoso/teste/mundo.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const C = require("../src/cores.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const mapa = () => { const m = M.lerMapa(fs.readFileSync(path.join(__dirname, "..", "mapas", "ilha.mapa"), "utf8")).mapa; if (m.versao < 2) M.converterMapa(m); return m; };
const abrir = busca => { const { D } = carregar(arquivo, {busca: "?mapa=cripta" + busca, canvas: "software"}); D.trocarMundo("?mapa=canteiro", mapa()); return D; };
/* desde 1/10 o 128 e o padrao: a = o mundo de antes (?mundo=64), b = o de hoje */

try {
  const a = abrir("&mundo=64"), b = abrir("");
  check("com ?mundo=64, a grama e de 64 e sem mip", a.TEX.ilhaGrama.w === 64 && !a.TEX.ilhaGrama.mips);
  const g = b.TEX.ilhaGrama;
  check("sem o endereco, a grama e de 128, com o mip ate 8", g.w === 128 && g.h === 128 && g.mips && g.mips.map(m => m.w).join() === "64,32,16,8");
  check("a agua anima em 128 tambem", b.TEX.ilhaRasa.every(t => t.w === 128 && t.mips));
  const ea = a.texturaDoEstilo("madeira-pescador", "parede", 0), eb = b.texturaDoEstilo("madeira-pescador", "parede", 0);
  check("a parede do estilo sai em 128 com mip, e em 64 sem", ea.w === 64 && !ea.mips && eb.w === 128 && eb.mips && eb.mips.length === 4);
  /* a tabua do estilo tem a mesma largura no tile: conta as juntas escuras de uma linha */
  const juntas = t => { let n = 0; const cm = t.cm; for (let x = 0; x < t.w; x++){ const c = cm[t.px[5*t.w + x]], d = cm[t.px[5*t.w + ((x + 1) % t.w)]]; if ((c & 255) > (d & 255) + 30) n++; } return n; };
  check("a tabua continua do mesmo tamanho no tile (mesmo numero de juntas)", Math.abs(juntas(ea) - juntas(eb)) <= 2, juntas(ea) + " e " + juntas(eb));
  const arv = b.CENARIO_AGORA.arvore.imgs[0];
  check("o cenario sobe junto: 128 pixels por tile, com metade e um quarto para longe", Math.abs(arv.porTile - 128) < 0.5 && arv.longe && arv.longe.longe);
  check("a vidraca, desenho de 64, sai ampliada igual", (function(){
    const v1 = a.texturaDoEstilo("madeira-pescador", "vidraca", 0), v2 = b.texturaDoEstilo("madeira-pescador", "vidraca", 0);
    if (!v1 || !v2 || v1.w !== 64) return true;      // estilo sem vidraca: nada a conferir
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (v2.cm[v2.px[y*128 + x]] !== v1.cm[v1.px[(y >> 1)*64 + (x >> 1)]]) return false;
    return true;
  })());
  /* um quadro em 1280x720 nos dois, sem erro, e o mundo de 128 pinta a tela */
  for (const [D, nome] of [[a, "64"], [b, "128"]]){
    D.alocarTela(4); D.prepararCamera(); D.G.mode = "play";
    D.setCamera(0); D.renderWorld(); D.renderEntities();
  }
  let pintados = 0; for (const z of b.zbuf) if (z) pintados++;
  check("o quadro de 128 desenha o mundo", pintados > b.zbuf.length*0.2, (100*pintados/b.zbuf.length).toFixed(0) + "% da tela");
} catch (e){
  check("EXCECAO: " + e.message + " @ " + (e.stack.split("\n")[1] || "").trim(), false);
}

/* o mip de indice: o que mais aparece nos quatro, empate fica o de cima a esquerda */
{
  const px = new Uint8Array(16*16).fill(1), por = (x, y, v) => { px[y*16 + x] = v; };
  por(1, 1, 4);                                        // 1 1 / 1 4: o 1
  por(2, 0, 2); por(3, 0, 3); por(2, 1, 4); por(3, 1, 4);   // 2 3 / 4 4: o 4
  por(4, 0, 5); por(5, 0, 6); por(4, 1, 7); por(5, 1, 8);   // todos diferentes: o de cima a esquerda, 5
  const t = C.comMips({px: px, w: 16, h: 16, cm: null});
  check("o mip fica com o indice da maioria (empate: o de cima a esquerda)", t.mips.length === 1 && t.mips[0].w === 8 && t.mips[0].px[0] === 1 && t.mips[0].px[1] === 4 && t.mips[0].px[2] === 5,
    Array.from(t.mips[0].px.slice(0, 4)).join());
}
fim();
