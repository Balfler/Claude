/* Testes da validacao do canteiro: primeiro a parte sem motor -- formato,
   ligacoes entre mapas, moradores e pecas --, depois a que pede o motor, o
   alcance andando e o custo do quadro.

   Uso: node mundo-perigoso/teste/validacao.test.js */
const M = require("../src/mapa.js");
const Pc = require("../src/pecas.js");
const O = require("../editor/operacoes.js");
const Lo = require("../canteiro/lote.js");
const V = require("../canteiro/validacao.js");
const { placar } = require("./harness");
const { check, fim } = placar();

const plano = function(nome){
  const m = M.novoMapa(40, 40, {nome: nome, terreno: M.TERRENO_POR_CHAR[","], altura: 4});
  m.coisas.push({x: 2, y: 2, tipo: "jogador", texto: ""});
  return m;
};
const so = function(m, nome){ return V.validarConjunto([{nome: nome || "a", mapa: m, conferir: true}], {completo: true}); };
const acha = function(lista, re){ return lista.find(function(p){ return re.test(p.msg); }); };
const textos = function(lista){ return lista.map(V.textoDoProblema).join(" | "); };

/* 1. o nome de mapa e o do ?mapa= do jogo */
check("o nome do mapa sai do arquivo", V.nomeDoMapa("Arte/ilha-650.mapa") === "ilha-650" &&
  V.nomeDoMapa("G:\\mapas\\Cripta.mapa") === "cripta");

/* 2. uma casa inteira do lote, nos dois estilos: nenhuma peca solta,
   repetida nem enterrada */
for (const estilo of ["madeira-pescador", "pedra-vila"]){
  const m = plano("casa"), h = O.novoHistorico();
  O.abrirAcao(h, "lote");
  Lo.erguerLote(h, m, 10, 10, 16, 17, {andares: 2, frente: "sul", estilo: estilo, sacada: true});
  O.fecharAcao(h, m);
  const r = so(m);
  check("a casa de dois andares em " + estilo + " sai sem problema de peca (" + m.pecas.length + " pecas)",
    m.pecas.length > 30 && r.length === 0, textos(r));
}

/* 3. a peca solta, a repetida e a enterrada */
{
  const m = plano("pecas"), h = O.novoHistorico();
  O.abrirAcao(h, "lote");
  Lo.erguerLote(h, m, 10, 10, 15, 16, {andares: 1, frente: "sul", estilo: "pedra-vila"});
  O.fecharAcao(h, m);
  const chao = 4*m.passo;
  m.pecas.push({tipo: "parede", x: 30, y: 30, z: chao + 2, giro: 0});
  m.pecas.push(Object.assign({}, m.pecas[0]));
  m.pecas.push({tipo: "barril", x: 25, y: 5, z: chao - 2, giro: 0});
  m.pecas.push({tipo: "parede", x: 30, y: 5, z: chao, giro: 0});        // no chao: nada
  Pc.garantirIdsDePeca(m.pecas);
  const r = so(m);
  const solta = acha(r, /solta no ar: parede/), rep = acha(r, /duas pe.as iguais/), ent = acha(r, /enterrada: barril/);
  check("a parede no ar e aviso de peca solta, no lugar dela", solta && solta.nivel === "aviso" && solta.x === 30 && solta.y === 30 &&
    solta.lugares[0].peca === m.pecas[m.pecas.length - 4].id, textos(r));
  check("a peca colada duas vezes no mesmo lugar e aviso", !!rep, textos(r));
  check("o barril debaixo do chao e peca enterrada", !!ent, textos(r));
  check("a parede de pe no chao nao e problema", r.length === 3, textos(r));
}
/* a casa inteira erguida por engano: um aviso so, com as pecas todas */
{
  const m = plano("no-ar"), h = O.novoHistorico();
  O.abrirAcao(h, "lote");
  Lo.erguerLote(h, m, 10, 10, 15, 16, {andares: 1, frente: "sul", estilo: "madeira-pescador"});
  O.fecharAcao(h, m);
  for (const p of m.pecas) p.z += 3;
  const r = so(m);
  check("a casa no ar e um aviso so, com as pecas dela", r.length === 1 && /pe.as soltas no ar/.test(r[0].msg) &&
    r[0].pecas.length === m.pecas.length, textos(r));
}
/* o lampiao no teto da gruta esta apoiado no teto */
{
  const m = plano("gruta");
  for (let y = 18; y < 24; y++) for (let x = 18; x < 24; x++) m.teto[y*40 + x] = 8;
  const alto = (4 + 8)*m.passo, g = Pc.geometriaDaPeca({tipo: "barril", x: 0, y: 0, z: 0, giro: 0}, "pedra-vila");
  let topo = 0;
  for (const f of g.faces) for (const q of f.pts) topo = Math.max(topo, q[2]);
  m.pecas.push({tipo: "barril", x: 20, y: 20, z: alto - topo, giro: 0, id: 1});
  check("a peca que encosta no teto nao esta solta", so(m).length === 0, textos(so(m)));
}

/* 4. as ligacoes: a entrada da ilha e a saida da dungeon, com o mesmo par */
function par(){
  const ilha = plano("ilha"), cova = plano("cova");
  ilha.coisas.push({x: 10, y: 10, tipo: "entrada", texto: "", campos: {mapa: "cova", id: "porao"}});
  cova.coisas.push({x: 5, y: 5, tipo: "saida", texto: "", campos: {mapa: "ilha", id: "porao"}});
  return {ilha: ilha, cova: cova, conj: [{nome: "ilha", mapa: ilha, conferir: true}, {nome: "cova", mapa: cova, conferir: true}]};
}
{
  const p = par();
  check("entrada e saida com o mesmo par, um mapa para o outro: nada", V.validarConjunto(p.conj, {completo: true}).length === 0,
    textos(V.validarConjunto(p.conj, {completo: true})));
  p.cova.coisas[1].campos.id = "outro";
  let r = V.validarConjunto(p.conj, {completo: true});
  check("a ponta que falta do outro lado e erro, nos dois mapas",
    r.filter(function(q){ return q.nivel === "erro" && /n.o h. a ponta/.test(q.msg); }).length === 2, textos(r));
  p.cova.coisas[1].campos.id = "porao"; p.cova.coisas[1].campos.mapa = "vila";
  r = V.validarConjunto(p.conj.concat([{nome: "vila", mapa: plano("vila"), conferir: false}]), {completo: true});
  check("a saida que volta para outro mapa e aviso, e a da vila sem a ponta e erro",
    acha(r, /volta para vila, n.o para ilha/) && acha(r, /leva a vila, e l. n.o h. a ponta porao/), textos(r));
}
{
  const p = par();
  p.ilha.coisas[1].campos.mapa = "sumiu";
  const completo = V.validarConjunto(p.conj, {completo: true}), aberto = V.validarConjunto(p.conj, {completo: false});
  check("o destino que nao existe e aviso: o jogo abre a cripta, e um par novo exporta um primeiro",
    acha(completo, /leva a sumiu, que n.o existe em mapas/).nivel === "aviso");
  check("sem todos os mapas, e aviso de que nao conferi", acha(aberto, /leva a sumiu, que n.o conferi/).nivel === "aviso");
  check("so o mapa de conferir e conferido", V.validarConjunto([{nome: "ilha", mapa: p.ilha, conferir: false}], {completo: true}).length === 0);
}
{
  const m = plano("ilha");
  m.coisas.push({x: 10, y: 10, tipo: "entrada", texto: "", campos: {mapa: "cripta"}});
  check("a entrada da cripta, que mora no codigo, nao e problema", so(m, "ilha").length === 0, textos(so(m, "ilha")));
  m.coisas[1].campos.id = "x";
  check("a cripta nao tem ponta com id: aviso", acha(so(m, "ilha"), /n.o tem ponta com id/).nivel === "aviso");
}

/* 5. a chave num bau de outro mapa vale */
{
  const p = par();
  p.ilha.coisas.push({x: 20, y: 20, tipo: "porta", texto: "", campos: {chave: "portao", fechada: "1"}});
  check("a porta sem bau com a chave, em mapa nenhum, e aviso", !!acha(V.validarConjunto(p.conj, {completo: true}), /pede a chave portao/));
  p.cova.coisas.push({x: 8, y: 8, tipo: "bau", texto: "", campos: {conteudo: "ouro:5,chave:portao"}});
  check("com a chave num bau da dungeon, nada", V.validarConjunto(p.conj, {completo: true}).length === 0,
    textos(V.validarConjunto(p.conj, {completo: true})));
}

/* 6. o morador tem conversa */
{
  const m = plano("vila");
  m.coisas.push({x: 5, y: 5, tipo: "npc", texto: "Irm\u00e3 Clarice"});
  m.coisas.push({x: 6, y: 5, tipo: "npc", texto: "Josias, o barqueiro"});
  check("morador conhecido, com o oficio ou o titulo no nome, nao e problema", so(m).length === 0, textos(so(m)));
  m.coisas.push({x: 7, y: 5, tipo: "npc", texto: "Ze Ninguem"});
  const r = so(m);
  check("o morador sem conversa e aviso", r.length === 1 && r[0].nivel === "aviso" && /Ze Ninguem n.o tem conversa/.test(r[0].msg), textos(r));
}

/* 7. o mesmo problema em muitos tiles vira um, com os lugares; erro antes */
{
  const m = plano("praia");
  m.mar = 6;
  m.coisas = [];
  const r = so(m);
  check("o chao todo abaixo do mar e um aviso so, com os lugares todos",
    r.length === 2 && r[1].vezes === 1600 && r[1].lugares.length === 400 && r[1].nivel === "aviso", textos(r));
  check("o erro vem antes do aviso", r[0].nivel === "erro" && /falta o in.cio/.test(r[0].msg));
  const n = V.contarNiveis(r);
  check("a conta de niveis soma os lugares", n.erros === 1 && n.avisos === 1600);
}

/* 8. o cache de caixas: peca que nao mudou nao refaz a geometria */
{
  const m = plano("cache"), cache = new Map();
  m.pecas.push({tipo: "parede", x: 5, y: 5, z: 1, giro: 0, id: 7});
  V.validarConjunto([{nome: "c", mapa: m, conferir: true}], {cache: cache});
  const antes = cache.get(7).caixa;
  V.validarConjunto([{nome: "c", mapa: m, conferir: true}], {cache: cache});
  const igual = cache.get(7).caixa === antes;
  m.pecas[0].z = 3;
  const r = V.validarConjunto([{nome: "c", mapa: m, conferir: true}], {cache: cache});
  check("o cache devolve a mesma caixa, e a peca mexida sai de novo", igual && cache.get(7).caixa !== antes && !!acha(r, /solta no ar/));
}

/* ---------- com o motor: o alcance e o quadro ----------
   O jogo montado no harness, com a grade de andar e o alcance.js por cima:
   a mesma fisica do jogo responde se se chega. */
{
  const path = require("path");
  const { carregar } = require("./harness");
  const arquivo = path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
  const { D, avaliar } = carregar(arquivo, {busca: "?mapa=cripta",
    extras: [path.join(__dirname, "..", "src", "andar.js"), path.join(__dirname, "..", "canteiro", "alcance.js")]});
  const conferir = avaliar(`(function(m, nome){
    const mundo = mundoDoMotor(), jog = m.coisas.find(function(c){ return c.tipo === "jogador"; });
    return comPortasAbertas(function(){
      const g = montarGradeDeAndar(mundo, m.larg, m.alt);
      const k = estadoDaGrade(g, jog.x + 0.5, jog.y + 0.5, floorAt(jog.x, jog.y), STEP);
      return problemasDoAlcance(m, nome, g, percorrerGrade(g, mundo, k));
    });
  })`);
  const abrir = function(m){ D.trocarMundo("?mapa=canteiro", m); D.G.mode = "play"; D.P.god = true; };
  /* a casa de dois andares do lote, com um morador dentro e um bau no andar
     de cima -- e a porta, que depois vira parede */
  const casa = function(){
    const m = M.novoMapa(40, 40, {nome: "vila", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
    m.coisas.push({x: 4, y: 4, tipo: "jogador", texto: ""});
    const h = O.novoHistorico();
    O.abrirAcao(h, "lote");
    Lo.erguerLote(h, m, 10, 10, 16, 17, {andares: 2, frente: "sul", estilo: "madeira-pescador", sacada: false});
    O.fecharAcao(h, m);
    m.coisas.push({x: 14, y: 15, tipo: "npc", texto: "Tobias"});
    m.coisas.push({x: 14, y: 13, tipo: "bau", texto: "", campos: {conteudo: "ouro:5", z: String(4*m.passo + Pc.ANDAR)}});
    return m;
  };
  {
    const m = casa();
    abrir(m);
    const r = conferir(m, "vila");
    check("a casa com porta e escada: o morador, o bau la em cima e a escada se alcancam", r.length === 0, textos(r));
  }
  {
    const m = casa();
    for (const p of m.pecas) if (p.tipo === "parede-porta") p.tipo = "parede";
    abrir(m);
    const r = conferir(m, "vila");
    const npc = acha(r, /morador Tobias: n.o se chega/), chao = acha(r, /de ch.o aonde n.o se chega/);
    check("a casa sem porta: o morador de dentro e erro", npc && npc.nivel === "erro" && npc.x === 14 && npc.y === 15, textos(r));
    check("e o chao de dentro e um pedaco ilhado, no lugar da casa",
      chao && chao.nivel === "aviso" && chao.x >= 10 && chao.x <= 16 && chao.y >= 10 && chao.y <= 17 && chao.lugares[0].tiles >= 20, textos(r));
    check("a escada de dentro nao e acusada: quem nao chega ao pe nao reclama do alto", !acha(r, /escada/), textos(r));
  }
  {
    const m = casa();
    m.coisas[2].campos.z = "5";                          // o bau num andar que nao existe
    abrir(m);
    const r = conferir(m, "vila");
    check("o bau na altura errada nao se alcanca, e e erro", !!acha(r, /ba.: n.o se chega/) && acha(r, /ba.: n.o se chega/).nivel === "erro", textos(r));
  }
  {
    const m = M.novoMapa(30, 30, {nome: "campo", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
    m.coisas.push({x: 4, y: 4, tipo: "jogador", texto: ""});
    m.pecas.push({tipo: "escada", x: 15, y: 15, z: 1, giro: 0, id: 1});
    abrir(m);
    const r = conferir(m, "campo");
    check("a escada no meio do campo sai onde nao se fica em pe", !!acha(r, /escada reta que sai onde n.o se fica/), textos(r));
    m.pecas.push({tipo: "laje", x: 16.5, y: 15, z: 2.5, giro: 0, id: 2});
    abrir(m);
    const r2 = conferir(m, "campo");
    check("com a laje no alto, a escada vale", !acha(r2, /escada/), textos(r2));
  }
  {
    const m = M.novoMapa(30, 30, {nome: "coluna", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
    m.coisas.push({x: 4, y: 4, tipo: "jogador", texto: ""});
    m.pecas.push({tipo: "coluna", x: 4.25, y: 4.25, z: 1, giro: 0, id: 1});
    abrir(m);
    const r = conferir(m, "coluna");
    check("o inicio dentro de uma coluna e um erro so, e nao o mapa inteiro acusado",
      r.length === 1 && /in.cio do jogador fica onde n.o se fica em p/.test(r[0].msg) && r[0].nivel === "erro", textos(r));
  }
  /* o quadro mais caro: um lugar do mapa, olhando para um dos oito lados, e
     a camera volta para onde estava */
  {
    const m = casa();
    abrir(m);
    D.P.x = 3.5; D.P.y = 3.5; D.P.ang = 1;
    const q = avaliar("custoDoQuadro")(m);
    check("o pior quadro e um lugar do mapa com faces e tempo", q.x >= 0 && q.x < 40 && q.y >= 0 && q.y < 40 &&
      q.graus % 45 === 0 && q.faces > 0 && q.pixels > 0 && isFinite(q.ms), JSON.stringify(q));
    check("a camera volta para onde estava", D.P.x === 3.5 && D.P.y === 3.5 && D.P.ang === 1);
    const lento = avaliar("problemasDoQuadro")("vila", Object.assign({}, q, {ms: 99}));
    check("o quadro acima do limite e aviso, no lugar e na direcao dele",
      lento.length === 1 && lento[0].nivel === "aviso" && lento[0].x === q.x && lento[0].graus === q.graus &&
      avaliar("problemasDoQuadro")("vila", Object.assign({}, q, {ms: 1})).length === 0);
  }
  /* o alcance aos poucos, como o canteiro faz, da o mesmo que de uma vez, e
     a camada vermelha pinta o chao que a lista conta */
  {
    const m = casa();
    for (const p of m.pecas) if (p.tipo === "parede-porta") p.tipo = "parede";
    abrir(m);
    const deUmaVez = conferir(m, "vila");
    avaliar("comecarAlcance")(m, "vila");
    let voltas = 0;
    while (avaliar("ALCANCE.estado") === "calculando" && voltas++ < 100000) avaliar("passoDoAlcance")(50);
    const aosPoucos = avaliar("ALCANCE.problemas"), fora = avaliar("ALCANCE.fora");
    check("o alcance aos poucos acha os mesmos problemas", JSON.stringify(aosPoucos) === JSON.stringify(deUmaVez), textos(aosPoucos || []));
    const ilhado = acha(deUmaVez, /de ch.o aonde/);
    check("a camada vermelha pinta o chao ilhado", ilhado && fora >= ilhado.lugares[0].tiles, "fora " + fora);
  }
  /* o destino da entrada e o mesmo para a validacao e para o jogo */
  {
    const casos = [{texto: "Cripta 2"}, {texto: "", campos: {mapa: "Porao_Velho"}}, {texto: "x", campos: {mapa: "ilha-650"}}];
    check("a validacao le o destino da entrada como o jogo", casos.every(c => V.destinoDoMarco(c) === D.destinoDaCoisa(c)),
      casos.map(c => V.destinoDoMarco(c) + "/" + D.destinoDaCoisa(c)).join(" "));
  }
}

fim();
