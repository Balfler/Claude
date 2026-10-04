/* ============================================================
   BANCADA DE MEDICAO
   ------------------------------------------------------------
   Roda o jogo montado (cripta-vhalgorn.html) dentro desta pagina, sem o
   laco dele, e mede o quadro por pedaco: ceu, montar a geometria, desenhar
   os poligonos, entidades e o quadro inteiro. Tudo em 640x360, no
   navegador de verdade -- no node as texturas saem vazias e o z-buffer nao
   rejeita nada, entao o tempo de la nao vale.

   Uma segunda copia do jogo sai com contadores costurados no rasterizador
   (triangulos, pixels testados, pixels pintados), para dizer ONDE o tempo
   vai: pintar demais o mesmo pixel ou poligono demais.

   Uso: servir a raiz do repositorio (servidor "cripta") e abrir
   mundo-perigoso/canteiro/bancada/bancada.html?rodar=base
   ============================================================ */
"use strict";
const saida = document.getElementById("saida"), estado = document.getElementById("estado");
function log(s){ saida.textContent += s + "\n"; }
const agora = () => performance.now();
const RESULTADOS = {};
window.RESULTADOS = RESULTADOS;

const EXPOR = [
  "G:G", "P:P", "render:render", "drawSky:drawSky", "buildGeometry:buildGeometry",
  "renderEntities:renderEntities", "drawQuad:drawQuad", "QUADS:QUADS", "desenharFace:desenharFace",
  "nQuads:()=>quadCount", "setCamera:setCamera", "get camX(){return camX;}", "get camY(){return camY;}",
  "get camZ(){return camZ;}", "get cyaw(){return cyaw;}", "get syaw(){return syaw;}", "get TANH(){return TANH;}",
  "get zbuf(){return zbuf;}", "get buf(){return buf;}", "get RW(){return RW;}", "get RVH(){return RVH;}",
  "TEX:TEX", "floorAt:floorAt", "ceilAt:ceilAt", "MW:MW", "MH:MH", "ents:()=>ents", "ILHA:ILHA",
  "FAR:FAR", "drawBillboard:drawBillboard", "CENARIO:CENARIO", "AJUSTE:AJUSTE", "ctx:ctx",
  "get img(){return img;}", "drawPoly:drawPoly", "MAP:MAP", "lightAt:lightAt", "renderWorld:renderWorld",
  "trocarMundo:trocarMundo", "montarPecas:montarPecas", "geometriaDaPeca:geometriaDaPeca",
  "TIPOS_DE_PECA:TIPOS_DE_PECA", "ESTILOS:ESTILOS", "get SOLIDOS(){return SOLIDOS;}", "buildLevel:buildLevel"
].join(",");

let HTML = null, EXPOR_EXTRA = "";
const HTMLS = {};
/* Um jogo montado qualquer (o de agora ou uma copia antiga), sem costura:
   so o gancho e o laco desligado. Para comparar motores. */
async function jogoDe(url, busca){
  if (!HTMLS[url]) HTMLS[url] = await fetch(url, {cache: "no-store"}).then(r => r.text());
  let js = HTMLS[url].match(/<script>\n([\s\S]*)<\/script>/)[1];
  js = js.split("location.search").join("__BUSCA__");
  js = js.replace("cvs.focus();\n})();", "cvs.focus();\nwindow.__J={G:G, P:P, render:render, setCamera:setCamera, floorAt:floorAt, get buf(){return buf;}, get quadCount(){return quadCount;}, TEX:TEX};\n})();");
  new Function("requestAnimationFrame", "__BUSCA__", "history", js)(function(){}, busca, undefined);
  const J = window.__J; window.__J = null; J.G.mode = "play"; return J;
}
/* ---------- comparar o motor novo com o antigo ----------
   Mesmos lugares, oito rumos cada, o quadro inteiro (mundo, entidades e
   HUD). Conta os pixels diferentes e mede os dois. */
async function comparar(){
  for (const [nome, busca, lugares] of [["ilha", "?mapa=ilha", LUGARES], ["cripta", "?mapa=cripta", [{nome:"entrada", x:7.5, y:29.5}, {nome:"salao", x:8.5, y:17.5}, {nome:"lava", x:24.5, y:9.5}, {nome:"biblioteca", x:25.5, y:18.5}, {nome:"altar", x:30.5, y:27.5}]]]){
    const A = await jogoDe("antigo.html", busca), B = await jogoDe("../../../cripta-vhalgorn.html", busca);
    log(nome + ":");
    for (const l of lugares){
      let pior = {dif: -1}, tA = [], tB = [];
      for (let k = 0; k < 8; k++){
        for (const J of [A, B]){ posicionar(J, Object.assign({}, l, {ang: k*Math.PI/4})); J.G.tick = 1; J.G.time = 1; }
        A.render(); B.render();
        let dif = 0; const a = A.buf, b = B.buf; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dif++;
        if (dif > pior.dif) pior = {dif: dif, rumo: k*45};
        for (let r = 0; r < 6; r++){ let t = agora(); A.render(); tA.push(agora() - t); t = agora(); B.render(); tB.push(agora() - t); }
      }
      log("  " + l.nome.padEnd(11) + " antigo " + String(r1(mediana(tA))).padStart(5) + " ms   novo " + String(r1(mediana(tB))).padStart(5) +
          " ms   pior rumo " + pior.rumo + ": " + pior.dif + " pixels diferentes (" + r1(100*pior.dif/A.buf.length) + "%)");
    }
  }
}
/* O laco de dentro do rasterizador, com a perspectiva certa so a cada 16
   pixels e reta no meio -- o que o Quake fazia. Tira a divisao e tres
   multiplicacoes de cada pixel. A luz vale para o bloco inteiro. */
const LACO_VELHO = `    const row = y*RW;
    for (; px<pxe; px++){`;
const LACO_SUBDIVIDIDO = `    const row = y*RW;
    if (!spr){
      let u0 = uz/iz*tw, v0 = vz/iz*th;
      while (px < pxe){
        const n = pxe - px < 16 ? pxe - px : 16;
        const iz1 = iz + zs*n, uz1 = uz + us*n, vz1 = vz + vs*n;
        const u1 = uz1/iz1*tw, v1 = vz1/iz1*th, du = (u1 - u0)/n, dv = (v1 - v0)/n;
        const zm = 2/(iz + iz1);
        const base = (emis ? (zm > 7 ? emis : 0) : lightAt(zm)) << 8;
        let u = u0, v = v0, izp = iz;
        const fim = px + n;
        for (; px < fim; px++){
          const i = row + px;
          if (izp > zbuf[i]){
            const col = tcm[base | tpx[((v|0) & mh)*tw + ((u|0) & mw)]];
            if (col){ buf[i] = col; zbuf[i] = izp; }
          }
          izp += zs; u += du; v += dv;
        }
        iz = iz1; uz = uz1; vz = vz1; u0 = u1; v0 = v1;
      }
      continue;
    }
    for (; px<pxe; px++){`;
/* Oclusao por blocos de 8x8 pixels: cada bloco sabe quantos pixels ja
   foram pintados e a profundidade mais longe entre eles (1/z mais baixo,
   so piora ao cobrir -- conservador). Um poligono cujo retangulo na tela
   cai so em blocos cheios e mais perto que ele nem chega ao rasterizador. */
const POLI_VELHO = `  for (let i=0;i<m;i++) project(VB[i]);
  for (let i=1;i<m-1;i++) rasterTri(VB[0], VB[i], VB[i+1], tex, emis, spr);`;
const POLI_OCLUSAO = `  for (let i=0;i<m;i++) project(VB[i]);
  if (HZ_N && !spr){
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, izm = 0;
    for (let i=0;i<m;i++){ const v = VB[i]; if (v.sx < x0) x0 = v.sx; if (v.sx > x1) x1 = v.sx; if (v.sy < y0) y0 = v.sy; if (v.sy > y1) y1 = v.sy; if (v.iz > izm) izm = v.iz; }
    const bx0 = Math.max(0, x0|0) >> 3, bx1 = Math.min(RW-1, x1|0) >> 3, by0 = Math.max(0, y0|0) >> 3, by1 = Math.min(RVH-1, y1|0) >> 3;
    let oculto = bx1 >= bx0 && by1 >= by0;
    for (let by=by0; by<=by1 && oculto; by++) for (let bx=bx0; bx<=bx1; bx++){ const k = by*HZ_W + bx; if (HZ_N[k] < 64 || HZ_Z[k] <= izm){ oculto = false; break; } }
    if (oculto){ HZ_PULADOS++; return; }
  }
  for (let i=1;i<m-1;i++) rasterTri(VB[0], VB[i], VB[i+1], tex, emis, spr);`;
const ESCRITA_VELHA = "            if (col){ buf[i] = col; zbuf[i] = izp; }";
const ESCRITA_OCLUSAO = "            if (col){ if (zbuf[i] === 0){ const k = (y >> 3)*HZ_W + (px >> 3); HZ_N[k]++; if (izp < HZ_Z[k]) HZ_Z[k] = izp; } buf[i] = col; zbuf[i] = izp; }";
const HZ_DECL = "let HZ_N = null, HZ_Z = null, HZ_W = 0, HZ_PULADOS = 0;\nfunction hzZerar(){ HZ_W = RW >> 3; const n = HZ_W*(RVH >> 3); if (!HZ_N || HZ_N.length !== n){ HZ_N = new Uint8Array(n); HZ_Z = new Float32Array(n); } HZ_N.fill(0); HZ_Z.fill(1e9); HZ_PULADOS = 0; }\n";
/* Variante "local": o laco subdividido lendo buf e zbuf de constantes da
   propria funcao, em vez das variaveis do modulo (que o JIT rele a cada pixel). */
const LOCAL_TOPO_VELHO = "function rasterTri(a,b,c, tex, emis, spr){\n  let t;";
const LOCAL_TOPO_NOVO = "function rasterTri(a,b,c, tex, emis, spr){\n  const ZB = zbuf, BF = buf, LW = RW;\n  let t;";
async function jogo(busca, contar, subdividir, oclusao, local){
  if (!HTML) HTML = await fetch("../../../cripta-vhalgorn.html", {cache: "no-store"}).then(r => r.text());
  let js = HTML.match(/<script>\n([\s\S]*)<\/script>/)[1];
  js = js.split("location.search").join("__BUSCA__");
  const troca = (de, para) => { if (js.split(de).length !== 2) throw new Error("costura ambigua: " + de); js = js.replace(de, para); };
  if (subdividir || oclusao || local) troca(LACO_VELHO, LACO_SUBDIVIDIDO);
  if (local){
    troca(LOCAL_TOPO_VELHO, LOCAL_TOPO_NOVO);
    troca("          if (izp > zbuf[i]){\n            const col = tcm[base | tpx[((v|0) & mh)*tw + ((u|0) & mw)]];\n            if (col){ buf[i] = col; zbuf[i] = izp; }",
          "          if (izp > ZB[i]){\n            const col = tcm[base | tpx[((v|0) & mh)*tw + ((u|0) & mw)]];\n            if (col){ BF[i] = col; ZB[i] = izp; }");
    troca("    const row = y*RW;\n    if (!spr){", "    const row = y*LW;\n    if (!spr){");
  }
  if (oclusao){
    troca(POLI_VELHO, POLI_OCLUSAO);
    troca(ESCRITA_VELHA, ESCRITA_OCLUSAO);
    troca("function drawPoly(n, tex, emis, spr){", HZ_DECL + "function drawPoly(n, tex, emis, spr){");
    EXPOR_EXTRA = ",hzZerar:hzZerar,get hzPulados(){return HZ_PULADOS;}";
  } else EXPOR_EXTRA = "";
  if (contar){
    troca("function rasterTri(a,b,c, tex, emis, spr){", "function rasterTri(a,b,c, tex, emis, spr){ __C.tri++;");
    troca("    for (; px<pxe; px++){\n      const i = row + px;", "    __C.spans++;\n    for (; px<pxe; px++){\n      const i = row + px; __C.teste++;");
    troca("      if (iz > zbuf[i]){\n        const z = 1/iz;", "      if (iz > zbuf[i]){ __C.passou++;\n        const z = 1/iz;");
  }
  js = js.replace("cvs.focus();\n})();", "cvs.focus();\nwindow.__J={" + EXPOR + EXPOR_EXTRA + "};\n})();");
  const f = new Function("requestAnimationFrame", "__BUSCA__", js);
  f(function(){}, busca);
  const J = window.__J;
  window.__J = null;
  J.G.mode = "play";
  return J;
}
window.__C = {tri:0, spans:0, teste:0, passou:0};
function zerarC(){ const c = window.__C; c.tri = c.spans = c.teste = c.passou = 0; }

function posicionar(J, p){
  J.P.x = p.x; J.P.y = p.y; J.P.ang = p.ang; J.P.pitch = p.pitch || 0;
  J.P.z = p.z !== undefined ? p.z : J.floorAt(Math.floor(p.x), Math.floor(p.y));
  J.P.vx = J.P.vy = J.P.vz = 0; J.P.bob = 0;
  J.setCamera(0);
}
function mediana(a){ const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; }
const r1 = v => Math.round(v*10)/10;

/* o quadro por pedaco, no jeito que o jogo desenha hoje */
function pedacos(J, n){
  const t = {ceu: [], geo: [], rast: [], ent: [], total: []};
  for (let k = 0; k < n; k++){
    J.setCamera(0);
    const a = agora(); J.drawSky();
    const b = agora(); J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
    const c = agora();
    const Q = J.QUADS, nq = J.nQuads();
    for (let i = 0; i < nq; i++){ const q = Q[i]; J.drawQuad(q.p, q.uv[0], q.uv[1], q.uv[2], q.uv[3], q.tex, q.emis, 0); }
    const d = agora(); J.renderEntities();
    const e = agora();
    t.ceu.push(b - a); t.geo.push(c - b); t.rast.push(d - c); t.ent.push(e - d);
  }
  for (let k = 0; k < n; k++){ const a = agora(); J.render(); t.total.push(agora() - a); }
  const r = {};
  for (const k in t) r[k] = r1(mediana(t[k]));
  r.quads = J.nQuads();
  return r;
}

/* ---------- ordem e descarte de face ----------
   A normal de um quad e (p1-p0)x(p3-p0). No compilador de hoje piso e forro
   apontam para quem os ve, e a parede aponta para o lado de FORA do tile
   que a emitiu (quem ve esta dentro dele) -- as duas convencoes convivem.
   O telhado so se ve de cima. */
function normal(p){
  const ax = p[3]-p[0], ay = p[4]-p[1], az = p[5]-p[2], bx = p[9]-p[0], by = p[10]-p[1], bz = p[11]-p[2];
  return [ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx];
}
function frente(p, cx, cy, cz){
  const n = normal(p), d = n[0]*(cx-p[0]) + n[1]*(cy-p[1]) + n[2]*(cz-p[2]);
  const horiz = Math.abs(n[0]) < 1e-9 && Math.abs(n[1]) < 1e-9;
  if (horiz) return d > 0;
  if (Math.abs(n[2]) > 1e-9) return (n[2] > 0 ? d : -d) > 0;       // telhado
  return d < 0;
}
function copiarQuads(J){
  const out = [], Q = J.QUADS, nq = J.nQuads();
  for (let i = 0; i < nq; i++){ const q = Q[i]; out.push({p: q.p.slice(), uv: q.uv.slice(), tex: q.tex, emis: q.emis}); }
  return out;
}
function desenharLista(J, lista){
  J.drawSky(); J.zbuf.fill(0); if (J.hzZerar) J.hzZerar();
  for (const q of lista) J.drawQuad(q.p, q.uv[0], q.uv[1], q.uv[2], q.uv[3], q.tex, q.emis, 0);
}
function variantes(J, n, extra){
  J.setCamera(0);
  J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
  const base = copiarQuads(J).concat(extra || []);
  const cx = J.camX, cy = J.camY, cz = J.camZ;
  const dist = q => { const x = (q.p[0]+q.p[6])/2 - cx, y = (q.p[1]+q.p[7])/2 - cy, z = (q.p[2]+q.p[8])/2 - cz; return x*x + y*y + z*z; };
  const ordenada = base.slice().sort((a, b) => dist(a) - dist(b));
  const descartada = base.filter(q => frente(q.p, cx, cy, cz));
  const ambas = ordenada.filter(q => frente(q.p, cx, cy, cz));
  const listas = {hoje: base, ordenada: ordenada, descarte: descartada, ambas: ambas};
  desenharLista(J, base); const ref = J.buf.slice();
  const r = {};
  for (const k in listas) for (let i = 0; i < 5; i++) desenharLista(J, listas[k]);
  for (const k in listas){
    const ts = [];
    for (let i = 0; i < n; i++){ const a = agora(); desenharLista(J, listas[k]); ts.push(agora() - a); }
    let dif = 0; const b = J.buf;
    for (let i = 0; i < ref.length; i++) if (b[i] !== ref[i]) dif++;
    r[k] = {ms: r1(mediana(ts)), quads: listas[k].length, difPixels: dif};
  }
  return r;
}
function contar(Jc, lista){
  zerarC(); desenharLista(Jc, lista);
  const c = window.__C, px = Jc.RW*Jc.RVH;
  return {tri: c.tri, testados: r1(c.teste/px), pintados: r1(c.passou/px)};
}

/* ---------- os lugares ----------
   Na ilha de hoje (mapas/ilha.mapa): a chegada no pier, dentro da taverna de
   Pedra Alta (onde a medicao antiga deu 20 ms), a praca, e do alto da
   capela olhando a cidade. Cada lugar e medido em oito rumos. */
const LUGARES = [
  {nome: "pier",       x: 159.5, y: 75.5},
  {nome: "taverna",    x: 116.6, y: 85.2},
  {nome: "praca",      x: 108.5, y: 82.5},
  {nome: "capela",     x: 103.0, y: 75.5},
  {nome: "estrada",    x: 135.5, y: 76.5}
];

async function base(){
  const J = await jogo("?mapa=ilha", false);
  const Jc = await jogo("?mapa=ilha", true);
  log("ilha " + J.MW + "x" + J.MH + ", tela " + J.RW + "x" + J.RVH + ", alcance " + J.FAR + " tiles");
  /* aquecer: sem isso o primeiro lugar paga a compilacao do motor */
  for (const l of LUGARES) for (let k = 0; k < 8; k++){ posicionar(J, Object.assign({}, l, {ang: k*Math.PI/4})); for (let i = 0; i < 4; i++) J.render(); }
  const res = [];
  for (const l of LUGARES){
    let pior = null;
    for (let k = 0; k < 8; k++){
      const pose = Object.assign({}, l, {ang: k*Math.PI/4});
      posicionar(J, pose);
      const r = pedacos(J, 20);
      r.rumo = k*45;
      if (!pior || r.total > pior.total) pior = r;
    }
    posicionar(J, Object.assign({}, l, {ang: pior.rumo*Math.PI/180}));
    posicionar(Jc, Object.assign({}, l, {ang: pior.rumo*Math.PI/180}));
    pior.var = variantes(J, 30);
    Jc.setCamera(0); Jc.zbuf.fill(0); Jc.buildGeometry(Jc.camX, Jc.camY, Jc.cyaw, Jc.syaw, Jc.TANH);
    const lista = copiarQuads(Jc);
    pior.contagem = contar(Jc, lista);
    pior.nome = l.nome;
    res.push(pior);
    log(l.nome.padEnd(9) + " rumo " + String(pior.rumo).padStart(3) + ": total " + pior.total + " ms = ceu " + pior.ceu +
        " + geometria " + pior.geo + " + poligonos " + pior.rast + " + entidades " + pior.ent +
        "  | " + pior.quads + " quads, " + pior.contagem.tri + " triangulos, pixel testado " + pior.contagem.testados +
        "x, pintado " + pior.contagem.pintados + "x");
    for (const k in pior.var) log("            " + k.padEnd(10) + pior.var[k].ms + " ms, " + pior.var[k].quads + " quads, " + pior.var[k].difPixels + " pixels diferentes");
  }
  RESULTADOS.base = res;
}

/* ---------- tempo sem ruido ----------
   As listas sao desenhadas em rodadas intercaladas (A B C A B C ...) e vale a
   mediana: o navegador tem soluco de coletor e de frequencia, e medir uma
   lista inteira de uma vez pegava o soluco numa so. */
function cronometrar(J, listas, rodadas, extra){
  const nomes = Object.keys(listas), ts = {};
  for (const k of nomes){ ts[k] = []; for (let i = 0; i < 3; i++){ desenharLista(J, listas[k]); if (extra && extra[k]) extra[k](); } }
  for (let r = 0; r < rodadas; r++) for (const k of nomes){
    const a = agora(); desenharLista(J, listas[k]); if (extra && extra[k]) extra[k](); ts[k].push(agora() - a);
  }
  const out = {};
  for (const k of nomes) out[k] = {ms: r1(mediana(ts[k])), min: r1(Math.min.apply(null, ts[k])), quads: listas[k].length};
  return out;
}
/* ordena de perto para longe e descarta face de costas; os quads da cena
   de teste (f:1) seguem a convencao certa, os do terreno de hoje a velha */
function ordenarDescartar(lista, cx, cy, cz){
  const dist = q => { const x = (q.p[0]+q.p[6])/2 - cx, y = (q.p[1]+q.p[7])/2 - cy, z = (q.p[2]+q.p[8])/2 - cz; return x*x + y*y + z*z; };
  const vis = q => {
    if (!q.f) return frente(q.p, cx, cy, cz);
    const n = normal(q.p);
    return n[0]*(cx - q.p[0]) + n[1]*(cy - q.p[1]) + n[2]*(cz - q.p[2]) > 0;
  };
  return lista.filter(vis).map(q => [dist(q), q]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
}

/* ---------- o custo de um triangulo e de um pixel ----------
   Uma parede de 1 tile a 1,2 tile da camera, que cobre um bom pedaco da
   tela, dividida em k x k quads. Mesmos pixels, mais triangulos: a
   diferenca e o custo fixo de montar um triangulo. */
async function triangulo(){
  const J = await jogo("?mapa=ilha", false);
  posicionar(J, {x: 60.5, y: 20.5, ang: 0, z: 30});
  const lista = function(k){
    const L = [], x = J.camX + 1.2, y0 = J.camY - 0.5, z0 = J.camZ - 0.5;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++){
      const a = y0 + i/k, b = y0 + (i+1)/k, c = z0 + j/k, d = z0 + (j+1)/k;
      L.push({p: [x,b,c, x,a,c, x,a,d, x,b,d], uv: [a, -c, b, -d], tex: J.TEX.ilhaMuro, emis: 0});
    }
    return L;
  };
  const listas = {"1x1": lista(1), "4x4": lista(4), "16x16": lista(16), "64x64": lista(64)};
  const r = cronometrar(J, listas, 25);
  const tCeu = []; for (let i = 0; i < 25; i++){ const a = agora(); J.drawSky(); J.zbuf.fill(0); tCeu.push(agora() - a); }
  const ceu = mediana(tCeu);
  log("uma parede de 1 tile a 1,2 tile da camera, dividida em quads:");
  for (const k in r) log("  " + k.padEnd(6) + (r[k].quads*2 + " triangulos").padEnd(16) + r1(r[k].ms - ceu) + " ms (sem o ceu)");
  const por = (r["64x64"].ms - r["1x1"].ms)/(64*64*2 - 2);
  log("  => montar um triangulo custa uns " + r1(por*1000) + " microssegundos; o ceu custa " + r1(ceu) + " ms");
  RESULTADOS.triangulo = {r: r, ceu: ceu, porTriangulo: por};
}

/* ---------- a fortaleza ----------
   Um mapa plano de 160x160 com a fortaleza no meio, como poligono (A), como
   voxel fundido (B) e como sprite (C). Terreno igual nos tres. */
function mapaPlano(n){
  const m = novoMapa(n, n, {nome: "fortaleza", altura: 8, terreno: TERRENO_POR_CHAR[","]});
  m.coisas.push({x: n/2, y: n/2 + 15, tipo: "jogador", texto: ""});
  return escreverMapa(m);
}
async function fortaleza(){
  localStorage.setItem("editor-mapa:jogar", mapaPlano(160));
  const J = await jogo("?mapa=editor", false);
  const T = {muro: J.TEX.ilhaMuro, parede: J.TEX.ilhaTabua, telha: J.TEX.ilhaTelhado, laje: J.TEX.ilhaLajota,
             piso: J.TEX.ilhaTabuado, forro: J.TEX.ilhaForro, moldura: J.TEX.ilhaTabuaQuina};
  const z = J.floorAt(80, 80);
  const A = CENA.fortaleza(80, 80, 40, z, T);
  log("fortaleza em poligono: " + A.quads.length + " quads, " + A.pecas.length + " pecas");
  /* B: as pecas curvas e inclinadas viram voxel fundido; caixa e caixa nos dois */
  const V = 64, t0 = agora();
  const malha = function(dentro, x0, y0, z0, x1, y1, z1, tex, escalaZ){
    const L = [];
    CENA.malhaGulosa(dentro, 0, 0, 0, Math.round((x1-x0)*V), Math.round((y1-y0)*V), Math.round((z1-z0)*V), V, L, tex);
    return L.map(q => { const p = q.p.slice(); for (let i = 0; i < 12; i += 3){ p[i] += x0; p[i+1] += y0; p[i+2] = z0 + p[i+2]*(escalaZ || 1); }
      return {p: p, uv: q.uv, tex: q.tex, emis: 0, f: 1}; });
  };
  const cantos = [[60,60],[100,60],[60,100],[100,100]];
  /* o prisma da torre tem as faces de lado inteiras na altura: fundir uma
     torre de 1 tile e esticar da a mesma malha da de 6, bem mais rapido */
  const torre = c => malha((x, y) => Math.hypot(x - 2.5, y - 2.5) < 2.5, c[0] - 2.5, c[1] - 2.5, z, c[0] + 2.5, c[1] + 2.5, z + 1, T.muro, 6);
  const conico = c => malha((x, y, zz) => Math.hypot(x - 1.6, y - 1.6) < 1.6*(1 - zz/2.4), c[0] - 1.6, c[1] - 1.6, z + 6, c[0] + 1.6, c[1] + 1.6, z + 8.4, T.telha);
  const ehTorre = q => cantos.some(c => Math.hypot(q.p[0]-c[0], q.p[1]-c[1]) < 2.6 && Math.hypot(q.p[6]-c[0], q.p[7]-c[1]) < 2.6 && q.p[2] < z + 6.01 && q.p[8] < z + 6.01 && q.tex === T.muro && Math.abs(q.p[2]-q.p[8]) > 5);
  let B = A.quads.filter(q => q.tex !== T.telha && !ehTorre(q));
  for (const c of cantos) B = B.concat(torre(c), conico(c));
  const telhado = malha((x, y, zz) => zz < 1.4*(1 - Math.abs(y - 2.25)/2.25), 0, 0, 0, 5.5, 4.5, 1.4, T.telha);
  for (let k = 0; k < 12; k++){
    const hx = 60 + 5 + (k % 4)*7.5 - 0.25, hy = 60 + 6 + ((k / 4) | 0)*9.5 - 0.25;
    for (const q of telhado){ const p = q.p.slice(); for (let i = 0; i < 12; i += 3){ p[i] += hx; p[i+1] += hy; p[i+2] += z + 3; } B.push({p: p, uv: q.uv, tex: q.tex, emis: 0, f: 1}); }
  }
  log("fortaleza em voxel fundido (64 por tile): " + B.length + " quads (montada em " + Math.round(agora() - t0) + " ms)");
  /* C: um sprite por peca, do tamanho dela. A imagem e uma peca de cenario
     assada de verdade, esticada: o que conta e a area e a transparencia. */
  const imgPeca = {muralha: J.TEX.ilhaMuro, ameia: J.TEX.ilhaMuro, torre: J.CENARIO.poco.imgs[0], portao: J.CENARIO.entrada.imgs[0], sobrado: J.CENARIO.poco.imgs[0]};
  const LUG = [
    {nome: "patio",   x: 80.5, y: 94.5},
    {nome: "portao",  x: 80.5, y: 60.6},
    {nome: "adarve",  x: 70.5, y: 60.5, z: z + 4},
    {nome: "fora",    x: 80.5, y: 32.5},
    {nome: "sobrado", x: 67.5, y: 68.5, z: z + 1.5}
  ];
  const res = [];
  for (const l of LUG){
    let pior = null;
    for (let k = 0; k < 8; k++){
      posicionar(J, Object.assign({}, l, {ang: k*Math.PI/4}));
      J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
      const terreno = copiarQuads(J), cx = J.camX, cy = J.camY, cz = J.camZ;
      const lA = ordenarDescartar(terreno.concat(A.quads), cx, cy, cz);
      const lB = ordenarDescartar(terreno.concat(B), cx, cy, cz);
      const lT = ordenarDescartar(terreno, cx, cy, cz);
      const sprites = function(){ for (const p of A.pecas){ const dx = p.x - cx, dy = p.y - cy; if (dx*dx + dy*dy > 3600 || dx*J.cyaw + dy*J.syaw < -1) continue; J.drawBillboard(p.x, p.y, p.z, p.larg, p.alto, imgPeca[p.tipo]); } };
      const r = cronometrar(J, {A: lA, B: lB, C: lT, hojeA: terreno.concat(A.quads)}, 7, {C: sprites});
      r.rumo = k*45;
      if (!pior || r.A.ms > pior.A.ms) pior = r;
    }
    pior.nome = l.nome;
    posicionar(J, Object.assign({}, l, {ang: pior.rumo*Math.PI/180}));
    res.push(pior);
    log(l.nome.padEnd(8) + " rumo " + String(pior.rumo).padStart(3) + ":  A poligono " + pior.A.ms + " ms (" + pior.A.quads + " quads)   B voxel " +
        pior.B.ms + " ms (" + pior.B.quads + ")   C sprite " + pior.C.ms + " ms   | A sem ordenar nem descartar " + pior.hojeA.ms + " ms (" + pior.hojeA.quads + ")");
  }
  RESULTADOS.fortaleza = res;
  window.J = J; window.FORT = {A: A, B: B};
}

/* ---------- o rasterizador ----------
   Os mesmos lugares da ilha e da fortaleza (so poligono), em tres jeitos de
   desenhar: como hoje (ordem dos tiles, as duas faces), ordenado de perto
   para longe com a face de costas descartada, e isso com o laco subdividido.
   A ultima coluna e a imagem: quantos pixels saem diferentes da de hoje. */
async function rasterizador(){
  const res = [];
  const medir = function(nome, J, Js, Jo, lista){
    const cx = J.camX, cy = J.camY, cz = J.camZ;
    const od = ordenarDescartar(lista, cx, cy, cz);
    posicionar(Js, {x: J.P.x, y: J.P.y, z: J.P.z, ang: J.P.ang});
    posicionar(Jo, {x: J.P.x, y: J.P.y, z: J.P.z, ang: J.P.ang});
    const ts = {hoje: [], ordenada: [], subdividida: [], oclusao: []};
    const um = {hoje: () => desenharLista(J, lista), ordenada: () => desenharLista(J, od), subdividida: () => desenharLista(Js, od), oclusao: () => desenharLista(Jo, od)};
    for (const k in um) for (let i = 0; i < 3; i++) um[k]();
    for (let r = 0; r < 15; r++) for (const k in um){ const a = agora(); um[k](); ts[k].push(agora() - a); }
    um.hoje(); const ref = J.buf.slice(); um.subdividida(); um.oclusao();
    let dif = 0, difO = 0; for (let i = 0; i < ref.length; i++){ if (Js.buf[i] !== ref[i]) dif++; if (Jo.buf[i] !== Js.buf[i]) difO++; }
    const r = {nome: nome, quads: lista.length, visiveis: od.length};
    for (const k in ts) r[k] = r1(mediana(ts[k]));
    r.difPct = r1(100*dif/ref.length); r.difOclusao = difO; r.pulados = Jo.hzPulados;
    res.push(r);
    log(nome.padEnd(16) + " hoje " + String(r.hoje).padStart(5) + " ms   ordenada " + String(r.ordenada).padStart(5) +
        " ms   + subdividida " + String(r.subdividida).padStart(5) + " ms   + oclusao " + String(r.oclusao).padStart(5) + " ms   (" + r.quads + " quads, " + r.visiveis + " de frente, " + r.pulados + " pulados inteiros; subdividir muda " + r.difPct + "% dos pixels, a oclusao " + r.difOclusao + " pixels)");
  };
  {
    const J = await jogo("?mapa=ilha", false), Js = await jogo("?mapa=ilha", false, true), Jo = await jogo("?mapa=ilha", false, false, true);
    for (const l of LUGARES){
      let pior = -1, rumo = 0;
      for (let k = 0; k < 8; k++){
        posicionar(J, Object.assign({}, l, {ang: k*Math.PI/4}));
        J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
        const L = copiarQuads(J); desenharLista(J, L);
        const a = agora(); for (let i = 0; i < 3; i++) desenharLista(J, L); const t = agora() - a;
        if (t > pior){ pior = t; rumo = k; }
      }
      posicionar(J, Object.assign({}, l, {ang: rumo*Math.PI/4}));
      J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
      medir("ilha " + l.nome, J, Js, Jo, copiarQuads(J));
    }
  }
  {
    localStorage.setItem("editor-mapa:jogar", mapaPlano(160));
    const J = await jogo("?mapa=editor", false), Js = await jogo("?mapa=editor", false, true), Jo = await jogo("?mapa=editor", false, false, true);
    const T = {muro: J.TEX.ilhaMuro, parede: J.TEX.ilhaTabua, telha: J.TEX.ilhaTelhado, laje: J.TEX.ilhaLajota,
               piso: J.TEX.ilhaTabuado, forro: J.TEX.ilhaForro, moldura: J.TEX.ilhaTabuaQuina};
    const z = J.floorAt(80, 80), A = CENA.fortaleza(80, 80, 40, z, T);
    const LUG = [
      {nome: "patio",   x: 80.5, y: 94.5}, {nome: "portao", x: 80.5, y: 60.6}, {nome: "adarve", x: 70.5, y: 60.5, z: z + 4},
      {nome: "fora",    x: 80.5, y: 32.5}, {nome: "sobrado", x: 67.5, y: 68.5, z: z + 1.5}
    ];
    for (const l of LUG){
      let pior = -1, rumo = 0;
      for (let k = 0; k < 8; k++){
        posicionar(J, Object.assign({}, l, {ang: k*Math.PI/4}));
        J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
        const L = ordenarDescartar(copiarQuads(J).concat(A.quads), J.camX, J.camY, J.camZ); desenharLista(J, L);
        const a = agora(); for (let i = 0; i < 3; i++) desenharLista(J, L); const t = agora() - a;
        if (t > pior){ pior = t; rumo = k; }
      }
      posicionar(J, Object.assign({}, l, {ang: rumo*Math.PI/4}));
      J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
      medir("fortaleza " + l.nome, J, Js, Jo, copiarQuads(J).concat(A.quads));
    }
  }
  RESULTADOS.rasterizador = res;
}

/* ---------- a casa de pecas ----------
   Um mapa plano com a casa de dois andares do teste, para OLHAR: a
   ferramenta ainda nao existe, e o formato que guarda peca e a proxima
   fatia, entao o mapa e montado aqui e entregue ao motor na memoria. */
function casaDePecas(J){
  const m = novoMapa(60, 60, {nome:"pecas", terreno:TERRENO_POR_CHAR[","], altura:4});
  m.coisas.push({x:30, y:36, tipo:"jogador", texto:""});
  const pecas = [], Z = 1.0, A = J.TIPOS_DE_PECA ? 1.5 : 1.5;
  const por = (tipo, x, y, z, giro) => pecas.push({tipo:tipo, estilo:"madeira-pescador", x:x, y:y, z:z, giro:giro||0, construcao:1});
  for (let andar = 0; andar < 2; andar++){
    const z = Z + andar*A;
    for (let i = 0; i < 4; i++){
      por(andar === 0 && i === 1 ? "parede-porta" : (andar === 1 ? "parede-janela" : "parede"), 28 + i, 28, z, 0);
      por(andar === 1 ? "parede-janela" : "parede", 28 + i, 31, z, 0);
    }
    for (let j = 0; j < 3; j++){
      por("parede", 28, 28 + j, z, 90);
      por("parede", 32, 28 + j, z, 90);
    }
  }
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++){
    if (i >= 2 && j === 2) continue;
    por("laje", 28 + i, 28 + j, Z + A, 0);
  }
  por("escada", 30, 30, Z, 0);
  for (let i = 0; i < 2; i++){ por("laje", 29 + i, 27, Z + A, 0); por("guarda-corpo", 29 + i, 27, Z + A, 0); }
  /* telhado de duas aguas por cima */
  for (let i = 0; i < 4; i++){
    por("telhado-agua", 28 + i, 28, Z + 2*A, 0);
    por("telhado-agua", 29 + i, 31, Z + 2*A, 180);
  }
  /* uma ponte sobre a estrada, a leste */
  for (let i = 0; i < 6; i++) por("laje", 36 + i, 30, Z + A, 0);
  for (let i = 0; i < 6; i++){ por("guarda-corpo", 36 + i, 30, Z + A, 0); por("guarda-corpo", 36 + i, 31, Z + A, 0); }
  m.pecas = pecas;
  return m;
}
async function pecas(){
  const J = await jogo("?mapa=editor", false);
  window.J = J;
  J.trocarMundo("?mapa=editor", casaDePecas(J));
  J.G.mode = "play";
  const vistas = [
    {nome:"de fora, a fachada", x:30.5, y:24.5, z:1.0, ang:Math.PI/2, pitch:0.15},
    {nome:"de esquina, com a sacada", x:26.5, y:25.5, z:1.0, ang:Math.PI/4, pitch:0.1},
    {nome:"dentro, o terreo e a escada", x:29.0, y:30.0, z:1.0, ang:0, pitch:0.1},
    {nome:"do andar de cima", x:29.0, y:29.0, z:2.5, ang:Math.PI/3, pitch:0},
    {nome:"a ponte", x:39.0, y:26.5, z:1.0, ang:Math.PI/2, pitch:0.1}
  ];
  for (const v of vistas){
    posicionar(J, v);
    J.G.tick = 1; J.G.time = 1;
    J.render();
    const c = document.createElement("canvas");
    c.width = J.RW; c.height = 360; c.style.cssText = "image-rendering:pixelated;width:640px;display:block;margin:6px 0";
    const g = c.getContext("2d"), id = g.createImageData(J.RW, 360);
    new Uint32Array(id.data.buffer).set(J.buf);
    g.putImageData(id, 0, 0);
    const t = document.createElement("div"); t.textContent = v.nome + "  (" + J.nQuads() + " faces)";
    saida.appendChild(t); saida.appendChild(c);
  }
  log("solidos: " + J.SOLIDOS.lista.length);
}

(async function(){
  const q = new URLSearchParams(location.search).get("rodar") || "base";
  if (q === "pecas"){ try { estado.textContent = "montando"; await pecas(); estado.textContent = "pronto: pecas"; } catch(e){ log(e.stack); } return; }
  if (q === "comparar"){ try { estado.textContent = "rodando"; await comparar(); estado.textContent = "pronto: comparar"; } catch(e){ log(e.stack); } return; }
  if (q === "local"){
    const J = await jogo("?mapa=ilha", false, true), Jl = await jogo("?mapa=ilha", false, false, false, true);
    for (const l of LUGARES.slice(0, 3)){
      posicionar(J, Object.assign({}, l, {ang: 225*Math.PI/180})); posicionar(Jl, Object.assign({}, l, {ang: 225*Math.PI/180}));
      J.zbuf.fill(0); J.buildGeometry(J.camX, J.camY, J.cyaw, J.syaw, J.TANH);
      const L = ordenarDescartar(copiarQuads(J), J.camX, J.camY, J.camZ);
      const r = {};
      const um = {subdividida: () => desenharLista(J, L), local: () => desenharLista(Jl, L)}, ts = {subdividida: [], local: []};
      for (const k in um) for (let i = 0; i < 5; i++) um[k]();
      for (let i = 0; i < 25; i++) for (const k in um){ const a = agora(); um[k](); ts[k].push(agora() - a); }
      log(l.nome.padEnd(9) + " subdividida " + r1(mediana(ts.subdividida)) + " ms   local " + r1(mediana(ts.local)) + " ms");
    }
    estado.textContent = "pronto: local"; return;
  }
  if (q === "rasterizador"){ try { estado.textContent = "rodando"; await rasterizador(); estado.textContent = "pronto: rasterizador"; } catch(e){ log(e.stack); } return; }
  try {
    estado.textContent = "rodando " + q;
    if (q === "base") await base();
    if (q === "triangulo") await triangulo();
    if (q === "fortaleza") await fortaleza();
    estado.textContent = "pronto: " + q;
  } catch(e){ estado.textContent = "erro"; log(e.stack); }
})();
