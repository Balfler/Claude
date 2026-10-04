/* ============================================================
   ATELIE -- A PELE POSADA
   ------------------------------------------------------------
   Leva o corpo da bind pose para uma pose, na grade do jogo (80x56x117).

   Cada voxel mistura o giro dos seus dois ossos por quaternio dual (dual
   quaternion skinning), e nao por media de matriz: a media de matriz encolhe
   a junta dobrada (o "embrulho de bala" no cotovelo, o ombro murcho), o
   quaternio dual gira em volta da junta e guarda o volume.

   A grade de saida e preenchida nos dois sentidos:
   - para a frente: o centro de cada voxel posado marca a celula onde cai;
   - de volta: cada celula vazia em volta dele pergunta ao voxel "eu estou
     dentro do teu cubo, girado?" -- desfazendo o giro do proprio voxel, a
     conta e exata. Se o cubo desfeito cai num vizinho, pergunta a ele.
   Assim a pele esticada nao fura (so a ida deixaria buraco onde a junta
   abre) e nada engorda (espalhar amostras de meio voxel, como o jogo fazia,
   engordava a silhueta onde o osso girava -- era parte do braco inchado).
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof voxelsDoCorpo === "undefined"){
  const M = require("./corpo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof posarEsqueleto === "undefined"){
  const M = require("./rig.js");
  for (const k in M) globalThis[k] = M[k];
}

/* a pele pronta para posar: posicao, cor e peso de cada voxel; guardada
   ate o corpo mudar */
function peleDoCorpo(c){
  if (c._pele && c._pele.versao === c.versao) return c._pele;
  const lista = voxelsDoCorpo(c), n = lista.length;
  const pos = new Int16Array(n*3), cor = new Uint8Array(n), a = new Uint8Array(n), b = new Uint8Array(n), w = new Float32Array(n);
  const indice = new Int32Array(c.cor.length).fill(-1);
  for (let k = 0; k < n; k++){
    const i = lista[k], p = posicaoDaCelula(c, i);
    pos[k*3] = p[0]; pos[k*3 + 1] = p[1]; pos[k*3 + 2] = p[2];
    cor[k] = c.cor[i]; a[k] = c.a[i]; b[k] = c.b[i]; w[k] = c.w[i]/255;
    indice[i] = k;
  }
  c._pele = {versao: c.versao, n: n, pos: pos, cor: cor, a: a, b: b, w: w, indice: indice};
  return c._pele;
}

/* Posa o corpo. Devolve a grade do jogo (cor por celula, 0 vazio), a
   posicao posada de cada voxel (para medir), quantos voxels cairam fora da
   grade e as juntas posadas. `opcoes.rigido` poe cada voxel so no osso que
   mais manda nele -- o giro duro de antes, que a validacao usa de regua.
   `opcoes.soPosicoes` nao monta a grade: so as posicoes posadas. */
function posarCorpo(c, juntas, pose, opcoes){
  opcoes = opcoes || {};
  const D = opcoes.grade || GRADE, DX = D.DX, DY = D.DY, DZ = D.DZ;
  const P = peleDoCorpo(c), n = P.n, s = posarEsqueleto(juntas, pose);
  /* o quaternio dual de cada osso: real q, dual 0.5*(0,t)*q */
  const NB = OSSOS.length, dq = new Float64Array(NB*8);
  for (let o = 0; o < NB; o++){
    const q = s.q[o], t = s.t[o], d = qMul([0, t[0], t[1], t[2]], q);
    dq.set([q[0], q[1], q[2], q[3], 0.5*d[0], 0.5*d[1], 0.5*d[2], 0.5*d[3]], o*8);
  }
  /* por voxel: matriz de giro (9) e translacao (3) da mistura */
  const M = new Float32Array(n*12), posada = new Float32Array(n*3);
  const g = opcoes.soPosicoes ? null : new Uint8Array(DX*DY*DZ);
  let fora = 0;
  for (let k = 0; k < n; k++){
    const ia = P.a[k]*8, ib = P.b[k]*8;
    let wa = opcoes.rigido ? (P.w[k] >= 0.5 ? 1 : 0) : P.w[k], wb = 1 - wa;
    if (dq[ia]*dq[ib] + dq[ia + 1]*dq[ib + 1] + dq[ia + 2]*dq[ib + 2] + dq[ia + 3]*dq[ib + 3] < 0) wb = -wb;
    let rw = wa*dq[ia] + wb*dq[ib], rx = wa*dq[ia + 1] + wb*dq[ib + 1], ry = wa*dq[ia + 2] + wb*dq[ib + 2], rz = wa*dq[ia + 3] + wb*dq[ib + 3];
    let dw = wa*dq[ia + 4] + wb*dq[ib + 4], dx = wa*dq[ia + 5] + wb*dq[ib + 5], dy = wa*dq[ia + 6] + wb*dq[ib + 6], dz = wa*dq[ia + 7] + wb*dq[ib + 7];
    const L = Math.hypot(rw, rx, ry, rz) || 1;
    rw /= L; rx /= L; ry /= L; rz /= L; dw /= L; dx /= L; dy /= L; dz /= L;
    /* t = 2 * d * conj(r), parte vetorial */
    const tx = 2*(-dw*rx + dx*rw - dy*rz + dz*ry);
    const ty = 2*(-dw*ry + dx*rz + dy*rw - dz*rx);
    const tz = 2*(-dw*rz - dx*ry + dy*rx + dz*rw);
    const o = k*12;
    M[o]     = 1 - 2*(ry*ry + rz*rz); M[o + 1] = 2*(rx*ry - rz*rw);     M[o + 2] = 2*(rx*rz + ry*rw);
    M[o + 3] = 2*(rx*ry + rz*rw);     M[o + 4] = 1 - 2*(rx*rx + rz*rz); M[o + 5] = 2*(ry*rz - rx*rw);
    M[o + 6] = 2*(rx*rz - ry*rw);     M[o + 7] = 2*(ry*rz + rx*rw);     M[o + 8] = 1 - 2*(rx*rx + ry*ry);
    M[o + 9] = tx; M[o + 10] = ty; M[o + 11] = tz;
    const px = P.pos[k*3], py = P.pos[k*3 + 1], pz = P.pos[k*3 + 2];
    const cx = M[o]*px + M[o + 1]*py + M[o + 2]*pz + tx, cy = M[o + 3]*px + M[o + 4]*py + M[o + 5]*pz + ty, cz = M[o + 6]*px + M[o + 7]*py + M[o + 8]*pz + tz;
    posada[k*3] = cx; posada[k*3 + 1] = cy; posada[k*3 + 2] = cz;
    const gx = Math.round(cx), gy = Math.round(cy), gz = Math.round(cz);
    if (gx < 0 || gy < 0 || gz < 0 || gx >= DX || gy >= DY || gz >= DZ){ fora++; continue; }
    if (g) g[(gz*DY + gy)*DX + gx] = P.cor[k];
  }
  /* a volta: a celula vazia perto de um voxel posado e dele se cai dentro do cubo dele */
  function dentro(k, x, y, z){
    const o = k*12, qx = x - M[o + 9], qy = y - M[o + 10], qz = z - M[o + 11];
    return [M[o]*qx + M[o + 3]*qy + M[o + 6]*qz, M[o + 1]*qx + M[o + 4]*qy + M[o + 7]*qz, M[o + 2]*qx + M[o + 5]*qy + M[o + 8]*qz];
  }
  if (g) for (let k = 0; k < n; k++){
    const bx = Math.round(posada[k*3]), by = Math.round(posada[k*3 + 1]), bz = Math.round(posada[k*3 + 2]);
    for (let ez = -1; ez <= 1; ez++) for (let ey = -1; ey <= 1; ey++) for (let ex = -1; ex <= 1; ex++){
      const x = bx + ex, y = by + ey, z = bz + ez;
      if (x < 0 || y < 0 || z < 0 || x >= DX || y >= DY || z >= DZ) continue;
      const gi = (z*DY + y)*DX + x;
      if (g[gi]) continue;
      let p = dentro(k, x, y, z);
      let ux = Math.round(p[0]), uy = Math.round(p[1]), uz = Math.round(p[2]);
      if (ux === P.pos[k*3] && uy === P.pos[k*3 + 1] && uz === P.pos[k*3 + 2]){ g[gi] = P.cor[k]; continue; }
      const ci = celula(c, ux, uy, uz), j = ci < 0 ? -1 : P.indice[ci];
      if (j < 0) continue;
      p = dentro(j, x, y, z);
      if (Math.round(p[0]) === P.pos[j*3] && Math.round(p[1]) === P.pos[j*3 + 1] && Math.round(p[2]) === P.pos[j*3 + 2]) g[gi] = P.cor[j];
    }
  }
  return {g: g, posada: posada, fora: fora, juntas: s.juntas, esqueleto: s};
}

if (typeof module !== "undefined") module.exports = {peleDoCorpo, posarCorpo};
