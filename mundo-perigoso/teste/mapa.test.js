/* Testes do formato de mapa e das operacoes do editor.
   Nao precisa do jogo montado: os dois modulos sao puros.
   Uso: node mundo-perigoso/teste/mapa.test.js */
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const O = require("../editor/operacoes.js");
const { placar } = require("./harness");
const { check, fim } = placar();

const ch = function(c){ return M.TERRENO_POR_CHAR[c]; };

/* 1. ida e volta: o que se escreve e o que se le */
{
  const m = M.novoMapa(7, 5, {nome:"teste"});
  m.terreno[8] = ch(","); m.altura[8] = 5; m.teto[8] = 3;
  m.altura[20] = 35;
  m.coisas.push({x:3, y:2, tipo:"npc", texto:"Josias, o barqueiro"});
  m.coisas.push({x:1, y:1, tipo:"arvore", texto:""});
  const t = M.escreverMapa(m);
  const r = M.lerMapa(t);
  check("mapa escrito e lido sem erro", r.erros.length === 0, JSON.stringify(r.erros));
  check("ida e volta devolve o mesmo texto", r.mapa && M.escreverMapa(r.mapa) === t);
  check("altura 35 vira z e volta", r.mapa && r.mapa.altura[20] === 35 && t.includes("z"));
  check("texto de coisa com espaco e virgula sobrevive",
    r.mapa && r.mapa.coisas.some(c => c.texto === "Josias, o barqueiro"));
  check("coisas saem ordenadas por posicao", t.indexOf("1 1 arvore") < t.indexOf("3 2 npc"));
}

/* 2. o arquivo gerado e ASCII puro, porque um dia entra no HTML */
{
  const m = M.novoMapa(4, 4);
  m.coisas.push({x:0, y:0, tipo:"placa", texto:"Porto"});
  const t = M.escreverMapa(m);
  check("mapa escrito e ASCII", t.split("").every(c => c.charCodeAt(0) < 128));
  const nenhumEscape = M.TERRENOS.every(t => !"\"'`\\".includes(t.c));
  check("nenhum terreno usa aspas, crase ou barra invertida", nenhumEscape);
  const unicos = new Set(M.TERRENOS.map(t => t.c));
  check("cada terreno tem caractere proprio", unicos.size === M.TERRENOS.length);
  check("nenhum terreno usa / nem [", M.TERRENOS.every(t => t.c !== "/" && t.c !== "["));
  /* o acento vai escapado, e volta inteiro na leitura */
  const a = M.novoMapa(4, 4, {nome: "Ilha do Cora\u00e7\u00e3o"});
  a.coisas.push({x:1, y:1, tipo:"npc", texto:"Irm\u00e3 Clarice"});
  a.regioes = [{id: 1, nome: "Vale S\u00e3o Jo\u00e3o"}];
  a.construcoes.push({id: 1, estilo: "vila", nome: "casa do ferreiro \u2014 forja"});
  const ta = M.escreverMapa(a), ra = M.lerMapa(ta).mapa;
  check("texto com acento sai ASCII", /^[\x00-\x7f]*$/.test(ta) && ta.includes("Irm\\u00e3 Clarice"));
  check("texto com acento volta com o acento",
    ra && ra.nome === a.nome && ra.coisas[0].texto === "Irm\u00e3 Clarice" &&
    ra.construcoes[0].nome === a.construcoes[0].nome && M.escreverMapa(ra) === ta,
    ra && JSON.stringify([ra.nome, ra.coisas[0].texto]));
}

/* 3. erros de leitura dizem a linha e nao devolvem mapa pela metade.
   Aqui em MAPA 1, a grade de um caractere por tile, que continua sendo lida. */
{
  const bom = M.escreverMapa(M.novoMapa(3, 2, {versao:1}));
  const curta = bom.replace("[terreno]\n~~~", "[terreno]\n~~");
  const r1 = M.lerMapa(curta);
  check("linha curta e erro", r1.mapa === null && r1.erros.some(e => /caracteres/.test(e.msg)));
  check("erro diz a linha", r1.erros[0] && r1.erros[0].linha === 8, "linha=" + (r1.erros[0] || {}).linha);

  const estranho = bom.replace("[terreno]\n~~~", "[terreno]\n~Q~");
  const r2 = M.lerMapa(estranho);
  check("caractere desconhecido e erro", r2.mapa === null && r2.erros.some(e => /'Q'/.test(e.msg)));

  const semTeto = bom.slice(0, bom.indexOf("[teto]"));
  check("secao faltando e erro", M.lerMapa(semTeto).erros.some(e => /\[teto\]/.test(e.msg)));
  check("texto qualquer nao vira mapa", M.lerMapa("ola mundo").mapa === null);

  const comComentario = bom.replace("[altura]", "// comentario\n\n[altura]").replace(/\n/g, "\r\n");
  check("comentario, linha vazia e CRLF sao aceitos", M.lerMapa(comComentario).erros.length === 0);

  const futuro = bom.replace("passo 0.25", "passo 0.25\nclima fim-de-tarde");
  const r3 = M.lerMapa(futuro);
  check("cabecalho desconhecido e preservado",
    r3.mapa && M.escreverMapa(r3.mapa).includes("clima fim-de-tarde"));

  const dungeon = M.novoMapa(3, 2, {mar:null, versao:1});
  const r4 = M.lerMapa(M.escreverMapa(dungeon));
  check("mapa sem mar volta sem mar", r4.mapa && r4.mapa.mar === null);
}

/* 3b. o MAPA 2: pedacos com corridas, pecas e campos */
{
  const m = M.novoMapa(70, 40, {nome:"dois"});
  check("mapa novo nasce em MAPA 2", m.versao === 2);
  m.terreno[100] = ch(","); m.teto[100] = 5;
  m.altura[100] = 300;                                  // mais alto do que o MAPA 1 aguenta
  m.construcoes.push({id:1, estilo:"madeira-pescador", nome:"casa do barqueiro"});
  m.pecas.push({construcao:1, tipo:"parede", x:12.25, y:8.5, z:1.25, giro:90, espelho:1});
  m.pecas.push({construcao:1, tipo:"parede-porta", x:13.25, y:8.5, z:1.25, giro:90, espelho:0});
  m.coisas.push({x:3, y:2, tipo:"entrada", texto:"cripta", campos:{id:"capela", par:"cripta-escada"}});
  m.coisas.push({x:5, y:2, tipo:"npc", texto:"Josias, o barqueiro"});
  const txt = M.escreverMapa(m), r = M.lerMapa(txt);
  check("MAPA 2 escrito e lido sem erro", r.erros.length === 0, JSON.stringify(r.erros.slice(0, 2)));
  check("MAPA 2: ida e volta devolve o mesmo texto", r.mapa && M.escreverMapa(r.mapa) === txt);
  check("a grade vai em pedacos de 32 com corridas",
    txt.includes("[terreno 32]") && txt.includes("~*"));
  check("a montanha passa de 35 degraus", r.mapa.altura[100] === 300, "altura=" + r.mapa.altura[100]);
  check("a peca volta com giro, espelho e construcao",
    r.mapa.pecas.length === 2 && r.mapa.pecas[0].giro === 90 && r.mapa.pecas[0].espelho === 1 &&
    r.mapa.pecas[0].construcao === 1 && r.mapa.pecas[0].x === 12.25,
    JSON.stringify(r.mapa.pecas[0]));
  check("o estilo mora na construcao", r.mapa.construcoes.length === 1 &&
    r.mapa.construcoes[0].estilo === "madeira-pescador" && r.mapa.construcoes[0].nome === "casa do barqueiro");
  check("a coisa volta com campos e com o texto livre",
    r.mapa.coisas[0].campos.id === "capela" && r.mapa.coisas[0].texto === "cripta" &&
    r.mapa.coisas[1].texto === "Josias, o barqueiro" && !r.mapa.coisas[1].campos,
    JSON.stringify(r.mapa.coisas[0]));
  check("o MAPA 2 e bem menor que o MAPA 1",
    txt.length < M.escreverMapa(Object.assign({}, m, {versao:1})).length/2,
    txt.length + " contra " + M.escreverMapa(Object.assign({}, m, {versao:1})).length + " caracteres");

  const linha = function(t, comeco){                 // a linha que comeca assim
    for (const l of t.split("\n")) if (l.startsWith(comeco)) return l;
    return null;
  };
  const semPedaco = txt.replace("\n" + linha(txt, "1 0 "), "");
  check("pedaco faltando e erro", M.lerMapa(semPedaco).mapa === null &&
    M.lerMapa(semPedaco).erros.some(e => /falta o peda/.test(e.msg)));
  const curto = txt.replace(linha(txt, "0 0 "), "0 0 ~*10");
  check("pedaco com menos celulas e erro", M.lerMapa(curto).mapa === null &&
    M.lerMapa(curto).erros.some(e => /precisa de/.test(e.msg)), JSON.stringify(M.lerMapa(curto).erros[0]));
  const estranho = txt.replace(linha(txt, "0 0 "), "0 0 Q*400");
  check("valor que nao existe e erro", M.lerMapa(estranho).mapa === null);
  const pecaRuim = txt.replace("p 1 parede 12.25", "p 1 parede doze");
  check("peca com numero estranho e erro", M.lerMapa(pecaRuim).mapa === null);
}

/* 3c. o MAPA 1 continua lido, e converte */
{
  const velho = M.novoMapa(9, 7, {versao:1, nome:"velho"});
  velho.terreno[10] = ch(","); velho.altura[10] = 7; velho.teto[10] = 5;
  velho.coisas.push({x:2, y:1, tipo:"npc", texto:"Bruno, o ferreiro"});
  const t1 = M.escreverMapa(velho);
  check("MAPA 1 continua sendo escrito como antes", t1.startsWith("MAPA 1") && /[terreno]/.test(t1));
  const lido = M.lerMapa(t1);
  check("MAPA 1 e lido sem erro", lido.erros.length === 0 && lido.mapa.versao === 1);
  const convertido = M.converterMapa(lido.mapa);
  const t2 = M.escreverMapa(convertido);
  check("converter da o mesmo mapa em MAPA 2", t2.startsWith("MAPA 2"));
  const devolta = M.lerMapa(t2).mapa;
  let igual = devolta.larg === velho.larg && devolta.alt === velho.alt;
  for (let i = 0; i < velho.larg*velho.alt; i++)
    if (devolta.terreno[i] !== velho.terreno[i] || devolta.altura[i] !== velho.altura[i] ||
        devolta.teto[i] !== velho.teto[i]) igual = false;
  check("a conversao nao muda nenhum tile", igual);
  check("a conversao guarda as coisas", devolta.coisas.length === 1 &&
    devolta.coisas[0].texto === "Bruno, o ferreiro");
}

/* 4. avisos */
{
  const m = M.novoMapa(6, 6);                         // tudo mar
  const semInicio = M.validarMapa(m);
  check("falta inicio do jogador e aviso", semInicio.some(a => /in.cio/.test(a.msg)));

  m.terreno[7] = ch(":");                             // areia com altura 0: debaixo d'agua
  check("chao abaixo do mar e aviso", M.validarMapa(m).some(a => a.x === 1 && a.y === 1));

  const casa = M.novoMapa(5, 3, {terreno:ch(","), altura:4});
  "#####".split("").forEach((c, x) => { casa.terreno[x] = ch("#"); });
  casa.terreno[2] = ch("D");
  casa.coisas.push({x:1, y:1, tipo:"jogador", texto:""});
  check("porta entre paredes nao e aviso", M.validarMapa(casa).length === 0,
    JSON.stringify(M.validarMapa(casa)));
  casa.terreno[1] = ch(",");
  check("porta solta e aviso", M.validarMapa(casa).some(a => /porta/.test(a.msg)));

  casa.pecas.push({construcao:9, tipo:"parede-de-gelo", x:1, y:1, z:1, giro:0});
  casa.coisas.push({x:9, y:9, tipo:"arvore", texto:""});
  casa.coisas.push({x:3, y:0, tipo:"barril", texto:""});
  casa.coisas.push({x:3, y:1, tipo:"npc", texto:""});
  casa.coisas.push({x:4, y:1, tipo:"dragao", texto:""});
  const av = M.validarMapa(casa).map(a => a.msg).join(" | ");
  check("coisa fora do mapa e aviso", /fora do mapa/.test(av));
  check("coisa dentro de parede e aviso", /dentro de parede/.test(av));
  check("npc sem nome e aviso", /sem nome/.test(av));
  check("tipo desconhecido e aviso e nao some", /dragao/.test(av) &&
    M.escreverMapa(casa).includes("4 1 dragao"));
  check("tipo de peca desconhecido e aviso e nao some", /parede-de-gelo/.test(av) &&
    M.escreverMapa(casa).includes("p 9 parede-de-gelo"));
}

/* 4b. a rampa entre dois pontos, e o traco de estrada */
{
  const m = M.novoMapa(40, 12, {terreno:ch(","), altura:2});
  const h = O.novoHistorico();
  for (let x=0; x<40; x++) for (let y=0; y<12; y++) m.altura[y*40 + x] = 2;
  m.altura[6*40 + 30] = 12;                        // um morro no fim da linha
  O.abrirAcao(h, "rampa");
  const r = O.rampaEntre(h, m, 10, 6, 30, 6, 3);
  O.fecharAcao(h, m);
  const alturas = [];
  for (let x=10; x<=30; x++) alturas.push(m.altura[6*40 + x]);
  let maiorSalto = 0;
  for (let i=1; i<alturas.length; i++) maiorSalto = Math.max(maiorSalto, Math.abs(alturas[i] - alturas[i-1]));
  check("a rampa sobe do pe ate o alto", alturas[0] === 2 && alturas[alturas.length-1] === 12,
    alturas.join(","));
  check("a rampa nao passa de um degrau por tile, que e o que se sobe andando",
    maiorSalto <= 1 && r.faltou === 0, "maior salto " + maiorSalto + ", faltou " + r.faltou);
  check("a rampa tem a largura pedida",
    m.altura[5*40 + 20] === m.altura[6*40 + 20] && m.altura[6*40 + 20] === m.altura[7*40 + 20] &&
    m.altura[3*40 + 20] === 2, "nas bordas " + m.altura[5*40+20] + " " + m.altura[7*40+20]);
  O.desfazer(h, m);
  check("a rampa inteira e um Ctrl+Z so", m.altura[6*40 + 20] === 2);

  /* subida que nao cabe no comprimento: sobe um por tile e avisa */
  const curto = M.novoMapa(20, 6, {terreno:ch(","), altura:2});
  curto.altura[3*20 + 12] = 30;
  const r2 = O.rampaEntre(null, curto, 5, 3, 12, 3, 1);
  check("subida que nao cabe avisa quanto faltou", r2.faltou > 0, "faltou " + r2.faltou);

  /* o traco de estrada pinta e acerta o relevo embaixo */
  const estrada = M.novoMapa(30, 10, {terreno:ch(","), altura:3});
  estrada.altura[5*30 + 25] = 9;
  const hh = O.novoHistorico();
  O.abrirAcao(hh, "estrada");
  O.tracar(hh, estrada, 4, 5, 25, 5, 3, ch("."), {relevo:"rampa"});
  O.fecharAcao(hh, estrada);
  let deTerra = 0, salto = 0;
  for (let x=4; x<=25; x++){
    if (M.TERRENOS[estrada.terreno[5*30 + x]].id === "terra") deTerra++;
    if (x > 4) salto = Math.max(salto, Math.abs(estrada.altura[5*30+x] - estrada.altura[5*30+x-1]));
  }
  check("o traco de estrada pinta a linha inteira", deTerra === 22, deTerra + " tiles de terra");
  check("a estrada nao sobe degrau alto", salto <= 1, "maior salto " + salto);
  check("o traco e um Ctrl+Z so", O.desfazer(hh, estrada) &&
    M.TERRENOS[estrada.terreno[5*30 + 10]].id === "grama");
}

/* 4b2. as regioes: um pedaco do mundo com nome */
{
  const m = M.novoMapa(70, 40, {nome:"r"});
  m.regioes.push({id:1, nome:"Pedra Alta", campos:{perigo:"0", musica:"vila"}});
  for (let y=5; y<12; y++) for (let x=5; x<20; x++) m.regiao[y*70 + x] = 1;
  const txt = M.escreverMapa(m), r = M.lerMapa(txt);
  check("a regiao vai e volta com nome e campos", r.erros.length === 0 &&
    M.escreverMapa(r.mapa) === txt && r.mapa.regiao[6*70 + 6] === 1 && r.mapa.regiao[0] === 0 &&
    r.mapa.regioes[0].nome === "Pedra Alta" && r.mapa.regioes[0].campos.musica === "vila",
    JSON.stringify(r.erros.slice(0,1)) + " " + JSON.stringify(r.mapa && r.mapa.regioes));
  check("mapa sem regiao nao escreve a grade de regiao",
    !M.escreverMapa(M.novoMapa(20, 20)).includes("[regiao"));
  /* a regiao entra no desfazer como qualquer grade */
  const h = O.novoHistorico();
  O.abrirAcao(h, "regiao");
  O.retangulo(h, m, "regiao", 30, 30, 34, 34, 2);
  O.fecharAcao(h, m);
  check("pintar regiao entra no desfazer", m.regiao[32*70 + 32] === 2 &&
    (O.desfazer(h, m), m.regiao[32*70 + 32] === 1 || m.regiao[32*70 + 32] === 0));
}

/* 4b3. a vegetacao tem regras: nada nasce em estrada nem encostado em parede */
{
  const m = M.novoMapa(12, 12, {terreno:ch(","), altura:4});
  for (let y=0; y<12; y++) m.terreno[y*12 + 6] = ch(".");        // uma estrada de terra
  m.terreno[3*12 + 2] = ch("#");                                  // uma parede
  const tiles = [];
  for (let y=0; y<12; y++) for (let x=0; x<12; x++) tiles.push([x, y]);
  const h = M.novoMapa ? null : null;
  O.espalhar(null, m, tiles, ["arvore"], 1, function(){ return 0; });
  const tem = function(x, y){ return O.coisaEm(m, x, y) >= 0; };
  check("a mata cobre o chao livre", tem(0, 0) && tem(9, 9));
  check("nada nasce na estrada", !tem(6, 5) && !tem(6, 9));
  check("nada nasce encostado na parede", !tem(2, 2) && !tem(1, 3) && !tem(3, 3) && !tem(2, 4));
  check("podePlantar diz a mesma coisa", O.podePlantar(m, 0, 0) === true &&
    O.podePlantar(m, 6, 5) === false && O.podePlantar(m, 2, 2) === false);
}

/* 4c. a encosta de pedra: chao com cara de rocha, onde se anda */
{
  const encosta = M.TERRENOS[M.TERRENO_POR_CHAR["r"]];
  check("a encosta de pedra e chao, e a rocha continua parede",
    encosta && encosta.tipo === "chao" && M.TERRENOS[M.TERRENO_POR_CHAR["^"]].tipo === "parede",
    encosta ? encosta.nome + ": " + encosta.tipo : "nao existe");
}

/* 5. desfazer e refazer */
{
  const m = M.novoMapa(10, 10);
  const h = O.novoHistorico();
  const antes = M.escreverMapa(m);

  O.abrirAcao(h, "pincel");
  for (const t of O.tilesDoPincel(5, 5, 3)) O.pintar(h, m, "terreno", t[0], t[1], ch(","));
  O.pintar(h, m, "terreno", 5, 5, ch(":"));           // o mesmo tile duas vezes no traco
  O.fecharAcao(h, m);
  const depois = M.escreverMapa(m);
  check("um traco inteiro e uma acao so", h.feitas.length === 1);

  O.desfazer(h, m);
  check("desfazer volta o mapa exatamente", M.escreverMapa(m) === antes);
  O.refazer(h, m);
  check("refazer devolve o traco", M.escreverMapa(m) === depois);

  O.abrirAcao(h, "nada"); O.pintar(h, m, "terreno", 5, 5, ch(":")); O.fecharAcao(h, m);
  check("acao que nao muda nada nao entra no historico", h.feitas.length === 1);

  O.desfazer(h, m);
  O.abrirAcao(h, "outro"); O.pintar(h, m, "teto", 0, 0, 5); O.fecharAcao(h, m);
  check("acao nova apaga o refazer", h.desfeitas.length === 0 && O.refazer(h, m) === null);

  O.abrirAcao(h, "coisa");
  O.colocarCoisa(h, m, 2, 2, "npc", "Ana");
  O.fecharAcao(h, m);
  O.desfazer(h, m);
  check("desfazer tira a coisa colocada", m.coisas.length === 0);
  O.refazer(h, m);
  check("refazer devolve a coisa com texto", m.coisas.length === 1 && m.coisas[0].texto === "Ana");

  const t0 = M.escreverMapa(m);
  O.abrirAcao(h, "tamanho");
  O.marcarMapaInteiro(h, m);
  O.copiarPara(m, O.redimensionar(m, 20, 16, "centro"));
  O.fecharAcao(h, m);
  check("redimensionar muda o tamanho", m.larg === 20 && m.alt === 16);
  O.desfazer(h, m);
  check("desfazer redimensionar volta tamanho e conteudo", m.larg === 10 && M.escreverMapa(m) === t0);
}
/* 5b. redimensionar leva tudo do MAPA 2: pecas, construcoes, campos, regiao
   e semente; e o que sobra em volta de uma dungeon e rocha */
{
  const m = M.novoMapa(10, 10, {nome: "d", mar: null, terreno: ch(",")});
  m.semente = 77;
  m.construcoes.push({id: 1, estilo: "cripta-pedra", nome: "sala"});
  m.pecas.push({id: 1, construcao: 1, tipo: "parede", x: 2, y: 3, z: 0, giro: 90, espelho: 0});
  m.pecas.push({id: 2, construcao: 1, tipo: "parede", x: 9.5, y: 9, z: 0, giro: 0, espelho: 0});
  m.coisas.push({x: 4, y: 4, tipo: "bau", texto: "", campos: {conteudo: "ouro:3"}});
  m.regioes.push({id: 1, nome: "sala", campos: null}); m.regiao[4*10 + 4] = 1;
  const n = O.redimensionar(m, 14, 12, "centro");            // dx 2, dy 1
  check("redimensionar leva a peca junto, no lugar novo, e larga a que cai fora",
    n.pecas.length === 2 && n.pecas[0].x === 4 && n.pecas[0].y === 4 && n.pecas[0].giro === 90 && n.construcoes.length === 1);
  const menor = O.redimensionar(m, 8, 8, "canto");
  check("encolhendo, a peca que cai fora fica de fora", menor.pecas.length === 1);
  check("leva a coisa com os campos, a regiao e a semente",
    n.coisas[0].x === 6 && n.coisas[0].campos.conteudo === "ouro:3" && n.regiao[5*14 + 6] === 1 && n.regioes.length === 1 && n.semente === 77);
  check("em volta da dungeon, rocha", M.TERRENOS[n.terreno[0]].tipo === "parede" && n.mar === null);
  check("o mapa redimensionado le e escreve igual", M.escreverMapa(M.lerMapa(M.escreverMapa(n)).mapa) === M.escreverMapa(n));
  const h = O.novoHistorico(), antes = M.escreverMapa(m);
  O.abrirAcao(h, "semente"); O.marcarMapaInteiro(h, m); m.semente = 5; O.fecharAcao(h, m);
  O.desfazer(h, m);
  check("desfazer uma mudanca de mapa inteiro devolve a semente", m.semente === 77 && M.escreverMapa(m) === antes);
}

/* 6. pintar terreno acerta a altura do mar */
{
  const m = M.novoMapa(6, 6);                         // mar 4, fundo 0
  O.pintar(null, m, "terreno", 1, 1, ch(":"));
  check("areia pintada no mar sobe ate o nivel", m.altura[7] === m.mar);
  m.altura[8] = 9;
  O.pintar(null, m, "terreno", 2, 1, ch(","));
  check("grama pintada num morro fica no morro", m.altura[8] === 9);
  O.pintar(null, m, "terreno", 2, 1, ch("-"));
  check("agua rasa fica um degrau abaixo do mar", m.altura[8] === m.mar - 1);
  O.pintar(null, m, "terreno", 2, 1, ch("~"));
  check("agua funda fica dois degraus abaixo", m.altura[8] <= m.mar - 2);
  O.pintar(null, m, "terreno", 3, 3, ch("#"));
  check("parede nao mexe na altura", m.altura[21] === 0);
  check("terreno pintado assim nao gera aviso de mar",
    !M.validarMapa(m).some(a => /mar/.test(a.msg) && a.y === 1));
  const d = M.novoMapa(4, 4, {mar:null, terreno:ch("+")});
  O.pintar(null, d, "terreno", 1, 1, ch("-"));
  check("mapa sem mar nao mexe na altura", d.altura[5] === 0);
}

/* 7. balde, retangulo, pincel */
{
  const m = M.novoMapa(8, 8, {terreno:ch(","), altura:4});
  for (let y=0; y<8; y++) m.terreno[y*8 + 4] = ch("#");   // muro no meio
  const n = O.balde(null, m, "terreno", 1, 1, ch(":"));
  check("balde enche so o lado de ca do muro", n === 32 && m.terreno[5] === ch(","),
    "n=" + n);
  const n2 = O.retangulo(null, m, "teto", 6, 6, -3, 99, 5);
  check("retangulo recorta nas bordas e aceita cantos trocados", n2 === 7*2, "n=" + n2);
  check("pincel 1 e um tile", O.tilesDoPincel(0, 0, 1).length === 1);
  check("pincel 3 e um quadrado 3x3", O.tilesDoPincel(0, 0, 3).length === 9);
  check("pincel pintando fora do mapa nao quebra", O.pintar(null, m, "altura", -1, 50, 3) === false);
  /* o teto da altura e o da versao: no MAPA 1 cabe um caractere em base 36
     (35 degraus, 8,75 tiles); no MAPA 2 cabem dois (1.295, uns 324 tiles) */
  check("altura para no maximo da versao",
    (O.pintar(null, m, "altura", 0, 0, 9999), m.altura[0] === M.ALTURA_MAX2), "altura=" + m.altura[0]);
  const velhoM = M.novoMapa(4, 4, {versao: 1});
  O.pintar(null, velhoM, "altura", 0, 0, 9999);
  check("num MAPA 1 a altura ainda para em 35", velhoM.altura[0] === M.ALTURA_MAX);
}

/* 8. altura: subir uma vez por traco, suavizar */
{
  const m = M.novoMapa(5, 5, {terreno:ch(","), altura:4});
  const mexidos = new Set();
  for (let k=0; k<30; k++) O.ajustarAltura(null, m, 2, 2, +1, mexidos);
  check("segurar o botao parado sobe um degrau so", m.altura[12] === 5);
  m.altura[12] = 13;
  O.suavizar(null, m, 2, 2);
  check("suavizar puxa o pico para a media", m.altura[12] === 5, "h=" + m.altura[12]);
}

/* 9. coisas */
{
  const m = M.novoMapa(6, 6, {terreno:ch(","), altura:4});
  O.colocarCoisa(null, m, 1, 1, "jogador");
  O.colocarCoisa(null, m, 4, 4, "jogador");
  check("inicio do jogador e unico", m.coisas.filter(c => c.tipo === "jogador").length === 1 &&
    m.coisas[0].x === 4);
  O.colocarCoisa(null, m, 4, 4, "barril");
  check("colocar em cima troca", m.coisas.length === 1 && m.coisas[0].tipo === "barril");
  O.apagarCoisa(null, m, 4, 4);
  check("apagar tira", m.coisas.length === 0);

  m.terreno[0] = ch("~");
  let s = 0;
  const sorte = () => (s = (s*9301 + 49297) % 233280) / 233280;
  const tiles = [];
  for (let y=0; y<6; y++) for (let x=0; x<6; x++) tiles.push([x, y]);
  O.espalhar(null, m, tiles, ["arvore", "pinheiro"], 1.0, sorte);
  check("espalhar com densidade 1 enche todo chao", m.coisas.length === 35, "n=" + m.coisas.length);
  check("espalhar nao poe arvore na agua", O.coisaEm(m, 0, 0) < 0);
}

/* 9b. carimbos: casa, escada, girar, copiar e colar */
{
  check("todo carimbo pronto so usa terreno que existe",
    O.CARIMBOS.every(d => O.carimboPronto(d).terreno.every(t => t === -1 || !!M.TERRENOS[t])));
  const casa = O.carimboPronto(O.CARIMBOS.find(c => c.id === "casa-madeira"));
  const m = M.novoMapa(20, 20, {terreno:ch(","), altura:8});
  m.altura[10*20 + 10] = 9;                     // o clique cai num tile um degrau acima
  m.coisas.push({x:9, y:9, tipo:"arvore", texto:""});
  const h = O.novoHistorico();
  O.abrirAcao(h, "carimbo");
  O.carimbar(h, m, casa, 10, 10);               // 5x5: canto em (8, 8)
  check("um carimbo e um Ctrl+Z so", O.fecharAcao(h, m) && h.feitas.length === 1);
  check("a casa fica com o meio no clique, assentada na altura dele",
    m.terreno[10*20+10] === ch("=") && m.terreno[8*20+8] === ch("H") && m.terreno[12*20+10] === ch("D") &&
    m.altura[8*20+8] === 9 && m.altura[12*20+12] === 9);
  check("o forro a cinco degraus e a parede a seis", m.teto[10*20+10] === 5 && m.teto[8*20+8] === 6);
  check("a arvore que ficou debaixo da casa sai", O.coisaEm(m, 9, 9) < 0);
  check("a casa carimbada nao gera aviso", !M.validarMapa(m).some(a => a.x >= 8 && a.x <= 12 && a.y >= 8 && a.y <= 12),
    JSON.stringify(M.validarMapa(m).slice(0, 2)));
  O.desfazer(h, m);
  check("desfazer tira a casa inteira e devolve a arvore",
    m.terreno[10*20+10] === ch(",") && m.altura[8*20+8] === 8 && O.coisaEm(m, 9, 9) >= 0);
  O.carimbar(null, m, casa, 0, 0);
  check("carimbo na borda fica recortado sem quebrar", m.terreno[0] === ch("=") && m.terreno[2*20+2] === ch("H"));

  const escada = O.carimboPronto(O.CARIMBOS.find(c => c.id === "escada"));
  const e = M.novoMapa(10, 10, {terreno:ch(","), altura:4});
  O.carimbar(null, e, escada, 5, 5);            // 3x6: canto em (4, 2)
  const degraus = [2, 3, 4, 5, 6, 7].map(y => e.altura[y*10 + 5]);
  check("a escada sobe um degrau por fileira, que se sobe andando", degraus.join(" ") === "9 8 7 6 5 4", degraus.join(" "));
  const girada = O.girarCarimbo(escada);
  check("girar troca largura e altura", girada.larg === 6 && girada.alt === 3);
  check("girada uma vez, a escada sobe para o leste", girada.altura.slice(0, 6).join(" ") === "0 1 2 3 4 5");
  check("quatro giros voltam ao carimbo de antes",
    JSON.stringify(O.girarCarimbo(O.girarCarimbo(O.girarCarimbo(girada)))) === JSON.stringify(escada));

  const de = M.novoMapa(12, 12, {terreno:ch(","), altura:6});
  de.terreno[2*12+2] = ch("#"); de.altura[3*12+3] = 9; de.altura[2*12+3] = 5;
  de.coisas.push({x:3, y:2, tipo:"barril", texto:""});
  const pedaco = O.recortar(de, 4, 3, 2, 2);    // cantos trocados: 3x2 a partir de (2, 2)
  check("recortar mede a altura a partir do chao mais baixo do pedaco",
    pedaco.larg === 3 && pedaco.alt === 2 && Math.min(...pedaco.altura) === 0 && pedaco.coisas.length === 1);
  const para = M.novoMapa(12, 12, {terreno:ch(":"), altura:10});
  O.carimbar(null, para, pedaco, 8, 8);         // canto em (7, 7), chao 10
  check("colar reproduz o pedaco no lugar novo, com o mesmo relevo",
    para.terreno[7*12+7] === ch("#") && para.altura[8*12+8] === 14 && para.altura[7*12+8] === 10 &&
    O.coisaEm(para, 8, 7) >= 0, [para.altura[7*12+8], para.altura[8*12+8]].join(" "));
}

/* 10. regua */
{
  const r = O.medir(0, 0, 47, 0);
  check("regua: 47 tiles andando levam 10 segundos", Math.abs(r.segundos - 10) < 1e-9);
  check("regua: na velocidade 50 do jogo levam 20", Math.abs(O.medir(0, 0, 47, 0, 50).segundos - 20) < 1e-9);
  check("regua: um tile sao dois metros", r.metros === 94);
}

/* 11. os modulos sao ASCII, como o resto do fonte */
for (const f of ["src/mapa.js", "src/ilha.js", "src/p3d.js", "editor/operacoes.js", "canteiro/canteiro.html", "canteiro/canteiro.js", "canteiro/macro.js"]){
  const p = path.join(__dirname, "..", f);
  if (!fs.existsSync(p)){ check(f + " existe", false); continue; }
  const s = fs.readFileSync(p, "utf8");
  const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
  check(f + " e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k + ": " + s.slice(Math.max(0, k-30), k+10));
}

/* ---------- os marcos ---------- */
{
  const m = M.novoMapa(24, 24, {nome: "marcos", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
  m.coisas.push({x: 2, y: 2, tipo: "jogador", texto: ""});
  m.coisas.push({x: 5, y: 5, tipo: "bau", texto: "", campos: {conteudo: "ouro:10,chave:portao", z: "1.5"}});
  m.coisas.push({x: 6, y: 5, tipo: "porta", texto: "", campos: {chave: "portao", fechada: "1", id: "portao-norte"}});
  m.coisas.push({x: 8, y: 5, tipo: "alavanca", texto: "", campos: {abre: "portao-norte"}});
  m.coisas.push({x: 3, y: 9, tipo: "segredo", texto: "", campos: {grupo: "muro"}});
  m.coisas.push({x: 9, y: 9, tipo: "segredo", texto: "", campos: {grupo: "muro"}});
  m.coisas.push({x: 9, y: 12, tipo: "segredo", texto: "", campos: {grupo: "muro"}});
  m.coisas.push({x: 12, y: 12, tipo: "ninho", texto: "", campos: M.camposPadrao("ninho")});
  m.coisas.push({x: 14, y: 12, tipo: "entrada", texto: "", campos: {mapa: "cripta", id: "capela"}});
  m.semente = 7;
  check("todo marco novo tem os campos do tipo dele, com o padrao",
    M.camposPadrao("ninho").criatura === "diabrete" && M.camposPadrao("luz").cor === "#ffc070" && M.camposPadrao("jogador") === null);
  check("todo marco aceita z, a altura do piso em que fica",
    M.camposDoTipo("bau").some(function(c){ return c.k === "z"; }) && !M.camposDoTipo("arvore").length);
  const texto = M.escreverMapa(m), volta = M.lerMapa(texto);
  check("os marcos e a semente vao e voltam pelo arquivo, identicos",
    volta.mapa && M.escreverMapa(volta.mapa) === texto && volta.mapa.semente === 7 &&
    texto.split(/\r?\n/).indexOf("semente 7") >= 0);
  check("o mapa sem semente nao ganha a linha", !/semente/.test(M.escreverMapa(M.novoMapa(4, 4, {}))));
  check("marcos certos nao dao aviso nenhum", M.validarMapa(m).length === 0, JSON.stringify(M.validarMapa(m)));
  /* o sorteio: a mesma semente, o mesmo segredo; outra semente pode mudar */
  const a = M.sortearSegredos(m).get("muro"), b = M.sortearSegredos(M.lerMapa(texto).mapa).get("muro");
  check("o segredo sorteado sai o mesmo com a mesma semente, lido do arquivo", a.x === b.x && a.y === b.y);
  const vistos = new Set();
  for (let s = 1; s <= 30; s++){ const c = M.sortearSegredos(m, s).get("muro"); vistos.add(c.x + "," + c.y); }
  check("com sementes diferentes, as tres alternativas saem", vistos.size === 3, vistos.size + " alternativas");
  const ordem = M.novoMapa(24, 24, {});
  ordem.coisas = m.coisas.slice().reverse(); ordem.semente = 7;
  const c2 = M.sortearSegredos(ordem).get("muro");
  check("o sorteio nao depende da ordem das coisas no arquivo", c2.x === a.x && c2.y === a.y);
  /* o que a validacao pega */
  const ruim = M.lerMapa(texto).mapa;
  ruim.coisas.push({x: 1, y: 20, tipo: "porta", texto: "", campos: {chave: "outra"}});
  ruim.coisas.push({x: 2, y: 20, tipo: "alavanca", texto: "", campos: {abre: "nada"}});
  ruim.coisas.push({x: 3, y: 20, tipo: "luz", texto: "", campos: {cor: "amarelo", raio: "x"}});
  ruim.coisas.push({x: 4, y: 20, tipo: "ninho", texto: "", campos: {criatura: "dragao"}});
  ruim.coisas.push({x: 5, y: 20, tipo: "saida", texto: ""});
  ruim.coisas.push({x: 6, y: 20, tipo: "grade", texto: "", campos: {id: "portao-norte"}});
  ruim.coisas.push({x: 7, y: 20, tipo: "segredo", texto: "", campos: {grupo: "sozinho"}});
  const av = M.validarMapa(ruim).map(function(v){ return v.msg; }).join(" | ");
  /* o canteiro poe e edita os campos pelo historico */
  {
    const h = O.novoHistorico(), mm = M.lerMapa(texto).mapa;
    O.abrirAcao(h, "por"); O.colocarCoisa(h, mm, 20, 20, "luz", "", M.camposPadrao("luz")); O.fecharAcao(h, mm);
    const luz = mm.coisas.find(function(c){ return c.tipo === "luz"; });
    check("colocar um marco poe os campos do tipo", luz && luz.campos.cor === "#ffc070" && luz.campos.raio === "5");
    O.abrirAcao(h, "campo"); const mudou = O.editarCamposCoisa(h, mm, 20, 20, {cor: "#80a0ff", raio: "9", tremor: ""}); O.fecharAcao(h, mm);
    check("editar os campos troca o valor e tira o vazio", mudou && luz.campos.cor === "#80a0ff" && luz.campos.raio === "9" && !("tremor" in luz.campos));
    O.abrirAcao(h, "campo"); const espaco = O.editarCamposCoisa(h, mm, 20, 20, {cor: "#80a0ff", raio: "9 10"}); O.fecharAcao(h, mm);
    check("campo com espaco nao entra: quebraria a linha do arquivo", !espaco && luz.campos.raio === "9");
    O.desfazer(h, mm);
    check("desfazer volta os campos de antes", mm.coisas.find(function(c){ return c.tipo === "luz"; }).campos.cor === "#ffc070");
  }
  for (const [o, re] of [["chave sem bau", /chave outra, e nenhum/], ["alavanca sem alvo", /abre nada, que n/],
                         ["cor errada", /cor n.o . uma cor/], ["numero errado", /raio n.o . n.mero/],
                         ["criatura que nao existe", /criatura n.o . diabrete/], ["saida sem mapa", /sem o mapa de volta/],
                         ["id repetido", /portao-norte aparece 2 vezes/], ["segredo de uma alternativa so", /uma alternativa s/]])
    check("a validacao pega " + o, re.test(av), av);
}

fim();
