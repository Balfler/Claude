/* ============================================================
   ATELIE -- O MODELO PARA A PLACA DE VIDEO
   ------------------------------------------------------------
   O personagem desenhado pela placa (src/gpu.js) nao usa sprite: usa o corpo
   do atelie com o peso de osso, e a placa posa e desenha cada voxel a cada
   quadro. Este arquivo escreve o que ela precisa, num texto so (GPU 1):

     GPU 1
     nome guerreiro
     niveis 2                         (a altura cheia e uma mais leve, para longe)
     [nivel 256]
     grade DX DY DZ CX CY             (a grade do jogo nessa altura)
     cores N  rrggbb ...
     pivos 13  x y z ...              (o pivo de cada osso, na ordem de OSSOS)
     quadros 20
     <nome> raiz x y z  rot w x y z (13 vezes)
     voxels N
     <base64 de deflate: N x 12 bytes -- x y z (int16), normal (int8 x 3),
      cor (uint8, de 1), osso a, osso b (uint8), peso de a (uint8, 0 a 255)>

   So vai a casca do corpo, ate 2 voxels de fundo: o miolo nunca aparece, e a
   segunda camada tapa a fresta que a dobra abre na junta. A normal e a soma
   das direcoes vazias em volta, como a do assador.

   O miolo da junta tambem vai (3/10): perto de outro osso, o giro abre o
   corpo (o ombro, com o braco balancando) e la dentro so havia o oco. Ele vai
   com a normal zero, e a placa acende como se encarasse a camera.

   Uso: node mundo-perigoso/atelie/cli.js gpu <projeto.atelie> [--alturas 256,117]
   ============================================================ */
"use strict";
const zlib = require("zlib");
const N = require("./nucleo.js"), C = require("./corpo.js"), Df = require("./deformar.js"), An = require("./animacao.js");
const Rs = require("./resolucao.js");

/* ate quantos voxels de outro osso o miolo vai (3/10: com 3, nenhum dos 20
   quadros abre buraco de lado nenhum; com 2 ainda sobra oco no ombro) */
const MIOLO_DA_JUNTA = 3;

const hex = c => c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const num = v => +v.toFixed(3);

function nivelDoProjeto(p, altura){
  const c = p.corpo, P = Df.peleDoCorpo(c), n = P.n;
  const cheio = (x, y, z) => C.corEm(c, x, y, z) !== 0;
  const linhas = [], escolhidos = [];
  const nor = new Int8Array(n*3);
  /* o miolo perto de outro osso: e a fatia entre o braco e o tronco (e as
     outras juntas) que o giro abre; sem ela, o ombro vira um oco */
  const dono = k => P.w[k] >= 0.5 ? P.a[k] : P.b[k];
  function noMioloDaJunta(k){
    const x = P.pos[k*3], y = P.pos[k*3 + 1], z = P.pos[k*3 + 2], d = dono(k), R = MIOLO_DA_JUNTA;
    for (let dz = -R; dz <= R; dz++) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++){
      const ci = C.celula(c, x + dx, y + dy, z + dz), j = ci < 0 ? -1 : P.indice[ci];
      if (j >= 0 && dono(j) !== d) return true;
    }
    return false;
  }
  for (let k = 0; k < n; k++){
    const x = P.pos[k*3], y = P.pos[k*3 + 1], z = P.pos[k*3 + 2];
    /* a normal: as direcoes vazias no cubo de 3, e no de 5 se o de 3 for cheio */
    let nx = 0, ny = 0, nz = 0, perto = false;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      if ((dx || dy || dz) && !cheio(x + dx, y + dy, z + dz)){ const l = Math.hypot(dx, dy, dz); nx += dx/l; ny += dy/l; nz += dz/l; perto = true; }
    if (!perto){
      let fundo = false;
      for (let dz = -2; dz <= 2; dz++) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
        if ((Math.abs(dx) === 2 || Math.abs(dy) === 2 || Math.abs(dz) === 2) && !cheio(x + dx, y + dy, z + dz)){ const l = Math.hypot(dx, dy, dz); nx += dx/l; ny += dy/l; nz += dz/l; fundo = true; }
      if (!fundo){
        if (!noMioloDaJunta(k)) continue;        // miolo: nunca aparece
        escolhidos.push(k);                      // normal zero: a placa acende de frente
        continue;
      }
    }
    const L = Math.hypot(nx, ny, nz) || 1;
    nor[k*3] = Math.round(nx/L*127); nor[k*3 + 1] = Math.round(ny/L*127); nor[k*3 + 2] = Math.round(nz/L*127);
    escolhidos.push(k);
  }
  const buf = Buffer.alloc(escolhidos.length*12);
  escolhidos.forEach(function(k, i){
    const o = i*12;
    buf.writeInt16LE(P.pos[k*3], o); buf.writeInt16LE(P.pos[k*3 + 1], o + 2); buf.writeInt16LE(P.pos[k*3 + 2], o + 4);
    buf.writeInt8(nor[k*3], o + 6); buf.writeInt8(nor[k*3 + 1], o + 7); buf.writeInt8(nor[k*3 + 2], o + 8);
    buf[o + 9] = P.cor[k]; buf[o + 10] = P.a[k] | (P.b[k] << 4); buf[o + 11] = Math.round(P.w[k]*255);
  });
  const G = N.GRADE, CE = N.CENTRO, quadros = An.quadrosDoProjeto(p.animacoes);
  linhas.push("[nivel " + altura + "]", "grade " + [G.DX, G.DY, G.DZ, CE.CX, CE.CY].join(" "),
              "cores " + c.paleta.length + " " + c.paleta.map(hex).join(" "),
              "pivos " + N.OSSOS.length + " " + N.OSSOS.map(o => p.juntas[o.pivo].map(num).join(" ")).join(" "),
              "quadros " + quadros.length);
  for (const q of quadros){
    linhas.push(q.nome + " raiz " + q.pose.raiz.map(num).join(" ") + " rot " +
                N.OSSOS.map(o => (q.pose.rot[o.nome] || [1, 0, 0, 0]).map(v => +v.toFixed(5)).join(" ")).join(" "));
  }
  const b64 = zlib.deflateRawSync(buf, {level: 9}).toString("base64"), partes = [];
  for (let i = 0; i < b64.length; i += 1000) partes.push(b64.slice(i, i + 1000));
  linhas.push("voxels " + escolhidos.length);
  return {linhas: linhas.concat(partes), voxels: escolhidos.length, de: n};
}

/* o texto GPU 1 de um projeto, nas alturas pedidas (a primeira e a cheia) */
function exportarGpu(proj, alturas){
  const L = ["GPU 1", "nome " + proj.nome, "niveis " + alturas.length], info = [];
  for (const h of alturas){
    const K = h/117;
    const voltar = Rs.usarResolucao(K);
    try {
      const p = K === 1 ? proj : Rs.projetoEm(proj, K);
      const r = nivelDoProjeto(p, h);
      L.push.apply(L, r.linhas);
      info.push(h + ": " + r.voxels + " de " + r.de + " voxels");
    } finally { voltar(); }
  }
  return {texto: L.join("\n") + "\n", info: info};
}

module.exports = {exportarGpu};
