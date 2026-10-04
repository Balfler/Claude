
/* ============================================================
   O CORPO COMPACTO
   ------------------------------------------------------------
   O .personagem de texto (PERSONAGEM 2) escreve cada quadro voxel a voxel,
   em corridas. Em 256 de altura sao 20 MB: nao cabe no jogo. O PERSONAGEM 3
   e o mesmo cabecalho (paleta, juntas de cada quadro) com as grades dos
   quadros, uma depois da outra, em bytes, comprimidas com deflate e escritas
   em base64 -- uns 8 MB no mesmo de 256, SEM PERDER NADA: cada voxel, por
   dentro tambem, volta igual (a copia para longe e o reamostrar olham o
   miolo).

   Quem comprime e o node (editor/compacto.js, com o zlib dele); aqui so se
   descomprime, sem depender do navegador: o inflate abaixo e o do formato
   (RFC 1951), sem nada de fora, e roda igual no jogo, no worker do forno e
   nos testes.
   ============================================================ */
const BASE64 = (function(){
  const t = new Int16Array(128).fill(-1), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < 64; i++) t[a.charCodeAt(i)] = i;
  return t;
})();
function deBase64(s){
  const o = new Uint8Array((s.length*3) >> 2);
  let n = 0, acc = 0, bits = 0;
  for (let i = 0; i < s.length; i++){
    const c = s.charCodeAt(i), v = c < 128 ? BASE64[c] : -1;
    if (v < 0) continue;                       // quebra de linha, '='
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8){ bits -= 8; o[n++] = (acc >> bits) & 255; }
  }
  return o.subarray(0, n);
}

/* ---------- o inflate ----------
   `saida` ja vem do tamanho certo (o cabecalho diz quantos quadros e a grade). */
const INFLATE = (function(){
  const BASE_COMP = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const EXTRA_COMP = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const BASE_DIST = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const EXTRA_DIST = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const ORDEM_CL = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
  /* a arvore de Huffman canonica: quantos codigos por tamanho e os simbolos em ordem */
  function arvore(tamanhos, n){
    const conta = new Uint16Array(16), simbolos = new Uint16Array(n), inicio = new Uint16Array(16);
    for (let i = 0; i < n; i++) conta[tamanhos[i]]++;
    conta[0] = 0;
    for (let i = 1; i < 16; i++) inicio[i] = inicio[i - 1] + conta[i - 1];
    for (let i = 0; i < n; i++) if (tamanhos[i]) simbolos[inicio[tamanhos[i]]++] = i;
    return {conta: conta, simbolos: simbolos};
  }
  const FIXA_LIT = (function(){ const t = new Uint8Array(288); t.fill(8, 0, 144); t.fill(9, 144, 256); t.fill(7, 256, 280); t.fill(8, 280, 288); return arvore(t, 288); })();
  const FIXA_DIST = (function(){ const t = new Uint8Array(30).fill(5); return arvore(t, 30); })();

  return function(dados, saida){
    let pos = 0, bitbuf = 0, nbits = 0, o = 0;
    function bit(){
      if (!nbits){ bitbuf = dados[pos++]; nbits = 8; }
      const b = bitbuf & 1; bitbuf >>= 1; nbits--;
      return b;
    }
    function bits(n){ let v = 0; for (let i = 0; i < n; i++) v |= bit() << i; return v; }
    function simbolo(a){
      let codigo = 0, primeiro = 0, indice = 0;
      for (let len = 1; len < 16; len++){
        codigo |= bit();
        const c = a.conta[len];
        if (codigo - primeiro < c) return a.simbolos[indice + codigo - primeiro];
        indice += c; primeiro += c; primeiro <<= 1; codigo <<= 1;
      }
      throw new Error("inflate: codigo invalido");
    }
    function bloco(lit, dist){
      for (;;){
        let s = simbolo(lit);
        if (s < 256){ saida[o++] = s; continue; }
        if (s === 256) return;
        s -= 257;
        const n = BASE_COMP[s] + bits(EXTRA_COMP[s]), d = simbolo(dist), volta = BASE_DIST[d] + bits(EXTRA_DIST[d]);
        for (let i = 0; i < n; i++, o++) saida[o] = saida[o - volta];
      }
    }
    let fim = 0;
    do {
      fim = bit();
      const tipo = bits(2);
      if (tipo === 0){
        nbits = 0;                                     // alinha no byte
        const n = dados[pos] | (dados[pos + 1] << 8);
        pos += 4;
        saida.set(dados.subarray(pos, pos + n), o); pos += n; o += n;
      } else if (tipo === 1) bloco(FIXA_LIT, FIXA_DIST);
      else if (tipo === 2){
        const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4, t = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) t[ORDEM_CL[i]] = bits(3);
        const cl = arvore(t, 19), tam = new Uint8Array(hlit + hdist);
        for (let i = 0; i < hlit + hdist;){
          const s = simbolo(cl);
          if (s < 16) tam[i++] = s;
          else {
            let rep = 0, v = 0;
            if (s === 16){ v = tam[i - 1]; rep = 3 + bits(2); }
            else if (s === 17) rep = 3 + bits(3);
            else rep = 11 + bits(7);
            while (rep--) tam[i++] = v;
          }
        }
        bloco(arvore(tam.subarray(0, hlit), hlit), arvore(tam.subarray(hlit), hdist));
      } else throw new Error("inflate: bloco de tipo 3");
    } while (!fim);
    return o;
  };
})();

/* As grades do PERSONAGEM 3: o texto em base64 vira os quadros, na ordem do
   cabecalho, cada um uma vista do mesmo buffer. */
function gradesCompactas(texto, n, DX, DY, DZ){
  const N = DX*DY*DZ, tudo = new Uint8Array(n*N), lidos = INFLATE(deBase64(texto), tudo);
  if (lidos !== n*N) throw new Error("corpo compacto: " + lidos + " bytes, esperava " + n*N);
  const g = [];
  for (let i = 0; i < n; i++) g.push(tudo.subarray(i*N, (i + 1)*N));
  return g;
}
if (typeof module !== "undefined") module.exports = {deBase64: deBase64, INFLATE: INFLATE, gradesCompactas: gradesCompactas};
