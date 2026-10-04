/* ============================================================
   CANTEIRO -- O LOTE
   ------------------------------------------------------------
   "Construa uma casa no estilo X aqui": o lote gera o MODELO de uma casa
   inteira, que o canteiro poe como qualquer modelo colado -- e que depois
   se mexe peca por peca no micro.

   A casa tem a porta no meio da frente (o lado sul, +y), janela sim, janela
   nao nas outras paredes, a escada encostada na parede norte -- ate dois
   andares -- e, com dois, a sacada na frente do andar de cima, com porta
   para ela. O telhado e de duas aguas, com a cumeeira correndo de leste a oeste e as
   empenas fechando as pontas. O vao da laje cobre o lance inteiro da escada
   -- a grade de andar mostrou que, com o vao so em cima do alto, a cabeca
   bate na beira da laje no meio da subida.

   As medidas saem do estilo: o andar da casa de pedra e o da de madeira tem
   a mesma altura, a fortaleza tem outra, e a escada acompanha.

   Puro: nao toca em DOM. O macro usa, e o teste anda na casa gerada.
   ============================================================ */
"use strict";
(function(){
  if (typeof module !== "undefined" && typeof TIPOS_DE_PECA === "undefined"){
    const Pc = require("../src/pecas.js");
    for (const k in Pc) globalThis[k] = Pc[k];
  }
  if (typeof module !== "undefined" && typeof girarModelo === "undefined"){
    const Mo = require("./modelo.js"), O = require("../editor/operacoes.js");
    for (const k in Mo) globalThis[k] = Mo[k];
    globalThis.pintar = O.pintar; globalThis.marcarPecas = O.marcarPecas;
  }
})();

/* Os limites de um lote de casa: menos de 3 de largura nao cabe a escada
   com o patamar; o fundo e par, para as duas aguas se encontrarem na linha
   de um tile. */
const LOTE_MIN = 3, LOTE_MAX = 12;
/* o vao da escada, em tiles: o lance comeca a meio tile da parede e vai o
   comprimento dela -- a da fortaleza e mais comprida */
function vaoDaEscada(estilo){
  const e = (ESTILOS[estilo] || ESTILOS["madeira-pescador"]).forma;
  return Math.ceil(0.5 + e.comp - 1e-9);
}
function medidasDoLote(larg, fundo, andares, estilo){
  const andar = Math.max(1, Math.min(2, Math.round(andares || 1)));
  /* com escada, a largura deixa um tile de patamar depois do vao */
  const minimo = andar > 1 ? Math.max(LOTE_MIN, vaoDaEscada(estilo) + 1) : LOTE_MIN;
  const w = Math.max(minimo, Math.min(LOTE_MAX, Math.floor(larg)));
  let d = Math.max(4, Math.min(LOTE_MAX, Math.floor(fundo)));
  if (d % 2) d--;
  return {larg: w, fundo: d, andares: andar};
}
function gerarCasa(opcoes){
  const estilo = ESTILOS[opcoes.estilo] ? opcoes.estilo : "madeira-pescador";
  const o = medidasDoLote(opcoes.larg, opcoes.fundo, opcoes.andares, estilo), vao = vaoDaEscada(estilo);
  const sacada = o.andares > 1 && opcoes.sacada !== false;
  const W = o.larg, D = o.fundo, n = o.andares;
  const e = Object.assign({}, (ESTILOS[estilo] || ESTILOS["madeira-pescador"]).forma);
  const A = e.alto, pecas = [];
  const por = function(tipo, x, y, z, giro, espelho, campos){
    const p = {grupo: 1, tipo: tipo, x: x, y: y, z: z, giro: giro || 0, espelho: espelho || 0};
    if (campos) p.campos = campos;
    pecas.push(p);
  };
  /* o piso do terreo, um degrau de meio acima do chao: sem ele a casa tinha
     grama dentro, e o piso rente ao chao brigava com ele no z-buffer */
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) por("piso", i, j, DEGRAU/2);
  const porta = Math.floor((W - 1)/2);
  /* Toda parede com o +y dela para dentro de casa: e para la que a porta e
     a vidraca abrem, e para fora que a veneziana dobra. A da frente e a do
     oeste vao giradas de meia volta, comecando da outra ponta do tile. */
  for (let k = 0; k < n; k++){
    const z = k*A, terreo = k === 0;
    /* frente (sul): a porta no terreo; janelas alternadas nos outros andares */
    for (let i = 0; i < W; i++){
      const tipo = (terreo || sacada) && i === porta ? "parede-porta"
                 : ((i % 2) && i !== W - 1 ? "parede-janela" : "parede");
      por(tipo, i + 1, D, z, 180);
    }
    /* a sacada na frente da porta de cima, com o lado aberto para a casa */
    if (!terreo && sacada) por("sacada", porta + 1, D + 1, z, 180);
    /* fundo (norte): janela no meio, fora das pontas */
    for (let i = 0; i < W; i++) por(i > 0 && i < W - 1 && (i % 2) ? "parede-janela" : "parede", i, 0, z);
    /* as quinas: um pilar da espessura da parede em cada uma -- cada parede
       acaba no eixo da outra, e sem ele a quina de fora ficava com um dente */
    for (const q of [[0, 0], [W, 0], [0, D], [W, D]]) por("canto-fora", q[0], q[1], z);
    /* os lados */
    for (let j = 0; j < D; j++){
      const janela = j > 0 && j < D - 1 && (j % 2) === 0;
      por(janela ? "parede-janela" : "parede", 0, j + 1, z, 270);
      por(janela ? "parede-janela" : "parede", W, j, z, 90);
    }
    /* a escada deste andar para o de cima, e a laje de cima com o vao
       sobre o lance inteiro da escada */
    if (k < n - 1){
      /* A escada termina na beira do vao, onde a laje comeca -- a da
         fortaleza, mais comprida, comeca mais perto da parede. Encostada na
         parede fina ela fica colada; na parede grossa, a meio tile dela,
         senao o corpo raspa na parede de um lado e bate a cabeca na laje do
         outro -- e o vao ganha uma fileira. */
      const grossa = (e.espessura || 0.125) > 0.2, afasta = grossa ? 0.5 : 0, fileiras = grossa ? 2 : 1;
      por("escada", vao - e.comp, afasta, z);
      for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) if (!(j < fileiras && i < vao)) por("laje", i, j, z + A);
    }
  }
  /* o forro do ultimo andar, na altura do fundo da laje dos de baixo: sem
     ele, de dentro se via o avesso do telhado e a chamine no sotao */
  const topo = n*A, meio = D/2, sobe = 0.5;
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) por("forro", i, j, topo - DEGRAU/2);
  /* o telhado: agua subindo do norte ate o meio e do sul ate o meio, meio
     tile de subida por tile; as empenas fecham leste e oeste */
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++){
    if (j < meio) por("telhado-agua", i, j, topo + sobe*j);
    else por("telhado-agua", i + 1, j + 1, topo + sobe*(D - 1 - j), 180);
  }
  /* a empena de cada tile desce ate o alto da parede (o campo base): so o
     triangulo deixava a ponta do telhado vazada em degraus */
  for (let j = 0; j < D; j++) for (const x of [0, W]){
    const k = j < meio ? j : D - 1 - j, base = k ? {base: String(sobe*k)} : null;
    if (j < meio) por("telhado-empena", x, j, topo + sobe*j, 90, 0, base);
    else por("telhado-empena", x, j, topo + sobe*(D - 1 - j), 90, 1, base);
  }
  /* casa de pelo menos quatro por quatro ganha chamine, perto do fundo */
  if (W >= 4 && D >= 4) por("chamine", W - 1.5, 0.75, topo);
  return {nome: opcoes.nome || ("casa " + W + "x" + D), pecas: pecas, grupos: [{grupo: 1, estilo: estilo}],
          tamanho: [W, D, topo + sobe*meio]};
}

/* A casa de um lote retangular do mapa, de frente para um lado: o chao do
   lote e nivelado na altura mais alta dele (nada fica enterrado), o forro
   pintado sai (o telhado agora e de peca), e a casa entra como modelo. Tudo
   pelo historico -- um Ctrl+Z so. `frente` e "sul", "oeste", "norte" ou
   "leste". Devolve a casa, ou null se o lote nao cabe uma. */
const QUARTOS_DA_FRENTE = {sul: 0, oeste: 1, norte: 2, leste: 3};
function erguerLote(h, m, x0, y0, x1, y1, opcoes){
  const xa = Math.max(0, Math.min(x0, x1)), xb = Math.min(m.larg - 1, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1)), yb = Math.min(m.alt - 1, Math.max(y0, y1));
  const quartos = QUARTOS_DA_FRENTE[opcoes.frente] || 0, deLado = quartos % 2 === 1;
  /* a casa ocupa o lote menos um tile de quintal na frente, para a sacada */
  const w = xb - xa + 1, d = yb - ya + 1;
  const larg = deLado ? d : w, fundo = (deLado ? w : d) - (opcoes.andares > 1 ? 1 : 0);
  if (larg < LOTE_MIN || fundo < 4) return null;
  let casa = gerarCasa({larg: larg, fundo: fundo, andares: opcoes.andares, estilo: opcoes.estilo, sacada: opcoes.sacada});
  casa = girarModelo(casa, quartos);
  let alto = 0;
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) alto = Math.max(alto, m.altura[y*m.larg + x]);
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){ pintar(h, m, "altura", x, y, alto); pintar(h, m, "teto", x, y, 0); }
  marcarPecas(h, m);
  /* a casa girada encosta no canto do lote pela caixa de verdade dela -- a
     sacada passa do tamanho da casa, para o lado da frente; a espessura da
     parede, que passa um fio da linha do tile, nao conta */
  const c = caixaDoModelo(casa);
  porModelo(m, casa, xa - Math.floor(c.x0 + 0.25), ya - Math.floor(c.y0 + 0.25), alto*m.passo);
  return casa;
}

if (typeof module !== "undefined") module.exports = {LOTE_MIN, LOTE_MAX, QUARTOS_DA_FRENTE, medidasDoLote, vaoDaEscada, gerarCasa, erguerLote};
