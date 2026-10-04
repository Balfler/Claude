/* ============================================================
   SONDAGEM 5 -- O SERVIDOR DO CO-OP
   ------------------------------------------------------------
   Roda a cripta no node com o codigo do proprio jogo (o harness dos testes
   e a costura do co-op), a 60 passos por segundo, e fala com os
   navegadores por WebSocket. Tudo sem dependencia.

     - serve a pagina do jogo em http://<esta maquina>:8124/ -- montada na
       hora do jogo montado (cripta-vhalgorn.html), com o cliente.js dentro;
     - cada navegador que conecta vira um jogador, com o nome e o visual que
       escolheu no provador; o corpo so entra na cripta quando ele aperta
       Enter (antes, na tela de titulo, nenhum bicho o ve) (servido em /provador, para a escolha ficar no
       mesmo endereco do jogo); as entradas dele rodam no passo do jogador, e o
       mundo (bichos, projeteis, portas, itens) roda uma vez por passo;
     - 20 vezes por segundo, cada um recebe o retrato do mundo e o proprio
       estado, com o numero da ultima entrada processada;
     - o golpe de cada jogador acerta os bichos onde ELE os via (a
       compensacao do atraso): o servidor guarda meio segundo de historia;
     - o que se diz na linha de fala (Enter) vai para todos; "/nome Fulano"
       troca o nome;
     - quem morre volta na entrada depois de 4 segundos; quando alguem
       atravessa o portal, a cripta e vencida para todos e recomeca em 15 s.

   Uso: node mundo-perigoso/build.js
        node mundo-perigoso/sondagens/5-coop/servidor.js [--porta=8124] [--preparo=0.5] [--sem-compensacao]
   e abrir o endereco que ele escreve. --preparo muda o tempo entre o bicho
   comecar o golpe e o golpe acertar (hoje 0,19 s; ver a sondagem 2).
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os");
const { carregar } = require("../../teste/harness");
const { aceitar } = require("./ws");
const { costurarCoop, montarCliente } = require("./costura-coop");

const MONTADO = path.join(__dirname, "..", "..", "..", "cripta-vhalgorn.html");
const arg = (n, p) => { const a = process.argv.find(x => x.startsWith("--" + n + "=")); return a ? a.split("=")[1] : p; };
const PORTA = +arg("porta", 8124);
const PREPARO = +arg("preparo", 0.19);
const COMPENSAR = !process.argv.includes("--sem-compensacao");
const TESTE = process.argv.includes("--teste");      // o teste automatico: aceita teleporte, ninguem morre, recomeca em 3 s
const PASSO = 1/60, HISTORIA = 40, RECOMECO = TESTE ? 180 : 900;

/* o jogo no node, com a costura: o mesmo de testes e sondagens */
function jogoDoServidor(){
  const html = fs.readFileSync(MONTADO, "utf8").replace(/\r\n/g, "\n");
  const m = html.match(/<script>\n([\s\S]*)<\/script>/);
  const tmp = path.join(os.tmpdir(), "coop-servidor-" + process.pid + ".html");
  fs.writeFileSync(tmp, html.replace(m[1], () => costurarCoop(m[1], PREPARO)));
  try { return carregar(tmp, {busca: "?mapa=cripta"}).S.__rede; } finally { fs.unlinkSync(tmp); }
}
const R = jogoDoServidor();
R.G.mode = "play";
const BASE = JSON.parse(JSON.stringify(R.P));
const PAGINA = montarCliente(fs.readFileSync(MONTADO, "utf8"), fs.readFileSync(path.join(__dirname, "cliente.js"), "utf8"));

const JOGADORES = new Map();
let proximoId = 1, tickN = 0, rodada = 0, vencidaEm = -1;
const stats = {passos: 0, ms: 0, pior: 0, bytes: 0, rebobinadas: 0, desde: Date.now()};

function novoJogador(id){
  const J = JSON.parse(JSON.stringify(BASE)), k = (id - 1) % 4;
  J.x = BASE.x + (k % 2)*0.6 - 0.3; J.y = BASE.y - Math.floor(k/2)*0.6;
  J.z = R.floorAt(Math.floor(J.x), Math.floor(J.y));
  return J;
}
function renascer(j){
  const novo = novoJogador(j.id);
  for (const k of Object.keys(j.J)) delete j.J[k];
  Object.assign(j.J, novo);
  j.mortoEm = -1;
}
/* no mundo so esta quem ja apertou Enter; os outros so recebem o retrato */
const dentro = () => [...JOGADORES.values()].filter(j => j.dentro);
function atualizarLista(){ R.jogadores(dentro().map(j => j.J)); }
function paraTodos(o){ const s = JSON.stringify(o); for (const j of JOGADORES.values()) j.con.enviar(s); }
function avisarQuem(){ paraTodos({tipo: "quem", lista: [...JOGADORES.values()].map(j => [j.id, j.nome, j.escolha])}); }
function falar(quem, texto){ paraTodos({tipo: "fala", quem: quem, texto: texto}); console.log(quem + ": " + texto); }
/* nome e fala: texto curto, sem o que atrapalhe o desenho */
const limpo = (t, n) => String(t || "").replace(/[\u0000-\u001f<>{}]/g, "").trim().slice(0, n);

/* ---------- a compensacao ----------
   Depois de cada passo, onde cada bicho estava. Quando um jogador golpeia,
   os bichos voltam para o passo que ele estava vendo (o cliente manda junto
   da entrada), o golpe escolhe o alvo ali, e tudo volta. O dano cai agora. */
const HIST = [];
let vistoPeloJogador = null, daVez = null;
function guardarHistoria(){
  const pos = [];
  for (const e of R.ents()) pos.push(e.kind === "enemy" ? [e.x, e.y, e.z] : null);
  HIST.push({tick: tickN, pos: pos});
  if (HIST.length > HISTORIA) HIST.shift();
}
R.rebobinar(function(){
  if (!COMPENSAR || vistoPeloJogador === null || !HIST.length) return null;
  const alvo = Math.max(tickN - 30, Math.min(tickN, Math.round(vistoPeloJogador)));   // no maximo 0,5 s para tras
  const h = HIST.find(x => x.tick === alvo);
  if (!h || alvo === tickN) return null;
  const E = R.ents(), guardado = [];
  h.pos.forEach(function(p, i){
    const e = E[i];
    if (!p || !e || e.kind !== "enemy") return;
    guardado.push([e, e.x, e.y, e.z]);
    e.x = p[0]; e.y = p[1]; e.z = p[2];
  });
  stats.rebobinadas++;
  if (TESTE) console.log("golpe de " + daVez.nome + " rebobinado " + (tickN - alvo) + " passos");
  return function(){ for (const [e, x, y, z] of guardado){ e.x = x; e.y = y; e.z = z; } };
});

function conectou(con){
  const id = proximoId++;
  const j = {id: id, con: con, J: novoJogador(id), fila: [], ack: 0, mortoEm: -1, nome: "Jogador " + id, escolha: null, dentro: false};
  con.aoMensagem = function(texto){
    if (texto.length > 20000) return;
    let m;
    try { m = JSON.parse(texto); } catch (e){ return; }
    if (m.tipo === "ola"){
      j.nome = limpo(m.nome, 20) || j.nome;
      j.escolha = m.escolha && typeof m.escolha === "object" ? m.escolha : null;
      JOGADORES.set(id, j);
      con.enviar(JSON.stringify({tipo: "bemvindo", id: id, ents: R.ents().map((e, i) => [i, e.kind]), preparo: PREPARO, compensar: COMPENSAR}));
      avisarQuem();
    } else if (m.tipo === "entrar" && JOGADORES.has(id) && !j.dentro){
      /* o Enter da tela de titulo: o corpo nasce agora, na entrada */
      j.dentro = true; renascer(j); j.fila.length = 0;
      atualizarLista();
      falar("*", j.nome + " entrou na cripta");
    } else if (m.tipo === "entrada" && j.dentro && JOGADORES.has(id) && m.ent){
      /* a fala nao e acao do jogo: vai para todos */
      const acoes = Array.isArray(m.ent.acoes) ? m.ent.acoes : [];
      m.ent.acoes = acoes.filter(function(a){
        if (!a || a.tipo !== "dizer") return true;
        const t = limpo(a.texto, 120);
        if (/^\/nome\s+/.test(t)){ const n = limpo(t.replace(/^\/nome\s+/, ""), 20); if (n){ falar("*", j.nome + " agora e " + n); j.nome = n; avisarQuem(); } }
        else if (t) falar(j.nome, t);
        return false;
      });
      if (j.fila.length < 60) j.fila.push(m);
    } else if (m.tipo === "ping") con.enviar(JSON.stringify({tipo: "pong", t: m.t}));
    else if (m.tipo === "teleporte" && TESTE){
      Object.assign(j.J, {x: m.x, y: m.y, z: R.floorAt(Math.floor(m.x), Math.floor(m.y)), vx: 0, vy: 0, vz: 0, ang: m.ang});
    }
  };
  con.aoFechar = function(){
    if (!JOGADORES.delete(id)) return;
    atualizarLista(); avisarQuem();
    falar("*", j.nome + " saiu");
  };
}

const r2 = x => Math.round((x || 0)*100)/100;
function mandarRetratos(){
  const G = R.G, bichos = [], sumidos = [];
  R.ents().forEach(function(e, i){
    if (e.gone){ sumidos.push(i); return; }
    if (e.kind === "enemy") bichos.push([i, r2(e.x), r2(e.y), r2(e.z), r2(e.ang), Math.round(e.hp), e.dead ? 1 : 0,
                                         r2(e.dieT), r2(e.anim), r2(e.painT), r2(e.walk)]);
  });
  const tiros = R.projs().map(p => [p.type, r2(p.x), r2(p.y), r2(p.z), r2(p.vx), r2(p.vy), r2(p.vz), p.owner]);
  const portas = [];
  for (const [k, d] of R.doors) portas.push([k, r2(d.open)]);
  const jog = dentro().map(function(j){
    const J = j.J;
    return [j.id, r2(J.x), r2(J.y), r2(J.z), r2(J.ang), r2(J.pitch), r2(J.vx), r2(J.vy), J.ground ? 1 : 0,
            r2(J.anim), J.dead ? 1 : 0, Math.round(J.hp), J.wpn, r2(J.passada), r2(J.dashT)];
  });
  /* a contagem da cripta e de todos: mortes, itens, segredos, a rodada e, se foi vencida, em quantos segundos recomeca */
  const g = [G.kills, G.totalKills, G.items, G.totalItems, G.secrets, G.totalSecrets, rodada,
             vencidaEm >= 0 ? Math.max(1, Math.ceil((RECOMECO - (tickN - vencidaEm))/60)) : 0];
  for (const j of JOGADORES.values()){
    /* o proprio estado vai inteiro, sem arredondar: e dele que a previsao parte; o
       passo e o do mundo que vai no retrato (a historia guarda o mesmo numero) */
    const s = JSON.stringify({tipo: "retrato", tick: tickN - 1, ack: j.ack, jog: jog, bichos: bichos, tiros: tiros,
                              portas: portas, sumidos: sumidos, g: g, meu: j.J});
    j.con.enviar(s);
    stats.bytes += s.length;
  }
}

/* a cripta vencida recomeca: o mundo de novo, todos na entrada */
function recomecar(){
  R.buildLevel();
  R.G.mode = "play";
  rodada++; vencidaEm = -1;
  HIST.length = 0;
  for (const j of JOGADORES.values()){ renascer(j); j.fila.length = 0; }
  falar("*", "a cripta recomecou (rodada " + (rodada + 1) + ")");
}

function passo(){
  const t0 = process.hrtime.bigint();
  for (const j of dentro()){
    /* as entradas que chegaram, cada uma um passo de 1/60 s; sem entrada, o jogador fica parado */
    let n = 0;
    while (j.fila.length && n < 8){
      const m = j.fila.shift();
      vistoPeloJogador = typeof m.v === "number" ? m.v : null; daVez = j;
      R.passoDoJogador(j.J, PASSO, m.ent);
      vistoPeloJogador = null; daVez = null;
      j.ack = m.seq; n++;
    }
    if (TESTE && j.J.hp < 50) j.J.hp = 100;                 // no teste automatico ninguem morre
    if (j.J.dead){
      if (j.mortoEm < 0) j.mortoEm = tickN;
      else if (tickN - j.mortoEm > 240) renascer(j);
    }
  }
  if (dentro().length){ R.passoDoMundo(PASSO); guardarHistoria(); }
  if (R.G.mode === "won" && vencidaEm < 0){
    vencidaEm = tickN;
    falar("*", "A CRIPTA FOI VENCIDA! recomeca em " + Math.round(RECOMECO/60) + " s");
  }
  if (vencidaEm >= 0 && tickN - vencidaEm > RECOMECO) recomecar();
  tickN++;
  if (tickN % 3 === 0 && JOGADORES.size) mandarRetratos();
  const ms = Number(process.hrtime.bigint() - t0)/1e6;
  stats.passos++; stats.ms += ms; if (ms > stats.pior) stats.pior = ms;
}

/* o relogio: 60 passos por segundo, quantos o tempo real pedir */
let acumulado = 0, antes = process.hrtime.bigint();
setInterval(function(){
  const agora = process.hrtime.bigint();
  acumulado += Number(agora - antes)/1e9; antes = agora;
  let n = 0;
  while (acumulado >= PASSO && n < 8){ passo(); acumulado -= PASSO; n++; }
  if (n === 8) acumulado = 0;
}, 4);

/* de dez em dez segundos, quanto custa */
setInterval(function(){
  if (JOGADORES.size){
    const s = (Date.now() - stats.desde)/1000;
    console.log(JOGADORES.size + " jogadores | passo medio " + (stats.ms/stats.passos).toFixed(3) + " ms, pior " + stats.pior.toFixed(2) +
                " ms | saindo " + (stats.bytes/1024/s).toFixed(1) + " KB/s | golpes rebobinados " + stats.rebobinadas);
  }
  stats.passos = stats.ms = stats.pior = stats.bytes = stats.rebobinadas = 0; stats.desde = Date.now();
}, 10000);

/* o provador tambem sai daqui: a escolha fica guardada no navegador por
   endereco, e so a feita no mesmo endereco do co-op chega no jogo */
const PROVADOR = path.join(__dirname, "..", "..", "..", "provador.html");
const srv = http.createServer(function(req, res){
  if (req.url === "/" || req.url.startsWith("/?")){
    res.writeHead(200, {"content-type": "text/html; charset=utf-8", "cache-control": "no-store"});
    res.end(PAGINA);
  } else if ((req.url === "/provador" || req.url.startsWith("/provador?")) && fs.existsSync(PROVADOR)){
    res.writeHead(200, {"content-type": "text/html; charset=utf-8", "cache-control": "no-store"});
    res.end(fs.readFileSync(PROVADOR));
  } else { res.writeHead(404); res.end(); }
});
srv.on("upgrade", function(req, socket){ if (req.url === "/ws") aceitar(req, socket, conectou); else socket.destroy(); });
srv.listen(PORTA, "0.0.0.0", function(){
  const ips = [];
  for (const l of Object.values(os.networkInterfaces())) for (const a of l) if (a.family === "IPv4" && !a.internal) ips.push(a.address);
  console.log("co-op da cripta ouvindo na porta " + srv.address().port +
              " (preparo do golpe dos bichos " + PREPARO + " s, compensacao " + (COMPENSAR ? "ligada" : "desligada") + ")");
  console.log("  nesta maquina:    http://localhost:" + srv.address().port + "/");
  for (const ip of ips) console.log("  na mesma rede:    http://" + ip + ":" + srv.address().port + "/");
  console.log("  no endereco: ?nome=Fulano para o nome, ?atraso=120 para um atraso de mentira");
  console.log("  o visual: /provador no mesmo endereco (ex.: http://localhost:" + srv.address().port + "/provador), e depois recarregar o jogo");
});
