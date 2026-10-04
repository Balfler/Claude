/* ============================================================
   ENTRADA E LACO
   ------------------------------------------------------------
   Teclado, mouse e o laco principal: a parte do jogo que o canteiro NAO
   carrega. A ferramenta usa o mesmo motor (ate p5.js) e poe a entrada e o
   laco dela por cima, com o fantasma da peca, a paleta e o resto.
   ============================================================ */
addEventListener("keydown", (e)=>{
  const k = keyName(e);
  /* com a linha de fala aberta, o teclado escreve em vez de jogar */
  if (G.falaAberta){
    e.preventDefault();
    if (k === "enter"){ const t = G.falaTexto.trim(); G.falaAberta = false; if (t) ACOES.push({tipo:"dizer", texto:t}); }
    else if (k === "escape") G.falaAberta = false;
    else if (k === "backspace") G.falaTexto = G.falaTexto.slice(0, -1);
    else if (e.key && e.key.length === 1 && G.falaTexto.length < 48) G.falaTexto += e.key;
    return;
  }
  if (["w","a","s","d","e"," ","shift","control","tab","arrowup","arrowdown","arrowleft","arrowright"].indexOf(k) >= 0)
    e.preventDefault();
  if (keys[k]) return;
  keys[k] = true;
  if (k === "enter" && G.mode === "title") startGame();
  else if (k === "r" && (G.mode === "dead" || G.mode === "won")) { buildLevel(); G.mode = "play"; }
  else if (k === "e" && G.mode === "won" && VOLTA) viajar("?mapa=" + VOLTA.mapa + "&inicio=" + VOLTA.x + "," + VOLTA.y);
  else if (G.mode === "play"){
    if (k === "e") ACOES.push({tipo:"usar"});
    else if (k === " ") ACOES.push({tipo:"pular"});
    else if (k === "1" || k === "2" || k === "3") ACOES.push({tipo:"arma", i:+k - 1});
    else if (k === "tab") G.mapOn = !G.mapOn;
    else if (k === "x") alternarTerceira();
    else if (k === "enter"){ G.falaAberta = true; G.falaTexto = ""; for (const t in keys) keys[t] = false; }
    else if (k === "b") G.bolsaAberta = !G.bolsaAberta;
    else if (k === "4") ACOES.push({tipo:"item", id:"pocao"});
    else if (k === "5") ACOES.push({tipo:"item", id:"cristal"});
    else if (TECLAS_DE_AJUSTE.indexOf(k) >= 0) ajustar(k);
    /* ---- ferramentas de teste ----
       Ficam no build de proposito: e prototipo, e o HUD avisa quando estao
       ligadas para nao dar de jogar horas invencivel sem perceber. */
    else if (k === "g"){
      P.god = !P.god;
      say(P.god ? "MODO DEUS LIGADO" : "MODO DEUS DESLIGADO");
    }
    else if (k === "n"){
      P.noclip = !P.noclip;
      if (!P.noclip){ P.vz = 0; P.vx = 0; P.vy = 0; }
      say(P.noclip ? "ATRAVESSAR PAREDES LIGADO" : "ATRAVESSAR PAREDES DESLIGADO");
    }
    else if (k === "v"){
      G.vitrine = !G.vitrine;
      projs.length = 0;                      // nada de flecha ja no ar te acertando
      say(G.vitrine ? "MODO VITRINE LIGADO" : "MODO VITRINE DESLIGADO");   // os bichos param, e o andarilho congela
    }
    else if (k === "k"){
      P.key = true; P.have = [true,true,true];
      P.mana = P.maxMana; P.armor = 100; P.hp = Math.max(P.hp, 100);
      say("ARSENAL COMPLETO");
    }
    else if (k === "m"){
      AU.on = !AU.on;
      if (AU.master) AU.master.gain.value = AU.on ? 0.42 : 0;
      say(AU.on ? "SOM LIGADO" : "SOM DESLIGADO");
    }
    else if (k === "q") ACOES.push({tipo:"proxima"});
  }
}, {passive:false});
addEventListener("keyup", (e)=>{ keys[keyName(e)] = false; });

/* Olhar em volta tem tres caminhos, porque dentro de um iframe o navegador
   pode recusar o pointer lock:
     1. mouse preso (pointer lock)  -> mover o mouse olha, segurar o botao atira
     2. sem pointer lock            -> arrastar olha, clique curto atira
     3. sempre disponivel           -> setas esquerda/direita giram              */

function tryLock(){
  if (!cvs.requestPointerLock){ lockFail = true; return; }
  try {
    const p = cvs.requestPointerLock();
    if (p && typeof p.catch === "function") p.catch(()=>{ lockFail = true; });
  } catch(err){ lockFail = true; }
}
document.addEventListener("pointerlockerror", ()=>{ lockFail = true; });
document.addEventListener("pointerlockchange", ()=>{
  locked = document.pointerLockElement === cvs;
  if (locked) lockFail = false;
});

cvs.addEventListener("mousedown", (e)=>{
  e.preventDefault(); cvs.focus();
  if (G.mode === "title"){ startGame(); return; }
  if (G.mode === "dead" || G.mode === "won"){ buildLevel(); G.mode = "play"; return; }
  if (!locked && !lockFail) tryLock();
  if (locked){ firing = true; return; }
  dragging = true; dragMoved = 0; lastMX = e.clientX; lastMY = e.clientY;
});
addEventListener("mouseup", ()=>{
  if (dragging && dragMoved < 7) tapShot = true;      // clique sem arrastar = um disparo
  dragging = false; firing = false;
});
addEventListener("mousemove", (e)=>{
  if (G.mode !== "play") return;
  if (locked){
    P.ang += (e.movementX || 0) * 0.0026;
    P.pitch = clamp(P.pitch - (e.movementY || 0) * 0.0030, -PITCH_MAX, PITCH_MAX);
  } else if (dragging){
    const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
    lastMX = e.clientX; lastMY = e.clientY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    P.ang += dx * 0.0055;
    P.pitch = clamp(P.pitch - dy * 0.0055, -PITCH_MAX, PITCH_MAX);
  }
});
cvs.addEventListener("mouseleave", ()=>{ dragging = false; firing = false; });
cvs.addEventListener("contextmenu", e=>e.preventDefault());

function startGame(){
  buildLevel(); G.mode = "play"; actx(); startMusic();
  say(NOME_DO_LUGAR);
  if (cvs.requestPointerLock) cvs.requestPointerLock();
}
addEventListener("resize", encaixarTela);
/* zoom do navegador e troca de monitor mudam o devicePixelRatio, e isso nem
   sempre dispara resize */
function vigiarDensidade(){
  if (typeof matchMedia !== "function") return;
  const mq = matchMedia("(resolution: " + (window.devicePixelRatio || 1) + "dppx)");
  if (mq.addEventListener) mq.addEventListener("change", ()=>{ encaixarTela(); vigiarDensidade(); }, {once:true});
}
vigiarDensidade();

/* ============================================================
   LOOP
   ============================================================ */
buildLevel();
encaixarTela();
let last = performance.now();
const PASSO = 1/60;
let acumulado = 0;
function frame(now){
  const bruto = now - last;
  let dt = bruto/1000; last = now;
  /* o timestamp do requestAnimationFrame e o inicio do quadro e pode vir
     ANTES do instante em que ele foi agendado; sem este piso, dt fica
     negativo e o relogio do jogo anda pra tras. */
  dt = dt > 0.25 ? 0.25 : (dt > 0 ? dt : 0);
  const t0 = performance.now();
  /* Passo fixo: a simulacao anda sempre 1/60 s por vez, quantas vezes o
     tempo real pedir, e o desenho mostra o ultimo estado. Maquina lenta roda
     mais de um passo por quadro, rapida as vezes nenhum -- e a fisica sai a
     mesma nas duas, que e o que a rede precisa. Oito passos no maximo: depois
     de uma pausa longa o jogo nao sai correndo para alcancar o relogio. */
  acumulado += dt;
  let passos = 0;
  while (acumulado >= PASSO - 1e-6 && passos < 8){ update(PASSO, lerEntrada()); acumulado -= PASSO; passos++; }
  if (passos === 8) acumulado = 0;
  assarJogador();
  assarAndarilho();
  tocarSons();
  render();
  /* o contador mostra update + render e os quadros por segundo, os dois
     suavizados para o numero dar de ler */
  MEDIDA.ms += (performance.now() - t0 - MEDIDA.ms)*0.08;
  if (bruto > 0) MEDIDA.fps += (1000/bruto - MEDIDA.fps)*0.08;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
cvs.focus();
})();
</script>
