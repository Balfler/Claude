/* Testes do chao inclinado (DESIGN.md, o canteiro, 6): desligado por padrao
   nada muda; ligado, cada tile ganha quatro cantos, o chao corre de um tile
   ao vizinho ate o limite e o resto e penhasco, e quem anda acompanha a
   inclinacao. Usa a ilha de 650 (mapas/ilha-650.mapa).
   Uso: node mundo-perigoso/teste/chao.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const mapa = () => { const m = M.lerMapa(fs.readFileSync(path.join(__dirname, "..", "mapas", "ilha-650.mapa"), "utf8")).mapa; if (m.versao < 2) M.converterMapa(m); return m; };
const abrir = busca => { const { D } = carregar(arquivo, {busca: "?mapa=cripta" + busca}); D.trocarMundo("?mapa=canteiro", mapa()); D.G.mode = "play"; return D; };
const DT = 1/60;
const andar = () => ({frente: 1, lado: 0, girar: 0, subir: false, agachar: false, dash: false, atirar: false, acoes: []});
/* anda para leste por uma encosta de degraus da ilha, sem pular */
function subida(D){
  const P = D.P;
  P.x = 160.5; P.y = 274.5; P.z = D.alturaDoChao(P.x, P.y); P.vx = P.vy = P.vz = 0; P.ang = 0;
  let maior = 0, ult = P.z, tocou = 0;
  for (let i = 0; i < 300; i++){
    D.passoDoJogador(P, DT, andar());
    maior = Math.max(maior, Math.abs(P.z - ult)); ult = P.z;
    if (Math.abs(P.z - D.alturaDoChao(P.x, P.y)) < 0.02) tocou++;
  }
  return {x: P.x, z: P.z, maior: maior, noChao: tocou};
}

try {
  /* 1. desligado: nada muda */
  const off = abrir("");
  check("desligado por padrao: nao ha cantos", off.CHAO.ligado === false && off.CHAO_Z === null);
  check("desligado, a altura do chao e a do tile", [[160.5, 274.5], [170.2, 280.9], [100.5, 100.5]].every(p => off.alturaDoChao(p[0], p[1]) === off.floorAt(Math.floor(p[0]), Math.floor(p[1]))));
  const a = subida(off);
  check("desligado, a encosta e escada: o chao salta 0,25 de uma vez", Math.abs(a.maior - 0.25) < 0.02, "maior salto " + a.maior.toFixed(3));

  /* 2. ligado */
  const on = abrir("&chao=inclinado&degraus=2");
  const Z = on.CHAO_Z, W = on.MW, H = on.MH, lim = 2*0.25 + 1e-4;
  check("ligado pelo endereco, com o limite de 2 degraus", on.CHAO.ligado === true && on.CHAO.degraus === 2 && Z && Z.length === W*H*4);
  /* a continuidade: dois tiles vizinhos do mesmo tipo, com ate 2 degraus, dividem os cantos da aresta */
  let vistos = 0, quebrados = 0, ladeiras = 0, penhascos = 0, penhascoPlano = 0;
  const ch = i => on.cellAt(i % W, (i / W) | 0);
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2){
    const i = y*W + x, j = i + 1;                     // o vizinho a leste
    if ((ch(i) !== "." && ch(i) !== "p") || (ch(j) !== "." && ch(j) !== "p")) continue;
    const d = Math.abs(on.floorAt(x + 1, y) - on.floorAt(x, y));
    const a1 = Z[i*4 + 1], a3 = Z[i*4 + 3], b0 = Z[j*4], b2 = Z[j*4 + 2];
    if (d < 1e-4) continue;
    if (d <= lim){
      vistos++; ladeiras++;
      if (Math.abs(a1 - b0) > 1e-3 || Math.abs(a3 - b2) > 1e-3) quebrados++;
    } else {
      penhascos++;
      if (Math.abs(a1 - b0) > 1e-3 || Math.abs(a3 - b2) > 1e-3) penhascoPlano++;      // os cantos nao coincidem: sobra parede
    }
  }
  check("ha ladeiras e penhascos na ilha para conferir", ladeiras > 50 && penhascos > 10, ladeiras + " ladeiras, " + penhascos + " penhascos");
  check("nas ladeiras o chao e continuo: os cantos da aresta coincidem dos dois lados", vistos > 0 && quebrados <= vistos*0.02, quebrados + " rachaduras em " + vistos);
  check("no penhasco os cantos das duas margens nao coincidem: a parede vertical continua", penhascoPlano === penhascos, penhascoPlano + " de " + penhascos);

  /* agua, parede e casa ficam planos */
  let naoPlanos = 0, testados = 0;
  for (let i = 0; i < W*H; i += 7){
    const c = ch(i);
    if (c === "." || c === "p") continue;
    testados++;
    for (let k = 0; k < 4; k++) if (Math.abs(Z[i*4 + k] - on.floorAt(i % W, (i / W) | 0)) > 1e-4) naoPlanos++;
  }
  check("agua, parede e porta ficam planas", testados > 100 && naoPlanos === 0, naoPlanos + " cantos fora, em " + testados);

  /* a altura num ponto: no centro do tile, entre os cantos; nos cantos, a deles */
  let dentro = 0, fora = 0;
  for (let y = 5; y < H - 5; y += 11) for (let x = 5; x < W - 5; x += 11){
    const i = y*W + x, cs = [Z[i*4], Z[i*4+1], Z[i*4+2], Z[i*4+3]], z = on.alturaDoChao(x + 0.5, y + 0.5);
    if (z >= Math.min.apply(null, cs) - 1e-4 && z <= Math.max.apply(null, cs) + 1e-4) dentro++; else fora++;
    if (Math.abs(on.alturaDoChao(x + 0.001, y + 0.001) - cs[0]) > 0.01) fora++;
  }
  check("a altura de um ponto fica entre os cantos do tile, e nos cantos e a deles", dentro > 30 && fora === 0, dentro + " ok, " + fora + " fora");

  /* a pincelada do canteiro: refazer so o que mudou da o mesmo que refazer tudo */
  {
    const mp = on.ILHA_AGORA, tiles = new Set();
    let n = 0;
    for (let y = 274; y < 292 && n < 12; y++) for (let x = 160; x < 180 && n < 12; x++){
      const i = y*W + x;
      if (ch(i) === "." && (x + y) % 3 === 0){ mp.altura[i] += 2; tiles.add(i); n++; }
    }
    on.atualizarTerreno(Array.from(tiles));
    const parcial = Float32Array.from(on.CHAO_Z);
    on.montarChaoInclinado();
    let difere = 0;
    for (let q = 0; q < parcial.length; q++) if (Math.abs(parcial[q] - on.CHAO_Z[q]) > 1e-6) difere++;
    check("a pincelada refaz so os cantos vizinhos, e da o mesmo que refazer o mapa todo", tiles.size >= 8 && difere === 0, tiles.size + " tiles mexidos, " + difere + " cantos diferentes");
    for (const i of tiles) mp.altura[i] -= 2;
    on.atualizarTerreno(Array.from(tiles));
  }

  /* escada e escada: o piso feito (calcada, lajota, tabuado) nao vira rampa */
  const pedra = (function(){ const m = M.lerMapa(fs.readFileSync(path.join(__dirname, "..", "mapas", "ilha.mapa"), "utf8")).mapa; if (m.versao < 2) M.converterMapa(m); return m; })();
  const D2 = carregar(arquivo, {busca: "?mapa=cripta&chao=inclinado&degraus=2"}).D; D2.trocarMundo("?mapa=canteiro", pedra);
  let feitos = 0, inclinadosFeitos = 0, degrausFeitos = 0;
  const ZP = D2.CHAO_Z;
  for (let i = 0; i < pedra.larg*pedra.alt; i++){
    if (!/^(calcada|lajota|tabuado)$/.test(M.TERRENOS[pedra.terreno[i]].id)) continue;
    feitos++;
    for (let k = 0; k < 4; k++) if (Math.abs(ZP[i*4 + k] - D2.floorAt(i % pedra.larg, (i / pedra.larg) | 0)) > 1e-4){ inclinadosFeitos++; break; }
    const x = i % pedra.larg;
    if (x + 1 < pedra.larg && Math.abs(pedra.altura[i + 1] - pedra.altura[i]) === 1 && /^(calcada|lajota|tabuado)$/.test(M.TERRENOS[pedra.terreno[i + 1]].id)) degrausFeitos++;
  }
  check("a escadaria de Pedra Alta (calcada, lajota, tabuado) nao vira rampa", feitos > 100 && degrausFeitos > 5 && inclinadosFeitos === 0, inclinadosFeitos + " tiles inclinados de " + feitos + ", " + degrausFeitos + " degraus");

  /* quem anda sobe a ladeira sem pular, e o pe acompanha o chao */
  const b = subida(on);
  check("ligado, quem anda sobe a encosta sem pular: o chao muda aos poucos", b.maior < 0.12 && b.x > 165, "maior salto " + b.maior.toFixed(3) + ", x " + b.x.toFixed(1));
  check("e o pe fica no chao inclinado", b.noChao >= 250, b.noChao + " de 300 passos");
  check("dois degraus seguidos, que na escada pediam pulo, viram ladeira que se sobe andando", b.x >= a.x - 0.5);
} catch (e){
  check("EXCECAO: " + e.message + " @ " + (e.stack.split("\n")[1] || "").trim(), false);
}
fim();
