/* Testes da conversa por palavras-chave. Nao precisa do jogo montado.
   Uso: node mundo-perigoso/teste/conversa.test.js */
const fs = require("fs");
const path = require("path");
const C = require("../src/conversa.js");
const { placar } = require("./harness");
const { check, fim } = placar();

const conversa = (nome, falas, ouro) => {
  let estado = {falando: false, ouro: ouro || 0};
  return falas.map(f => {
    const r = C.responder(nome, f, estado);
    estado = {falando: r.falando, ouro: estado.ouro};
    return r;
  });
};

/* 1. comecar, perguntar, despedir */
{
  const [antes, oi] = conversa("Tobias o lojista", ["comprar", "Oi!"]);
  check("antes do oi o morador finge que nao ouviu", antes.fala === null && !antes.falando);
  check("oi comeca a conversa com a fala propria do morador", oi.falando && /armaz/.test(oi.fala));
  const [, , tchau, depois] = conversa("Tobias o lojista", ["oi", "trabalho", "tchau", "comprar"]);
  check("tchau encerra, e depois dele e preciso outro oi", !tchau.falando && depois.fala === null);
}

/* 2. palavras sem acento, maiusculas e no meio da frase */
{
  const [, r] = conversa("Irma Clarice, a sacerdotisa", ["bom dia", "me fala da CRIPTA por favor"]);
  check("a palavra-chave vale no meio da frase, em maiuscula", /criptas abaixo/.test(C.semAcento(r.fala)));
  const [, a, b] = conversa("Tobias o lojista", ["ola", "poção", "pocao"], 100);
  check("pocao com e sem acento e a mesma palavra", !!a.acao && !!b.acao && a.acao.compra === "pocao");
  const [, nada] = conversa("Tobias o lojista", ["oi", "cocao"]);
  check("palavra parecida nao conta", nada.acao === null && /entendi/.test(nada.fala));
}

/* 3. comprar e curar */
{
  const [, sem] = conversa("Tobias o lojista", ["oi", "cristal"], 5);
  check("sem ouro nao vende, e diz o preco", sem.acao === null && /15/.test(sem.fala));
  const [, com] = conversa("Bruno o ferreiro", ["oi", "quero um escudo"], 20);
  check("com ouro vende, e a acao traz o item e o preco", com.acao && com.acao.compra === "escudo" && com.acao.preco === 20);
  const [, cura] = conversa("Irma Clarice", ["oi", "cura"]);
  check("a sacerdotisa cura de graca", cura.acao && cura.acao.cura === true);
}

/* 4. morador sem fala propria e as chaves na tela */
{
  const [oi, nome] = conversa("Teste, o morador", ["oi", "qual o seu nome"]);
  check("morador desconhecido usa as respostas de todos", oi.fala === C.PADRAO.oi && nome.fala === "Me chamo Teste, o morador.");
  const partes = C.partesDaFala("Tenho {poção} e {cristal}.");
  check("a fala se parte em texto e palavras-chave", partes.length === 5 && partes[1].chave && partes[1].texto === "poção" && !partes[2].chave);
  const faltando = [];
  for (const k in C.MORADORES) for (const chave in C.MORADORES[k]){
    const r = C.MORADORES[k][chave];
    if (typeof r !== "string") continue;
    for (const p of C.partesDaFala(r)) if (p.chave && !(C.semAcento(p.texto) in C.MORADORES[k]) && !(C.semAcento(p.texto) in C.PADRAO))
      faltando.push(k + ":" + p.texto);
  }
  check("toda palavra destacada numa fala tem resposta", faltando.length === 0, faltando.join(", "));
}

const s = fs.readFileSync(path.join(__dirname, "..", "src", "conversa.js"), "utf8");
const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
check("src/conversa.js e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);

fim();
