/* Monta o simulador de atraso: o jogo montado (cripta-vhalgorn.html) com a
   costura de atraso.js, num arquivo so, que abre direto do disco.
   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/2-rede/montar-atraso.js
   Sai mundo-perigoso/sondagens/2-rede/atraso.html. Abra, aperte Enter e jogue
   a cripta; [ e ] mudam o atraso, \ liga e desliga a compensacao, - e =
   mudam o preparo do golpe dos bichos. Tambem aceita
   ?atraso=150&comp=0&preparo=0.5 no endereco. */
"use strict";
const fs = require("fs"), path = require("path");
const MONTADO = path.join(__dirname, "..", "..", "..", "cripta-vhalgorn.html");

function trocarUma(js, de, para){
  const n = js.split(de).length - 1;
  if (n !== 1) throw new Error("costura: esperava 1 ocorrencia, achei " + n + " de: " + de.slice(0, 80));
  return js.replace(de, () => para);
}
function costurarAtraso(js, padrao){
  /* o jogo montado no Windows pode vir em CRLF; as buscas daqui sao em LF */
  js = js.replace(/\r\n/g, "\n");
  /* com a proposta 4 aplicada no src/, o passo do mundo ja e uma funcao so */
  const nova = js.indexOf("function passoDoJogador(P, dt, ent){") >= 0;
  js = trocarUma(js, "function update(dt, ent){", "function __updateOriginal(dt, ent){");
  js = trocarUma(js, "function render(){", "function __renderOriginal(){");
  if (nova){
    js = trocarUma(js, "function hurtPlayer(n, ignoreArmor, P = JOGADOR_DA_TELA){", "function __hurtPlayerAgora(n, ignoreArmor, P = JOGADOR_DA_TELA){");
    js = trocarUma(js, "function fire(P = JOGADOR_DA_TELA){", "function __fireAgora(P = JOGADOR_DA_TELA){");
  } else {
    js = trocarUma(js, "function hurtPlayer(n, ignoreArmor){", "function __hurtPlayerAgora(n, ignoreArmor){");
    js = trocarUma(js, "function fire(){", "function __fireAgora(){");
  }
  js = trocarUma(js, "function som(nome){", "function __somAgora(nome){");
  /* o servidor ve o jogador uma ida atras: na agenda e no passo do mundo */
  if (nova) js = trocarUma(js, "  passoDoMundo(dt);\n", "  __ATR.trocarP(); passoDoMundo(dt); __ATR.destrocarP(); __ATR.gravar();\n");
  else {
    js = trocarUma(js, "  for (const a of ent.acoes) aplicarAcao(a);\n  rodarAgenda();",
                       "  for (const a of ent.acoes) aplicarAcao(a);\n  __ATR.trocarP(); rodarAgenda(); __ATR.destrocarP();");
    js = trocarUma(js, "  /* --- entidades --- */", "  __ATR.trocarP();\n  /* --- entidades --- */");
    js = trocarUma(js, "  updateProjs(dt);\n  /* a conversa acaba", "  updateProjs(dt);\n  __ATR.destrocarP(); __ATR.gravar();\n  /* a conversa acaba");
  }
  /* o preparo do golpe dos bichos (0,19 s) vira um numero que a medicao muda;
     com a proposta 2 aplicada no src/, o preparo ja e dado, e so o padrao muda */
  if (js.includes("const preparo = d.preparo || 0.19;"))
    js = trocarUma(js, "const preparo = d.preparo || 0.19;", "const preparo = d.preparo || __PREPARO;");
  else js = trocarUma(js, "agendar(0.19, ()=>{ if (!e.dead && !P.dead", "agendar(__PREPARO, ()=>{ if (!e.dead && !P.dead");
  js = "var __PREPARO = 0.19;\n" + js;
  /* sem mapa no endereco, abre a cripta: e onde tem bicho */
  js = trocarUma(js, "(location.search || \"\")",
    "(/mapa=/.test(location.search || \"\") ? location.search : \"?mapa=cripta\" + (location.search ? \"&\" + location.search.slice(1) : \"\"))");
  let emulador = fs.readFileSync(path.join(__dirname, "atraso.js"), "utf8");
  if (padrao !== undefined) emulador = trocarUma(emulador, "|| 150);", "|| " + padrao + ");").replace("? pedido : 150;", "? pedido : " + padrao + ";");
  js = trocarUma(js, "requestAnimationFrame(frame);\ncvs.focus();\n})();", emulador + "\nrequestAnimationFrame(frame);\ncvs.focus();\n})();");
  return js;
}

if (require.main === module){
  const html = fs.readFileSync(MONTADO, "utf8").replace(/\r\n/g, "\n");
  const m = html.match(/<script>\n([\s\S]*)<\/script>/);
  /* --padrao N troca o atraso de quando o endereco nao diz nada (o teste usa 0) */
  const ip = process.argv.indexOf("--padrao"), padrao = ip > 0 ? +process.argv[ip + 1] : undefined;
  const ia = process.argv.indexOf("--saida");
  let saida = html.replace(m[1], () => costurarAtraso(m[1], padrao));
  saida = saida.replace(/<title>[^<]*<\/title>/, "<title>A Cripta de Vhalgorn - simulador de atraso</title>");
  const nao = [...saida].findIndex(c => c.charCodeAt(0) > 127);
  if (nao >= 0) throw new Error("caractere nao-ASCII na posicao " + nao);
  const destino = ia > 0 ? path.resolve(process.argv[ia + 1]) : path.join(__dirname, "atraso.html");
  fs.writeFileSync(destino, saida);
  console.log("montado: " + path.relative(process.cwd(), destino) + " (" + saida.length + " bytes)");
}
module.exports = { costurarAtraso };
