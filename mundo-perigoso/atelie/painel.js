/* ============================================================
   ATELIE -- O PAINEL
   ------------------------------------------------------------
   Liga tudo: as etapas, o mouse na vista, os arquivos e o desfazer. Toda
   regra mora nos modulos (corpo, rig, pesos, deformar, animacao, captura,
   validar, arquivos); aqui so se escolhe, chama e redesenha.
   ============================================================ */
(function(){
"use strict";
const $ = function(id){ return document.getElementById(id); };
const vista = novaVista($("gl"), $("sobre"), $("sob"));

const PECAS_DO_JOGO = {
  roupa: ["nenhuma", "camisa", "tunica"], armadura: ["roupa", "couro", "malha", "placas"],
  cabelo: ["careca", "curto", "longo", "rabo"], elmo: ["nenhum", "capuz", "elmo", "fechado"],
  capa: ["nenhuma", "capa"], escudo: ["nenhum", "redondo"],
  arma: ["nenhuma", "adaga", "espada", "cajado", "arco", "grimorio"], enfeite: ["nenhum", "pena", "faixa", "brasao"]
};
const RITMO = {andar: 150, correr: 90, atacar: 220, conjurar: 260, arco: 300, parado: 400, respirar: 400, pulo: 400, bloquear: 400};
const CHAVE_RASCUNHO = "atelie:rascunho";

const E = {
  proj: null, etapa: "esculpir", sujo: false, nomeArquivo: null, handle: null, handleExport: null, handlePele: null,
  ferr: "por", cor: 1, juntaSel: null, ossoPeso: INDICE_OSSO.antebracoE, modoPeso: "somar", verPosado: false,
  animacao: "andar", quadro: 0, ossoAnim: "bracoE", tocando: false, copia: null, captura: null, capturaPoses: null,
  refs: {}, vistaNome: "livre", validacao: null, desfazer: [], refazer: [], cacheParado: null
};

/* ---------- utilidades ---------- */
function status(t){ $("status").innerHTML = t; }
function marcarSujo(){ E.sujo = true; $("sujo").hidden = false; E.validacao = null; atualizarSelo(); agendarRascunho(); }
function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]; }); }
function poseAtual(){ return E.proj.animacoes[E.animacao][E.quadro]; }
function anim(){ return ANIMACOES_DO_JOGO.find(function(a){ return a.nome === E.animacao; }); }
/* instantaneo do que nao e voxel, para o desfazer do rig e da animacao */
function lembrar(){
  if (!E.proj) return;
  E.desfazer.push(JSON.stringify({juntas: E.proj.juntas, animacoes: E.proj.animacoes, repouso: E.proj.repouso}));
  if (E.desfazer.length > 100) E.desfazer.shift();
  E.refazer.length = 0;
}
function voltarInstantaneo(de, para){
  const s = de.pop();
  if (!s) return false;
  para.push(JSON.stringify({juntas: E.proj.juntas, animacoes: E.proj.animacoes, repouso: E.proj.repouso}));
  const o = JSON.parse(s);
  E.proj.juntas = o.juntas; E.proj.animacoes = o.animacoes; E.proj.repouso = o.repouso;
  return true;
}

/* ---------- a grade que a vista mostra ---------- */
function gradeDoCorpo(colorir){
  const c = E.proj.corpo, lim = limitesDoCorpo(c);
  return {x0: lim[0] - 1, y0: lim[1] - 1, z0: lim[2] - 1, x1: lim[3] + 1, y1: lim[4] + 1, z1: lim[5] + 1,
    cheio: function(x, y, z){ const i = celula(c, x, y, z); return i < 0 ? 0 : (c.cor[i] ? i + 1 : 0); },
    cor: colorir || function(v){ return c.paleta[c.cor[v - 1] - 1] || [255, 0, 255]; }};
}
function gradePosada(g){
  const c = E.proj.corpo, D = GRADE;
  return {x0: 0, y0: 0, z0: 0, x1: D.DX - 1, y1: D.DY - 1, z1: D.DZ - 1,
    cheio: function(x, y, z){ return x < 0 || y < 0 || z < 0 || x >= D.DX || y >= D.DY || z >= D.DZ ? 0 : g[(z*D.DY + y)*D.DX + x]; },
    cor: function(v){ return c.paleta[v - 1] || [255, 0, 255]; }};
}
function calor(w){
  const pts = [[40, 60, 160], [40, 170, 90], [230, 210, 60], [230, 70, 40]];
  const t = Math.max(0, Math.min(1, w))*3, i = Math.min(2, Math.floor(t)), f = t - i;
  return [0, 1, 2].map(function(k){ return pts[i][k] + (pts[i + 1][k] - pts[i][k])*f; });
}
let posadoAtual = null;
function reconstruir(){
  if (!E.proj){ vista.grade = null; vista.montarMalha(); vista.desenhar(); return; }
  const c = E.proj.corpo;
  vista.pontos = []; vista.ossos = []; vista.cursor = null;
  if (E.etapa === "animar" || E.etapa === "exportar" || (E.etapa === "peso" && E.verPosado)){
    const pose = E.etapa === "peso" ? quadrosDoProjeto(E.proj.animacoes)[+$("poseTestePeso").value || 0].pose : poseAtual();
    posadoAtual = posarCorpo(c, E.proj.juntas, pose);
    vista.grade = gradePosada(posadoAtual.g);
    if (E.etapa === "animar") mostrarEsqueleto(posadoAtual.juntas, true);
    checarQuadro();
  } else if (E.etapa === "peso"){
    const b = E.ossoPeso;
    vista.grade = gradeDoCorpo(function(v){ const w = pesoDoOsso(c, v - 1, b); return w > 0.002 ? calor(w) : [74, 68, 62]; });
    mostrarEsqueleto(E.proj.juntas, false, true);
  } else {
    vista.grade = gradeDoCorpo(E.etapa === "rig" ? function(v){ const p = c.paleta[c.cor[v - 1] - 1] || [128, 128, 128]; return p.map(function(k){ return 60 + k*0.5; }); } : null);
    if (E.etapa === "rig") mostrarEsqueleto(E.proj.juntas, false);
  }
  vista.montarMalha();
  vista.desenhar();
}
function mostrarEsqueleto(J, posado, soOssos){
  vista.ossos = OSSOS.map(function(o){ return {a: J[o.pivo], b: J[o.nome === "cabeca" ? "topoCabeca" : o.ponta],
    cor: posado && o.nome === E.ossoAnim ? "rgba(255,224,138,0.95)" : "rgba(232,184,96,0.7)"}; });
  if (soOssos) return;
  const nomes = posado ? JUNTAS : TODOS_OS_PONTOS.filter(function(n){ return n !== "meioQuadril" && n !== "meioOmbro"; });
  vista.pontos = nomes.map(function(n){ return {nome: n, pos: J[n], extra: PONTOS_EXTRAS.indexOf(n) >= 0,
    cor: posado && /^(mao|pe)[ED]$/.test(n) ? "#7fd0a0" : null}; });
  vista.selecionado = posado ? null : E.juntaSel;
}
function redesenhar(){ vista.desenhar(); }

/* ---------- etapas ---------- */
function irPara(etapa){
  if (emOutraResolucao() && etapa !== "animar"){
    status('<span class="aviso">Em ' + Math.round(E.proj.escala*117) + ' voxels s\u00f3 se olha e se anima. Volte para 117 para esculpir, mexer no rig e no peso, validar e exportar.</span>');
    return;
  }
  E.etapa = etapa;
  document.querySelectorAll("#etapas button").forEach(function(b){ b.classList.toggle("ativo", b.dataset.etapa === etapa); });
  document.querySelectorAll("#lado section").forEach(function(s){ s.hidden = s.dataset.painel !== etapa; });
  $("previaQuadro").hidden = etapa !== "previa";
  $("vistas").hidden = etapa === "previa";
  pararDeTocar();
  if (etapa === "rig") montarListaJuntas();
  if (etapa === "peso") montarListaOssos();
  if (etapa === "animar") montarAnimar();
  if (etapa === "previa" && E.proj && !$("previaQuadro").src) assarPrevia();
  aplicarReferencia();
  reconstruir();
}
document.querySelectorAll("#etapas button").forEach(function(b){ b.onclick = function(){ irPara(b.dataset.etapa); }; });
function olhar(nome){
  E.vistaNome = nome;
  vista.olhar(nome);
  document.querySelectorAll("#vistas button").forEach(function(b){ b.classList.toggle("ativo", b.dataset.vista === nome); });
  aplicarReferencia();
  redesenhar();
}
document.querySelectorAll("#vistas button").forEach(function(b){ b.onclick = function(){ olhar(b.dataset.vista); }; });
function enquadrar(){
  const K = resolucaoAtual(), r = $("area").getBoundingClientRect(), largo = (E.etapa === "animar" ? 80 : 120)*K;
  vista.cam.zoom = Math.max(1, Math.min((r.height - 60)/(125*K), (r.width - 40)/largo));
  vista.cam.alvo = [CENTRO.CX, CENTRO.CY, 58*K];
}

/* ---------- a resolucao ----------
   O mesmo personagem em 117, 165 ou 256 voxels (resolucao.js). Em outra
   resolucao o projeto e refeito da fonte de alta resolucao, e so se olha e se
   anima: as poses voltam para 117 (a raiz divide pela escala) ao trocar de
   volta ou ao salvar. */
E.cacheResolucao = {};
function emOutraResolucao(){ return !!(E.proj && E.proj.derivadoDe); }
function projetoParaSalvar(){
  if (!emOutraResolucao()) return E.proj;
  const base = E.proj.derivadoDe;
  base.animacoes = animacoesDeVolta(E.proj);
  return base;
}
function trocarResolucao(altura){
  if (!E.proj) return;
  const sel = $("resolucao"), K = altura/117, base = emOutraResolucao() ? E.proj.derivadoDe : E.proj, sujo = E.sujo, etapaAntes = E.etapa;
  if (K !== 1 && !base.fonte){ sel.value = "117"; status('<span class="aviso">Este projeto s\u00f3 existe em 117 voxels: n\u00e3o guarda a fonte de alta resolu\u00e7\u00e3o.</span>'); return; }
  if (emOutraResolucao()){
    base.animacoes = animacoesDeVolta(E.proj);          // o que se animou volta para 117
    E.restaurarResolucao(); E.restaurarResolucao = null;
  }
  function pronto(p, etapa, msg){
    E.etapa = etapa;
    usarProjeto(p, E.nomeArquivo);
    if (sujo){ E.sujo = true; $("sujo").hidden = false; }
    status(msg);
    /* o quadro so tem o tamanho certo depois do navegador refazer o layout */
    requestAnimationFrame(function(){ enquadrar(); redesenhar(); });
  }
  if (K === 1){ pronto(base, etapaAntes, "de volta em 117 voxels; as poses que voc\u00ea mexeu continuam"); return; }
  status("refazendo o corpo em " + altura + " voxels, o peso e as poses (leva uns segundos)...");
  setTimeout(function(){
    const t0 = performance.now();
    E.restaurarResolucao = usarResolucao(K);
    try {
      /* refazer o corpo em alta leva segundos (o peso e o mais lento): guarda por escala, e so refaz se o esqueleto ou a fonte mudaram */
      const chave = altura + "|" + JSON.stringify(base.juntas) + JSON.stringify(base.larguras) + !!base.pano;
      let d = E.cacheResolucao[altura] && E.cacheResolucao[altura].base === base && E.cacheResolucao[altura].chave === chave ? E.cacheResolucao[altura].proj : null;
      if (d){
        d.animacoes = {}; d.repouso = escalarPose(base.repouso, K);
        for (const a in base.animacoes) d.animacoes[a] = base.animacoes[a].map(function(p){ return escalarPose(p, K); });
      } else { d = projetoEm(base, K); E.cacheResolucao[altura] = {base: base, chave: chave, proj: d}; }
      pronto(d, "animar", altura + " voxels em " + Math.round((performance.now() - t0)/100)/10 + " s: aqui se olha e se anima; para esculpir, rig, peso e exportar, volte para 117");
    } catch(e){
      E.restaurarResolucao(); E.restaurarResolucao = null;
      pronto(base, etapaAntes, '<span class="aviso">' + esc(e.message) + "</span>");
    }
  }, 30);
}
$("resolucao").onchange = function(){ trocarResolucao(+this.value); };

/* ---------- o projeto ---------- */
function usarProjeto(proj, nome){
  E.proj = proj; E.nomeArquivo = nome || null; E.sujo = false; E.validacao = null; E.cacheParado = null;
  $("panoPeso").checked = !!proj.pano;
  { const base = proj.derivadoDe || proj, sel = $("resolucao");
    sel.value = String(Math.round((proj.derivadoDe ? proj.escala : 1)*117)); sel.disabled = !base.fonte;
    $("rotuloResolucao").title = base.fonte ? "Ver o mesmo personagem em 117, 165 ou 256 voxels (em 165 e 256 so se olha e se anima)." : "Este projeto so existe em 117 voxels: nao guarda a fonte de alta resolucao."; }
  E.desfazer = []; E.refazer = []; E.quadro = 0; E.juntaSel = null;
  $("sujo").hidden = true;
  $("nomeProjeto").textContent = (nome || proj.nome) + "  -  " + voxelsDoCorpo(proj.corpo).length + " voxels";
  $("previaQuadro").removeAttribute("src");
  montarPaleta(); atualizarInfoCorpo(); atualizarSelo();
  enquadrar();
  irPara(E.etapa);
  if (proj.avisosDoRig && proj.avisosDoRig.length) status('<span class="aviso">' + esc(proj.avisosDoRig.join(" ")) + "</span>");
}
function atualizarSelo(){
  const s = $("selo"), v = E.validacao;
  s.className = v ? (v.erros.length ? "erro" : "ok") : "";
  s.textContent = !v ? "n\u00e3o validado" : v.erros.length ? v.erros.length + " erro(s)" : "v\u00e1lido" + (v.avisos.length ? ", " + v.avisos.length + " aviso(s)" : "");
}
function atualizarInfoCorpo(){
  if (!E.proj) return;
  const c = E.proj.corpo, n = voxelsDoCorpo(c).length, lim = limitesDoCorpo(c);
  $("infoCorpo").textContent = n + " voxels; de x " + lim[0] + " a " + lim[3] + ", y " + lim[1] + " a " + lim[4] + ", z " + lim[2] + " a " + lim[5] + ".";
  $("coresN").textContent = c.paleta.length + " / " + MAX_CORES_DO_CORPO;
  $("coresN").className = "valor" + (c.paleta.length > MAX_CORES_DO_CORPO ? " erro" : "");
}

/* ---------- arquivos ---------- */
async function abrirArquivo(arq, handle){
  const nome = arq.name, ext = (nome.match(/\.[^.]+$/) || [""])[0].toLowerCase();
  try {
    if (ext === ".bvh" || ext === ".json"){ return importarCaptura(await arq.text(), ext, nome); }
    if (/^image\//.test(arq.type)){ return carregarReferencia(arq, E.vistaNome === "livre" || E.vistaNome === "cima" ? "frente" : E.vistaNome); }
    status("lendo " + esc(nome) + "&hellip;");
    await new Promise(function(r){ setTimeout(r, 20); });
    let proj;
    if (ext === ".atelie") proj = lerProjeto(await arq.text());
    else if (ext === ".pele") proj = lerPele(await arq.text());
    else {
      const fonte = ext === ".wgvox" ? lerWgvox(await arq.arrayBuffer()) : ext === ".vox" ? lerVox(await arq.arrayBuffer())
                  : ext === ".personagem" ? lerPersonagemTexto(await arq.text()) : null;
      if (!fonte) throw new Error("formato desconhecido: " + ext);
      const t0 = performance.now();
      const corpo = importarModelo(fonte, {nome: nome.replace(/\..*$/, "").toLowerCase().replace(/[^a-z0-9-]/g, "") || "humano"});
      proj = novoProjeto(corpo);
      status("importado em " + Math.round(performance.now() - t0) + " ms: rig proposto, peso calculado, poses de partida redirecionadas");
      handle = null;
    }
    E.handle = ext === ".atelie" ? handle || null : null;
    usarProjeto(proj, ext === ".atelie" ? nome : null);
    if (ext === ".atelie" || ext === ".pele") status("aberto " + esc(nome));
  } catch(e){ status('<span class="erro">' + esc(e.message) + "</span>"); console.error(e); }
}
$("btnAbrir").onclick = async function(){
  if (window.showOpenFilePicker){
    try {
      const hs = await showOpenFilePicker({types: [{description: "Projeto, pele ou modelo", accept: {"application/octet-stream": [".atelie", ".pele", ".wgvox", ".vox", ".personagem"]}}]});
      return abrirArquivo(await hs[0].getFile(), hs[0]);
    } catch(e){ if (e.name !== "AbortError") status(esc(e.message)); return; }
  }
  $("entrada").click();
};
$("entrada").onchange = function(){ if (this.files[0]) abrirArquivo(this.files[0]); this.value = ""; };
$("btnExemplo").onclick = function(){ usarProjeto(novoProjeto(corpoDeExemplo())); status("corpo de exemplo: rig proposto e peso calculado"); };
async function gravar(texto, sugestao, chaveHandle, descricao){
  if (window.showSaveFilePicker){
    try {
      if (!E[chaveHandle]) E[chaveHandle] = await showSaveFilePicker({suggestedName: sugestao, types: [{description: descricao, accept: {"text/plain": [sugestao.replace(/^[^.]*/, "")]}}]});
      const w = await E[chaveHandle].createWritable();
      await w.write(texto); await w.close();
      return E[chaveHandle].name;
    } catch(e){ if (e.name === "AbortError") return null; E[chaveHandle] = null; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], {type: "text/plain"}));
  a.download = sugestao; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  return sugestao + " (baixado)";
}
async function salvar(){
  if (!E.proj) return;
  const nome = await gravar(salvarProjeto(projetoParaSalvar()), E.proj.nome + ".atelie", "handle", "Projeto do atelie");
  if (!nome) return;
  E.sujo = false; $("sujo").hidden = true; E.nomeArquivo = nome;
  try { localStorage.removeItem(CHAVE_RASCUNHO); } catch(e){}
  status("gravado " + esc(nome));
}
$("btnSalvar").onclick = salvar;
/* rascunho: a cada pausa o projeto vai para o navegador */
let tRascunho = 0;
function agendarRascunho(){
  clearTimeout(tRascunho);
  tRascunho = setTimeout(function(){
    try { localStorage.setItem(CHAVE_RASCUNHO, salvarProjeto(projetoParaSalvar())); } catch(e){}
  }, 4000);
}
(function(){
  let r = null;
  try { r = localStorage.getItem(CHAVE_RASCUNHO); } catch(e){}
  if (!r) return;
  $("faixaTexto").textContent = "Tem um rascunho que n\u00e3o foi salvo.";
  $("faixa").hidden = false;
  $("faixaSim").onclick = function(){ $("faixa").hidden = true; try { usarProjeto(lerProjeto(r)); E.sujo = true; $("sujo").hidden = false; } catch(e){ status(esc(e.message)); } };
  $("faixaNao").onclick = function(){ $("faixa").hidden = true; try { localStorage.removeItem(CHAVE_RASCUNHO); } catch(e){} };
})();
/* arrastar arquivo para a tela */
(function(){
  const area = $("area");
  area.addEventListener("dragover", function(ev){ ev.preventDefault(); $("soltar").hidden = false; });
  area.addEventListener("dragleave", function(){ $("soltar").hidden = true; });
  area.addEventListener("drop", function(ev){
    ev.preventDefault(); $("soltar").hidden = true;
    const f = ev.dataTransfer.files[0];
    if (f) abrirArquivo(f);
  });
})();

/* ---------- 1. esculpir ---------- */
function montarPaleta(){
  const c = E.proj.corpo, el = $("paleta");
  el.innerHTML = "";
  c.paleta.forEach(function(p, k){
    const d = document.createElement("div");
    d.style.background = "rgb(" + p.join(",") + ")";
    d.title = "cor " + (k + 1) + ": #" + hex(p);
    d.classList.toggle("ativo", E.cor === k + 1);
    d.onclick = function(){ E.cor = k + 1; montarPaleta(); $("corNova").value = "#" + hex(p); };
    el.appendChild(d);
  });
  atualizarInfoCorpo();
}
function escolherFerramenta(f){
  E.ferr = f;
  document.querySelectorAll("#ferramentas button").forEach(function(b){ b.classList.toggle("ativo", b.dataset.ferr === f); });
}
document.querySelectorAll("#ferramentas button").forEach(function(b){ b.onclick = function(){ escolherFerramenta(b.dataset.ferr); }; });
escolherFerramenta("por");
function valorDo(id, fmt){ const el = $(id), v = $(id + "V"); function at(){ if (v) v.textContent = fmt ? fmt(el.value) : el.value; } el.addEventListener("input", at); at(); }
valorDo("raioVoxel"); valorDo("raioPeso"); valorDo("forcaPeso", function(v){ return Math.round(v*100) + "%"; });
$("btnCorNova").onclick = function(){
  if (!E.proj) return;
  const h = $("corNova").value, rgb = deHex(h.slice(1));
  E.cor = corNaPaleta(E.proj.corpo, rgb); montarPaleta(); marcarSujo();
};
$("btnCorTrocar").onclick = function(){
  if (!E.proj || !E.cor) return;
  E.proj.corpo.paleta[E.cor - 1] = deHex($("corNova").value.slice(1));
  E.proj.corpo.versao++; montarPaleta(); marcarSujo(); reconstruir();
};
$("btnRuido").onclick = function(){
  if (!E.proj) return;
  const c = E.proj.corpo, antes = c.cor.slice();
  abrirAcao(c, "salpicado");
  const n = limparRuido(c, 1);
  for (let i = 0; i < antes.length; i++) if (antes[i] !== c.cor[i]){ const novo = c.cor[i]; c.cor[i] = antes[i]; mudarCelula(c, i, novo); }
  fecharAcao(c); marcarSujo(); reconstruir(); status(n + " voxels trocados de cor");
};
$("btnSolido").onclick = function(){
  if (!E.proj) return;
  const n = solidificar(E.proj.corpo); marcarSujo(); reconstruir(); status(n + " voxels por dentro enchidos");
};
$("opacRef").oninput = function(){ vista.opacidadeRef = +this.value; redesenhar(); };
let refPedida = "frente";
document.querySelectorAll("[data-ref]").forEach(function(b){ b.onclick = function(){ refPedida = b.dataset.ref; $("entradaImagem").click(); }; });
$("entradaImagem").onchange = function(){ if (this.files[0]) carregarReferencia(this.files[0], refPedida); this.value = ""; };
function carregarReferencia(arq, qual){
  const img = new Image();
  img.onload = function(){ E.refs[qual] = img; if (E.etapa !== "esculpir") irPara("esculpir"); olhar(qual); status("refer\u00eancia de " + qual + " carregada"); };
  img.src = URL.createObjectURL(arq);
}
function aplicarReferencia(){
  const v = E.vistaNome, img = E.etapa === "esculpir" || E.etapa === "rig" ? E.refs[v] : null;
  vista.referencia = img ? {img: img, vista: v} : null;
}

/* ---------- 2. rig ---------- */
function montarListaJuntas(){
  if (!E.proj) return;
  const el = $("listaJuntas"), J = E.proj.juntas;
  el.innerHTML = "";
  for (const n of TODOS_OS_PONTOS){
    if (n === "meioQuadril" || n === "meioOmbro") continue;
    const l = document.createElement("div");
    l.className = "juntaLinha" + (E.juntaSel === n ? " ativo" : "");
    const s = document.createElement("span"); s.textContent = n; s.onclick = function(){ E.juntaSel = n; montarListaJuntas(); reconstruir(); };
    l.appendChild(s);
    [0, 1, 2].forEach(function(e){
      const inp = document.createElement("input"); inp.type = "number"; inp.step = "0.5"; inp.value = J[n][e];
      inp.onchange = function(){ lembrar(); moverJunta(n, e, +inp.value); rigMudou(); };
      l.appendChild(inp);
    });
    el.appendChild(l);
  }
  const R = REPOUSO_DO_JOGO, cmp = function(a, b, J2){ return vDist(J2[a], J2[b]).toFixed(1); };
  $("comprimentos").innerHTML = [["bra\u00e7o", "ombroE", "cotoveloE"], ["antebra\u00e7o", "cotoveloE", "maoE"], ["coxa", "quadrilE", "joelhoE"], ["canela", "joelhoE", "peE"], ["ombro a ombro", "ombroE", "ombroD"]]
    .map(function(t){ return t[0] + ": <b>" + cmp(t[1], t[2], J) + "</b> (jogo " + cmp(t[1], t[2], R) + ")"; }).join("<br>");
  $("avisosRig").innerHTML = (E.proj.avisosDoRig || []).map(function(a){ return '<span class="aviso">' + esc(a) + "</span>"; }).join("<br>");
}
function moverJunta(n, eixo, valor){
  const J = E.proj.juntas;
  J[n][eixo] = valor;
  const m = espelhoDoNome(n);
  if ($("espelhoRig").checked){
    if (m !== n) J[m][eixo] = eixo === 0 ? espelhoX(valor) : valor;
    else if (eixo === 0) J[n][0] = CENTRO.CX;
  }
}
/* o rig mudou: pontos derivados, peso recalculado (o pintado fica) e o repouso */
function rigMudou(){
  const P = E.proj;
  completarPontos(P.juntas);
  calcularPesos(P.corpo, P.juntas, {larguras: P.larguras, pano: !!P.pano});
  E.cacheParado = null;
  marcarSujo(); montarListaJuntas(); reconstruir();
  status("rig mudou: peso recalculado");
}
$("btnProporRig").onclick = function(){
  if (!E.proj) return;
  lembrar();
  const r = proporRig(E.proj.corpo);
  E.proj.juntas = r.juntas; E.proj.avisosDoRig = r.avisos;
  E.proj.repouso = repousoDoRig(r.juntas);
  rigMudou();
};
$("btnSimetrizar").onclick = function(){ if (!E.proj) return; lembrar(); E.proj.juntas = simetrizar(E.proj.juntas); rigMudou(); };

/* ---------- 3. peso ---------- */
function montarListaOssos(){
  if (!E.proj) return;
  const el = $("listaOssos");
  el.innerHTML = "";
  OSSOS.forEach(function(o, b){
    const d = document.createElement("div");
    d.textContent = o.nome;
    d.className = b === E.ossoPeso ? "ativo" : "";
    d.onclick = function(){ E.ossoPeso = b; montarListaOssos(); reconstruir(); };
    el.appendChild(d);
  });
  const L = $("larguras");
  if (!L.childElementCount){
    for (const o of OSSOS){
      if (o.iPai < 0) continue;
      const l = document.createElement("div"); l.className = "linha";
      l.innerHTML = '<span class="rotulo">' + o.pivo + '</span><input type="range" min="0" max="10" step="0.5"><span class="valor"></span>';
      const r = l.querySelector("input"), v = l.querySelector(".valor");
      r.value = E.proj.larguras[o.nome]; v.textContent = r.value;
      r.oninput = function(){ v.textContent = r.value; };
      r.onchange = function(){ E.proj.larguras[o.nome] = +r.value; if ($("espelhoPeso").checked) E.proj.larguras[espelhoDoNome(o.nome)] = +r.value; L.innerHTML = ""; recalcularPesos(); montarListaOssos(); };
      r.dataset.osso = o.nome;
      L.appendChild(l);
    }
  }
  const sel = $("poseTestePeso");
  if (!sel.options.length) QUADROS_DO_JOGO.forEach(function(q, i){ const op = document.createElement("option"); op.value = i; op.textContent = q.nome; sel.appendChild(op); });
  $("btnVerPosado").classList.toggle("ativo", E.verPosado);
}
function modoPeso(m){ E.modoPeso = m; document.querySelectorAll("#modosPeso button").forEach(function(b){ b.classList.toggle("ativo", b.dataset.peso === m); }); }
document.querySelectorAll("#modosPeso button").forEach(function(b){ b.onclick = function(){ modoPeso(b.dataset.peso); }; });
modoPeso("somar");
function recalcularPesos(){
  if (!E.proj) return;
  const t0 = performance.now(), c = E.proj.corpo;
  abrirAcao(c, "peso automatico");
  const antes = {a: c.a.slice(), b: c.b.slice(), w: c.w.slice()};
  const r = calcularPesos(c, E.proj.juntas, {larguras: E.proj.larguras, pano: !!E.proj.pano});
  const lista = voxelsDoCorpo(c);
  for (let k = 0; k < lista.length; k++){
    const i = lista[k];
    if (antes.a[i] !== c.a[i] || antes.b[i] !== c.b[i] || antes.w[i] !== c.w[i]){
      const n = [c.a[i], c.b[i], c.w[i]]; c.a[i] = antes.a[i]; c.b[i] = antes.b[i]; c.w[i] = antes.w[i];
      mudarCelula(c, i, null, n[0], n[1], n[2]);
    }
  }
  fecharAcao(c); marcarSujo(); reconstruir();
  status("peso recalculado em " + Math.round(performance.now() - t0) + " ms; " + r.travados + " voxels pintados \u00e0 m\u00e3o ficaram");
}
$("btnPesos").onclick = recalcularPesos;
/* o pano (capa, saia) nao segue braco nem perna: fica no projeto, e vale para todo recalculo, tambem o de mexer numa junta */
$("panoPeso").onchange = function(){ if (!E.proj) return; E.proj.pano = this.checked; marcarSujo(); recalcularPesos(); };
$("btnDestravar").onclick = function(){ if (E.proj){ destravarPesos(E.proj.corpo); status("o pintado \u00e0 m\u00e3o foi esquecido; recalcule para valer no corpo inteiro"); } };
$("btnVerPosado").onclick = function(){ E.verPosado = !E.verPosado; this.classList.toggle("ativo", E.verPosado); reconstruir(); };
$("poseTestePeso").onchange = function(){ if (E.verPosado) reconstruir(); };

/* ---------- 4. animar ---------- */
function montarAnimar(){
  if (!E.proj) return;
  const sel = $("selAnimacao");
  if (!sel.options.length) ANIMACOES_DO_JOGO.forEach(function(a){ const o = document.createElement("option"); o.value = a.nome; o.textContent = a.nome + " (" + a.quadros + ")"; sel.appendChild(o); });
  sel.value = E.animacao;
  const q = $("quadros");
  q.innerHTML = "";
  for (let i = 0; i < anim().quadros; i++){
    const b = document.createElement("button");
    b.textContent = i + 1;
    b.classList.toggle("ativo", i === E.quadro);
    b.onclick = function(){ E.quadro = i; montarAnimar(); reconstruir(); };
    q.appendChild(b);
  }
  $("btnCiclo").disabled = anim().quadros < 2 || anim().quadros % 2;
  const l = $("listaOssosAnim");
  l.innerHTML = "";
  OSSOS.forEach(function(o){
    const d = document.createElement("div"); d.textContent = o.nome; d.className = o.nome === E.ossoAnim ? "ativo" : "";
    d.onclick = function(){ E.ossoAnim = o.nome; montarAnimar(); reconstruir(); };
    l.appendChild(d);
  });
  $("ossoAnimNome").textContent = E.ossoAnim;
  const e = eulerDoOsso(E.proj.juntas, poseAtual(), E.ossoAnim, E.proj.repouso);
  [["angX", 0], ["angY", 1], ["angZ", 2]].forEach(function(p){ $(p[0]).value = Math.round(e[p[1]]); $(p[0] + "n").value = Math.round(e[p[1]]); });
  const r = poseAtual().raiz;
  [["raizX", 0], ["raizY", 1], ["raizZ", 2]].forEach(function(p){ $(p[0]).value = r[p[1]]; $(p[0] + "v").textContent = r[p[1]].toFixed(1); });
}
$("selAnimacao").onchange = function(){ E.animacao = this.value; E.quadro = 0; montarAnimar(); reconstruir(); };
let quadroAgendado = false;
function agendarReconstruir(){ if (quadroAgendado) return; quadroAgendado = true; requestAnimationFrame(function(){ quadroAgendado = false; reconstruir(); }); }
let lembrouAngulo = false;
function mudarAngulo(){
  if (!lembrouAngulo){ lembrar(); lembrouAngulo = true; }
  const e = [+$("angX").value, +$("angY").value, +$("angZ").value];
  E.proj.animacoes[E.animacao][E.quadro] = girarOsso(E.proj.juntas, poseAtual(), E.ossoAnim, e, E.proj.repouso);
  ["angX", "angY", "angZ"].forEach(function(k, i){ $(k + "n").value = e[i]; });
  marcarSujo(); agendarReconstruir();
}
["angX", "angY", "angZ"].forEach(function(k){
  $(k).oninput = mudarAngulo;
  $(k).onchange = function(){ lembrouAngulo = false; };
  $(k + "n").onchange = function(){ $(k).value = this.value; mudarAngulo(); lembrouAngulo = false; };
});
["raizX", "raizY", "raizZ"].forEach(function(k, i){
  $(k).oninput = function(){
    if (!lembrouAngulo){ lembrar(); lembrouAngulo = true; }
    const p = copiarPose(poseAtual()); p.raiz[i] = +this.value;
    E.proj.animacoes[E.animacao][E.quadro] = p; $(k + "v").textContent = (+this.value).toFixed(1);
    marcarSujo(); agendarReconstruir();
  };
  $(k).onchange = function(){ lembrouAngulo = false; };
});
function trocarQuadro(p){ lembrar(); E.proj.animacoes[E.animacao][E.quadro] = p; marcarSujo(); montarAnimar(); reconstruir(); }
$("btnCopiarPose").onclick = function(){ E.copia = copiarPose(poseAtual()); status("pose copiada"); };
$("btnColarPose").onclick = function(){ if (E.copia) trocarQuadro(copiarPose(E.copia)); };
$("btnEspelharPose").onclick = function(){ trocarQuadro(espelharPose(poseAtual())); };
$("btnRepousoPose").onclick = function(){ trocarQuadro(copiarPose(E.proj.repouso)); };
$("btnEntrePose").onclick = function(){
  const l = E.proj.animacoes[E.animacao], n = l.length;
  if (n < 3) return;
  trocarQuadro(misturarPoses(l[(E.quadro + n - 1) % n], l[(E.quadro + 1) % n], 0.5));
};
$("btnChao").onclick = function(){ trocarQuadro(apoiarNoChao(E.proj.juntas, poseAtual(), 0)); };
$("btnCiclo").onclick = function(){
  lembrar();
  E.proj.animacoes[E.animacao] = completarCicloEspelhado(E.proj.animacoes[E.animacao]);
  marcarSujo(); montarAnimar(); reconstruir(); status("a segunda metade de " + E.animacao + " virou a primeira espelhada");
};
$("btnPosesAntigas").onclick = function(){
  lembrar();
  E.proj.animacoes[E.animacao] = posesAntigas(E.proj.juntas, E.proj.repouso, E.animacao).map(function(p){ return caberPose(E.proj.corpo, E.proj.juntas, E.proj.repouso, p, E.animacao, false); });
  marcarSujo(); montarAnimar(); reconstruir();
};
$("btnPosesEscritas").onclick = function(){
  const l = posesEscritas(E.proj.juntas, E.proj.repouso, E.animacao, E.proj.corpo);
  if (!l) return status("n\u00e3o h\u00e1 poses escritas para " + E.animacao);
  lembrar(); E.proj.animacoes[E.animacao] = l;
  marcarSujo(); montarAnimar(); reconstruir();
};
$("btnEncaixar").onclick = function(){
  const ciclo = E.animacao === "andar" || E.animacao === "correr";
  const p = caberPose(E.proj.corpo, E.proj.juntas, E.proj.repouso, poseAtual(), E.animacao, ciclo);
  trocarQuadro(p);
  if (p.amortecido) status("amortecido: corpo " + Math.round(p.amortecido.corpo*100) + "%, pernas " + Math.round(p.amortecido.pernas*100) + "%, tronco " + Math.round(p.amortecido.tronco*100) + "%, bra\u00e7os " + Math.round(p.amortecido.bracos*100) + "%");
};
let relogioToque = 0;
function tocar(){
  if (E.tocando) return pararDeTocar();
  E.tocando = true; $("btnTocar").classList.add("ativo");
  relogioToque = setInterval(function(){ E.quadro = (E.quadro + 1) % anim().quadros; montarAnimar(); reconstruir(); }, RITMO[E.animacao] || 200);
}
function pararDeTocar(){ E.tocando = false; clearInterval(relogioToque); $("btnTocar").classList.remove("ativo"); }
$("btnTocar").onclick = tocar;
function checarQuadro(){
  if (E.etapa !== "animar" || !posadoAtual) return;
  const pc = pedacos(posadoAtual.g), n = contarCheios(posadoAtual.g);
  if (!E.cacheParado) E.cacheParado = contarCheios(posarCorpo(E.proj.corpo, E.proj.juntas, E.proj.animacoes.parado[0]).g);
  const soltos = pc.slice(1).filter(function(p){ return p.n > LIMITES.pedacoSolto; }), dv = n/E.cacheParado - 1, l = [];
  l.push(posadoAtual.fora ? '<span class="erro">' + posadoAtual.fora + " voxels fora da grade</span>" : '<span class="ok">dentro da grade</span>');
  l.push(soltos.length ? '<span class="erro">peda\u00e7o solto: ' + soltos.map(function(s){ return s.n + " voxels em " + s.centro.join(","); }).join("; ") + "</span>" : '<span class="ok">sem peda\u00e7o solto</span>');
  l.push((Math.abs(dv) > LIMITES.volume ? '<span class="erro">' : '<span class="ok">') + "volume " + (dv >= 0 ? "+" : "") + Math.round(dv*100) + "% do parado</span>");
  $("checagemQuadro").innerHTML = l.join("<br>");
}
/* captura */
$("btnCaptura").onclick = function(){ $("entradaCaptura").click(); };
$("entradaCaptura").onchange = async function(){ const f = this.files[0]; this.value = ""; if (f) importarCaptura(await f.text(), (f.name.match(/\.[^.]+$/) || [""])[0], f.name); };
function importarCaptura(texto, ext, nome){
  if (!E.proj) return status("abra um corpo antes da captura");
  if (emOutraResolucao()) return status('<span class="aviso">Importe a captura em 117 voxels: o encaixe no jogo \u00e9 medido nessa grade.</span>');
  try {
    const t0 = performance.now();
    E.captura = lerCaptura(texto, ext);
    E.capturaPoses = redirecionarClipe(E.proj, E.captura);
    const n = E.captura.juntas.length;
    $("infoCaptura").textContent = esc(nome) + ": " + n + " quadros, " + Math.round(E.captura.fps) + " por segundo (" + E.captura.origem + ")";
    $("opcoesCaptura").hidden = false; $("infoAplicada").textContent = "";
    if (E.etapa !== "animar") irPara("animar");
    status("captura lida e redirecionada em " + Math.round(performance.now() - t0) + " ms");
  } catch(e){ status('<span class="erro">' + esc(e.message) + "</span>"); console.error(e); }
}
$("btnAplicarCaptura").onclick = function(){
  if (!E.capturaPoses) return;
  try {
    const t0 = performance.now(), txt = $("capQuadros").value.trim();
    const r = animacaoDaCaptura(E.proj, E.captura, E.animacao, {
      poses: E.capturaPoses, quadros: txt ? txt.split(/[,; ]+/).map(Number).filter(function(v){ return !isNaN(v); }) : null,
      fase: +$("capFase").value || 0, espelhar: $("capEspelhar").checked, assimetrico: $("capAssimetrico").checked, cru: $("capCru").checked});
    lembrar();
    E.proj.animacoes[E.animacao] = r.quadros;
    marcarSujo(); montarAnimar(); reconstruir();
    const am = r.quadros.map(function(q){ return q.amortecido ? "pernas " + Math.round(q.amortecido.pernas*100) + "%, tronco " + Math.round(q.amortecido.tronco*100) + "%, corpo " + Math.round(q.amortecido.corpo*100) + "%, bra\u00e7os " + Math.round(q.amortecido.bracos*100) + "%" : "inteiro"; });
    const i = r.info;
    $("infoAplicada").textContent = (i.periodo ? "ciclo do quadro " + Math.round(i.inicio) + " ao " + Math.round(i.fim) + " (" + (i.periodo/(E.captura.fps || 30)).toFixed(2) + " s). " : i.quadros ? "quadros " + i.quadros.join(", ") + ". " : "") +
      am.map(function(t, k){ return (k + 1) + ": " + t; }).join("; ");
    status(anim().quadros + " quadros de captura postos em " + E.animacao + " em " + Math.round(performance.now() - t0) + " ms");
  } catch(e){ status('<span class="erro">' + esc(e.message) + "</span>"); console.error(e); }
};

/* ---------- 5. previa ---------- */
(function(){
  const sel = $("previaQuais");
  const op = function(v, t){ const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); };
  op("animacao", "a anima\u00e7\u00e3o de agora");
  ANIMACOES_DO_JOGO.forEach(function(a){ op("a:" + a.nome, a.nome); });
  op("todos", "todos os 20");
  const el = $("previaPecas");
  for (const k in PECAS_DO_JOGO){
    const l = document.createElement("div"); l.className = "linha";
    l.innerHTML = '<span class="rotulo">' + k + '</span>';
    const s = document.createElement("select"); s.id = "peca_" + k;
    PECAS_DO_JOGO[k].forEach(function(v){ const o = document.createElement("option"); o.value = v; o.textContent = v; s.appendChild(o); });
    l.appendChild(s); el.appendChild(l);
  }
})();
let mensagemPrevia = null;
function assarPrevia(){
  if (!E.proj) return;
  const t0 = performance.now();
  const quadros = quadrosDoProjeto(E.proj.animacoes).map(function(q){
    const r = posarCorpo(E.proj.corpo, E.proj.juntas, q.pose);
    return {nome: q.nome, grade: r.g, juntas: r.juntas};
  });
  const texto = exportarPersonagem(E.proj, {quadros: quadros});
  const qual = $("previaQuais").value, nomeAnim = qual === "animacao" ? E.animacao : qual.slice(2);
  const poses = [];
  QUADROS_DO_JOGO.forEach(function(q, i){ if (qual === "todos" || q.animacao === nomeAnim) poses.push(i); });
  const escolha = {};
  for (const k in PECAS_DO_JOGO) escolha[k] = $("peca_" + k).value;
  mensagemPrevia = {tipo: "assar", personagem: texto, escolha: escolha, poses: poses, escala: +$("previaEscala").value, animar: poses.length > 1};
  $("infoPrevia").textContent = "posado em " + Math.round(performance.now() - t0) + " ms; assando\u2026";
  $("previaQuadro").src = "previa.html?" + Date.now();
}
addEventListener("message", function(ev){
  const m = ev.data;
  if (!m || !m.tipo) return;
  if (m.tipo === "pronta" && mensagemPrevia) $("previaQuadro").contentWindow.postMessage(mensagemPrevia, "*");
  if (m.tipo === "assado") $("infoPrevia").textContent = "assado pelo jogo em " + m.ms + " ms";
  if (m.tipo === "erro") $("infoPrevia").innerHTML = '<span class="erro">' + esc(m.mensagem) + "</span>";
});
$("btnAssar").onclick = assarPrevia;

/* ---------- 6. validar e exportar ---------- */
function validar(){
  if (!E.proj) return null;
  const t0 = performance.now();
  E.validacao = validarProjeto(E.proj);
  const v = E.validacao, el = $("listaValidacao");
  el.innerHTML = "";
  const item = function(classe, texto){
    const d = document.createElement("div"); d.className = classe; d.textContent = texto;
    const q = QUADROS_DO_JOGO.find(function(x){ return texto.indexOf(x.nome + ":") === 0; });
    if (q) d.onclick = function(){ E.animacao = q.animacao; E.quadro = q.quadro; irPara("animar"); };
    el.appendChild(d);
  };
  v.erros.forEach(function(e){ item("erro", e); });
  v.avisos.forEach(function(a){ item("aviso", a); });
  if (!v.erros.length && !v.avisos.length) item("ok", "tudo certo nos " + v.quadros.length + " quadros");
  $("infoValidar").textContent = Math.round(performance.now() - t0) + " ms";
  atualizarSelo();
  return v;
}
$("btnValidar").onclick = validar;
$("btnExportar").onclick = async function(){
  const v = validar();
  if (!v) return;
  if (v.erros.length && !$("exportarComErro").checked) return status('<span class="erro">nada exportado: ' + v.erros.length + " erro(s) na valida\u00e7\u00e3o</span>");
  const nome = await gravar(exportarPersonagem(E.proj, v), E.proj.nome + ".personagem", "handleExport", "Personagem do jogo");
  if (nome) status("gravado " + esc(nome) + " &mdash; agora: node mundo-perigoso/build.js");
};
$("btnExportarPele").onclick = async function(){
  if (!E.proj) return;
  const nome = await gravar(exportarPele(E.proj), E.proj.nome + ".pele", "handlePele", "Pele com peso de osso");
  if (nome) status("gravado " + esc(nome));
};

/* ---------- o mouse na vista ---------- */
(function(){
  const gl = $("gl");
  let arraste = null;
  function xy(ev){ const r = gl.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
  gl.addEventListener("contextmenu", function(ev){ ev.preventDefault(); });
  gl.addEventListener("wheel", function(ev){
    ev.preventDefault();
    const p = xy(ev), antes = vista.cam.zoom;
    vista.cam.zoom = Math.max(0.8, Math.min(40, antes*(ev.deltaY < 0 ? 1.15 : 1/1.15)));
    /* o ponto sob o mouse fica parado: alvo + D/antes = alvo' + D/depois */
    const d = vista.arrasteNoPlano(p[0] - gl.clientWidth/2, p[1] - gl.clientHeight/2);
    vista.cam.alvo = vSoma(vista.cam.alvo, vEscala(d, vista.cam.zoom/antes - 1));
    redesenhar();
  }, {passive: false});
  gl.addEventListener("pointerdown", function(ev){
    if (!E.proj) return;
    try { gl.setPointerCapture(ev.pointerId); } catch(e){}
    const p = xy(ev);
    if (ev.button === 2 || ev.button === 1){ arraste = {tipo: "mover", p: p, alvo: vista.cam.alvo.slice()}; return; }
    if (E.etapa === "esculpir"){
      const hit = vista.voxelEm(p[0], p[1]);
      if (hit && ev.altKey){ E.cor = corEm(E.proj.corpo, hit.pos[0], hit.pos[1], hit.pos[2]) || E.cor; montarPaleta(); return; }
      if (hit){ abrirAcao(E.proj.corpo, E.ferr); arraste = {tipo: "esculpir"}; esculpirEm(p, hit); return; }
    } else if (E.etapa === "rig"){
      const pt = vista.pontoEm(p[0], p[1], 10);
      if (pt){ lembrar(); E.juntaSel = pt.nome; arraste = {tipo: "junta", nome: pt.nome, p: p, pos: E.proj.juntas[pt.nome].slice()}; montarListaJuntas(); reconstruir(); return; }
    } else if (E.etapa === "peso" && !E.verPosado){
      const hit = vista.voxelEm(p[0], p[1]);
      if (hit && ev.altKey){ const i = celula(E.proj.corpo, hit.pos[0], hit.pos[1], hit.pos[2]), c = E.proj.corpo; E.ossoPeso = c.w[i] >= 128 ? c.a[i] : c.b[i]; montarListaOssos(); reconstruir(); return; }
      if (hit){ abrirAcao(E.proj.corpo, "pincel de peso"); arraste = {tipo: "peso"}; pesoEm(hit); return; }
    } else if (E.etapa === "animar"){
      const pt = vista.pontoEm(p[0], p[1], 10);
      if (pt && /^(mao|pe)[ED]$/.test(pt.nome)){
        lembrar();
        const lado = pt.nome.slice(-1), perna = pt.nome.indexOf("pe") === 0;
        arraste = {tipo: "ik", p: p, pos: posadoAtual.juntas[pt.nome].slice(), pose: copiarPose(poseAtual()),
                   a: (perna ? "coxa" : "braco") + lado, b: (perna ? "canela" : "antebraco") + lado, perna: perna};
        return;
      }
      if (pt){ E.ossoAnim = OSSO_DO_PONTO[pt.nome] === "tronco" && /ombro/.test(pt.nome) ? "braco" + pt.nome.slice(-1) : OSSO_DO_PONTO[pt.nome]; montarAnimar(); reconstruir(); return; }
    }
    arraste = {tipo: "girar", p: p, giro: vista.cam.giro, incl: vista.cam.incl};
  });
  gl.addEventListener("pointermove", function(ev){
    const p = xy(ev);
    if (E.proj && (E.etapa === "esculpir" || E.etapa === "peso")){
      const raio = E.etapa === "esculpir" ? +$("raioVoxel").value : +$("raioPeso").value;
      vista.cursor = [p[0], p[1], raio + 0.5];
      const hit = vista.voxelEm(p[0], p[1]);
      if (hit && E.etapa === "peso" && !E.verPosado){
        const c = E.proj.corpo, i = celula(c, hit.pos[0], hit.pos[1], hit.pos[2]);
        $("infoVista").textContent = hit.pos.join(", ") + "   " + OSSOS[c.a[i]].nome + " " + Math.round(c.w[i]/2.55) + "% / " + OSSOS[c.b[i]].nome + " " + Math.round(100 - c.w[i]/2.55) + "%";
      } else $("infoVista").textContent = hit ? hit.pos.join(", ") : "";
      if (!arraste) redesenhar();
    } else vista.cursor = null;
    if (E.etapa === "rig" || E.etapa === "animar"){
      const pt = vista.pontoEm(p[0], p[1], 10), nome = pt ? pt.nome : null;
      if (nome !== vista.destaque){ vista.destaque = nome; if (!arraste) redesenhar(); }
    }
    if (!arraste) return;
    const dx = p[0] - arraste.p[0], dy = p[1] - arraste.p[1];
    if (arraste.tipo === "girar"){
      if (E.vistaNome !== "livre"){ E.vistaNome = "livre"; document.querySelectorAll("#vistas button").forEach(function(b){ b.classList.toggle("ativo", b.dataset.vista === "livre"); }); aplicarReferencia(); }
      vista.cam.giro = arraste.giro - dx*0.5; vista.cam.incl = Math.max(-89, Math.min(89, arraste.incl + dy*0.4));
      redesenhar();
    } else if (arraste.tipo === "mover"){
      vista.cam.alvo = vMenos(arraste.alvo, vista.arrasteNoPlano(dx, dy)); redesenhar();
    } else if (arraste.tipo === "esculpir"){
      const hit = vista.voxelEm(p[0], p[1]);
      if (hit) esculpirEm(p, hit);
    } else if (arraste.tipo === "peso"){
      const hit = vista.voxelEm(p[0], p[1]);
      if (hit) pesoEm(hit);
    } else if (arraste.tipo === "junta"){
      const d = vista.arrasteNoPlano(dx, dy), n = arraste.nome;
      for (let e = 0; e < 3; e++) moverJunta(n, e, Math.round((arraste.pos[e] + d[e])*2)/2);
      completarPontos(E.proj.juntas);
      mostrarEsqueleto(E.proj.juntas, false); redesenhar();
      $("infoVista").textContent = n + " " + E.proj.juntas[n].join(", ");
    } else if (arraste.tipo === "ik"){
      const alvo = vSoma(arraste.pos, vista.arrasteNoPlano(dx, dy));
      let pose = ikDeDoisOssos(E.proj.juntas, arraste.pose, arraste.a, arraste.b, alvo);
      if (arraste.perna) pose = nivelarPes(E.proj.juntas, pose, E.proj.repouso);
      E.proj.animacoes[E.animacao][E.quadro] = pose;
      marcarSujo(); agendarReconstruir();
    }
  });
  gl.addEventListener("pointerup", function(){
    if (!arraste) return;
    const t = arraste.tipo;
    arraste = null;
    if (t === "esculpir" || t === "peso"){
      if (fecharAcao(E.proj.corpo)){ marcarSujo(); if (t === "esculpir"){ atualizarInfoCorpo(); E.cacheParado = null; } }
    } else if (t === "junta") rigMudou();
    else if (t === "ik") montarAnimar();
  });
  gl.addEventListener("pointerleave", function(){ vista.cursor = null; if (!arraste) redesenhar(); });
})();
function esculpirEm(p, hit){
  const c = E.proj.corpo, esp = $("espelhoVoxel").checked, raio = +$("raioVoxel").value;
  if (E.ferr === "balde") baldeDeCor(c, hit.pos, E.cor, esp);
  else if (E.ferr === "por"){ if (hit.antes) pincelDeVoxel(c, hit.antes, raio, "por", E.cor, esp); }
  else pincelDeVoxel(c, hit.pos, raio, E.ferr, E.cor, esp);
  reconstruir();
}
function pesoEm(hit){
  pincelDePeso(E.proj.corpo, hit.pos, +$("raioPeso").value, E.ossoPeso, +$("forcaPeso").value, E.modoPeso, $("espelhoPeso").checked);
  reconstruir();
}

/* ---------- teclado ---------- */
addEventListener("keydown", function(ev){
  if (ev.target.tagName === "INPUT" && ev.target.type !== "range" && ev.target.type !== "checkbox") return;
  if (ev.target.tagName === "SELECT") return;
  const k = ev.key.toLowerCase();
  if ((ev.ctrlKey || ev.metaKey) && k === "s"){ ev.preventDefault(); salvar(); return; }
  if ((ev.ctrlKey || ev.metaKey) && (k === "z" || k === "y")){
    ev.preventDefault();
    if (!E.proj) return;
    const volta = k === "z" && !ev.shiftKey;
    let ok;
    if (E.etapa === "esculpir" || E.etapa === "peso") ok = volta ? desfazer(E.proj.corpo) : refazer(E.proj.corpo);
    else ok = volta ? voltarInstantaneo(E.desfazer, E.refazer) : voltarInstantaneo(E.refazer, E.desfazer);
    if (ok){ marcarSujo(); E.cacheParado = null; montarPaleta(); if (E.etapa === "rig") montarListaJuntas(); if (E.etapa === "animar") montarAnimar(); reconstruir(); }
    return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if ("01234".indexOf(k) >= 0 && k.length === 1){ olhar(["livre", "frente", "lado", "costas", "cima"][+k]); return; }
  if (E.etapa === "esculpir"){
    const f = {a: "por", x: "tirar", p: "pintar", f: "balde"}[k];
    if (f) escolherFerramenta(f);
  }
  if (k === "[" || k === "]"){
    const id = E.etapa === "peso" ? "raioPeso" : "raioVoxel", el = $(id);
    el.value = +el.value + (k === "]" ? 1 : -1); el.dispatchEvent(new Event("input")); redesenhar();
  }
  if (E.etapa === "animar" && E.proj){
    if (k === "," || k === "."){ E.quadro = (E.quadro + (k === "." ? 1 : anim().quadros - 1)) % anim().quadros; montarAnimar(); reconstruir(); }
    if (k === " "){ ev.preventDefault(); tocar(); }
  }
});
addEventListener("resize", redesenhar);
addEventListener("beforeunload", function(ev){ if (E.sujo){ ev.preventDefault(); ev.returnValue = ""; } });

olhar("livre");
irPara("esculpir");
})();
