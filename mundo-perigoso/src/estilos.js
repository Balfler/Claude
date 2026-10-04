/* ============================================================
   OS ESTILOS
   ------------------------------------------------------------
   Um estilo e o QUE a peca e feita: os materiais (cada um com a receita da
   textura de 64 por tile) e os numeros que mudam a forma dela -- altura do
   andar, espessura, inclinacao do telhado. O TIPO da peca, em pecas.js, diz
   a FORMA; o estilo diz a cara.

   Acrescentar um estilo e acrescentar uma entrada aqui. Nada no motor nem na
   ferramenta muda: a peca pede o material pelo nome ("parede", "piso",
   "telha") e quem resolve e este arquivo.

   A textura e desenhada pelo pintor (src/pintor.js), que nao usa canvas, e
   indexada pela maquinaria de cor de sempre (src/cores.js). As duas sao
   puras, entao o jogo, a ferramenta e a linha de comando fazem a mesma
   textura -- e a folha do catalogo pode sair sem navegador.

   Todo estilo precisa dos mesmos materiais, senao a peca cai no material
   "parede" e o erro so aparece olhando:

     parede, moldura, piso, forro, telha, cumeeira, pedra, madeira, metal
   ============================================================ */
const ESTILOS = {
  /* ---------------- casa ---------------- */
  "madeira-pescador": {
    nome: "madeira de pescador", categoria: "casa",
    forma: {alto: 1.5, larg: 1, fundo: 1, comp: 1.5, degrau: 0.25, espessura: 0.125},
    materiais: {
      parede:   {desenho: "tabuado",        cor: "#7a5230"},
      moldura:  {desenho: "tabuado",        cor: "#4a3020", larguraDaTabua: 6, travessas: false},
      piso:     {desenho: "assoalho",       cor: "#8a6038"},
      forro:    {desenho: "assoalho",       cor: "#5a4028", larguraDaTabua: 10},
      telha:    {desenho: "telha",          cor: "#8a4a2a"},
      cumeeira: {desenho: "telha",          cor: "#6e3a20", passo: 6},
      pedra:    {desenho: "pedraAssentada", cor: "#7d766a"},
      madeira:  {desenho: "tabuado",        cor: "#7a5230"},
      metal:    {desenho: "cantaria",       cor: "#4e4e56", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  },
  "pedra-vila": {
    nome: "pedra rustica de vila", categoria: "casa",
    /* pedra de um quarto de tile: a de um oitavo, a da madeira, parecia
       cartolina pintada */
    forma: {alto: 1.5, larg: 1, fundo: 1, comp: 1.5, degrau: 0.25, espessura: 0.25},
    materiais: {
      parede:   {desenho: "pedraAssentada", cor: "#8a8274"},
      moldura:  {desenho: "cantaria",       cor: "#9c9382", alturaDoBloco: 13, larguraDoBloco: 14},
      piso:     {desenho: "cantaria",       cor: "#6d6a63", alturaDoBloco: 32, larguraDoBloco: 32},
      forro:    {desenho: "assoalho",       cor: "#5a4028", larguraDaTabua: 10},
      telha:    {desenho: "telha",          cor: "#8e4430"},
      cumeeira: {desenho: "telha",          cor: "#6e3020", passo: 6},
      pedra:    {desenho: "pedraAssentada", cor: "#8a8274"},
      madeira:  {desenho: "tabuado",        cor: "#6a4628"},
      metal:    {desenho: "cantaria",       cor: "#4e4e56", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  },
  /* ---------------- castelo e fortaleza ---------------- */
  "fortaleza-humana": {
    nome: "pedra de fortaleza humana", categoria: "castelo",
    forma: {alto: 2, larg: 1, fundo: 1, comp: 2, degrau: 0.25, espessura: 0.5},
    materiais: {
      parede:   {desenho: "cantaria",       cor: "#8e8a80", alturaDoBloco: 16, larguraDoBloco: 32},
      moldura:  {desenho: "cantaria",       cor: "#a09a8c", alturaDoBloco: 10, larguraDoBloco: 16},
      piso:     {desenho: "cantaria",       cor: "#77736a", alturaDoBloco: 21, larguraDoBloco: 21},
      forro:    {desenho: "cantaria",       cor: "#5e5b54", alturaDoBloco: 21, larguraDoBloco: 21},
      telha:    {desenho: "telha",          cor: "#5a5f66"},
      cumeeira: {desenho: "telha",          cor: "#464b52", passo: 6},
      pedra:    {desenho: "cantaria",       cor: "#8e8a80"},
      madeira:  {desenho: "tabuado",        cor: "#5a4028"},
      metal:    {desenho: "cantaria",       cor: "#43434a", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  },
  /* ---------------- dungeon ---------------- */
  "cripta-pedra": {
    nome: "cripta de pedra", categoria: "dungeon",
    forma: {alto: 2, larg: 1, fundo: 1, comp: 2, degrau: 0.25, espessura: 0.25},
    materiais: {
      parede:   {desenho: "pedraAssentada", cor: "#4c4a50", junta: 0.5, fileiras: [16, 16, 16, 16]},
      moldura:  {desenho: "cantaria",       cor: "#5a5860", alturaDoBloco: 10, larguraDoBloco: 16},
      piso:     {desenho: "cantaria",       cor: "#3d3b42", alturaDoBloco: 32, larguraDoBloco: 32},
      forro:    {desenho: "pedraAssentada", cor: "#33313a", junta: 0.6},
      telha:    {desenho: "cantaria",       cor: "#3d3b42"},
      cumeeira: {desenho: "cantaria",       cor: "#33313a"},
      pedra:    {desenho: "pedraAssentada", cor: "#4c4a50"},
      madeira:  {desenho: "tabuado",        cor: "#4a3320"},
      metal:    {desenho: "cantaria",       cor: "#3a3a42", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  },
  "caverna": {
    nome: "caverna natural", categoria: "dungeon",
    forma: {alto: 2, larg: 1, fundo: 1, comp: 2, degrau: 0.25, espessura: 0.5},
    materiais: {
      parede:   {desenho: "rocha",          cor: "#5f584e"},
      moldura:  {desenho: "rocha",          cor: "#6e675b", facetas: 40},
      piso:     {desenho: "terra",          cor: "#4a443a"},
      forro:    {desenho: "rocha",          cor: "#3c372f", facetas: 80},
      telha:    {desenho: "rocha",          cor: "#4a443a"},
      cumeeira: {desenho: "rocha",          cor: "#3c372f"},
      pedra:    {desenho: "rocha",          cor: "#5f584e"},
      madeira:  {desenho: "tabuado",        cor: "#4a3320"},
      metal:    {desenho: "cantaria",       cor: "#3a3a42", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  },
  /* ---------------- infraestrutura ---------------- */
  "madeira-porto": {
    nome: "madeira de porto", categoria: "infra",
    forma: {alto: 1.5, larg: 1, fundo: 1, comp: 1.5, degrau: 0.25, espessura: 0.125},
    materiais: {
      parede:   {desenho: "tabuado",        cor: "#6a4a2c"},
      moldura:  {desenho: "tabuado",        cor: "#4a3320", larguraDaTabua: 6, travessas: false},
      piso:     {desenho: "assoalho",       cor: "#7a5230"},
      forro:    {desenho: "assoalho",       cor: "#5a4028"},
      telha:    {desenho: "telha",          cor: "#7a4428"},
      cumeeira: {desenho: "telha",          cor: "#5e3420", passo: 6},
      pedra:    {desenho: "pedraAssentada", cor: "#7d766a"},
      madeira:  {desenho: "tabuado",        cor: "#6a4a2c"},
      metal:    {desenho: "cantaria",       cor: "#4e4e56", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  },
  "pedra-obra": {
    nome: "pedra de obra", categoria: "infra",
    forma: {alto: 1.5, larg: 1, fundo: 1, comp: 1.5, degrau: 0.25, espessura: 0.25},
    materiais: {
      parede:   {desenho: "pedraAssentada", cor: "#7d766a"},
      moldura:  {desenho: "cantaria",       cor: "#8c8478", alturaDoBloco: 13, larguraDoBloco: 14},
      piso:     {desenho: "cantaria",       cor: "#6d6a63", alturaDoBloco: 16, larguraDoBloco: 16},
      forro:    {desenho: "cantaria",       cor: "#55524c"},
      telha:    {desenho: "telha",          cor: "#7a4428"},
      cumeeira: {desenho: "telha",          cor: "#5e3420", passo: 6},
      pedra:    {desenho: "pedraAssentada", cor: "#7d766a"},
      madeira:  {desenho: "tabuado",        cor: "#6a4a2c"},
      metal:    {desenho: "cantaria",       cor: "#4e4e56", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  },
  /* ---------------- natureza ---------------- */
  "rocha-ilha": {
    nome: "rocha e penhasco", categoria: "natureza",
    forma: {alto: 1, larg: 1, fundo: 1, comp: 1, degrau: 0.25, espessura: 0.5},
    materiais: {
      parede:   {desenho: "rocha",          cor: "#6a645a"},
      moldura:  {desenho: "rocha",          cor: "#78715f", facetas: 40},
      piso:     {desenho: "rocha",          cor: "#6a645a", facetas: 80},
      forro:    {desenho: "rocha",          cor: "#4a443c"},
      telha:    {desenho: "rocha",          cor: "#6a645a"},
      cumeeira: {desenho: "rocha",          cor: "#4a443c"},
      pedra:    {desenho: "rocha",          cor: "#6a645a"},
      madeira:  {desenho: "tabuado",        cor: "#4a3320"},
      metal:    {desenho: "cantaria",       cor: "#43434a", alturaDoBloco: 8, larguraDoBloco: 8}
    }
  }
};
const MATERIAIS_DO_ESTILO = ["parede", "moldura", "piso", "forro", "telha", "cumeeira", "pedra", "madeira", "metal"];
/* Os materiais que nao mudam com o estilo: o fogo da tocha e o mesmo na
   casa do pescador e na cripta. O motor desenha a chama acesa. */
const MATERIAIS_UNIVERSAIS = {
  chama: {desenho: "chama", cor: "#ff8a30", acesa: true}
};
/* Os materiais que saem de outro do estilo: a vidraca, a veneziana e a folha
   de porta tem a madeira do estilo no caixilho, nas tabuinhas e nas tabuas. */
const MATERIAIS_DERIVADOS = {
  porta:     {desenho: "portaDeTabuas", de: "madeira"},
  vidraca:   {desenho: "vidraca", de: "madeira"},
  veneziana: {desenho: "persiana", de: "madeira"}
};

/* As texturas ficam guardadas por estilo, material e nevoa: a mesma parede
   desbota no horizonte da tarde na ilha e no preto da cripta, e as duas
   versoes convivem quando se troca de mapa. */
const TEXTURAS_DE_ESTILO = new Map();
function texturaDoEstilo(estiloId, material, nevoa){
  if (!ESTILOS[estiloId]) estiloId = "madeira-pescador";
  const estilo = ESTILOS[estiloId];
  if (MATERIAIS_UNIVERSAIS[material]) estiloId = "todos";
  else if (!estilo.materiais[material] && !MATERIAIS_DERIVADOS[material]) material = "parede";
  const der = MATERIAIS_DERIVADOS[material];
  const def = MATERIAIS_UNIVERSAIS[material] ||
              (der ? Object.assign({}, der, {cor: estilo.materiais[der.de].cor}) : estilo.materiais[material]);
  const chave = estiloId + "/" + material + "/" + (nevoa || 0);
  let t = TEXTURAS_DE_ESTILO.get(chave);
  if (t) return t;
  const semente = estiloId + ":" + material;
  const tela = PINTOR[def.desenho](def.cor, Object.assign({semente: semente}, def));
  t = shadeStack(tela.px, tela.n, tela.n, nevoa || 0);
  if (tela.n > 64) comMips(t);                         // em 128 por tile, o mip (cores.js)
  TEXTURAS_DE_ESTILO.set(chave, t);
  return t;
}
/* Quantas texturas ja foram desenhadas -- o teste usa para ver que elas sao
   feitas uma vez so. */
function texturasDeEstiloFeitas(){ return TEXTURAS_DE_ESTILO.size; }

if (typeof module !== "undefined"){
  if (typeof PINTOR === "undefined") globalThis.PINTOR = require("./pintor.js");
  if (typeof shadeStack === "undefined"){
    const C = require("./cores.js");
    for (const k in C) globalThis[k] = C[k];
  }
  module.exports = {ESTILOS, MATERIAIS_DO_ESTILO, MATERIAIS_UNIVERSAIS, MATERIAIS_DERIVADOS, texturaDoEstilo, texturasDeEstiloFeitas};
}
