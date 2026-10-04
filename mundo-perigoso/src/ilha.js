/* ============================================================
   O MAPA DO EDITOR, NO JOGO
   ------------------------------------------------------------
   O jogo abre na ilha embutida. Aberto com ?mapa=editor, troca a ilha pelo
   mapa que o editor deixou no armazenamento do navegador -- e o botao "Ver no
   jogo" de la. Com o mapa quebrado, ou com ?mapa=cripta, abre a cripta.

   Este arquivo so traduz o formato do editor para o que o motor ja
   entende: uma grade de caracteres, e piso, teto e ceu por tile. O motor
   nao ganhou conceito novo, e isso e de proposito -- e a primeira passada,
   para dar para ver a ilha, nao a versao final.

   Tres traducoes que nao sao obvias:

   - Parede vira BLOCO ALTO, nao tile macico. Tile macico no motor vai do
     piso ate o teto do vizinho, e ao ar livre o teto do vizinho e o ceu:
     toda parede subiria ate as nuvens. Um bloco com o piso la em cima tem
     a altura que o mapa manda, e degrau o motor ja sabia desenhar.
   - Quem esta ao ar livre tem o teto a CEU_ALTO. Serve so de limite de
     pulo; o quadrado de teto nao e desenhado.
   - Agua e piso na altura do mar, um palmo abaixo, para o pe afundar. A
     funda ganha o caractere W, que a colisao barra.
   ============================================================ */
const CHAVE_MAPA_JOGAR = "editor-mapa:jogar";
const CEU_ALTO = 40;                        // tiles; so limite de pulo
const AGUA_AFUNDA = 0.12;                   // quanto o pe afunda na agua
const PORTA_TETO = 5;                       // degraus, se a porta nao tem teto pintado

/* O endereco diz o mapa: ?mapa=nome, ?volta=mapa,x,y, ?inicio=x,y,graus e
   ?chegada=id -- o par da entrada ou da saida por onde se chega.
   No carregamento e o da pagina; viajar troca por outro sem recarregar --
   o motor inteiro se remonta para o mapa novo (ver trocarMundo, em p4.js).

   "editor" e o que o editor deixou no navegador; os outros sao os de mapas/,
   que o build.js embute no jogo. Sem nome o jogo abre na ilha. Com um nome
   que nao existe ou com o mapa quebrado, abre a cripta, que e a primeira
   dungeon dela. */
function nomeDaBusca(busca){
  const r = /[?&]mapa=([a-z0-9-]+)(?:[&#]|$)/.exec(busca || "");
  return r ? r[1] : "ilha";
}
function mapaPeloNome(nome){
  let texto = null;
  if (nome === "editor"){ try { texto = localStorage.getItem(CHAVE_MAPA_JOGAR); } catch(e){} }
  else if (nome && typeof MAPAS_EMBUTIDOS !== "undefined" &&
           Object.prototype.hasOwnProperty.call(MAPAS_EMBUTIDOS, nome)) texto = MAPAS_EMBUTIDOS[nome];
  return texto ? lerMapa(texto).mapa : null;
}
/* ?volta=mapa,x,y: de onde se desceu para a dungeon. Terminar leva de volta. */
function voltaDaBusca(busca){
  const r = /[?&]volta=([a-z0-9-]+),(\d+),(\d+)(?:[&#]|$)/.exec(busca || "");
  return r ? {mapa:r[1], x:Number(r[2]), y:Number(r[3])} : null;
}
/* ?inicio=x,y,graus vem do "Comecar daqui" do editor: o jogo abre num tile
   escolhido, olhando para onde se arrastou. 0 grau e leste e 90 e sul, o
   mesmo sentido do angulo do jogador. Sem graus, olha para oeste, onde o sol
   esta se pondo. */
function inicioDaBusca(busca){
  const r = /[?&]inicio=(\d+),(\d+)(?:,(-?\d+(?:\.\d+)?))?(?:[&#]|$)/.exec(busca || "");
  return r ? {x:Number(r[1]), y:Number(r[2]), graus: r[3] === undefined ? null : Number(r[3])} : null;
}
/* ?chegada=id: veio pela entrada ou saida de par `id`, e nasce ao lado da
   ponta de ca do mesmo par -- a volta certa sem guardar coordenada. */
function chegadaDaBusca(busca){
  const r = /[?&]chegada=([a-z0-9][a-z0-9_-]*)(?:[&#]|$)/.exec(busca || "");
  return r ? r[1] : null;
}
/* A ponta de ca de um par, se o mapa tem uma entrada ou saida com o id. */
function pontaDoPar(m, id){
  if (!id || !m) return null;
  for (const c of m.coisas)
    if ((c.tipo === "entrada" || c.tipo === "saida") && c.campos && c.campos.id === id) return {x: c.x, y: c.y, graus: null};
  return null;
}
/* o mapa de destino de uma entrada ou saida: o campo mapa, ou o texto de
   antes dos campos existirem */
function destinoDaCoisa(c){
  return String((c.campos && c.campos.mapa) || c.texto || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
}
const BUSCA_INICIAL = typeof location === "undefined" ? null : (location.search || "");
/* O mundo em 128 texels por tile (DESIGN.md, *densidade e tela*; o padrao
   desde 1/10, ?mundo=64 volta ao de antes): as texturas da ilha e dos
   estilos saem em 128 por tile, com as mesmas formas no mesmo tamanho e o
   detalhe fino (granulado, folha, pedrisco, veio) em pixel de 128. O cenario
   sobe junto para 128 voxels por tile (p3d.js), se o endereco nao disser
   outro. */
const TEXTURA_POR_TILE = typeof BUSCA_INICIAL === "string" && /[?&]mundo=64/.test(BUSCA_INICIAL) ? 64 : 128;
let NOME_DO_MAPA = BUSCA_INICIAL === null ? "" : nomeDaBusca(BUSCA_INICIAL);
let ILHA = mapaPeloNome(NOME_DO_MAPA);
let VOLTA = voltaDaBusca(BUSCA_INICIAL);
let INICIO_PEDIDO = inicioDaBusca(BUSCA_INICIAL);
let CHEGADA = BUSCA_INICIAL === null ? null : chegadaDaBusca(BUSCA_INICIAL);

/* As coisas que o motor ja sabe por no mundo. O resto -- arvore, pedra,
   morador -- espera ter sprite, e por enquanto nao aparece. */
const LETRA_DA_COISA = {diabrete:"i", goblin:"g", aranha:"s", morcego:"b",
                        cavaleiro:"w", vhalgorn:"Z", tocha:"t"};

function motorDaIlha(m){
  const W = m.larg, H = m.alt, n = W*H;
  const M = {piso: new Float32Array(n), teto: new Float32Array(n), topo: new Float32Array(n),
             ceu: new Uint8Array(n), linhas: null, rumo: 0};
  const ch = new Array(n);
  for (let i=0; i<n; i++) ch[i] = tileDoMotor(m, M, i);

  for (const c of m.coisas){
    const letra = LETRA_DA_COISA[c.tipo];
    if (!letra || c.x < 0 || c.y < 0 || c.x >= W || c.y >= H) continue;
    const i = c.y*W + c.x;
    if (ch[i] === "." || ch[i] === ",") ch[i] = letra;
  }
  ch[inicioDoJogador(m, M.piso, ch, INICIO_PEDIDO || pontaDoPar(m, CHEGADA))] = "p";

  M.linhas = [];
  for (let y=0; y<H; y++) M.linhas.push(ch.slice(y*W, (y+1)*W).join(""));
  M.rumo = INICIO_PEDIDO && INICIO_PEDIDO.graus !== null ? INICIO_PEDIDO.graus*Math.PI/180 : Math.PI;
  return M;
}
/* Um tile: piso, teto, topo, ceu e a letra dele no mapa do motor. */
function tileDoMotor(m, M, i){
  const W = m.larg, H = m.alt, passo = m.passo;
  const t = TERRENOS[m.terreno[i]], x = i % W, y = (i / W) | 0;
  const h = m.altura[i]*passo;
  M.ceu[i] = 1; M.teto[i] = CEU_ALTO; M.topo[i] = CEU_ALTO;

  if (t.tipo === "agua"){
    M.piso[i] = (m.mar === null ? h : m.mar*passo) - AGUA_AFUNDA;
    return t.id === "funda" ? "W" : ",";
  }
  if (t.tipo === "parede"){
    /* A base e o chao mais alto encostado nela. O editor nao mexe na
       altura de parede, entao uma pintada por cima do mar nasceria no
       fundo dele e ficaria baixinha vista da praia. */
    let base = m.altura[i];
    if (x > 0   && TERRENOS[m.terreno[i-1]].tipo === "chao") base = Math.max(base, m.altura[i-1]);
    if (x < W-1 && TERRENOS[m.terreno[i+1]].tipo === "chao") base = Math.max(base, m.altura[i+1]);
    if (y > 0   && TERRENOS[m.terreno[i-W]].tipo === "chao") base = Math.max(base, m.altura[i-W]);
    if (y < H-1 && TERRENOS[m.terreno[i+W]].tipo === "chao") base = Math.max(base, m.altura[i+W]);
    const alto = m.teto[i] > 0 ? m.teto[i] : (t.alto || 6);
    M.piso[i] = (base + alto)*passo;
    return "^";
  }
  M.piso[i] = h;
  const porta = t.tipo === "porta";
  const te = m.teto[i] > 0 ? m.teto[i] : (porta ? PORTA_TETO : 0);
  if (te > 0){
    M.ceu[i] = 0;
    M.teto[i] = h + te*passo;
    M.topo[i] = h + (te + 1)*passo;         // um degrau de telhado por cima do forro
  }
  return porta ? "D" : ".";
}
/* Refaz so os tiles que mudaram, e os vizinhos deles -- a parede depende do
   chao encostado. A letra de coisa ou do jogador fica onde estava enquanto o
   tile continuar sendo chao. Devolve os tiles refeitos. */
const LETRA_DE_TERRENO = {".":1, ",":1, "W":1, "^":1, "D":1};
function atualizarMotorDaIlha(m, M, tiles){
  const W = m.larg, H = m.alt, feitos = new Set();
  for (const i of tiles){
    const x = i % W, y = (i / W) | 0;
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) feitos.add(yy*W + xx);
    }
  }
  const porLinha = new Map();
  for (const i of feitos){
    const y = (i / W) | 0, x = i % W;
    let l = porLinha.get(y);
    if (!l){ l = M.linhas[y].split(""); porLinha.set(y, l); }
    const novo = tileDoMotor(m, M, i), velho = l[x];
    l[x] = !LETRA_DE_TERRENO[velho] && (novo === "." || novo === ",") ? velho : novo;
  }
  porLinha.forEach(function(l, y){ M.linhas[y] = l.join(""); });
  return Array.from(feitos);
}

/* O tile pedido pelo editor vem primeiro -- ou o livre mais perto dele, ate
   3 tiles, porque nascer dentro de uma arvore ou de um morador prende o
   jogador. Depois o inicio marcado no mapa. Sem nenhum dos dois, o ponto
   mais alto onde se pisa: e de la que um mapa de teste se entende de uma
   vez. Empate vai para o mais perto do meio das terras. */
function inicioDoJogador(m, piso, ch, pedido){
  const W = m.larg;
  if (pedido){
    const ocupado = new Set();
    for (const c of m.coisas) if (c.tipo !== "jogador") ocupado.add(c.y*W + c.x);
    let melhor = -1, dm = 1e9;
    for (let dy=-3; dy<=3; dy++) for (let dx=-3; dx<=3; dx++){
      const x = pedido.x + dx, y = pedido.y + dy, i = y*W + x;
      if (x < 0 || y < 0 || x >= W || y >= m.alt) continue;
      if ((ch[i] !== "." && ch[i] !== ",") || ocupado.has(i)) continue;
      if (dx*dx + dy*dy < dm){ dm = dx*dx + dy*dy; melhor = i; }
    }
    if (melhor >= 0) return melhor;
  }
  for (const c of m.coisas)
    if (c.tipo === "jogador" && c.x >= 0 && c.y >= 0 && c.x < W && c.y < m.alt) return c.y*W + c.x;

  let sx = 0, sy = 0, k = 0;
  for (let i=0; i<ch.length; i++)
    if (TERRENOS[m.terreno[i]].tipo !== "agua"){ sx += i % W; sy += (i / W) | 0; k++; }
  const cx = k ? sx/k : W/2, cy = k ? sy/k : m.alt/2;

  let melhor = -1, alto = -1e9, dist = 1e9;
  for (let i=0; i<ch.length; i++){
    if (ch[i] !== ".") continue;
    const d = Math.hypot(i % W - cx, ((i / W) | 0) - cy);
    if (piso[i] > alto + 1e-6 || (Math.abs(piso[i] - alto) <= 1e-6 && d < dist)){
      melhor = i; alto = piso[i]; dist = d;
    }
  }
  return melhor >= 0 ? melhor : Math.floor(cy)*W + Math.floor(cx);
}

let ILHA_MOTOR = ILHA ? motorDaIlha(ILHA) : null;
