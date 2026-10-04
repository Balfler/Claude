/* ============================================================
   LEITOR DE .GLB E VOXELIZADOR
   ------------------------------------------------------------
   Le uma malha de fora (um .glb com uma malha de triangulos, posicao, uv e
   textura PNG) e a transforma em voxel SOLIDO, com a cor tirada da textura:

     lerGlb(buf)          -> {pos, uv, idx, textura}    (a malha, no espaco do arquivo)
     voxelizar(malha, o)  -> fonte {gx, gy, gz, rgb(x,y,z)} para atelie/corpo.js importarModelo

   O eixo do glb e o do glTF: y para cima, z para a frente. A fonte sai nos
   eixos do atelie, como o .wgvox: x esquerda-direita, y frente-costas
   (frente em y pequeno), z pe-cabeca.

   So triangulos (modo 4), uma malha, uma textura de cor base; nada de
   esqueleto, compressao Draco nem KHR_texture_transform. Sem dependencia,
   ASCII puro, roda no node e no navegador aberto do disco.
   ============================================================ */
"use strict";
(function(){
  const png = typeof require !== "undefined" ? require("./png.js") : PNG;

  const TAM = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4};
  function lerGlb(buf){
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("nao e um .glb (falta glTF)");
    let p = 12, json = null, bin = null;
    while (p + 8 <= buf.length){
      const n = dv.getUint32(p, true), tipo = dv.getUint32(p + 4, true);
      const dados = buf.subarray(p + 8, p + 8 + n);
      if (tipo === 0x4e4f534a) json = JSON.parse(Buffer.from(dados).toString("utf8"));
      else if (tipo === 0x004e4942 && !bin) bin = dados;
      p += 8 + n;
    }
    if (!json || !bin) throw new Error(".glb sem JSON ou sem BIN");
    if (json.extensionsUsed && json.extensionsUsed.includes("KHR_draco_mesh_compression")) throw new Error("malha com compressao Draco: nao suportado");
    const acessor = function(i){
      const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
      const ini = (bv.byteOffset || 0) + (a.byteOffset || 0), n = a.count, k = TAM[a.type];
      const passo = bv.byteStride || 0;
      const ler = a.componentType === 5126 ? (o) => dv2.getFloat32(o, true)
                : a.componentType === 5125 ? (o) => dv2.getUint32(o, true)
                : a.componentType === 5123 ? (o) => dv2.getUint16(o, true)
                : a.componentType === 5121 ? (o) => dv2.getUint8(o) : null;
      if (!ler) throw new Error("tipo de componente " + a.componentType + " nao suportado");
      const dv2 = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
      const tb = a.componentType === 5126 || a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : 1;
      const out = a.componentType === 5126 ? new Float32Array(n*k) : new Uint32Array(n*k);
      for (let v = 0; v < n; v++) for (let c = 0; c < k; c++) out[v*k + c] = ler(ini + v*(passo || k*tb) + c*tb);
      return out;
    };
    const prim = json.meshes[0].primitives[0];
    if ((prim.mode === undefined ? 4 : prim.mode) !== 4) throw new Error("so triangulos (modo 4)");
    const pos = acessor(prim.attributes.POSITION);
    const uv = prim.attributes.TEXCOORD_0 !== undefined ? acessor(prim.attributes.TEXCOORD_0) : null;
    let idx = prim.indices !== undefined ? acessor(prim.indices) : Uint32Array.from({length: pos.length/3}, (_, i) => i);
    let textura = null;
    const mat = json.materials && json.materials[prim.material || 0];
    const bt = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorTexture;
    const cor = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor;
    if (bt && json.textures[bt.index] && json.images){
      const im = json.images[json.textures[bt.index].source], bv = json.bufferViews[im.bufferView];
      textura = png.decodificar(Buffer.from(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)));
    }
    return {pos: pos, uv: uv, idx: idx, textura: textura, corBase: cor ? cor.slice(0, 3).map(v => v*255) : [200, 200, 200]};
  }

  /* cor da textura num uv, o vizinho mais perto (pixel art nao se mistura) */
  function corDoUv(tex, u, v){
    const x = Math.min(tex.largura - 1, Math.max(0, Math.floor(u*tex.largura)));
    const y = Math.min(tex.altura - 1, Math.max(0, Math.floor(v*tex.altura)));
    const i = (y*tex.largura + x)*4;
    return [tex.rgba[i], tex.rgba[i + 1], tex.rgba[i + 2]];
  }

  /* Voxeliza: a altura vira `alto` voxels (y do glb). Cada triangulo e
     amostrado mais fino que o voxel, o que toca marca a casca com a cor da
     textura; depois o vazio que se alcanca de fora e descartado, e o que
     sobra (o miolo) herda a cor da casca mais perto. */
  function voxelizar(m, opcoes){
    opcoes = opcoes || {};
    const alto = opcoes.alto || 256, P = m.pos, n = P.length/3;
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let i = 0; i < n; i++){
      const x = P[3*i], y = P[3*i + 1], z = P[3*i + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    const s = alto/(y1 - y0);
    const gx = Math.ceil((x1 - x0)*s) + 3, gy = Math.ceil((z1 - z0)*s) + 3, gz = alto + 2;
    const ix = x => (x - x0)*s + 1, iy = z => (z1 - z)*s + 1, iz = y => (y - y0)*s + 1;   // frente (z do glb grande) em y pequeno
    const G = new Int32Array(gx*gy*gz).fill(-1);    // -1 vazio; >= 0 o indice da cor
    const cores = [];
    const passoAmostra = 0.45;
    const idx = m.idx;
    for (let t = 0; t + 2 < idx.length; t += 3){
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const A = [ix(P[3*a]), iy(P[3*a + 2]), iz(P[3*a + 1])], B = [ix(P[3*b]), iy(P[3*b + 2]), iz(P[3*b + 1])], C = [ix(P[3*c]), iy(P[3*c + 2]), iz(P[3*c + 1])];
      const lado = Math.max(Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]), Math.hypot(C[0] - B[0], C[1] - B[1], C[2] - B[2]));
      const k = Math.max(1, Math.ceil(lado/passoAmostra));
      for (let i = 0; i <= k; i++) for (let j = 0; j <= k - i; j++){
        const u = i/k, v = j/k, w = 1 - u - v;
        const X = Math.floor(A[0]*w + B[0]*u + C[0]*v), Y = Math.floor(A[1]*w + B[1]*u + C[1]*v), Z = Math.floor(A[2]*w + B[2]*u + C[2]*v);
        if (X < 0 || Y < 0 || Z < 0 || X >= gx || Y >= gy || Z >= gz) continue;
        const q = (Z*gy + Y)*gx + X;
        if (G[q] >= 0) continue;
        let col;
        if (m.uv && m.textura) col = corDoUv(m.textura, m.uv[2*a]*w + m.uv[2*b]*u + m.uv[2*c]*v, m.uv[2*a + 1]*w + m.uv[2*b + 1]*u + m.uv[2*c + 1]*v);
        else col = m.corBase;
        G[q] = cores.length; cores.push(col);
      }
    }
    /* o fora: enchente do canto */
    const fora = new Uint8Array(G.length); let fila = new Int32Array(G.length);
    let ini = 0, fim = 0;
    const semear = q => { if (G[q] < 0 && !fora[q]){ fora[q] = 1; fila[fim++] = q; } };
    semear(0);
    while (ini < fim){
      const q = fila[ini++], x = q % gx, y = ((q/gx) | 0) % gy, z = (q/(gx*gy)) | 0;
      if (x > 0) semear(q - 1); if (x < gx - 1) semear(q + 1);
      if (y > 0) semear(q - gx); if (y < gy - 1) semear(q + gx);
      if (z > 0) semear(q - gx*gy); if (z < gz - 1) semear(q + gx*gy);
    }
    /* o miolo herda a cor da casca mais perto */
    fila = new Int32Array(G.length); ini = 0; fim = 0;
    for (let q = 0; q < G.length; q++) if (G[q] >= 0) fila[fim++] = q;
    while (ini < fim){
      const q = fila[ini++], x = q % gx, y = ((q/gx) | 0) % gy, z = (q/(gx*gy)) | 0;
      for (const r of [x > 0 ? q - 1 : -1, x < gx - 1 ? q + 1 : -1, y > 0 ? q - gx : -1, y < gy - 1 ? q + gx : -1, z > 0 ? q - gx*gy : -1, z < gz - 1 ? q + gx*gy : -1])
        if (r >= 0 && G[r] < 0 && !fora[r]){ G[r] = G[q]; fila[fim++] = r; }
    }
    return {gx: gx, gy: gy, gz: gz, rgb: (x, y, z) => { const v = G[(z*gy + y)*gx + x]; return v >= 0 ? cores[v] : null; },
            voxels: (function(){ let c = 0; for (let q = 0; q < G.length; q++) if (G[q] >= 0) c++; return c; })()};
  }

  const api = {lerGlb: lerGlb, voxelizar: voxelizar};
  if (typeof module !== "undefined") module.exports = api; else globalThis.GLB = api;
})();
