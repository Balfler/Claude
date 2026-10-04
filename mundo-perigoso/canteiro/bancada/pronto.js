/* ============================================================
   CANTEIRO -- O CONTEUDO DO "PRONTO"
   ------------------------------------------------------------
   O que o pedido do canteiro chamou de pronto, feito com as mesmas operacoes
   da ferramenta -- o lote, o traco, a rampa, as pecas, os marcos --, sobre o
   rascunho de 650 do Leandro (Arte/ilha 2.mapa, que fica intocado: o
   roteiro le e converte). A geografia dele fica; entra por cima:

   - a MONTANHA que se sobe: a rocha esculpida de encosta suave (um degrau
     por tile) vira encosta de pedra, que se anda, e a de mais de um degrau
     fica rocha -- os penhascos. Uma trilha de terra sobe em rampa, com
     patamares, da fortaleza ate o pico, onde fica a forja do Bruno;
   - PEDRA ALTA, ao sul da montanha: a praca, as duas ruas de pedra, cinco
     casas do lote -- uma de dois andares com sacada, erguida em madeira e
     trocada para pedra, como o botao "Trocar o estilo dela" faz --, a ponte
     de pedra de dois arcos sobre o riacho e os moradores de conversa.js;
   - a FORTALEZA na saida norte da vila: a muralha com adarve e ameias, a
     torre redonda e a quadrada nas pontas, o portao com a grade levadica
     (erguida), o fosso e a ponte levadica sobre ele;
   - a GRUTA, dungeon de tres salas nos dois estilos -- a cripta de pedra e
     a caverna --, com a boca no pe da trilha e a saida em par com ela;
   - as REGIOES com nome, cada tile de terra na da semente mais perto;
   - e o que a validacao acusava no rascunho: areia abaixo do mar e agua
     funda acima dele.

   Os nomes -- das regioes, das placas, das casas -- sao proposta, para o
   Leandro trocar no canteiro.

   Uso: node mundo-perigoso/canteiro/bancada/pronto.js [--forca]
   Grava Arte/ilha-650.mapa e Arte/gruta.mapa. Se eles ja existem, so com
   --forca: o mapa se mexe no canteiro depois, e refazer apagaria o que se
   fez a mao. Refazer serve quando as pecas ou o lote melhoram.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const M = require("../../src/mapa.js");
const O = require("../../editor/operacoes.js");
const Pc = require("../../src/pecas.js");
const Lo = require("../lote.js");

const RAIZ = path.join(__dirname, "..", "..");
const ARQ_ILHA = path.join(RAIZ, "Arte", "ilha-650.mapa"), ARQ_GRUTA = path.join(RAIZ, "Arte", "gruta.mapa");
const T = function(id){ const k = M.TERRENOS.findIndex(function(t){ return t.id === id; }); if (k < 0) throw new Error(id); return k; };
function sair(msg){ console.error(msg); process.exit(1); }

/* um sorteio com semente: o conteudo sai igual a cada vez */
function sorteio(semente){
  let s = semente >>> 0;
  return function(){ s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
}
function novaConstrucao(m, nome, estilo){
  let maior = 0;
  for (const c of m.construcoes) maior = Math.max(maior, c.id);
  for (const p of m.pecas) maior = Math.max(maior, p.construcao || 0);
  m.construcoes.push({id: maior + 1, estilo: estilo, nome: nome});
  return maior + 1;
}
function peca(m, cons, tipo, x, y, z, giro, campos){
  if (!Pc.TIPOS_DE_PECA[tipo]) throw new Error("tipo de peca: " + tipo);
  const p = {tipo: tipo, construcao: cons, x: x, y: y, z: z, giro: giro || 0, espelho: 0};
  if (campos) p.campos = campos;
  m.pecas.push(p);
  return p;
}
const agua = function(m, x, y){ return M.TERRENOS[m.terreno[y*m.larg + x]].tipo === "agua"; };
function coisa(h, m, x, y, tipo, texto, campos){
  if (agua(m, x, y)) throw new Error(tipo + " na agua em " + x + "," + y);
  O.colocarCoisa(h, m, x, y, tipo, texto || "", campos || null);
}
/* pinta a linha com o terreno, sem cobrir agua: a ponte passa por cima */
function estrada(h, m, x0, y0, x1, y1, largura, terreno){
  for (const t of O.tilesDaLinha(x0, y0, x1, y1, largura))
    if (t[0] >= 0 && t[1] >= 0 && t[0] < m.larg && t[1] < m.alt && !agua(m, t[0], t[1])) O.pintar(h, m, "terreno", t[0], t[1], terreno);
}
function retanguloDe(h, m, camada, x0, y0, x1, y1, valor){ O.retangulo(h, m, camada, x0, y0, x1, y1, valor); }

/* ============================================================ A ILHA */
const ARQ_RASCUNHO = path.join(RAIZ, "Arte", "ilha 2.mapa");
if ((fs.existsSync(ARQ_ILHA) || fs.existsSync(ARQ_GRUTA)) && !process.argv.includes("--forca"))
  sair("Arte/ilha-650.mapa e Arte/gruta.mapa ja existem: refazer apaga o que se mexeu neles a mao (--forca para refazer)");
const lida = M.lerMapa(fs.readFileSync(ARQ_RASCUNHO, "utf8"));
if (!lida.mapa) sair("nao li " + ARQ_RASCUNHO);
const m = lida.mapa, W = m.larg;
if (m.versao < 2) M.converterMapa(m);
const h = O.novoHistorico();
O.abrirAcao(h, "pronto");

/* ---------- o que a validacao acusava ---------- */
let limpos = 0;
for (let i = 0; i < W*m.alt; i++){
  const t = M.TERRENOS[m.terreno[i]];
  if (t.id === "areia" && m.altura[i] < m.mar){ m.altura[i] = m.mar; limpos++; }
  if (t.id === "funda" && m.altura[i] >= m.mar){ m.altura[i] = m.mar - 2; limpos++; }
}

/* ---------- a montanha ---------- */
const ROCHA = T("rocha"), ENCOSTA = T("encosta");
const virou = [];
for (let y = 250; y < 470; y++) for (let x = 90; x < 290; x++){
  const i = y*W + x;
  if (m.terreno[i] !== ROCHA || m.altura[i] <= m.mar) continue;
  let d = 0;
  for (const v of [[1, 0], [-1, 0], [0, 1], [0, -1]]) d = Math.max(d, Math.abs(m.altura[i + v[1]*W + v[0]] - m.altura[i]));
  if (d <= 1) virou.push(i);
}
for (const i of virou) m.terreno[i] = ENCOSTA;

/* a trilha: patamares com a altura pela distancia andada, e rampa entre eles */
const PICO = {x0: 184, y0: 327, x1: 192, y1: 334, h: 35};
retanguloDe(h, m, "altura", PICO.x0, PICO.y0, PICO.x1, PICO.y1, PICO.h);
retanguloDe(h, m, "terreno", PICO.x0, PICO.y0, PICO.x1, PICO.y1, ENCOSTA);
const trilha = [[200, 471], [204, 445], [214, 405], [205, 368], [193, 346], [189, 337]];
let total = 0;
for (let k = 1; k < trilha.length; k++) total += Math.hypot(trilha[k][0] - trilha[k-1][0], trilha[k][1] - trilha[k-1][1]);
let andado = 0;
const TERRA = T("terra");
for (let k = 0; k < trilha.length; k++){
  if (k) andado += Math.hypot(trilha[k][0] - trilha[k-1][0], trilha[k][1] - trilha[k-1][1]);
  const alvo = Math.round(m.mar + (PICO.h - m.mar)*andado/total), p = trilha[k];
  if (k === 0) continue;                                   // o pe fica no chao da vila
  const r = k === trilha.length - 1 ? 1 : 2;               // o patamar: 5x5, e 3x3 no ultimo
  for (let y = p[1] - r; y <= p[1] + r; y++) for (let x = p[0] - r; x <= p[0] + r; x++){
    if (agua(m, x, y)) throw new Error("patamar na agua em " + x + "," + y);
    m.altura[y*W + x] = alvo; m.terreno[y*W + x] = TERRA;
  }
}
for (let k = 1; k < trilha.length; k++){
  const a = trilha[k-1], b = trilha[k];
  const r = O.rampaEntre(h, m, a[0], a[1], b[0], b[1], 3);
  if (r.faltou) throw new Error("a rampa " + k + " nao cabe: faltaram " + r.faltou);
  estrada(h, m, a[0], a[1], b[0], b[1], 3, TERRA);
}
/* do ultimo patamar ao pico, um degrau de encosta */
estrada(h, m, 189, 336, 189, 335, 3, TERRA);
/* Os lados da trilha: a rampa so ergue (ou corta) a faixa dela, e o que
   sobra dos lados e um paredao. Cada tile a ate 6 passos da trilha fica
   entre a altura dela menos a distancia e mais a distancia -- um degrau por
   tile, que se anda --, virando aterro onde a trilha passa alto e corte onde
   passa fundo. A rocha fica como esta: e o penhasco. */
{
  const leito = new Map();
  const noLeito = function(x, y){ leito.set(y*W + x, m.altura[y*W + x]); };
  for (let k = 1; k < trilha.length; k++)
    for (const t of O.tilesDaLinha(trilha[k-1][0], trilha[k-1][1], trilha[k][0], trilha[k][1], 3)) noLeito(t[0], t[1]);
  for (let y = PICO.y0; y <= PICO.y1; y++) for (let x = PICO.x0; x <= PICO.x1; x++) noLeito(x, y);
  const R = 6, baixo = new Map(), alto = new Map(), CHAO_DA_TRILHA = new Set(["grama", "mato", "encosta", "terra", "areia", "lama"]);
  leito.forEach(function(hr, i){
    const x0 = i % W, y0 = (i / W) | 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++){
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === 0 || d > R) continue;
      const x = x0 + dx, y = y0 + dy, j = y*W + x;
      if (leito.has(j) || y >= 470) continue;                      // a vila e a fortaleza ficam como estao
      if (!CHAO_DA_TRILHA.has(M.TERRENOS[m.terreno[j]].id)) continue;
      baixo.set(j, Math.max(baixo.has(j) ? baixo.get(j) : -Infinity, hr - d));
      alto.set(j, Math.min(alto.has(j) ? alto.get(j) : Infinity, hr + d));
    }
  });
  baixo.forEach(function(b, j){
    const a = alto.get(j);
    if (b > a) return;
    m.altura[j] = Math.max(b, Math.min(a, m.altura[j]));
  });
}

/* ---------- Pedra Alta ---------- */
const CALCADA = T("calcada"), AREIA = T("areia");
/* a praca e as duas ruas; a do norte sai pelo portao para a trilha */
retanguloDe(h, m, "terreno", 194, 504, 206, 516, CALCADA);
estrada(h, m, 200, 471, 200, 545, 3, CALCADA);
estrada(h, m, 140, 510, 228, 510, 3, CALCADA);

/* a ponte de pedra: um arco em cada braco do riacho que a rua cruza */
const ponte = novaConstrucao(m, "ponte do riacho", "pedra-obra"), CHAO_RUA = m.mar*m.passo;
{
  /* so a agua funda pede arco; a rasa debaixo da rua vira margem */
  const funda = function(x, y){ return M.TERRENOS[m.terreno[y*W + x]].id === "funda"; };
  const runs = [], arcos = [];
  let ini = -1;
  for (let x = 160; x <= 191; x++){
    const tem = x <= 190 && (funda(x, 509) || funda(x, 510) || funda(x, 511));
    if (tem && ini < 0) ini = x;
    if (!tem && ini >= 0){ runs.push([ini, x - 1]); ini = -1; }
  }
  for (const r of runs){
    const n = r[1] - r[0] + 1, k = Math.ceil(n/3), x0 = r[0] + n/2 - 1.5*k;
    for (let j = 0; j < k; j++){ peca(m, ponte, "ponte-arco", x0 + 3*j, 509.5, CHAO_RUA, 0); arcos.push([x0 + 3*j, x0 + 3*j + 3]); }
  }
  /* a agua da rua que arco nenhum cobre vira areia, na altura da rua */
  for (let x = 160; x <= 190; x++) for (let y = 509; y <= 511; y++){
    if (!agua(m, x, y)) continue;
    if (arcos.some(function(a){ return x >= a[0] && x + 1 <= a[1]; })) continue;
    m.terreno[y*W + x] = AREIA; m.altura[y*W + x] = m.mar;
  }
  if (runs.length < 1) throw new Error("a rua nao cruza o riacho");
}

/* as cinco casas; a de dois andares com sacada nasce em madeira e troca para
   pedra, como o botao "Trocar o estilo dela" */
const casas = [
  {x0: 186, y0: 495, x1: 192, y1: 503, andares: 2, frente: "sul",   estilo: "madeira-pescador", sacada: true, troca: "pedra-vila"},
  {x0: 208, y0: 496, x1: 213, y1: 503, andares: 1, frente: "sul",   estilo: "madeira-pescador"},
  {x0: 186, y0: 517, x1: 192, y1: 523, andares: 1, frente: "norte", estilo: "pedra-vila"},
  {x0: 208, y0: 517, x1: 214, y1: 525, andares: 2, frente: "norte", estilo: "madeira-pescador", sacada: true},
  {x0: 205, y0: 482, x1: 211, y1: 488, andares: 1, frente: "oeste", estilo: "madeira-pescador"}
];
for (const c of casas){
  const casa = Lo.erguerLote(h, m, c.x0, c.y0, c.x1, c.y1, {andares: c.andares, frente: c.frente, estilo: c.estilo, sacada: !!c.sacada});
  if (!casa) throw new Error("o lote nao coube: " + JSON.stringify(c));
  if (c.troca){
    const ids = new Set(m.pecas.filter(function(p){ return p.x >= c.x0 - 0.5 && p.x <= c.x1 + 1.5 && p.y >= c.y0 - 0.5 && p.y <= c.y1 + 1.5; })
                           .map(function(p){ return p.construcao; }));
    for (const k of m.construcoes) if (ids.has(k.id)) k.estilo = c.troca;
    for (const p of m.pecas) if (ids.has(p.construcao)) delete p.estilo;
  }
}

/* ---------- a fortaleza ---------- */
const forte = novaConstrucao(m, "fortaleza de Pedra Alta", "fortaleza-humana");
const MURO = 476, CHAO = m.mar*m.passo;
for (let x = 184; x <= 215; x++){
  if (x === 199 || x === 200) continue;
  peca(m, forte, "muralha-adarve", x, MURO, CHAO, 0);
}
peca(m, forte, "portao", 199, MURO, CHAO, 0);
peca(m, forte, "grade-levadica", 199.375, MURO, CHAO, 0, {aberta: "1"});
peca(m, forte, "torre-redonda", 181, MURO - 1.5, CHAO, 0);
peca(m, forte, "torre-quadrada", 216, MURO - 1.5, CHAO, 0);
/* as escadas de dentro sobem de frente para a muralha e saem no adarve */
for (const sx of [188, 211]) peca(m, forte, "escada-muralha", sx, MURO + 2.5, CHAO, 270);
/* o fosso, na frente da muralha, e a ponte levadica baixada sobre ele */
const FUNDA = T("funda");
for (let y = MURO - 3; y <= MURO - 2; y++) for (let x = 184; x <= 215; x++){ m.terreno[y*W + x] = FUNDA; m.altura[y*W + x] = m.mar - 2; }
peca(m, forte, "ponte-levadica", 199.25, MURO - 3.25, CHAO, 0);

/* ---------- a forja no pico ---------- */
const forja = novaConstrucao(m, "forja do Bruno", "madeira-pescador");
const ZP = PICO.h*m.passo;
peca(m, forja, "mesa", 185.5, 328.5, ZP, 0);
peca(m, forja, "barril", 185, 331, ZP, 0);
peca(m, forja, "barril", 185, 331.75, ZP, 0);
peca(m, forja, "braseiro", 190.2, 328.7, ZP, 0);

/* ---------- os marcos ---------- */
for (const c of m.coisas.slice()) if (c.tipo === "jogador") O.apagarCoisa(h, m, c.x, c.y);
coisa(h, m, 199, 513, "jogador");
coisa(h, m, 196, 513, "poco");
for (const p of [[194, 504], [206, 504], [194, 516], [206, 516], [202, 479], [198, 490]]) coisa(h, m, p[0], p[1], "lampiao");
coisa(h, m, 198, 479, "placa", "Pedra Alta");
coisa(h, m, 202, 468, "placa", "Trilha da serra: a forja fica no alto");
coisa(h, m, 188, 334, "placa", "Forja do Bruno");
coisa(h, m, 203, 479, "npc", "Guarda Anselmo");
coisa(h, m, 211, 505, "npc", "Tobias o lojista");
coisa(h, m, 211, 515, "npc", "Celeste da taverna");
coisa(h, m, 196, 507, "npc", "Velho Amadeu");
coisa(h, m, 189, 515, "npc", "Irm\u00e3 Clarice");
coisa(h, m, 226, 512, "npc", "Josias, o barqueiro");
coisa(h, m, 188, 331, "npc", "Bruno, o ferreiro");
/* a boca da gruta, ao lado do primeiro patamar da trilha */
coisa(h, m, 207, 445, "entrada", "", {mapa: "gruta", id: "gruta"});
/* arvores em volta da vila, fora das ruas e dos lotes */
{
  const sorte = sorteio(650), tiles = [];
  const nosLotes = function(x, y){ return casas.some(function(c){ return x >= c.x0 - 1 && x <= c.x1 + 1 && y >= c.y0 - 1 && y <= c.y1 + 1; }); };
  for (let y = 482; y <= 548; y++) for (let x = 150; x <= 236; x++){
    if (x >= 190 && x <= 212 && y >= 470 && y <= 530) continue;          // o miolo da vila
    if (!nosLotes(x, y)) tiles.push([x, y]);
  }
  O.espalhar(h, m, tiles, ["arvore", "arvore", "pinheiro", "arbusto"], 0.035, sorte);
}

/* ---------- as regioes ---------- */
const REGIOES = [
  {id: 1, nome: "Pedra Alta", x: 200, y: 505},
  {id: 2, nome: "Serra do Ferreiro", x: 185, y: 365},
  {id: 3, nome: "Campos do Oeste", x: 85, y: 430},
  {id: 4, nome: "Rochedo Cinzento", x: 275, y: 190},
  {id: 5, nome: "Mata do Norte", x: 460, y: 110},
  {id: 6, nome: "Campos do Leste", x: 460, y: 330},
  {id: 7, nome: "Delta", x: 330, y: 470},
  {id: 8, nome: "Ilhotas do Sul", x: 460, y: 575},
  {id: 9, nome: "Ponta Noroeste", x: 90, y: 85}
];
O.marcarMapaInteiro(h, m);
m.regioes = REGIOES.map(function(r){ return {id: r.id, nome: r.nome, campos: null}; });
for (let y = 0; y < m.alt; y++) for (let x = 0; x < W; x++){
  const i = y*W + x;
  if (M.TERRENOS[m.terreno[i]].id === "funda"){ m.regiao[i] = 0; continue; }
  let melhor = 0, dm = Infinity;
  for (const r of REGIOES){ const d = (x - r.x)*(x - r.x) + (y - r.y)*(y - r.y); if (d < dm){ dm = d; melhor = r.id; } }
  m.regiao[i] = melhor;
}
O.fecharAcao(h, m);
Pc.garantirIdsDePeca(m.pecas);

/* ============================================================ A GRUTA */
const g = M.novoMapa(48, 34, {nome: "gruta", mar: null, terreno: T("rocha"), altura: 0});
g.teto.fill(8);                                    // a rocha e o forro a dois tiles: a sala fecha
const hg = O.novoHistorico();
O.abrirAcao(hg, "gruta");
const LAJOTA = T("lajota"), TERRA_G = T("terra");
const cavar = function(x, y, terreno){ const i = y*g.larg + x; g.terreno[i] = terreno; g.altura[i] = 0; g.teto[i] = 8; };
/* a sala da cripta, o corredor, a caverna, o corredor e a sala do tesouro */
for (let y = 11; y <= 21; y++) for (let x = 4; x <= 15; x++) cavar(x, y, LAJOTA);
for (let y = 15; y <= 17; y++) for (let x = 16; x <= 22; x++) cavar(x, y, TERRA_G);
{
  const sorte = sorteio(34);
  for (let y = 5; y <= 23; y++) for (let x = 20; x <= 40; x++){
    const d = Math.hypot((x - 30)/9, (y - 14)/7.5) + (sorte() - 0.5)*0.18;
    if (d < 1) cavar(x, y, TERRA_G);
  }
}
for (let y = 21; y <= 25; y++) for (let x = 28; x <= 30; x++) cavar(x, y, TERRA_G);
for (let y = 25; y <= 31; y++) for (let x = 22; x <= 37; x++) cavar(x, y, LAJOTA);
/* em volta das duas salas da cripta a parede e pedra lavrada; o resto e a
   rocha da caverna */
for (const r of [[3, 10, 16, 22], [21, 24, 38, 32]]) for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++){
  const i = y*g.larg + x;
  if (M.TERRENOS[g.terreno[i]].tipo === "parede") g.terreno[i] = T("pedra");
}
const cripta = novaConstrucao(g, "cripta", "cripta-pedra"), caverna = novaConstrucao(g, "caverna", "caverna");
const tesouro = novaConstrucao(g, "sala do tesouro", "cripta-pedra");
for (const p of [[6.25, 13.25], [13.25, 13.25], [6.25, 19.25], [13.25, 19.25]]) peca(g, cripta, "coluna", p[0], p[1], 0, 0);
peca(g, cripta, "sarcofago", 9.5, 15, 0, 0);
for (const x of [6, 9, 12]) peca(g, cripta, "nicho", x, 11, 0, 0);
for (const x of [7.9, 11]) peca(g, cripta, "tocha", x, 11, 0, 0);
/* as estalagmites perto da parede, mas no chao cavado */
for (const p of [[25.5, 9.5], [28.5, 8.5], [35, 10], [37, 14.5], [34, 19], [25.5, 18]]){
  if (M.TERRENOS[g.terreno[Math.floor(p[1])*g.larg + Math.floor(p[0])]].tipo !== "chao") throw new Error("estalagmite na rocha: " + p);
  peca(g, caverna, "estalagmite", p[0], p[1], 0, 0);
}
peca(g, caverna, "braseiro", 29.7, 13.7, 0, 0);
for (const p of [[27.5, 25.2], [33, 25.2]]) peca(g, tesouro, "coluna", p[0], p[1], 0, 0);
peca(g, tesouro, "altar", 29.25, 25, 0, 0);
peca(g, tesouro, "bau", 29.65, 28.2, 0, 0);
for (const x of [25, 35]) peca(g, tesouro, "tocha", x, 25, 0, 0);
Pc.garantirIdsDePeca(g.pecas);
O.colocarCoisa(hg, g, 5, 16, "saida", "", {mapa: "ilha-650", id: "gruta"});
O.colocarCoisa(hg, g, 7, 16, "jogador", "");
O.colocarCoisa(hg, g, 30, 28, "bau", "", {conteudo: "ouro:50"});
O.colocarCoisa(hg, g, 33, 16, "ninho", "", {criatura: "morcego", quantos: "3", raio: "4"});
O.fecharAcao(hg, g);

/* ============================================================ gravar */
for (const [arq, mm] of [[ARQ_ILHA, m], [ARQ_GRUTA, g]]){
  const texto = M.escreverMapa(mm), volta = M.lerMapa(texto);
  if (!volta.mapa || M.escreverMapa(volta.mapa) !== texto) sair(path.basename(arq) + ": nao da ida e volta igual");
  fs.writeFileSync(arq, texto);
  console.log(path.relative(RAIZ, arq) + ": " + mm.larg + "x" + mm.alt + ", " + mm.pecas.length + " pecas, " +
              mm.construcoes.length + " construcoes, " + mm.coisas.length + " coisas, " + (texto.length/1024).toFixed(0) + " KB");
}
console.log("rascunho limpo em " + limpos + " tiles; " + virou.length + " tiles de rocha viraram encosta");
