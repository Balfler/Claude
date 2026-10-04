/* ============================================================
   ATELIE -- CAPTURA DE MOVIMENTO
   ------------------------------------------------------------
   Importar captura e redirecionar para o esqueleto de 13 juntas, sem
   script avulso: le o arquivo, acha as juntas pelo nome, calcula a posicao
   de cada junta em cada quadro, e dai em diante e o mesmo caminho de toda
   animacao que vem de fora (poseDasJuntas, em rig.js) -- a DIRECAO de cada
   osso vem da captura, o comprimento e o do rig.

   Formatos:
   - BVH (o de sempre: CMU, Mixamo convertido, Blender, MotionBuilder);
   - JSON de posicoes: {"quadros": [{"cabeca": [x,y,z], ...}, ...]}, com os
     nomes do jogo ou de qualquer esqueleto conhecido;
   - JSON de rotacao por osso, tipo SMPL: {"esqueleto": "smpl", "quadros":
     [[72 numeros: eixo-angulo local de cada uma das 24 juntas], ...],
     "translacao": [[x,y,z], ...]} -- ou com o proprio "repouso" e "pais".

   Os eixos da fonte nao importam: o "para cima" sai da cabeca menos a bacia
   no repouso, o "direito" do ombro direito menos o esquerdo, e a frente e o
   produto dos dois. Assim um arquivo de maos trocadas (sistema de eixos
   espelhado) ainda cai com a direita na direita.

   E e o personagem que anda no lugar: a bacia so sobe e desce (na escala
   da perna do rig), sem andar pelo chao.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof posarEsqueleto === "undefined"){
  const M = require("./rig.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof acharCiclo === "undefined"){
  const M = require("./animacao.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof caberPose === "undefined"){
  const M = require("./encaixe.js");
  for (const k in M) globalThis[k] = M[k];
}

/* Os nomes de cada junta do jogo nos esqueletos conhecidos, em minusculas e
   sem prefixo ("mixamorig:", "bip01 "...). E = o lado DIREITO do
   personagem: no jogo o x cresce para a direita de quem olha de frente, e o
   lado E (x menor) e a mao direita dele. */
const NOMES_DE_JUNTA = {
  bacia:     ["hips", "pelvis", "hip", "root", "bip01 pelvis", "mixamorig:hips"],
  cabeca:    ["head"],
  pescoco:   ["neck", "neck1", "neck_01"],
  ombroE:    ["rightarm", "right_shoulder", "rshoulder", "r upperarm", "upperarm_r", "rightupperarm", "r_upperarm"],
  ombroD:    ["leftarm", "left_shoulder", "lshoulder", "l upperarm", "upperarm_l", "leftupperarm", "l_upperarm"],
  cotoveloE: ["rightforearm", "right_elbow", "relbow", "r forearm", "lowerarm_r", "rightlowerarm", "r_forearm"],
  cotoveloD: ["leftforearm", "left_elbow", "lelbow", "l forearm", "lowerarm_l", "leftlowerarm", "l_forearm"],
  maoE:      ["righthand", "right_wrist", "rwrist", "r hand", "hand_r", "r_hand"],
  maoD:      ["lefthand", "left_wrist", "lwrist", "l hand", "hand_l", "l_hand"],
  quadrilE:  ["rightupleg", "right_hip", "rhip", "r thigh", "thigh_r", "rightupperleg", "r_thigh"],
  quadrilD:  ["leftupleg", "left_hip", "lhip", "l thigh", "thigh_l", "leftupperleg", "l_thigh"],
  joelhoE:   ["rightleg", "right_knee", "rknee", "r calf", "calf_r", "rightlowerleg", "r_calf"],
  joelhoD:   ["leftleg", "left_knee", "lknee", "l calf", "calf_l", "leftlowerleg", "l_calf"],
  peE:       ["rightfoot", "right_ankle", "rankle", "r foot", "foot_r", "r_foot"],
  peD:       ["leftfoot", "left_ankle", "lankle", "l foot", "foot_l", "l_foot"],
  pontaPeE:  ["righttoebase", "right_foot", "rtoe", "r toe0", "ball_r", "righttoes", "r_toe"],
  pontaPeD:  ["lefttoebase", "left_foot", "ltoe", "l toe0", "ball_l", "lefttoes", "l_toe"]
};
function nomeLimpo(n){ return String(n).toLowerCase().replace(/^.*:/, "").replace(/^bip0?1[ _]/, "").trim(); }
/* acha, para cada junta do jogo, o indice da junta da fonte */
function mapearNomes(nomes){
  const limpos = nomes.map(nomeLimpo), mapa = {};
  for (const alvo in NOMES_DE_JUNTA){
    for (const n of NOMES_DE_JUNTA[alvo]){ const i = limpos.indexOf(n); if (i >= 0){ mapa[alvo] = i; break; } }
    if (mapa[alvo] === undefined && nomes.indexOf(alvo) >= 0) mapa[alvo] = nomes.indexOf(alvo);     // ja com os nomes do jogo
  }
  return mapa;
}

/* ---------- BVH ---------- */
function lerBvh(texto){
  const t = String(texto).split(/\s+/).filter(Boolean);
  let i = 0;
  const juntas = [];
  function bloco(pai){
    const tipo = t[i++];                               // ROOT, JOINT ou End
    let nome = t[i++];
    if (tipo === "End") nome = (pai >= 0 ? juntas[pai].nome : "") + "_ponta";
    const j = {nome: nome, pai: pai, offset: [0, 0, 0], canais: [], fim: tipo === "End"};
    const idx = juntas.length;
    juntas.push(j);
    if (t[i++] !== "{") throw new Error("BVH: esperava { em " + nome);
    while (t[i] !== "}"){
      const p = t[i++];
      if (p === "OFFSET"){ j.offset = [+t[i], +t[i + 1], +t[i + 2]]; i += 3; }
      else if (p === "CHANNELS"){ const n = +t[i++]; for (let k = 0; k < n; k++) j.canais.push(t[i++].toLowerCase()); }
      else if (p === "JOINT" || p === "End"){ i--; bloco(idx); }
      else throw new Error("BVH: palavra inesperada " + p);
    }
    i++;
  }
  while (i < t.length && t[i] !== "ROOT") i++;
  if (i >= t.length) throw new Error("BVH sem ROOT");
  bloco(-1);
  while (i < t.length && t[i] !== "Frames:") i++;
  const nQuadros = +t[i + 1];
  i += 2;
  if (t[i] === "Frame" && t[i + 1] === "Time:") i += 2;
  const tempo = +t[i++];
  const quadros = [];
  for (let q = 0; q < nQuadros; q++){
    const juntasQ = [];
    const W = [], P = [];
    for (let k = 0; k < juntas.length; k++){
      const j = juntas[k];
      let pos = j.offset.slice(), R = Q_ID;
      for (const c of j.canais){
        const v = +t[i++];
        if (c === "xposition") pos[0] = v; else if (c === "yposition") pos[1] = v; else if (c === "zposition") pos[2] = v;
        else if (c === "xrotation") R = qMul(R, qEixoAngulo([1, 0, 0], v));
        else if (c === "yrotation") R = qMul(R, qEixoAngulo([0, 1, 0], v));
        else if (c === "zrotation") R = qMul(R, qEixoAngulo([0, 0, 1], v));
      }
      if (j.pai < 0){ W.push(R); P.push(pos); }
      else { W.push(qMul(W[j.pai], R)); P.push(vSoma(P[j.pai], qGira(W[j.pai], pos))); }
    }
    quadros.push(P);
  }
  /* o repouso: todas as rotacoes zeradas, so os offsets */
  const repouso = [];
  for (const j of juntas) repouso.push(j.pai < 0 ? j.offset.slice() : vSoma(repouso[j.pai], j.offset));
  return {nomes: juntas.map(function(j){ return j.nome; }), repouso: repouso, quadros: quadros, fps: tempo ? 1/tempo : 30, origem: "BVH"};
}

/* ---------- SMPL ---------- */
const SMPL_NOMES = ["pelvis", "left_hip", "right_hip", "spine1", "left_knee", "right_knee", "spine2", "left_ankle", "right_ankle",
  "spine3", "left_foot", "right_foot", "neck", "left_collar", "right_collar", "head", "left_shoulder", "right_shoulder",
  "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hand", "right_hand"];
const SMPL_PAIS = [-1, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 12, 13, 14, 16, 17, 18, 19, 20, 21];
/* Repouso APROXIMADO do SMPL neutro (metros, y para cima, olhando para +z):
   so a direcao dos ossos importa no redirecionamento, e a proporcao de um
   adulto medio basta. Um arquivo que traga o proprio "repouso" usa o dele. */
const SMPL_REPOUSO = [[0, 0.93, 0], [0.08, 0.84, 0], [-0.08, 0.84, 0], [0, 1.04, -0.01], [0.1, 0.46, 0], [-0.1, 0.46, 0],
  [0, 1.17, 0], [0.1, 0.07, -0.03], [-0.1, 0.07, -0.03], [0, 1.22, 0.01], [0.11, 0.02, 0.1], [-0.11, 0.02, 0.1],
  [0, 1.43, -0.01], [0.07, 1.35, 0], [-0.07, 1.35, 0], [0, 1.52, 0.03], [0.18, 1.39, -0.01], [-0.18, 1.39, -0.01],
  [0.44, 1.38, -0.03], [-0.44, 1.38, -0.03], [0.69, 1.39, -0.03], [-0.69, 1.39, -0.03], [0.77, 1.38, -0.04], [-0.77, 1.38, -0.04]];
function eixoAnguloParaQ(v){
  const a = Math.hypot(v[0], v[1], v[2]);
  return a < 1e-9 ? Q_ID : qEixoAngulo([v[0]/a, v[1]/a, v[2]/a], a*180/Math.PI);
}
/* rotacao local por junta (eixo-angulo ou quaternio [w,x,y,z]) -> posicoes */
function lerRotacoes(o){
  const nomes = o.nomes || SMPL_NOMES, pais = o.pais || SMPL_PAIS, repouso = o.repouso || SMPL_REPOUSO;
  const quadros = o.quadros.map(function(q, f){
    const rot = [];
    for (let k = 0; k < nomes.length; k++){
      let r;
      if (Array.isArray(q[0])) r = q[k] || [0, 0, 0];
      else if (!Array.isArray(q) && q[nomes[k]]) r = q[nomes[k]];
      else r = [q[k*3] || 0, q[k*3 + 1] || 0, q[k*3 + 2] || 0];
      rot.push(r.length === 4 ? qNorm(r) : eixoAnguloParaQ(r));
    }
    const W = [], P = [], trans = (o.translacao && o.translacao[f]) || [0, 0, 0];
    for (let k = 0; k < nomes.length; k++){
      if (pais[k] < 0){ W.push(rot[k]); P.push(vSoma(repouso[k], trans)); }
      else { W.push(qMul(W[pais[k]], rot[k])); P.push(vSoma(P[pais[k]], qGira(W[pais[k]], vMenos(repouso[k], repouso[pais[k]])))); }
    }
    return P;
  });
  return {nomes: nomes, repouso: repouso, quadros: quadros, fps: o.fps || 30, origem: o.esqueleto || "rotacoes"};
}

/* le qualquer formato; devolve as juntas do jogo por quadro, nos eixos do
   jogo, e o repouso da fonte */
function lerCaptura(texto, extensao){
  let bruto;
  if (/bvh$/i.test(extensao || "") || /^\s*HIERARCHY/.test(texto)) bruto = lerBvh(texto);
  else {
    const o = typeof texto === "string" ? JSON.parse(texto) : texto;
    if (o.quadros && o.quadros.length && (Array.isArray(o.quadros[0]) || o.esqueleto)) bruto = lerRotacoes(o);
    else {
      /* posicoes por nome */
      const nomes = Object.keys(o.quadros[0]);
      bruto = {nomes: nomes, quadros: o.quadros.map(function(q){ return nomes.map(function(n){ return q[n]; }); }),
               repouso: o.repouso ? nomes.map(function(n){ return o.repouso[n]; }) : null, fps: o.fps || 30, origem: "posicoes"};
    }
  }
  const m = mapearNomes(bruto.nomes);
  const faltam = JUNTAS.filter(function(j){ return m[j] === undefined; });
  if (faltam.length) throw new Error("a captura nao tem as juntas: " + faltam.join(", ") + " (nomes lidos: " + bruto.nomes.slice(0, 30).join(", ") + ")");
  /* O repouso de referencia e a pose mais proxima de T-pose entre os
     offsets do esqueleto e o primeiro quadro -- medida em graus: braco longe
     da horizontal e perna longe da vertical. Na conversao BVH da CMU os
     offsets tem o braco reto mas a perna 20 graus aberta, e a T-pose de
     verdade foi posta como primeiro quadro, que entao sai do movimento. */
  function quaoTpose(P){
    const cima = vNorm(vMenos(P[m.cabeca], vEntre(P[m.quadrilE], P[m.quadrilD], 0.5)));
    let s = 0;
    for (const l of ["E", "D"]){
      const braco = Math.asin(Math.min(1, Math.abs(vPonto(vNorm(vMenos(P[m["mao" + l]], P[m["ombro" + l]])), cima))))*180/Math.PI;
      const perna = Math.acos(Math.min(1, Math.abs(vPonto(vNorm(vMenos(P[m["pe" + l]], P[m["quadril" + l]])), cima))))*180/Math.PI;
      s += braco*braco + perna*perna;
    }
    return s;
  }
  let rep = bruto.repouso || bruto.quadros[0], tposeNoPrimeiro = false;
  if (bruto.repouso && bruto.quadros.length > 1 && quaoTpose(bruto.quadros[0]) < quaoTpose(bruto.repouso)){
    rep = bruto.quadros[0]; tposeNoPrimeiro = true;
    bruto.quadros = bruto.quadros.slice(1);
  }
  function meio(P, a, b){ return vEntre(P[m[a]], P[m[b]], 0.5); }
  /* os eixos da fonte pelo repouso */
  /* O "para cima" e o eixo principal (x, y ou z, com sinal) mais perto da
     linha bacia-cabeca: captura sempre tem um vertical exato, e a linha do
     corpo inclina uns graus -- inclinado, o ator que corre metros pela sala
     parece subir junto com a distancia. */
  const cima0 = vNorm(vMenos(rep[m.cabeca], meio(rep, "quadrilE", "quadrilD")));
  const e0 = [0, 1, 2].reduce(function(b, e){ return Math.abs(cima0[e]) > Math.abs(cima0[b]) ? e : b; }, 0);
  const cima = [0, 0, 0]; cima[e0] = Math.sign(cima0[e0]);
  const lado0 = vMenos(vEntre(rep[m.ombroE], rep[m.quadrilE], 0.5), vEntre(rep[m.ombroD], rep[m.quadrilD], 0.5));
  const direita = vNorm(vMenos(lado0, vEscala(cima, vPonto(lado0, cima))));
  const frente = vCruz(cima, direita);
  /* altura: da bacia ao pe, no repouso, vira a perna do jogo (32 voxels) */
  const perna = vDist(rep[m.quadrilE], rep[m.joelhoE]) + vDist(rep[m.joelhoE], rep[m.peE]);
  const esc = comprimentoDaPerna(REPOUSO_DO_JOGO)/perna;
  /* O rumo de cada quadro, pela linha dos quadris no chao, suavizado em
     volta de meio segundo: tirar o rumo inteiro poe o personagem de frente
     (uma captura pode correr de costas para a camera, ou fazer curva) e o
     suavizado guarda o vaivem da bacia a cada passo. */
  function rumo(P){ const l = vMenos(P[m.quadrilD], P[m.quadrilE]); return Math.atan2(vPonto(l, frente), vPonto(l, direita)); }
  const rumoRep = rumo(rep), brutos = bruto.quadros.map(rumo);
  for (let f = 1; f < brutos.length; f++){ while (brutos[f] - brutos[f - 1] > Math.PI) brutos[f] -= 2*Math.PI; while (brutos[f] - brutos[f - 1] < -Math.PI) brutos[f] += 2*Math.PI; }
  const janela = Math.max(1, Math.round((bruto.fps || 30)*0.25));
  const rumoSuave = brutos.map(function(v, f){
    let s = 0, n = 0;
    for (let k = Math.max(0, f - janela); k <= Math.min(brutos.length - 1, f + janela); k++){ s += brutos[k]; n++; }
    return s/n;
  });
  /* o chao do clipe: o tornozelo mais baixo nos quadros (percentil 3) */
  const tornozelos = bruto.quadros.map(function(P){ return Math.min(vPonto(P[m.peE], cima), vPonto(P[m.peD], cima)); }).sort(function(a, b){ return a - b; });
  const chaoClipe = tornozelos.length ? tornozelos[Math.floor(tornozelos.length*0.03)] : 0;
  const chaoRep = Math.min(vPonto(rep[m.peE], cima), vPonto(rep[m.peD], cima));
  /* direita da fonte -> -x do jogo; frente -> -y; cima -> +z. A origem
     horizontal acompanha a bacia (anda no lugar); a vertical e o chao, entao
     a bacia sobe e desce de verdade. */
  function juntasDoQuadro(P, giro, chao){
    const o = {}, b = meio(P, "quadrilE", "quadrilD");
    const bh = vMenos(b, vEscala(cima, vPonto(b, cima))), cg = Math.cos(giro), sg = Math.sin(giro);
    for (const j in m){
      const v = vMenos(P[m[j]], bh), x = vPonto(v, direita), y = vPonto(v, frente), z = vPonto(v, cima) - chao;
      const xr = x*cg - y*sg, yr = x*sg + y*cg;
      o[j] = [CENTRO.CX - xr*esc, CENTRO.CY - yr*esc, z*esc];
    }
    return o;
  }
  const juntas = bruto.quadros.map(function(P, f){ return juntasDoQuadro(P, rumoRep - rumoSuave[f], chaoClipe); });
  const repouso = juntasDoQuadro(rep, 0, chaoRep);
  /* tornozelo no chao do jogo (z 5) */
  const dz = REPOUSO_DO_JOGO.peE[2];
  for (const J of juntas.concat([repouso])) for (const k in J) J[k][2] += dz;
  return {juntas: juntas, repouso: repouso, fps: bruto.fps, origem: bruto.origem + (tposeNoPrimeiro ? ", T-pose do primeiro quadro" : ""),
          temPes: m.pontaPeE !== undefined && m.pontaPeD !== undefined};
}

/* Os quadros da captura como poses do rig. Por diferenca a partir do
   repouso da fonte, por cima do T-pose do rig -- o repouso de uma captura e
   T-pose, igual a bind pose. A torcao que a fonte nao diz vem do parado. */
function redirecionarClipe(proj, clipe){
  const J = proj.juntas, neutra = poseNeutra();
  return clipe.juntas.map(function(alvo){
    return poseRelativa(J, neutra, clipe.repouso, alvo, {comPes: clipe.temPes});
  });
}

/* ---------- da captura para uma animacao do jogo ----------
   Um ciclo (andar, correr) sai sozinho: acha o trecho que mais se repete,
   comeca no quadro de passada mais aberta (para os quadros cairem nas
   poses-chave: passada e passagem) e, por padrao, amostra so meio ciclo e
   espelha a outra metade -- o ator sempre tem um lado que pisa diferente, e
   num ciclo de 4 quadros isso vira mancar. Uma acao (pulo, atacar...) usa
   os quadros pedidos; o pulo sem quadro pedido pega o alto do salto.
   Cada quadro, no fim, passa por caberPose (encaixe.js). */
function passadaAberta(J){ return Math.abs(J.peE[1] - J.peD[1]); }
function melhorCiclo(clipe){
  const fps = clipe.fps || 30, n = clipe.juntas.length;
  let melhor = null;
  for (let ini = 0; ini < n*0.6; ini += Math.max(1, Math.round(fps/30))){
    const r = acharCiclo(clipe.juntas, ini, 0, 0, fps);
    if (r.fim > 0 && (!melhor || r.diferenca < melhor.diferenca)) melhor = {inicio: ini, fim: r.fim, diferenca: r.diferenca};
  }
  if (!melhor) return null;
  /* a fase: o quadro de passada mais aberta dentro do primeiro meio ciclo */
  const periodo = melhor.fim - melhor.inicio;
  let ini = melhor.inicio, mais = -1;
  for (let f = melhor.inicio; f < Math.min(n - periodo, melhor.inicio + periodo/2); f++){
    const a = passadaAberta(clipe.juntas[f]);
    if (a > mais){ mais = a; ini = f; }
  }
  return {inicio: ini, fim: ini + periodo, periodo: periodo, diferenca: melhor.diferenca};
}
function altoDoSalto(clipe){
  let melhor = 0, alto = -Infinity;
  clipe.juntas.forEach(function(J, f){ const h = Math.min(J.peE[2], J.peD[2]); if (h > alto){ alto = h; melhor = f; } });
  return melhor;
}
function animacaoDaCaptura(proj, clipe, animacao, opcoes){
  opcoes = opcoes || {};
  const anim = ANIMACOES_DO_JOGO.find(function(a){ return a.nome === animacao; });
  if (!anim) throw new Error("animacao desconhecida: " + animacao);
  const poses = opcoes.poses || redirecionarClipe(proj, clipe), ciclo = animacao === "andar" || animacao === "correr";
  let quadros, info = {};
  if (opcoes.quadros && opcoes.quadros.length){
    quadros = opcoes.quadros.slice(0, anim.quadros).map(function(f){ return misturarPoses(poses[Math.floor(f)], poses[Math.min(poses.length - 1, Math.floor(f) + 1)], f - Math.floor(f)); });
    info.quadros = opcoes.quadros;
  } else if (ciclo){
    const c = opcoes.inicio !== undefined && opcoes.fim !== undefined ? {inicio: opcoes.inicio, fim: opcoes.fim, periodo: opcoes.fim - opcoes.inicio} : melhorCiclo(clipe);
    if (!c) throw new Error("nao achei um ciclo nesta captura");
    /* `fase`: quanto do ciclo o primeiro quadro fica depois da passada mais aberta */
    const d = (opcoes.fase || 0)*c.periodo, ini = c.inicio + d;
    info = Object.assign({}, c, {inicio: ini, fim: ini + c.periodo});
    if (opcoes.assimetrico) quadros = amostrarClipe(poses, anim.quadros, {inicio: ini, fim: ini + c.periodo, ciclo: true});
    else {
      const meio = amostrarClipe(poses, anim.quadros >> 1, {inicio: ini, fim: ini + c.periodo/2, ciclo: true});
      quadros = completarCicloEspelhado(meio.concat(meio));
    }
  } else if (animacao === "pulo"){
    const f = altoDoSalto(clipe);
    quadros = [poses[f]]; info.quadros = [f];
  } else {
    const ini = opcoes.inicio || 0, fim = opcoes.fim === undefined ? poses.length - 1 : opcoes.fim;
    quadros = amostrarClipe(poses, anim.quadros, {inicio: ini, fim: fim});
    info.inicio = ini; info.fim = fim;
  }
  if (opcoes.espelhar) quadros = quadros.map(espelharPose);
  /* O chao pela sola do rig, e nao pelo tornozelo da captura (o tornozelo
     do ator no chao varia com o calcanhar e a ponta): andando sempre ha um
     pe no chao, entao cada quadro assenta; correndo, o ciclo inteiro desce
     ate a sola mais baixa dele encostar, e o voo continua voo. */
  const J = proj.juntas, sola = function(p){ return alturaDasSolas(J, posarEsqueleto(J, p)); };
  if (animacao === "andar") quadros = quadros.map(function(p){ return apoiarNoChao(J, p, 0); });
  else if (animacao === "correr" && info.periodo){
    let menor = Infinity;
    for (let f = Math.floor(info.inicio); f <= Math.ceil(info.fim) && f < poses.length; f++) menor = Math.min(menor, sola(poses[f]));
    if (isFinite(menor)) quadros = quadros.map(function(p){ return apoiarNoChao(J, p, sola(p) - menor); });
  }
  if (!opcoes.cru && proj.corpo) quadros = quadros.map(function(p){ return caberPose(proj.corpo, proj.juntas, proj.repouso, p, animacao, ciclo); });
  return {quadros: quadros, info: info};
}

if (typeof module !== "undefined") module.exports = {
  NOMES_DE_JUNTA, mapearNomes, lerBvh, SMPL_NOMES, SMPL_PAIS, SMPL_REPOUSO, lerRotacoes, lerCaptura, redirecionarClipe,
  melhorCiclo, altoDoSalto, animacaoDaCaptura
};
