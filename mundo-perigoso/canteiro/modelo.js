/* ============================================================
   CANTEIRO -- O MODELO
   ------------------------------------------------------------
   Um pedaco construido que se leva para outro lugar: a selecao em caixa do
   micro vira um MODELO, que se cola, gira, espelha e guarda em arquivo.

   O modelo e a lista das pecas com o lugar relativo ao canto da caixa, e as
   construcoes delas pelo estilo: colar uma casa de pedra da uma casa de
   pedra nova, noutra construcao, que se troca de estilo sozinha depois.

   Girar um quarto de volta gira o lugar de cada peca em volta do canto e
   soma 90 ao giro dela. Espelhar e menos obvio: a peca espelhada troca o
   espelho, o giro vira o contrario, e o canto de onde ela cresce anda o
   comprimento dela -- que o estilo pode mudar (a escada da fortaleza e mais
   comprida), entao a conta pergunta o tamanho ao tipo com as medidas do
   estilo.

   O arquivo .modelo e o trecho [pecas] do MAPA 2, com o lugar relativo:

     MODELO 1
     nome casa do pescador
     tamanho 4 4 3
     c 1 madeira-pescador
     p 1 parede 0 0 0 0
     p 1 parede-porta 1 0 0 0 e

   Puro: nao toca em DOM. O micro usa, e o teste roda no node.
   ============================================================ */
"use strict";
(function(){
  if (typeof module !== "undefined" && typeof TIPOS_DE_PECA === "undefined"){
    const Pc = require("../src/pecas.js");
    for (const k in Pc) globalThis[k] = Pc[k];
  }
})();

/* a caixa de dois cantos quaisquer, arrumada */
function caixaDeCantos(a, b){
  return {x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), z0: Math.min(a.z, b.z),
          x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y), z1: Math.max(a.z, b.z)};
}
/* As pecas que nascem dentro da caixa -- o canto de onde cada uma cresce. */
function pecasNaCaixa(m, c){
  const e = 1e-6;
  return m.pecas.filter(function(p){
    return p.x >= c.x0 - e && p.x <= c.x1 + e && p.y >= c.y0 - e && p.y <= c.y1 + e && p.z >= c.z0 - e && p.z <= c.z1 + e;
  });
}
/* O modelo de uma lista de pecas do mapa, relativo ao canto (x0, y0, z0). */
function modeloDasPecas(m, pecas, canto, nome){
  const estilos = estilosDasConstrucoes(m), grupos = new Map(), out = [];
  let w = 0, d = 0, h = 0;
  for (const p of pecas){
    const estilo = estiloDaPeca(Object.assign({}, p, {campos: null}), estilos);
    const chave = p.construcao + "|" + estilo;
    if (!grupos.has(chave)) grupos.set(chave, {grupo: grupos.size + 1, estilo: estilo});
    const q = {grupo: grupos.get(chave).grupo, tipo: p.tipo, x: p.x - canto.x, y: p.y - canto.y, z: p.z - canto.z,
               giro: p.giro || 0, espelho: p.espelho ? 1 : 0};
    if (p.campos) q.campos = Object.assign({}, p.campos);
    out.push(q);
    w = Math.max(w, q.x + 1); d = Math.max(d, q.y + 1); h = Math.max(h, q.z + ANDAR);
  }
  return {nome: nome || "modelo", pecas: out, grupos: Array.from(grupos.values()), tamanho: [w, d, h]};
}
function modeloDaCaixa(m, c, nome){
  return modeloDasPecas(m, pecasNaCaixa(m, c), {x: c.x0, y: c.y0, z: c.z0}, nome);
}
function estiloDoGrupo(mod, g){
  const k = mod.grupos.find(function(x){ return x.grupo === g; });
  return k ? k.estilo : "madeira-pescador";
}
function copiaDoModelo(mod){ return JSON.parse(JSON.stringify(mod)); }

/* Um quarto de volta no sentido do giro das pecas, em volta do canto; o
   modelo continua no quadrante positivo. */
function girarModelo(mod, quartos){
  let out = copiaDoModelo(mod);
  const q = quartos === undefined ? 1 : quartos;
  for (let k = 0; k < ((q % 4) + 4) % 4; k++){
    const d = out.tamanho[1];
    for (const p of out.pecas){
      const x = p.x, y = p.y;
      p.x = d - y; p.y = x;
      p.giro = ((p.giro || 0) + 90) % 360;
    }
    out.tamanho = [out.tamanho[1], out.tamanho[0], out.tamanho[2]];
  }
  return out;
}
/* O espelho do modelo, trocando leste por oeste dentro da mesma largura. */
function espelharModelo(mod){
  const out = copiaDoModelo(mod), W = out.tamanho[0];
  for (const p of out.pecas){
    const def = TIPOS_DE_PECA[p.tipo];
    const T = def ? tamanhoDoTipo(def, medidasDaPeca(def, estiloDoGrupo(out, p.grupo), p))[0] : 0;
    const g = -(p.giro || 0), r = g*Math.PI/180;
    const c = Math.abs(Math.cos(r)) < 1e-12 ? 0 : Math.cos(r), s = Math.abs(Math.sin(r)) < 1e-12 ? 0 : Math.sin(r);
    p.x = W - p.x - T*c;
    p.y = p.y - T*s;
    p.giro = ((g % 360) + 360) % 360;
    p.espelho = p.espelho ? 0 : 1;
  }
  return out;
}
/* As pecas do modelo postas no mapa com o canto em (x, y, z): cada grupo
   vira uma construcao nova, com o estilo dele. Devolve as pecas novas. */
function porModelo(m, mod, x, y, z){
  let maior = 0;
  for (const c of m.construcoes) if (c.id > maior) maior = c.id;
  for (const p of m.pecas) if (p.construcao > maior) maior = p.construcao;
  const nova = new Map();
  for (const g of mod.grupos){
    nova.set(g.grupo, ++maior);
    m.construcoes.push({id: maior, estilo: g.estilo, nome: (mod.nome || "modelo") + (mod.grupos.length > 1 ? " " + g.grupo : "")});
  }
  const postas = [];
  for (const p of mod.pecas){
    const q = {tipo: p.tipo, construcao: nova.get(p.grupo), x: arredondar(x + p.x), y: arredondar(y + p.y), z: arredondar(z + p.z),
               giro: p.giro || 0, espelho: p.espelho ? 1 : 0};
    if (p.campos) q.campos = Object.assign({}, p.campos);
    m.pecas.push(q);
    postas.push(q);
  }
  return postas;
}
/* A caixa que os solidos do modelo ocupam, com o canto na origem: o que
   passa do tamanho declarado (a sacada, o beiral) entra. */
function caixaDoModelo(mod){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of mod.pecas){
    const g = geometriaDaPeca({tipo: p.tipo, x: p.x, y: p.y, z: p.z, giro: p.giro, espelho: p.espelho, campos: p.campos},
                              estiloDoGrupo(mod, p.grupo));
    if (!g) continue;
    for (const s of g.solidos) for (const q of s.pts){
      if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
    }
  }
  return {x0: x0, y0: y0, x1: x1, y1: y1};
}
/* a conta de ponto flutuante nao deixa 0,1 + 0,2 sujar o arquivo */
function arredondar(v){ return Math.round(v*1e6)/1e6; }

/* ---------- o arquivo .modelo ---------- */
function numeroDoModelo(v){ const r = arredondar(v); return String(r); }
function modeloParaTexto(mod){
  const out = ["MODELO 1", "nome " + (mod.nome || "modelo"),
               "tamanho " + mod.tamanho.map(numeroDoModelo).join(" ")];
  for (const g of mod.grupos) out.push("c " + g.grupo + " " + g.estilo);
  for (const p of mod.pecas){
    let l = "p " + p.grupo + " " + p.tipo + " " + numeroDoModelo(p.x) + " " + numeroDoModelo(p.y) + " " +
            numeroDoModelo(p.z) + " " + numeroDoModelo(p.giro || 0);
    if (p.espelho) l += " e";
    if (p.campos) for (const k of Object.keys(p.campos).sort()) l += " " + k + "=" + p.campos[k];
    out.push(l);
  }
  return out.join("\n") + "\n";
}
/* Le um .modelo; devolve {modelo} ou {erros}. Nada abre pela metade. */
function modeloDeTexto(texto){
  const linhas = String(texto).split(/\r?\n/), erros = [];
  if (!/^MODELO 1\s*$/.test(linhas[0] || "")) return {modelo: null, erros: [{linha: 1, msg: "nao e um MODELO 1"}]};
  const mod = {nome: "modelo", pecas: [], grupos: [], tamanho: [1, 1, 1]};
  for (let i = 1; i < linhas.length; i++){
    const l = linhas[i].trim();
    if (!l || l.slice(0, 2) === "//") continue;
    const t = l.split(/\s+/);
    if (t[0] === "nome") mod.nome = l.slice(5);
    else if (t[0] === "tamanho") mod.tamanho = t.slice(1, 4).map(Number);
    else if (t[0] === "c") mod.grupos.push({grupo: +t[1], estilo: t[2]});
    else if (t[0] === "p" && t.length >= 7){
      const p = {grupo: +t[1], tipo: t[2], x: +t[3], y: +t[4], z: +t[5], giro: +t[6], espelho: 0};
      for (let k = 7; k < t.length; k++){
        if (t[k] === "e") p.espelho = 1;
        else { const c = t[k].match(/^([a-z][a-z0-9_]*)=(.*)$/); if (c){ if (!p.campos) p.campos = {}; p.campos[c[1]] = c[2]; } else erros.push({linha: i + 1, msg: "nao entendi " + t[k]}); }
      }
      if (![p.x, p.y, p.z, p.giro].every(isFinite)) erros.push({linha: i + 1, msg: "numero estranho"});
      else mod.pecas.push(p);
    }
    else erros.push({linha: i + 1, msg: "linha estranha: " + l});
  }
  if (erros.length) return {modelo: null, erros: erros};
  return {modelo: mod, erros: []};
}

if (typeof module !== "undefined") module.exports = {
  caixaDeCantos, pecasNaCaixa, modeloDasPecas, modeloDaCaixa, girarModelo, espelharModelo, porModelo, caixaDoModelo,
  modeloParaTexto, modeloDeTexto
};
