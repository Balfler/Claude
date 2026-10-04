/* Testes de varios jogadores no mesmo mundo: o passo de cada um, o passo do
   mundo uma vez para todos, e quem apanha, quem pega e quem abre. No jogo
   sozinho a lista tem so o jogador da tela, e o resto das baterias confere
   que nada mudou; aqui entra um segundo jogador, como no servidor do co-op.
   Uso: node mundo-perigoso/teste/jogadores.test.js [caminho-do-html] */
const path = require("path");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D } = carregar(arquivo);
const DT = 1/60;
const parado = () => ({frente: 0, lado: 0, girar: 0, subir: false, agachar: false, dash: false, atirar: false, acoes: []});
const noChao = (J, x, y) => { J.x = x; J.y = y; J.z = D.floorAt(Math.floor(x), Math.floor(y)); J.vx = J.vy = J.vz = 0; };
const mundo = n => { for (let i = 0; i < n; i++) D.passoDoMundo(DT); };
/* so um bicho de cada vez: os outros ficam de fora (e voltam no fim) */
const bichos = D.ents.filter(e => e.kind === "enemy");
const sozinho = function(b){ for (const e of bichos) if (e !== b) e.dead = true; };

try {
  /* 1. sozinho */
  check("no jogo sozinho, a lista de jogadores e so o da tela", D.JOGADORES.length === 1 && D.JOGADORES[0] === D.P && D.JOGADOR_DA_TELA === D.P);

  D.G.mode = "play";
  const P = D.P, J2 = JSON.parse(JSON.stringify(P));
  D.JOGADORES = [P, J2];
  noChao(P, 7.5, 29.5); noChao(J2, 7.5, 27.5);

  /* 2. o passo de cada um */
  const andar = parado(); andar.frente = 1;
  for (let i = 0; i < 30; i++) D.passoDoJogador(J2, DT, andar);
  check("o passo do segundo jogador move so ele", J2.y < 27 && P.x === 7.5 && P.y === 29.5, "J2 em y " + J2.y.toFixed(2));
  D.aplicarAcao({tipo: "arma", i: 0}, J2);
  check("a acao de trocar de arma vale para quem a fez", J2.wpn === 0 && P.wpn === 1);

  /* 3. o bicho persegue o mais perto, e acerta quem perseguiu */
  const imp = bichos.find(e => e.type === "imp");
  sozinho(imp);
  noChao(P, 7.5, 29.5); noChao(J2, 7.5, 26.5);
  Object.assign(imp, {x: 7.5, y: 25.7, z: D.floorAt(7, 25), dead: false, hp: imp.d.hp, st: "chase", atk: 0, anim: 0, gone: false});
  check("o bicho persegue o jogador vivo mais perto", D.alvoDe(imp) === J2);
  J2.dead = true;
  check("se o mais perto morreu, persegue o outro", D.alvoDe(imp) === P);
  J2.dead = false;
  P.hp = 100; J2.hp = 100; P.armor = J2.armor = 0; P.god = J2.god = false;
  D.G.flash = 0; D.SONS.length = 0;
  for (let i = 0; i < 60; i++){ noChao(J2, 7.5, 26.5); D.passoDoMundo(DT); }
  check("o golpe do bicho acerta quem ele persegue, e so ele", J2.hp < 100 && P.hp === 100, "J2 " + Math.round(J2.hp) + ", P " + P.hp);
  check("o dano em outro jogador nao mexe na tela deste", D.G.flash === 0 && D.SONS.indexOf("pain") < 0);
  J2.hp = 3;
  for (let i = 0; i < 120 && !J2.dead; i++){ noChao(J2, 7.5, 26.5); D.passoDoMundo(DT); }
  check("o outro jogador morre, e o jogo desta tela continua", J2.dead && D.G.mode === "play", "modo " + D.G.mode);
  imp.dead = true;
  J2.dead = false; J2.hp = 100;

  /* 4. o projetil do bicho acerta o primeiro jogador em que encosta */
  noChao(J2, 7.5, 26.5);
  D.shootProj({x: J2.x + 0.9, y: J2.y, z: J2.z + 0.5}, "bolt", -1, 0, 0, 6, 7, "e", 0, 0, 0);
  for (let i = 0; i < 40 && D.projs.length; i++) D.passoDoMundo(DT);
  check("o projetil do bicho acerta o outro jogador", J2.hp === 93 && P.hp === 100, "J2 " + J2.hp + ", P " + P.hp);

  /* 5. o item e do primeiro que encosta e precisa dele */
  const pocao = D.ents.find(e => e.kind === "item" && e.type === "potion" && !e.gone);
  P.hp = 100; J2.hp = 50;
  noChao(P, pocao.x, pocao.y); noChao(J2, pocao.x, pocao.y);
  mundo(1);
  check("os dois em cima da pocao: fica com quem precisa dela", pocao.gone && J2.hp === 75 && P.hp === 100, "J2 " + J2.hp + ", P " + P.hp);

  /* 6. a porta abre para quem a usa, e fica aberta para todos */
  const porta = D.doors.get(17 * 40 + 16);
  noChao(P, 7.5, 29.5); noChao(J2, 15.5, 17.5); J2.ang = 0;       // olhando para a porta em (16,17)
  D.aplicarAcao({tipo: "usar"}, J2);
  mundo(90);
  check("o outro jogador abre a porta, e ela abre no mundo", porta.open >= 1, "abertura " + porta.open.toFixed(2));

  /* 7. o golpe do outro jogador: a adaga dele, a mira dele */
  const outro = bichos.find(e => e.type === "imp" && e !== imp);
  sozinho(outro);
  noChao(J2, 7.5, 26.5); J2.ang = -Math.PI/2; J2.pitch = 0; J2.cd = 0; J2.wpn = 0;
  Object.assign(outro, {x: 7.5, y: 25.6, z: D.floorAt(7, 25), dead: false, hp: outro.d.hp, st: "idle", atk: 9, anim: 0, gone: false});
  const cdP = P.cd;
  D.fire(J2);
  mundo(12);
  check("o golpe do outro jogador sai da mira dele e acerta o bicho na frente dele", outro.hp < outro.d.hp && J2.cd > 0 && P.cd === cdP,
    "vida " + outro.d.hp + " -> " + Math.round(outro.hp));
  /* 8. o fervor de matar e de quem matou */
  P.fervor = 0; P.fervorT = 0; J2.fervor = 0; J2.fervorT = 0;
  const alvoF = bichos.find(e => e.type === "imp" && e !== imp && e !== outro) || outro;
  sozinho(alvoF);
  Object.assign(alvoF, {x: 7.5, y: 25.6, z: D.floorAt(7, 25), dead: false, hp: 1, st: "idle", atk: 9, anim: 0, gone: false});
  D.hurtEnemy(alvoF, 50, 0, -1, J2);
  check("matar alimenta o fervor de quem matou, e so dele", alvoF.dead && J2.fervor > 0.3 && J2.fervorT > 4 && P.fervor === 0 && P.fervorT === 0,
    "J2 " + J2.fervor + ", P " + P.fervor);
  Object.assign(alvoF, {dead: false, hp: 1, st: "idle"});
  D.hurtEnemy(alvoF, 50, 0, -1);
  check("sem dizer quem bateu, o fervor e do jogador da tela", P.fervor > 0.3 && J2.fervor > 0.3);
  /* a bola de fogo do outro jogador: quem atira e quem ganha o fervor */
  P.fervor = 0; P.fervorT = 0; J2.fervor = 0; J2.fervorT = 0;
  Object.assign(alvoF, {dead: false, hp: 1, st: "idle", x: 7.5, y: 25.6});
  D.shootProj({x: 7.5, y: 26.4, z: D.floorAt(7, 26) + 0.5}, "fire", 0, -1, 0, 8, 50, "p", 20, 2, 0, J2);
  for (let i = 0; i < 40 && D.projs.length; i++) D.passoDoMundo(DT);
  check("o projetil do jogador leva quem atirou: o fervor e da bola de fogo dele", alvoF.dead && J2.fervor > 0.3 && P.fervor === 0, "J2 " + J2.fervor + ", P " + P.fervor);
} catch (e){
  check("EXCECAO: " + e.message + " @ " + (e.stack.split("\n")[1] || "").trim(), false);
}
for (const e of bichos) e.dead = false;
fim();
