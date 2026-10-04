/* ============================================================
   ATELIE -- O NUCLEO
   ------------------------------------------------------------
   O que todo o resto do atelie usa: os fatos do jogo (a grade, as juntas,
   a pose de repouso, os quadros que o jogo pede) e a matematica de giro
   (vetor, quaternio e quaternio dual).

   O atelie trabalha com uma representacao mais rica do que a que o jogo
   le: cada voxel do corpo mora na bind pose (T-pose), tem cor e peso
   repartido entre ate dois ossos, e uma pose e uma rotacao por osso a
   partir da bind pose. So na hora de exportar isso vira a grade simples de
   um byte por voxel que o jogo entende.

   Puro, sem DOM: roda no node (testes, linha de comando) e no navegador.
   ============================================================ */

/* ---------- os fatos do jogo ---------- */
const GRADE = {DX: 80, DY: 56, DZ: 117};            // x esquerda->direita, y frente->costas, z pe->cabeca
const CENTRO = {CX: 40, CY: 28};

/* as 13 juntas, com os nomes que o jogo usa */
const JUNTAS = ["cabeca", "pescoco", "ombroE", "ombroD", "cotoveloE", "cotoveloD", "maoE", "maoD",
                "quadrilE", "quadrilD", "joelhoE", "joelhoD", "peE", "peD"];
/* a pose parada do jogo (REPOUSO em src/p3e.js): e o que o quadro "parado"
   tem que entregar, porque as pecas de roupa e armadura do jogo sao
   medidas nela */
const REPOUSO_DO_JOGO = {
  cabeca: [40, 28, 101], pescoco: [40, 29, 84],
  ombroE: [23, 28, 78], ombroD: [57, 28, 78],
  cotoveloE: [19, 29, 61], cotoveloD: [61, 29, 61],
  maoE: [16, 27, 46], maoD: [64, 27, 46],
  quadrilE: [32, 28, 37], quadrilD: [48, 28, 37],
  joelhoE: [30, 25, 20], joelhoD: [50, 25, 20],
  peE: [28, 28, 5], peD: [52, 28, 5]
};
/* Os quadros que o jogo assa, na ordem dos indices de POSE em src/p3e.js.
   Uma animacao do atelie tem exatamente esse numero de quadros. */
const ANIMACOES_DO_JOGO = [
  {nome: "parado", quadros: 1}, {nome: "andar", quadros: 6}, {nome: "respirar", quadros: 1},
  {nome: "correr", quadros: 4}, {nome: "pulo", quadros: 1}, {nome: "atacar", quadros: 2},
  {nome: "conjurar", quadros: 2}, {nome: "bloquear", quadros: 1}, {nome: "arco", quadros: 2}
];
/* "andar-3", "pulo"... na ordem do jogo: o indice na lista e o numero da pose */
const QUADROS_DO_JOGO = (function(){
  const l = [];
  for (const a of ANIMACOES_DO_JOGO) for (let i = 0; i < a.quadros; i++)
    l.push({nome: a.quadros > 1 ? a.nome + "-" + (i + 1) : a.nome, animacao: a.nome, quadro: i});
  return l;
})();
/* A paleta do personagem no jogo tem 255 entradas: 92 sao rampas fixas das
   pecas (pele, couro, tunicas, cabelos, aco, malha, madeira, enfeites) e cada
   cor do corpo vira tres tons. O que passa de 255 cai na cor mais perto sem
   dar erro nenhum -- por isso o limite e conferido aqui, e nao descoberto
   olhando. */
const CORES_FIXAS_DO_JOGO = 92;
const TONS_POR_COR = 3;
const MAX_CORES_DO_CORPO = Math.floor((255 - CORES_FIXAS_DO_JOGO) / TONS_POR_COR);   // 54
/* Onde a mao D pode ficar para a arma pendurada nela caber na grade. As
   armas do jogo (PECAS.arma, em src/p3e.js) nao giram com a mao: a lamina da
   espada sobe 52 voxels a partir dela, a adaga avanca 10 para a frente, o
   arco abre 13 para o lado e sobe e desce 30, e o cajado tem altura fixa. O
   jogo mostra cada arma parado, andando, correndo e no pulo; so a adaga e
   a espada atacando, so cajado e grimorio conjurando, e so o arco no arco.
   Com a mao fora daqui a arma sai cortada. Num ciclo espelhado a mao E vira
   a D, entao nele valem as duas. */
const LUGAR_DA_MAO_DA_ARMA = {
  sempre:   {zMin: 28, zMax: 64, yMin: 9, xMax: 67},
  atacar:   {zMin: -99, zMax: 64, yMin: 9, xMax: 67},
  conjurar: {zMin: -99, zMax: 110, yMin: 5, xMax: 74},
  arco:     {zMin: 28, zMax: 88, yMin: 3, xMax: 68}
};
function maoNoLugarDaArma(mao, lado, animacao){
  const L = LUGAR_DA_MAO_DA_ARMA[animacao] || LUGAR_DA_MAO_DA_ARMA.sempre, x = lado === "E" ? 2*CENTRO.CX - mao[0] : mao[0];
  return mao[2] <= L.zMax && mao[2] >= L.zMin && mao[1] >= L.yMin && x <= L.xMax;
}

/* ---------- os ossos ----------
   Os ossos que movem a pele. `pivo` e o ponto em volta do qual o osso gira
   (sempre levado pelo pai), `ponta` e para onde ele aponta. `leva` sao os
   pontos que andam com ele. Os pontos que nao sao juntas do jogo (cintura,
   pontas de mao e pe, topo da cabeca) sao do atelie: ajudam a apontar o osso
   e a medir a pele, e nao saem no arquivo do jogo. */
const OSSOS = [
  {nome: "bacia",      pai: null,         pivo: "meioQuadril", ponta: "cintura",    leva: ["quadrilE", "quadrilD", "meioQuadril", "cintura"]},
  {nome: "tronco",     pai: "bacia",      pivo: "cintura",     ponta: "meioOmbro",  leva: ["pescoco", "ombroE", "ombroD", "meioOmbro"]},
  {nome: "cabeca",     pai: "tronco",     pivo: "pescoco",     ponta: "topoCabeca", leva: ["cabeca", "topoCabeca"]},
  {nome: "bracoE",     pai: "tronco",     pivo: "ombroE",      ponta: "cotoveloE",  leva: ["cotoveloE"]},
  {nome: "antebracoE", pai: "bracoE",     pivo: "cotoveloE",   ponta: "maoE",       leva: ["maoE", "pontaMaoE"], alcance: "pontaMaoE"},
  {nome: "bracoD",     pai: "tronco",     pivo: "ombroD",      ponta: "cotoveloD",  leva: ["cotoveloD"]},
  {nome: "antebracoD", pai: "bracoD",     pivo: "cotoveloD",   ponta: "maoD",       leva: ["maoD", "pontaMaoD"], alcance: "pontaMaoD"},
  {nome: "coxaE",      pai: "bacia",      pivo: "quadrilE",    ponta: "joelhoE",    leva: ["joelhoE"]},
  {nome: "canelaE",    pai: "coxaE",      pivo: "joelhoE",     ponta: "peE",        leva: ["peE"]},
  {nome: "peE",        pai: "canelaE",    pivo: "peE",         ponta: "pontaPeE",   leva: ["pontaPeE"]},
  {nome: "coxaD",      pai: "bacia",      pivo: "quadrilD",    ponta: "joelhoD",    leva: ["joelhoD"]},
  {nome: "canelaD",    pai: "coxaD",      pivo: "joelhoD",     ponta: "peD",        leva: ["peD"]},
  {nome: "peD",        pai: "canelaD",    pivo: "peD",         ponta: "pontaPeD",   leva: ["pontaPeD"]}
];
const INDICE_OSSO = {};
OSSOS.forEach(function(o, i){ INDICE_OSSO[o.nome] = i; o.indice = i; });
OSSOS.forEach(function(o){ o.iPai = o.pai === null ? -1 : INDICE_OSSO[o.pai]; });
/* o osso que leva cada ponto */
const OSSO_DO_PONTO = {};
OSSOS.forEach(function(o){ for (const p of o.leva) OSSO_DO_PONTO[p] = o.nome; });
/* os pontos do atelie que nao sao juntas do jogo */
const PONTOS_EXTRAS = ["meioQuadril", "cintura", "meioOmbro", "topoCabeca", "pontaMaoE", "pontaMaoD", "pontaPeE", "pontaPeD"];
const TODOS_OS_PONTOS = JUNTAS.concat(PONTOS_EXTRAS);
/* dois ossos sao vizinhos quando um e pai do outro, ou sao irmaos no mesmo
   pai -- so entre vizinhos faz sentido repartir peso. Peso entre mao e
   quadril e exatamente o defeito que o atelie existe para nao ter. */
function ossosVizinhos(a, b){
  if (a === b) return true;
  const A = OSSOS[a], B = OSSOS[b];
  return A.iPai === b || B.iPai === a || (A.iPai >= 0 && A.iPai === B.iPai);
}
/* o lado de cada osso, e o do outro lado */
function espelhoDoNome(n){
  if (/E$/.test(n)) return n.slice(0, -1) + "D";
  if (/D$/.test(n)) return n.slice(0, -1) + "E";
  return n;
}

/* ---------- vetor ---------- */
function vSoma(a, b){ return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vMenos(a, b){ return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vEscala(a, k){ return [a[0]*k, a[1]*k, a[2]*k]; }
function vPonto(a, b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function vCruz(a, b){ return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]]; }
function vTam(a){ return Math.hypot(a[0], a[1], a[2]); }
function vNorm(a){ const l = vTam(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }
function vEntre(a, b, t){ return [a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t]; }
function vDist(a, b){ return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
/* distancia do ponto p ao segmento ab, e o t do ponto mais perto */
function distSegmento(p, a, b){
  const d = vMenos(b, a), L2 = vPonto(d, d);
  let t = L2 > 0 ? vPonto(vMenos(p, a), d)/L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return {d: vDist(p, vSoma(a, vEscala(d, t))), t: t};
}

/* ---------- quaternio [w, x, y, z] ---------- */
const Q_ID = [1, 0, 0, 0];
function qMul(a, b){
  return [a[0]*b[0] - a[1]*b[1] - a[2]*b[2] - a[3]*b[3],
          a[0]*b[1] + a[1]*b[0] + a[2]*b[3] - a[3]*b[2],
          a[0]*b[2] - a[1]*b[3] + a[2]*b[0] + a[3]*b[1],
          a[0]*b[3] + a[1]*b[2] - a[2]*b[1] + a[3]*b[0]];
}
function qConj(q){ return [q[0], -q[1], -q[2], -q[3]]; }
function qNorm(q){ const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0]/l, q[1]/l, q[2]/l, q[3]/l]; }
function qGira(q, v){
  const w = q[0], x = q[1], y = q[2], z = q[3];
  const tx = 2*(y*v[2] - z*v[1]), ty = 2*(z*v[0] - x*v[2]), tz = 2*(x*v[1] - y*v[0]);
  return [v[0] + w*tx + y*tz - z*ty, v[1] + w*ty + z*tx - x*tz, v[2] + w*tz + x*ty - y*tx];
}
function qEixoAngulo(eixo, graus){
  const e = vNorm(eixo), a = graus*Math.PI/360, s = Math.sin(a);
  return [Math.cos(a), e[0]*s, e[1]*s, e[2]*s];
}
/* o menor giro que leva a direcao u para a direcao v */
function qArco(u, v){
  const a = vNorm(u), b = vNorm(v), c = vPonto(a, b);
  if (c < -0.999999){
    let eixo = vCruz([1, 0, 0], a);
    if (vTam(eixo) < 1e-6) eixo = vCruz([0, 1, 0], a);
    return qEixoAngulo(eixo, 180);
  }
  const k = vCruz(a, b);
  return qNorm([1 + c, k[0], k[1], k[2]]);
}
function qPonto(a, b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]; }
function qSlerp(a, b, t){
  let c = qPonto(a, b), bb = b;
  if (c < 0){ c = -c; bb = [-b[0], -b[1], -b[2], -b[3]]; }
  if (c > 0.9995) return qNorm([a[0] + (bb[0] - a[0])*t, a[1] + (bb[1] - a[1])*t, a[2] + (bb[2] - a[2])*t, a[3] + (bb[3] - a[3])*t]);
  const th = Math.acos(c), s = Math.sin(th), wa = Math.sin((1 - t)*th)/s, wb = Math.sin(t*th)/s;
  return [a[0]*wa + bb[0]*wb, a[1]*wa + bb[1]*wb, a[2]*wa + bb[2]*wb, a[3]*wa + bb[3]*wb];
}
/* matriz de giro (linhas) -> quaternio */
function qDaMatriz(m){
  const t = m[0][0] + m[1][1] + m[2][2];
  let q;
  if (t > 0){
    const s = 0.5/Math.sqrt(t + 1);
    q = [0.25/s, (m[2][1] - m[1][2])*s, (m[0][2] - m[2][0])*s, (m[1][0] - m[0][1])*s];
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]){
    const s = 2*Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]);
    q = [(m[2][1] - m[1][2])/s, 0.25*s, (m[1][0] + m[0][1])/s, (m[0][2] + m[2][0])/s];
  } else if (m[1][1] > m[2][2]){
    const s = 2*Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]);
    q = [(m[0][2] - m[2][0])/s, (m[1][0] + m[0][1])/s, 0.25*s, (m[2][1] + m[1][2])/s];
  } else {
    const s = 2*Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]);
    q = [(m[1][0] - m[0][1])/s, (m[0][2] + m[2][0])/s, (m[2][1] + m[1][2])/s, 0.25*s];
  }
  return qNorm(q);
}
/* O giro que leva um referencial para outro, cada um dado por dois
   vetores: `a` manda (a direcao do osso) e `b` so escolhe a torcao em volta
   dele (a linha dos ombros, a dos quadris). */
function qDeReferencial(a0, b0, a1, b1){
  function base(a, b){
    const e1 = vNorm(a);
    let e2 = vMenos(b, vEscala(e1, vPonto(b, e1)));
    if (vTam(e2) < 1e-6) e2 = Math.abs(e1[0]) < 0.9 ? vCruz(e1, [1, 0, 0]) : vCruz(e1, [0, 1, 0]);
    e2 = vNorm(e2);
    return [e1, e2, vCruz(e1, e2)];
  }
  const A = base(a0, b0), B = base(a1, b1);
  /* R = B * A^T, com os vetores de base como colunas */
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    m[i][j] = B[0][i]*A[0][j] + B[1][i]*A[1][j] + B[2][i]*A[2][j];
  return qDaMatriz(m);
}
/* Angulos de Euler em graus, girando em x, depois y, depois z (eixos fixos
   do pai). E so para o painel: por dentro tudo e quaternio. */
function qDeEuler(e){
  return qMul(qEixoAngulo([0, 0, 1], e[2] || 0), qMul(qEixoAngulo([0, 1, 0], e[1] || 0), qEixoAngulo([1, 0, 0], e[0] || 0)));
}
function qParaEuler(q){
  const w = q[0], x = q[1], y = q[2], z = q[3];
  const sy = Math.max(-1, Math.min(1, 2*(w*y - z*x)));
  return [Math.atan2(2*(w*x + y*z), 1 - 2*(x*x + y*y))*180/Math.PI,
          Math.asin(sy)*180/Math.PI,
          Math.atan2(2*(w*z + x*y), 1 - 2*(y*y + z*z))*180/Math.PI];
}
/* O espelho de um giro pelo plano do meio do corpo (x -> -x). */
function qEspelho(q){ return [q[0], q[1], -q[2], -q[3]]; }
/* o angulo de um giro, em graus */
function qAngulo(q){ return 2*Math.acos(Math.min(1, Math.abs(q[0])))*180/Math.PI; }

if (typeof module !== "undefined") module.exports = {
  GRADE, CENTRO, JUNTAS, REPOUSO_DO_JOGO, ANIMACOES_DO_JOGO, QUADROS_DO_JOGO,
  CORES_FIXAS_DO_JOGO, TONS_POR_COR, MAX_CORES_DO_CORPO, LUGAR_DA_MAO_DA_ARMA, maoNoLugarDaArma,
  OSSOS, INDICE_OSSO, OSSO_DO_PONTO, PONTOS_EXTRAS, TODOS_OS_PONTOS, ossosVizinhos, espelhoDoNome,
  vSoma, vMenos, vEscala, vPonto, vCruz, vTam, vNorm, vEntre, vDist, distSegmento,
  Q_ID, qMul, qConj, qNorm, qGira, qEixoAngulo, qArco, qPonto, qSlerp, qDaMatriz, qDeReferencial,
  qDeEuler, qParaEuler, qEspelho, qAngulo
};
