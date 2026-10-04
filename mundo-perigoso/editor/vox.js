/* ============================================================
   EXPORTADOR .VOX (MAGICAVOXEL)
   ------------------------------------------------------------
   Grava uma grade de voxels no formato do MagicaVoxel, para abrir e
   esculpir por cima com as ferramentas de la -- sem depender de nenhuma
   biblioteca, do mesmo jeito que editor/png.js grava PNG na mao.

   O formato e uma serie de "pedacos" (chunks): cabecalho "VOX " + versao,
   depois um pedaco MAIN que so serve de envelope para os filhos -- SIZE (as
   tres dimensoes), XYZI (a lista de voxels, x/y/z/cor de 0 a 255) e RGBA (a
   paleta de 256 cores; a cor do indice de voxel i mora na posicao i-1 desta
   lista, porque o indice 0 e "vazio" e nunca e gravado).

   O eixo Z do MagicaVoxel e para cima, que e o mesmo Z do jogo -- os eixos
   nao precisam girar.
   ============================================================ */

function pedaco(id, conteudo, filhos){
  filhos = filhos || Buffer.alloc(0);
  const cab = Buffer.alloc(12);
  cab.write(id, 0, 4, "ascii");
  cab.writeInt32LE(conteudo.length, 4);
  cab.writeInt32LE(filhos.length, 8);
  return Buffer.concat([cab, conteudo, filhos]);
}

/* dim: {DX, DY, DZ}. voxels: Uint8Array DX*DY*DZ, indice de 0 (vazio) a 255,
   na mesma ordem (z*DY+y)*DX+x que o resto do jogo usa. paleta: lista de
   [r,g,b] por indice de material (posicao 0 da lista = material 1). */
function codificar(dim, voxels, paleta){
  const DX = dim.DX, DY = dim.DY, DZ = dim.DZ;

  const tamanho = pedaco("SIZE", (function(){
    const b = Buffer.alloc(12);
    b.writeInt32LE(DX, 0); b.writeInt32LE(DY, 4); b.writeInt32LE(DZ, 8);
    return b;
  })());

  const lista = [];
  for (let z = 0; z < DZ; z++) for (let y = 0; y < DY; y++) for (let x = 0; x < DX; x++){
    const v = voxels[(z*DY + y)*DX + x];
    if (v) lista.push(x, y, z, v);
  }
  const xyziConteudo = Buffer.alloc(4 + lista.length);
  xyziConteudo.writeInt32LE(lista.length/4, 0);
  for (let i = 0; i < lista.length; i++) xyziConteudo[4 + i] = lista[i];
  const xyzi = pedaco("XYZI", xyziConteudo);

  const rgbaConteudo = Buffer.alloc(256*4);
  for (let i = 0; i < 255; i++){
    const c = paleta[i] || [0, 0, 0];
    rgbaConteudo[i*4] = c[0]; rgbaConteudo[i*4 + 1] = c[1]; rgbaConteudo[i*4 + 2] = c[2]; rgbaConteudo[i*4 + 3] = 255;
  }
  const rgba = pedaco("RGBA", rgbaConteudo);

  const main = pedaco("MAIN", Buffer.alloc(0), Buffer.concat([tamanho, xyzi, rgba]));
  const cabecalho = Buffer.alloc(8);
  cabecalho.write("VOX ", 0, 4, "ascii");
  cabecalho.writeInt32LE(150, 4);
  return Buffer.concat([cabecalho, main]);
}

/* le um .vox de volta -- so o essencial (um modelo, SIZE+XYZI+RGBA), para
   trazer de volta o que foi esculpido no MagicaVoxel */
function decodificar(buf){
  if (buf.toString("ascii", 0, 4) !== "VOX ") throw new Error("nao e um arquivo .vox");
  let dim = null, lista = null, paleta = null;
  function lerChunks(inicio, fim){
    let p = inicio;
    while (p < fim){
      const id = buf.toString("ascii", p, p + 4);
      const nConteudo = buf.readInt32LE(p + 4), nFilhos = buf.readInt32LE(p + 8);
      const cIni = p + 12, cFim = cIni + nConteudo, fFim = cFim + nFilhos;
      if (id === "SIZE") dim = {DX: buf.readInt32LE(cIni), DY: buf.readInt32LE(cIni + 4), DZ: buf.readInt32LE(cIni + 8)};
      else if (id === "XYZI"){
        const n = buf.readInt32LE(cIni);
        lista = [];
        for (let i = 0; i < n; i++){
          const o = cIni + 4 + i*4;
          lista.push([buf[o], buf[o + 1], buf[o + 2], buf[o + 3]]);
        }
      } else if (id === "RGBA"){
        paleta = [];
        for (let i = 0; i < 255; i++) paleta.push([buf[cIni + i*4], buf[cIni + i*4 + 1], buf[cIni + i*4 + 2]]);
      }
      if (nFilhos > 0) lerChunks(cFim, fFim);
      p = fFim;
    }
  }
  lerChunks(20, buf.length);        // pula "VOX " + versao (8) + o cabecalho do MAIN, sem conteudo (12)
  if (!dim || !lista) throw new Error("arquivo .vox sem SIZE ou XYZI");
  const g = new Uint8Array(dim.DX*dim.DY*dim.DZ);
  for (const [x, y, z, c] of lista){
    if (x < 0 || y < 0 || z < 0 || x >= dim.DX || y >= dim.DY || z >= dim.DZ) continue;
    g[(z*dim.DY + y)*dim.DX + x] = c;
  }
  return {dim: dim, g: g, paleta: paleta};
}

module.exports = {codificar, decodificar};
