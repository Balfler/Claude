/* ============================================================
   CANTEIRO -- OS ARQUIVOS
   ------------------------------------------------------------
   Abrir, salvar por cima e o rascunho no navegador, como o editor e o
   atelie ja fazem. Aberto do disco no Chrome ou no Edge, a primeira vez
   pelo botao Abrir; dali em diante Ctrl+S grava no mesmo arquivo. Em
   navegador sem acesso a arquivo, salvar baixa uma copia.

   O rascunho e o seguro contra fechar a aba sem salvar: a cada pausa o mapa
   inteiro vai para o armazenamento do navegador, e ao abrir de novo a
   ferramenta oferece recuperar.
   ============================================================ */
"use strict";
const CHAVE_RASCUNHO = "canteiro-mapa:rascunho";
const CHAVE_JOGAR_CANTEIRO = "editor-mapa:jogar";      // a mesma do editor: Ver no jogo

const ARQ = {handle: null, nome: "", sujo: false, salvoEm: 0};

function podeGravarNoDisco(){ return typeof window.showSaveFilePicker === "function"; }

async function escolherArquivo(){
  if (typeof window.showOpenFilePicker !== "function") return null;
  const [h] = await window.showOpenFilePicker({
    types: [{description: "Mapa do Mundo Perigoso", accept: {"text/plain": [".mapa"]}}]
  });
  return h;
}
async function lerHandle(h){
  const f = await h.getFile();
  return await f.text();
}
async function gravar(texto, comoNovo){
  if (!podeGravarNoDisco() || comoNovo || !ARQ.handle){
    if (podeGravarNoDisco()){
      ARQ.handle = await window.showSaveFilePicker({
        suggestedName: (ARQ.nome || "mapa") .replace(/\.mapa$/, "") + ".mapa",
        types: [{description: "Mapa do Mundo Perigoso", accept: {"text/plain": [".mapa"]}}]
      });
      ARQ.nome = ARQ.handle.name;
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([texto], {type: "text/plain"}));
      a.download = ARQ.nome || "mapa.mapa";
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
      return "baixado";
    }
  }
  const w = await ARQ.handle.createWritable();
  await w.write(texto);
  await w.close();
  return "gravado";
}
/* o rascunho: texto do mapa e onde a camera estava */
function guardarRascunho(texto, onde){
  try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({texto: texto, onde: onde, quando: Date.now(), nome: ARQ.nome})); }
  catch(e){ return String(e.message || e); }
  return null;
}
function lerRascunho(){
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || "null");
    return r && r.texto ? r : null;
  } catch(e){ return null; }
}
function apagarRascunho(){ try { localStorage.removeItem(CHAVE_RASCUNHO); } catch(e){} }

/* Ver no jogo: o mapa vai pelo armazenamento e o jogo abre com ?mapa=editor,
   do mesmo jeito que o editor de mapa faz. */
function mandarParaOJogo(texto, inicio){
  try { localStorage.setItem(CHAVE_JOGAR_CANTEIRO, texto); }
  catch(e){ return String(e.message || e); }
  let url = "../../cripta-vhalgorn.html?mapa=editor";
  if (inicio) url += "&inicio=" + Math.floor(inicio.x) + "," + Math.floor(inicio.y) +
                     (inicio.graus === undefined ? "" : "," + Math.round(inicio.graus));
  window.open(url, "jogo-canteiro");
  return null;
}
