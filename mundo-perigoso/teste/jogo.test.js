/* Testes de regra do jogo: colisao, IA, portas, itens, armas, fim de fase.
   Uso: node mundo-perigoso/teste/jogo.test.js [caminho-do-html] */
const path = require("path");
const { carregar, placar } = require("./harness");

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D, frames, emit } = carregar(arquivo);
const { ok, falhou: fail, check, fim } = placar();
function play(){ D.G.mode = "play"; D.P.dead = false; D.P.hp = Math.max(D.P.hp, 100);
  D.P.painT = 0; D.P.pitch = 0; D.P.eye = 0.60; }   // a tela de morte inclina a camera; ressuscitar tem que desfazer isso

(async () => {
  try {
    /* 1. nivel construido */
    check("nivel construido", D.G.totalKills === 20 && D.ents.length > 20,
      "inimigos=" + D.G.totalKills + " ents=" + D.ents.length);
    check("jogador na entrada", Math.abs(D.P.x - 7.5) < .01 && Math.abs(D.P.y - 29.5) < .01);

    /* 2. loop roda sem excecao na tela-titulo */
    frames(30);
    check("loop da tela-titulo", D.G.mode === "title");

    /* 3. inicia partida e anda */
    D.G.mode = "play";
    D.keys["w"] = true; frames(90); D.keys["w"] = false;
    check("jogador avancou pelo corredor", D.P.y < 28, "y=" + D.P.y.toFixed(2));
    check("tempo corre", D.G.time > 1, "t=" + D.G.time.toFixed(2));

    /* 3b. setas giram a camera SEM pointer lock (o iframe costuma bloquear) */
    const ang0 = D.P.ang;
    D.keys["arrowright"] = true; frames(30); D.keys["arrowright"] = false;
    const dDir = D.P.ang - ang0;
    check("seta direita gira sem pointer lock", dDir > 0.5, "delta=" + dDir.toFixed(2) + " rad");
    D.keys["arrowleft"] = true; frames(30); D.keys["arrowleft"] = false;
    check("seta esquerda volta ao rumo", Math.abs(D.P.ang - ang0) < 0.02,
      "delta=" + (D.P.ang - ang0).toFixed(3));
    const px0 = D.P.x, py0 = D.P.y;
    D.keys["arrowright"] = true; frames(30); D.keys["arrowright"] = false;
    check("setas nao deslocam o jogador",
      Math.abs(D.P.x - px0) < 1e-9 && Math.abs(D.P.y - py0) < 1e-9);
    D.P.ang = ang0;

    /* 3c. arrastar o mouse olha, mesmo sem pointer lock */
    const ang1 = D.P.ang, pit1 = D.P.pitch;
    emit("tela", "mousedown", { clientX: 200, clientY: 120 });
    emit("janela", "mousemove", { clientX: 300, clientY: 120 });
    check("arrastar gira a camera", D.P.ang > ang1 + 0.3,
      "delta=" + (D.P.ang - ang1).toFixed(2) + " rad");
    emit("janela", "mousemove", { clientX: 300, clientY: 80 });
    check("arrastar olha para cima", D.P.pitch > pit1, "pitch=" + D.P.pitch.toFixed(1));
    emit("janela", "mouseup", {});
    const angDepois = D.P.ang;
    emit("janela", "mousemove", { clientX: 100, clientY: 200 });
    check("sem arrastar a camera fica parada", D.P.ang === angDepois);
    D.P.ang = ang1; D.P.pitch = 0;

    /* 3d. clique curto dispara uma vez */
    D.P.mana = 40; D.P.cd = 0;
    const mana1 = D.P.mana;
    emit("tela", "mousedown", { clientX: 160, clientY: 90 });
    emit("janela", "mouseup", {});
    frames(3);
    check("clique curto dispara", D.P.mana < mana1, mana1 + " -> " + D.P.mana.toFixed(1));
    const mana2 = D.P.mana;
    emit("tela", "mousedown", { clientX: 160, clientY: 90 });
    emit("janela", "mousemove", { clientX: 260, clientY: 90 });
    emit("janela", "mouseup", {});
    D.P.cd = 0; frames(3);
    check("arrastar nao dispara", D.P.mana >= mana2 - 0.01,
      mana2.toFixed(1) + " -> " + D.P.mana.toFixed(1));
    D.P.ang = ang1;

    /* 4. o diabrete do corredor acorda e persegue */
    const perto = (tipo) => D.ents.filter(e => e.type === tipo && !e.dead)
      .sort((a, b) => Math.hypot(a.x - D.P.x, a.y - D.P.y) - Math.hypot(b.x - D.P.x, b.y - D.P.y))[0];
    const imp = perto("imp");
    frames(60);
    check("diabrete acordou", imp.st !== "idle", "estado=" + imp.st + " dist=" +
      Math.hypot(imp.x - D.P.x, imp.y - D.P.y).toFixed(1));

    /* 5. dano no jogador no corpo a corpo (usa setTimeout) */
    const hp0 = D.P.hp;
    for (let i = 0; i < 25; i++) { frames(10); await new Promise(r => setTimeout(r, 14)); }
    check("jogador leva dano no corpo a corpo", D.P.hp < hp0, hp0 + " -> " + D.P.hp.toFixed(0));

    /* 6. cajado mata o diabrete */
    play();
    const mana0 = D.P.mana = 60;
    let guard = 0;
    while (!imp.dead && guard++ < 300) {
      D.P.ang = Math.atan2(imp.y - D.P.y, imp.x - D.P.x);
      D.P.cd = 0; D.fire(); frames(6);
    }
    check("diabrete morreu com o cajado", imp.dead, "disparos=" + guard);
    check("mana consumida", D.P.mana < mana0, mana0 + " -> " + D.P.mana.toFixed(1));
    check("contador de mortes subiu", D.G.kills >= 1, "mortes=" + D.G.kills);

    /* 7. porta de madeira abre */
    play();
    D.P.x = 15.5; D.P.y = 17.5; D.P.ang = 0;            // olhando para a porta em (16,17)
    const porta = D.doors.get(17 * 40 + 16);
    D.useDoor(); frames(90);
    check("porta de madeira abre", porta.open >= 1, "abertura=" + porta.open.toFixed(2));

    /* 8. parede secreta conta segredo */
    play();
    D.P.x = 29.5; D.P.y = 17.5; D.P.ang = 0;            // olhando para a parede secreta em (30,17)
    const sec0 = D.G.secrets;
    D.useDoor(); frames(60);
    check("parede secreta encontrada", D.G.secrets === sec0 + 1, "segredos=" + D.G.secrets);

    /* 9. alma do segredo da o grimorio */
    play();
    D.P.x = 32.5; D.P.y = 15.5; frames(10);
    check("alma concede o grimorio", D.P.have[2] === true && D.P.hp > 100, "hp=" + D.P.hp.toFixed(0));

    play();
    /* 10. selo trancado recusa sem a chave */
    D.P.x = 34.5; D.P.y = 21.5; D.P.ang = Math.PI / 2;  // olhando para o selo em (34,22)
    const selo = D.doors.get(22 * 40 + 34);
    D.useDoor(); frames(30);
    check("selo permanece fechado sem a chave", selo.open === 0 && D.P.key === false);

    play();
    /* 11. lava causa dano e queima atraves do escudo (sem inimigos atirando) */
    D.ents.forEach(e => { if (e.kind === "enemy" && !e.boss) e.dead = true; });
    D.P.x = 23.5; D.P.y = 5.5; D.P.hp = 100; D.P.armor = 100;
    frames(90);
    check("lava fere e ignora o escudo", D.P.hp < 100 && D.P.armor === 100,
      "hp=" + D.P.hp.toFixed(0) + " escudo=" + D.P.armor);

    play();
    /* 12. chave runica */
    D.P.x = 27.5; D.P.y = 6.5; frames(10);
    check("chave runica coletada", D.P.key === true);

    play();
    /* 13. agora o selo abre */
    D.P.x = 34.5; D.P.y = 21.5; D.P.ang = Math.PI / 2;
    D.useDoor(); frames(90);
    check("selo abre com a chave", selo.open >= 1, "abertura=" + selo.open.toFixed(2));

    play();
    /* 14. grimorio explode e fere o chefe */
    const boss = D.ents.find(e => e.type === "boss");
    D.P.x = boss.x - 4; D.P.y = boss.y; D.P.ang = 0;
    D.P.wpn = 2; D.P.mana = 150; D.P.hp = 200;
    const bhp = boss.hp;
    for (let i = 0; i < 10; i++) { D.P.cd = 0; D.fire(); frames(40); }
    check("grimorio fere Vhalgorn", boss.hp < bhp, bhp + " -> " + boss.hp.toFixed(0));

    play();
    /* 15. portal encerra a fase */
    D.P.x = 37.5; D.P.y = 28.5; D.P.ang = 0;            // olhando para o portal em (38,28)
    D.useDoor();
    check("portal conclui a fase", D.G.mode === "won", "modo=" + D.G.mode);

    /* 16. loop continua estavel no fim */
    frames(60);
    check("loop estavel apos o fim", true);

    /* 17. painel de ajuste: H e J mudam a velocidade, Y e U o campo de visao,
       I e O a altura dos olhos, T a resolucao, F o contador, L volta ao padrao */
    play();
    const aperta = (k, n) => { for (let i = 0; i < (n || 1); i++){
      emit("janela", "keydown", { key: k }); emit("janela", "keyup", { key: k }); } };
    check("a velocidade padrao e 65", D.AJUSTE.vel === 65, "vel=" + D.AJUSTE.vel);
    aperta("j", 2);
    check("J aumenta a velocidade de 5 em 5", D.AJUSTE.vel === 75, "vel=" + D.AJUSTE.vel);
    aperta("h");
    check("H diminui a velocidade", D.AJUSTE.vel === 70, "vel=" + D.AJUSTE.vel);
    aperta("j", 40);
    check("a velocidade para em 200", D.AJUSTE.vel === 200, "vel=" + D.AJUSTE.vel);
    aperta("h", 60);
    check("a velocidade para em 30", D.AJUSTE.vel === 30, "vel=" + D.AJUSTE.vel);

    const anda = (vel) => {
      D.AJUSTE.vel = vel;
      D.P.x = 7.5; D.P.y = 29.5; D.P.z = D.floorAt(7, 29); D.P.vx = D.P.vy = D.P.vz = 0;
      D.P.ang = -Math.PI / 2; D.P.ground = true; D.P.dashT = 0;
      D.keys["w"] = true; frames(24); D.keys["w"] = false;
      return 29.5 - D.P.y;
    };
    const d100 = anda(100), d50 = anda(50);
    check("velocidade 50 anda metade da 100", d100 > 1 && Math.abs(d50 / d100 - 0.5) < 0.03,
      d100.toFixed(2) + " e " + d50.toFixed(2) + " tiles");

    const fx0 = D.FX;
    aperta("u");
    check("U abre o campo de visao", D.AJUSTE.fov === 101 && D.FX < fx0,
      "fov=" + D.AJUSTE.fov + " FX=" + D.FX.toFixed(1));
    aperta("y", 20);
    check("o campo de visao para em 60", D.AJUSTE.fov === 60, "fov=" + D.AJUSTE.fov);
    frames(3);

    aperta("o", 2); frames(40);
    check("O levanta os olhos", D.AJUSTE.olho === 0.7 && Math.abs(D.P.eye - 0.7) < 0.01,
      "olho=" + D.P.eye.toFixed(3));

    /* sem navegador as texturas saem pretas, entao nao da para olhar pixel:
       o que se confere e que a camera acompanha a resolucao */
    check("a tela abre em 1280x720 (o HD de fabrica, 1/10), e o mundo vai ate embaixo",
      D.RW === 1280 && D.RH === 720 && D.buf.length === 1280 * 720 && D.zbuf.length === 1280 * 720,
      D.RW + "x" + D.RH);
    check("o pixel e quadrado: FY igual a FX", Math.abs(D.FY - D.FX) < 1e-9, "FX=" + D.FX + " FY=" + D.FY);
    const fx1 = D.FX/2;                       // o FX de 640x360
    /* T passa pelas telas: 1280x720 (HD) -> 320x180 -> 640x360 -> 960x540 -> 1280x720 */
    const tela = (w, h) => D.RW === w && D.RH === h && D.buf.length === w * h && D.zbuf.length === w * h;
    aperta("t");
    check("T passa para 320x180", tela(320, 180), D.RW + "x" + D.RH);
    check("em 320x180 a camera cai para um quarto do HD", Math.abs(D.FX - fx1 / 2) < 1e-6,
      "FX " + (fx1*2).toFixed(1) + " -> " + D.FX.toFixed(1));
    frames(5);
    aperta("t");
    check("T passa para 640x360", tela(640, 360) && Math.abs(D.FX - fx1) < 1e-6);
    frames(3);
    aperta("t");
    check("T passa o mundo para 960x540, e a camera acompanha (FX 1,5 vez o de 640)", tela(960, 540) && Math.abs(D.FX - fx1*1.5) < 1e-6, D.RW + "x" + D.RH + " FX " + D.FX.toFixed(1));
    frames(3);
    aperta("t");
    check("T volta para 1280x720, o HD", tela(1280, 720) && Math.abs(D.FX - fx1*2) < 1e-6, D.RW + "x" + D.RH);

    aperta("f"); aperta("p"); frames(5);
    check("painel e contador de quadro desenham", D.G.painel === true && D.AJUSTE.quadro === true);
    aperta("l");
    check("L no painel volta ao padrao", D.AJUSTE.vel === 65 && D.AJUSTE.fov === 96 &&
      D.AJUSTE.olho === 0.6 && D.AJUSTE.esc === 4 && D.AJUSTE.quadro === false);
    aperta("p");

    /* 18. os ajustes guardados voltam ao abrir o jogo; valor fora do limite fica no padrao */
    const outro = carregar(arquivo, { armazenamento: { "cripta-vhalgorn:ajuste":
      JSON.stringify({ versao: 3, vel: 80, fov: 999, olho: 0.7, esc: 1, quadro: true }) } });
    const A = outro.D.AJUSTE;
    check("ajustes guardados sao lidos", A.vel === 80 && A.olho === 0.7 && A.esc === 1 &&
      A.quadro === true && outro.D.RW === 320);
    check("ajuste fora do limite fica no padrao", A.fov === 96, "fov=" + A.fov);
    outro.frames(3);
    /* guardado antes da tela 16:9: fov 90 e esc 1 queriam dizer outra coisa */
    const antigo = carregar(arquivo, { armazenamento: { "cripta-vhalgorn:ajuste":
      JSON.stringify({ vel: 70, fov: 90, olho: 0.65, esc: 1, quadro: true }) } });
    const B = antigo.D.AJUSTE;
    check("ajuste de antes da tela 16:9 so aproveita velocidade, olhos e contador",
      B.vel === 70 && B.olho === 0.65 && B.quadro === true && B.fov === 96 && B.esc === 4 &&
      antigo.D.RW === 1280, JSON.stringify(B));
    const v2 = carregar(arquivo, { armazenamento: { "cripta-vhalgorn:ajuste":
      JSON.stringify({ versao: 2, vel: 75, fov: 100, olho: 0.6, esc: 2, quadro: false }) } }).D;
    check("guardado antes do HD de fabrica (versao 2): fica o resto, a tela passa ao HD",
      v2.AJUSTE.vel === 75 && v2.AJUSTE.fov === 100 && v2.AJUSTE.esc === 4 && v2.RW === 1280, JSON.stringify(v2.AJUSTE));

    /* 19. terceira pessoa: X tira a camera de dentro da cabeca */
    play();
    const poe = (x, y, ang) => { D.P.x = x; D.P.y = y; D.P.z = D.floorAt(Math.floor(x), Math.floor(y));
      D.P.vx = D.P.vy = D.P.vz = 0; D.P.ang = ang; D.P.pitch = 0; D.P.ground = true; frames(2); };
    aperta("x");
    check("X liga a terceira pessoa e poe a fornada do boneco pra assar", D.G.terceira === true &&
      !!D.QUADROS_JOGADOR && D.QUADROS_JOGADOR.length === D.TODAS_AS_POSES.length && D.QUADROS_JOGADOR[0].length === 8);
    check("o jogador segura a arma equipada de verdade, nao uma escolhida no provador",
      D.escolhaDoJogador().arma === D.ARMA_DO_WPN[D.WPN[D.P.wpn].s]);
    frames(250);
    check("a fornada assa as poses de pe sem travar o jogo", D.FORNADA_JOGADOR.basica());
    frames(800);
    check("e depois as alturas da camera (35, 70 e 90 graus), tambem aos poucos", D.FORNADA_JOGADOR.pronta() &&
      D.FORNADA_JOGADOR.alto.length === 3 && D.FORNADA_JOGADOR.alto.every(n => n.every(p => p.every(Boolean))));
    D.P.wpn = 0;                                     // troca para a adaga
    frames(1);
    check("trocar de arma poe uma fornada nova pra assar por baixo, sem sumir com a antiga",
      !!D.FORNADA_PROXIMA && D.ARMA_ASSADA === 0 && D.QUADROS_JOGADOR === D.FORNADA_JOGADOR.quadros);
    frames(250);
    check("a fornada nova termina e o jogador passa a segurar a adaga",
      !D.FORNADA_PROXIMA && D.FORNADA_JOGADOR.basica() && D.escolhaDoJogador().arma === "adaga");
    D.P.wpn = 1;                                     // volta pro cajado, para o resto do teste
    poe(7.5, 27.5, Math.PI / 2);                    // olhando para o sul: atras dele, a sala aberta
    const atras = Math.hypot(D.camX - D.P.x, D.camY - D.P.y);
    check("com espaco, a camera fica atras do jogador", Math.abs(atras - 1.4) < 0.02 && D.camY < D.P.y,
      "distancia " + atras.toFixed(2));
    poe(7.5, 29.5, -Math.PI / 2);                   // olhando para o norte: a parede logo atras
    check("a camera para antes da parede", D.camY < 30.9 && Math.hypot(D.camX - D.P.x, D.camY - D.P.y) < 1.4,
      "camY " + D.camY.toFixed(2));

    /* a pose do jogador segue o que esta acontecendo de verdade: no ar, no
       meio de um golpe ou correndo no dash -- sem precisar clicar nada */
    D.P.ground = true; D.P.vx = D.P.vy = 0; D.P.anim = 0; D.P.dashT = 0;
    check("no chao e parado, o jogador fica na pose parada ou respirando",
      D.poseDoJogador() === D.POSE.PARADO || D.poseDoJogador() === D.POSE.RESPIRAR);
    D.P.ground = false;
    check("no ar, o jogador pula", D.poseDoJogador() === D.POSE.PULO);
    D.P.ground = true; D.P.wpn = 0; D.P.anim = D.WPN[0].cd * 0.9;      // acabou de golpear com a adaga
    check("golpeando com a adaga, a pose e a de ataque", D.POSE.ATAQUE.includes(D.poseDoJogador()));
    D.P.wpn = 1; D.P.anim = D.WPN[1].cd * 0.9;                        // acabou de conjurar o cajado
    check("conjurando o cajado, a pose e a de conjurar", D.POSE.CONJURAR.includes(D.poseDoJogador()));
    D.P.anim = 0; D.P.vx = 3; D.P.dashT = 0.1;                        // correndo no meio de um dash
    check("no meio do dash, a corrida troca o passo", D.POSE.CORRER.includes(D.poseDoJogador()));
    D.P.dashT = 0; D.P.vx = 0; D.P.vy = 0;

    aperta("x"); frames(2);
    check("X de novo volta para dentro da cabeca", D.G.terceira === false && D.camX === D.P.x && D.camY === D.P.y);

    /* 20. antes do multiplayer: passo fixo, entrada como dado, som anotado e nenhum setTimeout */
    play();
    const t0 = D.G.time;
    frames(1, 0.05);
    check("passo fixo: um quadro de 50 ms roda tres passos de 1/60", Math.abs(D.G.time - t0 - 3/60) < 1e-6,
      "andou " + (D.G.time - t0).toFixed(4));
    D.keys["w"] = true; D.keys["shift"] = true;
    const ent = D.lerEntrada();
    D.keys["w"] = false; D.keys["shift"] = false;
    check("o teclado vira um objeto de entrada", ent.frente === 1 && ent.dash === true && Array.isArray(ent.acoes));
    aperta("e");
    check("usar e uma acao na fila, nao uma chamada feita no teclado", D.ACOES.length === 1 && D.ACOES[0].tipo === "usar");
    frames(1);
    check("a fila de acoes esvazia no passo", D.ACOES.length === 0);
    D.P.mana = 50; D.P.cd = 0; D.P.wpn = 1; D.SONS.length = 0; D.fire();
    check("a simulacao anota o som em vez de tocar", D.SONS.includes("bolt"));
    frames(1);
    check("o laco toca e esvazia os sons", D.SONS.length === 0);
    const fonte = ["p4.js", "p5.js"].map(f => require("fs").readFileSync(path.join(__dirname, "..", "src", f), "utf8")).join("");
    check("nenhum setTimeout no jogo", !/setTimeout\s*\(/.test(fonte));

    /* 21. o preparo do golpe dos bichos: do golpe comecar ao golpe cair. Sem
       nada no EDEF, 0,19 s; com `preparo`, o dele, e a pose de ataque dura ate
       o golpe cair. Um diabrete sozinho, colado no jogador parado. */
    const medirPreparo = function(preparo){
      play(); D.P.armor = 0; D.P.hp = 100; D.P.god = false;
      /* a essa altura os testes de cima ja mataram todos: um diabrete volta so para isto */
      const bicho = D.ents.find(e => e.kind === "enemy" && e.type === "imp");
      const guardado = {dead: bicho.dead, hp: bicho.hp, dieT: bicho.dieT, gone: bicho.gone, x: bicho.x, y: bicho.y, z: bicho.z, st: bicho.st};
      const outros = D.ents.filter(e => e.kind === "enemy" && e !== bicho && !e.dead);
      for (const e of outros) e.dead = true;
      Object.assign(bicho, {dead: false, hp: bicho.d.hp, dieT: 0, gone: false});
      const antes = bicho.d.preparo;
      bicho.d.preparo = preparo;
      const z = D.floorAt(7, 29);
      Object.assign(bicho, {x: 7.5, y: 28.7, z: z, st: "chase", atk: 0, anim: 0, painT: 0});
      let golpe = -1, dano = -1, pose = 0;
      for (let i = 0; i < 90 && dano < 0; i++){
        Object.assign(D.P, {x: 7.5, y: 29.5, z: z, vx: 0, vy: 0, vz: 0});
        frames(1);
        if (golpe < 0 && bicho.anim > 0){ golpe = i; pose = bicho.anim; }
        if (D.P.hp < 100) dano = i;
      }
      for (const e of outros) e.dead = false;
      Object.assign(bicho, guardado);
      bicho.d.preparo = antes;
      return {s: golpe >= 0 && dano >= 0 ? (dano - golpe)/60 : -1, pose: pose};
    };
    const padrao = medirPreparo(undefined), longo = medirPreparo(0.5);
    check("sem preparo no EDEF, o golpe do bicho cai 0,19 s depois de comecar", Math.abs(padrao.s - 0.19) < 0.03 && padrao.pose === 0.42,
      padrao.s.toFixed(3) + " s, pose " + padrao.pose.toFixed(2) + " s");
    check("com preparo 0,5 no EDEF, o golpe cai 0,5 s depois, e a pose dura ate la", Math.abs(longo.s - 0.5) < 0.03 && longo.pose >= 0.5,
      longo.s.toFixed(3) + " s, pose " + longo.pose.toFixed(2) + " s");
  } catch (e) {
    fail.push("EXCECAO: " + e.message + " @ " + (e.stack.split("\n")[1] || "").trim());
  }
  fim();
})();
