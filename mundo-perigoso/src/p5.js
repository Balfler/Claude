
/* ============================================================
   REGIOES  --  cada ala da cripta tem seu proprio conjunto
   ============================================================ */
function regionOf(x,y){
  if (ILHA_MOTOR) return ILHA.terreno[y*MW+x];     // na ilha a regiao e o proprio terreno
  if (y <= 12 && x >= 17) return 0;                 // camara de lava
  if (y >= 22 && x >= 25) return 1;                 // cripta de Vhalgorn
  if (y >= 12 && y <= 22 && x >= 19) return 2;      // biblioteca
  if (y >= 12 && y <= 22) return 3;                 // salao dos pilares
  return 4;                                         // entrada
}
const REG_CRIPTA = [
  {wall:"obsidCeu", floor:"floorStoneCeu", ceil:"ceilRock"},   // caldeira: desbota no horizonte
  {wall:"crypt",  floor:"floorCrypt", ceil:"ceilVoid"},
  {wall:"moss",   floor:"floorWood",  ceil:"ceilStone"},
  {wall:"moss",   floor:"floorStone", ceil:"ceilStone"},
  {wall:"stone",  floor:"floorStone", ceil:"ceilStone"}
];
let REG = REG_ILHA || REG_CRIPTA;
function regsDoMundo(){ REG = REG_ILHA || REG_CRIPTA; }

/* ---------- HUD ----------
   A tela e 16:9 e o mundo vai ate embaixo. O painel nao e mais uma faixa
   cortando a vista: fica nos dois cantos de baixo, por cima do mundo -- rosto,
   vida e mana a esquerda; escudo, armas e selo a direita. Tudo na tela logica
   de 320x180, ampliada por ESC. */
function txt(s,x,y,size,col,align,font){
  ctx.font = (font || '') + size + 'px "VT323","Lucida Console",monospace';
  ctx.fillStyle = col; ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText(s,x,y);
}
function panel(x,y,w,h){
  ctx.fillStyle = "#241d17"; ctx.fillRect(x,y,w,h);
  ctx.fillStyle = "#3a2e22"; ctx.fillRect(x,y,w,1); ctx.fillRect(x,y,1,h);
  ctx.fillStyle = "#0d0a08"; ctx.fillRect(x,y+h-1,w,1); ctx.fillRect(x+w-1,y,1,h);
}
const HUD_Y = H - 28;                            // alto dos paineis de baixo
function drawHUD(){
  const y0 = HUD_Y;
  const tier = P.hp > 80 ? 0 : P.hp > 60 ? 1 : P.hp > 40 ? 2 : P.hp > 20 ? 3 : 4;
  const face = P.dead ? FACES.dead : P.painT > 0.45 ? FACES.pain[tier]
             : P.evilT > 0 ? FACES.evil[tier] : FACES.norm[tier];

  panel(4, y0-3, 34, 30);                                // ROSTO
  ctx.drawImage(face, 5, y0-2, 32, 28);

  panel(40, y0+1, 50, 24);                               // VIDA
  txt("VIDA", 65, y0+9, 9, "#8d8172", "center");
  txt((P.hp|0)+"%", 65, y0+22, 15, P.hp>40?"#d8ccb2":"#d8342c", "center");

  panel(92, y0+1, 44, 24);                               // MANA
  txt("MANA", 114, y0+9, 9, "#8d8172", "center");
  txt(String(P.mana|0), 114, y0+22, 15, "#6fb6ff", "center");

  const xd = W - 142;
  panel(xd, y0+1, 48, 24);                               // ARMADURA
  txt("ESCUDO", xd+24, y0+9, 9, "#8d8172", "center");
  txt((P.armor|0)+"%", xd+24, y0+22, 15, "#9fbf6a", "center");

  panel(xd+50, y0+1, 44, 24);                            // ARMAS
  txt("ARMAS", xd+72, y0+9, 9, "#8d8172", "center");
  for (let i=0;i<3;i++)
    txt(String(i+1), xd+60+i*12, y0+22, 14, P.wpn===i?"#ffd88a":(P.have[i]?"#7a5a22":"#3a2e22"), "center");

  panel(xd+96, y0+1, 42, 24);                            // CHAVE / SEGREDOS
  txt("SELO", xd+117, y0+9, 9, "#8d8172", "center");
  if (P.key){
    const bx = xd+108, by = y0+12;
    ctx.fillStyle="#8fc6ff"; ctx.fillRect(bx,by,3,9);
    ctx.fillRect(bx+3,by+7,5,2); ctx.fillRect(bx+3,by+3,3,2);
    ctx.beginPath(); ctx.arc(bx+1.5,by-1,3,0,TAU); ctx.strokeStyle="#8fc6ff"; ctx.lineWidth=1.5; ctx.stroke();
    txt("OK", xd+127, y0+22, 11, "#6fb6ff", "center");
  } else txt("---", xd+117, y0+22, 14, "#4a3c2c", "center");
}

function drawAutomap(){
  const s = 4.2, ox = 8, oy = 8;
  ctx.fillStyle = "rgba(6,5,4,.86)"; ctx.fillRect(0,0,W,H);
  for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
    if (!visited[y*MW+x]) continue;
    const c = MAP[y][x], px = ox+x*s, py = oy+y*s;
    if (c==="#"||c==="="){ ctx.fillStyle="#8a6a2e"; ctx.fillRect(px,py,s-.5,s-.5); }
    else if (c==="R"||c==="x"){ ctx.fillStyle="#3fd6b0"; ctx.fillRect(px,py,s-.5,s-.5); }
    else if (c==="D"||c==="S"){ ctx.fillStyle="#c07a2a"; ctx.fillRect(px,py,s-.5,s-.5); }
    else if (c==="L"){ ctx.fillStyle="#6fb6ff"; ctx.fillRect(px,py,s-.5,s-.5); }
    else if (c==="~"){ ctx.fillStyle="#7a2c10"; ctx.fillRect(px,py,s-.5,s-.5); }
    else { ctx.fillStyle="#241d17"; ctx.fillRect(px,py,s-.5,s-.5); }
  }
  for (const e of ents){
    if (e.gone) continue;
    if (!visited[(e.y|0)*MW+(e.x|0)]) continue;
    if (e.kind==="item"){ ctx.fillStyle = e.type==="key" ? "#8fc6ff" : "#d8cc7a";
      ctx.fillRect(ox+e.x*s-1.5, oy+e.y*s-1.5, 3, 3); }
  }
  const px = ox+P.x*s, py = oy+P.y*s;
  ctx.strokeStyle="#ffd88a"; ctx.lineWidth=1.4; ctx.beginPath();
  ctx.moveTo(px+Math.cos(P.ang)*5, py+Math.sin(P.ang)*5);
  ctx.lineTo(px+Math.cos(P.ang+2.5)*4.5, py+Math.sin(P.ang+2.5)*4.5);
  ctx.lineTo(px+Math.cos(P.ang-2.5)*4.5, py+Math.sin(P.ang-2.5)*4.5);
  ctx.closePath(); ctx.stroke();
  txt(NOME_DO_LUGAR + "  --  MAPA", 8, HUD_Y-8, 13, "#c8963c");
}

/* ---------- terceira pessoa ----------
   X liga e desliga. O boneco e o mesmo do provador: a escolha guardada la,
   no navegador, vira o jogador -- com a arma da mao trocada pela que esta
   equipada de verdade (WPN[P.wpn]), que e o que faz o personagem aparecer
   empunhando o cajado ou a adaga em vez de mao vazia. Vinte poses em oito
   rumos sao 160 bakes -- pesado demais pra travar o jogo na hora de trocar
   de camera -- entao a fornada assa aos poucos: no worker do forno.js, fora
   do laco principal, e so a primeira, enquanto ele sobe, um pouco por
   quadro aqui dentro. Ate a pose parada terminar de assar em todos os rumos,
   o corpo so gira; as demais entram sozinhas quando ficam prontas, e ate la
   quadroDaPose devolve a parada no lugar delas. */
const ARMA_DO_WPN = {dagger:"adaga", staff:"cajado", tome:"grimorio"};
let QUADROS_JOGADOR = null, FORNADA_JOGADOR = null, FORNADA_PROXIMA = null, ARMA_ASSADA = null;
const FORNO_MS = 3;                       // tempo maximo de fornada por quadro, pra nao travar o jogo
function escolhaDoJogador(){
  let escolha = null;
  try { escolha = JSON.parse(localStorage.getItem("provador:v1") || "null"); } catch(e){}
  escolha = escolhaDoPersonagem(escolha);
  escolha.arma = ARMA_DO_WPN[WPN[P.wpn].s] || "nenhuma";
  return escolha;
}
function alternarTerceira(){
  G.terceira = !G.terceira;
  if (G.terceira && !FORNADA_JOGADOR){
    ARMA_ASSADA = P.wpn;
    FORNADA_JOGADOR = fornadaAoFundo(escolhaDoJogador(), ILHA ? HORIZONTE : 0, null, true);
    QUADROS_JOGADOR = FORNADA_JOGADOR.quadros;
  }
  say(G.terceira ? "TERCEIRA PESSOA" : "PRIMEIRA PESSOA");
}
/* O corpo trocou (usarCorpoDesenhado, no p3e.js): o forno recebe o novo, o
   jogador assa de novo por baixo -- o boneco antigo fica ate o novo ficar
   pronto -- e os moradores sao refeitos ja. */
function aoTrocarCorpo(){
  corpoParaOForno(CORPO_DESENHADO);
  if (FORNADA_JOGADOR){ ARMA_ASSADA = P.wpn; FORNADA_PROXIMA = fornadaAoFundo(escolhaDoJogador(), ILHA ? HORIZONTE : 0, null, true); }
  if (CENARIO && CENARIO.npc){
    const velho = CENARIO.npc, novo = CENARIO.npc = moradoresAssados();
    for (const e of ents){
      const i = e.kind === "cena" && e.type === "npc" ? velho.imgs.indexOf(e.img) : -1;
      if (i >= 0){ e.img = novo.imgs[i]; e.larg = novo.larg; e.alto = novo.alto; }
    }
  }
}
/* ============================================================
   O ANDARILHO DA VILA
   Um morador de teste com o corpo do guerreiro de 256 (a skin oficial,
   personagens/guerreiro.corpo.js), que anda pela vila. E o jeito de ver o
   personagem de 256 de todos os lados, parado e andando, na luz e no chao da
   ilha (pedido do Leandro, 1/10). Nasce ao lado do morador que tem mais rua
   em volta, vai e volta a ate uns 7 tiles dali, sempre ao ar livre, e para
   um pouco a cada chegada. So existe se a
   pagina carregou o guerreiro, e e assado no forno com o corpo dele, sem
   trocar o do jogador (fornadaAoFundo com `outro`).
   ============================================================ */
const ANDARILHO = {corpo:null, tentou:false, fornada:null, nevoa:null};
const POSES_DO_ANDARILHO = [POSE.PARADO].concat(POSE.ANDAR);   // 0 a 6: o indice e a propria pose
const VEL_DO_ANDARILHO = 1.0;                                  // tiles por segundo: passo de quem passeia
function corpoDoAndarilho(){
  if (ANDARILHO.tentou) return ANDARILHO.corpo;
  ANDARILHO.tentou = true;
  if (NOME_DO_CORPO === "guerreiro" && CORPO_NATIVO) return ANDARILHO.corpo = CORPO_NATIVO;
  const texto = textoDoCorpo("guerreiro");
  if (texto){ try { ANDARILHO.corpo = corpoValido(lerPersonagem(texto)); } catch(e){ ANDARILHO.corpo = null; } }
  return ANDARILHO.corpo;
}
/* ceu aberto em cima: ele passeia na rua, nao entra em casa */
function aoArLivre(x, y){ const tx = Math.floor(x), ty = Math.floor(y); return ceilAt(tx, ty) - floorAt(tx, ty) > 10; }
/* ?andarilhos=N: quantos (a sondagem 16 mede a placa com varios) */
const QUANTOS_ANDARILHOS = Math.max(1, Math.min(60, typeof BUSCA_INICIAL === "string" && /[?&]andarilhos=(\d+)/.test(BUSCA_INICIAL) ? +BUSCA_INICIAL.match(/[?&]andarilhos=(\d+)/)[1] : 1));
function criarAndarilho(){
  /* a casa dele e o morador com mais rua livre em volta */
  let casa = null, melhor = -1;
  for (const e of ents){
    if (e.kind !== "cena" || e.type !== "npc") continue;
    let n = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++)
      if (aoArLivre(e.x + dx, e.y + dy) && !blocked(e.x + dx, e.y + dy, 0.3, e.z, 0.9)) n++;
    if (n > melhor){ melhor = n; casa = e; }
  }
  if (!casa) return;
  /* com a placa e o modelo, ele e desenhado em 3D: nada de forno, e o corpo
     de 8 MB nem precisa ter vindo. O aviso de falha so com ?gpu=sim: sem
     ele, quem nao tem placa so ve o andarilho de sempre. */
  ligarGpu();
  if (GPU.exigido && !GPU.ativo && !GPU.avisado){ GPU.avisado = true; say("GPU: " + (GPU.motivo || "indisponivel").toUpperCase()); }
  const modelo = modeloGpu("guerreiro");
  if (GPU.exigido && GPU.motivo && !GPU.avisado){ GPU.avisado = true; say("GPU: " + GPU.motivo.toUpperCase()); }
  const c = modelo ? null : corpoDoAndarilho();
  if (!modelo && !c) return;
  /* o tamanho dele em tiles, do corpo ou da grade do modelo */
  const n0 = modelo && modelo.niveis[0], vox = modelo ? 128*n0.altura/117 : 128*c.densidade;
  const larg = (modelo ? n0.DX : c.dim.DX)/vox, alto = (modelo ? n0.DZ : c.dim.DZ)/vox;
  /* um lugar livre ao lado do morador */
  let x = casa.x, y = casa.y;
  for (let k = 0; k < 8; k++){
    const a = k*TAU/8, px = casa.x + Math.cos(a)*1.3, py = casa.y + Math.sin(a)*1.3;
    if (!blocked(px, py, 0.3, casa.z, 0.9) && aoArLivre(px, py)){ x = px; y = py; break; }
  }
  const nevoa = ILHA ? HORIZONTE : 0;
  if (!modelo && (!ANDARILHO.fornada || ANDARILHO.nevoa !== nevoa)){
    ANDARILHO.nevoa = nevoa;
    ANDARILHO.fornada = fornadaAoFundo(escolhaDoPersonagem({roupa:"nenhuma", cabelo:"careca"}), nevoa,
                                       {id:"guerreiro", corpo:c, poses:POSES_DO_ANDARILHO}, true);
  }
  for (let k = 0; k < QUANTOS_ANDARILHOS; k++){
    /* os outros nascem espalhados em volta do primeiro */
    let px = x, py = y;
    for (let t = 0; k > 0 && t < 20; t++){
      const a = Math.random()*TAU, r = 1 + Math.random()*5, qx = x + Math.cos(a)*r, qy = y + Math.sin(a)*r;
      if (!blocked(qx, qy, 0.3, casa.z, 0.9) && aoArLivre(qx, qy)){ px = qx; py = qy; break; }
    }
    ents.push({kind:"andarilho", x:px, y:py, z:groundUnder(px, py, 0.25, casa.z), ang:k ? Math.random()*TAU : Math.atan2(casa.y - y, casa.x - x),
               casa:[px, py], alvo:null, pausa:1.5 + Math.random()*2, passada:Math.random()*4, andando:false, preso:0, gpu:modelo,
               larg:larg, alto:alto});
  }
}
function passoDoAndarilho(e, dt){
  /* no modo vitrine (V) ele congela onde esta, ate no meio do passo: para
     olhar em volta dele e tirar print */
  if (G.vitrine) return;
  e.andando = false;
  if (e.pausa > 0){ e.pausa -= dt; return; }
  if (!e.alvo){
    for (let k = 0; k < 16 && !e.alvo; k++){
      const a = Math.random()*TAU, r = 2 + Math.random()*5, x = e.casa[0] + Math.cos(a)*r, y = e.casa[1] + Math.sin(a)*r;
      if (x > 1 && y > 1 && x < MW - 1 && y < MH - 1 && !blocked(x, y, 0.3, e.z, 0.9) && aoArLivre(x, y) && Math.abs(groundUnder(x, y, 0.25, e.z) - e.z) < 1) e.alvo = [x, y];
    }
    if (!e.alvo){ e.pausa = 1; return; }
  }
  const dx = e.alvo[0] - e.x, dy = e.alvo[1] - e.y, d = Math.hypot(dx, dy);
  if (d < 0.25){ e.alvo = null; e.pausa = 1.5 + Math.random()*3; return; }
  /* vira aos poucos, e anda para onde esta virado */
  let da = Math.atan2(dy, dx) - e.ang;
  da = ((da + Math.PI) % TAU + TAU) % TAU - Math.PI;
  e.ang += clamp(da, -3.5*dt, 3.5*dt);
  const passo = Math.min(d, VEL_DO_ANDARILHO*dt), x0 = e.x, y0 = e.y;
  slide(e, Math.cos(e.ang)*passo, Math.sin(e.ang)*passo, 0.25, e.z, 0.9);
  const andou = Math.hypot(e.x - x0, e.y - y0);
  /* um ciclo de passo (os dois pes) a cada 0,8 tile, uns 1,6 m: passeando a 1 tile por
     segundo, o do jogador (um ciclo a cada 2 tiles) deixava o pe arrastado, quase parado */
  e.passada += andou*1.25;
  e.andando = andou > 0.3*passo;
  e.z = groundUnder(e.x, e.y, 0.25, e.z);
  /* preso numa quina: desiste deste alvo */
  if (andou < 0.1*passo){ if ((e.preso += dt) > 0.8){ e.alvo = null; e.preso = 0; e.pausa = 0.5; } } else e.preso = 0;
}
function assarAndarilho(){
  if (ANDARILHO.fornada && !ANDARILHO.fornada.pronta()) ANDARILHO.fornada.trabalhar(FORNO_MS);
}
/* a pose do andarilho: parado ou o passo */
function poseDoAndarilho(e){
  return e.andando ? POSE.ANDAR[frameIdx(e.passada*POSE.ANDAR.length, POSE.ANDAR.length)] : POSE.PARADO;
}
/* o quadro dele de pe, no rumo em que a camera o ve (os testes olham) */
function quadroDoAndarilho(e){
  if (!ANDARILHO.fornada) return null;
  const rel = e.ang - Math.atan2(camY - e.y, camX - e.x);
  return quadroDaPose(ANDARILHO.fornada.quadros, poseDoAndarilho(e), frameIdx(Math.round(rel/(TAU/ROTACOES)) + ROTACOES*4, ROTACOES));
}
/* Chamado a cada quadro: continua a fornada em andamento, e se a arma
   equipada mudou desde a ultima fornada, assa uma nova por baixo -- o
   personagem continua com a arma antiga na mao ate a nova ficar pronta, e ai
   troca de uma vez, sem sumir nem piscar. */
function assarJogador(){
  if (!G.terceira || !FORNADA_JOGADOR) return;
  if (!FORNADA_PROXIMA && ARMA_ASSADA !== P.wpn){
    ARMA_ASSADA = P.wpn;
    FORNADA_PROXIMA = fornadaAoFundo(escolhaDoJogador(), ILHA ? HORIZONTE : 0, null, true);
  }
  if (FORNADA_PROXIMA){
    /* troca quando as poses de pe ficam prontas; as alturas da camera seguem assando */
    if (FORNADA_PROXIMA.trabalhar(FORNO_MS) || FORNADA_PROXIMA.basica()){
      FORNADA_JOGADOR = FORNADA_PROXIMA; QUADROS_JOGADOR = FORNADA_JOGADOR.quadros; FORNADA_PROXIMA = null;
    }
  } else if (!FORNADA_JOGADOR.pronta()) FORNADA_JOGADOR.trabalhar(FORNO_MS);
}

function drawWeapon(){
  if (P.dead || G.terceira) return;           // em terceira pessoa a arma e a do boneco
  const w = WPN[P.wpn], set = WSPR[w.s];
  let fi = 0;
  if (P.anim > 0){
    const k = 1 - P.anim/w.cd;
    fi = w.s === "dagger" ? (k<.3?1:k<.6?2:1) : (k<.45?1:0);
  }
  const c = set[Math.min(fi, set.length-1)];
  const dw = 172, dh = dw*c.height/c.width;
  const sx = Math.sin(P.bobT*1.05)*4, sy = Math.abs(Math.cos(P.bobT*2.1))*3.5;
  /* a arma desce um pouco quando o mago olha pra cima, e sobe ao olhar
     pra baixo -- so o bastante para o braco acompanhar a cabeca */
  const lift = -P.pitch * 26 + (P.vz > 0.2 ? -3 : P.vz < -0.2 ? 3 : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,VH); ctx.clip();
  ctx.drawImage(c, (W-dw)/2 + 16 + sx, VH - dh + 6 + sy + lift, dw, dh);
  ctx.restore();
}

function drawOverlays(){
  if (G.flash > 0.01){
    ctx.fillStyle = G.flashCol; ctx.globalAlpha = Math.min(.62, G.flash);
    ctx.fillRect(0,0,W,VH); ctx.globalAlpha = 1;
  }
  if (P.hp < 35 && !P.dead){
    ctx.fillStyle = "#8c1f14";
    ctx.globalAlpha = 0.10 + Math.sin(G.tick*4)*0.05;
    ctx.fillRect(0,0,W,VH); ctx.globalAlpha = 1;
  }
  if (!G.mapOn && !P.dead){                                  // mira
    ctx.fillStyle = "rgba(230,220,190,.55)";
    ctx.fillRect(159,VH/2-4,2,3); ctx.fillRect(159,VH/2+2,2,3);
    ctx.fillRect(154,VH/2-1,3,2); ctx.fillRect(163,VH/2-1,3,2);
  }
  if (G.msgT > 0){
    ctx.globalAlpha = Math.min(1, G.msgT*1.6);
    txt(G.msg, 6, 14, 15, "#ffd88a");
    ctx.globalAlpha = 1;
  }
  if (P.god || P.noclip || G.vitrine){                       // nunca esquecer que esta ligado
    const tags = (P.god ? "DEUS " : "") + (P.noclip ? "FANTASMA " : "") +
                 (G.vitrine ? "VITRINE" : "");
    txt(tags.trim(), 6, HUD_Y-8, 13, "#63e6c8");
  }
  const mm = Math.floor(G.time/60), ss = Math.floor(G.time%60);
  txt(("0"+mm).slice(-2)+":"+("0"+ss).slice(-2), W-6, 14, 13, "#7a6a52", "right");
  txt("MORTES "+G.kills+"/"+G.totalKills, W-6, 26, 12, "#6a5c46", "right");
  desenharConversa();
  if (G.bolsaAberta) desenharBolsa();
  if (G.painel) desenharPainel();
  else if (AJUSTE.quadro) desenharQuadro();
}

/* o fonte fica todo em ASCII para nao depender de charset declarado;
   os dois sinais tipograficos entram por codigo */
const MID = String.fromCharCode(183), DASH = String.fromCharCode(8212);

/* O jogo abre na ilha, e a cripta virou a primeira dungeon dela: cada uma se
   apresenta com o proprio nome. Mapa do editor mostra o nome do mapa. */
let NOME_DO_LUGAR = "";
function nomearLugar(){
  NOME_DO_LUGAR = !ILHA ? "A CRIPTA DE VHALGORN"
                : NOME_DO_MAPA === "ilha" ? "PEDRA ALTA"
                : "MAPA " + String(ILHA.nome || NOME_DO_MAPA).toUpperCase();
}
nomearLugar();
function screenTitle(){
  ctx.fillStyle="rgba(6,5,4,.80)"; ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";
  ctx.font = '700 10px "Cinzel",Georgia,serif'; ctx.fillStyle="#7a5a22";
  ctx.fillText(ILHA ? "MUNDO PERIGOSO   "+MID+"   A ILHA" : "EPISODIO I   "+MID+"   FASE 1", W/2, 30);
  ctx.font = '700 20px "Cinzel",Georgia,serif';
  ctx.fillStyle="#0a0806"; ctx.fillText(NOME_DO_LUGAR, W/2+1, 57);
  ctx.fillStyle="#d8ccb2"; ctx.fillText(NOME_DO_LUGAR, W/2, 56);
  ctx.fillStyle="#c8963c"; ctx.fillRect(W/2-70, 64, 140, 1);
  if (ILHA){
    txt("O barco deixou voce no porto.", W/2, 84, 14, "#8d8172", "center");
    txt("Sob a capela, a cripta espera.", W/2, 96, 14, "#8d8172", "center");
    txt("Diga OI aos moradores.", W/2, 112, 14, "#a08f78", "center");
  } else {
    txt("Tres criptas abaixo da capela,", W/2, 84, 14, "#8d8172", "center");
    txt("algo antigo acordou.", W/2, 96, 14, "#8d8172", "center");
    txt("Encontre a Chave Runica. Quebre o Selo.", W/2, 112, 14, "#a08f78", "center");
  }
  if (Math.sin(G.tick*3.4) > -0.3)
    txt("PRESSIONE ENTER OU CLIQUE PARA COMECAR", W/2, 134, 14, "#ffd88a", "center");
  txt("WASD andar  "+MID+"  MOUSE olhar  "+MID+"  ESPACO pular  "+MID+"  SHIFT avancar",
      W/2, 156, 12, "#6a5c46", "center");
  txt("CLIQUE atacar  "+MID+"  C agachar  "+MID+"  E abrir  "+MID+"  1 2 3 armas",
      W/2, 168, 12, "#6a5c46", "center");
  ctx.textAlign="left";
}
function screenDead(){
  ctx.fillStyle="rgba(70,8,4,.62)"; ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";
  ctx.font='700 30px "Cinzel",Georgia,serif';
  ctx.fillStyle="#2a0705"; ctx.fillText("VOCE MORREU", W/2+1, 77);
  ctx.fillStyle="#d8342c"; ctx.fillText("VOCE MORREU", W/2, 76);
  txt(ILHA ? "A ilha guarda mais um." : "A cripta guarda mais um.", W/2, 98, 16, "#c9a08a", "center");
  if (Math.sin(G.tick*3.4) > -0.3)
    txt("PRESSIONE R PARA TENTAR DE NOVO", W/2, 124, 16, "#ffd88a", "center");
  ctx.textAlign="left";
}
function screenWon(){
  ctx.fillStyle="rgba(6,10,9,.88)"; ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";
  ctx.font='700 13px "Cinzel",Georgia,serif'; ctx.fillStyle="#7a5a22";
  ctx.fillText("FASE 1 CONCLUIDA", W/2, 24);
  ctx.font='700 20px "Cinzel",Georgia,serif';
  ctx.fillStyle="#0a0806"; ctx.fillText("O SELO FOI QUEBRADO", W/2+1, 49);
  ctx.fillStyle="#63e6c8"; ctx.fillText("O SELO FOI QUEBRADO", W/2, 48);
  ctx.fillStyle="#1c8f78"; ctx.fillRect(W/2-72, 56, 144, 1);
  const mm = Math.floor(G.endTime/60), ss = Math.floor(G.endTime%60);
  const rows = [
    ["MORTES",  G.kills+" / "+G.totalKills,   Math.round(G.kills/Math.max(1,G.totalKills)*100)+"%"],
    ["ITENS",   G.items+" / "+G.totalItems,   Math.round(G.items/Math.max(1,G.totalItems)*100)+"%"],
    ["SEGREDOS",G.secrets+" / "+G.totalSecrets,Math.round(G.secrets/G.totalSecrets*100)+"%"],
    ["TEMPO",   ("0"+mm).slice(-2)+":"+("0"+ss).slice(-2), ""]
  ];
  rows.forEach((r,i)=>{
    const y = 76+i*15;
    txt(r[0], 74, y, 16, "#8d8172", "left");
    txt(r[1], 196, y, 16, "#d8ccb2", "right");
    txt(r[2], 250, y, 16, "#c8963c", "right");
  });
  const perfect = G.kills===G.totalKills && G.secrets===G.totalSecrets;
  if (perfect) txt("LIMPEZA TOTAL "+DASH+" nada respira la embaixo.", W/2, 146, 14, "#63e6c8", "center");
  if (Math.sin(G.tick*3.4) > -0.3)
    txt(VOLTA ? "E VOLTA PARA " + VOLTA.mapa.toUpperCase() + "  " + MID + "  R JOGA DE NOVO" : "PRESSIONE R PARA JOGAR DE NOVO",
        W/2, 164, VOLTA ? 14 : 15, "#ffd88a", "center");
  ctx.textAlign="left";
}

function render(){
  const shake = G.shake > 0 ? (Math.random()-0.5)*G.shake : 0;
  setCamera(shake);
  /* ?mundo=placa: o ceu e as faces saem pela placa (mundo-placa.js), e o
     software so desenha os bichos, numa imagem vazia */
  if (ligarMundoNaPlaca()) prepararMundoNaPlaca();
  else renderWorld();
  renderEntities();
  /* com a placa e alguem para ela desenhar, ela pinta o mundo e os
     personagens no canvas de baixo, e este fica transparente, so com o HUD
     (gpu.js) */
  if (gpuDesenhar()) ctx.clearRect(0, 0, RW, RH);
  else ctx.putImageData(img,0,0);
  /* HUD, arma e menus sao desenhados na tela logica de 320x200 */
  ctx.setTransform(ESC,0,0,ESC,0,0);
  if (G.mode === "play" || G.mode === "dead"){
    if (G.mapOn) drawAutomap(); else drawWeapon();
    drawHUD();
    drawOverlays();
  }
  if (G.mode === "title") screenTitle();
  else if (G.mode === "dead") screenDead();
  else if (G.mode === "won") screenWon();
  ctx.setTransform(1,0,0,1,0,0);
}

/* ============================================================
   ENTRADA
   ============================================================ */
const keys = Object.create(null);
let firing = false, locked = false;

/* ============================================================
   ENTRADA COMO DADO
   A cada passo o teclado e o mouse viram um objeto, e so ele entra na
   simulacao: update() nao le tecla nenhuma. E o que um dia trafega no fio --
   o servidor recebe entradas, nao teclas. O que e acao de uma vez (usar,
   pular, trocar de arma, usar item, dizer) entra numa fila e sai no passo
   seguinte.

   O olhar e a excecao: o mouse mexe no angulo na hora, porque atraso na mira
   se sente na mao. O angulo vai junto na entrada.
   ============================================================ */
const ACOES = [];
function lerEntrada(){
  const ent = {
    frente: (keys["w"] || keys["arrowup"] ? 1 : 0) - (keys["s"] || keys["arrowdown"] ? 1 : 0),
    lado:   (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0),
    girar:  (keys["arrowright"] ? 1 : 0) - (keys["arrowleft"] ? 1 : 0),
    subir: !!keys[" "], agachar: !!keys["c"], dash: !!keys["shift"],
    atirar: !!(tapShot || firing || keys["control"] || keys["z"]),
    ang: P.ang, pitch: P.pitch,
    acoes: ACOES.splice(0, ACOES.length)
  };
  tapShot = false;
  return ent;
}
function aplicarAcao(a, P = JOGADOR_DA_TELA){
  if (a.tipo === "usar") useDoor(P);
  else if (a.tipo === "pular") P.jumpBuf = 0.13;          // buffer: vale pular um pouco antes de pousar
  else if (a.tipo === "arma"){
    if (P.have[a.i]){ P.wpn = a.i; P.anim = 0; say(WPN[a.i].n); }
    else som("empty");
  }
  else if (a.tipo === "proxima"){ P.wpn = (P.wpn+1)%3; while (!P.have[P.wpn]) P.wpn = (P.wpn+1)%3; say(WPN[P.wpn].n); }
  else if (a.tipo === "item") usarItem(a.id, P);
  else if (a.tipo === "dizer") dizer(a.texto, P);
}

function keyName(e){ return (e.key || "").toLowerCase(); }
/* Quem escuta teclado e mouse e quem roda o laco e o p5b.js -- o canteiro
   carrega ate aqui e poe a entrada e o laco dele por cima. */
let lockFail = false, dragging = false, dragMoved = 0, tapShot = false, lastMX = 0, lastMY = 0;


/* ============================================================
   ATAQUE DO JOGADOR
   ============================================================ */
/* direcao para onde o mago aponta, ja com a inclinacao da cabeca */
function aimDir(P = JOGADOR_DA_TELA){
  const cp = Math.cos(P.pitch);
  return [Math.cos(P.ang)*cp, Math.sin(P.ang)*cp, Math.sin(P.pitch)];
}
function fire(P = JOGADOR_DA_TELA){
  if (P.dead || P.cd > 0) return;
  const w = WPN[P.wpn];
  if (!P.have[P.wpn]) return;
  if (P.mana < w.cost){ som("empty"); say("MANA INSUFICIENTE"); P.cd = 0.3; return; }
  P.mana -= w.cost; P.cd = w.cd; P.anim = w.cd; P.evilT = 0.5;
  const a = aimDir(P), eyeZ = P.z + P.eye;
  if (w.kind === "melee"){
    som("swing");
    let best = null, bd = 1e9;
    for (const e of ents){
      if (e.kind !== "enemy" || e.dead) continue;
      const dx = e.x-P.x, dy = e.y-P.y, dz = (e.z + e.d.hgt*0.5) - eyeZ;
      const d = Math.hypot(dx,dy,dz);
      if (d > w.reach) continue;
      if ((dx*a[0] + dy*a[1] + dz*a[2])/d < 0.55) continue;   // cone em 3D
      if (d < bd){ bd = d; best = e; }
    }
    if (best) agendar(0.09, ()=>{ if (!best.dead)
      hurtEnemy(best, rnd(w.dmg[0], w.dmg[1]), a[0], a[1], P); });
  } else {
    const from = {x:P.x + a[0]*0.35, y:P.y + a[1]*0.35, z:eyeZ + a[2]*0.35 - 0.06};
    shootProj(from, w.p, a[0],a[1],a[2], w.spd, w.dmg, "p", w.splash, w.sr, 0, P);
    if (w.p === "fire") som("fireball"); else som("bolt");
    G.shake = Math.max(G.shake, w.p === "fire" ? 2.4 : 0.7);
  }
}

/* ============================================================
   ATUALIZACAO
   ============================================================ */
function update(dt, ent){
  ent = ent || lerEntrada();
  G.tick += dt;
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt*1.8);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt*9);
  if (G.msgT > 0) G.msgT -= dt;

  for (let i=parts.length-1;i>=0;i--){
    const p = parts[i];
    p.life -= dt;
    p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; p.vz -= 5.2*dt;
    if (p.z < 0.03){ p.z = 0.03; p.vz = 0; p.vx *= 0.7; p.vy *= 0.7; }
    if (p.life <= 0) parts.splice(i,1);
  }
  if (G.mode !== "play"){
    contarTempos(P, dt);
    updateDoors(dt);
    if (G.mode === "dead"){ P.deadT += dt;
      P.pitch = Math.max(P.pitch - dt*1.5, -0.55);
      P.eye = Math.max(0.16, P.eye - dt*1.1); }
    return;
  }
  passoDoJogador(P, dt, ent);
  passoDoMundo(dt);

  /* --- o que e so desta tela: o automapa, o aviso do mouse, quem fala --- */
  visited[(P.y|0)*MW + (P.x|0)] = 1;
  if (P.noclip) return;
  if (lockFail && !G.hinted){                      // avisa uma vez se o mouse nao travar
    G.hinted = true; say("ARRASTE COM O MOUSE OU USE AS SETAS PARA OLHAR");
  }
  for (let y=-3;y<=3;y++) for (let x=-3;x<=3;x++){
    const tx = (P.x|0)+x, ty = (P.y|0)+y;
    if (tx>=0&&ty>=0&&tx<MW&&ty<MH && los(P.x,P.y,tx+0.5,ty+0.5)) visited[ty*MW+tx] = 1;
  }

  /* Morador e placa dizem o nome ou o texto quando se chega perto. Uma vez
     por aproximacao: so volta a falar depois que voce se afasta. */
  for (const e of ents){
    if (e.gone || e.kind !== "cena" || !e.fala) continue;
    const perto = (e.x-P.x)*(e.x-P.x) + (e.y-P.y)*(e.y-P.y) < 2.4*2.4 && Math.abs(e.z - P.z) < 1.2;
    if (perto && G.falando !== e){ G.falando = e; say(e.fala.toUpperCase()); }
    else if (!perto && G.falando === e) G.falando = null;
  }
  /* a conversa acaba quando se afasta do morador */
  if (G.interlocutor && Math.hypot(G.interlocutor.x - P.x, G.interlocutor.y - P.y) > 4) G.interlocutor = null;
}

/* os tempos do jogador que correm sempre, ate na tela de morte */
function contarTempos(P, dt){
  if (P.painT > 0) P.painT -= dt;
  if (P.evilT > 0) P.evilT -= dt;
  if (P.cd > 0) P.cd -= dt;
  if (P.anim > 0) P.anim -= dt;
}

/* ---------- o passo de um jogador ----------
   Tudo o que a entrada de um jogador faz num passo: as acoes, o movimento, o
   pulo, o dash, a lava, o golpe e a mana. P e o parametro: no jogo sozinho,
   o da tela; no servidor do co-op, cada um, e o mundo anda uma vez depois de
   todos. */
function passoDoJogador(P, dt, ent){
  contarTempos(P, dt);
  for (const a of ent.acoes) aplicarAcao(a, P);

  /* ---------------- movimento ----------------
     Velocidade com inercia: no chao a resposta e quase imediata, no ar
     voce mantem o embalo e so corrige um pouco. E isso que faz o pulo
     e o dash valerem a pena em vez de serem enfeite. */
  const turn = ent.girar;
  if (turn) P.ang += turn * 2.6 * dt;
  const fwd = ent.frente;
  const str = ent.lado;
  let wx = 0, wy = 0;
  if (fwd || str){
    wx = Math.cos(P.ang)*fwd - Math.sin(P.ang)*str;
    wy = Math.sin(P.ang)*fwd + Math.cos(P.ang)*str;
    const L = Math.hypot(wx,wy); wx/=L; wy/=L;
  }

  /* Atravessar paredes: voa na direcao da mira, ignora colisao e gravidade.
     E a ferramenta mais util para inspecionar geometria -- da pra sair do mapa
     e olhar a sala de fora. */
  if (P.noclip){
    const cp = Math.cos(P.pitch);
    const vel = (ent.dash ? 16 : 7) * dt;
    const sobe = (ent.subir ? 1 : 0) - (ent.agachar ? 1 : 0);
    P.x += (Math.cos(P.ang)*cp*fwd - Math.sin(P.ang)*str) * vel;
    P.y += (Math.sin(P.ang)*cp*fwd + Math.cos(P.ang)*str) * vel;
    P.z += (Math.sin(P.pitch)*fwd + sobe) * vel;
    P.vx = P.vy = P.vz = 0; P.ground = false; P.bob = 0;
    P.eye += (AJUSTE.olho - P.eye) * Math.min(1, dt*14); P.h = 0.85;
    if (P.god) P.mana = P.maxMana;
    return;
  }

  /* agachar: a cabeca desce e o corpo encolhe, para passar por vaos baixos */
  const low = ceilingOver(P.x,P.y,0.26,P.z) - P.z;
  const crouching = ent.agachar || low < 0.9;
  P.eye += ((crouching ? Math.min(0.32, AJUSTE.olho) : AJUSTE.olho) - P.eye) * Math.min(1, dt*14);
  P.h = crouching ? 0.55 : 0.85;
  /* A velocidade do painel de ajuste multiplica andar, agachar e o controle
     no ar. O dash fica como esta: ele e uma distancia, nao um ritmo. */
  const ritmo = AJUSTE.vel/100;
  const maxSpd = (crouching ? 2.0 : 4.7) * ritmo;

  /* dash: duas cargas, recarrega uma de cada vez */
  if (P.dashCd > 0){ P.dashCd -= dt;
    if (P.dashCd <= 0 && P.dashN < 2){ P.dashN++; if (P.dashN < 2) P.dashCd = 0.85; } }
  if (ent.dash && !P.dashHeld && P.dashN > 0 && P.dashT <= 0 && !P.dead){
    P.dashHeld = true; P.dashN--; if (P.dashCd <= 0) P.dashCd = 0.85;
    const dx = (wx||wy) ? wx : Math.cos(P.ang), dy = (wx||wy) ? wy : Math.sin(P.ang);
    P.dashVx = dx*13.5; P.dashVy = dy*13.5; P.dashT = 0.17;
    som("dash"); G.shake = Math.max(G.shake, 1.3);
  }
  if (!ent.dash) P.dashHeld = false;

  if (P.dashT > 0){ P.dashT -= dt; P.vx = P.dashVx; P.vy = P.dashVy; }
  else if (P.ground){
    const k = Math.min(1, dt*15);
    P.vx += (wx*maxSpd - P.vx)*k; P.vy += (wy*maxSpd - P.vy)*k;
  } else {
    P.vx += wx*12*ritmo*dt; P.vy += wy*12*ritmo*dt;     // controle no ar
    const s2 = Math.hypot(P.vx,P.vy), cap = maxSpd*1.4;
    if (s2 > cap){ P.vx = P.vx/s2*cap; P.vy = P.vy/s2*cap; }
  }

  /* pulo, com buffer e coyote time */
  if (P.jumpBuf > 0) P.jumpBuf -= dt;
  if (P.jumpBuf > 0 && (P.ground || P.coyote > 0)){
    P.vz = JUMPV; P.ground = false; P.coyote = 0; P.jumpBuf = 0; som("jump");
  }
  P.vz -= GRAV*dt;
  P.z += P.vz*dt;

  /* horizontal, com subida automatica de degrau */
  const bx = P.x, by = P.y;
  if (P.vx || P.vy) slide(P, P.vx*dt, P.vy*dt, 0.26, P.z, P.h, false);
  const moved = Math.hypot(P.x-bx, P.y-by);
  if (moved < 1e-6 && (P.vx||P.vy)){ P.vx *= 0.25; P.vy *= 0.25; }

  const gz = groundUnder(P.x, P.y, 0.26, P.z);
  if (P.ground && gz > P.z && gz - P.z <= STEP) P.z = gz;   // sobe degrau andando
  if (P.z <= gz + 1e-4){
    if (!P.ground && P.vz < -5.5){
      som("land"); G.shake = Math.max(G.shake, Math.min(2.6, -P.vz*0.22));
    }
    P.z = gz; P.vz = 0; P.ground = true; P.coyote = 0.10;
  } else {
    P.ground = false;
    if (P.coyote > 0) P.coyote -= dt;
  }
  const cz = ceilingOver(P.x, P.y, 0.26, P.z);
  if (P.z + P.h > cz){ P.z = Math.max(gz, cz - P.h); if (P.vz > 0) P.vz = 0; }

  P.bobT += moved*7.5;
  P.bob = P.ground ? Math.sin(P.bobT)*0.018 : 0;
  P.passada += moved*0.5;    // um ciclo completo de passo (os dois pes) a cada 2 tiles andados

  /* --- lava --- */
  const ptx = P.x|0, pty = P.y|0;
  if (cellAt(ptx,pty) === "~" && P.z < floorAt(ptx,pty) + 0.28){
    P.lavaT += dt;
    if (P.lavaT > 0.40){
      P.lavaT = 0; som("lava");
      hurtPlayer(rnd(5,9), true, P);                 // lava queima atraves do escudo
      G.flashCol = "#e2620e";
    }
  } else P.lavaT = 0;

  /* --- tiro --- */
  if (ent.atirar) fire(P);

  if (P.god) P.mana = P.maxMana;

  /* --- fervor: matar rapido mantem a chama acesa e devolve mana --- */
  if (P.fervorT > 0){ P.fervorT -= dt; if (P.fervorT <= 0) P.fervor = 0; }
  const fCap = 20 + P.fervor*45;
  if (P.mana < fCap) P.mana = Math.min(fCap, P.mana + dt*(1.6 + P.fervor*5));
}

/* ---------- o passo do mundo ----------
   Uma vez por passo, para todos os jogadores: o relogio, a agenda (os golpes
   marcados), as portas, os bichos, os itens e os projeteis. */
function passoDoMundo(dt){
  G.time += dt;
  rodarAgenda();
  updateDoors(dt);
  for (const e of ents){
    if (e.gone) continue;
    if (e.kind === "enemy") updateEnemy(e, dt);
    else if (e.kind === "andarilho") passoDoAndarilho(e, dt);
    else if (e.kind === "item"){
      /* o item e do primeiro que encosta e precisa dele */
      for (const J of JOGADORES)
        if (!J.dead && !J.noclip && Math.hypot(e.x-J.x, e.y-J.y) < 0.62 &&
            e.z < J.z + J.h + 0.5 && e.z + 0.7 > J.z && pickup(e, J)) break;
    }
  }
  updateProjs(dt);
}

/* ============================================================
   CONVERSA E BOLSA
   Enter abre a linha de fala. O que se diz vai para o morador mais perto, a
   menos de tres tiles, e as regras da resposta moram em conversa.js. As
   ultimas falas ficam no canto da tela, com as palavras-chave em outra cor:
   e o que se pode perguntar em seguida.
   ============================================================ */
const COR_CHAVE = "#8fd0ff";
function dizer(texto, P = JOGADOR_DA_TELA){
  G.conversa.push({quem:"Voc" + String.fromCharCode(234), fala:texto, t:G.tick});   // o fonte e ASCII (ver MID)
  let morador = null, dm = 3.2;
  for (const e of ents){
    if (e.kind !== "cena" || e.type !== "npc" || !e.fala) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (d < dm && Math.abs(e.z - P.z) < 1.5){ dm = d; morador = e; }
  }
  if (morador){
    const r = responder(morador.fala, texto, {falando: G.interlocutor === morador, ouro: P.ouro});
    G.interlocutor = r.falando ? morador : null;
    if (r.fala) G.conversa.push({quem:nomeCurto(morador.fala), fala:r.fala, t:G.tick});
    if (r.acao && r.acao.compra){
      P.ouro -= r.acao.preco;
      if (r.acao.compra === "escudo") P.armor = Math.min(100, P.armor + 50);
      else P.bolsa[r.acao.compra] = (P.bolsa[r.acao.compra] || 0) + 1;
      som("pickup");
    }
    if (r.acao && r.acao.cura){ P.hp = Math.max(P.hp, 100); som("pickup"); }
  }
  if (G.conversa.length > 12) G.conversa.splice(0, G.conversa.length - 12);
}
function usarItem(id, P = JOGADOR_DA_TELA){
  if (!P.bolsa[id]){ som("empty"); say(id === "pocao" ? "NENHUMA POCAO NA BOLSA" : "NENHUM CRISTAL NA BOLSA"); return; }
  P.bolsa[id]--;
  if (id === "pocao") P.hp = Math.max(P.hp, Math.min(100, P.hp + 25));
  else P.mana = Math.max(P.mana, Math.min(P.maxMana, P.mana + 30));
  som("pickup");
  say(id === "pocao" ? "POCAO DE CURA +25" : "CRISTAL DE MANA +30");
}
/* quebra uma fala em linhas que cabem na tela, cada pedaco com a cor dele */
function linhasDaFala(l, largura){
  const linhas = [[]];
  let x = 0;
  const partes = [{texto:l.quem + ": ", cor:"#c8963c"}].concat(partesDaFala(l.fala).map(function(p){
    return {texto:p.texto, cor:p.chave ? COR_CHAVE : "#e6d8b8"};
  }));
  for (const p of partes) for (const palavra of p.texto.split(/(?<= )/)){
    const w = ctx.measureText(palavra).width;
    if (x + w > largura && x > 0){ linhas.push([]); x = 0; }
    linhas[linhas.length - 1].push({texto:palavra, cor:p.cor, x:x});
    x += w;
  }
  return linhas;
}
function desenharConversa(){
  ctx.font = '11px "VT323","Lucida Console",monospace';
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  let linhas = [];
  for (const l of G.conversa) if (G.tick - l.t < 16) linhas = linhas.concat(linhasDaFala(l, W - 14));
  linhas = linhas.slice(-5);
  /* a conversa sobe acima dos paineis de baixo */
  let y = HUD_Y - (G.falaAberta ? 21 : 8) - (linhas.length - 1)*10;
  for (const linha of linhas){
    for (const s of linha){
      ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillText(s.texto, 7 + s.x, y + 1);
      ctx.fillStyle = s.cor; ctx.fillText(s.texto, 6 + s.x, y);
    }
    y += 10;
  }
  if (G.falaAberta){
    ctx.fillStyle = "rgba(10,8,6,.82)"; ctx.fillRect(4, HUD_Y - 17, W - 8, 13);
    txt("> " + G.falaTexto + (Math.sin(G.tick*6) > 0 ? "_" : ""), 7, HUD_Y - 7, 12, "#ffd88a");
  }
}
function desenharBolsa(){
  const x = W - 146, y = 34, w = 140, h = 50;
  ctx.fillStyle = "rgba(10,8,6,.86)"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#7a5a22"; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y+h-1, w, 1);
  txt("BOLSA", x+6, y+12, 13, "#c8963c");
  txt(P.ouro + " OURO", x+w-6, y+12, 12, "#ffd88a", "right");
  txt("POCAO DE CURA", x+6, y+26, 12, "#8d8172");   txt("x" + P.bolsa.pocao + "   4", x+w-6, y+26, 12, "#e6d8b8", "right");
  txt("CRISTAL DE MANA", x+6, y+38, 12, "#8d8172"); txt("x" + P.bolsa.cristal + "   5", x+w-6, y+38, 12, "#e6d8b8", "right");
}

/* ============================================================
   PAINEL DE AJUSTE
   Para achar jogando os valores que ainda nao estao decididos. Velocidade,
   campo de visao e altura dos olhos mudam juntos a sensacao de andar
   depressa, entao ficam lado a lado. Cada tecla mostra o valor novo; P abre
   o painel com todos.
   ============================================================ */
const TECLAS_DE_AJUSTE = ["h","j","y","u","i","o","t","f","p","l","9"];
const PASSO_DE_AJUSTE = {h:["vel",-5], j:["vel",5], y:["fov",-5], u:["fov",5], i:["olho",-0.05], o:["olho",0.05]};
const decimal = (v, casas)=> v.toFixed(casas).replace(".", ",");
const MEDIDA = {ms:0, fps:60};
/* 100 sao 4,7 tiles por segundo, e um tile mede uns 2 metros */
const metrosPorSegundo = ()=> 4.7*AJUSTE.vel/100*2;

function textoDoAjuste(campo){
  if (campo === "vel") return "VELOCIDADE " + AJUSTE.vel + "  (" + decimal(metrosPorSegundo(), 1) + " M/S)";
  if (campo === "fov") return "CAMPO DE VISAO " + AJUSTE.fov + " GRAUS";
  if (campo === "olho") return "ALTURA DOS OLHOS " + decimal(AJUSTE.olho*2, 2) + " M";
  if (campo === "densidade") return "PERSONAGEM EM " + (CORPO_DESENHADO ? CORPO_DESENHADO.DZ : 117) + " VOXELS";
  return "RESOLUCAO " + RW + "X" + RH;
}
/* troca o corpo pela altura pedida (0: a do proprio corpo) */
function aplicarDensidade(){
  if (!CORPO_NATIVO) return;
  const h = AJUSTE.densidade || CORPO_NATIVO.DZ;
  if (CORPO_DESENHADO && CORPO_DESENHADO.DZ === Math.min(h, CORPO_NATIVO.DZ)) return;
  usarCorpoDesenhado(corpoNaAltura(h));
}
function ajustar(k){
  if (k === "p"){ G.painel = !G.painel; return; }
  if (k === "l"){
    if (!G.painel) return;                   // so com o painel aberto, para nao apagar sem querer
    const esc = AJUSTE.esc;
    Object.assign(AJUSTE, AJUSTE_PADRAO);
    if (AJUSTE.esc !== esc) alocarTela(AJUSTE.esc);
    aplicarDensidade();
    prepararCamera(); encaixarTela(); guardarAjuste();
    say("AJUSTES DE VOLTA AO PADRAO");
    return;
  }
  if (k === "f"){
    AJUSTE.quadro = !AJUSTE.quadro; guardarAjuste();
    say(AJUSTE.quadro ? "CONTADOR DE QUADRO LIGADO" : "CONTADOR DE QUADRO DESLIGADO");
    return;
  }
  /* a densidade do personagem: so com o painel aberto, porque assar de novo
     leva uns segundos (o boneco antigo fica ate o novo ficar pronto) */
  if (k === "9"){
    if (!G.painel) return;
    const lista = alturasPossiveis();
    if (lista.length < 2){ say("ESTE CORPO SO TEM " + (CORPO_DESENHADO ? CORPO_DESENHADO.DZ : 117) + " VOXELS"); return; }
    const agora = CORPO_DESENHADO.DZ, i = lista.indexOf(agora);
    const h = lista[(i + 1) % lista.length];
    AJUSTE.densidade = h === CORPO_NATIVO.DZ ? 0 : h;
    aplicarDensidade(); guardarAjuste();
    say(textoDoAjuste("densidade"));
    return;
  }
  if (k === "t"){
    AJUSTE.esc = RESOLUCOES[(RESOLUCOES.indexOf(AJUSTE.esc) + 1) % RESOLUCOES.length];
    alocarTela(AJUSTE.esc); prepararCamera(); encaixarTela(); guardarAjuste();
    say(textoDoAjuste("esc"));
    return;
  }
  const passo = PASSO_DE_AJUSTE[k];
  if (!passo) return;
  const campo = passo[0], lim = LIMITES[campo];
  AJUSTE[campo] = clamp(Math.round((AJUSTE[campo] + passo[1])*100)/100, lim[0], lim[1]);
  if (campo === "fov") prepararCamera();
  guardarAjuste();
  say(textoDoAjuste(campo));
}
function desenharPainel(){
  const linhas = [
    ["VELOCIDADE",       String(AJUSTE.vel),        decimal(metrosPorSegundo(), 1) + " M/S", "H J"],
    ["CAMPO DE VISAO",   String(AJUSTE.fov),        "GRAUS", "Y U"],
    ["ALTURA DOS OLHOS", decimal(AJUSTE.olho*2, 2), "M",     "I O"],
    ["RESOLUCAO",        RW + "X" + RH,             "",      "T"],
    ["PERSONAGEM",       String(CORPO_DESENHADO ? CORPO_DESENHADO.DZ : 117), "VOXELS", "9"],
    ["QUADRO",           AJUSTE.quadro ? decimal(MEDIDA.ms, 1) : "--",
                         AJUSTE.quadro ? "MS" : "DESLIGADO", "F"]
  ];
  const x = 6, y = 20, w = 244, h = 34 + linhas.length*12;
  ctx.fillStyle = "rgba(10,8,6,.86)"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#7a5a22"; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y+h-1, w, 1);
  txt("AJUSTE", x+6, y+13, 13, "#c8963c");
  txt("P FECHA", x+w-6, y+13, 12, "#6a5c46", "right");
  linhas.forEach((l, i)=>{
    const ly = y + 27 + i*12;
    txt(l[0], x+6,   ly, 12, "#8d8172");
    txt(l[1], x+146, ly, 13, "#ffd88a", "right");
    txt(l[2], x+150, ly, 12, "#8d8172");
    txt(l[3], x+w-6, ly, 12, "#6a5c46", "right");
  });
  txt("L VOLTA TUDO AO PADRAO", x+6, y+h-4, 12, "#6a5c46");
}
function desenharQuadro(){
  txt(decimal(MEDIDA.ms, 1) + " MS  " + MID + "  " + Math.round(MEDIDA.fps) + " FPS",
      W-6, HUD_Y-8, 13, "#9fbf6a", "right");
  if (MUNDO_PLACA.ativo && MUNDO_PLACA.ultimo) txt("MUNDO NA PLACA  " + MUNDO_PLACA.ultimo.pedacos + " PEDACOS  " + MID + "  " + Math.round(MUNDO_PLACA.ultimo.faces/1000) + " MIL FACES",
      W-6, HUD_Y-32, 11, "#9fbf6a", "right");
  else if (MUNDO_PLACA.pedido && MUNDO_PLACA.motivo) txt("MUNDO NA PLACA: " + MUNDO_PLACA.motivo.toUpperCase().slice(0, 40), W-6, HUD_Y-32, 11, "#d8342c", "right");
  if (GPU.ativo && GPU.ultimo) txt("GPU  " + GPU.ultimo.personagens + " PERSONAGENS  " + MID + "  " + Math.round(GPU.ultimo.voxels/1000) + " MIL VOXELS",
      W-6, HUD_Y-20, 11, "#9fbf6a", "right");
}

/* ============================================================
   TAMANHO NA PAGINA
   Cada pixel do jogo vira um numero inteiro de pixels do monitor -- pixels
   de verdade, contados com devicePixelRatio, nao pixels de CSS. Com escala
   quebrada o navegador dobra umas colunas e outras nao, e a tela fica com
   pixels de larguras diferentes, que e o que cansa a vista numa tela grande.

   O pixel e quadrado e a tela e 16:9: em tela cheia, 640x360 fecha inteiro
   em 720p (2x), Full HD (3x), 1440p (4x) e 4K (6x).
   ============================================================ */
function encaixarTela(){
  const pagina = document.querySelector ? document.querySelector(".cabinet") : null;
  const moldura = cvs.parentElement ? cvs.parentElement.parentElement : null;
  if (!pagina || !moldura || typeof getComputedStyle !== "function") return;
  const dpr = window.devicePixelRatio || 1;
  const m = getComputedStyle(moldura);
  const folgaX = parseFloat(m.paddingLeft) + parseFloat(m.paddingRight) + 4;   // mais as bordas
  const folgaY = parseFloat(m.paddingTop) + parseFloat(m.paddingBottom) + 4;
  const cabeX = (pagina.clientWidth - folgaX) * dpr;
  const cabeY = (innerHeight - folgaY - 16) * dpr;
  let k = Math.min(cabeX / RW, cabeY / RH);
  if (k >= 1) k = Math.floor(k);             // janela menor que 1x: encolhe como der
  cvs.style.maxWidth = "none";
  cvs.style.aspectRatio = "auto";
  cvs.style.width = (RW*k/dpr) + "px";
  cvs.style.height = (RH*k/dpr) + "px";
  const linha = k;                           // uma linha do jogo, em pixels do monitor
  cvs.parentElement.style.setProperty("--linha", (linha/dpr) + "px");
  const scan = cvs.parentElement.querySelector(".scan");
  if (scan) scan.hidden = linha < 3;         // risco mais fino que isso vira moire
}