/* ============================================================
   O .personagem COMPACTO -- o lado que comprime (node)
   ------------------------------------------------------------
   PERSONAGEM 2 (texto, corridas de voxel por quadro) vira PERSONAGEM 3: o
   mesmo cabecalho, sem as secoes [voxels], e no fim uma secao [binario] com
   as grades de todos os quadros em bytes, na ordem dos quadros, deflate e
   base64. Sem perda: lerPersonagem (src/p3e.js) devolve os mesmos voxels.
   Quem descomprime e o src/compacto.js.

   Uso: node mundo-perigoso/editor/compacto.js <entrada.personagem> [saida.personagem]
        (sem saida, grava por cima)
   ============================================================ */
"use strict";
const fs = require("fs"), zlib = require("zlib");

/* le as grades do texto (o mesmo leitor do jogo, so a parte das corridas) */
function compactarPersonagem(texto){
  const L = String(texto).replace(/\r\n/g, "\n").split("\n");
  const versao = +((L[0].match(/^PERSONAGEM (\d+)/) || [])[1] || 0);
  if (versao === 3) return String(texto);
  if (versao !== 2) throw new Error("so PERSONAGEM 2 se compacta");
  let DX = 0, DY = 0, DZ = 0, g = null, k = 0;
  const cabeca = ["PERSONAGEM 3"], grades = [];
  for (let i = 1; i < L.length; i++){
    const l = L[i].trim();
    if (!l) continue;
    if (l.charAt(0) === "["){
      if (l === "[voxels]"){ g = new Uint8Array(DX*DY*DZ); k = 0; grades.push(g); continue; }
      g = null;
      cabeca.push(l);
      continue;
    }
    if (g){
      for (const t of l.split(/\s+/)){
        const e = t.indexOf("*"), v = parseInt(e < 0 ? t : t.slice(0, e), 36), n = e < 0 ? 1 : parseInt(t.slice(e + 1), 36);
        if (v) g.fill(v, k, Math.min(g.length, k + n));
        k += n;
      }
      continue;
    }
    const p = l.split(/\s+/);
    if (p[0] === "grade"){ DX = +p[1]; DY = +p[2]; DZ = +p[3]; }
    if (p[0] === "cores"){ cabeca.push(l, (L[++i] || "").trim()); continue; }
    cabeca.push(l);
  }
  const N = DX*DY*DZ, tudo = new Uint8Array(grades.length*N);
  grades.forEach((x, i) => tudo.set(x, i*N));
  const b64 = zlib.deflateRawSync(tudo, {level: 9}).toString("base64");
  const linhas = [];
  for (let i = 0; i < b64.length; i += 1000) linhas.push(b64.slice(i, i + 1000));
  return cabeca.concat(["[binario]"], linhas).join("\n") + "\n";
}

if (require.main === module){
  const [ent, sai] = process.argv.slice(2);
  if (!ent){ console.log("uso: compacto.js <entrada.personagem> [saida.personagem]"); process.exit(1); }
  const t = fs.readFileSync(ent, "utf8"), c = compactarPersonagem(t);
  fs.writeFileSync(sai || ent, c);
  console.log((Buffer.byteLength(t)/1e6).toFixed(2) + " MB -> " + (Buffer.byteLength(c)/1e6).toFixed(2) + " MB");
}
module.exports = {compactarPersonagem};
