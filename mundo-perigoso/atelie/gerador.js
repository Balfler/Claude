/* ============================================================
   O GERADOR LOCAL -- A FOLHA VIRA AS TRES VISTAS DO HUNYUAN
   ------------------------------------------------------------
   O caminho da folha de referencia (frente, perfil e costas em T-pose, numa
   imagem so) ate o .atelie, rodando na maquina do Leandro em vez do site do
   Sorceress:

     1. recortarVistas: cada vista vira um PNG RGBA quadrado, fundo
        transparente, a figura no meio, com margem -- o recorte e o do
        tresvistas.js (fundo pela borda, as tres maiores manchas);
     2. o Python de C:\ferramentas\gerador roda o Hunyuan3D-2mv turbo, so a
        forma (ferramentas/gerador/gerar.py), e devolve um .glb;
     3. o tresvistas.js pinta a forma com o desenho e grava o .atelie.

   Aqui ficam o recorte e o achar o gerador instalado; quem junta tudo e o
   `cli.js gerar`.
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const T = require("../sondagens/7-tres-vistas/tresvistas.js");

const RAIZ_PADRAO = "C:\\ferramentas\\gerador";

/* Recorta a folha nas tres vistas. Cada uma sai num quadrado de `lado`
   pixels (1024), a figura ocupando 1 - 2*margem do lado maior, centrada pela
   caixa dela; o fundo e transparente, e na reducao a borda ganha meio-tom de
   alfa (a cor de cada pixel e a media so dos pixels da figura). */
function recortarVistas(img, opcoes){
  opcoes = opcoes || {};
  const lado = opcoes.lado || 1024, margem = opcoes.margem === undefined ? 0.1 : opcoes.margem;
  const L = img.largura, H = img.altura;
  const msk = T.mascara(img, T.fundoDaBorda(img), opcoes.tol || 38);
  const [frente, perfil, costas] = T.separarVistas(msk, L, H), m = msk.m;
  const olha = opcoes.perfil || T.perfilOlhaPara(m, L, perfil);
  const vistas = {};
  for (const [nome, v] of [["frente", frente], ["perfil", perfil], ["costas", costas]]){
    const w = v.x1 - v.x0 + 1, h = v.y1 - v.y0 + 1;
    /* o quadrado na escala da folha, e a figura no meio dele */
    const S = Math.ceil(Math.max(w, h)/(1 - 2*margem)), ox = v.x0 - Math.floor((S - w)/2), oy = v.y0 - Math.floor((S - h)/2);
    const k = lado/S, soma = new Float64Array(lado*lado*4), conta = new Float64Array(lado*lado);
    for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++){
      const d = Math.min(lado - 1, Math.floor((y - oy)*k))*lado + Math.min(lado - 1, Math.floor((x - ox)*k));
      conta[d]++;
      if (m[y*L + x] !== v.code) continue;
      const s = (y*L + x)*4;
      soma[d*4] += img.rgba[s]; soma[d*4 + 1] += img.rgba[s + 1]; soma[d*4 + 2] += img.rgba[s + 2]; soma[d*4 + 3]++;
    }
    const rgba = new Uint8Array(lado*lado*4);
    for (let d = 0; d < lado*lado; d++){
      const n = soma[d*4 + 3];
      if (!n) continue;
      rgba[d*4] = Math.round(soma[d*4]/n); rgba[d*4 + 1] = Math.round(soma[d*4 + 1]/n); rgba[d*4 + 2] = Math.round(soma[d*4 + 2]/n);
      rgba[d*4 + 3] = Math.round(255*n/conta[d]);
    }
    vistas[nome] = {largura: lado, altura: lado, rgba: rgba, caixa: [v.x0, v.y0, v.x1, v.y1]};
  }
  /* No Hunyuan, "left" e o personagem olhando para a esquerda da imagem (os
     exemplos dele: assets/example_mv_images/1/left.png); o perfil que olha
     para a direita mostra o lado direito dele, "right". */
  return {olha: olha, chavePerfil: olha === "direita" ? "right" : "left", vistas: vistas};
}

/* Onde esta o gerador, e o que falta nele. A raiz vem da opcao, da variavel
   MUNDO_GERADOR ou do padrao C:\ferramentas\gerador; o Python, da opcao ou do
   venv dentro dela. */
function localizar(opcoes){
  opcoes = opcoes || {};
  const raiz = opcoes.raiz || process.env.MUNDO_GERADOR || RAIZ_PADRAO;
  const venv = path.join(raiz, "venv");
  const python = opcoes.python || process.env.MUNDO_GERADOR_PYTHON ||
    (process.platform === "win32" ? path.join(venv, "Scripts", "python.exe") : path.join(venv, "bin", "python"));
  const script = path.join(__dirname, "..", "ferramentas", "gerador", "gerar.py");
  const codigo = path.join(raiz, "Hunyuan3D-2");
  const pesos = path.join(raiz, "pesos", "tencent", "Hunyuan3D-2mv", "hunyuan3d-dit-v2-mv-turbo", "model.fp16.safetensors");
  const leia = "mundo-perigoso/ferramentas/gerador/LEIA-ME.md";
  const faltas = [];
  if (!fs.existsSync(raiz)) faltas.push("o gerador nao esta instalado: nao achei a pasta " + raiz +
    " (use --gerador <pasta> ou a variavel MUNDO_GERADOR; para instalar, veja " + leia + ")");
  else {
    if (!fs.existsSync(python)) faltas.push("nao achei o Python do gerador em " + python + " (o ambiente virtual; veja " + leia + ", passo 2)");
    if (!fs.existsSync(codigo)) faltas.push("nao achei o codigo do Hunyuan3D-2 em " + codigo + " (veja " + leia + ", passo 3)");
    if (!fs.existsSync(pesos)) faltas.push("nao achei os pesos do modelo em " + pesos + " (veja " + leia + ", passo 4)");
  }
  if (!fs.existsSync(script)) faltas.push("nao achei o script " + script);
  return {raiz, python, script, codigo, pesos, faltas};
}

/* a linha "RESULTADO {json}" que o gerar.py imprime no fim */
function lerResultado(saida){
  const l = String(saida).split(/\r?\n/).reverse().find(s => s.startsWith("RESULTADO "));
  return l ? JSON.parse(l.slice(10)) : null;
}

module.exports = {recortarVistas, localizar, lerResultado, RAIZ_PADRAO};
