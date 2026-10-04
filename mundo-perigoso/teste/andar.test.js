/* Testes da grade de andar.

   A grade diz onde se fica em pe e aonde se chega andando, e quem responde
   as perguntas de fisica e o motor montado -- o mesmo que move o jogador.
   Aqui ela e conferida contra casos que se sabe a resposta, contra todo tipo
   de peca que diz o que o corpo faz com ela, e contra o proprio jogador
   andando pelo caminho que ela acha.

   Uso: node mundo-perigoso/teste/andar.test.js [caminho-do-html] */
const path = require("path");
const M = require("../src/mapa.js");
const A = require("../src/andar.js");
const Pc = require("../src/pecas.js");
const Mo = require("../canteiro/modelo.js");
const Lo = require("../canteiro/lote.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D, frames } = carregar(arquivo, {busca: "?mapa=cripta"});
const T = M.TERRENO_POR_CHAR;
const Z = 1.0;                                    // altura 4, passo 0,25
const DEGRAU_DO_TESTE = 0.25;

/* as perguntas do motor, e o corpo do jogador */
const mundo = {
  pisosSob: D.pisosSob,
  chaoSob: D.groundUnder,
  bate: function(x, y, r, z, h){ return D.blocked(x, y, r, z, h, true); },
  temPeca: function(x, y, r){ let achou = false; D.cadaSolido(D.SOLIDOS, x, y, r, function(){ achou = true; }); return achou; },
  raio: 0.26, altura: 0.55, alturaEmPe: 0.85, degrau: 0.42
};
/* A porta fechada barra o corpo, mas a conta de quem alcanca o que passa
   por ela, que no jogo ela abre -- a validacao conta assim
   (comPortasAbertas, no canteiro), e a grade daqui tambem. */
D.PORTAS_DAS_PECAS.abertas = true;
function plano(larg, alt){
  const m = M.novoMapa(larg || 24, alt || 24, {nome: "andar", terreno: T[","], altura: 4});
  m.coisas.push({x: 2, y: 2, tipo: "jogador", texto: ""});
  return m;
}
function abrir(m){
  D.trocarMundo("?mapa=andar", m);
  return A.montarGradeDeAndar(mundo, m.larg, m.alt);
}
/* de (x, y, z) se chega a (x2, y2, z2)? */
function chega(g, de, ate){
  const k = A.estadoDaGrade(g, de[0], de[1], de[2], 0.42);
  const alvo = A.estadoDaGrade(g, ate[0], ate[1], ate[2], 0.05);
  if (k < 0 || alvo < 0) return false;
  return A.percorrerGrade(g, mundo, k).passos[alvo] >= 0;
}

/* ---------- o plano ---------- */
{
  const g = abrir(plano());
  let um = 0, pontos = g.nx*g.ny;
  for (let p = 0; p < pontos; p++) if (g.inicio[p + 1] - g.inicio[p] === 1 && g.pisos[g.inicio[p]] === Z) um++;
  check("no plano todo ponto tem um piso so, o chao", um === pontos, um + " de " + pontos);
  const k = A.estadoDaGrade(g, 12, 12, Z, 0.42);
  check("no plano se chega a todo lugar", A.percorrerGrade(g, mundo, k).alcancados === g.total);
  check("o ponto fica no meio e no canto do tile", A.pontoDaGrade(g, 12.5, 12) >= 0 && A.pontoDaGrade(g, 12, 12) >= 0 &&
    A.ondeFica(g, A.pontoDaGrade(g, 12.5, 12)).x === 12.5);
}

/* ---------- o terreno ---------- */
{
  const m = plano();
  for (let y = 0; y < 24; y++) for (let x = 12; x < 24; x++) m.altura[y*24 + x] = 5;
  check("um degrau de terreno (0,25) se sobe andando", chega(abrir(m), [4, 4, Z], [18, 4, Z + 0.25]));
  const m2 = plano();
  for (let y = 0; y < 24; y++) for (let x = 12; x < 24; x++) m2.altura[y*24 + x] = 6;
  const g2 = abrir(m2);
  check("dois degraus (0,5) passam do que se sobe", !chega(g2, [4, 18, Z], [18, 18, Z + 0.5]));
  check("mas de cima se desce", chega(g2, [18, 18, Z + 0.5], [4, 18, Z]));
}
{
  const m = plano();
  /* um corredor de um tile entre rochas */
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++)
    if (y !== 12 && x >= 8 && x < 16) m.terreno[y*24 + x] = T["^"];
  const g = abrir(m);
  check("o corredor de um tile passa pelo meio", chega(g, [4, 12.5, Z], [20, 12.5, Z]));
  const m2 = plano();
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++)
    if (x >= 8 && x < 16) m2.terreno[y*24 + x] = y === 12 ? T["~"] : T["^"];
  const g2 = abrir(m2);
  check("agua funda nao se anda", !chega(g2, [4, 12.5, Z], [20, 12.5, Z]));
}

/* ---------- cada tipo de peca que diz o que o corpo faz ---------- */
function comPecas(pecas){
  const m = plano();
  m.pecas = pecas.map(function(p){ return Object.assign({estilo: "madeira-pescador", construcao: 1, giro: 0, espelho: 0}, p); });
  return m;
}
/* Uma sala fechada por paredes, com a peca `tipo` no meio do lado sul. A
   sala cresce com a peca: o portao da fortaleza tem dois tiles, a grade um
   e um quarto -- o resto da parede sul completa com parede do tamanho que
   sobra. */
function sala(tipo){
  const def = Pc.TIPOS_DE_PECA[tipo], e = Pc.medidasDaPeca(def, "madeira-pescador");
  const L = Pc.tamanhoDoTipo(def, e)[0], W = Math.max(3, Math.ceil(L) + 2), ps = [];
  for (let i = 0; i < W; i++) ps.push({tipo: "parede", x: 10 + i, y: 10, z: Z});
  for (let j = 0; j < 3; j++){
    ps.push({tipo: "parede", x: 10, y: 10 + j, z: Z, giro: 90});
    ps.push({tipo: "parede", x: 10 + W, y: 10 + j, z: Z, giro: 90});
  }
  ps.push({tipo: "parede", x: 10, y: 13, z: Z});
  ps.push({tipo: tipo, x: 11, y: 13, z: Z});
  const resto = 10 + W - (11 + L);
  if (resto > 1e-6) ps.push({tipo: "parede", x: 11 + L, y: 13, z: Z, forma: {larg: resto}});
  return ps;
}
/* o topo mais alto da peca sob um ponto, pela geometria dela */
function topoSob(g, x, y){
  let alto = -Infinity;
  for (const s of g.solidos){
    let dentro = true;
    for (let i = 0; i < s.pts.length; i++){
      const p = s.pts[i], q = s.pts[(i + 1) % s.pts.length];
      if ((q[0] - p[0])*(y - p[1]) - (q[1] - p[1])*(x - p[0]) < -1e-9){ dentro = false; break; }
    }
    if (dentro) alto = Math.max(alto, s.topo ? s.topo.a + s.topo.b*x + s.topo.c*y : s.z1);
  }
  return alto;
}
const tipos = Object.keys(Pc.TIPOS_DE_PECA).filter(function(t){ return Pc.TIPOS_DE_PECA[t].andar; });
check("ha tipos que dizem o que o corpo faz com eles", tipos.length >= 15, tipos.length + ": " + tipos.join(", "));
{
  const g = abrir(comPecas(sala("parede")));
  check("a sala fechada de parede nao se entra", !chega(g, [4, 4, Z], [11.5, 11.5, Z]));
  /* a mesma sala num quarto de tile: a porta cai entre dois pontos da grade,
     e o ponto procura em volta o lugar onde o corpo cabe */
  for (const d of [0.25, 0.125]){
    const torta = sala("parede-porta").map(function(p){ return Object.assign({}, p, {x: p.x + d, y: p.y + d}); });
    check("a porta posta a " + d + " tile da grade ainda se passa", chega(abrir(comPecas(torta)), [4, 4, Z], [11.5 + d, 11.5 + d, Z]));
  }
  /* e o jogador passa por ela andando, pela raia que a grade achou */
  const torta = sala("parede-porta").map(function(p){ return Object.assign({}, p, {x: p.x + 0.25, y: p.y + 0.25}); });
  percorrerAndando("a porta num quarto de tile", comPecas(torta), [4, 4, Z], [11.75, 11.75, Z]);
}
/* fora da conta, a porta fechada e parede; aberta (o campo aberta=1), e
   vao -- e a janela aberta continua sendo parede da cintura para baixo */
{
  D.PORTAS_DAS_PECAS.abertas = false;
  const abertas = function(ps){ return ps.map(function(p){ return Pc.TIPOS_DE_PECA[p.tipo].abre ? Object.assign({}, p, {campos: {aberta: "1"}}) : p; }); };
  check("a porta fechada barra o corpo", !chega(abrir(comPecas(sala("parede-porta"))), [4, 4, Z], [11.5, 11.5, Z]));
  check("aberta, deixa passar", chega(abrir(comPecas(abertas(sala("parede-porta")))), [4, 4, Z], [11.5, 11.5, Z]));
  check("o portao de cerca, igual", !chega(abrir(comPecas(sala("portao-cerca"))), [4, 4, Z], [11.5, 11.5, Z]) &&
    chega(abrir(comPecas(abertas(sala("portao-cerca")))), [4, 4, Z], [11.5, 11.5, Z]));
  check("a janela aberta nao vira porta", !chega(abrir(comPecas(abertas(sala("parede-janela")))), [4, 4, Z], [11.5, 11.5, Z]));
  D.PORTAS_DAS_PECAS.abertas = true;
}
for (const t of tipos){
  const def = Pc.TIPOS_DE_PECA[t], a = def.andar, e = Pc.medidasDaPeca(def, "madeira-pescador");
  if (a === "barra" || a === "passa"){
    const g = abrir(comPecas(sala(t)));
    const entra = chega(g, [4, 4, Z], [11.5, 11.5, Z]);
    check(t + ": " + (a === "passa" ? "entra-se na sala por ela" : "no lugar da parede, a sala continua fechada"),
      a === "passa" ? entra : !entra);
  } else if (a === "obstaculo"){
    const tam = Pc.tamanhoDoTipo(def, e);
    const g = abrir(comPecas([{tipo: t, x: 10, y: 10, z: Z}]));
    check(t + ": de fora nao se chega ao meio dela", !chega(g, [4, 4, Z], [10 + tam[0]/2, 10 + tam[1]/2, Z]));
  } else if (a === "sobe"){
    /* a peca em (10, 10); onde ela diz que se sai la em cima, uma laje na
       altura do alto dela */
    const geo = Pc.geometriaDaPeca({tipo: t, estilo: "madeira-pescador", x: 10, y: 10, z: Z, giro: 0});
    const encTopo = geo.encaixes.find(function(k){ return k.tipo === "topo"; });
    const alto = encTopo ? encTopo.em[2] : geo.solidos.reduce(function(m, s){ return Math.max(m, s.z1); }, 0);
    const sai = def.saida(e), lx = 10 + sai[0] - 0.5, ly = 10 + sai[1] - 0.5;
    const laje = [{tipo: "laje", x: lx, y: ly, z: alto}];
    const topo = [lx + 0.5, ly + 0.5, alto];
    /* cada grade e percorrida com o mundo dela aberto: a fisica e a do mundo
       de agora */
    const semChega = chega(abrir(comPecas(laje)), [4, 4, Z], topo);
    const comChega = chega(abrir(comPecas([{tipo: t, x: 10, y: 10, z: Z}].concat(laje))), [4, 4, Z], topo);
    check(t + ": leva do chao ao alto (" + (alto - Z).toFixed(2) + " acima), e sem ela nao se chega",
      !semChega && comChega, "sem ela " + (semChega ? "chega" : "nao chega") + ", com ela " + (comChega ? "chega" : "nao chega"));
  } else if (a === "pisa"){
    /* posta de modo que o topo fique um degrau acima do chao, e pisada no
       meio dela */
    const tam = Pc.tamanhoDoTipo(def, e), cx = tam[0]/2, cy = tam[1]/2;
    const g0 = Pc.geometriaDaPeca({tipo: t, estilo: "madeira-pescador", x: 0, y: 0, z: 0, giro: 0});
    const z = Z + DEGRAU_DO_TESTE - topoSob(g0, cx, cy), alvo = [10 + cx, 10 + cy, Z + DEGRAU_DO_TESTE];
    const g = abrir(comPecas([{tipo: t, x: 10, y: 10, z: z}]));
    const k = A.estadoDaGrade(g, alvo[0], alvo[1], alvo[2], 0.05);
    check(t + ": fica-se em pe em cima, e se chega nele do chao",
      k >= 0 && Math.abs(g.pisos[k] - alvo[2]) < 1e-3 && chega(g, [4, 4, Z], alvo),
      k >= 0 ? "piso " + g.pisos[k] : "sem piso em " + alvo.join(","));
  }
}

/* ---------- a casa de dois andares ---------- */
{
  /* a porta no meio da parede sul; a escada encostada na parede norte,
     subindo para leste, e a laje com o vao em cima da fileira inteira da
     escada -- com o vao so em cima do alto, a cabeca bate na beira da laje
     no meio da subida, e a grade diz isso tambem (abaixo) */
  const ps = sala("parede-porta");
  for (let j = 1; j < 3; j++) for (let i = 0; i < 3; i++) ps.push({tipo: "laje", x: 10 + i, y: 10 + j, z: Z + Pc.ANDAR});
  const semEscada = abrir(comPecas(ps));
  const p = A.pontoDaGrade(semEscada, 10.5, 12.5);
  check("dentro de casa, o ponto tem dois pisos: o chao e a laje",
    semEscada.inicio[p + 1] - semEscada.inicio[p] === 2, (semEscada.inicio[p + 1] - semEscada.inicio[p]) + " pisos");
  check("sem escada, o andar de cima nao se alcanca", !chega(semEscada, [4, 4, Z], [10.5, 12.5, Z + Pc.ANDAR]));
  ps.push({tipo: "escada", x: 10.5, y: 10, z: Z});
  const g = abrir(comPecas(ps));
  check("com a escada, se chega ao andar de cima entrando pela porta", chega(g, [4, 4, Z], [10.5, 12.5, Z + Pc.ANDAR]));
  /* a mesma casa com a escada encostada na porta: o degrau do lado barra a
     entrada, e a grade diz -- era assim a casa do primeiro teste */
  const errada = sala("parede-porta").concat([{tipo: "escada", x: 10.5, y: 12, z: Z}]);
  check("escada encostada na porta tranca a casa", !chega(abrir(comPecas(errada)), [4, 4, Z], [10.5, 11, Z]));
  /* laje em cima do comeco da escada: o jogador agacha e sobe, e a grade
     marca onde foi agachado */
  const baixa = abrir(comPecas(ps.concat([{tipo: "laje", x: 10, y: 10, z: Z + Pc.ANDAR}])));
  const kb = A.estadoDaGrade(baixa, 4, 4, Z, 0.42), ab = A.estadoDaGrade(baixa, 10.5, 12.5, Z + Pc.ANDAR, 0.05);
  const pb = A.percorrerGrade(baixa, mundo, kb);
  const agachado = pb.passos[ab] >= 0 && A.caminhoAte(baixa, pb, ab, mundo).some(function(c){ return c.agachado; });
  check("laje em cima do comeco da escada: sobe-se, mas agachado, e a grade marca onde", agachado);
  /* a sala toda coberta a 0,7 do chao: nem agachado se entra */
  const toca = sala("parede-porta");
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) toca.push({tipo: "laje", x: 10 + i, y: 10 + j, z: Z + 0.5});
  check("teto mais baixo que o corpo agachado nao se passa", !chega(abrir(comPecas(toca)), [4, 4, Z], [11.5, 11.5, Z]));

  /* o jogador anda o caminho que a grade achou, com a fisica do jogo --
     nas duas casas, a de vao certo e a da laje baixa, onde ele agacha */
  percorrerAndando("a casa de dois andares", comPecas(ps), [4, 4, Z], [10.5, 12.5, Z + Pc.ANDAR]);
  percorrerAndando("a casa da laje baixa", comPecas(ps.concat([{tipo: "laje", x: 10, y: 10, z: Z + Pc.ANDAR}])),
    [4, 4, Z], [10.5, 12.5, Z + Pc.ANDAR]);
}

/* ---------- a regua: o caminho de um ponto a outro ---------- */
{
  /* um rio de agua funda com uma ponte de lajes: o caminho passa pela ponte */
  const m = plano(40, 24);
  for (let y = 0; y < 24; y++) for (let x = 18; x < 22; x++) m.terreno[y*40 + x] = T["~"];
  m.pecas = [];
  for (let i = 0; i < 6; i++) m.pecas.push({tipo: "laje", x: 17 + i, y: 3, z: Z + 0.25, giro: 0, espelho: 0, construcao: 1});
  D.trocarMundo("?mapa=andar", m);
  const r = A.buscarCaminho(mundo, 40, 24, {x: 5.5, y: 20.5, z: Z}, {x: 34.5, y: 20.5});
  check("a regua acha o caminho pela ponte", r.chega && r.emCruz.some(function(c){ return c.y < 4.5 && c.x > 18 && c.x < 22; }),
    r.chega ? r.caminho.length + " pontos" : r.porque);
  /* o caminho mais curto: o mesmo tamanho que a grade inteira percorrida da */
  const g = A.montarGradeDeAndar(mundo, 40, 24);
  const k = A.estadoDaGrade(g, 5.5, 20.5, Z, 0.42), alvo = A.estadoDaGrade(g, 34.5, 20.5, Z, 0.42);
  const bfs = A.percorrerGrade(g, mundo, k).passos[alvo];
  /* com diagonal ele nunca e mais longo que o de cruz da grade inteira, e
     nunca mais curto que a linha reta */
  check("o caminho esticado e feito de retas que o corpo anda de verdade",
    r.chega && r.caminho.every(function(c, i){ return i === 0 || A.andaReto(mundo, r.caminho[i - 1], c, c.agachado ? 0.55 : 0.85); }));
  check("e ele e curto: nao passa do caminho em cruz da grade inteira, nem fica abaixo da reta",
    r.chega && r.tiles <= bfs*0.5 + 1e-6 && r.tiles >= Math.hypot(34.5 - 5.5, 0) - 1e-6,
    (r.chega ? r.tiles.toFixed(2) : "-") + " tiles contra " + (bfs*0.5) + " em cruz");
  const reto = A.buscarCaminho(mundo, 40, 24, {x: 3.5, y: 12.5, z: Z}, {x: 13.5, y: 22.5});
  check("em campo aberto, na diagonal, a regua mede a reta", reto.chega && Math.abs(reto.tiles - Math.hypot(10, 10)) < 0.05,
    reto.chega ? reto.tiles.toFixed(2) + " contra " + Math.hypot(10, 10).toFixed(2) : reto.porque);
  check("e a busca so abre uma parte dos pontos", r.abertos < g.total, r.abertos + " abertos de " + g.total);
  const agua = A.buscarCaminho(mundo, 40, 24, {x: 5.5, y: 20.5, z: Z}, {x: 20.5, y: 12.5});
  check("mirar no meio do rio mede ate a margem mais perto, nao ate a agua",
    agua.chega && Math.abs(agua.caminho[agua.caminho.length - 1].x - 20.5) <= 3,
    agua.chega ? JSON.stringify(agua.caminho[agua.caminho.length - 1]) : agua.porque);
  /* e o jogador atravessa a ponte andando: agua funda so barra quem esta na
     altura dela -- antes barrava em qualquer altura, e nenhuma ponte servia */
  percorrerAndando("a ponte sobre o rio", m, [15, 3.5, Z], [25, 3.5, Z]);
  m.pecas = [];
  D.trocarMundo("?mapa=andar", m);
  const sem = A.buscarCaminho(mundo, 40, 24, {x: 5.5, y: 20.5, z: Z}, {x: 34.5, y: 20.5});
  check("sem a ponte, a regua diz que nao se chega", !sem.chega && /nao se chega/.test(sem.porque), sem.porque);
}

/* ---------- o lote: a casa gerada funciona ---------- */
for (const estilo of ["madeira-pescador", "pedra-vila", "fortaleza-humana"]){
  const casa = Lo.gerarCasa({larg: 4, fundo: 4, andares: 2, estilo: estilo});
  const A = Pc.ESTILOS[estilo].forma.alto, porta = Math.floor((4 - 1)/2);
  const m = plano();
  Mo.porModelo(m, casa, 8, 8, Z);
  const g = abrir(m);
  /* o terreo tem piso, meio degrau acima do chao */
  const dentro = [9.5, 10.5, Z + Pc.DEGRAU/2], cima = [10.5, 10.5, Z + A], sacada = [8 + porta + 0.5, 12.5, Z + A];
  check("a casa gerada em " + estilo + ": entra-se pela porta, sobe-se a escada e sai-se na sacada",
    chega(g, [4, 4, Z], dentro) && chega(g, [4, 4, Z], cima) && chega(g, [4, 4, Z], sacada),
    "dentro " + chega(g, [4, 4, Z], dentro) + ", em cima " + chega(g, [4, 4, Z], cima) + ", na sacada " + chega(g, [4, 4, Z], sacada));
}
{
  const m = plano();
  Mo.porModelo(m, Lo.gerarCasa({larg: 5, fundo: 6, andares: 2, estilo: "pedra-vila"}), 8, 8, Z);
  percorrerAndando("a casa do lote, da rua ate a sacada", m, [4, 4, Z], [8 + 2 + 0.5, 14.5, Z + Pc.ANDAR]);
}

/* Anda com o jogador, pela fisica do jogo, de ponto em ponto do caminho que
   a grade achou -- agachando no passo que ela diz que so da agachado. */
function percorrerAndando(nome, mapa, de, ate){
  const g = abrir(mapa);
  const k = A.estadoDaGrade(g, de[0], de[1], de[2], 0.42), alvo = A.estadoDaGrade(g, ate[0], ate[1], ate[2], 0.05);
  if (k < 0 || alvo < 0){ check(nome + ": saida e chegada ficam em pe", false, "estados " + k + ", " + alvo); return; }
  const caminho = A.caminhoAte(g, A.percorrerGrade(g, mundo, k), alvo, mundo);
  D.G.mode = "play"; D.P.god = true; D.P.noclip = false;
  D.P.x = caminho[0].x; D.P.y = caminho[0].y; D.P.z = caminho[0].z; D.P.vx = D.P.vy = D.P.vz = 0;
  frames(2);
  let preso = null;
  for (let i = 1; i < caminho.length && !preso; i++){
    const c = caminho[i];
    D.keys["c"] = c.agachado;
    for (let n = 0; n < 40; n++){
      const dx = c.x - D.P.x, dy = c.y - D.P.y;
      if (dx*dx + dy*dy < 0.12*0.12) break;
      D.P.ang = Math.atan2(dy, dx); D.P.pitch = 0;
      D.keys["w"] = true;
      frames(1);
    }
    D.keys["w"] = false; D.keys["c"] = false;
    if (Math.hypot(c.x - D.P.x, c.y - D.P.y) > 0.3)
      preso = "preso perto de " + c.x + ", " + c.y + " (esta em " + D.P.x.toFixed(2) + ", " + D.P.y.toFixed(2) + ")";
  }
  frames(10);
  const agachou = caminho.filter(function(c){ return c.agachado; }).length;
  check(nome + ": o jogador anda o caminho da grade e chega onde ela disse",
    !preso && Math.abs(D.P.z - ate[2]) < 0.1,
    preso || ("z=" + D.P.z.toFixed(2) + ", " + caminho.length + " pontos, " + agachou + " agachado"));
}

fim();
