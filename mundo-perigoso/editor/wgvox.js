/* ============================================================
   LEITOR DE .wgvox (formato de terceiros, sorceress.games)
   ------------------------------------------------------------
   Le o .wgvox que a ferramenta sorceress.games/voxelgen exporta: um modelo
   ja esculpido a partir de uma imagem de referencia. O formato e
   autodescrito no proprio cabecalho JSON do arquivo -- nada aqui foi
   adivinhado, so seguido.

   Layout do arquivo (little-endian):
     "WGV2" + tamanhoTotal(u32) + tamanhoJson(u32) + tamanhoPayload(u32)
     + cabecalho JSON (tamanhoJson bytes, comeca no byte 16)
     + secao binaria:
       "WGV1" + versao(u32) + gx,gy,gz(u16 cada) + nCores(u16)
       + nOcupados(u32) + flags(u32)
       + paleta: nCores * [r,g,b] (1 byte cada)
       + grade em RLE: nPares(u32) + nPares * [tamanhoDaRun(u16), corIndice(u16)]

   A grade deles usa Y para cima (o jogo usa Z), x + y*gx + z*gx*gy, e cor 0
   e vazio -- a mesma convencao de vazio que o resto do projeto.

   ler(caminho) -> {cabecalho, gx, gy, gz, paleta, g, versao, flags, nOcupados}
   ============================================================ */
const fs = require("fs");

function ler(caminho){
  const buf = fs.readFileSync(caminho);
  if (buf.toString("ascii", 0, 4) !== "WGV2") throw new Error("nao e um .wgvox (falta WGV2)");
  const tamJson = buf.readUInt32LE(8);
  const cabecalho = JSON.parse(buf.toString("utf8", 16, 16 + tamJson));
  let p = 16 + tamJson;

  if (buf.toString("ascii", p, p + 4) !== "WGV1") throw new Error("secao binaria sem WGV1");
  const versao = buf.readUInt32LE(p + 4);
  const gx = buf.readUInt16LE(p + 8), gy = buf.readUInt16LE(p + 10), gz = buf.readUInt16LE(p + 12);
  const nCores = buf.readUInt16LE(p + 14), nOcupados = buf.readUInt32LE(p + 16), flags = buf.readUInt32LE(p + 20);
  p += 24;

  const paleta = [];
  for (let i = 0; i < nCores; i++){ paleta.push([buf[p], buf[p + 1], buf[p + 2]]); p += 3; }

  const nPares = buf.readUInt32LE(p); p += 4;
  const g = new Uint16Array(gx * gy * gz);
  let idx = 0;
  for (let i = 0; i < nPares; i++){
    const tamanhoDaRun = buf.readUInt16LE(p), corIdx = buf.readUInt16LE(p + 2); p += 4;
    if (corIdx) g.fill(corIdx, idx, idx + tamanhoDaRun);
    idx += tamanhoDaRun;
  }
  if (idx !== gx * gy * gz) console.error("aviso: RLE decodificou " + idx + " celulas, esperava " + (gx * gy * gz));

  return {cabecalho, gx, gy, gz, paleta, g, versao, flags, nOcupados};
}

if (require.main === module){
  const r = ler(process.argv[2]);
  console.log("grade " + r.gx + "x" + r.gy + "x" + r.gz, "cores " + r.paleta.length,
    "ocupados(cabecalho) " + r.nOcupados, "ocupados(contados) " + r.g.reduce((s, v) => s + (v ? 1 : 0), 0));
}
module.exports = {ler};
