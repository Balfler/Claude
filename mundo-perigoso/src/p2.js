
/* ============================================================
   A CRIPTA DE VHALGORN  --  320x200, geometria 3D
   Legenda do mapa:
     #  pedra   =  coluna/tijolo   R  parede runica   ~  lava
     D  porta   L  porta selada    S  parede secreta  x  portal de saida
     p  jogador  k  chave runica   t  tocha
     i  diabrete  g  goblin arqueiro  w  cavaleiro espectral  Z  Vhalgorn
     h  pocao     m  cristal de mana  a  escudo  A  alma (segredo)
     s  aranha (chao)   b  morcego (voa)
   ============================================================ */
const MAPA_CRIPTA = [
"########################################", //  0
"########################################", //  1
"########################################", //  2
"##################t.i...............t###", //  3
"##################....b...........g..###", //  4
"##################....~~~~~.~~~~~....###", //  5
"##################....~~~~.k.~~~~....###", //  6
"##################....~~~~...~~~~....###", //  7
"##################....~~~~~~~~~~~....###", //  8
"##################....i..............###", //  9
"##################.m..........i......###", // 10
"#########################.########.#####", // 11
"#########################.########.#####", // 12
"##.t.........t.#####........w.####.#####", // 13
"##........s....#####.g........####.#####", // 14
"##...=.....=...#####..=....=..#.A#.#####", // 15
"##....b........#####.........a#..#.#####", // 16
"##..............D.............S..#.#####", // 17
"##.............#####..s.i.....#..#.#####", // 18
"##...=.....=...#####..=....=..#..#.#####", // 19
"##.a.........h.#####.h........####.#####", // 20
"##..g.......i..#####..........####.#####", // 21
"#######...########################L#####", // 22
"#######...########################.#####", // 23
"#######.i.################.t........t.##", // 24
"#######...################..i...b..g..##", // 25
"###.t......t.#############............##", // 26
"###..s.......#############.....Z......R#", // 27
"###..........#############............x#", // 28
"###....p.....#############..h....m..w.R#", // 29
"###..........#############............##", // 30
"########################################"  // 31
];
/* Aberto com um mapa do editor, ele toma o lugar da cripta -- ver ilha.js. */
/* A grade que o motor anda. Muda quando o mundo e trocado -- ver trocarMundo. */
let MAP = ILHA_MOTOR ? ILHA_MOTOR.linhas : MAPA_CRIPTA;
let MW = MAP[0].length, MH = MAP.length;

/* ---------- ajustes do jogador ----------
   O painel de ajuste (tecla P) muda estes valores com o jogo rodando, para
   achar os certos testando, e eles ficam guardados no navegador.
     vel     velocidade andando, em porcentagem: 100 sao 4,7 tiles por segundo
     fov     campo de visao horizontal, em graus
     olho    altura dos olhos, em tiles
     esc     quantas vezes a resolucao do mundo e maior que 320x180: 1, 2, 3 ou 4 (HD, 1280x720)
     quadro  contador de quadro ligado */
const CHAVE_AJUSTE = "cripta-vhalgorn:ajuste";
/* 65 e a velocidade decidida jogando: uns 6 m/s, 3 tiles por segundo. Menos
   que isso ficou arrastado. 96 graus na tela 16:9 abrem na vertical os mesmos
   32 graus que 90 abriam na tela antiga.

   `versao` marca o ajuste guardado depois da tela 16:9. De um guardado antes
   so se aproveitam velocidade, olhos e contador: campo de visao e resolucao
   mudaram de sentido, e esc 1 deixou de ser a tela padrao. A versao 3 (1/10)
   e a do HD de fabrica: de um guardado na 2 a tela nao se aproveita, porque
   la ela era 640x360 sem ninguem ter escolhido. */
/* `densidade` e a altura do personagem em voxels (117, 165 ou 256); 0 e a do
   proprio corpo, a mais alta que ele tem. */
const AJUSTE_PADRAO = {versao:3, vel:65, fov:96, olho:0.60, esc:4, quadro:false, densidade:0};
const LIMITES = {vel:[30,200], fov:[60,110], olho:[0.30,0.85]};
const RESOLUCOES = [2, 3, 4, 1];                 // 640x360, 960x540, 1280x720 (HD) e 320x180: T passa de uma a outra
const AJUSTE = Object.assign({}, AJUSTE_PADRAO);
try {
  const lido = JSON.parse(localStorage.getItem(CHAVE_AJUSTE) || "null");
  if (lido){
    const novo = lido.versao === 2 || lido.versao === 3;
    for (const k in LIMITES){
      if (k === "fov" && !novo) continue;
      const v = lido[k];
      if (typeof v === "number" && v >= LIMITES[k][0] && v <= LIMITES[k][1]) AJUSTE[k] = v;
    }
    if (lido.versao === 3 && RESOLUCOES.indexOf(lido.esc) >= 0) AJUSTE.esc = lido.esc;
    AJUSTE.quadro = lido.quadro === true;
    if ([117, 165, 256].indexOf(lido.densidade) >= 0) AJUSTE.densidade = lido.densidade;
  }
} catch(e){}
function guardarAjuste(){
  try { localStorage.setItem(CHAVE_AJUSTE, JSON.stringify(AJUSTE)); } catch(e){}
}

/* ---------- constantes de tela ----------
   W e H sao a tela logica de 320x180, em 16:9: o HUD, os menus, a mira e a
   arma sao desenhados nela, sempre. O mundo 3D e rasterizado num buffer de
   ESC vezes a tela logica -- 640x360 no padrao, 320x180 na opcao leve -- e o
   HUD entra por cima com a mesma escala. O pixel e quadrado, e o mundo vai
   ate embaixo: VH, a altura da vista, e a tela inteira. */
const W = 320, H = 180, VH = H;
const cvs = document.getElementById("screen");
/* A placa de video desenha os personagens em 3D (gpu.js) por padrao, quando o
   navegador tem WebGL2: quem confere e o carregador da pagina (p1.html), que
   deixa a resposta em PLACA_3D. ?gpu=nao desliga e ?gpu=sim forca. */
const PLACA_PEDIDA = typeof BUSCA_INICIAL === "string" && !/[?&]gpu=nao/.test(BUSCA_INICIAL) &&
  (/[?&]gpu=sim/.test(BUSCA_INICIAL) || (typeof self !== "undefined" && self.PLACA_3D === true));
/* opaca, salvo com a placa: ai ela desenha o mundo num canvas embaixo e esta
   so leva o HUD, com o resto transparente (gpu.js) */
const ctx = cvs.getContext("2d", {alpha: PLACA_PEDIDA});
let ESC = 2, RW = W*2, RH = H*2, RVH = VH*2, img = null, buf = null;
function alocarTela(esc){
  ESC = esc; RW = W*esc; RH = H*esc; RVH = VH*esc;
  cvs.width = RW; cvs.height = RH;
  ctx.imageSmoothingEnabled = false;       // mudar o tamanho do canvas zera o contexto
  img = ctx.createImageData(RW, RH);
  buf = new Uint32Array(img.data.buffer);
}
alocarTela(AJUSTE.esc);

/* ---------- utilitarios ---------- */
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const rnd   = (a,b) => a + Math.random()*(b-a);
const TAU   = Math.PI*2;

/* indice de quadro sempre positivo, mesmo se o relogio andar pra tras */
function frameIdx(t, n){ const i = (t|0) % n; return i < 0 ? i + n : i; }

function cellAt(x,y){
  if (x<0||y<0||x>=MW||y>=MH) return "#";
  return MAP[y][x];
}

/* ---------- geracao de texturas ---------- */
const TS = 64;
const tcan = document.createElement("canvas");
tcan.width = tcan.height = TS;
const tc = tcan.getContext("2d", {willReadFrequently:true});

/* Um colormap por nivel de luz -- e assim que o Doom escurecia com a
   distancia, e e o que da o degrade em bandas em vez de liso.

   `fog` muda para onde a cor caminha quando escurece. Sem ele, tudo vai para
   o preto, que e o certo dentro da cripta. Ao ar livre isso fica errado: uma
   montanha longe nao escurece, ela *desbota* na cor do horizonte. Passando a
   cor do horizonte aqui, a mesma tabela vira nevoa sem custar nada no laco
   de desenho. */
function makeTex(draw, fog){
  tc.clearRect(0,0,TS,TS);
  tc.save(); draw(tc, TS); tc.restore();
  const d = new Uint32Array(tc.getImageData(0,0,TS,TS).data.buffer).slice();
  return shadeStack(d, TS, TS, fog);
}

/* As texturas da ilha em TEXTURA_POR_TILE (ilha.js): em 128, a receita
   continua escrita em 64 e o canvas e escalado por E -- as formas ficam do
   mesmo tamanho no tile --, e o que e fino (folha, pedrisco, grao, risco de
   um pixel) as receitas pintam em pixel de 128 (FI, N2, AL em texturasDaIlha). */
const TEX_E = TEXTURA_POR_TILE/64;
let tcanE = null, tcE = null;
function makeTexIlha(draw, fog){
  if (TEX_E === 1) return makeTex(draw, fog);
  const N = TS*TEX_E;
  if (!tcanE){ tcanE = document.createElement("canvas"); tcanE.width = tcanE.height = N; tcE = tcanE.getContext("2d", {willReadFrequently:true}); }
  tcE.clearRect(0,0,N,N);
  tcE.save(); tcE.scale(TEX_E, TEX_E); GRAO_E = TEX_E;
  try { draw(tcE, TS); } finally { GRAO_E = 1; tcE.restore(); }
  const d = new Uint32Array(tcE.getImageData(0,0,N,N).data.buffer).slice();
  return comMips(shadeStack(d, N, N, fog));
}

let seed = 1337;
function nrnd(){ seed = (seed*1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }

/* GRAO_E: enquanto a ilha pinta em 128 (makeTexIlha), o grao e de pixel de
   128 -- E*E vezes mais graos, cada um de 1/E --, e nao de 64 ampliado */
let GRAO_E = 1;
function grain(c, amt, n, size){
  const E = GRAO_E;
  for (let i=0;i<n*E*E;i++){
    const a = (nrnd()*2-1)*amt;
    c.fillStyle = a>0 ? "rgba(255,240,215,"+ a.toFixed(3) +")" : "rgba(0,0,0,"+ (-a).toFixed(3) +")";
    c.fillRect(((nrnd()*TS*E)|0)/E, ((nrnd()*TS*E)|0)/E, (size||1)/E, (size||1)/E);
  }
}
function bricks(c, base, mortar, rows, hi){
  c.fillStyle = mortar; c.fillRect(0,0,TS,TS);
  const bh = TS/rows;
  for (let r=0;r<rows;r++){
    const off = (r%2) ? bh : 0;
    for (let x=-bh*2; x<TS; x+=bh*2){
      c.fillStyle = base; c.fillRect(x+off+1, r*bh+1, bh*2-2, bh-2);
      c.fillStyle = hi;   c.fillRect(x+off+1, r*bh+1, bh*2-2, 1);
    }
  }
}

const TEX = {};

TEX.stone = makeTex(function(c){                 // pedra fria da entrada
  bricks(c, "#4d4a44", "#22201d", 8, "#5f5b53");
  grain(c,.14,900); grain(c,.10,120,2);
});
TEX.moss = makeTex(function(c){                  // tijolo com musgo (salao/biblioteca)
  bricks(c, "#57503f", "#221f18", 8, "#6b6350");
  for (let i=0;i<220;i++){
    c.fillStyle = "rgba(74,102,52,"+(0.10+nrnd()*0.35).toFixed(2)+")";
    c.fillRect((nrnd()*TS)|0,(nrnd()*TS)|0, 1+(nrnd()*3|0), 1+(nrnd()*3|0));
  }
  grain(c,.13,800);
});
TEX.column = makeTex(function(c){                // coluna estriada
  const g = c.createLinearGradient(0,0,TS,0);
  g.addColorStop(0,"#2b2823"); g.addColorStop(.35,"#7a7264");
  g.addColorStop(.55,"#8d8473"); g.addColorStop(1,"#2f2b25");
  c.fillStyle = g; c.fillRect(0,0,TS,TS);
  for (let x=4;x<TS;x+=8){ c.fillStyle="rgba(0,0,0,.32)"; c.fillRect(x,0,2,TS); }
  c.fillStyle="#9a8f7a"; c.fillRect(0,0,TS,5); c.fillRect(0,TS-6,TS,6);
  c.fillStyle="rgba(0,0,0,.4)"; c.fillRect(0,5,TS,2); c.fillRect(0,TS-8,TS,2);
  grain(c,.10,500);
});
TEX.obsid = makeTex(function(c){                 // obsidiana da camara de lava
  c.fillStyle="#241a18"; c.fillRect(0,0,TS,TS);
  for (let i=0;i<70;i++){
    c.fillStyle = "rgba(60,40,36,"+(0.3+nrnd()*0.5).toFixed(2)+")";
    const x=nrnd()*TS, y=nrnd()*TS, r=3+nrnd()*9;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+r,y+r*0.6); c.lineTo(x+r*0.4,y+r); c.closePath(); c.fill();
  }
  for (let i=0;i<26;i++){                        // veios de magma
    c.strokeStyle = "rgba(226,104,32,"+(0.25+nrnd()*0.5).toFixed(2)+")";
    c.lineWidth = 1+nrnd();
    c.beginPath(); let x=nrnd()*TS, y=nrnd()*TS; c.moveTo(x,y);
    for(let s=0;s<4;s++){ x+=(nrnd()*2-1)*9; y+=nrnd()*10; c.lineTo(x,y); }
    c.stroke();
  }
  grain(c,.12,600);
});
TEX.crypt = makeTex(function(c){                 // pedra da cripta com ossos
  bricks(c, "#3c3a3e", "#1b1a1d", 4, "#4c4a50");
  c.strokeStyle="rgba(214,204,178,.5)"; c.lineWidth=2;
  for (let i=0;i<9;i++){
    const x=nrnd()*TS, y=nrnd()*TS, a=nrnd()*TAU, l=6+nrnd()*12;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+Math.cos(a)*l, y+Math.sin(a)*l); c.stroke();
  }
  grain(c,.12,700);
});
TEX.rune = makeTex(function(c){                  // parede runica (emissiva)
  bricks(c, "#2e3242", "#171923", 4, "#3b4157");
  c.strokeStyle="#79b6ff"; c.lineWidth=2; c.lineCap="round";
  c.shadowColor="#79b6ff"; c.shadowBlur=6;
  const gl = [[16,12,48,12],[32,12,32,52],[16,32,48,32],[20,52,32,40],[44,52,32,40],[16,20,24,12],[48,20,40,12]];
  for (const g of gl){ c.beginPath(); c.moveTo(g[0],g[1]); c.lineTo(g[2],g[3]); c.stroke(); }
  c.shadowBlur=0;
});
TEX.wood = makeTex(function(c){                  // porta de carvalho com ferragem
  c.fillStyle="#4a3320"; c.fillRect(0,0,TS,TS);
  for (let x=0;x<TS;x+=8){
    c.fillStyle = x%16 ? "#573c26" : "#3f2b1a"; c.fillRect(x,0,7,TS);
    c.fillStyle="rgba(0,0,0,.35)"; c.fillRect(x+7,0,1,TS);
  }
  c.fillStyle="#6b6152"; c.fillRect(0,8,TS,6); c.fillRect(0,TS-14,TS,6);
  c.fillStyle="#918576";
  for (let x=4;x<TS;x+=12){ c.fillRect(x,9,3,3); c.fillRect(x,TS-13,3,3); }
  c.fillStyle="#2a2018"; c.beginPath(); c.arc(TS-14,TS/2,4,0,TAU); c.fill();
  grain(c,.10,400);
});
TEX.sealed = makeTex(function(c){                // porta selada (chave runica)
  bricks(c, "#28374c", "#141d29", 4, "#33465f");
  c.strokeStyle="#7fc4ff"; c.lineWidth=3; c.shadowColor="#7fc4ff"; c.shadowBlur=8;
  c.beginPath(); c.arc(TS/2,TS/2,17,0,TAU); c.stroke();
  c.beginPath();
  for (let i=0;i<5;i++){
    const a=-Math.PI/2+i*TAU/5, x=TS/2+Math.cos(a)*17, y=TS/2+Math.sin(a)*17;
    if (i) c.lineTo(x,y); else c.moveTo(x,y);
  }
  c.closePath(); c.stroke(); c.shadowBlur=0;
});
TEX.portal = makeTex(function(c){                // portal de saida
  const g = c.createRadialGradient(TS/2,TS/2,2,TS/2,TS/2,34);
  g.addColorStop(0,"#eaffff"); g.addColorStop(.28,"#63e6c8");
  g.addColorStop(.62,"#1c8f78"); g.addColorStop(1,"#062018");
  c.fillStyle="#0a1a16"; c.fillRect(0,0,TS,TS);
  c.fillStyle=g; c.fillRect(0,0,TS,TS);
  c.strokeStyle="rgba(220,255,245,.55)"; c.lineWidth=1;
  for (let i=0;i<7;i++){ c.beginPath(); c.arc(TS/2,TS/2,6+i*4.2,nrnd()*TAU,nrnd()*TAU+2); c.stroke(); }
});

TEX.floorStone = makeTex(function(c){
  c.fillStyle="#3a3730"; c.fillRect(0,0,TS,TS);
  for (let y=0;y<TS;y+=16) for (let x=0;x<TS;x+=16){
    c.fillStyle = "rgb("+(56+nrnd()*22|0)+","+(52+nrnd()*20|0)+","+(45+nrnd()*16|0)+")";
    c.fillRect(x+1,y+1,14,14);
  }
  grain(c,.13,900);
});
TEX.floorCrypt = makeTex(function(c){
  c.fillStyle="#2a282c"; c.fillRect(0,0,TS,TS);
  for (let y=0;y<TS;y+=32) for (let x=0;x<TS;x+=32){
    c.fillStyle = "rgb("+(48+nrnd()*16|0)+","+(46+nrnd()*14|0)+","+(52+nrnd()*16|0)+")";
    c.fillRect(x+1,y+1,30,30);
  }
  c.strokeStyle="rgba(120,150,200,.20)"; c.lineWidth=2;
  c.beginPath(); c.arc(TS/2,TS/2,20,0,TAU); c.stroke();
  grain(c,.10,600);
});
TEX.floorWood = makeTex(function(c){
  c.fillStyle="#3d2f21"; c.fillRect(0,0,TS,TS);
  for (let y=0;y<TS;y+=8){
    c.fillStyle = "rgb("+(58+nrnd()*22|0)+","+(44+nrnd()*16|0)+","+(30+nrnd()*12|0)+")";
    c.fillRect(0,y,TS,7);
    c.fillStyle="rgba(0,0,0,.3)"; c.fillRect(0,y+7,TS,1);
  }
  grain(c,.10,500);
});
TEX.ceilStone = makeTex(function(c){
  bricks(c,"#2f2b25","#191713",4,"#3a352d"); grain(c,.09,600);
});
TEX.ceilVoid = makeTex(function(c){
  c.fillStyle="#0b0d14"; c.fillRect(0,0,TS,TS);
  for (let i=0;i<40;i++){
    c.fillStyle="rgba(150,180,240,"+(0.10+nrnd()*0.45).toFixed(2)+")";
    c.fillRect((nrnd()*TS)|0,(nrnd()*TS)|0,1,1);
  }
});
TEX.ceilRock = makeTex(function(c){
  c.fillStyle="#1a1210"; c.fillRect(0,0,TS,TS);
  for (let i=0;i<90;i++){
    c.fillStyle="rgba(70,44,34,"+(0.2+nrnd()*0.4).toFixed(2)+")";
    c.beginPath(); c.arc(nrnd()*TS,nrnd()*TS,2+nrnd()*7,0,TAU); c.fill();
  }
  grain(c,.10,500);
});
/* Mancha de sangue, desenhada como decalque no chao sob o cadaver. O
   contorno e irregular de proposito: um circulo perfeito denuncia na hora
   que e um quadrado com textura. */
TEX.sangue = makeTex(function(c){
  c.clearRect(0,0,TS,TS);
  const cx = TS/2, cy = TS/2;
  for (let i=0;i<26;i++){                    // massa principal, lobos sobrepostos
    const a = nrnd()*TAU, d = nrnd()*9;
    const r = 11 + nrnd()*8;
    c.fillStyle = i%3 ? "#5c0f0a" : "#7d1510";
    c.beginPath(); c.ellipse(cx+Math.cos(a)*d, cy+Math.sin(a)*d, r, r*(0.7+nrnd()*0.5), a, 0, TAU); c.fill();
  }
  for (let i=0;i<10;i++){                    // respingos soltos na borda
    const a = nrnd()*TAU, d = 16 + nrnd()*11;
    c.fillStyle = "#4a0c08";
    c.beginPath(); c.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d, 1.5+nrnd()*3, 0, TAU); c.fill();
  }
  c.globalCompositeOperation = "source-atop";
  for (let i=0;i<14;i++){                    // brilho onde a poca e mais funda
    const a = nrnd()*TAU, d = nrnd()*7;
    c.fillStyle = "rgba(160,30,22,.5)";
    c.beginPath(); c.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d, 2+nrnd()*5, 0, TAU); c.fill();
  }
});

TEX.lava = [];
for (let f=0; f<4; f++){
  TEX.lava.push(makeTex(function(c){
    c.fillStyle="#e0480e"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<260;i++){
      const t = nrnd();
      c.fillStyle = t>.72 ? "rgba(255,236,150,.9)" : t>.4 ? "rgba(255,150,32,.75)" : "rgba(120,26,6,.65)";
      c.fillRect((nrnd()*TS)|0,(nrnd()*TS)|0, 2+(nrnd()*5|0), 2+(nrnd()*4|0));
    }
    for (let i=0;i<14;i++){
      c.fillStyle="rgba(46,16,10,.75)";
      c.beginPath(); c.arc(nrnd()*TS,nrnd()*TS,3+nrnd()*6,0,TAU); c.fill();
    }
  }));
}

/* ============================================================
   CEU E NEVOA
   ------------------------------------------------------------
   O ceu e uma faixa unica, amostrada em espaco de tela com deslocamento por
   guinada e inclinacao -- exatamente o que o Doom fazia. Nao e projetado em
   perspectiva, e ninguem percebe: em troca custa duas somas por pixel.

   HORIZONTE e a cor para onde tudo desbota longe. A mesma cor entra na faixa
   baixa do ceu e no `fog` dos colormaps das texturas de fora, e e isso que
   faz a montanha distante encostar no ceu em vez de virar um recorte preto.
   ============================================================ */
/* ABGR. Na cripta, brasa #5c3a2a; na ilha, a bruma do fim de tarde #c8aa8a. */
const HORIZONTE_TARDE = 0xFF8AAAC8, HORIZONTE_NOITE = 0xFF2A3A5C;
let HORIZONTE = ILHA ? HORIZONTE_TARDE : HORIZONTE_NOITE;
/* A faixa tem que ser alta o bastante para o pescoco inteiro. Olhando reto
   pra cima o deslocamento e PITCH_MAX*FY = 198 linhas, mais meia tela: sao
   282 linhas acima do horizonte. Com menos que isso o recorte prende as
   ultimas linhas e a mesma fileira de estrelas se repete tela abaixo, em
   riscos verticais -- que e o que acontecia com 172. */
/* A cripta usa uma faixa de 256 que se repete quatro vezes na volta, como o
   Doom. A ilha tem sol, e sol repetido quatro vezes ninguem aceita: a faixa
   dela da a volta inteira de uma vez so. SKY_VOLTA e quantos texels cabem
   numa volta completa -- nos dois casos a densidade na tela e a mesma. */
let SKY_W = ILHA ? 1024 : 256;
const SKY_H = 384, SKY_HOR = 296;   // linha do horizonte na textura
const SKY_VOLTA = 1024;

/* Alturas de uma serra que fecha em si mesma.

   A faixa do ceu da a volta, entao a altura no fim TEM que encontrar a do
   comeco -- senao aparece um degrau vertical na costura, que na tela parece
   uma listra fina e passa muito bem por bug de geometria. Fica aqui fora do
   desenho de proposito: assim o invariante da pra testar sem canvas. */
function serraAlturas(n, altura){
  const h = [];
  let cur = altura*0.5;
  for (let i=0;i<=n;i++){
    cur += (nrnd()-0.48)*altura*0.55;
    cur = Math.max(altura*0.15, Math.min(altura, cur));
    h.push(cur);
  }
  const mistura = Math.max(2, Math.round(n*0.3));
  for (let i=0;i<=mistura;i++){                 // cauda volta pra altura inicial
    const t = i/mistura;
    h[n-i] = h[n-i]*t + h[0]*(1-t);
  }
  return h;
}

function ceuDaNoite(){
  const c = document.createElement("canvas");
  c.width = SKY_W; c.height = SKY_H;
  const g = c.getContext("2d", {willReadFrequently:true});

  const grad = g.createLinearGradient(0,0,0,SKY_HOR);
  grad.addColorStop(0,   "#07070e");        // zenite
  grad.addColorStop(.42, "#161226");
  grad.addColorStop(.74, "#2e1c30");
  grad.addColorStop(1,   "#5c3a2a");        // brasa no horizonte
  g.fillStyle = grad; g.fillRect(0,0,SKY_W,SKY_HOR);
  g.fillStyle = "#5c3a2a"; g.fillRect(0,SKY_HOR,SKY_W,SKY_H-SKY_HOR);

  /* O zenite ganha uma margem sem estrela nenhuma: se um dia o recorte
     encostar de novo, ele repete cor chapada em vez de uma fileira de
     pontos brilhantes. */
  for (let i=0;i<580;i++){                  // estrelas, mais densas no alto
    const y = 8 + ((nrnd()*nrnd()*(SKY_HOR-8)*0.92)|0);
    const b = 0.25 + nrnd()*0.75;
    g.fillStyle = "rgba(214,222,255,"+b.toFixed(2)+")";
    g.fillRect((nrnd()*SKY_W)|0, y, 1, 1);
    if (b > 0.9) g.fillRect((nrnd()*SKY_W)|0, y, 2, 1);
  }

  const mx = 58, my = 76;                   // lua, baixa e avermelhada
  g.fillStyle = "rgba(180,120,90,.13)";
  g.beginPath(); g.arc(mx,my,26,0,TAU); g.fill();
  g.fillStyle = "#c8a882"; g.beginPath(); g.arc(mx,my,13,0,TAU); g.fill();
  g.fillStyle = "#a88a68";
  g.beginPath(); g.arc(mx-4,my-3,3.5,0,TAU); g.fill();
  g.beginPath(); g.arc(mx+5,my+4,2.5,0,TAU); g.fill();

  /* Serra recortada no horizonte, em duas camadas.

     A faixa do ceu da a volta em si mesma, entao a serra TEM que fechar: se a
     altura no fim nao encontrar a altura do comeco, aparece um degrau vertical
     no ponto da costura -- uma listra fina no ceu que parece bug de geometria
     e nao e. Por isso o passo divide a largura e a cauda e misturada de volta
     na cabeca. */
  function serra(base, altura, cor, passo){
    const n = SKY_W/passo;                  // passo divide SKY_W: fecha exato
    const h = serraAlturas(n, altura);
    g.fillStyle = cor;
    g.beginPath(); g.moveTo(0, SKY_H);
    for (let i=0;i<=n;i++) g.lineTo(i*passo, base - h[i]);
    g.lineTo(SKY_W, SKY_H); g.closePath(); g.fill();
  }
  serra(SKY_HOR+2, 30, "#3e2a34", 32);      // cordilheira distante
  serra(SKY_HOR+4, 18, "#221824", 16);      // morros da frente

  return new Uint32Array(g.getImageData(0,0,SKY_W,SKY_H).data.buffer).slice();
}

/* O ceu do fim de tarde, so da ilha.

   A faixa da a volta inteira, entao o sol aparece uma vez so: baixo, a
   oeste. Abaixo do horizonte a faixa e mar -- o motor desenha 30 tiles, e
   dali pra fora quem aparece e o ceu, entao e o ceu que tem que ser mar.
   O continente fica ao norte, longe e azulado: a terra que a ilha mostra
   antes de deixar ir. */
function ceuDaTarde(){
  const c = document.createElement("canvas");
  c.width = SKY_W; c.height = SKY_H;
  const g = c.getContext("2d", {willReadFrequently:true});
  const distVolta = function(u, alvo){ return ((u - alvo) % SKY_W + SKY_W*1.5) % SKY_W - SKY_W/2; };

  const grad = g.createLinearGradient(0,0,0,SKY_HOR);
  grad.addColorStop(0,   "#1d2a4e");        // zenite
  grad.addColorStop(.40, "#3d4f7e");
  grad.addColorStop(.68, "#8a7a98");        // lilas
  grad.addColorStop(.88, "#d49a78");        // laranja baixo
  grad.addColorStop(1,   "#c8aa8a");        // bruma: e o HORIZONTE da ilha
  g.fillStyle = grad; g.fillRect(0,0,SKY_W,SKY_HOR);

  /* Rumo PI poe o texel 512 na borda esquerda da tela, e o meio da tela
     fica um oitavo de volta adiante. */
  const sx = SKY_VOLTA/2 + SKY_VOLTA/8, sy = SKY_HOR - 34;
  const halo = g.createRadialGradient(sx, sy, 4, sx, sy, 190);
  halo.addColorStop(0,   "rgba(255,226,160,.85)");
  halo.addColorStop(.25, "rgba(246,170,100,.42)");
  halo.addColorStop(1,   "rgba(220,130,90,0)");
  g.fillStyle = halo; g.fillRect(sx-190, 0, 380, SKY_HOR);

  /* nuvens compridas, acesas de laranja do lado do sol e lilases do outro */
  for (let i=0;i<54;i++){
    const y = SKY_HOR*(0.30 + nrnd()*0.62);
    const x = nrnd()*SKY_W, w = 30 + nrnd()*150, h = 1.5 + nrnd()*3.5;
    const perto = Math.abs(distVolta(x, sx)) < 230;
    g.fillStyle = perto ? "rgba(255,196,140,"+(0.22+nrnd()*0.38).toFixed(2)+")"
                        : "rgba(150,130,165,"+(0.18+nrnd()*0.30).toFixed(2)+")";
    for (const dx of [-SKY_W, 0]){
      g.beginPath(); g.ellipse(x+dx+w/2, y, w/2, h, 0, 0, TAU); g.fill();
    }
  }

  g.fillStyle = "#fff0c4"; g.beginPath(); g.arc(sx, sy, 12, 0, TAU); g.fill();
  g.fillStyle = "#fffbea"; g.beginPath(); g.arc(sx, sy, 7, 0, TAU); g.fill();

  const mar = g.createLinearGradient(0, SKY_HOR, 0, SKY_H);
  mar.addColorStop(0,   "#c8aa8a");
  mar.addColorStop(.14, "#86869a");
  mar.addColorStop(.50, "#40587a");
  mar.addColorStop(1,   "#22364f");
  g.fillStyle = mar; g.fillRect(0, SKY_HOR, SKY_W, SKY_H - SKY_HOR);
  for (let i=0;i<70;i++){                    // o rastro do sol na agua
    const fundo = nrnd()*nrnd();
    const y = SKY_HOR + 2 + fundo*64;
    const w = 3 + nrnd()*16*(1 - fundo);
    g.fillStyle = "rgba(255,214,150,"+(0.25+nrnd()*0.5).toFixed(2)+")";
    g.fillRect(sx + (nrnd()-0.5)*(18 + fundo*90) - w/2, y, w, 1);
  }

  const passo = 16, n = SKY_W/passo, alturas = serraAlturas(n, 26);
  const norte = SKY_VOLTA*3/4 + SKY_VOLTA/8;
  g.fillStyle = "#8e8198";
  g.beginPath(); g.moveTo(0, SKY_HOR);
  for (let i=0;i<=n;i++){
    const janela = Math.max(0, 1 - Math.abs(distVolta(i*passo, norte))/220);
    g.lineTo(i*passo, SKY_HOR - alturas[i]*Math.min(1, janela*1.7));
  }
  g.lineTo(SKY_W, SKY_HOR); g.closePath(); g.fill();

  return new Uint32Array(g.getImageData(0,0,SKY_W,SKY_H).data.buffer).slice();
}
/* ============================================================
   O AMBIENTE
   ------------------------------------------------------------
   Ceu, bruma e as texturas que desbotam nela sao do ambiente, e o ambiente e
   do mapa: a tarde da ilha ou a noite da cripta. Sao feitos na primeira vez
   que o ambiente aparece e guardados, entao trocar de mapa com o jogo
   rodando nao refaz nada.

   Tudo aqui sai do sorteio de nrnd, na mesma ordem de antes -- ceu, as duas
   texturas da caldeira e as da ilha --, sempre a partir da semente de logo
   depois das texturas da cripta. Assim a ilha sai igual abrindo nela ou
   chegando nela de outro mapa: o desenho de uma textura depende de quanto
   sorteio veio antes dela.
   ============================================================ */
const SEMENTE_DO_AMBIENTE = seed;
let SKY = null, REG_ILHA = null;
const AMBIENTES = {};
function prepararAmbiente(){
  const k = ILHA ? "tarde" : "noite";
  let a = AMBIENTES[k];
  if (!a){
    seed = SEMENTE_DO_AMBIENTE;
    HORIZONTE = ILHA ? HORIZONTE_TARDE : HORIZONTE_NOITE;
    SKY_W = ILHA ? 1024 : 256;
    a = {horizonte: HORIZONTE, skyW: SKY_W, sky: ILHA ? ceuDaTarde() : ceuDaNoite()};
    texturasDaCaldeira();
    a.obsidCeu = TEX.obsidCeu; a.floorStoneCeu = TEX.floorStoneCeu;
    a.reg = ILHA ? texturasDaIlha() : null;
    a.regFundo = a.reg ? forrosDeDungeon(a.reg) : null;
    AMBIENTES[k] = a;
  }
  HORIZONTE = a.horizonte; SKY_W = a.skyW; SKY = a.sky;
  TEX.obsidCeu = a.obsidCeu; TEX.floorStoneCeu = a.floorStoneCeu;
  REG_ILHA = ILHA && ILHA.mar === null ? a.regFundo : a.reg;
}

/* As texturas da camara de lava desbotam no horizonte em vez de no preto,
   porque aquela sala agora e aberta pro ceu. */
function texturasDaCaldeira(){
TEX.obsidCeu = makeTex(function(c){
  c.fillStyle="#241a18"; c.fillRect(0,0,TS,TS);
  for (let i=0;i<70;i++){
    c.fillStyle = "rgba(60,40,36,"+(0.3+nrnd()*0.5).toFixed(2)+")";
    const x=nrnd()*TS, y=nrnd()*TS, r=3+nrnd()*9;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+r,y+r*0.6); c.lineTo(x+r*0.4,y+r); c.closePath(); c.fill();
  }
  for (let i=0;i<26;i++){
    c.strokeStyle = "rgba(226,104,32,"+(0.25+nrnd()*0.5).toFixed(2)+")";
    c.lineWidth = 1+nrnd();
    c.beginPath(); let x=nrnd()*TS, y=nrnd()*TS; c.moveTo(x,y);
    for(let s=0;s<4;s++){ x+=(nrnd()*2-1)*9; y+=nrnd()*10; c.lineTo(x,y); }
    c.stroke();
  }
  grain(c,.12,600);
}, HORIZONTE);

TEX.floorStoneCeu = makeTex(function(c){
  c.fillStyle="#3a3730"; c.fillRect(0,0,TS,TS);
  for (let y=0;y<TS;y+=16) for (let x=0;x<TS;x+=16){
    c.fillStyle = "rgb("+(56+nrnd()*22|0)+","+(52+nrnd()*20|0)+","+(45+nrnd()*16|0)+")";
    c.fillRect(x+1,y+1,14,14);
  }
  grain(c,.13,900);
}, HORIZONTE);
}

/* ============================================================
   A ILHA: TERRENO
   ------------------------------------------------------------
   So existem quando o jogo abre um mapa do editor. Todas desbotam na bruma
   do fim de tarde e nenhuma escurece no preto: ao ar livre nao ha escuro
   para onde ir.

   Cada terreno tem um piso e uma parede. A parede e a cara que ele mostra
   quando fica mais alto que o vizinho: o barranco do morro, a beira da
   praia, o bloco de pedra.

   O chao da ilha se repete por areas enormes, e costura de textura ali vira
   grade no chao. Por isso os carimbos daqui atravessam a borda e voltam do
   outro lado.
   ============================================================ */
function texturasDaIlha(){
  const F = HORIZONTE;
  /* em 128: FI e um pixel de 128 (em unidade de 64), N2 quantas vezes mais
     coisa espalhada, AL o comprimento da folha e do risco fino */
  const FI = 1/TEX_E, N2 = TEX_E*TEX_E, AL = TEX_E > 1 ? 1.5/TEX_E : 1;
  function volta(x, y, r, fn){
    for (const dx of [-TS, 0, TS]) for (const dy of [-TS, 0, TS]){
      const px = x+dx, py = y+dy;
      if (px + r < 0 || px - r > TS || py + r < 0 || py - r > TS) continue;
      fn(px, py);
    }
  }
  function mancha(c, cor, x, y, rx, ry){
    c.fillStyle = cor;
    volta(x, y, Math.max(rx, ry), function(px, py){
      c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, TAU); c.fill();
    });
  }
  function risco(c, cor, x, y, w, h){
    c.fillStyle = cor;
    volta(x, y, Math.max(w, h), function(px, py){ c.fillRect(((px*TEX_E)|0)/TEX_E, ((py*TEX_E)|0)/TEX_E, w, h); });
  }
  function rgb(r, g, b){ return "rgb(" + (r|0) + "," + (g|0) + "," + (b|0) + ")"; }

  TEX.ilhaGrama = makeTexIlha(function(c){
    c.fillStyle = "#587431"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<34;i++)
      mancha(c, i%2 ? "rgba(38,60,22,.30)" : "rgba(120,140,60,.22)", nrnd()*TS, nrnd()*TS, 4+nrnd()*8, 3+nrnd()*6);
    for (let i=0;i<520*N2;i++){                  // folhas: tracinhos em pe
      const t = nrnd();
      risco(c, t > .75 ? "#a4b85a" : t > .4 ? "#6f8c3a" : "#3c5520", nrnd()*TS, nrnd()*TS, FI, (2 + (nrnd()*2|0))*AL);
    }
  }, F);

  TEX.ilhaMato = makeTexIlha(function(c){
    c.fillStyle = "#3b5226"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<30;i++) mancha(c, "rgba(24,38,16,.40)", nrnd()*TS, nrnd()*TS, 5+nrnd()*7, 4+nrnd()*5);
    for (let i=0;i<150*N2;i++){                  // tufos de tres folhas
      const x = nrnd()*TS, y = nrnd()*TS, t = nrnd();
      const cor = t > .7 ? "#8fa850" : t > .35 ? "#5d7a34" : "#2f4419";
      risco(c, cor, x, y, FI, 4*AL); risco(c, cor, x-FI, y+FI, FI, 3*AL); risco(c, cor, x+FI, y+FI, FI, 3*AL);
    }
  }, F);

  TEX.ilhaAreia = makeTexIlha(function(c){
    c.fillStyle = "#c6a978"; c.fillRect(0,0,TS,TS);
    for (let k=0;k<7;k++){                       // ondas do vento; o seno fecha na largura
      const y0 = k*TS/7 + nrnd()*4, fase = nrnd()*TAU;
      for (let x=0;x<TS;x+=FI){
        const y = y0 + Math.sin(x/TS*TAU*2 + fase)*2.2;
        risco(c, "rgba(236,214,168,.55)", x, y, FI, FI);
        risco(c, "rgba(150,120,80,.35)", x, y+FI, FI, FI);
      }
    }
    for (let i=0;i<500*N2;i++)
      risco(c, nrnd() > .5 ? "rgba(110,86,54,.45)" : "rgba(250,236,200,.45)", nrnd()*TS, nrnd()*TS, FI, FI);
  }, F);

  TEX.ilhaLama = makeTexIlha(function(c){
    c.fillStyle = "#4b4330"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<22;i++) mancha(c, "rgba(30,28,18,.45)", nrnd()*TS, nrnd()*TS, 3+nrnd()*9, 2+nrnd()*5);
    for (let i=0;i<9;i++){                       // pocas com o ceu refletido
      const x = nrnd()*TS, y = nrnd()*TS, r = 3+nrnd()*5;
      mancha(c, "#2c3230", x, y, r, r*0.6);
      mancha(c, "rgba(200,170,140,.35)", x-1, y-1, r*0.5, r*0.25);
    }
    grain(c,.10,400);
  }, F);

  TEX.ilhaTerra = makeTexIlha(function(c){
    c.fillStyle = "#7c5d3c"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<40;i++)
      mancha(c, i%2 ? "rgba(60,42,26,.30)" : "rgba(150,116,78,.25)", nrnd()*TS, nrnd()*TS, 3+nrnd()*8, 2+nrnd()*5);
    for (let i=0;i<60*N2;i++){                   // pedriscos
      const x = nrnd()*TS, y = nrnd()*TS, r = (0.8+nrnd()*1.6)*(TEX_E > 1 ? 0.7 : 1);
      mancha(c, "#5a4430", x+0.6*FI*TEX_E, y+0.6*FI*TEX_E, r, r*0.8);
      mancha(c, "#a88e6c", x, y, r, r*0.8);
    }
    grain(c,.10,500);
  }, F);

  TEX.ilhaCalcada = makeTexIlha(function(c){
    c.fillStyle = "#3e3a34"; c.fillRect(0,0,TS,TS);          // rejunte
    for (let fila=0; fila<8; fila++){
      const y = fila*8 + 4, off = fila%2 ? 4 : 0;
      for (let col=0; col<8; col++){
        const x = col*8 + off + 4, t = nrnd(), cx = x + (nrnd()-.5), cy = y + (nrnd()-.5);
        /* em 128 a elipse lisa vira bolacha: a pedra ganha a sombra num pixel
           fino embaixo e a direita, e o granulado e o lascado por dentro */
        if (TEX_E > 1) mancha(c, "rgba(24,22,18,.6)", cx + FI, cy + FI, 3.4, 3.0);
        mancha(c, rgb(118+t*40, 112+t*36, 100+t*30), cx, cy, 3.4, 3.0);
        mancha(c, "rgba(255,240,210,.18)", x-1, y-1, 1.8, 1.2);
        if (TEX_E > 1) for (let k=0;k<18;k++){
          const a = nrnd()*TAU, r = Math.sqrt(nrnd())*2.7;
          risco(c, nrnd() > .45 ? "rgba(46,42,34,.40)" : "rgba(255,246,222,.30)", cx + Math.cos(a)*r*1.1, cy + Math.sin(a)*r*0.95, FI, FI);
        }
      }
    }
    grain(c,.08,300);
  }, F);

  TEX.ilhaTabuado = makeTexIlha(function(c){
    c.fillStyle = "#3f2c1a"; c.fillRect(0,0,TS,TS);
    for (let y=0;y<TS;y+=8){
      const t = nrnd();
      c.fillStyle = rgb(112+t*30, 80+t*22, 50+t*14); c.fillRect(0, y, TS, 7);
      for (let k=0;k<5*TEX_E;k++) risco(c, "rgba(60,40,22,.35)", nrnd()*TS, y+1+nrnd()*5, 6+nrnd()*14, FI);
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect((nrnd()*TS)|0, y, FI, 7);     // emenda
    }
    grain(c,.08,300);
  }, F);

  TEX.ilhaLajota = makeTexIlha(function(c){
    c.fillStyle = "#34312c"; c.fillRect(0,0,TS,TS);
    for (let y=0;y<TS;y+=32) for (let x=0;x<TS;x+=32){
      const t = nrnd();
      c.fillStyle = rgb(104+t*24, 100+t*22, 92+t*18); c.fillRect(x+1, y+1, 30, 30);
      c.fillStyle = "rgba(255,240,215,.12)"; c.fillRect(x+1, y+1, 30, 1);
      c.strokeStyle = "rgba(30,28,24,.45)"; c.lineWidth = FI;                  // trinca
      c.beginPath(); let px = x+4+nrnd()*22, py = y+2; c.moveTo(px, py);
      for (let s=0;s<4;s++){ px += (nrnd()-.5)*8; py += 3+nrnd()*5; c.lineTo(px, py); }
      c.stroke();
    }
    grain(c,.10,500);
  }, F);

  /* Agua em quatro quadros. Nada aqui usa sorteio: o fundo e as cristas
     tem que ser os mesmos em todos os quadros, so a fase anda -- senao a
     agua pisca em vez de ondular. */
  function agua(base, claro, fundo, quadro){
    return makeTexIlha(function(c){
      c.fillStyle = base; c.fillRect(0,0,TS,TS);
      if (fundo) for (let i=0;i<14;i++)
        mancha(c, fundo, (i*37)%TS + 3, (i*23)%TS + 5, 6+(i%4)*2, 4+(i%3)*2);
      const fase = quadro/4*TAU;
      for (let k=0;k<8;k++){
        const y0 = k*8 + 3;
        for (let x=0;x<TS;x+=FI){
          const y = y0 + Math.sin(x/TS*TAU*2 + fase + k*1.7)*2.0 + Math.sin(x/TS*TAU*3 - fase)*0.8;
          if (Math.sin(x/TS*TAU*4 + k + fase) > 0.25) risco(c, claro, x, y, FI, FI);
        }
      }
    }, F);
  }
  TEX.ilhaRasa  = [0,1,2,3].map(function(q){ return agua("#3b6f7a", "rgba(214,232,220,.55)", "rgba(150,140,100,.30)", q); });
  TEX.ilhaFunda = [0,1,2,3].map(function(q){ return agua("#1d4260", "rgba(170,200,220,.45)", null, q); });

  TEX.ilhaBarranco = makeTexIlha(function(c){
    c.fillStyle = "#6a4e33"; c.fillRect(0,0,TS,TS);
    for (let k=0;k<6;k++){                       // camadas de terra
      c.fillStyle = nrnd() > .5 ? "rgba(90,66,42,.6)" : "rgba(120,92,62,.5)";
      c.fillRect(0, k*11 + nrnd()*4, TS, 3 + nrnd()*5);
    }
    for (let i=0;i<40;i++){                      // pedras presas no barranco
      const x = nrnd()*TS, y = nrnd()*TS, r = 1+nrnd()*3;
      mancha(c, "#4a3a2a", x+1, y+1, r, r*0.8);
      mancha(c, "#9a8870", x, y, r, r*0.8);
    }
    c.strokeStyle = "rgba(40,28,16,.55)"; c.lineWidth = FI;
    for (let i=0;i<18;i++){                      // raizes
      c.beginPath(); let x = nrnd()*TS, y = nrnd()*TS; c.moveTo(x, y);
      for (let s=0;s<3;s++){ x += (nrnd()-.5)*6; y += 2+nrnd()*4; c.lineTo(x, y); }
      c.stroke();
    }
    grain(c,.10,500);
  }, F);

  TEX.ilhaBeira = makeTexIlha(function(c){
    c.fillStyle = "#a88a5e"; c.fillRect(0,0,TS,TS);
    for (let k=0;k<9;k++){
      c.fillStyle = k%2 ? "rgba(196,170,124,.55)" : "rgba(140,110,74,.45)";
      c.fillRect(0, k*7 + nrnd()*3, TS, 2+nrnd()*3);
    }
    for (let i=0;i<500*N2;i++)
      risco(c, nrnd() > .5 ? "rgba(90,70,44,.45)" : "rgba(240,224,190,.4)", nrnd()*TS, nrnd()*TS, FI, FI);
  }, F);

  /* O muro e as tabuas tem nome porque as variantes com janela e quina, mais
     abaixo, pintam a mesma parede por baixo. */
  function muro(c){                              // pedra assentada, fileiras de altura diferente
    c.fillStyle = "#3a3630"; c.fillRect(0,0,TS,TS);
    const alturas = [14, 11, 13, 12, 14];         // somam 64: a ultima fileira encosta na primeira
    let y = 0;
    for (const h of alturas){
      let x = -((nrnd()*12)|0);
      while (x < TS + x*0){
        const w = 12 + (nrnd()*14|0), t = nrnd();
        risco(c, rgb(112+t*34, 106+t*30, 96+t*24), x, y+1, w-2, h-2);
        risco(c, "rgba(255,240,210,.16)", x, y+1, w-2, 1);
        risco(c, "rgba(0,0,0,.25)", x, y+h-2, w-2, 1);
        x += w;
        if (x >= TS) break;
      }
      y += h;
    }
    grain(c,.10,500);
  }
  TEX.ilhaMuro = makeTexIlha(muro, F);

  function tabuas(c){                            // parede de tabuas em pe
    c.fillStyle = "#3a2716"; c.fillRect(0,0,TS,TS);
    for (let x=0;x<TS;x+=8){
      const t = nrnd();
      c.fillStyle = rgb(104+t*30, 72+t*20, 42+t*14); c.fillRect(x, 0, 7, TS);
      for (let k=0;k<4*TEX_E;k++) risco(c, "rgba(50,32,18,.35)", x+1+nrnd()*5, nrnd()*TS, FI, 8+nrnd()*16);
      c.fillStyle = "rgba(255,230,190,.12)"; c.fillRect(x, 0, 1, TS);
    }
    c.fillStyle = "#2a1c10"; c.fillRect(0, 10, TS, 3); c.fillRect(0, 50, TS, 3);   // travessas
    grain(c,.08,300);
  }
  TEX.ilhaTabua = makeTexIlha(tabuas, F);

  TEX.ilhaPalicada = makeTexIlha(function(c){        // troncos em pe
    c.fillStyle = "#22160c"; c.fillRect(0,0,TS,TS);
    for (let x=0;x<TS;x+=16){
      const g = c.createLinearGradient(x, 0, x+15, 0);
      g.addColorStop(0, "#3e2a18"); g.addColorStop(.35, "#8a6440");
      g.addColorStop(.6, "#6e4e30"); g.addColorStop(1, "#2e1f12");
      c.fillStyle = g; c.fillRect(x, 0, 15, TS);
      for (let k=0;k<6*TEX_E;k++) risco(c, "rgba(40,26,14,.5)", x+2+nrnd()*11, nrnd()*TS, FI, 4+nrnd()*10);
      mancha(c, "#3a2816", x+4+nrnd()*8, nrnd()*TS, 1.6, 2.4);                     // no da madeira
    }
    c.fillStyle = "#4a4640"; c.fillRect(0, 22, TS, 3);                             // amarra
    grain(c,.08,300);
  }, F);

  TEX.ilhaTronco = makeTexIlha(function(c){          // topo da palicada: pontas dos troncos
    c.fillStyle = "#22160c"; c.fillRect(0,0,TS,TS);
    c.strokeStyle = "rgba(60,40,22,.6)"; c.lineWidth = FI;
    for (let x=8;x<TS;x+=16) for (let y=8;y<TS;y+=16){
      mancha(c, "#8a6a44", x, y, 7, 7);
      for (let r=2;r<7;r+=2){ c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); }
    }
  }, F);

  TEX.ilhaRocha = makeTexIlha(function(c){
    c.fillStyle = "#6a645a"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<60;i++){                      // facetas
      const x = nrnd()*TS, y = nrnd()*TS, r = 4+nrnd()*10, t = nrnd();
      c.fillStyle = t > .6 ? "rgba(150,142,128,.35)" : t > .3 ? "rgba(70,64,56,.40)" : "rgba(110,100,86,.35)";
      volta(x, y, r*1.2, function(px, py){
        c.beginPath(); c.moveTo(px, py); c.lineTo(px+r, py+r*0.5);
        c.lineTo(px+r*0.3, py+r); c.lineTo(px-r*0.6, py+r*0.4); c.closePath(); c.fill();
      });
    }
    c.strokeStyle = "rgba(30,28,24,.6)"; c.lineWidth = FI;
    for (let i=0;i<10;i++){                      // fendas
      c.beginPath(); let x = nrnd()*TS, y = nrnd()*TS; c.moveTo(x, y);
      for (let s=0;s<4;s++){ x += (nrnd()-.5)*10; y += 3+nrnd()*6; c.lineTo(x, y); }
      c.stroke();
    }
    grain(c,.12,600);
  }, F);

  function telhas(c){                            // telha de barro vista de cima
    c.fillStyle = "#4a2418"; c.fillRect(0,0,TS,TS);
    for (let fila=0; fila<8; fila++){
      const y = fila*8, off = fila%2 ? 4 : 0;
      for (let x=-8; x<TS+8; x+=8){
        const t = nrnd(), a = x + off;
        c.fillStyle = rgb(150+t*40, 70+t*22, 46+t*14);
        c.beginPath(); c.moveTo(a, y); c.lineTo(a+7, y); c.lineTo(a+7, y+5);
        c.quadraticCurveTo(a+3.5, y+8, a, y+5); c.closePath(); c.fill();
        c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(a, y+6, 7, 1);
        /* em 128: a beira de cima clara e a fresta escura do lado, num pixel
           fino, e o barro manchado -- sem isso a telha de 128 ficava lisa */
        if (TEX_E > 1){
          c.fillStyle = "rgba(255,214,170,.35)"; c.fillRect(a, y, 7, FI);
          c.fillStyle = "rgba(40,14,8,.55)"; c.fillRect(a+7-FI, y, FI, 5.5);
          for (let k=0;k<10;k++) risco(c, nrnd() > .5 ? "rgba(70,24,14,.35)" : "rgba(255,200,150,.25)", a + nrnd()*6.5, y + nrnd()*5.5, FI, FI);
        }
      }
    }
    grain(c,.08,300);
  }
  TEX.ilhaTelhado = makeTexIlha(telhas, F);

  TEX.ilhaForro = makeTexIlha(function(c){           // forro de tabua com viga
    c.fillStyle = "#3a2a1a"; c.fillRect(0,0,TS,TS);
    for (let y=0;y<TS;y+=8){ c.fillStyle = y%16 ? "#4a3522" : "#433020"; c.fillRect(0, y, TS, 7); }
    c.fillStyle = "#24180e"; c.fillRect(0, 28, TS, 8);
    c.fillStyle = "rgba(255,220,170,.10)"; c.fillRect(0, 28, TS, 1);
    grain(c,.08,300);
  }, F);

  /* ---------- casas com cara de casa ----------
     Tudo daqui para baixo vem depois do forro, para o sorteio das texturas de
     antes continuar o mesmo. A parede de casa cabe inteira numa imagem: ela
     estica do chao ao alto da parede (ver paredeDaIlha, em p2b.js), entao a
     ultima linha e o chao e a janela fica sempre na altura do peito. */
  function janela(c, moldura){
    const x = 22, y = 18, w = 20, h = 24;
    c.fillStyle = moldura; c.fillRect(x-3, y-3, w+6, h+6);                     // batente
    c.fillStyle = "#1c1410"; c.fillRect(x, y, w, h);                            // o escuro de dentro
    c.fillStyle = "rgba(255,178,90,.55)"; c.fillRect(x+2, y+h/2, w-4, h/2-2);  // lume aceso, embaixo
    c.fillStyle = "rgba(255,210,140,.22)"; c.fillRect(x+2, y+2, w-4, h/2-3);
    c.fillStyle = moldura; c.fillRect(x + w/2 - 1, y, 2, h); c.fillRect(x, y + h/2 - 1, w, 2);
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x-3, y+h+3, w+6, 2);          // sombra do peitoril
  }
  TEX.ilhaTabuaJanela = makeTexIlha(function(c){ tabuas(c); janela(c, "#2a1c10"); }, F);
  TEX.ilhaMuroJanela  = makeTexIlha(function(c){ muro(c); janela(c, "#6e675c"); }, F);
  /* a quina e a ponta de uma fileira de parede: o canto da casa ou o lado da porta */
  TEX.ilhaTabuaQuina = makeTexIlha(function(c){
    tabuas(c);
    for (const x of [0, TS-6]){
      c.fillStyle = "#2e1e10"; c.fillRect(x, 0, 6, TS);
      c.fillStyle = "rgba(255,230,190,.14)"; c.fillRect(x, 0, 1, TS);
    }
  }, F);
  TEX.ilhaMuroQuina = makeTexIlha(function(c){       // cunhal: pedras grandes, alternadas
    muro(c);
    for (let k=0; k<5; k++){
      const y = k*13, w = k%2 ? 12 : 18;
      for (const lado of [0, 1]){
        const x = lado ? TS - w : 0;
        c.fillStyle = "#3a3630"; c.fillRect(x, y, w, 13);
        c.fillStyle = rgb(146, 138, 124); c.fillRect(x + lado, y+1, w-1, 11);
        c.fillStyle = "rgba(255,240,210,.18)"; c.fillRect(x, y+1, w-1, 1);
      }
    }
  }, F);
  TEX.ilhaCerca = makeTexIlha(function(c){           // duas travessas e dois moiroes, o mato atras
    c.fillStyle = "#34401f"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<200*N2;i++) risco(c, nrnd() > .5 ? "#26301a" : "#45552a", nrnd()*TS, nrnd()*TS, FI, 3*AL);
    for (const x of [6, 38]){
      c.fillStyle = "#4a3420"; c.fillRect(x, 2, 8, TS-2);
      c.fillStyle = "rgba(255,230,190,.16)"; c.fillRect(x, 2, 1, TS-2);
    }
    for (const y of [14, 40]){
      c.fillStyle = "#86603a"; c.fillRect(0, y, TS, 9);
      c.fillStyle = "rgba(255,230,190,.2)"; c.fillRect(0, y, TS, 1);
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, y+9, TS, 1);
    }
    grain(c,.08,200);
  }, F);
  TEX.ilhaCercaTopo = makeTexIlha(function(c){       // de cima: o mato e a travessa
    c.fillStyle = "#4a6030"; c.fillRect(0,0,TS,TS);
    for (let i=0;i<260*N2;i++) risco(c, nrnd() > .5 ? "#34461f" : "#6f8c3a", nrnd()*TS, nrnd()*TS, FI, 2*AL);
    c.fillStyle = "#86603a"; c.fillRect(0, 27, TS, 10);
    c.fillStyle = "rgba(255,230,190,.2)"; c.fillRect(0, 27, TS, 1);
  }, F);
  /* a agua do telhado virada para o sol do oeste e a de costas para ele */
  TEX.ilhaTelhadoSol = makeTexIlha(function(c){
    telhas(c);
    c.fillStyle = "rgba(255,190,120,.22)"; c.fillRect(0,0,TS,TS);
  }, F);
  TEX.ilhaTelhadoSombra = makeTexIlha(function(c){
    telhas(c);
    c.fillStyle = "rgba(20,10,30,.38)"; c.fillRect(0,0,TS,TS);
  }, F);
  TEX.ilhaChamine = makeTexIlha(function(c){         // a boca da chamine, vista de cima
    muro(c);
    c.fillStyle = "#141010"; c.fillRect(14, 14, 36, 36);
    c.fillStyle = "rgba(90,70,60,.5)"; c.fillRect(14, 14, 36, 3);
  }, F);

  /* `janela` e `quina` so em parede de casa; `inteira` e a parede que estica
     uma imagem do chao ao alto em vez de repetir por tile */
  const POR_TERRENO = {
    funda:    {floor:"ilhaFunda",   wall:"ilhaBarranco"},
    rasa:     {floor:"ilhaRasa",    wall:"ilhaBarranco"},
    areia:    {floor:"ilhaAreia",   wall:"ilhaBeira"},
    grama:    {floor:"ilhaGrama",   wall:"ilhaBarranco"},
    mato:     {floor:"ilhaMato",    wall:"ilhaBarranco"},
    lama:     {floor:"ilhaLama",    wall:"ilhaBarranco"},
    terra:    {floor:"ilhaTerra",   wall:"ilhaBarranco"},
    calcada:  {floor:"ilhaCalcada", wall:"ilhaMuro"},
    tabuado:  {floor:"ilhaTabuado", wall:"ilhaTabua"},
    lajota:   {floor:"ilhaLajota",  wall:"ilhaMuro"},
    pedra:    {floor:"ilhaMuro",    wall:"ilhaMuro",  janela:"ilhaMuroJanela",  quina:"ilhaMuroQuina",  inteira:1},
    madeira:  {floor:"ilhaTabua",   wall:"ilhaTabua", janela:"ilhaTabuaJanela", quina:"ilhaTabuaQuina", inteira:1},
    palicada: {floor:"ilhaTronco",  wall:"ilhaPalicada", inteira:1},
    rocha:    {floor:"ilhaRocha",   wall:"ilhaRocha"},
    encosta:  {floor:"ilhaRocha",   wall:"ilhaRocha"},
    porta:    {floor:"ilhaTabuado", wall:"ilhaTabua"},
    cerca:    {floor:"ilhaCercaTopo", wall:"ilhaCerca", inteira:1}
  };
  /* terreno novo no editor sem entrada aqui cai na terra, em vez de quebrar */
  return TERRENOS.map(function(t){
    const r = POR_TERRENO[t.id] || POR_TERRENO.terra;
    return {floor:r.floor, wall:r.wall, ceil:"ilhaForro", telhado:"ilhaTelhado",
            janela:r.janela || null, quina:r.quina || null, inteira:!!r.inteira};
  });
}
/* Debaixo da terra -- o mapa sem mar, a dungeon -- o forro e de pedra, e
   nao a tabua da casa: pedra lavrada sobre o chao de lajota ou de calcada, a
   cripta; rocha sobre o resto, a caverna. */
function forrosDeDungeon(reg){
  return reg.map(function(r){
    return Object.assign({}, r, {ceil: r.floor === "ilhaLajota" || r.floor === "ilhaCalcada" ? "ilhaMuro" : "ilhaRocha"});
  });
}
prepararAmbiente();

