/* ============================================================
   SONDAGEM 5 -- A COSTURA DO CO-OP
   ------------------------------------------------------------
   Parte da costura da sondagem 2 (../2-rede/costura.js), que faz do jogo
   de um jogador um de varios, e acrescenta:

     - porta, item pego do chao e pocao tambem recebem o jogador (na
       sondagem 2 eles ainda iam para o jogador global);
     - o modo cliente (__CLIENTE): no navegador o golpe, o dano e as acoes
       que mexem no mundo sao do servidor; ali o golpe so faz o efeito (a
       animacao e o som saem na hora) e o dano nao acontece;
     - o servidor enxerga as portas, para mandar se estao abertas, e pode
       recomecar a cripta (buildLevel) quando ela e vencida;
     - a compensacao do golpe: antes do golpe de um jogador, o servidor pode
       voltar os bichos para onde aquele jogador os via (__REBOBINAR);
     - o preparo do golpe dos bichos (hoje 0,19 s) vira um numero, para
       testar em grupo o que a sondagem 2 mediu sozinho.

   E monta a pagina do cliente: o jogo montado, com esta costura e o
   cliente.js dentro, abrindo sempre a cripta.
   ============================================================ */
"use strict";
const { costurar } = require("../2-rede/costura");

function trocarUma(js, de, para){
  const n = js.split(de).length - 1;
  if (n !== 1) throw new Error("costura do co-op: esperava 1 ocorrencia, achei " + n + " de: " + de.slice(0, 100));
  return js.replace(de, () => para);
}

function costurarCoop(js, preparo){
  /* o jogo montado no Windows pode vir em CRLF; as buscas daqui sao em LF */
  js = js.replace(/\r\n/g, "\n");
  /* com a proposta 4 aplicada no src/, o jogador ja e parametro em tudo: a
     costura so poe o modo cliente, a compensacao e o preparo */
  const nova = js.indexOf("function passoDoJogador(P, dt, ent){") >= 0;
  js = costurar(js);
  js = "let __CLIENTE = false, __REBOBINAR = null, __PREPARO = " + (+preparo || 0.19) + ";\n" + js;
  const SO_NO_CLIENTE = "  if (__CLIENTE && a.tipo !== \"pular\" && a.tipo !== \"arma\" && a.tipo !== \"proxima\") return;   // o resto e do servidor\n";
  if (nova) js = trocarUma(js, "function aplicarAcao(a, P = JOGADOR_DA_TELA){\n", "function aplicarAcao(a, P = JOGADOR_DA_TELA){\n" + SO_NO_CLIENTE);
  else {
    /* porta, item e pocao: o jogador vira parametro, como o resto */
    js = trocarUma(js, "function useDoor(){", "function useDoor(){ return __useDoor(__P0); }\nfunction __useDoor(P){");
    js = trocarUma(js, "function pickup(e){", "function pickup(e){ return __pickup(e, __P0); }\nfunction __pickup(e, P){");
    js = trocarUma(js, "function usarItem(id){", "function usarItem(id){ return __usarItem(id, __P0); }\nfunction __usarItem(id, P){");
    js = trocarUma(js, "J.z){ pickup(e); break; }", "J.z){ __pickup(e, J); break; }");
    js = trocarUma(js, "function __aplicarAcao(a, P){",
      "function __aplicarAcao(a, P){\n" + SO_NO_CLIENTE +
      "  const useDoor = function(){ return __useDoor(P); };\n" +
      "  const usarItem = function(id){ return __usarItem(id, P); };");
  }
  /* no cliente: o golpe so faz o efeito, e o dano nao acontece */
  const FIRE = nova ? "function fire(P = JOGADOR_DA_TELA){\n" : "function __fire(P){\n";
  js = trocarUma(js, FIRE,
    FIRE +
    "  if (__CLIENTE) return __fireCliente(P);\n" +
    "  /* so o golpe corpo a corpo que sai de fato: o projetil anda no presente */\n" +
    "  const vai = __REBOBINAR && !P.dead && P.cd <= 0 && P.have[P.wpn] && WPN[P.wpn].kind === \"melee\";\n" +
    "  const volta = vai ? __REBOBINAR(P) : null;                  // os bichos onde este jogador os via\n" +
    "  try { return __fireReal(P); } finally { if (volta) volta(); }\n" +
    "}\n" +
    "function __fireReal(P){\n");
  /* o preparo do golpe dos bichos, e a pose de ataque que dura ate o golpe cair;
     com a proposta 2 aplicada no src/, o preparo ja e dado, e so o padrao muda */
  if (js.includes("const preparo = d.preparo || 0.19;"))
    js = trocarUma(js, "const preparo = d.preparo || 0.19;", "const preparo = d.preparo || __PREPARO;");
  else {
    js = trocarUma(js, "e.atk = d.cd; e.anim = 0.42; som(\"swing\");", "e.atk = d.cd; e.anim = Math.max(0.42, __PREPARO + 0.08); som(\"swing\");");
    js = trocarUma(js, "agendar(0.19, ()=>{ if (!e.dead && !P.dead", "agendar(__PREPARO, ()=>{ if (!e.dead && !P.dead");
  }
  const HURT = nova ? "function hurtPlayer(n, ignoreArmor, P = JOGADOR_DA_TELA){" : "function __hurtPlayer(n, ignoreArmor, P){";
  js = trocarUma(js, HURT, HURT + " if (__CLIENTE) return;");
  /* o servidor manda as portas, recomeca a cripta e liga a compensacao */
  js = trocarUma(js, "floorAt: floorAt, WPN: WPN};",
    "floorAt: floorAt, WPN: WPN, doors: doors, buildLevel: buildLevel, rebobinar: function(f){ __REBOBINAR = f; }};");
  return js;
}

/* a pagina do cliente: o jogo montado, costurado, com o cliente.js dentro */
function montarCliente(html, codigoDoCliente){
  html = html.replace(/\r\n/g, "\n");
  const m = html.match(/<script>\n([\s\S]*)<\/script>/);
  if (!m) throw new Error("nao achei o bloco <script> do jogo montado");
  let js = costurarCoop(m[1]);
  js = trocarUma(js, "function update(dt, ent){", "function __updateOriginal(dt, ent){");
  js = trocarUma(js, "function render(){", "function __renderOriginal(){");
  js = trocarUma(js, "function som(nome){", "function __somAgora(nome){");
  js = trocarUma(js, "(location.search || \"\")", "\"?mapa=cripta\"");      // o servidor so roda a cripta
  js = trocarUma(js, "__P0 = P; __JOGADORES = [P];\n", "__P0 = P; __JOGADORES = [P];\n__CLIENTE = true;\n" + codigoDoCliente + "\n");
  let saida = html.replace(m[1], () => js);
  saida = saida.replace(/<title>[^<]*<\/title>/, "<title>A Cripta de Vhalgorn - co-op</title>");
  const nao = [...saida].findIndex(c => c.charCodeAt(0) > 127);
  if (nao >= 0) throw new Error("caractere nao-ASCII no cliente, posicao " + nao);
  return saida;
}

module.exports = { costurarCoop, montarCliente };
