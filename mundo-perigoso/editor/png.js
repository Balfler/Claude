/* ============================================================
   PNG SEM DEPENDENCIA
   ------------------------------------------------------------
   O molde do personagem sai daqui como PNG, e os desenhos feitos sobre ele
   voltam como PNG. O node ja traz o zlib, que e o que o formato usa por
   dentro; o resto e cabecalho, filtro por linha e CRC.

   codificar(largura, altura, rgba)  -> Buffer do arquivo, RGBA de 8 bits
   decodificar(buffer)               -> {largura, altura, rgba}

   A leitura aceita o que um editor de pixel art costuma gravar: RGBA, RGB,
   cinza com ou sem alfa, e paleta (1, 2, 4 ou 8 bits, com transparencia).
   Nao aceita PNG entrelacado nem de 16 bits.
   ============================================================ */
const zlib = require("zlib");

const TABELA_CRC = (function(){
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf){
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const ASSINATURA = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pedaco(tipo, dados){
  const cab = Buffer.alloc(8);
  cab.writeUInt32BE(dados.length, 0);
  cab.write(tipo, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([cab.subarray(4), dados])), 0);
  return Buffer.concat([cab, dados, crc]);
}

function codificar(largura, altura, rgba){
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const cru = Buffer.alloc((largura*4 + 1)*altura);
  for (let y = 0; y < altura; y++){
    cru[y*(largura*4 + 1)] = 0;                    // sem filtro
    for (let i = 0; i < largura*4; i++) cru[y*(largura*4 + 1) + 1 + i] = rgba[y*largura*4 + i];
  }
  return Buffer.concat([ASSINATURA, pedaco("IHDR", ihdr), pedaco("IDAT", zlib.deflateSync(cru, {level:9})),
                        pedaco("IEND", Buffer.alloc(0))]);
}

function paeth(a, b, c){
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodificar(buf){
  if (!buf.subarray(0, 8).equals(ASSINATURA)) throw new Error("nao e um PNG");
  let pos = 8, largura = 0, altura = 0, bits = 0, tipo = 0, entrelacado = 0;
  let paleta = null, transp = null;
  const idat = [];
  while (pos < buf.length){
    const len = buf.readUInt32BE(pos), nome = buf.toString("ascii", pos + 4, pos + 8), dados = buf.subarray(pos + 8, pos + 8 + len);
    if (nome === "IHDR"){
      largura = dados.readUInt32BE(0); altura = dados.readUInt32BE(4);
      bits = dados[8]; tipo = dados[9]; entrelacado = dados[12];
    }
    else if (nome === "PLTE") paleta = dados;
    else if (nome === "tRNS") transp = dados;
    else if (nome === "IDAT") idat.push(dados);
    else if (nome === "IEND") break;
    pos += 12 + len;
  }
  if (entrelacado) throw new Error("PNG entrelacado nao e aceito: grave sem entrelacamento");
  if (bits === 16) throw new Error("PNG de 16 bits nao e aceito: grave em 8 bits");
  const canais = {0:1, 2:3, 3:1, 4:2, 6:4}[tipo];
  if (!canais) throw new Error("tipo de cor de PNG desconhecido: " + tipo);
  const bitsPorPixel = canais*bits, porLinha = Math.ceil(largura*bitsPorPixel/8), passo = Math.max(1, bitsPorPixel >> 3);
  const cru = zlib.inflateSync(Buffer.concat(idat));
  const linhas = Buffer.alloc(porLinha*altura);
  for (let y = 0; y < altura; y++){
    const f = cru[y*(porLinha + 1)], de = y*(porLinha + 1) + 1, para = y*porLinha;
    for (let i = 0; i < porLinha; i++){
      const x = cru[de + i], a = i >= passo ? linhas[para + i - passo] : 0;
      const b = y > 0 ? linhas[para - porLinha + i] : 0, c = y > 0 && i >= passo ? linhas[para - porLinha + i - passo] : 0;
      linhas[para + i] = (f === 0 ? x : f === 1 ? x + a : f === 2 ? x + b : f === 3 ? x + ((a + b) >> 1) : x + paeth(a, b, c)) & 255;
    }
  }
  const rgba = new Uint8Array(largura*altura*4);
  const amostra = function(y, i){                  // o i-esimo valor da linha, com `bits` bits
    if (bits === 8) return linhas[y*porLinha + i];
    const bit = i*bits, byte = linhas[y*porLinha + (bit >> 3)];
    return (byte >> (8 - bits - (bit & 7))) & ((1 << bits) - 1);
  };
  const escala = bits === 8 ? 1 : 255/((1 << bits) - 1);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++){
    const o = (y*largura + x)*4;
    if (tipo === 6){ for (let k = 0; k < 4; k++) rgba[o + k] = amostra(y, x*4 + k); }
    else if (tipo === 2){
      const r = amostra(y, x*3), g = amostra(y, x*3 + 1), b = amostra(y, x*3 + 2);
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b;
      rgba[o + 3] = transp && transp.length >= 6 && r === transp.readUInt16BE(0) && g === transp.readUInt16BE(2) && b === transp.readUInt16BE(4) ? 0 : 255;
    }
    else if (tipo === 3){
      const k = amostra(y, x);
      rgba[o] = paleta[k*3]; rgba[o + 1] = paleta[k*3 + 1]; rgba[o + 2] = paleta[k*3 + 2];
      rgba[o + 3] = transp && k < transp.length ? transp[k] : 255;
    }
    else if (tipo === 0){
      const v = amostra(y, x), c = Math.round(v*escala);
      rgba[o] = rgba[o + 1] = rgba[o + 2] = c;
      rgba[o + 3] = transp && transp.length >= 2 && v === transp.readUInt16BE(0) ? 0 : 255;
    }
    else {                                          // cinza com alfa
      rgba[o] = rgba[o + 1] = rgba[o + 2] = amostra(y, x*2);
      rgba[o + 3] = amostra(y, x*2 + 1);
    }
  }
  return {largura:largura, altura:altura, rgba:rgba};
}

module.exports = {codificar, decodificar, crc32};
