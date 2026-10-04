/* ============================================================
   DISCO DE HABILIDADES -- a pagina
   ------------------------------------------------------------
   Toda regra vem de src/regras.js. Aqui so tem tela: a pagina guarda o
   plano de compras e pergunta ao arquivo de regras o que ele compra no
   nivel escolhido.

   O plano e uma fila. Comprar poe a compra logo depois do que ja esta
   comprado, na frente do que ainda espera nivel. Morrer so muda o nivel:
   o que deixa de caber sai da ponta da fila, e volta quando o nivel volta.

   O disco e as arvores dependem do mundo -- de quais fatias cairam numa
   traicao. Quando o mundo muda, o desenho e a lista de especializacoes sao
   refeitos inteiros.
   ============================================================ */
(function(){
"use strict";

const R = REGRAS;
const $ = function(id){ return document.getElementById(id); };
const SVG = "http://www.w3.org/2000/svg";
const CHAVE = "disco-de-habilidades:v1";
const TAM = 1240, C = 620;
const CAIDA = "necromante";

const S = {
  nivel: 40, progresso: 0.4, esp: null, caidas: [], equipamento: "placas", escudo: true, esquecimentos: 0,
  plano: {atributos: [], nos: []},
  receita: null, ilha: false, guardada: null, evento: null, textoEditado: false
};
const UI = {atr: {}, nos: {}, ligs: [], lobos: {}, arvores: {}, esp: {}, linhas: [], receitas: [], armaduras: [],
            fatiaNum: [], dicaAlvo: null, mundo: null};
const VISTA = {x: 0, y: 0, w: TAM};

/* ---------- utilidades ---------- */
function el(tag, attrs, pai, texto){
  const e = tag.indexOf("svg:") === 0
    ? document.createElementNS(SVG, tag.slice(4)) : document.createElement(tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (texto != null) e.textContent = texto;
  if (pai) pai.appendChild(e);
  return e;
}
function fmt(n, casas){
  const c = casas || 0;
  return Number(n).toLocaleString("pt-BR", {minimumFractionDigits: c, maximumFractionDigits: c});
}
function comSinal(n, casas){
  const c = casas || 0;
  if (Math.round(Math.abs(n) * Math.pow(10, c)) === 0) return "0";
  return (n > 0 ? "+" : "\u2212") + fmt(Math.abs(n), c);
}
function tempo(min){
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return m + " min";
  return h + " h" + (m ? " " + m + " min" : "");
}
function pontos(n){ return n + (n === 1 ? " ponto" : " pontos"); }
function ondeEsta(n, p){ return "n\u00edvel " + n + (n < R.nivelMax ? " com " + Math.round(p * 100) + "% andado" : ""); }
function ehArvore(id){ return id.charAt(0) === "+"; }
function minuscula(t){ return t.charAt(0).toLowerCase() + t.slice(1); }

function M(){ return mundo(S.caidas); }
function noDe(id){ return M().disco.porId[id]; }
function espDe(id){ return id ? M().espPorId[id] || null : null; }
function opcoes(){ return {especializacao: S.esp, caidas: S.caidas}; }
function estado(){ return montar(S.plano, S.nivel, opcoes()); }
/* o plano inteiro, como se o nivel nao tivesse limite: e o que aparece
   tracejado, esperando */
function planoInteiro(){ return montar(S.plano, 1e6, opcoes()); }
function traiu(){ return S.caidas.indexOf(CAIDA) >= 0; }

/* "ramo armadura do guerreiro", para dizer por onde se entra numa arvore */
function textoDaPonta(id){
  const t = noDe(id);
  return "ramo " + minuscula(t.ramoNome) + " do " + minuscula(M().fatias[t.fatia].nome);
}
function nomeDoNo(id){
  const n = noDe(id);
  if (!n) return id;
  if (n.tipo === "pequeno" && !n.esp) return M().fatias[n.fatia].nome + ", " + minuscula(n.ramoNome);
  return n.nome;
}

/* ---------- acoes ---------- */
function mexeu(){
  S.receita = null;
  S.textoEditado = false;
  $("textoAviso").textContent = "";
  render();
}
function avisoDisco(t){ $("discoAviso").textContent = t; }
function avisoEsp(t){ $("espAviso").textContent = t; }

function comprarAtributo(id){
  const e = estado();
  if (e.atributos[id] >= R.atributoMax || custoAtributo(e.atributos[id]) > e.sobraAtr) return;
  S.plano.atributos.splice(S.plano.atributos.length - e.esperaAtr, 0, id);
  mexeu();
}
function devolverAtributo(id){
  const e = estado(), feitos = S.plano.atributos.length - e.esperaAtr;
  for (let k = feitos - 1; k >= 0; k--)
    if (S.plano.atributos[k] === id){ S.plano.atributos.splice(k, 1); mexeu(); return; }
}

function comprarNo(id){
  const e = estado(), n = noDe(id);
  if (e.sobraHab < 1){ avisoDisco("Sem pontos de habilidade livres neste n\u00edvel."); return; }
  if (n.esp){
    if (S.esp !== n.esp){ avisoDisco("Esta \u00e9 a \u00e1rvore de " + espDe(n.esp).nome + ": escolha a especializa\u00e7\u00e3o antes."); return; }
    if (!e.espAberta){ avisoDisco("A especializa\u00e7\u00e3o ainda est\u00e1 fechada: faltam pontos nas fatias dela."); return; }
  }
  if (!M().disco.viz[id].some(function(v){ return e.donos[v]; })){
    avisoDisco(n.tipo === "porta"
      ? "A porta pede a ponta do " + textoDaPonta(n.ponta) + " comprada, ou um n\u00f3 da \u00e1rvore encostado."
      : "Longe demais: compre antes um n\u00f3 encostado neste.");
    return;
  }
  S.plano.nos.splice(S.plano.nos.length - e.esperaNos, 0, id);
  avisoDisco("");
  mexeu();
}
function devolverNo(id){
  if (!podeDevolver(S.plano, id, opcoes())){
    avisoDisco("Este n\u00f3 sustenta outros, ou mant\u00e9m a especializa\u00e7\u00e3o aberta. Devolva antes o que depende dele.");
    return;
  }
  S.plano.nos.splice(S.plano.nos.lastIndexOf(id), 1);
  avisoDisco("");
  mexeu();
}
function acionarNo(id){
  if (id === "centro") return;
  if (S.plano.nos.indexOf(id) >= 0) devolverNo(id);
  else comprarNo(id);
}

function escolherEsp(id){
  const e = estado();
  if (!especializacaoAberta(espDe(id), e.porFatia)){
    avisoEsp("Ainda fechada: faltam pontos nas fatias dela."); return;
  }
  const tinha = S.plano.nos.some(ehArvore);
  S.plano.nos = S.plano.nos.filter(function(n){ return !ehArvore(n); });
  S.esp = id;
  avisoEsp(tinha ? "Os n\u00f3s da \u00e1rvore da especializa\u00e7\u00e3o anterior sa\u00edram do plano." : "");
  mexeu();
}
function soltarEsp(){
  S.plano.nos = S.plano.nos.filter(function(n){ return !ehArvore(n); });
  S.esp = null;
  avisoEsp("");
  mexeu();
}
function alternarEsp(id){ if (S.esp === id) soltarEsp(); else escolherEsp(id); }

/* A traicao converte a build no lugar: os nos do clerigo viram os do
   necromante, e a especializacao vira a que espelha a dela. */
function alternarTraicao(){
  const trair = !traiu(), antes = espDe(S.esp);
  const r = converter(S.plano, S.esp, CAIDA, trair);
  S.plano = r.plano;
  S.esp = r.especializacao;
  S.caidas = trair ? [CAIDA] : [];
  S.receita = null; S.evento = null; S.textoEditado = false;
  const depois = espDe(S.esp);
  let t = trair
    ? "O cl\u00e9rigo traiu: cada n\u00f3 dele virou o n\u00f3 do necromante no mesmo lugar."
    : "A trai\u00e7\u00e3o foi desfeita. No jogo ela n\u00e3o tem volta.";
  if (antes && depois && antes.id !== depois.id) t += " " + antes.nome + " virou " + minuscula(depois.nome) + ".";
  avisoEsp(t);
  avisoDisco("");
  render();
}

function carregarReceita(rec){
  S.plano = planoDaReceita(rec);
  S.caidas = (rec.caidas || []).slice();
  S.esp = rec.especializacao;
  S.equipamento = rec.equipamento;
  S.escudo = rec.escudo;
  S.receita = rec.nome;
  S.evento = null;
  S.textoEditado = false;
  $("textoAviso").textContent = "";
  avisoDisco(""); avisoEsp("");
}
function guardadaDaReceita(rec, nivel){
  const e = montar(planoDaReceita(rec), nivel, {especializacao: rec.especializacao, caidas: rec.caidas});
  return {rotulo: rec.nome + ", n\u00edvel " + nivel, d: derivar(e, rec.equipamento, rec.escudo)};
}
function aplicarBuild(b){
  S.nivel = b.nivel; S.progresso = b.progresso; S.esp = b.especializacao; S.caidas = b.caidas.slice();
  S.equipamento = b.equipamento; S.escudo = b.escudo;
  S.esquecimentos = b.esquecimentos; S.plano = b.plano;
}
function buildAtual(){
  return {nivel: S.nivel, progresso: S.progresso, especializacao: S.esp, caidas: S.caidas, equipamento: S.equipamento,
          escudo: S.escudo, esquecimentos: S.esquecimentos, plano: S.plano};
}

/* ---------- morte e mago ---------- */
function retrato(){
  return JSON.stringify({nivel: S.nivel, progresso: S.progresso, plano: S.plano, esp: S.esp, caidas: S.caidas,
                         esquecimentos: S.esquecimentos, receita: S.receita});
}
function morrer(){
  const antes = estado(), foto = retrato(), n0 = S.nivel, p0 = S.progresso;
  const r = perderXp(S.nivel, S.progresso, R.morte);
  S.nivel = r.nivel; S.progresso = r.progresso;
  const depois = estado();
  const atr = antes.gastoAtr - depois.gastoAtr, hab = antes.gastoHab - depois.gastoHab;
  let t = "Morreu no " + ondeEsta(n0, p0) + ". Agora est\u00e1 no " + ondeEsta(S.nivel, S.progresso) + ".";
  if (atr || hab){
    const saiu = antes.ordem.slice(depois.ordem.length).map(nomeDoNo);
    t += " Sa\u00edram " + pontos(atr) + " de atributo e " + pontos(hab) + " de habilidade, os \u00faltimos comprados" +
         (saiu.length ? ": " + saiu.join("; ") : "") + ". Eles voltam quando o n\u00edvel voltar.";
  }
  else t += " Nenhum ponto saiu: a perda n\u00e3o chegou a tirar o n\u00edvel.";
  S.evento = {texto: t, foto: foto};
  S.textoEditado = false;
  render();
}
function irAoMago(){
  const antes = estado(), foto = retrato(), n0 = S.nivel, p0 = S.progresso;
  const minutos = magoMinutos(S.esquecimentos);
  let t;
  if (S.ilha){
    t = "Na ilha, o mago apagou " + pontos(antes.gastoAtr) + " de atributo e " + pontos(antes.gastoHab) +
        " de habilidade de gra\u00e7a. N\u00e3o conta como esquecimento.";
  } else {
    const r = perderXp(S.nivel, S.progresso, R.mago);
    S.nivel = r.nivel; S.progresso = r.progresso;
    S.esquecimentos++;
    t = "O mago apagou " + pontos(antes.gastoAtr) + " de atributo e " + pontos(antes.gastoHab) +
        " de habilidade, e a especializa\u00e7\u00e3o junto. Custou 3% da experi\u00eancia, do " + ondeEsta(n0, p0) + " para o " +
        ondeEsta(S.nivel, S.progresso) + ", e o ouro de " + tempo(minutos) + " de ca\u00e7a. O pr\u00f3ximo esquecimento custa " +
        tempo(magoMinutos(S.esquecimentos)) + ".";
  }
  if (traiu()) t += " A trai\u00e7\u00e3o fica: o mago apaga pontos, n\u00e3o o que o personagem fez.";
  S.plano = {atributos: [], nos: []};
  S.esp = null;
  S.receita = null;
  S.evento = {texto: t, foto: foto};
  S.textoEditado = false;
  render();
}
function desfazer(){
  if (!S.evento) return;
  const o = JSON.parse(S.evento.foto);
  S.nivel = o.nivel; S.progresso = o.progresso; S.plano = o.plano; S.esp = o.esp; S.caidas = o.caidas || [];
  S.esquecimentos = o.esquecimentos; S.receita = o.receita;
  S.evento = null;
  S.textoEditado = false;
  render();
}

/* ---------- construcao: receitas e atributos ---------- */
function construirReceitas(){
  const caixa = $("receitas");
  for (const rec of RECEITAS){
    const classe = "chip" + (rec.especializacao ? " hibrida" : "") + (rec.caidas ? " caida" : "");
    const b = el("button", {type: "button", class: classe, "aria-pressed": "false",
                            title: rec.caidas ? "Depois da trai\u00e7\u00e3o" : rec.especializacao ? "Com especializa\u00e7\u00e3o" : "Sem especializa\u00e7\u00e3o"},
                 caixa, rec.nome);
    b.addEventListener("click", function(){ carregarReceita(rec); render(); });
    UI.receitas.push({rec: rec, b: b});
  }
}
function construirAtributos(){
  const lista = $("atributos");
  for (const a of R.atributos){
    const row = el("div", {class: "atr"}, lista);
    const nome = el("div", {class: "atr-nome"}, row);
    el("b", null, nome, a.nome);
    el("span", null, nome, a.faz);
    const valor = el("div", {class: "atr-valor num"}, row);
    const passo = el("div", {class: "passo"}, row);
    const menos = el("button", {type: "button", "aria-label": "Devolver um ponto de " + a.nome}, passo, "\u2212");
    const mais = el("button", {type: "button", "aria-label": "Comprar um ponto de " + a.nome}, passo, "+");
    const barra = el("div", {class: "barra", "aria-hidden": "true"}, row);
    const planejado = el("span", {class: "planejado"}, barra);
    const comprado = el("span", {class: "comprado"}, barra);
    const custo = el("div", {class: "atr-custo"}, row);
    menos.addEventListener("click", function(){ devolverAtributo(a.id); });
    mais.addEventListener("click", function(){ comprarAtributo(a.id); });
    UI.atr[a.id] = {valor: valor, menos: menos, mais: mais, planejado: planejado, comprado: comprado, custo: custo};
  }
}

/* ---------- construcao: o disco e as arvores ---------- */
function raio(anel){ return anel === 0 ? 0 : 40 + 16 * anel; }
function polar(r, ang){ const a = ang * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; }
function f1(n){ return n.toFixed(1); }
/* ligacao que acompanha a volta: numa arvore a porta e o coracao podem
   estar a 70 graus um do outro, e a reta cortaria o disco */
function curva(r1, a1, r2, a2){
  const passos = Math.max(1, Math.ceil(Math.abs(a2 - a1) / 4));
  let d = "";
  for (let k = 0; k <= passos; k++){
    const t = k / passos, p = polar(r1 + (r2 - r1) * t, a1 + (a2 - a1) * t);
    d += (k ? " L" : "M") + f1(p[0]) + " " + f1(p[1]);
  }
  return d;
}
function setor(r0, r1, a0, a1){
  const p0 = polar(r1, a0), p1 = polar(r1, a1), p2 = polar(r0, a1), p3 = polar(r0, a0);
  const grande = a1 - a0 > 180 ? 1 : 0;
  return "M" + f1(p0[0]) + " " + f1(p0[1]) + " A" + r1 + " " + r1 + " 0 " + grande + " 1 " + f1(p1[0]) + " " + f1(p1[1]) +
         " L" + f1(p2[0]) + " " + f1(p2[1]) + " A" + r0 + " " + r0 + " 0 " + grande + " 0 " + f1(p3[0]) + " " + f1(p3[1]) + " Z";
}
const TAMANHO_NO = {centro: 12, entrada: 10, notavel: 9, porta: 8, pequeno: 5.5};
function desenharNo(n, pai){
  const p = polar(raio(n.anel), n.angulo);
  const g = el("svg:g", {class: "no " + n.tipo, "data-id": n.id, transform: "translate(" + f1(p[0]) + " " + f1(p[1]) + ")"}, pai);
  el("svg:circle", {r: TAMANHO_NO[n.tipo] + 6, class: "no-hit"}, g);
  el("svg:circle", {r: TAMANHO_NO[n.tipo], class: "no-c"}, g);
  UI.nos[n.id] = {g: g, st: null};
}
function desenharLig(n, m, pai, classe){
  const linha = el("svg:path", {d: curva(raio(n.anel), n.angulo, raio(m.anel), m.angulo), class: classe}, pai);
  UI.ligs.push({a: n.id, b: m.id, el: linha, ativa: false});
}

function construirDisco(){
  const svg = $("disco"), mu = M(), disco = mu.disco;
  svg.textContent = "";
  UI.nos = {}; UI.ligs = []; UI.lobos = {}; UI.arvores = {}; UI.fatiaNum = [];
  esconderDica();

  const fundo = el("svg:g", null, svg);
  mu.fatias.forEach(function(f, i){
    const ang = 90 + i * 60, p0 = polar(392, ang - 30), p1 = polar(392, ang + 30);
    el("svg:path", {class: "fatia-fundo " + (f.substitui ? "caida" : f.tipo === "marcial" ? "marcial" : "magica"),
      d: "M" + C + " " + C + " L" + f1(p0[0]) + " " + f1(p0[1]) + " A392 392 0 0 1 " + f1(p1[0]) + " " + f1(p1[1]) + " Z"}, fundo);
  });
  mu.fatias.forEach(function(f, i){
    const ang = 90 + i * 60 + 30, a = polar(48, ang), b = polar(392, ang);
    el("svg:line", {x1: f1(a[0]), y1: f1(a[1]), x2: f1(b[0]), y2: f1(b[1]), class: "borda-fatia"}, fundo);
  });
  el("svg:circle", {cx: C, cy: C, r: 392, class: "aro"}, fundo);

  mu.fatias.forEach(function(f, i){
    const p = polar(588, 90 + i * 60);
    el("svg:text", {x: f1(p[0]), y: f1(p[1] - 2), class: "rot-fatia" + (f.substitui ? " caida" : "")}, svg, f.nome.toUpperCase());
    UI.fatiaNum.push(el("svg:text", {x: f1(p[0]), y: f1(p[1] + 18), class: "rot-fatia-num"}, svg));
  });

  /* Cada arvore propria e um grupo inteiro -- fundo, ligacoes, nos e o nome
     -- para aparecer e sumir de uma vez. As de fatias vizinhas fecham um
     anel; as outras so aparecem quando escolhidas, porque ocupariam o mesmo
     lugar. */
  const camada = el("svg:g", null, svg);
  for (const esp of mu.especializacoes){
    const nos = disco.arvores[esp.id];
    let a0 = Infinity, a1 = -Infinity;
    for (const n of nos){ a0 = Math.min(a0, n.angulo); a1 = Math.max(a1, n.angulo); }
    const g = el("svg:g", {class: "arvore"}, camada);
    el("svg:path", {class: "arvore-fundo", d: setor(398, 528, a0 - 5, a1 + 5)}, g);
    const ligs = el("svg:g", null, g);
    for (const n of nos){
      for (const v of disco.viz[n.id]){
        const m = disco.porId[v];
        if (m.esp && n.id > v) continue;
        desenharLig(n, m, ligs, "lig arvore" + (m.esp ? "" : " porta"));
      }
    }
    for (const n of nos) desenharNo(n, g);
    const p = polar(raio(31), nos[1].angulo), largura = Math.max(96, esp.nome.length * 7.4 + 26);
    const lobo = el("svg:g", {class: "lobo", "data-esp": esp.id, transform: "translate(" + f1(p[0]) + " " + f1(p[1]) + ")"}, g);
    el("svg:rect", {x: f1(-largura / 2), y: -14, width: f1(largura), height: 28, rx: 14}, lobo);
    el("svg:text", {y: 5}, lobo, esp.nome);
    UI.lobos[esp.id] = {g: lobo, st: null};
    UI.arvores[esp.id] = {g: g, st: null, vizinha: esp.tipo === "par" && esp.distancia === 1};
  }

  const ligs = el("svg:g", null, svg);
  for (const n of disco.nos){
    for (const v of disco.viz[n.id]){
      const m = disco.porId[v];
      if (m.esp || n.id > v) continue;
      const ponte = n.fatia >= 0 && m.fatia >= 0 && n.fatia !== m.fatia;
      desenharLig(n, m, ligs, "lig" + (ponte ? " ponte" : ""));
    }
  }
  const grupoNos = el("svg:g", null, svg);
  for (const n of disco.nos) desenharNo(n, grupoNos);
  aplicarVista();
}

function aplicarVista(){
  $("disco").setAttribute("viewBox", f1(VISTA.x) + " " + f1(VISTA.y) + " " + f1(VISTA.w) + " " + f1(VISTA.w));
}
function prender(){
  const m = TAM - VISTA.w;
  VISTA.x = Math.max(0, Math.min(m, VISTA.x));
  VISTA.y = Math.max(0, Math.min(m, VISTA.y));
}
function zoom(fator, px, py){
  const nw = Math.max(300, Math.min(TAM, VISTA.w * fator));
  VISTA.x = px - (px - VISTA.x) * nw / VISTA.w;
  VISTA.y = py - (py - VISTA.y) * nw / VISTA.w;
  VISTA.w = nw;
  prender();
  aplicarVista();
}
function pontoSvg(ev){
  const r = $("disco").getBoundingClientRect();
  return {x: VISTA.x + (ev.clientX - r.left) / r.width * VISTA.w, y: VISTA.y + (ev.clientY - r.top) / r.height * VISTA.w};
}
function alvoDe(ev){
  return ev.target && ev.target.closest ? ev.target.closest("[data-id],[data-esp]") : null;
}
function acionarAlvo(alvo){
  if (alvo.hasAttribute("data-id")) acionarNo(alvo.getAttribute("data-id"));
  else alternarEsp(alvo.getAttribute("data-esp"));
}

/* ---------- a dica do disco ---------- */
function preencherDica(alvo){
  const e = estado();
  if (alvo.hasAttribute("data-esp")){
    const esp = espDe(alvo.getAttribute("data-esp"));
    $("dicaNome").textContent = esp.nome;
    $("dicaOnde").textContent = esp.fatias.map(function(f){ return M().fatias[f].nome + " " + e.porFatia[f] + "/" + esp.exige; }).join(" \u00b7 ");
    $("dicaEfeito").textContent = "Cora\u00e7\u00e3o da \u00e1rvore: " + textoDoEfeito(esp.ef);
    $("dicaEstado").textContent = S.esp === esp.id ? "Escolhida. Clique para tirar."
      : especializacaoAberta(esp, e.porFatia) ? "Aberta. Clique para escolher." : "Fechada: faltam pontos nas fatias.";
    return;
  }
  const id = alvo.getAttribute("data-id"), n = noDe(id);
  $("dicaNome").textContent = n.nome;
  if (n.esp) $("dicaOnde").textContent = "\u00c1rvore de " + espDe(n.esp).nome + (n.tipo === "porta" ? ", porta pelo " + textoDaPonta(n.ponta) : "");
  else $("dicaOnde").textContent = n.tipo === "centro" ? "Onde todo personagem come\u00e7a"
    : M().fatias[n.fatia].nome + (n.tipo === "entrada" ? ", entrada da fatia" : ", ramo " + minuscula(n.ramoNome));
  $("dicaEfeito").textContent = textoDoEfeito(n.ef);
  let st;
  if (id === "centro") st = "Vem de gra\u00e7a.";
  else if (e.donos[id]) st = podeDevolver(S.plano, id, opcoes()) ? "Comprado. Clique para devolver." : "Comprado. Sustenta outros n\u00f3s.";
  else if (S.plano.nos.indexOf(id) >= 0) st = "No plano, esperando n\u00edvel. Clique para tirar.";
  else if (n.esp && S.esp !== n.esp) st = "Escolha a especializa\u00e7\u00e3o para andar nesta \u00e1rvore.";
  else if (n.esp && !e.espAberta) st = "A especializa\u00e7\u00e3o ainda est\u00e1 fechada.";
  else if (M().disco.viz[id].some(function(v){ return e.donos[v]; }))
    st = e.sobraHab >= 1 ? "Encostado. Clique para comprar." : "Encostado, mas sem pontos livres neste n\u00edvel.";
  else st = n.tipo === "porta" ? "Falta a ponta do " + textoDaPonta(n.ponta) + "." : "Longe: falta caminho at\u00e9 aqui.";
  $("dicaEstado").textContent = st;
}
function mostrarDica(alvo, ev){
  UI.dicaAlvo = alvo;
  preencherDica(alvo);
  const dica = $("dicaDisco"), caixa = $("discoCaixa").getBoundingClientRect();
  dica.hidden = false;
  let x, y;
  if (ev){ x = ev.clientX - caixa.left + 16; y = ev.clientY - caixa.top + 16; }
  else { const r = alvo.getBoundingClientRect(); x = r.right - caixa.left + 8; y = r.bottom - caixa.top + 8; }
  dica.style.left = Math.max(0, Math.min(x, caixa.width - dica.offsetWidth - 4)) + "px";
  dica.style.top = Math.max(0, Math.min(y, caixa.height - dica.offsetHeight - 4)) + "px";
}
function esconderDica(){ UI.dicaAlvo = null; $("dicaDisco").hidden = true; }

function ligarDisco(){
  const svg = $("disco");
  let arr = null;
  svg.addEventListener("pointerdown", function(ev){
    if (ev.button !== 0) return;
    arr = {sx: ev.clientX, sy: ev.clientY, vx: VISTA.x, vy: VISTA.y, moveu: false, id: ev.pointerId};
  });
  svg.addEventListener("pointermove", function(ev){
    if (arr && ev.pointerId === arr.id){
      const dx = ev.clientX - arr.sx, dy = ev.clientY - arr.sy;
      if (!arr.moveu && Math.abs(dx) + Math.abs(dy) > 5 && VISTA.w < TAM){
        arr.moveu = true;
        svg.setPointerCapture(ev.pointerId);
        svg.classList.add("arrastando");
        esconderDica();
      }
      if (arr.moveu){
        const r = svg.getBoundingClientRect();
        VISTA.x = arr.vx - dx / r.width * VISTA.w;
        VISTA.y = arr.vy - dy / r.height * VISTA.w;
        prender();
        aplicarVista();
        return;
      }
    }
    const alvo = alvoDe(ev);
    if (alvo) mostrarDica(alvo, ev);
  });
  const soltar = function(ev){
    if (!arr) return;
    const clique = !arr.moveu;
    if (arr.moveu){ try { svg.releasePointerCapture(arr.id); } catch (err){} svg.classList.remove("arrastando"); }
    arr = null;
    if (clique && ev.type === "pointerup"){
      const alvo = alvoDe(ev);
      if (alvo) acionarAlvo(alvo);
    }
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  svg.addEventListener("pointerleave", function(){ if (!arr) esconderDica(); });
  svg.addEventListener("wheel", function(ev){
    ev.preventDefault();
    const p = pontoSvg(ev);
    zoom(ev.deltaY < 0 ? 0.8 : 1.25, p.x, p.y);
  }, {passive: false});
  svg.addEventListener("keydown", function(ev){
    const alvo = alvoDe(ev);
    if (alvo && (ev.key === "Enter" || ev.key === " ")){ ev.preventDefault(); acionarAlvo(alvo); }
  });
  svg.addEventListener("focusin", function(ev){ const alvo = alvoDe(ev); if (alvo) mostrarDica(alvo, null); });
  svg.addEventListener("focusout", esconderDica);
  $("zoomMais").addEventListener("click", function(){ zoom(0.7, VISTA.x + VISTA.w / 2, VISTA.y + VISTA.w / 2); });
  $("zoomMenos").addEventListener("click", function(){ zoom(1.4, VISTA.x + VISTA.w / 2, VISTA.y + VISTA.w / 2); });
  $("zoomTudo").addEventListener("click", function(){ VISTA.x = 0; VISTA.y = 0; VISTA.w = TAM; aplicarVista(); });
}

/* ---------- construcao: especializacoes e resultado ---------- */
function construirEspecializacoes(){
  const caixa = $("espGrupos"), mu = M();
  caixa.textContent = "";
  UI.esp = {};
  const grupos = [
    {titulo: "Fatias vizinhas", nota: R.exigenciaPorDistancia[1] + " pontos em cada", filtro: function(e){ return e.tipo === "par" && e.distancia === 1; }},
    {titulo: "A duas fatias", nota: R.exigenciaPorDistancia[2] + " em cada", filtro: function(e){ return e.tipo === "par" && e.distancia === 2; }},
    {titulo: "Fatias opostas", nota: R.exigenciaPorDistancia[3] + " em cada", filtro: function(e){ return e.tipo === "par" && e.distancia === 3; }},
    {titulo: "Tr\u00eas fatias, ainda sem nome", nota: R.exigenciaTrio + " em cada", filtro: function(e){ return e.tipo === "trio"; }, fechado: true}
  ];
  for (const gr of grupos){
    let lista;
    if (gr.fechado){
      const det = el("details", {class: "esp-grupo"}, caixa);
      const sum = el("summary", null, det);
      const h = el("h3", null, sum, gr.titulo);
      UI.trioConta = el("small", null, h);
      lista = el("div", {class: "esp-lista"}, det);
    } else {
      const sec = el("div", {class: "esp-grupo"}, caixa);
      const h = el("h3", null, sec, gr.titulo);
      el("small", null, h, gr.nota);
      lista = el("div", {class: "esp-lista"}, sec);
    }
    for (const esp of mu.especializacoes.filter(gr.filtro)){
      const row = el("div", {class: "esp fechada" + (esp.espelha ? " caida" : "")}, lista);
      el("span", {class: "esp-nome"}, row, esp.nome);
      const acoes = el("div", {class: "esp-acoes"}, row);
      const selo = el("span", {class: "selo"}, acoes, "fechada");
      const botao = el("button", {type: "button", class: "botao mini"}, acoes, "Escolher");
      botao.addEventListener("click", function(){ alternarEsp(esp.id); });
      const req = el("div", {class: "esp-req"}, row);
      const reqs = esp.fatias.map(function(f){
        const r = el("span", {class: "req"}, req);
        el("span", null, r, mu.fatias[f].nome);
        const barra = el("span", {class: "req-barra"}, r);
        const cheio = el("span", null, barra);
        const num = el("span", {class: "num"}, r);
        return {f: f, r: r, cheio: cheio, num: num};
      });
      UI.esp[esp.id] = {row: row, selo: selo, botao: botao, reqs: reqs};
    }
  }
}

const LINHAS = [
  {k: "vida", nome: "Vida", f: function(v){ return fmt(v); }},
  {k: "mana", nome: "Mana", f: function(v){ return fmt(v); }},
  {k: "folego", nome: "F\u00f4lego", f: function(v){ return fmt(v); }},
  {k: "carga", nome: "Carga", f: function(v){ return fmt(v) + " kg"; }},
  {k: "velocidade", nome: "Velocidade", nota: "100 \u00e9 a de hoje no jogo", casas: 1, f: function(v){ return fmt(v, 1); }},
  {k: "bloqueio", nome: "Bloqueio com escudo", f: function(v){ return fmt(v) + "%"; }},
  {k: "critChance", nome: "Chance de cr\u00edtico", casas: 1, f: function(v){ return fmt(v, 1) + "%"; }},
  {k: "critDano", nome: "Dano do cr\u00edtico", f: function(v){ return fmt(v) + "%"; }},
  {k: "critGanho", nome: "Ganho m\u00e9dio do cr\u00edtico", casas: 1, f: function(v){ return "+" + fmt(v, 1) + "%"; }},
  {grupo: "Provis\u00f3rio: ainda n\u00e3o existe f\u00f3rmula de combate"},
  {k: "danoCorpo", nome: "Dano corpo a corpo", f: function(v){ return "+" + fmt(v) + "%"; }},
  {k: "danoDistancia", nome: "Dano \u00e0 dist\u00e2ncia", f: function(v){ return "+" + fmt(v) + "%"; }},
  {k: "poderMagia", nome: "Poder das magias", f: function(v){ return "+" + fmt(v) + "%"; }},
  {k: "cura", nome: "Cura", f: function(v){ return "+" + fmt(v) + "%"; }},
  {k: "puxarArco", nome: "Puxar o arco", casas: 2, f: function(v){ return fmt(v, 2) + " s"; }}
];
function construirResultado(){
  const corpo = $("tabelaCorpo");
  for (const l of LINHAS){
    if (l.grupo){
      const tr = el("tr", {class: "grupo"}, corpo);
      el("th", {colspan: "4", scope: "colgroup"}, tr, l.grupo);
      continue;
    }
    const tr = el("tr", null, corpo);
    const th = el("th", {scope: "row"}, tr, l.nome);
    if (l.nota) el("small", null, th, l.nota);
    UI.linhas.push({l: l, atual: el("td", {class: "num"}, tr),
                    guardada: el("td", {class: "num guardada col-guardada"}, tr),
                    dif: el("td", {class: "num dif col-guardada"}, tr)});
  }
  for (const q of R.equipamentos){
    const b = el("button", {type: "button", "aria-pressed": "false"}, $("armaduras"), q.nome);
    b.addEventListener("click", function(){ S.equipamento = q.id; S.textoEditado = false; render(); });
    UI.armaduras.push({q: q, b: b});
  }
}

/* ---------- o grafico das perdas ---------- */
const CURVA = (function(){
  const morte = [], mago = [];
  for (let n = 1; n <= 99; n++){
    const rm = perderXp(n, 0.5, R.morte), rg = perderXp(n, 0.5, R.mago);
    morte.push(n + 0.5 - (rm.nivel + rm.progresso));
    mago.push(n + 0.5 - (rg.nivel + rg.progresso));
  }
  return {morte: morte, mago: mago};
})();
function construirGrafico(){
  const svg = $("grafico"), W = 560, H = 236, m = {l: 44, r: 92, t: 22, b: 40};
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  const X = function(n){ return m.l + (n - 1) / 99 * (W - m.l - m.r); };
  const Y = function(v){ return m.t + (1 - v / 2) * (H - m.t - m.b); };
  for (const v of [0, 0.5, 1, 1.5, 2]){
    el("svg:line", {x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: v === 0 ? "eixo" : "grade"}, svg);
    el("svg:text", {x: m.l - 8, y: Y(v) + 5, class: "rot-y"}, svg, fmt(v, v % 1 ? 1 : 0));
  }
  for (const n of [1, 25, 50, 75, 100]) el("svg:text", {x: X(n), y: H - m.b + 20, class: "rot-x"}, svg, String(n));
  el("svg:text", {x: (m.l + W - m.r) / 2, y: H - 4, class: "titulo-eixo"}, svg, "n\u00edvel do personagem");
  const meioY = m.t + (H - m.t - m.b) / 2;
  el("svg:text", {x: 11, y: meioY, class: "titulo-eixo", transform: "rotate(-90 11 " + meioY + ")"}, svg, "n\u00edveis perdidos");
  const caminho = function(vals){
    return vals.map(function(v, k){ return (k ? "L" : "M") + f1(X(k + 1)) + " " + f1(Y(v)); }).join(" ");
  };
  el("svg:path", {d: caminho(CURVA.mago), class: "serie mago"}, svg);
  el("svg:path", {d: caminho(CURVA.morte), class: "serie morte"}, svg);
  el("svg:text", {x: X(99) + 8, y: Y(CURVA.morte[98]) + 4, class: "rot-serie"}, svg, "Morte, 5%");
  el("svg:text", {x: X(99) + 8, y: Y(CURVA.mago[98]) + 4, class: "rot-serie"}, svg, "Mago, 3%");
  const voce = el("svg:line", {y1: m.t - 2, y2: H - m.b, class: "voce-linha"}, svg);
  const voceRot = el("svg:text", {y: m.t - 8, class: "voce-rot"}, svg, "VOC\u00ca");
  const cruz = el("svg:line", {y1: m.t, y2: H - m.b, class: "cruz", visibility: "hidden"}, svg);
  const pM = el("svg:circle", {r: 4.5, class: "voce-ponto morte"}, svg);
  const pG = el("svg:circle", {r: 4.5, class: "voce-ponto mago"}, svg);
  const alvo = el("svg:rect", {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: "alvo"}, svg);
  const caixa = $("graficoCaixa"), dica = $("dicaGrafico");
  alvo.addEventListener("pointermove", function(ev){
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width * W;
    const n = Math.max(1, Math.min(99, Math.round(1 + (px - m.l) / (W - m.l - m.r) * 99)));
    cruz.setAttribute("x1", X(n)); cruz.setAttribute("x2", X(n)); cruz.setAttribute("visibility", "visible");
    $("dgNivel").textContent = "N\u00edvel " + n;
    $("dgMorte").textContent = "morte tira " + fmt(CURVA.morte[n - 1], 2);
    $("dgMago").textContent = "mago tira " + fmt(CURVA.mago[n - 1], 2);
    dica.hidden = false;
    const cx = caixa.getBoundingClientRect();
    dica.style.left = Math.min(ev.clientX - cx.left + 14, cx.width - dica.offsetWidth - 4) + "px";
    dica.style.top = Math.max(0, ev.clientY - cx.top - dica.offsetHeight - 10) + "px";
  });
  alvo.addEventListener("pointerleave", function(){ dica.hidden = true; cruz.setAttribute("visibility", "hidden"); });
  const corpo = $("curvaCorpo");
  for (const n of [10, 20, 30, 40, 50, 60, 70, 80, 90, 99]){
    const tr = el("tr", null, corpo);
    el("th", {scope: "row"}, tr, String(n));
    el("td", null, tr, fmt(CURVA.morte[n - 1], 2));
    el("td", null, tr, fmt(CURVA.mago[n - 1], 2));
  }
  UI.graf = {X: X, Y: Y, voce: voce, voceRot: voceRot, pM: pM, pG: pG};
}

/* ---------- desenho ---------- */
function renderTopo(){
  const noTeto = S.nivel >= R.nivelMax;
  $("nivel").value = S.nivel;
  $("nivelNum").value = S.nivel;
  $("progresso").value = Math.round(S.progresso * 100);
  $("progresso").disabled = noTeto;
  $("progressoTxt").textContent = noTeto ? "teto" : Math.round(S.progresso * 100) + "%";
  for (const r of UI.receitas) r.b.setAttribute("aria-pressed", String(S.receita === r.rec.nome));
  $("receitaAtual").textContent = S.receita ? "Receita carregada: " + S.receita : "Build pr\u00f3pria";
}
function esperam(n){ return n + (n === 1 ? " compra do plano espera" : " compras do plano esperam") + " mais n\u00edvel."; }
function renderAtributos(e, cheio){
  $("atrLivres").textContent = e.sobraAtr;
  $("atrVerba").textContent = e.verbaAtr;
  $("atrEspera").hidden = !e.esperaAtr;
  $("atrEspera").textContent = esperam(e.esperaAtr);
  for (const a of R.atributos){
    const u = UI.atr[a.id], v = e.atributos[a.id], alvo = cheio.atributos[a.id], c = custoAtributo(v);
    u.valor.textContent = v;
    u.comprado.style.width = (v / R.atributoMax * 100) + "%";
    u.planejado.style.width = (alvo / R.atributoMax * 100) + "%";
    u.custo.textContent = v >= R.atributoMax ? "No teto." : "O pr\u00f3ximo ponto custa " + pontos(c) + ".";
    u.mais.disabled = v >= R.atributoMax || c > e.sobraAtr;
    u.menos.disabled = v <= R.atributoInicial;
  }
}
function renderDisco(e, cheio){
  const mu = M(), disco = mu.disco;
  $("habLivres").textContent = e.sobraHab;
  $("habVerba").textContent = e.verbaHab;
  $("habEspera").hidden = !e.esperaNos;
  $("habEspera").textContent = esperam(e.esperaNos);

  /* com uma especializacao de fatias distantes escolhida, o anel das
     vizinhas sai para a arvore dela aparecer no lugar */
  const escolhida = espDe(S.esp);
  const anelDasVizinhas = !escolhida || (escolhida.tipo === "par" && escolhida.distancia === 1);
  for (const id in UI.arvores){
    const u = UI.arvores[id], esp = mu.espPorId[id];
    const visivel = id === S.esp || (anelDasVizinhas && u.vizinha);
    const st = !visivel ? "oculta" : id === S.esp ? "escolhida" : especializacaoAberta(esp, e.porFatia) ? "aberta" : "";
    if (u.st !== st){ u.st = st; u.g.setAttribute("class", "arvore" + (st ? " " + st : "")); }
  }
  for (const id in UI.nos){
    const u = UI.nos[id], n = disco.porId[id];
    let st = "";
    if (e.donos[id]) st = "dono";
    else if (cheio.donos[id]) st = "espera";
    else if (disco.viz[id].some(function(v){ return e.donos[v]; }) && (!n.esp || (n.esp === S.esp && e.espAberta))) st = "livre";
    if (u.st === st) continue;
    u.st = st;
    u.g.setAttribute("class", "no " + n.tipo + (st ? " " + st : ""));
    if (st && id !== "centro"){
      u.g.setAttribute("tabindex", "0");
      u.g.setAttribute("aria-label", n.nome + (st === "dono" ? ", comprado" : st === "espera" ? ", esperando n\u00edvel" : ", encostado"));
    } else u.g.removeAttribute("tabindex");
  }
  for (const l of UI.ligs){
    const ativa = !!(e.donos[l.a] && e.donos[l.b]);
    if (l.ativa !== ativa){ l.ativa = ativa; l.el.classList.toggle("ativa", ativa); }
  }
  mu.fatias.forEach(function(f, i){ UI.fatiaNum[i].textContent = e.porFatia[i] + " de 61"; });
  for (const id in UI.lobos){
    const u = UI.lobos[id], esp = mu.espPorId[id];
    const st = S.esp === id ? "escolhida" : especializacaoAberta(esp, e.porFatia) ? "aberta" : "";
    if (u.st !== st){
      u.st = st;
      u.g.setAttribute("class", "lobo" + (st ? " " + st : ""));
      if (st) u.g.setAttribute("tabindex", "0"); else u.g.removeAttribute("tabindex");
    }
  }
}
function renderEspecializacoes(e){
  const mu = M();
  let trios = 0;
  for (const esp of mu.especializacoes){
    const u = UI.esp[esp.id], aberta = especializacaoAberta(esp, e.porFatia), escolhida = S.esp === esp.id;
    if (esp.tipo === "trio" && aberta) trios++;
    u.row.className = "esp " + (escolhida ? "escolhida" : aberta ? "aberta" : "fechada") + (esp.espelha ? " caida" : "");
    u.selo.textContent = escolhida ? "escolhida" : aberta ? "aberta" : "fechada";
    u.botao.textContent = escolhida ? "Tirar" : "Escolher";
    u.botao.disabled = !aberta && !escolhida;
    for (const r of u.reqs){
      const v = e.porFatia[r.f];
      r.cheio.style.width = Math.min(100, v / esp.exige * 100) + "%";
      r.num.textContent = Math.min(v, 99) + "/" + esp.exige;
      r.r.classList.toggle("ok", v >= esp.exige);
    }
  }
  UI.trioConta.textContent = trios + " de 20 abertas, " + R.exigenciaTrio + " em cada";

  $("caido").checked = traiu();
  $("traicaoTexto").textContent = traiu()
    ? "O necromante tomou o lugar do cl\u00e9rigo no disco. Guerreiro e necromante d\u00e3o o cavaleiro da morte, o paladino ca\u00eddo."
    : "Numa trai\u00e7\u00e3o a fatia inteira troca, e as combina\u00e7\u00f5es com ela. Os n\u00f3s comprados ficam no mesmo lugar.";

  const esp = espDe(S.esp);
  $("espAtual").textContent = esp ? esp.nome : "nenhuma";
  $("espLinha").hidden = !esp;
  if (!esp){
    $("espTexto").textContent = "Nenhuma especializa\u00e7\u00e3o escolhida. Junte pontos em duas fatias at\u00e9 abrir uma, e escolha abaixo ou pelo nome, por fora do disco.";
    return;
  }
  const arvore = mu.disco.arvores[esp.id];
  const portas = arvore.filter(function(n){ return n.tipo === "porta"; }).map(function(n){ return textoDaPonta(n.ponta); });
  $("espTexto").textContent = (e.espAberta ? "" : "Fechada neste n\u00edvel: a \u00e1rvore espera os pontos nas fatias. ") +
    "A \u00e1rvore de " + esp.nome + " fica por fora do disco. Entra-se nela pela ponta do " +
    (portas.length === 3 ? portas.slice(0, 2).join(", do ") + " ou do " + portas[2] : portas.join(" ou do ")) + ".";
  $("espConta").textContent = e.espComprados + " de " + arvore.length;
}
function renderResultado(e){
  const d = derivar(e, S.equipamento, S.escudo), g = S.guardada;
  $("tabela").classList.toggle("sem-comparacao", !g);
  $("colGuardada").textContent = g ? g.rotulo : "";
  $("btnSoltar").hidden = !g;
  for (const u of UI.linhas){
    u.atual.textContent = u.l.f(d[u.l.k]);
    if (g && g.d[u.l.k] !== undefined){
      u.guardada.textContent = u.l.f(g.d[u.l.k]);
      u.dif.textContent = comSinal(d[u.l.k] - g.d[u.l.k], u.l.casas);
    } else { u.guardada.textContent = ""; u.dif.textContent = ""; }
  }
  for (const a of UI.armaduras) a.b.setAttribute("aria-pressed", String(a.q.id === S.equipamento));
  $("escudo").checked = S.escudo;
  $("penalidade").textContent = d.penalidade > 0
    ? "A armadura tira " + fmt(d.penalidade * 100, 1) + "% da velocidade, j\u00e1 com o al\u00edvio da for\u00e7a e dos n\u00f3s de armadura."
    : "Sem armadura pesando: nada sai da velocidade.";
  const caixa = $("pericias");
  caixa.textContent = "";
  for (const id of e.ordem){
    const n = noDe(id);
    if (n && (n.tipo === "notavel" || n.tipo === "entrada")) el("span", {class: "pericia" + (n.esp ? " unica" : "")}, caixa, n.nome);
  }
  if (!caixa.firstChild) el("span", {class: "nota"}, caixa, "Nenhuma per\u00edcia ainda.");
}
function renderMorte(){
  const noTeto = S.nivel >= R.nivelMax;
  $("xpNivel").textContent = "N\u00edvel " + S.nivel + (noTeto ? ", no teto" : ", " + Math.round(S.progresso * 100) + "%");
  $("xpTotal").textContent = fmt(xpTotal(S.nivel, noTeto ? 0 : S.progresso)) + " de experi\u00eancia";
  $("naIlha").checked = S.ilha;
  $("magoPreco").textContent = S.ilha
    ? "Na ilha o mago n\u00e3o cobra nada e o esquecimento n\u00e3o conta para dobrar o pre\u00e7o."
    : "Esquecimentos at\u00e9 agora: " + S.esquecimentos + ". O pr\u00f3ximo custa o ouro de " +
      tempo(magoMinutos(S.esquecimentos)) + " de ca\u00e7a, e o pre\u00e7o dobra a cada uso.";
  $("evento").hidden = !S.evento;
  if (S.evento) $("eventoTexto").textContent = S.evento.texto;
  const gr = UI.graf, n = Math.min(S.nivel, 99), x = gr.X(n);
  gr.voce.setAttribute("x1", x); gr.voce.setAttribute("x2", x);
  gr.voceRot.setAttribute("x", x);
  gr.pM.setAttribute("cx", x); gr.pM.setAttribute("cy", gr.Y(CURVA.morte[n - 1]));
  gr.pG.setAttribute("cx", x); gr.pG.setAttribute("cy", gr.Y(CURVA.mago[n - 1]));
}
function render(){
  /* o mundo mudou -- traicao, receita, build colada ou desfazer: o disco e
     as especializacoes sao outros */
  const chave = S.caidas.join(" ");
  if (UI.mundo !== chave){
    UI.mundo = chave;
    construirDisco();
    construirEspecializacoes();
  }
  const e = estado(), cheio = planoInteiro();
  renderTopo();
  renderAtributos(e, cheio);
  renderDisco(e, cheio);
  renderEspecializacoes(e);
  renderResultado(e);
  renderMorte();
  if (UI.dicaAlvo && !$("dicaDisco").hidden) preencherDica(UI.dicaAlvo);
  const texto = escreverBuild(buildAtual());
  if (!S.textoEditado) $("texto").value = texto;
  try {
    localStorage.setItem(CHAVE, JSON.stringify({texto: texto, ilha: S.ilha, guardada: S.guardada, receita: S.receita}));
  } catch (err){}
}

/* ---------- controles ---------- */
function ligar(){
  $("nivel").addEventListener("input", function(){ S.nivel = Number(this.value); S.textoEditado = false; render(); });
  $("nivelNum").addEventListener("change", function(){
    S.nivel = Math.max(1, Math.min(R.nivelMax, Math.round(Number(this.value)) || 1));
    S.textoEditado = false; render();
  });
  $("progresso").addEventListener("input", function(){ S.progresso = Number(this.value) / 100; S.textoEditado = false; render(); });
  $("btnLimpar").addEventListener("click", function(){
    S.plano = {atributos: [], nos: []}; S.esp = null; S.evento = null; avisoDisco(""); avisoEsp(""); mexeu();
  });
  $("espSoltar").addEventListener("click", soltarEsp);
  $("caido").addEventListener("change", alternarTraicao);
  $("escudo").addEventListener("change", function(){ S.escudo = this.checked; S.textoEditado = false; render(); });
  $("btnGuardar").addEventListener("click", function(){
    S.guardada = {rotulo: (S.receita || "Build guardada") + ", n\u00edvel " + S.nivel, d: derivar(estado(), S.equipamento, S.escudo)};
    render();
  });
  $("btnSoltar").addEventListener("click", function(){ S.guardada = null; render(); });
  $("btnMorrer").addEventListener("click", morrer);
  $("btnMago").addEventListener("click", irAoMago);
  $("btnDesfazer").addEventListener("click", desfazer);
  $("naIlha").addEventListener("change", function(){ S.ilha = this.checked; render(); });
  $("texto").addEventListener("input", function(){ S.textoEditado = true; $("textoAviso").textContent = ""; });
  $("btnCopiar").addEventListener("click", function(){
    const t = $("texto").value;
    const ok = function(){ $("textoAviso").textContent = "Copiado."; };
    const falha = function(){ $("texto").select(); $("textoAviso").textContent = "O navegador n\u00e3o deixou copiar. O texto est\u00e1 selecionado: use Ctrl+C."; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, falha);
    else falha();
  });
  $("btnCarregar").addEventListener("click", function(){
    const r = lerBuild($("texto").value);
    if (!r.build){ $("textoAviso").textContent = "N\u00e3o carreguei: " + r.erro + "."; return; }
    aplicarBuild(r.build);
    S.receita = null; S.evento = null; S.textoEditado = false;
    render();
    $("textoAviso").textContent = "Build carregada.";
  });
}

/* ---------- comeco ----------
   Abre com uma build de verdade: o paladino no nivel 40, com a
   especializacao aberta e os primeiros nos da arvore dele, comparado com o
   guerreiro do mesmo nivel. */
function carregarGuardado(){
  try {
    const o = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (!o || !o.texto) return false;
    const r = lerBuild(o.texto);
    if (!r.build) return false;
    aplicarBuild(r.build);
    S.ilha = !!o.ilha;
    S.guardada = o.guardada || null;
    S.receita = o.receita || null;
    return true;
  } catch (err){ return false; }
}

construirReceitas();
construirAtributos();
ligarDisco();
construirResultado();
construirGrafico();
ligar();
if (!carregarGuardado()){
  const porId = function(id){ for (const r of RECEITAS) if (r.id === id) return r; return null; };
  S.nivel = 40; S.progresso = 0.4;
  S.guardada = guardadaDaReceita(porId("guerreiro"), 40);
  carregarReceita(porId("paladino"));
}
render();
})();
