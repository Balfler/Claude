/* ============================================================
   ATELIE -- A ANIMACAO
   ------------------------------------------------------------
   Uma animacao e uma lista de poses (rotacao por osso a partir da bind
   pose), com exatamente o numero de quadros que o jogo assa para ela --
   andar 6, correr 4, atacar 2... (ANIMACOES_DO_JOGO, em nucleo.js).

   De onde vem uma animacao:
   - das poses que o jogo ja tinha (POSES_ANTIGAS: andar e atacar de
     captura de movimento, o resto de formula), redirecionadas para o rig
     do corpo por diferenca -- e o ponto de partida de um projeto novo;
   - de captura de movimento importada (captura.js), amostrada em N quadros;
   - de poses feitas no painel, quadro a quadro, com espelho E/D para ciclo.

   Por ser rotacao e nao posicao, qualquer par de poses se mistura
   (misturarPoses) e a mesma animacao serve para um corpo de outra
   proporcao: o angulo fica, o comprimento de osso e o do rig.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof posarEsqueleto === "undefined"){
  const M = require("./rig.js");
  for (const k in M) globalThis[k] = M[k];
}

/* As 20 poses que src/p3e.js montava antes do atelie, por posicao de junta
   (as 14 juntas na ordem de JUNTAS), na ordem de QUADROS_DO_JOGO. Andar
   (1 a 6) e atacar (13 e 14) sao a captura de movimento que o jogo tinha;
   o resto, a formula. Ficam aqui como FONTE, na proporcao do REPOUSO do
   jogo -- o que o projeto guarda e o giro redirecionado. */
const POSES_ANTIGAS = [
  [40,28,101, 40,29,84, 23,28,78, 57,28,78, 19,29,61, 61,29,61, 16,27,46, 64,27,46, 32,28,37, 48,28,37, 30,25,20, 50,25,20, 28,28,5, 52,28,5],
  [40,28,101, 40,29,84, 23,28.2,77.4, 57,27.8,78.6, 23.2,30.9,60.2, 60.3,31.5,61.7, 24.5,28.7,44.9, 61.8,31.6,46.5, 32,28.4,37.3, 48,27.6,36.7, 28.6,26.7,20.4, 48.8,20.3,20.9, 26.6,36.4,8.6, 48.8,22.1,5.6],
  [40,28,101, 40,29,84, 23,28.8,77.9, 57,27.2,78.1, 22.3,32.2,60.7, 60,30.3,61.2, 22.3,30.7,45.4, 60.4,29.5,46, 32,28.2,36.6, 48,27.8,37.4, 30.1,21.8,20.6, 51.2,24.1,20.7, 28.4,29.8,7.5, 51.8,27.7,5.7],
  [40,28,101, 40,29,84, 23,28.9,78.1, 57,27.1,77.9, 22.2,33.1,61.1, 59.6,29.6,60.8, 22.1,32.2,45.7, 59,27.6,45.9, 32,28.1,36.3, 48,27.9,37.7, 30.8,20.6,20.7, 52.5,26.6,21, 28.7,21.5,5.4, 53.7,31.8,6.5],
  [40,28,101, 40,29,84, 23,28.8,78, 57,27.2,78, 22,32.8,61, 59.7,29.5,60.9, 22,32.3,45.5, 59.2,27.2,46, 32,28,36.2, 48,28,37.8, 31.2,21,20.3, 52.1,26.3,21, 30.4,23.8,5.2, 53.3,35.7,8.7],
  [40,28,101, 40,29,84, 23,28.4,77.5, 57,27.6,78.5, 22.4,31.5,60.3, 60.1,30.2,61.3, 23,30.2,44.9, 60.3,28.8,46.2, 32,28.1,36.8, 48,27.9,37.2, 30,24.2,20, 50.5,22.5,20.9, 29.3,28.7,5.3, 52,31.5,8.4],
  [40,28,101, 40,29,84, 23,28.2,77.4, 57,27.8,78.6, 23.2,30.5,60.1, 60.2,31.4,61.7, 25.6,27.5,45.1, 61.1,31.1,46.5, 32,28.2,37.4, 48,27.8,36.6, 28.4,27.1,20.4, 49.3,21,20.7, 26.8,33.6,6.5, 50.3,21.3,5.3],
  [40,28,101, 40,29,84, 23,28,78, 57,28,78, 19,29.9,61.1, 61,29.9,61.1, 16,25.6,46.6, 64,25.6,46.6, 32,28,37, 48,28,37, 30,25,20, 50,25,20, 28,28,5, 52,28,5],
  [40,26,98, 40,27,81, 23.7,30.7,75, 56.3,21.3,75, 19.7,37.4,59.4, 60.3,16.4,58.7, 16.7,37.5,44.2, 63.3,4.6,49.3, 32.1,25,34, 47.9,27,34, 30.1,14.5,20.3, 49.9,32.3,17.6, 28.1,15,5, 51.9,41,5],
  [40,26,101, 40,27,84, 23,26,78, 57,26,78, 19,27,61, 61,27,61, 16,21.9,46.7, 64,21.9,46.7, 32,26,37, 48,26,37, 30,24.2,19.8, 50,14.8,23.8, 28,28,5, 52,28,16],
  [40,26,98, 40,27,81, 23.7,21.3,75, 56.3,30.7,75, 19.7,16.4,58.7, 60.3,37.4,59.4, 16.7,4.6,49.3, 63.3,37.5,44.2, 32.1,27,34, 47.9,25,34, 30.1,32.3,17.6, 49.9,14.5,20.3, 28.1,41,5, 51.9,15,5],
  [40,26,101, 40,27,84, 23,26,78, 57,26,78, 19,27,61, 61,27,61, 16,21.9,46.7, 64,21.9,46.7, 32,26,37, 48,26,37, 30,14.8,23.8, 50,24.2,19.8, 28,28,16, 52,28,5],
  [40,26,101, 40,27,84, 23.2,28.4,78, 56.8,23.6,78, 19.2,24.1,61.5, 60.8,19.3,61.5, 16.2,14.8,49.5, 63.8,10.1,49.5, 32,25.4,37, 48,26.6,37, 30,14.3,23.8, 50,17.8,22.2, 28,26,14, 52,30,13],
  [40,28,101, 40,29,84, 26.1,32.5,86.7, 53.9,23.5,69.3, 17.4,29.3,71.8, 51.3,28.4,58.4, 19.6,16,64.4, 44.2,27.2,50.6, 32.3,29,39.1, 47.7,27,34.9, 26.9,21.6,24.3, 50.1,24.3,17.9, 23,24.1,9.6, 54.7,31.2,4.9],
  [40,28,101, 40,29,84, 24.6,31.8,84.2, 55.4,24.2,71.8, 15.5,26.8,70.1, 53,23.1,59.4, 16.1,12.9,63.4, 49.1,15.7,51, 32.1,28.5,38.4, 47.9,27.5,35.6, 27.1,20.3,24, 49.8,22.4,19.1, 22.6,24,9.7, 54.8,27.7,5.5],
  [40,28,101, 40,29,84, 23.1,30.1,78, 56.9,25.9,78, 19.1,32.5,61.1, 60.9,20.5,61.9, 16.1,29.3,46.4, 63.9,10.1,50.9, 32,27.6,37, 48,28.4,37, 30,24.8,20, 50,25.2,20, 28,28,5, 52,28,5],
  [40,28,101, 40,29,84, 23.4,31.5,78, 56.6,24.5,78, 19.4,34,61.1, 60.6,16.8,62.8, 16.4,30.7,46.4, 63.6,6.4,51.8, 32,27.3,37, 48,28.7,37, 30,24.7,19.9, 50,25.4,20.1, 28,28,5, 52,28,5],
  [40,27,101, 40,28,84, 23.3,24.1,78, 56.7,29.9,78, 19.3,19.2,61.7, 60.7,27.4,61.2, 16.3,8,51.5, 63.7,18.8,48.7, 32,27.8,37, 48,26.2,37, 30,24.9,20, 50,24.3,19.8, 28,28,5, 52,28,5],
  [40,28,101, 40,29,84, 23.7,23.3,78, 56.3,32.7,78, 19.7,33.6,64.5, 60.3,22.1,64.7, 16.7,28.6,50.2, 63.3,9.6,56.1, 32.1,29.1,37, 47.9,26.9,37, 30.1,25.6,20.1, 49.9,24.5,19.9, 28.1,28,5, 51.9,28,5],
  [40,28,101, 40,29,84, 24.2,21.6,78, 55.8,34.4,78, 20.2,26.1,61.6, 59.8,23.7,64.7, 17.2,23.4,46.7, 62.8,11.3,56.1, 32.1,29.1,37, 47.9,26.9,37, 30.1,25.6,20.1, 49.9,24.5,19.9, 28.1,28,5, 51.9,28,5]
];
function juntasDaLista(l){
  const o = {};
  JUNTAS.forEach(function(n, i){ o[n] = [l[i*3], l[i*3 + 1], l[i*3 + 2]]; });
  return o;
}

/* as poses antigas de uma animacao, redirecionadas para o rig */
function posesAntigas(juntas, repouso, nome){
  const l = [];
  QUADROS_DO_JOGO.forEach(function(q, i){
    if (q.animacao !== nome) return;
    l[q.quadro] = q.nome === "parado" ? copiarPose(repouso) : poseRelativa(juntas, repouso, REPOUSO_DO_JOGO, juntasDaLista(POSES_ANTIGAS[i]));
  });
  return l;
}
/* As animacoes de um projeto novo: as escritas (escritas.js) onde houver,
   as antigas do jogo no resto. Com o corpo, cada quadro e encaixado na
   grade do jogo. */
function animacoesIniciais(juntas, corpo){
  if (typeof module !== "undefined" && typeof posesEscritas === "undefined"){
    const M = require("./escritas.js");
    for (const k in M) globalThis[k] = M[k];
  }
  const repouso = repousoDoRig(juntas), animacoes = {};
  for (const a of ANIMACOES_DO_JOGO){
    const escritas = posesEscritas(juntas, repouso, a.nome, corpo);
    animacoes[a.nome] = escritas || posesAntigas(juntas, repouso, a.nome).map(function(p){
      return corpo ? caberPose(corpo, juntas, repouso, p, a.nome, false) : p;
    });
  }
  return {repouso: repouso, animacoes: animacoes};
}
/* os 20 quadros do jogo, na ordem, com a pose de cada um */
function quadrosDoProjeto(animacoes){
  return QUADROS_DO_JOGO.map(function(q){ return {nome: q.nome, animacao: q.animacao, quadro: q.quadro, pose: animacoes[q.animacao][q.quadro]}; });
}
/* Ciclo com metade dos quadros: a segunda metade e a primeira espelhada
   (o passo da perna esquerda vira o da direita). */
function completarCicloEspelhado(lista){
  const n = lista.length, m = n >> 1;
  const nova = lista.map(copiarPose);
  for (let i = 0; i < m; i++) nova[m + i] = espelharPose(lista[i]);
  return nova;
}
/* Amostra `n` quadros de um clipe longo (poses a intervalo fixo), de
   `inicio` a `fim` (indices, fracionarios valem). Num ciclo o ultimo quadro
   nao repete o primeiro. */
function amostrarClipe(poses, n, opcoes){
  opcoes = opcoes || {};
  const ini = opcoes.inicio || 0, fim = opcoes.fim === undefined ? poses.length - 1 : opcoes.fim;
  const saida = [];
  for (let i = 0; i < n; i++){
    const t = ini + (fim - ini)*(opcoes.ciclo ? i/n : n > 1 ? i/(n - 1) : 0);
    const a = Math.max(0, Math.min(poses.length - 1, Math.floor(t))), b = Math.min(poses.length - 1, a + 1);
    saida.push(misturarPoses(poses[a], poses[b], t - a));
  }
  return saida;
}
/* Onde o clipe se repete: a partir de `inicio`, o quadro entre `minimo` e
   `maximo` quadros adiante cuja pose (em relacao a bacia) mais se parece
   com a do inicio. Sem limites, eles saem do ritmo da captura: um ciclo de
   passo humano dura de meio segundo a um segundo e meio -- abaixo disso,
   dois quadros vizinhos a 120 por segundo passariam por ciclo fechado. */
function acharCiclo(juntasPorQuadro, inicio, minimo, maximo, fps){
  const f0 = fps || 30, J0 = juntasPorQuadro[inicio];
  const min = minimo || Math.max(4, Math.round(0.45*f0)), max = maximo || Math.round(1.6*f0);
  let melhor = -1, dm = Infinity;
  for (let f = inicio + min; f <= Math.min(juntasPorQuadro.length - 1, inicio + max); f++){
    const J = juntasPorQuadro[f], raiz0 = vEntre(J0.quadrilE, J0.quadrilD, 0.5), raiz = vEntre(J.quadrilE, J.quadrilD, 0.5);
    let d = 0;
    for (const n of JUNTAS) d += vDist(vMenos(J[n], raiz), vMenos(J0[n], raiz0));
    if (d < dm){ dm = d; melhor = f; }
  }
  return {fim: melhor, diferenca: dm/JUNTAS.length};
}
/* Pose por angulos anatomicos sobre o parado (ver girarOsso, em rig.js):
   {osso: [frente, abrir, torcer] em graus, raiz: [dx, dy, dz]}. E o jeito de
   escrever uma pose a mao sem depender da proporcao do corpo. */
function poseDeAngulos(juntas, repouso, angulos){
  let p = copiarPose(repouso);
  for (const k in angulos){
    if (k === "raiz") p.raiz = vSoma(p.raiz, angulos.raiz);
    else if (INDICE_OSSO[k] !== undefined) p = girarOsso(juntas, p, k, angulos[k], repouso);
  }
  return p;
}

if (typeof module !== "undefined") module.exports = {
  POSES_ANTIGAS, juntasDaLista, posesAntigas, animacoesIniciais, quadrosDoProjeto, completarCicloEspelhado,
  amostrarClipe, acharCiclo, poseDeAngulos
};
