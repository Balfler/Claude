/* Testes do conteudo do "pronto" do canteiro: a ilha de 650 com Pedra Alta,
   a fortaleza, a trilha da serra e a gruta (canteiro/bancada/pronto.js),
   como foram exportadas para mapas/.

   Uso: node mundo-perigoso/teste/pronto.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const Pc = require("../src/pecas.js");
const Cv = require("../src/conversa.js");
const V = require("../canteiro/validacao.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const ler = function(nome){ return fs.readFileSync(path.join(__dirname, "..", "mapas", nome + ".mapa"), "utf8"); };
const textoIlha = ler("ilha-650"), textoGruta = ler("gruta");
const ilha = M.lerMapa(textoIlha).mapa, gruta = M.lerMapa(textoGruta).mapa;

/* 1. o arquivo */
check("a ilha e a gruta leem e escrevem de volta identicas",
  ilha && gruta && M.escreverMapa(ilha) === textoIlha && M.escreverMapa(gruta) === textoGruta);
check("os dois arquivos sao ASCII", !/[^\x00-\x7f]/.test(textoIlha + textoGruta));

/* 2. a validacao sem motor: limpa, com o par da gruta conferido */
{
  const conj = [{nome: "ilha-650", mapa: ilha, conferir: true}, {nome: "gruta", mapa: gruta, conferir: true},
                {nome: "ilha", mapa: M.lerMapa(ler("ilha")).mapa, conferir: false}];
  const r = V.validarConjunto(conj, {completo: true});
  check("a validacao da ilha e da gruta nao tem erro nem aviso", r.length === 0, r.map(V.textoDoProblema).join(" | "));
  const entrada = ilha.coisas.find(function(c){ return c.tipo === "entrada"; });
  const saida = gruta.coisas.find(function(c){ return c.tipo === "saida"; });
  check("a boca da gruta e a saida dela sao um par, uma levando a outra",
    entrada && saida && entrada.campos.mapa === "gruta" && saida.campos.mapa === "ilha-650" && entrada.campos.id === saida.campos.id);
}

/* 3. o que o pronto pede */
{
  const cons = new Map();
  for (const c of ilha.construcoes) cons.set(c.id, c);
  const doTipo = function(t){ return ilha.pecas.filter(function(p){ return p.tipo === t; }); };
  const casas = new Set(ilha.pecas.filter(function(p){ return p.tipo === "parede-porta"; }).map(function(p){ return p.construcao; }));
  check("Pedra Alta tem cinco casas", casas.size === 5, casas.size + " casas");
  const sacada = doTipo("sacada").map(function(p){ return cons.get(p.construcao); });
  check("a casa de dois andares com sacada foi trocada para pedra, e a outra ficou de madeira",
    sacada.some(function(c){ return c.estilo === "pedra-vila"; }) && sacada.some(function(c){ return c.estilo === "madeira-pescador"; }),
    sacada.map(function(c){ return c.estilo; }).join(","));
  check("a fortaleza: muralha com adarve, portao, torre redonda e ponte levadica",
    doTipo("muralha-adarve").length >= 20 && doTipo("portao").length === 1 && doTipo("torre-redonda").length === 1 &&
    doTipo("ponte-levadica").length === 1 && doTipo("escada-muralha").length === 2 &&
    doTipo("muralha-adarve").every(function(p){ return cons.get(p.construcao).estilo === "fortaleza-humana"; }));
  check("a grade levadica esta erguida: o portao se passa", doTipo("grade-levadica").length === 1 && doTipo("grade-levadica")[0].campos.aberta === "1");
  const ponte = doTipo("ponte-levadica")[0];
  let fosso = 0;
  for (let x = Math.floor(ponte.x); x <= Math.floor(ponte.x + 1.4); x++)
    for (let y = Math.floor(ponte.y); y < Math.floor(ponte.y + 3); y++) if (M.TERRENOS[ilha.terreno[y*ilha.larg + x]].id === "funda") fosso++;
  check("a ponte levadica passa por cima do fosso", fosso >= 4, fosso + " tiles de fosso debaixo dela");
  check("a ponte de pedra do riacho tem dois arcos", doTipo("ponte-arco").length === 2 &&
    doTipo("ponte-arco").every(function(p){ return cons.get(p.construcao).estilo === "pedra-obra"; }));
  const moradores = ilha.coisas.filter(function(c){ return c.tipo === "npc"; });
  check("os sete moradores tem conversa propria", moradores.length === 7 &&
    moradores.every(function(c){ return Object.prototype.hasOwnProperty.call(Cv.MORADORES, Cv.chaveDoMorador(c.texto)); }));
  check("as regioes tem nome e cobrem a terra", ilha.regioes.length === 9 && ilha.regioes.every(function(r){ return r.nome; }) &&
    ilha.regiao[513*ilha.larg + 199] === ilha.regioes.find(function(r){ return r.nome === "Pedra Alta"; }).id);
  let encosta = 0;
  for (let i = 0; i < ilha.terreno.length; i++) if (M.TERRENOS[ilha.terreno[i]].id === "encosta") encosta++;
  check("a montanha virou encosta que se anda", encosta > 8000, encosta + " tiles");
  const estilos = new Set(gruta.construcoes.map(function(c){ return c.estilo; }));
  check("a gruta tem salas nos dois estilos de dungeon", estilos.has("cripta-pedra") && estilos.has("caverna"));
}

/* 4. com o motor: da praca se chega andando ao Bruno, no pico, e a boca da
   gruta -- e o caminho sobe a serra toda */
{
  const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
  const { D, avaliar } = carregar(arquivo, {busca: "?mapa=ilha-650",
    extras: [path.join(__dirname, "..", "src", "andar.js"), path.join(__dirname, "..", "canteiro", "alcance.js")]});
  check("o jogo abre na ilha de 650 pelo nome", D.nomeDoMapa() === "ilha-650");
  const medir = avaliar("medirAndando");
  const jog = ilha.coisas.find(function(c){ return c.tipo === "jogador"; });
  const bruno = ilha.coisas.find(function(c){ return /Bruno/.test(c.texto); });
  const boca = ilha.coisas.find(function(c){ return c.tipo === "entrada"; });
  const aoPico = medir(ilha, jog.x, jog.y, bruno.x, bruno.y + 1);
  check("da praca ao pico se chega andando, subindo a serra", aoPico.chega && aoPico.subiu >= 7,
    aoPico.chega ? aoPico.tiles.toFixed(0) + " tiles, subindo " + aoPico.subiu.toFixed(2) + " em " + aoPico.segundos.toFixed(0) + " s" : aoPico.porque);
  const aBoca = medir(ilha, jog.x, jog.y, boca.x - 1, boca.y);
  check("da praca se chega a boca da gruta", aBoca.chega, aBoca.porque || "");
}

fim();
