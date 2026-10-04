/* Testes do caminho do desenho ao jogo: o PNG, o molde, o conversor de tres
   vistas, o arquivo .personagem e a pose do corpo desenhado.
   Uso: node mundo-perigoso/teste/conversor.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { carregar, placar } = require("./harness");
const png = require("../editor/png");
const V = require("../editor/vistas");
const C = require("../editor/conversor");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D } = carregar(arquivo);
const dim = D.DIM_PERSONAGEM, DX = dim.DX, DY = dim.DY, DZ = dim.DZ;

/* ---------- 1. PNG ---------- */
function pedaco(tipo, dados){
  const cab = Buffer.alloc(8); cab.writeUInt32BE(dados.length, 0); cab.write(tipo, 4, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(png.crc32(Buffer.concat([cab.subarray(4), dados])), 0);
  return Buffer.concat([cab, dados, crc]);
}
function arquivoPNG(w, h, bits, tipo, cru, extras){
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = bits; ihdr[9] = tipo;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco("IHDR", ihdr)]
    .concat(extras || []).concat([pedaco("IDAT", zlib.deflateSync(cru)), pedaco("IEND", Buffer.alloc(0))]));
}
{
  const w = 7, h = 5, rgba = new Uint8Array(w*h*4);
  for (let i = 0; i < rgba.length; i++) rgba[i] = (i*37 + 11) & 255;
  const volta = png.decodificar(png.codificar(w, h, rgba));
  check("PNG: o que se grava volta igual", volta.largura === w && volta.altura === h && volta.rgba.every((v, i) => v === rgba[i]));

  /* RGB com os cinco filtros, um por linha, como um editor grava */
  const W = 4, H = 5, bpp = 3, orig = [];
  for (let y = 0; y < H; y++){ const l = []; for (let x = 0; x < W*bpp; x++) l.push((x*29 + y*53 + 7) & 255); orig.push(l); }
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  const cru = [];
  for (let y = 0; y < H; y++){
    const f = y % 5; cru.push(f);
    for (let i = 0; i < W*bpp; i++){
      const a = i >= bpp ? orig[y][i - bpp] : 0, b = y ? orig[y - 1][i] : 0, c = y && i >= bpp ? orig[y - 1][i - bpp] : 0;
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
      cru.push((orig[y][i] - pred) & 255);
    }
  }
  const rgb = png.decodificar(arquivoPNG(W, H, 8, 2, Buffer.from(cru)));
  let igual = true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++)
    if (rgb.rgba[(y*W + x)*4 + k] !== orig[y][x*3 + k] || rgb.rgba[(y*W + x)*4 + 3] !== 255) igual = false;
  check("PNG: le RGB com os cinco filtros de linha", igual);

  /* paleta de 2 bits com transparencia, como o Aseprite costuma gravar */
  const ind = [0, 1, 2, 1, 0,  2, 2, 1, 0, 1];
  const linhas = [];
  for (let y = 0; y < 2; y++){
    linhas.push(0);
    let byte = 0, n = 0;
    for (let x = 0; x < 5; x++){ byte |= ind[y*5 + x] << (6 - 2*n); n++; if (n === 4){ linhas.push(byte); byte = 0; n = 0; } }
    if (n) linhas.push(byte);
  }
  const pal = png.decodificar(arquivoPNG(5, 2, 2, 3, Buffer.from(linhas),
    [pedaco("PLTE", Buffer.from([10, 20, 30, 200, 100, 50, 1, 2, 3])), pedaco("tRNS", Buffer.from([0, 255]))]));
  const esperado = i => ind[i] === 0 ? [10, 20, 30, 0] : ind[i] === 1 ? [200, 100, 50, 255] : [1, 2, 3, 255];
  check("PNG: le paleta de 2 bits com transparencia", ind.every((_, i) => esperado(i).every((v, k) => pal.rgba[i*4 + k] === v)));
}

/* ---------- 2. o molde tem o arranjo que o conversor le ---------- */
const A = V.arranjo(dim);
{
  const molde = path.join(__dirname, "..", "Arte", "molde-humano.png");
  const m = fs.existsSync(molde) ? png.decodificar(fs.readFileSync(molde)) : null;
  check("o molde em Arte/ tem o tamanho do arranjo do conversor", m && m.largura === A.largura && m.altura === A.altura,
    m ? m.largura + "x" + m.altura + " contra " + A.largura + "x" + A.altura : "molde nao encontrado");
}

/* ---------- 3. uma folha desenhada a partir do corpo base ----------
   O corpo que o jogo monta vira desenho nas tres vistas, com a cor pelo
   material e uma faixa mais clara a cada oito voxels de altura. Convertido
   de volta, tem que dar quase o mesmo corpo. */
const s0 = D.esqueletoDaFormula(0);
const base = D.montarVoxels(D.pecaCorpo(s0), DX, DY, DZ);
function corDoVoxel(i){
  const m = base[i], z = Math.floor(i/(DX*DY)), claro = (z >> 3) % 2 ? 30 : 0;
  const c = m === D.MP.COURO ? [110, 80, 50] : m === D.MP.OLHO ? [20, 20, 20] : [200, 160, 120];
  return [Math.min(255, c[0] + claro), Math.min(255, c[1] + claro), Math.min(255, c[2] + claro)];
}
function folha(desloca){
  const rgba = new Uint8Array(A.largura*A.altura*4);
  for (const vista of ["frente", "lado", "costas"]) for (let z = 0; z < DZ; z++) for (let u = 0; u < A.vistas[vista].largura; u++){
    const i = V.raio(base, dim, vista, u, z);
    if (i < 0) continue;
    const zz = vista === "lado" ? z - (desloca || 0) : z;
    if (zz < 0) continue;
    const o = (A.linhaDoZ(zz)*A.largura + A.vistas[vista].ox + u)*4, c = corDoVoxel(i);
    rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
  }
  return {largura: A.largura, altura: A.altura, rgba: rgba};
}
const conv = C.converter(folha(), dim, {alturaDoPe: s0.peE[2] + 3});
{
  let inter = 0, uniao = 0, cheios = 0, topo = -1;
  for (let i = 0; i < base.length; i++){
    const a = !!base[i], b = !!conv.g[i];
    if (a && b) inter++;
    if (a || b) uniao++;
    if (b){ cheios++; topo = Math.max(topo, Math.floor(i/(DX*DY))); }
  }
  check("a folha certa converte sem aviso", conv.avisos.length === 0, conv.avisos.join("; "));
  check("o corpo convertido tem a altura do molde", topo === DZ - 1, "topo " + topo);
  check("o corpo convertido ocupa quase o mesmo lugar que o original", inter/uniao > 0.6,
    "sobreposicao " + (inter/uniao).toFixed(2) + " (" + cheios + " voxels contra " + base.filter(Boolean).length + ")");
  check("as cores cabem no limite", conv.cores.length > 0 && conv.cores.length <= C.MAX_CORES, conv.cores.length + " cores");

  /* de frente, o primeiro voxel de cada coluna tem a cor que a frente desenhou */
  let certas = 0, total = 0;
  for (let z = 0; z < DZ; z += 2) for (let x = 0; x < DX; x++){
    const i = V.raio(conv.g, dim, "frente", x, z);
    if (i < 0) continue;
    const j = V.raio(base, dim, "frente", x, z);
    if (j < 0) continue;
    const esperado = corDoVoxel(j), tem = conv.cores[conv.g[i] - 1];
    total++;
    if (Math.abs(esperado[0] - tem[0]) + Math.abs(esperado[1] - tem[1]) + Math.abs(esperado[2] - tem[2]) < 40) certas++;
  }
  check("vista de frente, o convertido tem a cor que a frente desenhou", total > 500 && certas/total > 0.9,
    certas + " de " + total);
}

/* ---------- 4. o arquivo .personagem vai e volta, e o jogo le ---------- */
const texto = C.escrever(conv, "teste");
const lido = D.lerPersonagem(texto);
{
  check("o arquivo .personagem e ASCII", [...texto].every(c => c.charCodeAt(0) < 128));
  check("o jogo le o arquivo que o conversor grava: mesma grade e mesmas cores",
    lido.DX === DX && lido.DY === DY && lido.DZ === DZ && lido.g.length === conv.g.length &&
    lido.g.every((v, i) => v === conv.g[i]) &&
    lido.cores.length === conv.cores.length && lido.cores.every((h, i) => h === "#" + conv.cores[i].map(v => v.toString(16).padStart(2, "0")).join("")));
  check("o arquivo fica pequeno", texto.length < 120000, Math.round(texto.length/1024) + " KB");
}

/* ---------- 5. o desenho convertido passa pelo atelie ----------
   O conversor grava PERSONAGEM 1: uma grade so, sem pose. O jogo le o
   arquivo, mas nao usa como corpo -- quem posa e o atelie (atelie/), que
   importa este .personagem, propoe o rig, calcula o peso e exporta os vinte
   quadros ja posados em PERSONAGEM 2. */
check("o desenho convertido e PERSONAGEM 1, uma grade sem pose, para o atelie importar",
  lido.versao === 1 && lido.poses.length === 1 && !lido.poses[0].juntas);

/* ---------- 6. o conversor avisa e recusa ---------- */
{
  const torto = C.converter(folha(5), dim, {alturaDoPe: s0.peE[2] + 3});
  check("vistas de alturas diferentes geram aviso", torto.avisos.some(a => /mesma altura/.test(a)), torto.avisos.join("; "));
  let erro = "";
  try { C.converter({largura: 10, altura: 10, rgba: new Uint8Array(400)}, dim); } catch (e){ erro = e.message; }
  check("desenho de outro tamanho e recusado com o motivo", /molde/.test(erro), erro);
  const semLado = folha();
  for (let z = 0; z < DZ; z++) for (let u = 0; u < DY; u++) semLado.rgba[(A.linhaDoZ(z)*A.largura + A.vistas.lado.ox + u)*4 + 3] = 0;
  erro = "";
  try { C.converter(semLado, dim); } catch (e){ erro = e.message; }
  check("sem a vista de lado o conversor diz o que falta", /lado/.test(erro), erro);
}

/* ---------- 6b. o contorno pintado sai ----------
   Girado 45 graus, o contorno desenhado viraria risco no meio do corpo; o
   assador desenha um novo em volta da silhueta de cada rumo. */
{
  const comContorno = folha();
  const L = A.largura, cheio = (x, y) => x >= 0 && y >= 0 && x < L && y < A.altura && comContorno.rgba[(y*L + x)*4 + 3] >= 128;
  const borda = [];
  for (let y = 0; y < A.altura; y++) for (let x = 0; x < L; x++)
    if (cheio(x, y) && (!cheio(x-1, y) || !cheio(x+1, y) || !cheio(x, y-1) || !cheio(x, y+1))) borda.push((y*L + x)*4);
  for (const o of borda){ comContorno.rgba[o] = 15; comContorno.rgba[o + 1] = 10; comContorno.rgba[o + 2] = 5; }
  const tem = c => c.some(k => k[0] === 15 && k[1] === 10 && k[2] === 5);
  check("o contorno escuro pintado em volta da silhueta nao vira cor do personagem",
    borda.length > 300 && !tem(C.converter(comContorno, dim, {alturaDoPe: s0.peE[2] + 3}).cores), borda.length + " pixels de contorno");
  check("com manterContorno, o contorno fica", tem(C.converter(comContorno, dim, {alturaDoPe: s0.peE[2] + 3, manterContorno: true}).cores));
}

/* ---------- 7. ASCII ---------- */
for (const f of ["editor/png.js", "editor/vistas.js", "editor/conversor.js", "editor/personagem.js", "editor/molde.js",
                 "editor/vox.js", "editor/wgvox.js"]){
  const s = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
  check(f + " e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);
}

fim();
