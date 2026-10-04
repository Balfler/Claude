/* Testes do atelie de personagem (mundo-perigoso/atelie).
   Uso: node mundo-perigoso/teste/atelie.test.js */
const fs = require("fs");
const path = require("path");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const A = path.join(__dirname, "..", "atelie");
const N = require(path.join(A, "nucleo.js")), C = require(path.join(A, "corpo.js")), R = require(path.join(A, "rig.js"));
const P = require(path.join(A, "pesos.js")), Df = require(path.join(A, "deformar.js")), An = require(path.join(A, "animacao.js"));
const Cap = require(path.join(A, "captura.js")), V = require(path.join(A, "validar.js")), Ar = require(path.join(A, "arquivos.js"));
const Es = require(path.join(A, "escritas.js")), En = require(path.join(A, "encaixe.js"));
const perto = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-6);
const pertoV = (a, b, tol) => a.every((v, i) => perto(v, b[i], tol));

/* ---------- 1. a matematica ---------- */
{
  const u = [1, 2, -0.5], v = [-3, 0.2, 1], q = N.qArco(u, v);
  check("qArco leva uma direcao na outra", pertoV(N.vNorm(N.qGira(q, u)), N.vNorm(v), 1e-9));
  const q2 = N.qDeReferencial([0, 0, 1], [1, 0, 0], [0, -1, 0], [0, 0, 1]);
  check("qDeReferencial leva os dois vetores juntos", pertoV(N.qGira(q2, [0, 0, 1]), [0, -1, 0], 1e-9) && pertoV(N.qGira(q2, [1, 0, 0]), [0, 0, 1], 1e-9));
  const e = [20, -35, 50];
  check("Euler vai e volta", pertoV(N.qParaEuler(N.qDeEuler(e)), e, 1e-6));
  const g = N.qEixoAngulo([0.3, 0.8, -0.2], 70), p = [4, -2, 7];
  const espelhado = N.qGira(N.qEspelho(g), [-p[0], p[1], p[2]]), direto = N.qGira(g, p);
  check("o giro espelhado gira o ponto espelhado para o espelho do resultado", pertoV(espelhado, [-direto[0], direto[1], direto[2]], 1e-9));
}

/* ---------- 2. o corpo de exemplo, o rig e o esqueleto ---------- */
const exemplo = C.corpoDeExemplo();
const rigEx = R.proporRig(exemplo), J = rigEx.juntas;
{
  check("o rig proposto reconhece a T-pose do exemplo", rigEx.avisos.length === 0, rigEx.avisos.join("; "));
  check("o rig proposto e simetrico", N.JUNTAS.every(n => { const m = N.espelhoDoNome(n); return m === n ? perto(J[n][0], 40, 0.01) : perto(J[n][0] + J[m][0], 80, 0.01) && perto(J[n][2], J[m][2], 0.01); }));
  check("ombro no alto, cotovelo e mao para fora na altura do braco",
    J.ombroE[2] > 70 && J.cotoveloE[0] < J.ombroE[0] - 5 && J.maoE[0] < J.cotoveloE[0] - 5 && perto(J.maoE[2], J.ombroE[2], 1),
    "ombroE " + J.ombroE + " cotoveloE " + J.cotoveloE + " maoE " + J.maoE);
  check("quadril abaixo do tronco, joelho entre quadril e pe", J.quadrilE[2] > J.joelhoE[2] && J.joelhoE[2] > J.peE[2] && J.quadrilE[2] < J.ombroE[2] - 20);
  const s0 = R.posarEsqueleto(J, R.poseNeutra());
  check("pose neutra devolve a bind pose", Object.keys(J).every(k => !s0.juntas[k] || pertoV(s0.juntas[k], J[k], 1e-9)));
  const torta = R.poseNeutra();
  for (const o of N.OSSOS) torta.rot[o.nome] = N.qEixoAngulo([Math.sin(o.indice), 1, Math.cos(o.indice)], 17*o.indice);
  const s1 = R.posarEsqueleto(J, torta);
  check("girar osso nao muda comprimento de osso", N.OSSOS.every(o => perto(N.vDist(s1.juntas[o.pivo], s1.juntas[o.ponta]), N.vDist(J[o.pivo], J[o.ponta]), 1e-6)));
  const rep = R.repousoDoRig(J);
  const frente = R.posarEsqueleto(J, R.girarOsso(J, rep, "bracoE", [30, 0, 0], rep)).juntas, frenteD = R.posarEsqueleto(J, R.girarOsso(J, rep, "bracoD", [30, 0, 0], rep)).juntas;
  const parado = R.posarEsqueleto(J, rep).juntas;
  check("angulo 'frente' leva o braco a frente dos dois lados", frente.cotoveloE[1] < parado.cotoveloE[1] - 3 && frenteD.cotoveloD[1] < parado.cotoveloD[1] - 3);
  const abreE = R.posarEsqueleto(J, R.girarOsso(J, rep, "bracoE", [0, 30, 0], rep)).juntas, abreD = R.posarEsqueleto(J, R.girarOsso(J, rep, "bracoD", [0, 30, 0], rep)).juntas;
  check("angulo 'abrir' afasta o braco do corpo dos dois lados", abreE.cotoveloE[0] < parado.cotoveloE[0] - 3 && abreD.cotoveloD[0] > parado.cotoveloD[0] + 3);
  const ang = [12, -25, 33], volta = R.eulerDoOsso(J, R.girarOsso(J, rep, "antebracoD", ang, rep), "antebracoD", rep);
  check("angulo anatomico vai e volta", pertoV(volta, ang, 1e-6), volta.map(v => v.toFixed(3)).join(","));
  const pose = R.girarOsso(J, R.girarOsso(J, rep, "coxaE", [30, 10, 0], rep), "antebracoD", [40, 0, 0], rep);
  const esp = R.posarEsqueleto(J, R.espelharPose(pose)).juntas, orig = R.posarEsqueleto(J, pose).juntas;
  check("espelhar a pose troca E por D no espelho", N.JUNTAS.every(n => { const m = N.espelhoDoNome(n); return perto(esp[m][0], 80 - orig[n][0], 1e-6) && perto(esp[m][1], orig[n][1], 1e-6) && perto(esp[m][2], orig[n][2], 1e-6); }));
  const alvo = N.vSoma(parado.maoE, [3, -10, 8]), ik = R.posarEsqueleto(J, R.ikDeDoisOssos(J, rep, "bracoE", "antebracoE", alvo)).juntas;
  check("arrastar a mao (IK) leva a mao ao alvo sem mudar o braco", pertoV(ik.maoE, alvo, 1e-6) && perto(N.vDist(ik.ombroE, ik.cotoveloE), N.vDist(J.ombroE, J.cotoveloE), 1e-6));
  check("o repouso do rig pisa o chao", perto(R.alturaDasSolas(J, R.posarEsqueleto(J, rep)), 0, 1e-6));
}

/* ---------- 3. o peso de osso ---------- */
{
  P.calcularPesos(exemplo, J);
  const lista = C.voxelsDoCorpo(exemplo), I = N.INDICE_OSSO;
  let longe = 0, maoNaPerna = 0, mistos = 0, soltos = 0;
  for (const i of lista){
    const a = exemplo.a[i], b = exemplo.b[i], p = C.posicaoDaCelula(exemplo, i);
    if (a !== b && !(N.OSSOS[a].iPai === b || N.OSSOS[b].iPai === a)) longe++;
    if (p[0] < 0 && (P.pesoDoOsso(exemplo, i, I.coxaE) > 0 || P.pesoDoOsso(exemplo, i, I.bacia) > 0)) maoNaPerna++;
    if (N.vDist(p, J.cotoveloE) < 3 && exemplo.w[i] > 25 && exemplo.w[i] < 230) mistos++;
  }
  check("todo voxel reparte peso so entre pai e filho", longe === 0, longe + " voxels");
  check("a mao nao tem peso nenhum da coxa nem da bacia", maoNaPerna === 0);
  check("o cotovelo e repartido entre braco e antebraco, nao cortado", mistos > 10, mistos + " voxels mistos");
  /* A prova da distancia geodesica: um corpo de braco colado na perna (a mao
     encostando na coxa, em linha reta mais perto dela do que do antebraco).
     Andando por dentro do corpo, a mao ainda e do braco. */
  const colado = C.novoCorpo("colado"); colado.paleta = [[200, 150, 120]];
  const J2 = R.copiarPontos(J);
  const cap = (a, b, r) => { for (let z = -2; z < 120; z++) for (let y = 10; y < 46; y++) for (let x = -10; x < 90; x++) if (N.distSegmento([x, y, z], a, b).d <= r){ const i = C.celula(colado, x, y, z); if (i >= 0) colado.cor[i] = 1; } };
  cap([40, 28, 45], [40, 28, 78], 10); cap([40, 28, 92], [40, 28, 108], 8);
  cap([30, 28, 78], [25, 28, 60], 3.5); cap([25, 28, 60], [24, 28, 38], 3.5);    // braco E caindo rente ao corpo ate a coxa
  cap([34, 28, 40], [31, 28, 3], 4.5); cap([46, 28, 40], [49, 28, 3], 4.5);
  cap([50, 28, 78], [55, 28, 60], 3.5); cap([55, 28, 60], [56, 28, 38], 3.5);
  colado.versao++;
  Object.assign(J2, {ombroE: [30, 28, 78], cotoveloE: [25, 28, 60], maoE: [24, 28, 42], pontaMaoE: [24, 28, 37],
                     ombroD: [50, 28, 78], cotoveloD: [55, 28, 60], maoD: [56, 28, 42], pontaMaoD: [56, 28, 37],
                     quadrilE: [34, 28, 40], joelhoE: [32.5, 28, 21], peE: [31, 28, 5], quadrilD: [46, 28, 40], joelhoD: [47.5, 28, 21], peD: [49, 28, 5]});
  R.completarPontos(J2); J2.cintura = N.vEntre(J2.meioQuadril, J2.meioOmbro, 0.17);
  P.calcularPesos(colado, J2);
  let maoNaCoxa = 0, maoTotal = 0;
  for (const i of C.voxelsDoCorpo(colado)){
    const p = C.posicaoDaCelula(colado, i);
    if (p[2] < 44 && p[2] > 36 && p[0] < 28 && N.distSegmento(p, [25, 28, 60], [24, 28, 38]).d < 3){ maoTotal++; if (P.pesoDoOsso(colado, i, I.coxaE) > 0 || P.pesoDoOsso(colado, i, I.bacia) > 0) maoNaCoxa++; }
  }
  check("com a mao encostada na coxa, o peso da mao continua no braco (distancia geodesica)", maoTotal > 20 && maoNaCoxa === 0, maoNaCoxa + " de " + maoTotal);
  const antes = exemplo.w.slice(), i0 = C.celula(exemplo, 5, 28, 78);
  P.pincelDePeso(exemplo, [5, 28, 78], 2, "bracoE", 0.6, "somar", true);
  check("o pincel de peso puxa o voxel para o osso e espelha no outro lado",
    P.pesoDoOsso(exemplo, i0, I.bracoE) > 0.5 && exemplo.trava[C.celula(exemplo, 75, 28, 78)] === 1);
  const travado = [exemplo.a[i0], exemplo.b[i0], exemplo.w[i0]];
  P.calcularPesos(exemplo, J);
  check("recalcular o automatico nao desfaz o que foi pintado", exemplo.a[i0] === travado[0] && exemplo.w[i0] === travado[2]);
  P.destravarPesos(exemplo); P.calcularPesos(exemplo, J);
}

/* ---------- 4. a pele posada ---------- */
{
  const projEx = Ar.novoProjeto(exemplo, {juntas: J});
  const r = Df.posarCorpo(exemplo, J, projEx.repouso), pc = V.pedacos(r.g), n = V.contarCheios(r.g);
  check("o exemplo parado sai inteiro, sem pedaco solto", pc.slice(1).every(p => p.n <= 20), pc.slice(1, 4).map(p => p.n).join(","));
  const bind = C.voxelsDoCorpo(exemplo).length;
  check("posar guarda o volume (dentro de 15% da bind pose)", Math.abs(n/bind - 1) < 0.15, n + " de " + bind);
  let pior = 0;
  for (const nome of ["andar", "correr", "atacar"]) for (const pose of projEx.animacoes[nome]){
    const q = Df.posarCorpo(exemplo, J, pose);
    pior = Math.max(pior, ...V.pedacos(q.g).slice(1).map(p => p.n), 0);
  }
  check("andando, correndo e atacando nenhum pedaco do exemplo voa", pior <= 20, "maior solto " + pior);
  const duro = V.larguraDoTronco(Df.posarCorpo(exemplo, J, projEx.animacoes.correr[0], {rigido: true}).g, r.juntas);
  const macio = V.larguraDoTronco(Df.posarCorpo(exemplo, J, projEx.animacoes.correr[0]).g, r.juntas);
  check("a pele misturada nao alarga a silhueta alem do giro duro (quaternio dual)", macio <= duro*1.15 + 2, macio + " contra " + duro);
}

/* ---------- 5. importar ---------- */
{
  /* um .wgvox sintetico de um humano em T-pose, 3 vezes maior, com a
     frente no z alto e y para cima, como a ferramenta de la grava */
  const gx = 330, gy = 351, gz = 120, g = new Uint16Array(gx*gy*gz), pal = [[0, 0, 0], [210, 170, 130], [60, 110, 60], [60, 110, 61]];   // a entrada 0 e o vazio, como no arquivo do Sorceress
  const ex = C.corpoDeExemplo();
  for (const i of C.voxelsDoCorpo(ex)){
    const p = C.posicaoDaCelula(ex, i), cor = ex.cor[i] === 3 ? 2 : 1;          // 1 a pele, 2 e 3 dois verdes quase iguais
    for (let dz = 0; dz < 3; dz++) for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++){
      const x = (p[0] + 15)*3 + dx, alt = p[2]*3 + dz, prof = gz - 1 - ((p[1] - 8)*3 + dy);
      if (x >= 0 && x < gx && alt >= 0 && alt < gy && prof >= 0 && prof < gz) g[x + alt*gx + prof*gx*gy] = cor;
    }
  }
  const pares = [];
  let v = g[0], nrun = 0;
  for (let i = 0; i < g.length; i++){ if (g[i] === v && nrun < 65535) nrun++; else { pares.push(nrun, v); v = g[i]; nrun = 1; } }
  pares.push(nrun, v);
  const json = Buffer.from(JSON.stringify({format: "wgvox-character"}));
  const bin = Buffer.alloc(24 + pal.length*3 + 4 + pares.length*2);
  bin.write("WGV1", 0, "ascii"); bin.writeUInt32LE(1, 4); bin.writeUInt16LE(gx, 8); bin.writeUInt16LE(gy, 10); bin.writeUInt16LE(gz, 12);
  bin.writeUInt16LE(pal.length, 14);
  pal.forEach((c, k) => { bin[24 + k*3] = c[0]; bin[25 + k*3] = c[1]; bin[26 + k*3] = c[2]; });
  let o = 24 + pal.length*3;
  bin.writeUInt32LE(pares.length/2, o); o += 4;
  for (let k = 0; k < pares.length; k += 2){ bin.writeUInt16LE(pares[k], o); bin.writeUInt16LE(pares[k + 1], o + 2); o += 4; }
  const cab = Buffer.alloc(16); cab.write("WGV2", 0, "ascii"); cab.writeUInt32LE(json.length, 8);
  const arquivo = Buffer.concat([cab, json, bin]);
  const imp = C.importarModelo(C.lerWgvox(arquivo), {nome: "teste"}), lim = C.limitesDoCorpo(imp);
  check("importar deixa o corpo com 115 de altura, pe no chao e 2 voxels de folga no teto da grade", C.ALTURA_DO_CORPO === 115 && lim[2] === 0 && lim[5] === 114, lim.join(" "));
  check("importar nao corta a mao do braco esticado (passa da grade de 80)", lim[0] < 0 && lim[3] > 79, "x de " + lim[0] + " a " + lim[3]);
  check("importar poe o meio do corpo em CX e a frente no y pequeno", perto((lim[0] + lim[3])/2, 40, 1) && C.corEm(imp, 40, 28, 60) !== 0);
  check("importar junta tons quase iguais e cabe na paleta do jogo", imp.paleta.length <= N.MAX_CORES_DO_CORPO && imp.paleta.length >= 2, imp.paleta.length + " cores");
  const oco = C.novoCorpo(); oco.paleta = [[1, 2, 3]];
  for (let z = 0; z < 10; z++) for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (x === 0 || y === 0 || z === 0 || x === 9 || y === 9 || z === 9) oco.cor[C.celula(oco, x, y, z)] = 1;
  oco.versao++;
  check("o que e oco por dentro fica macico", C.solidificar(oco) === 512 && C.corEm(oco, 5, 5, 5) === 1);
}

/* ---------- 6. captura de movimento ---------- */
{
  /* BVH de um esqueleto em T-pose (y para cima, olhando para +z), com o braco
     direito descendo 80 graus no segundo quadro */
  const bvh = `HIERARCHY
ROOT Hips
{ OFFSET 0 90 0 CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Spine { OFFSET 0 12 0 CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT Neck { OFFSET 0 38 0 CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT Head { OFFSET 0 10 0 CHANNELS 3 Zrotation Xrotation Yrotation End Site { OFFSET 0 15 0 } } }
    JOINT RightArm { OFFSET -18 34 0 CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT RightForeArm { OFFSET -28 0 0 CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT RightHand { OFFSET -24 0 0 CHANNELS 3 Zrotation Xrotation Yrotation End Site { OFFSET -10 0 0 } } } }
    JOINT LeftArm { OFFSET 18 34 0 CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT LeftForeArm { OFFSET 28 0 0 CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT LeftHand { OFFSET 24 0 0 CHANNELS 3 Zrotation Xrotation Yrotation End Site { OFFSET 10 0 0 } } } } }
  JOINT RightUpLeg { OFFSET -9 -4 0 CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT RightLeg { OFFSET 0 -42 0 CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT RightFoot { OFFSET 0 -40 0 CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT RightToeBase { OFFSET 0 -4 12 CHANNELS 3 Zrotation Xrotation Yrotation End Site { OFFSET 0 0 4 } } } } }
  JOINT LeftUpLeg { OFFSET 9 -4 0 CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT LeftLeg { OFFSET 0 -42 0 CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT LeftFoot { OFFSET 0 -40 0 CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT LeftToeBase { OFFSET 0 -4 12 CHANNELS 3 Zrotation Xrotation Yrotation End Site { OFFSET 0 0 4 } } } } }
}
MOTION
Frames: 2
Frame Time: 0.033333
` + [0, 80].map(ang => [0, 90, 0, 0, 0, 0].concat([0, 0, 0, 0, 0, 0, 0, 0, 0], [ang, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], new Array(24).fill(0)).join(" ")).join("\n") + "\n";
  const clipe = Cap.lerCaptura(bvh, ".bvh");
  check("o BVH e lido com as juntas do jogo e o pe no chao", clipe.juntas.length === 2 && perto(Math.min(clipe.repouso.peE[2], clipe.repouso.peD[2]), 5, 0.01));
  check("o lado direito da captura vira o lado E do jogo (x menor)", clipe.repouso.maoE[0] < 40 && clipe.repouso.maoD[0] > 40);
  const projEx = {juntas: J};
  const poses = Cap.redirecionarClipe(projEx, clipe), s0 = R.posarEsqueleto(J, poses[0]).juntas, s1 = R.posarEsqueleto(J, poses[1]).juntas;
  check("o repouso da captura cai na T-pose do rig", pertoV(s0.maoE, J.maoE, 0.5) && pertoV(s0.cotoveloD, J.cotoveloD, 0.5));
  check("o braco que desce na captura desce no rig, com o comprimento do rig",
    s1.cotoveloE[2] < s0.ombroE[2] - 10 && perto(N.vDist(s1.ombroE, s1.cotoveloE), N.vDist(J.ombroE, J.cotoveloE), 1e-6) && pertoV(s1.maoD, s0.maoD, 0.01));
  const amostra = An.amostrarClipe(poses, 3, {inicio: 0, fim: 1});
  check("amostrar um clipe mistura as poses no meio", amostra.length === 3 && amostra[1].rot.bracoE && !pertoV(amostra[1].rot.bracoE, poses[0].rot.bracoE, 1e-3));
  const posicoes = Cap.lerCaptura(JSON.stringify({quadros: [N.REPOUSO_DO_JOGO, An.juntasDaLista(An.POSES_ANTIGAS[3])]}), ".json");
  check("JSON de posicoes com os nomes do jogo tambem entra", posicoes.juntas.length === 2 && posicoes.juntas[1].joelhoE[1] < posicoes.juntas[0].joelhoE[1]);
}

/* ---------- 6b. caber no jogo ---------- */
{
  const projEx = Ar.novoProjeto(C.corpoDeExemplo(), {juntas: J});
  const alto = R.copiarPose(projEx.repouso); alto.raiz[2] += 20; alto.raiz[1] += 9;
  const baixou = En.encaixarNaGrade(projEx.corpo, J, alto);
  check("encaixar tira da grade so o que precisa: desce a cabeca que vaza e volta o corpo para dentro",
    En.corpoCabe(projEx.corpo, J, baixou) && !En.corpoCabe(projEx.corpo, J, alto) && !baixou.amortecido);
  const noChao = R.copiarPose(projEx.repouso); noChao.raiz[2] += 1.5;
  const esticado = R.girarOsso(J, R.girarOsso(J, noChao, "cabeca", [-40, 0, 0], projEx.repouso), "tronco", [-20, 0, 0], projEx.repouso);
  const e2 = En.encaixarNaGrade(projEx.corpo, J, esticado), s2 = R.posarEsqueleto(J, e2);
  check("encaixar nunca poe a sola abaixo do chao", R.alturaDasSolas(J, s2) >= -0.5);
  /* passada larga demais para 56 de fundo: amortece a perna antes do resto */
  let passada = R.girarOsso(J, projEx.repouso, "coxaE", [80, 0, 0], projEx.repouso);
  passada = R.girarOsso(J, passada, "coxaD", [-80, 0, 0], projEx.repouso);
  passada = R.girarOsso(J, passada, "bracoE", [15, 0, 0], projEx.repouso);
  const cabe = En.caberPose(projEx.corpo, J, projEx.repouso, passada, "correr", true);
  check("caberPose amortece so as pernas quando a passada nao cabe no fundo da grade",
    En.corpoCabe(projEx.corpo, J, cabe) && cabe.amortecido && cabe.amortecido.pernas < 1 && cabe.amortecido.corpo === 1 && cabe.amortecido.tronco === 1,
    JSON.stringify(cabe.amortecido));
  const antes = R.posarEsqueleto(J, passada).juntas, depois = R.posarEsqueleto(J, cabe).juntas;
  check("amortecer as pernas guarda o braco", N.vDist(N.vMenos(antes.maoE, antes.ombroE), N.vMenos(depois.maoE, depois.ombroE)) < 1);
}

{
  /* a cabeca inclinada demais leva as pecas de cabeca para fora: encolhe o tronco, nao a perna */
  const projEx = Ar.novoProjeto(C.corpoDeExemplo(), {juntas: J});
  const curvado = R.girarOsso(J, projEx.repouso, "tronco", [55, 0, 0], projEx.repouso);
  const cabe = En.caberPose(projEx.corpo, J, projEx.repouso, curvado, "parado", false);
  const cab = R.posarEsqueleto(J, cabe).juntas.cabeca;
  check("a cabeca fica no lugar das pecas de cabeca (encolhendo o tronco, nao a perna)",
    cab[1] >= En.LUGAR_DA_CABECA.yMin - 0.05 && cabe.amortecido && cabe.amortecido.tronco < 1 && cabe.amortecido.pernas === 1, JSON.stringify(cabe.amortecido));
}

/* ---------- 6c. a captura da CMU que o humano usa ---------- */
{
  const DIRCAP = path.join(__dirname, "..", "Arte", "captura", "cmu");
  const corrida = Cap.lerCaptura(fs.readFileSync(path.join(DIRCAP, "09_01.bvh"), "utf8"), ".bvh");
  check("no BVH da CMU a referencia e a T-pose do primeiro quadro, nao o esqueleto de perna aberta", /T-pose do primeiro quadro/.test(corrida.origem) && corrida.juntas.length === 148);
  const ladoCerto = corrida.juntas.every(j => j.quadrilE[0] < j.quadrilD[0] && j.ombroE[0] < j.ombroD[0]);
  check("a captura fica de frente em todos os quadros (o rumo do ator na sala sai)", ladoCerto);
  const tornoz = corrida.juntas.map(j => Math.min(j.peE[2], j.peD[2])), n3 = Math.floor(tornoz.length/3);
  const minimo = l => Math.min.apply(null, l);
  check("o chao nao sobe com a distancia corrida (o vertical e o eixo exato da captura)",
    Math.abs(minimo(tornoz.slice(0, n3)) - minimo(tornoz.slice(-n3))) < 1.5 && Math.abs(minimo(tornoz) - 5) < 1.5,
    "tornozelo mais baixo: inicio " + minimo(tornoz.slice(0, n3)).toFixed(1) + ", fim " + minimo(tornoz.slice(-n3)).toFixed(1));
  const proj = Ar.lerProjeto(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.atelie"), "utf8"));
  const receita = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.receita.json"), "utf8"));
  const opcCorrida = receita.capturas.find(c => c.animacao === "correr").opcoes || {};
  const r = Cap.animacaoDaCaptura(proj, corrida, "correr", opcCorrida);
  check("o ciclo da corrida e achado sozinho, com duracao de corrida", r.info.periodo/corrida.fps > 0.5 && r.info.periodo/corrida.fps < 1, (r.info.periodo/corrida.fps).toFixed(2) + " s");
  check("a corrida capturada cabe na grade sem encolher perna nem tronco", r.quadros.every(q => !q.amortecido || (q.amortecido.pernas === 1 && q.amortecido.tronco === 1 && q.amortecido.corpo === 1)),
    r.quadros.map(q => JSON.stringify(q.amortecido || 1)).join(" "));
  const cru = Cap.animacaoDaCaptura(proj, corrida, "correr", Object.assign({}, opcCorrida, {cru: true})).quadros;
  const esp = R.espelharPose(cru[0]);
  check("no ciclo capturado a segunda metade e a primeira espelhada (sem mancar)", N.OSSOS.every(o => pertoV(esp.rot[o.nome], cru[2].rot[o.nome], 1e-9)));
  const passo = Cap.lerCaptura(fs.readFileSync(path.join(DIRCAP, "143_32.bvh"), "utf8"), ".bvh");
  const c = Cap.melhorCiclo(passo), J0 = passo.juntas[c.inicio], J1 = passo.juntas[Math.round(c.inicio + c.periodo/2)];
  check("o ciclo da caminhada comeca na passada aberta e troca de pe no meio",
    Math.sign(J0.peE[1] - J0.peD[1]) !== Math.sign(J1.peE[1] - J1.peD[1]) && Math.abs(J0.peE[1] - J0.peD[1]) > 15);
}

/* ---------- 7. validar ---------- */
{
  const projEx = Ar.novoProjeto(C.corpoDeExemplo());
  const ok = V.validarProjeto(projEx);
  check("o exemplo com as animacoes de partida valida sem erro", ok.erros.length === 0, ok.erros.join("; "));
  const alto = R.copiarPose(projEx.repouso); alto.raiz[2] += 30;
  projEx.animacoes.pulo = [alto];
  check("a validacao pega voxel fora da grade", V.validarProjeto(projEx, {rapido: true}).erros.some(e => /^pulo: .*fora da grade/.test(e)));
  projEx.animacoes.pulo = [R.copiarPose(projEx.repouso)];
  const c = projEx.corpo, i = C.celula(c, 40, 28, 60);
  c.a[i] = N.INDICE_OSSO.antebracoE; c.b[i] = N.INDICE_OSSO.coxaD; c.w[i] = 128; c.versao++;
  check("a validacao pega peso entre ossos que nao sao pai e filho", V.validarProjeto(projEx, {rapido: true}).erros.some(e => /nao sao pai e filho/.test(e)));
  c.a[i] = c.b[i] = N.INDICE_OSSO.tronco; c.w[i] = 255; c.versao++;
  /* um pedaco que so o antebraco leva, sem nada ligando ao resto: na pose ele voa */
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++){ const j = C.celula(c, 5 + x, 40 + y, 100 + z); c.cor[j] = 1; c.a[j] = c.b[j] = N.INDICE_OSSO.antebracoE; c.w[j] = 255; }
  c.versao++;
  check("a validacao pega pedaco solto maior que 20 voxels", V.validarProjeto(projEx, {rapido: true}).erros.some(e => /pedaco solto de/.test(e)));
  const grande = Ar.novoProjeto(C.corpoDeExemplo(), {semPesos: true});
  grande.corpo.paleta = new Array(60).fill(0).map((_, k) => [k, k, k]);
  check("a validacao pega paleta maior do que o jogo aguenta", V.validarProjeto(grande, {rapido: true}).erros.some(e => /a paleta tem 60/.test(e)));
}

/* ---------- 8. o humano de verdade, o arquivo e o jogo ---------- */
{
  const arq = path.join(__dirname, "..", "Arte", "personagens", "humano.atelie");
  const proj = Ar.lerProjeto(fs.readFileSync(arq, "utf8"));
  const texto = fs.readFileSync(arq, "utf8");
  check("o projeto do humano e lido e gravado de volta identico", Ar.salvarProjeto(proj) === texto);
  const v = V.validarProjeto(proj);
  check("o humano valida sem erro nos 20 quadros", v.erros.length === 0 && v.quadros.length === 20, v.erros.join("; "));
  const exportado = Ar.exportarPersonagem(proj, v);
  const doJogo = fs.readFileSync(path.join(__dirname, "..", "personagens", "humano.personagem"), "utf8");
  check("personagens/humano.personagem sai do projeto, byte a byte (refazer e reproduzivel)", exportado === doJogo.replace(/\r\n/g, "\n"));
  check("a .pele sai do projeto, byte a byte", Ar.exportarPele(proj) === fs.readFileSync(path.join(__dirname, "..", "personagens", "humano.pele"), "utf8").replace(/\r\n/g, "\n"));
  const pele = Ar.lerPele(Ar.exportarPele(proj));
  let dif = 0;
  for (const i of C.voxelsDoCorpo(proj.corpo)) if (pele.corpo.cor[i] !== proj.corpo.cor[i] || pele.corpo.w[i] !== proj.corpo.w[i] || pele.corpo.a[i] !== proj.corpo.a[i]) dif++;
  check("a .pele volta com corpo, peso e poses", dif === 0 && N.OSSOS.every(o => pertoV(pele.animacoes.correr[1].rot[o.nome], proj.animacoes.correr[1].rot[o.nome], 1e-4)));
  const lim = C.limitesDoCorpo(proj.corpo);
  check("o humano tem as duas maos (o braco esticado passa da grade de 80)", lim[0] < 0 && lim[3] > 79, "x de " + lim[0] + " a " + lim[3]);
  /* animacoes escritas: cabem na grade e a mao da arma fica no lugar dela */
  const falhas = [];
  for (const nome of Object.keys(Es.ESCRITAS)) Es.posesEscritas(proj.juntas, proj.repouso, nome, proj.corpo).forEach((p, k) => {
    const s = Df.posarCorpo(proj.corpo, proj.juntas, p, {soPosicoes: true});
    const cicl = Es.ESCRITAS[nome].some(q => q.espelho !== undefined);
    if (s.fora || !N.maoNoLugarDaArma(s.juntas.maoD, "D", nome) || (cicl && !N.maoNoLugarDaArma(s.juntas.maoE, "E", nome))) falhas.push(nome + "-" + (k + 1));
  });
  check("as animacoes escritas cabem na grade e deixam a arma inteira", falhas.length === 0, falhas.join(", "));
  const andar = proj.animacoes.andar.map(p => R.posarEsqueleto(proj.juntas, p).juntas);
  const frente = andar[0].peE[1] < andar[0].peD[1] ? "E" : "D", tras = frente === "E" ? "D" : "E";
  check("no andar, a mao do lado do pe que vai a frente vai para tras", andar[0]["mao" + frente][1] > andar[0]["mao" + tras][1]);
  const bloq = R.posarEsqueleto(proj.juntas, proj.animacoes.bloquear[0]).juntas;
  check("bloqueando, a mao E fica na alca do escudo", N.vDist(bloq.maoE, [14, 22, 64]) < 5, "maoE " + bloq.maoE.map(v => v.toFixed(0)).join(","));
  /* a receita refaz o projeto inteiro, byte a byte */
  const rec = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.receita.json"), "utf8"));
  const dirRec = path.join(__dirname, "..", "Arte", "personagens");
  const refeito = Ar.novoProjeto(C.importarModelo(C.lerWgvox(fs.readFileSync(path.join(dirRec, rec.modelo))), {nome: rec.nome}));
  for (const cap of rec.capturas){
    const clipe = Cap.lerCaptura(fs.readFileSync(path.join(dirRec, cap.arquivo), "utf8"), path.extname(cap.arquivo));
    refeito.animacoes[cap.animacao] = Cap.animacaoDaCaptura(refeito, clipe, cap.animacao, cap.opcoes || {}).quadros;
  }
  check("a receita (modelo + capturas) refaz Arte/personagens/humano.atelie byte a byte", Ar.salvarProjeto(refeito) === texto);
  check("andar e correr do humano vem da captura da CMU, nao das escritas",
    rec.capturas.some(c => c.animacao === "andar" && /143_32/.test(c.arquivo)) && rec.capturas.some(c => c.animacao === "correr" && /09_01/.test(c.arquivo)));

  /* o jogo le o arquivo: vinte quadros, as juntas e a grade de cada um */
  const { D } = carregar(path.join(__dirname, "..", "..", "cripta-vhalgorn.html"));
  const corpo = D.CORPO_DESENHADO;
  check("o jogo montado usa o corpo do atelie, compactado (PERSONAGEM 3), com os 20 quadros", !!corpo && corpo.versao === 3 && corpo.porPose.length === 20);
  if (corpo){
    const q3 = v.quadros[3];
    check("o jogo le a grade e as juntas de cada quadro como o atelie gravou",
      corpo.porPose[3].g.every((x, k) => x === q3.grade[k]) && N.JUNTAS.every(j => pertoV(corpo.porPose[3].juntas[j], q3.juntas[j].map(x => Math.round(x*10)/10), 1e-9)));
    check("o esqueleto do jogo num quadro e o do arquivo", pertoV(D.esqueleto(13).maoD, corpo.porPose[13].juntas.maoD, 1e-9) && D.esqueleto(0).dz === 0);
    check("o jogo pinta as pecas por cima da grade posada, sem girar nada", D.gradeDoPersonagem(D.PERSONAGEM_PADRAO, 5).filter(Boolean).length === v.quadros[5].voxels);
    check("a paleta do personagem no jogo cabe em 255 entradas", D.P_PERSONAGEM.length <= 255, D.P_PERSONAGEM.length + " entradas");
  }
}

/* ---------- 8b. o pano nao e braco (opcoes.pano) ---------- */
{
  const base = Ar.lerProjeto(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.atelie"), "utf8"));
  const cA = base.corpo, cB = Ar.lerProjeto(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.atelie"), "utf8")).corpo;
  const juntas = base.juntas, nomes = N.OSSOS.map(o => o.nome);
  P.calcularPesos(cA, juntas, {larguras: base.larguras});
  P.calcularPesos(cB, juntas, {larguras: base.larguras, pano: true});
  let total = 0, mudou = 0, bracoDeVerdade = 0, bracoQueFicou = 0;
  for (const i of C.voxelsDoCorpo(cA).map(v => v.i !== undefined ? v.i : v)){
    if (typeof i !== "number") continue;
    total++;
    if (cA.a[i] !== cB.a[i]) mudou++;
    if (/^(braco|antebraco)/.test(nomes[cA.a[i]]) && cA.w[i] > 200){ bracoDeVerdade++; if (cB.a[i] === cA.a[i]) bracoQueFicou++; }
  }
  check("o pano so mexe no peso de quem esta longe do braco: num humano de camisa, quase nada muda", total > 1000 && mudou <= total*0.02, mudou + " de " + total);
  check("o braco de verdade continua braco com opcoes.pano", bracoDeVerdade > 100 && bracoQueFicou >= bracoDeVerdade*0.98, bracoQueFicou + " de " + bracoDeVerdade);
}

/* ---------- 8c. capa atras do corpo: o rig e o peso nao se enganam ---------- */
{
  const ler = () => Ar.lerProjeto(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.atelie"), "utf8"));
  const sem = ler(), com = ler(), c = com.corpo;
  /* uma capa: uma folha de 2 voxels de grosso, 30 de largura, do ombro ao chao, atras do corpo */
  let n = 0;
  for (let z = 4; z < 84; z++) for (let x = 25; x < 56; x++) for (let y = 44; y < 46; y++){
    const i = C.celula(c, x, y, z);
    if (i >= 0 && !c.cor[i]){ c.cor[i] = 1; n++; }
  }
  C.solidificar(c);
  const rSem = R.proporRig(sem.corpo), rCom = R.proporRig(c);
  check("a capa enche o meio atras do corpo e a virilha do rig nao desce: mesma altura (+-1) com e sem capa",
    n > 1000 && Math.abs(rCom.juntas.quadrilE[2] - rSem.juntas.quadrilE[2]) <= 1, "quadril " + rCom.juntas.quadrilE[2].toFixed(1) + " contra " + rSem.juntas.quadrilE[2].toFixed(1) + ", " + n + " voxels de capa");
  P.calcularPesos(c, rCom.juntas, {larguras: com.larguras, pano: true});
  const nome = b => N.OSSOS[b].nome;
  let capa = 0, seguem = 0;
  for (let z = 10; z < 70; z += 3) for (let x = 30; x < 50; x += 3){
    const i = C.celula(c, x, 44, z);
    if (i < 0 || !c.cor[i]) continue;
    capa++;
    if (/^(bacia|tronco)$/.test(nome(c.a[i])) && /^(bacia|tronco)$/.test(nome(c.b[i]))) seguem++;
  }
  check("com opcoes.pano, a capa atras do corpo segue so a bacia e o tronco: nao se estica com a perna nem o braco", capa > 30 && seguem === capa, seguem + " de " + capa);
  const sPerto = ler();
  const rp = R.proporRig(sPerto.corpo);
  check("o ombro fica a no maximo 14 do centro, mesmo com peito largo", rp.juntas.ombroD[0] - N.CENTRO.CX <= 14.001);
}

/* ---------- 8d. o pano fica no projeto: todo recalculo respeita ---------- */
{
  const base = Ar.lerProjeto(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.atelie"), "utf8"));
  check("o humano de camisa sai sem a marca de pano no arquivo", !/"pano"/.test(Ar.salvarProjeto(base)) && base.pano === false);
  const c = base.corpo;
  for (let z = 4; z < 84; z++) for (let x = 25; x < 56; x++) for (let y = 44; y < 46; y++){ const i = C.celula(c, x, y, z); if (i >= 0 && !c.cor[i]) c.cor[i] = 1; }
  C.solidificar(c);
  const proj = Ar.novoProjeto(c, {pano: true});
  check("novoProjeto com pano marca o projeto", proj.pano === true);
  const texto = Ar.salvarProjeto(proj), volta = Ar.lerProjeto(texto);
  check("o pano vai para o arquivo e volta: quem abrir depois recalcula com ele", /"pano": true/.test(texto) && volta.pano === true);
  /* o que o painel faz ao mexer numa junta: recalcular com a marca do projeto */
  const i = C.celula(volta.corpo, 40, 44, 40), nome = b => N.OSSOS[b].nome;
  P.calcularPesos(volta.corpo, volta.juntas, {larguras: volta.larguras, pano: volta.pano});
  check("recalcular depois de abrir mantem a capa presa a bacia e ao tronco", i >= 0 && /^(bacia|tronco)$/.test(nome(volta.corpo.a[i])) && /^(bacia|tronco)$/.test(nome(volta.corpo.b[i])));
}

/* ---------- 8e. a resolucao: o mesmo personagem em 117, 165 ou 256 voxels ---------- */
{
  const Rs = require(path.join(A, "resolucao.js"));
  const ler = () => Ar.lerProjeto(fs.readFileSync(path.join(__dirname, "..", "Arte", "personagens", "humano.atelie"), "utf8"));
  const base = ler();
  const dims = () => [N.GRADE.DX, N.GRADE.DY, N.GRADE.DZ, C.CAIXA.bx, C.CAIXA.by, C.CAIXA.bz, N.CENTRO.CX, N.CENTRO.CY].join(",");
  const antes = dims();
  check("o humano de camisa nao tem fonte e o arquivo dele nao ganha nada", base.fonte === null && !/"fonte"/.test(Ar.salvarProjeto(base)));
  let erro = null; try { Rs.projetoEm(base, 1.41); } catch (e){ erro = e.message; }
  check("sem a fonte, pedir outra resolucao diz por que nao da", /nao guarda a fonte/.test(erro || ""));
  /* uma fonte de teste: o proprio corpo do humano, como volume de 115 de altura */
  const vol = {gx: base.corpo.bx, gy: base.corpo.by, gz: base.corpo.bz, rgb: (x, y, z) => { const i = C.celula(base.corpo, x + base.corpo.ox, y + base.corpo.oy, z + base.corpo.oz); return i >= 0 && base.corpo.cor[i] ? base.corpo.paleta[base.corpo.cor[i] - 1] : null; }};
  base.fonte = Rs.fonteCompacta(vol, 255);
  const volta = Ar.lerProjeto(Ar.salvarProjeto(base));
  check("a fonte vai para o arquivo e volta igual (paleta e cada voxel)", volta.fonte && volta.fonte.gx === base.fonte.gx && volta.fonte.paleta.length === base.fonte.paleta.length &&
    volta.fonte.cor.every((v, i) => v === base.fonte.cor[i]));
  const K = 1.41;
  const restaurar = Rs.usarResolucao(K);
  let em = null, g = null;
  try {
    g = {DX: N.GRADE.DX, DY: N.GRADE.DY, DZ: N.GRADE.DZ};
    em = Rs.projetoEm(volta, K);
  } finally { restaurar(); }
  check("usar a resolucao mexe na grade, na caixa e no centro, e restaurar volta tudo como era", g.DX === 113 && g.DZ === 165 && dims() === antes && Rs.resolucaoAtual() === 1, JSON.stringify(g));
  let n1 = 0, n2 = 0; for (const v of base.corpo.cor) if (v) n1++; for (const v of em.corpo.cor) if (v) n2++;
  check("em 165 o corpo tem uns 2,8 vezes os voxels (1,41 ao cubo)", n2/n1 > 2.3 && n2/n1 < 3.4, (n2/n1).toFixed(2) + "x: " + n1 + " -> " + n2);
  check("o esqueleto e as larguras mudam de escala, e a rotacao das poses nao", Math.abs(em.juntas.cintura[2] - base.juntas.cintura[2]*K) < 1e-9 &&
    Math.abs(em.larguras.tronco - base.larguras.tronco*K) < 1e-9 && em.animacoes.andar[2].rot.coxaE.every((v, i) => v === base.animacoes.andar[2].rot.coxaE[i]));
  const de = Rs.animacoesDeVolta(em);
  let ok = true; for (const a of Object.keys(base.animacoes)) base.animacoes[a].forEach((p, i) => { if (de[a][i].raiz.some((v, k) => Math.abs(v - p.raiz[k]) > 1e-9)) ok = false; });
  check("as animacoes editadas em 165 voltam para 117 sem perder nada (a raiz divide por K)", ok);
  check("o projeto em 165 sabe de onde veio e em que escala", em.escala === K && em.derivadoDe === volta && em.fonte === volta.fonte);
}

/* ---------- 9. o texto dos arquivos ---------- */
for (const f of fs.readdirSync(A).sort()){
  if (!/\.(js|html|md)$/.test(f)) continue;
  const s = fs.readFileSync(path.join(A, f), "utf8"), k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
  check("atelie/" + f + " e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k + ": " + s.slice(Math.max(0, k - 20), k + 20));
}
for (const f of ["humano.personagem", "humano.pele"]){
  const s = fs.readFileSync(path.join(__dirname, "..", "personagens", f), "utf8");
  check("personagens/" + f + " e ASCII puro", s.split("").every(c => c.charCodeAt(0) < 128));
}

fim();
