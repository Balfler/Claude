/* ============================================================
   O BESTIARIO EM VOXELS
   ------------------------------------------------------------
   Um modelo por criatura, montado por pecas, mais a lista de materiais.
   O assador de p3b.js faz o resto: gira, ilumina e joga no mesmo pipeline
   de pixel art de sempre.

   Convencao de eixos, sempre a mesma: x da esquerda pra direita visto de
   frente, y da frente pro fundo (y=0 e a cara), z dos pes pra cabeca.
   A rotacao 0 e a criatura encarando voce.

   Cada modelo recebe a pose: 0 e 1 sao os dois passos da caminhada, 2 e o
   ataque e 3 e o morto -- os membros largados, que e de onde sai o cadaver.
   A queda usa a pose 0, porque quem tomba ainda esta rigido.

   Tamanho do grid = tamanho do sprite dividido pela escala. O diabrete tem
   sprite de 48x64 e grid de 24x32 na escala 2; e essa conta que mantem as
   criaturas em voxel do mesmo tamanho das desenhadas a mao.
   ============================================================ */


/* ============================================================
   O DIABRETE MORTO, DESENHADO A MAO
   ------------------------------------------------------------
   Desenho do Leandro, em cinco vistas ao redor do corpo: de cara, tres
   quartos, de lado, tres quartos do outro lado e de pe. Espelhando as tres
   do meio saem os oito rumos, e e por isso que o corpo fica parado no chao
   enquanto voce anda em volta -- e a imagem que troca, nao o quadro que
   gira.

   E a unica arte do jogo que nao sai de um modelo de voxel, e e de
   proposito: um corpo caido nunca anima, entao nada se ganha modelando ele,
   e um desenho a mao ganha de longe na leitura.

   Convertido uma vez da folha original, que esta em Arte/. O recorte do
   fundo quadriculado virou buraco dentro da cabeca, onde o gerador desenhou
   os olhos -- o conversor guarda esses buracos como osso, e sao eles as duas
   manchas claras que se reconhecem de longe.
   ============================================================ */
const DIABRETE_MORTO = [
/* 0 -- de cara */ [
"..............d2a2b..........",
"...........1a2abb22ba........",
".......efe11922b33b32a.......",
".......gfb211a1a23333ba......",
".......eb99111919123bbb1.....",
"......a2a199919aa1a222a1.....",
".....aab191a2a981a2192222....",
"....12e2adhgeb97dda81bbb32...",
"...ab3e29eghee97ad909bbba32..",
"..92b3eaa934b80kc11812b32b31.",
".99aaba19a2b20k78918123baaba.",
".ab3ba191e339c77c18081b322bb.",
"2b444aaa1hggac777a08089aa33a1",
"a23bb222b6gfbdk88080078b433a9",
"1aa22egb3ba2211078007022b3b20",
".891aff3bbb2aaa1000k0233b2a1.",
".......b191a2a21....23232b10.",
"...........1199.....d21121...",
".......................9a9..."],
/* 1 -- tres quartos */ [
"..............daaa2...................",
"...fge29d...ab2bb3b2d.................",
"...fgbaa1a992b2bb33b990...............",
"...ea899111911ab3433a810008...........",
"..2b1911999a2a123bbb29991118..........",
"..bba1baa198121122b22919991180........",
"..fa1egg3b0kdd9012b2ba111991181.......",
"..e21fhgee0ke2989222a2a189199019......",
"..da9ab41ck79a08abb22331019118881a3b2b",
"..9a1bb29k7kc1002333a43a8112b2a19d9a..",
"..1aef42k7k711882b3b23ba0823b3bb4e....",
".aa9fhhedk7k9180823b2332981a233bbec...",
".eb2efhbb7kc080809223ba91088a12b2.....",
"efe3ba22a18k08808a3432a19.............",
"ef32bb322a9kk7812444bb19..............",
"...d81122a1kaa2333b2b21...............",
"......c991a1b3b3b21a211...............",
"...........b2bb2a99190................",
"...........a91a91.....................",
".............91......................."],
/* 2 -- de lado */ [
".................aa2a...........................",
"....ffda11....aa22b3bba1........................",
"...f6f3211a..1bb3bb3bb2118......................",
"....fd191aaa11112343433a9198007.................",
"...b21191919aa2a12b3b3329999089800..............",
"..b3a991a11912aaa923bbb211118119990.............",
"..de21efeb21779aa892bb22a19191919908............",
"..e2a9gghfedkcd219232aa32119199919989...........",
"..ea19fggeedkdda1a33b2a33a111811919099..........",
"..e11922b07k7kca8ab33ba43a8701191918999.........",
"...1912bbd87kc1a812bbb23b210k99191000199........",
"..911ffe277k70190813322b32907119119000191a......",
".a2adhghbd7787998081abbba110k99ab3a218899aab3...",
".be2b5gg2b07c88000133432118k71ab3b33b211d8922bb3",
"dfeb3ba22a18k008923343bb2977k992b343bb2bgd0.....",
"efe3bbb32aa91b2b4333bbbb107k7k992a34333efd......",
"...b1122222abbb3b3ba22211......001a233badd......",
".......111922b2b22111980........................",
"...........a922a19..............................",
".............991................................"],
/* 3 -- tres quartos, do outro lado */ [
"................2222.........................",
"...efeb91....2a222bb29.......................",
"...f6e3a119.1a3b33b32b988....................",
"...ef919aaa1191ab3443321990k0................",
"...b298919192a1123b3bba91108080c.............",
"..22a99aa119a2aa1abb332119911990.............",
"..de21gf4a297c1a09a222aa919191990............",
"..e2a1hghee8kdd28ab2a2ba9919991980...........",
"..fa1agg6de7kee18bb3a2bba9991191189..........",
"..ea1922bk7k7c1983b3213b207119199019.........",
"...19a2bbd77kd1902332a43a8k9919100019........",
"..119ff3177k7ca009b3223b290111199809111......",
".a2aehggadk7c820801abb32997991bbba10099a23...",
".be235gfbdkkc88801b43bb190781b333bb199d02bbbb",
"effb2baa2110kc892333433a17k992b343bb2ffc.....",
"efe2bbb2aaa1a2a343b3bb290k7k8122333b3fe7.....",
"...a112a2a2ab3b3bb2a2a99.....89122b3bddc.....",
".......1a99baab22a91118......................",
"...........a91b919...........................",
".............99d............................."],
/* 4 -- de pe */ [
"....dee........efe....",
"....fff........fgf....",
"....efbe......befe....",
"....da2a344baaa2bd....",
"....11a233bb2ba211....",
"....a222b3b33bb212....",
"....9a990801111a9a....",
"....9899111199909a....",
"...c09919191919119a...",
"..d081191129191999bb..",
".d2908119a211919092ba.",
".b318989822989898893b.",
".ba9089992b1089808933.",
"b3908080822900808992bb",
"2b88988881aa00089809bb",
"b280888809a2100089802b",
"22080880702390800808aa",
"928089a987a3a09a1080a1",
"1108a3b39002a1b3b20891",
"d1813b23a80a2a33b31011",
".88abba2988aaab223280.",
"...322219..421122b3...",
"..22a2a11..bb.92a22a..",
".cefe211......9aaefec.",
".cdeddd........ceefd7.",
".7ccc7c........7c7ccc."]
];

/* O diabrete caido: de lado, cabeca jogada pra tras com a bocarra aberta,
   um braco largado pra frente, o rabo esticado. A cabeca fica NO CHAO e o
   lombo e a parte mais alta -- e o lombo que da o volume. */
function diabreteCaido(){
  const p = [];
  /* rabo: sai do quadril, curva e termina em ponta */
  p.push(vxOsso(18,12,3, 21,13,2, 1.8, 1.2, 2));
  p.push(vxOsso(21,13,2, 23,12,4, 1.2, 0.6, 1));
  /* perna de baixo, dobrada sob o corpo, so o casco de fora */
  p.push(vxOsso(15,14,2, 19,15,1, 2.2, 1.7, 2));
  p.push(vxCaixa(18,14,0, 4,4,2, 3));
  /* perna de cima, dobrada pra frente */
  p.push(vxOsso(15,9,4, 19,8,2, 2.6, 2.0, 2));
  p.push(vxCaixa(17,5,0, 4,5,2, 3));
  /* tronco: quadril, lombo alto, peito -- o lombo e o ponto mais alto e e
     ele que da o volume de longe */
  p.push(vxBola(15,11,3, 4.0,4.0,2.8, 1));
  p.push(vxBola(11,11,4, 5.0,4.4,3.4, 1));
  p.push(vxBola(8,11,4, 4.0,4.0,3.0, 1));
  p.push(vxCaixa(9,7,6, 5,1,1, 2));                  // costelas marcadas no lombo
  p.push(vxCaixa(9,9,7, 5,1,1, 2));
  /* bracos largados pra frente, garras abertas no chao */
  p.push(vxOsso(8,8,4, 6,6,1, 2.0, 1.5, 1));
  p.push(vxOsso(6,6,1, 3,6,1, 1.5, 1.2, 1));
  for (let k=-1;k<=1;k++) p.push(vxOsso(3,6,1, 1,6+k*2,1, 0.8, 0.5, 3));
  p.push(vxOsso(9,14,3, 7,16,1, 1.8, 1.4, 1));

  /* A cabeca e torcida PARA VOCE, com o corpo de perfil. E a licenca que
     todo sprite de cadaver bom toma, e existe por um motivo: de perfil a
     cara vira um vulto sem leitura, e e a cara que diz o que morreu ali. De
     frente sobram tres manchas que se reconhecem a qualquer distancia -- os
     dois olhos claros e o buraco escuro da boca. */
  p.push(vxCaixa(2,7,2, 6,7,7, 1));                  // bloco da cabeca
  p.push(vxBola(5,11,6, 3.4,3.4,2.8, 1));            // volume do cranio
  p.push(vxCaixa(2,6,7, 6,1,1, 2));                  // arco superciliar
  p.push(vxCaixa(3,6,5, 2,1,2, 3));                  // olhos apagados
  p.push(vxCaixa(6,6,5, 2,1,2, 3));
  p.push(vxCaixa(3,6,2, 5,1,3, 5));                  // bocarra escancarada
  for (let k=0;k<3;k++){
    p.push(vxCaixa(3+k*2,6,4, 1,1,1, 3));            // dentes de cima
    p.push(vxCaixa(4+k*2,6,2, 1,1,1, 3));            // e de baixo
  }
  /* chifres: um pro alto e pra tras, o outro apoiado no chao */
  p.push(vxOsso(3,9,8, 1,14,9, 1.8, 0.8, 3));
  p.push(vxOsso(7,9,8, 10,14,8, 1.8, 0.8, 3));
  return p;
}

/* ============================================================
   O DIABRETE
   Postura de Doom: curvado, ombros acima da cabeca, bracos longos
   passando do joelho, pernas digitigradas.
   ============================================================ */
const DX_IMP = 24, DY_IMP = 22, DZ_IMP = 32;

const MAT_IMP = [
  {tons: R_IMPSKIN},                                  // 1 pele
  {tons: R_IMPDARK},                                  // 2 pele na sombra
  {tons: R_BONE},                                     // 3 osso: chifre, garra, casco
  {tons: ["#ffe45c","#ffe45c","#fff6c0"], emissivo:1},// 4 olho
  {tons: ["#1a0602","#1a0602","#250b06"]}             // 5 boca
];

function modeloDiabrete(pose){
  if (pose === 3) return diabreteCaido();
  const atk = pose === 2, alt = pose === 1, morto = false;
  const sA = morto ? -4 : alt ? 2 : -2;            // balanco das pernas
  const sB = morto ?  4 : alt ? -2 : 2;
  const bA = alt ? -2 : 2, bB = alt ? 2 : -2;      // bracos ao contrario
  const p = [];

  /* cauda, atras */
  p.push(vxOsso(14,16,13, 19,20,9, 2.2, 1.4, 2));
  p.push(vxOsso(19,20,9, 22,19,14, 1.4, 0.9, 1));

  /* pernas digitigradas: coxa para tras, canela para frente */
  p.push(vxOsso(8,11,16, 7+sA,14,9, 3.2, 2.4, 2));
  p.push(vxOsso(7+sA,14,9, 8+sA,9,3, 2.4, 1.9, 1));
  p.push(vxCaixa(5+sA,5,0, 6,9,3, 3));                // casco
  p.push(vxOsso(16,11,16, 17+sB,14,9, 3.2, 2.4, 2));
  p.push(vxOsso(17+sB,14,9, 16+sB,9,3, 2.4, 1.9, 1));
  p.push(vxCaixa(14+sB,5,0, 6,9,3, 3));

  /* quadril e tronco: ombro largo, cintura fina */
  p.push(vxBola(12,11,17, 6.0,4.6,3.4, 1));
  p.push(vxBola(12,10,23, 8.4,5.0,5.6, 1));
  p.push(vxBola(9,8,24, 3.4,2.6,3.0, 1));             // peitoral
  p.push(vxBola(15,8,24, 3.2,2.5,2.8, 1));
  p.push(vxCaixa(6,9,19, 12,4,1, 2));                 // costelas marcadas
  p.push(vxCaixa(6,9,21, 12,4,1, 2));

  /* ombros altos */
  p.push(vxBola(3,10,27, 3.2,3.0,2.8, 1));
  p.push(vxBola(20,10,27, 3.2,3.0,2.8, 1));

  /* bracos longos, com garras */
  const cot = atk ? 24 : morto ? 20 : 17+bA, pun = atk ? 30 : morto ? 14 : 7+bA;
  const cot2 = atk ? 24 : morto ? 20 : 17+bB, pun2 = atk ? 30 : morto ? 14 : 7+bB;
  const yb = atk ? 5 : morto ? 14 : 9;
  /* Morto, os bracos caem abertos e para tras -- depois do tombo e isso que
     os deixa esparramados no chao em vez de colados nas costelas. */
  const ax1 = morto ? 0 : 1, ax2 = morto ? 23 : 22;
  const px1 = morto ? 0 : 3, px2 = morto ? 23 : 20;
  p.push(vxOsso(3,10,26, ax1,yb+1,cot, 2.6, 2.1, 1));
  p.push(vxOsso(ax1,yb+1,cot, px1,yb,pun, 2.1, 1.7, 1));
  p.push(vxOsso(20,10,26, ax2,yb+1,cot2, 2.6, 2.1, 1));
  p.push(vxOsso(ax2,yb+1,cot2, px2,yb,pun2, 2.1, 1.7, 1));
  for (let k=-1;k<=1;k++){
    const dz = atk ? 3 : -3;
    p.push(vxOsso(px1+k, yb-1, pun, px1+k*2, yb-3, pun+dz, 0.9, 0.5, 3));
    p.push(vxOsso(px2+k, yb-1, pun2, px2+k*2, yb-3, pun2+dz, 0.9, 0.5, 3));
  }

  /* cabeca baixa e projetada pra frente */
  p.push(vxBola(12,7,27, 5.2,4.4,4.0, 1));
  p.push(vxCaixa(8,3,25, 9,5,4, 1));                  // focinho
  p.push(vxCaixa(7,3,29, 11,2,2, 2));                 // arco superciliar

  /* chifres varrendo pra tras */
  p.push(vxOsso(8,8,30, 5,15,32, 2.0, 0.8, 3));
  p.push(vxOsso(16,8,30, 19,15,32, 2.0, 0.8, 3));

  /* olhos e boca */
  p.push(vxCaixa(8,2,27, 2,2,2, 4));
  p.push(vxCaixa(14,2,27, 2,2,2, 4));
  if (atk){
    p.push(vxCaixa(9,2,22, 7,3,4, 5));
    for (let k=0;k<3;k++){
      p.push(vxCaixa(9+k*3,2,25, 1,2,1, 3));
      p.push(vxCaixa(10+k*3,2,22, 1,2,1, 3));
    }
  } else if (morto){
    p.push(vxCaixa(9,2,22, 7,3,3, 5));               // boca aberta, lingua de fora
    p.push(vxCaixa(11,1,21, 3,2,1, 1));
  } else {
    p.push(vxCaixa(9,2,24, 7,3,1, 5));
    p.push(vxCaixa(10,2,23, 1,2,1, 3));
    p.push(vxCaixa(14,2,23, 1,2,1, 3));
  }
  return p;
}

/* O goblin caido: de bruces, com a orelha enorme espalhada no chao ao lado
   da cabeca e o arco largado atravessado sob o corpo. */
function goblinCaido(){
  const p = [];
  p.push(vxOsso(16,10,2, 21,9,1, 2.2, 1.7, 2));      // pernas abertas
  p.push(vxCaixa(20,7,0, 4,4,2, 2));
  p.push(vxOsso(16,13,2, 21,15,1, 2.2, 1.7, 2));
  p.push(vxCaixa(20,14,0, 4,4,2, 2));
  p.push(vxBola(14,11,2, 4.0,4.0,2.4, 2));           // tunica no quadril
  p.push(vxBola(10,11,3, 4.6,4.4,2.8, 2));           // costas
  p.push(vxCaixa(8,8,5, 6,6,1, 3));                  // peitoral de osso por cima
  p.push(vxOsso(9,8,4, 5,5,1, 1.9, 1.4, 1));         // bracos largados
  p.push(vxOsso(9,14,3, 6,17,1, 1.9, 1.4, 1));
  p.push(vxBola(5,11,3, 3.4,3.2,2.6, 1));            // cabeca de lado
  p.push(vxCaixa(2,9,2, 4,5,3, 1));                  // focinho
  p.push(vxCaixa(1,10,2, 3,3,2, 6));                 // boca aberta
  p.push(vxCaixa(4,9,4, 1,1,1, 6));                  // olho apagado
  p.push(vxOsso(6,9,4, 12,4,3, 1.8, 0.7, 1));        // orelhas espalhadas no chao
  p.push(vxOsso(6,14,3, 12,19,2, 1.8, 0.7, 1));
  p.push(vxOsso(4,12,1, 15,17,1, 1.4, 1.4, 4));      // arco largado atravessado
  return p;
}

/* ============================================================
   O GOBLIN ARQUEIRO
   Baixo e torto, orelhas enormes varrendo pra tras, tunica de couro com
   peitoral de osso amarrado por cima. O arco fica na frente do corpo: e o
   que faz dar pra reconhecer de longe que este atira e o outro corre.
   ============================================================ */
const DX_GOB = 24, DY_GOB = 22, DZ_GOB = 32;

const MAT_GOB = [
  {tons: R_GOBSKIN},                                   // 1 pele
  {tons: R_LEATH},                                     // 2 couro
  {tons: R_BONE},                                      // 3 osso: peitoral, corda, presa
  {tons: R_WOOD},                                      // 4 madeira do arco
  {tons: ["#ff9a2a","#ff9a2a","#ffd08a"], emissivo:1}, // 5 olho
  {tons: ["#141008","#141008","#1e180c"]}              // 6 boca, orbita
];

function modeloGoblin(pose){
  if (pose === 3) return goblinCaido();
  const atk = pose === 2, alt = pose === 1, morto = false;
  const sA = morto ? -4 : alt ? 2 : -2, sB = morto ? 4 : alt ? -2 : 2;
  const p = [];

  /* pernas curtas e tortas, aparecendo abaixo da tunica */
  p.push(vxOsso(9,11,15,  8+sA,13,9, 2.4, 1.9, 2));
  p.push(vxOsso(8+sA,13,9, 9+sA,10,3, 1.9, 1.5, 1));
  p.push(vxCaixa(6+sA,6,0, 6,8,3, 2));                 // bota
  p.push(vxOsso(14,11,15, 15+sB,13,9, 2.4, 1.9, 2));
  p.push(vxOsso(15+sB,13,9, 14+sB,10,3, 1.9, 1.5, 1));
  p.push(vxCaixa(12+sB,6,0, 6,8,3, 2));

  /* tronco estreito: a tunica so vai ate a coxa */
  p.push(vxBola(11,10,18, 5.4,4.0,4.4, 2));
  p.push(vxBola(11,10,22, 5.0,3.8,3.4, 2));
  p.push(vxCaixa(6,7,14, 11,7,2, 2));                  // barra da tunica
  p.push(vxCaixa(6,6,20, 11,2,2, 3));                  // peitoral: so uma faixa
  p.push(vxCaixa(10,5,18, 2,2,5, 3));                  // tira vertical

  /* ombros e bracos */
  p.push(vxBola(6,10,24, 2.6,2.6,2.4, 1));
  p.push(vxBola(16,10,24, 2.6,2.6,2.4, 1));
  if (morto){
    p.push(vxOsso(6,10,24, 1,13,19, 2.0, 1.5, 1));     // bracos largados, abertos
    p.push(vxOsso(16,10,24, 22,13,19, 2.0, 1.5, 1));
  } else {
    p.push(vxOsso(6,9,24, 6,5,21, 2.0, 1.6, 1));       // braco que segura o arco
    if (atk){
      p.push(vxOsso(16,10,24, 11,12,23, 2.1, 1.6, 1)); // puxa a corda ate o queixo
    } else {
      p.push(vxOsso(16,10,24, 18,9,19, 2.1, 1.7, 1));
      p.push(vxOsso(18,9,19, 17,8,14, 1.7, 1.4, 1));
    }
  }

  /* cabeca pequena; as orelhas e que fazem a silhueta */
  p.push(vxBola(11,8,27, 4.2,3.6,3.6, 1));
  p.push(vxCaixa(9,3,25, 5,5,4, 1));                   // focinho
  p.push(vxOsso(8,8,28, 1,16,31, 1.8, 0.7, 1));
  p.push(vxOsso(14,8,28, 21,16,31, 1.8, 0.7, 1));
  p.push(vxBola(11,9,29, 4.6,4.0,2.0, 2));             // capuz
  p.push(vxOsso(11,10,30, 12,16,29, 2.4, 0.8, 2));     // ponta caindo pra tras

  p.push(vxCaixa(9,2,27, 1,2,2, 5));                   // olhos
  p.push(vxCaixa(13,2,27, 1,2,2, 5));
  if (atk){
    p.push(vxCaixa(10,2,23, 4,3,3, 6));
    p.push(vxCaixa(10,2,25, 1,2,1, 3));
    p.push(vxCaixa(13,2,25, 1,2,1, 3));
  } else {
    p.push(vxCaixa(10,2,24, 4,3,1, 6));
    p.push(vxCaixa(10,2,23, 1,2,1, 3));
    p.push(vxCaixa(13,2,23, 1,2,1, 3));
  }

  /* O arco vive num plano na frente do corpo e passa por cima e por baixo
     dele: e o que faz dar pra reconhecer de longe que este atira. A corda e
     a flecha andam em y, nao em x -- quem atira mira em voce, entao a flecha
     vem na sua direcao e aparece encurtada, que e o certo. */
  const bx = 3;
  if (morto) return p;                                 // o arco cai junto, fica pro chao
  p.push(vxOsso(bx+2,3,10, bx,3,17, 1.2, 1.5, 4));
  p.push(vxOsso(bx,3,17, bx,3,25, 1.5, 1.5, 4));
  p.push(vxOsso(bx,3,25, bx+2,3,31, 1.5, 1.2, 4));
  const cy = atk ? 12 : 5;                             // corda puxada
  p.push(vxOsso(bx+2,4,10, bx+1,cy,21, 0.5, 0.5, 3));
  p.push(vxOsso(bx+1,cy,21, bx+2,4,31, 0.5, 0.5, 3));
  if (atk){
    p.push(vxOsso(bx+1,12,21, bx+1,1,21, 0.6, 0.6, 4));
    p.push(vxOsso(bx+1,2,21, bx+1,0,21, 1.0, 0.4, 3));
  }
  return p;
}

/* O cavaleiro caido: nao ha corpo dentro, entao a armadura DESABA. Peitoral
   de um lado, elmo rolado para o outro, manto esparramado entre os dois e as
   brasas dos olhos ainda acesas dentro do elmo vazio. */
function cavaleiroCaido(){
  const p = [];
  p.push(vxBola(14,11,2, 6.4,5.4,2.0, 2));           // manto esparramado
  for (let k=0;k<6;k++){
    const x = 12 + k*2;
    p.push(vxOsso(x, 11, 1, x + 2, 6 + ((k*5)%11), 1, 1.8, 0.9, 2));
  }
  p.push(vxBola(12,11,3, 4.4,4.0,2.4, 1));           // peitoral tombado
  p.push(vxCaixa(9,8,5, 7,6,1, 1));
  p.push(vxCaixa(11,10,5, 3,3,2, 4));                // fivela de latao
  p.push(vxBola(8,8,2, 2.8,2.6,1.8, 1));             // ombreiras soltas
  p.push(vxBola(9,15,2, 2.8,2.6,1.8, 1));
  p.push(vxOsso(8,8,2, 5,6,1, 1.8, 1.4, 1));         // bracos de placas largados
  p.push(vxOsso(9,15,2, 6,18,1, 1.8, 1.4, 1));
  /* elmo rolado, de lado, com o visor virado pra voce */
  p.push(vxCaixa(1,9,1, 5,5,4, 1));
  p.push(vxBola(3,11,4, 2.8,2.6,1.6, 1));
  p.push(vxCaixa(1,8,2, 1,7,2, 5));                  // visor vazio
  p.push(vxCaixa(1,9,3, 1,1,1, 3));                  // brasas ainda acesas
  p.push(vxCaixa(1,13,3, 1,1,1, 3));
  /* a espada, caida longe da mao */
  p.push(vxOsso(17,17,1, 23,19,1, 1.0, 1.4, 1));
  p.push(vxOsso(18,17,2, 22,19,2, 0.6, 0.6, 3));
  p.push(vxCaixa(16,16,1, 2,3,2, 4));
  return p;
}

/* ============================================================
   O CAVALEIRO ESPECTRAL
   Armadura vazia flutuando. Nao tem pernas: o manto em farrapos termina no
   ar, e a caminhada e uma subida e descida em vez de passo. Dentro do elmo
   nao ha rosto, so duas brasas azuis.
   ============================================================ */
const DX_WR = 24, DY_WR = 22, DZ_WR = 32;

const MAT_WR = [
  {tons: R_STEEL},                                     // 1 aco
  {tons: R_CLOAK},                                     // 2 manto
  {tons: ["#2b8ad8","#2b8ad8","#5cb4f4"], emissivo:1}, // 3 runa, olhos
  {tons: R_BRASS},                                     // 4 latao
  {tons: ["#05070a","#05070a","#0b0f16"]}              // 5 o vazio dentro do elmo
];

function modeloCavaleiro(pose){
  if (pose === 3) return cavaleiroCaido();
  const atk = pose === 2, alt = pose === 1, morto = false;
  const bob = alt ? 1 : 0;                             // flutua: sobe e desce
  const p = [];

  /* manto em farrapos, terminando no ar em alturas diferentes */
  p.push(vxBola(11,12,18+bob, 6.4,4.6,6.4, 2));
  for (let k=0;k<7;k++){
    const x = 4 + k*2.6;
    const base = 1 + ((k*5) % 6) + bob;
    p.push(vxOsso(Math.round(x), 13, 20+bob, Math.round(x + (k-3)*0.8), 14, base, 2.0, 0.9, 2));
  }

  /* peitoral e faixas */
  p.push(vxBola(11,9,24+bob, 5.4,3.8,3.8, 1));
  p.push(vxCaixa(6,6,23+bob, 12,3,2, 1));
  p.push(vxCaixa(10,4,22+bob, 3,2,4, 4));              // fivela de latao

  /* Ombreiras puxadas pra fora e pra cima: sao elas que dizem que isto e
     armadura e nao um vulto. Ficam fora da silhueta do manto de proposito. */
  p.push(vxBola(3,9,27+bob, 3.6,3.2,2.4, 1));
  p.push(vxBola(19,9,27+bob, 3.6,3.2,2.4, 1));
  if (morto){                                          // a armadura desaba aberta
    p.push(vxOsso(3,9,25, 0,13,20, 2.2, 1.7, 1));
    p.push(vxOsso(19,9,25, 22,13,20, 2.2, 1.7, 1));
  } else {
    p.push(vxOsso(3,9,25+bob, 2,8,19+bob, 2.2, 1.8, 1));
    p.push(vxOsso(19,9,25+bob, 20,8,19+bob, 2.2, 1.8, 1));
  }

  /* elmo estreito, com o visor vazio */
  p.push(vxCaixa(8,5,27+bob, 7,8,4, 1));
  p.push(vxBola(11,9,30+bob, 3.8,3.8,1.8, 1));
  p.push(vxOsso(11,9,30+bob, 11,13,31, 1.4, 0.7, 4));  // crista
  p.push(vxCaixa(8,4,28+bob, 7,1,2, 5));               // visor vazio
  p.push(vxCaixa(9,3,28+bob, 1,2,2, 3));               // brasas no lugar dos olhos
  p.push(vxCaixa(13,3,28+bob, 1,2,2, 3));

  /* A espada e a coisa mais estreita do modelo, entao fica toda fora do
     manto -- dentro dele, aco cinza sobre azul escuro nao aparece a nenhuma
     distancia de jogo. O fio em brasa resolve o resto do contraste. */
  if (morto){
    /* A espada larga da mao e fica atravessada: e o que diz que este aqui
       nao vai mais levantar. */
    p.push(vxOsso(2,16,3, 21,17,5, 1.0, 1.4, 1));
    p.push(vxOsso(2,16,3, 6,16,3, 0.6, 0.6, 3));
    p.push(vxCaixa(18,15,4, 2,4,2, 4));
  }
  else if (atk){
    p.push(vxOsso(21,6,21+bob, 15,2,31, 1.0, 1.4, 1)); // lamina erguida
    p.push(vxOsso(17,4,26+bob, 15,3,30, 0.6, 0.6, 3)); // fio em brasa
    p.push(vxOsso(22,8,19+bob, 21,6,22, 1.6, 1.3, 4)); // punho
    p.push(vxCaixa(19,5,21+bob, 5,3,1, 4));            // guarda
  } else {
    p.push(vxOsso(22,7,17+bob, 22,6,2, 1.4, 0.9, 1));  // lamina apontada pro chao
    p.push(vxOsso(22,6,14, 22,6,4, 0.6, 0.6, 3));      // fio em brasa
    p.push(vxOsso(22,8,20+bob, 22,8,17+bob, 1.6, 1.3, 4));
    p.push(vxCaixa(20,6,17+bob, 4,4,1, 4));
  }
  return p;
}

/* A aranha morta encolhe e vira de barriga pra cima, com as oito pernas
   fechadas por cima do corpo. Nao e licenca poetica: e o que os musculos
   dela fazem quando param de ser empurrados pela pressao do sangue. */
function aranhaCaida(){
  const p = [];
  const cx = 16;
  p.push(vxBola(cx+5,14,3, 5.6,5.0,2.8, 1));         // abdome, de lado
  p.push(vxCaixa(cx+3,12,5, 3,5,1, 2));
  p.push(vxOsso(cx+1,14,3, cx-1,14,3, 1.6,2.2, 1));  // pedicelo
  p.push(vxBola(cx-4,14,3, 3.8,3.4,2.2, 1));         // cefalotorax
  /* pernas fechadas por cima, encolhidas */
  for (let i=0;i<4;i++){
    for (let s=-1;s<=1;s+=2){
      const ax = cx - 4 + i*2, ay = 14 + s*2;
      p.push(vxOsso(ax, ay, 4, ax + 3, ay + s*2, 6, 0.9, 0.7, 1));
      p.push(vxOsso(ax + 3, ay + s*2, 6, ax + 1, ay + s*3, 4, 0.7, 0.6, 1));
    }
  }
  p.push(vxCaixa(cx-7,12,3, 2,5,3, 5));              // olhos apagados
  p.push(vxCaixa(cx-7,13,4, 1,1,1, 4));
  p.push(vxCaixa(cx-7,15,4, 1,1,1, 4));
  p.push(vxOsso(cx-6,13,2, cx-9,12,1, 1.0, 0.6, 3)); // queliceras abertas
  p.push(vxOsso(cx-6,16,2, cx-9,17,1, 1.0, 0.6, 3));
  return p;
}

/* ============================================================
   A ARANHA DA CRIPTA
   Rasteira e larga: e o bicho que obriga a mirar pra baixo. O abdome fica
   atras e o cefalotorax na frente, entao de perfil ela vira um corpo
   comprido -- que e a leitura que o desenho chapado nunca deu.
   ============================================================ */
const DX_SP = 32, DY_SP = 28, DZ_SP = 16;

const MAT_SP = [
  {tons: R_CHITIN},                                    // 1 quitina
  {tons: ["#0e0a10","#140e18","#1a1220"]},             // 2 quitina escura
  {tons: R_FANG},                                      // 3 quelicera
  {tons: ["#a81810","#a81810","#e03020"], emissivo:1}, // 4 olho
  {tons: ["#050308","#050308","#0a0610"]}              // 5 sombra dos olhos
];

function modeloAranha(pose){
  if (pose === 3) return aranhaCaida();
  const atk = pose === 2, alt = pose === 1, morto = false;
  const cx = 16;
  const p = [];

  /* Corpo baixo e pequeno: numa aranha o que se ve sao as pernas. Todo
     volume a mais no corpo come o vao entre elas e vira um vulto so. */
  p.push(vxBola(cx,20,7, 6.6,5.8,3.4, 1));             // abdome, atras
  p.push(vxCaixa(cx-4,17,9, 3,5,1, 2));                // marca no dorso
  p.push(vxCaixa(cx+2,17,9, 3,5,1, 2));
  p.push(vxOsso(cx,15,7, cx,12,7, 1.6,2.4, 1));        // pedicelo
  p.push(vxBola(cx,9,7, 4.0,3.4,2.4, 1));              // cefalotorax

  /* Oito pernas finas e arqueadas: joelho alto, pe longe. As da frente
     apontam pra frente e as de tras pra tras -- e o que faz a silhueta
     abrir em vez de virar uma cortina. */
  /* Cada perna sai de um ponto proprio e o joelho fica numa altura
     propria: com todas ancoradas no mesmo lugar elas se alinham na tela e
     viram uma palicada em vez de oito pernas. */
  /* Aranha morta encolhe: as pernas se fecham por cima do corpo em vez de
     se abrirem no chao. Nao e licenca poetica -- e o que os musculos dela
     fazem quando param de ser empurrados pela pressao do sangue. */
  const alcances = morto ? [4, 4, 4, 3] : [11, 12, 11, 9];
  const pesY = morto ? [10, 11, 13, 15] : [2, 8, 17, 25];
  const joelhos = morto ? [13, 14, 13, 14] : [13, 11, 12, 10];
  for (let i=0;i<4;i++){
    const alc = alcances[i], yb = 8 + i*2, pe = pesY[i], jz = joelhos[i];
    const sobe = morto ? 11 : (alt ? (i%2) : (1-i%2)) * 2;
    for (let s=-1;s<=1;s+=2){
      const anc = cx + s*(2+i), joe = cx + s*(2+i + alc*0.30), fim = cx + s*(3 + alc);
      p.push(vxOsso(anc, yb, 7, joe, (yb+pe)/2, jz, 0.9, 0.7, 1));
      p.push(vxOsso(joe, (yb+pe)/2, jz, fim, pe, sobe, 0.7, 0.6, 1));
    }
  }

  /* seis olhos miudos em duas fileiras */
  p.push(vxCaixa(cx-3,5,7, 6,2,3, 5));
  p.push(vxCaixa(cx-3,4,9, 1,2,1, 4));
  p.push(vxCaixa(cx-1,4,9, 1,2,1, 4));
  p.push(vxCaixa(cx+1,4,9, 1,2,1, 4));
  p.push(vxCaixa(cx-2,4,7, 1,2,1, 4));
  p.push(vxCaixa(cx,4,7, 1,2,1, 4));
  p.push(vxCaixa(cx+2,4,7, 1,2,1, 4));

  /* queliceras: abrem no bote */
  const fy = atk ? 4 : 2;
  p.push(vxOsso(cx-2,6,6, cx-2-(atk?2:0),6-fy,2, 1.0, 0.6, 3));
  p.push(vxOsso(cx+1,6,6, cx+1+(atk?2:0),6-fy,2, 1.0, 0.6, 3));
  return p;
}

/* O morcego caido: uma asa aberta no chao e a outra dobrada por cima do
   corpo. E o formato que um morcego morto tem de verdade, e e o unico jeito
   de a membrana ainda aparecer depois que ele para de voar. */
function morcegoCaido(){
  const p = [];
  const cx = 14;
  /* asa aberta, esparramada no chao */
  for (let k=0;k<=10;k++){
    const t = k/10;
    const ax = Math.round(cx + 2 + 11*t);
    const y0 = 12 - Math.round(6*t), y1 = 12 + Math.round(5*t*(1 - t*0.4));
    p.push(vxCaixa(ax, y0, 0, 1, Math.max(1, y1-y0), 1, 2));
  }
  p.push(vxOsso(cx+2, 12, 1, cx+13, 6, 1, 1.2, 0.6, 1));   // osso da frente
  /* asa dobrada por cima do corpo */
  p.push(vxOsso(cx+1, 16, 3, cx+7, 19, 2, 1.2, 0.6, 1));
  for (let k=0;k<=6;k++){
    const t = k/6, ax = Math.round(cx+1 + 6*t);
    p.push(vxCaixa(ax, 16 + Math.round(3*t), 2, 1, 2, 1, 2));
  }
  p.push(vxBola(cx,14,2, 3.0,3.0,2.2, 1));           // corpo
  p.push(vxBola(cx-4,14,2, 2.8,2.8,2.2, 1));         // cabeca
  p.push(vxOsso(cx-4,13,4, cx-1,11,5, 1.2, 0.5, 1)); // orelhas
  p.push(vxOsso(cx-4,16,4, cx-1,18,5, 1.2, 0.5, 1));
  p.push(vxCaixa(cx-7,13,2, 3,3,2, 5));              // focinho, boca aberta
  p.push(vxCaixa(cx-7,13,3, 1,1,1, 4));              // olho apagado
  p.push(vxOsso(cx+2,13,1, cx+4,12,1, 0.8, 0.5, 3)); // pes encolhidos
  p.push(vxOsso(cx+2,16,1, cx+4,17,1, 0.8, 0.5, 3));
  return p;
}

/* ============================================================
   O MORCEGO-SOMBRA
   Voa em senoide e obriga a mirar pra cima. As duas poses da caminhada sao
   a asa em cima e a asa embaixo -- e o unico bicho em que a rotacao muda a
   silhueta inteira, porque de frente ele e largo e de perfil quase some.
   ============================================================ */
const DX_BAT = 28, DY_BAT = 24, DZ_BAT = 20;

const MAT_BAT = [
  {tons: R_BATFUR},                                    // 1 pelo
  {tons: R_MEMB},                                      // 2 membrana da asa
  {tons: R_FANG},                                      // 3 presa, pe
  {tons: ["#ff9000","#ff9000","#ffb400"], emissivo:1}, // 4 olho
  {tons: ["#050308","#050308","#0a0610"]}              // 5 boca
];

function modeloMorcego(pose){
  if (pose === 3) return morcegoCaido();
  const atk = pose === 2, cima = pose === 1, morto = false;
  const cx = 14, cz = 9;
  /* Morto, a asa nao esta nem em cima nem embaixo: esta amassada, meio
     fechada, que e como um morcego cai. */
  const pontaZ = morto ? 7 : atk ? 12 : (cima ? 18 : 2);
  const abertura = morto ? 0.55 : 1;
  const p = [];

  for (let s=-1;s<=1;s+=2){
    /* A asa e uma folha de um voxel de espessura, nao um feixe de ossos: a
       borda de ataque vai do ombro ate a ponta e a de fuga volta recortada
       entre os dedos. Antes os ossos ficavam na frente da membrana e a asa
       lia como um punhado de gravetos. */
    for (let k=0;k<=11;k++){
      const t = k/11;
      const ax = Math.round(cx + s*(3 + 10*t*abertura));
      const ataque = (cz+2) + (pontaZ-(cz+2))*t;
      const fuga = (cz-3) + (pontaZ-4-(cz-3))*t + Math.sin(t*Math.PI*3)*1.3;
      const z0 = Math.round(Math.min(ataque,fuga)), z1 = Math.round(Math.max(ataque,fuga));
      p.push(vxCaixa(ax, 11, z0, 1, 2, Math.max(1, z1-z0), 2));
    }
    p.push(vxOsso(cx+s*3, 10, cz+2, Math.round(cx+s*13*abertura), 10, pontaZ, 1.3, 0.7, 1));
    for (let k=0;k<3;k++){                             // dedos, por cima da membrana
      const t = (k+1)/4;
      p.push(vxOsso(cx+s*3, 10, cz+1, cx+s*(3+10*t*abertura), 10,
                    (cz+2) + (pontaZ-(cz+2))*t - k*1.6, 0.7, 0.5, 1));
    }
  }

  p.push(vxBola(cx,11,cz-1, 2.8,3.0,3.8, 1));          // corpo
  p.push(vxBola(cx,10,cz+4, 3.2,3.0,2.8, 1));          // cabeca
  p.push(vxOsso(cx-2,11,cz+6, cx-4,13,cz+10, 1.3, 0.5, 1));  // orelhas
  p.push(vxOsso(cx+2,11,cz+6, cx+4,13,cz+10, 1.3, 0.5, 1));
  p.push(vxCaixa(cx-2,7,cz+4, 4,2,2, 5));              // vinco dos olhos
  p.push(vxCaixa(cx-2,6,cz+4, 1,2,1, 4));
  p.push(vxCaixa(cx+1,6,cz+4, 1,2,1, 4));
  if (atk){
    p.push(vxCaixa(cx-2,6,cz+1, 4,3,3, 5));            // boca aberta
    p.push(vxCaixa(cx-2,6,cz+2, 1,2,2, 3));
    p.push(vxCaixa(cx+1,6,cz+2, 1,2,2, 3));
  } else {
    p.push(vxCaixa(cx-2,6,cz+2, 4,2,1, 5));
  }
  p.push(vxOsso(cx-2,11,cz-4, cx-2,12,cz-7, 0.9, 0.5, 3));   // pes
  p.push(vxOsso(cx+2,11,cz-4, cx+2,12,cz-7, 0.9, 0.5, 3));
  return p;
}

/* Vhalgorn caido: o manto vira um monte, o cranio rola para fora do capuz e
   o cajado cai atravessado com o cristal apagado. E o unico cadaver do jogo
   que tem que ler de longe, entao os chifres ficam pra fora do monte. */
function vhalgornCaido(){
  const p = [];
  /* o manto, monte comprido e baixo */
  for (let i=0;i<7;i++){
    const x = 8 + i*4.4;
    p.push(vxBola(x, 19, 3, 6.0 - i*0.3, 8.0 - i*0.5, 4.2 - i*0.35, 1));
  }
  for (let k=0;k<6;k++){                             // pregas escorrendo
    const y = 12 + k*2.6;
    p.push(vxOsso(20, Math.round(y), 2, 38, Math.round(y + (k-3)), 1, 2.0, 1.2, 1));
  }
  p.push(vxCaixa(16,14,7, 10,3,2, 3));               // sigilo, apagado, de lado
  /* o cranio rolado pra fora do capuz */
  p.push(vxBola(8,19,5, 7.0,6.4,5.6, 2));
  p.push(vxCaixa(2,15,3, 8,9,5, 2));                 // mandibula caida
  p.push(vxCaixa(2,15,3, 12,2,1, 7));
  for (let k=0;k<6;k++) p.push(vxCaixa(3+k*2,15,4, 1,2,2, 2));
  p.push(vxCaixa(4,16,8, 4,3,3, 7));                 // orbitas vazias
  p.push(vxCaixa(4,22,8, 4,3,3, 7));
  /* chifres, pra fora do monte */
  p.push(vxOsso(10,17,9, 20,8,9, 3.0, 1.0, 2));
  p.push(vxOsso(10,25,8, 20,34,7, 3.0, 1.0, 2));
  /* o cajado, atravessado, o cristal apagado no chao */
  p.push(vxOsso(4,30,1, 38,28,2, 1.9, 1.9, 4));
  p.push(vxCaixa(20,27,1, 3,4,3, 5));
  p.push(vxBola(4,31,2, 3.6,3.6,3.0, 3));
  return p;
}

/* ============================================================
   VHALGORN
   Duas vezes a altura de um homem. Cranio com chifres saindo de dentro do
   capuz, manto que arrasta no chao e o cajado com o cristal -- e o cristal
   que acende quando ele vai lancar.
   ============================================================ */
const DX_BOSS = 42, DY_BOSS = 38, DZ_BOSS = 62;

const MAT_BOSS = [
  {tons: R_ROBE},                                      // 1 manto
  {tons: R_BONE},                                      // 2 osso
  {tons: R_VIOL},                                      // 3 sigilo
  {tons: R_WOOD},                                      // 4 cajado
  {tons: R_BRASS},                                     // 5 latao
  {tons: ["#b52ba8","#b52ba8","#e64ad0"], emissivo:1}, // 6 brasa
  {tons: ["#0a0508","#0a0508","#140a10"]}              // 7 orbita
];

function modeloVhalgorn(pose){
  if (pose === 3) return vhalgornCaido();
  const atk = pose === 2, alt = pose === 1, morto = false;
  const sw = alt ? 1 : -1;                             // o manto balanca, ele nao anda
  const p = [];

  /* Manto: um tronco de cone, nao tres bolas empilhadas -- empilhadas elas
     mostravam a cintura de cada uma e ele virava um boneco de neve. */
  for (let z=0; z<42; z+=2){
    const t = z/42;
    p.push(vxBola(21, 19-t*2, z, 14.0-t*4.6, 10.0-t*2.8, 2.2, 1));
  }
  for (let k=0;k<5;k++){                               // pregas
    const x = 7 + k*7;
    p.push(vxOsso(x, 9, 27, x + (k-2)*2 + sw, 8, 1, 1.6, 1.0, 1));
  }

  /* ombros e bracos dentro das mangas */
  p.push(vxBola(9,18,41, 5.6,5.0,4.0, 1));
  p.push(vxBola(33,18,41, 5.6,5.0,4.0, 1));
  const bz = atk ? 44 : morto ? 22 : 30;
  const bx1 = morto ? 1 : 5, bx2 = morto ? 40 : 37;
  p.push(vxOsso(9,17,40, bx1,20,bz, 4.2, 3.0, 1));
  p.push(vxOsso(33,17,40, bx2,20,bz, 4.2, 3.0, 1));

  /* o sigilo no peito: losango, com a brasa so no centro */
  for (let k=0;k<7;k++){
    const larg = 7 - Math.abs(k-3)*2;
    p.push(vxCaixa(21-((larg/2)|0), 7, 31+k, larg, 2, 1, 3));
  }
  p.push(vxCaixa(20,6,33, 2,2,3, 6));

  /* capuz caido nos ombros, cranio saindo dele */
  p.push(vxBola(21,17,46, 9.0,7.4,4.6, 1));
  p.push(vxBola(21,14,50, 7.6,6.6,6.6, 2));
  p.push(vxCaixa(15,8,43, 12,7,5, 2));                 // mandibula
  p.push(vxOsso(14,12,50, 8,18,49, 2.2, 1.0, 2));      // malares
  p.push(vxOsso(28,12,50, 34,18,49, 2.2, 1.0, 2));

  /* chifres saindo de dentro do capuz, varrendo pra tras */
  p.push(vxOsso(15,14,54, 7,26,60, 3.0, 1.0, 2));
  p.push(vxOsso(27,14,54, 35,26,60, 3.0, 1.0, 2));

  /* orbitas e as brasas dentro */
  p.push(vxCaixa(14,6,48, 6,3,5, 7));
  p.push(vxCaixa(22,6,48, 6,3,5, 7));
  const bw = atk ? 3 : 2;
  p.push(vxCaixa(16,5,50, bw,2,2, 6));
  p.push(vxCaixa(24,5,50, bw,2,2, 6));

  /* dentes */
  p.push(vxCaixa(15,6,44, 12,3,1, 7));
  for (let k=0;k<6;k++) p.push(vxCaixa(15+k*2,5,44, 1,2,2, 2));

  /* o cajado, na mao direita */
  if (morto){
    /* o cajado escapa da mao e cai atravessado, com o cristal apagando */
    p.push(vxOsso(3,26,2, 39,24,4, 1.9, 1.9, 4));
    p.push(vxCaixa(20,24,2, 3,4,3, 5));
    p.push(vxBola(3,26,3, 3.6,3.6,3.2, 3));
    return p;
  }
  const cz = atk ? 4 : 2;
  p.push(vxOsso(37,11,cz, 37,11,cz+50, 1.9, 1.9, 4));
  p.push(vxCaixa(34,8,cz+26, 7,7,3, 5));               // anel de latao
  p.push(vxBola(37,11,cz+54, 3.6,3.6,4.6, 3));         // cristal
  p.push(vxBola(37,11,cz+54, atk ? 2.6 : 1.8, atk ? 2.6 : 1.8, atk ? 3.2 : 2.2, 6));
  return p;
}

/* ---------- assar tudo ----------
   Roda uma vez no carregamento. O custo esta na pele: cada voxel olha os 26
   vizinhos, entao o Vhalgorn, que tem o grid maior, e quem pesa. */
SPR.impVox      = assarCriatura(modeloDiabrete,  DX_IMP,  DY_IMP,  DZ_IMP,  MAT_IMP,  2, P_IMP);
SPR.impVox[4]   = cadaverEmOitoRumos(DIABRETE_MORTO, P_IMP, DX_IMP*2, DZ_IMP*2);
SPR.goblinVox   = assarCriatura(modeloGoblin,    DX_GOB,  DY_GOB,  DZ_GOB,  MAT_GOB,  2, P_GOB);
SPR.wraithVox   = assarCriatura(modeloCavaleiro, DX_WR,   DY_WR,   DZ_WR,   MAT_WR,   2, P_WR);
SPR.spiderVox   = assarCriatura(modeloAranha,    DX_SP,   DY_SP,   DZ_SP,   MAT_SP,   2, P_SPIDER);
SPR.batVox      = assarCriatura(modeloMorcego,   DX_BAT,  DY_BAT,  DZ_BAT,  MAT_BAT,  2, P_BAT);
SPR.bossVox     = assarCriatura(modeloVhalgorn,  DX_BOSS, DY_BOSS, DZ_BOSS, MAT_BOSS, 2, P_BOSS);
