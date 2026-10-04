/* ============================================================
   O FORMATO DE MAPA
   ------------------------------------------------------------
   Um mapa e um arquivo de texto com tres grades do mesmo tamanho e listas
   de pecas e de coisas. ASCII puro, sem aspas, crase nem barra invertida,
   porque o build embute o mapa numa string do HTML.

   O MAPA 1 era uma grade de caracteres, uma linha por fileira de tiles:

     MAPA 1
     nome ilha
     tamanho 200 200
     passo 0.25          altura de um degrau, em tiles
     mar 4               nivel da agua, em degraus ("nenhum" numa dungeon)

     [terreno]           um caractere por tile, ver TERRENOS
     [altura]            piso, em degraus, base 36: 0-9 e a-z
     [teto]              "." e ceu aberto; senao, degraus ACIMA do piso
     [coisas]            uma por linha: x y tipo texto livre

   Ele continua sendo lido. O que se escreve agora e o MAPA 2:

     MAPA 2
     nome ilha
     tamanho 650 650
     passo 0.25
     mar 4
     semente 1234        o sorteio das passagens secretas (sem a linha, 1)

     [terreno 32]        as grades em pedacos de 32x32 tiles, com corridas
     0 0 ~*400           <pedaco x> <pedaco y> <valor>*<quantas>, base 36
     1 0 ~*3f0 :*10
     [altura 32]         valor em base 36, ate dois digitos: 0 a 1295 degraus
     [teto 32]
     [pecas]
     c 3 madeira-pescador casa do barqueiro    <- construcao: id, estilo, nome
     p 3 parede 123.25 88.5 3.25 90            <- peca: construcao, tipo, x, y, z, giro
     p 3 parede-porta 124.25 88.5 3.25 90 e    <- "e" espelha
     [regioes]
     r 1 perigo=0 musica=vila som=mar Pedra Alta   <- regiao: id, campos, nome
     [regiao 32]                                   <- que regiao cobre cada tile
     3 2 0*3f 1*3c1
     [coisas]
     101 75 entrada mapa=cripta id=capela
     118 64 npc Tobias, o lojista
     120 66 bau conteudo=ouro:10,chave:portao z=1.5
     121 70 porta chave=portao fechada=1
     90 40 segredo grupo=muro-velho          <- varias do mesmo grupo: uma vale

   Por que assim, medido no rascunho de 650x650: em MAPA 1 o arquivo tem
   1.240 KB; em corridas por pedaco de 32, de 48 a 136 KB. E um traco de
   pincel de 9 tiles atravessando 40 muda 3 linhas do arquivo, contra 28 se
   as corridas fossem por fileira -- o git mostra onde se mexeu.

   Tres escolhas que valem para sempre. A altura e em degraus de 0,25 tile,
   e um degrau se sobe andando enquanto dois ja sao parede. O teto e
   relativo ao piso, entao uma casa em terreno inclinado se pinta com um
   numero so; numa parede o mesmo numero diz a altura dela. E um tile mede
   uns 2 metros.

   A peca e o que se constroi: o tipo diz a forma e o estilo mora na
   CONSTRUCAO, entao trocar a casa de madeira para pedra e mudar uma linha.
   Ver src/pecas.js.

   A REGIAO e um pedaco do mundo com nome: a grade diz de que regiao e cada
   tile, e a lista diz o nome e os campos de cada uma. As regras de jogo --
   quanto perigo, que musica, que som ambiente -- ainda nao estao decididas,
   entao aqui so se guarda o dado; quem decide o que fazer com ele e o jogo,
   um dia. A grade so e escrita se alguma regiao existir.

   Numa coisa, um pedaco solto do tipo "chave=valor" e um campo; o resto e o
   texto livre de sempre. Tipo desconhecido -- de peca ou de coisa -- gera
   aviso e e guardado como veio: um mapa feito numa versao mais nova nao
   pode perder nada ao abrir aqui.

   Texto com acento -- o nome do morador, a placa, a construcao, a regiao --
   vai escapado no arquivo, como no fonte: "Irm\u00e3 Clarice". O arquivo
   continua ASCII, e o jogo le o nome com o acento.

   Linhas vazias e linhas que comecam com // sao ignoradas. Nenhum caractere
   de grade e "/", entao isso nunca come uma linha de grade.

   Este arquivo e puro: nao toca em DOM. O editor, o canteiro e o jogo usam
   este mesmo codigo, e o teste roda no node.
   ============================================================ */
const MAPA_VERSAO = 2;             // a versao que se escreve; a 1 continua sendo lida
const PEDACO_MAPA = 32;            // tiles de lado, nas grades do MAPA 2

/* `tipo` e o que o motor vai fazer com o tile; `alto` e a altura padrao da
   parede, em degraus, quando o teto dela nao foi pintado. Nenhum caractere
   aqui precisa de escape numa string JS -- nada de aspas, barra invertida ou
   crase -- porque um dia o build vai embutir o mapa no HTML. */
const TERRENOS = [
  {c:"~", id:"funda",    nome:"\u00e1gua funda",       cor:"#1f3b57", tipo:"agua"},
  {c:"-", id:"rasa",     nome:"\u00e1gua rasa",        cor:"#3f6f86", tipo:"agua"},
  {c:":", id:"areia",    nome:"areia",                 cor:"#c9b07a", tipo:"chao"},
  {c:",", id:"grama",    nome:"grama",                 cor:"#5d7a3a", tipo:"chao"},
  {c:";", id:"mato",     nome:"mato alto",             cor:"#3f5a2a", tipo:"chao"},
  {c:"%", id:"lama",     nome:"lama",                  cor:"#4e4a32", tipo:"chao"},
  {c:".", id:"terra",    nome:"terra batida",          cor:"#8a6a44", tipo:"chao"},
  {c:"_", id:"calcada",  nome:"cal\u00e7amento",       cor:"#8b8578", tipo:"chao"},
  {c:"=", id:"tabuado",  nome:"tabuado",               cor:"#7a5230", tipo:"chao"},
  {c:"+", id:"lajota",   nome:"lajota",                cor:"#6d6a63", tipo:"chao"},
  {c:"#", id:"pedra",    nome:"parede de pedra",       cor:"#3b3935", tipo:"parede", alto:6},
  {c:"H", id:"madeira",  nome:"parede de madeira",     cor:"#4a3020", tipo:"parede", alto:6},
  {c:"|", id:"palicada", nome:"pali\u00e7ada",         cor:"#5b4125", tipo:"parede", alto:5},
  {c:"^", id:"rocha",    nome:"rocha",                 cor:"#55504a", tipo:"parede", alto:8},
  {c:"D", id:"porta",    nome:"porta",                 cor:"#b0773a", tipo:"porta"},
  {c:"n", id:"cerca",    nome:"cerca",                 cor:"#9a7446", tipo:"parede", alto:2},
  /* A encosta de pedra e o chao da montanha: tem cara de rocha e se anda em
     cima. A rocha continua sendo o penhasco -- sem este terreno, todo tile de
     pedra virava parede e nenhuma montanha se subia. */
  {c:"r", id:"encosta",  nome:"encosta de pedra",      cor:"#6b6259", tipo:"chao"}
];
const TERRENO_POR_CHAR = {};
TERRENOS.forEach(function(t, i){ TERRENO_POR_CHAR[t.c] = i; });

/* `texto` diz o que o campo livre significa para aquele tipo; sem ele a
   coisa nao leva texto. Tipo desconhecido e aceito e so gera aviso: um mapa
   feito numa versao mais nova do editor nao pode perder coisas ao abrir. */
/* Os MARCOS sao coisas que nao se veem no jogo como objeto, mas dizem o que
   o lugar faz: onde se comeca, onde se entra na dungeon, a porta que pede
   chave, a alavanca e o que ela abre. Cada tipo diz os CAMPOS que aceita --
   `k` e o nome no arquivo (k=valor, sem espaco), `tipo` e texto, numero,
   sim (0 ou 1), cor (#rrggbb), lista (de `opcoes`) ou id (o nome que outro
   marco usa para ligar neste) -- e o `padrao` que o canteiro poe ao criar.
   Todo marco aceita `z`, a altura do piso em que ele fica: o bau no andar de
   cima de uma casa.

   A passagem SECRETA pode ter alternativas: varias com o mesmo `grupo`, e o
   jogo sorteia qual vale pela `semente` do mapa (sortearSegredos, abaixo) --
   a mesma semente, o mesmo segredo, em qualquer maquina.

   Luz, som e gatilho so guardam o dado: as regras de jogo deles ainda nao
   estao decididas. */
const CRIATURAS_DO_NINHO = ["diabrete", "goblin", "aranha", "morcego", "cavaleiro"];
const COISAS = [
  {id:"jogador",   nome:"in\u00edcio do jogador", letra:"P", cor:"#ffffff", grupo:"marco"},
  {id:"respawn",   nome:"ponto de volta",        letra:"R", cor:"#d8f0ff", grupo:"marco",
   campos:[{k:"id", tipo:"id"}]},
  {id:"npc",       nome:"morador",               letra:"N", cor:"#f2d45c", grupo:"marco", texto:"nome"},
  {id:"placa",     nome:"placa",                 letra:"!", cor:"#e8c890", grupo:"marco", texto:"o que est\u00e1 escrito"},
  {id:"entrada",   nome:"entrada de dungeon",    letra:"E", cor:"#b98cff", grupo:"marco",
   campos:[{k:"mapa", tipo:"texto", nome:"mapa de destino"}, {k:"id", tipo:"id", nome:"par (a sa\u00edda de l\u00e1 tem o mesmo)"}]},
  {id:"saida",     nome:"sa\u00edda de dungeon",  letra:"X", cor:"#8f6ad0", grupo:"marco",
   campos:[{k:"mapa", tipo:"texto", nome:"mapa de volta"}, {k:"id", tipo:"id", nome:"par (a entrada de l\u00e1 tem o mesmo)"}]},
  {id:"porta",     nome:"porta",                 letra:"D", cor:"#b0773a", grupo:"marco",
   campos:[{k:"id", tipo:"id"}, {k:"chave", tipo:"texto", nome:"chave que abre (vazio: sem tranca)"},
           {k:"fechada", tipo:"sim", padrao:"1"}]},
  {id:"segredo",   nome:"passagem secreta",      letra:"?", cor:"#9a6ad0", grupo:"marco",
   campos:[{k:"id", tipo:"id"}, {k:"grupo", tipo:"texto", nome:"grupo de alternativas (uma vale, sorteada)"}]},
  {id:"alavanca",  nome:"alavanca",              letra:"/", cor:"#c8c8d0", grupo:"marco",
   campos:[{k:"abre", tipo:"texto", nome:"id da porta, grade ou pe\u00e7a que ela abre"}]},
  {id:"grade",     nome:"grade",                 letra:"H", cor:"#808890", grupo:"marco",
   campos:[{k:"id", tipo:"id"}, {k:"aberta", tipo:"sim", padrao:"0"}]},
  {id:"armadilha", nome:"armadilha",             letra:"x", cor:"#ff6040", grupo:"marco",
   campos:[{k:"tipo", tipo:"lista", opcoes:["espinhos", "fogo", "queda", "dardos"], padrao:"espinhos"},
           {k:"dano", tipo:"numero", padrao:"10"}, {k:"id", tipo:"id"}]},
  {id:"bau",       nome:"ba\u00fa",               letra:"B", cor:"#c89040", grupo:"marco",
   campos:[{k:"conteudo", tipo:"texto", padrao:"ouro:10", nome:"o que tem (item:quantos,item:quantos)"},
           {k:"chave", tipo:"texto", nome:"chave que abre (vazio: sem tranca)"}, {k:"id", tipo:"id"}]},
  {id:"ninho",     nome:"ninho de criaturas",    letra:"C", cor:"#e04a3a", grupo:"marco",
   campos:[{k:"criatura", tipo:"lista", opcoes:CRIATURAS_DO_NINHO, padrao:"diabrete"},
           {k:"quantos", tipo:"numero", padrao:"3"}, {k:"raio", tipo:"numero", padrao:"4"}]},
  {id:"luz",       nome:"luz",                   letra:"*", cor:"#ffe080", grupo:"marco",
   campos:[{k:"cor", tipo:"cor", padrao:"#ffc070"}, {k:"raio", tipo:"numero", padrao:"5"}, {k:"tremor", tipo:"numero", padrao:"0.2"}]},
  {id:"som",       nome:"som ambiente",          letra:"~", cor:"#70c0e0", grupo:"marco",
   campos:[{k:"som", tipo:"texto", padrao:"vento"}, {k:"raio", tipo:"numero", padrao:"8"}, {k:"volume", tipo:"numero", padrao:"0.5"}]},
  {id:"gatilho",   nome:"gatilho de \u00e1rea",   letra:"G", cor:"#60e0a0", grupo:"marco", texto:"o que acontece",
   campos:[{k:"larg", tipo:"numero", padrao:"3"}, {k:"alt", tipo:"numero", padrao:"3"}, {k:"id", tipo:"id"},
           {k:"uma_vez", tipo:"sim", padrao:"1"}]},
  {id:"navio",     nome:"navio",                 letra:"S", cor:"#d9a066", grupo:"marco"},
  {id:"arvore",    nome:"\u00e1rvore",           letra:"",  cor:"#2f5a24", grupo:"cen\u00e1rio"},
  {id:"pinheiro",  nome:"pinheiro",              letra:"",  cor:"#1f4a30", grupo:"cen\u00e1rio"},
  {id:"arbusto",   nome:"arbusto",               letra:"",  cor:"#5b8a3a", grupo:"cen\u00e1rio"},
  {id:"pedra",     nome:"pedra",                 letra:"",  cor:"#9a948a", grupo:"cen\u00e1rio"},
  {id:"barril",    nome:"barril",                letra:"",  cor:"#8a5a2b", grupo:"cen\u00e1rio"},
  {id:"caixote",   nome:"caixote",               letra:"",  cor:"#b08850", grupo:"cen\u00e1rio"},
  {id:"tocha",     nome:"tocha",                 letra:"t", cor:"#ff9a24", grupo:"cen\u00e1rio"},
  {id:"lampiao",   nome:"poste de lampi\u00e3o", letra:"l", cor:"#ffd27a", grupo:"cen\u00e1rio"},
  {id:"poco",      nome:"po\u00e7o",             letra:"o", cor:"#7aa0c0", grupo:"cen\u00e1rio"},
  {id:"diabrete",  nome:"diabrete",              letra:"i", cor:"#e04a3a", grupo:"criatura"},
  {id:"goblin",    nome:"goblin arqueiro",       letra:"g", cor:"#e04a3a", grupo:"criatura"},
  {id:"aranha",    nome:"aranha",                letra:"s", cor:"#e04a3a", grupo:"criatura"},
  {id:"morcego",   nome:"morcego",               letra:"b", cor:"#e04a3a", grupo:"criatura"},
  {id:"cavaleiro", nome:"cavaleiro espectral",   letra:"w", cor:"#e04a3a", grupo:"criatura"},
  {id:"vhalgorn",  nome:"Vhalgorn",              letra:"Z", cor:"#ff2a2a", grupo:"criatura"}
];
const COISA_POR_ID = {};
COISAS.forEach(function(c){ COISA_POR_ID[c.id] = c; });
/* os campos de um tipo de coisa, com o z que todo marco aceita */
function camposDoTipo(tipo){
  const d = COISA_POR_ID[tipo];
  return ((d && d.campos) || []).concat(d && d.grupo === "marco" ? [{k:"z", tipo:"numero", nome:"altura do piso"}] : []);
}
/* os campos com o padrao de cada um, para a coisa nova */
function camposPadrao(tipo){
  const out = {};
  for (const c of camposDoTipo(tipo)) if (c.padrao !== undefined) out[c.k] = c.padrao;
  return Object.keys(out).length ? out : null;
}
/* O problema de um valor de campo, ou "" se ele serve. */
function problemaDoCampo(def, v){
  if (v === undefined || v === "") return "";
  if (/\s/.test(v)) return "tem espa\u00e7o";
  if (def.tipo === "numero" && !isFinite(Number(v))) return "n\u00e3o \u00e9 n\u00famero";
  if (def.tipo === "sim" && v !== "0" && v !== "1") return "\u00e9 0 ou 1";
  if (def.tipo === "cor" && !/^#[0-9a-fA-F]{6}$/.test(v)) return "n\u00e3o \u00e9 uma cor #rrggbb";
  if (def.tipo === "lista" && def.opcoes.indexOf(v) < 0) return "n\u00e3o \u00e9 " + def.opcoes.join(", ");
  if (def.tipo === "id" && !/^[a-z0-9][a-z0-9_-]*$/.test(v)) return "id s\u00f3 com letra min\u00fascula, n\u00famero, - e _";
  return "";
}
/* O sorteio das passagens secretas: de cada grupo, a alternativa que vale.
   A semente do mapa entra num hash com o nome do grupo -- sem Math.random, e
   sem depender da ordem das coisas no arquivo. Devolve Map grupo -> coisa. */
function sortearSegredos(m, semente){
  const grupos = new Map();
  for (const c of m.coisas){
    if (c.tipo !== "segredo" || !c.campos || !c.campos.grupo) continue;
    if (!grupos.has(c.campos.grupo)) grupos.set(c.campos.grupo, []);
    grupos.get(c.campos.grupo).push(c);
  }
  const s = String(semente === undefined ? (m.semente === null || m.semente === undefined ? 1 : m.semente) : semente);
  const out = new Map();
  grupos.forEach(function(lista, g){
    lista.sort(function(a, b){ return a.y - b.y || a.x - b.x; });
    let h = 2166136261;
    for (const ch of s + ":" + g){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    out.set(g, lista[(h >>> 0) % lista.length]);
  });
  return out;
}

const ALTURA_MAX = 35;                      // MAPA 1: base 36, um caractere
const ALTURA_MAX2 = 1295;                   // MAPA 2: dois caracteres, uns 324 tiles
/* O teto da montanha depende da versao: 35 degraus sao 8,75 tiles, uns 17
   metros -- pouco para uma montanha que se sobe. */
function alturaMaxima(m){ return (m && m.versao >= 2) ? ALTURA_MAX2 : ALTURA_MAX; }

function novoMapa(larg, alt, opcoes){
  const o = opcoes || {};
  const n = larg*alt;
  const m = {
    versao: o.versao === undefined ? MAPA_VERSAO : o.versao,
    nome: o.nome || "sem-nome", larg: larg, alt: alt,
    passo: o.passo || 0.25,
    mar: o.mar === undefined ? 4 : o.mar,  // null = mapa sem mar
    terreno: new Uint8Array(n),
    altura: new Uint16Array(n),
    teto: new Uint16Array(n),
    pecas: [],                              // o que se constroi, ver src/pecas.js
    construcoes: [],                        // {id, estilo, nome}: o estilo de um grupo de pecas
    regioes: [],                            // {id, nome, campos}: pedacos do mundo com nome
    regiao: new Uint16Array(n),             // de que regiao e cada tile (0 = nenhuma)
    coisas: [],
    semente: null,                          // o sorteio dos segredos; null = 1
    extras: []                              // cabecalho que esta versao nao conhece
  };
  m.terreno.fill(o.terreno === undefined ? TERRENO_POR_CHAR["~"] : o.terreno);
  m.altura.fill(o.altura === undefined ? 0 : o.altura);
  return m;
}
/* O MAPA 1 lido vira MAPA 2 sem perder nada: as grades sao as mesmas, e o
   que ele nao tinha (peca, construcao) nasce vazio. */
function converterMapa(m){
  m.versao = 2;
  if (!m.pecas) m.pecas = [];
  if (!m.construcoes) m.construcoes = [];
  if (!m.regioes) m.regioes = [];
  if (!m.regiao) m.regiao = new Uint16Array(m.larg*m.alt);
  return m;
}

/* ---------- leitura ----------
   Devolve {mapa, erros}. Erro e o que impede de montar o mapa -- linha
   curta, caractere que nao existe. Com qualquer erro o mapa volta null, para
   ninguem salvar por cima de um arquivo lido pela metade. */
function lerMapa(texto){
  const erros = [];
  const erro = function(n, msg){ erros.push({linha:n, msg:msg}); };
  const linhas = String(texto).replace(/\r\n?/g, "\n").split("\n");

  let i = 0;
  const proxima = function(){                // pula vazias e comentarios
    while (i < linhas.length){
      const t = linhas[i].trim();
      if (t === "" || t.slice(0,2) === "//"){ i++; continue; }
      return linhas[i];
    }
    return null;
  };

  /* cabecalho: ate a primeira secao */
  const cab = {extras: []};
  let viuAssinatura = false;
  for (let l = proxima(); l !== null && l.trim()[0] !== "["; l = proxima()){
    const partes = l.trim().split(/\s+/);
    const k = partes[0], n = i+1;
    i++;
    if (k === "MAPA"){
      viuAssinatura = true;
      cab.versao = Number(partes[1]) || 1;
      if (cab.versao > MAPA_VERSAO)
        erro(n, "mapa da vers\u00e3o " + partes[1] + ", este c\u00f3digo l\u00ea at\u00e9 a " + MAPA_VERSAO);
    }
    else if (k === "nome") cab.nome = textoLido(partes.slice(1).join(" "));
    else if (k === "tamanho"){ cab.larg = parseInt(partes[1], 10); cab.alt = parseInt(partes[2], 10); }
    else if (k === "passo") cab.passo = parseFloat(partes[1]);
    else if (k === "mar") cab.mar = partes[1] === "nenhum" ? null : parseInt(partes[1], 10);
    else if (k === "semente" && /^-?\d+$/.test(partes[1] || "")) cab.semente = parseInt(partes[1], 10);
    else cab.extras.push(l.trim());
  }
  if (!viuAssinatura) erro(1, "o arquivo n\u00e3o come\u00e7a com MAPA");
  if (!(cab.larg > 0 && cab.alt > 0)) erro(1, "falta a linha tamanho");
  if (erros.length) return {mapa:null, erros:erros};

  const m = novoMapa(cab.larg, cab.alt, {nome:cab.nome, passo:cab.passo, mar:cab.mar, versao:cab.versao});
  m.extras = cab.extras;
  if (cab.semente !== undefined) m.semente = cab.semente;
  const vistas = {};

  while (proxima() !== null){
    const cabecalho = linhas[i].trim();
    const nSecao = i+1;
    i++;
    const dentro = cabecalho.replace(/^\[|\]$/g, "").trim().split(/\s+/);
    const secao = dentro[0], passoDaGrade = dentro[1] ? parseInt(dentro[1], 10) : 0;
    if (vistas[secao]) erro(nSecao, "se\u00e7\u00e3o [" + secao + "] repetida");
    vistas[secao] = true;

    /* MAPA 2: a grade vem em pedacos, uma linha por pedaco, com corridas */
    if (passoDaGrade > 0 && (secao === "terreno" || secao === "altura" || secao === "teto" || secao === "regiao")){
      const destino = m[secao], npx = Math.ceil(m.larg/passoDaGrade), npy = Math.ceil(m.alt/passoDaGrade);
      const feitos = new Uint8Array(npx*npy);
      for (let l = proxima(); l !== null && l.trim()[0] !== "["; l = proxima()){
        const n = i+1;
        i++;
        const toks = l.trim().split(/\s+/);
        const px = parseInt(toks[0], 10), py = parseInt(toks[1], 10);
        if (!(px >= 0 && px < npx && py >= 0 && py < npy)){
          erro(n, "[" + secao + "] peda\u00e7o " + toks[0] + "," + toks[1] + " fora do mapa"); continue;
        }
        if (feitos[py*npx + px]) erro(n, "[" + secao + "] peda\u00e7o " + px + "," + py + " repetido");
        feitos[py*npx + px] = 1;
        const x0 = px*passoDaGrade, y0 = py*passoDaGrade;
        const x1 = Math.min(m.larg, x0 + passoDaGrade), y1 = Math.min(m.alt, y0 + passoDaGrade);
        const quantos = (x1 - x0)*(y1 - y0);
        let k = 0, ruim = false;
        for (let t = 2; t < toks.length && !ruim; t++){
          const tok = toks[t], estrela = tok.indexOf("*");
          const texto = estrela < 0 ? tok : tok.slice(0, estrela);
          const vezes = estrela < 0 ? 1 : parseInt(tok.slice(estrela + 1), 36);
          let v;
          if (secao === "terreno") v = TERRENO_POR_CHAR[texto];
          else if (texto === ".") v = 0;
          else if (/^[0-9a-z]{1,2}$/.test(texto)) v = parseInt(texto, 36);
          if (v === undefined || !(vezes > 0)){
            erro(n, "[" + secao + "] n\u00e3o entendi '" + tok + "'"); ruim = true; break;
          }
          for (let q = 0; q < vezes; q++, k++){
            if (k >= quantos){ erro(n, "[" + secao + "] peda\u00e7o " + px + "," + py + " tem mais c\u00e9lulas que cabe"); ruim = true; break; }
            destino[(y0 + ((k/(x1 - x0)) | 0))*m.larg + x0 + (k % (x1 - x0))] = v;
          }
        }
        if (!ruim && k !== quantos)
          erro(n, "[" + secao + "] peda\u00e7o " + px + "," + py + " tem " + k + " c\u00e9lulas, precisa de " + quantos);
      }
      for (let p = 0; p < feitos.length; p++)
        if (!feitos[p]){ erro(nSecao, "[" + secao + "] falta o peda\u00e7o " + (p % npx) + "," + ((p/npx) | 0)); break; }
    }
    else if (secao === "regioes"){
      for (let l = proxima(); l !== null && l.trim()[0] !== "["; l = proxima()){
        const n = i+1;
        i++;
        const toks = l.trim().split(/\s+/);
        if (toks[0] !== "r"){ erro(n, "linha de regiao mal escrita: " + l.trim()); continue; }
        const id = parseInt(toks[1], 10);
        if (!(id > 0)){ erro(n, "regiao sem numero: " + l.trim()); continue; }
        const reg = {id:id, nome:"", campos:null}, resto = [];
        for (let t = 2; t < toks.length; t++){
          const kv = toks[t].match(/^([a-z][a-z0-9_]*)=(.*)$/);
          if (kv){ if (!reg.campos) reg.campos = {}; reg.campos[kv[1]] = kv[2]; }
          else resto.push(toks[t]);
        }
        reg.nome = textoLido(resto.join(" "));
        m.regioes.push(reg);
      }
    }
    else if (secao === "pecas"){
      for (let l = proxima(); l !== null && l.trim()[0] !== "["; l = proxima()){
        const n = i+1;
        i++;
        const toks = l.trim().split(/\s+/);
        if (toks[0] === "c"){
          const id = parseInt(toks[1], 10);
          if (!(id >= 0) || !toks[2]){ erro(n, "constru\u00e7\u00e3o mal escrita: " + l.trim()); continue; }
          m.construcoes.push({id:id, estilo:toks[2], nome:textoLido(toks.slice(3).join(" "))});
        } else if (toks[0] === "p"){
          if (toks.length < 7){ erro(n, "pe\u00e7a mal escrita: " + l.trim()); continue; }
          const p = {construcao:parseInt(toks[1], 10), tipo:toks[2],
                     x:parseFloat(toks[3]), y:parseFloat(toks[4]), z:parseFloat(toks[5]),
                     giro:parseFloat(toks[6]), espelho:0};
          if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z) || !isFinite(p.giro)){
            erro(n, "pe\u00e7a com n\u00famero estranho: " + l.trim()); continue;
          }
          for (let t = 7; t < toks.length; t++){
            if (toks[t] === "e") p.espelho = 1;
            else {
              const c = toks[t].match(/^([a-z][a-z0-9_]*)=(.*)$/);
              if (c){ if (!p.campos) p.campos = {}; p.campos[c[1]] = c[2]; }
              else erro(n, "n\u00e3o entendi '" + toks[t] + "' na pe\u00e7a");
            }
          }
          p.id = m.pecas.length + 1;               // o id nao vai no arquivo: e a ordem
          m.pecas.push(p);
        } else erro(n, "linha de pe\u00e7a mal escrita: " + l.trim());
      }
    }
    else if (secao === "terreno" || secao === "altura" || secao === "teto"){
      const destino = m[secao];
      for (let y=0; y<m.alt; y++){
        const l = proxima();
        const n = i+1;
        if (l === null || l.trim()[0] === "["){
          erro(n, "[" + secao + "] tem " + y + " linhas, precisa de " + m.alt); break;
        }
        i++;
        if (l.length !== m.larg){
          erro(n, "[" + secao + "] linha " + y + " tem " + l.length + " caracteres, precisa de " + m.larg);
          continue;
        }
        for (let x=0; x<m.larg; x++){
          const ch = l[x];
          let v;
          if (secao === "terreno") v = TERRENO_POR_CHAR[ch];
          else if (secao === "teto" && ch === ".") v = 0;
          else if (/[0-9a-z]/.test(ch)) v = parseInt(ch, 36);
          if (v === undefined){
            erro(n, "[" + secao + "] caractere '" + ch + "' desconhecido na coluna " + x); break;
          }
          destino[y*m.larg + x] = v;
        }
      }
    }
    else if (secao === "coisas"){
      for (let l = proxima(); l !== null && l.trim()[0] !== "["; l = proxima()){
        const n = i+1;
        i++;
        const mm = l.trim().match(/^(-?\d+)\s+(-?\d+)\s+(\S+)(?:\s+(.*))?$/);
        if (!mm){ erro(n, "coisa mal escrita: " + l.trim()); continue; }
        const c = {x:parseInt(mm[1],10), y:parseInt(mm[2],10), tipo:mm[3], texto:""};
        /* um pedaco solto do tipo chave=valor e campo; o resto e texto livre */
        const resto = [];
        for (const tok of (mm[4] || "").split(/\s+/)){
          if (!tok) continue;
          const kv = tok.match(/^([a-z][a-z0-9_]*)=(.*)$/);
          if (kv){ if (!c.campos) c.campos = {}; c.campos[kv[1]] = kv[2]; }
          else resto.push(tok);
        }
        c.texto = textoLido(resto.join(" "));
        m.coisas.push(c);
      }
    }
    else {
      erro(nSecao, "se\u00e7\u00e3o desconhecida: " + cabecalho);
      for (let l = proxima(); l !== null && l.trim()[0] !== "["; l = proxima()) i++;
    }
  }
  for (const s of ["terreno", "altura", "teto"])
    if (!vistas[s]) erro(linhas.length, "falta a se\u00e7\u00e3o [" + s + "]");

  return {mapa: erros.length ? null : m, erros: erros};
}

/* o acento vira \uXXXX na escrita, e volta na leitura */
function textoAscii(t){
  return String(t).replace(/[^\x00-\x7f]/g, function(c){ return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4); });
}
function textoLido(t){
  return String(t).replace(/\\u([0-9a-fA-F]{4})/g, function(_, h){ return String.fromCharCode(parseInt(h, 16)); });
}
/* ---------- escrita ----------
   Peca e coisa saem ordenadas por posicao: assim o diff no git mostra o que
   mudou no mapa, e nao a ordem em que foi clicado. O mapa e escrito na
   versao dele: um MAPA 1 aberto continua MAPA 1 ate ser convertido. */
function numero(v){
  const r = Math.round(v*1000)/1000;
  return String(r);
}
function escreverMapa(m){
  const versao = m.versao || 1;
  const out = [];
  out.push("MAPA " + versao);
  out.push("nome " + textoAscii(m.nome));
  out.push("tamanho " + m.larg + " " + m.alt);
  out.push("passo " + m.passo);
  out.push("mar " + (m.mar === null ? "nenhum" : m.mar));
  if (m.semente !== null && m.semente !== undefined) out.push("semente " + m.semente);
  for (const e of m.extras) out.push(e);

  /* MAPA 1: uma linha por fileira de tiles, um caractere por tile */
  const gradeAntiga = function(nome, cel){
    out.push("");
    out.push("[" + nome + "]");
    const g = m[nome];
    for (let y=0; y<m.alt; y++){
      const l = new Array(m.larg);
      for (let x=0; x<m.larg; x++) l[x] = cel(g[y*m.larg + x]);
      out.push(l.join(""));
    }
  };
  /* MAPA 2: uma linha por pedaco de 32x32, com corridas */
  const gradeEmPedacos = function(nome, cel){
    out.push("");
    out.push("[" + nome + " " + PEDACO_MAPA + "]");
    const g = m[nome];
    for (let py = 0; py*PEDACO_MAPA < m.alt; py++) for (let px = 0; px*PEDACO_MAPA < m.larg; px++){
      const x0 = px*PEDACO_MAPA, y0 = py*PEDACO_MAPA;
      const x1 = Math.min(m.larg, x0 + PEDACO_MAPA), y1 = Math.min(m.alt, y0 + PEDACO_MAPA);
      const toks = [];
      let atual = null, vezes = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++){
        const v = g[y*m.larg + x];
        if (v === atual){ vezes++; continue; }
        if (atual !== null) toks.push(cel(atual) + (vezes > 1 ? "*" + vezes.toString(36) : ""));
        atual = v; vezes = 1;
      }
      if (atual !== null) toks.push(cel(atual) + (vezes > 1 ? "*" + vezes.toString(36) : ""));
      out.push(px + " " + py + " " + toks.join(" "));
    }
  };
  const grade = versao >= 2 ? gradeEmPedacos : gradeAntiga;
  const maxA = alturaMaxima(m);
  const base36 = function(v){ return Math.max(0, Math.min(maxA, v)).toString(36); };
  grade("terreno", function(v){ return TERRENOS[v].c; });
  grade("altura",  base36);
  grade("teto",    function(v){ return v === 0 ? "." : base36(v); });
  if (versao >= 2 && (m.regioes || []).length){
    out.push("");
    out.push("[regioes]");
    for (const r of m.regioes.slice().sort(function(a, b){ return a.id - b.id; })){
      let l = "r " + r.id;
      if (r.campos) for (const k of Object.keys(r.campos).sort()) l += " " + k + "=" + r.campos[k];
      out.push(l + (r.nome ? " " + textoAscii(r.nome) : ""));
    }
    grade("regiao", function(v){ return v.toString(36); });
  }

  if (versao >= 2){
    out.push("");
    out.push("[pecas]");
    const cons = (m.construcoes || []).slice().sort(function(a, b){ return a.id - b.id; });
    for (const c of cons) out.push("c " + c.id + " " + c.estilo + (c.nome ? " " + textoAscii(c.nome) : ""));
    const ps = (m.pecas || []).slice().sort(function(a, b){
      return (a.construcao - b.construcao) || (a.y - b.y) || (a.x - b.x) || (a.z - b.z) ||
             (a.tipo < b.tipo ? -1 : a.tipo > b.tipo ? 1 : 0);
    });
    for (const p of ps){
      let l = "p " + p.construcao + " " + p.tipo + " " + numero(p.x) + " " + numero(p.y) + " " +
              numero(p.z) + " " + numero(p.giro || 0);
      if (p.espelho) l += " e";
      if (p.campos) for (const k of Object.keys(p.campos).sort()) l += " " + k + "=" + p.campos[k];
      out.push(l);
    }
  }

  out.push("");
  out.push("[coisas]");
  const cs = m.coisas.slice().sort(function(a, b){
    return a.y - b.y || a.x - b.x || (a.tipo < b.tipo ? -1 : a.tipo > b.tipo ? 1 : 0);
  });
  for (const c of cs){
    let l = c.x + " " + c.y + " " + c.tipo + (c.texto ? " " + textoAscii(c.texto) : "");
    if (c.campos) for (const k of Object.keys(c.campos).sort()) l += " " + k + "=" + c.campos[k];
    out.push(l);
  }
  return out.join("\n") + "\n";
}

/* Os tipos de peca moram em pecas.js. No jogo os dois arquivos sao
   concatenados; no node, este pede aquele -- e sem ele a validacao so deixa
   de reclamar de tipo desconhecido. */
function tiposDePeca(){
  if (typeof TIPOS_DE_PECA !== "undefined") return TIPOS_DE_PECA;
  if (typeof require === "function"){
    try { return require("./pecas.js").TIPOS_DE_PECA; } catch(e){}
  }
  return null;
}

/* ---------- avisos ----------
   Aviso nao impede de salvar: mapa pela metade e o estado normal de quem
   esta desenhando. E a lista do que o motor vai estranhar ao carregar. */
/* Cada aviso vem com o nivel: "erro" e o que quebra no jogo -- a coisa
   perdida dentro da parede, o campo que nao se le, a entrada sem destino --
   e impede exportar; "aviso" e o que vale olhar, mas o jogo aguenta. */
function validarMapa(m){
  const av = [];
  const diga = function(x, y, msg, nivel, extra){ av.push(Object.assign({x:x, y:y, msg:msg, nivel:nivel || "erro"}, extra)); };
  const W = m.larg, H = m.alt;
  const terr = function(x, y){ return (x<0||y<0||x>=W||y>=H) ? null : TERRENOS[m.terreno[y*W+x]]; };
  const parede = function(x, y){ const t = terr(x, y); return !t || t.tipo === "parede"; };

  if (m.mar !== null){
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      const t = TERRENOS[m.terreno[y*W+x]], h = m.altura[y*W+x];
      if (t.tipo === "chao" && h < m.mar) diga(x, y, t.nome + " abaixo do n\u00edvel do mar", "aviso");
      if (t.tipo === "agua" && h >= m.mar) diga(x, y, t.nome + " acima do n\u00edvel do mar", "aviso");
    }
  }
  for (let y=0; y<H; y++) for (let x=0; x<W; x++){
    if (TERRENOS[m.terreno[y*W+x]].tipo !== "porta") continue;
    const horiz = parede(x-1, y) && parede(x+1, y);
    const vert  = parede(x, y-1) && parede(x, y+1);
    if (!horiz && !vert) diga(x, y, "porta sem parede dos dois lados", "aviso");
  }

  let inicios = 0;
  const ocupado = {};
  for (const c of m.coisas){
    const def = COISA_POR_ID[c.tipo];
    if (c.x<0 || c.y<0 || c.x>=W || c.y>=H){ diga(c.x, c.y, c.tipo + " fora do mapa"); continue; }
    if (!def) diga(c.x, c.y, "tipo desconhecido: " + c.tipo);
    if (c.tipo === "jogador") inicios++;
    if (def && def.texto && !c.texto) diga(c.x, c.y, def.nome + " sem " + def.texto, "aviso");
    const t = terr(c.x, c.y);
    if (t.tipo === "parede") diga(c.x, c.y, (def ? def.nome : c.tipo) + " dentro de " + t.nome);
    const k = c.y*W + c.x;
    if (ocupado[k]) diga(c.x, c.y, "duas coisas no mesmo tile");
    ocupado[k] = true;
  }
  /* as pecas: tipo que este codigo nao conhece, peca fora do mapa e peca
     numa construcao que nao existe. A validacao de verdade -- peca solta no
     ar, dentro de outra, buraco em telhado -- e do canteiro. */
  for (const p of (m.pecas || [])){
    const px = Math.round(p.x), py = Math.round(p.y);
    if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H){ diga(px, py, "pe\u00e7a fora do mapa: " + p.tipo); continue; }
    const tipos = tiposDePeca();
    if (tipos && !tipos[p.tipo])
      diga(px, py, "tipo de pe\u00e7a desconhecido: " + p.tipo);
    if (p.construcao !== undefined && (m.construcoes || []).length &&
        !(m.construcoes || []).some(function(c){ return c.id === p.construcao; }))
      diga(px, py, "pe\u00e7a na constru\u00e7\u00e3o " + p.construcao + ", que n\u00e3o existe", "aviso");
  }
  /* os marcos: cada campo com o tipo dele, os ids sem repetir, e o que liga
     num id que existe neste mapa. A ligacao entre mapas -- a entrada daqui
     com a saida de la -- o canteiro confere com todos os mapas abertos. */
  const ids = new Map();
  for (const p of (m.pecas || [])) if (p.campos && p.campos.id) ids.set(p.campos.id, (ids.get(p.campos.id) || 0) + 1);
  for (const c of m.coisas) if (c.campos && c.campos.id) ids.set(c.campos.id, (ids.get(c.campos.id) || 0) + 1);
  ids.forEach(function(n, id){ if (n > 1) diga(-1, -1, "o id " + id + " aparece " + n + " vezes"); });
  const chaves = new Set();
  for (const c of m.coisas) if (c.tipo === "bau" && c.campos && c.campos.conteudo)
    for (const item of c.campos.conteudo.split(",")){ const kv = item.split(":"); if (kv[0] === "chave" && kv[1]) chaves.add(kv[1]); }
  const segredos = new Map();
  for (const c of m.coisas){
    const def = COISA_POR_ID[c.tipo];
    if (!def) continue;
    const nome = def.nome;
    for (const f of camposDoTipo(c.tipo)){
      const v = c.campos ? c.campos[f.k] : undefined;
      const r = problemaDoCampo(f, v);
      if (r) diga(c.x, c.y, nome + ": o campo " + f.k + " " + r);
    }
    const cp = c.campos || {};
    if ((c.tipo === "entrada" || c.tipo === "saida") && !cp.mapa && !c.texto) diga(c.x, c.y, nome + " sem o mapa de " + (c.tipo === "entrada" ? "destino" : "volta"), c.tipo === "entrada" ? "erro" : "aviso");
    if (c.tipo === "alavanca" && !cp.abre) diga(c.x, c.y, "alavanca que n\u00e3o abre nada", "aviso");
    if (c.tipo === "alavanca" && cp.abre && !ids.has(cp.abre)) diga(c.x, c.y, "a alavanca abre " + cp.abre + ", que n\u00e3o existe neste mapa");
    if ((c.tipo === "porta" || c.tipo === "bau") && cp.chave && !chaves.has(cp.chave))
      diga(c.x, c.y, nome + " pede a chave " + cp.chave + ", e nenhum ba\u00fa deste mapa a tem", "aviso", {chave: cp.chave});
    if (c.tipo === "segredo" && cp.grupo) segredos.set(cp.grupo, (segredos.get(cp.grupo) || 0) + 1);
  }
  segredos.forEach(function(n, g){ if (n < 2) diga(-1, -1, "o segredo do grupo " + g + " tem uma alternativa s\u00f3: o sorteio n\u00e3o sorteia nada", "aviso"); });
  if (inicios === 0) diga(-1, -1, "falta o in\u00edcio do jogador");
  if (inicios > 1)  diga(-1, -1, inicios + " in\u00edcios do jogador");
  return av;
}

if (typeof module !== "undefined") module.exports = {
  MAPA_VERSAO, PEDACO_MAPA, TERRENOS, TERRENO_POR_CHAR, COISAS, COISA_POR_ID, CRIATURAS_DO_NINHO,
  camposDoTipo, camposPadrao, problemaDoCampo, sortearSegredos,
  ALTURA_MAX, ALTURA_MAX2, alturaMaxima,
  novoMapa, converterMapa, lerMapa, escreverMapa, validarMapa
};
