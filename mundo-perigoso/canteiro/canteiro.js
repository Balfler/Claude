/* ============================================================
   CANTEIRO -- A FERRAMENTA
   ------------------------------------------------------------
   O estado, o painel, os arquivos e o laco. O micro (micro.js) constroi
   dentro do mapa com o motor do jogo; o macro, a vista de cima, entra na
   proxima fatia -- os dois vao editar o MESMO mapa e compartilhar este
   historico, que e o do editor (editor/operacoes.js), ja testado.

   Abre direto do disco no Chrome ou no Edge. Servido por http,
   ?abrir=caminho/do/mapa.mapa ja abre um mapa.
   ============================================================ */
"use strict";
(function(){
const $ = function(id){ return document.getElementById(id); };
const C = {mapa: null, hist: novoHistorico(), sujo: false, rascunhoEm: 0};


/* ---------- avisos na tela ---------- */
let faixaT = 0;
/* A faixa avisa e, quando precisa de resposta, traz os botoes -- nada de
   confirm(), que trava a pagina inteira enquanto o laco deveria rodar. */
function faixa(texto, botoes){
  const f = $("faixa");
  f.innerHTML = "";
  const s = document.createElement("span");
  s.textContent = texto;
  f.appendChild(s);
  for (const b of (botoes || [])){
    const btn = document.createElement("button");
    btn.textContent = b.nome;
    btn.style.marginLeft = "8px";
    btn.onclick = function(){ f.hidden = true; faixaT = 0; b.fazer(); };
    f.appendChild(btn);
  }
  f.hidden = false;
  faixaT = botoes && botoes.length ? 0 : performance.now() + 4000;
}
/* o que ha no tile debaixo do mouse, em metros e em nome */
function descreverTileMacro(){
  const m = C.mapa, x = MACRO.mouse.tx, y = MACRO.mouse.ty;
  if (!m || !MACRO.mouse.dentro || x < 0 || y < 0 || x >= m.larg || y >= m.alt) return "";
  const i = y*m.larg + x, t = TERRENOS[m.terreno[i]], h = m.altura[i];
  const acima = m.mar === null ? null : (h - m.mar)*m.passo*2;
  return "  &middot;  <b>" + t.nome + "</b>, piso " + h +
    (acima === null ? "" : " (" + (acima >= 0 ? acima.toFixed(1) + " m acima do mar" : (-acima).toFixed(1) + " m de fundura") + ")");
}
function status(){
  const m = C.mapa;
  if (!m){ $("status").innerHTML = "nenhum mapa aberto"; return; }
  const a = MICRO.alvo;
  $("status").innerHTML =
    "<b>" + m.nome + "</b> " + m.larg + "x" + m.alt +
    "  &middot;  voce em <b>" + P.x.toFixed(1) + ", " + P.y.toFixed(1) + ", " + P.z.toFixed(2) + "</b>" +
    "  &middot;  " + (MICRO.voando ? "voando" : "andando") +
    (MACRO.ligado
      ? "  &middot;  <b>macro</b>  &middot;  " + MACRO.camada + " / " + MACRO.ferr +
        "  &middot;  tile <b>" + MACRO.mouse.tx + ", " + MACRO.mouse.ty + "</b>" + descreverTileMacro()
      : "  &middot;  peca <b>" + MICRO.tipo + "</b> giro <b>" + MICRO.giro + "</b>" + (MICRO.espelho ? " espelhada" : "") +
        "  &middot;  grade <b>" + MICRO.grade + "</b>" +
        "  &middot;  estilo <b>" + MICRO.estilo + "</b>" +
        (MICRO.encaixar ? "" : "  &middot;  <b>sem encaixe</b>") +
        (a && a.encaixe ? "  &middot;  encaixe <b>" + a.encaixe + "</b>" : "") +
        (a ? "  &middot;  em <b>" + a.x.toFixed(2) + ", " + a.y.toFixed(2) + ", " + a.z.toFixed(2) + "</b>" : "")) +
    "  &middot;  <b>" + m.pecas.length + "</b> pecas" +
    (textoDoAlcance() ? "  &middot;  " + textoDoAlcance() : "") +
    (C.sujo ? "  &middot;  <b style='color:#e8b860'>nao salvo</b>" : "");
}

/* ---------- o mapa ---------- */
function usarMapa(m, nome){
  C.mapa = m; MICRO.mapa = m;
  C.hist = novoHistorico();
  ARQ.nome = nome || ARQ.nome;
  $("arquivoNome").textContent = ARQ.nome || "(sem arquivo)";
  trocarMundo("?mapa=canteiro", m);
  prepararBaseMacro(m);
  MACRO.jaEnquadrou = false;
  ALCANCE.estado = "nenhum"; ALCANCE.img = null; ALCANCE.trabalho = null;
  C.coisa = null; montarFormCoisa();
  MACRO.medida = null;
  recomecarValidacao(ARQ.nome);
  G.mode = "play";
  AU.on = false;                                  // a ferramenta nao toca musica
  P.god = true;
  MICRO.construcao = maiorConstrucao(m) + 1;
  C.sujo = false;
  atualizarPainel();
  faixa(m.nome + ": " + m.larg + "x" + m.alt + ", " + m.pecas.length + " pecas, " + m.coisas.length + " coisas");
}
function maiorConstrucao(m){
  let maior = 0;
  for (const c of m.construcoes) if (c.id > maior) maior = c.id;
  for (const p of m.pecas) if (p.construcao > maior) maior = p.construcao;
  return maior;
}
function abrirTexto(texto, nome){
  const r = lerMapa(texto);
  if (!r.mapa){
    faixa("nao abri " + (nome || "") + ": " + r.erros.slice(0, 2).map(function(e){ return "linha " + e.linha + " " + e.msg; }).join("; "));
    return false;
  }
  if (r.mapa.versao < 2) converterMapa(r.mapa);
  usarMapa(r.mapa, nome);
  return true;
}
/* O mapa novo: a ilha e um campo de grama na altura do mar, para esculpir;
   a dungeon e rocha inteira com uma sala no meio, para cavar -- as duas com
   o inicio do jogador no meio. O forro da sala fica na altura da rocha (6
   degraus): mais alto, sobra um vao entre o alto da parede e o forro, e o
   ceu aparece nele. */
function mapaNovo(larg, alt, tipo){
  const w = Math.max(8, Math.min(2048, larg || 64)), h = Math.max(8, Math.min(2048, alt || 64));
  let m;
  if (tipo === "dungeon"){
    m = novoMapa(w, h, {nome: "dungeon", mar: null, terreno: TERRENO_POR_CHAR["#"], altura: 0});
    const cx = w >> 1, cy = h >> 1;
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 3; x <= cx + 3; x++){
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      m.terreno[y*w + x] = TERRENO_POR_CHAR["+"]; m.teto[y*w + x] = 6;
    }
  } else m = novoMapa(w, h, {nome: "ilha", terreno: TERRENO_POR_CHAR[","], altura: 4});
  m.coisas.push({x: w >> 1, y: h >> 1, tipo: "jogador", texto: ""});
  ARQ.handle = null; ARQ.nome = "";
  usarMapa(m, (tipo === "dungeon" ? "dungeon" : "novo") + ".mapa");
}

/* ---------- acoes, desfazer ---------- */
function acaoDoCanteiro(nome, fn){
  abrirAcao(C.hist, nome);
  fn(C.mapa, C.hist);
  const mudou = fecharAcao(C.hist, C.mapa);
  if (mudou) refletir(ultimoRegistro(C.hist));
  return mudou;
}
window.acaoDoCanteiro = acaoDoCanteiro;
function desfazerOuRefazer(frente){
  const r = frente ? refazer(C.hist, C.mapa) : desfazer(C.hist, C.mapa);
  if (!r){ faixa(frente ? "nada para refazer" : "nada para desfazer"); return; }
  refletir(r);
  faixa((frente ? "refeito: " : "desfeito: ") + r.nome);
}
/* Depois de toda mudanca -- acao, desfazer, refazer -- o motor e o mapa de
   cima refazem so o que o registro diz que mudou: os tiles de terreno, as
   pecas, as coisas. Registro de mapa inteiro refaz tudo. */
function refletir(r){
  if (r.mapa) remontarTudo();
  else {
    const terreno = tilesDoRegistro(r, ["terreno", "altura", "teto"]);
    if (terreno.length) atualizarTerreno(terreno);
    const W = C.mapa.larg, todos = tilesDoRegistro(r);
    if (todos.length) recalcularTilesMacro(todos.map(function(i){ return [i % W, (i / W) | 0]; }));
    if (r.pecas) montarPecas();
    if (r.coisas || terreno.length) refazerCenario();
  }
  envelhecerAlcance();
  envelhecerValidacao();
  MACRO.vazio.velho = true;
  if (MACRO.visao && (r.mapa || tilesDoRegistro(r, ["terreno", "altura", "teto"]).length)) MACRO.visao = null;
  MACRO.medida = null;
  if (C.coisa && !coisaEscolhida()) C.coisa = null;
  montarFormCoisa();
  REGUA.estado = "nenhum"; REGUA.trabalho = null;
  marcarSujo();
  atualizarPainel();
}
/* o mapa mudou de tamanho ou de tudo: o mundo sai de novo, com a gente no
   mesmo lugar */
function remontarTudo(){
  const onde = {x: P.x, y: P.y, z: P.z, ang: P.ang, pitch: P.pitch};
  trocarMundo("?mapa=canteiro", C.mapa);
  prepararBaseMacro(C.mapa);
  G.mode = "play"; AU.on = false; P.god = true;
  Object.assign(P, onde);
}
function marcarSujo(){
  C.sujo = true;
  if (!C.rascunhoEm) C.rascunhoEm = setTimeout(guardarOrascunho, 4000);
}
function guardarOrascunho(){
  C.rascunhoEm = 0;
  if (!C.mapa) return;
  const erro = guardarRascunho(escreverMapa(C.mapa), {x: P.x, y: P.y, z: P.z, ang: P.ang, pitch: P.pitch});
  if (erro) faixa("o navegador nao deixou guardar o rascunho: " + erro);
}

/* ---------- painel ---------- */
function atualizarPainel(){
  /* a cor das regioes so tinge o mapa de cima com a camada delas: entrou
     ou saiu dela, a imagem inteira sai de novo */
  const tinge = MACRO.camada === "regiao";
  if (C.mapa && MACRO.mapa === C.mapa && MACRO.tingido !== tinge){ MACRO.tingido = tinge; recalcularBaseMacro(); }
  atualizarCatalogo(function(){ cvs.focus(); });
  const e = $("estilos");
  if (!e.dataset.pronto){
    e.dataset.pronto = "1";
    e.innerHTML = "";
    for (const id of Object.keys(ESTILOS)){
      const b = document.createElement("button");
      b.textContent = ESTILOS[id].nome;
      b.dataset.estilo = id;
      b.onclick = function(){ escolherEstilo(id); cvs.focus(); };
      e.appendChild(b);
    }
  }
  /* a paleta de terreno e a lista de coisas do macro */
  const pt = $("paletaTerreno");
  if (!pt.dataset.pronto){
    TERRENOS.forEach(function(t, i){
      const d = document.createElement("div");
      d.className = "amostra"; d.dataset.terreno = i;
      d.innerHTML = "<span class=cor style=\"background:" + t.cor + "\"></span>" + t.nome;
      d.onclick = function(){ MACRO.valor.terreno = i; atualizarPainel(); };
      pt.appendChild(d);
    });
    pt.dataset.pronto = "1";
    const sel = $("tipoCoisa");
    for (const c of COISAS){
      const o = document.createElement("option");
      o.value = c.id; o.textContent = c.nome;
      sel.appendChild(o);
    }
    sel.value = MACRO.valor.coisa;
    sel.onchange = function(){ MACRO.valor.coisa = this.value; };
    $("textoCoisa").oninput = function(){ MACRO.textoCoisa = this.value; };
    const tm = $("tipoMarco");
    for (const k of COISAS) if (k.grupo === "marco"){
      const o = document.createElement("option"); o.value = k.id; o.textContent = k.nome; tm.appendChild(o);
    }
    tm.value = "bau";
    $("tamPincel").oninput = function(){ MACRO.tamanho = +this.value; atualizarPainel(); };
    $("largTraco").oninput = function(){ MACRO.largura = +this.value; atualizarPainel(); };
    $("modoAltura").onchange = function(){ MACRO.modoAltura = this.value; };
    $("valorAltura").oninput = function(){ MACRO.valor.altura = +this.value; };
    for (const b of $("camadas").children) b.onclick = function(){ MACRO.camada = this.dataset.camada; atualizarPainel(); };
    for (const b of $("ferramentas").children) b.onclick = function(){ escolherFerramenta(this.dataset.ferr); };
    $("valorTeto").oninput = function(){ MACRO.valor.teto = Math.max(0, +this.value | 0); };
    $("relevoAmp").oninput = function(){ MACRO.relevo.amplitude = +this.value; $("relevoAmpTexto").textContent = this.value; };
    $("relevoEsc").oninput = function(){ MACRO.relevo.escala = +this.value; $("relevoEscTexto").textContent = this.value; };
    $("relevoSemente").onchange = function(){ MACRO.relevo.semente = Math.max(1, +this.value | 0); this.value = MACRO.relevo.semente; };
    $("btnSortearRelevo").onclick = function(){ MACRO.relevo.semente = 1 + Math.floor(Math.random()*99999); $("relevoSemente").value = MACRO.relevo.semente; };
    $("relevoAndavel").onchange = function(){ MACRO.relevo.andavel = this.checked; };
    $("densidade").oninput = function(){ MACRO.densidade = +this.value/100; $("densidadeTexto").textContent = this.value + "%"; };
    for (const c of $("vistaMacro").querySelectorAll("input")) c.onchange = function(){
      MACRO.vista[this.dataset.vista] = this.checked;
      if (this.dataset.vista === "relevo" && C.mapa) recalcularBaseMacro();
    };
  }
  for (const d of pt.children) d.classList.toggle("ativo", +d.dataset.terreno === MACRO.valor.terreno);
  for (const b of $("camadas").children) b.classList.toggle("ativo", b.dataset.camada === MACRO.camada);
  for (const b of $("ferramentas").children) b.classList.toggle("ativo", b.dataset.ferr === MACRO.ferr);
  $("blocoAltura").hidden = MACRO.camada !== "altura";
  $("blocoTeto").hidden = MACRO.camada !== "teto";
  $("blocoLote").hidden = MACRO.ferr !== "lote";
  $("blocoCarimbo").hidden = MACRO.ferr !== "carimbo";
  $("blocoRelevo").hidden = MACRO.ferr !== "relevo";
  $("blocoVisao").hidden = MACRO.ferr !== "visao";
  $("blocoDensidade").hidden = MACRO.ferr !== "espalhar";
  $("carimboInfo").innerHTML = MACRO.carimbo
    ? "Na m&atilde;o: " + MACRO.carimbo.larg + "&times;" + MACRO.carimbo.alt + (MACRO.carimbo.pecas.length ? ", " + MACRO.carimbo.pecas.length + " pe&ccedil;as" : "") +
      ". Cada clique carimba, assentado na altura do tile; a casa colada &eacute; outra constru&ccedil;&atilde;o."
    : "Arraste para copiar um peda&ccedil;o &mdash; ch&atilde;o, relevo, teto, coisas e pe&ccedil;as. Depois cada clique carimba, assentado na altura do tile.";
  const foco = document.activeElement;
  const por = function(id, v){ if (foco !== $(id)) $(id).value = v; };
  por("valorAltura", MACRO.valor.altura);
  por("valorTeto", MACRO.valor.teto);
  if (foco !== $("tipoCoisa")) $("tipoCoisa").value = MACRO.valor.coisa;
  for (const c of $("vistaMacro").querySelectorAll("input")) c.checked = !!MACRO.vista[c.dataset.vista];
  if (C.mapa){
    const m = C.mapa;
    por("mapaNome", m.nome);
    $("mapaSemMar").checked = m.mar === null;
    $("mapaMar").disabled = m.mar === null;
    por("mapaMar", m.mar === null ? "" : m.mar);
    por("mapaSemente", m.semente === null || m.semente === undefined ? "" : m.semente);
    $("mapaTam").textContent = m.larg + " \u00d7 " + m.alt + " tiles, " + m.larg*METROS_POR_TILE + " \u00d7 " + m.alt*METROS_POR_TILE + " m";
    por("redLarg", m.larg); por("redAlt", m.alt);
  }
  $("blocoMarcoMicro").hidden = MACRO.ligado;
  if (!$("loteEstilo").options.length){
    for (const id of Object.keys(ESTILOS)){
      const o = document.createElement("option");
      o.value = id; o.textContent = ESTILOS[id].nome;
      $("loteEstilo").appendChild(o);
    }
    $("loteEstilo").value = "madeira-pescador";
  }
  $("blocoRegiao").hidden = MACRO.camada !== "regiao";
  if (MACRO.camada === "regiao" && C.mapa) listarRegioes();
  $("tamPincelTexto").textContent = MACRO.tamanho;
  $("largTracoTexto").textContent = MACRO.largura;
  $("tamPincel").value = MACRO.tamanho;
  for (const b of $("estilos").children) b.classList.toggle("ativo", b.dataset.estilo === MICRO.estilo);
  const c = C.mapa && C.mapa.construcoes.find(function(k){ return k.id === MICRO.construcao; });
  $("construcaoAtual").textContent = "n" + MICRO.construcao + (c ? " " + c.nome + " (" + c.estilo + ")" : " (nova)");
  $("btnAndar").classList.toggle("ativo", !MICRO.voando);
  $("btnAndar").innerHTML = (MICRO.voando ? "Voar" : "Andar") + " <kbd>N</kbd>";
}

/* ---------- macro e micro, no mesmo ponto ----------
   Tab troca. Indo para o macro, a vista de cima centra onde a camera do
   micro esta; voltando, o micro nasce no meio da vista de cima. E o mesmo
   mapa e o mesmo desfazer. */
function trocarModo(paraMacro){
  if (!C.mapa) return;
  MACRO.ligado = paraMacro === undefined ? !MACRO.ligado : !!paraMacro;
  $("mapa2d").hidden = !MACRO.ligado;
  $("screen").hidden = MACRO.ligado;
  $("painelMacro").hidden = !MACRO.ligado;
  $("painelMicro").hidden = MACRO.ligado;
  $("btnModo").innerHTML = (MACRO.ligado ? "Micro" : "Macro") + " <kbd>Tab</kbd>";
  if (MACRO.ligado){
    ajustarCanvasMacro();
    if (!MACRO.jaEnquadrou){ enquadrarMacro(); MACRO.jaEnquadrou = true; }
    else centrarMacro(Math.floor(P.x), Math.floor(P.y));
  } else {
    const t = telaDoMacro(), z = MACRO.cam.zoom;
    irParaTile(Math.floor(MACRO.cam.x + t.w/z/2), Math.floor(MACRO.cam.y + t.h/z/2));
  }
  atualizarPainel();
}
/* poe o jogador naquele tile, em cima do chao */
function irParaTile(tx, ty){
  if (!C.mapa) return;
  tx = Math.max(0, Math.min(C.mapa.larg - 1, tx));
  ty = Math.max(0, Math.min(C.mapa.alt - 1, ty));
  P.x = tx + 0.5; P.y = ty + 0.5;
  P.vx = P.vy = P.vz = 0;
  P.z = groundUnder(P.x, P.y, 0.26, 1e9) + 0.02;
  MICRO.alvo = null;
}

/* ---------- as ferramentas do macro ---------- */
/* o valor que a camada de agora pinta */
function valorDaCamada(){
  if (MACRO.camada === "terreno") return MACRO.valor.terreno;
  if (MACRO.camada === "altura") return MACRO.valor.altura;
  if (MACRO.camada === "regiao") return MACRO.valor.regiao;
  return MACRO.valor.teto;
}
function acaoNoMacro(nome, fn){
  return acaoDoCanteiro(nome, function(m, h){ fn(m, h); });
}
/* O traco: abre a acao no botao que desce, mexe enquanto arrasta e fecha no
   botao que sobe -- um Ctrl+Z para o traco inteiro. */
function comecarTracoMacro(tx, ty, botao){
  const f = MACRO.ferr;
  MACRO.arrasto = {x0: tx, y0: ty, botao: botao, mexidos: new Set(), acao: false};
  const deLugar = ["regua", "ir", "lote", "carimbo", "contagotas", "rampa", "traco", "relevo", "visao"].indexOf(f) >= 0;
  if (f === "pincel" || f === "espalhar" || (MACRO.camada === "coisas" && !deLugar)){
    abrirAcao(C.hist, f === "espalhar" ? "espalhar" : (MACRO.camada === "coisas" ? "coisas" : "pincel"));
    MACRO.arrasto.acao = true;
    seguirTracoMacro(tx, ty);
  } else if (f === "balde"){
    acaoNoMacro("balde", function(mm, hh){
      balde(hh, mm, MACRO.camada === "coisas" ? "terreno" : MACRO.camada, tx, ty,
            valorDaCamada());
    });
  }
}
function seguirTracoMacro(tx, ty){
  const a = MACRO.arrasto;
  if (!a || !a.acao) return;
  const m = C.mapa, h = C.hist;
  if (MACRO.camada === "coisas"){
    /* O clique num tile que ja tem coisa escolhe ela, para os campos; num
       vazio, poe a coisa com os campos do tipo e escolhe. Arrastando, so
       poe nos vazios -- a floresta nao atropela o que ja esta la. */
    if (a.botao === 2){ apagarCoisa(h, m, tx, ty); if (C.coisa && C.coisa.x === tx && C.coisa.y === ty) C.coisa = null; return; }
    const k = coisaEm(m, tx, ty);
    if (k >= 0){ if (!a.mexeu) escolherCoisa(tx, ty); return; }
    colocarCoisa(h, m, tx, ty, MACRO.valor.coisa, MACRO.textoCoisa || "", camposPadrao(MACRO.valor.coisa));
    a.mexeu = true;
    escolherCoisa(tx, ty);
    return;
  }
  if (MACRO.ferr === "espalhar"){
    espalhar(h, m, tilesDoPincel(tx, ty, MACRO.tamanho), [MACRO.valor.coisa], MACRO.densidade, Math.random);
    return;
  }
  aplicarPincelMacro(h, m, tx, ty, a.mexidos);
}
function terminarTracoMacro(tx, ty){
  const a = MACRO.arrasto;
  MACRO.arrasto = null;
  if (!a) return;
  if (a.acao){
    if (fecharAcao(C.hist, C.mapa)) refletir(ultimoRegistro(C.hist));
    else atualizarPainel();
    return;
  }
  usarFerramentaMacro(a, tx, ty, true);
}
/* o conta-gotas pega o valor da camada no tile, e volta para a ferramenta
   de antes */
function pegarDoTile(tx, ty){
  const m = C.mapa;
  if (tx < 0 || ty < 0 || tx >= m.larg || ty >= m.alt) return;
  const i = ty*m.larg + tx, cam = MACRO.camada;
  let o = "";
  if (cam === "terreno"){ MACRO.valor.terreno = m.terreno[i]; o = TERRENOS[m.terreno[i]].nome; }
  else if (cam === "altura"){ MACRO.valor.altura = m.altura[i]; o = "altura " + m.altura[i]; }
  else if (cam === "teto"){ MACRO.valor.teto = m.teto[i]; o = "teto " + m.teto[i]; }
  else if (cam === "regiao"){ MACRO.valor.regiao = m.regiao ? m.regiao[i] : 0; o = "regi\u00e3o " + MACRO.valor.regiao; }
  else if (cam === "coisas"){
    const k = coisaEm(m, tx, ty);
    if (k >= 0){ MACRO.valor.coisa = m.coisas[k].tipo; o = COISA_POR_ID[m.coisas[k].tipo].nome; }
  }
  faixa(o ? "conta-gotas: " + o : "nada para pegar aqui");
  escolherFerramenta(MACRO.ferrAntes || "pincel");
}
/* O carimbo: sem nada na mao, o arrasto copia o pedaco; com ele, o clique
   carimba -- um Ctrl+Z cada. */
function usarCarimbo(a, tx, ty){
  if (!MACRO.carimbo){
    const c = recortar(C.mapa, a.x0, a.y0, tx, ty);
    if (!c) return;
    MACRO.carimbo = c;
    faixa("carimbo " + c.larg + "x" + c.alt + (c.pecas.length ? ", " + c.pecas.length + " pe\u00e7as" : "") +
          (c.coisas.length ? ", " + c.coisas.length + " coisas" : "") + " -- clique carimba, G gira, Esc larga");
  } else acaoNoMacro("carimbo", function(mm, hh){ carimbar(hh, mm, MACRO.carimbo, tx, ty); });
  atualizarPainel();
}
function escolherFerramenta(f){
  if (f === "contagotas" && MACRO.ferr !== "contagotas") MACRO.ferrAntes = MACRO.ferr;
  MACRO.ferr = f;
  atualizarPainel();
}
function usarFerramentaMacro(a, tx, ty, ehFim){
  const m = C.mapa;
  if (MACRO.ferr === "contagotas"){ if (ehFim) pegarDoTile(tx, ty); return; }
  if (MACRO.ferr === "carimbo"){ if (ehFim) usarCarimbo(a, tx, ty); return; }
  if (MACRO.ferr === "visao"){
    if (!ehFim || tx < 0 || ty < 0 || tx >= m.larg || ty >= m.alt) return;
    const n = mostrarVisao(m, tx, ty, +$("visaoOlho").value);
    $("visaoInfo").textContent = "de " + tx + ", " + ty + ": " + n + " tiles \u00e0 vista, at\u00e9 60 tiles";
    return;
  }
  if (MACRO.ferr === "relevo"){
    if (!ehFim) return;
    const R = MACRO.relevo;
    let n = 0;
    acaoNoMacro("relevo", function(mm, hh){ n = relevoComRuido(hh, mm, a.x0, a.y0, tx, ty, R); });
    faixa(n ? "relevo: " + n + " tiles subiram (semente " + R.semente + ")" : "nada subiu: o relevo so mexe no ch\u00e3o");
    return;
  }
  if (MACRO.ferr === "ir"){ trocarModo(false); irParaTile(tx, ty); return; }
  if (MACRO.ferr === "regua"){
    /* a reta e o caminho andando: a diferenca entre os dois e o que o morro,
       o rio e a porta custam. O caminho sai aos poucos, pelo laco. */
    MACRO.medida = null;
    comecarRegua(m, a.x0, a.y0, tx, ty, AJUSTE.vel);
    faixa(textoDaRegua());
    return;
  }
  if (!ehFim) return;
  if (MACRO.ferr === "lote"){
    let casa = null;
    const opcoes = {andares: +$("loteAndares").value, frente: $("loteFrente").value,
                    estilo: $("loteEstilo").value, sacada: $("loteSacada").checked};
    acaoNoMacro("lote", function(mm, hh){ casa = erguerLote(hh, mm, a.x0, a.y0, tx, ty, opcoes); });
    faixa(casa ? casa.nome + " em " + ESTILOS[opcoes.estilo].nome + ", " + casa.pecas.length + " pecas -- Tab para entrar nela"
               : "o lote precisa de pelo menos 3 por 4 tiles (e um de quintal na frente, com dois andares)");
    return;
  }
  if (MACRO.ferr === "retangulo"){
    if (MACRO.camada === "coisas") return;
    acaoNoMacro("retangulo", function(mm, hh){
      retangulo(hh, mm, MACRO.camada, a.x0, a.y0, tx, ty,
                valorDaCamada());
    });
  } else if (MACRO.ferr === "rampa"){
    let r = null;
    acaoNoMacro("rampa", function(mm, hh){ r = rampaEntre(hh, mm, a.x0, a.y0, tx, ty, MACRO.largura); });
    if (r && r.faltou > 0) faixa("a rampa subiu um degrau por tile e faltaram " + r.faltou + ": alongue o traco");
  } else if (MACRO.ferr === "traco"){
    acaoNoMacro("traco", function(mm, hh){
      tracar(hh, mm, a.x0, a.y0, tx, ty, MACRO.largura, MACRO.valor.terreno, {relevo: MACRO.relevoDoTraco});
    });
  }
}

/* ---------- entrada ---------- */
/* Olhar em volta tem dois caminhos, como no jogo: com o mouse preso
   (pointer lock), mover olha e clicar poe; sem ele -- dentro de um iframe o
   navegador recusa --, arrastar olha e o clique curto poe. */
const cvs2 = $("screen");
let preso = false, travaFalhou = false, arrastando = false, arrastou = 0, ultimoX = 0, ultimoY = 0;
cvs2.addEventListener("mousedown", function(ev){
  ev.preventDefault();
  cvs2.focus();
  if (!preso && !travaFalhou && cvs2.requestPointerLock){
    const p = cvs2.requestPointerLock();
    if (p && typeof p.catch === "function") p.catch(function(){ travaFalhou = true; });
    return;
  }
  if (preso){
    if (ev.button === 0) porPeca();
    else if (ev.button === 2) tirarPeca();
    else if (ev.button === 1) conta();
    return;
  }
  arrastando = true; arrastou = 0; ultimoX = ev.clientX; ultimoY = ev.clientY;
});
addEventListener("mouseup", function(ev){
  if (arrastando && arrastou < 7){
    if (ev.button === 2) tirarPeca(); else if (ev.button === 1) conta(); else porPeca();
  }
  arrastando = false;
});
cvs2.addEventListener("contextmenu", function(ev){ ev.preventDefault(); });
function campoDeTexto(){
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA");
}
/* ---------- o modelo em arquivo ---------- */
async function salvarModelo(){
  if (!MICRO.prancheta && !copiarSelecao(false)){ faixa("selecione com B e copie com Ctrl+C antes de salvar o modelo"); return; }
  const nome = (MICRO.prancheta.nome === "copia" ? "modelo" : MICRO.prancheta.nome);
  const texto = modeloParaTexto(MICRO.prancheta);
  try {
    if (typeof window.showSaveFilePicker === "function"){
      const h = await window.showSaveFilePicker({suggestedName: nome + ".modelo",
        types: [{description: "Modelo do canteiro", accept: {"text/plain": [".modelo"]}}]});
      const w = await h.createWritable(); await w.write(texto); await w.close();
      faixa("modelo gravado em " + h.name);
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([texto], {type: "text/plain"}));
      a.download = nome + ".modelo"; a.click();
      faixa("baixei o modelo: o navegador nao deixa gravar direto");
    }
  } catch(e){ if (e && e.name !== "AbortError") faixa("nao gravei o modelo: " + e.message); }
}
async function abrirModelo(){
  try {
    let texto = null, nome = "modelo";
    if (typeof window.showOpenFilePicker === "function"){
      const [h] = await window.showOpenFilePicker({types: [{description: "Modelo do canteiro", accept: {"text/plain": [".modelo"]}}]});
      const f = await h.getFile(); texto = await f.text(); nome = f.name;
    } else { $("entradaModelo").click(); return; }
    usarModelo(texto, nome);
  } catch(e){ if (e && e.name !== "AbortError") faixa("nao abri o modelo: " + e.message); }
}
function usarModelo(texto, nome){
  const r = modeloDeTexto(texto);
  if (!r.modelo){ faixa("nao abri " + nome + ": linha " + r.erros[0].linha + " " + r.erros[0].msg); return; }
  if (MACRO.ligado) trocarModo(false);
  MICRO.prancheta = r.modelo;
  comecarAColar(r.modelo);
  faixa(r.modelo.nome + ": " + r.modelo.pecas.length + " pecas na mao -- R gira, F espelha, clique cola");
  cvs2.focus();
}
/* o conta-gotas: a peca da mira vai para a mao e para a casa da barra */
function conta(){ if (pegarDaMira()){ escolherDoCatalogo(MICRO.tipo); atualizarPainel(); } }
document.addEventListener("pointerlockerror", function(){ travaFalhou = true; });
document.addEventListener("pointerlockchange", function(){ preso = document.pointerLockElement === cvs2; });
addEventListener("mousemove", function(ev){
  if (preso){
    P.ang += (ev.movementX || 0)*0.0026;
    P.pitch = Math.max(-1.48, Math.min(1.48, P.pitch - (ev.movementY || 0)*0.0030));
  } else if (arrastando){
    const dx = ev.clientX - ultimoX, dy = ev.clientY - ultimoY;
    ultimoX = ev.clientX; ultimoY = ev.clientY;
    arrastou += Math.abs(dx) + Math.abs(dy);
    P.ang += dx*0.0055;
    P.pitch = Math.max(-1.48, Math.min(1.48, P.pitch - dy*0.0055));
  }
});
addEventListener("keydown", function(ev){
  const k = (ev.key || "").toLowerCase();
  if (ev.ctrlKey || ev.metaKey){
    if (k === "s"){ ev.preventDefault(); salvar(ev.shiftKey); }
    else if (!MACRO.ligado && (k === "c" || k === "x") && !campoDeTexto()){ ev.preventDefault(); copiarSelecao(k === "x"); atualizarPainel(); }
    else if (!MACRO.ligado && k === "v" && !campoDeTexto()){ ev.preventDefault(); comecarAColar(); atualizarPainel(); }
    else if (k === "z"){ ev.preventDefault(); desfazerOuRefazer(ev.shiftKey); }
    else if (k === "y"){ ev.preventDefault(); desfazerOuRefazer(true); }
    return;
  }
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;
  if (k === "tab"){ ev.preventDefault(); trocarModo(); return; }
  if (k === "f7"){ ev.preventDefault(); conferirTudo(); return; }
  if (["w","a","s","d","c"," ","shift","arrowup","arrowdown","arrowleft","arrowright"].indexOf(k) >= 0) ev.preventDefault();
  if (MACRO.ligado){
    const camadas = {"1":"terreno", "2":"altura", "3":"teto", "4":"coisas", "5":"regiao"};
    const ferrs = {b:"pincel", f:"balde", r:"retangulo", a:"rampa", t:"traco", e:"espalhar", m:"regua", k:"ir", h:"lote",
                   i:"contagotas", c:"carimbo", o:"relevo", v:"visao"};
    if (k === " ") MACRO.espaco = true;
    else if (camadas[k]) MACRO.camada = camadas[k];
    else if (ferrs[k]) escolherFerramenta(ferrs[k]);
    else if (k === "g" && MACRO.carimbo) MACRO.carimbo = girarCarimbo(MACRO.carimbo);
    else if (k === "escape") MACRO.carimbo = null;
    else if (k === "0") enquadrarMacro();
    else if (k === "[") MACRO.tamanho = Math.max(1, MACRO.tamanho - 1);
    else if (k === "]") MACRO.tamanho = Math.min(25, MACRO.tamanho + 1);
    else if (k === "j") verNoJogo();
    else if (k === "l") pedirAlcance();
    atualizarPainel();
    return;
  }
  teclasMicro[k] = true;
  if (MICRO.colando && k === "r"){ MICRO.colando = girarModelo(MICRO.colando, ev.shiftKey ? 3 : 1); return; }
  if (MICRO.colando && k === "f"){ MICRO.colando = espelharModelo(MICRO.colando); return; }
  if (k === "escape"){ largarColando(); MICRO.selecao = null; MICRO.cantoA = null; return; }
  if (k === "b"){ marcarCanto(); atualizarPainel(); return; }
  if (k === "delete"){ apagarSelecao(); atualizarPainel(); return; }
  if (k === "r"){ MICRO.giro = (MICRO.giro + (ev.shiftKey ? 270 : 90)) % 360; atualizarPainel(); }
  else if (k === "t"){ MICRO.giro = (MICRO.giro + (ev.shiftKey ? 315 : 45)) % 360; atualizarPainel(); }
  else if (k === "e"){ MICRO.encaixar = !MICRO.encaixar; faixa(MICRO.encaixar ? "encaixe ligado" : "encaixe desligado: so a grade"); atualizarPainel(); }
  else if (k === "q") conta();
  else if (k === "v"){ estiloNaPeca(); }
  else if (k === "u"){ abrirNaMira(); }
  else if (k === "m"){ porMarcoNaMira(); }
  else if (k === "f"){ MICRO.espelho = MICRO.espelho ? 0 : 1; atualizarPainel(); }
  else if (k === "g"){ MICRO.grade = MICRO.grade === 0.25 ? 0.5 : (MICRO.grade === 0.5 ? 1 : 0.25); atualizarPainel(); }
  else if (k === "n"){ MICRO.voando = !MICRO.voando; P.vz = 0; atualizarPainel(); }
  else if (k === "j") verNoJogo();
  else if (k === "/"){ ev.preventDefault(); $("buscaPeca").focus(); $("buscaPeca").select(); }
  else if (/^Digit[1-9]$/.test(ev.code || "")){ escolherCasaDaBarra(+ev.code.slice(5) - 1); atualizarPainel(); }
});
addEventListener("keyup", function(ev){
  const k = (ev.key || "").toLowerCase();
  teclasMicro[k] = false;
  if (k === " ") MACRO.espaco = false;
});
addEventListener("beforeunload", function(ev){ if (C.sujo){ ev.preventDefault(); ev.returnValue = ""; } });

/* ---------- o marco escolhido ----------
   O formulario dos campos, o mesmo no macro e no micro: cada campo do tipo
   (camposDoTipo, em mapa.js) vira o controle que ele pede -- lista vira
   escolha, sim vira caixa, cor vira cor. Mudar um campo e uma acao, com o
   seu Ctrl+Z; o campo errado fica vermelho e diz por que. */
function escolherCoisa(x, y){ C.coisa = {x: x, y: y}; montarFormCoisa(); }
MACRO.coisaEscolhida = function(){ return coisaEscolhida(); };
function coisaEscolhida(){
  if (!C.coisa || !C.mapa) return null;
  const k = coisaEm(C.mapa, C.coisa.x, C.coisa.y);
  return k >= 0 ? C.mapa.coisas[k] : null;
}
function montarFormCoisa(){
  const c = coisaEscolhida();
  $("blocoCoisa").hidden = !c;
  if (!c) return;
  const def = COISA_POR_ID[c.tipo];
  $("coisaNome").textContent = def ? def.nome : c.tipo;
  $("coisaOnde").textContent = "  em " + c.x + ", " + c.y;
  const caixa = $("coisaCampos");
  caixa.innerHTML = "";
  const gravar = function(k, v){
    /* valor que nao serve nao entra: com espaco, ele quebraria a linha do
       arquivo, que separa os campos por espaco */
    const f = camposDoTipo(c.tipo).find(function(x){ return x.k === k; });
    const prob = f ? problemaDoCampo(f, v) : "";
    if (prob){ faixa(k + ": " + prob + " -- nao mudei"); montarFormCoisa(); return; }
    acaoDoCanteiro("campo " + k, function(m, h){
      const atual = coisaEscolhida();
      if (!atual) return;
      if (k === "texto") editarTextoCoisa(h, m, atual.x, atual.y, v);
      else editarCamposCoisa(h, m, atual.x, atual.y, Object.assign({}, atual.campos, {[k]: v}));
    });
    montarFormCoisa();
  };
  if (def && def.texto){
    const l = document.createElement("label");
    l.textContent = "texto";
    const i = document.createElement("input");
    i.type = "text"; i.value = c.texto || ""; i.placeholder = def.texto;
    i.onchange = function(){ gravar("texto", this.value); };
    l.appendChild(i); caixa.appendChild(l);
  }
  for (const f of camposDoTipo(c.tipo)){
    const l = document.createElement("label");
    l.textContent = f.k;
    l.title = f.nome || f.k;
    const v = c.campos && c.campos[f.k] !== undefined ? c.campos[f.k] : "";
    let i;
    if (f.tipo === "lista"){
      i = document.createElement("select");
      for (const o of [""].concat(f.opcoes)){ const op = document.createElement("option"); op.value = o; op.textContent = o || "-"; i.appendChild(op); }
      i.value = v;
    } else if (f.tipo === "sim"){
      i = document.createElement("input"); i.type = "checkbox"; i.checked = v === "1";
      i.onchange = function(){ gravar(f.k, this.checked ? "1" : "0"); };
    } else if (f.tipo === "cor"){
      i = document.createElement("input"); i.type = "color"; i.value = /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#ffffff";
    } else {
      i = document.createElement("input"); i.type = "text"; i.value = v; i.placeholder = f.nome || "";
    }
    if (!i.onchange) i.onchange = function(){ gravar(f.k, this.value.trim()); };
    const prob = problemaDoCampo(f, v);
    if (prob){ i.style.borderColor = "var(--perigo)"; i.title = prob; }
    l.appendChild(i); caixa.appendChild(l);
  }
}
$("btnApagarCoisa").onclick = function(){
  const c = coisaEscolhida();
  if (c) acaoDoCanteiro("apagar coisa", function(m, h){ apagarCoisa(h, m, c.x, c.y); });
  C.coisa = null; montarFormCoisa();
};
$("btnLargarCoisa").onclick = function(){ C.coisa = null; montarFormCoisa(); };
/* M no micro: o marco escolhido no tile da mira, na altura do piso que ela
   pegou -- em cima da laje, o z vai junto */
function porMarcoNaMira(){
  const a = MICRO.alvo;
  if (!a || !C.mapa){ faixa("mire no chao onde vai o marco"); return; }
  const x = Math.floor(a.x), y = Math.floor(a.y), tipo = $("tipoMarco").value;
  const campos = camposPadrao(tipo) || {};
  if (a.z > floorAt(x, y) + 0.1) campos.z = String(Math.round(a.z*4)/4);
  acaoDoCanteiro("por marco", function(m, h){ colocarCoisa(h, m, x, y, tipo, "", campos); });
  escolherCoisa(x, y);
}
$("btnPorMarco").onclick = function(){ porMarcoNaMira(); cvs2.focus(); };

/* ---------- a validacao ----------
   O formato, as ligacoes e as pecas se conferem sozinhos, meio segundo
   depois de cada mudanca (validacao.js). O alcance andando e o pior quadro
   pedem o motor e alguns segundos: entram no Conferir tudo (F7), e o L
   refaz o alcance. Mexer no mapa deixa o que o motor achou marcado velho.
   Clicar num problema leva ate ele, no macro ou no micro; clicar de novo
   vai para o proximo lugar dele.

   Os outros mapas vem da pasta mapas/ do jogo (botao Pasta) ou, servido
   por http, do ../mapas/ ao lado, um por um, conforme as entradas pedem. So
   com a pasta o conjunto e completo: sem ela, o destino que nao se achou e
   aviso, nao erro. Exportar confere tudo e, sem erro, grava na pasta. */
const VAL = {pura: [], motor: null, motorVelho: false, quadro: null, lista: [],
             fase: "", trabalho: null, progresso: 0, depois: null,
             cache: new Map(), outros: new Map(), buscados: new Set(), pasta: null, pendente: 0};
function nomeNoJogo(){
  return nomeDoMapa($("nomeNoJogo").value || "") || nomeDoMapa(ARQ.nome) || "mapa";
}
function validarLogo(){ clearTimeout(VAL.pendente); VAL.pendente = setTimeout(validarPura, 500); }
function validarPura(){
  clearTimeout(VAL.pendente); VAL.pendente = 0;
  if (!C.mapa) return;
  const nome = nomeNoJogo(), conj = [{nome: nome, mapa: C.mapa, conferir: true}];
  VAL.outros.forEach(function(m, n){ if (n !== nome) conj.push({nome: n, mapa: m, conferir: false}); });
  VAL.pura = validarConjunto(conj, {completo: !!VAL.pasta, cache: VAL.cache});
  buscarDestinos();
  mostrarProblemas();
}
/* servido por http, o mapa que uma entrada pede vem de ../mapas/ */
function buscarDestinos(){
  if (!/^https?:/.test(location.protocol) || VAL.pasta || !C.mapa) return;
  for (const c of C.mapa.coisas){
    if (c.tipo !== "entrada" && c.tipo !== "saida") continue;
    const d = destinoDoMarco(c);
    if (!d || VAL.outros.has(d) || VAL.buscados.has(d) || MAPAS_SEM_ARQUIVO.indexOf(d) >= 0) continue;
    VAL.buscados.add(d);
    fetch("../mapas/" + d + ".mapa", {cache: "no-store"})
      .then(function(r){ return r.ok ? r.text() : null; })
      .then(function(t){ const r = t ? lerMapa(t) : null; if (r && r.mapa){ VAL.outros.set(d, r.mapa); validarLogo(); } })
      .catch(function(){});
  }
}
function todosOsProblemas(){
  const velho = function(p){ return Object.assign({velho: VAL.motorVelho}, p); };
  const doMotor = (VAL.motor || []).concat(problemasDoQuadro(nomeNoJogo(), VAL.quadro)).map(velho);
  return juntarRepetidos(VAL.pura.concat(doMotor));
}
function mostrarProblemas(){
  const lista = todosOsProblemas(), n = contarNiveis(lista), nome = nomeNoJogo();
  VAL.lista = lista;
  $("contaProblemas").innerHTML = !C.mapa ? "" :
    (n.erros ? "<span class=erro>" + n.erros + " erro" + (n.erros > 1 ? "s" : "") + "</span>" : "<span class=ok>sem erro</span>") +
    (n.avisos ? ", " + n.avisos + " aviso" + (n.avisos > 1 ? "s" : "") : "");
  const ol = $("listaProblemas");
  ol.innerHTML = "";
  lista.slice(0, 200).forEach(function(p){
    const li = document.createElement("li");
    li.className = p.nivel + (p.velho ? " velho" : "");
    li.title = (p.nivel === "erro" ? "erro: impede exportar" : "aviso") + (p.vezes > 1 ? " -- clique de novo para o pr\u00f3ximo lugar" : "");
    li.appendChild(document.createTextNode(p.msg + " "));
    const onde = document.createElement("span");
    onde.className = "onde";
    onde.textContent = (p.mapa !== nome ? p.mapa + " " : "") + (p.x >= 0 ? p.x + "," + p.y : "") +
      (p.vezes > 1 ? " \u00b7 " + p.vezes + " lugares" : "") + (p.velho ? " \u00b7 velho" : "");
    li.appendChild(onde);
    li.onclick = function(){ irParaProblema(p); };
    ol.appendChild(li);
  });
  $("quadroInfo").textContent = VAL.fase === "quadro" ? "medindo o pior quadro: " + Math.round(VAL.progresso*100) + "%"
    : VAL.fase === "alcance" ? textoDoAlcance()
    : VAL.quadro ? textoDoQuadro(VAL.quadro) + (VAL.motorVelho ? " -- velho, F7 refaz" : "")
    : "o alcance andando e o pior quadro: Conferir tudo (F7)";
}
/* Vai ao problema: no macro, centra e marca; no micro, poe a camera uns tres
   tiles para tras dele, voando, olhando para ele -- e o quadro caro, de pe no
   lugar, olhando para onde ele pesa. */
function irParaProblema(p){
  if (!C.mapa) return;
  if (p.mapa !== nomeNoJogo()){ faixa("este \u00e9 do mapa " + p.mapa + ": abra ele para ir l\u00e1"); return; }
  const ls = p.lugares && p.lugares.length ? p.lugares : [{x: p.x, y: p.y, z: p.z, peca: p.peca}];
  const k = (p.proximo || 0) % ls.length, l = ls[k];
  p.proximo = k + 1;
  if (!(l.x >= 0)){ faixa(p.msg); return; }
  const agora = performance.now(), m = C.mapa;
  const z = l.z !== undefined && isFinite(l.z) ? +l.z : floorAt(l.x, l.y);
  MACRO.destaque = {x: l.x, y: l.y, lugares: ls, ate: agora + 8000};
  MICRO.destaque = {x: l.x, y: l.y, z: z, pecas: p.pecas || (l.peca !== undefined ? [l.peca] : null), ate: agora + 8000};
  if (MACRO.ligado){
    if (MACRO.cam.zoom < 6) MACRO.cam.zoom = 8;
    centrarMacro(l.x, l.y);
  } else if (p.graus !== undefined){
    irParaTile(l.x, l.y);
    P.ang = p.graus*Math.PI/180; P.pitch = 0;
    MICRO.voando = false;
  } else {
    const dist = 3.2, ang = P.ang;
    P.x = Math.max(0.5, Math.min(m.larg - 0.5, l.x + 0.5 - Math.cos(ang)*dist));
    P.y = Math.max(0.5, Math.min(m.alt - 0.5, l.y + 0.5 - Math.sin(ang)*dist));
    P.z = Math.max(z, floorAt(Math.floor(P.x), Math.floor(P.y))) + 1.0;
    P.vx = P.vy = P.vz = 0;
    P.ang = Math.atan2(l.y + 0.5 - P.y, l.x + 0.5 - P.x);
    P.pitch = Math.atan2(z + 0.4 - (P.z + P.eye), Math.hypot(l.x + 0.5 - P.x, l.y + 0.5 - P.y));
    MICRO.voando = true;
    MICRO.alvo = null;
  }
  faixa(p.msg + (ls.length > 1 ? "  (" + (k + 1) + " de " + ls.length + "; clique de novo para o pr\u00f3ximo)" : ""));
  atualizarPainel();
}
/* F7: o alcance e o quadro, aos poucos, pelo laco; `depois` roda no fim */
function conferirTudo(depois){
  if (!C.mapa) return;
  if (VAL.fase){ faixa("j\u00e1 estou conferindo"); return; }
  validarPura();
  VAL.depois = depois || null;
  if (C.mapa.coisas.some(function(c){ return c.tipo === "jogador"; })){
    VAL.fase = "alcance";
    MACRO.vista.alcance = true;
    comecarAlcance(C.mapa, nomeNoJogo());
  } else {
    /* sem inicio nao ha de onde andar: a lista ja diz o erro, e vai o quadro */
    VAL.motor = []; VAL.fase = "quadro"; VAL.progresso = 0;
    VAL.trabalho = custoDoQuadroAosPoucos(C.mapa);
  }
  mostrarProblemas();
}
/* o alcance anda pelo laco (passoDoAlcance); quando ele acaba, o quadro */
function passoDaConferencia(orcamentoMs){
  if (VAL.fase === "alcance"){
    if (ALCANCE.estado === "calculando") return;
    if (ALCANCE.estado !== "pronto"){ VAL.fase = ""; VAL.depois = null; mostrarProblemas(); return; }
    VAL.fase = "quadro"; VAL.progresso = 0;
    VAL.trabalho = custoDoQuadroAosPoucos(C.mapa);
  }
  if (VAL.fase !== "quadro") return;
  const fim = performance.now() + orcamentoMs;
  let r;
  do { r = VAL.trabalho.next(); if (!r.done) VAL.progresso = r.value; } while (!r.done && performance.now() < fim);
  if (!r.done){ $("quadroInfo").textContent = "medindo o pior quadro: " + Math.round(VAL.progresso*100) + "%"; return; }
  VAL.quadro = r.value; VAL.trabalho = null; VAL.fase = ""; VAL.motorVelho = false;
  mostrarProblemas();
  const n = contarNiveis(VAL.lista), depois = VAL.depois;
  VAL.depois = null;
  if (depois) depois(n);
  else faixa("conferido: " + (n.erros ? n.erros + " erro(s)" : "sem erro") + ", " + n.avisos + " aviso(s); " + textoDoQuadro(VAL.quadro));
}
/* o mapa mudou: o que o motor achou fica velho, e a conferencia no meio para */
function envelhecerValidacao(){
  if (VAL.motor || VAL.quadro) VAL.motorVelho = true;
  if (VAL.fase){
    VAL.fase = ""; VAL.trabalho = null;
    if (VAL.depois){ VAL.depois = null; faixa("o mapa mudou no meio da confer\u00eancia: n\u00e3o exportei"); }
  }
  validarLogo();
}
function recomecarValidacao(nome){
  VAL.pura = []; VAL.motor = null; VAL.quadro = null; VAL.motorVelho = false; VAL.lista = [];
  VAL.fase = ""; VAL.trabalho = null; VAL.depois = null; VAL.cache = new Map();
  MACRO.destaque = null; MICRO.destaque = null;
  MACRO.vazio = {img: null, velho: true, quando: 0}; MACRO.visao = null;
  $("nomeNoJogo").value = nomeDoMapa(nome || "");
  validarLogo();
}
/* a pasta mapas/ do jogo: os mapas dela entram no conjunto, e o Exportar
   grava nela */
async function escolherPasta(){
  const h = await window.showDirectoryPicker({id: "mapas-do-jogo", mode: "readwrite"});
  const outros = new Map();
  for await (const [n, f] of h.entries()){
    if (f.kind !== "file" || !/^[a-z0-9-]+\.mapa$/.test(n)) continue;
    const r = lerMapa(await (await f.getFile()).text());
    if (r.mapa) outros.set(n.slice(0, -5), r.mapa);
  }
  VAL.pasta = h; VAL.outros = outros;
  $("pastaInfo").textContent = h.name + "/: " + outros.size + " mapa" + (outros.size === 1 ? "" : "s");
  validarPura();
}
async function exportar(){
  if (!C.mapa) return;
  if (!VAL.pasta && typeof window.showDirectoryPicker === "function"){
    try { await escolherPasta(); }
    catch(e){ if (!e || e.name !== "AbortError") faixa("n\u00e3o abri a pasta: " + (e.message || e)); return; }
  }
  faixa("conferindo tudo antes de exportar " + nomeNoJogo() + "...");
  conferirTudo(gravarExportado);
}
async function gravarExportado(n){
  if (n.erros){ faixa(n.erros + " erro" + (n.erros > 1 ? "s" : "") + ": n\u00e3o exportei -- a lista diz onde"); return; }
  const nome = nomeNoJogo(), texto = escreverMapa(C.mapa);
  const aviso = n.avisos ? " (com " + n.avisos + " aviso" + (n.avisos > 1 ? "s" : "") + ")" : "";
  try {
    if (VAL.pasta){
      const h = await VAL.pasta.getFileHandle(nome + ".mapa", {create: true});
      const w = await h.createWritable(); await w.write(texto); await w.close();
      faixa("exportado para " + VAL.pasta.name + "/" + nome + ".mapa" + aviso + " -- node mundo-perigoso/build.js monta o jogo com ele");
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([texto], {type: "text/plain"}));
      a.download = nome + ".mapa"; a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
      faixa("baixei " + nome + ".mapa" + aviso + ": o navegador n\u00e3o grava em pasta -- ponha em mundo-perigoso/mapas/");
    }
  } catch(e){ faixa("n\u00e3o exportei: " + (e.message || e)); }
}
$("btnConferir").onclick = function(){ conferirTudo(); };
$("btnExportar").onclick = exportar;
$("btnPasta").onclick = async function(){
  if (typeof window.showDirectoryPicker !== "function"){ faixa("este navegador n\u00e3o abre pasta: use o Chrome ou o Edge"); return; }
  try { await escolherPasta(); }
  catch(e){ if (!e || e.name !== "AbortError") faixa("n\u00e3o abri a pasta: " + (e.message || e)); }
};
$("nomeNoJogo").onchange = function(){ this.value = nomeNoJogo(); VAL.motor = null; VAL.quadro = null; validarPura(); };

/* ---------- o alcance ---------- */
function pedirAlcance(){
  if (!C.mapa || ALCANCE.estado === "calculando") return;
  MACRO.vista.alcance = true;
  comecarAlcance(C.mapa, nomeNoJogo());
  faixa("calculando o alcance a partir do inicio do jogador -- a ilha grande leva alguns segundos");
}

/* ---------- as regioes ----------
   Um pedaco do mundo com nome, perigo, musica e som. As regras de jogo
   ainda nao estao decididas: a ferramenta so guarda o dado. */
function regiaoAtual(){
  return C.mapa && C.mapa.regioes.find(function(r){ return r.id === MACRO.valor.regiao; });
}
function listarRegioes(){
  const l = $("listaRegioes");
  l.innerHTML = "";
  const nenhuma = document.createElement("button");
  nenhuma.textContent = "(nenhuma)";
  nenhuma.classList.toggle("ativo", MACRO.valor.regiao === 0);
  nenhuma.onclick = function(){ MACRO.valor.regiao = 0; atualizarPainel(); };
  l.appendChild(nenhuma);
  for (const r of C.mapa.regioes){
    const b = document.createElement("button");
    b.textContent = r.id + ". " + (r.nome || "sem nome");
    b.classList.toggle("ativo", r.id === MACRO.valor.regiao);
    const cor = corDaRegiao(r.id);
    b.style.borderLeft = "6px solid rgb(" + cor.join(",") + ")";
    b.onclick = function(){ MACRO.valor.regiao = r.id; atualizarPainel(); };
    l.appendChild(b);
  }
  const r = regiaoAtual();
  $("nomeRegiao").value = r ? (r.nome || "") : "";
  $("perigoRegiao").value = r && r.campos && r.campos.perigo !== undefined ? r.campos.perigo : 0;
  $("musicaRegiao").value = r && r.campos && r.campos.musica ? r.campos.musica : "";
  $("somRegiao").value = r && r.campos && r.campos.som ? r.campos.som : "";
}
function mexerNaRegiao(fn){
  const r = regiaoAtual();
  if (!r) return;
  acaoDoCanteiro("regiao", function(m, h){ marcarMapaInteiro(h, m); fn(r); });
  atualizarPainel();
}
$("btnNovaRegiao").onclick = function(){
  let maior = 0;
  for (const r of C.mapa.regioes) if (r.id > maior) maior = r.id;
  const nova = {id: maior + 1, nome: "regiao " + (maior + 1), campos: null};
  acaoDoCanteiro("nova regiao", function(m, h){ marcarMapaInteiro(h, m); m.regioes.push(nova); });
  MACRO.valor.regiao = nova.id;
  MACRO.camada = "regiao";
  atualizarPainel();
};
$("nomeRegiao").onchange = function(){ const v = this.value; mexerNaRegiao(function(r){ r.nome = v; }); };
$("perigoRegiao").onchange = function(){ const v = this.value; mexerNaRegiao(function(r){ (r.campos = r.campos || {}).perigo = v; }); };
$("musicaRegiao").onchange = function(){ const v = this.value; mexerNaRegiao(function(r){ (r.campos = r.campos || {}).musica = v; }); };
$("somRegiao").onchange = function(){ const v = this.value; mexerNaRegiao(function(r){ (r.campos = r.campos || {}).som = v; }); };

/* ---------- o mouse no macro ---------- */
const mapa2d = $("mapa2d");
function tileDoEvento(ev){
  const r = mapa2d.getBoundingClientRect();
  const sx = ev.clientX - r.left, sy = ev.clientY - r.top;
  const t = telaParaTileMacro(sx, sy);
  MACRO.mouse.sx = sx; MACRO.mouse.sy = sy; MACRO.mouse.tx = t.tx; MACRO.mouse.ty = t.ty; MACRO.mouse.dentro = true;
  return t;
}
mapa2d.addEventListener("pointerdown", function(ev){
  if (!C.mapa) return;
  const t = tileDoEvento(ev);
  mapa2d.setPointerCapture(ev.pointerId);
  if (ev.button === 1 || MACRO.espaco){ MACRO.arrastandoVista = {sx: ev.clientX, sy: ev.clientY}; return; }
  comecarTracoMacro(t.tx, t.ty, ev.button);
});
mapa2d.addEventListener("pointermove", function(ev){
  if (!C.mapa) return;
  const t = tileDoEvento(ev);
  if (MACRO.arrastandoVista){
    const z = MACRO.cam.zoom;
    MACRO.cam.x -= (ev.clientX - MACRO.arrastandoVista.sx)/z;
    MACRO.cam.y -= (ev.clientY - MACRO.arrastandoVista.sy)/z;
    MACRO.arrastandoVista = {sx: ev.clientX, sy: ev.clientY};
    return;
  }
  if (MACRO.arrasto) seguirTracoMacro(t.tx, t.ty);
});
mapa2d.addEventListener("pointerup", function(ev){
  if (!C.mapa) return;
  const t = tileDoEvento(ev);
  if (MACRO.arrastandoVista){ MACRO.arrastandoVista = null; return; }
  terminarTracoMacro(t.tx, t.ty);
});
mapa2d.addEventListener("pointerleave", function(){ MACRO.mouse.dentro = false; });
mapa2d.addEventListener("contextmenu", function(ev){ ev.preventDefault(); });
mapa2d.addEventListener("wheel", function(ev){
  ev.preventDefault();
  const r = mapa2d.getBoundingClientRect();
  zoomMacro(ev.clientX - r.left, ev.clientY - r.top, ev.deltaY < 0 ? 1.25 : 1/1.25);
}, {passive: false});
addEventListener("resize", function(){ if (MACRO.ligado) ajustarCanvasMacro(); });

/* ---------- botoes ---------- */
$("btnModo").onclick = function(){ trocarModo(); };
$("btnAndar").onclick = function(){ MICRO.voando = !MICRO.voando; P.vz = 0; atualizarPainel(); cvs2.focus(); };
/* Novo leva ao bloco do mapa, no macro: o tamanho e o tipo se escolhem la */
$("btnNovo").onclick = function(){
  trocarModo(true);
  $("blocoMapa").scrollIntoView({block: "center"});
  $("novoLarg").focus();
  faixa("o tamanho e o tipo do mapa novo: no painel, em Mapa, e Criar");
};
$("btnCriar").onclick = function(){
  if (C.sujo && !confirm("O mapa tem mudanca nao salva. Comecar um novo?")) return;
  mapaNovo(+$("novoLarg").value, +$("novoAlt").value, $("novoTipo").value);
  if (MACRO.ligado){ MACRO.jaEnquadrou = true; enquadrarMacro(); }
};
$("btnSalvarComo").onclick = function(){ salvar(true); };
$("btnAbrir").onclick = async function(){
  if (C.sujo && !confirm("O mapa tem mudanca nao salva. Abrir outro?")) return;
  try {
    const h = await escolherArquivo();
    if (h){ ARQ.handle = h; ARQ.nome = h.name; abrirTexto(await lerHandle(h), h.name); return; }
  } catch(e){ if (e && e.name === "AbortError") return; }
  $("entradaArquivo").click();
};
$("entradaArquivo").onchange = async function(){
  const f = this.files[0];
  if (f){ ARQ.handle = null; ARQ.nome = f.name; abrirTexto(await f.text(), f.name); }
  this.value = "";
};
$("btnSalvar").onclick = function(){ salvar(false); };
async function salvar(comoNovo){
  if (!C.mapa) return;
  const texto = escreverMapa(C.mapa);
  try {
    const r = await gravar(texto, comoNovo);
    C.sujo = false;
    apagarRascunho();
    $("arquivoNome").textContent = ARQ.nome || "(sem arquivo)";
    faixa(r === "baixado" ? "baixei uma copia: o navegador nao deixa gravar por cima" : "gravado em " + ARQ.nome);
  } catch(e){
    if (e && e.name === "AbortError") return;
    faixa("nao gravei: " + (e.message || e));
  }
  atualizarPainel();
}
/* Ver no jogo: o mapa vai pelo armazenamento e o jogo abre onde a camera
   esta, olhando para onde ela olha -- o "comecar daqui" do editor. */
function verNoJogo(){
  if (!C.mapa) return;
  const erro = mandarParaOJogo(escreverMapa(C.mapa), {x: P.x, y: P.y, graus: P.ang*180/Math.PI});
  faixa(erro ? "nao consegui passar o mapa para o jogo: " + erro : "abri o jogo em " + P.x.toFixed(0) + ", " + P.y.toFixed(0));
}
$("btnJogar").onclick = verNoJogo;
/* ---------- o mapa: nome, mar, semente, tamanho ----------
   Cada mudanca e uma acao de mapa inteiro, com o seu Ctrl+Z. */
function mexerNoMapa(nome, fn){
  if (!C.mapa) return;
  acaoDoCanteiro(nome, function(m, h){ marcarMapaInteiro(h, m); fn(m); });
  atualizarPainel();
}
$("mapaNome").onchange = function(){
  const v = this.value.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9_.-]/g, "") || "sem-nome";
  this.value = v;
  if (C.mapa && v !== C.mapa.nome) mexerNoMapa("nome", function(m){ m.nome = v; });
};
$("mapaMar").onchange = function(){
  const v = Math.max(0, Math.min(alturaMaxima(C.mapa), +this.value | 0));
  if (C.mapa && v !== C.mapa.mar) mexerNoMapa("mar", function(m){ m.mar = v; });
};
$("mapaSemMar").onchange = function(){
  const semMar = this.checked;
  mexerNoMapa("mar", function(m){ m.mar = semMar ? null : 4; });
};
$("mapaSemente").onchange = function(){
  const v = this.value === "" ? null : Math.max(1, +this.value | 0);
  if (C.mapa && v !== C.mapa.semente) mexerNoMapa("semente", function(m){ m.semente = v; });
};
$("btnSortearSemente").onclick = function(){
  const v = 1 + Math.floor(Math.random()*999999);
  mexerNoMapa("semente", function(m){ m.semente = v; });
  faixa("semente " + v + ": o sorteio das passagens secretas muda com ela");
};
$("btnRedimensionar").onclick = function(){
  if (!C.mapa) return;
  const w = Math.max(8, Math.min(2048, +$("redLarg").value || C.mapa.larg));
  const h = Math.max(8, Math.min(2048, +$("redAlt").value || C.mapa.alt));
  if (w === C.mapa.larg && h === C.mapa.alt) return;
  const ancora = $("redAncora").value;
  mexerNoMapa("redimensionar", function(m){ copiarPara(m, redimensionar(m, w, h, ancora)); });
  MACRO.jaEnquadrou = true; enquadrarMacro();
  faixa("o mapa agora tem " + w + "x" + h + " -- Ctrl+Z volta");
};
/* ---------- a imagem de referencia ---------- */
$("btnRef").onclick = function(){ $("entradaRef").click(); };
$("entradaRef").onchange = function(){
  const f = this.files && this.files[0];
  this.value = "";
  if (!f) return;
  const img = new Image();
  img.onload = function(){
    MACRO.ref = {img: img, opac: +$("refOpac").value/100};
    $("blocoRef").hidden = false; $("btnRefTirar").hidden = false;
  };
  img.onerror = function(){ faixa("n\u00e3o consegui ler a imagem"); };
  img.src = URL.createObjectURL(f);
};
$("refOpac").oninput = function(){ if (MACRO.ref) MACRO.ref.opac = +this.value/100; };
$("btnRefTirar").onclick = function(){ MACRO.ref = null; $("blocoRef").hidden = true; this.hidden = true; };
$("btnGirarCarimbo").onclick = function(){ if (MACRO.carimbo){ MACRO.carimbo = girarCarimbo(MACRO.carimbo); atualizarPainel(); } };
$("btnLargarCarimbo").onclick = function(){ MACRO.carimbo = null; atualizarPainel(); };
$("btnCopiar").onclick = function(){ copiarSelecao(false); cvs2.focus(); };
$("btnColar").onclick = function(){ comecarAColar(); cvs2.focus(); };
$("btnApagarSel").onclick = function(){ apagarSelecao(); cvs2.focus(); };
$("btnSalvarModelo").onclick = salvarModelo;
$("btnAbrirModelo").onclick = abrirModelo;
$("entradaModelo").onchange = async function(){
  const f = this.files && this.files[0];
  if (f) usarModelo(await f.text(), f.name);
  this.value = "";
};
$("btnAlcance").onclick = pedirAlcance;
/* O estilo mora na construcao. Escolher outro estilo no meio de uma casa ja
   comecada abre uma construcao nova com ele; para mudar a casa inteira, e o
   botao "Trocar o estilo dela". */
function escolherEstilo(id){
  MICRO.estilo = id;
  const c = C.mapa && C.mapa.construcoes.find(function(k){ return k.id === MICRO.construcao; });
  if (c && c.estilo !== id){
    MICRO.construcao = maiorConstrucao(C.mapa) + 1;
    faixa("construcao nova (" + MICRO.construcao + ") em " + ESTILOS[id].nome +
          " -- para mudar a casa de antes, volte nela e use \"Trocar o estilo dela\"");
  }
  atualizarPainel();
}
$("btnNovaConstrucao").onclick = function(){
  MICRO.construcao = maiorConstrucao(C.mapa) + 1;
  atualizarPainel(); cvs2.focus();
};
$("btnTrocarEstilo").onclick = function(){
  const id = MICRO.construcao, estilo = MICRO.estilo;
  const mudou = acaoDoCanteiro("trocar o estilo da construcao", function(m, h){
    marcarPecas(h, m);
    const c = m.construcoes.find(function(k){ return k.id === id; });
    if (c) c.estilo = estilo;
    for (const p of m.pecas) if (p.construcao === id) delete p.estilo;
  });
  faixa(mudou ? "a construcao " + id + " virou " + estilo : "nada mudou");
  cvs2.focus();
};

/* ---------- soltar arquivo ---------- */
const area = $("area");
area.addEventListener("dragover", function(ev){ ev.preventDefault(); $("soltar").hidden = false; });
area.addEventListener("dragleave", function(){ $("soltar").hidden = true; });
area.addEventListener("drop", async function(ev){
  ev.preventDefault();
  $("soltar").hidden = true;
  const item = ev.dataTransfer.items && ev.dataTransfer.items[0];
  const f = ev.dataTransfer.files[0];
  if (!f) return;
  const pedido = item && item.getAsFileSystemHandle ? item.getAsFileSystemHandle().catch(function(){ return null; }) : Promise.resolve(null);
  const texto = await f.text();
  const h = await pedido;
  ARQ.handle = h && h.kind === "file" ? h : null;
  ARQ.nome = f.name;
  abrirTexto(texto, f.name);
});

/* ---------- o laco ---------- */
let ultimo = performance.now();
/* Um erro no meio do quadro nao pode parar o laco: a ferramenta congelava
   inteira. Ele aparece na faixa uma vez, e o laco segue. */
let erroDoLaco = "";
function laco(agora){
  requestAnimationFrame(laco);
  try { passoDoLaco(agora); }
  catch(e){
    const msg = String(e && e.message || e);
    if (msg !== erroDoLaco){ erroDoLaco = msg; console.error(e); faixa("erro no quadro: " + msg); }
  }
}
function passoDoLaco(agora){
  const dt = Math.min(0.25, Math.max(0, (agora - ultimo)/1000));
  ultimo = agora;
  if (C.mapa){
    /* o alcance anda aos poucos: mais depressa no macro, onde se ve */
    if (ALCANCE.estado === "calculando"){
      passoDoAlcance(MACRO.ligado || VAL.fase ? 20 : 4);
      if (ALCANCE.estado === "pronto"){
        VAL.motor = ALCANCE.problemas; VAL.motorVelho = false;
        mostrarProblemas();
        if (!VAL.fase) faixa(textoDoAlcance());
      } else if (VAL.fase) $("quadroInfo").textContent = textoDoAlcance();
    }
    if (VAL.fase) passoDaConferencia(20);
    if (REGUA.estado === "medindo"){
      const r = passoDaRegua(20);
      if (r){ MACRO.medida = r; faixa(textoDaRegua()); }
      else faixa(textoDaRegua());
    }
    if (MACRO.ligado) desenharMacro();
    else { passoDoMicro(dt); desenharMicro(); }
  }
  if (faixaT && agora > faixaT){ $("faixa").hidden = true; faixaT = 0; }
  status();
}

/* ---------- comeco ---------- */
MICRO.texVerde = texturaPontilhada("#7fb069");
MICRO.texVermelha = texturaPontilhada("#d0503a");
MICRO.texAmarela = texturaPontilhada("#e8c040");
atualizarPainel();
requestAnimationFrame(laco);

(async function(){
  const busca = new URLSearchParams(location.search);
  const caminho = busca.get("abrir");
  if (caminho){
    try {
      const t = await fetch(caminho).then(function(r){ if (!r.ok) throw new Error(r.status); return r.text(); });
      if (abrirTexto(t, caminho.split("/").pop())) return;
    } catch(e){ faixa("nao abri " + caminho + ": " + e.message); }
  }
  const rascunho = lerRascunho();
  mapaNovo();
  if (rascunho){
    faixa("Achei um rascunho de " + new Date(rascunho.quando).toLocaleString() +
      (rascunho.nome ? " (" + rascunho.nome + ")" : "") + ".", [
      {nome: "Recuperar", fazer: function(){
        ARQ.nome = rascunho.nome || "";
        if (abrirTexto(rascunho.texto, ARQ.nome)){
          if (rascunho.onde){ P.x = rascunho.onde.x; P.y = rascunho.onde.y; P.z = rascunho.onde.z; P.ang = rascunho.onde.ang; P.pitch = rascunho.onde.pitch; }
          C.sujo = true;
        }
      }},
      {nome: "Descartar", fazer: function(){ apagarRascunho(); }}
    ]);
  }
})();
})();
