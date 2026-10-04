/* Testes dos estilos e do pintor de texturas.

   Puro: nao carrega o jogo. O pintor desenha sem canvas, entao a textura
   que sai aqui e a mesma que o jogo e o canteiro desenham.

   Uso: node mundo-perigoso/teste/estilos.test.js */
const E = require("../src/estilos.js");
const P = require("../src/pintor.js");
const Pc = require("../src/pecas.js");
const { placar } = require("./harness");
const { check, fim } = placar();

const ids = Object.keys(E.ESTILOS);

/* ---------- todo estilo esta completo ----------
   Material que falta cai em "parede" sem erro nenhum: o telhado sai de
   tabua e so se percebe olhando. Por isso a falta e erro aqui. */
for (const id of ids){
  const es = E.ESTILOS[id];
  const falta = E.MATERIAIS_DO_ESTILO.filter(function(m){ return !es.materiais[m]; });
  check("o estilo " + id + " tem todos os materiais", falta.length === 0, "falta " + falta.join(", "));
  const desenhoRuim = Object.keys(es.materiais).filter(function(m){
    return typeof P[es.materiais[m].desenho] !== "function";
  });
  check("toda receita de " + id + " usa um desenho que o pintor sabe", desenhoRuim.length === 0,
    desenhoRuim.join(", "));
  const f = es.forma || {};
  check("o estilo " + id + " diz a forma: alto, larg, fundo, comp, degrau",
    ["alto", "larg", "fundo", "comp", "degrau"].every(function(k){ return typeof f[k] === "number" && f[k] > 0; }));
  check("o estilo " + id + " tem nome e categoria", !!es.nome && !!es.categoria);
}

/* casa e dungeon precisam de dois estilos para trocar a construcao de um
   para o outro -- e o que o "pronto" pede */
for (const cat of ["casa", "dungeon", "infra"]){
  const n = ids.filter(function(id){ return E.ESTILOS[id].categoria === cat; }).length;
  check("a categoria " + cat + " tem pelo menos dois estilos", n >= 2, n + " estilos");
}

/* ---------- a textura ---------- */
{
  const def = E.ESTILOS["pedra-vila"].materiais.parede;
  const a = P[def.desenho](def.cor, Object.assign({semente: "pedra-vila:parede"}, def));
  const b = P[def.desenho](def.cor, Object.assign({semente: "pedra-vila:parede"}, def));
  check("o pintor e deterministico: a mesma semente da o mesmo desenho",
    a.px.length === P.TS*P.TS && P.TS === 128 && a.px.every(function(v, i){ return v === b.px[i]; }));
  const c = P[def.desenho](def.cor, Object.assign({semente: "outra"}, def));
  check("semente diferente da desenho diferente", c.px.some(function(v, i){ return v !== a.px[i]; }));
  check("o pintor so pinta cor opaca", a.px.every(function(v){ return (v >>> 24) === 255; }));
}
{
  const n0 = E.texturasDeEstiloFeitas();
  const t1 = E.texturaDoEstilo("madeira-pescador", "telha", 0);
  const t2 = E.texturaDoEstilo("madeira-pescador", "telha", 0);
  check("a textura e desenhada uma vez so e depois reaproveitada",
    t1 === t2 && E.texturasDeEstiloFeitas() === n0 + 1);
  const n = E.texturaDoEstilo("madeira-pescador", "telha", 0xFF8AAAC8);
  check("a mesma textura com outra nevoa e outra tabela de cor, com o mesmo desenho",
    n !== t1 && n.cm !== t1.cm && n.px.every(function(v, i){ return v === t1.px[i]; }));
  check("a textura sai no formato do motor: indices e COLORMAP de 128 por 128 (o mundo desde 1/10), com o mip",
    t1.w === 128 && t1.h === 128 && t1.px.length === 128*128 && !!t1.cm && t1.mips && t1.mips.length === 4);
  const madeira = E.texturaDoEstilo("madeira-pescador", "parede", 0);
  const pedra = E.texturaDoEstilo("pedra-vila", "parede", 0);
  check("estilos diferentes, paredes diferentes", madeira !== pedra);
  const inventado = E.texturaDoEstilo("estilo-que-nao-existe", "parede", 0);
  check("estilo desconhecido cai no padrao em vez de quebrar",
    inventado.px.every(function(v, i){ return v === madeira.px[i]; }));
}

/* ---------- a peca e o estilo ---------- */
{
  const cons = Pc.estilosDasConstrucoes({construcoes: [{id: 3, estilo: "pedra-vila"}]});
  check("o estilo da construcao vale mais que o da peca",
    Pc.estiloDaPeca({construcao: 3, estilo: "madeira-pescador"}, cons) === "pedra-vila");
  check("peca lida do arquivo, sem estilo, usa o da construcao",
    Pc.estiloDaPeca({construcao: 3, estilo: null}, cons) === "pedra-vila");
  check("peca de construcao que nao existe fica com o dela",
    Pc.estiloDaPeca({construcao: 9, estilo: "caverna"}, cons) === "caverna");
}
check("a peca com estilo desconhecido usa o padrao",
  Pc.estiloDaPeca({estilo: "nao-existe"}) === "madeira-pescador" &&
  Pc.estiloDaPeca({estilo: "pedra-vila"}) === "pedra-vila");
{
  /* o estilo muda a forma: a parede da fortaleza e mais alta que a da casa */
  const casa = Pc.geometriaDaPeca({tipo: "parede", estilo: "pedra-vila", x: 0, y: 0, z: 0, giro: 0});
  const forte = Pc.geometriaDaPeca({tipo: "parede", estilo: "fortaleza-humana", x: 0, y: 0, z: 0, giro: 0});
  check("o estilo muda a forma: a muralha e mais alta que a parede de casa",
    forte.solidos[0].z1 > casa.solidos[0].z1, casa.solidos[0].z1 + " x " + forte.solidos[0].z1);
}
/* todo material que um tipo pede existe em todo estilo */
{
  const pedidos = new Set();
  for (const t in Pc.TIPOS_DE_PECA){
    const g = Pc.geometriaDaPeca({tipo: t, estilo: "madeira-pescador", x: 0, y: 0, z: 0, giro: 0});
    for (const f of g.faces) pedidos.add(f.mat);
  }
  const fora = [...pedidos].filter(function(m){ return E.MATERIAIS_DO_ESTILO.indexOf(m) < 0 && !E.MATERIAIS_UNIVERSAIS[m] && !E.MATERIAIS_DERIVADOS[m]; });
  check("os tipos de peca so pedem materiais que todo estilo tem, ou os universais", fora.length === 0, fora.join(", "));
  const chama1 = E.texturaDoEstilo("madeira-pescador", "chama", 0), chama2 = E.texturaDoEstilo("cripta-pedra", "chama", 0);
  check("a chama e a mesma em todo estilo", chama1 === chama2);
}

fim();
