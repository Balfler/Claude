/* ============================================================
   SONDAGEM 1 -- 30 PERSONAGENS DIFERENTES NUMA PRACA
   ------------------------------------------------------------
   A pergunta: assar um visual por jogador cabe no quadro e na memoria?

   Hoje so o jogador tem fornada (20 poses x 8 rumos, cada quadro com a
   copia de meia resolucao para longe). Num MMO, cada jogador por perto com
   equipamento diferente pede a fornada dele. Esta pagina roda o jogo
   MONTADO (cripta-vhalgorn.html) sem o laco, como a bancada do canteiro, e
   mede no navegador de verdade:

     1. quanto custa assar um visual inteiro, tarefa por tarefa;
     2. quanto ele ocupa de memoria;
     3. quanto custa desenhar 0, 10, 30 e 60 personagens na praca;
     4. o que acontece quando 30 visuais novos chegam de uma vez, com o
        forno de 3 ms por quadro do jogo;
     5. quanto custaria assar so o que aparece (uma pose num rumo), sob
        demanda, em vez da fornada inteira.

   Uso: servir a raiz do repositorio e abrir
   mundo-perigoso/sondagens/1-personagens/praca.html
   (ou rodar `node mundo-perigoso/sondagens/1-personagens/rodar.js`).
   ============================================================ */
"use strict";
const saida = document.getElementById("saida"), estado = document.getElementById("estado");
function log(s){ saida.textContent += s + "\n"; }
const agora = () => performance.now();
const R = window.RESULTADOS = {};

const EXPOR = [
  "G:G", "P:P", "render:render", "setCamera:setCamera", "floorAt:floorAt", "ents:()=>ents",
  "novaFornada:novaFornada", "escolhaDoPersonagem:escolhaDoPersonagem", "PECAS:PECAS",
  "ORDEM_PECAS:ORDEM_PECAS", "TODAS_AS_POSES:TODAS_AS_POSES", "DIM_PERSONAGEM:DIM_PERSONAGEM",
  "VOX_PERSONAGEM:VOX_PERSONAGEM", "quadroDaPose:quadroDaPose", "get HORIZONTE(){return HORIZONTE;}",
  "gradeDoPersonagem:gradeDoPersonagem", "peleDoModelo:peleDoModelo", "reduzirGrade:reduzirGrade",
  "assarRotacoes:assarRotacoes", "materiaisDoPersonagem:materiaisDoPersonagem",
  "P_PERSONAGEM:P_PERSONAGEM", "CONTORNO_DO_PERSONAGEM:CONTORNO_DO_PERSONAGEM", "ROTACOES:ROTACOES",
  "renderWorld:renderWorld", "renderEntities:renderEntities", "get FAR(){return FAR;}",
  "get CORPO_DESENHADO(){return CORPO_DESENHADO;}", "CORES_PERSONAGEM:CORES_PERSONAGEM", "ctx:ctx",
  "get img(){return img;}"
].join(",");

async function jogo(busca){
  const html = await fetch("../../../cripta-vhalgorn.html", {cache: "no-store"}).then(r => r.text());
  let js = html.match(/<script>\n([\s\S]*)<\/script>/)[1];
  js = js.split("location.search").join("__BUSCA__");
  if (js.split("cvs.focus();\n})();").length !== 2) throw new Error("costura ambigua no fim do jogo");
  js = js.replace("cvs.focus();\n})();", "cvs.focus();\nwindow.__J={" + EXPOR + "};\n})();");
  new Function("requestAnimationFrame", "__BUSCA__", "history", js)(function(){}, busca, undefined);
  const J = window.__J; window.__J = null; J.G.mode = "play"; return J;
}

/* Trinta visuais diferentes, sempre os mesmos: cada um troca o que o
   provador deixa trocar sobre o corpo desenhado. */
function visuais(J, n){
  const op = {};
  for (const k of J.ORDEM_PECAS) op[k] = Object.keys(J.PECAS[k]);
  const lista = [], vistos = new Set();
  let s = 12345;
  const sorteio = m => { s = (s*1103515245 + 12345) >>> 0; return (s >>> 8) % m; };
  while (lista.length < n){
    const e = {};
    for (const k of J.ORDEM_PECAS) e[k] = op[k][sorteio(op[k].length)];
    for (const k in J.CORES_PERSONAGEM) e[k] = sorteio(J.CORES_PERSONAGEM[k].length);
    const esc = J.escolhaDoPersonagem(e), chave = JSON.stringify(esc);
    if (vistos.has(chave)) continue;
    vistos.add(chave); lista.push(esc);
  }
  return lista;
}

function bytesDaFornada(f){
  let px = 0, quadros = 0;
  const tabelas = new Set();
  for (const pose of f.quadros) for (const q of pose){
    if (!q) continue;
    quadros++; px += q.px.byteLength; tabelas.add(q.cm);
    if (q.longe){ px += q.longe.px.byteLength; tabelas.add(q.longe.cm); }
  }
  let cm = 0;
  for (const t of tabelas) cm += t.byteLength || (t.length*4);
  return {quadros, px, tabelas: tabelas.size, cm};
}

/* 1 e 2: assar visual por visual, uma tarefa por vez (trabalhar(0) faz uma so) */
function medirFornadas(J, lista){
  const porVisual = [], tGrade = [], tRumo = [];
  let bytes = null;
  for (const e of lista){
    const f = J.novaFornada(e, J.HORIZONTE);
    const t0 = agora();
    let k = 0;
    while (!f.pronta()){
      const a = agora();
      f.trabalhar(0);
      const dt = agora() - a;
      (k % (J.ROTACOES + 1) === 0 ? tGrade : tRumo).push(dt);
      k++;
    }
    porVisual.push(agora() - t0);
    if (!bytes) bytes = bytesDaFornada(f);
    e.__fornada = f; e.__quadros = f.quadros;
  }
  return {porVisual, tGrade, tRumo, bytes, tarefasPorVisual: J.TODAS_AS_POSES.length*(J.ROTACOES + 1)};
}

const estat = a => {
  const b = a.slice().sort((x, y) => x - y), soma = b.reduce((s, x) => s + x, 0);
  return {n: b.length, media: soma/b.length, mediana: b[b.length >> 1], p95: b[Math.floor(b.length*0.95)], max: b[b.length-1], soma};
};
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);

/* 3: a praca com N personagens. Cada um vira uma entidade de cenario com o
   quadro da pose parada no rumo certo -- o mesmo caminho de desenho do
   cenario e do jogador (drawBillboard), com a copia para longe pela
   distancia. Ficam em volta da camera, na frente dela, de 2 a 14 tiles. */
const PRACA = {x: 108.5, y: 82.5};
function posicionar(J, ang){
  J.P.x = PRACA.x; J.P.y = PRACA.y; J.P.ang = ang; J.P.pitch = 0;
  J.P.z = J.floorAt(Math.floor(PRACA.x), Math.floor(PRACA.y));
  J.P.vx = J.P.vy = J.P.vz = 0; J.P.bob = 0; J.setCamera(0);
}
function porNaPraca(J, lista, n, ang, perto){
  const ents = J.ents(), fake = [];
  for (let i = 0; i < n; i++){
    const v = lista[i % lista.length];
    const a = ang + ((i*0.61803) % 1 - 0.5)*1.4;          // dentro do campo de visao
    const d = perto ? 1.6 + (i % 5)*0.5 : 2 + ((i*7) % 13);
    const x = PRACA.x + Math.cos(a)*d, y = PRACA.y + Math.sin(a)*d;
    const rumo = i % J.ROTACOES;
    const q = J.quadroDaPose(v.__quadros, 0, rumo);
    fake.push({kind: "cena", type: "sondagem", x, y, z: J.floorAt(Math.floor(x), Math.floor(y)), img: q,
               larg: J.DIM_PERSONAGEM.DX*J.VOX_PERSONAGEM, alto: J.DIM_PERSONAGEM.DZ*J.VOX_PERSONAGEM});
  }
  for (const e of fake) ents.push(e);
  return () => { for (const e of fake){ const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); } };
}
function medirQuadro(J, lista, n, perto){
  const tempos = [], soEnt = [];
  for (let k = 0; k < 8; k++){
    const ang = k*Math.PI/4;
    posicionar(J, ang);
    const tirar = porNaPraca(J, lista, n, ang, perto);
    for (let r = 0; r < 3; r++) J.render();                    // aquece
    for (let r = 0; r < 6; r++){
      const a = agora(); J.render(); tempos.push(agora() - a);
      J.renderWorld(); const b = agora(); J.renderEntities(); soEnt.push(agora() - b);
    }
    tirar();
  }
  return {quadro: estat(tempos), entidades: estat(soEnt)};
}

/* 4: trinta visuais novos chegam juntos. O jogo roda o forno ate 3 ms por
   quadro, mas faz sempre pelo menos uma tarefa inteira -- entao o soluco
   de um quadro e a tarefa mais lenta, e o tempo total e a soma. */
function simularChegada(med, nVisuais, forno){
  const tarefas = [];
  for (let v = 0; v < nVisuais; v++){
    for (let p = 0; p < 20; p++){
      tarefas.push(med.tGrade[(v*20 + p) % med.tGrade.length]);
      for (let r = 0; r < 8; r++) tarefas.push(med.tRumo[(v*160 + p*8 + r) % med.tRumo.length]);
    }
  }
  let quadros = 0, i = 0, pior = 0, acima = 0;
  while (i < tarefas.length){
    let gasto = 0;
    do { gasto += tarefas[i++]; } while (i < tarefas.length && gasto < forno);
    quadros++; if (gasto > pior) pior = gasto; if (gasto > 8) acima++;
  }
  return {tarefas: tarefas.length, quadros, segundosA60: quadros/60, piorQuadroMs: pior, quadrosAcimaDe8ms: acima};
}

/* 5: sob demanda -- a grade de uma pose e um rumo so. E o que custaria
   mostrar um personagem novo sem esperar a fornada: a pose e o rumo em que
   ele esta agora. */
function medirSobDemanda(J, lista){
  const t = [];
  for (let i = 0; i < 6; i++){
    const e = lista[i], a = agora();
    const f = J.novaFornada(e, J.HORIZONTE, [0], 1);
    f.trabalhar(Infinity);
    t.push(agora() - a);
  }
  return estat(t);
}

function medirGrade(J, lista){
  const D = J.DIM_PERSONAGEM, t = {montar: [], pele: [], reduzir: [], peleLonge: [], voxels: [], superficie: []};
  for (let i = 0; i < 3; i++) for (const pose of J.TODAS_AS_POSES){
    const e = lista[i];
    let a = agora(); const g = J.gradeDoPersonagem(e, pose); t.montar.push(agora() - a);
    a = agora(); const pele = J.peleDoModelo(g, D.DX, D.DY, D.DZ); t.pele.push(agora() - a);
    a = agora(); const r = J.reduzirGrade(g, D.DX, D.DY, D.DZ); t.reduzir.push(agora() - a);
    a = agora(); J.peleDoModelo(r.g, r.DX, r.DY, r.DZ); t.peleLonge.push(agora() - a);
    let n = 0; for (let k = 0; k < g.length; k++) if (g[k]) n++;
    t.voxels.push(n); t.superficie.push(pele.length);
  }
  const o = {}; for (const k in t) o[k] = estat(t[k]); return o;
}

async function rodar(){
  estado.textContent = "carregando o jogo";
  const J = await jogo("?mapa=ilha");
  log("corpo desenhado: " + !!J.CORPO_DESENHADO + " | grade " + J.DIM_PERSONAGEM.DX + "x" + J.DIM_PERSONAGEM.DY + "x" + J.DIM_PERSONAGEM.DZ +
      " | " + J.TODAS_AS_POSES.length + " poses x " + J.ROTACOES + " rumos");
  const lista = visuais(J, 30);
  R.visuais = lista.map(e => { const o = {}; for (const k of J.ORDEM_PECAS) o[k] = e[k]; return o; });

  if (window.gc) window.gc();
  const memA = performance.memory ? performance.memory.usedJSHeapSize : 0;

  estado.textContent = "assando 30 visuais";
  const med = medirFornadas(J, lista);
  const g = estat(med.tGrade), r = estat(med.tRumo), v = estat(med.porVisual);
  R.fornada = {tarefasPorVisual: med.tarefasPorVisual, visual: v, grade: g, rumo: r, bytes: med.bytes};
  log("\n1. ASSAR UM VISUAL INTEIRO (" + med.tarefasPorVisual + " tarefas: 20 grades + 160 rumos)");
  log("   por visual: media " + f1(v.media) + " ms, mediana " + f1(v.mediana) + ", max " + f1(v.max));
  log("   tarefa de grade (pose -> voxels, pele, copia de longe): media " + f2(g.media) + " ms, p95 " + f2(g.p95) + ", max " + f2(g.max));
  log("   tarefa de rumo (assar um rumo, perto e longe):         media " + f2(r.media) + " ms, p95 " + f2(r.p95) + ", max " + f2(r.max));
  log("   30 visuais: " + f1(v.soma/1000) + " s de CPU");

  if (window.gc) window.gc();
  const memB = performance.memory ? performance.memory.usedJSHeapSize : 0;
  const b = med.bytes;
  R.memoria = {pxPorVisual: b.px, quadrosPorVisual: b.quadros, tabelasPorVisual: b.tabelas, cmPorVisual: b.cm,
               heapAntes: memA, heapDepois: memB, heapPorVisual: (memB - memA)/30};
  log("\n2. MEMORIA");
  log("   pixels de um visual: " + f1(b.px/1024) + " KB em " + b.quadros + " quadros (mais " + b.tabelas + " tabelas de cor, " + f1(b.cm/1024) + " KB)");
  if (memB) log("   heap do navegador com as fornadas vivas: +" + f1((memB - memA)/1048576) + " MB para 30 visuais, " + f1((memB - memA)/30/1048576) + " MB por visual");
  for (const e of lista) delete e.__fornada;
  if (window.gc) window.gc();
  const memC = performance.memory ? performance.memory.usedJSHeapSize : 0;
  R.memoria.heapSoQuadros = memC;
  if (memC) log("   so com os quadros (a fornada solta): +" + f1((memC - memA)/1048576) + " MB para 30 visuais, " + f1((memC - memA)/30/1048576) + " MB por visual");
  log("   (a diferenca e o que a fornada pronta continua segurando: as tarefas guardam a pele de cada pose)");

  estado.textContent = "desenhando a praca";
  log("\n3. O QUADRO NA PRACA (640x360, pose parada, oito rumos de camera)");
  R.quadro = {};
  for (const [n, perto] of [[0, false], [10, false], [30, false], [60, false], [30, true]]){
    const m = medirQuadro(J, lista, n, perto);
    R.quadro[n + (perto ? "-perto" : "")] = m;
    log("   " + String(n).padStart(2) + " personagens" + (perto ? " colados (1,6 a 3,6 tiles)" : " (2 a 14 tiles)       ") +
        ": quadro " + f1(m.quadro.media) + " ms (pior " + f1(m.quadro.max) + "), so entidades " + f2(m.entidades.media) + " ms");
  }

  log("\n1b. ONDE VAI O TEMPO DA TAREFA DE GRADE (3 visuais x 20 poses)");
  const mg = medirGrade(J, lista); R.grade = mg;
  log("   montar a grade (corpo do quadro + pecas): " + f2(mg.montar.media) + " ms");
  log("   pele (superficie com normal e sombra):    " + f2(mg.pele.media) + " ms  (" + Math.round(mg.superficie.media) + " voxels de superficie de " + Math.round(mg.voxels.media) + ")");
  log("   reduzir para longe:                       " + f2(mg.reduzir.media) + " ms");
  log("   pele da copia de longe:                   " + f2(mg.peleLonge.media) + " ms");

  log("\n4. TRINTA VISUAIS NOVOS CHEGAM JUNTOS (forno de 3 ms por quadro)");
  const c = simularChegada(med, 30, 3);
  R.chegada = c;
  log("   " + c.tarefas + " tarefas em " + c.quadros + " quadros: " + f1(c.segundosA60) + " s a 60 qps ate o ultimo terminar");
  log("   pior quadro do forno: " + f1(c.piorQuadroMs) + " ms; quadros em que o forno sozinho passa de 8 ms: " + c.quadrosAcimaDe8ms);

  log("\n5. SOB DEMANDA: UMA POSE NUM RUMO");
  const s = medirSobDemanda(J, lista);
  R.sobDemanda = s;
  log("   primeira aparicao de um visual (grade + um rumo): media " + f1(s.media) + " ms, max " + f1(s.max));

  /* a foto: 30 personagens na praca, olhando para o norte */
  posicionar(J, -Math.PI/2);
  const tirar = porNaPraca(J, lista, 30, -Math.PI/2, false);
  J.render(); tirar();
  const perto = porNaPraca(J, lista, 12, -Math.PI/2, true);
  R.fotoPronta = true;
  window.FOTO_PERTO = () => { J.render(); };
  window.FOTO_LONGE = () => { perto(); const t = porNaPraca(J, lista, 30, -Math.PI/2, false); J.render(); t(); };

  estado.textContent = "pronto";
  window.PRONTO = true;
}
rodar().catch(e => { log("ERRO: " + e.stack); estado.textContent = "erro"; window.PRONTO = true; R.erro = String(e.stack); });
