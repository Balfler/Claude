
/* ============================================================
   CONVERSA POR PALAVRAS-CHAVE
   ------------------------------------------------------------
   Como no Tibia: chega-se perto de um morador, diz-se "oi", e dali ele
   responde a palavras. As que ele entende aparecem entre chaves nas falas
   dele -- a tela pinta de outra cor --, e e assim que se descobre o que
   perguntar. Nao ha menu. A conversa e o jogo social, e o que se aprende
   numa conversa se conta para outro jogador.

   Puro, sem DOM. A resposta traz a acao (comprar, curar), e quem aplica no
   personagem e o jogo.
   ============================================================ */
const SAUDACOES = ["oi", "ola", "bom dia", "boa tarde", "boa noite", "salve"];
const DESPEDIDAS = ["tchau", "adeus", "ate mais", "falou"];
const LOJA = {
  pocao:   {nome:"po\u00e7\u00e3o de cura", preco:10},
  cristal: {nome:"cristal de mana",        preco:15},
  escudo:  {nome:"escudo",                 preco:20}
};
/* Quem responde o que. A chave e o primeiro nome, sem acento; a palavra, sem
   acento tambem. Texto e fala; objeto e acao. */
const MORADORES = {
  anselmo: {
    oi: "Alto l\u00e1. Bem-vindo a Pedra Alta. Pergunte da {cidade} ou da {cripta}.",
    cidade: "Armaz\u00e9m, taverna e ferraria ficam na pra\u00e7a. A capela, no alto.",
    cripta: "Fica debaixo da capela. A Irm\u00e3 Clarice guarda a descida.",
    trabalho: "Eu guardo o port\u00e3o."
  },
  tobias: {
    oi: "Bem-vindo ao armaz\u00e9m! Diga {comprar} para ver o que tenho.",
    comprar: "Tenho {po\u00e7\u00e3o} de cura por 10 moedas e {cristal} de mana por 15.",
    loja: "Tenho {po\u00e7\u00e3o} de cura por 10 moedas e {cristal} de mana por 15.",
    pocao: {compra:"pocao"},
    cristal: {compra:"cristal"},
    trabalho: "Vendo o que o navio traz, quando traz."
  },
  celeste: {
    oi: "Senta a\u00ed. Quer {cerveja}, ou veio pelos {boatos}?",
    cerveja: "Acabou. O navio n\u00e3o veio.",
    boatos: "Dizem que algo acordou debaixo da capela. E o Josias jura que o mar anda estranho."
  },
  bruno: {
    oi: "Hmpf. Ferraria. Tenho {escudo}, se tiver moeda.",
    escudo: {compra:"escudo"},
    trabalho: "Martelo e fogo, desde menino."
  },
  clarice: {
    oi: "Que a luz te guarde. Posso te dar {cura}, ou falar da {cripta}.",
    cura: {cura:true},
    cripta: "Tr\u00eas criptas abaixo da capela. A escada fica atr\u00e1s de mim. Des\u00e7a s\u00f3 se estiver pronto."
  },
  amadeu: {
    oi: "Hein? Ah, um forasteiro. Na minha \u00e9poca esta {ilha} era s\u00f3 pedra e gaivota.",
    ilha: "O povo chegou pelo mar, fugido do {rei} dem\u00f4nio.",
    rei: "N\u00e3o se diz o nome dele. Ele espera. Um dia a lua fica vermelha."
  },
  josias: {
    oi: "Ahoy! O {navio} ainda n\u00e3o zarpa.",
    navio: "S\u00f3 quando a mar\u00e9 virar. Volte quando estiver pronto para o continente.",
    trabalho: "Levo gente para o continente, quando o mar deixa."
  }
};
/* o que todo morador responde, se nao tiver resposta propria */
const PADRAO = {
  oi: "Ol\u00e1, forasteiro.",
  nome: "Me chamo %nome%.",
  trabalho: "Vivo aqui em Pedra Alta.",
  tchau: "At\u00e9 mais."
};

function semAcento(t){ return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
/* a primeira palavra do nome que e um morador conhecido: "Irma Clarice" e a
   Clarice, e "Guarda Anselmo" e o Anselmo */
function chaveDoMorador(nome){
  const palavras = semAcento(nome).split(/[^a-z]+/).filter(Boolean);
  return palavras.find(function(p){ return Object.prototype.hasOwnProperty.call(MORADORES, p); }) || palavras[0] || "";
}
/* como o morador aparece na conversa: o nome sem o oficio -- "Tobias o
   lojista" e Tobias, "Josias, o barqueiro" e Josias */
function nomeCurto(nome){ return String(nome).split(",")[0].split(/ (?:o|a|do|da) /)[0].trim(); }

/* `estado` e {falando, ouro}: se a conversa com este morador ja comecou e
   quanto ouro o personagem tem. Devolve {fala, falando, acao}; fala null e o
   morador fingindo que nao ouviu, que e o que ele faz antes do "oi". */
function responder(nome, texto, estado){
  const t = " " + semAcento(texto).replace(/[^a-z]+/g, " ").trim() + " ";
  const tem = function(p){ return t.indexOf(" " + p + " ") >= 0; };
  const tabela = Object.assign({}, PADRAO, MORADORES[chaveDoMorador(nome)] || {});
  const falar = function(s){ return s.replace(/%nome%/g, nome); };
  const falando = !!(estado && estado.falando), ouro = (estado && estado.ouro) || 0;
  if (!falando){
    if (SAUDACOES.some(tem)) return {fala:falar(tabela.oi), falando:true, acao:null};
    return {fala:null, falando:false, acao:null};
  }
  if (DESPEDIDAS.some(tem)) return {fala:falar(PADRAO.tchau), falando:false, acao:null};
  for (const chave of Object.keys(tabela)){
    if (chave === "oi" || chave === "tchau" || !tem(chave)) continue;
    const r = tabela[chave];
    if (typeof r === "string") return {fala:falar(r), falando:true, acao:null};
    if (r.compra){
      const item = LOJA[r.compra];
      if (ouro < item.preco) return {fala:"Custa " + item.preco + " moedas, e voc\u00ea n\u00e3o tem.", falando:true, acao:null};
      return {fala:"Aqui est\u00e1: " + item.nome + ", por " + item.preco + " moedas.", falando:true,
              acao:{compra:r.compra, preco:item.preco}};
    }
    if (r.cura) return {fala:"Pronto. V\u00e1 com a luz.", falando:true, acao:{cura:true}};
  }
  if (SAUDACOES.some(tem)) return {fala:falar(tabela.oi), falando:true, acao:null};
  return {fala:"Hm? N\u00e3o entendi.", falando:true, acao:null};
}

/* A fala em pedacos, para a tela pintar as palavras-chave de outra cor. */
function partesDaFala(fala){
  const out = [], re = /\{([^}]+)\}/g;
  let k = 0, m;
  while ((m = re.exec(fala))){
    if (m.index > k) out.push({texto:fala.slice(k, m.index), chave:false});
    out.push({texto:m[1], chave:true});
    k = re.lastIndex;
  }
  if (k < fala.length) out.push({texto:fala.slice(k), chave:false});
  return out;
}

if (typeof module !== "undefined") module.exports = {
  SAUDACOES, DESPEDIDAS, LOJA, MORADORES, PADRAO, semAcento, chaveDoMorador, nomeCurto, responder, partesDaFala
};
