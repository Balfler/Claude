/* Testes de refazer so o que mudou.

   O canteiro mexe no terreno a cada pincelada, e refazer a ilha de 650
   inteira custava 4 s. Agora so os tiles mexidos, os vizinhos deles e os
   telhados que eles tocam saem de novo, e os pedacos so sao montados quando
   entram no alcance. A regra que protege isso: depois de qualquer mudanca, o
   mundo refeito aos pedacos e IGUAL ao mundo montado do zero -- alturas,
   telhados, chamines, letras do mapa e faces.

   Uso: node mundo-perigoso/teste/refazer.test.js [caminho-do-html] */
const path = require("path");
const fs = require("fs");
const M = require("../src/mapa.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D, frames } = carregar(arquivo, {busca: "?mapa=cripta"});

/* a ilha do jogo tem casas, e casa tem telhado: e o caso dificil */
const mapa = M.lerMapa(fs.readFileSync(path.join(__dirname, "..", "mapas", "ilha.mapa"), "utf8")).mapa;
D.trocarMundo("?mapa=ilha", mapa);
const W = mapa.larg, H = mapa.alt;

/* um retrato de tudo o que sai do terreno */
const TERRENO = {".":1, ",":1, "W":1, "^":1, "D":1};
function retrato(){
  const faces = [];
  D.remontarSujos();
  for (const P of D.PEDACOS) for (const f of P.faces){
    const p = Array.from(f.p).map(function(v){ return v.toFixed(3); }).join(",");
    const uv = Array.from(f.uv).map(function(v){ return v.toFixed(3); }).join(",");
    faces.push(p + "|" + uv + "|" + D.TEX_NOME(f.tex));
  }
  faces.sort();
  return {
    piso: Array.from(D.FLOORZ).join(","),
    topo: Array.from(D.TOPOZ).join(","),
    telhado: Array.from(D.NO_TELHADO).join(""),
    cantos: Array.from(D.TELHADO_Z).map(function(v){ return v.toFixed(3); }).join(","),
    chamines: D.CHAMINES.map(function(c){ return c.x + "," + c.y + "," + c.z0 + "," + c.z1; }).sort().join(";"),
    /* a letra de criatura e do jogador fica; o que conta e o terreno */
    mapa: D.MAP.map(function(l){ return l.replace(/./g, function(c){ return TERRENO[c] ? c : "."; }); }).join("\n"),
    faces: faces
  };
}
function comparar(nome, a, b){
  const difere = [];
  for (const k of ["piso", "topo", "telhado", "cantos", "chamines", "mapa"]) if (a[k] !== b[k]) difere.push(k);
  let faces = a.faces.length === b.faces.length;
  if (faces) for (let i = 0; i < a.faces.length; i++) if (a.faces[i] !== b.faces[i]){ faces = false; break; }
  if (!faces) difere.push("faces (" + a.faces.length + " x " + b.faces.length + ")");
  check(nome, difere.length === 0, "difere: " + difere.join(", "));
}

/* sorteio com semente: o teste e o mesmo toda vez */
let semente = 12345;
function sorte(){ semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0; return semente/4294967296; }
const T = M.TERRENO_POR_CHAR;

/* Os tiles de telhado e de parede de casa, para mexer onde doi. */
const comTeto = [], deCasa = [];
for (let i = 0; i < W*H; i++){
  if (mapa.teto[i] > 0 && M.TERRENOS[mapa.terreno[i]].tipo !== "parede") comTeto.push(i);
  if (mapa.terreno[i] === T["#"] || mapa.terreno[i] === T["H"]) deCasa.push(i);
}
check("a ilha de teste tem casas com telhado", comTeto.length > 50 && deCasa.length > 50,
  comTeto.length + " tiles cobertos, " + deCasa.length + " de parede");

/* Cada rodada mexe no mapa, refaz aos pedacos, tira o retrato, monta do
   zero e compara. */
function rodada(nome, mexer){
  const tiles = new Set();
  mexer(function(i, camada, v){ mapa[camada][i] = v; tiles.add(i); });
  const sujosAntes = D.PEDACOS.filter(function(P){ return P.sujo; }).length;
  const t0 = process.hrtime.bigint();
  D.atualizarTerreno(Array.from(tiles));
  const ms = Number(process.hrtime.bigint() - t0)/1e6;
  const sujos = D.PEDACOS.filter(function(P){ return P.sujo; }).length - sujosAntes;
  const aosPedacos = retrato();
  D.trocarMundo("?mapa=ilha", mapa);
  comparar(nome + ": refeito aos pedacos e igual ao montado do zero", aosPedacos, retrato());
  return {ms: ms, sujos: sujos, tiles: tiles.size};
}

/* 1. tirar o forro do meio de uma casa: o telhado parte ou afunda */
{
  const i = comTeto[Math.floor(comTeto.length/2)];
  const r = rodada("tirar o forro de um tile de casa", function(poe){ poe(i, "teto", 0); });
  check("mexer num tile so suja poucos pedacos", r.sujos <= 6, r.sujos + " pedacos sujos");
}
/* 2. cobrir um tile encostado numa casa: o telhado cresce */
rodada("cobrir um tile ao lado da casa", function(poe){
  const i = comTeto[3];
  for (const j of [i - 1, i + 1, i - W, i + W])
    if (mapa.teto[j] === 0 && M.TERRENOS[mapa.terreno[j]].tipo === "chao"){ poe(j, "teto", 6); break; }
});
/* 3. derrubar uma casa inteira: o telhado e a chamine somem */
rodada("derrubar uma casa inteira", function(poe){
  const i0 = comTeto[0], vistos = new Set([i0]), pilha = [i0];
  while (pilha.length){
    const i = pilha.pop();
    poe(i, "teto", 0);
    for (const j of [i - 1, i + 1, i - W, i + W]){
      if (j < 0 || j >= W*H || vistos.has(j)) continue;
      vistos.add(j);
      if (mapa.teto[j] > 0 && M.TERRENOS[mapa.terreno[j]].tipo !== "parede") pilha.push(j);
      else if (deCasa.indexOf(j) >= 0) poe(j, "terreno", T[","]);
    }
  }
});
/* 4. subir o chao debaixo de uma casa e pintar uma porta na parede */
rodada("subir o chao de uma casa e abrir uma porta", function(poe){
  const i = comTeto[comTeto.length - 5];
  poe(i, "altura", mapa.altura[i] + 2);
  poe(deCasa[7], "terreno", T["D"]);
});
/* 5. pinceladas soltas: agua, rocha, altura, forro, em lugares sorteados */
for (let k = 0; k < 4; k++){
  rodada("pincelada sorteada " + (k + 1), function(poe){
    const cx = 5 + Math.floor(sorte()*(W - 10)), cy = 5 + Math.floor(sorte()*(H - 10));
    const camada = ["terreno", "altura", "teto"][k % 3];
    const valores = {terreno: [T["~"], T["^"], T[","], T["H"]], altura: [2, 6, 9], teto: [0, 5, 7]}[camada];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      poe((cy + dy)*W + cx + dx, camada, valores[Math.floor(sorte()*valores.length)]);
  });
}
/* 6. duas casas que se encostam so pela quina dividem um canto de telhado:
   mexer numa nao pode baixar o canto da outra */
{
  const livre = function(x, y){
    for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++){
      const i = (y + dy)*W + x + dx;
      if (M.TERRENOS[mapa.terreno[i]].tipo !== "chao" || mapa.teto[i]) return false;
    }
    return true;
  };
  let x0 = -1, y0 = -1;
  for (let y = 2; y < H - 12 && x0 < 0; y += 3)
    for (let x = 2; x < W - 12; x += 3) if (livre(x, y)){ x0 = x + 1; y0 = y + 1; break; }
  check("achei chao livre para as duas casas", x0 >= 0);
  rodada("duas casas encostadas pela quina", function(poe){
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++){
      poe((y0 + dy)*W + x0 + dx, "teto", 6);
      const j = (y0 + 3 + dy)*W + x0 + 3 + dx;
      poe(j, "teto", 6);
      poe(j, "altura", mapa.altura[j] + 3);       // a de baixo e mais alta: o canto e dela
    }
  });
  rodada("mexer na casa de cima nao baixa o canto da de baixo", function(poe){
    poe(y0*W + x0, "teto", 0);
  });
}
/* 7. uma pincelada grande perto das casas, e quanto custa */
{
  const i = comTeto[20], cx = i % W, cy = (i / W) | 0;
  const r = rodada("pincelada de 11x11 por cima das casas", function(poe){
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++){
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      poe(y*W + x, "altura", mapa.altura[y*W + x] + 1);
    }
  });
  check("refazer uma pincelada de 11x11 custa menos de 30 ms", r.ms < 30, r.ms.toFixed(1) + " ms, " + r.tiles + " tiles");
}

/* ---------- os pedacos so saem quando entram no alcance ---------- */
{
  const grande = M.novoMapa(400, 400, {nome: "grande", terreno: T[","], altura: 4});
  grande.coisas.push({x: 10, y: 10, tipo: "jogador", texto: ""});
  D.trocarMundo("?mapa=grande", grande);
  check("abrir o mapa nao monta pedaco nenhum", D.PEDACOS.every(function(P){ return P.sujo; }),
    D.PEDACOS.filter(function(P){ return !P.sujo; }).length + " montados");
  D.G.mode = "play";
  frames(1);
  const montados = D.PEDACOS.filter(function(P){ return !P.sujo; }).length;
  check("o primeiro quadro so monta o que esta no alcance",
    montados > 4 && montados < D.PEDACOS.length/4, montados + " de " + D.PEDACOS.length);
  /* montar tudo e desenhar de novo do mesmo lugar: nada que se via faltava */
  const doQuadro = D.nQuads();
  D.remontarSujos();
  D.P.vx = D.P.vy = D.P.vz = 0;
  frames(1);
  check("o que ficou sem montar nao faz falta no quadro", doQuadro > 0 && D.nQuads() === doQuadro,
    doQuadro + " faces montando so o alcance, " + D.nQuads() + " montando tudo");
}

fim();
