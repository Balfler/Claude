/* ============================================================
   A GRADE DE ANDAR
   ------------------------------------------------------------
   Onde se fica em pe e para onde se anda, com a fisica do jogo.

   Um ponto a cada meio tile: o meio e o canto de cada tile. Cada ponto
   guarda os pisos onde o corpo do jogador -- raio 0,26 -- cabe: o chao do
   terreno, o piso da casa, a laje do andar de cima, o topo da muralha.
   Ponto de dois andares e o comum dentro de casa.

   O ponto vale pela celula dele, meio tile de lado: se o corpo nao cabe bem
   no ponto, mas cabe ate um quarto de tile ao lado, o piso fica guardado com
   esse desvio. Sem isso, a porta de uma parede posta num quarto de tile --
   que a grade das pecas deixa -- caia entre dois pontos, e a grade dizia
   que ali nao se passa. So se procura em volta quando ha peca perto: o
   terreno e alinhado ao tile, e o meio do tile e sempre um ponto.

   Nao ha regra de fisica aqui. Quem responde se bate, que chao fica sob o pe
   e que teto fica sobre a cabeca e o motor (p4.js), as mesmas perguntas que
   movem o jogador, e elas chegam num objeto `mundo`:

     pisosSob(x, y, r)            todo piso candidato sob o circulo
     chaoSob(x, y, r, z)          o piso em que se pisa estando em z
     bate(x, y, r, z, altura)     o corpo cabe aqui?
     temPeca(x, y, r)             ha peca perto? (so para procurar em volta)
     raio, degrau                 o corpo e o degrau que se sobe andando
     altura, alturaEmPe           o corpo agachado (0,55) e em pe (0,85)

   Entao o que a grade diz que se alcanca, se alcanca andando -- e se um dia
   a fisica mudar, a grade muda junto. O jogador agacha -- sozinho debaixo de
   teto baixo, ou com C --, entao aonde se chega e com o corpo agachado, e
   cada piso guarda se ali se fica em pe.

   Andar de um ponto para o vizinho vale quando o corpo vai de um lugar ao
   outro sem bater, e o piso de chegada e o que o motor daria para quem vem
   daquela altura: sobe ate um degrau, desce qualquer quanto. Cair de um
   muro e caminho de ida so.

   Puro: nao toca em DOM. O canteiro usa para validar e para as reguas, e o
   teste roda no node com o motor montado.
   ============================================================ */
const ANDAR_LADO = 0.5;                   // a distancia entre dois pontos, em tiles
const ANDAR_VIZINHOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ANDAR_MIUDO = 4;                    // passos miudos por meio tile, na escada
/* os desvios que se tentam, do mais perto ao mais longe, em oitavos de tile */
const ANDAR_DESVIOS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],
                       [2,0],[-2,0],[0,2],[0,-2],[2,1],[-2,1],[2,-1],[-2,-1],
                       [1,2],[-1,2],[1,-2],[-1,-2],[2,2],[-2,2],[2,-2],[-2,-2]];

/* Monta a grade de uma area, em tiles (a ilha inteira, sem area). A ilha de
   650 leva segundos, entao a ferramenta monta aos poucos, uma fileira por
   vez, sem travar a tela: montarGradeAosPoucos devolve um gerador que para
   a cada fileira (com quanto ja foi, de 0 a 1) e termina com a grade. */
function montarGradeDeAndar(mundo, larg, alt, area){
  return ateOFim(montarGradeAosPoucos(mundo, larg, alt, area));
}
function* montarGradeAosPoucos(mundo, larg, alt, area){
  const a = area || {x0: 0, y0: 0, x1: larg, y1: alt};
  const i0 = Math.max(1, Math.round(a.x0/ANDAR_LADO)), j0 = Math.max(1, Math.round(a.y0/ANDAR_LADO));
  const i1 = Math.min(Math.round(larg/ANDAR_LADO) - 1, Math.round(a.x1/ANDAR_LADO));
  const j1 = Math.min(Math.round(alt/ANDAR_LADO) - 1, Math.round(a.y1/ANDAR_LADO));
  const nx = Math.max(0, i1 - i0 + 1), ny = Math.max(0, j1 - j0 + 1), n = nx*ny;
  const inicio = new Int32Array(n + 1);
  let cap = Math.max(16, n*1.2 | 0), total = 0;
  let pisos = new Float32Array(cap), emPe = new Uint8Array(cap), dx = new Int8Array(cap), dy = new Int8Array(cap);
  for (let j = 0; j < ny; j++){
    for (let i = 0; i < nx; i++){
      const p = j*nx + i, x = (i0 + i)*ANDAR_LADO, y = (j0 + j)*ANDAR_LADO;
      inicio[p] = total;
      const achados = pisosEm(mundo, x, y);
      if (total + achados.length > cap){
        cap = cap*2 + achados.length;
        const np = new Float32Array(cap), ne = new Uint8Array(cap), nX = new Int8Array(cap), nY = new Int8Array(cap);
        np.set(pisos); ne.set(emPe); nX.set(dx); nY.set(dy);
        pisos = np; emPe = ne; dx = nX; dy = nY;
      }
      for (const a2 of achados){
        pisos[total] = a2.f; emPe[total] = a2.emPe ? 1 : 0; dx[total] = a2.dx; dy[total] = a2.dy;
        total++;
      }
    }
    yield (j + 1)/ny;
  }
  inicio[n] = total;
  return {i0: i0, j0: j0, nx: nx, ny: ny, inicio: inicio, pisos: pisos.subarray(0, total),
          emPe: emPe.subarray(0, total), dx: dx.subarray(0, total), dy: dy.subarray(0, total), total: total};
}
function ateOFim(it){
  for (;;){ const r = it.next(); if (r.done) return r.value; }
}
/* Os pisos de um ponto, do mais alto para o mais baixo: {f, dx, dy, emPe},
   com o desvio em oitavos de tile. Cada candidato vira o piso que o motor
   daria para quem esta naquela altura -- dois topos a menos de um degrau um
   do outro sao o mesmo andar --, e so fica o piso em que o corpo cabe. */
function pisosEm(mundo, x, y){
  const r = mundo.raio, h = mundo.altura, hPe = mundo.alturaEmPe || h;
  const cand = mundo.pisosSob(x, y, r).sort(function(a, b){ return b - a; });
  const out = [];
  let procurar = null;                                    // ha peca perto? so pergunta se precisar
  const tem = function(f){ for (const o of out) if (Math.abs(o.f - f) < 1e-4) return true; return false; };
  for (let i = 0; i < cand.length; i++){
    const c = cand[i];
    if (i > 0 && c === cand[i - 1]) continue;             // o mesmo piso em dois tiles
    const f = mundo.chaoSob(x, y, r, c);
    if (tem(f)) continue;
    if (!mundo.bate(x, y, r, f, h)){
      out.push({f: f, dx: 0, dy: 0, emPe: hPe <= h || !mundo.bate(x, y, r, f, hPe)});
      continue;
    }
    if (procurar === null) procurar = !mundo.temPeca || mundo.temPeca(x, y, r + 0.3);
    if (!procurar) continue;
    /* Dos lugares da celula onde o corpo cabe, fica o de mais folga: no vao
       estreito de uma porta, e o meio dele. Encostado no batente o corpo cabe
       parado, mas raspa ao atravessar. */
    const cabem = [];
    for (const d of ANDAR_DESVIOS){
      const px = x + d[0]/8, py = y + d[1]/8, f2 = mundo.chaoSob(px, py, r, c);
      if (!tem(f2) && !mundo.bate(px, py, r, f2, h)) cabem.push({d: d, f: f2, px: px, py: py});
    }
    if (!cabem.length) continue;
    let escolhido = cabem[0];
    for (const folga of [0.12, 0.06]){
      const achou = cabem.find(function(k){ return !mundo.bate(k.px, k.py, r + folga, k.f, h); });
      if (achou){ escolhido = achou; break; }
    }
    out.push({f: escolhido.f, dx: escolhido.d[0], dy: escolhido.d[1],
              emPe: hPe <= h || !mundo.bate(escolhido.px, escolhido.py, r, escolhido.f, hPe)});
  }
  return out;
}
function pontoDaGrade(g, x, y){
  const i = Math.round(x/ANDAR_LADO) - g.i0, j = Math.round(y/ANDAR_LADO) - g.j0;
  if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return -1;
  return j*g.nx + i;
}
function ondeFica(g, p){
  return {x: (g.i0 + p % g.nx)*ANDAR_LADO, y: (g.j0 + ((p / g.nx) | 0))*ANDAR_LADO};
}
/* onde o corpo fica de verdade no estado k do ponto p: o ponto com o desvio */
function lugarDoEstado(g, k, p){
  const o = ondeFica(g, p === undefined ? pontoDoEstado(g, k) : p);
  return {x: o.x + g.dx[k]/8, y: o.y + g.dy[k]/8};
}
/* O estado de quem esta em (x, y, z): o ponto mais perto e o piso dele mais
   alto que ainda fica ate um degrau acima do pe. -1 se ali nao se fica. */
function estadoDaGrade(g, x, y, z, degrau){
  const p = pontoDaGrade(g, x, y);
  if (p < 0) return -1;
  let melhor = -1;
  for (let k = g.inicio[p]; k < g.inicio[p + 1]; k++)
    if (g.pisos[k] <= z + degrau && (melhor < 0 || g.pisos[k] > g.pisos[melhor])) melhor = k;
  return melhor;
}
/* De quem e o estado k: o ponto dele (busca binaria em `inicio`). */
function pontoDoEstado(g, k){
  let lo = 0, hi = g.nx*g.ny - 1;
  while (lo < hi){
    const m = (lo + hi + 1) >> 1;
    if (g.inicio[m] <= k) lo = m; else hi = m - 1;
  }
  return lo;
}
/* O estado de um ponto com o piso f, ou -1. */
function estadoComPiso(g, p, f){
  for (let k = g.inicio[p]; k < g.inicio[p + 1]; k++) if (Math.abs(g.pisos[k] - f) < 1e-3) return k;
  return -1;
}
/* Andar de (x, y), no piso f, ate (qx, qy), com o corpo de altura h: o piso
   em que se chega, ou NaN se bate no caminho. De meio em meio caminho
   primeiro -- tres circulos de raio 0,26 a menos de 0,4 um do outro cobrem o
   caminho, entao parede fina nenhuma passa entre eles; se o piso de chegada
   nao for o esperado, talvez seja uma escada, que sobe mais que um degrau a
   cada meio tile e o jogador sobe porque da passos pequenos: anda em
   oitavos, subindo o pe a cada um, como o motor faz. */
function andarAte(mundo, x, y, f, qx, qy, h, esperado){
  const r = mundo.raio;
  if (!mundo.bate((x + qx)/2, (y + qy)/2, r, f, h) && !mundo.bate(qx, qy, r, f, h)){
    const z = mundo.chaoSob(qx, qy, r, f);
    if (esperado === undefined || Math.abs(z - esperado) < 1e-3) return z;
  }
  let z = f;
  for (let s = 1; s <= ANDAR_MIUDO; s++){
    const sx = x + (qx - x)*s/ANDAR_MIUDO, sy = y + (qy - y)*s/ANDAR_MIUDO;
    if (mundo.bate(sx, sy, r, z, h)) return NaN;
    z = mundo.chaoSob(sx, sy, r, z);
  }
  return z;
}
/* O passo de a {x, y, f} ate b {x, y, f} com o corpo de altura h: null se
   nao da, [] se vai direto, ou os dois pontos de uma raia. A raia e para o
   vao estreito fora do alinhamento da grade -- a porta de uma parede posta
   num quarto de tile: a reta entre os dois lugares raspa o batente, mas uma
   paralela a ela, ate um quarto de tile para o lado, passa pelo meio. Vai-se
   de lado ate a raia, atravessa-se por ela e volta-se de lado; os tres
   trechos sao conferidos. So se procura raia quando ha peca perto. */
const ANDAR_RAIAS = [1, -1, 2, -2, 3, -3];
function ligar(mundo, a, b, h){
  const ok = function(de, ate, fde, fate){ return Math.abs(andarAte(mundo, de.x, de.y, fde, ate.x, ate.y, h, fate) - fate) < 1e-3; };
  if (ok(a, b, a.f, b.f)) return [];
  const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
  if (mundo.temPeca && !mundo.temPeca(mx, my, mundo.raio + 0.3)) return null;
  /* a raia corre na direcao do passo; o desvio e de lado */
  const aoLongoDeY = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
  const base = aoLongoDeY ? Math.round(mx*2)/2 : Math.round(my*2)/2;
  for (const k of ANDAR_RAIAS){
    const l = base + k/8;
    const ra = aoLongoDeY ? {x: l, y: a.y} : {x: a.x, y: l};
    const rb = aoLongoDeY ? {x: l, y: b.y} : {x: b.x, y: l};
    if (ok(a, ra, a.f, a.f) && ok(ra, rb, a.f, b.f) && ok(rb, b, b.f, b.f))
      return [{x: ra.x, y: ra.y, z: a.f}, {x: rb.x, y: rb.y, z: b.f}];
  }
  return null;
}
/* Os passos que saem de um estado, em pares: estado de chegada e 1 se o
   passo so da agachado. Em pe primeiro -- e o caso comum, e custa uma
   tentativa so. */
function passosDe(g, mundo, k, p){
  const f = g.pisos[k], out = [], de = lugarDoEstado(g, k, p);
  const pi = p % g.nx, pj = (p / g.nx) | 0;
  const h = mundo.altura, hPe = mundo.alturaEmPe || h;
  for (const d of ANDAR_VIZINHOS){
    const qi = pi + d[0], qj = pj + d[1];
    if (qi < 0 || qj < 0 || qi >= g.nx || qj >= g.ny) continue;
    const q = qj*g.nx + qi;
    for (let kq = g.inicio[q]; kq < g.inicio[q + 1]; kq++){
      const ate = lugarDoEstado(g, kq, q), fq = g.pisos[kq];
      const a = {x: de.x, y: de.y, f: f}, b = {x: ate.x, y: ate.y, f: fq};
      let via = ligar(mundo, a, b, hPe), agachado = 0;
      if (!via && h < hPe){ via = ligar(mundo, a, b, h); agachado = 1; }
      if (via) out.push(kq, agachado);
    }
  }
  return out;
}
/* Anda a grade inteira a partir de um estado, em largura: `passos[k]` e
   quantos pontos se anda ate k (-1 se nao se chega). Multiplicado por meio
   tile, e a distancia andando. `agachado[k]` diz que o passo que chegou em k
   so deu agachado. */
function percorrerGrade(g, mundo, de){
  return ateOFim(percorrerAosPoucos(g, mundo, de));
}
function* percorrerAosPoucos(g, mundo, de){
  const passos = new Int32Array(g.total).fill(-1), anterior = new Int32Array(g.total).fill(-1);
  const agachado = new Uint8Array(g.total);
  if (de < 0) return {passos: passos, anterior: anterior, agachado: agachado, alcancados: 0};
  const fila = new Int32Array(g.total), dono = new Int32Array(g.total);
  let ini = 0, fim = 0, alcancados = 0;
  passos[de] = 0; fila[fim++] = de; dono[de] = pontoDoEstado(g, de);
  while (ini < fim){
    const k = fila[ini++];
    alcancados++;
    const ps = passosDe(g, mundo, k, dono[k]);
    for (let i = 0; i < ps.length; i += 2){
      const c = ps[i];
      if (passos[c] >= 0) continue;
      passos[c] = passos[k] + 1;
      anterior[c] = k;
      agachado[c] = ps[i + 1];
      dono[c] = pontoDoEstado(g, c);
      fila[fim++] = c;
    }
    if ((alcancados & 4095) === 0) yield alcancados/g.total;
  }
  return {passos: passos, anterior: anterior, agachado: agachado, alcancados: alcancados};
}
/* O caminho ate k, do comeco ao fim: a lista de {x, y, z}, no lugar onde o
   corpo fica de verdade. */
function caminhoAte(g, percorrido, k, mundo){
  const estados = [];
  for (let c = k; c >= 0; c = percorrido.anterior[c]) estados.push(c);
  estados.reverse();
  const out = [];
  for (let i = 0; i < estados.length; i++){
    const c = estados[i], o = lugarDoEstado(g, c), ag = !!percorrido.agachado[c];
    /* o passo que foi por uma raia leva os dois pontos dela */
    if (i > 0 && mundo){
      const a = out[out.length - 1];
      const via = ligar(mundo, {x: a.x, y: a.y, f: a.z}, {x: o.x, y: o.y, f: g.pisos[c]},
                        ag ? mundo.altura : (mundo.alturaEmPe || mundo.altura)) || [];
      for (const w of via) out.push({x: w.x, y: w.y, z: w.z, agachado: ag});
    }
    out.push({x: o.x, y: o.y, z: g.pisos[c], agachado: ag});
  }
  return out;
}

/* ---------- o caminho de um ponto a outro ----------
   A regua mede o caminho andando entre dois pontos quaisquer da ilha. Montar
   a grade da area inteira e percorrer tudo levava segundos; aqui os pisos de
   cada ponto so sao achados quando a busca passa por ele, e a busca vai na
   direcao do alvo (A*, com a distancia em quadras como estimativa). O custo
   e o tempo: o passo agachado custa 2,35 vezes o em pe (4,7 contra 2,0
   tiles por segundo). O caminho em cruz que ela acha e depois esticado em
   retas, que e como o jogador anda.

   `de` e `ate` sao {x, y} em tiles, e `de.z` a altura do pe na saida. Ponto
   onde nao se fica em pe troca pelo mais perto que fica, ate 3 tiles. */
const CUSTO_AGACHADO = 4.7/2.0;
function buscarCaminho(mundo, larg, alt, de, ate, limite){
  return ateOFim(buscarCaminhoAosPoucos(mundo, larg, alt, de, ate, limite));
}
/* O mesmo, parando a cada 500 pontos abertos (com quantos ja foram): a
   ferramenta mede sem travar a tela quando o caminho e longo -- ou quando
   nao existe, que obriga a abrir tudo o que se alcanca. */
function* buscarCaminhoAosPoucos(mundo, larg, alt, de, ate, limite){
  const NX = Math.round(larg/ANDAR_LADO) + 1, NY = Math.round(alt/ANDAR_LADO) + 1;
  const h = mundo.altura, hPe = mundo.alturaEmPe || h;
  const pisosDe = new Map();                      // ponto -> [{f, dx, dy}]
  function pisos(p){
    let l = pisosDe.get(p);
    if (!l){
      const i = p % NX, j = (p / NX) | 0;
      l = (i < 1 || j < 1 || i >= NX - 1 || j >= NY - 1) ? [] : pisosEm(mundo, i*ANDAR_LADO, j*ANDAR_LADO).slice(0, 8);
      pisosDe.set(p, l);
    }
    return l;
  }
  const lugar = function(p, k){ const l = pisos(p)[k]; return {x: (p % NX)*ANDAR_LADO + l.dx/8, y: ((p / NX) | 0)*ANDAR_LADO + l.dy/8}; };
  /* o ponto mais perto onde se fica em pe, ate 3 tiles */
  function emPe(x, y){
    let melhor = -1, dm = 1e9;
    const i0 = Math.round(x/ANDAR_LADO), j0 = Math.round(y/ANDAR_LADO);
    for (let dj = -6; dj <= 6; dj++) for (let di = -6; di <= 6; di++){
      const d = di*di + dj*dj;
      if (d >= dm) continue;
      const i = i0 + di, j = j0 + dj;
      if (i < 0 || j < 0 || i >= NX || j >= NY) continue;
      if (pisos(j*NX + i).length){ melhor = j*NX + i; dm = d; }
    }
    return melhor;
  }
  const p0 = emPe(de.x, de.y), p1 = emPe(ate.x, ate.y);
  if (p0 < 0) return {chega: false, porque: "perto da saida nao se fica em pe"};
  if (p1 < 0) return {chega: false, porque: "perto da chegada nao se fica em pe"};
  /* o piso de saida: o mais alto ate um degrau acima do pe */
  const l0 = pisos(p0);
  let k0 = 0;
  for (let k = 0; k < l0.length; k++) if (l0[k].f <= (de.z === undefined ? 1e9 : de.z) + mundo.degrau){ k0 = k; break; }
  const ESTADOS = 8, estado = function(p, k){ return p*ESTADOS + k; };
  const ti = p1 % NX, tj = (p1 / NX) | 0;
  /* Distancia em quadras, um fio maior que ela: no empate a busca prefere
     o ponto mais adiante, e em campo aberto abre uma faixa e nao um
     losango. */
  const estima = function(p){ return 1.001*(Math.abs(p % NX - ti) + Math.abs(((p / NX) | 0) - tj)); };
  const custo = new Map(), veio = new Map(), agachou = new Map(), raia = new Map();
  /* fila de prioridade: um heap binario de [prioridade, estado] */
  const heap = [];
  const por = function(pr, s){
    heap.push([pr, s]);
    for (let i = heap.length - 1; i > 0;){
      const pai = (i - 1) >> 1;
      if (heap[pai][0] <= heap[i][0]) break;
      const t = heap[pai]; heap[pai] = heap[i]; heap[i] = t; i = pai;
    }
  };
  const tirar = function(){
    const topo = heap[0], ult = heap.pop();
    if (heap.length){
      heap[0] = ult;
      for (let i = 0;;){
        const a = 2*i + 1, b = a + 1;
        let m = i;
        if (a < heap.length && heap[a][0] < heap[m][0]) m = a;
        if (b < heap.length && heap[b][0] < heap[m][0]) m = b;
        if (m === i) break;
        const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m;
      }
    }
    return topo;
  };
  const s0 = estado(p0, k0);
  custo.set(s0, 0); por(estima(p0), s0);
  let abertos = 0, fim = -1;
  const teto = limite || 2000000;
  while (heap.length){
    const [pr, s] = tirar();
    const p = (s / ESTADOS) | 0, k = s % ESTADOS, c = custo.get(s);
    if (pr > c + estima(p) + 1e-9) continue;                  // velho na fila
    if (p === p1){ fim = s; break; }
    if (++abertos > teto) return {chega: false, porque: "caminho longo demais para a regua", abertos: abertos};
    if ((abertos % 500) === 0) yield abertos;
    const f = pisos(p)[k].f, daqui = lugar(p, k), pi = p % NX, pj = (p / NX) | 0;
    for (const d of ANDAR_VIZINHOS){
      const qi = pi + d[0], qj = pj + d[1];
      if (qi < 0 || qj < 0 || qi >= NX || qj >= NY) continue;
      const q = qj*NX + qi, lq = pisos(q);
      for (let kq = 0; kq < lq.length; kq++){
        const la = lugar(q, kq), fq = lq[kq].f;
        const a = {x: daqui.x, y: daqui.y, f: f}, b = {x: la.x, y: la.y, f: fq};
        let via = ligar(mundo, a, b, hPe), ag = 0;
        if (!via && h < hPe){ via = ligar(mundo, a, b, h); ag = 1; }
        if (!via) continue;
        const t = estado(q, kq), nc = c + (ag ? CUSTO_AGACHADO : 1);
        if (custo.has(t) && custo.get(t) <= nc) continue;
        custo.set(t, nc); veio.set(t, s); agachou.set(t, ag); raia.set(t, via);
        por(nc + estima(q), t);
      }
    }
  }
  if (fim < 0) return {chega: false, porque: "nao se chega andando", abertos: abertos};
  const caminho = [];
  for (let s = fim; s !== undefined; s = veio.get(s)){
    const p = (s / ESTADOS) | 0, k = s % ESTADOS, o = lugar(p, k), ag = !!agachou.get(s);
    caminho.push({x: o.x, y: o.y, z: pisos(p)[k].f, agachado: ag});
    const via = raia.get(s) || [];
    for (let i = via.length - 1; i >= 0; i--) caminho.push({x: via[i].x, y: via[i].y, z: via[i].z, agachado: ag});
  }
  caminho.reverse();
  const reto = alisarCaminho(mundo, caminho);
  let tiles = 0;
  for (let i = 1; i < reto.length; i++) tiles += Math.hypot(reto[i].x - reto[i - 1].x, reto[i].y - reto[i - 1].y);
  return {chega: true, caminho: reto, emCruz: caminho, tiles: tiles, abertos: abertos};
}
/* O caminho da busca anda em cruz, e o jogador anda em reta: esticado como
   um barbante, cada trecho vira a reta mais longa que o corpo anda de
   verdade -- conferida com a fisica, a cada oitavo de tile, subindo e
   descendo o pe como o motor faz --, sem sair do piso de chegada. O trecho
   que tinha passo agachado e conferido agachado. */
function andaReto(mundo, a, b, h){
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d/0.125)), r = mundo.raio;
  let z = a.z;
  for (let s = 1; s <= n; s++){
    const x = a.x + (b.x - a.x)*s/n, y = a.y + (b.y - a.y)*s/n;
    if (mundo.bate(x, y, r, z, h)) return false;
    z = mundo.chaoSob(x, y, r, z);
  }
  return Math.abs(z - b.z) < 1e-3;
}
function alisarCaminho(mundo, c){
  if (c.length < 3) return c.slice();
  const hPe = mundo.alturaEmPe || mundo.altura;
  const out = [c[0]];
  let i = 0;
  while (i < c.length - 1){
    /* dobra o alcance enquanto a reta anda, e depois estreita na metade */
    let bom = i + 1, passo = 1;
    const tenta = function(j){
      let agachado = false;
      for (let k = i + 1; k <= j; k++) if (c[k].agachado){ agachado = true; break; }
      return andaReto(mundo, c[i], c[j], agachado ? mundo.altura : hPe);
    };
    while (bom + passo < c.length && tenta(bom + passo)){ bom += passo; passo *= 2; }
    for (passo >>= 1; passo >= 1; passo >>= 1)
      if (bom + passo < c.length && tenta(bom + passo)) bom += passo;
    let agachado = false;
    for (let k = i + 1; k <= bom; k++) if (c[k].agachado){ agachado = true; break; }
    out.push({x: c[bom].x, y: c[bom].y, z: c[bom].z, agachado: agachado});
    i = bom;
  }
  return out;
}

if (typeof module !== "undefined") module.exports = {
  ANDAR_LADO, montarGradeDeAndar, montarGradeAosPoucos, percorrerAosPoucos, ateOFim, pisosEm, pontoDaGrade, ondeFica,
  lugarDoEstado, estadoDaGrade, pontoDoEstado, estadoComPiso, andarAte, ligar, passosDe, percorrerGrade, caminhoAte,
  buscarCaminho, buscarCaminhoAosPoucos, alisarCaminho, andaReto, CUSTO_AGACHADO
};
