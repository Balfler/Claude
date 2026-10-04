/* Testes do leitor de .glb e do voxelizador (editor/glb.js): monta um .glb
   pequeno do zero -- um cubo com uma textura de dois pixels, esquerda
   vermelha e direita azul -- e confere a leitura, o volume solido e a cor.
   Uso: node mundo-perigoso/teste/glb.test.js */
const fs = require("fs");
const path = require("path");
const png = require("../editor/png.js");
const Glb = require("../editor/glb.js");
const { placar } = require("./harness");
const { check, fim } = placar();

/* o cubo de 1 x 2 x 1 (largura, altura, profundidade), 12 triangulos, cada
   face com o uv inteiro: x < 0 vermelho, x >= 0 azul, pelo uv */
function cuboGlb(comTextura){
  const P = [], UV = [], I = [];
  const faces = [
    [[-.5,0,-.5],[.5,0,-.5],[.5,2,-.5],[-.5,2,-.5]], [[.5,0,.5],[-.5,0,.5],[-.5,2,.5],[.5,2,.5]],
    [[-.5,0,.5],[-.5,0,-.5],[-.5,2,-.5],[-.5,2,.5]], [[.5,0,-.5],[.5,0,.5],[.5,2,.5],[.5,2,-.5]],
    [[-.5,2,-.5],[.5,2,-.5],[.5,2,.5],[-.5,2,.5]], [[-.5,0,.5],[.5,0,.5],[.5,0,-.5],[-.5,0,-.5]]
  ];
  for (const f of faces){
    const b = P.length/3;
    for (const v of f){ P.push(v[0], v[1], v[2]); UV.push(v[0] < 0 ? 0.25 : 0.75, 0.5); }
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const pos = new Float32Array(P), uv = new Float32Array(UV), idx = new Uint32Array(I);
  const tex = comTextura ? png.codificar(2, 1, new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255])) : null;
  const partes = [Buffer.from(pos.buffer), Buffer.from(uv.buffer), Buffer.from(idx.buffer)];
  const nBin = partes.reduce((s, b) => s + b.length, 0) + (tex ? tex.length : 0);
  const bin = Buffer.concat(partes.concat(tex ? [tex] : []), nBin);
  const bvs = []; let o = 0;
  for (const b of partes){ bvs.push({buffer: 0, byteOffset: o, byteLength: b.length}); o += b.length; }
  if (tex) bvs.push({buffer: 0, byteOffset: o, byteLength: tex.length});
  const json = {
    asset: {version: "2.0"}, scene: 0, scenes: [{nodes: [0]}], nodes: [{mesh: 0}],
    meshes: [{primitives: [{mode: 4, attributes: {POSITION: 0, TEXCOORD_0: 1}, indices: 2, material: 0}]}],
    materials: [tex ? {pbrMetallicRoughness: {baseColorTexture: {index: 0}}} : {pbrMetallicRoughness: {baseColorFactor: [0, 1, 0, 1]}}],
    accessors: [{bufferView: 0, componentType: 5126, count: pos.length/3, type: "VEC3"}, {bufferView: 1, componentType: 5126, count: uv.length/2, type: "VEC2"},
                {bufferView: 2, componentType: 5125, count: idx.length, type: "SCALAR"}],
    bufferViews: bvs, buffers: [{byteLength: bin.length}]
  };
  if (tex){ json.textures = [{source: 0}]; json.images = [{mimeType: "image/png", bufferView: 3}]; }
  let js = Buffer.from(JSON.stringify(json), "utf8");
  while (js.length % 4) js = Buffer.concat([js, Buffer.from(" ")]);
  const bin4 = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const total = 12 + 8 + js.length + 8 + bin4.length, h = Buffer.alloc(12 + 8);
  h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(total, 8);
  h.writeUInt32LE(js.length, 12); h.writeUInt32LE(0x4e4f534a, 16);
  const hb = Buffer.alloc(8); hb.writeUInt32LE(bin4.length, 0); hb.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([h, js, hb, bin4]);
}

const m = Glb.lerGlb(cuboGlb(true));
check("le 24 vertices e 12 triangulos", m.pos.length === 72 && m.idx.length === 36);
check("le o uv e a textura PNG de 2 x 1", m.uv.length === 48 && m.textura && m.textura.largura === 2 && m.textura.altura === 1);
check("um .glb sem textura usa a cor base", Glb.lerGlb(cuboGlb(false)).textura === null && Glb.lerGlb(cuboGlb(false)).corBase[1] === 255);
let erro = null;
try { Glb.lerGlb(Buffer.from("isto nao e um glb, de jeito nenhum")); } catch (e){ erro = e.message; }
check("recusa o que nao e .glb", /glTF/.test(erro || ""));

const f = Glb.voxelizar(m, {alto: 20});
/* 20 de altura => 10 de largura e 10 de fundo (o cubo e 1 x 2 x 1), mais a folga */
let n = 0, x0 = 1e9, x1 = -1, z0 = 1e9, z1 = -1;
for (let z = 0; z < f.gz; z++) for (let y = 0; y < f.gy; y++) for (let x = 0; x < f.gx; x++) if (f.rgb(x, y, z)){ n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
check("a altura vira 20 voxels", z1 - z0 + 1 === 20 || z1 - z0 + 1 === 21, "z " + z0 + ".." + z1);
check("a largura acompanha: uns 10 voxels", x1 - x0 + 1 >= 10 && x1 - x0 + 1 <= 12, "x " + x0 + ".." + x1);
check("e SOLIDO: o miolo esta cheio", n >= 10*10*20*0.9 && n <= 12*12*21, n + " voxels");
const meio = Math.round((z0 + z1)/2), yM = Math.round(f.gy/2);
let cor = null;
for (let x = x0; x <= x1; x++) if (f.rgb(x, yM, meio)){ cor = cor || {}; cor[x < (x0 + x1)/2 ? "e" : "d"] = f.rgb(x, yM, meio); }
check("a cor vem da textura: esquerda vermelha e direita azul, tambem no miolo",
  cor && cor.e && cor.d && cor.e[0] === 255 && cor.e[2] === 0 && cor.d[2] === 255 && cor.d[0] === 0, JSON.stringify(cor));
const verde = Glb.voxelizar(Glb.lerGlb(cuboGlb(false)), {alto: 10});
let vc = null; for (let q = 0; q < verde.gx && !vc; q++) vc = verde.rgb(q, Math.floor(verde.gy/2), 5);
check("sem textura, a cor base pinta tudo", vc && vc[1] === 255 && vc[0] === 0);
/* o mesmo glb da a mesma grade: sem sorteio */
const f2 = Glb.voxelizar(m, {alto: 20});
check("voxelizar e determinista", f2.voxels === f.voxels && f2.gx === f.gx);

const s = fs.readFileSync(path.join(__dirname, "..", "editor", "glb.js"), "utf8");
const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
check("editor/glb.js e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);

fim();
