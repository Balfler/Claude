/* ============================================================
   ATELIE -- OS ARQUIVOS
   ------------------------------------------------------------
   Tres formatos, todos texto ASCII:

   .atelie -- o projeto: corpo em bind pose com cor e peso, rig, repouso e
     animacoes. E o arquivo de trabalho; tudo que o atelie sabe esta nele.
     JSON, com as grades em corridas base36 (ver `corridas`).

   .personagem (PERSONAGEM 2) -- o que o jogo le. Um cabecalho com a paleta
   e, por quadro do jogo, as juntas posadas e a grade 80x56x117 ja posada:

     PERSONAGEM 2
     nome humano
     grade 80 56 117
     cores 54
     1a1410 2c1f16 ...                      (rrggbb, a cor 1 primeiro)
     poses 20
     [pose parado]
     juntas cabeca 40 28.5 104 pescoco 40 27.5 88 ...   (as 14 juntas)
     [voxels]
     0*2s1 5 5*3 0*20 ...                   (corridas: cor*quantas, base36;
     [pose andar-1]                          ordem (z*DY + y)*DX + x)
     ...

   O jogo nao gira nada: pega a grade do quadro e pendura as pecas nas
   juntas do quadro. Toda a pose e decidida aqui.

   .pele (PELE 1) -- o corpo com peso de osso, para o dia em que o proprio
   jogo fizer a pele (e a pose deixar de ser uma grade assada por quadro).
   O jogo ainda nao le. O formato:

     PELE 1
     nome humano
     caixa -30 -4 -3 140 64 124             (origem x y z, tamanho x y z da bind pose)
     ossos 13
     bacia -1 40 28.5 40                     (nome, indice do pai, pivo na bind pose)
     tronco 0 40 28.8 47.6
     ...
     pontos 22
     cabeca 40 28.5 104                      (juntas e pontos do rig na bind pose)
     ...
     cores 54
     1a1410 2c1f16 ...
     [cores]
     0*1f3a 3 3*4 ...                        (cor por celula da caixa, corridas base36)
     [pesos]
     3.4.bf*12 3.3.ff ...                    (por voxel cheio, na mesma ordem:
                                              ossoA.ossoB.peso de A em 0..255, base36)
     [pose parado]
     raiz 0 0 0
     rot bacia 1 0 0 0 tronco 1 0 0 0 ...   (quaternio local w x y z por osso)
     ...

   Para posar: cada voxel p (centro da celula) vai para a mistura por
   quaternio dual dos giros dos seus dois ossos, calculados por cinematica
   direta a partir da bind pose -- o que atelie/deformar.js faz.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof voxelsDoCorpo === "undefined"){
  const M = require("./corpo.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof posarEsqueleto === "undefined"){
  const M = require("./rig.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof calcularPesos === "undefined"){
  const M = require("./pesos.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof quadrosDoProjeto === "undefined"){
  const M = require("./animacao.js");
  for (const k in M) globalThis[k] = M[k];
}
if (typeof module !== "undefined" && typeof validarProjeto === "undefined"){
  const M = require("./validar.js");
  for (const k in M) globalThis[k] = M[k];
}

/* ---------- corridas ---------- */
function corridas(valores, larguraLinha){
  const tokens = [];
  let v = valores[0], n = 0;
  function empurra(){ tokens.push(n > 1 ? String(v) + "*" + n.toString(36) : String(v)); }
  for (let i = 0; i < valores.length; i++){ if (valores[i] === v) n++; else { empurra(); v = valores[i]; n = 1; } }
  if (valores.length) empurra();
  const linhas = [];
  for (let i = 0; i < tokens.length; i += (larguraLinha || 40)) linhas.push(tokens.slice(i, i + (larguraLinha || 40)).join(" "));
  return linhas;
}
function lerCorridas(texto, cada){
  let k = 0;
  for (const t of String(texto).split(/\s+/)){
    if (!t) continue;
    const e = t.indexOf("*"), v = e < 0 ? t : t.slice(0, e), n = e < 0 ? 1 : parseInt(t.slice(e + 1), 36);
    cada(v, k, n);
    k += n;
  }
  return k;
}
function hex(c){ return c.map(function(v){ return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"); }).join(""); }
function deHex(h){ return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function arred(v, casas){ const k = Math.pow(10, casas); return Math.round(v*k)/k; }

/* ---------- o projeto ---------- */
function novoProjeto(corpo, opcoes){
  opcoes = opcoes || {};
  const rig = opcoes.juntas ? {juntas: completarPontos(copiarPontos(opcoes.juntas)), avisos: []} : proporRig(corpo);
  const proj = {nome: corpo.nome, corpo: corpo, juntas: rig.juntas, larguras: Object.assign({}, LARGURA_PADRAO), avisosDoRig: rig.avisos};
  if (opcoes.pano) proj.pano = true;          // o pano (capa, saia) nao segue braco nem perna: vale para todo recalculo
  if (!opcoes.semPesos) calcularPesos(corpo, proj.juntas, {larguras: proj.larguras, pano: opcoes.pano});
  const an = animacoesIniciais(proj.juntas, corpo);
  proj.repouso = an.repouso; proj.animacoes = an.animacoes;
  return proj;
}
function poseParaJson(p){
  const rot = {};
  for (const o of OSSOS) rot[o.nome] = (p.rot[o.nome] || Q_ID).map(function(v){ return arred(v, 5); });
  return {raiz: p.raiz.map(function(v){ return arred(v, 3); }), rot: rot};
}
function salvarProjeto(proj){
  const c = proj.corpo, lista = voxelsDoCorpo(c), pesos = [], trava = [];
  for (let k = 0; k < lista.length; k++){
    const i = lista[k];
    pesos.push(c.a[i].toString(36) + "." + c.b[i].toString(36) + "." + c.w[i].toString(36));
    trava.push(c.trava && c.trava[i] ? 1 : 0);
  }
  const juntas = {};
  for (const k in proj.juntas) juntas[k] = proj.juntas[k].map(function(v){ return arred(v, 2); });
  const animacoes = {};
  for (const a in proj.animacoes) animacoes[a] = proj.animacoes[a].map(poseParaJson);
  const obj = {
    formato: "atelie", versao: 1, nome: proj.nome,
    corpo: {caixa: [c.ox, c.oy, c.oz, c.bx, c.by, c.bz], paleta: c.paleta.map(hex),
            cores: corridas(Array.from(c.cor, function(v){ return v.toString(36); }), 60).join(" "),
            pesos: corridas(pesos, 30).join(" "), trava: corridas(trava, 60).join(" ")},
    juntas: juntas, larguras: proj.larguras, repouso: poseParaJson(proj.repouso), animacoes: animacoes
  };
  if (proj.pano) obj.pano = true;                  // so quando ligado: o humano de camisa sai como sempre
  /* a fonte de alta resolucao (resolucao.js): so nos projetos que tem. Em
     indices de uma paleta, em corridas, como o corpo. */
  if (proj.fonte){
    const f = proj.fonte;
    obj.fonte = {caixa: [f.gx, f.gy, f.gz], paleta: f.paleta.map(hex), cores: corridas(Array.from(f.cor, function(v){ return v.toString(36); }), 60).join(" ")};
  }
  return JSON.stringify(obj, null, 1).replace(/\n\s+(-?[\d.]+,?)(?=\n)/g, " $1").replace(/\[\s+/g, "[").replace(/\s+\]/g, "]") + "\n";
}
/* a fonte de alta resolucao de volta: {gx, gy, gz, paleta, cor}; null se o projeto nao tem */
function fonteDoArquivo(o){
  if (!o) return null;
  const cor = new Uint8Array(o.caixa[0]*o.caixa[1]*o.caixa[2]);
  lerCorridas(o.cores, function(v, k, n){ const x = parseInt(v, 36); if (x) cor.fill(x, k, k + n); });
  return {gx: o.caixa[0], gy: o.caixa[1], gz: o.caixa[2], paleta: o.paleta.map(deHex), cor: cor};
}
function lerProjeto(texto){
  const o = JSON.parse(texto);
  if (o.formato !== "atelie") throw new Error("nao e um projeto do atelie");
  const c = novoCorpo(o.nome), cx = o.corpo.caixa;
  if (cx[3] !== c.bx || cx[4] !== c.by || cx[5] !== c.bz || cx[0] !== c.ox || cx[1] !== c.oy || cx[2] !== c.oz) throw new Error("caixa de bind pose diferente da do atelie");
  c.paleta = o.corpo.paleta.map(deHex);
  lerCorridas(o.corpo.cores, function(v, k, n){ const x = parseInt(v, 36); if (x) c.cor.fill(x, k, k + n); });
  c.versao++;
  const lista = voxelsDoCorpo(c);
  lerCorridas(o.corpo.pesos, function(v, k, n){
    const p = v.split(".").map(function(s){ return parseInt(s, 36); });
    for (let j = k; j < k + n && j < lista.length; j++){ const i = lista[j]; c.a[i] = p[0]; c.b[i] = p[1]; c.w[i] = p[2]; }
  });
  if (o.corpo.trava){
    c.trava = new Uint8Array(c.cor.length);
    lerCorridas(o.corpo.trava, function(v, k, n){ if (v === "1") for (let j = k; j < k + n && j < lista.length; j++) c.trava[lista[j]] = 1; });
  }
  const animacoes = {};
  for (const a in o.animacoes) animacoes[a] = o.animacoes[a].map(copiarPose);
  return {nome: o.nome, corpo: c, juntas: completarPontos(o.juntas), larguras: Object.assign({}, LARGURA_PADRAO, o.larguras),
          repouso: copiarPose(o.repouso), animacoes: animacoes, avisosDoRig: [], pano: o.pano === true, fonte: fonteDoArquivo(o.fonte)};
}

/* ---------- exportar para o jogo ---------- */
function exportarPersonagem(proj, validacao){
  const v = validacao || validarProjeto(proj, {rapido: true});
  const c = proj.corpo, D = GRADE;
  const L = ["PERSONAGEM 2", "nome " + proj.nome, "grade " + D.DX + " " + D.DY + " " + D.DZ,
             "cores " + c.paleta.length, c.paleta.map(hex).join(" "), "poses " + v.quadros.length];
  for (const q of v.quadros){
    L.push("[pose " + q.nome + "]");
    L.push("juntas " + JUNTAS.map(function(j){ return j + " " + q.juntas[j].map(function(x){ return arred(x, 1); }).join(" "); }).join(" "));
    L.push("[voxels]");
    for (const linha of corridas(Array.from(q.grade, function(x){ return x.toString(36); }), 40)) L.push(linha);
  }
  return L.join("\n") + "\n";
}
function exportarPele(proj){
  const c = proj.corpo, lista = voxelsDoCorpo(c), J = proj.juntas;
  const L = ["PELE 1", "nome " + proj.nome, "caixa " + [c.ox, c.oy, c.oz, c.bx, c.by, c.bz].join(" "), "ossos " + OSSOS.length];
  for (const o of OSSOS) L.push(o.nome + " " + o.iPai + " " + J[o.pivo].map(function(x){ return arred(x, 2); }).join(" "));
  L.push("pontos " + TODOS_OS_PONTOS.length);
  for (const p of TODOS_OS_PONTOS) L.push(p + " " + J[p].map(function(x){ return arred(x, 2); }).join(" "));
  L.push("cores " + c.paleta.length, c.paleta.map(hex).join(" "), "[cores]");
  for (const l of corridas(Array.from(c.cor, function(x){ return x.toString(36); }), 40)) L.push(l);
  L.push("[pesos]");
  const pesos = [];
  for (let k = 0; k < lista.length; k++){ const i = lista[k]; pesos.push(c.a[i].toString(36) + "." + c.b[i].toString(36) + "." + c.w[i].toString(36)); }
  for (const l of corridas(pesos, 30)) L.push(l);
  for (const q of quadrosDoProjeto(proj.animacoes)){
    L.push("[pose " + q.nome + "]", "raiz " + q.pose.raiz.map(function(x){ return arred(x, 3); }).join(" "));
    L.push("rot " + OSSOS.map(function(o){ return o.nome + " " + (q.pose.rot[o.nome] || Q_ID).map(function(x){ return arred(x, 5); }).join(" "); }).join(" "));
  }
  return L.join("\n") + "\n";
}
/* le a .pele de volta num projeto (o corpo, o rig e as poses) */
function lerPele(texto){
  const L = String(texto).replace(/\r\n/g, "\n").split("\n");
  if (L[0] !== "PELE 1") throw new Error("nao e um arquivo .pele");
  const c = novoCorpo(), J = {}, animacoes = {};
  for (const a of ANIMACOES_DO_JOGO) animacoes[a.nome] = [];
  let i = 1, secao = null, texto2 = [], pose = null;
  function fecharSecao(){
    if (secao === "cores"){ lerCorridas(texto2.join(" "), function(v, k, n){ const x = parseInt(v, 36); if (x) c.cor.fill(x, k, k + n); }); c.versao++; }
    if (secao === "pesos"){
      const lista = voxelsDoCorpo(c);
      lerCorridas(texto2.join(" "), function(v, k, n){ const p = v.split(".").map(function(s){ return parseInt(s, 36); }); for (let j = k; j < k + n; j++){ const ci = lista[j]; c.a[ci] = p[0]; c.b[ci] = p[1]; c.w[ci] = p[2]; } });
    }
    texto2 = [];
  }
  for (; i < L.length; i++){
    const l = L[i].trim(), p = l.split(/\s+/);
    if (!l) continue;
    if (l.charAt(0) === "["){
      fecharSecao();
      const m = l.match(/^\[pose (.+)\]$/);
      secao = m ? "pose" : l.slice(1, -1);
      if (m){ const q = QUADROS_DO_JOGO.find(function(x){ return x.nome === m[1]; }); pose = poseNeutra(); if (q) animacoes[q.animacao][q.quadro] = pose; }
      continue;
    }
    if (secao === "cores" || secao === "pesos"){ texto2.push(l); continue; }
    if (secao === "pose"){
      if (p[0] === "raiz") pose.raiz = p.slice(1, 4).map(Number);
      if (p[0] === "rot") for (let k = 1; k + 4 < p.length; k += 5) pose.rot[p[k]] = p.slice(k + 1, k + 5).map(Number);
      continue;
    }
    if (p[0] === "nome") c.nome = p[1];
    else if (p[0] === "cores") c.paleta = (L[++i] || "").trim().split(/\s+/).map(deHex);
    else if (p[0] === "pontos"){ const n = +p[1]; for (let k = 0; k < n; k++){ const q = L[++i].trim().split(/\s+/); J[q[0]] = q.slice(1, 4).map(Number); } }
    else if (p[0] === "ossos") i += +p[1];
  }
  fecharSecao();
  const juntas = completarPontos(J);
  return {nome: c.nome, corpo: c, juntas: juntas, larguras: Object.assign({}, LARGURA_PADRAO), repouso: repousoDoRig(juntas), animacoes: animacoes, avisosDoRig: []};
}

if (typeof module !== "undefined") module.exports = {
  corridas, lerCorridas, hex, deHex, novoProjeto, salvarProjeto, lerProjeto, exportarPersonagem, exportarPele, lerPele
};
