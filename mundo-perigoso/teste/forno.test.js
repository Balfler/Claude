/* Testes do forno ao fundo (src/forno.js): a fornada do personagem num worker.
   O node nao tem Worker, entao o worker e testado por partes: o protocolo
   (assarNoForno -> receberDoForno), a reserva na linha principal, e o texto
   do worker de verdade rodando num contexto separado, como rodaria no worker.
   Uso: node mundo-perigoso/teste/forno.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D } = carregar(arquivo);
const esc = D.escolhaDoPersonagem({armadura: "couro", elmo: "fechado", capa: "capa", corCapa: 2, arma: "adaga"});

/* a referencia: a mesma escolha assada na linha principal, do jeito de sempre */
const ref = D.novaFornada(esc, 0);
ref.trabalhar(Infinity);
const igual = function(a, b){
  if (!a || !b || a.w !== b.w || a.h !== b.h || a.px.length !== b.px.length) return false;
  for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.px[i]) return false;
  return true;
};
/* quantos quadros (com a copia para longe) saem iguais aos da referencia, e com a tabela de cores certa */
const iguais = function(f){
  let n = 0;
  const cm = D.tabelaDaPaleta(D.P_PERSONAGEM, 0).cm;
  ref.quadros.forEach(function(pose, ip){ pose.forEach(function(q, r){
    const o = f.quadros[ip][r];
    if (o && igual(q, o) && igual(q.longe, o.longe) && o.cm === cm && o.longe.cm === cm) n++;
  }); });
  return n;
};
const TOTAL = ref.quadros.length * ref.quadros[0].length;

/* 1. sem Worker, a fornada ao fundo e a de sempre */
{
  const f = D.fornadaAoFundo(esc, 0);
  f.trabalhar(Infinity);
  check("sem Worker (no node), o forno nao sobe e a fornada assa na linha principal",
    D.FORNO.estado === "falhou" && f.pronta() && iguais(f) === TOTAL, "estado " + D.FORNO.estado + ", " + iguais(f) + "/" + TOTAL + " iguais");
}

/* 2. o protocolo: o que o worker manda, a pagina monta igual */
{
  let pedido = null, mensagens = 0;
  const f = D.novaFornadaDoForno(esc, 0, function(p){ pedido = p; });
  check("a fornada do forno so fica pronta quando o forno avisa", !f.pronta() && f.trabalhar(3) === false);
  D.assarNoForno(pedido, function(msg){ mensagens++; D.receberDoForno(msg); });
  check("o forno manda uma mensagem por pose, e uma no fim", mensagens === ref.quadros.length + 1, mensagens + " mensagens");
  check("o que o forno assa e igual, byte a byte, ao da linha principal", f.pronta() && iguais(f) === TOTAL, iguais(f) + "/" + TOTAL);
  check("a fornada pronta sai da lista de pedidos", !D.FORNO.pedidos.has(pedido.id));
}

/* 3. o forno cai no meio: o resto assa aqui, e sai igual */
{
  let pedido = null, n = 0;
  const f = D.novaFornadaDoForno(esc, 0, function(p){ pedido = p; });
  D.assarNoForno(pedido, function(msg){ if (n++ < 5) D.receberDoForno(msg); });   // so as cinco primeiras poses chegam
  const antes = f.quadros.filter(function(p){ return p.every(Boolean); }).length;
  D.desligarForno();
  f.trabalhar(Infinity);
  check("o forno cai no meio: o que chegou fica, o resto assa na linha principal, e sai igual",
    antes === 5 && f.pronta() && iguais(f) === TOTAL, antes + " poses tinham chegado; " + iguais(f) + "/" + TOTAL + " iguais");
}

/* 4. o texto do worker, de verdade: a casca e o jogo inteiro, num contexto
   separado, sem documento, com o self e o postMessage de um worker */
{
  const html = fs.readFileSync(arquivo, "utf8");
  const texto = html.match(/<script>\n([\s\S]*)<\/script>/)[1];
  const fonte = D.fonteDoForno(texto);
  const recebidas = [], nada = function(){};
  const self = {postMessage: function(m){ recebidas.push(m); }, addEventListener: nada};
  const ctx = vm.createContext({self: self, addEventListener: nada, removeEventListener: nada, performance: {now: function(){ return Date.now(); }},
                                console: console, setTimeout: setTimeout, clearTimeout: clearTimeout});
  let erro = "";
  const t0 = Date.now();
  try { vm.runInContext(fonte, ctx, {timeout: 60000}); } catch (e){ erro = e.message; }
  check("o worker carrega o jogo sem documento e avisa que esta pronto", !erro && recebidas.length === 1 && recebidas[0].pronto === true,
    erro || ("em " + (Date.now() - t0) + " ms"));
  if (!erro && typeof self.onmessage === "function"){
    recebidas.length = 0;
    self.onmessage({data: {id: 1, escolha: esc, nevoa: 0}});
    const f = D.novaFornadaDoForno(esc, 0, nada);
    for (const m of recebidas) D.receberDoForno(Object.assign({}, m, {id: f.id}));
    check("o worker de verdade assa igual, byte a byte, ao da linha principal", f.pronta() && iguais(f) === TOTAL,
      recebidas.length + " mensagens, " + iguais(f) + "/" + TOTAL + " iguais");
    /* outro corpo (o andarilho): o corpo vai uma vez com o nome, e o pedido leva so o nome -- o
       pedido nao pode ser tomado pelo corpo (1/10: o andarilho ficou parado, so com a pose que a
       pagina assou, porque o worker guardava o pedido como se fosse corpo) */
    const arqG = path.join(__dirname, "..", "personagens", "guerreiro.personagem");
    if (fs.existsSync(arqG)){
      const c = D.lerPersonagem(fs.readFileSync(arqG, "utf8"));
      recebidas.length = 0;
      self.onmessage({data: {corpoId: "guerreiro", corpo: {versao: c.versao, DX: c.DX, DY: c.DY, DZ: c.DZ, cores: c.cores, g: c.g,
                                                         poses: c.poses.map(p => ({nome: p.nome, juntas: p.juntas, g: p.g}))}}});
      self.onmessage({data: {id: 2, escolha: esc, nevoa: 0, corpoId: "guerreiro", poses: [0, 1]}});
      const q = recebidas.filter(m => !m.fim);
      check("o worker assa outro corpo pelo nome: as poses pedidas, em 256, e o passo diferente do parado",
        q.length === 2 && recebidas.some(m => m.fim) && q[0].quadros[0].h === 256 && q[1].quadros[0].h === 256 &&
        q[0].quadros[0].px.some((v, i) => v !== q[1].quadros[0].px[i]), recebidas.length + " mensagens");
    }
  }
}

/* 5. o jogo pede ao forno, e o forno e ASCII como o resto */
{
  const p5 = fs.readFileSync(path.join(__dirname, "..", "src", "p5.js"), "utf8");
  check("a fornada do jogador e a do forno (a primeira, a da arma nova, a do corpo trocado e a do andarilho)", (p5.match(/fornadaAoFundo\(/g) || []).length === 4 && !/novaFornada\(/.test(p5));
  const s = fs.readFileSync(path.join(__dirname, "..", "src", "forno.js"), "utf8");
  const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
  check("src/forno.js e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);
}

fim();
