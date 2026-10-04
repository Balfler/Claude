
/* ============================================================
   O PERSONAGEM COMPOSTO POR PECAS
   ------------------------------------------------------------
   Cosmetico e o unico produto, e desenhar sprite a mao nao escala: cada
   capacete novo seriam 40 desenhos. Aqui o personagem e montado por pecas
   de voxel -- corpo, roupa, armadura, cabelo, elmo, capa, escudo, arma e
   enfeite -- e as rotacoes saem do mesmo assador das criaturas. Uma peca
   nova e uma funcao, nao um catalogo de desenhos.

   O mesmo sistema monta o jogador, os moradores e os cosmeticos. O provador
   (provador.html) e este arquivo com uma tela em volta.

   A escala e 128 voxels por tile, DECIDIDO no DESIGN.md: um humano tem 117
   voxels de altura, e em 64 o rosto e o equipamento nao se leem. As
   proporcoes do esqueleto sao as medidas no desenho de referencia do humano.

   Tres regras, do DESIGN.md:
   - A armadura e montada depois da roupa e cobre ela: quem esta de placas
     parece estar de placas.
   - O enfeite e montado por ultimo e fica POR FORA de tudo. O cosmetico
     muda a cor do enfeite, nunca o material da armadura.
   - Arma e escudo ficam para fora do corpo, e o enfeite acompanha a
     espessura da armadura que estiver por baixo.

   O corpo vem do atelie (mundo-perigoso/atelie): um modelo em T-pose com
   peso de osso, exportado ja posado em cada quadro. Sem ele, o corpo e feito
   de bolas e capsulas, como as pecas provisorias.
   ============================================================ */
const VOX_TILE = 0.86/32;                   // criaturas e cenario: 32 voxels do diabrete dao 0,86 tile
/* A DENSIDADE do personagem: quantas vezes mais voxels ele tem que o de 117
   de altura (1; 165/117; 256/117 -- DESIGN.md, *densidade e tela*). Ela vem
   da grade do corpo desenhado. O esqueleto, as pecas e as medidas abaixo
   continuam escritos em 117, o espaco de sempre: as pecas saem dele e sao
   levadas para a grade da densidade (naDensidade), e as juntas do corpo
   desenhado vem dela para 117. Assim uma peca nova se escreve uma vez so. */
const ALTURA_BASE = 117;
let DENSIDADE = 1;
let VOX_PERSONAGEM = 1/128;                 // personagem: 128 voxels por tile, vezes a densidade
const DIM_PERSONAGEM = {DX:80, DY:56, DZ:117, CX:40, CY:28};   // a grade da densidade; muda no lugar
const CX = 40, CY = 28;                     // o meio do corpo em 117; inteiros, porque caixa nao aceita meio voxel
function dimensoesDaDensidade(K){
  const r = function(v){ return Math.round(v*K); };
  return {DX:r(80), DY:r(56), DZ:r(ALTURA_BASE), CX:r(CX), CY:r(CY)};
}
/* de 117 para a grade da densidade, e de volta */
function paraDensidade(v){ const D = DIM_PERSONAGEM, K = DENSIDADE; return [D.CX + (v[0] - CX)*K, D.CY + (v[1] - CY)*K, v[2]*K]; }
function deDensidade(v){ const D = DIM_PERSONAGEM, K = DENSIDADE; return [CX + (v[0] - D.CX)/K, CY + (v[1] - D.CY)/K, v[2]/K]; }
/* As pecas, escritas em 117, levadas para a grade da densidade. A caixa
   continua de voxel inteiro e com pelo menos um de espessura. */
function naDensidade(pecas){
  if (DENSIDADE === 1) return pecas;
  const D = DIM_PERSONAGEM, K = DENSIDADE;
  const fx = function(x){ return D.CX + (x - CX)*K; }, fy = function(y){ return D.CY + (y - CY)*K; };
  const inteiro = function(a, b){ const i = Math.round(a); return [i, Math.max(i + 1, Math.round(b))]; };
  return pecas.map(function(p){
    if (p.tipo === "caixa"){
      const x = inteiro(fx(p.x0), fx(p.x1)), y = inteiro(fy(p.y0), fy(p.y1)), z = inteiro(p.z0*K, p.z1*K);
      return {tipo:"caixa", x0:x[0], x1:x[1], y0:y[0], y1:y[1], z0:z[0], z1:z[1], mat:p.mat};
    }
    if (p.tipo === "bola") return {tipo:"bola", cx:fx(p.cx), cy:fy(p.cy), cz:p.cz*K, rx:p.rx*K, ry:p.ry*K, rz:p.rz*K, mat:p.mat};
    if (p.tipo === "osso") return {tipo:"osso", a:paraDensidade(p.a), b:paraDensidade(p.b), r0:p.r0*K, r1:p.r1*K, mat:p.mat};
    return p;
  });
}

const R_TUNICAS = [
  ["#0c1424","#16243e","#223a5e","#34547e","#4c70a0"],     // azul
  ["#1e0a0a","#381414","#56201c","#763028","#964436"],     // vinho
  ["#141608","#262a10","#3c421a","#565e26","#727a36"],     // oliva
  ["#20160a","#3a2812","#5a3e1c","#7c5828","#a07638"]      // ocre
];
const R_CABELOS = [
  ["#140c08","#2a1a10","#46301e","#5e4230"],               // castanho
  ["#0a0a0c","#18181c","#2a2a30","#3c3c44"],               // preto
  ["#3a3834","#6a665e","#9c968a","#c8c2b4"],               // grisalho
  ["#3a1406","#6a2a0e","#9a4a1c","#c06a30"]                // ruivo
];
const R_MALHA = ["#101216","#22262c","#3a4048","#566070","#7a8494","#a2acba"];
const R_ENFEITES = [
  ["#3a2606","#7a5410","#b8861c","#e8c040","#fff08a"],     // ouro
  ["#2a0608","#5e1016","#98202a","#d0404a","#f08088"],     // carmesim
  ["#062a18","#0e5030","#1c7c4a","#3aa86a","#86d8a0"],     // esmeralda
  ["#1c1c24","#40404e","#70707e","#a8a8b6","#e0e0ea"]      // prata
];
const R_OLHO = ["#141010","#141010","#2a2020"];

/* os materiais, na ordem das rampas; o voxel guarda o numero. As cores do
   corpo desenhado vem depois destes, a partir de MATERIAL_DO_DESENHO. */
const MP = {PELE:1, OLHO:2, COURO:3, TECIDO:4, CABELO:5, METAL:6, MALHA:7, MADEIRA:8, CAPA:9, ENFEITE:10};
const MATERIAL_DO_DESENHO = 11;

/* ---------- o corpo desenhado ----------
   O arquivo .personagem sai do atelie (mundo-perigoso/atelie, ver
   atelie/arquivos.js, que e quem escreve): a paleta e, por quadro do jogo,
   as juntas e a grade JA POSADAS. O jogo nao gira o corpo -- pendura as
   pecas nas juntas do quadro e pinta por cima da grade dele. Peso de osso,
   pose e a checagem de fresta e inchaco moram no atelie.

   PERSONAGEM 1 (uma grade so, sem pose) e o formato de antes do atelie: o
   jogo le, mas nao usa como corpo, porque nao tem mais como posar. */
const NOMES_DAS_POSES = ["parado", "andar-1", "andar-2", "andar-3", "andar-4", "andar-5", "andar-6", "respirar",
  "correr-1", "correr-2", "correr-3", "correr-4", "pulo", "atacar-1", "atacar-2", "conjurar-1", "conjurar-2",
  "bloquear", "arco-1", "arco-2"];
function lerPersonagem(texto){
  const L = String(texto).split("\n"), versao = +((L[0].match(/^PERSONAGEM (\d+)/) || [])[1] || 0);
  if (!versao) throw new Error("nao e um arquivo de personagem");
  let DX = 0, DY = 0, DZ = 0, cores = [], atual = null, g = null, k = 0, binario = null;
  const poses = [];
  for (let i = 1; i < L.length; i++){
    const l = L[i].trim();
    if (!l) continue;
    if (binario){ binario.push(l); continue; }
    if (l === "[binario]"){ binario = []; continue; }        // PERSONAGEM 3: as grades no fim, comprimidas (compacto.js)
    if (l.charAt(0) === "["){
      const m = l.match(/^\[pose (.+)\]$/);
      if (m){ atual = {nome:m[1], juntas:null, g:null}; poses.push(atual); g = null; }
      else if (l === "[voxels]"){
        if (!atual){ atual = {nome:"", juntas:null, g:null}; poses.push(atual); }
        g = atual.g = new Uint8Array(DX*DY*DZ); k = 0;
      }
      continue;
    }
    const p = l.split(/\s+/);
    if (g){
      for (const t of p){
        const e = t.indexOf("*"), v = parseInt(e < 0 ? t : t.slice(0, e), 36), n = e < 0 ? 1 : parseInt(t.slice(e + 1), 36);
        if (v) g.fill(v, k, Math.min(g.length, k + n));
        k += n;
      }
    } else if (p[0] === "grade"){ DX = +p[1]; DY = +p[2]; DZ = +p[3]; }
    else if (p[0] === "cores") cores = (L[++i] || "").trim().split(/\s+/).slice(0, +p[1]).map(function(h){ return "#" + h; });
    else if (p[0] === "juntas" && atual){
      atual.juntas = {};
      for (let j = 1; j + 3 < p.length; j += 4) atual.juntas[p[j]] = [+p[j + 1], +p[j + 2], +p[j + 3]];
    }
  }
  if (binario){
    const gs = gradesCompactas(binario.join(""), poses.length, DX, DY, DZ);
    poses.forEach(function(p, i){ p.g = gs[i]; });
  }
  return {versao:versao, DX:DX, DY:DY, DZ:DZ, cores:cores, g:poses.length ? poses[0].g : new Uint8Array(DX*DY*DZ), poses:poses};
}
/* O corpo so vale com uma grade de densidade (a de 117 vezes K, com K pela
   altura) e os vinte quadros, cada um com as juntas -- faltando um, o
   personagem volta a ser de bolas, em vez de aparecer pela metade numa pose
   so. Devolve o corpo pronto, com a densidade, ou null. */
function corpoValido(c){
  if (!c || c.versao < 2 || !c.DZ) return null;
  const K = c.DZ/ALTURA_BASE, D = dimensoesDaDensidade(K);
  if (c.DX !== D.DX || c.DY !== D.DY) return null;
  c.densidade = K; c.dim = D;
  c.porPose = NOMES_DAS_POSES.map(function(n){ return c.poses.find(function(p){ return p.nome === n && p.g && p.juntas; }); });
  return c.porPose.every(Boolean) ? c : null;
}
/* O corpo: o humano embutido, ou o pedido no endereco (?corpo=guerreiro), que
   a pagina carregou de fora (build.js, corposDeFora). */
const NOME_DO_CORPO = (typeof BUSCA_INICIAL === "string" && (BUSCA_INICIAL.match(/[?&]corpo=([a-z0-9-]+)/) || [])[1]) || "humano";
function textoDoCorpo(nome){
  if (typeof PERSONAGENS_EMBUTIDOS !== "undefined" && PERSONAGENS_EMBUTIDOS[nome]) return PERSONAGENS_EMBUTIDOS[nome];
  if (typeof self !== "undefined" && self.PERSONAGENS_DE_FORA && self.PERSONAGENS_DE_FORA[nome]) return self.PERSONAGENS_DE_FORA[nome];
  return null;
}
let CORPO_DE_FORA = false;                  // o worker do forno nasce com o humano: este ele tem que receber
let CORPO_DESENHADO = (function(){
  try {
    if (NOME_DO_CORPO !== "humano" && textoDoCorpo(NOME_DO_CORPO)){
      const c = corpoValido(lerPersonagem(textoDoCorpo(NOME_DO_CORPO)));
      if (c){ CORPO_DE_FORA = true; return c; }
    }
    return textoDoCorpo("humano") ? corpoValido(lerPersonagem(textoDoCorpo("humano"))) : null;
  } catch(e){ return null; }
})();
/* A opcao grafica de densidade (painel de ajuste, tecla 9): o corpo como veio
   fica guardado, e o de altura menor sai dele reamostrado (reamostrarCorpo,
   abaixo), na carga e quando o jogador troca. */
const CORPO_NATIVO = CORPO_DESENHADO;
const ALTURAS_DE_DENSIDADE = [117, 165, 256];
function alturasPossiveis(){
  return CORPO_NATIVO ? ALTURAS_DE_DENSIDADE.filter(function(h){ return h <= CORPO_NATIVO.DZ; }) : [];
}
function corpoNaAltura(h){
  if (!CORPO_NATIVO || !h || h >= CORPO_NATIVO.DZ) return CORPO_NATIVO;
  return reamostrarCorpo(CORPO_NATIVO, h);
}
function medidasDoCorpo(c){
  DENSIDADE = c.densidade; VOX_PERSONAGEM = 1/(128*DENSIDADE);
  Object.assign(DIM_PERSONAGEM, c.dim);
}
if (CORPO_DESENHADO) medidasDoCorpo(CORPO_DESENHADO);

/* O mesmo corpo em outra altura, refeito da grade dele: cada voxel novo olha
   os voxels que cobre e fica com o material mais comum, se pelo menos 3/8
   deles estiverem cheios (a regra da copia para longe, reduzirGrade). E o
   que da as outras densidades a partir da de 256, sem outro arquivo. */
function reamostrarCorpo(c, altura){
  const K1 = c.densidade, K2 = altura/ALTURA_BASE, A = c.dim, B = dimensoesDaDensidade(K2), r = K1/K2;
  /* para cada voxel novo, num eixo, o pedaco de voxels velhos que ele cobre */
  function faixas(n, nVelho, meioNovo, meioVelho){
    const a = new Int32Array(n), b = new Int32Array(n);
    for (let i = 0; i < n; i++){
      a[i] = Math.max(0, Math.min(nVelho, Math.round(meioVelho + (i - meioNovo)*r)));
      b[i] = Math.max(a[i] + 1, Math.min(nVelho, Math.round(meioVelho + (i + 1 - meioNovo)*r)));
      if (a[i] >= nVelho){ a[i] = nVelho - 1; b[i] = nVelho; }
    }
    return [a, b];
  }
  const fx = faixas(B.DX, A.DX, B.CX, A.CX), fy = faixas(B.DY, A.DY, B.CY, A.CY), fz = faixas(B.DZ, A.DZ, 0, 0);
  const conta = new Uint16Array(256), junta = function(v){ return [B.CX + (v[0] - A.CX)/r, B.CY + (v[1] - A.CY)/r, v[2]/r]; };
  const poses = c.poses.map(function(p){
    const g = p.g, h = new Uint8Array(B.DX*B.DY*B.DZ);
    for (let z = 0; z < B.DZ; z++) for (let y = 0; y < B.DY; y++) for (let x = 0; x < B.DX; x++){
      let cheios = 0, todos = 0, melhor = 0;
      for (let k = fz[0][z]; k < fz[1][z]; k++) for (let j = fy[0][y]; j < fy[1][y]; j++){
        const o = (k*A.DY + j)*A.DX;
        for (let i = fx[0][x]; i < fx[1][x]; i++){
          const m = g[o + i];
          todos++;
          if (m){ cheios++; if (++conta[m] > conta[melhor]) melhor = m; }
        }
      }
      if (cheios*8 >= todos*3) h[(z*B.DY + y)*B.DX + x] = melhor;
      if (cheios) for (let k = fz[0][z]; k < fz[1][z]; k++) for (let j = fy[0][y]; j < fy[1][y]; j++){
        const o = (k*A.DY + j)*A.DX;
        for (let i = fx[0][x]; i < fx[1][x]; i++) conta[g[o + i]] = 0;
      }
    }
    const juntas = {};
    for (const k in p.juntas) juntas[k] = junta(p.juntas[k]);
    return {nome:p.nome, juntas:juntas, g:h};
  });
  return corpoValido({versao:c.versao, DX:B.DX, DY:B.DY, DZ:B.DZ, cores:c.cores, g:poses[0].g, poses:poses});
}
/* A cor desenhada ja traz a luz pintada. A rampa dela tem tres tons: um passo
   de sombra, a propria cor e um passo de luz -- o motor so acrescenta volume,
   sem apagar a sombra que o desenho tem. Com as 92 entradas das rampas fixas
   acima, tres tons por cor deixam caber ate 54 cores na paleta de 255 do
   personagem -- o limite que o atelie confere antes de exportar. */
const TONS_DO_DESENHO = [0.86, 1, 1.08];
/* O contorno em volta da silhueta de cada rumo, feito no assador. Desenho de
   pixel art pede contorno escuro de verdade; as pecas de bolas, so um passo. */
let CONTORNO_DO_PERSONAGEM = CORPO_DESENHADO ? 0.42 : 0.62;
function rampaDaCor(hex){
  const c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  return TONS_DO_DESENHO.map(function(f){
    return "#" + c.map(function(v){ return Math.max(0, Math.min(255, Math.round(v*f))).toString(16).padStart(2, "0"); }).join("");
  });
}
let RAMPAS_DO_DESENHO = CORPO_DESENHADO ? CORPO_DESENHADO.cores.map(rampaDaCor) : [];

function paletaDoPersonagem(){
  return hexPal([].concat(R_FLESH, R_OLHO, R_LEATH,
    R_TUNICAS[0], R_TUNICAS[1], R_TUNICAS[2], R_TUNICAS[3],
    R_CABELOS[0], R_CABELOS[1], R_CABELOS[2], R_CABELOS[3],
    R_STEEL, R_MALHA, R_WOOD, R_ENFEITES[0], R_ENFEITES[1], R_ENFEITES[2], R_ENFEITES[3],
    [].concat.apply([], RAMPAS_DO_DESENHO)));
}
let P_PERSONAGEM = paletaDoPersonagem();

/* ---------- o esqueleto ----------
   x e da esquerda para a direita visto de frente, y da frente para as
   costas, z dos pes para a cabeca.

   O repouso vem do desenho de referencia medido em 117 voxels: queixo a 88
   e topo da cabeca a 117, ombro a 78, a mao pendendo ate 38, as pernas se
   separando a 34, bota ate 20. E dele que saem o molde e os comprimentos dos
   ossos, que nao mudam em pose nenhuma. */
const REPOUSO = {
  cabeca:    [CX, CY, 101],       pescoco:   [CX, CY + 1, 84],
  ombroE:    [CX - 17, CY, 78],   ombroD:    [CX + 17, CY, 78],
  cotoveloE: [CX - 21, CY + 1, 61], cotoveloD: [CX + 21, CY + 1, 61],
  maoE:      [CX - 24, CY - 1, 46], maoD:      [CX + 24, CY - 1, 46],
  quadrilE:  [CX - 8, CY, 37],    quadrilD:  [CX + 8, CY, 37],
  joelhoE:   [CX - 10, CY - 3, 20], joelhoD:   [CX + 10, CY - 3, 20],
  peE:       [CX - 12, CY, 5],    peD:       [CX + 12, CY, 5]
};
/* As poses que o assador conhece. Andar e correr sao ciclos de passo -- pe da
   frente no chao, a passagem com o outro pe no ar, o mesmo espelhado --,
   parado e a respiracao sao poses fixas, e pulo, ataque, conjurar, bloquear
   e arco sao poses de acao, a maioria com dois quadros (preparo e golpe). */
const POSE = {
  PARADO:0, ANDAR:[1, 2, 3, 4, 5, 6], RESPIRAR:7, CORRER:[8, 9, 10, 11],
  PULO:12, ATAQUE:[13, 14], CONJURAR:[15, 16], BLOQUEAR:17, ARCO:[18, 19]
};
const TODAS_AS_POSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function soma(a, b){ return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function menos(a, b){ return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
/* gira no plano de lado (y, z); graus positivos levam para a frente o que aponta para baixo */
function girarDeLado(v, graus){
  const a = graus*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1]*c + v[2]*s, -v[1]*s + v[2]*c];
}
/* gira em pe, no plano de cima (x, y), em volta do eixo vertical que passa
   por (cx, cy) -- e a torcao do tronco: ombro e quadril viram um pouco em
   volta da coluna, em vez de so entortar para a frente e para tras. Graus
   positivos levam o lado direito (x maior) para tras. */
function girarEmPe(v, cx, cy, graus){
  const a = graus*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
  const dx = v[0] - cx, dy = v[1] - cy;
  return [cx + dx*c - dy*s, cy + dx*s + dy*c, v[2]];
}
/* O braco: o ombro gira o braco inteiro para a frente ou para tras, e o
   cotovelo dobra o antebraco para a frente. */
function braco(ombro, nome, balanco, dobra){
  const r1 = girarDeLado(menos(REPOUSO["cotovelo" + nome], REPOUSO["ombro" + nome]), balanco);
  const r2 = girarDeLado(menos(REPOUSO["mao" + nome], REPOUSO["cotovelo" + nome]), balanco + dobra);
  const cotovelo = soma(ombro, r1);
  return {cotovelo:cotovelo, mao:soma(cotovelo, r2)};
}
/* A perna, por cinematica inversa: dado onde o pe tem que estar, a coxa e a
   canela mantem o comprimento e o joelho dobra para a frente. E o que deixa
   o pe de apoio parado no chao enquanto o corpo desce e sobe. */
function perna(quadril, nome, pe){
  const d1 = menos(REPOUSO["joelho" + nome], REPOUSO["quadril" + nome]), d2 = menos(REPOUSO["pe" + nome], REPOUSO["joelho" + nome]);
  const a = Math.hypot(d1[1], d1[2]), b = Math.hypot(d2[1], d2[2]);
  const vy = pe[1] - quadril[1], vz = pe[2] - quadril[2], L = Math.hypot(vy, vz) || 1;
  const uy = vy/L, uz = vz/L, d = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.01, L));
  const ang = Math.acos(Math.max(-1, Math.min(1, (a*a + d*d - b*b)/(2*a*d))));
  const k = [ang, -ang].map(function(t){ const c = Math.cos(t), s = Math.sin(t); return [uy*c - uz*s, uy*s + uz*c]; })
    .sort(function(p, q){ return p[0] - q[0]; })[0];                     // o joelho que fica mais a frente
  const joelho = [quadril[0] + d1[0], quadril[1] + a*k[0], quadril[2] + a*k[1]];
  return {joelho:joelho, pe:[joelho[0] + d2[0], quadril[1] + uy*d, quadril[2] + uz*d]};
}
/* onde o pe vai numa fase do ciclo: meio ciclo no chao, de a frente para
   atras; o outro meio no ar, voltando para a frente. `S` e o tanto que o pe
   vai a frente e atras do quadril, `SOBE` o quanto ele levanta no ar. */
function passada(p, S, SOBE){
  p = p - Math.floor(p);
  if (p < 0.5) return [-S + 2*S*(p/0.5), 0];
  const q = (p - 0.5)/0.5;
  return [S - 2*S*q, SOBE*Math.sin(Math.PI*q)];
}
/* Quadros de andar e ataque vindos de captura de movimento de verdade --
   nao inventados a mao. Saem do SMPL (o esqueleto humano padrao da area),
   via sorceress.games/voxelgen: rotacao de cada osso, quadro a quadro, num
   corpo generico de exemplo, de graca. O que esta aqui e o resultado de
   levar essas rotacoes pela MINHA propria cadeia de ossos (REPOUSO, os
   comprimentos do meu boneco) -- entao cada numero e quanto a junta sai do
   repouso, na escala de voxel do jogo, pronto pra somar. Andar usa seis
   quadros do ciclo (de um andar "natural", quadros 0/6/11/17/22/28 de 90);
   ataque usa dois quadros de um soco (o preparo e o golpe, quadros 15/30 de
   45) -- o braco vem amortecido (ARMA_MOCAP) porque o alcance de um soco de
   verdade, com uma lamina na mao, vaza a grade do personagem. */
const ANDAR_MOCAP = [
  {quadrilE:[0,0.4,0.3], quadrilD:[0,-0.4,-0.3], joelhoE:[-1.4,1.7,0.4], joelhoD:[-1.2,-4.7,0.9],
   peE:[-1.4,8.4,3.6], peD:[-3.2,-5.9,0.6], ombroE:[0,0.2,-0.6], ombroD:[0,-0.2,0.6],
   cotoveloE:[4.2,1.9,-0.8], cotoveloD:[-1.2,4.5,1.3], maoE:[8.5,1.7,-1.1], maoD:[-4,8.4,1]},
  {quadrilE:[0,0.2,-0.4], quadrilD:[0,-0.2,0.4], joelhoE:[0.1,-3.2,0.6], joelhoD:[1.2,-0.9,0.7],
   peE:[0.4,1.8,2.5], peD:[-0.2,-0.3,0.7], ombroE:[0,0.8,-0.1], ombroD:[0,-0.8,0.1],
   cotoveloE:[3.3,3.2,-0.3], cotoveloD:[-1.8,2.4,0.3], maoE:[6.3,3.7,-0.6], maoD:[-6.6,4.6,0]},
  {quadrilE:[0,0.1,-0.7], quadrilD:[0,-0.1,0.7], joelhoE:[0.8,-4.4,0.7], joelhoD:[2.5,1.6,1],
   peE:[0.7,-6.5,0.4], peD:[1.7,3.8,1.5], ombroE:[0,0.9,0.1], ombroD:[0,-0.9,-0.1],
   cotoveloE:[3.2,4.1,0.1], cotoveloD:[-2.5,1.1,-0.3], maoE:[6.1,5.2,-0.3], maoD:[-9,1,-0.2]},
  {quadrilE:[0,0,-0.8], quadrilD:[0,0,0.8], joelhoE:[1.2,-4,0.3], joelhoD:[2.1,1.3,1],
   peE:[2.4,-4.2,0.2], peD:[1.3,7.7,3.7], ombroE:[0,0.8,0], ombroD:[0,-0.8,0],
   cotoveloE:[3,3.8,0], cotoveloD:[-2.4,0.9,-0.2], maoE:[6,5.3,-0.5], maoD:[-8.7,0.4,0]},
  {quadrilE:[0,0.1,-0.2], quadrilD:[0,-0.1,0.2], joelhoE:[0,-0.8,0], joelhoD:[0.5,-2.5,0.9],
   peE:[1.3,0.7,0.3], peD:[0,3.5,3.4], ombroE:[0,0.4,-0.5], ombroD:[0,-0.4,0.5],
   cotoveloE:[3.4,2.5,-0.7], cotoveloD:[-1.6,2.2,0.6], maoE:[7,3.2,-1.1], maoD:[-6.8,3.3,0.3]},
  {quadrilE:[0,0.2,0.4], quadrilD:[0,-0.2,-0.4], joelhoE:[-1.6,2.1,0.4], joelhoD:[-0.7,-4,0.7],
   peE:[-1.2,5.6,1.5], peD:[-1.7,-6.7,0.3], ombroE:[0,0.2,-0.6], ombroD:[0,-0.2,0.6],
   cotoveloE:[4.2,1.5,-0.9], cotoveloD:[-1.4,4.3,1.2], maoE:[9.6,0.5,-0.9], maoD:[-5.3,7.5,0.9]}
];
const ATAQUE_MOCAP = [
  {quadrilE:[0.3,1,2.1], quadrilD:[-0.3,-1,-2.1], joelhoE:[-3.1,-3.4,4.3], joelhoD:[0.1,-0.7,-2.1],
   peE:[-5,-3.9,4.6], peD:[2.7,3.2,-0.1], ombroE:[3.1,4.5,8.7], ombroD:[-3.1,-4.5,-8.7],
   cotoveloE:[-1.6,0.3,10.8], cotoveloD:[-17.7,-1,-4.8], maoE:[3.6,-11,18.4], maoD:[-36,0.4,8.3]},
  {quadrilE:[0.1,0.5,1.4], quadrilD:[-0.1,-0.5,-1.4], joelhoE:[-2.9,-4.7,4], joelhoD:[-0.2,-2.6,-0.9],
   peE:[-5.4,-4,4.7], peD:[2.8,-0.3,0.5], ombroE:[1.6,3.8,6.2], ombroD:[-1.6,-3.8,-6.2],
   cotoveloE:[-3.5,-2.2,9.1], cotoveloD:[-14.6,-10.7,-3], maoE:[0.1,-14.1,17.4], maoD:[-27,-20.6,9.1]}
];
const ARMA_MOCAP = 0.55;         // o braco da arma amortece, senao uma lamina vaza a grade
/* monta as juntas de um quadro capturado: soma cada delta ao repouso, com o
   braco direito (o que empunha) amortecido para caber com arma na mao */
function juntasMocap(quadro){
  const R = REPOUSO, o = {cx:CX, cy:CY, dz:0};
  for (const k in R) o[k] = R[k].slice();
  for (const k in quadro){
    const d = quadro[k], f = (k === "cotoveloD" || k === "maoD") ? ARMA_MOCAP : 1;
    o[k] = [R[k][0] + d[0]*f, R[k][1] + d[1]*f, R[k][2] + d[2]*f];
  }
  return o;
}

/* As juntas de uma pose. `cx`, `cy` e `dz` sao o quanto o tronco saiu do
   lugar -- inteiros, porque as pecas presas nele usam caixas.

   Com o corpo do atelie, as juntas sao as do quadro no arquivo; a formula e
   a captura daqui ficam para o corpo de bolas, quando nao ha arquivo.

   Correr e as poses de acao (pulo, conjurar, bloquear, arco) ainda sao
   formula: balanco e cotovelo do braco que empunha, `bD`/`dD` de regra,
   porque as pecas de arma penduram em `maoD`.

   `to` e `tq` sao a torcao do ombro e do quadril em volta da coluna -- sem
   ela o braco e a perna so entortavam para a frente e para tras, um boneco
   de papel achatado contra a tela. Na corrida o ombro do lado que balanca o
   braco para a frente gira um pouco para a frente junto, e o quadril torce
   para o lado oposto (a contra-rotacao que da o "vaivem" do tronco). */
function esqueleto(pose, esc){
  return CORPO_DESENHADO ? esqueletoDoQuadro(pose || 0) : esqueletoDaFormula(pose, esc);
}
/* o esqueleto da formula e da captura antiga, na proporcao do REPOUSO: o do
   corpo de bolas, e o do molde de desenho (editor/molde.js) */
function esqueletoDaFormula(pose, esc){
  if (POSE.ANDAR.indexOf(pose) >= 0) return juntasMocap(ANDAR_MOCAP[POSE.ANDAR.indexOf(pose)]);
  if (POSE.ATAQUE.indexOf(pose) >= 0) return juntasMocap(ATAQUE_MOCAP[POSE.ATAQUE.indexOf(pose)]);
  let oy = 0, oz = 0, pE = [0, 0], pD = [0, 0], bE = 0, bD = 0, dE = 0, dD = 0, to = 0, tq = 0;
  const ic = POSE.CORRER.indexOf(pose);
  if (ic >= 0){
    const n = POSE.CORRER.length, p = ic/n, fase = 2*Math.PI*p, armado = !!(esc && esc.arma && esc.arma !== "nenhuma");
    const S = 13, SOBE = 11, braceo = 20, flexo = 12;
    oz = Math.round(-3 + 3*Math.abs(Math.sin(fase)));
    oy = -2;
    pE = passada(p, S, SOBE); pD = passada(p + 0.5, S, SOBE);
    bE = -braceo*Math.cos(fase); bD = (armado ? braceo*0.4 : braceo)*Math.cos(fase);
    dE = flexo + flexo*Math.max(0, -Math.cos(fase)); dD = flexo + flexo*Math.max(0, Math.cos(fase));
    to = -16*Math.cos(fase); tq = 7*Math.cos(fase);
  } else if (pose === POSE.RESPIRAR){
    bE = -3; bD = -3; dE = 12; dD = 12;
  } else if (pose === POSE.PULO){
    oy = -2;
    pE = [-2, 9]; pD = [2, 8];                        // as pernas se dobram para cima no ar
    bE = 18; dE = 12; bD = 18; dD = 12; to = -8; tq = 4;
  } else if (POSE.CONJURAR.indexOf(pose) >= 0){
    const solta = POSE.CONJURAR.indexOf(pose);         // 0 erguer o cajado, 1 soltar o feitico
    bD = solta ? 30 : 22; dD = solta ? 6 : 14;
    bE = -5; dE = 10;
    to = solta ? -12 : -7; tq = solta ? 5 : 3;
  } else if (pose === POSE.BLOQUEAR){
    bE = 20; dE = 20; bD = 12; dD = 15; oy = -1; to = 10; tq = -6;   // vira de lado, escudo na frente
  } else if (POSE.ARCO.indexOf(pose) >= 0){
    const solta = POSE.ARCO.indexOf(pose);             // 0 puxar a corda, 1 soltar a flecha
    bD = 42; dD = 6;                                   // o braco do arco fica firme
    bE = solta ? -12 : -34; dE = solta ? 15 : 46;       // a mao da corda puxa e solta
    to = solta ? 22 : 16; tq = -8;                      // postura de lado, classica do arqueiro
  }
  const R = REPOUSO, t = [0, oy, oz], px = CX, py = CY + oy;
  const ombroE = girarEmPe(soma(R.ombroE, t), px, py, to), ombroD = girarEmPe(soma(R.ombroD, t), px, py, to);
  const quadrilE = girarEmPe(soma(R.quadrilE, t), px, py, tq), quadrilD = girarEmPe(soma(R.quadrilD, t), px, py, tq);
  const be = braco(ombroE, "E", bE, dE), bd = braco(ombroD, "D", bD, dD);
  const pe = perna(quadrilE, "E", [R.peE[0], R.peE[1] + pE[0], R.peE[2] + pE[1]]);
  const pd = perna(quadrilD, "D", [R.peD[0], R.peD[1] + pD[0], R.peD[2] + pD[1]]);
  return {
    cx:CX, cy:CY + oy, dz:oz, pose:pose || 0,
    cabeca:soma(R.cabeca, t), pescoco:soma(R.pescoco, t),
    ombroE:ombroE, ombroD:ombroD, cotoveloE:be.cotovelo, cotoveloD:bd.cotovelo, maoE:be.mao, maoD:bd.mao,
    quadrilE:quadrilE, quadrilD:quadrilD, joelhoE:pe.joelho, joelhoD:pd.joelho, peE:pe.pe, peD:pd.pe
  };
}
function osso(a, b, r0, r1, m){ return vxOsso(a[0], a[1], a[2], b[0], b[1], b[2], r0, r1, m); }
function bolaEm(p, rx, ry, rz, m, dx, dy, dz){ return vxBola(p[0] + (dx||0), p[1] + (dy||0), p[2] + (dz||0), rx, ry, rz, m); }
function entre(a, b, t){ return [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, a[2] + (b[2]-a[2])*t]; }
/* onde fica a frente do peito com a armadura escolhida: e ali que o enfeite encosta */
function frenteDoPeito(s, esc){ return s.cy + ({placas:-13.2, malha:-12.4, couro:-12.0}[esc.armadura] || -11.4); }

/* ---------- o corpo desenhado, posado ----------
   O atelie ja entrega cada quadro posado. As juntas vem do arquivo. As pecas
   de posicao fixa -- peitoral, cinto, capa, elmo fechado -- foram medidas no
   corpo parado, entao cx, cy e dz sao o quanto o meio do tronco saiu do
   lugar em relacao ao PARADO do proprio arquivo, e nao ao REPOUSO: um corpo
   de outra proporcao parado continua com dz 0. */
function meioDoTronco(j){
  const mq = entre(j.quadrilE, j.quadrilD, 0.5), mo = entre(j.ombroE, j.ombroD, 0.5);
  return entre(mq, mo, 0.5);
}
function juntasEm117(j){
  const o = {};
  for (const k in j) o[k] = deDensidade(j[k]);
  return o;
}
function esqueletoDoQuadro(pose){
  const q = CORPO_DESENHADO.porPose[pose] || CORPO_DESENHADO.porPose[0], o = juntasEm117(q.juntas);
  o.pose = pose;
  const m = meioDoTronco(o), m0 = meioDoTronco(juntasEm117(CORPO_DESENHADO.porPose[0].juntas));
  o.cx = CX + Math.round(m[0] - m0[0]); o.cy = CY + Math.round(m[1] - m0[1]); o.dz = Math.round(m[2] - m0[2]);
  return o;
}
/* a grade do quadro com as cores trocadas pelos materiais do desenho, uma
   vez por quadro; cada montagem pinta as pecas numa copia */
function gradeDoQuadro(pose){
  const q = CORPO_DESENHADO.porPose[pose] || CORPO_DESENHADO.porPose[0];
  if (!q.materiais){
    q.materiais = new Uint8Array(q.g.length);
    for (let i=0; i<q.g.length; i++) if (q.g[i]) q.materiais[i] = q.g[i] + MATERIAL_DO_DESENHO - 1;
  }
  return q.materiais.slice();
}

function pecaCorpo(s){
  const cx = s.cx, cy = s.cy, dz = s.dz;
  return [
    vxCaixa(Math.round(s.peE[0]) - 5, Math.round(s.peE[1]) - 11, Math.round(s.peE[2]) - 5, 10, 17, 6, MP.COURO),   // botas
    vxCaixa(Math.round(s.peD[0]) - 5, Math.round(s.peD[1]) - 11, Math.round(s.peD[2]) - 5, 10, 17, 6, MP.COURO),
    osso(s.joelhoE, s.peE, 5.2, 4.6, MP.COURO), osso(s.joelhoD, s.peD, 5.2, 4.6, MP.COURO),    // canela
    osso(s.quadrilE, s.joelhoE, 6.2, 5.2, MP.COURO), osso(s.quadrilD, s.joelhoD, 6.2, 5.2, MP.COURO),  // coxa
    vxBola(cx, cy, 42 + dz, 15, 10, 8, MP.PELE),                                            // quadril
    vxBola(cx, cy, 54 + dz, 14, 9, 10, MP.PELE),                                            // barriga
    vxBola(cx, cy, 68 + dz, 16, 10, 12, MP.PELE),                                           // peito
    osso(s.ombroE, s.cotoveloE, 4.6, 4.0, MP.PELE), osso(s.ombroD, s.cotoveloD, 4.6, 4.0, MP.PELE),
    osso(s.cotoveloE, s.maoE, 4.0, 3.4, MP.PELE), osso(s.cotoveloD, s.maoD, 4.0, 3.4, MP.PELE),
    bolaEm(s.maoE, 4.5, 4.5, 5, MP.PELE, 0, 0, -3), bolaEm(s.maoD, 4.5, 4.5, 5, MP.PELE, 0, 0, -3),
    osso(s.pescoco, [cx, cy, 76 + dz], 6, 6.5, MP.PELE),                                    // pescoco
    /* a cabeca e esculpida em voxel de verdade -- tres esferas que se somam
       (coroa, bochecha, queixo) em vez de uma silhueta 2D esticada, porque e
       assim que o nariz sai saliente e a orelha sai do lado sem depender de
       um angulo de desenho certo pra funcionar. Mesma tecnica do tronco
       (quadril+barriga+peito), so que pra cabeca. */
    bolaEm(s.cabeca, 12, 11, 8, MP.PELE, 0, 1, 7),                                          // coroa (nao passa de 116, o teto da grade)
    bolaEm(s.cabeca, 13, 12, 9.5, MP.PELE, 0, 0, -3),                                       // bochecha (o ponto mais largo)
    bolaEm(s.cabeca, 10, 9.5, 7.5, MP.PELE, 0, 1, -12),                                     // queixo, mais estreito
    osso([cx, cy - 11, 100 + dz], [cx, cy - 16, 96 + dz], 1.8, 2.6, MP.PELE),               // nariz: da ponte a ponta
    bolaEm(s.cabeca, 2, 1.8, 3.5, MP.PELE, -13.5, -1, 1), bolaEm(s.cabeca, 2, 1.8, 3.5, MP.PELE, 13.5, -1, 1),  // orelhas
    vxCaixa(cx - 9, cy - 12, 102 + dz, 3, 2, 3, MP.OLHO), vxCaixa(cx + 6, cy - 12, 102 + dz, 3, 2, 3, MP.OLHO)
  ];
}

/* A junta da cabeca em voxel inteiro, para as pecas de caixa. O que e da
   cabeca (elmo, viseira, olhos do capuz, pena) acompanha a cabeca, e nao o
   meio do tronco: com o corpo do atelie a cabeca sobe no passo e inclina na
   corrida, e presa ao tronco a peca saia da cabeca -- e da grade. No corpo de
   bolas a cabeca e 101 + dz, entao ali nada muda. */
function cabecaInteira(s){ return [Math.round(s.cabeca[0]), Math.round(s.cabeca[1]), Math.round(s.cabeca[2])]; }

/* ---------- as pecas ----------
   Cada espaco tem as opcoes dele; null e nao usar nada ali. A ordem de
   ORDEM_PECAS e a ordem de montagem, e quem vem depois pinta por cima. O que
   e preso ao tronco usa s.cx, s.cy e s.dz, para acompanhar o corpo no passo. */
const PECAS = {
  roupa: {
    nenhuma: null,                                                                           // a do desenho
    camisa: function(s){ return [
      vxBola(s.cx, s.cy, 54 + s.dz, 15.2, 10.4, 11, MP.TECIDO), vxBola(s.cx, s.cy, 68 + s.dz, 17.2, 11.2, 13, MP.TECIDO),
      osso(s.ombroE, entre(s.ombroE, s.cotoveloE, 0.9), 5.6, 5.0, MP.TECIDO),
      osso(s.ombroD, entre(s.ombroD, s.cotoveloD, 0.9), 5.6, 5.0, MP.TECIDO),
      vxCaixa(s.cx - 15, s.cy - 11, 50 + s.dz, 30, 22, 3, MP.COURO)]; },                    // cinto
    tunica: function(s){ return [vxBola(s.cx, s.cy, 43 + s.dz, 16, 11.5, 8, MP.TECIDO)].concat(PECAS.roupa.camisa(s)); }
  },
  armadura: {
    roupa: null,
    couro: function(s){ return [
      vxBola(s.cx, s.cy, 64 + s.dz, 17.6, 11.8, 15, MP.COURO),
      bolaEm(s.ombroE, 6.5, 6.5, 5.5, MP.COURO, 0, 0, 1.5), bolaEm(s.ombroD, 6.5, 6.5, 5.5, MP.COURO, 0, 0, 1.5),
      vxCaixa(s.cx - 15, s.cy - 12, 50 + s.dz, 30, 24, 3, MP.METAL)]; },
    malha: function(s){ return [
      vxBola(s.cx, s.cy, 58 + s.dz, 17.8, 12, 24, MP.MALHA),
      osso(s.ombroE, s.cotoveloE, 6.0, 5.4, MP.MALHA), osso(s.ombroD, s.cotoveloD, 6.0, 5.4, MP.MALHA),
      osso(s.cotoveloE, entre(s.cotoveloE, s.maoE, 0.5), 5.2, 4.6, MP.MALHA),
      osso(s.cotoveloD, entre(s.cotoveloD, s.maoD, 0.5), 5.2, 4.6, MP.MALHA),
      vxCaixa(s.cx - 15, s.cy - 12, 50 + s.dz, 30, 24, 3, MP.COURO)]; },
    placas: function(s){ return [
      vxBola(s.cx, s.cy, 44 + s.dz, 17.5, 12.5, 8, MP.METAL),                               // fralda
      vxBola(s.cx, s.cy, 64 + s.dz, 18.5, 13, 16, MP.METAL),                                // peitoral
      bolaEm(s.ombroE, 9, 8.5, 7, MP.METAL, -1.5, 0, 3), bolaEm(s.ombroD, 9, 8.5, 7, MP.METAL, 1.5, 0, 3),
      osso(s.cotoveloE, entre(s.cotoveloE, s.maoE, 0.8), 5.4, 5.0, MP.METAL),                // bracais
      osso(s.cotoveloD, entre(s.cotoveloD, s.maoD, 0.8), 5.4, 5.0, MP.METAL),
      osso([s.peE[0], s.peE[1], s.peE[2] + 3], s.joelhoE, 6.2, 6.6, MP.METAL),              // grevas
      osso([s.peD[0], s.peD[1], s.peD[2] + 3], s.joelhoD, 6.2, 6.6, MP.METAL),
      bolaEm(s.maoE, 5.6, 5.6, 6, MP.METAL, 0, 0, -3), bolaEm(s.maoD, 5.6, 5.6, 6, MP.METAL, 0, 0, -3)]; }  // manoplas
  },
  cabelo: {
    careca: null,
    curto: function(s){ return [                                                             // o topo encosta no teto da grade, 117
      bolaEm(s.cabeca, 15.8, 14.6, 9.5, MP.CABELO, 0, 2.5, 6.5),
      bolaEm(s.cabeca, 14.5, 9.5, 12, MP.CABELO, 0, 7, -1)]; },
    longo: function(s){ return PECAS.cabelo.curto(s).concat([vxOsso(s.cx, s.cy + 10, 100 + s.dz, s.cx, s.cy + 11, 70 + s.dz, 12, 9, MP.CABELO)]); },
    rabo:  function(s){ return PECAS.cabelo.curto(s).concat([vxOsso(s.cx, s.cy + 13, 100 + s.dz, s.cx, s.cy + 20, 72 + s.dz, 5, 3.4, MP.CABELO)]); }
  },
  elmo: {
    nenhum: null,
    capuz: function(s){ const h = cabecaInteira(s); return [
      bolaEm(s.cabeca, 17, 16, 15, MP.CAPA, 0, 2, 1),
      vxOsso(s.cx, s.cy + 4, 84 + s.dz, s.cx, s.cy + 14, 70 + s.dz, 10, 7, MP.CAPA),
      bolaEm(s.cabeca, 9, 6, 10, MP.PELE, 0, -11, -1),                                       // o rosto aparece
      vxCaixa(h[0] - 7, h[1] - 18, h[2], 3, 2, 3, MP.OLHO), vxCaixa(h[0] + 4, h[1] - 18, h[2], 3, 2, 3, MP.OLHO)]; },
    elmo: function(s){ return [
      bolaEm(s.cabeca, 16.2, 15.4, 10.5, MP.METAL, 0, 1, 5.5),
      vxCaixa(cabecaInteira(s)[0] - 1, cabecaInteira(s)[1] - 16, cabecaInteira(s)[2] - 13, 3, 2, 17, MP.METAL)]; },   // nasal
    fechado: function(s){ const h = cabecaInteira(s); return [
      vxCaixa(h[0] - 15, h[1] - 15, h[2] - 16, 30, 30, 31, MP.METAL),
      vxCaixa(h[0] - 11, h[1] - 16, h[2] - 2, 22, 1, 3, MP.OLHO),                           // viseira
      vxCaixa(h[0] - 2, h[1] - 16, h[2] - 11, 4, 1, 6, MP.METAL)]; }
  },
  capa: {
    nenhuma: null,
    capa: function(s){
      const p = [];
      for (let z=22; z<=78; z++){
        const w = Math.round(30 + (78 - z)*0.25);
        p.push(vxCaixa(s.cx - (w >> 1), z > 70 ? s.cy + 11 : s.cy + 13, z + s.dz, w, 3, 1, MP.CAPA));
      }
      p.push(vxCaixa(s.cx - 18, s.cy + 10, 72 + s.dz, 36, 5, 6, MP.CAPA));                  // presa nos ombros
      return p;
    }
  },
  escudo: {
    nenhum: null,
    /* o escudo fica preso ao braco e nao balanca com a mao: balancando, ele
       sairia da moldura no passo. Bloqueando, ele sobe e vai pra frente, pra
       parecer erguido -- o unico lugar onde este espaco olha para a pose. */
    redondo: function(s){
      const bloq = s.pose === POSE.BLOQUEAR;
      const x = s.cx - 30, y = bloq ? s.cy - 6 : s.cy, z = (bloq ? 66 : 55) + s.dz;
      return [vxBola(x, y, z, 4.5, 18, 18, MP.METAL),                                        // aro
              vxBola(x, y, z, 4.0, 16.5, 16.5, MP.MADEIRA),
              vxBola(x - 3, y, z, 3.0, 5, 5, MP.METAL)]; }                                   // bossa
  },
  arma: {
    nenhuma: null,
    adaga: function(s){ const m = s.maoD; return [
      vxOsso(m[0], m[1], m[2] - 3, m[0], m[1], m[2] + 2, 2.2, 2.2, MP.COURO),
      vxOsso(m[0] + 1, m[1] - 2, m[2] + 2, m[0] + 3, m[1] - 7, m[2] + 8, 2.2, 1.0, MP.METAL)]; },
    espada: function(s){ const m = s.maoD; return [
      vxOsso(m[0], m[1], m[2] - 6, m[0], m[1], m[2] + 3, 2.4, 2.4, MP.COURO),                                   // cabo
      vxCaixa(Math.round(m[0]) - 7, Math.round(m[1]) - 3, Math.round(m[2]) + 3, 15, 5, 3, MP.METAL),            // guarda
      vxOsso(m[0] + 3, m[1] - 3, m[2] + 6, m[0] + 10, m[1] - 7, m[2] + 50, 3.2, 1.6, MP.METAL)]; },            // lamina
    cajado: function(s){ const m = s.maoD; return [
      vxOsso(m[0] + 3, m[1], 3, m[0] + 3, m[1], 108, 3, 3, MP.MADEIRA),
      vxBola(m[0] + 3, m[1], 111, 5.5, 5.5, 5.5, MP.METAL)]; },
    arco: function(s){ const m = s.maoD, x = m[0] + 7; return [
      vxOsso(x, m[1] + 3, m[2] - 27, x + 3, m[1] - 3, m[2], 3, 2.7, MP.MADEIRA),
      vxOsso(x + 3, m[1] - 3, m[2], x, m[1] + 3, m[2] + 27, 2.7, 3, MP.MADEIRA),
      vxOsso(x, m[1] + 5, m[2] - 27, x, m[1] + 5, m[2] + 27, 1.2, 1.2, MP.COURO)]; },                           // corda
    grimorio: function(s){ const m = s.maoD; return [                                       // o livro do feitico de fogo
      vxCaixa(Math.round(m[0]) - 4, Math.round(m[1]) - 5, Math.round(m[2]) - 2, 8, 10, 5, MP.COURO),
      vxCaixa(Math.round(m[0]) - 3, Math.round(m[1]) - 4, Math.round(m[2]) - 1, 6, 8, 3, MP.MADEIRA)]; }        // paginas
  },
  enfeite: {
    nenhum: null,
    pena: function(s, esc){ const h = cabecaInteira(s), z = h[2] + (esc.elmo === "fechado" ? 12 : 9); return [
      vxOsso(h[0] + 4, h[1] + 3, z - 10, h[0] + 10, h[1] + 21, z, 3.4, 1.7, MP.ENFEITE)]; },
    faixa: function(s, esc){ const y = frenteDoPeito(s, esc) - 1.5; return [
      vxOsso(s.cx - 17, y, 80 + s.dz, s.cx + 17, y, 46 + s.dz, 3.6, 3.6, MP.ENFEITE)]; },
    brasao: function(s, esc){ return [
      vxCaixa(s.cx - 7, Math.floor(frenteDoPeito(s, esc) - 3), 58 + s.dz, 14, 3, 16, MP.ENFEITE)]; }
  }
};
const ORDEM_PECAS = ["roupa", "armadura", "cabelo", "elmo", "capa", "escudo", "arma", "enfeite"];
const CORES_PERSONAGEM = {corRoupa:R_TUNICAS, corCabelo:R_CABELOS, corCapa:R_TUNICAS, corEnfeite:R_ENFEITES};
/* com corpo desenhado, a roupa e o cabelo sao os do desenho */
const PERSONAGEM_PADRAO = {roupa: CORPO_DESENHADO ? "nenhuma" : "tunica", armadura:"roupa",
                           cabelo: CORPO_DESENHADO ? "careca" : "curto", elmo:"nenhum", capa:"nenhuma",
                           escudo:"nenhum", arma:"nenhuma", enfeite:"nenhum",
                           corRoupa:0, corCabelo:0, corCapa:1, corEnfeite:0};

/* Uma escolha qualquer vira uma escolha valida: peca ou cor que nao existe
   volta ao padrao, para uma escolha guardada numa versao antiga nao quebrar. */
function escolhaDoPersonagem(e){
  const o = Object.assign({}, PERSONAGEM_PADRAO);
  if (!e) return o;
  for (const k of ORDEM_PECAS) if (Object.prototype.hasOwnProperty.call(PECAS[k], e[k])) o[k] = e[k];
  for (const k in CORES_PERSONAGEM){
    const v = e[k];
    if (typeof v === "number" && v >= 0 && v < CORES_PERSONAGEM[k].length) o[k] = v | 0;
  }
  return o;
}
/* as primitivas do personagem; `semCorpo` deixa de fora o corpo de bolas,
   quando o corpo vem do desenho */
function pecasDoPersonagem(e, pose, semCorpo){
  const esc = escolhaDoPersonagem(e), s = esqueleto(pose || 0, esc);
  let p = semCorpo ? [] : pecaCorpo(s);
  for (const k of ORDEM_PECAS){
    const f = PECAS[k][esc[k]];
    if (f) p = p.concat(f(s, esc));
  }
  return naDensidade(p);
}
function materiaisDoPersonagem(e){
  const esc = escolhaDoPersonagem(e);
  return [{tons:R_FLESH}, {tons:R_OLHO}, {tons:R_LEATH}, {tons:R_TUNICAS[esc.corRoupa]}, {tons:R_CABELOS[esc.corCabelo]},
          {tons:R_STEEL}, {tons:R_MALHA}, {tons:R_WOOD}, {tons:R_TUNICAS[esc.corCapa]}, {tons:R_ENFEITES[esc.corEnfeite]}]
    .concat(RAMPAS_DO_DESENHO.map(function(t){ return {tons:t, plano:1}; }));
}
/* a grade de uma pose: o corpo, desenhado ou de bolas, e as pecas por cima */
function gradeDoPersonagem(e, pose){
  const D = DIM_PERSONAGEM;
  if (!CORPO_DESENHADO) return montarVoxels(pecasDoPersonagem(e, pose), D.DX, D.DY, D.DZ);
  return montarVoxels(pecasDoPersonagem(e, pose, true), D.DX, D.DY, D.DZ, gradeDoQuadro(pose || 0));
}

/* A copia para longe: metade da grade em cada eixo. Cada celula nova olha os
   oito voxels que cobre e fica com o material mais comum, se pelo menos tres
   estiverem cheios -- menos que isso e borda, e borda cheia engorda a
   silhueta. Sem ela o personagem cintila ao andar a partir de uns 2,5 tiles. */
/* quantas copias para longe: uma de metade em 117; em 256, tambem a de um
   quarto (a de metade ainda tem mais voxels que a de 117 inteira) */
function copiasParaLonge(){ return DENSIDADE > 1.5 ? 2 : 1; }
function reduzirGrade(g, DX, DY, DZ){
  const dx = DX >> 1, dy = DY >> 1, dz = (DZ + 1) >> 1, h = new Uint8Array(dx*dy*dz), conta = new Uint8Array(256);
  for (let z=0; z<dz; z++) for (let y=0; y<dy; y++) for (let x=0; x<dx; x++){
    let cheios = 0, melhor = 0;
    for (let k=0; k<2; k++) for (let j=0; j<2; j++) for (let i=0; i<2; i++){
      const zz = 2*z + k;
      if (zz >= DZ) continue;
      const m = g[(zz*DY + 2*y + j)*DX + 2*x + i];
      if (m){ cheios++; conta[m]++; if (conta[m] > conta[melhor]) melhor = m; }
    }
    if (cheios >= 3) h[(z*dy + y)*dx + x] = melhor;
    for (let k=0; k<2; k++) for (let j=0; j<2; j++) for (let i=0; i<2; i++){
      const zz = 2*z + k;
      if (zz < DZ) conta[g[(zz*DY + 2*y + j)*DX + 2*x + i]] = 0;
    }
  }
  return {g:h, DX:dx, DY:dy, DZ:dz};
}

/* ---------- a fornada ----------
   Oito poses em oito rumos, cada uma com a copia para longe, e muito para
   assar de uma vez so no meio do jogo. A fornada assa aos poucos: primeiro a
   pose parada em todos os rumos, depois as outras, um rumo por tarefa, e
   `trabalhar(ms)` faz tarefas ate gastar o tempo dado -- pelo menos uma. O
   laco do jogo chama isso a cada quadro. Enquanto uma pose nao fica pronta,
   quem desenha usa a parada. */
/* `corpo`, se vier, e outro corpo que nao o do jogador -- o andarilho da
   vila, os outros jogadores no co-op: cada tarefa roda com ele no lugar
   (comCorpo), e o quadro leva quantos pixels tem um tile (porTile), para a
   distancia escolher a copia certa. */
/* As alturas da camera em que o personagem e assado, em graus acima dele.
   Um sprite de pe, visto de cima, vira um risco no chao (o Leandro, 1/10):
   com `comAlturas`, depois de todas as poses em 0, a fornada assa de novo
   cada pose de 35, 70 e 90 graus (o de 90, bem de cima, pedido no mesmo dia) (o `inclina` do assador, sondagem 14), e
   quem desenha escolhe pela altura de onde a camera ve (desenharComAltura,
   p5a.js). O de 0 vem primeiro: o personagem aparece tao cedo quanto antes. */
const ALTURAS_DA_CAMERA = [0, 35, 70, 90];
function nivelDaAltura(graus){ return graus < 17.5 ? 0 : graus < 52.5 ? 1 : graus < 80 ? 2 : 3; }

/* `corpo`, se vier, e outro corpo que nao o do jogador -- o andarilho da
   vila, os outros jogadores no co-op: cada tarefa roda com ele no lugar
   (comCorpo), e o quadro leva quantos pixels tem um tile (porTile), para a
   distancia escolher a copia certa. */
function novaFornada(e, nevoa, poses, nRot, corpo, comAlturas){
  const D = DIM_PERSONAGEM, mats = comCorpo(corpo, function(){ return materiaisDoPersonagem(e); }), lista = poses || TODAS_AS_POSES, rumos = nRot || ROTACOES;
  const quadros = lista.map(function(){ return new Array(rumos).fill(null); });
  /* alto[k][pose][rumo]: o quadro da altura ALTURAS_DA_CAMERA[k + 1] */
  const alto = comAlturas ? ALTURAS_DA_CAMERA.slice(1).map(function(){ return lista.map(function(){ return new Array(rumos).fill(null); }); }) : null;
  const tarefas = [], estados = [];
  /* a pele da pose e as das copias para longe */
  function prepararPose(estado, pose){
    const g = gradeDoPersonagem(e, pose);
    estado.pele = peleDoModelo(g, D.DX, D.DY, D.DZ);
    estado.longe = [];
    let r = {g:g, DX:D.DX, DY:D.DY, DZ:D.DZ};
    for (let n=0; n<copiasParaLonge(); n++){
      r = reduzirGrade(r.g, r.DX, r.DY, r.DZ);
      estado.longe.push({DX:r.DX, DY:r.DY, DZ:r.DZ, pele:peleDoModelo(r.g, r.DX, r.DY, r.DZ)});
    }
  }
  /* um rumo numa altura, com as copias para longe */
  function assarRumo(estado, r, graus){
    const giro = r*TAU/rumos, inc = -graus*Math.PI/180;    // negativo: a camera acima
    const q = assarRotacoes(estado.pele, D.DX, D.DY, D.DZ, mats, 1, 1, P_PERSONAGEM, CONTORNO_DO_PERSONAGEM, inc, giro, nevoa || 0)[0];
    let ant = q;
    for (const l of estado.longe){
      ant.longe = assarRotacoes(l.pele, l.DX, l.DY, l.DZ, mats, 1, 1, P_PERSONAGEM, CONTORNO_DO_PERSONAGEM, inc, giro, nevoa || 0)[0];
      ant = ant.longe;
    }
    if (corpo) q.porTile = 128*corpo.densidade;
    return q;
  }
  lista.forEach(function(pose, ip){
    const estado = {};
    estados.push(estado);
    tarefas.push(function(){ prepararPose(estado, pose); });
    for (let r=0; r<rumos; r++) tarefas.push(function(){
      quadros[ip][r] = assarRumo(estado, r, 0);
      /* assado o ultimo rumo, a pele desta pose nao serve mais: sem soltar,
         a fornada pronta segurava as vinte peles, uns 55 MB por visual */
      if (r === rumos - 1) estado.pele = estado.longe = null;
    });
  });
  const basicas = tarefas.length;
  /* a segunda volta: as alturas, pose por pose, com a pele refeita */
  if (alto) lista.forEach(function(pose, ip){
    const estado = {};
    estados.push(estado);
    tarefas.push(function(){ prepararPose(estado, pose); });
    for (let k=0; k<alto.length; k++) for (let r=0; r<rumos; r++) tarefas.push(function(){
      alto[k][ip][r] = assarRumo(estado, r, ALTURAS_DA_CAMERA[k + 1]);
      if (k === alto.length - 1 && r === rumos - 1) estado.pele = estado.longe = null;
    });
  });
  if (corpo) for (let i = 0; i < tarefas.length; i++){ const f = tarefas[i]; tarefas[i] = function(){ return comCorpo(corpo, f); }; }
  let feitas = 0;
  return {
    quadros: quadros, alto: alto, poses: lista,
    pronta: function(){ return feitas >= tarefas.length; },
    /* todas as poses de pe (altura 0) prontas: ja da para trocar de boneco */
    basica: function(){ return feitas >= basicas; },
    /* o que o forno ainda segura: tarefas por fazer e peles por soltar (os testes olham) */
    presas: function(){
      let n = 0;
      for (const t of tarefas) if (t) n++;
      for (const s of estados) if (s.pele || s.longe) n++;
      return n;
    },
    trabalhar: function(ms){
      const t0 = performance.now();
      do {
        if (feitas >= tarefas.length) return true;
        const t = tarefas[feitas];
        tarefas[feitas++] = null;                 // a tarefa feita solta o que ela prendia
        t();
      } while (performance.now() - t0 < ms);
      return feitas >= tarefas.length;
    }
  };
}
/* Assa tudo de uma vez: [pose][rumo], como as criaturas. Um pixel da imagem
   e um voxel, e cada quadro leva em `longe` a copia de meia resolucao. */
function assarPersonagem(e, nRot, nevoa, poses, corpo){
  const f = novaFornada(e, nevoa, poses, nRot, corpo);
  f.trabalhar(Infinity);
  return f.quadros;
}
/* O quadro de uma pose num rumo; se ela ainda esta no forno, o da pose parada. */
function quadroDaPose(quadros, pose, rumo){
  return (quadros[pose] && quadros[pose][rumo]) || (quadros[0] && quadros[0][rumo]) || null;
}
/* O quadro certo para a distancia: a copia de meia resolucao quando cada
   pixel da tela ja cobre mais de um voxel e meio, e a de um quarto quando a
   de metade tambem cobre (so existe com densidade alta). */
function quadroPelaDistancia(q, dist){
  let v = (q.porTile || 128*DENSIDADE)*dist/FY;          // o cenario diz quantos pixels por tile (p3d.js)
  while (q.longe && v >= 1.5){ q = q.longe; v /= 2; }
  return q;
}
/* Troca o corpo desenhado (outro arquivo, ou o mesmo em outra densidade) e
   refaz o que depende dele. Quem assou com o antigo -- o jogador, o morador
   -- e avisado por aoTrocarCorpo, no p5.js. */
function usarCorpoDesenhado(c){
  c = corpoValido(c);
  if (!c) return false;
  CORPO_DESENHADO = c;
  medidasDoCorpo(c);
  CONTORNO_DO_PERSONAGEM = 0.42;
  RAMPAS_DO_DESENHO = c.cores.map(rampaDaCor);
  P_PERSONAGEM = paletaDoPersonagem();
  PERSONAGEM_PADRAO.roupa = "nenhuma"; PERSONAGEM_PADRAO.cabelo = "careca";
  if (typeof aoTrocarCorpo === "function") aoTrocarCorpo();
  return true;
}
/* a densidade guardada no ajuste vale desde a carga: o worker do forno, que
   nasce com o corpo embutido, recebe este */
if (typeof AJUSTE !== "undefined" && AJUSTE.densidade && CORPO_NATIVO && AJUSTE.densidade < CORPO_NATIVO.DZ){
  try {
    const c = corpoNaAltura(AJUSTE.densidade);
    if (c){ CORPO_DESENHADO = c; medidasDoCorpo(c); CORPO_DE_FORA = true; }
  } catch(e){}
}
/* Roda fn com outro corpo no lugar do do jogador -- a grade, a densidade, a
   paleta e as rampas dele -- e volta tudo como estava, ate se fn der erro. A
   paleta do corpo fica guardada nele (c.paleta), para quem desenha o quadro. */
function comCorpo(c, fn){
  if (!c || c === CORPO_DESENHADO) return fn();
  const antes = {c:CORPO_DESENHADO, dim:Object.assign({}, DIM_PERSONAGEM), dens:DENSIDADE, vox:VOX_PERSONAGEM, rampas:RAMPAS_DO_DESENHO,
                 pal:P_PERSONAGEM, cont:CONTORNO_DO_PERSONAGEM, roupa:PERSONAGEM_PADRAO.roupa, cabelo:PERSONAGEM_PADRAO.cabelo};
  try {
    CORPO_DESENHADO = c; medidasDoCorpo(c);
    RAMPAS_DO_DESENHO = c.rampas || (c.rampas = c.cores.map(rampaDaCor));
    P_PERSONAGEM = c.paleta || (c.paleta = paletaDoPersonagem());
    CONTORNO_DO_PERSONAGEM = 0.42; PERSONAGEM_PADRAO.roupa = "nenhuma"; PERSONAGEM_PADRAO.cabelo = "careca";
    return fn();
  } finally {
    CORPO_DESENHADO = antes.c; Object.assign(DIM_PERSONAGEM, antes.dim); DENSIDADE = antes.dens; VOX_PERSONAGEM = antes.vox;
    RAMPAS_DO_DESENHO = antes.rampas; P_PERSONAGEM = antes.pal; CONTORNO_DO_PERSONAGEM = antes.cont;
    PERSONAGEM_PADRAO.roupa = antes.roupa; PERSONAGEM_PADRAO.cabelo = antes.cabelo;
  }
}
/* a paleta de um corpo, sem trocar o do jogador */
function paletaDoCorpo(c){ return comCorpo(c, function(){ return P_PERSONAGEM; }); }
/* O morador sai do mesmo sistema. A variante escolhe roupa, cabelo e cores
   pelo nome, e ninguem na cidade anda armado. Com corpo desenhado, a
   variante so muda a capa. */
function moradorDaVariante(v){
  return escolhaDoPersonagem({roupa: CORPO_DESENHADO ? "nenhuma" : v % 2 ? "camisa" : "tunica",
                              cabelo: CORPO_DESENHADO ? "careca" : ["curto", "longo", "rabo", "careca"][v % 4],
                              corRoupa: v % 4, corCabelo: (v*3 + 1) % 4, corCapa: (v + 2) % 4,
                              capa: v === 3 ? "capa" : "nenhuma"});
}
