/* ============================================================
   SONDAGEM 5 -- O CLIENTE DO CO-OP
   ------------------------------------------------------------
   Entra DENTRO do jogo montado (costura-coop.js). O servidor roda o mundo;
   o navegador so desenha e preve o proprio corpo:

   - A CADA PASSO (1/60 s) a entrada vai para o servidor com um numero, e o
     mesmo passo roda aqui na hora (passoDoJogador, o codigo do jogo). E a
     previsao: andar, pular e dar dash sem esperar a rede. Junto vai o passo
     do servidor que a tela esta mostrando, para o golpe acertar onde o
     jogador via o bicho (a compensacao e do servidor).
   - A CADA RETRATO (20 por segundo) o servidor diz onde o jogador estava
     depois da ultima entrada que ele processou. O corpo volta para la e as
     entradas que o servidor ainda nao viu rodam de novo por cima. Se a
     previsao acertou, nada se mexe; a medida da correcao fica no estado.
   - OS BICHOS, OS PROJETEIS E OS OUTROS JOGADORES sao desenhados 100 ms no
     passado, entre dois retratos -- o jeito comum de nao tremer.
   - O GOLPE e do servidor. Aqui ele so faz o efeito: a animacao e o som
     saem na hora, e o acerto chega no retrato.
   - OS OUTROS JOGADORES aparecem com o visual que cada um escolheu no
     provador e a arma que estao usando, assados aos poucos como o do
     jogador, com o nome em cima.
   - A LINHA DE FALA (Enter) vai para todos; "/nome Fulano" troca o nome.
   - A CONTAGEM (mortes, itens, segredos) e a da cripta, igual para todos;
     quando alguem atravessa o portal, todos venceram, e a cripta recomeca
     junto quando o servidor manda.

   No endereco: ?nome=Fulano da o nome (fica guardado no navegador), e
   ?atraso=120 soma um atraso de ida e volta de mentira, metade em cada
   sentido, para sentir a rede ruim sem precisar dela.
   ============================================================ */
var __COOP = (function(){
  const busca = (typeof location !== "undefined" && location.search) || "";
  const ATRASO = +((busca.match(/atraso=(\d+)/) || [])[1] || 0);
  const INTERP = 100;
  let NOME = "";
  try {
    const n = busca.match(/nome=([^&]*)/);
    if (n) localStorage.setItem("coop:nome", decodeURIComponent(n[1].replace(/\+/g, " ")));
    NOME = localStorage.getItem("coop:nome") || "";
  } catch (e){}
  let ESCOLHA = null;
  try { ESCOLHA = JSON.parse(localStorage.getItem("provador:v1") || "null"); } catch (e){}

  let ws = null, conectado = false, eu = -1, seq = 0, pendentes = [], retratos = [], ping = 0, erro = "";
  let dentro = false;                   // ja apertou Enter: o corpo esta na cripta do servidor
  let reproduzindo = false, preparo = 0, compensar = false, rodada = -1, recomecaEm = 0, tickVisto = -1;
  const REMOTOS = new Map(), FORNADAS = {}, QUEM = new Map();
  const medida = {correcoes: 0, somaCorrecao: 0, maiorCorrecao: 0, retratos: 0, bytes: 0, desde: 0};

  function atrasar(fn){ if (ATRASO > 0) setTimeout(fn, ATRASO/2); else fn(); }
  function enviar(o){
    const s = JSON.stringify(o);
    atrasar(function(){ if (ws && ws.readyState === 1) ws.send(s); });
  }
  function conectar(){
    if (typeof WebSocket === "undefined" || typeof location === "undefined" || !location.host){
      erro = "ABRA PELO SERVIDOR DO CO-OP (SONDAGENS/5-COOP)"; return;
    }
    ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws");
    ws.onopen = function(){ conectado = true; medida.desde = performance.now(); enviar({tipo: "ola", nome: NOME, escolha: ESCOLHA}); };
    ws.onclose = function(){ conectado = false; erro = "SEM CONEXAO COM O SERVIDOR"; };
    ws.onmessage = function(m){ const d = m.data; atrasar(function(){ receber(d); }); };
  }

  function receber(texto){
    medida.bytes += texto.length;
    const m = JSON.parse(texto);
    if (m.tipo === "bemvindo"){ eu = m.id; preparo = m.preparo; compensar = m.compensar; conferir(m.ents); }
    else if (m.tipo === "pong") ping = performance.now() - m.t;
    else if (m.tipo === "quem"){
      QUEM.clear();
      for (const [id, nome, escolha] of m.lista) QUEM.set(id, {nome: nome, escolha: escolha});
    }
    else if (m.tipo === "fala"){
      if (!G.conversa) G.conversa = [];
      G.conversa.push({quem: m.quem, fala: m.texto, t: G.tick});
      if (G.conversa.length > 12) G.conversa.splice(0, G.conversa.length - 12);
    }
    else if (m.tipo === "retrato"){
      m.chegou = performance.now();
      retratos.push(m);
      while (retratos.length > 40) retratos.shift();
      medida.retratos++;
      contagem(m.g);
      reconciliar(m);
    }
  }
  /* o servidor e o cliente montam a cripta pelo mesmo codigo: a entidade i
     tem de ser a mesma dos dois lados */
  function conferir(lista){
    let erradas = 0;
    for (const [i, kind] of lista) if (!ents[i] || ents[i].kind !== kind) erradas++;
    if (erradas) erro = "MUNDO DIFERENTE DO SERVIDOR: " + erradas + " ENTIDADES";
  }
  /* a contagem e a da cripta: [mortes, total, itens, total, segredos, total,
     rodada, segundos para recomecar (0 se nao foi vencida)] */
  function contagem(g){
    if (!g) return;
    if (rodada < 0) rodada = g[6];
    else if (g[6] !== rodada){                                  // o servidor recomecou a cripta
      rodada = g[6];
      const conversa = G.conversa;                              // a fala continua
      buildLevel();
      G.conversa = conversa;
      if (G.mode !== "title") G.mode = "play";
      retratos = retratos.slice(-1);
    }
    G.kills = g[0]; G.totalKills = g[1]; G.items = g[2]; G.totalItems = g[3]; G.secrets = g[4]; G.totalSecrets = g[5];
    recomecaEm = g[7];
    if (g[7] > 0 && G.mode === "play"){ G.mode = "won"; G.endTime = G.time; __somAgora("exit"); }
  }

  /* o servidor manda onde o corpo estava; as entradas ainda nao vistas rodam de novo */
  function reconciliar(m){
    if (!m.meu || G.mode !== "play") return;
    const antes = {x: P.x, y: P.y, z: P.z};
    const guarda = {ang: P.ang, pitch: P.pitch, cd: P.cd, anim: P.anim, painT: P.painT, evilT: P.evilT, eye: P.eye};
    const hp = P.hp, morto = P.dead;
    Object.assign(P, m.meu);
    pendentes = pendentes.filter(function(p){ return p.seq > m.ack; });
    reproduzindo = true;
    try { for (const p of pendentes) passoDoJogador(P, 1/60, p.ent); } finally { reproduzindo = false; }
    Object.assign(P, guarda);
    const d = Math.hypot(P.x - antes.x, P.y - antes.y, P.z - antes.z);
    medida.correcoes++; medida.somaCorrecao += d;
    if (d > medida.maiorCorrecao) medida.maiorCorrecao = d;
    if (P.hp < hp && !P.dead){
      P.painT = 0.9; G.flash = Math.min(0.85, 0.22 + (hp - P.hp)/50); G.flashCol = "#c81e0a";
      G.shake = Math.min(5, 1.2 + (hp - P.hp)/9); __somAgora("pain");
    }
    if (P.dead && !morto){ __somAgora("die"); say("VOCE MORREU - VOLTANDO NA ENTRADA"); }
  }

  function update(dt, ent){
    ent = ent || lerEntrada();
    G.tick += dt;
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt*1.8);
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt*9);
    if (G.msgT > 0) G.msgT -= dt;
    if (G.mode !== "play") return;
    if (!dentro && conectado && eu >= 0){ dentro = true; enviar({tipo: "entrar"}); }
    G.time += dt;
    if (!conectado || eu < 0) return;
    const e = {frente: ent.frente, lado: ent.lado, girar: ent.girar, subir: ent.subir, agachar: ent.agachar,
               dash: ent.dash, atirar: ent.atirar, acoes: ent.acoes || [], ang: P.ang, pitch: P.pitch};
    seq++;
    pendentes.push({seq: seq, ent: e});
    if (pendentes.length > 240) pendentes.shift();
    enviar({tipo: "entrada", seq: seq, ent: e, v: tickVisto >= 0 ? Math.round(tickVisto*10)/10 : undefined});
    passoDoJogador(P, dt, e);                                    // a previsao
    visited[(P.y|0)*MW + (P.x|0)] = 1;
    if (seq % 60 === 0) enviar({tipo: "ping", t: performance.now()});
  }

  const lerp = function(a, b, k){ return a + (b - a)*k; };
  function lerpAng(a, b, k){ let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d*k; }

  /* o mundo 100 ms atras, entre os dois retratos em volta desse instante */
  function aplicarMundo(){
    if (!retratos.length) return;
    const rt = performance.now() - INTERP;
    let a = retratos[0], b = null;
    for (let i = retratos.length - 1; i >= 0; i--) if (retratos[i].chegou <= rt){ a = retratos[i]; b = retratos[i + 1] || null; break; }
    const k = b ? Math.min(1, Math.max(0, (rt - a.chegou)/Math.max(1, b.chegou - a.chegou))) : 0;
    tickVisto = b ? lerp(a.tick, b.tick, k) : a.tick;           // o passo do servidor que a tela mostra
    const bB = b ? new Map(b.bichos.map(function(x){ return [x[0], x]; })) : null;
    for (const x of a.bichos){
      const e = ents[x[0]];
      if (!e || e.kind !== "enemy") continue;
      const y = (bB && bB.get(x[0])) || x, f = k < 0.5 ? x : y;
      e.x = lerp(x[1], y[1], k); e.y = lerp(x[2], y[2], k); e.z = lerp(x[3], y[3], k); e.ang = lerpAng(x[4], y[4], k);
      e.hp = f[5]; e.dead = !!f[6]; e.dieT = f[7]; e.anim = f[8]; e.painT = f[9]; e.walk = lerp(x[10], y[10], k);
    }
    projs.length = 0;
    const dtP = Math.max(0, rt - a.chegou)/1000;
    for (const t of a.tiros)
      projs.push({type: t[0], x: t[1] + t[4]*dtP, y: t[2] + t[5]*dtP, z: t[3] + t[6]*dtP, vx: t[4], vy: t[5], vz: t[6], owner: t[7]});
    const ult = retratos[retratos.length - 1];
    for (const [kd, aberta] of ult.portas){ const d = doors.get(kd); if (d) d.open = aberta; }
    for (const i of ult.sumidos) if (ents[i] && ents[i].kind !== "cena") ents[i].gone = true;
    const bJ = b ? new Map(b.jog.map(function(x){ return [x[0], x]; })) : null, vistos = new Set();
    for (const x of a.jog){
      if (x[0] === eu) continue;
      vistos.add(x[0]);
      const y = (bJ && bJ.get(x[0])) || x, f = k < 0.5 ? x : y;
      let r = REMOTOS.get(x[0]);
      if (!r){
        r = {id: x[0], ultima: null, ent: {kind: "cena", type: "coop", x: 0, y: 0, z: 0, img: null, fala: "",
                                           larg: DIM_PERSONAGEM.DX*VOX_PERSONAGEM, alto: DIM_PERSONAGEM.DZ*VOX_PERSONAGEM}};
        REMOTOS.set(x[0], r);
      }
      r.x = lerp(x[1], y[1], k); r.y = lerp(x[2], y[2], k); r.z = lerp(x[3], y[3], k); r.ang = lerpAng(x[4], y[4], k);
      r.vx = f[6]; r.vy = f[7]; r.ground = !!f[8]; r.anim = f[9]; r.dead = !!f[10]; r.hp = f[11]; r.wpn = f[12];
      r.passada = lerp(x[13], y[13], k); r.dashT = f[14];
    }
    for (const [id, r] of REMOTOS) if (!vistos.has(id)){ r.ent.gone = true; REMOTOS.delete(id); }
  }

  /* a pose de um jogador de fora, pela mesma regra de poseDoJogador */
  function poseRemota(r){
    if (!r.ground) return POSE.PULO;
    if (r.anim > 0){
      const w = WPN[r.wpn], k = 1 - r.anim/w.cd;
      return w.kind === "melee" ? POSE.ATAQUE[k < 0.22 ? 0 : 1] : POSE.CONJURAR[k < 0.3 ? 0 : 1];
    }
    if (Math.hypot(r.vx, r.vy) > 0.4){
      const ciclo = r.dashT > 0 ? POSE.CORRER : POSE.ANDAR;
      return ciclo[frameIdx(r.passada*ciclo.length, ciclo.length)];
    }
    return POSE.PARADO;
  }
  /* o visual de um jogador: a escolha dele no provador, com a arma na mao;
     jogadores com o mesmo visual dividem a fornada */
  function visualDe(r){
    const q = QUEM.get(r.id), esc = escolhaDoPersonagem(q ? q.escolha : null);
    esc.arma = ARMA_DO_WPN[WPN[r.wpn].s] || "nenhuma";
    const chave = JSON.stringify(esc);
    /* com a proposta 3 no src/, o forno assa fora da linha principal */
    if (!FORNADAS[chave]) FORNADAS[chave] = (typeof fornadaAoFundo === "function" ? fornadaAoFundo : novaFornada)(esc, ILHA ? HORIZONTE : 0);
    return chave;
  }
  /* cada jogador de fora vira uma entidade de cenario com o quadro certo;
     trocando de arma, fica a fornada velha ate a nova ter o que mostrar */
  function desenharRemotos(){
    for (const r of REMOTOS.values()){
      const e = r.ent;
      if (ents.indexOf(e) < 0) ents.push(e);
      e.x = r.x; e.y = r.y; e.z = r.z;
      r.visual = visualDe(r);
      const rel = r.ang - Math.atan2(camY - r.y, camX - r.x), rumo = frameIdx(Math.round(rel/(TAU/ROTACOES)) + ROTACOES*4, ROTACOES);
      let img = quadroDaPose(FORNADAS[r.visual].quadros, poseRemota(r), rumo);
      if (img) r.ultima = r.visual;
      else if (r.ultima) img = quadroDaPose(FORNADAS[r.ultima].quadros, poseRemota(r), rumo);
      e.img = img;
      e.gone = r.dead || !e.img;
    }
    /* assa primeiro o que alguem esta usando */
    let usado = null;
    for (const r of REMOTOS.values()) if (!FORNADAS[r.visual].pronta()){ usado = FORNADAS[r.visual]; break; }
    if (usado) usado.trabalhar(FORNO_MS);
    else for (const n in FORNADAS) if (!FORNADAS[n].pronta()){ FORNADAS[n].trabalhar(FORNO_MS); break; }
  }
  const nomeDe = function(id){ const q = QUEM.get(id); return q ? q.nome : "Jogador " + id; };

  /* o nome em cima de cada um, se nada estiver na frente */
  function desenharNomes(){
    const v = {rx: 0, uy: 0, fz: 0, u: 0, v: 0, sx: 0, sy: 0, iz: 0, uz: 0, vz: 0};
    for (const r of REMOTOS.values()){
      if (r.dead || !r.ent.img) continue;
      const d = Math.hypot(r.x - camX, r.y - camY);
      if (d > 14) continue;
      toCam(r.x, r.y, r.z + r.ent.alto*0.55, 0, 0, v);
      if (v.fz < 0.3) continue;
      project(v);
      const px = Math.round(v.sx), py = Math.round(v.sy);
      if (px < 0 || px >= RW || py < 0 || py >= RH || zbuf[py*RW + px] > v.iz*1.15) continue;   // atras de parede
      toCam(r.x, r.y, r.z + r.ent.alto + 0.12, 0, 0, v); project(v);
      const cor = r.hp > 60 ? "#e6d8b8" : r.hp > 25 ? "#f0c060" : "#ff8a6a";
      txt(nomeDe(r.id).toUpperCase(), v.sx/ESC, v.sy/ESC, 8, cor, "center");
    }
  }

  function render(){
    aplicarMundo();
    desenharRemotos();
    __renderOriginal();
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    if (G.mode === "won" && recomecaEm > 0){
      /* no lugar do "pressione R": no co-op, quem recomeca e o servidor */
      ctx.fillStyle = "rgb(6,10,9)"; ctx.fillRect(0, 151, W, 20);
      txt("A CRIPTA RECOMECA EM " + recomecaEm + " S", W/2, 164, 15, "#ffd88a", "center");
    }
    if (G.mode === "play"){
      desenharNomes();
      const n = 1 + REMOTOS.size;
      const linha = erro ? erro : !conectado ? "CONECTANDO..." :
        "CO-OP - " + n + (n === 1 ? " JOGADOR" : " JOGADORES") + " - PING " + Math.round(ping) + " MS" + (ATRASO ? " (" + ATRASO + " SIMULADOS)" : "");
      txt(linha, 160, 34, 8, erro ? "#ff8a6a" : "#9fd89a", "center");
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  conectar();
  return {update: update, render: render,
          reproduzindo: function(){ return reproduzindo; },
          estado: function(){
            const s = (performance.now() - medida.desde)/1000;
            return {conectado: conectado, eu: eu, nome: nomeDe(eu), jogadores: 1 + REMOTOS.size, ping: ping, pendentes: pendentes.length,
                    noMundo: retratos.length ? retratos[retratos.length - 1].jog.length : -1,
                    retratos: medida.retratos, correcaoMedia: medida.correcoes ? medida.somaCorrecao/medida.correcoes : 0,
                    maiorCorrecao: medida.maiorCorrecao, kbPorSegundo: s > 0 ? medida.bytes/1024/s : 0, erro: erro, atraso: ATRASO,
                    preparo: preparo, compensar: compensar, rodada: rodada, recomecaEm: recomecaEm, modo: G.mode, tickVisto: tickVisto,
                    kills: G.kills, totalKills: G.totalKills, falas: (G.conversa || []).map(function(l){ return l.quem + ": " + l.fala; })};
          },
          remotos: function(){ return [...REMOTOS.values()].map(function(r){
            return {id: r.id, nome: nomeDe(r.id), x: r.x, y: r.y, hp: r.hp, dead: r.dead, visual: r.visual, desenhado: !!r.ent.img && !r.ent.gone};
          }); },
          teleporte: function(x, y, ang){ P.ang = ang; enviar({tipo: "teleporte", x: x, y: y, ang: ang}); },
          zerarMedida: function(){ medida.correcoes = 0; medida.somaCorrecao = 0; medida.maiorCorrecao = 0; }};
})();
/* no cliente o golpe so faz o efeito: animacao, som e tremor; o acerto e do servidor */
function __fireCliente(P){
  if (P.dead || P.cd > 0 || (__COOP && __COOP.reproduzindo())) return;
  const w = WPN[P.wpn];
  if (!P.have[P.wpn]) return;
  if (P.mana < w.cost){ __somAgora("empty"); P.cd = 0.3; return; }
  P.cd = w.cd; P.anim = w.cd; P.evilT = 0.5;
  __somAgora(w.kind === "melee" ? "swing" : (w.p === "fire" ? "fireball" : "bolt"));
  if (w.kind !== "melee") G.shake = Math.max(G.shake, w.p === "fire" ? 2.4 : 0.7);
}
/* __COOP e var, e nao const: o jogo pode chamar estas funcoes antes dele existir */
function update(dt, ent){ return __COOP ? __COOP.update(dt, ent) : __updateOriginal(dt, ent); }
function render(){ return __COOP ? __COOP.render() : __renderOriginal(); }
function som(nome){ if (!(__COOP && __COOP.reproduzindo())) __somAgora(nome); }
if (typeof window !== "undefined") window.__COOP_DBG = {estado: function(){ return __COOP.estado(); }, remotos: function(){ return __COOP.remotos(); },
  teleporte: function(x, y, a){ __COOP.teleporte(x, y, a); }, zerarMedida: function(){ __COOP.zerarMedida(); },
  livre: function(x, y){ return !blocked(x, y, 0.26, floorAt(Math.floor(x), Math.floor(y)), 0.85, false) && cellAt(Math.floor(x), Math.floor(y)) !== "~"; },
  /* uma casa livre ao lado do portal de saida, e o angulo para olhar para ele */
  saida: function(){
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++){
      if (cellAt(x, y) !== "x") continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const cx = x + dx + 0.5, cy = y + dy + 0.5;
        if (window.__COOP_DBG.livre(cx, cy)) return {x: cx, y: cy, ang: Math.atan2(-dy, -dx)};
      }
    }
    return null;
  },
  P: P, G: G, ents: function(){ return ents; }};
