/* Testes do macro que olha e esculpe: o relevo com ruido
   (editor/operacoes.js), o calor do vazio e a vista de um ponto
   (canteiro/olhar.js).

   Uso: node mundo-perigoso/teste/olhar.test.js */
const M = require("../src/mapa.js");
const O = require("../editor/operacoes.js");
const Ol = require("../canteiro/olhar.js");
const { placar } = require("./harness");
const { check, fim } = placar();

const ch = function(c){ return M.TERRENO_POR_CHAR[c]; };
const plano = function(w, h){ return M.novoMapa(w || 60, h || 60, {terreno: ch(","), altura: 4}); };

/* 1. o relevo com ruido */
{
  const a = plano(), b = plano();
  O.relevoComRuido(null, a, 5, 5, 54, 54, {amplitude: 10, escala: 12, semente: 7});
  O.relevoComRuido(null, b, 5, 5, 54, 54, {amplitude: 10, escala: 12, semente: 7});
  check("a mesma semente da os mesmos morros", M.escreverMapa(a) === M.escreverMapa(b));
  const c = plano();
  O.relevoComRuido(null, c, 5, 5, 54, 54, {amplitude: 10, escala: 12, semente: 8});
  check("outra semente, outros morros", M.escreverMapa(a) !== M.escreverMapa(c));
  let maior = 0, pior = 0, fora = true, baixou = false;
  for (let y = 0; y < 60; y++) for (let x = 0; x < 60; x++){
    const i = y*60 + x, h = a.altura[i];
    maior = Math.max(maior, h);
    if (h < 4) baixou = true;
    if ((x < 5 || y < 5 || x > 54 || y > 54) && h !== 4) fora = false;
    if (x < 59) pior = Math.max(pior, Math.abs(h - a.altura[i + 1]));
    if (y < 59) pior = Math.max(pior, Math.abs(h - a.altura[i + 60]));
  }
  check("os morros sobem, e nada fica abaixo do chao de antes", maior >= 8 && !baixou, "maior " + maior);
  check("fora do retangulo nada muda", fora);
  check("andavel: nenhum degrau passa de um entre vizinhos", pior <= 1, "pior degrau " + pior);
  const bruto = plano();
  O.relevoComRuido(null, bruto, 5, 5, 54, 54, {amplitude: 16, escala: 8, semente: 7, andavel: false});
  let piorBruto = 0;
  for (let i = 0; i < 59*60; i++) piorBruto = Math.max(piorBruto, Math.abs(bruto.altura[i] - bruto.altura[i + 1]));
  check("sem o andavel, o ruido forte sai com penhasco", piorBruto >= 2, "pior degrau " + piorBruto);
  const agua = plano();
  for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) agua.terreno[y*60 + x] = ch("~");
  const antes = agua.altura[30*60 + 30];
  O.relevoComRuido(null, agua, 5, 5, 54, 54, {amplitude: 10, escala: 12, semente: 7});
  check("a agua fica como estava", agua.altura[30*60 + 30] === antes);
  const h = O.novoHistorico(), d = plano(), t0 = M.escreverMapa(d);
  O.abrirAcao(h, "relevo"); O.relevoComRuido(h, d, 5, 5, 54, 54, {amplitude: 10, escala: 12, semente: 7}); O.fecharAcao(h, d);
  O.desfazer(h, d);
  check("um Ctrl+Z desfaz o relevo inteiro", M.escreverMapa(d) === t0);
}

/* 2. o calor do vazio */
{
  const m = plano(200, 20);
  m.coisas.push({x: 10, y: 10, tipo: "npc", texto: "Tobias"});
  m.coisas.push({x: 12, y: 10, tipo: "arvore", texto: ""});                  // cenario nao conta
  m.coisas.push({x: 150, y: 10, tipo: "jogador", texto: ""});              // o inicio tambem nao
  for (let y = 0; y < 20; y++) m.terreno[y*200 + 100] = ch("~");            // o rio que ninguem cruza
  const c = Ol.calorDoVazio(m);
  check("a distancia anda pela terra, em tiles", c.dist[10*200 + 10] === 0 && c.dist[10*200 + 50] === 40, c.dist[10*200 + 50]);
  check("a diagonal custa um e meio", c.dist[0*200 + 0] === 15, c.dist[0]);
  check("so o marco e fonte: a arvore e o inicio nao", c.fontes === 1);
  check("do outro lado do rio o vazio e inteiro, e o rio nao tem conta",
    c.dist[10*200 + 150] === Infinity && Number.isNaN(c.dist[10*200 + 100]));
  check("a cor: nada perto, amarelo no caminho, vermelho alem de 120, e sem cor na agua",
    Ol.corDoVazio(10) === null && Ol.corDoVazio(45)[1] === 200 && Ol.corDoVazio(130)[0] === 255 && Ol.corDoVazio(130)[1] < 60 &&
    Ol.corDoVazio(NaN) === null && Ol.corDoVazio(Infinity)[3] > 100);
  m.pecas.push({tipo: "parede", x: 60, y: 5, z: 1, giro: 0, id: 1});
  check("a construcao tambem e fonte", Ol.calorDoVazio(m).dist[5*200 + 60] === 0);
}

/* 3. a vista */
{
  const m = plano(80, 80);
  for (let y = 30; y < 50; y++) m.terreno[y*80 + 45] = ch("^");            // um paredao de rocha
  const v = Ol.vistaDe(m, 30, 40, 0.6, 30);
  const ve = function(x, y){ return v.ve[(y - v.y0)*v.lado + (x - v.x0)] === 1; };
  check("no plano se ve longe", ve(30, 12) && ve(40, 20));
  check("atras do paredao nao se ve", !ve(50, 40) && !ve(55, 38));
  check("fora do alcance nao se ve", !ve(30, 5));
  const alto = Ol.vistaDe(m, 30, 40, 12, 30);
  check("do alto, o paredao ja nao tapa", alto.ve[(40 - alto.y0)*alto.lado + (55 - alto.x0)] === 1);
  const morro = plano(80, 80);
  for (let y = 0; y < 80; y++) for (let x = 38; x < 42; x++) morro.altura[y*80 + x] = 12;
  const vm = Ol.vistaDe(morro, 30, 40, 0.6, 30);
  /* de baixo se ve a beira da frente do morro, e nao o chao do alto dele */
  check("o morro tapa o vale do outro lado, e o alto dele", vm.ve[(40 - vm.y0)*vm.lado + (50 - vm.x0)] === 0 &&
    vm.ve[(40 - vm.y0)*vm.lado + (38 - vm.x0)] === 1 && vm.ve[(40 - vm.y0)*vm.lado + (40 - vm.x0)] === 0);
}

fim();
