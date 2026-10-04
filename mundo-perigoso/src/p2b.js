
/* ============================================================
   ALTURAS E GEOMETRIA
   ------------------------------------------------------------
   O mapa ASCII continua sendo a fonte da verdade para o que e
   parede e o que e chao. O que muda e que agora cada tile tem
   altura de piso e de teto -- e disso saem poco, degrau, plataforma
   e teto alto. As portas viram teto que desce ate o chao, que e
   exatamente como o Doom fazia.

   A geometria e montada UMA vez, em pedacos de 16x16 tiles, e nao mais
   a cada quadro. Cada quadro so escolhe as faces que se veem, de perto
   para longe. Mexer num tile -- uma porta que abre, uma peca posta --
   suja o pedaco dele, e so ele e remontado antes do proximo desenho.
   ============================================================ */
const F_DEF = 0, C_DEF = 1.25;                 // piso e teto padrao, em tiles
let FLOORZ = null, CEILZ = null;
let CEUZ = null;                               // 1 = aberto pro ceu, sem quad de teto
let TOPOZ = null;                              // ilha: topo do telhado, acima do forro

/* Zonas retangulares aplicadas em ordem: [x0,y0,x1,y1, piso, teto, ceu?].
   Com `ceu` a altura do teto continua valendo como topo de parede e como
   limite de pulo -- so o quad de teto deixa de existir, e o ceu aparece. */
const ZONES = [
  [0,0,39,31, F_DEF, C_DEF],

  /* --- entrada: dois degraus subindo para o corredor --- */
  [3,26,12,30,  -0.30, 1.15],
  [3,26,12,27,  -0.15, 1.20],
  [7,22,9,25,    0.00, 1.20],

  /* --- salao dos pilares: pe-direito alto, para o olhar subir --- */
  [2,13,14,21,   0.00, 2.30],
  [4,14,12,20,  -0.25, 2.30],                  // piso rebaixado no meio

  /* --- biblioteca: mezanino ao norte, obriga olhar pra cima --- */
  [20,13,29,21,  0.00, 2.05],
  [20,13,23,14,  1.00, 2.05],                  // a sacada, so na ala oeste
  [20,15,21,15,  0.62, 2.05],                  // rampa: 3 degraus de 0.32
  [20,16,20,16,  0.30, 2.05],

  /* --- camara de lava: caldeira aberta pro ceu --- */
  [18,3,36,10,   0.00, 2.60, 1],
  [22,5,32,8,   -0.85, 2.60, 1],               // fosso de lava
  [26,6,28,7,    0.05, 2.60, 1],               // a ilha da chave
  [27,5,27,5,    0.05, 2.60, 1],               // passarela para a ilha

  /* --- cripta: altar elevado e nichos --- */
  [26,24,37,30,  0.00, 2.75],
  [30,26,34,29,  0.45, 2.75],                  // o altar de Vhalgorn
  [26,24,37,24, -0.20, 2.75]
];

function applyZones(){
  for (const z of ZONES)
    for (let y=z[1]; y<=z[3]; y++)
      for (let x=z[0]; x<=z[2]; x++){
        if (x<0||y<0||x>=MW||y>=MH) continue;
        FLOORZ[y*MW+x] = z[4]; CEILZ[y*MW+x] = z[5]; CEUZ[y*MW+x] = z[6] ? 1 : 0;
      }
}
/* O mapa do editor ja traz piso, teto e ceu de cada tile -- ver ilha.js. */
function aplicarIlha(){
  FLOORZ.set(ILHA_MOTOR.piso); CEILZ.set(ILHA_MOTOR.teto);
  CEUZ.set(ILHA_MOTOR.ceu);    TOPOZ.set(ILHA_MOTOR.topo);
}


/* ---------- chao inclinado (DESIGN.md, o canteiro, 6) ----------
   Proposta de 29/9, desligada por padrao. O mapa continua com uma altura por
   tile; aqui cada tile ganha quatro cantos, e o chao corre de um tile ao
   vizinho quando a diferenca entre os dois e de ate `degraus` degraus. Acima
   disso e penhasco: o canto fica na altura do tile e a parede vertical
   continua. So chao natural ao ar livre da ilha (nao agua, parede, porta, casa,
   nem piso feito: calcada, lajota e tabuado sao escada).
   Ligar: CHAO.ligado = true e montarChaoInclinado(), ou ?chao=inclinado
   no endereco (com ?degraus=3 para mudar o limite). */
const CHAO = {ligado:false, degraus:2};
if (typeof BUSCA_INICIAL === "string" && /[?&]chao=inclinado/.test(BUSCA_INICIAL)){
  CHAO.ligado = true;
  const dg = BUSCA_INICIAL.match(/[?&]degraus=(d+)/);
  if (dg) CHAO.degraus = +dg[1];
}
let CHAO_Z = null;                             // 4 cantos por tile: bit 0 = x+1, bit 1 = y+1
let CHAO_PECA = new Uint8Array(0);             // 1 onde uma peca se apoia: o chao dali fica plano
const CANTO_A = [1, 3, 2, 0], CANTO_B = [3, 2, 0, 1];      // por lado, os cantos da aresta a->b no tile
const CANTO_VIZ_A = [0, 1, 3, 2], CANTO_VIZ_B = [2, 0, 1, 3];   // e os mesmos pontos, no vizinho
/* So o chao que a natureza inclina: areia, grama, mato, lama, terra e encosta.
   Calcada, lajota e tabuado sao piso feito -- os degraus deles sao escada, e
   escada continua escada. */
const CHAO_NATURAL = {areia:1, grama:1, mato:1, lama:1, terra:1, encosta:1};
function chaoRampavel(i){
  const c = MAP[(i / MW) | 0][i % MW];
  return (c === "." || c === "p") && CEUZ[i] === 1 && !NO_TELHADO[i] && !CHAO_PECA[i] &&
         CHAO_NATURAL[TERRENOS[ILHA.terreno[i]].id] === 1;
}
let CHAO_RAMP = null;                          // 1 no tile que pode inclinar
/* os quatro cantos de um tile: a media do piso dele e dos tiles em volta do
   canto que tambem sao rampa e estao dentro do limite */
function cantosDoTile(i, lim){
  const Z = CHAO_Z, f = FLOORZ[i], x = i % MW, y = (i / MW) | 0;
  for (let k=0; k<4; k++){
    if (!CHAO_RAMP[i]){ Z[i*4 + k] = f; continue; }
    const cx = x + (k & 1), cy = y + (k >> 1);
    let soma = 0, c = 0;
    for (let dy=-1; dy<=0; dy++) for (let dx=-1; dx<=0; dx++){
      const xx = cx + dx, yy = cy + dy;
      if (xx < 0 || yy < 0 || xx >= MW || yy >= MH) continue;
      const j = yy*MW + xx;
      if (j === i || (CHAO_RAMP[j] && Math.abs(FLOORZ[j] - f) <= lim)){ soma += FLOORZ[j]; c++; }
    }
    Z[i*4 + k] = soma / c;
  }
}
/* Sem argumento, refaz o mapa inteiro. Com a lista de tiles mexidos, so eles
   e os vizinhos (o canto de um tile depende dos quatro em volta dele): a
   ilha de 650 leva 60 ms inteira, e o canteiro chama a cada pincelada.
   Devolve os tiles refeitos, para sujar os pedacos deles (null se foi tudo). */
function montarChaoInclinado(tiles){
  if (!CHAO.ligado || !ILHA_MOTOR){ CHAO_Z = null; CHAO_RAMP = null; return null; }
  const n = MW*MH, lim = CHAO.degraus*ILHA.passo + 1e-4;
  if (tiles && CHAO_Z && CHAO_Z.length === n*4 && CHAO_RAMP){
    const T2 = new Set();
    for (const i of tiles) CHAO_RAMP[i] = chaoRampavel(i) ? 1 : 0;
    for (const i of tiles){
      const x = i % MW, y = (i / MW) | 0;
      for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < MW && yy < MH) T2.add(yy*MW + xx);
      }
    }
    for (const j of T2) cantosDoTile(j, lim);
    return Array.from(T2);
  }
  CHAO_Z = new Float32Array(n*4); CHAO_RAMP = new Uint8Array(n);
  CHAO_PECA = new Uint8Array(n);
  for (const p of (ILHA.pecas || [])){
    /* a peca e desenhada em chao reto: o tile dela, e o vizinho por onde ela passa, ficam planos */
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
      const xx = Math.floor(p.x) + dx, yy = Math.floor(p.y) + dy;
      if (xx >= 0 && yy >= 0 && xx < MW && yy < MH) CHAO_PECA[yy*MW + xx] = 1;
    }
  }
  for (let i=0; i<n; i++) CHAO_RAMP[i] = chaoRampavel(i) ? 1 : 0;
  for (let i=0; i<n; i++) cantosDoTile(i, lim);
  return null;
}
/* o tile tem algum canto fora do piso dele */
function chaoInclinadoEm(i){
  if (!CHAO_Z) return false;
  const f = FLOORZ[i];
  for (let k=0; k<4; k++) if (Math.abs(CHAO_Z[i*4 + k] - f) > 1e-4) return true;
  return false;
}
/* a altura do chao num ponto: nos cantos do tile, pelos dois triangulos em
   que o quad torto e desenhado */
function alturaDoChao(x, y){
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return 0;
  const i = ty*MW + tx;
  if (!CHAO_Z) return FLOORZ[i];
  const u = x - tx, v = y - ty, z00 = CHAO_Z[i*4], z10 = CHAO_Z[i*4+1], z01 = CHAO_Z[i*4+2], z11 = CHAO_Z[i*4+3];
  return u + v <= 1 ? z00 + u*(z10 - z00) + v*(z01 - z00) : z11 + (1 - u)*(z01 - z11) + (1 - v)*(z10 - z11);
}

/* ---------- telhados inclinados ----------
   Todo telhado da ilha e de quatro aguas: a beira no alto da parede e a
   cumeeira no meio. A altura de cada canto sai da distancia dele ate a borda
   do telhado, entao o mesmo calculo cobre casa de qualquer formato.

   Entram no telhado os tiles cobertos e as paredes de casa em volta deles,
   cantos inclusive -- senao sobra um buraco em cada quina. Parede de casa e
   pedra e madeira, as que tem janela; palicada, cerca e rocha nao. */
const INCLINACAO = 0.5;                        // tiles de subida por tile de telhado
let NO_TELHADO = null;                         // 1 = tile coberto, 2 = parede debaixo do telhado
let TELHADO_Z  = null;                         // (MW+1)*(MH+1) cantos
let TELHADO_FUNDO = null;                      // tiles ate a borda do telhado, contando a borda como 1
let TELHADO_MARCA = null, TELHADO_VEZ = 0;     // visitado nesta passada
const CHAMINES = [];

/* O que o tile e para o telhado: 1 coberto, 2 parede de casa encostada em
   tile coberto (cantos inclusive), 0 nada. */
function telhadoDoTile(i){
  if (!CEUZ[i]) return 1;
  const x = i % MW, y = (i / MW) | 0;
  if (MAP[y][x] !== "^" || !REG_ILHA[ILHA.terreno[i]].janela) return 0;
  for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < MW && yy < MH && !CEUZ[yy*MW + xx]) return 2;
  }
  return 0;
}
function vizinhos4(i){
  const x = i % MW, y = (i / MW) | 0;
  return [x > 0 ? i-1 : -1, x < MW-1 ? i+1 : -1, y > 0 ? i-MW : -1, y < MH-1 ? i+MW : -1];
}
/* Os telhados separados que nascem das sementes: cada um e a lista dos
   tiles ligados. Semente ja visitada nesta passada nao abre outro. */
function telhadosDe(sementes, R){
  const vez = TELHADO_VEZ, marca = TELHADO_MARCA, out = [];
  for (const s of sementes){
    if (!R[s] || marca[s] === vez) continue;
    const tiles = [], pilha = [s];
    marca[s] = vez;
    while (pilha.length){
      const i = pilha.pop();
      tiles.push(i);
      for (const j of vizinhos4(i)) if (j >= 0 && R[j] && marca[j] !== vez){ marca[j] = vez; pilha.push(j); }
    }
    out.push(tiles);
  }
  return out;
}
/* Um telhado: a beira e a mais alta entre o forro e as paredes; a altura
   de cada canto sai da distancia dele ate a borda; e casa grande ganha
   chamine, uma sim e outra nao, no ultimo tile do segundo anel -- perto da
   beira, onde se ve de longe. */
function erguerTelhado(tiles){
  const R = NO_TELHADO, fundo = TELHADO_FUNDO;
  let beira = 0, primeiro = Infinity;
  for (const i of tiles){
    beira = Math.max(beira, R[i] === 2 ? FLOORZ[i] : TOPOZ[i]);
    if (i < primeiro) primeiro = i;
    fundo[i] = 0;
  }
  let fila = [];
  for (const i of tiles) if (vizinhos4(i).some(function(j){ return j < 0 || !R[j]; })){ fundo[i] = 1; fila.push(i); }
  while (fila.length){
    const prox = [];
    for (const i of fila) for (const j of vizinhos4(i))
      if (j >= 0 && R[j] && !fundo[j]){ fundo[j] = fundo[i] + 1; prox.push(j); }
    fila = prox;
  }
  const fundoEm = function(x, y){ return x < 0 || y < 0 || x >= MW || y >= MH ? 0 : fundo[y*MW + x]; };
  let cumeeira = 0;
  for (const i of tiles){
    TOPOZ[i] = beira;                           // a faixa acima da porta, vista de fora, para na beira
    const x = i % MW, y = (i / MW) | 0;
    for (let k=0; k<4; k++){
      const cx = x + (k & 1), cy = y + (k >> 1);
      const d = Math.min(fundoEm(cx-1, cy-1), fundoEm(cx, cy-1), fundoEm(cx-1, cy), fundoEm(cx, cy));
      const c = cy*(MW+1) + cx, z = beira + INCLINACAO*d;
      if (z > TELHADO_Z[c]) TELHADO_Z[c] = z;
      cumeeira = Math.max(cumeeira, d);
    }
  }
  if (tiles.length >= 12 && (hashTile(primeiro % MW, (primeiro / MW) | 0) & 1)){
    let alvo = -1;
    for (const i of tiles) if (fundo[i] === 2 && i > alvo) alvo = i;
    if (alvo >= 0) CHAMINES.push({i:alvo, x:alvo % MW + 0.5, y:((alvo / MW) | 0) + 0.5,
                                  z0:beira, z1:beira + INCLINACAO*cumeeira + 0.4});
  }
}
/* Todo telhado da ilha e de quatro aguas: a beira no alto da parede e a
   cumeeira no meio. A altura de cada canto sai da distancia dele ate a borda
   do telhado, entao o mesmo calculo cobre casa de qualquer formato.

   Entram no telhado os tiles cobertos e as paredes de casa em volta deles,
   cantos inclusive -- senao sobra um buraco em cada quina. Parede de casa e
   pedra e madeira, as que tem janela; palicada, cerca e rocha nao. */
function montarTelhados(){
  const n = MW*MH, R = NO_TELHADO;
  for (let i=0; i<n; i++) R[i] = telhadoDoTile(i);
  TELHADO_VEZ++;
  const todos = [];
  for (let i=0; i<n; i++) if (R[i]) todos.push(i);
  for (const t of telhadosDe(todos, R)) erguerTelhado(t);
}
/* So os telhados que os tiles mexidos tocam -- os de antes e os de agora,
   que podem ter juntado ou partido -- e os que encostam neles pela quina,
   porque o canto de quina e dividido. Devolve os tiles refeitos, para sujar
   os pedacos deles. */
function refazerTelhados(mexidos){
  const R = NO_TELHADO, W1 = MW + 1;
  const perto = new Set();
  for (const i of mexidos){
    const x = i % MW, y = (i / MW) | 0;
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < MW && yy < MH) perto.add(yy*MW + xx);
    }
  }
  TELHADO_VEZ++;
  const antes = [].concat.apply([], telhadosDe(perto, R));        // os telhados de antes
  for (const i of perto) R[i] = telhadoDoTile(i);
  TELHADO_VEZ++;
  const agora = telhadosDe(Array.from(perto).concat(antes), R);    // os de agora
  const mexer = new Set(antes);
  for (const t of agora) for (const i of t) mexer.add(i);
  /* os que encostam pela quina: refeitos para devolver o canto dividido */
  const quina = [];
  for (const i of mexer){
    const x = i % MW, y = (i / MW) | 0;
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < MW && yy < MH && R[yy*MW + xx]) quina.push(yy*MW + xx);
    }
  }
  const vizinhos = telhadosDe(quina, R);
  for (const i of mexer){
    const x = i % MW, y = (i / MW) | 0;
    TELHADO_Z[y*W1 + x] = 0; TELHADO_Z[y*W1 + x + 1] = 0;
    TELHADO_Z[(y+1)*W1 + x] = 0; TELHADO_Z[(y+1)*W1 + x + 1] = 0;
    TOPOZ[i] = ILHA_MOTOR.topo[i];
    TELHADO_FUNDO[i] = 0;
  }
  const todos = new Set(mexer);
  for (const t of vizinhos) for (const i of t){ todos.add(i); TOPOZ[i] = ILHA_MOTOR.topo[i]; }
  for (let k=CHAMINES.length-1; k>=0; k--) if (todos.has(CHAMINES[k].i)) CHAMINES.splice(k, 1);
  for (const t of agora) erguerTelhado(t);
  for (const t of vizinhos) erguerTelhado(t);
  for (const i of perto) todos.add(i);
  return todos;
}

/* Aloca as grades do mundo de agora e poe as alturas: as zonas da cripta ou
   o mapa do editor com os telhados. Roda no carregamento e de novo a cada
   troca de mundo. O alcance tambem e do mundo: a ilha desenha o dobro. */
let FAR = 30, FAR2 = 900;
function montarAlturas(){
  const n = MW*MH;
  FLOORZ = new Float32Array(n); CEILZ = new Float32Array(n);
  CEUZ = new Uint8Array(n); TOPOZ = new Float32Array(n);
  NO_TELHADO = new Uint8Array(n); TELHADO_Z = new Float32Array((MW+1)*(MH+1));
  TELHADO_FUNDO = new Int32Array(n); TELHADO_MARCA = new Int32Array(n); TELHADO_VEZ = 0;
  CHAMINES.length = 0;
  if (ILHA_MOTOR){ aplicarIlha(); montarTelhados(); montarChaoInclinado(); } else applyZones();
  /* Medido no navegador com um mapa de 200 tiles: o mundo custa 1,6 ms por
     quadro com 30 tiles, 2,5 ms com 60 e 4 ms com 90, de um orcamento de 16.
     O limite nao e o tempo -- e que longe demais cada tile vira meio pixel e
     cintila, e ai quem resolve e juntar os tiles distantes. */
  FAR = ILHA_MOTOR ? 60 : 30; FAR2 = FAR*FAR;
}
montarAlturas();

/* O terreno mudou nestes tiles -- o canteiro pintou, ou desfez. O motor da
   ilha, as alturas e os telhados saem de novo so ali, e os pedacos deles
   ficam sujos, para serem remontados quando entrarem no alcance. Refazer a
   ilha de 650 inteira custava 4 s a cada pincelada. */
function atualizarTerreno(tiles){
  if (!ILHA_MOTOR) return;
  const feitos = atualizarMotorDaIlha(ILHA, ILHA_MOTOR, tiles);
  for (const i of feitos){
    FLOORZ[i] = ILHA_MOTOR.piso[i]; CEILZ[i] = ILHA_MOTOR.teto[i];
    CEUZ[i] = ILHA_MOTOR.ceu[i];    TOPOZ[i] = ILHA_MOTOR.topo[i];
    /* porta pintada ou apagada: a porta do motor vem e vai junto */
    const x = i % MW, y = (i / MW) | 0, c = MAP[y][x];
    if (doorChar(c) && !doors.has(i)) doors.set(i, {open:0, run:0, locked:c==="L", secret:c==="S", x:x, y:y});
    else if (!doorChar(c) && doors.has(i)) doors.delete(i);
  }
  const telhados = refazerTelhados(feitos);
  for (const i of telhados) sujarTile(i % MW, (i / MW) | 0);
  if (CHAO_Z){
    /* o chao inclinado so refaz o que mudou; o telhado refeito muda o que e rampa */
    const sujos = montarChaoInclinado(Array.from(new Set(feitos.concat(Array.from(telhados)))));
    if (sujos) for (const i of sujos) sujarTile(i % MW, (i / MW) | 0);
  }
}

/* uma parede solida do mapa e representada como teto colado no piso */
const solidChar = (c)=> c==="#"||c==="="||c==="R"||c==="x";
const doorChar  = (c)=> c==="D"||c==="L"||c==="S";

function floorAt(tx,ty){
  if (tx<0||ty<0||tx>=MW||ty>=MH) return 0;
  return FLOORZ[ty*MW+tx];
}
/* teto efetivo: numa porta ele desce ate o piso conforme ela fecha */
function ceilAt(tx,ty){
  if (tx<0||ty<0||tx>=MW||ty>=MH) return 0;
  const c = MAP[ty][tx];
  if (solidChar(c)) return FLOORZ[ty*MW+tx];
  if (doorChar(c)){
    const d = doors.get(ty*MW+tx), f = FLOORZ[ty*MW+tx];
    return f + (CEILZ[ty*MW+tx] - f) * (d ? d.open : 0);
  }
  return CEILZ[ty*MW+tx];
}
/* espaco livre entre piso e teto */
const gapAt = (tx,ty)=> ceilAt(tx,ty) - floorAt(tx,ty);

/* ============================================================
   A FACE
   Um poligono convexo de ate 8 cantos, cada um com a sua coordenada de
   textura. A ordem dos cantos diz a frente: vista de frente ela corre no
   sentido anti-horario, e a normal (a de Newell) aponta para quem ve. So
   a frente e desenhada -- a de costas sempre fica atras de outra face, e
   desenhar as duas era metade do trabalho do rasterizador.

   `tex` e a textura, ou a lista de quadros de uma animada (agua, lava), e
   entao `anim` e quantos quadros por segundo.
   ============================================================ */
function novaFace(n){
  return {n:n, p:new Float32Array(3*n), uv:new Float32Array(2*n), tex:null, anim:0, emis:0,
          cx:0, cy:0, cz:0, r:0, nx:0, ny:0, nz:0, d:0};
}
function fecharFace(f){
  const n = f.n, p = f.p;
  let cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0;
  for (let i=0; i<n; i++){
    const j = (i + 1) % n;
    const xi = p[3*i], yi = p[3*i+1], zi = p[3*i+2], xj = p[3*j], yj = p[3*j+1], zj = p[3*j+2];
    nx += (yi - yj)*(zi + zj); ny += (zi - zj)*(xi + xj); nz += (xi - xj)*(yi + yj);
    cx += xi; cy += yi; cz += zi;
  }
  cx /= n; cy /= n; cz /= n;
  const L = Math.hypot(nx, ny, nz) || 1;
  f.nx = nx/L; f.ny = ny/L; f.nz = nz/L;
  f.d = f.nx*p[0] + f.ny*p[1] + f.nz*p[2];
  f.cx = cx; f.cy = cy; f.cz = cz;
  let r = 0;
  for (let i=0; i<n; i++) r = Math.max(r, Math.hypot(p[3*i] - cx, p[3*i+1] - cy, p[3*i+2] - cz));
  f.r = r;
  return f;
}
/* inverte a frente sem mexer em qual texel cai em qual canto */
function virarFace(f){
  const n = f.n, p = f.p, uv = f.uv;
  for (let i=0, j=n-1; i<j; i++, j--){
    for (let k=0; k<3; k++){ const t = p[3*i+k]; p[3*i+k] = p[3*j+k]; p[3*j+k] = t; }
    for (let k=0; k<2; k++){ const t = uv[2*i+k]; uv[2*i+k] = uv[2*j+k]; uv[2*j+k] = t; }
  }
  return fecharFace(f);
}
/* o triangulo a, b, c de uma face, com a textura dos mesmos cantos */
function triangulo(f, a, b, c){
  const t = novaFace(3);
  [a, b, c].forEach(function(k, i){
    t.p[3*i] = f.p[3*k]; t.p[3*i+1] = f.p[3*k+1]; t.p[3*i+2] = f.p[3*k+2];
    t.uv[2*i] = f.uv[2*k]; t.uv[2*i+1] = f.uv[2*k+1];
  });
  t.tex = f.tex; t.anim = f.anim; t.emis = f.emis;
  return fecharFace(t);
}
/* Quatro cantos com a textura como o quad de antes: p0 em (u0,v0), p1 em
   (u1,v0), p2 em (u1,v1), p3 em (u0,v1). */
function quadFace(x0,y0,z0, x1,y1,z1, x2,y2,z2, x3,y3,z3, u0,v0,u1,v1, tex, emis){
  const f = novaFace(4), p = f.p, uv = f.uv;
  p[0]=x0; p[1]=y0; p[2]=z0;  p[3]=x1; p[4]=y1; p[5]=z1;
  p[6]=x2; p[7]=y2; p[8]=z2;  p[9]=x3; p[10]=y3; p[11]=z3;
  uv[0]=u0; uv[1]=v0; uv[2]=u1; uv[3]=v0; uv[4]=u1; uv[5]=v1; uv[6]=u0; uv[7]=v1;
  f.tex = tex; f.emis = emis || 0;
  return fecharFace(f);
}
/* Parede de a ate b, vista de quem esta a esquerda de a->b olhando de cima
   com y para baixo -- o lado de dentro do tile que a emite. A textura e a
   de antes: a em (ua, va), b em (ub, va), e vb no alto. */
function faceParede(ax, ay, bx, by, z0, z1, ua, va, ub, vb, tex, emis){
  return quadFace(bx,by,z0, ax,ay,z0, ax,ay,z1, bx,by,z1, ub,va,ua,vb, tex, emis);
}

/* textura da parede que separa (tx,ty) do vizinho, olhando de fora */
function sideTex(tx,ty){
  const c = MAP[ty] ? MAP[ty][tx] : "#";
  if (c === "=") return TEX.column;
  if (c === "R") return TEX.rune;
  if (c === "x") return TEX.portal;
  if (c === "D") return TEX.wood;
  if (c === "L") return TEX.sealed;
  return TEX[REG[regionOf(tx,ty)].wall];
}
const emissiveTile = (c)=> c === "R" || c === "x";

/* ============================================================
   OS PEDACOS
   ============================================================ */
const PEDACO = 16;                             // tiles de lado
const FUNDE = 4;                               // piso igual vizinho junta ate 4x4 tiles
let PEDACOS = [], NPX = 0, NPY = 0, PEDACOS_SUJOS = false, PEDACOS_MONTADOS = 0;
function montarPedacos(){
  NPX = Math.ceil(MW/PEDACO); NPY = Math.ceil(MH/PEDACO);
  PEDACOS = new Array(NPX*NPY);
  for (let py=0; py<NPY; py++) for (let px=0; px<NPX; px++){
    const k = py*NPX + px;
    PEDACOS[k] = {k:k, x0:px*PEDACO, y0:py*PEDACO, x1:Math.min(MW, (px+1)*PEDACO), y1:Math.min(MH, (py+1)*PEDACO),
                  faces:[], sujo:true, cx:0, cy:0, r:0};
  }
  PEDACOS_SUJOS = true;
}
function pedacoDoTile(tx, ty){
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return null;
  return PEDACOS[((ty/PEDACO) | 0)*NPX + ((tx/PEDACO) | 0)] || null;
}
/* Mexer num tile muda as faces dele e as paredes dos vizinhos que olham
   para ele -- que podem estar no pedaco do lado. */
function sujarTile(tx, ty){
  for (const d of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
    const P = pedacoDoTile(tx + d[0], ty + d[1]);
    if (P){ P.sujo = true; PEDACOS_SUJOS = true; }
  }
}
/* Pedaco sujo so e montado quando entra no alcance: a ilha tem 1.681
   pedacos, montar todos custava 4 s na abertura, e quem esta num canto
   nunca ve o outro. Sem camera monta todos -- e o que o teste e a linha de
   comando querem. */
const RAIO_DO_PEDACO = PEDACO*Math.SQRT1_2;
function remontarSujos(cx, cy){
  if (!PEDACOS_SUJOS) return;
  let resta = false;
  for (const P of PEDACOS){
    if (!P.sujo) continue;
    if (cx !== undefined && Math.hypot((P.x0 + P.x1)/2 - cx, (P.y0 + P.y1)/2 - cy) > FAR + RAIO_DO_PEDACO + 4){
      resta = true;
      continue;
    }
    montarPedaco(P);
  }
  PEDACOS_SUJOS = resta;
}

/* Piso e forro iguais vizinhos -- mesma altura, mesma textura -- viram um
   quad so. A textura repete por tile de qualquer jeito, entao nada muda na
   tela; muda que a ilha de 650 tiles cabe em uns 74 mil quads em vez de 450
   mil. Fundir mais que 4x4 atrapalha a ordem de perto para longe. */
function fundirPlanos(P, out, chave, emitir){
  const W0 = P.x1 - P.x0, H0 = P.y1 - P.y0, k = new Array(W0*H0), feito = new Uint8Array(W0*H0);
  for (let y=0; y<H0; y++) for (let x=0; x<W0; x++) k[y*W0 + x] = chave(P.x0 + x, P.y0 + y);
  for (let y=0; y<H0; y++) for (let x=0; x<W0; x++){
    const i = y*W0 + x, a = k[i];
    if (feito[i] || !a) continue;
    let w = 1;
    while (x + w < W0 && w < FUNDE && !feito[i+w] && k[i+w] && igual(k[i+w], a)) w++;
    let h = 1;
    fora: while (y + h < H0 && h < FUNDE){
      for (let j=0; j<w; j++){ const q = (y+h)*W0 + x + j; if (feito[q] || !k[q] || !igual(k[q], a)) break fora; }
      h++;
    }
    for (let yy=0; yy<h; yy++) for (let xx=0; xx<w; xx++) feito[(y+yy)*W0 + x + xx] = 1;
    out.push(emitir(P.x0 + x, P.y0 + y, P.x0 + x + w, P.y0 + y + h, a));
  }
  function igual(b, a){ return b.z === a.z && b.tex === a.tex && b.emis === a.emis; }
}

function montarPedaco(P){
  const out = [];
  P.faces = out; P.sujo = false; PEDACOS_MONTADOS++;
  /* pisos: o alto de uma parede debaixo do telhado nao aparece, o telhado cobre;
     piso animado -- a lava, e na ilha a agua -- e uma lista de quadros */
  fundirPlanos(P, out, function(tx, ty){
    const c = MAP[ty][tx];
    if (solidChar(c)) return null;
    if (ILHA_MOTOR && NO_TELHADO[ty*MW+tx] === 2) return null;
    if (CHAO_Z && chaoInclinadoEm(ty*MW+tx)) return null;
    const lava = c === "~", tp = lava ? TEX.lava : TEX[REG[regionOf(tx,ty)].floor];
    return {z:floorAt(tx,ty), tex:tp, emis:lava ? 2 : 0, anim:tp.length ? (lava ? 7 : 2.5) : 0};
  }, function(x0, y0, x1, y1, a){
    const f = quadFace(x0,y0,a.z, x1,y0,a.z, x1,y1,a.z, x0,y1,a.z, x0,y0, x1,y1, a.tex, a.emis);
    f.anim = a.anim;
    return f;
  });
  if (CHAO_Z) for (let ty=P.y0; ty<P.y1; ty++) for (let tx=P.x0; tx<P.x1; tx++){
    const i = ty*MW + tx;
    if (!chaoInclinadoEm(i)) continue;
    const tp = TEX[REG[regionOf(tx,ty)].floor];
    const f = quadFace(tx,ty,CHAO_Z[i*4], tx+1,ty,CHAO_Z[i*4+1], tx+1,ty+1,CHAO_Z[i*4+3], tx,ty+1,CHAO_Z[i*4+2], tx,ty, tx+1,ty+1, tp, 0);
    f.anim = tp.length ? 2.5 : 0;
    out.push(f);
  }
  /* forros -- tile aberto pro ceu nao tem */
  fundirPlanos(P, out, function(tx, ty){
    const c = MAP[ty][tx];
    if (solidChar(c)) return null;
    const f = floorAt(tx,ty), ce = ceilAt(tx,ty);
    if (!(ce > f + 0.001) || CEUZ[ty*MW+tx]) return null;
    return {z:ce, tex:TEX[REG[regionOf(tx,ty)].ceil], emis:0};
  }, function(x0, y0, x1, y1, a){
    return quadFace(x0,y1,a.z, x1,y1,a.z, x1,y0,a.z, x0,y0,a.z, x0,y1, x1,y0, a.tex, 0);
  });
  for (let ty=P.y0; ty<P.y1; ty++) for (let tx=P.x0; tx<P.x1; tx++) emitirLados(tx, ty, out);
  if (ILHA_MOTOR){
    for (let ty=P.y0; ty<P.y1; ty++) for (let tx=P.x0; tx<P.x1; tx++)
      if (NO_TELHADO[ty*MW+tx]) out.push(faceTelhado(tx, ty));
    for (const c of CHAMINES) if (pedacoDoTile(c.x|0, c.y|0) === P) emitirChamine(c, out);
  }
  if (typeof facesDasPecasNoPedaco === "function") facesDasPecasNoPedaco(P, out);
  /* Quad torto -- os quatro cantos fora de um plano, como no telhado perto
     da cumeeira -- vira dois triangulos, os mesmos em que o rasterizador ja
     o cortava. Com um plano medio so, a frente dele erra no olhar rasante de
     quem esta no chao, e o alto do telhado sumia. */
  for (let i=out.length-1; i>=0; i--){
    const f = out[i];
    if (f.n !== 4) continue;
    let torto = false;
    for (let j=0; j<4 && !torto; j++)
      if (Math.abs(f.nx*f.p[3*j] + f.ny*f.p[3*j+1] + f.nz*f.p[3*j+2] - f.d) > 1e-4) torto = true;
    if (torto) out.splice(i, 1, triangulo(f, 0, 1, 2), triangulo(f, 0, 2, 3));
  }
  /* o circulo que contem o pedaco, para o recorte do quadro */
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const f of out){
    x0 = Math.min(x0, f.cx - f.r); y0 = Math.min(y0, f.cy - f.r);
    x1 = Math.max(x1, f.cx + f.r); y1 = Math.max(y1, f.cy + f.r);
  }
  if (!out.length){ x0 = P.x0; y0 = P.y0; x1 = P.x1; y1 = P.y1; }
  P.cx = (x0 + x1)/2; P.cy = (y0 + y1)/2; P.r = Math.hypot(x1 - x0, y1 - y0)/2;
}

/* As paredes de um tile: uma por vizinho cujo piso sobe ou cujo teto desce. */
function emitirLados(tx, ty, out){
  const c = MAP[ty][tx];
  if (solidChar(c)) return;                    // bloco macico: so as faces dos vizinhos
  const f = floorAt(tx,ty), ce = ceilAt(tx,ty);
  for (let s=0;s<4;s++){
    const nx = tx + (s===0?1:s===2?-1:0), ny = ty + (s===1?1:s===3?-1:0);
    if (ILHA_MOTOR && (nx<0||ny<0||nx>=MW||ny>=MH)) continue;   // a ilha nao tem muro na borda: la fora e mar
    const nSolid = nx<0||ny<0||nx>=MW||ny>=MH || solidChar(MAP[ny][nx]);
    const nf = nSolid ? 1e9 : floorAt(nx,ny);
    const nc = nSolid ? -1e9 : ceilAt(nx,ny);
    const tex = sideTex(nx,ny);
    const emis = !nSolid ? 0 : (emissiveTile(MAP[ny] ? MAP[ny][nx] : "#") ? 1 : 0);

    /* aresta do tile, com o lado de dentro a esquerda de a->b */
    let ax,ay,bx,by;
    if (s===0){ ax=tx+1; ay=ty;   bx=tx+1; by=ty+1; }
    else if (s===1){ ax=tx+1; ay=ty+1; bx=tx;   by=ty+1; }
    else if (s===2){ ax=tx;   ay=ty+1; bx=tx;   by=ty;   }
    else { ax=tx; ay=ty; bx=tx+1; by=ty; }
    const ua = (s===0||s===2) ? ay : ax, ub = (s===0||s===2) ? by : bx;

    if (nSolid){                                        // parede inteira
      if (ce > f + 0.001) out.push(faceParede(ax,ay,bx,by, f,ce, ua,-f, ub,-ce, tex, emis));
    } else {
      if (CHAO_Z){                                      // degrau subindo, pelos cantos da aresta
        const i = ty*MW + tx, j = ny*MW + nx;
        const za = CHAO_Z[i*4 + CANTO_A[s]], zb = CHAO_Z[i*4 + CANTO_B[s]];
        const ta = Math.max(CHAO_Z[j*4 + CANTO_VIZ_A[s]], za), tb = Math.max(CHAO_Z[j*4 + CANTO_VIZ_B[s]], zb);
        if (ta > za + 0.001 || tb > zb + 0.001){
          const rp = ILHA_MOTOR && MAP[ny][nx] === "^" ? REG[regionOf(nx,ny)] : null;
          const inteira = rp && rp.inteira;
          const z0 = Math.min(za, zb), z1 = Math.max(ta, tb);
          out.push(quadFace(bx,by,zb, ax,ay,za, ax,ay,ta, bx,by,tb,
                            ub, inteira ? -0.001 : -z0, ua, inteira ? -0.999 : -z1,
                            inteira ? paredeDaIlha(tx, ty, nx, ny, s, rp) : sideTex(nx,ny), 0));
        }
      } else if (nf > f + 0.001){                       // degrau subindo
        /* Parede de pedra, madeira, palicada e cerca estica uma imagem so do
           chao ao alto: a janela fica na altura certa em qualquer chao. */
        const rp = ILHA_MOTOR && MAP[ny][nx] === "^" ? REG[regionOf(nx,ny)] : null;
        if (rp && rp.inteira)
          out.push(faceParede(ax,ay,bx,by, f,nf, ua,-0.001, ub,-0.999, paredeDaIlha(tx, ty, nx, ny, s, rp), 0));
        else
          out.push(faceParede(ax,ay,bx,by, f,nf, ua,-f, ub,-nf, sideTex(nx,ny), 0));
      }
      /* Parte de cima: vai do teto do vizinho ate o meu. Numa porta fechada
         o teto do vizinho desce ate o piso dele, entao esta faixa cobre o vao
         inteiro -- e e ela que desenha a folha da porta. O piso do quad tem
         que respeitar o degrau, senao a porta desenha por cima dele. */
      const bot = Math.max(nc, nf, f);
      /* Na ilha quem esta ao ar livre tem o teto no ceu, e esta faixa iria
         ate la. Ela para no telhado do vizinho: e o pedaco de parede acima
         de uma porta, a beirada de uma varanda. */
      const top = (ILHA_MOTOR && CEUZ[ty*MW+tx]) ? Math.min(ce, TOPOZ[ny*MW+nx]) : ce;
      if (bot < top - 0.001)
        out.push(faceParede(ax,ay,bx,by, bot,top, ua,-bot, ub,-top,
                 doorChar(MAP[ny][nx]) ? sideTex(nx,ny) : TEX[REG[regionOf(nx,ny)].wall], 0));
    }
  }
}

/* ---------- casa com cara de casa ---------- */

/* Parede de casa vista de fora ganha janela, e a ponta de uma fileira de
   parede ganha quina -- o canto da casa, ou o batente ao lado da porta. De
   fora e quando do outro lado da parede ha chao coberto. Uma em cada quatro
   fica lisa, sorteada pelo lugar, para a fachada nao virar grade. */
function paredeDaIlha(tx, ty, nx, ny, s, rp){
  if (!rp.janela) return TEX[rp.wall];
  const ex = (s === 1 || s === 3) ? 1 : 0, ey = 1 - ex;       // a fileira corre ao longo da aresta
  const ax = nx - ex, ay = ny - ey, bx = nx + ex, by = ny + ey;
  if (ax < 0 || ay < 0 || bx >= MW || by >= MH || MAP[ay][ax] !== "^" || MAP[by][bx] !== "^")
    return TEX[rp.quina];
  const px = 2*nx - tx, py = 2*ny - ty;                       // o tile do outro lado
  const deFora = px >= 0 && py >= 0 && px < MW && py < MH && !CEUZ[py*MW + px];
  return deFora && (hashTile(nx, ny) & 3) !== 3 ? TEX[rp.janela] : TEX[rp.wall];
}

/* O quad do telhado, com cada canto na altura dele. A agua virada para
   leste ou oeste tem as fileiras de telha no sentido norte-sul, e o sol do
   fim de tarde, a oeste, acende a que sobe para leste e apaga a outra. So
   se ve de cima: a frente aponta para o ceu. */
function faceTelhado(tx, ty){
  const reg = REG[regionOf(tx,ty)], W1 = MW + 1;
  const z00 = TELHADO_Z[ty*W1 + tx],     z10 = TELHADO_Z[ty*W1 + tx + 1];
  const z01 = TELHADO_Z[(ty+1)*W1 + tx], z11 = TELHADO_Z[(ty+1)*W1 + tx + 1];
  const gx = z10 + z11 - z00 - z01, gy = z01 + z11 - z00 - z10;
  const f = Math.abs(gx) > Math.abs(gy)
    ? quadFace(tx,ty,z00, tx,ty+1,z01, tx+1,ty+1,z11, tx+1,ty,z10, ty,tx, ty+1,tx+1,
               TEX[gx > 0 ? "ilhaTelhadoSol" : "ilhaTelhadoSombra"], 0)
    : quadFace(tx,ty,z00, tx+1,ty,z10, tx+1,ty+1,z11, tx,ty+1,z01, tx,ty, tx+1,ty+1, TEX[reg.telhado], 0);
  return f.nz < 0 ? virarFace(f) : f;
}

/* chamine: uma caixa de pedra que nasce dentro do telhado e passa da cumeeira */
function emitirChamine(c, out){
  const r = 0.2, x0 = c.x - r, x1 = c.x + r, y0 = c.y - r, y1 = c.y + r, a = c.z0, b = c.z1, t = TEX.ilhaMuro;
  out.push(quadFace(x1,y0,a, x1,y1,a, x1,y1,b, x1,y0,b, y0,-a, y1,-b, t, 0));
  out.push(quadFace(x0,y1,a, x0,y0,a, x0,y0,b, x0,y1,b, y1,-a, y0,-b, t, 0));
  out.push(quadFace(x0,y0,a, x1,y0,a, x1,y0,b, x0,y0,b, x0,-a, x1,-b, t, 0));
  out.push(quadFace(x1,y1,a, x0,y1,a, x0,y1,b, x1,y1,b, x1,-a, x0,-b, t, 0));
  out.push(quadFace(x0,y0,b, x1,y0,b, x1,y1,b, x0,y1,b, x0,y0, x1,y1, TEX.ilhaChamine, 0));
}

/* ============================================================
   O QUADRO: quais faces se veem, de perto para longe
   ------------------------------------------------------------
   Pedaco fora do alcance ou atras da camera nem e olhado. Das faces dos
   outros, fica a que esta no alcance, dentro do cone de visao e de frente
   para a camera. Elas vao para baldes de meio tile de distancia -- uma
   ordenacao que custa uma passada so -- e saem da mais perta para a mais
   longe: o z-buffer rejeita o que vem atras antes de pintar, e a oclusao
   por blocos (p5a.js) nem rasteriza o que esta todo escondido.

   Medido na bancada: dentro da taverna cada pixel era pintado 2,5 vezes, e
   o tempo dos poligonos caiu de 19 para 10 ms.
   ============================================================ */
const QUADS = [];                              // as faces deste quadro, na ordem de desenhar
let quadCount = 0;
const BALDES = [];
const BALDE_INICIO = [];                       // onde cada balde comeca em QUADS
function buildGeometry(cx, cy, dx, dy, tanH, cz){
  remontarSujos(cx, cy);
  quadCount = 0;
  const NB = (FAR + 24)*2;
  for (let b=0; b<NB; b++){ if (BALDES[b]) BALDES[b].length = 0; else BALDES[b] = []; }
  for (const P of PEDACOS){
    if (P.sujo) continue;                        // longe demais para ter sido montado
    const ex = P.cx - cx, ey = P.cy - cy, d = Math.hypot(ex, ey);
    if (d > FAR + P.r) continue;
    if (d > P.r + 2){
      const fwd = ex*dx + ey*dy, side = Math.abs(ex*-dy + ey*dx);
      if (fwd < -P.r - 1.5 || side > (fwd + P.r + 1.5)*tanH + P.r + 1.5) continue;
    }
    const fs = P.faces;
    for (let i=0; i<fs.length; i++){
      const f = fs[i];
      if (f.nx*cx + f.ny*cy + f.nz*cz - f.d <= 1e-7) continue;          // de costas
      const fx = f.cx - cx, fy = f.cy - cy, d2 = fx*fx + fy*fy;
      const folga = f.r > 0.71 ? f.r - 0.71 : 0;                         // um tile inteiro passa como antes
      if (d2 > (FAR + folga)*(FAR + folga)) continue;
      if (d2 >= 3){
        const fwd = fx*dx + fy*dy;
        if (fwd < -1.5 - folga) continue;
        const side = fx*-dy + fy*dx;
        if (Math.abs(side) > (fwd + 1.5 + folga)*tanH + 1.5 + folga) continue;
      }
      const fz = f.cz - cz;
      let b = (Math.sqrt(d2 + fz*fz)*2) | 0;
      if (b >= NB) b = NB - 1;
      BALDES[b].push(f);
    }
  }
  BALDE_INICIO.length = NB;
  for (let b=0; b<NB; b++){
    BALDE_INICIO[b] = quadCount;
    const l = BALDES[b];
    for (let i=0; i<l.length; i++) QUADS[quadCount++] = l[i];
  }
}
