/* ============================================================
   CANTEIRO -- O CATALOGO, NO MICRO
   ------------------------------------------------------------
   As pecas numa grade de miniaturas desenhadas pelo proprio motor
   (assarMiniatura, em p5a.js), no estilo da construcao da vez: trocar a
   casa de madeira para pedra troca as miniaturas junto. Por cima, a busca
   e as categorias; mais em cima, a barra de nove, que e o que as teclas
   1..9 escolhem.

   Clicar numa miniatura poe a peca na casa da barra que esta escolhida --
   como no modo criativo de todo jogo de blocos. A barra fica guardada no
   navegador, que e conveniencia de quem usa; o mapa nao sabe dela.
   ============================================================ */
"use strict";
const CATALOGO = {
  categoria: "casa", busca: "", casa: 0,
  barra: ["parede", "parede-porta", "parede-janela", "laje", "escada", "telhado-agua", "piso", "guarda-corpo", "pilar"],
  miniaturas: new Map(),                 // "tipo|estilo" -> canvas 64x64
  montadoCom: ""                         // o que a grade mostra agora, para nao remontar a toa
};
(function(){
  try {
    const b = JSON.parse(localStorage.getItem("canteiro:barra") || "null");
    if (Array.isArray(b) && b.length === 9) CATALOGO.barra = b.map(function(t){ return TIPOS_DE_PECA[t] ? t : null; });
  } catch(e){}
})();
function guardarBarra(){
  try { localStorage.setItem("canteiro:barra", JSON.stringify(CATALOGO.barra)); } catch(e){}
}
const NOMES_DAS_CATEGORIAS = {casa: "casa", castelo: "castelo", dungeon: "dungeon", natureza: "natureza",
                              infra: "infra", interior: "interior", luz: "luz"};

/* a miniatura, assada uma vez por tipo e estilo */
function miniaturaCanvas(tipo, estilo){
  const chave = tipo + "|" + estilo;
  let c = CATALOGO.miniaturas.get(chave);
  if (!c){
    c = document.createElement("canvas");
    c.width = c.height = 64;
    const px = miniaturaDaPeca(tipo, estilo, 64);
    if (px){
      const cx = c.getContext("2d"), img = cx.createImageData(64, 64);
      new Uint32Array(img.data.buffer).set(px);
      cx.putImageData(img, 0, 0);
    }
    CATALOGO.miniaturas.set(chave, c);
  }
  /* o mesmo canvas nao fica em dois lugares da pagina: sai uma copia */
  const copia = document.createElement("canvas");
  copia.width = copia.height = 64;
  copia.getContext("2d").drawImage(c, 0, 0);
  return copia;
}
/* sem acento e sem caixa, para a busca achar "balcao" com "balc\u00e3o" */
function simples(t){ return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function tiposDoCatalogo(){
  const b = simples(CATALOGO.busca.trim());
  return Object.keys(TIPOS_DE_PECA).filter(function(t){
    const d = TIPOS_DE_PECA[t];
    if (b) return simples(d.nome).indexOf(b) >= 0 || t.indexOf(b) >= 0 || simples(d.categoria).indexOf(b) >= 0;
    return d.categoria === CATALOGO.categoria;
  });
}
/* escolher uma peca: ela vai para a casa escolhida da barra */
function escolherDoCatalogo(tipo){
  CATALOGO.barra[CATALOGO.casa] = tipo;
  guardarBarra();
  MICRO.tipo = tipo;
}
function escolherCasaDaBarra(i){
  CATALOGO.casa = i;
  if (CATALOGO.barra[i]) MICRO.tipo = CATALOGO.barra[i];
}
/* Remonta o que mudou: a grade so quando a categoria, a busca ou o estilo
   mudam; o resto e trocar a marca de ativo. */
function atualizarCatalogo(foco){
  const estilo = estiloNaMao();
  const barra = document.getElementById("barra"), grade = document.getElementById("gradePecas");
  const cats = document.getElementById("categorias");
  if (!cats.children.length){
    for (const cat of CATEGORIAS_DE_PECA){
      const b = document.createElement("button");
      b.textContent = NOMES_DAS_CATEGORIAS[cat] || cat;
      b.dataset.categoria = cat;
      b.onclick = function(){ CATALOGO.categoria = cat; CATALOGO.busca = ""; document.getElementById("buscaPeca").value = ""; atualizarCatalogo(foco); if (foco) foco(); };
      cats.appendChild(b);
    }
    const busca = document.getElementById("buscaPeca");
    busca.oninput = function(){ CATALOGO.busca = this.value; atualizarCatalogo(foco); };
    busca.onkeydown = function(ev){
      if (ev.key === "Enter"){ const l = tiposDoCatalogo(); if (l.length){ escolherDoCatalogo(l[0]); atualizarCatalogo(foco); } this.blur(); if (foco) foco(); }
      if (ev.key === "Escape"){ this.blur(); if (foco) foco(); }
      ev.stopPropagation();
    };
  }
  for (const b of cats.children) b.classList.toggle("ativo", !CATALOGO.busca && b.dataset.categoria === CATALOGO.categoria);

  const chaveBarra = CATALOGO.barra.join(",") + "|" + estilo;
  if (barra.dataset.chave !== chaveBarra){
    barra.dataset.chave = chaveBarra;
    barra.innerHTML = "";
    CATALOGO.barra.forEach(function(t, i){
      const s = document.createElement("button");
      s.className = "casa";
      s.title = (i + 1) + ": " + (t ? TIPOS_DE_PECA[t].nome : "vazio");
      if (t) s.appendChild(miniaturaCanvas(t, estilo));
      const n = document.createElement("span");
      n.className = "num"; n.textContent = i + 1;
      s.appendChild(n);
      s.onclick = function(){ escolherCasaDaBarra(i); atualizarCatalogo(foco); if (foco) foco(); };
      barra.appendChild(s);
    });
  }
  for (let i = 0; i < barra.children.length; i++) barra.children[i].classList.toggle("ativo", i === CATALOGO.casa);

  const lista = tiposDoCatalogo();
  const chaveGrade = lista.join(",") + "|" + estilo;
  if (CATALOGO.montadoCom !== chaveGrade){
    CATALOGO.montadoCom = chaveGrade;
    grade.innerHTML = "";
    for (const t of lista){
      const item = document.createElement("div");
      item.className = "item";
      item.dataset.tipo = t;
      item.title = TIPOS_DE_PECA[t].nome + " (" + t + ")";
      item.appendChild(miniaturaCanvas(t, estilo));
      const nome = document.createElement("span");
      nome.textContent = TIPOS_DE_PECA[t].nome;
      item.appendChild(nome);
      item.onclick = function(){ escolherDoCatalogo(t); atualizarCatalogo(foco); if (foco) foco(); };
      grade.appendChild(item);
    }
    if (!lista.length) grade.innerHTML = "<div class='dica'>nenhuma peca com esse nome</div>";
  }
  for (const it of grade.children) if (it.dataset) it.classList.toggle("ativo", it.dataset.tipo === MICRO.tipo);
}
