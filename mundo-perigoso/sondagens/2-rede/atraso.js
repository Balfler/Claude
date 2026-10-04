/* ============================================================
   SONDAGEM 2 -- O SIMULADOR DE ATRASO
   ------------------------------------------------------------
   Este codigo entra DENTRO do jogo montado (montar-atraso.js costura) e faz
   a cripta se comportar como se o jogo rodasse num servidor longe, com o
   jeito normal de fazer rede de jogo de acao:

   - O SEU CORPO e previsto: anda, pula e da dash na hora, sem atraso. E o
     que todo jogo de tiro faz, e aqui e so nao mexer.
   - OS BICHOS E OS PROJETEIS aparecem no passado: o que o servidor mandou
     leva a ida para chegar, mais uma folga para interpolar entre dois
     retratos. Voce ve o bicho onde ele estava, nao onde ele esta.
   - O SEU GOLPE so vale quando chega no servidor (a ida depois de apertar).
     A animacao e o som do balanco saem na hora. Com a COMPENSACAO ligada,
     o servidor volta o relogio dos bichos para o que voce estava vendo na
     hora do clique, e acerta o que voce mirou -- e o que Counter-Strike e
     Overwatch fazem. Desligada, o golpe acerta onde o bicho esta quando o
     clique chega.
   - O DANO QUE VOCE TOMA e decidido pelo servidor, que ve voce onde voce
     estava uma ida atras (o seu movimento tambem demora a chegar la). O
     esquivo em cima da hora nao salva. E a noticia do dano volta com mais
     uma ida.

   Teclas: [ e ] mudam o atraso (ida e volta, em ms), \ liga e desliga a
   compensacao, - e = mudam o preparo do golpe dos bichos (hoje 0,19 s: o
   tempo entre o bicho comecar o golpe e o golpe acertar). O canto de baixo
   mostra o que esta valendo. No endereco: ?atraso=150&comp=0&preparo=0.5
   ============================================================ */
var __ATR = (function(){
  const ATRASOS = [0, 50, 100, 150, 200, 300];
  const FOLGA = 0.05;                 // interpolacao: um retrato a 20 por segundo
  const busca = (typeof location !== "undefined" && location.search) || "";
  const pedido = +((busca.match(/atraso=(\d+)/) || [])[1] || 150);
  let rtt = ATRASOS.indexOf(pedido) >= 0 ? pedido : 150;
  let comp = !/comp=0/.test(busca);
  const pp = +((busca.match(/preparo=([\d.]+)/) || [])[1] || 0);
  if (pp > 0) __PREPARO = pp;
  const ida = () => rtt/2000;
  const atrasoVisto = () => rtt ? ida() + FOLGA : 0;

  /* o historico: a cada passo, onde o jogador (previsto) estava e o
     estado de desenho de cada entidade e projetil */
  const HIST_P = [], HIST_M = [];
  let agora = 0, trocado = null;

  function acharNoHist(hist, t){
    for (let i = hist.length - 1; i >= 0; i--) if (hist[i].t <= t + 1e-9) return hist[i];
    return hist[0] || null;
  }

  /* o servidor ve o jogador uma ida atras */
  function trocarP(){
    if (!rtt || trocado || !HIST_P.length) return;
    const h = acharNoHist(HIST_P, agora - ida());
    trocado = {x: P.x, y: P.y, z: P.z};
    P.x = h.x; P.y = h.y; P.z = h.z;
  }
  function destrocarP(){
    if (!trocado) return;
    P.x = trocado.x; P.y = trocado.y; P.z = trocado.z;
    trocado = null;
  }

  const CAMPOS = ["x", "y", "z", "ang", "dead", "dieT", "anim", "painT", "walk", "gone", "hp"];
  function gravar(){
    HIST_P.push({t: agora, x: P.x, y: P.y, z: P.z});
    while (HIST_P.length > 90) HIST_P.shift();
    const m = new Map();
    for (const e of ents){
      if (e.kind === "cena") continue;
      const c = {};
      for (const k of CAMPOS) c[k] = e[k];
      m.set(e, c);
    }
    HIST_M.push({t: agora, ents: m, projs: projs.map(p => Object.assign({}, p))});
    while (HIST_M.length > 90) HIST_M.shift();
  }
  /* poe o mundo como estava em t; devolve quem desfaz */
  function voltarMundo(t){
    const h = acharNoHist(HIST_M, t);
    if (!h) return function(){};
    const salvos = [];
    for (const e of ents){
      if (e.kind === "cena") continue;
      const c = h.ents.get(e), s = {};
      for (const k of CAMPOS) s[k] = e[k];
      salvos.push([e, s]);
      if (c) Object.assign(e, c); else e.gone = true;      // ainda nao existia
    }
    const projsAgora = projs.splice(0, projs.length);
    for (const p of h.projs) projs.push(p);
    return function(){
      for (const [e, s] of salvos) Object.assign(e, s);
      projs.length = 0;
      for (const p of projsAgora) projs.push(p);
    };
  }

  let mudo = false;
  function som(nome){ if (!mudo) __somAgora(nome); }

  function hurt(n, ign){
    if (robo && !ign) robo.golpes++;          // so o golpe do bicho: a lava (a unica que ignora a armadura) nao conta
    if (!rtt) return __hurtPlayerAgora(n, ign);
    agendar(ida(), function(){ __hurtPlayerAgora(n, ign); });   // a noticia volta com uma ida
  }

  /* ---------- o robo de esquiva (so para medir) ----------
     Fica na frente de um bicho de corpo a corpo e, quando VE o golpe
     comecar -- no mundo desenhado, atrasado --, espera o tempo de reacao
     e da dash para tras. Depois volta para perto. Conta os golpes que o
     bicho comecou e os que acertaram. */
  let robo = null;
  function roboEntrada(ent){
    const e = robo.alvo;
    const h = acharNoHist(HIST_M, agora - atrasoVisto());
    const c = h && h.ents.get(e);
    const ex = c ? c.x : e.x, ey = c ? c.y : e.y, anim = c ? c.anim : e.anim;
    const d = Math.hypot(ex - P.x, ey - P.y);
    P.ang = Math.atan2(ey - P.y, ex - P.x);
    if (anim > 0.3 && robo.animVisto <= 0) robo.reagir = agora + robo.reacao;
    robo.animVisto = anim;
    const out = {frente: 0, lado: 0, girar: 0, subir: false, agachar: false, dash: false, atirar: false, acoes: [], ang: P.ang, pitch: 0};
    /* recua e fica longe ate o golpe se resolver: o preparo inteiro, mais a volta da noticia */
    if (robo.reagir >= 0 && agora >= robo.reagir){ out.frente = -1; out.dash = true; robo.reagir = -1; robo.fugindo = __PREPARO + 2*ida() + 0.15; }
    else if (robo.fugindo > 0){ robo.fugindo -= 1/60; out.frente = -1; }
    else if (d > 0.95) out.frente = 1;
    P.hp = 100; P.dead = false;
    return out;
  }
  function contarAtaque(){
    if (!robo) return;
    const a = robo.alvo.anim;
    if (a > 0.4 && robo.animReal <= 0 && !robo.alvo.dead) robo.ataques++;
    robo.animReal = a;
  }

  function fire(){
    if (!rtt) return __fireAgora();
    if (P.dead || P.cd > 0) return;
    const w = WPN[P.wpn];
    if (!P.have[P.wpn] || P.mana < w.cost) return __fireAgora();
    /* previsto: o balanco comeca na hora */
    const reg = {x: P.x, y: P.y, z: P.z, ang: P.ang, pitch: P.pitch, eye: P.eye, t: agora, visto: atrasoVisto()};
    P.cd = w.cd; P.anim = w.cd;
    const somNaHora = w.kind === "melee";
    if (somNaHora) __somAgora("swing");
    const compensar = comp;
    agendar(ida(), function(){
      /* no servidor: o clique chegou */
      const s = {x: P.x, y: P.y, z: P.z, ang: P.ang, pitch: P.pitch, eye: P.eye, cd: P.cd, anim: P.anim};
      Object.assign(P, {x: reg.x, y: reg.y, z: reg.z, ang: reg.ang, pitch: reg.pitch, eye: reg.eye, cd: 0});
      const desfazer = compensar ? voltarMundo(reg.t - reg.visto) : null;
      mudo = somNaHora;
      try { __fireAgora(); } finally {
        mudo = false;
        if (desfazer) desfazer();
        Object.assign(P, s);
      }
    });
  }

  function update(dt, ent){
    agora += dt;
    if (robo) ent = roboEntrada(ent);
    const r = __updateOriginal(dt, ent);
    contarAtaque();
    return r;
  }
  /* roda N segundos de jogo com o robo contra o bicho de corpo a corpo mais
     perto, sem esperar o relogio de verdade */
  function medirEsquiva(segundos, reacao, tipo, preparo){
    __PREPARO = preparo || 0.19;
    /* o bicho e a direcao com mais chao livre atras do jogador: o dash
       precisa de uns tres tiles para sair do alcance */
    let alvo = null, rumo = 0, livreMax = -1;
    for (const e of ents) if (e.kind === "enemy" && !e.dead && e.d.name === (tipo || "diabrete")){
      for (let k = 0; k < 16; k++){
        const a = k*Math.PI/8, cx = Math.cos(a), cy = Math.sin(a);
        let livre = 0;
        while (livre < 6){
          const x = e.x + cx*(livre + 0.25), y = e.y + cy*(livre + 0.25);
          if (blocked(x, y, 0.26, e.z, 0.85, false) || cellAt(Math.floor(x), Math.floor(y)) === "~") break;   // nem parede, nem lava
          livre += 0.25;
        }
        if (livre > livreMax){ livreMax = livre; alvo = e; rumo = a; }
      }
    }
    /* um duelo: os outros bichos saem do mapa enquanto mede */
    const fora = [];
    for (const e of ents) if (e.kind === "enemy" && e !== alvo && !e.gone){ e.gone = true; fora.push(e); }
    projs.length = 0;
    P.x = alvo.x + Math.cos(rumo)*1.0; P.y = alvo.y + Math.sin(rumo)*1.0; P.z = alvo.z; P.vx = P.vy = P.vz = 0;
    alvo.st = "chase"; alvo.hp = 1e6;
    HIST_P.length = 0; HIST_M.length = 0;
    robo = {alvo: alvo, reacao: reacao, animVisto: 0, animReal: 0, reagir: -1, fugindo: 0, golpes: 0, ataques: 0};
    G.mode = "play";
    for (let i = 0; i < segundos*60; i++){ update(1/60, lerEntrada()); P.dashN = 2; }
    const r = {bicho: alvo.d.name, ataques: robo.ataques, golpes: robo.golpes, livre: livreMax};
    robo = null;
    for (const e of fora) e.gone = false;
    __PREPARO = 0.19;
    return r;
  }

  function render(){
    const desfazer = rtt ? voltarMundo(agora - atrasoVisto()) : null;
    let b = null, dm = 1e9;
    for (const e of ents) if (e.kind === "enemy" && !e.gone && !e.dead){ const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < dm){ dm = d; b = e; } }
    if (b) api.visto = {e: b, x: b.x, y: b.y, t: agora};
    try { __renderOriginal(); } finally { if (desfazer) desfazer(); }
    if (G.mode === "play"){
      ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
      const linha = rtt ? "ATRASO " + rtt + " MS - BICHOS " + Math.round(atrasoVisto()*1000) + " MS ATRAS - COMPENSACAO " + (comp ? "SIM" : "NAO")
                        : "SEM ATRASO";
      txt(linha, 160, 124, 8, rtt ? "#ffd88a" : "#9fd89a", "center");
      txt("PREPARO DO GOLPE DOS BICHOS " + __PREPARO.toFixed(2) + " S", 160, 132, 8, "#b0a080", "center");
      txt("[ ] ATRASO   \\ COMPENSACAO   - = PREPARO", 160, 140, 8, "#b0a080", "center");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  addEventListener("keydown", function(e){
    const k = (e.key || "").toLowerCase();
    if (k === "[" || k === "]"){
      const i = ATRASOS.indexOf(rtt) + (k === "]" ? 1 : -1);
      rtt = ATRASOS[Math.max(0, Math.min(ATRASOS.length - 1, i))];
      say(rtt ? "ATRASO " + rtt + " MS" : "SEM ATRASO");
    } else if (k === "\\"){
      comp = !comp; say("COMPENSACAO " + (comp ? "LIGADA" : "DESLIGADA"));
    } else if (k === "-" || k === "="){
      __PREPARO = Math.max(0.1, Math.min(1.2, Math.round((__PREPARO + (k === "=" ? 0.05 : -0.05))*100)/100));
      say("PREPARO DO GOLPE " + __PREPARO.toFixed(2) + " S");
    }
  });

  const api = {trocarP, destrocarP, gravar, hurt, fire, som, update, render, visto: null, medirEsquiva,
          estado: function(){ return {rtt: rtt, comp: comp, agora: agora, hist: HIST_M.length}; },
          mudar: function(r, c){ rtt = r; if (c !== undefined) comp = c; }};
  return api;
})();
/* para a medicao (medir-esquiva.js) alcancar o simulador de fora */
if (typeof window !== "undefined") window.__ATR_DBG = {estado: function(){ return __ATR.estado(); }, mudar: function(r, c){ __ATR.mudar(r, c); },
  P: P, G: G, ents: function(){ return ents; }, visto: function(){ return __ATR.visto; },
  medirEsquiva: function(s, r, b, p){ return __ATR.medirEsquiva(s, r, b, p); }};
/* __ATR e var, e nao const: o jogo pode chamar estas funcoes antes dele existir */
function update(dt, ent){ return __ATR ? __ATR.update(dt, ent) : __updateOriginal(dt, ent); }
function render(){ return __ATR ? __ATR.render() : __renderOriginal(); }
function hurtPlayer(n, ign){ return __ATR ? __ATR.hurt(n, ign) : __hurtPlayerAgora(n, ign); }
function fire(){ return __ATR ? __ATR.fire() : __fireAgora(); }
function som(nome){ return __ATR ? __ATR.som(nome) : __somAgora(nome); }
