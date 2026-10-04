/* Testes do modelo: o pedaco construido que se copia, gira, espelha, cola
   e guarda em arquivo.

   A regra: girar ou espelhar o modelo da EXATAMENTE a geometria de antes
   girada ou espelhada -- conferida solido por solido, com pecas que nao sao
   simetricas (a escada, a porta, a folha dela) e no estilo da fortaleza, em
   que a escada e mais comprida.

   Uso: node mundo-perigoso/teste/modelo.test.js */
const M = require("../src/mapa.js");
const Pc = require("../src/pecas.js");
const Mo = require("../canteiro/modelo.js");
const { placar } = require("./harness");
const { check, fim } = placar();

/* uma casinha torta de proposito: porta fora do meio, escada, folha de
   porta, janela, sacada -- e uma construcao de pedra de fortaleza junto */
function mapaDaCasa(){
  const m = M.novoMapa(64, 64, {nome: "modelo", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
  m.construcoes.push({id: 1, estilo: "madeira-pescador", nome: "casa"}, {id: 2, estilo: "fortaleza-humana", nome: "forte"});
  const por = function(c, tipo, x, y, z, giro, espelho, campos){
    const p = {construcao: c, tipo: tipo, x: x, y: y, z: z, giro: giro || 0, espelho: espelho || 0};
    if (campos) p.campos = campos;
    m.pecas.push(p);
  };
  por(1, "parede", 10, 10, 1); por(1, "parede-porta", 11, 10, 1, 0, 1); por(1, "parede-janela", 12, 10, 1);
  por(1, "parede", 10, 10, 1, 90); por(1, "parede", 10, 11, 1, 90);
  por(1, "escada", 10.5, 11, 1); por(1, "porta", 11.25, 10, 1, 0, 0, {estilo: "pedra-vila"});
  por(1, "sacada", 11, 9, 2.5); por(1, "telhado-agua", 10, 10, 2.5, 180);
  por(2, "escada-muralha", 13, 10, 1, 90); por(2, "muralha", 14, 11, 1, 270, 1);
  Pc.garantirIdsDePeca(m.pecas);
  return m;
}
/* todos os cantos de todos os solidos, arredondados, como um conjunto */
function cantos(m, transformar){
  const est = Pc.estilosDasConstrucoes(m), out = [];
  for (const p of m.pecas){
    const g = Pc.geometriaDaPeca(p, Pc.estiloDaPeca(p, est));
    for (const s of g.solidos){
      const pts = s.pts.map(function(q){ const t = transformar ? transformar(q[0], q[1]) : q; return t[0].toFixed(4) + "," + t[1].toFixed(4); }).sort();
      out.push(pts.join(" ") + "|" + s.z0.toFixed(4) + "|" + s.z1.toFixed(4));
    }
  }
  return out.sort().join("\n");
}

const casa = mapaDaCasa();
const caixa = Mo.caixaDeCantos({x: 16, y: 13, z: 5}, {x: 9, y: 8, z: 0});
check("a caixa pega as pecas que nascem dentro dela", Mo.pecasNaCaixa(casa, caixa).length === casa.pecas.length);
const mod = Mo.modeloDaCaixa(casa, caixa, "casa torta");
check("o modelo guarda o estilo de cada construcao", mod.grupos.length === 2 &&
  mod.grupos.some(function(g){ return g.estilo === "fortaleza-humana"; }));

/* colar o modelo do jeito que saiu, noutro lugar: a mesma casa, andada (o
   canto de baixo da caixa esta em z=0, entao colar em z=0 nao sobe nada) */
function colado(modelo, x, y, z){
  const m = M.novoMapa(64, 64, {nome: "colado", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
  Mo.porModelo(m, modelo, x, y, z);
  return m;
}
check("colar o modelo da a mesma geometria, so andada",
  cantos(colado(mod, 30, 40, 0)) === cantos(casa, function(x, y){ return [x - 9 + 30, y - 8 + 40]; }));

/* girar um quarto de volta: (x, y) -> (d - y, x) em volta do canto */
{
  const d = mod.tamanho[1];
  const g1 = colado(Mo.girarModelo(mod, 1), 30, 40, 0);
  check("girar o modelo gira a geometria inteira, peca por peca",
    cantos(g1) === cantos(casa, function(x, y){ const rx = x - 9, ry = y - 8; return [d - ry + 30, rx + 40]; }));
  check("girar zero quartos nao gira nada", cantos(colado(Mo.girarModelo(mod, 0), 30, 40, 0)) === cantos(colado(mod, 30, 40, 0)));
  const g4 = colado(Mo.girarModelo(mod, 4), 30, 40, 0);
  check("quatro quartos de volta voltam ao comeco", cantos(g4) === cantos(colado(mod, 30, 40, 0)));
}
/* espelhar: x -> W - x dentro da largura do modelo */
{
  const W = mod.tamanho[0];
  const e1 = colado(Mo.espelharModelo(mod), 30, 40, 0);
  check("espelhar o modelo espelha a geometria inteira -- escada, porta e muralha da fortaleza",
    cantos(e1) === cantos(casa, function(x, y){ return [W - (x - 9) + 30, y - 8 + 40]; }));
  const e2 = colado(Mo.espelharModelo(Mo.espelharModelo(mod)), 30, 40, 0);
  check("espelhar duas vezes volta ao comeco", cantos(e2) === cantos(colado(mod, 30, 40, 0)));
}
/* colar vira construcao nova, com o estilo do grupo */
{
  const m = mapaDaCasa();
  const antes = m.construcoes.length;
  Mo.porModelo(m, mod, 30, 30, 1);
  const novas = m.construcoes.slice(antes);
  check("colar abre construcoes novas, cada uma com o estilo do grupo",
    novas.length === 2 && novas.some(function(c){ return c.estilo === "fortaleza-humana"; }) &&
    novas.every(function(c){ return c.id > 2; }));
  const porta = m.pecas.find(function(p){ return p.tipo === "porta" && p.x > 20; });
  check("o estilo que so uma peca tinha vai junto", porta && porta.campos && porta.campos.estilo === "pedra-vila");
}
/* o lote: nivela o chao, ergue a casa virada para o lado pedido, e um
   Ctrl+Z desfaz tudo */
{
  const O = require("../editor/operacoes.js"), Lo = require("../canteiro/lote.js");
  for (const frente of ["sul", "leste", "norte", "oeste"]){
    const m = M.novoMapa(40, 40, {nome: "lote", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
    m.altura[12*40 + 12] = 7; m.altura[14*40 + 11] = 5;           // chao torto dentro do lote
    const h = O.novoHistorico(), antes = M.escreverMapa(m);
    O.abrirAcao(h, "lote");
    const casa = Lo.erguerLote(h, m, 10, 10, 15, 16, {andares: 2, frente: frente, estilo: "pedra-vila", sacada: true});
    O.fecharAcao(h, m);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, zMin = 1e9;
    const est = Pc.estilosDasConstrucoes(m);
    for (const p of m.pecas){
      zMin = Math.min(zMin, p.z);
      for (const s of Pc.geometriaDaPeca(p, Pc.estiloDaPeca(p, est)).solidos) for (const q of s.pts){
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
      }
    }
    let plano = true;
    for (let y = 10; y <= 16; y++) for (let x = 10; x <= 15; x++) if (m.altura[y*40 + x] !== 7) plano = false;
    check("o lote de frente para " + frente + " cabe nele, com o chao nivelado no mais alto e a casa em cima",
      casa && x0 > 9.8 && y0 > 9.8 && x1 < 16.2 && y1 < 17.2 && plano && zMin === 7*m.passo,
      [x0, y0, x1, y1].map(function(v){ return v.toFixed(2); }).join(",") + " z " + zMin);
    O.desfazer(h, m);
    check("um Ctrl+Z desfaz o lote de " + frente + " inteiro, chao e casa", M.escreverMapa(m) === antes);
  }
}
/* o carimbo do macro leva a casa inteira: o chao, o relevo e as pecas,
   para um morro, girada -- e a casa colada e outra construcao */
{
  const O = require("../editor/operacoes.js"), Lo = require("../canteiro/lote.js");
  const m = M.novoMapa(60, 40, {nome: "carimbo", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
  for (let y = 0; y < 40; y++) for (let x = 36; x < 60; x++) m.altura[y*60 + x] = 12;   // o morro a leste
  const h = O.novoHistorico();
  O.abrirAcao(h, "lote");
  Lo.erguerLote(h, m, 10, 10, 15, 16, {andares: 2, frente: "sul", estilo: "pedra-vila", sacada: true});
  O.fecharAcao(h, m);
  m.coisas.push({x: 12, y: 12, tipo: "bau", texto: "", campos: {conteudo: "ouro:9"}});
  const nPecas = m.pecas.length, c = O.recortar(m, 9, 9, 16, 17);
  check("recortar leva as pecas da casa e o grupo dela", c.pecas.length === nPecas && c.grupos.length === 1 &&
    c.grupos[0].estilo === "pedra-vila" && c.coisas[0].campos.conteudo === "ouro:9");
  const girado = O.girarCarimbo(c);
  check("quatro giros voltam ao carimbo, com as pecas",
    JSON.stringify(O.girarCarimbo(O.girarCarimbo(O.girarCarimbo(girado)))) === JSON.stringify(c));
  const antes = M.escreverMapa(m);
  O.abrirAcao(h, "carimbo");
  O.carimbar(h, m, girado, 47, 20);
  O.fecharAcao(h, m);
  const novas = m.pecas.filter(function(p){ return p.x > 36; });
  const cons = m.construcoes.filter(function(k){ return novas.some(function(p){ return p.construcao === k.id; }); });
  let zMin = Infinity;
  for (const p of novas) zMin = Math.min(zMin, p.z);
  check("a casa carimbada no morro: as pecas todas, noutra construcao de pedra, no chao do morro",
    novas.length === nPecas && cons.length === 1 && cons[0].estilo === "pedra-vila" &&
    Math.abs(zMin - 12*m.passo) < 1e-6 && new Set(m.pecas.map(function(p){ return p.id; })).size === m.pecas.length,
    novas.length + " pecas, z " + zMin);
  const V = require("../canteiro/validacao.js");
  const r = V.validarConjunto([{nome: "c", mapa: m, conferir: true}], {completo: true}).filter(function(p){ return /pe.a/.test(p.msg); });
  check("a casa girada e colada nao tem peca solta nem enterrada", r.length === 0, r.map(V.textoDoProblema).join(" | "));
  check("o bau vai junto, com os campos", m.coisas.some(function(k){ return k.x > 36 && k.tipo === "bau" && k.campos && k.campos.conteudo === "ouro:9"; }));
  O.desfazer(h, m);
  check("um Ctrl+Z tira a casa carimbada inteira", M.escreverMapa(m) === antes);
}
/* o arquivo */
{
  const texto = Mo.modeloParaTexto(mod);
  const volta = Mo.modeloDeTexto(texto);
  check("o .modelo le de volta identico", volta.modelo && Mo.modeloParaTexto(volta.modelo) === texto, JSON.stringify(volta.erros));
  check("o .modelo e ASCII", !/[^\x00-\x7f]/.test(texto));
  const quebrado = Mo.modeloDeTexto("MODELO 1\np 1 parede x y z 0\n");
  check("modelo com numero estranho nao abre pela metade", !quebrado.modelo && quebrado.erros.length > 0);
}

fim();
