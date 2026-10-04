/* ============================================================
   ANDAR, NA TELA DO CANTEIRO
   ------------------------------------------------------------
   A grade de andar (src/andar.js) levada para a ferramenta:

   - a REGUA mede o caminho andando, nao a linha reta: contorna o morro, entra
     pela porta, sobe a escada, e diz quanto tempo leva -- que e o que importa
     numa ilha. Se nao se chega, diz.
   - a camada de ALCANCE pinta de vermelho o chao onde se fica em pe mas nao
     se chega andando a partir do inicio do jogador: o plato sem rampa, a casa
     sem porta, o outro lado do rio sem ponte. E o mesmo chao que a lista de
     problemas conta, com os marcos e as escadas (validacao.js).

   As perguntas de fisica sao as do motor, e as portas contam como abertas --
   a pergunta e se da para chegar, e porta se abre.
   ============================================================ */
function mundoDoMotor(){
  return {pisosSob: pisosSob, chaoSob: groundUnder,
          bate: function(x, y, r, z, h){ return blocked(x, y, r, z, h, true); },
          temPeca: function(x, y, r){ let achou = false; cadaSolido(SOLIDOS, x, y, r, function(){ achou = true; }); return achou; },
          raio: 0.26, altura: 0.55, alturaEmPe: 0.85, degrau: STEP};
}
/* roda fn com todas as portas abertas, e fecha de volta: as do terreno e as
   que sao peca (a porta, a janela e a grade fechadas nao contam) */
function comPortasAbertas(fn){
  const antes = [], pecas = PORTAS_DAS_PECAS.abertas;
  doors.forEach(function(d){ antes.push(d, d.open); d.open = 1; });
  PORTAS_DAS_PECAS.abertas = true;
  try { return fn(); }
  finally {
    for (let i = 0; i < antes.length; i += 2) antes[i].open = antes[i + 1];
    PORTAS_DAS_PECAS.abertas = pecas;
  }
}
/* andar agachado e a 2,0 tiles por segundo, em pe a 4,7 (p5.js) */
const VEL_EM_PE = 4.7, VEL_AGACHADO = 2.0;

/* ---------- a regua ----------
   A busca vai na direcao do alvo e so acha os pisos dos pontos por onde
   passa (buscarCaminho, em src/andar.js). Anda aos poucos, como a camada de
   alcance: um caminho longo, ou um que nao existe -- que obriga a abrir
   tudo o que se alcanca --, nao trava a tela. Clique na agua ou na parede
   mede do ponto em pe mais perto. */
const REGUA = {estado: "nenhum", trabalho: null, abertos: 0, reta: null, vel: 100, resultado: null};
function comecarRegua(m, x0, y0, x1, y1, vel){
  REGUA.estado = "medindo"; REGUA.abertos = 0; REGUA.vel = vel || 100; REGUA.resultado = null;
  REGUA.reta = Math.hypot(x1 - x0, y1 - y0);
  REGUA.trabalho = buscarCaminhoAosPoucos(mundoDoMotor(), m.larg, m.alt,
    {x: x0 + 0.5, y: y0 + 0.5, z: alturaDoChao(x0 + 0.5, y0 + 0.5)}, {x: x1 + 0.5, y: y1 + 0.5});
}
/* um pedaco da medida; devolve o resultado quando termina */
function passoDaRegua(orcamentoMs){
  if (REGUA.estado !== "medindo") return null;
  const fim = performance.now() + (orcamentoMs || 20);
  const r = comPortasAbertas(function(){
    let passo;
    do { passo = REGUA.trabalho.next(); if (!passo.done) REGUA.abertos = passo.value; }
    while (!passo.done && performance.now() < fim);
    return passo;
  });
  if (!r.done) return null;
  REGUA.estado = "pronta"; REGUA.trabalho = null;
  REGUA.resultado = resumirCaminho(r.value, REGUA.vel);
  return REGUA.resultado;
}
function resumirCaminho(r, vel){
  if (!r.chega) return r;
  const ritmo = (vel || 100)/100, c = r.caminho;
  let agachado = 0, subiu = 0;
  for (let i = 1; i < c.length; i++){
    const passo = Math.hypot(c[i].x - c[i - 1].x, c[i].y - c[i - 1].y);
    if (c[i].agachado) agachado += passo;
    if (c[i].z > c[i - 1].z) subiu += c[i].z - c[i - 1].z;
  }
  const tiles = r.tiles;
  return {chega: true, caminho: c, tiles: tiles, agachado: agachado, subiu: subiu, abertos: r.abertos,
          segundos: (tiles - agachado)/(VEL_EM_PE*ritmo) + agachado/(VEL_AGACHADO*ritmo)};
}
/* de uma vez, para o teste e para a linha de comando */
function medirAndando(m, x0, y0, x1, y1, vel){
  return comPortasAbertas(function(){
    return resumirCaminho(buscarCaminho(mundoDoMotor(), m.larg, m.alt,
      {x: x0 + 0.5, y: y0 + 0.5, z: alturaDoChao(x0 + 0.5, y0 + 0.5)}, {x: x1 + 0.5, y: y1 + 0.5}), vel);
  });
}
function textoDaRegua(){
  const R = REGUA, reta = R.reta === null ? "" : R.reta.toFixed(1) + " tiles em linha reta";
  if (R.estado === "medindo") return "regua: " + reta + "; medindo o caminho andando (" + R.abertos + " pontos)";
  const r = R.resultado;
  if (!r) return "";
  if (!r.chega) return "regua: " + reta + "; " + r.porque;
  return "regua: " + reta + "; andando, " + r.tiles.toFixed(1) + " tiles (" + (r.tiles*METROS_POR_TILE).toFixed(0) +
    " m) em " + r.segundos.toFixed(1) + " s" + (r.subiu > 0.01 ? ", subindo " + (r.subiu/0.25).toFixed(0) + " degraus" : "") +
    (r.agachado ? ", " + r.agachado.toFixed(1) + " tiles agachado" : "");
}

/* ---------- a camada de alcance ----------
   A ilha de 650 leva uns 6 s entre montar a grade e percorrer, entao o
   calculo anda aos poucos, uns 20 ms por quadro, e a barra de cima mostra
   quanto falta. Mexer no mapa deixa a camada velha; L refaz. */
const ALCANCE = {estado: "nenhum", trabalho: null, fase: "", progresso: 0, img: null, mapa: null, nome: "",
                 de: null, alcancados: 0, pisos: 0, fora: 0, problemas: null};
/* `nome` e o do mapa no jogo: vai nos problemas que o alcance acha */
function comecarAlcance(m, nome){
  const jog = m.coisas.find(function(c){ return c.tipo === "jogador"; });
  const de = jog ? {x: jog.x + 0.5, y: jog.y + 0.5} : {x: P.x, y: P.y};
  ALCANCE.estado = "calculando"; ALCANCE.mapa = m; ALCANCE.de = de; ALCANCE.progresso = 0;
  ALCANCE.nome = nome || ""; ALCANCE.problemas = null;
  ALCANCE.trabalho = (function*(){
    const mundo = mundoDoMotor();
    ALCANCE.fase = "montando a grade";
    const it = montarGradeAosPoucos(mundo, m.larg, m.alt);
    let r = it.next();
    while (!r.done){ ALCANCE.progresso = r.value*0.55; yield; r = it.next(); }
    const g = r.value;
    const tx = Math.floor(de.x), ty = Math.floor(de.y);
    const k = estadoDaGrade(g, de.x, de.y, alturaDoChao(tx + 0.5, ty + 0.5), STEP);
    ALCANCE.fase = "andando";
    const it2 = percorrerAosPoucos(g, mundo, k);
    let r2 = it2.next();
    while (!r2.done){ ALCANCE.progresso = 0.55 + r2.value*0.35; yield; r2 = it2.next(); }
    ALCANCE.fase = "conferindo os marcos e o ch\u00e3o";
    const it3 = problemasDoAlcanceAosPoucos(m, ALCANCE.nome, g, r2.value);
    let r3 = it3.next();
    while (!r3.done){ ALCANCE.progresso = 0.9 + r3.value*0.1; yield; r3 = it3.next(); }
    return {g: g, andou: r2.value, problemas: r3.value};
  })();
}
/* um pedaco do calculo, dentro do orcamento; chamado pelo laco */
function passoDoAlcance(orcamentoMs){
  if (ALCANCE.estado !== "calculando") return;
  const fim = performance.now() + (orcamentoMs || 20);
  const r = comPortasAbertas(function(){
    let passo;
    do { passo = ALCANCE.trabalho.next(); } while (!passo.done && performance.now() < fim);
    return passo;
  });
  if (r.done){
    ALCANCE.problemas = r.value.problemas;
    terminarAlcance(r.value.g, r.value.andou, r.value.problemas.ilhado);
    ALCANCE.trabalho = null;
  }
}
/* Vermelho e o chao ilhado que a lista de problemas conta
   (problemasDoAlcance): na altura do terreno, fora da rocha, onde se fica em
   pe e nao se chega. O alto da rocha e o telhado ficam de fora -- ninguem
   espera chegar la, e pintados so escondiam o que importa. */
function terminarAlcance(g, andou, ilhado){
  const m = ALCANCE.mapa, W = m.larg, H = m.alt;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const cx = c.getContext("2d"), img = cx.createImageData(W, H), px = img.data;
  let fora = 0;
  for (let i = 0; i < W*H; i++){
    if (!ilhado[i]) continue;
    px[4*i] = 235; px[4*i + 1] = 40; px[4*i + 2] = 30; px[4*i + 3] = 150;
    fora++;
  }
  cx.putImageData(img, 0, 0);
  ALCANCE.img = c; ALCANCE.estado = "pronto";
  ALCANCE.alcancados = andou.alcancados; ALCANCE.pisos = g.total; ALCANCE.fora = fora;
}
/* o mapa mudou: o que foi calculado continua na tela, mas marcado velho */
function envelhecerAlcance(){
  if (ALCANCE.estado === "pronto") ALCANCE.estado = "velho";
  else if (ALCANCE.estado === "calculando"){ ALCANCE.estado = "nenhum"; ALCANCE.trabalho = null; }
}
/* ---------- o alcance como problema ----------
   Com a grade e o passeio prontos, o que o jogador nao alcanca vira
   problema na lista da validacao (validacao.js):

   - o MARCO longe de todo piso alcancado, na altura dele (o campo z, ou o
     chao do tile): o morador, a entrada, o bau, a alavanca, o ponto de
     volta sao erro -- sem eles o jogo emperra --; placa, porta,
     ninho, gatilho, aviso. Luz, som, armadilha e o navio -- que ainda nao
     tem regra, e mora no mar -- nao pedem que se chegue;
   - o CHAO, na altura do terreno, onde se fica em pe e nao se chega: o
     plato sem rampa, a casa sem porta, a margem sem ponte. Telhado e topo
     de rocha nao contam -- ninguem espera chegar la. Um problema so, com os
     pedacos do maior para o menor;
   - a ESCADA cujo alto nao tem onde ficar em pe, ou a que se alcanca pelo
     pe e nao se sobe. */
const ALCANCE_DO_MARCO = {respawn: "erro", npc: "erro", entrada: "erro", saida: "erro", bau: "erro", alavanca: "erro",
                          placa: "aviso", porta: "aviso", ninho: "aviso", gatilho: "aviso",
                          segredo: "aviso", grade: "aviso"};
const PEDACO_ILHADO_MIN = 6;              // pedaco de chao menor que isso e dobra de terreno, nao lugar
/* Perto de (x, y), na altura z: 2 se algum piso ali foi alcancado, 1 se ha
   piso e nenhum alcancado, 0 se nem piso ha. Com `olhar`, o piso de longe
   so conta se enxerga o ponto na altura do peito (los3, a do motor): o
   morador a um tile da parede nao se alcanca de fora dela. O ultimo terco
   de tile nao se olha -- o marco pode estar em cima de uma peca, o bau no
   bau. */
function alcancaPerto(g, andou, x, y, z, raio, folgaZ, olhar){
  let ha = 0;
  const i0 = Math.ceil((x - raio)/ANDAR_LADO), i1 = Math.floor((x + raio)/ANDAR_LADO);
  const j0 = Math.ceil((y - raio)/ANDAR_LADO), j1 = Math.floor((y + raio)/ANDAR_LADO);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){
    if (Math.hypot(i*ANDAR_LADO - x, j*ANDAR_LADO - y) > raio + 1e-9) continue;
    const pi = i - g.i0, pj = j - g.j0;
    if (pi < 0 || pj < 0 || pi >= g.nx || pj >= g.ny) continue;
    const p = pj*g.nx + pi;
    for (let k = g.inicio[p]; k < g.inicio[p + 1]; k++){
      if (Math.abs(g.pisos[k] - z) > folgaZ) continue;
      if (olhar){
        const l = lugarDoEstado(g, k, p), d = Math.hypot(x - l.x, y - l.y);
        if (d > 0.35){
          const t = (d - 0.35)/d;
          if (!los3(l.x, l.y, g.pisos[k] + 0.5, l.x + (x - l.x)*t, l.y + (y - l.y)*t, z + 0.5)) continue;
        }
      }
      if (andou.passos[k] >= 0) return 2;
      ha = 1;
    }
  }
  return ha;
}
function problemasDoAlcance(m, nome, g, andou){
  return comPortasAbertas(function(){ return ateOFim(problemasDoAlcanceAosPoucos(m, nome, g, andou)); });
}
function* problemasDoAlcanceAosPoucos(m, nome, g, andou){
  const out = [], W = m.larg, H = m.alt;
  const diga = function(nivel, x, y, msg, extra){ out.push(Object.assign({nivel: nivel, mapa: nome, x: x, y: y, msg: msg}, extra)); };
  /* sem estado de partida nada se alcanca: um erro so, e nao o mapa
     inteiro acusado */
  const jog = m.coisas.find(function(c){ return c.tipo === "jogador"; });
  if (!andou.alcancados){
    if (jog) diga("erro", jog.x, jog.y, "o in\u00edcio do jogador fica onde n\u00e3o se fica em p\u00e9: dali n\u00e3o se anda");
    out.ilhado = new Uint8Array(W*H);
    return out;
  }
  for (const c of m.coisas){
    const nivel = ALCANCE_DO_MARCO[c.tipo];
    if (!nivel) continue;
    const z = c.campos && c.campos.z !== undefined && c.campos.z !== "" ? Number(c.campos.z) : alturaDoChao(c.x + 0.5, c.y + 0.5);
    if (alcancaPerto(g, andou, c.x + 0.5, c.y + 0.5, z, 1.3, 0.9, true) === 2) continue;
    const def = COISA_POR_ID[c.tipo];
    diga(nivel, c.x, c.y, (def ? def.nome : c.tipo) + (c.texto ? " " + c.texto : "") + ": n\u00e3o se chega andando do in\u00edcio", {z: z});
  }
  /* o chao ilhado: tile de terreno (nao rocha) com piso na altura dele e
     nenhum alcancado; os pedacos por vizinhanca */
  const ilhado = new Uint8Array(W*H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++){
    const i = ty*W + tx;
    if (TERRENOS[m.terreno[i]].tipo === "parede") continue;
    if (alcancaPerto(g, andou, tx + 0.5, ty + 0.5, alturaDoChao(tx + 0.5, ty + 0.5), 0.01, 0.3) === 1) ilhado[i] = 1;
    if (tx === W - 1 && (ty & 31) === 31) yield ty/H;
  }
  const pedacos = [], visto = new Uint8Array(W*H), fila = [];
  for (let i0 = 0; i0 < W*H; i0++){
    if (!ilhado[i0] || visto[i0]) continue;
    let n = 0, sx = 0, sy = 0;
    const membros = [];
    visto[i0] = 1; fila.length = 0; fila.push(i0);
    while (fila.length){
      const i = fila.pop(), x = i % W, y = (i / W) | 0;
      n++; sx += x; sy += y; membros.push(i);
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const xx = x + d[0], yy = y + d[1];
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy*W + xx;
        if (ilhado[j] && !visto[j]){ visto[j] = 1; fila.push(j); }
      }
    }
    if (n < PEDACO_ILHADO_MIN) continue;
    /* o lugar do pedaco: o tile dele mais perto do meio */
    const mx = sx/n, my = sy/n;
    let melhor = membros[0], dm = Infinity;
    for (const i of membros){ const d = Math.hypot(i % W - mx, ((i / W) | 0) - my); if (d < dm){ dm = d; melhor = i; } }
    pedacos.push({x: melhor % W, y: (melhor / W) | 0, tiles: n});
  }
  if (pedacos.length){
    pedacos.sort(function(a, b){ return b.tiles - a.tiles; });
    let total = 0;
    for (const p of pedacos) total += p.tiles;
    const p0 = pedacos[0];
    diga("aviso", p0.x, p0.y, (pedacos.length === 1 ? "um peda\u00e7o" : pedacos.length + " peda\u00e7os") +
      " de ch\u00e3o aonde n\u00e3o se chega andando do in\u00edcio (" + total + " tiles; o maior, " + p0.tiles + ")",
      {vezes: pedacos.length, lugares: pedacos.map(function(p){ return {x: p.x, y: p.y, tiles: p.tiles}; })});
  }
  out.ilhado = ilhado;                     // a camada vermelha pinta o mesmo
  /* a escada: o alto dela tem piso, e quem chega ao pe chega ao alto */
  const estilos = estilosDasConstrucoes(m);
  for (const p of m.pecas || []){
    const def = TIPOS_DE_PECA[p.tipo];
    if (!def || def.andar !== "sobe") continue;
    const s = pontasDaSubida(p, estiloDaPeca(p, estilos));
    if (!s) continue;
    /* o ponto de chegada, e nao o ultimo degrau: 0,36 alcanca o ponto da
       grade mais perto, e nada alem */
    const alto = alcancaPerto(g, andou, s.topo[0], s.topo[1], s.topo[2], 0.36, 0.3, true);
    const tx = Math.floor(p.x), ty = Math.floor(p.y), extra = {z: p.z, peca: p.id};
    if (alto === 0) diga("aviso", tx, ty, def.nome + " que sai onde n\u00e3o se fica em p\u00e9", extra);
    else if (alto === 1 && alcancaPerto(g, andou, s.pe[0], s.pe[1], s.pe[2], 1.0, 0.3, true) === 2)
      diga("aviso", tx, ty, def.nome + " que n\u00e3o se sobe: chega-se ao p\u00e9, e n\u00e3o ao alto", extra);
  }
  return out;
}

/* ---------- o custo do quadro ----------
   O rasterizador paga por face que chega nele e por pixel que ele visita
   -- o morro colado na camera enche a tela de pixel com poucas faces --, e
   nenhuma conta simples das duas acertou o tempo na bancada: o pixel
   recusado pelo z-buffer custa bem menos que o pintado. Entao o tempo e
   medido, neste computador, desenhando o quadro de verdade -- a validacao
   roda na maquina em que se joga.

   O pior lugar sai em tres passos. De cada pedaco, as faces dos pedacos a
   menos de FAR: os lugares onde ha mais para ver. Nos piores, o motor monta
   a lista de faces do quadro olhando para oito lados (buildGeometry, a
   mesma do jogo), sem desenhar -- e barato. Nas vistas com mais faces, o
   quadro e desenhado tres vezes e fica o tempo mais curto: o mais longo e
   o coletor de lixo, nao o lugar. A camera do canteiro volta para onde
   estava. O limite e o de 30 quadros por segundo. */
const LIMITE_DO_QUADRO_MS = 33;
const LUGARES_CONTADOS = 24, VISTAS_DESENHADAS = 8;
function* custoDoQuadroAosPoucos(m){
  /* todos os pedacos montados: a conta de cada um precisa das faces */
  let feitos = 0;
  for (const Pd of PEDACOS){
    if (Pd.sujo) montarPedaco(Pd);
    if ((++feitos & 7) === 0) yield 0.5*feitos/PEDACOS.length;
  }
  const W = m.larg;
  /* o lugar de cada pedaco onde se fica: o tile mais perto do meio que nao
     e agua funda nem rocha */
  const pisavel = function(tx, ty){
    const t = TERRENOS[m.terreno[ty*W + tx]];
    return t.tipo !== "parede" && t.id !== "funda";
  };
  const cands = [];
  for (const Pd of PEDACOS){
    const mx = (Pd.x0 + Pd.x1)/2, my = (Pd.y0 + Pd.y1)/2;
    let melhor = null, dm = Infinity;
    for (let ty = Pd.y0; ty < Pd.y1; ty++) for (let tx = Pd.x0; tx < Pd.x1; tx++){
      if (!pisavel(tx, ty)) continue;
      const d = Math.hypot(tx + 0.5 - mx, ty + 0.5 - my);
      if (d < dm){ dm = d; melhor = {x: tx, y: ty}; }
    }
    if (!melhor) continue;
    let soma = 0;
    for (const Q of PEDACOS) if (Math.hypot(Q.cx - melhor.x - 0.5, Q.cy - melhor.y - 0.5) <= FAR + Q.r) soma += Q.faces.length;
    cands.push({x: melhor.x, y: melhor.y, soma: soma});
  }
  yield 0.55;
  cands.sort(function(a, b){ return b.soma - a.soma; });
  /* as faces de cada vista, sem desenhar */
  const vistas = [], contados = cands.slice(0, LUGARES_CONTADOS);
  for (let n = 0; n < contados.length; n++){
    const c = contados[n], z = alturaDoChao(c.x + 0.5, c.y + 0.5) + P.eye;
    for (let a = 0; a < 8; a++){
      buildGeometry(c.x + 0.5, c.y + 0.5, Math.cos(a*Math.PI/4), Math.sin(a*Math.PI/4), TANH, z);
      vistas.push({x: c.x, y: c.y, graus: a*45, faces: quadCount});
    }
    if ((n & 3) === 3) yield 0.55 + 0.15*(n + 1)/contados.length;
  }
  vistas.sort(function(a, b){ return b.faces - a.faces; });
  /* O desenho de verdade mexe na camera: ela volta a cada vista, e nao so
     no fim -- entre um passo e outro, o canteiro desenha a vista dele. */
  const escala = 640*360/(RW*RVH), lista = vistas.slice(0, VISTAS_DESENHADAS);
  let pior = null;
  for (let n = 0; n < lista.length; n++){
    const v = lista[n];
    const antes = {x: P.x, y: P.y, z: P.z, ang: P.ang, pitch: P.pitch, bob: P.bob}, terceira = G.terceira;
    let ms = Infinity;
    try {
      G.terceira = false;
      P.x = v.x + 0.5; P.y = v.y + 0.5; P.z = alturaDoChao(v.x + 0.5, v.y + 0.5); P.ang = v.graus*Math.PI/180; P.pitch = 0; P.bob = 0;
      for (let r = 0; r < 3; r++){
        const t0 = performance.now();
        setCamera(0); renderWorld(); renderEntities();
        ms = Math.min(ms, performance.now() - t0);
      }
    } finally {
      Object.assign(P, antes); G.terceira = terceira;
    }
    const achado = {x: v.x, y: v.y, graus: v.graus, faces: quadCount, pixels: Math.round(PIX_VISTOS*escala), ms: ms};
    if (!pior || ms > pior.ms) pior = achado;
    yield 0.7 + 0.3*(n + 1)/lista.length;
  }
  return pior || {x: 0, y: 0, graus: 0, faces: 0, pixels: 0, ms: 0};
}
function custoDoQuadro(m){
  const it = custoDoQuadroAosPoucos(m);
  for (;;){ const r = it.next(); if (r.done) return r.value; }
}
function problemasDoQuadro(nome, pior){
  if (!pior || pior.ms <= LIMITE_DO_QUADRO_MS) return [];
  return [{nivel: "aviso", mapa: nome, x: pior.x, y: pior.y, graus: pior.graus,
           msg: "o quadro mais caro leva " + Math.round(pior.ms) + " ms neste computador, olhando a " + pior.graus + " graus (" +
                pior.faces + " faces, " + Math.round(pior.pixels/1000) + " mil pixels) -- o limite \u00e9 " + LIMITE_DO_QUADRO_MS + " ms"}];
}
function textoDoQuadro(pior){
  return pior ? "pior quadro: " + Math.round(pior.ms) + " ms em " + pior.x + ", " + pior.y + ", olhando a " + pior.graus + " graus (" +
                pior.faces + " faces, " + Math.round(pior.pixels/1000) + " mil pixels; limite " + LIMITE_DO_QUADRO_MS + " ms)" : "";
}

function textoDoAlcance(){
  if (ALCANCE.estado === "calculando") return "alcance: " + ALCANCE.fase + ", " + Math.round(ALCANCE.progresso*100) + "%";
  if (ALCANCE.estado === "pronto" || ALCANCE.estado === "velho")
    return "alcance" + (ALCANCE.estado === "velho" ? " (velho: L refaz)" : "") + ": " +
      ALCANCE.fora + " tiles de chao sem caminho do inicio do jogador";
  return "";
}
