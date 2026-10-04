/* Testes do gerador local (atelie/gerador.js e o `cli.js gerar`), sem placa
   de video: o recorte das vistas em RGBA, o comando falhando com mensagem
   clara quando o gerador nao esta instalado, e o caminho .glb -> tresvistas
   com um boneco de caixas sintetico, sem textura, como o que o Hunyuan
   devolve.
   Uso: node mundo-perigoso/teste/gerador.test.js */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const {spawnSync} = require("child_process");
const png = require("../editor/png.js");
const G = require("../atelie/gerador.js");
const T = require("../sondagens/7-tres-vistas/tresvistas.js");
const { placar } = require("./harness");
const { check, fim } = placar();

/* ---------- o boneco de caixas ----------
   Em unidades do glb (y para cima, z para a frente): cabeca, tronco, bracos
   em T, pernas e pes apontando para a frente. Cada caixa tem uma cor no
   desenho; no .glb nao ha cor nenhuma. */
const CAIXAS = [
  {x: [-0.12, 0.12], y: [1.50, 1.80], z: [-0.12, 0.12], cor: [220, 60, 60]},     // cabeca
  {x: [-0.25, 0.25], y: [0.90, 1.50], z: [-0.12, 0.12], cor: [60, 60, 220]},     // tronco
  {x: [-0.85, -0.25], y: [1.35, 1.50], z: [-0.07, 0.07], cor: [60, 60, 220]},    // braco direito dele
  {x: [0.25, 0.85], y: [1.35, 1.50], z: [-0.07, 0.07], cor: [60, 60, 220]},      // braco esquerdo dele
  {x: [-0.22, -0.03], y: [0.08, 0.90], z: [-0.10, 0.10], cor: [60, 180, 60]},    // pernas
  {x: [0.03, 0.22], y: [0.08, 0.90], z: [-0.10, 0.10], cor: [60, 180, 60]},
  {x: [-0.22, -0.03], y: [0.00, 0.08], z: [-0.10, 0.22], cor: [200, 180, 40]},   // pes
  {x: [0.03, 0.22], y: [0.00, 0.08], z: [-0.10, 0.22], cor: [200, 180, 40]}
];

/* um .glb so de malha (posicao e indice), como o trimesh grava a forma do Hunyuan */
function bonecoGlb(){
  const P = [], I = [];
  for (const c of CAIXAS){
    const b = P.length/3;
    for (const z of c.z) for (const y of c.y) for (const x of c.x) P.push(x, y, z);
    /* vertice v = xi + 2*yi + 4*zi; as 6 faces, cada uma em 2 triangulos */
    for (const f of [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]])
      I.push(b + f[0], b + f[1], b + f[2], b + f[0], b + f[2], b + f[3]);
  }
  const pos = Buffer.from(new Float32Array(P).buffer), idx = Buffer.from(new Uint32Array(I).buffer);
  const bin = Buffer.concat([pos, idx]);
  const json = {
    asset: {version: "2.0"}, scene: 0, scenes: [{nodes: [0]}], nodes: [{mesh: 0}],
    meshes: [{primitives: [{mode: 4, attributes: {POSITION: 0}, indices: 1}]}],
    accessors: [{bufferView: 0, componentType: 5126, count: P.length/3, type: "VEC3"},
                {bufferView: 1, componentType: 5125, count: I.length, type: "SCALAR"}],
    bufferViews: [{buffer: 0, byteOffset: 0, byteLength: pos.length}, {buffer: 0, byteOffset: pos.length, byteLength: idx.length}],
    buffers: [{byteLength: bin.length}]
  };
  let js = Buffer.from(JSON.stringify(json), "utf8");
  while (js.length % 4) js = Buffer.concat([js, Buffer.from(" ")]);
  const h = Buffer.alloc(20), hb = Buffer.alloc(8);
  h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(28 + js.length + bin.length, 8);
  h.writeUInt32LE(js.length, 12); h.writeUInt32LE(0x4e4f534a, 16);
  hb.writeUInt32LE(bin.length, 0); hb.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([h, js, hb, bin]);
}

/* A folha do mesmo boneco: frente, perfil olhando para a direita (ou para a
   esquerda) e costas, lado a lado, num fundo cinza liso. Desenha da caixa
   mais funda para a mais rasa, cada vista pela profundidade dela. */
function bonecoFolha(olha){
  const esc = 200, alto = Math.round(1.8*esc), W = 1240, H = alto + 120, base = H - 60;
  const rgba = new Uint8Array(W*H*4);
  for (let i = 0; i < W*H; i++){ rgba[i*4] = 128; rgba[i*4 + 1] = 128; rgba[i*4 + 2] = 128; rgba[i*4 + 3] = 255; }
  const vistas = [
    {cx: 220, u: c => c.x, d: c => -c.z[1]},                                    // frente: x da folha = x dele visto de frente (espelhado)
    {cx: 620, u: c => olha === "direita" ? c.z : [-c.z[1], -c.z[0]], d: c => c.x[0]},  // perfil
    {cx: 1020, u: c => [-c.x[1], -c.x[0]], d: c => c.z[0]}                     // costas
  ];
  for (const v of vistas){
    const ordem = CAIXAS.slice().sort((a, b) => v.d(b) - v.d(a));
    for (const c of ordem){
      const [u0, u1] = v.u(c);
      const x0 = Math.round(v.cx + u0*esc), x1 = Math.round(v.cx + u1*esc), y0 = Math.round(base - c.y[1]*esc), y1 = Math.round(base - c.y[0]*esc);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++){ const i = (y*W + x)*4; rgba[i] = c.cor[0]; rgba[i + 1] = c.cor[1]; rgba[i + 2] = c.cor[2]; }
    }
  }
  return {largura: W, altura: H, rgba: rgba};
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gerador-"));

/* ---------- 1. o recorte ---------- */
const folha = bonecoFolha("direita");
const R = G.recortarVistas(folha, {lado: 256, margem: 0.1});
check("acha o perfil olhando para a direita, e a chave do Hunyuan e right", R.olha === "direita" && R.chavePerfil === "right", R.olha + " " + R.chavePerfil);
const R2 = G.recortarVistas(bonecoFolha("esquerda"), {lado: 256});
check("o perfil olhando para a esquerda vira left", R2.olha === "esquerda" && R2.chavePerfil === "left", R2.olha);
for (const nome of ["frente", "perfil", "costas"]){
  const v = R.vistas[nome], L = v.largura;
  let x0 = L, x1 = -1, y0 = L, y1 = -1, cheios = 0, meios = 0;
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++){
    const a = v.rgba[(y*L + x)*4 + 3];
    if (a === 255) cheios++; else if (a > 0) meios++;
    if (a > 0){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const cx = (x0 + x1 + 1)/2, cy = (y0 + y1 + 1)/2, maior = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  check(nome + ": quadrado de 256, RGBA", L === 256 && v.altura === 256 && v.rgba.length === 256*256*4);
  check(nome + ": o fundo e transparente (os cantos e a borda)", [0, L - 1, (L - 1)*L, L*L - 1].every(q => v.rgba[q*4 + 3] === 0) && y0 > 0 && x0 > 0 && x1 < L - 1 && y1 < L - 1);
  check(nome + ": a figura e opaca por dentro", cheios > 1000, cheios + " cheios, " + meios + " de meio-tom");
  check(nome + ": a figura esta centrada", Math.abs(cx - L/2) <= 2 && Math.abs(cy - L/2) <= 2, "centro " + cx + "," + cy);
  check(nome + ": com a margem de 10%", Math.abs(maior - L*0.8) <= 3, "lado maior " + maior);
}
/* a cor do pixel opaco e a do desenho, sem misturar com o fundo */
const vf = R.vistas.frente;
let cabeca = null;
for (let y = 0; y < 256 && !cabeca; y++){ const q = (y*256 + 128)*4; if (vf.rgba[q + 3] === 255) cabeca = [vf.rgba[q], vf.rgba[q + 1], vf.rgba[q + 2]]; }
check("o topo da frente e a cor da cabeca, sem o cinza do fundo", cabeca && cabeca[0] === 220 && cabeca[1] === 60, JSON.stringify(cabeca));

/* ---------- 2. o comando gerar sem o gerador ---------- */
const CLI = path.join(__dirname, "..", "atelie", "cli.js"), folhaArq = path.join(tmp, "boneco-folha.png");
fs.writeFileSync(folhaArq, png.codificar(folha.largura, folha.altura, folha.rgba));
const semNada = spawnSync(process.execPath, [CLI, "gerar", folhaArq, "--gerador", path.join(tmp, "nao-existe"), "--saida", path.join(tmp, "s1")], {encoding: "utf8"});
check("sem o gerador, o gerar sai com erro", semNada.status === 1, "saida " + semNada.status);
check("e diz que nao esta instalado, onde procurou e onde ler", /nao esta instalado/.test(semNada.stderr) && /nao-existe/.test(semNada.stderr) && /LEIA-ME\.md/.test(semNada.stderr), semNada.stderr.trim());
check("e nao grava nada", !fs.existsSync(path.join(tmp, "s1")));
const vazio = path.join(tmp, "gerador-vazio");
fs.mkdirSync(vazio);
const semPython = spawnSync(process.execPath, [CLI, "gerar", folhaArq, "--gerador", vazio, "--saida", path.join(tmp, "s2")], {encoding: "utf8"});
check("com a pasta mas sem o Python, diz que falta o Python, o codigo e os pesos",
  semPython.status === 1 && /Python do gerador/.test(semPython.stderr) && /Hunyuan3D-2/.test(semPython.stderr) && /pesos/.test(semPython.stderr), semPython.stderr.trim());
const env = Object.assign({}, process.env, {MUNDO_GERADOR: path.join(tmp, "pela-variavel")});
const pelaVar = spawnSync(process.execPath, [CLI, "gerar", folhaArq, "--saida", path.join(tmp, "s3")], {encoding: "utf8", env: env});
check("a pasta do gerador vem da variavel MUNDO_GERADOR", pelaVar.status === 1 && /pela-variavel/.test(pelaVar.stderr), pelaVar.stderr.trim());
check("o padrao e C:\\ferramentas\\gerador", G.localizar({}).raiz === (process.env.MUNDO_GERADOR || "C:\\ferramentas\\gerador"));
check("le a linha RESULTADO do gerar.py", G.lerResultado("carregando\nRESULTADO {\"vram_max_gb\": 4.2}\n").vram_max_gb === 4.2 && G.lerResultado("nada") === null);

/* ---------- 3. o .glb sem cor -> tresvistas ---------- */
const glbArq = path.join(tmp, "boneco.glb");
fs.writeFileSync(glbArq, bonecoGlb());
const P = T.processar(folhaArq, {forma: glbArq, nome: "boneco"});
check("a forma sem textura nao vira guia de cor", P.V.guia === null);
const f = T.fonteDoVolume(P.V, P.P);
let n = 0, zTopo = -1, zBase = 1e9;
for (let z = 0; z < f.gz; z++) for (let y = 0; y < f.gy; y++) for (let x = 0; x < f.gx; x++) if (f.rgb(x, y, z)){ n++; if (z > zTopo) zTopo = z; if (z < zBase) zBase = z; }
check("o volume e o do .glb, em 250 de altura", zTopo - zBase + 1 >= 249 && zTopo - zBase + 1 <= 252, (zTopo - zBase + 1) + " de altura, " + n + " voxels");
/* a cor de cada parte, pela frente: o primeiro voxel cheio vindo de y pequeno */
const ix = Math.floor(P.V.ic);
const pelaFrente = z => { for (let y = 0; y < f.gy; y++) for (const x of [ix, ix - 3, ix + 3]){ const c = f.rgb(x, y, z); if (c) return c; } return null; };
const alt = h => Math.round(zBase + (zTopo - zBase)*h);
const perto = (c, alvo) => c && Math.hypot(c[0] - alvo[0], c[1] - alvo[1], c[2] - alvo[2]) < 40;
check("a cabeca pega o vermelho do desenho", perto(pelaFrente(alt(0.9)), [220, 60, 60]), JSON.stringify(pelaFrente(alt(0.9))));
check("o tronco pega o azul", perto(pelaFrente(alt(0.65)), [60, 60, 220]), JSON.stringify(pelaFrente(alt(0.65))));
const perna = (() => { const z = alt(0.25); for (let y = 0; y < f.gy; y++) for (let x = 0; x < f.gx; x++){ const c = f.rgb(x, y, z); if (c) return c; } return null; })();
check("a perna pega o verde", perto(perna, [60, 180, 60]), JSON.stringify(perna));
check("a silhueta da forma bate com a do desenho", P.fidelidade.frente > 0.9 && P.fidelidade.perfil > 0.85 && P.fidelidade.costas > 0.9, JSON.stringify(P.fidelidade));
check("o corpo do atelie sai com voxels e cores", P.corpo && P.corpo.paleta.length >= 4, P.corpo && P.corpo.paleta.length + " cores");

/* ---------- 4. o resto ---------- */
for (const arq of ["atelie/gerador.js", "atelie/cli.js"]){
  const s = fs.readFileSync(path.join(__dirname, "..", arq), "utf8"), k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
  check(arq + " e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);
}
const py = fs.readFileSync(path.join(__dirname, "..", "ferramentas", "gerador", "gerar.py"), "utf8");
check("o gerar.py tem passos, semente, octree e o modo de pouca VRAM", ["--passos", "--semente", "--octree", "--pouca-vram", "RESULTADO", "max_memory_allocated"].every(s => py.includes(s)));

fs.rmSync(tmp, {recursive: true, force: true});
fim();
