/* Testes dos formatos de voxel de terceiros: o .vox que o MagicaVoxel le e
   grava (editor/vox.js) e o .wgvox que o sorceress.games/voxelgen exporta
   (editor/wgvox.js). Os dois viraram a fonte do personagem (ver DESIGN.md,
   "o corpo trocado por um modelo gerado"), e nenhum dos dois tem biblioteca
   por baixo -- sao poucas dezenas de linhas cada, e um erro de offset aqui
   nao da erro nenhum: silenciosamente le ou escreve a grade errada.
   Uso: node mundo-perigoso/teste/wgvox.test.js */
const { placar } = require("./harness");
const { check, fim } = placar();
const VOX = require("../editor/vox");
const WGV = require("../editor/wgvox");

/* ---------- .vox: o que se grava volta igual ---------- */
{
  const dim = {DX: 5, DY: 4, DZ: 3};
  const g = new Uint8Array(dim.DX*dim.DY*dim.DZ);
  const paleta = [];
  for (let i = 0; i < 40; i++) paleta.push([(i*7) & 255, (i*13) & 255, (i*29) & 255]);
  /* preenche um padrao que usa toda borda da grade, pra pegar erro de offset por eixo */
  let n = 0;
  for (let z = 0; z < dim.DZ; z++) for (let y = 0; y < dim.DY; y++) for (let x = 0; x < dim.DX; x++){
    if ((x + y*2 + z*3) % 3 === 0){ g[(z*dim.DY + y)*dim.DX + x] = 1 + (n % 40); n++; }
  }
  const buf = VOX.codificar(dim, g, paleta);
  check(".vox: comeca com a assinatura certa", buf.toString("ascii", 0, 4) === "VOX ");
  const volta = VOX.decodificar(buf);
  check(".vox: a dimensao volta igual", volta.dim.DX === dim.DX && volta.dim.DY === dim.DY && volta.dim.DZ === dim.DZ);
  check(".vox: cada voxel volta na mesma posicao e cor", volta.g.every((v, i) => v === g[i]),
    "primeira diferenca no indice " + volta.g.findIndex((v, i) => v !== g[i]));
  check(".vox: a paleta volta igual (indice de cor i -> posicao i-1)",
    paleta.every((c, i) => volta.paleta[i][0] === c[0] && volta.paleta[i][1] === c[1] && volta.paleta[i][2] === c[2]));
  check(".vox: grade vazia nao quebra (SIZE e XYZI sem voxel nenhum)",
    VOX.decodificar(VOX.codificar(dim, new Uint8Array(dim.DX*dim.DY*dim.DZ), paleta)).g.every(v => v === 0));
}

/* ---------- .wgvox: monta um arquivo sintetico do zero, no formato descrito
   no cabecalho da ferramenta, e confere que ler() concorda com o que foi
   escrito -- sem depender de um arquivo baixado, que nao mora no repositorio */
{
  const gx = 3, gy = 4, gz = 2;
  const paleta = [[10, 20, 30], [200, 150, 100], [0, 255, 0]];
  const celulas = gx*gy*gz;
  const material = new Uint16Array(celulas);
  /* ocupa um miolo, deixa vazio nas bordas -- exercita runs vazias e cheias */
  material[1 + 1*gx + 0*gx*gy] = 1;
  material[2 + 1*gx + 0*gx*gy] = 2;
  material[0 + 2*gx + 1*gx*gy] = 3;

  const runs = [];
  { let v = material[0], n = 0;
    for (let i = 0; i < celulas; i++){ if (material[i] === v) n++; else { runs.push([n, v]); v = material[i]; n = 1; } }
    runs.push([n, v]);
  }

  const cabecalho = JSON.stringify({ferramenta: "teste-sintetico", gerado: "so para o teste"});
  const jsonBuf = Buffer.from(cabecalho, "utf8");
  const paletaBuf = Buffer.concat(paleta.map(c => Buffer.from(c)));
  const runsBuf = Buffer.alloc(runs.length*4);
  runs.forEach(([tamanho, cor], i) => { runsBuf.writeUInt16LE(tamanho, i*4); runsBuf.writeUInt16LE(cor, i*4 + 2); });

  const binCab = Buffer.alloc(24);
  binCab.write("WGV1", 0, 4, "ascii");
  binCab.writeUInt32LE(1, 4);
  binCab.writeUInt16LE(gx, 8); binCab.writeUInt16LE(gy, 10); binCab.writeUInt16LE(gz, 12);
  binCab.writeUInt16LE(paleta.length, 14);
  binCab.writeUInt32LE(material.reduce((s, v) => s + (v ? 1 : 0), 0), 16);
  binCab.writeUInt32LE(0, 20);
  const nParesBuf = Buffer.alloc(4); nParesBuf.writeUInt32LE(runs.length, 0);
  const secaoBinaria = Buffer.concat([binCab, paletaBuf, nParesBuf, runsBuf]);

  const fora = Buffer.alloc(16);
  fora.write("WGV2", 0, 4, "ascii");
  fora.writeUInt32LE(16 + jsonBuf.length + secaoBinaria.length, 4);
  fora.writeUInt32LE(jsonBuf.length, 8);
  fora.writeUInt32LE(secaoBinaria.length, 12);
  const buf = Buffer.concat([fora, jsonBuf, secaoBinaria]);

  const escreve = require("fs").writeFileSync, le = require("fs").readFileSync;
  const os = require("os"), path = require("path");
  const tmp = path.join(os.tmpdir(), "teste-wgvox-" + process.pid + ".wgvox");
  escreve(tmp, buf);
  let r;
  try { r = WGV.ler(tmp); } finally { require("fs").unlinkSync(tmp); }

  check(".wgvox: le a grade certa", r.gx === gx && r.gy === gy && r.gz === gz);
  check(".wgvox: le o cabecalho JSON", r.cabecalho.ferramenta === "teste-sintetico");
  check(".wgvox: le a paleta na ordem certa",
    paleta.every((c, i) => r.paleta[i][0] === c[0] && r.paleta[i][1] === c[1] && r.paleta[i][2] === c[2]));
  check(".wgvox: o RLE decodifica pra grade original, celula por celula",
    Array.from(r.g).every((v, i) => v === material[i]), "primeira diferenca no indice " + Array.from(r.g).findIndex((v, i) => v !== material[i]));
}

/* ---------- ASCII ---------- */
{
  const fs = require("fs"), path = require("path");
  const s = fs.readFileSync(__filename, "utf8");
  const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
  check(path.basename(__filename) + " e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);
}

fim();
