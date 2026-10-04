/* ============================================================
   ATELIE -- AS ANIMACOES ESCRITAS
   ------------------------------------------------------------
   Poses escritas a mao, em angulo anatomico sobre o parado (ver
   girarOsso, em rig.js), para o que nunca teve captura de movimento:
   correr, pulo, atacar com arma na mao, conjurar e a respiracao. Nao
   dependem da proporcao do corpo -- servem para qualquer rig.

   Cada quadro: {osso: [frente, abrir, torcer]} e, fora dos ossos,
   `chao` (quanto a sola mais baixa fica acima do chao, em voxels; null e
   deixar a bacia onde esta),
   `raiz` (deslocamento extra da bacia), `alvoMaoE` (onde a mao E vai, por
   IK) e `espelho` (o quadro e o espelho de outro, pelo indice).

   Frente positivo leva a frente (braco, coxa, tronco que inclina, cabeca
   que baixa); na canela, frente negativo dobra o joelho; no antebraco,
   frente positivo dobra o cotovelo. No pe, o numero e so um: quanto a ponta
   sobe em relacao ao chao (negativo aponta para baixo). Abrir positivo
   afasta do corpo. Torcer
   no tronco e na bacia: positivo leva o ombro (ou quadril) D para tras.

   A arma do jogo fica na mao D (maoD), e a grade tem so 28 voxels na frente
   do meio do corpo: golpe de estocada reta vaza a grade. Por isso o ataque
   e um corte que cruza o corpo de lado, onde ha 40 voxels para cada lado.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof posarEsqueleto === "undefined"){
  const M = require("./rig.js");
  for (const k in M) globalThis[k] = M[k];
}

const ESCRITAS = {
  /* a respiracao: o peito sobe um voxel e os bracos abrem um nada */
  respirar: [
    {tronco: [-3, 0, 0], cabeca: [2, 0, 0], bracoE: [0, 3, 0], bracoD: [0, 3, 0], chao: 0}
  ],
  /* Andar: contato (perna E na frente pisando de calcanhar, D atras na
     ponta), apoio (o peso cai na E, o joelho cede e o corpo desce),
     passagem (E esticada embaixo do corpo, D passando com o joelho
     dobrado, o corpo no alto), e o mesmo espelhado. Braco contrario a
     perna, com o cotovelo solto. */
  andar: [
    {tronco: [3, 0, -6], bacia: [0, 0, 6], cabeca: [-2, 0, 4],
     coxaE: [22, 0, 0], canelaE: [-4, 0, 0], peE: [14, 0, 0],
     coxaD: [-18, 0, 0], canelaD: [-8, 0, 0], peD: [-12, 0, 0],
     bracoD: [22, -4, 0], antebracoD: [18, 0, 0], bracoE: [-20, -4, 0], antebracoE: [12, 0, 0], chao: 0},
    {tronco: [4, 0, -4], bacia: [0, 0, 4], cabeca: [-3, 0, 3],
     coxaE: [14, 0, 0], canelaE: [-16, 0, 0], peE: [0, 0, 0],
     coxaD: [-22, 0, 0], canelaD: [-30, 0, 0], peD: [-25, 0, 0],
     bracoD: [16, -4, 0], antebracoD: [22, 0, 0], bracoE: [-16, -4, 0], antebracoE: [16, 0, 0], chao: 0},
    {tronco: [2, 0, 0], bacia: [0, 0, 0], cabeca: [-1, 0, 0],
     coxaE: [-2, 0, 0], canelaE: [-3, 0, 0], peE: [0, 0, 0],
     coxaD: [20, 0, 0], canelaD: [-45, 0, 0], peD: [-15, 0, 0],
     bracoD: [2, -4, 0], antebracoD: [12, 0, 0], bracoE: [-4, -4, 0], antebracoE: [10, 0, 0], chao: 0},
    {espelho: 0},
    {espelho: 1},
    {espelho: 2}
  ],
  /* Correr: passada (perna E na frente pisando de calcanhar, D atras
     empurrando com a ponta), passagem (E apoiada e dobrada embaixo do corpo,
     joelho D subindo), e o mesmo espelhado. Tronco inclinado, ombro
     contrario a perna, cotovelo dobrado. A grade tem 56 voxels de fundo:
     a passada inteira, do pe da frente ao de tras, cabe neles. */
  correr: [
    {tronco: [10, 0, -12], bacia: [0, 0, 8], cabeca: [-8, 0, 10],
     coxaE: [24, 0, 0], canelaE: [-8, 0, 0], peE: [12, 0, 0],
     coxaD: [-13, 0, 0], canelaD: [-66, 0, 0], peD: [-35, 0, 0],
     bracoD: [22, -8, 0], antebracoD: [68, 0, 0], bracoE: [-28, -8, 0], antebracoE: [60, 0, 0], chao: 2},
    {tronco: [12, 0, -3], bacia: [0, 0, 2], cabeca: [-10, 0, 3],
     coxaE: [-4, 0, 0], canelaE: [-26, 0, 0], peE: [0, 0, 0],
     coxaD: [48, 0, 0], canelaD: [-100, 0, 0], peD: [-30, 0, 0],
     bracoD: [8, -8, 0], antebracoD: [95, 0, 0], bracoE: [-12, -8, 0], antebracoE: [85, 0, 0], chao: 0},
    {espelho: 0},
    {espelho: 1}
  ],
  /* No ar, pernas recolhidas, bracos para cima e para a frente. A altura do
     pulo e do jogo (o sprite sobe com o jogador): a pose so recolhe as
     pernas, com a bacia no lugar, sem apoiar no chao. */
  pulo: [
    {tronco: [8, 0, 0], cabeca: [-6, 0, 0], coxaE: [48, 0, 0], canelaE: [-74, 0, 0], peE: [-15, 0, 0],      // canela a -74 e nao -80: com a perna reta no repouso (1/10), a -80 o pano atras do joelho do humano se soltava
     coxaD: [18, 0, 0], canelaD: [-55, 0, 0], peD: [-20, 0, 0],
     bracoE: [55, 35, 0], antebracoE: [50, 0, 0], bracoD: [45, 35, 0], antebracoD: [55, 0, 0], chao: null}
  ],
  /* Atacar: 1, o preparo, curto (22% do golpe): a arma puxada para tras,
     baixa, ao lado do quadril D, tronco torcido para tras; 2, o corte na
     altura da cintura cruzando o corpo ate a frente do lado E, tronco
     torcido para a frente e o peso na perna da frente. A lamina das armas do jogo aponta sempre para
     cima a partir da mao: mao acima do ombro poe a ponta da espada fora da
     grade, entao nenhuma pose leva a mao da arma acima do peito. */
  atacar: [
    {tronco: [2, -4, 30], bacia: [0, 0, 10], cabeca: [0, 3, -22],
     bracoD: [-38, 18, 0], antebracoD: [55, 0, 0], bracoE: [38, -12, 0], antebracoE: [75, 0, 0],
     coxaE: [14, 0, 0], canelaE: [-12, 0, 0], coxaD: [-10, 0, 0], canelaD: [-6, 0, 0], chao: 0},
    {tronco: [14, 8, -28], bacia: [0, 0, -10], cabeca: [-10, -4, 24],
     bracoD: [34, -52, 0], antebracoD: [12, 0, 0], bracoE: [-26, 16, 0], antebracoE: [65, 0, 0],
     coxaE: [26, 0, 0], canelaE: [-28, 0, 0], coxaD: [-16, 0, 0], canelaD: [-4, 0, 0], chao: 0}
  ],
  /* Bloquear: o escudo do jogo nao segue a mao -- bloqueando, ele sobe para
     um lugar fixo do lado E, na frente do corpo (PECAS.escudo.redondo, em
     src/p3e.js: x cx-30, y cy-6, z 66). A pose leva a mao E ate a alca dele
     (`alvoMaoE`, por IK), vira o ombro E para a frente e deixa a arma D
     pronta, recolhida. */
  bloquear: [
    {tronco: [6, 0, 12], bacia: [0, 0, 6], cabeca: [-4, 0, -10], alvoMaoE: [14, 22, 64],
     bracoD: [18, 6, 0], antebracoD: [70, 0, 0], coxaE: [16, 0, 0], canelaE: [-18, 0, 0], coxaD: [-10, 0, 0], canelaD: [-6, 0, 0], chao: 0}
  ],
  /* Conjurar: 1, juntar -- mao D (cajado ou livro) puxada ao peito, tronco
     recolhido; 2, soltar -- braco D estendido para a frente e para cima, o
     outro abrindo para tras. */
  conjurar: [
    {tronco: [6, 0, 14], cabeca: [4, 0, -10], bracoD: [30, -10, 0], antebracoD: [110, 0, 0],
     bracoE: [20, 5, 0], antebracoE: [90, 0, 0], coxaE: [10, 0, 0], canelaE: [-12, 0, 0], coxaD: [-6, 0, 0], chao: 0},
    {tronco: [6, 0, -16], cabeca: [-6, 0, 12], bracoD: [50, 10, 0], antebracoD: [20, 0, 0],
     bracoE: [-12, 25, 0], antebracoE: [35, 0, 0], coxaE: [18, 0, 0], canelaE: [-20, 0, 0], coxaD: [-14, 0, 0], chao: 0}
  ]
};

if (typeof module !== "undefined" && typeof posarCorpo === "undefined"){
  const M = require("./deformar.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof poseDeAngulos === "undefined"){
  const M = require("./animacao.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof caberNoJogo === "undefined"){
  const M = require("./encaixe.js");
  for (const k in M) globalThis[k] = M[k];
}

/* um quadro escrito montado com os angulos multiplicados por k (e os dos
   bracos, tambem por kBraco; os das pernas, por kPerna; bacia, tronco e
   cabeca, por kTronco) */
function montarQuadro(juntas, repouso, q, k, kBraco, kPerna, kTronco){
  const angulos = {}, kb = kBraco === undefined ? 1 : kBraco, kp = kPerna === undefined ? 1 : kPerna, kt = kTronco === undefined ? 1 : kTronco;
  for (const n in q) if (INDICE_OSSO[n] !== undefined && n !== "peE" && n !== "peD")
    angulos[n] = q[n].map(function(v){ return v*k*(OSSOS_DO_BRACO.indexOf(n) >= 0 ? kb : OSSOS_DA_PERNA.indexOf(n) >= 0 ? kp : OSSOS_DO_TRONCO.indexOf(n) >= 0 ? kt : 1); });
  let p = poseDeAngulos(juntas, repouso, angulos);
  if (q.raiz) p.raiz = vSoma(p.raiz, vEscala(q.raiz, k));
  if (q.alvoMaoE){
    /* a mao vai por IK de onde os angulos a deixaram ate o alvo, na forca k*kBraco */
    const daqui = posarEsqueleto(juntas, p).juntas.maoE;
    p = ikDeDoisOssos(juntas, p, "bracoE", "antebracoE", vEntre(daqui, q.alvoMaoE, k*kb));
  }
  for (const pe of ["peE", "peD"]) p = inclinarPe(juntas, p, pe, q[pe] ? q[pe][0]*k*kp : 0, repouso);
  if (q.chao !== null) p = apoiarNoChao(juntas, p, (q.chao || 0)*k);
  return p;
}
/* As poses de uma animacao escrita, para o rig dado. Com o corpo, cada
   quadro passa por caberNoJogo (encaixe.js): encaixado na grade e, se ainda
   nao couber, com os angulos encolhidos na direcao do parado so o bastante. */
function posesEscritas(juntas, repouso, nome, corpo){
  const lista = ESCRITAS[nome];
  if (!lista) return null;
  const feitas = [], espelhado = lista.some(function(q){ return q.espelho !== undefined; });
  lista.forEach(function(q, i){
    if (q.espelho !== undefined){ feitas[i] = null; return; }
    if (!corpo){ feitas[i] = montarQuadro(juntas, repouso, q, 1); return; }
    const p = caberNoJogo(corpo, juntas, function(k, kb, kp, kt){ return montarQuadro(juntas, repouso, q, k, kb, kp, kt); }, nome, espelhado);
    feitas[i] = p;
  });
  lista.forEach(function(q, i){ if (q.espelho !== undefined) feitas[i] = espelharPose(feitas[q.espelho]); });
  return feitas;
}

if (typeof module !== "undefined") module.exports = {ESCRITAS, montarQuadro, posesEscritas};
