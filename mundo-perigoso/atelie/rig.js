/* ============================================================
   ATELIE -- O RIG
   ------------------------------------------------------------
   O esqueleto e sempre o mesmo humanoide de 13 juntas, entao nao se
   posiciona junta a mao: `proporRig` le a silhueta em T-pose e propoe tudo
   (braco pela faixa mais larga, ombro pela largura do peito, virilha pelo
   primeiro ponto onde as pernas se juntam, pescoco pela cintura mais fina
   entre ombro e cabeca, cotovelo e joelho pela proporcao do jogo), ja
   simetrico. O arraste no painel e so para o acerto fino.

   Uma pose e uma rotacao por osso a partir da bind pose, mais o quanto a
   bacia saiu do lugar:

     pose = {raiz: [dx, dy, dz], rot: {osso: quaternio local}}

   O quaternio e local: o giro do osso em relacao ao pai, no referencial da
   bind pose. `posarEsqueleto` faz a cinematica direta e devolve, por osso, o
   giro e a translacao que levam um ponto da bind pose para a pose -- e isso
   que a pele usa -- e a posicao de cada junta.

   `poseDasJuntas` faz o caminho de volta, e e o redirecionamento de toda
   animacao que vem de fora (a pose do jogo, captura de movimento): de
   posicoes de junta tira so as DIRECOES dos ossos e aplica nos ossos do
   proprio rig. O angulo vem da fonte; o comprimento de osso, nunca.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof voxelsDoCorpo === "undefined"){
  const M = require("./corpo.js");
  for (const k in M) globalThis[k] = M[k];
}

/* os pontos do atelie que saem das juntas */
function completarPontos(j){
  j.meioQuadril = vEntre(j.quadrilE, j.quadrilD, 0.5);
  j.meioOmbro = vEntre(j.ombroE, j.ombroD, 0.5);
  if (!j.cintura) j.cintura = vEntre(j.meioQuadril, j.meioOmbro, 0.17);
  return j;
}
function copiarPontos(j){ const o = {}; for (const k in j) o[k] = j[k].slice(); return o; }

/* ---------- o rig proposto ---------- */
function proporRig(c){
  const lista = voxelsDoCorpo(c), lim = limitesDoCorpo(c);
  const H = lim[5] - lim[2] + 1, zb = lim[2], CX = CENTRO.CX;
  const avisos = [];
  /* largura por altura, e o que esta em cada altura */
  const xmin = new Array(H).fill(1e9), xmax = new Array(H).fill(-1e9);
  const porZ = [];
  for (let z = 0; z < H; z++) porZ.push([]);
  for (let k = 0; k < lista.length; k++){
    const p = posicaoDaCelula(c, lista[k]), z = p[2] - zb;
    if (p[0] < xmin[z]) xmin[z] = p[0];
    if (p[0] > xmax[z]) xmax[z] = p[0];
    porZ[z].push(p);
  }
  const larg = xmin.map(function(v, z){ return xmax[z] >= v ? xmax[z] - v + 1 : 0; });
  function mediana(l){ const s = l.slice().sort(function(a, b){ return a - b; }); return s.length ? s[s.length >> 1] : 0; }
  const larguraTronco = mediana(larg.slice(Math.round(H*0.45), Math.round(H*0.6)));
  /* a faixa dos bracos: a maior sequencia de alturas bem mais larga que o tronco */
  let melhor = null, ini = -1;
  for (let z = 0; z <= H; z++){
    const larga = z < H && larg[z] > larguraTronco*1.6;
    if (larga && ini < 0) ini = z;
    if (!larga && ini >= 0){ if (!melhor || z - ini > melhor[1] - melhor[0]) melhor = [ini, z]; ini = -1; }
  }
  const R = REPOUSO_DO_JOGO, esc = H/117;
  if (!melhor){
    avisos.push("nao achei bracos esticados: o corpo nao parece estar em T-pose. O rig veio da proporcao do jogo e precisa de acerto a mao.");
    return {juntas: rigDaProporcao(H), avisos: avisos};
  }
  /* a ponta do braco e o eixo dele (media da parte de fora) */
  const envergadura = Math.max(CX - Math.min.apply(null, xmin), Math.max.apply(null, xmax) - CX);
  let sz = 0, sy = 0, sn = 0;
  for (let z = melhor[0]; z < melhor[1]; z++) for (const p of porZ[z])
    if (Math.abs(p[0] - CX) > envergadura*0.7){ sz += p[2]; sy += p[1]; sn++; }
  const zBraco = sz/sn, yBraco = sy/sn;
  /* o ombro fica na borda do peito, logo abaixo da axila: mais para dentro,
     o braco pendurado entra no tronco */
  const peito = [];
  for (let z = Math.max(0, melhor[0] - 12); z < melhor[0] - 3; z++) peito.push(Math.max(CX - xmin[z], xmax[z] - CX));
  const meioPeito = mediana(peito) || larguraTronco/2;
  /* no maximo 14 do centro (em 117): ombreira e pelerine alargam o peito, mas o
     jogo espera o ombro onde o de uma pessoa fica -- com a junta mais para
     fora, o braco pendurado nasce fora do lugar da mao e da arma, e a captura
     amortece o braco quase todo. A ombreira fica de fora da junta e o peso
     geodesico a leva junto. */
  const xOmbro = Math.min(meioPeito + 1*esc, 14*esc);
  /* o braco do ombro a ponta, nas proporcoes do jogo: cotovelo a 43% e a
     junta da mao a 80% (a mao passa da junta ate a ponta dos dedos) */
  const Lb = envergadura - xOmbro;
  const xCotovelo = xOmbro + Lb*0.43, xMao = xOmbro + Lb*0.8;
  /* a virilha: subindo do chao, a primeira altura em que o meio fica cheio.
     Capa, saia e tabardo enchem o meio bem abaixo da virilha de verdade: so
     conta o que esta na frente do corpo (a capa cai atras), e se mesmo assim
     ela sai da faixa humana (24 a 40% da altura) vale a proporcao do jogo. */
  let zVirilha = -1;
  const Y_FRENTE = CENTRO.CY + 3*esc;
  for (let z = Math.round(H*0.08); z < Math.round(H*0.6); z++){
    if (porZ[z].some(function(p){ return Math.abs(p[0] - CX) <= 1 && p[1] < Y_FRENTE; })){ zVirilha = z; break; }
  }
  if (zVirilha >= 0 && (zVirilha < H*0.24 || zVirilha > H*0.40)){
    avisos.push("a virilha achada (" + zVirilha + ") ficou fora do que uma pessoa tem, provavelmente por causa de capa ou saia: veio da proporcao do jogo");
    zVirilha = -1;
    for (let z = Math.round(H*0.08); z < Math.round(H*0.6); z++) zVirilha = zVirilha;   // nada: a proporcao entra logo abaixo
  }
  if (zVirilha < 0){ zVirilha = Math.round(H*0.29); if (!avisos.length) avisos.push("nao achei onde as pernas se juntam; a virilha veio da proporcao do jogo"); }
  function centroDaPerna(z, lado){
    let x = 0, y = 0, n = 0;
    for (const p of porZ[Math.max(0, Math.min(H - 1, Math.round(z)))] || [])
      if (lado*(p[0] - CX) > 0.5){ x += p[0]; y += p[1]; n++; }
    return n ? [x/n, y/n] : [CX + lado*8*esc, CENTRO.CY];
  }
  const zQuadril = zVirilha + 3*esc;
  const q = centroDaPerna(zVirilha - 3*esc, 1);
  const zPe = 5*esc, pe = centroDaPerna(12*esc, 1);
  const zJoelho = zPe + (zQuadril - zPe)*0.47, joelho = centroDaPerna(zJoelho, 1);
  /* ponta do pe: o y mais a frente perto do chao */
  let yPonta = 1e9;
  for (let z = 0; z < Math.round(6*esc); z++) for (const p of porZ[z]) if (p[0] > CX && p[1] < yPonta) yPonta = p[1];
  /* o pescoco: a altura mais estreita entre o topo dos bracos e 85% da altura */
  let zPescoco = Math.round(84*esc), mais = 1e9;
  /* o pescoco fica ate 80% da altura: gola de pele ou capuz estreitam mais acima, no queixo */
  for (let z = melhor[1]; z < Math.round(H*0.80); z++){
    const l = porZ[z].filter(function(p){ return Math.abs(p[0] - CX) < larguraTronco; });
    if (!l.length) continue;
    const w = Math.max.apply(null, l.map(function(p){ return Math.abs(p[0] - CX); }));
    if (w < mais){ mais = w; zPescoco = z; }
  }
  let hy = 0, hz = 0, hn = 0, yPesc = 0, nPesc = 0;
  for (let z = zPescoco; z < H; z++) for (const p of porZ[z]){ hy += p[1]; hz += p[2]; hn++; if (z === zPescoco){ yPesc += p[1]; nPesc++; } }
  /* a junta da cabeca fica 15 voxels (em 117) abaixo do topo: e nessa medida
     que elmo, capuz e cabelo do jogo foram feitos. No centro de massa, com o
     cabelo junto, ela subia e o elmo vazava por cima da grade. */
  const j = {
    cabeca: [CX, hy/hn, zb + H - 1 - 15*esc], pescoco: [CX, nPesc ? yPesc/nPesc : CENTRO.CY, zb + zPescoco - 2*esc],
    ombroE: [CX - xOmbro, yBraco, zBraco], ombroD: [CX + xOmbro, yBraco, zBraco],
    cotoveloE: [CX - xCotovelo, yBraco, zBraco], cotoveloD: [CX + xCotovelo, yBraco, zBraco],
    maoE: [CX - xMao, yBraco, zBraco], maoD: [CX + xMao, yBraco, zBraco],
    quadrilE: [2*CX - q[0], q[1], zb + zQuadril], quadrilD: [q[0], q[1], zb + zQuadril],
    joelhoE: [2*CX - joelho[0], joelho[1], zb + zJoelho], joelhoD: [joelho[0], joelho[1], zb + zJoelho],
    peE: [2*CX - pe[0], pe[1], zb + zPe], peD: [pe[0], pe[1], zb + zPe],
    pontaMaoE: [CX - envergadura, yBraco, zBraco], pontaMaoD: [CX + envergadura, yBraco, zBraco],
    topoCabeca: [CX, hy/hn, zb + H - 1],
    pontaPeE: [2*CX - pe[0], yPonta < 1e9 ? yPonta + 1 : pe[1] - 8, zb + 2], pontaPeD: [pe[0], yPonta < 1e9 ? yPonta + 1 : pe[1] - 8, zb + 2]
  };
  for (const k in j) j[k] = j[k].map(function(v){ return Math.round(v*2)/2; });
  return {juntas: completarPontos(j), avisos: avisos};
}
/* sem T-pose reconhecivel: a pose do jogo com o braco esticado */
function rigDaProporcao(H){
  const R = REPOUSO_DO_JOGO, k = (H || 117)/117, j = {};
  for (const n in R) j[n] = [CENTRO.CX + (R[n][0] - CENTRO.CX)*k, R[n][1], R[n][2]*k];
  for (const lado of ["E", "D"]){
    const s = lado === "E" ? -1 : 1, o = j["ombro" + lado];
    const b = vDist(R["ombro" + lado], R["cotovelo" + lado])*k, a = vDist(R["cotovelo" + lado], R["mao" + lado])*k;
    j["cotovelo" + lado] = [o[0] + s*b, o[1], o[2]];
    j["mao" + lado] = [o[0] + s*(a + b), o[1], o[2]];
    j["pontaMao" + lado] = [o[0] + s*(a + b + 8*k), o[1], o[2]];
    j["pontaPe" + lado] = [j["pe" + lado][0], j["pe" + lado][1] - 9*k, 2*k];
  }
  j.topoCabeca = [CENTRO.CX, CENTRO.CY, 116*k];
  return completarPontos(j);
}
/* Deixa o rig simetrico: cada par E/D vira a media dos dois espelhados, e
   o que e do meio fica em x = CX. `lado` ("E" ou "D") copia um lado no
   outro em vez de tirar a media. */
function simetrizar(j, lado){
  const o = copiarPontos(j);
  for (const k in j){
    const m = espelhoDoNome(k);
    if (m === k){ if (!/^meio|^cintura|^cabeca|^pescoco|^topo/.test(k)) continue; o[k][0] = CENTRO.CX; continue; }
    const a = j[k], b = j[m], bx = 2*CENTRO.CX - b[0];
    if (!lado) o[k] = [(a[0] + bx)/2, (a[1] + b[1])/2, (a[2] + b[2])/2];
    else if (k.slice(-1) !== lado) o[k] = [bx, b[1], b[2]];
  }
  return completarPontos(o);
}

/* ---------- cinematica direta ---------- */
function poseNeutra(){ const rot = {}; for (const o of OSSOS) rot[o.nome] = Q_ID.slice(); return {raiz: [0, 0, 0], rot: rot}; }
function copiarPose(p){ const rot = {}; for (const k in p.rot) rot[k] = p.rot[k].slice(); return {raiz: p.raiz.slice(), rot: rot}; }
/* Por osso: q (giro no mundo) e t (translacao), tais que um ponto p da bind
   pose vai para qGira(q, p) + t. E as juntas posadas. */
function posarEsqueleto(juntas, pose){
  const q = [], t = [], pivos = [];
  for (const o of OSSOS){
    const L = (pose.rot && pose.rot[o.nome]) || Q_ID, P0 = juntas[o.pivo];
    let W, P1;
    if (o.iPai < 0){ W = qNorm(L); P1 = vSoma(P0, pose.raiz || [0, 0, 0]); }
    else { W = qNorm(qMul(q[o.iPai], L)); P1 = vSoma(qGira(q[o.iPai], P0), t[o.iPai]); }
    q.push(W); pivos.push(P1);
    t.push(vMenos(P1, qGira(W, P0)));
  }
  const posadas = {};
  for (const nome of TODOS_OS_PONTOS){
    const i = INDICE_OSSO[OSSO_DO_PONTO[nome]];
    if (juntas[nome]) posadas[nome] = vSoma(qGira(q[i], juntas[nome]), t[i]);
  }
  return {q: q, t: t, juntas: posadas};
}

/* ---------- redirecionar: de posicoes de junta para rotacao ----------
   `alvo` sao posicoes de junta de uma fonte qualquer (cada uma com as
   proporcoes dela). `repouso`, se vier, e a pose local de referencia da
   torcao: cada osso vai da direcao que tem no repouso para a do alvo pelo
   menor arco, transportado pela cadeia -- assim o braco que desce de T-pose
   ate pendurado nao ganha torcao nenhuma, e o antebraco herda a torcao do
   braco em vez de inventar a propria. */
function poseDasJuntas(juntas, alvo, opcoes){
  opcoes = opcoes || {};
  const A = completarPontos(copiarPontos(alvo));
  const rep = opcoes.repouso || poseNeutra();
  const W = [], pose = {raiz: [0, 0, 0], rot: {}};
  const J = juntas;
  function dir(nomeA, nomeB, P){ return vMenos(P[nomeB], P[nomeA]); }
  for (const o of OSSOS){
    const Lrep = rep.rot[o.nome] || Q_ID, Wpai = o.iPai < 0 ? Q_ID : W[o.iPai];
    const inicial = qNorm(qMul(Wpai, Lrep));             // o osso se so herdasse do pai, no repouso
    let Wo;
    /* a cabeca mira a junta "cabeca" do jogo, que toda fonte tem */
    const mira = o.nome === "cabeca" ? "cabeca" : o.ponta;
    if (o.nome === "bacia"){
      /* bacia: a linha dos quadris manda, e o "para cima" do repouso fica */
      const l0 = qGira(inicial, dir("quadrilE", "quadrilD", J)), cima = qGira(inicial, [0, 0, 1]);
      Wo = qNorm(qMul(qDeReferencial(l0, cima, dir("quadrilE", "quadrilD", A), cima), inicial));
    } else if (o.nome === "tronco"){
      /* tronco: a coluna manda, a linha dos ombros da a torcao */
      const s0 = qGira(inicial, dir("cintura", "meioOmbro", J)), o0 = qGira(inicial, dir("ombroE", "ombroD", J));
      Wo = qNorm(qMul(qDeReferencial(s0, o0, dir("meioQuadril", "meioOmbro", A), dir("ombroE", "ombroD", A)), inicial));
    } else if (!A[mira] || !A[o.pivo] || (o.nome.indexOf("pe") === 0 && !opcoes.comPes)){
      Wo = inicial;                                       // a fonte nao diz: acompanha o pai
    } else {
      const d0 = qGira(inicial, dir(o.pivo, mira, J)), d1 = dir(o.pivo, mira, A);
      Wo = qNorm(qMul(qArco(d0, d1), inicial));
    }
    W.push(Wo);
    pose.rot[o.nome] = qNorm(qMul(qConj(Wpai), Wo));
  }
  /* a bacia anda o quanto a fonte andou, na escala das pernas do rig */
  if (opcoes.raizDe){
    const k = opcoes.escalaRaiz || 1;
    pose.raiz = vEscala(vMenos(A.meioQuadril, completarPontos(copiarPontos(opcoes.raizDe)).meioQuadril), k);
  } else pose.raiz = vMenos(A.meioQuadril, J.meioQuadril);
  return pose;
}
/* o comprimento da perna (quadril ao pe), para escalar o quanto a bacia anda */
function comprimentoDaPerna(j){ return vDist(j.quadrilE, j.joelhoE) + vDist(j.joelhoE, j.peE); }

/* O redirecionamento por diferenca, que e o que a fonte com outra postura
   pede: o quanto cada osso da fonte girou do REPOUSO DELA ate a pose e
   aplicado por cima do repouso do rig. O boneco esculpido guarda a propria
   postura (a cabeca dele nao passa a olhar para baixo so porque o desenho
   antigo olhava), e so o movimento vem da fonte.

   `repousoAlvo` e a pose parada do rig; `fonteRepouso` e `fonteAlvo` sao
   juntas da fonte. A bacia anda o que a fonte andou, na escala da perna, e o
   pe mais baixo fica a mesma altura do chao que o da fonte. */
function poseRelativa(juntas, repousoAlvo, fonteRepouso, fonteAlvo, opcoes){
  opcoes = opcoes || {};
  const FR = completarPontos(copiarPontos(fonteRepouso));
  const fonte = poseDasJuntas(FR, fonteAlvo, {comPes: opcoes.comPes});
  const Wf = posarEsqueleto(FR, fonte).q, Wr = posarEsqueleto(juntas, repousoAlvo).q;
  const W = [], pose = {raiz: [0, 0, 0], rot: {}};
  for (const o of OSSOS){
    W.push(qNorm(qMul(Wf[o.indice], Wr[o.indice])));
    pose.rot[o.nome] = qNorm(qMul(o.iPai < 0 ? Q_ID : qConj(W[o.iPai]), W[o.indice]));
  }
  const k = opcoes.escalaRaiz || comprimentoDaPerna(juntas)/comprimentoDaPerna(FR);
  pose.raiz = vSoma(repousoAlvo.raiz, vEscala(fonte.raiz, k));
  const nivelada = opcoes.comPes ? pose : nivelarPes(juntas, pose, repousoAlvo);
  if (opcoes.apoio === false) return nivelada;
  /* A sola da fonte: o ponto mais baixo entre tornozelo e ponta do pe, cada
     um medido contra a altura que tinha no repouso. So pelo tornozelo, o
     ator na ponta do pe (tornozelo alto, sola no chao) deixava o personagem
     flutuando. */
  function sola(P){
    let m = Math.min(P.peE[2] - FR.peE[2], P.peD[2] - FR.peD[2]);
    if (opcoes.comPes && P.pontaPeE && FR.pontaPeE) m = Math.min(m, P.pontaPeE[2] - FR.pontaPeE[2], P.pontaPeD[2] - FR.pontaPeD[2]);
    return m;
  }
  return apoiarNoChao(juntas, nivelada, sola(fonteAlvo)*k);
}
/* Pe nivelado: o pe aponta para onde a canela levou, mas com a inclinacao
   que tem no repouso -- sem isso o pe gira junto com a canela e a ponta
   entra no chao. */
function nivelarPes(juntas, pose, repouso){
  const nova = copiarPose(pose), s = posarEsqueleto(juntas, pose), sr = posarEsqueleto(juntas, repouso);
  for (const nome of ["peE", "peD"]){
    const o = OSSOS[INDICE_OSSO[nome]], d = vMenos(juntas[o.ponta], juntas[o.pivo]);
    const u = qGira(s.q[o.indice], d), r = vNorm(qGira(sr.q[o.indice], d));
    const h = Math.hypot(u[0], u[1]);
    if (h < 1e-6) continue;
    const hr = Math.sqrt(Math.max(0, 1 - r[2]*r[2]));
    const v = [u[0]/h*hr, u[1]/h*hr, r[2]];
    const W = qNorm(qMul(qArco(u, v), s.q[o.indice]));
    nova.rot[nome] = qNorm(qMul(qConj(s.q[o.iPai]), W));
  }
  return nova;
}
/* A sola de cada pe, na bind pose: o calcanhar (atras do tornozelo) e a
   ponta, embaixo do pe (a ponta do pe do rig fica 2 voxels acima da sola).
   Andam com o osso do pe. */
function solas(juntas){
  const l = [];
  for (const lado of ["E", "D"]){
    const pe = juntas["pe" + lado], ponta = juntas["pontaPe" + lado], sola = ponta[2] - 2;
    l.push({osso: "pe" + lado, p: [pe[0], pe[1] + 3, sola]}, {osso: "pe" + lado, p: [ponta[0], ponta[1], sola]});
  }
  return l;
}
/* a altura do ponto mais baixo das solas posadas (o chao do jogo e z 0) */
function alturaDasSolas(juntas, s){
  let m = Infinity;
  for (const so of solas(juntas)){ const i = INDICE_OSSO[so.osso]; m = Math.min(m, qGira(s.q[i], so.p)[2] + s.t[i][2]); }
  return m;
}
/* sobe ou desce a bacia para a sola mais baixa ficar `altura` acima do chao
   -- pela sola e nao pelo tornozelo: com o pe inclinado, a ponta entrava no
   chao */
function apoiarNoChao(juntas, pose, altura){
  const nova = copiarPose(pose);
  nova.raiz[2] += (altura || 0) - alturaDasSolas(juntas, posarEsqueleto(juntas, pose));
  return nova;
}
/* Inclina o pe em relacao ao CHAO, nao a canela: positivo levanta a ponta.
   O pe e primeiro nivelado com o repouso e depois gira em volta do eixo
   deitado que cruza ele. */
function inclinarPe(juntas, pose, pe, graus, repouso){
  const nivel = nivelarPes(juntas, pose, repouso), s = posarEsqueleto(juntas, nivel), o = OSSOS[INDICE_OSSO[pe]];
  const f = qGira(s.q[o.indice], vMenos(juntas[o.ponta], juntas[o.pivo])), h = vNorm([f[0], f[1], 0]);
  const eixo = vCruz(h, [0, 0, 1]);
  const W = qNorm(qMul(qEixoAngulo(eixo, graus || 0), s.q[o.indice]));
  nivel.rot[pe] = qNorm(qMul(qConj(s.q[o.iPai]), W));
  return nivel;
}
/* A pose parada do rig: bracos e pernas vao para a direcao que tem no
   REPOUSO do jogo (braco pendurado, pe no chao), tronco e cabeca ficam com a
   postura esculpida. */
function repousoDoRig(juntas){
  const abs = poseDasJuntas(juntas, REPOUSO_DO_JOGO, {raizDe: REPOUSO_DO_JOGO}), W = posarEsqueleto(juntas, abs).q;
  const p = poseNeutra();
  /* com tronco e bacia parados, o braco guarda o giro que tinha no mundo; o
     antebraco, o giro em relacao a ele. A perna fica como o modelo foi
     esculpido: ele ja vem de pe, e levar a perna ao REPOUSO do jogo (quadril
     a 37, joelho a 20 e um pouco a frente) entortava o joelho de quem tem
     outra proporcao -- o guerreiro parado ficava de pernas tortas (1/10). */
  for (const n of ["bracoE", "bracoD"]) p.rot[n] = W[INDICE_OSSO[n]];
  for (const n of ["antebracoE", "antebracoD"]) p.rot[n] = abs.rot[n];
  return apoiarNoChao(juntas, nivelarPes(juntas, p, poseNeutra()), 0);
}

/* ---------- espelhar uma pose ----------
   Troca E por D e espelha cada giro pelo plano do meio do corpo: o passo
   da perna esquerda vira o da direita. E como um ciclo de andar ou correr
   precisa de metade dos quadros desenhados. */
function espelharPose(p){
  const rot = {};
  for (const o of OSSOS){ const m = espelhoDoNome(o.nome); rot[m] = qEspelho(p.rot[o.nome] || Q_ID); }
  return {raiz: [-p.raiz[0], p.raiz[1], p.raiz[2]], rot: rot};
}
/* entre duas poses: giro por slerp, raiz em linha reta */
function misturarPoses(a, b, t){
  const rot = {};
  for (const o of OSSOS) rot[o.nome] = qSlerp(a.rot[o.nome] || Q_ID, b.rot[o.nome] || Q_ID, t);
  return {raiz: vEntre(a.raiz, b.raiz, t), rot: rot};
}

/* ---------- cinematica inversa de dois ossos ----------
   Arrastar a mao ou o pe: braco e antebraco (ou coxa e canela) mantem o
   comprimento, a junta do meio dobra no plano em que ja estava. */
function ikDeDoisOssos(juntas, pose, ossoA, ossoB, alvo){
  const iA = INDICE_OSSO[ossoA], iB = INDICE_OSSO[ossoB], oA = OSSOS[iA], oB = OSSOS[iB];
  const s = posarEsqueleto(juntas, pose);
  const P = s.juntas, raiz = P[oA.pivo], meio = P[oB.pivo], ponta = P[oB.ponta];
  const a = vDist(juntas[oA.pivo], juntas[oA.ponta]), b = vDist(juntas[oB.pivo], juntas[oB.ponta]);
  const paraAlvo = vMenos(alvo, raiz), d = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, vTam(paraAlvo)));
  const u = vNorm(paraAlvo);
  /* o plano da dobra: o que o meio tem de fora da reta raiz->ponta hoje */
  let polo = vMenos(meio, vSoma(raiz, vEscala(u, vPonto(vMenos(meio, raiz), u))));
  if (vTam(polo) < 1e-3) polo = qGira(s.q[iA], /coxa/.test(ossoA) ? [0, -1, 0] : [0, 1, 0]);
  const v = vNorm(vMenos(polo, vEscala(u, vPonto(polo, u))));
  const cosA = (a*a + d*d - b*b)/(2*a*d), sinA = Math.sqrt(Math.max(0, 1 - cosA*cosA));
  const novoMeio = vSoma(raiz, vSoma(vEscala(u, a*cosA), vEscala(v, a*sinA)));
  const novaPonta = vSoma(raiz, vEscala(u, d));
  const nova = copiarPose(pose);
  const Wpai = oA.iPai < 0 ? Q_ID : s.q[oA.iPai];
  const WA = qNorm(qMul(qArco(vMenos(meio, raiz), vMenos(novoMeio, raiz)), s.q[iA]));
  nova.rot[ossoA] = qNorm(qMul(qConj(Wpai), WA));
  const WBantes = qNorm(qMul(WA, pose.rot[ossoB] || Q_ID));
  const dirB = qGira(WBantes, vMenos(juntas[oB.ponta], juntas[oB.pivo]));
  const WB = qNorm(qMul(qArco(dirB, vMenos(novaPonta, novoMeio)), WBantes));
  nova.rot[ossoB] = qNorm(qMul(qConj(WA), WB));
  return nova;
}
/* ---------- angulos anatomicos ----------
   O painel e as animacoes escritas a mao falam em angulo a partir do
   PARADO, em eixos do mundo presos ao pai: X gira em volta do eixo
   esquerda-direita (frente e tras), Y em volta do eixo frente-costas (abrir
   para o lado), Z em volta do vertical (torcer). O giro local guardado na
   pose e medido na bind pose (T-pose), onde o eixo do antebraco nem aponta
   para baixo -- dali "frente" do antebraco seria torcao. Por isso a conta:

     giro no mundo do osso = pai no mundo * (pai no parado)^-1 * Q(angulos) * osso no parado

   Os sinais sao escolhidos para o numero dizer a mesma coisa nos dois lados
   e em osso que aponta para baixo ou para cima: X positivo leva a frente
   (braco, coxa, tronco inclinando, cabeca baixando), Y positivo abre para
   fora do corpo, Z positivo torce a frente do membro para fora. Uma pose
   espelhada tem os mesmos numeros do outro lado. */
function sinaisDoOsso(juntas, osso){
  const o = OSSOS[INDICE_OSSO[osso]], d = vMenos(juntas[o.ponta], juntas[o.pivo]);
  const lado = /D$/.test(osso) ? -1 : 1, desce = o.iPai >= 0 && !/^(tronco|cabeca)$/.test(osso) ? -1 : 1;
  return [desce, lado, lado];
}
function eulerComSinal(e, s){ return [(e[0] || 0)*s[0], (e[1] || 0)*s[1], (e[2] || 0)*s[2]]; }
function girarOsso(juntas, pose, osso, euler, repouso){
  const o = OSSOS[INDICE_OSSO[osso]], nova = copiarPose(pose);
  const Wr = posarEsqueleto(juntas, repouso).q;
  const Wrp = o.iPai < 0 ? Q_ID : Wr[o.iPai];
  nova.rot[osso] = qNorm(qMul(qConj(Wrp), qMul(qDeEuler(eulerComSinal(euler, sinaisDoOsso(juntas, osso))), Wr[o.indice])));
  return nova;
}
function eulerDoOsso(juntas, pose, osso, repouso){
  const o = OSSOS[INDICE_OSSO[osso]], Wr = posarEsqueleto(juntas, repouso).q;
  const Wrp = o.iPai < 0 ? Q_ID : Wr[o.iPai];
  const Q = qMul(Wrp, qMul(pose.rot[osso] || Q_ID, qConj(Wr[o.indice])));
  return eulerComSinal(qParaEuler(Q), sinaisDoOsso(juntas, osso));
}

if (typeof module !== "undefined") module.exports = {
  completarPontos, copiarPontos, proporRig, rigDaProporcao, simetrizar,
  poseNeutra, copiarPose, posarEsqueleto, poseDasJuntas, comprimentoDaPerna,
  poseRelativa, nivelarPes, solas, alturaDasSolas, apoiarNoChao, inclinarPe, repousoDoRig,
  espelharPose, misturarPoses, ikDeDoisOssos, sinaisDoOsso, girarOsso, eulerDoOsso
};
