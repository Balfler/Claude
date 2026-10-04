/* Roda o jogo sem navegador.
   Fornece stub de canvas, fila manual de requestAnimationFrame e um gancho
   para o estado interno. Os dois arquivos de teste usam isto. */
const fs = require("fs");
const vm = require("vm");
const { canvasDeSoftware } = require("./canvas");

const noop = () => {};

/* Tudo que os testes precisam enxergar de dentro do IIFE do jogo. */
const EXPOSTO = [
  "G:G", "P:P", "get ents(){return ents;}", "get projs(){return projs;}",
  "doors:doors", "fire:fire", "useDoor:useDoor", "keys:keys", "WPN:WPN",
  "cellAt:cellAt", "SFX:SFX", "floorAt:floorAt", "ceilAt:ceilAt",
  "groundUnder:groundUnder", "ceilingOver:ceilingOver", "get MW(){return MW;}", "get MH(){return MH;}",
  "makeTex:makeTex", "toCam:toCam", "VA:VA", "drawPoly:drawPoly", "get ESC(){return ESC;}", "txt:txt",
  "cadaSolido:cadaSolido", "topoDoSolido:topoDoSolido", "pontoNoSolido:pontoNoSolido",
  "renderWorld:renderWorld", "renderEntities:renderEntities", "setCamera:setCamera", "ctx:ctx",
  "get img(){return img;}", "get camX(){return camX;}", "get camY(){return camY;}", "get camZ(){return camZ;}",
  "update:update", "novoMapa:novoMapa", "escreverMapa:escreverMapa", "lerMapa:lerMapa",
  "TERRENO_POR_CHAR:TERRENO_POR_CHAR", "converterMapa:converterMapa",
  "TEX:TEX", "SPR:SPR", "QUADS:QUADS", "nQuads:()=>quadCount",
  "SKY_W:SKY_W", "SKY_H:SKY_H", "serraAlturas:serraAlturas",
  "paletaDe:paletaDe", "fazColormap:fazColormap", "indexar:indexar",
  "shadeStack:shadeStack", "LEV:LEV",
  "EDEF:EDEF", "ROTACOES:ROTACOES",
  "montarVoxels:montarVoxels", "peleDoModelo:peleDoModelo",
  "modeloDiabrete:modeloDiabrete", "tombar:tombar", "DX_IMP:DX_IMP", "DY_IMP:DY_IMP", "DZ_IMP:DZ_IMP",
  "ILHA:ILHA", "ILHA_MOTOR:ILHA_MOTOR", "CEUZ:CEUZ", "TOPOZ:TOPOZ", "tileBlocks:tileBlocks",
  "REG:REG", "SKY_VOLTA:SKY_VOLTA", "lightAt:lightAt", "blocked:blocked", "get FAR(){return FAR;}", "CENARIO:CENARIO",
  "AJUSTE:AJUSTE", "ajustar:ajustar", "get RW(){return RW;}", "get RH(){return RH;}",
  "get FX(){return FX;}", "get FY(){return FY;}", "get buf(){return buf;}", "get zbuf(){return zbuf;}",
  "NO_TELHADO:NO_TELHADO", "TELHADO_Z:TELHADO_Z", "CHAMINES:CHAMINES",
  "PECAS:PECAS", "ORDEM_PECAS:ORDEM_PECAS", "PERSONAGEM_PADRAO:PERSONAGEM_PADRAO", "MP:MP",
  "DIM_PERSONAGEM:DIM_PERSONAGEM", "pecasDoPersonagem:pecasDoPersonagem", "materiaisDoPersonagem:materiaisDoPersonagem",
  "get VOX_PERSONAGEM(){return VOX_PERSONAGEM;}", "get DENSIDADE(){return DENSIDADE;}", "usarCorpoDesenhado:usarCorpoDesenhado", "ANDARILHO:ANDARILHO", "passoDoAndarilho:passoDoAndarilho", "quadroDoAndarilho:quadroDoAndarilho", "comCorpo:comCorpo", "paletaDoCorpo:paletaDoCorpo", "get CORPO_NATIVO(){return CORPO_NATIVO;}", "alturasPossiveis:alturasPossiveis", "get CORPO_DE_FORA(){return CORPO_DE_FORA;}", "reamostrarCorpo:reamostrarCorpo", "naDensidade:naDensidade", "corpoValido:corpoValido", "get P_PERSONAGEM(){return P_PERSONAGEM;}", "esqueleto:esqueleto", "esqueletoDaFormula:esqueletoDaFormula", "reduzirGrade:reduzirGrade", "quadroPelaDistancia:quadroPelaDistancia",
  "pecaCorpo:pecaCorpo", "lerPersonagem:lerPersonagem", "gradeDoPersonagem:gradeDoPersonagem", "get CORPO_DESENHADO(){return CORPO_DESENHADO;}",
  "POSE:POSE", "TODAS_AS_POSES:TODAS_AS_POSES", "REPOUSO:REPOUSO", "NOMES_DAS_POSES:NOMES_DAS_POSES", "novaFornada:novaFornada", "quadroDaPose:quadroDaPose",
  "fornadaAoFundo:fornadaAoFundo", "novaFornadaDoForno:novaFornadaDoForno", "assarNoForno:assarNoForno", "receberDoForno:receberDoForno",
  "fonteDoForno:fonteDoForno", "desligarForno:desligarForno", "FORNO:FORNO", "tabelaDaPaleta:tabelaDaPaleta",
  "get FORNADA_JOGADOR(){return FORNADA_JOGADOR;}", "get FORNADA_PROXIMA(){return FORNADA_PROXIMA;}",
  "get ARMA_ASSADA(){return ARMA_ASSADA;}", "poseDoJogador:poseDoJogador", "ARMA_DO_WPN:ARMA_DO_WPN",
  "escolhaDoJogador:escolhaDoJogador", "assarJogador:assarJogador",
  "assarPersonagem:assarPersonagem", "escolhaDoPersonagem:escolhaDoPersonagem", "moradorDaVariante:moradorDaVariante",
  "get camX(){return camX;}", "get camY(){return camY;}", "get QUADROS_JOGADOR(){return QUADROS_JOGADOR;}",
  "NOME_DO_MAPA:NOME_DO_MAPA", "VOLTA:VOLTA", "dizer:dizer", "usarItem:usarItem",
  "lerEntrada:lerEntrada", "ACOES:ACOES", "AGENDA:AGENDA", "SONS:SONS",
  "passoDoJogador:passoDoJogador", "passoDoMundo:passoDoMundo", "alvoDe:alvoDe", "JOGADOR_DA_TELA:JOGADOR_DA_TELA",
  "get JOGADORES(){return JOGADORES;}", "set JOGADORES(l){JOGADORES = l;}", "hurtPlayer:hurtPlayer", "pickup:pickup",
  "aplicarAcao:aplicarAcao", "shootProj:shootProj", "hurtEnemy:hurtEnemy", "alturaDoChao:alturaDoChao", "CHAO:CHAO", "get CHAO_Z(){return CHAO_Z;}", "montarChaoInclinado:montarChaoInclinado",
  "nomeDoMapa:()=>NOME_DO_MAPA", "trocarMundo:trocarMundo", "get PEDACOS(){return PEDACOS;}",
  "get mw(){return MW;}", "get mh(){return MH;}", "get PEDACOS_MONTADOS(){return PEDACOS_MONTADOS;}",
  "sujarTile:sujarTile", "montarPecas:montarPecas", "remontarPecas:montarPecas", "remontarSujos:remontarSujos",
  "atualizarTerreno:atualizarTerreno", "pisosSob:pisosSob", "assarMiniatura:assarMiniatura", "miniaturaDaPeca:miniaturaDaPeca", "facesDoMotor:facesDoMotor",
  "get buf(){return buf;}", "get zbuf(){return zbuf;}", "get RW(){return RW;}", "TEX_NOME:function(t){ for (const k in TEX) if (TEX[k] === t) return k; return '?'; }", "get NO_TELHADO(){return NO_TELHADO;}", "get TELHADO_Z(){return TELHADO_Z;}",
  "get TOPOZ(){return TOPOZ;}", "get FLOORZ(){return FLOORZ;}", "get CHAMINES(){return CHAMINES;}", "get MAP(){return MAP;}",
  "PECAS_NO_MUNDO:()=>((ILHA&&ILHA.pecas)||[]).length", "get SOLIDOS(){return SOLIDOS;}", "los3:los3",
  "geometriaDaPeca:geometriaDaPeca", "TIPOS_DE_PECA:TIPOS_DE_PECA", "ESTILOS:ESTILOS",
  "texturaDoEstilo:texturaDoEstilo", "estiloDaPeca:estiloDaPeca", "giroAceito:giroAceito", "ENCAIXA_EM:ENCAIXA_EM",
  "estilosDasConstrucoes:estilosDasConstrucoes", "ANDAR:ANDAR", "tamanhoDoTipo:tamanhoDoTipo", "medidasDaPeca:medidasDaPeca", "get HORIZONTE(){return HORIZONTE;}", "get FAR_AGORA(){return FAR;}", "get ILHA_AGORA(){return ILHA;}", "get CENARIO_AGORA(){return CENARIO;}", "SILUETA:SILUETA", "alocarTela:alocarTela", "prepararCamera:prepararCamera", "AJUSTE:AJUSTE", "rampaDaCor:rampaDaCor", "hexPal:hexPal", "peleDoModelo:peleDoModelo", "assarRotacoes:assarRotacoes", "get CONTORNO_DO_PERSONAGEM(){return CONTORNO_DO_PERSONAGEM;}", "get FAR_AGORA2(){return FAR;}",
  "TERRENOS:TERRENOS", "COISA_POR_ID:COISA_POR_ID", "destinoDaCoisa:destinoDaCoisa", "trocaDePeca:trocaDePeca", "pontasDaSubida:pontasDaSubida", "STEP:STEP",
  "buildGeometry:buildGeometry", "montarPedaco:montarPedaco", "get quadCount(){return quadCount;}", "get TANH(){return TANH;}", "get PIX_VISTOS(){return PIX_VISTOS;}", "get RVH(){return RVH;}",
  "PORTAS_DAS_PECAS:PORTAS_DAS_PECAS", "pecaAberta:pecaAberta", "alternarAberta:alternarAberta", "pontoQueAbre:pontoQueAbre",
  "pecaQueAbreNaFrente:pecaQueAbreNaFrente", "usarPecaQueAbre:usarPecaQueAbre", "MUNDO_PLACA:MUNDO_PLACA"
].join(",");

/* os globais que o jogo recebe como parametro (ver carregar) */
const GLOBAIS_RAPIDOS = ["Math", "Float32Array", "Float64Array", "Uint32Array", "Uint16Array", "Uint8Array",
  "Uint8ClampedArray", "Int32Array", "Int16Array", "Int8Array", "Array", "Object", "JSON", "Number", "String",
  "Set", "Map", "isFinite", "parseInt", "parseFloat"].join(",");

function makeCtx(w, h){
  const grad = { addColorStop: noop };
  return new Proxy({
    canvas: { width: w, height: h },
    createImageData: (a, b) => ({ data: new Uint8ClampedArray(a*b*4), width: a, height: b }),
    getImageData:   (x, y, a, b) => ({ data: new Uint8ClampedArray(a*b*4), width: a, height: b }),
    putImageData: noop, createLinearGradient: () => grad, createRadialGradient: () => grad,
    measureText: () => ({ width: 10 }), drawImage: noop, save: noop, restore: noop
  }, {
    get(t, p){ if (p in t) return t[p]; return typeof p === "string" ? noop : undefined; },
    set(t, p, v){ t[p] = v; return true; }
  });
}
function makeCanvas(w, h){
  const c = { width: w || 300, height: h || 150, style: {}, on: {},
              addEventListener: (t, fn) => { (c.on[t] = c.on[t] || []).push(fn); },
              focus: noop, requestPointerLock: noop,
              getBoundingClientRect: () => ({ x:0, y:0, width:c.width, height:c.height }) };
  c.getContext = () => (c._ctx || (c._ctx = makeCtx(c.width, c.height)));
  return c;
}

/* localStorage de mentira: o bastante para o jogo ler o mapa que o editor mandou */
function armazenamento(dados){
  const d = Object.assign({}, dados || {});
  return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); },
           removeItem: k => { delete d[k]; } };
}

/* opcoes.busca vira location.search, opcoes.armazenamento o localStorage,
   opcoes.canvas "software" desenha as texturas de verdade (teste/canvas.js)
   em vez de deixar vazias -- a tela do HUD continua de mentira --, e
   opcoes.extras sao arquivos rodados DENTRO do mesmo contexto depois do jogo
   -- e assim que o teste do canteiro roda a ferramenta sem navegador. */
function carregar(arquivo, opcoes){
  opcoes = opcoes || {};
  const html = fs.readFileSync(arquivo, "utf8");
  const bruto = html.match(/<script>\n([\s\S]*)<\/script>/);
  if (!bruto) throw new Error("nao achei o bloco <script> em " + arquivo);
  const alvo = "cvs.focus();\n})();";
  if (!html.includes(alvo)) throw new Error("nao achei o ponto de injecao do gancho");
  /* Dentro da vm, todo nome global -- Math, Float32Array -- passa pelo
     interceptador do contexto, e o rasterizador pergunta por Math a cada
     linha de varredura: o quadro saia tres vezes mais lento que no
     navegador. O jogo roda embrulhado numa funcao que recebe esses nomes
     como parametro, e eles viram nomes locais. */
  const js = "(function(" + GLOBAIS_RAPIDOS + "){\n" + bruto[1].replace(alvo,
    "cvs.focus();\nglobalThis.__dbg={" + EXPOSTO + "};\n})();") + "\n})(" + GLOBAIS_RAPIDOS + ");";

  const tela = makeCanvas(640, 360);
  const filaRaf = [], janelaOn = {};
  const sandbox = {
    console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: noop,
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => { filaRaf.push(fn); return filaRaf.length; },
    document: {
      createElement: (t) => t !== "canvas" ? { style: {} } : opcoes.canvas === "software" ? canvasDeSoftware() : makeCanvas(),
      getElementById: (id) => id === "screen" ? tela : null,
      addEventListener: noop, pointerLockElement: null
    },
    addEventListener: (t, fn) => { (janelaOn[t] = janelaOn[t] || []).push(fn); },
    removeEventListener: noop,
    /* sem endereco o jogo abre na ilha; as baterias que nao dizem o mapa sao
       as da cripta, entao pedem ela */
    location: { search: opcoes.busca === undefined ? "?mapa=cripta" : opcoes.busca },
    localStorage: armazenamento(opcoes.armazenamento),
    Uint32Array, Uint8Array, Uint8ClampedArray, Float32Array, Math, Date, JSON, Object, Array
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  /* opcoes.corposDeFora: {nome: texto do .personagem}, como o <nome>.corpo.js que a pagina carrega com ?corpo= */
  if (opcoes.corposDeFora) sandbox.PERSONAGENS_DE_FORA = opcoes.corposDeFora;
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { timeout: 60000 });

  const D = sandbox.__dbg;
  if (!D) throw new Error("o gancho de teste nao foi instalado");
  /* Os arquivos extras (canteiro/micro.js, por exemplo) veem tudo o que o
     jogo declarou: o IIFE do jogo expos o gancho, e o que esta fora dele
     roda no mesmo sandbox. */
  if (opcoes.extras){
    /* o que o jogo expos vira global do sandbox, com getter e tudo: assim o
       arquivo extra le o estado de agora, nao uma copia do carregamento */
    for (const k of Object.keys(D))
      if (!(k in sandbox)) Object.defineProperty(sandbox, k, Object.getOwnPropertyDescriptor(D, k));
    for (const extra of opcoes.extras)
      vm.runInContext(fs.readFileSync(extra, "utf8"), sandbox, { filename: extra, timeout: 20000 });
  }

  let relogio = 0;
  /* Avanca N quadros. O laco do jogo so continua se render() nao explodir,
     entao "loop parou" aqui significa excecao no motor. */
  function frames(n, dt){
    dt = dt || 1/60;
    for (let i = 0; i < n; i++){
      relogio += dt * 1000;
      const cbs = filaRaf.splice(0, filaRaf.length);
      if (!cbs.length) throw new Error("loop parou no quadro " + i);
      for (const cb of cbs) cb(relogio);
    }
  }
  /* Dispara um evento sintetico no canvas ("tela") ou na janela ("janela"). */
  function emit(alvo, tipo, ev){
    const lista = (alvo === "janela" ? janelaOn[tipo] : tela.on[tipo]) || [];
    ev = ev || {}; ev.preventDefault = ev.preventDefault || noop;
    lista.forEach(fn => fn(ev));
  }
  /* S e o sandbox -- funcao e var declaradas pelos extras aparecem nele.
     `avaliar` roda uma expressao no mesmo contexto, que e como o teste
     alcanca o que eles declararam com const (const de script nao vira
     propriedade do global). */
  const avaliar = function(expr){ return vm.runInContext(expr, sandbox, { timeout: 20000 }); };
  return { D, S: sandbox, avaliar: avaliar, frames, emit };
}

/* Placar compartilhado. */
function placar(){
  const ok = [], falhou = [];
  return {
    ok, falhou,
    check(nome, cond, extra){ (cond ? ok : falhou).push(nome + (extra ? " (" + extra + ")" : "")); },
    fim(){
      if (ok.length)     console.log("\n=== PASSOU (" + ok.length + ") ===\n  ok  " + ok.join("\n  ok  "));
      if (falhou.length) console.log("\n=== FALHOU (" + falhou.length + ") ===\n  XX  " + falhou.join("\n  XX  "));
      process.exit(falhou.length ? 1 : 0);
    }
  };
}

module.exports = { carregar, placar };
