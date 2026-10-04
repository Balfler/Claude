/* ============================================================
   ATELIE -- A VALIDACAO
   ------------------------------------------------------------
   Roda sozinha antes de exportar, em todos os quadros que o jogo assa. E o
   que evita descobrir o defeito numa captura de tela depois de ja ter
   exportado e commitado.

   Erro impede exportar; aviso nao.
   - voxel fora da grade 80x56x117 (o jogo corta sem avisar);
   - pedaco solto do corpo, vizinhanca 6, maior que 20 voxels -- a fresta
     de junta que faz um pedaco "voar";
   - volume que muda mais de 15% do parado (junta que murcha ou incha);
   - silhueta mais larga do que o mesmo quadro posado duro, sem mistura de
     osso (braco inchando ao girar; braco que so abre alarga os dois);
   - osso cuja pele se afasta do eixo mais do que na bind pose (inchaco
     medido direto, osso a osso);
   - peso repartido entre ossos que nao sao pai e filho (a mao no quadril);
   - paleta maior do que o jogo aguenta;
   - juntas do parado longe do REPOUSO do jogo (as pecas de posicao fixa,
     como peitoral e cinto, ficam deslocadas).
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
if (typeof module !== "undefined" && typeof posarCorpo === "undefined"){
  const M = require("./deformar.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof quadrosDoProjeto === "undefined"){
  const M = require("./animacao.js");
  for (const k in M) globalThis[k] = M[k];
}

const LIMITES = {pedacoSolto: 20, volume: 0.15, largura: 0.15, larguraFolga: 2, inchaco: 1.3, desvioDoRepouso: 4};

/* os pedacos ligados (vizinhanca 6) de uma grade, do maior para o menor */
function pedacos(g, D){
  D = D || GRADE;
  const DX = D.DX, DY = D.DY, DZ = D.DZ, visto = new Uint8Array(g.length), pilha = new Int32Array(g.length), lista = [];
  for (let i0 = 0; i0 < g.length; i0++){
    if (!g[i0] || visto[i0]) continue;
    let topo = 0, n = 0, sx = 0, sy = 0, sz = 0;
    pilha[topo++] = i0; visto[i0] = 1;
    while (topo){
      const i = pilha[--topo], x = i % DX, r = (i - x)/DX, y = r % DY, z = (r - y)/DY;
      n++; sx += x; sy += y; sz += z;
      if (x > 0 && g[i - 1] && !visto[i - 1]){ visto[i - 1] = 1; pilha[topo++] = i - 1; }
      if (x < DX - 1 && g[i + 1] && !visto[i + 1]){ visto[i + 1] = 1; pilha[topo++] = i + 1; }
      if (y > 0 && g[i - DX] && !visto[i - DX]){ visto[i - DX] = 1; pilha[topo++] = i - DX; }
      if (y < DY - 1 && g[i + DX] && !visto[i + DX]){ visto[i + DX] = 1; pilha[topo++] = i + DX; }
      if (z > 0 && g[i - DX*DY] && !visto[i - DX*DY]){ visto[i - DX*DY] = 1; pilha[topo++] = i - DX*DY; }
      if (z < DZ - 1 && g[i + DX*DY] && !visto[i + DX*DY]){ visto[i + DX*DY] = 1; pilha[topo++] = i + DX*DY; }
    }
    lista.push({n: n, centro: [Math.round(sx/n), Math.round(sy/n), Math.round(sz/n)]});
  }
  return lista.sort(function(a, b){ return b.n - a.n; });
}
function contarCheios(g){ let n = 0; for (let i = 0; i < g.length; i++) if (g[i]) n++; return n; }
/* a largura da silhueta de frente na faixa do tronco (entre o quadril e o ombro) */
function larguraDoTronco(g, juntas, D){
  D = D || GRADE;
  const z0 = Math.max(0, Math.round(Math.min(juntas.quadrilE[2], juntas.quadrilD[2]))),
        z1 = Math.min(D.DZ - 1, Math.round(Math.max(juntas.ombroE[2], juntas.ombroD[2])));
  let a = D.DX, b = -1;
  for (let z = z0; z <= z1; z++) for (let y = 0; y < D.DY; y++) for (let x = 0; x < D.DX; x++)
    if (g[(z*D.DY + y)*D.DX + x]){ if (x < a) a = x; if (x > b) b = x; }
  return b >= a ? b - a + 1 : 0;
}
/* O inchaco de cada osso: a distancia da pele ao eixo do osso (percentil 95
   dos voxels que sao dele), posada sobre a da bind pose. Giro rigido nao
   muda essa distancia; so a mistura de dois ossos muda, e e ela que se mede. */
function inchacoDosOssos(c, juntas, posado){
  const P = peleDoCorpo(c), NB = OSSOS.length, antes = [], depois = [];
  for (let b = 0; b < NB; b++){ antes.push([]); depois.push([]); }
  const J1 = posado.juntas;
  for (let k = 0; k < P.n; k++){
    const b = P.w[k] >= 0.5 ? P.a[k] : P.b[k], o = OSSOS[b];
    if (o.nome === "bacia" || o.nome === "tronco") continue;        // tronco nao e cilindro: o eixo dele nao diz nada
    const a0 = juntas[o.pivo], b0 = juntas[o.alcance || o.ponta], a1 = J1[o.pivo], b1 = J1[o.alcance || o.ponta];
    antes[b].push(distSegmento([P.pos[k*3], P.pos[k*3 + 1], P.pos[k*3 + 2]], a0, b0).d);
    depois[b].push(distSegmento([posado.posada[k*3], posado.posada[k*3 + 1], posado.posada[k*3 + 2]], a1, b1).d);
  }
  function p95(l){ if (!l.length) return 0; l.sort(function(x, y){ return x - y; }); return l[Math.floor(l.length*0.95)]; }
  return OSSOS.map(function(o, b){ const a = p95(antes[b]); return a > 0 ? p95(depois[b])/a : 1; });
}

/* Valida o projeto inteiro. Devolve {erros, avisos, quadros: [{nome, voxels,
   fora, soltos, largura, grade}]} -- a grade vai junto para a exportacao
   nao posar tudo de novo. */
function validarProjeto(proj, opcoes){
  opcoes = opcoes || {};
  const c = proj.corpo, J = proj.juntas, erros = [], avisos = [], quadros = [];
  /* o corpo em si */
  if (!voxelsDoCorpo(c).length){ erros.push("o corpo esta vazio"); return {erros: erros, avisos: avisos, quadros: quadros}; }
  if (c.paleta.length > MAX_CORES_DO_CORPO)
    erros.push("a paleta tem " + c.paleta.length + " cores; o jogo aguenta " + MAX_CORES_DO_CORPO + " (as rampas fixas das pecas ocupam " + CORES_FIXAS_DO_JOGO + " das 255 entradas, e cada cor vira " + TONS_POR_COR + " tons)");
  let longe = 0, exemplo = null;
  const lista = voxelsDoCorpo(c);
  for (let k = 0; k < lista.length; k++){
    const i = lista[k], a = c.a[i], b = c.b[i];
    if (a !== b && c.w[i] < 255 && !(OSSOS[a].iPai === b || OSSOS[b].iPai === a)){ longe++; if (!exemplo) exemplo = [posicaoDaCelula(c, i), OSSOS[a].nome, OSSOS[b].nome]; }
  }
  if (longe) erros.push(longe + " voxels com peso entre ossos que nao sao pai e filho (ex.: " + exemplo[1] + " e " + exemplo[2] + " em " + exemplo[0].join(",") + ")");
  /* cada quadro */
  let base = null;
  for (const q of quadrosDoProjeto(proj.animacoes)){
    if (!q.pose){ erros.push("o quadro " + q.nome + " nao tem pose"); continue; }
    const r = posarCorpo(c, J, q.pose), n = contarCheios(r.g), pc = pedacos(r.g);
    const soltos = pc.slice(1).filter(function(p){ return p.n > LIMITES.pedacoSolto; });
    /* a regua da largura e o mesmo quadro posado duro, cada voxel num osso
       so: giro rigido nao incha, entao o que a pele misturada passar dele
       e inchaco -- e braco que so abre de proposito alarga os dois juntos */
    const rigida = larguraDoTronco(posarCorpo(c, J, q.pose, {rigido: true}).g, r.juntas);
    const info = {nome: q.nome, voxels: n, fora: r.fora, soltos: soltos, largura: larguraDoTronco(r.g, r.juntas), rigida: rigida, grade: r.g, juntas: r.juntas};
    quadros.push(info);
    if (r.fora) erros.push(q.nome + ": " + r.fora + " voxels fora da grade " + GRADE.DX + "x" + GRADE.DY + "x" + GRADE.DZ);
    for (const s of soltos) erros.push(q.nome + ": pedaco solto de " + s.n + " voxels perto de " + s.centro.join(","));
    if (q.nome === "parado"){
      base = info;
      let pior = 0, qual = "";
      for (const j of JUNTAS){ const d = vDist(r.juntas[j], REPOUSO_DO_JOGO[j]); if (d > pior){ pior = d; qual = j; } }
      info.desvio = pior;
      if (pior > LIMITES.desvioDoRepouso)
        avisos.push("parado: a junta " + qual + " fica a " + pior.toFixed(1) + " voxels do REPOUSO do jogo -- as pecas penduradas em junta acompanham, mas as de posicao fixa (peitoral, cinto, capa) podem ficar deslocadas");
    }
    if (!opcoes.rapido){
      const inch = inchacoDosOssos(c, J, r);
      inch.forEach(function(v, b){
        if (v > LIMITES.inchaco) avisos.push(q.nome + ": a pele do osso " + OSSOS[b].nome + " se afasta " + Math.round((v - 1)*100) + "% do eixo (inchaco na junta)");
      });
    }
  }
  if (base) for (const q of quadros){
    if (q === base) continue;
    const dv = q.voxels/base.voxels - 1;
    if (Math.abs(dv) > LIMITES.volume) erros.push(q.nome + ": o volume muda " + Math.round(dv*100) + "% do parado");
    if (q.largura > q.rigida*(1 + LIMITES.largura) + LIMITES.larguraFolga)
      erros.push(q.nome + ": a silhueta do tronco fica com " + q.largura + " voxels de largura, contra " + q.rigida + " no giro duro -- a pele esta inchando na junta");
  }
  return {erros: erros, avisos: avisos, quadros: quadros};
}

if (typeof module !== "undefined") module.exports = {LIMITES, pedacos, contarCheios, larguraDoTronco, inchacoDosOssos, validarProjeto};
