/* Testes do canteiro -- o micro, a parte que constroi dentro do mapa.

   O micro roda com o motor do jogo, entao o teste carrega o jogo montado no
   harness e roda canteiro/micro.js DENTRO do mesmo contexto, com a mesma
   fisica e a mesma geometria. O que ele nao carrega e a pagina: o painel, os
   botoes e o laco ficam para o olho.

   Uso: node mundo-perigoso/teste/canteiro.test.js [caminho-do-html] */
const path = require("path");
const M = require("../src/mapa.js");
const O = require("../editor/operacoes.js");
const Pc = require("../src/pecas.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const perto = (a, b, tol) => Math.abs(a - b) < (tol === undefined ? 1e-6 : tol);

/* o canteiro roda com o motor e com as operacoes do editor por cima */
const { D, S, avaliar, frames } = carregar(arquivo, {
  busca: "?mapa=cripta",
  extras: [path.join(__dirname, "..", "editor", "operacoes.js"),
           path.join(__dirname, "..", "canteiro", "modelo.js"),
           path.join(__dirname, "..", "canteiro", "micro.js")]
});
/* o que micro.js declarou com const nao vira propriedade do global: pega-se
   por uma expressao no mesmo contexto */
const X = avaliar("({MICRO, porPeca, tirarPeca, conferirPeca, passoDoMicro, teclasMicro, lugarDaPeca, pecaNaMira, garantirConstrucao, encaixar, pegarDaMira, estiloNaPeca, " +
  "marcarCanto, selecionadas, copiarSelecao, apagarSelecao, comecarAColar, colarAqui, girarModelo, descerEmpena, abrirNaMira})");
check("o micro roda com o motor do jogo", !!X.MICRO && typeof X.porPeca === "function");

/* um mapa plano, como o "Novo" da ferramenta */
function mapaPlano(){
  const m = M.novoMapa(48, 48, {nome: "canteiro", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
  m.coisas.push({x: 24, y: 24, tipo: "jogador", texto: ""});
  return m;
}
const mapa = mapaPlano();
const hist = O.novoHistorico();
/* a ponte entre o micro e a ferramenta: uma acao que entra no historico */
S.acaoDoCanteiro = function(nome, fn){
  O.abrirAcao(hist, nome);
  fn(mapa, hist);
  const mudou = O.fecharAcao(hist, mapa);
  if (mudou) D.montarPecas();
  return mudou;
};
S.marcarPecas = O.marcarPecas;
D.trocarMundo("?mapa=canteiro", mapa);
X.MICRO.mapa = mapa;
D.G.mode = "play";
D.P.god = true;
frames(2);

function olharPara(x, y, z, ang, pitch){
  D.P.x = x; D.P.y = y; D.P.z = z; D.P.ang = ang; D.P.pitch = pitch;
  D.P.vx = D.P.vy = D.P.vz = 0;
  D.setCamera(0);
  X.passoDoMicro(1/60);
}

/* ---------- a mira e a grade ---------- */
olharPara(24.5, 28.5, 1.0, -Math.PI/2, -0.25);
check("a mira acha o chao a frente e prende na grade",
  X.MICRO.alvo && perto(X.MICRO.alvo.x % 0.25, 0) && perto(X.MICRO.alvo.y % 0.25, 0) &&
  X.MICRO.alvo.y < 28.5 && X.MICRO.alvo.y > 24 && perto(X.MICRO.alvo.z, 1.0),
  JSON.stringify(X.MICRO.alvo));
check("o fantasma cabe no chao vazio", X.MICRO.alvo.ok === true, X.MICRO.alvo.porque);

X.MICRO.grade = 1;
olharPara(24.5, 28.5, 1.0, -Math.PI/2, -0.25);
check("a grade de um tile prende no tile inteiro",
  perto(X.MICRO.alvo.x % 1, 0) && perto(X.MICRO.alvo.y % 1, 0), JSON.stringify(X.MICRO.alvo));
X.MICRO.grade = 0.25;

/* ---------- por, tirar, desfazer ---------- */
X.MICRO.tipo = "parede"; X.MICRO.giro = 0; X.MICRO.espelho = 0; X.MICRO.construcao = 1;
olharPara(24.5, 28.5, 1.0, -Math.PI/2, -0.25);
const onde = Object.assign({}, X.MICRO.alvo);
X.porPeca();
check("por peca poe no mapa e na construcao", mapa.pecas.length === 1 &&
  mapa.pecas[0].tipo === "parede" && perto(mapa.pecas[0].x, onde.x) && mapa.construcoes.length === 1,
  JSON.stringify(mapa.pecas[0]));
check("a peca posta vira solido na hora", D.SOLIDOS.lista.length > 0, D.SOLIDOS.lista.length + " solidos");
check("a parede posta barra quem anda",
  D.blocked(onde.x + 0.5, onde.y, 0.26, 1.0, 0.85) === true);

/* a segunda parede encosta na primeira, mirando a face dela */
olharPara(onde.x + 0.5, onde.y + 2.5, 1.0, -Math.PI/2, 0);
check("mirando a parede, o fantasma encosta na face e nao entra nela",
  X.MICRO.alvo && X.MICRO.alvo.ok === true && X.MICRO.alvo.y > onde.y,
  JSON.stringify(X.MICRO.alvo));

const antes = mapa.pecas.length;
X.porPeca();
check("a peca encostada entra", mapa.pecas.length === antes + 1);

olharPara(onde.x + 0.5, onde.y + 2.5, 1.0, -Math.PI/2, 0);
X.tirarPeca();
check("tirar peca tira a que esta na mira", mapa.pecas.length === antes, mapa.pecas.length + " pecas");

O.desfazer(hist, mapa); D.montarPecas();
check("desfazer devolve a peca tirada", mapa.pecas.length === antes + 1);
O.refazer(hist, mapa); D.montarPecas();
check("refazer tira de novo", mapa.pecas.length === antes);
while (O.desfazer(hist, mapa)) D.montarPecas();
check("desfazer ate o fim deixa o mapa como era", mapa.pecas.length === 0 && D.SOLIDOS.lista.length === 0);

/* ---------- nao cabe, e por que ---------- */
X.MICRO.tipo = "parede";
olharPara(24.5, 28.5, 1.0, -Math.PI/2, -0.25);
X.porPeca();
const p0 = mapa.pecas[0];
/* a mesma peca no mesmo lugar */
X.MICRO.alvo = {x: p0.x, y: p0.y, z: p0.z, ok: true, porque: ""};
const r = X.conferirPeca({tipo: "parede", estilo: "madeira-pescador", construcao: 1,
                          x: p0.x, y: p0.y, z: p0.z, giro: 0, espelho: 0});
check("peca dentro de outra nao cabe, e diz por que",
  r.ok === false && /dentro de outra/.test(r.porque), JSON.stringify(r));
const fora = X.conferirPeca({tipo: "parede", estilo: "madeira-pescador", construcao: 1,
                             x: 47.5, y: 47.9, z: 1, giro: 0, espelho: 0});
check("peca que sai do mapa nao cabe", fora.ok === false && /fora do mapa/.test(fora.porque));
const noAr = X.conferirPeca({tipo: "parede", estilo: "madeira-pescador", construcao: 1,
                             x: 30, y: 30, z: 6, giro: 0, espelho: 0});
check("peca no ar cabe, mas avisa que nao tem apoio",
  noAr.ok === true && /sem apoio/.test(noAr.porque), JSON.stringify(noAr));

/* ---------- dois andares, construidos daqui ---------- */
while (O.desfazer(hist, mapa)) D.montarPecas();
{
  const por = function(tipo, x, y, z, giro){
    S.acaoDoCanteiro("por peca", function(m, h){
      O.marcarPecas(h, m);
      m.pecas.push({tipo: tipo, estilo: "madeira-pescador", construcao: 1, x: x, y: y, z: z, giro: giro || 0, espelho: 0});
    });
  };
  const Z = 1.0, A = Pc.ANDAR;
  for (let i = 0; i < 3; i++){
    por("parede", 20 + i, 20, Z, 0); por("parede", 20 + i, 23, Z, 0);
    por("parede", 20, 20 + i, Z, 90); por("parede", 23, 20 + i, Z, 90);
  }
  /* o vao da laje cobre o lance inteiro da escada: com vao so no topo, a
     cabeca bate no forro na metade da subida */
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (!(i >= 1 && j === 2)) por("laje", 20 + i, 20 + j, Z + A, 0);
  por("escada", 20.5, 22, Z, 0);        // sobe para leste, ate o vao da laje em (22,22)
  check("a casa de dois andares entrou", mapa.pecas.length === 12 + 7 + 1, mapa.pecas.length + " pecas");
  check("no terreo o chao e o terreno", perto(D.groundUnder(21.5, 21.5, 0.26, Z), Z));
  check("no andar de cima o chao e a laje", perto(D.groundUnder(21.5, 21.5, 0.26, Z + A), Z + A));
  check("de baixo, a laje e o teto", perto(D.ceilingOver(21.5, 21.5, 0.26, Z), Z + A - 0.125));
  /* subir a escada andando, com a fisica do jogo */
  X.MICRO.voando = false;
  D.P.x = 20.6; D.P.y = 22.5; D.P.z = Z; D.P.ang = 0; D.P.vx = D.P.vy = D.P.vz = 0;
  D.setCamera(0); X.passoDoMicro(1/60);
  X.teclasMicro["w"] = true;
  for (let i = 0; i < 60; i++){ D.setCamera(0); X.passoDoMicro(1/60); }
  X.teclasMicro["w"] = false;
  check("da para subir a escada andando, dentro da casa construida",
    D.P.z > Z + 1.2, "z=" + D.P.z.toFixed(2));
}

/* ---------- trocar o estilo da construcao ---------- */
{
  /* o que conta e o que o motor desenha: as texturas nas faces dos pedacos */
  const parede = function(id){ return D.texturaDoEstilo(id, "parede", D.HORIZONTE); };
  const usa = function(t){ D.remontarSujos(); return D.PEDACOS.some(function(P){ return P.faces.some(function(f){ return f.tex === t; }); }); };
  const antes = [usa(parede("madeira-pescador")), usa(parede("pedra-vila"))];
  /* o estilo mora na construcao: muda uma linha, e a casa inteira muda */
  S.acaoDoCanteiro("trocar o estilo", function(m, h){
    O.marcarPecas(h, m);
    X.garantirConstrucao(m, 1, "madeira-pescador").estilo = "pedra-vila";
    for (const p of m.pecas) delete p.estilo;
  });
  const depois = [usa(parede("madeira-pescador")), usa(parede("pedra-vila"))];
  check("trocar o estilo troca a textura de todas as pecas",
    antes[0] && !antes[1] && !depois[0] && depois[1], JSON.stringify([antes, depois]));
  check("e a forma continua a mesma: ainda se sobe a escada",
    perto(D.groundUnder(21.5, 21.5, 0.26, 1 + Pc.ANDAR), 1 + Pc.ANDAR));
  O.desfazer(hist, mapa); D.montarPecas();
  check("desfazer devolve o estilo de antes",
    usa(parede("madeira-pescador")) && !usa(parede("pedra-vila")));
}

/* ---------- id de peca, desfazer pela diferenca, motor peca a peca ---------- */
{
  const ids = mapa.pecas.map(function(p){ return p.id; });
  check("toda peca tem id, e nenhum se repete",
    ids.every(function(id){ return id > 0; }) && new Set(ids).size === ids.length, JSON.stringify(ids));
  /* por uma peca longe da casa */
  D.remontarSujos();
  const montadosAntes = D.PEDACOS_MONTADOS;
  S.acaoDoCanteiro("por peca", function(m, h){
    O.marcarPecas(h, m);
    m.pecas.push({tipo: "pilar", construcao: 2, x: 40, y: 40, z: 1, giro: 0, espelho: 0});
  });
  const reg = O.ultimoRegistro(hist);
  check("o historico guarda so a peca que entrou, nao a lista inteira",
    reg.pecas && reg.pecas.depois.length === 1 && reg.pecas.antes.length === 0,
    reg.pecas ? reg.pecas.antes.length + " antes, " + reg.pecas.depois.length + " depois" : "sem registro");
  const nova = mapa.pecas[mapa.pecas.length - 1];
  check("a peca nova ganha o proximo id", nova.id === Math.max.apply(null, ids) + 1, "id " + nova.id);
  D.remontarSujos();
  check("por uma peca longe so remonta o pedaco dela", D.PEDACOS_MONTADOS - montadosAntes === 1,
    (D.PEDACOS_MONTADOS - montadosAntes) + " pedacos remontados");
  /* mudar uma peca de lugar: o registro guarda ela antes e depois */
  S.acaoDoCanteiro("mover", function(m, h){
    O.marcarPecas(h, m);
    m.pecas[m.pecas.length - 1].x = 41;
  });
  const mov = O.ultimoRegistro(hist);
  check("mover uma peca guarda so ela, como era e como ficou",
    mov.pecas.antes.length === 1 && mov.pecas.depois.length === 1 &&
    mov.pecas.antes[0].x === 40 && mov.pecas.depois[0].x === 41);
  O.desfazer(hist, mapa); D.montarPecas();
  check("desfazer o movimento volta a peca, com o mesmo id",
    mapa.pecas.some(function(p){ return p.id === nova.id && p.x === 40; }));
  O.desfazer(hist, mapa); D.montarPecas();
  check("desfazer o por tira a peca e deixa as outras com os mesmos ids",
    JSON.stringify(mapa.pecas.map(function(p){ return p.id; })) === JSON.stringify(ids));
  /* a mira devolve o id, e tirar tira a peca certa */
  X.MICRO.voando = true;
  olharPara(21.5, 24.5, 1.6, -Math.PI/2, 0);
  const naMira = X.pecaNaMira();
  const alvo = mapa.pecas.find(function(p){ return p.id === naMira; });
  check("a mira devolve o id da peca que ela ve", !!alvo, "id " + naMira);
  X.tirarPeca();
  check("tirar peca tira a peca daquele id, e so ela",
    mapa.pecas.length === ids.length - 1 && !mapa.pecas.some(function(p){ return p.id === naMira; }));
  O.desfazer(hist, mapa); D.montarPecas();
}

/* ---------- o encaixe, o conta-gotas, o estilo de uma peca, o giro ---------- */
{
  const por = function(p){
    S.acaoDoCanteiro("por peca", function(m, h){
      O.marcarPecas(h, m);
      m.pecas.push(Object.assign({estilo: "madeira-pescador", construcao: 5, giro: 0, espelho: 0}, p));
    });
  };
  por({tipo: "parede", x: 36, y: 36, z: 1});
  /* a segunda parede, girada para fechar a quina, posta um pouco fora do lugar */
  const quina = {tipo: "parede", estilo: "madeira-pescador", construcao: 5, x: 37.25, y: 35.9, z: 1, giro: 90, espelho: 0};
  const e1 = X.encaixar(quina);
  check("o encaixe cola a ponta da parede nova na ponta da outra, fechando a quina",
    e1 && perto(quina.x + e1.dx, 37) && perto(quina.y + e1.dy, 36) && perto(quina.z + e1.dz, 1), JSON.stringify(e1));
  const cima = {tipo: "parede", estilo: "madeira-pescador", construcao: 5, x: 36.1, y: 36, z: 2.25, giro: 0, espelho: 0};
  const e2 = X.encaixar(cima);
  check("e a parede de cima senta no alto da de baixo",
    e2 && perto(cima.z + e2.dz, 1 + Pc.ANDAR) && perto(cima.x + e2.dx, 36), JSON.stringify(e2));
  const longe = {tipo: "parede", estilo: "madeira-pescador", construcao: 5, x: 39, y: 39, z: 1, giro: 0, espelho: 0};
  check("longe de tudo nao encaixa em nada", X.encaixar(longe) === null);
  const escada = {tipo: "escada", estilo: "madeira-pescador", construcao: 5, x: 30, y: 36.1, z: 1 - Pc.ANDAR + 0.1, giro: 0, espelho: 0};
  por({tipo: "laje", x: 31.5, y: 36, z: 1});
  const e3 = X.encaixar(escada);
  check("o alto da escada encaixa no meio da borda da laje",
    e3 && perto(escada.x + e3.dx + 1.5, 31.5) && perto(escada.z + e3.dz + Pc.ANDAR, 1), JSON.stringify(e3));

  /* o conta-gotas pega a peca da mira */
  X.MICRO.voando = true;
  X.MICRO.tipo = "pilar"; X.MICRO.giro = 0;
  olharPara(36.5, 38.5, 1.6, -Math.PI/2, 0);
  const pega = X.pegarDaMira();
  check("o conta-gotas pega o tipo, o giro e a construcao da peca da mira",
    pega && X.MICRO.tipo === "parede" && X.MICRO.construcao === 5, pega ? pega.tipo : "nada");

  /* V: o estilo so naquela peca, num campo que vai e volta pelo arquivo */
  X.MICRO.estilo = "pedra-vila";
  olharPara(36.5, 38.5, 1.6, -Math.PI/2, 0);
  const antes = mapa.pecas.length;
  X.estiloNaPeca();
  const p = mapa.pecas.find(function(k){ return k.x === 36 && k.y === 36 && k.tipo === "parede"; });
  check("V poe o estilo so na peca da mira, num campo dela",
    p && p.campos && p.campos.estilo === "pedra-vila" && mapa.pecas.length === antes);
  const parede = function(id){ return D.texturaDoEstilo(id, "parede", D.HORIZONTE); };
  D.remontarSujos();
  const usa = function(tex){ return D.PEDACOS.some(function(P){ return P.faces.some(function(f){ return f.tex === tex; }); }); };
  check("e o motor desenha aquela peca de pedra, e as outras da casa de madeira",
    usa(parede("pedra-vila")) && usa(parede("madeira-pescador")));
  const volta = M.lerMapa(M.escreverMapa(mapa)).mapa;
  const pv = volta.pecas.find(function(k){ return k.x === 36 && k.y === 36 && k.tipo === "parede"; });
  check("o estilo da peca vai e volta pelo arquivo", pv && Pc.estiloDaPeca(pv, Pc.estilosDasConstrucoes(volta)) === "pedra-vila");
  X.MICRO.estilo = "madeira-pescador";

  /* o giro de 45 so vale para o tipo que aceita */
  const d45 = X.conferirPeca({tipo: "parede", estilo: "madeira-pescador", construcao: 5, x: 42, y: 42, z: 1, giro: 45, espelho: 0});
  const l45 = X.conferirPeca({tipo: "laje", estilo: "madeira-pescador", construcao: 5, x: 42, y: 42, z: 1, giro: 45, espelho: 0});
  check("a parede gira de 45 e a laje nao", d45.ok && !l45.ok && /90 em 90/.test(l45.porque), l45.porque);
  while (mapa.pecas.some(function(k){ return k.construcao === 5; })) O.desfazer(hist, mapa);
  D.montarPecas();
}

/* ---------- a selecao em caixa, copiar, colar girado, apagar ---------- */
{
  const por = function(p){
    S.acaoDoCanteiro("por peca", function(m, h){
      O.marcarPecas(h, m);
      m.pecas.push(Object.assign({construcao: 7, giro: 0, espelho: 0}, p));
    });
  };
  S.acaoDoCanteiro("casa", function(m, h){ O.marcarPecas(h, m); X.garantirConstrucao(m, 7, "pedra-vila"); });
  por({tipo: "parede", x: 30, y: 30, z: 1}); por({tipo: "parede-porta", x: 31, y: 30, z: 1});
  por({tipo: "parede", x: 30, y: 30, z: 1, giro: 90}); por({tipo: "escada", x: 30.5, y: 31, z: 1});
  const doMapa = mapa.pecas.length;
  /* B no canto de baixo, B no de cima: a caixa */
  X.MICRO.selecao = null; X.MICRO.cantoA = null;
  X.MICRO.alvo = {x: 29.5, y: 29.5, z: 1, ok: true, porque: ""}; X.marcarCanto();
  X.MICRO.alvo = {x: 32.5, y: 32.5, z: 1, ok: true, porque: ""}; X.marcarCanto();
  check("B e B marcam a caixa, que pega a casinha inteira", X.selecionadas().length === 4, X.selecionadas().length + " pecas");
  check("copiar a selecao guarda o modelo com o estilo da casa",
    X.copiarSelecao(false) && X.MICRO.prancheta.pecas.length === 4 && X.MICRO.prancheta.grupos[0].estilo === "pedra-vila");
  /* colar girada um quarto de volta, noutro lugar */
  X.comecarAColar();
  X.MICRO.colando = X.girarModelo(X.MICRO.colando, 1);
  X.MICRO.alvo = {x: 38, y: 38, z: 1, ok: true, porque: ""};
  const colou = X.colarAqui();
  check("colar poe a casinha inteira, girada, numa construcao nova de pedra",
    colou && mapa.pecas.length === doMapa + 4 &&
    mapa.construcoes.some(function(c){ return c.id !== 7 && c.estilo === "pedra-vila"; }), mapa.pecas.length + " pecas");
  const colada = mapa.pecas.slice(doMapa);
  check("a colada gira junto: a parede que corria para leste corre para o sul",
    colada.some(function(p){ return p.tipo === "parede-porta" && p.giro === 90; }));
  O.desfazer(hist, mapa); D.montarPecas();
  check("um Ctrl+Z desfaz a colagem inteira", mapa.pecas.length === doMapa);
  X.MICRO.colando = null;
  check("Delete apaga o que esta na caixa, num Ctrl+Z so", X.apagarSelecao() && mapa.pecas.length === doMapa - 4);
  O.desfazer(hist, mapa); D.montarPecas();
  check("e desfazer devolve as quatro", mapa.pecas.length === doMapa);
  while (mapa.pecas.some(function(k){ return k.construcao === 7; }) || mapa.construcoes.some(function(c){ return c.id === 7; })) O.desfazer(hist, mapa);
  D.montarPecas();
}

/* ---------- o mapa com pecas vai e volta pelo arquivo ---------- */
{
  const texto = M.escreverMapa(mapa);
  const volta = M.lerMapa(texto);
  check("o mapa construido no micro escreve e le de volta igual",
    volta.mapa && M.escreverMapa(volta.mapa) === texto && volta.mapa.pecas.length === mapa.pecas.length,
    (volta.mapa ? volta.mapa.pecas.length : "erro") + " pecas");
}


/* ---------- trocar a parede por janela e porta; a folha no batente; a
   empena que desce ate a parede ---------- */
while (O.desfazer(hist, mapa)) D.montarPecas();
{
  const por = function(tipo, x, y, z, giro){
    S.acaoDoCanteiro("por peca", function(m, h){
      O.marcarPecas(h, m);
      m.pecas.push({tipo: tipo, construcao: 1, x: x, y: y, z: z, giro: giro || 0, espelho: 0});
    });
  };
  por("parede", 30, 30, 1, 0);
  const parede = mapa.pecas[0];
  X.MICRO.tipo = "parede-janela"; X.MICRO.giro = 0; X.MICRO.encaixar = true;
  olharPara(30.5, 32.5, 1.6, -Math.PI/2, -0.05);
  check("com a janela na mao, mirar na parede e trocar", X.MICRO.alvo && X.MICRO.alvo.troca === parede.id && X.MICRO.alvo.ok,
    JSON.stringify(X.MICRO.alvo));
  const n = mapa.pecas.length, desfeitas = hist.feitas.length;
  X.porPeca();
  check("a troca poe a janela no lugar da parede, na mesma peca", mapa.pecas.length === n &&
    mapa.pecas[0].tipo === "parede-janela" && mapa.pecas[0].id === parede.id && mapa.pecas[0].x === 30 && mapa.pecas[0].y === 30);
  check("e e um Ctrl+Z so", hist.feitas.length === desfeitas + 1);
  O.desfazer(hist, mapa); D.montarPecas();
  check("desfeita, a parede volta", mapa.pecas[0].tipo === "parede");
  X.MICRO.tipo = "parede-porta";
  olharPara(30.5, 32.5, 1.6, -Math.PI/2, -0.05);
  X.porPeca();
  check("a porta tambem entra no lugar da parede", mapa.pecas[0].tipo === "parede-porta");
  /* U abre a porta na mira, e fecha de novo: fica no mapa, um Ctrl+Z cada */
  olharPara(30.5, 32.5, 1.6, -Math.PI/2, -0.05);
  const antesDeAbrir = hist.feitas.length;
  X.abrirNaMira();
  check("U abre a porta na mira", Pc.pecaAberta(mapa.pecas[0]) && hist.feitas.length === antesDeAbrir + 1, JSON.stringify(mapa.pecas[0].campos));
  olharPara(30.5, 32.5, 1.6, -Math.PI/2, -0.05);
  X.abrirNaMira();
  check("e mirando no vao aberto, U fecha", !Pc.pecaAberta(mapa.pecas[0]) && !mapa.pecas[0].campos);
  O.desfazer(hist, mapa); D.montarPecas();
  check("desfeito, ela volta aberta", Pc.pecaAberta(mapa.pecas[0]));
  O.desfazer(hist, mapa); D.montarPecas();
  X.MICRO.tipo = "arco";
  olharPara(30.5, 32.5, 1.6, -Math.PI/2, -0.05);
  X.porPeca();
  check("o arco entra no lugar da porta", mapa.pecas[0].tipo === "arco");
  X.MICRO.tipo = "mesa";
  olharPara(30.5, 32.5, 1.6, -Math.PI/2, -0.05);
  check("peca de outra familia nao troca", !X.MICRO.alvo || !X.MICRO.alvo.troca);
  /* a folha de porta solta encaixa no batente do arco */
  X.MICRO.tipo = "porta"; X.MICRO.giro = 0;
  olharPara(30.2, 31.1, 1.6, -Math.PI/2, -0.9);
  check("a folha de porta encaixa no batente do arco, e cabe nele", X.MICRO.alvo && /folha na batente/.test(X.MICRO.alvo.encaixe) &&
    X.MICRO.alvo.ok && X.conferirPeca(Object.assign({tipo: "porta", giro: 0, espelho: 0}, X.MICRO.alvo)).porque === "" &&
    perto(X.MICRO.alvo.x, 30 + (1 - Pc.PORTA_L)/2) && perto(X.MICRO.alvo.y, 30), JSON.stringify(X.MICRO.alvo));
  /* a empena posta no ar em cima da parede desce ate o alto dela */
  while (O.desfazer(hist, mapa)) D.montarPecas();
  por("parede", 34, 30, 1, 0);
  X.MICRO.tipo = "telhado-empena"; X.MICRO.giro = 0; X.MICRO.encaixar = false;
  X.MICRO.alvo = null;
  const inst = {tipo: "telhado-empena", x: 34, y: 30, z: 1 + Pc.ANDAR + 1, giro: 0};
  X.descerEmpena(inst);
  check("a empena no ar desce ate o alto da parede", inst.campos && inst.campos.base === "1", JSON.stringify(inst.campos));
  const solta = {tipo: "telhado-empena", x: 34, y: 30, z: 1 + Pc.ANDAR, giro: 0};
  X.descerEmpena(solta);
  check("e a que ja senta nela fica triangulo", !solta.campos);
  X.MICRO.encaixar = true;
  while (O.desfazer(hist, mapa)) D.montarPecas();
}

fim();
