
/* ============================================================
   AUDIO  --  tudo sintetizado, sem arquivos externos
   ============================================================ */
const AU = {on:true, ctx:null, master:null, music:null};
function actx(){
  if (!AU.ctx){
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AU.ctx = new C();
    AU.master = AU.ctx.createGain();
    AU.master.gain.value = 0.42;
    AU.master.connect(AU.ctx.destination);
  }
  if (AU.ctx.state === "suspended") AU.ctx.resume();
  return AU.ctx;
}
function tone(o){
  if (!AU.on) return; const a = actx(); if (!a) return;
  const t = a.currentTime + (o.at || 0), osc = a.createOscillator(), g = a.createGain();   // at: atraso no relogio do audio
  osc.type = o.type || "square";
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2), t + o.d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.g || 0.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
  osc.connect(g); g.connect(AU.master); osc.start(t); osc.stop(t + o.d + 0.02);
}
let noiseBuf = null;
function noise(dur, freq, q, gain, sweep){
  if (!AU.on) return; const a = actx(); if (!a) return;
  if (!noiseBuf){
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  const t = a.currentTime, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; src.loop = true;
  f.type = "bandpass"; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40,sweep), t + dur);
  g.gain.setValueAtTime(gain || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(AU.master); src.start(t); src.stop(t + dur + 0.02);
}
const SFX = {
  swing:   ()=>{ noise(0.16, 1600, 1.2, 0.16, 380); },
  hitFlesh:()=>{ noise(0.10, 420, 2.0, 0.26, 140); tone({f:150,f2:60,d:0.10,g:0.16,type:"sawtooth"}); },
  bolt:    ()=>{ tone({f:880,f2:220,d:0.16,g:0.15,type:"square"}); noise(0.10, 2400, 3, 0.08, 900); },
  fireball:()=>{ tone({f:180,f2:52,d:0.36,g:0.22,type:"sawtooth"}); noise(0.34, 700, 0.9, 0.20, 180); },
  boom:    ()=>{ noise(0.5, 320, 0.7, 0.34, 60); tone({f:110,f2:36,d:0.45,g:0.22,type:"triangle"}); },
  arrow:   ()=>{ noise(0.20, 2000, 2.5, 0.10, 700); },
  pain:    ()=>{ tone({f:300,f2:120,d:0.26,g:0.22,type:"sawtooth"}); noise(0.16, 900, 1, 0.12, 260); },
  die:     ()=>{ tone({f:220,f2:48,d:0.7,g:0.22,type:"sawtooth"}); noise(0.6, 500, 0.8, 0.16, 90); },
  impCry:  ()=>{ tone({f:520,f2:900,d:0.14,g:0.16,type:"square"}); tone({f:700,f2:300,d:0.2,g:0.12,type:"sawtooth"}); },
  goblinCry:()=>{ tone({f:380,f2:620,d:0.18,g:0.15,type:"square"}); },
  wraithCry:()=>{ tone({f:150,f2:300,d:0.5,g:0.15,type:"sine"}); noise(0.5, 1400, 6, 0.07, 400); },
  bossRoar:()=>{ tone({f:90,f2:44,d:1.3,g:0.30,type:"sawtooth"}); tone({f:135,f2:66,d:1.1,g:0.18,type:"square"});
                 noise(1.1, 240, 0.7, 0.20, 70); },
  door:    ()=>{ noise(0.7, 240, 1.6, 0.16, 90); tone({f:70,f2:52,d:0.7,g:0.10,type:"triangle"}); },
  locked:  ()=>{ tone({f:180,f2:150,d:0.14,g:0.20,type:"square"}); tone({f:120,d:0.2,g:0.14,type:"square"}); },
  pickup:  ()=>{ tone({f:660,d:0.07,g:0.16}); tone({f:990,d:0.10,g:0.14,at:0.06}); },
  key:     ()=>{ [440,660,880,1320].forEach((f,i)=>tone({f:f,d:0.14,g:0.15,type:"triangle",at:i*0.07})); },
  secret:  ()=>{ [523,659,784,1046,1319].forEach((f,i)=>tone({f:f,d:0.20,g:0.14,type:"triangle",at:i*0.09})); },
  empty:   ()=>{ tone({f:150,d:0.06,g:0.10,type:"square"}); },
  exit:    ()=>{ [262,330,392,523,659,784].forEach((f,i)=>tone({f:f,d:0.3,g:0.16,type:"triangle",at:i*0.12})); },
  lava:    ()=>{ noise(0.28, 300, 0.8, 0.14, 120); },
  impacto: ()=>{ noise(0.10, 900, 2, 0.10, 300); },
  spiderCry:()=>{ noise(0.13, 3200, 5, 0.09, 1400); tone({f:1200,f2:700,d:0.09,g:0.07,type:"square"}); },
  batCry:  ()=>{ tone({f:1800,f2:2600,d:0.09,g:0.09,type:"square"});
                 tone({f:2200,f2:1500,d:0.07,g:0.07,type:"square",at:0.07}); },
  jump:    ()=>{ noise(0.09, 700, 1.5, 0.07, 280); },
  land:    ()=>{ noise(0.12, 260, 1.2, 0.13, 90); },
  dash:    ()=>{ noise(0.22, 1100, 1.0, 0.14, 2600); tone({f:300,f2:900,d:0.16,g:0.08,type:"triangle"}); }
};
/* atmosfera: drone grave + arpejo esparso em modo eolio */
function startMusic(){
  const a = actx(); if (!a || AU.music) return;
  const g = a.createGain(); g.gain.value = 0.10; g.connect(AU.master);
  const d1 = a.createOscillator(), d2 = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain();
  d1.type="sine"; d1.frequency.value=55; d2.type="sine"; d2.frequency.value=82.4;
  lfo.type="sine"; lfo.frequency.value=0.09; lg.gain.value=2.6;
  lfo.connect(lg); lg.connect(d2.frequency);
  d1.connect(g); d2.connect(g); d1.start(); d2.start(); lfo.start();
  const notes = [220,261.6,196,261.6,293.7,261.6,220,174.6];
  let step = 0;
  const timer = setInterval(()=>{
    if (!AU.on || G.mode !== "play") { step = 0; return; }
    const n = notes[step % notes.length]; step++;
    tone({f:n, d:0.55, g:0.045, type:"triangle"});
    if (step % 4 === 0) tone({f:n/2, d:0.9, g:0.035, type:"sine"});
  }, 640);
  AU.music = {gain:g, timer:timer};
}

/* ============================================================
   ESTADO
   ============================================================ */
const G = {
  mode:"title", time:0, kills:0, totalKills:0, items:0, totalItems:0,
  secrets:0, totalSecrets:1, msg:"", msgT:0, flash:0, flashCol:"#c81e0a",
  mapOn:false, shake:0, tick:0, endTime:0, vitrine:false,
  terceira:false                            // camera atras do jogador, tecla X
};
const PITCH_MAX = 85 * Math.PI/180;      // mira livre de verdade
const GRAV = 17, JUMPV = 5.3;
const P = {
  x:7.5, y:29.5, z:0, vx:0, vy:0, vz:0, ang:-Math.PI/2, pitch:0,
  eye:0.60, h:0.85, crouch:false, ground:true, coyote:0, jumpBuf:0,
  dashT:0, dashCd:0, dashN:2, dashVx:0, dashVy:0, fervor:0, fervorT:0,
  god:false, noclip:false,                 // ferramentas de teste, ver teclas G e N
  hp:100, armor:0, mana:35, maxMana:150,
  wpn:1, have:[true,true,false], cd:0, anim:0, frame:0,
  bob:0, bobT:0, passada:0, key:false, painT:0, evilT:0, lavaT:0, dead:false, deadT:0
};
/* ---------- varios jogadores ----------
   A tela tem um jogador, P; o mundo pode ter varios, em JOGADORES -- no
   jogo sozinho, so ele. As funcoes do que um jogador faz (o passo dele,
   golpe, dano, acao, porta, item) recebem quem age num parametro chamado P,
   que esconde o global dentro delas: o corpo e o mesmo de um jogador so, e
   sem o parametro e o desta tela. O servidor do co-op roda estas funcoes
   para cada um (sondagens/2-rede e 5-coop). */
const JOGADOR_DA_TELA = P;
let JOGADORES = [P];
let ents = [], projs = [], parts = [];
const doors = new Map();
let visited = new Uint8Array(MW*MH);

const EDEF = {
  imp:   {vox:"impVox",
          hp:30,  spd:1.85, r:.30, hgt:.86, wid:.645, sight:13, melee:1.15, dmg:[6,13],
          cd:.80, pain:.40, cry:"impCry", name:"diabrete"},
  goblin:{vox:"goblinVox",
          hp:45,  spd:1.25, r:.30, hgt:.90, wid:.675, sight:15, melee:0,    dmg:[0,0],
          cd:1.55, pain:.42, rng:12, proj:"arrow", pdmg:10, pspd:8.5, pgrav:6.5,
          cry:"goblinCry", name:"goblin"},
  spider:{vox:"spiderVox",
          hp:22,  spd:2.60, r:.26, hgt:.34, wid:.70, sight:14, melee:.85, dmg:[4,9],
          cd:.65, pain:.50, strafe:.70, cry:"spiderCry", name:"aranha"},
  bat:   {vox:"batVox",
          hp:26,  spd:2.30, r:.24, hgt:.44, wid:.62, sight:15, melee:.90, dmg:[5,10],
          cd:.90, pain:.55, strafe:.90, fly:1, flyZ:1.30, bobAmp:.34, bobSpd:3.4,
          cry:"batCry", name:"morcego"},
  wraith:{vox:"wraithVox",
          hp:100, spd:1.05, r:.34, hgt:1.00, wid:.75, sight:14, melee:1.35, dmg:[12,22],
          cd:1.20, pain:.30, flo:.12, cry:"wraithCry", name:"cavaleiro espectral"},
  boss:  {vox:"bossVox",
          hp:560, spd:1.20, r:.46, hgt:1.55, wid:1.05, sight:22, melee:1.75, dmg:[15,26],
          cd:1.00, pain:.14, rng:17, proj:"dark", pdmg:17, pspd:6.6, cry:"bossRoar", name:"VHALGORN"}
};
const WPN = [
  {n:"ADAGA RUNICA",       s:"dagger", cost:0, cd:.42, kind:"melee", dmg:[18,34], reach:1.7},
  {n:"CAJADO ARCANO",      s:"staff",  cost:1, cd:.28, kind:"proj",  p:"bolt", dmg:24, spd:13},
  {n:"GRIMORIO DE CHAMAS", s:"tome",   cost:6, cd:.90, kind:"proj",  p:"fire", dmg:58, splash:42, sr:2.1, spd:9}
];

function say(t){ G.msg = t; G.msgT = 3.2; }

/* ---------- sons como eventos ----------
   A simulacao nao toca som: ela anota o que soou, e quem toca e o laco
   principal, depois do passo. Num servidor esta lista vira mensagem para os
   clientes, e o servidor nao precisa ter caixa de som. */
const SONS = [];
function som(nome){ SONS.push(nome); }
function tocarSons(){ for (const s of SONS) if (SFX[s]) SFX[s](); SONS.length = 0; }

/* ---------- agenda ----------
   O que acontece daqui a pouco -- o golpe que acerta um instante depois do
   balanco -- entra aqui, contado no relogio do mundo (G.time, que so o passo
   do mundo anda). Com setTimeout contava no relogio da maquina: parar o jogo
   nao parava o golpe, e duas maquinas nunca concordariam sobre quando ele
   acertou. */
const AGENDA = [];
function agendar(atraso, fn){ AGENDA.push({t: G.time + atraso, fn: fn}); }
function rodarAgenda(){
  const vencidos = AGENDA.filter(function(a){ return a.t <= G.time; }).sort(function(a, b){ return a.t - b.t; });
  for (const a of vencidos){ AGENDA.splice(AGENDA.indexOf(a), 1); a.fn(); }
}

/* ---------- construcao do nivel ---------- */
function buildLevel(){
  ents = []; projs = []; parts = []; doors.clear();
  if (visited.length !== MW*MH) visited = new Uint8Array(MW*MH); else visited.fill(0);
  G.kills = G.totalKills = G.items = G.totalItems = G.secrets = 0;
  G.time = 0; G.msg = ""; G.msgT = 0; G.flash = 0;
  P.hp = 100; P.armor = 0; P.mana = 35; P.wpn = 1; P.have = [true,true,false];
  P.cd = 0; P.anim = 0; P.frame = 0; P.key = false; P.dead = false; P.deadT = 0;
  P.pitch = 0; P.painT = 0; P.evilT = 0; P.lavaT = 0;
  P.vx = 0; P.vy = 0; P.vz = 0; P.eye = AJUSTE.olho; P.h = 0.85; P.ground = true;
  P.coyote = 0; P.jumpBuf = 0; P.dashT = 0; P.dashCd = 0; P.dashN = 2;
  P.fervor = 0; P.fervorT = 0;
  /* ouro e bolsa: o que se compra conversando com os moradores */
  P.ouro = 25; P.bolsa = {pocao:0, cristal:0};
  G.conversa = []; G.falaAberta = false; G.falaTexto = ""; G.interlocutor = null; G.bolsaAberta = false;
  AGENDA.length = 0; SONS.length = 0;

  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    const c = MAP[y][x], cx = x+0.5, cy = y+0.5;
    if (c==="D"||c==="L"||c==="S")
      doors.set(y*MW+x, {open:0, run:0, locked:c==="L", secret:c==="S", x:x, y:y});
    else if (c==="p"){ P.x = cx; P.y = cy; P.z = alturaDoChao(cx, cy); }
    else if (c==="i"||c==="g"||c==="w"||c==="Z"||c==="s"||c==="b"){
      const k = c==="i"?"imp":c==="g"?"goblin":c==="w"?"wraith":
                c==="s"?"spider":c==="b"?"bat":"boss";
      const d = EDEF[k];
      ents.push({kind:"enemy", type:k, d:d, x:cx, y:cy, ang:Math.PI/2,
                 z: d.fly ? alturaDoChao(cx, cy) + d.flyZ : alturaDoChao(cx, cy),
                 hp:d.hp, mhp:d.hp, st:"idle",
                 t:0, anim:0, atk:0, painT:0, dieT:0, dead:false, boss:k==="boss"});
      G.totalKills++;
    }
    else {
      const fz = alturaDoChao(cx, cy);
      if (c==="k") ents.push({kind:"item", type:"key",    x:cx, y:cy, z:fz+.14, sz:.55});
      else if (c==="h") ents.push({kind:"item", type:"potion", x:cx, y:cy, z:fz, sz:.45, G:1});
      else if (c==="m") ents.push({kind:"item", type:"mana",   x:cx, y:cy, z:fz, sz:.45, G:1});
      else if (c==="a") ents.push({kind:"item", type:"shield", x:cx, y:cy, z:fz, sz:.50, G:1});
      else if (c==="A") ents.push({kind:"item", type:"soul",   x:cx, y:cy, z:fz+.30, sz:.55, G:1});
      else if (c==="t") ents.push({kind:"decor",type:"torch",  x:cx, y:cy, z:fz+.35, sz:.85});
    }
  }
  G.totalItems = ents.filter(e=>e.G).length;
  /* as portas voltaram a fechar: a geometria do mundo sai de novo, inteira */
  montarPedacos();
  montarPecas();
  G.falando = null;
  if (ILHA_MOTOR){
    montarCenario();
    P.ang = ILHA_MOTOR.rumo;
    say("MAPA DO EDITOR: " + String(ILHA.nome).toUpperCase());
  }
}


/* ============================================================
   COLISAO COM ALTURA
   Um tile deixa de ser "parede ou nao" e passa a ser um par
   piso/teto. Bloqueia se o vao for baixo demais para caber, se o
   degrau for alto demais para subir sem pular, ou se o teto vier
   abaixo da cabeca -- que e o que faz porta fechada barrar.
   ============================================================ */
const STEP = 0.42;                          // degrau que se sobe andando

/* Os solidos das pecas entram nas mesmas tres perguntas do terreno. E a
   altura de quem pergunta que separa os andares: a ponte e chao para quem
   anda em cima e teto para quem passa embaixo. */
function tileBlocks(tx,ty, z, height, avoidLava, px, py){
  if (tx<0||ty<0||tx>=MW||ty>=MH) return true;
  /* no chao inclinado, o degrau e a altura do ponto do tile mais perto de quem pergunta */
  const f = CHAO_Z && px !== undefined ? alturaDoChao(clamp(px,tx,tx+0.999), clamp(py,ty,ty+0.999)) : floorAt(tx,ty), c = ceilAt(tx,ty);
  if (c - f < 0.32) return true;            // macico ou porta fechada
  if (f > z + STEP) return true;            // degrau alto demais
  if (c < z + height) return true;          // nao cabe em pe
  /* Lava e agua funda barram quem esta na altura delas. Quem passa por cima,
     numa ponte, nao esta dentro: sem isso nenhuma ponte cruzava o rio. */
  if (z < f + 0.2){
    if (avoidLava && MAP[ty][tx] === "~") return true;
    if (MAP[ty][tx] === "W") return true;   // agua funda da ilha: nao se anda
  }
  return false;
}
function blocked(x,y,r, z,height, avoidLava){
  const x0=Math.floor(x-r), x1=Math.floor(x+r), y0=Math.floor(y-r), y1=Math.floor(y+r);
  for (let ty=y0;ty<=y1;ty++) for (let tx=x0;tx<=x1;tx++){
    if (!tileBlocks(tx,ty,z,height,avoidLava,x,y)) continue;
    const px = clamp(x,tx,tx+1), py = clamp(y,ty,ty+1);
    const dx = x-px, dy = y-py;
    if (dx*dx+dy*dy < r*r) return true;
  }
  if (solidosBatem(SOLIDOS, x, y, r, z, height, STEP)) return true;
  return ILHA_MOTOR ? bateNoCenario(x, y, r) : false;
}

/* ---------- o cenario da ilha ----------
   Arvore, pedra, movel e morador viram entidades paradas, no maximo uma por
   tile. A colisao delas e um cilindro sem topo: nao se pula por cima de
   nada. Se desse, quem pousasse em cima de um barril ficaria dentro do
   circulo dele, e dali todo passo seria barrado -- preso para sempre. */
/* ---------- as pecas do mundo ----------
   Cada peca do mapa vira faces -- que vao para o pedaco onde cai o meio de
   cada uma -- e solidos, para a fisica.

   A geometria fica guardada por id de peca, com a chave de tudo que muda a
   forma e a cara dela. Montar de novo so refaz a peca cuja chave mudou, e so
   suja os pedacos onde ela estava e onde ficou: por uma parede na vila nao
   remonta a fortaleza. O indice de solidos sai de novo inteiro, que e barato
   (os solidos ja estao prontos, e so voltam para a grade). */
let SOLIDOS = novoIndiceDeSolidos();
let PECAS_FEITAS = new Map();                  // id -> {chave, solidos, porPedaco: Map pedaco -> faces}
let PECAS_NOS_PEDACOS = new Map();             // pedaco -> Set de ids
let PECAS_DOS_PEDACOS = null;                  // os PEDACOS para quem o que esta guardado vale
function chaveDaPeca(p, estilo, nevoa){
  return p.tipo + "|" + estilo + "|" + p.x + "|" + p.y + "|" + p.z + "|" + (p.giro || 0) + "|" +
         (p.espelho ? 1 : 0) + "|" + nevoa + (p.campos ? "|" + JSON.stringify(p.campos) : "");
}
/* As faces do motor para a geometria de uma peca, ja com a textura do
   estilo. O mundo e a miniatura do catalogo usam as mesmas. */
function facesDoMotor(g, estilo, nevoa){
  const out = [];
  for (const f of g.faces){
    const face = novaFace(f.pts.length);
    for (let k = 0; k < f.pts.length; k++){
      face.p[3*k] = f.pts[k][0]; face.p[3*k+1] = f.pts[k][1]; face.p[3*k+2] = f.pts[k][2];
      face.uv[2*k] = f.uv[k][0]; face.uv[2*k+1] = f.uv[k][1];
    }
    face.tex = texturaDoEstilo(estilo, f.mat, nevoa);
    if (MATERIAIS_UNIVERSAIS[f.mat] && MATERIAIS_UNIVERSAIS[f.mat].acesa) face.emis = 2;   // a chama nao escurece
    out.push(fecharFace(face));
  }
  return out;
}
function fazerPeca(p, estilo, nevoa, chave){
  const feita = {chave:chave, solidos:[], porPedaco:new Map()};
  const g = geometriaDaPeca(p, estilo);
  if (!g) return feita;
  feita.solidos = g.solidos;
  for (const face of facesDoMotor(g, estilo, nevoa)){
    const P = pedacoDoTile(face.cx | 0, face.cy | 0);
    if (!P) continue;
    let l = feita.porPedaco.get(P.k);
    if (!l){ l = []; feita.porPedaco.set(P.k, l); }
    l.push(face);
  }
  return feita;
}
function montarPecas(){
  /* mundo novo, pedacos novos: nada do que estava guardado vale */
  if (PECAS_DOS_PEDACOS !== PEDACOS){
    PECAS_FEITAS = new Map(); PECAS_NOS_PEDACOS = new Map(); PECAS_DOS_PEDACOS = PEDACOS;
  }
  /* a textura desbota na cor para onde o mundo desbota: a bruma na ilha, o
     preto na cripta */
  const nevoa = ILHA ? HORIZONTE : 0;
  const estilos = estilosDasConstrucoes(ILHA);
  const lista = (ILHA && ILHA.pecas) || [];
  garantirIdsDePeca(lista);
  const sujar = function(k){ if (PEDACOS[k]){ PEDACOS[k].sujo = true; PEDACOS_SUJOS = true; } };
  const tirar = function(id, feita){
    feita.porPedaco.forEach(function(l, k){
      sujar(k);
      const ids = PECAS_NOS_PEDACOS.get(k);
      if (ids){ ids.delete(id); if (!ids.size) PECAS_NOS_PEDACOS.delete(k); }
    });
  };
  SOLIDOS = novoIndiceDeSolidos();
  const vistas = new Set();
  for (const p of lista){
    const estilo = estiloDaPeca(p, estilos), chave = chaveDaPeca(p, estilo, nevoa);
    let feita = PECAS_FEITAS.get(p.id);
    if (!feita || feita.chave !== chave){
      if (feita) tirar(p.id, feita);
      feita = fazerPeca(p, estilo, nevoa, chave);
      PECAS_FEITAS.set(p.id, feita);
      feita.porPedaco.forEach(function(l, k){
        sujar(k);
        let ids = PECAS_NOS_PEDACOS.get(k);
        if (!ids){ ids = new Set(); PECAS_NOS_PEDACOS.set(k, ids); }
        ids.add(p.id);
      });
    }
    vistas.add(p.id);
    for (const s2 of feita.solidos) porNoIndice(SOLIDOS, s2, p.id);
  }
  PECAS_FEITAS.forEach(function(feita, id){
    if (!vistas.has(id)){ tirar(id, feita); PECAS_FEITAS.delete(id); }
  });
}
/* chamada por montarPedaco, em p2b.js */
function facesDasPecasNoPedaco(P, out){
  const ids = PECAS_NOS_PEDACOS.get(P.k);
  if (!ids) return;
  for (const id of ids){
    const l = PECAS_FEITAS.get(id).porPedaco.get(P.k);
    for (const f of l) out.push(f);
  }
}
/* a peca dona do solido, pelo id -- a mira do canteiro pergunta */
function pecaPeloId(id){
  const lista = (ILHA && ILHA.pecas) || [];
  for (const p of lista) if (p.id === id) return p;
  return null;
}

let SOL_R = new Float32Array(MW*MH), SOL_X = new Float32Array(MW*MH), SOL_Y = new Float32Array(MW*MH);
function bateNoCenario(x, y, r){
  const x0 = Math.floor(x-r-0.8), x1 = Math.floor(x+r+0.8);
  const y0 = Math.floor(y-r-0.8), y1 = Math.floor(y+r+0.8);
  for (let ty=y0; ty<=y1; ty++) for (let tx=x0; tx<=x1; tx++){
    if (tx<0||ty<0||tx>=MW||ty>=MH) continue;
    const i = ty*MW+tx, R = SOL_R[i];
    if (!R) continue;
    const dx = x - SOL_X[i], dy = y - SOL_Y[i];
    if (dx*dx + dy*dy < (r+R)*(r+R)) return true;
  }
  return false;
}
/* O cenario de novo: as coisas do mapa mudaram, ou o chao embaixo delas. */
function refazerCenario(){
  if (!ILHA_MOTOR) return;
  ents = ents.filter(function(e){ return e.kind !== "cena"; });
  montarCenario();
}
function montarCenario(){
  if (SOL_R.length !== MW*MH){ SOL_R = new Float32Array(MW*MH); SOL_X = new Float32Array(MW*MH); SOL_Y = new Float32Array(MW*MH); }
  SOL_R.fill(0);
  for (const c of ILHA.coisas){
    const def = CENARIO[c.tipo];
    if (!def || c.x<0 || c.y<0 || c.x>=MW || c.y>=MH) continue;
    const i = c.y*MW + c.x, h = hashTile(c.x, c.y);
    const x = c.x + 0.5 + (def.solto ? ((h & 255)/255 - 0.5)*0.44 : 0);
    const y = c.y + 0.5 + (def.solto ? ((h >>> 8 & 255)/255 - 0.5)*0.44 : 0);
    const v = def.porNome ? hashTexto(c.texto) : (h >>> 16);
    /* A entrada leva ao mapa escrito nela, e a saida de volta; as duas
       levam o id do par, e quem chega nasce ao lado da ponta de la. Saida
       sem mapa volta para de onde se desceu. */
    let destino = def.entrada || def.saida ? destinoDaCoisa(c) : "";
    if (def.saida && !destino && VOLTA) destino = VOLTA.mapa;
    const par = c.campos && c.campos.id ? c.campos.id : "";
    ents.push({kind:"cena", type:c.tipo, x:x, y:y, z:alturaDoChao(x, y), img:def.imgs[v % def.imgs.length],
               larg:def.larg, alto:def.alto, destino:destino, par:par, saida:!!def.saida,
               fala: destino ? (def.saida ? "Sa\u00edda: " + destino + " - E para subir" : "Entrada: " + destino + " - E para descer")
                             : def.fala ? c.texto : ""});
    if (def.raio){ SOL_R[i] = def.raio; SOL_X[i] = x; SOL_Y[i] = y; }
  }
  criarAndarilho();
}
function slide(o, dx, dy, r, z, height, avoidLava){
  if (!blocked(o.x+dx, o.y, r, z, height, avoidLava)) o.x += dx;
  if (!blocked(o.x, o.y+dy, r, z, height, avoidLava)) o.y += dy;
}
/* piso mais alto sob o circulo -- e nele que a criatura pousa. `z` e a
   altura de quem pergunta: o que esta mais de um degrau acima do pe nao e
   chao, e um andar de cima. */
function groundUnder(x,y,r,z){
  let best = -9;
  const zq = z === undefined ? 1e9 : z;
  const x0=Math.floor(x-r), x1=Math.floor(x+r), y0=Math.floor(y-r), y1=Math.floor(y+r);
  for (let ty=y0;ty<=y1;ty++) for (let tx=x0;tx<=x1;tx++){
    if (tx<0||ty<0||tx>=MW||ty>=MH) continue;
    if (ceilAt(tx,ty) - floorAt(tx,ty) < 0.32) continue;
    const px = clamp(x,tx,tx+1), py = clamp(y,ty,ty+1);
    const dx = x-px, dy = y-py;
    if (dx*dx+dy*dy < r*r){ const f = CHAO_Z ? alturaDoChao(clamp(px,tx,tx+0.999), clamp(py,ty,ty+0.999)) : floorAt(tx,ty); if (f > best && f <= zq + STEP) best = f; }
  }
  const sp = chaoDosSolidos(SOLIDOS, x, y, r, zq, STEP);
  if (sp > best) best = sp;
  return best > -8 ? best : 0;
}
/* Todos os pisos sob o circulo: o de cada tile que ele toca e o topo de cada
   solido. E o que a grade de andar pergunta para achar os andares de um
   ponto -- a ponte e a estrada embaixo dela. */
function pisosSob(x, y, r){
  const out = [];
  const x0=Math.floor(x-r), x1=Math.floor(x+r), y0=Math.floor(y-r), y1=Math.floor(y+r);
  for (let ty=y0;ty<=y1;ty++) for (let tx=x0;tx<=x1;tx++){
    if (tx<0||ty<0||tx>=MW||ty>=MH) continue;
    if (ceilAt(tx,ty) - floorAt(tx,ty) < 0.32) continue;
    const px = clamp(x,tx,tx+1), py = clamp(y,ty,ty+1);
    const dx = x-px, dy = y-py;
    if (dx*dx+dy*dy < r*r) out.push(CHAO_Z ? alturaDoChao(clamp(px,tx,tx+0.999), clamp(py,ty,ty+0.999)) : floorAt(tx,ty));
  }
  cadaSolido(SOLIDOS, x, y, r, function(s){ out.push(topoPerto(s, x, y)); });
  return out;
}
function ceilingOver(x,y,r,z){
  let best = 99;
  const x0=Math.floor(x-r), x1=Math.floor(x+r), y0=Math.floor(y-r), y1=Math.floor(y+r);
  for (let ty=y0;ty<=y1;ty++) for (let tx=x0;tx<=x1;tx++){
    if (tx<0||ty<0||tx>=MW||ty>=MH) continue;
    const px = clamp(x,tx,tx+1), py = clamp(y,ty,ty+1);
    const dx = x-px, dy = y-py;
    if (dx*dx+dy*dy < r*r){ const c = ceilAt(tx,ty); if (c < best) best = c; }
  }
  if (z !== undefined){
    const s = tetoDosSolidos(SOLIDOS, x, y, r, z);
    if (s < best) best = s;
  }
  return best;
}
/* linha de visao em 3D: alem das paredes, checa se o vao vertical
   naquele ponto ainda deixa o tiro passar */
function los3(ax,ay,az, bx,by,bz){
  const dx=bx-ax, dy=by-ay, dz=bz-az;
  const dist = Math.hypot(dx,dy);
  /* Com peca no mundo o passo tem que ser menor que a parede fina (0,125),
     senao a linha pula por dentro dela e o bicho enxerga atraves da casa. */
  const steps = Math.ceil(dist*(SOLIDOS.lista.length ? 12 : 5)) + 1;
  for (let i=1;i<steps;i++){
    const t=i/steps, x=ax+dx*t, y=ay+dy*t, z=az+dz*t;
    const tx=Math.floor(x), ty=Math.floor(y);
    if (tx<0||ty<0||tx>=MW||ty>=MH) return false;
    if (z < alturaDoChao(x,y) || z > ceilAt(tx,ty)) return false;
    if (pontoNoSolido(SOLIDOS, x, y, z)) return false;
  }
  return true;
}
const los = (ax,ay,bx,by)=> los3(ax,ay,groundUnder(ax,ay,0.1,P.z)+0.55,
                                 bx,by,groundUnder(bx,by,0.1,P.z)+0.55);

/* ---------- particulas ---------- */
function spark(x,y,z,n,col,spd){
  for (let i=0;i<n;i++){
    const a = Math.random()*TAU;
    parts.push({x:x, y:y, z:z, vx:Math.cos(a)*rnd(.4,spd), vy:Math.sin(a)*rnd(.4,spd),
                vz:rnd(.4,2.4), life:rnd(.28,.72), max:.72, col:col});
  }
}

/* ---------- dano ---------- */
function hurtPlayer(n, ignoreArmor, P = JOGADOR_DA_TELA){
  if (P.dead || P.god) return;
  const daTela = P === JOGADOR_DA_TELA;        // a tela treme, e o jogo acaba, so para quem apanhou
  if (!ignoreArmor && P.armor > 0){ const a = Math.min(P.armor, n*0.4); P.armor -= a; n -= a; }
  P.hp -= n;
  P.painT = 0.9;
  if (daTela){ G.flash = Math.min(0.85, 0.22 + n/50); G.flashCol = "#c81e0a"; G.shake = Math.min(5, 1.2 + n/9); }
  P.fervor = Math.max(0, P.fervor - 0.35);
  if (daTela) som("pain");
  if (P.hp <= 0){
    P.hp = 0; P.dead = true; P.deadT = 0;
    if (daTela){ G.mode = "dead"; G.endTime = G.time; som("die"); say("VOCE MORREU"); }
  }
}
/* `quem` e o jogador que bateu: o fervor de matar e dele */
function hurtEnemy(e, n, kx, ky, quem = JOGADOR_DA_TELA){
  if (e.dead) return;
  e.hp -= n;
  spark(e.x, e.y, e.z + e.d.hgt*0.55, 5, "#c0301c", 2.2);
  if (e.hp <= 0){
    e.dead = true; e.dieT = 0; e.st = "die"; G.kills++;
    som("die");
    spark(e.x, e.y, e.z + e.d.hgt*0.5, 14, "#8c1f14", 3.2);
    quem.fervor = Math.min(1, quem.fervor + 0.34);      // matar alimenta o fervor de quem matou
    quem.fervorT = 4.5;
    if (e.boss){ G.flash = 0.6; G.flashCol = "#a9309a"; som("bossRoar");
      say("O SELO DA CRIPTA SE ROMPE. O PORTAL AGUARDA."); }
  } else {
    if (Math.random() < e.d.pain) e.painT = 0.28;
    if (e.st === "idle"){ e.st = "chase"; if (e.d.cry) som(e.d.cry); }
    som("hitFlesh");
    if (kx !== undefined && !e.d.fly)
      slide(e, kx*0.16, ky*0.16, e.d.r, e.z, e.d.hgt, true);
  }
}
function explode(x,y,z,dmg,rad, quem){
  som("boom"); spark(x,y,z,26,"#ff9a24",4.2);
  for (const e of ents){
    if (e.kind!=="enemy"||e.dead) continue;
    const d = Math.hypot(e.x-x, e.y-y, e.z+e.d.hgt*0.5-z);
    if (d < rad) hurtEnemy(e, dmg*(1-d/rad), (e.x-x)/(d||1), (e.y-y)/(d||1), quem);
  }
  const dp = Math.hypot(P.x-x, P.y-y, P.z+0.5-z);
  if (dp < rad*0.8) hurtPlayer(dmg*0.30*(1-dp/(rad*0.8)));
}

/* ============================================================
   PROJETEIS  --  agora com eixo Z
   ============================================================ */
function shootProj(from, type, dx,dy,dz, spd, dmg, owner, splash, sr, grav, quem){
  projs.push({quem:quem || JOGADOR_DA_TELA,x:from.x, y:from.y, z:from.z,
              vx:dx*spd, vy:dy*spd, vz:dz*spd,
              type:type, dmg:dmg, owner:owner, life:5,
              splash:splash||0, sr:sr||0, grav:grav||0});
}
function projHits(p, e){
  if (Math.hypot(e.x-p.x, e.y-p.y) > e.d.r + 0.16) return false;
  return p.z > e.z - 0.12 && p.z < e.z + e.d.hgt + 0.12;
}
function updateProjs(dt){
  for (let i=projs.length-1;i>=0;i--){
    const p = projs[i];
    p.life -= dt;
    if (p.grav) p.vz -= p.grav*dt;
    const spd = Math.hypot(p.vx,p.vy,p.vz);
    const steps = Math.max(1, Math.ceil(spd*dt/0.10));
    let gone = p.life <= 0;
    for (let s=0;s<steps && !gone;s++){
      p.x += p.vx*dt/steps; p.y += p.vy*dt/steps; p.z += p.vz*dt/steps;
      const tx = Math.floor(p.x), ty = Math.floor(p.y);
      const out = tx<0||ty<0||tx>=MW||ty>=MH;
      if (out || p.z < alturaDoChao(p.x,p.y) || p.z > ceilAt(tx,ty) || pontoNoSolido(SOLIDOS, p.x, p.y, p.z)){
        gone = true;
        if (p.splash) explode(p.x,p.y,p.z,p.splash,p.sr,p.quem);
        else { spark(p.x,p.y,p.z,7, p.owner==="p"?"#7fc6ff":"#e05cff", 2.0);
               som("impacto"); }
        break;
      }
      if (p.owner === "p"){
        for (const e of ents){
          if (e.kind!=="enemy"||e.dead) continue;
          if (projHits(p,e)){
            const a = Math.atan2(p.vy,p.vx);
            hurtEnemy(e, p.dmg, Math.cos(a), Math.sin(a), p.quem);
            if (p.splash) explode(p.x,p.y,p.z,p.splash,p.sr,p.quem);
            gone = true; break;
          }
        }
      } else {
        /* o projetil do bicho acerta o primeiro jogador em que encosta */
        for (const J of JOGADORES) if (!J.dead && Math.hypot(J.x-p.x, J.y-p.y) < 0.32 &&
                                       p.z > J.z - 0.1 && p.z < J.z + J.h + 0.1){
          hurtPlayer(p.dmg, false, J); gone = true;
          if (p.splash) explode(p.x,p.y,p.z,p.splash,p.sr);
          break;
        }
      }
    }
    if (gone) projs.splice(i,1);
  }
}

/* ============================================================
   IA
   ============================================================ */
/* o bicho persegue o jogador vivo mais perto */
function alvoDe(e){
  let alvo = null, dm = 1e9;
  for (const J of JOGADORES){
    if (J.dead) continue;
    const d = (J.x-e.x)*(J.x-e.x) + (J.y-e.y)*(J.y-e.y);
    if (d < dm){ dm = d; alvo = J; }
  }
  return alvo || JOGADORES[0] || JOGADOR_DA_TELA;
}
/* o dano de quem o bicho persegue; dentro de updateEnemy, hurtPlayer e isto */
function ferirJogador(n, ignoreArmor, J){ return hurtPlayer(n, ignoreArmor, J); }
function updateEnemy(e, dt){
  /* dentro daqui, P e quem o bicho persegue, e e ele quem apanha -- o golpe
     marcado para daqui a pouco guarda o alvo de agora */
  const P = alvoDe(e);
  const hurtPlayer = function(n, ignoreArmor){ return ferirJogador(n, ignoreArmor, P); };
  const d = e.d;

  /* Morto cai. O voador tinha uma unica conta de altura, a de voar, e ela
     vinha antes desta linha: o morcego morria e continuava pairando, com a
     pose de cadaver, parado no ar. Quem morre larga a altura que estava
     mantendo e passa a obedecer a gravidade, voador ou nao. */
  if (e.dead){
    e.dieT += dt;
    const chao = groundUnder(e.x,e.y,d.r,e.z);
    if (e.z > chao){
      e.vz = (e.vz || 0) - 11*dt;
      e.z += e.vz*dt;
      if (e.z <= chao){ e.z = chao; e.vz = 0; }
    } else e.z = chao;
    return;
  }

  /* gravidade / voo */
  if (d.fly){
    e.bobT = (e.bobT||Math.random()*6) + dt*d.bobSpd;
    const target = e.tz !== undefined ? e.tz : d.flyZ;
    e.z += ((target + Math.sin(e.bobT)*d.bobAmp) - e.z) * Math.min(1, dt*3.4);
    const c = ceilingOver(e.x,e.y,d.r,e.z) - d.hgt - 0.05;
    if (e.z > c) e.z = c;
    const g = groundUnder(e.x,e.y,d.r,e.z) + 0.05;
    if (e.z < g) e.z = g;
  } else {
    const g = groundUnder(e.x,e.y,d.r,e.z);
    e.z += (g - e.z) * Math.min(1, dt*12);
    if (Math.abs(e.z-g) < 0.01) e.z = g;
  }
  e.t += dt;
  if (e.painT > 0){ e.painT -= dt; return; }

  /* Modo vitrine: a criatura fica onde esta, nao persegue, nao ataca e nao
     vira pra te encarar. E o unico jeito de conferir arte -- com ela em cima
     de voce nao da pra ver de que lado esta virada, que e justamente o que o
     modelo de voxel veio resolver. Continua andando no lugar para as duas
     poses da caminhada aparecerem, e mostra a de ataque de vez em quando,
     sem dano nenhum. */
  if (G.vitrine){
    e.walk = (e.walk||0) + dt*0.9;
    e.anim = (e.t % 3.4 < 0.55) ? 0.42 : 0;
    return;
  }

  const eyeZ = e.z + d.hgt*0.62;
  const pz = P.z + P.h*0.5;
  const dx = P.x-e.x, dy = P.y-e.y, dz = pz - eyeZ;
  const dist = Math.hypot(dx,dy) || .001;
  const seen = dist < d.sight && los3(e.x,e.y,eyeZ, P.x,P.y,pz);
  if (e.st === "idle"){
    if (seen){ e.st = "chase"; if (d.cry) som(d.cry); }
    return;
  }
  if (P.dead) return;
  e.atk -= dt;
  const nx = dx/dist, ny = dy/dist;
  const melee = d.melee > 0 && dist <= d.melee && Math.abs(dz) < d.hgt + 0.5;
  const ranged = d.rng && dist <= d.rng && seen;

  e.ang = Math.atan2(ny, nx);                  // por padrao, encara o jogador
  if (melee && e.atk <= 0){
    /* o preparo: do golpe comecar ao golpe cair. Cada bicho pode ter o seu
       (`preparo` no EDEF); sem ele, 0,19 s. A pose de ataque dura o preparo e
       mais um pouco, e o bicho fica parado nela: preparo longo e bicho que
       se compromete. A sondagem 2 mediu que 0,19 s nao se esquiva reagindo. */
    const preparo = d.preparo || 0.19;
    e.atk = d.cd; e.anim = Math.max(0.42, preparo + 0.08); som("swing");
    agendar(preparo, ()=>{ if (!e.dead && !P.dead && Math.hypot(P.x-e.x,P.y-e.y) <= d.melee+.35)
      hurtPlayer(rnd(d.dmg[0], d.dmg[1])); });
    return;
  }
  if (!melee && ranged && e.atk <= 0){
    e.atk = d.cd * rnd(.85,1.25); e.anim = 0.42;
    e.telegraph = 0.0;
    const from = {x:e.x, y:e.y, z:eyeZ};
    /* mira em 3D; a flecha ainda compensa a queda pela distancia */
    const flight = dist / d.pspd;
    const drop = d.pgrav ? 0.5*d.pgrav*flight*flight : 0;
    let ax = dx, ay = dy, az = dz + drop;
    const L = Math.hypot(ax,ay,az) || 1;
    ax/=L; ay/=L; az/=L;
    if (e.boss){
      for (const off of [-0.22,0,0.22]){
        const ca = Math.cos(off), sa = Math.sin(off);
        shootProj(from, d.proj, ax*ca - ay*sa, ax*sa + ay*ca, az,
                  d.pspd, d.pdmg, "e");
      }
      som("fireball");
    } else {
      shootProj(from, d.proj, ax+rnd(-.03,.03), ay+rnd(-.03,.03), az,
                d.pspd, d.pdmg, "e", 0, 0, d.pgrav);
      som("arrow");
    }
    return;
  }
  if (e.anim > 0){ e.anim -= dt; return; }

  let want = 1;
  if (d.rng && dist < d.rng*0.45) want = -0.7;
  else if (melee) want = 0;
  if (want !== 0){
    const strafe = Math.sin(e.t*1.6 + e.x) * (d.strafe !== undefined ? d.strafe : 0.42);
    const mvx = (nx*want - ny*strafe) * d.spd * dt;
    const mvy = (ny*want + nx*strafe) * d.spd * dt;
    const bx = e.x, by = e.y;
    if (d.fly){
      /* voador tambem colide: o desvio lateral precisa ser testado, senao
         ele atravessa a parede de pouquinho em pouquinho e sai do mapa */
      if (!blocked(e.x+mvx, e.y+mvy, d.r, e.z, d.hgt, false)){ e.x += mvx; e.y += mvy; }
      else {
        const sx = e.x - ny*d.spd*dt, sy = e.y + nx*d.spd*dt;
        if (!blocked(sx, sy, d.r, e.z, d.hgt, false)){ e.x = sx; e.y = sy; }
      }
    } else {
      slide(e, mvx, mvy, d.r, e.z, d.hgt, true);
      if (Math.abs(e.x-bx) < 1e-4 && Math.abs(e.y-by) < 1e-4)
        slide(e, -ny*d.spd*dt, nx*d.spd*dt, d.r, e.z, d.hgt, true);
    }
    const andouX = e.x - bx, andouY = e.y - by;
    if (Math.abs(andouX) + Math.abs(andouY) > 1e-5) e.ang = Math.atan2(andouY, andouX);
    e.walk = (e.walk||0) + d.spd*dt;
  }
}

/* ---------- trocar de mundo ----------
   O mapa novo toma o lugar do velho sem recarregar a pagina. Fica o que nao
   e de mapa nenhum -- texturas, bichos e personagem assados, ajustes, som;
   o que e do mapa e remontado: a grade, as alturas e os telhados, o
   ambiente (ceu, bruma, alcance e luz), a geometria em pedacos e as coisas.
   O ambiente de cada mapa e guardado na primeira vez, entao voltar para ele
   custa so a geometria: uns 70 ms na ilha de 650 tiles.

   `busca` e o endereco (?mapa=, &volta=, &inicio=); `mapa`, se vier, e o
   mapa ja lido, que e como o canteiro manda o que esta na tela. */
function trocarMundo(busca, mapa){
  const ambiente = ILHA ? "tarde" : "noite";
  NOME_DO_MAPA = nomeDaBusca(busca);
  VOLTA = voltaDaBusca(busca);
  INICIO_PEDIDO = inicioDaBusca(busca);
  CHEGADA = chegadaDaBusca(busca);
  ILHA = mapa !== undefined ? mapa : mapaPeloNome(NOME_DO_MAPA);
  ILHA_MOTOR = ILHA ? motorDaIlha(ILHA) : null;
  MAP = ILHA_MOTOR ? ILHA_MOTOR.linhas : MAPA_CRIPTA;
  MW = MAP[0].length; MH = MAP.length;
  prepararAmbiente();
  regsDoMundo();
  montarAlturas();
  prepararLuz();
  if (ILHA && !CENARIO) CENARIO = comSaida(assarCenario());
  nomearLugar();
  /* o boneco da terceira pessoa desbota na bruma do ambiente: outro ceu, outra fornada */
  if ((ILHA ? "tarde" : "noite") !== ambiente) ARMA_ASSADA = -1;
  buildLevel();
}
/* ---------- viagem entre mapas ----------
   Trocar de mapa troca o mundo e o endereco da pagina -- recarregar abre no
   mesmo lugar --, mas a pagina fica. G.viagem guarda o endereco, que e o que
   o teste confere. */
function viajar(endereco){
  G.viagem = endereco;
  trocarMundo(endereco);
  G.mode = "play";
  say(NOME_DO_LUGAR);
  if (typeof history !== "undefined" && history && typeof history.replaceState === "function"){
    try { history.replaceState(null, "", endereco); } catch(e){}
  }
}

/* ---------- portas ---------- */
function useDoor(P = JOGADOR_DA_TELA){
  /* entrada de dungeon a menos de um tile e meio: desce, lembrando de onde veio */
  for (const e of ents){
    if (e.kind !== "cena" || !e.destino || Math.hypot(e.x - P.x, e.y - P.y) > 1.5 || Math.abs(e.z - P.z) > 1) continue;
    /* descendo, a volta fica no endereco; subindo pela saida, o par diz
       onde se chega -- e sem par, a volta de quando se desceu */
    if (e.saida){
      if (e.par) viajar("?mapa=" + e.destino + "&chegada=" + e.par);
      else if (VOLTA && VOLTA.mapa === e.destino) viajar("?mapa=" + e.destino + "&inicio=" + VOLTA.x + "," + VOLTA.y);
      else viajar("?mapa=" + e.destino);
    } else viajar("?mapa=" + e.destino + "&volta=" + (NOME_DO_MAPA || "cripta") + "," + Math.floor(e.x) + "," + Math.floor(e.y) +
                  (e.par ? "&chegada=" + e.par : ""));
    return;
  }
  const fx = P.x + Math.cos(P.ang)*0.9, fy = P.y + Math.sin(P.ang)*0.9;
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const c = cellAt(tx,ty);
  if (c === "x"){ G.mode = "won"; G.endTime = G.time; som("exit"); return; }
  const d = doors.get(ty*MW+tx);
  if (d){
    if (d.locked && !P.key){ som("locked"); say("O SELO EXIGE A CHAVE RUNICA"); return; }
    if (d.run === 0 && d.open === 0){
      d.run = 1; som("door");
      if (d.secret){ G.secrets++; som("secret"); say("SEGREDO ENCONTRADO!"); }
      else if (d.locked) say("O SELO SE ABRE");
    }
    return;
  }
  if (usarPecaQueAbre(P)) return;
  som("empty");
}
/* A porta, a janela, a veneziana e a grade que sao peca: o E vira a que
   esta mais perto do ponto logo a frente, na altura de quem olha. Fechar em
   cima de quem esta no vao nao fecha. */
function pecaQueAbreNaFrente(P = JOGADOR_DA_TELA){
  const lista = (ILHA && ILHA.pecas) || [];
  const fx = P.x + Math.cos(P.ang)*0.6, fy = P.y + Math.sin(P.ang)*0.6, fz = P.z + P.h*0.6;
  const estilos = estilosDasConstrucoes(ILHA);
  let melhor = null, dm = 0.9;
  for (const p of lista){
    const def = TIPOS_DE_PECA[p.tipo];
    if (!def || !def.abre || Math.abs(p.x - P.x) > 3 || Math.abs(p.y - P.y) > 3) continue;
    const c = pontoQueAbre(p, estiloDaPeca(p, estilos));
    if (Math.abs(c[2] - fz) > 1) continue;
    const d = Math.hypot(c[0] - fx, c[1] - fy);
    if (d < dm){ dm = d; melhor = p; }
  }
  return melhor;
}
function usarPecaQueAbre(P = JOGADOR_DA_TELA){
  const p = pecaQueAbreNaFrente(P);
  if (!p) return false;
  alternarAberta(p);
  montarPecas();
  if (!pecaAberta(p) && blocked(P.x, P.y, 0.26, P.z, P.h, false)){
    alternarAberta(p); montarPecas(); som("empty");
    return true;
  }
  som("door");
  return true;
}
function updateDoors(dt){
  doors.forEach(d=>{
    if (d.run === 1){
      d.open = Math.min(1, d.open + dt*1.6);
      if (d.open >= 1) d.run = 2;
      sujarTile(d.x, d.y);                        // so o pedaco da porta e remontado
    }
  });
}

/* ---------- itens ---------- */
function pickup(e, P = JOGADOR_DA_TELA){
  let got = false;
  if (e.type === "potion" && P.hp < 100){ P.hp = Math.min(100, P.hp+25); got = true; say("POCAO DE CURA +25"); }
  else if (e.type === "mana" && P.mana < P.maxMana){
    P.mana = Math.min(P.maxMana, P.mana+30); got = true; say("CRISTAL DE MANA +30");
  }
  else if (e.type === "shield" && P.armor < 100){ P.armor = Math.min(100, P.armor+50); got = true; say("ESCUDO DE AZO +50"); }
  else if (e.type === "soul"){
    P.hp = Math.min(200, P.hp+100); P.have[2] = true; P.wpn = 2; got = true;
    say("ALMA DE FOGO! GRIMORIO DE CHAMAS OBTIDO"); som("secret");
  }
  else if (e.type === "key"){ P.key = true; got = true; som("key"); say("CHAVE RUNICA OBTIDA"); }
  if (got){
    e.gone = true; P.evilT = 1.0;
    if (e.G) G.items++;
    if (e.type !== "key" && e.type !== "soul") som("pickup");
  }
  return got;
}
