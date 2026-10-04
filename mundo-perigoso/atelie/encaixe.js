/* ============================================================
   ATELIE -- CABER NO JOGO
   ------------------------------------------------------------
   Toda pose que vai para o jogo -- escrita, capturada ou feita no painel --
   tem duas amarras que nao sao dela:

   - a grade de 80x56x117: o que passa dela o jogo corta sem avisar. A
     grade so tem 28 voxels na frente do meio do corpo, e o topo da cabeca
     parada ja encosta no teto, entao a fase de voo de uma corrida capturada
     tira a cabeca da grade;
   - a arma na mao D: as armas do jogo nao giram com a mao (a lamina da
     espada sobe 52 voxels a partir dela), entao a mao tem um lugar
     (LUGAR_DA_MAO_DA_ARMA, em nucleo.js) fora do qual a arma sai cortada;
   - as pecas de cabeca: elmo, capuz, cabelo e pena seguem a junta da cabeca
     e sao maiores que ela, entao a junta tem um lugar (LUGAR_DA_CABECA) --
     a cabeca inclinada da corrida e a do voo saem dele antes de o corpo sair
     da grade.

   caberNoJogo resolve as duas mexendo o minimo: primeiro so encaixa (move
   a bacia na horizontal, e desce o corpo se a cabeca vaza, sem enfiar o pe
   no chao); se nao bastar, amortece -- a pose inteira na direcao do parado
   so o bastante para caber na grade, e depois so os bracos para a mao da
   arma ficar no lugar, para uma arma comprida nao encolher a perna. E a
   busca que troca o numero magico de amortecimento de braco que o jogo
   tinha (ARMA_MOCAP = 0.55).
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof posarEsqueleto === "undefined"){
  const M = require("./rig.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof posarCorpo === "undefined"){
  const M = require("./deformar.js");
  for (const k in M) globalThis[k] = M[k];
}

/* Onde a junta da cabeca pode ficar para as pecas de cabeca do jogo caberem
   na grade: elas seguem a junta e vao de 17 para cada lado, 18 para a frente
   (os olhos do capuz) e 25 para tras (a pena), e 16 para cima (elmo, cabelo,
   capuz). Uma cabeca inclinada na corrida, ou subindo no voo, passa disso
   antes de o corpo passar da grade. */
const LUGAR_DA_CABECA = {xMin: 17, xMax: 62, yMin: 16, yMax: 32, zMax: 101.5};
/* o intervalo de deslocamento da bacia, por eixo, que deixa a cabeca no lugar */
function folgaDaCabeca(posadas){
  const c = posadas.cabeca, L = LUGAR_DA_CABECA;
  return [[L.xMin - c[0], L.xMax - c[0]], [L.yMin - c[1], L.yMax - c[1]], [-Infinity, L.zMax - c[2]]];
}
/* Encaixa o quadro na grade mexendo a bacia so o que precisar: um voxel de
   deslocamento nao se ve, um pe cortado se ve. Na vertical nunca poe a sola
   abaixo do chao: se a cabeca vaza (ou sobe demais para as pecas) e o pe ja
   esta no chao, fica para o amortecimento. */
function encaixarNaGrade(corpo, juntas, pose){
  const r = posarCorpo(corpo, juntas, pose, {soPosicoes: true}), P = peleDoCorpo(corpo);
  const m = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let k = 0; k < P.n; k++) for (let e = 0; e < 3; e++){
    const v = r.posada[k*3 + e];
    if (v < m[e]) m[e] = v;
    if (v > m[3 + e]) m[3 + e] = v;
  }
  const cab = folgaDaCabeca(r.juntas);
  function ajuste(min, max, tam, centrar, faixa){
    /* entre lo e hi: a grade (a folga cobre o arredondamento do Float32) e a cabeca */
    const lo = Math.max(-0.45 - min, faixa[0]), hi = Math.min(tam - 0.55 - max, faixa[1]);
    if (lo <= 0 && hi >= 0) return 0;
    if (lo > hi) return centrar ? (lo + hi)/2 : Math.max(0, lo);
    return lo > 0 ? lo : hi;
  }
  const nova = copiarPose(pose);
  nova.raiz[0] += ajuste(m[0], m[3], GRADE.DX, true, cab[0]);
  nova.raiz[1] += ajuste(m[1], m[4], GRADE.DY, true, cab[1]);
  nova.raiz[2] += ajuste(m[2], m[5], GRADE.DZ, false, cab[2]);
  return nova;
}
/* o corpo dentro da grade e sem subir demais; a mao da arma no lugar dela
   (as duas maos, se o quadro tem espelho no ciclo) */
function corpoCabe(corpo, juntas, p){
  const r = posarCorpo(corpo, juntas, p, {soPosicoes: true});
  return !r.fora && folgaDaCabeca(r.juntas).every(function(f){ return f[0] <= 0.05 && f[1] >= -0.05; });
}
function maoCabe(juntas, p, animacao, espelhado){
  const s = posarEsqueleto(juntas, p).juntas;
  return maoNoLugarDaArma(s.maoD, "D", animacao) && (!espelhado || maoNoLugarDaArma(s.maoE, "E", animacao));
}
/* o maior k entre 0 e 1 que ainda passa no teste (busca binaria) */
function maiorQuePassa(teste){
  if (teste(1)) return 1;
  let lo = 0, hi = 1;
  for (let it = 0; it < 8; it++){ const k = (lo + hi)/2; if (teste(k)) lo = k; else hi = k; }
  return lo;
}
/* `montar(k, kBraco, kPerna, kTronco)` monta a pose com a forca k (1 e a
   pose inteira, 0 o parado), os bracos com k*kBraco, as pernas com k*kPerna
   e bacia, tronco e cabeca com k*kTronco. A busca vai por grupo e mexe o
   minimo: se o corpo nao cabe, tenta encolher so as pernas (uma passada de
   corrida de verdade e mais comprida que os 56 voxels de fundo da grade) e
   so o tronco (uma cabeca inclinada demais leva o capuz para fora), e fica
   com o que precisou encolher menos; so se nenhum dos dois bastar, o corpo
   inteiro. Por fim so os bracos, para a mao da arma. Devolve a pose que
   cabe, encaixada; se precisou amortecer, ela leva `amortecido: {corpo,
   pernas, tronco, bracos}`. */
const OSSOS_DO_BRACO = ["bracoE", "antebracoE", "bracoD", "antebracoD"];
const OSSOS_DA_PERNA = ["coxaE", "canelaE", "peE", "coxaD", "canelaD", "peD"];
const OSSOS_DO_TRONCO = ["bacia", "tronco", "cabeca"];
function caberNoJogo(corpo, juntas, montar, animacao, espelhado){
  const pronta = function(k, kb, kp, kt){ return encaixarNaGrade(corpo, juntas, montar(k, kb, kp, kt)); };
  const cabe = function(k, kp, kt){ return corpoCabe(corpo, juntas, pronta(k, 1, kp, kt)); };
  let k = 1, kp = 1, kt = 1;
  if (!cabe(1, 1, 1)){
    const soPerna = maiorQuePassa(function(v){ return cabe(1, v, 1); }), soTronco = maiorQuePassa(function(v){ return cabe(1, 1, v); });
    const pernaServe = soPerna > 0 || cabe(1, 0, 1), troncoServe = soTronco > 0 || cabe(1, 1, 0);
    if (pernaServe && (!troncoServe || soPerna >= soTronco)) kp = soPerna;
    else if (troncoServe) kt = soTronco;
    else k = maiorQuePassa(function(v){ return cabe(v, 1, 1); });
  }
  const kb = maiorQuePassa(function(kb){ const p = pronta(k, kb, kp, kt); return maoCabe(juntas, p, animacao, espelhado) && corpoCabe(corpo, juntas, p); });
  const p = pronta(k, kb, kp, kt);
  if (k < 1 || kb < 1 || kp < 1 || kt < 1)
    p.amortecido = {corpo: Math.round(k*100)/100, pernas: Math.round(kp*100)/100, tronco: Math.round(kt*100)/100, bracos: Math.round(kb*100)/100};
  return p;
}
/* Uma pose qualquer (capturada, feita no painel) cabendo no jogo: amortecer
   e misturar com o parado por giro (slerp), e a sola fica onde estava -- no
   chao se estava no chao, e no ar encolhe junto. */
function caberPose(corpo, juntas, repouso, pose, animacao, espelhado){
  const h0 = alturaDasSolas(juntas, posarEsqueleto(juntas, pose));
  return caberNoJogo(corpo, juntas, function(k, kb, kp, kt){
    const p = {raiz: vEntre(repouso.raiz, pose.raiz, k), rot: {}};
    for (const o of OSSOS){
      const t = k*(OSSOS_DO_BRACO.indexOf(o.nome) >= 0 ? kb : OSSOS_DA_PERNA.indexOf(o.nome) >= 0 ? kp : OSSOS_DO_TRONCO.indexOf(o.nome) >= 0 ? kt : 1);
      p.rot[o.nome] = qSlerp(repouso.rot[o.nome] || Q_ID, pose.rot[o.nome] || Q_ID, t);
    }
    return apoiarNoChao(juntas, p, h0 < 0.75 ? 0 : h0*k);
  }, animacao, espelhado);
}

if (typeof module !== "undefined") module.exports = {LUGAR_DA_CABECA, folgaDaCabeca, encaixarNaGrade, corpoCabe, maoCabe, maiorQuePassa, OSSOS_DO_BRACO, OSSOS_DA_PERNA, OSSOS_DO_TRONCO, caberNoJogo, caberPose};
