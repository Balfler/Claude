/* ============================================================
   ATELIE -- O PESO DE OSSO
   ------------------------------------------------------------
   Cada voxel pode ter o peso repartido entre dois ossos (70% antebraco,
   30% braco perto do cotovelo). E o que resolve de raiz a mao grudada no
   quadril, a fresta no ombro e o braco inchado: sem corte duro entre um
   osso e outro, a junta dobra como pele e nao como duas pecas de madeira.

   O calculo de partida e por distancia GEODESICA -- medida andando por
   dentro do proprio volume de voxels, nao em linha reta pelo ar. E o que o
   Maya usa ("geodesic voxel binding"), e aqui o corpo ja e voxel. Em linha
   reta, a mao pendurada fica perto do quadril; andando por dentro do
   corpo, o caminho da mao ate o quadril sobe o braco inteiro e desce o
   tronco. A mao nunca mais pega peso da perna, em pose nenhuma.

   Por osso: distancia geodesica ao segmento do osso, menos o raio dele, mais
   uma multa para o voxel do lado errado do plano da junta (o peito abaixo
   do ombro fica do tronco). Os dois ossos pai-e-filho mais perto repartem o
   voxel, suave numa faixa em volta da junta com a largura do osso filho --
   largura 0 e o corte duro de antes.

   O pincel so corrige onde o automatico errar.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof voxelsDoCorpo === "undefined"){
  const M = require("./corpo.js");
  for (const k in M) globalThis[k] = M[k];
}

/* a meia largura da faixa de mistura em volta de cada junta, pelo osso filho */
const LARGURA_PADRAO = {bacia: 0, tronco: 4, cabeca: 3, bracoE: 5, bracoD: 5, antebracoE: 3, antebracoD: 3,
                        coxaE: 4, coxaD: 4, canelaE: 3, canelaD: 3, peE: 2, peD: 2};

/* os segmentos que representam cada osso na hora de medir */
function segmentosDoOsso(o, j){
  if (o.nome === "bacia") return [[j.quadrilE, j.quadrilD], [j.meioQuadril, j.cintura]];
  if (o.nome === "tronco"){
    /* a cintura escapular faz parte do tronco, um pouco para dentro dos ombros */
    const e = vEntre(j.ombroE, j.ombroD, 0.12), d = vEntre(j.ombroE, j.ombroD, 0.88);
    return [[j.cintura, j.meioOmbro], [e, d], [j.meioOmbro, j.pescoco]];
  }
  return [[j[o.pivo], j[o.alcance || o.ponta]]];
}

/* distancia de (px,py,pz) aos segmentos, sem criar array: o laco roda milhoes de vezes */
function distAosSegmentosXYZ(px, py, pz, segs){
  let m = 1e18;
  for (let i = 0; i < segs.length; i++){
    const a = segs[i][0], b = segs[i][1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L2 = dx*dx + dy*dy + dz*dz;
    let t = L2 > 0 ? ((px - a[0])*dx + (py - a[1])*dy + (pz - a[2])*dz)/L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = px - a[0] - dx*t, ey = py - a[1] - dy*t, ez = pz - a[2] - dz*t, d = ex*ex + ey*ey + ez*ez;
    if (d < m){ m = d; distAosSegmentosXYZ.t = t; }
  }
  return Math.sqrt(m);
}

/* os vizinhos 26 de cada voxel da lista, com o custo do passo */
function grafoDoCorpo(c){
  const lista = voxelsDoCorpo(c), n = lista.length;
  const pos = new Int16Array(n*3), mapa = new Map();
  for (let k = 0; k < n; k++){
    const p = posicaoDaCelula(c, lista[k]);
    pos[k*3] = p[0]; pos[k*3 + 1] = p[1]; pos[k*3 + 2] = p[2];
    mapa.set(lista[k], k);
  }
  const inicio = new Int32Array(n + 1), viz = [], custo = [];
  for (let k = 0; k < n; k++){
    inicio[k] = viz.length;
    const x = pos[k*3], y = pos[k*3 + 1], z = pos[k*3 + 2];
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if (!dx && !dy && !dz) continue;
      const i = celula(c, x + dx, y + dy, z + dz);
      if (i < 0 || !c.cor[i]) continue;
      viz.push(mapa.get(i));
      const s = dx*dx + dy*dy + dz*dz;
      custo.push(s === 1 ? 10 : s === 2 ? 14 : 17);
    }
  }
  inicio[n] = viz.length;
  return {lista: lista, n: n, pos: pos, mapa: mapa, inicio: inicio, viz: Int32Array.from(viz), custo: Uint8Array.from(custo)};
}

/* Distancia geodesica de cada voxel ao osso: Dijkstra partindo das sementes,
   com fila de baldes (o passo custa 10, 14 ou 17 decimos de voxel, entao a
   distancia e inteira e a fila e um vetor de listas). */
function distanciaGeodesica(G, segs){
  const n = G.n, dist = new Int32Array(n).fill(0x3fffffff), perto = new Float32Array(n);
  let menor = Infinity, maior = 0;
  for (let k = 0; k < n; k++){
    perto[k] = distAosSegmentosXYZ(G.pos[k*3], G.pos[k*3 + 1], G.pos[k*3 + 2], segs);
    if (perto[k] < menor) menor = perto[k];
  }
  /* sementes: o que o osso atravessa; se o osso passa por fora do corpo, o mais perto dele */
  const limite = Math.max(1, menor + 1.5), cabeca = [], proximo = new Int32Array(G.viz.length + n), no = new Int32Array(G.viz.length + n);
  let livres = 0;
  function por(k, d){
    while (cabeca.length <= d) cabeca.push(-1);
    no[livres] = k; proximo[livres] = cabeca[d]; cabeca[d] = livres++;
    if (d > maior) maior = d;
  }
  for (let k = 0; k < n; k++) if (perto[k] <= limite){ dist[k] = Math.round(perto[k]*10); por(k, dist[k]); }
  for (let d = 0; d <= maior; d++){
    let e = cabeca[d];
    while (e >= 0){
      const k = no[e];
      e = proximo[e];
      if (dist[k] !== d) continue;
      for (let v = G.inicio[k]; v < G.inicio[k + 1]; v++){
        const j = G.viz[v], nd = d + G.custo[v];
        if (nd < dist[j]){ dist[j] = nd; por(j, nd); }
      }
    }
  }
  const saida = new Float32Array(n);
  for (let k = 0; k < n; k++) saida[k] = dist[k]/10;
  return saida;
}

/* o raio de cada osso: a distancia tipica da pele ao eixo no meio do osso */
function raiosDosOssos(G, j){
  const segs = OSSOS.map(function(o){ return segmentosDoOsso(o, j); });
  const amostras = OSSOS.map(function(){ return []; });
  for (let k = 0; k < G.n; k++){
    let m = 0, dm = 1e9, tm = 0;
    for (let b = 0; b < OSSOS.length; b++){
      const d = distAosSegmentosXYZ(G.pos[k*3], G.pos[k*3 + 1], G.pos[k*3 + 2], segs[b]);
      if (d < dm){ dm = d; m = b; tm = distAosSegmentosXYZ.t; }
    }
    if (tm > 0.25 && tm < 0.75) amostras[m].push(dm);
  }
  return amostras.map(function(l){
    if (!l.length) return 1;
    l.sort(function(a, b){ return a - b; });
    return 0.6*l[l.length >> 1];
  });
}

const FOLGA_DO_BRACO = 6, MULTA_DO_PANO = 4;   // voxels de folga em volta do eixo do braco; multa por voxel alem dela
function suave(t){ t = t < 0 ? 0 : t > 1 ? 1 : t; return t*t*(3 - 2*t); }

/* Calcula o peso de todo o corpo. `larguras` por osso filho (LARGURA_PADRAO
   no que faltar). Devolve as distancias, para o painel mostrar. Voxel
   travado (pintado a mao) nao muda. */
function calcularPesos(c, juntas, opcoes){
  opcoes = opcoes || {};
  const larguras = Object.assign({}, LARGURA_PADRAO, opcoes.larguras || {});
  const G = grafoDoCorpo(c), n = G.n, NB = OSSOS.length;
  const raios = raiosDosOssos(G, juntas);
  const efetiva = [];
  for (let b = 0; b < NB; b++){
    const o = OSSOS[b], geo = distanciaGeodesica(G, segmentosDoOsso(o, juntas)), e = new Float32Array(n);
    for (let k = 0; k < n; k++) e[k] = Math.max(0, geo[k] - raios[b]);
    efetiva.push(e);
  }
  /* Pano nao e braco: capa e manga larga penduradas perto do braco ficam,
     por dentro do volume, mais perto do braco que do resto -- e ao baixar o
     braco esticam em fios. Um voxel longe do eixo do braco em linha reta
     (mais que o raio dele mais uma folga) nao pode ser do braco: a multa
     cresce com a distancia e ele passa para o osso mais perto de outro
     lado (tronco, bacia, coxa). Braco de verdade fica todo dentro da folga. */
  for (let b = 0; opcoes.pano && b < NB; b++){
    if (!/^(braco|antebraco)[ED]$/.test(OSSOS[b].nome)) continue;
    const segs = segmentosDoOsso(OSSOS[b], juntas), ef = efetiva[b], lim = raios[b] + FOLGA_DO_BRACO*(GRADE.DZ/117);
    for (let k = 0; k < n; k++){
      const d = distAosSegmentosXYZ(G.pos[k*3], G.pos[k*3 + 1], G.pos[k*3 + 2], segs);
      if (d > lim) ef[k] += (d - lim)*MULTA_DO_PANO;
    }
  }
  /* a multa do plano da junta: do lado do pai, o filho fica mais longe; do
     lado do filho, o pai */
  for (let b = 0; b < NB; b++){
    const o = OSSOS[b];
    if (o.iPai < 0) continue;
    const piv = juntas[o.pivo], d = vNorm(vMenos(juntas[o.ponta], piv)), ep = efetiva[o.iPai], ef = efetiva[b];
    for (let k = 0; k < n; k++){
      const s = (G.pos[k*3] - piv[0])*d[0] + (G.pos[k*3 + 1] - piv[1])*d[1] + (G.pos[k*3 + 2] - piv[2])*d[2];
      if (s < 0) ef[k] -= s; else if (geoPerto(G, k, piv, 40*(GRADE.DZ/117))) ep[k] += s;
    }
  }
  let travados = 0;
  for (let k = 0; k < n; k++){
    const i = G.lista[k];
    if (c.trava && c.trava[i]){ travados++; continue; }
    let b1 = 0, d1 = Infinity;
    for (let b = 0; b < NB; b++) if (efetiva[b][k] < d1){ d1 = efetiva[b][k]; b1 = b; }
    let b2 = b1, d2 = Infinity;
    for (let b = 0; b < NB; b++){
      if (b === b1 || !(OSSOS[b].iPai === b1 || OSSOS[b1].iPai === b)) continue;
      if (efetiva[b][k] < d2){ d2 = efetiva[b][k]; b2 = b; }
    }
    const filho = OSSOS[b1].iPai === b2 ? b1 : b2, L = larguras[OSSOS[filho].nome];
    let w1 = 1;
    if (b2 !== b1 && L > 0) w1 = 0.5 + 0.5*suave((d2 - d1)/(2*L));
    c.a[i] = b1; c.b[i] = b2; c.w[i] = Math.round(w1*255);
  }
  /* Pano atras do corpo: a capa nao e perna nem braco. O que fica bem atras do
     tronco (mais de 10 voxels do meio, em 117) segue o corpo inteiro -- a
     bacia abaixo da cintura, o tronco acima, misturados numa faixa de 8 --
     e nao se estica nem se solta quando a perna anda. So com opcoes.pano. */
  if (opcoes.pano){
    const iBacia = OSSOS.findIndex(function(o){ return o.nome === "bacia"; }), iTronco = OSSOS.findIndex(function(o){ return o.nome === "tronco"; });
    const yCorte = CENTRO.CY + 10*(GRADE.DZ/117), zc = juntas.cintura[2], zOmbro = juntas.ombroE[2];
    for (let k = 0; k < n; k++){
      const i = G.lista[k];
      if (c.trava && c.trava[i]) continue;
      const pk = [G.pos[k*3], G.pos[k*3 + 1], G.pos[k*3 + 2]];
      /* atras do tronco, ou de lado bem longe do meio e abaixo dos bracos (a capa
         aberta, a saia): em T-pose nada que nao seja pano fica ali */
      const atras = pk[1] >= yCorte, lado = Math.abs(pk[0] - CENTRO.CX) > 17*(GRADE.DZ/117) && pk[2] < zOmbro - 10*(GRADE.DZ/117) && pk[2] > 14*(GRADE.DZ/117);
      if (!(atras || lado) || pk[2] > zOmbro + 4*(GRADE.DZ/117)) continue;
      const w = suave((pk[2] - (zc - 4*(GRADE.DZ/117)))/(8*(GRADE.DZ/117)));         // 0 na bacia, 1 no tronco
      c.a[i] = iTronco; c.b[i] = iBacia; c.w[i] = Math.round(w*255);
    }
  }
  c.versao++;
  return {raios: raios, travados: travados, voxels: n};
}
/* so multa o pai perto da junta: longe dela, o plano infinito cortaria o
   que nao tem nada a ver (o plano do ombro esquerdo passando pela perna) */
function geoPerto(G, k, piv, raio){
  const dx = G.pos[k*3] - piv[0], dy = G.pos[k*3 + 1] - piv[1], dz = G.pos[k*3 + 2] - piv[2];
  return dx*dx + dy*dy + dz*dz < raio*raio;
}

/* o peso que um osso tem num voxel, de 0 a 1 */
function pesoDoOsso(c, i, b){
  const w = c.w[i]/255;
  return (c.a[i] === b ? w : 0) + (c.b[i] === b ? 1 - w : 0);
}
/* poe de volta dois ossos a partir de um mapa de pesos */
function gravarPesos(c, i, mapa){
  const l = Object.keys(mapa).map(Number).filter(function(b){ return mapa[b] > 1e-4; })
    .sort(function(x, y){ return mapa[y] - mapa[x]; });
  if (!l.length) return;
  const a = l[0], b = l.length > 1 ? l[1] : l[0], s = mapa[a] + (l.length > 1 ? mapa[b] : 0);
  mudarCelula(c, i, null, a, b, Math.round(255*mapa[a]/s));
}
function mapaDePesos(c, i){
  const m = {}, w = c.w[i]/255;
  m[c.a[i]] = (m[c.a[i]] || 0) + w;
  m[c.b[i]] = (m[c.b[i]] || 0) + 1 - w;
  return m;
}
/* O pincel de peso. modo "somar" puxa o voxel para o osso, "tirar" empurra
   para longe dele, "suavizar" faz a media com os vizinhos. Todo voxel
   pintado fica travado: recalcular o automatico nao desfaz a correcao. */
function pincelDePeso(c, centro, raio, osso, forca, modo, espelho){
  const b0 = typeof osso === "number" ? osso : INDICE_OSSO[osso];
  if (!c.trava) c.trava = new Uint8Array(c.cor.length);
  let n = 0;
  const lados = espelho ? [[centro, b0], [[espelhoX(centro[0]), centro[1], centro[2]], INDICE_OSSO[espelhoDoNome(OSSOS[b0].nome)]]] : [[centro, b0]];
  for (const lado of lados){
    const q = lado[0], b = lado[1], R = Math.ceil(raio);
    const mudancas = [];
    for (let dz = -R; dz <= R; dz++) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++){
      const d = Math.hypot(dx, dy, dz);
      if (d > raio + 0.35) continue;
      const i = celula(c, Math.round(q[0]) + dx, Math.round(q[1]) + dy, Math.round(q[2]) + dz);
      if (i < 0 || !c.cor[i]) continue;
      const f = forca*(1 - 0.6*d/Math.max(1, raio)), m = mapaDePesos(c, i);
      if (modo === "suavizar"){
        const soma = {}, p = posicaoDaCelula(c, i);
        let nv = 0;
        for (let ez = -1; ez <= 1; ez++) for (let ey = -1; ey <= 1; ey++) for (let ex = -1; ex <= 1; ex++){
          const j = celula(c, p[0] + ex, p[1] + ey, p[2] + ez);
          if (j < 0 || !c.cor[j]) continue;
          const mj = mapaDePesos(c, j);
          for (const k in mj) soma[k] = (soma[k] || 0) + mj[k];
          nv++;
        }
        for (const k in soma) soma[k] /= nv;
        const nm = {};
        for (const k of new Set(Object.keys(m).concat(Object.keys(soma)))) nm[k] = (m[k] || 0)*(1 - f) + (soma[k] || 0)*f;
        mudancas.push([i, nm]);
      } else {
        const atual = m[b] || 0, alvo = modo === "tirar" ? Math.max(0, atual - f) : Math.min(1, atual + f);
        const resto = 1 - atual, nm = {};
        for (const k in m) if (+k !== b) nm[k] = resto > 1e-6 ? m[k]/resto*(1 - alvo) : 0;
        if (modo === "tirar" && resto <= 1e-6){
          /* so tinha este osso: o peso tirado vai para o pai */
          const pai = OSSOS[b].iPai >= 0 ? OSSOS[b].iPai : (OSSOS.find(function(o){ return o.iPai === b; }) || OSSOS[0]).indice;
          nm[pai] = 1 - alvo;
        }
        nm[b] = alvo;
        mudancas.push([i, nm]);
      }
    }
    for (const m of mudancas){ gravarPesos(c, m[0], m[1]); c.trava[m[0]] = 1; n++; }
  }
  return n;
}
/* destrava tudo (o proximo calculo automatico vale para o corpo inteiro) */
function destravarPesos(c){ if (c.trava) c.trava.fill(0); }

if (typeof module !== "undefined") module.exports = {
  LARGURA_PADRAO, segmentosDoOsso, grafoDoCorpo, distanciaGeodesica, raiosDosOssos, calcularPesos,
  pesoDoOsso, mapaDePesos, gravarPesos, pincelDePeso, destravarPesos
};
