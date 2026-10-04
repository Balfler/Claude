/* ============================================================
   SONDAGEM 2 -- A COSTURA PARA VARIOS JOGADORES
   ------------------------------------------------------------
   O jogo foi escrito para um jogador so: um objeto global P, usado em uns
   430 lugares. Esta costura nao reescreve o jogo. Ela pega o codigo MONTADO
   (cripta-vhalgorn.html) e troca poucas coisas, por texto, usando uma
   propriedade do JavaScript: dentro de uma funcao com um parametro chamado
   P, todo "P." fala do parametro, nao do global. Entao o corpo das funcoes
   continua IGUAL -- so a assinatura muda.

     - o passo do jogador (movimento, pulo, dash, degrau, lava, tiro, mana),
       que hoje mora dentro de update(), vira passoDoJogador(P, dt, ent);
     - o passo do mundo (agenda, portas, inimigos, itens, projeteis) vira
       passoDoMundo(dt), uma vez por tick para todos;
     - cada inimigo mira no jogador vivo mais perto, e o golpe dele acerta
       quem ele mirou;
     - o projetil do inimigo testa todos os jogadores.

   Cada troca confere que o trecho original aparece UMA vez -- se o jogo
   mudar e a costura nao servir mais, ela quebra alto em vez de fazer
   coisa errada.

   O que ficou de fora de proposito (anotado no RELATORIO.md): usar porta,
   falar, pegar item e o fervor ainda creditam o jogador global.
   ============================================================ */
"use strict";

function trocarUma(js, de, para){
  const n = js.split(de).length - 1;
  if (n !== 1) throw new Error("costura: esperava 1 ocorrencia, achei " + n + " de:\n" + de.slice(0, 120));
  return js.replace(de, () => para);
}

/* o trecho do passo do jogador, tirado de dentro de update() */
const INICIO_JOGADOR = "  const turn = ent.girar;";
const FIM_JOGADOR = "  /* --- entidades --- */";
/* o mapa de visitados (o automapa) e do cliente: no servidor sai */
const VISITADOS = /  visited\[\(P\.y\|0\)\*MW \+ \(P\.x\|0\)\] = 1;\n  for \(let y=-3;y<=3;y\+\+\) for \(let x=-3;x<=3;x\+\+\)\{\n[^\n]*\n[^\n]*\n  \}\n/;

/* O fim do passo do mundo no servidor: faisca, poeira e som sao do cliente,
   e no servidor ninguem esvazia -- sem isto as listas cresciam sem parar. */
const FIM_DO_MUNDO_NO_SERVIDOR = "  parts.length = 0; SONS.length = 0;       // faisca, poeira e som sao do cliente\n";

/* A saida para o node, a mesma nas duas versoes do jogo, com a linha que o
   cliente do co-op usa de ancora. */
function expor(js, jogadores){
  return trocarUma(js, "cvs.focus();\n})();",
    "cvs.focus();\n__P0 = P; __JOGADORES = [P];\n" +
    "globalThis.__rede = {passoDoJogador: passoDoJogador, passoDoMundo: passoDoMundo, P: P, G: G, ents: function(){ return ents; }, projs: function(){ return projs; },\n" +
    "  jogadores: " + jogadores + ", floorAt: floorAt, WPN: WPN};\n" +
    "cvs.focus();\n})();");
}

/* Com a proposta 4 aplicada (mundo-perigoso/propostas), o jogo ja tem o passo
   do jogador, o passo do mundo e a lista de jogadores: a costura so poe a
   mira que vem na entrada, o relogio da tela e a limpeza do servidor. */
function costurarComJogadores(js){
  js = trocarUma(js, "function passoDoJogador(P, dt, ent){\n",
    "function passoDoJogador(P, dt, ent){\n" +
    "  if (typeof ent.ang === \"number\"){ P.ang = ent.ang; P.pitch = ent.pitch || 0; }\n");
  js = trocarUma(js, "function passoDoMundo(dt){\n  G.time += dt;\n", "function passoDoMundo(dt){\n  G.tick += dt;\n  G.time += dt;\n");
  js = trocarUma(js, "  updateProjs(dt);\n}\n", "  updateProjs(dt);\n" + FIM_DO_MUNDO_NO_SERVIDOR + "}\n");
  js = "let __P0 = null, __JOGADORES = [];\n" + js;
  return expor(js, "function(l){ if (l) JOGADORES = l; return JOGADORES; }");
}

function costurar(js){
  /* o jogo montado no Windows pode vir em CRLF; as buscas daqui sao em LF */
  js = js.replace(/\r\n/g, "\n");
  if (js.indexOf("function passoDoJogador(P, dt, ent){") >= 0) return costurarComJogadores(js);
  /* 1. o passo do jogador */
  const i0 = js.indexOf(INICIO_JOGADOR), i1 = js.indexOf(FIM_JOGADOR, i0);
  if (i0 < 0 || i1 < 0 || js.indexOf(INICIO_JOGADOR, i0 + 1) >= 0) throw new Error("costura: nao achei o passo do jogador");
  let trecho = js.slice(i0, i1);
  if (!VISITADOS.test(trecho)) throw new Error("costura: nao achei o automapa no passo do jogador");
  trecho = trecho.replace(VISITADOS, "");
  const passo =
    "\nfunction passoDoJogador(P, dt, ent){\n" +
    "  const fire = function(){ return __fire(P); };\n" +
    "  const hurtPlayer = function(n, ign){ return __hurtPlayer(n, ign, P); };\n" +
    "  const aplicarAcao = function(a){ return __aplicarAcao(a, P); };\n" +
    "  if (typeof ent.ang === \"number\"){ P.ang = ent.ang; P.pitch = ent.pitch || 0; }\n" +
    "  if (P.painT > 0) P.painT -= dt;\n  if (P.evilT > 0) P.evilT -= dt;\n" +
    "  if (P.cd > 0) P.cd -= dt;\n  if (P.anim > 0) P.anim -= dt;\n" +
    "  for (const a of ent.acoes || []) aplicarAcao(a);\n" +
    trecho + "}\n";

  /* 2. o passo do mundo */
  const mundo =
    "\nfunction passoDoMundo(dt){\n" +
    "  G.tick += dt; G.time += dt;\n" +
    "  rodarAgenda();\n  updateDoors(dt);\n" +
    "  for (const e of ents){\n" +
    "    if (e.gone) continue;\n" +
    "    if (e.kind === \"enemy\") updateEnemy(e, dt);\n" +
    "    else if (e.kind === \"item\"){\n" +
    "      for (const J of __JOGADORES) if (!J.dead && Math.hypot(e.x-J.x, e.y-J.y) < 0.62 && e.z < J.z + J.h + 0.5 && e.z + 0.7 > J.z){ pickup(e); break; }\n" +
    "    }\n  }\n" +
    "  updateProjs(dt);\n" + FIM_DO_MUNDO_NO_SERVIDOR +
    "}\n" +
    "function __alvoDe(e){\n" +
    "  let alvo = null, dm = 1e9;\n" +
    "  for (const J of __JOGADORES){ if (J.dead) continue; const d = (J.x-e.x)*(J.x-e.x) + (J.y-e.y)*(J.y-e.y); if (d < dm){ dm = d; alvo = J; } }\n" +
    "  return alvo || __JOGADORES[0] || __P0;\n" +
    "}\n";

  js = trocarUma(js, "function update(dt, ent){", passo + mundo + "function update(dt, ent){");

  /* 3. quem leva o golpe, quem atira e quem age: o jogador vira parametro */
  js = trocarUma(js, "function hurtPlayer(n, ignoreArmor){",
    "function hurtPlayer(n, ignoreArmor){ return __hurtPlayer(n, ignoreArmor, __P0); }\nfunction __hurtPlayer(n, ignoreArmor, P){");
  js = trocarUma(js, "function fire(){", "function fire(){ return __fire(__P0); }\nfunction __fire(P){\n  const aimDir = function(){ const cp = Math.cos(P.pitch); return [Math.cos(P.ang)*cp, Math.sin(P.ang)*cp, Math.sin(P.pitch)]; };");
  js = trocarUma(js, "function aplicarAcao(a){", "function aplicarAcao(a){ return __aplicarAcao(a, __P0); }\nfunction __aplicarAcao(a, P){");

  /* 4. o inimigo mira no jogador vivo mais perto; o golpe agendado dele
     guarda quem foi mirado (o fecho captura o parametro P) */
  js = trocarUma(js, "function updateEnemy(e, dt){",
    "function updateEnemy(e, dt){\n  const P = __alvoDe(e);\n  const hurtPlayer = function(n, ign){ return __hurtPlayer(n, ign, P); };");

  /* 5. o projetil do inimigo testa todos os jogadores */
  js = trocarUma(js,
    "      } else if (Math.hypot(P.x-p.x, P.y-p.y) < 0.32 &&\n                 p.z > P.z - 0.1 && p.z < P.z + P.h + 0.1){\n        hurtPlayer(p.dmg); gone = true;\n        if (p.splash) explode(p.x,p.y,p.z,p.splash,p.sr);\n      }",
    "      } else {\n        for (const J of __JOGADORES) if (!J.dead && Math.hypot(J.x-p.x, J.y-p.y) < 0.32 &&\n                 p.z > J.z - 0.1 && p.z < J.z + J.h + 0.1){\n          __hurtPlayer(p.dmg, false, J); gone = true;\n          if (p.splash) explode(p.x,p.y,p.z,p.splash,p.sr);\n          break;\n        }\n      }");

  /* 6. a lista de jogadores, com o global como o primeiro */
  js = "let __P0 = null, __JOGADORES = [];\n" + js;
  return expor(js, "function(l){ if (l) __JOGADORES = l; return __JOGADORES; }");
}

module.exports = { costurar };
