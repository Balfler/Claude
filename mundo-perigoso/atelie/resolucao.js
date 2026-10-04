/* ============================================================
   ATELIE -- A RESOLUCAO
   ------------------------------------------------------------
   O personagem do jogo tem 117 voxels de altura. O Leandro quer ver o mesmo
   personagem em outras quantidades de voxels (165, 256) na propria
   ferramenta, e escolher. Para isso o projeto guarda a FONTE: o volume colorido
   de alta resolucao de onde o corpo de 117 saiu (forma do gerador de malha,
   cor do desenho). O corpo em qualquer outra resolucao e refeito dela, e o
   esqueleto, as larguras e as animacoes so mudam de escala.

   Como funciona:
   - a grade, a caixa do corpo e o centro do atelie (GRADE, CAIXA, CENTRO)
     viram K vezes maiores enquanto se olha nessa resolucao; tudo o mais no
     atelie ja le esses tres no momento de usar;
   - projetoEm(base, K) devolve o projeto na escala K (corpo refeito da fonte,
     juntas e larguras vezes K, pose com a raiz vezes K; a rotacao nao muda);
   - projetoDeVolta(base, derivado) leva de volta as animacoes editadas na
     escala K para a de 117 (a raiz dividida por K).
   O que se pinta a mao no corpo de 117 (peso, cor) nao vai para as outras
   resolucoes: elas saem sempre da fonte. So a pose e o esqueleto ida e volta.

   Sem dependencia, ASCII puro, no node e no navegador aberto do disco.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof importarModelo === "undefined"){
  const M = require("./corpo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof calcularPesos === "undefined"){
  const M = require("./pesos.js");
  for (const k in M) globalThis[k] = M[k];
}

/* as tres medidas do atelie na escala 1 (as do jogo) */
const BASE_DA_RESOLUCAO = {
  CAIXA: {ox: -30, oy: -4, oz: -3, bx: 140, by: 64, bz: 124},
  CENTRO: {CX: 40, CY: 28},
  GRADE: {DX: 80, DY: 56, DZ: 117}
};
let RESOLUCAO_ATUAL = 1;

/* As resolucoes que se pode pedir: a altura do personagem em voxels. A do jogo
   e 117; 165 e o que a tela de 640x360 ainda mostra a 1,6 tile; 256 e o
   nativo do que o Sorceress entrega. */
const ALTURAS_DA_RESOLUCAO = [117, 165, 256];
const escalaDaAltura = h => h/117;

/* poe o atelie na escala K (1 = a do jogo); devolve a funcao que volta */
function usarResolucao(K){
  const r = v => Math.round(v*K), B = BASE_DA_RESOLUCAO, antes = RESOLUCAO_ATUAL;
  Object.assign(CAIXA, {ox: r(B.CAIXA.ox), oy: r(B.CAIXA.oy), oz: r(B.CAIXA.oz), bx: r(B.CAIXA.bx), by: r(B.CAIXA.by), bz: r(B.CAIXA.bz)});
  Object.assign(CENTRO, {CX: r(B.CENTRO.CX), CY: r(B.CENTRO.CY)});
  Object.assign(GRADE, {DX: r(B.GRADE.DX), DY: r(B.GRADE.DY), DZ: r(B.GRADE.DZ)});
  RESOLUCAO_ATUAL = K;
  return function(){ usarResolucao(antes); };
}
function resolucaoAtual(){ return RESOLUCAO_ATUAL; }

/* ---------- a fonte ---------- */
/* Guarda um volume {gx, gy, gz, rgb(x, y, z)} como indices numa paleta de ate
   `maximo` cores: o que o arquivo do projeto leva. */
function fonteCompacta(fonte, maximo){
  maximo = maximo || 255;
  const cores = [];
  for (let z = 0; z < fonte.gz; z++) for (let y = 0; y < fonte.gy; y++) for (let x = 0; x < fonte.gx; x++){
    const c = fonte.rgb(x, y, z);
    if (c) cores.push(c);
  }
  const paleta = reduzirCores(cores, maximo);
  const cor = new Uint8Array(fonte.gx*fonte.gy*fonte.gz), memo = new Map();   // corMaisPerto devolve o indice de 1 em diante
  for (let z = 0; z < fonte.gz; z++) for (let y = 0; y < fonte.gy; y++) for (let x = 0; x < fonte.gx; x++){
    const c = fonte.rgb(x, y, z);
    if (!c) continue;
    const chave = (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
    let v = memo.get(chave);
    if (v === undefined){ v = corMaisPerto(paleta, c); memo.set(chave, v); }
    cor[(z*fonte.gy + y)*fonte.gx + x] = v;
  }
  return {gx: fonte.gx, gy: fonte.gy, gz: fonte.gz, paleta: paleta, cor: cor};
}
/* o volume guardado de volta no formato que importarModelo le */
function fonteComoVolume(f){
  return {gx: f.gx, gy: f.gy, gz: f.gz, rgb: function(x, y, z){
    const v = f.cor[(z*f.gy + y)*f.gx + x];
    return v ? f.paleta[v - 1] : null;
  }};
}

/* ---------- o projeto em outra escala ---------- */
function escalarPose(p, K){
  const q = copiarPose(p);
  q.raiz = p.raiz.map(function(v){ return v*K; });
  return q;
}
/* Refaz o projeto na escala K a partir da fonte. O atelie JA tem que estar na
   escala K (usarResolucao(K)): o corpo nasce na caixa dela. */
function projetoEm(base, K){
  if (!base.fonte) throw new Error("este projeto nao guarda a fonte de alta resolucao: so existe na resolucao dele");
  const corpo = importarModelo(fonteComoVolume(base.fonte), {nome: base.nome, altura: Math.round(115*K)});
  const juntas = {}, larguras = {};
  for (const k in base.juntas) juntas[k] = base.juntas[k].map(function(v){ return v*K; });
  for (const k in base.larguras) larguras[k] = base.larguras[k]*K;
  calcularPesos(corpo, juntas, {larguras: larguras, pano: !!base.pano});
  const animacoes = {};
  for (const a in base.animacoes) animacoes[a] = base.animacoes[a].map(function(p){ return escalarPose(p, K); });
  return {nome: base.nome, corpo: corpo, juntas: juntas, larguras: larguras, repouso: escalarPose(base.repouso, K), animacoes: animacoes,
          avisosDoRig: [], pano: !!base.pano, fonte: base.fonte, derivadoDe: base, escala: K};
}
/* as animacoes editadas na escala K, de volta na de 117 (so a raiz muda) */
function animacoesDeVolta(derivado){
  const K = derivado.escala, saida = {};
  for (const a in derivado.animacoes) saida[a] = derivado.animacoes[a].map(function(p){ return escalarPose(p, 1/K); });
  return saida;
}

const API_RESOLUCAO = {BASE_DA_RESOLUCAO, ALTURAS_DA_RESOLUCAO, escalaDaAltura, usarResolucao, resolucaoAtual, fonteCompacta, fonteComoVolume,
                       escalarPose, projetoEm, animacoesDeVolta};
if (typeof module !== "undefined") module.exports = API_RESOLUCAO;
