/* Testa o co-op sozinho: sobe o servidor (com --teste, que aceita
   teleporte, ninguem morre e a cripta recomeca em 3 s; e --preparo=0.45),
   abre dois navegadores sem tela -- Ana sem atraso, com um visual escolhido
   no provador, e Bia com 120 ms de ida e volta simulados -- e confere que:
     1. as duas entram, se enxergam, e o mundo bate com o do servidor;
     2. Ana anda, e Bia ve Ana chegar no mesmo lugar;
     3. Bia anda com atraso, e a previsao nao precisa de correcao;
     4. Bia ve Ana com o nome e o visual que Ana escolheu;
     5. a fala de Ana chega para Bia, e "/nome" troca o nome de Bia;
     6. Ana briga com um diabrete: Bia ve o bicho apanhar, e a contagem de
        mortes e a mesma nas duas;
     7. Bia briga com 120 ms: o servidor volta os bichos para onde ela os via;
     8. Bia olha para Ana e a ve desenhada, de perto (foto);
     9. Ana atravessa o portal: as duas venceram, e a cripta recomeca junto;
    10. o provador sai do mesmo servidor (a escolha fica no mesmo endereco).
   Grava teste.json e as fotos visto-por-A.png, visto-por-B.png e vencida.png.
   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/5-coop/testar.js      (precisa do playwright) */
"use strict";
const path = require("path"), fs = require("fs"), { spawn } = require("child_process");
const { chromium } = require("playwright");
const PORTA = 8199;
const VISUAL_DE_ANA = {armadura: "couro", elmo: "fechado", capa: "capa", corCapa: 2};

function subirServidor(){
  const s = spawn(process.execPath, [path.join(__dirname, "servidor.js"), "--porta=" + PORTA, "--teste", "--preparo=0.45"]);
  s.log = "";
  s.stdout.on("data", d => { s.log += d; });
  s.stderr.on("data", d => { s.log += d; });
  return new Promise((ok, falha) => {
    const t = setInterval(() => { if (s.log.includes("ouvindo")){ clearInterval(t); ok(s); } }, 100);
    setTimeout(() => { clearInterval(t); falha(new Error("o servidor nao subiu:\n" + s.log)); }, 30000);
  });
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
const D = (pag, f, a) => pag.evaluate(f, a);
const estado = pag => D(pag, () => window.__COOP_DBG.estado());

/* um diabrete vivo com chao livre em volta: onde ficar e para onde olhar */
function acharDiabrete(pag, pular){
  return D(pag, pular => {
    const C = window.__COOP_DBG, E = C.ents();
    for (let i = 0; i < E.length; i++){
      const e = E[i];
      if (e.kind !== "enemy" || e.dead || e.d.name !== "diabrete" || pular.indexOf(i) >= 0) continue;
      for (let k = 0; k < 8; k++){
        const a = k*Math.PI/4, x = e.x + Math.cos(a)*1.1, y = e.y + Math.sin(a)*1.1;
        if (C.livre(x, y)) return {i, x, y, ang: a + Math.PI, hp: e.hp};
      }
    }
    return null;
  }, pular || []);
}
async function brigar(pag, alvo, ms){
  await D(pag, a => window.__COOP_DBG.teleporte(a.x, a.y, a.ang), alvo);
  await pag.keyboard.press("1");
  await esperar(600);
  await pag.keyboard.down("z"); await esperar(ms); await pag.keyboard.up("z"); await esperar(600);
}
async function falar(pag, texto){
  await pag.keyboard.press("Enter"); await pag.keyboard.type(texto); await pag.keyboard.press("Enter");
}

(async () => {
  const srv = await subirServidor();
  const nav = await chromium.launch();
  const R = {ok: [], falhou: []};
  const conferir = (nome, cond, extra) => { (cond ? R.ok : R.falhou).push(nome + (extra ? " (" + extra + ")" : "")); console.log((cond ? "  ok  " : "  XX  ") + nome + (extra ? " (" + extra + ")" : "")); };
  try {
    const A = await nav.newPage({viewport: {width: 1300, height: 760}}), B = await nav.newPage({viewport: {width: 1300, height: 760}});
    const erros = [];
    for (const p of [A, B]) p.on("pageerror", e => erros.push(e.message));
    await A.addInitScript(v => localStorage.setItem("provador:v1", v), JSON.stringify(VISUAL_DE_ANA));
    await A.goto("http://localhost:" + PORTA + "/?nome=Ana");
    await B.goto("http://localhost:" + PORTA + "/?nome=Bia&atraso=120");
    await esperar(1500);
    /* 0: so Ana aperta Enter; Bia, na tela de titulo, ainda nao esta na cripta (nenhum bicho a ve) */
    await A.keyboard.press("Enter");
    await esperar(1500);
    const n0A = (await estado(A)).noMundo, n0B = (await estado(B)).noMundo;
    conferir("quem esta na tela de titulo nao esta no mundo", n0A === 1 && n0B === 1, "Ana ve " + n0A + ", Bia ve " + n0B + " no mundo");
    await B.keyboard.press("Enter");
    await esperar(2500);

    /* 1 */
    const eA = await estado(A), eB = await estado(B);
    conferir("as duas entram", eA.conectado && eB.conectado && eA.eu > 0 && eB.eu > 0 && eA.eu !== eB.eu);
    conferir("Ana ve 2 jogadores e Bia ve 2 jogadores", eA.jogadores === 2 && eB.jogadores === 2, eA.jogadores + " e " + eB.jogadores);
    conferir("o mundo do cliente e o do servidor batem", !eA.erro && !eB.erro, eA.erro || eB.erro);
    conferir("o preparo do golpe dos bichos chegou do servidor", eA.preparo === 0.45 && eB.compensar === true, "preparo " + eA.preparo);

    /* 2 */
    await A.keyboard.down("w"); await esperar(1500); await A.keyboard.up("w"); await esperar(800);
    const pA = await D(A, () => ({x: window.__COOP_DBG.P.x, y: window.__COOP_DBG.P.y}));
    const vistoPorB = (await D(B, () => window.__COOP_DBG.remotos()))[0];
    const d2 = vistoPorB ? Math.hypot(vistoPorB.x - pA.x, vistoPorB.y - pA.y) : 99;
    conferir("Ana andou, e Bia ve Ana onde Ana se ve", d2 < 0.05, "diferenca " + d2.toFixed(3) + " tile");

    /* 3 */
    await D(B, () => window.__COOP_DBG.zerarMedida());
    await B.keyboard.down("w"); await B.keyboard.down("d"); await esperar(1200); await B.keyboard.up("d");
    await B.keyboard.down("Shift"); await esperar(300); await B.keyboard.up("Shift"); await esperar(900); await B.keyboard.up("w");
    await B.keyboard.press(" "); await esperar(1200);
    const cB = await estado(B);
    R.previsaoB = {media: cB.correcaoMedia, maior: cB.maiorCorrecao};
    conferir("Bia anda, pula e da dash com 120 ms, e a previsao nao corrige", cB.maiorCorrecao < 0.05,
             "correcao media " + cB.correcaoMedia.toFixed(4) + ", maior " + cB.maiorCorrecao.toFixed(3) + " tile");

    /* 4 */
    const rA = (await D(B, () => window.__COOP_DBG.remotos()))[0];
    const visual = rA && rA.visual ? JSON.parse(rA.visual) : {};
    conferir("Bia ve Ana com o nome e o visual dela", rA && rA.nome === "Ana" && Object.keys(VISUAL_DE_ANA).every(k => visual[k] === VISUAL_DE_ANA[k]),
             rA ? rA.nome + ", elmo " + visual.elmo + ", capa " + visual.capa + ", armadura " + visual.armadura : "ninguem");

    /* 5 */
    await falar(A, "oi Bia, vamos pela esquerda");
    await esperar(900);
    await falar(B, "/nome Beatriz");
    await esperar(900);
    const falasB = (await estado(B)).falas, nomeVistoPorA = (await D(A, () => window.__COOP_DBG.remotos()))[0].nome;
    R.falas = falasB;
    conferir("a fala de Ana chega para Bia", falasB.indexOf("Ana: oi Bia, vamos pela esquerda") >= 0, falasB.slice(-3).join(" / "));
    conferir("/nome troca o nome de Bia, e Ana ve o nome novo", nomeVistoPorA === "Beatriz", nomeVistoPorA);

    /* 6: Ana vai ate um diabrete com a adaga */
    const alvo = await acharDiabrete(A);
    conferir("achou um diabrete com chao livre em volta", !!alvo);
    if (alvo){
      await brigar(A, alvo, 2500);
      const bichoVistoPorB = await D(B, i => { const e = window.__COOP_DBG.ents()[i]; return {hp: e.hp, dead: e.dead}; }, alvo.i);
      R.luta = {hpAntes: alvo.hp, hpDepoisVistoPorB: bichoVistoPorB.hp, morreu: bichoVistoPorB.dead};
      conferir("Ana bateu no diabrete, e Bia viu", bichoVistoPorB.dead || bichoVistoPorB.hp < alvo.hp,
               "vida do bicho " + alvo.hp + " -> " + bichoVistoPorB.hp + (bichoVistoPorB.dead ? ", morto" : ""));
      const kA = await estado(A), kB = await estado(B);
      conferir("a contagem de mortes e a mesma nas duas", kA.kills === kB.kills && kA.kills >= 1,
               "Ana " + kA.kills + "/" + kA.totalKills + ", Bia " + kB.kills + "/" + kB.totalKills);

      /* 7: agora Bia, com 120 ms */
      const alvoB = await acharDiabrete(B, [alvo.i]);
      if (alvoB){
        await brigar(B, alvoB, 2000);
        const bicho = await D(A, i => { const e = window.__COOP_DBG.ents()[i]; return {hp: e.hp, dead: e.dead}; }, alvoB.i);
        R.lutaB = {hpAntes: alvoB.hp, hpDepois: bicho.hp, morreu: bicho.dead};
        conferir("Bia bateu com 120 ms, e Ana viu", bicho.dead || bicho.hp < alvoB.hp, "vida do bicho " + alvoB.hp + " -> " + bicho.hp + (bicho.dead ? ", morto" : ""));
      }
      const passos = l => (srv.log.match(new RegExp("golpe de " + l + " rebobinado (\\d+) passos", "g")) || []).map(s => +s.match(/(\d+) passos/)[1]);
      R.rebobinados = {Ana: passos("Ana"), Beatriz: passos("Beatriz")};
      const media = a => a.length ? a.reduce((x, y) => x + y, 0)/a.length : 0;
      conferir("o servidor volta os bichos para onde cada uma via, mais para quem tem atraso",
               R.rebobinados.Ana.length && R.rebobinados.Beatriz.length && media(R.rebobinados.Beatriz) > media(R.rebobinados.Ana) + 3,
               "Ana " + media(R.rebobinados.Ana).toFixed(1) + " passos em media, Beatriz " + media(R.rebobinados.Beatriz).toFixed(1));

      /* 8: Bia vai olhar Ana */
      const pA2 = await D(A, () => ({x: window.__COOP_DBG.P.x, y: window.__COOP_DBG.P.y, ang: window.__COOP_DBG.P.ang}));
      const lugar = await D(B, p => {
        const C = window.__COOP_DBG;
        for (let k = 0; k < 16; k++){
          const a = p.ang + k*Math.PI/8;
          for (const d of [2.2, 1.8, 1.5]){
            const x = p.x + Math.cos(a)*d, y = p.y + Math.sin(a)*d;
            if (C.livre(x, y)) return {x, y, ang: Math.atan2(p.y - y, p.x - x)};
          }
        }
        return null;
      }, pA2);
      if (lugar){
        await D(B, l => window.__COOP_DBG.teleporte(l.x, l.y, l.ang), lugar);
        await A.keyboard.press("x");                             // Ana em terceira pessoa, para a foto dela mostrar o proprio boneco
        await esperar(5000);
        const vis = await D(B, () => {
          const C = window.__COOP_DBG, r = C.remotos()[0], P = C.P;
          return r ? {d: Math.hypot(r.x - P.x, r.y - P.y), olhar: Math.abs(((Math.atan2(r.y - P.y, r.x - P.x) - P.ang + 3*Math.PI) % (2*Math.PI)) - Math.PI),
                      desenhado: r.desenhado} : null;
        });
        R.visao = vis;
        conferir("Bia ve Ana de perto, na frente, desenhada", vis && vis.d < 3 && vis.olhar < 0.6 && vis.desenhado, JSON.stringify(vis));
        await (await B.$("canvas")).screenshot({path: path.join(__dirname, "visto-por-B.png")});
        await (await A.$("canvas")).screenshot({path: path.join(__dirname, "visto-por-A.png")});
        await A.keyboard.press("x");
      }
    }

    /* 9: Ana atravessa o portal */
    const saida = await D(A, () => window.__COOP_DBG.saida());
    conferir("achou o portal de saida", !!saida, JSON.stringify(saida));
    if (saida){
      await D(A, s => window.__COOP_DBG.teleporte(s.x, s.y, s.ang), saida);
      await esperar(700);
      await A.keyboard.press("e");
      await esperar(900);
      const vA = await estado(A), vB = await estado(B);
      conferir("Ana atravessou, e as duas venceram", vA.modo === "won" && vB.modo === "won", "Ana " + vA.modo + ", Bia " + vB.modo + ", recomeca em " + vB.recomecaEm + " s");
      await (await B.$("canvas")).screenshot({path: path.join(__dirname, "vencida.png")});
      await esperar(4000);
      const nA = await estado(A), nB = await estado(B);
      R.recomeco = {Ana: [nA.rodada, nA.modo, nA.kills], Bia: [nB.rodada, nB.modo, nB.kills]};
      conferir("a cripta recomeca junto, com a contagem zerada", nA.rodada === 1 && nB.rodada === 1 && nA.modo === "play" && nB.modo === "play" &&
               nA.kills === 0 && nB.kills === 0 && !nA.erro && !nB.erro, JSON.stringify(R.recomeco));
      await B.keyboard.down("w"); await esperar(800); await B.keyboard.up("w"); await esperar(800);
      const pB = await D(B, () => ({x: window.__COOP_DBG.P.x, y: window.__COOP_DBG.P.y}));
      const bVistaPorA = (await D(A, () => window.__COOP_DBG.remotos()))[0];
      const d9 = bVistaPorA ? Math.hypot(bVistaPorA.x - pB.x, bVistaPorA.y - pB.y) : 99;
      conferir("depois do recomeco, Ana ve Bia andar onde Bia se ve", d9 < 0.05, "diferenca " + d9.toFixed(3) + " tile");
    }
    const prov = await fetch("http://localhost:" + PORTA + "/provador");
    const provTexto = await prov.text();
    conferir("o servidor tambem serve o provador, no mesmo endereco", prov.status === 200 && /provador:v1/.test(provTexto), prov.status + ", " + provTexto.length + " bytes");
    R.estadoA = await estado(A);
    R.estadoB = await estado(B);
    conferir("nenhum erro nas paginas", !erros.length, erros.slice(0, 3).join(" | "));
  } finally {
    await nav.close();
    await esperar(300);
    srv.kill();
    R.servidor = srv.log;
    fs.writeFileSync(path.join(__dirname, "teste.json"), JSON.stringify(R, null, 1));
    console.log("\n" + R.ok.length + " ok, " + R.falhou.length + " falharam");
    console.log(srv.log.split("\n").filter(l => /passo medio|entrou|saiu|VENCIDA|recomecou|: /.test(l) && !/rebobinado/.test(l)).join("\n"));
    process.exit(R.falhou.length ? 1 : 0);
  }
})().catch(e => { console.error(e); process.exit(1); });
