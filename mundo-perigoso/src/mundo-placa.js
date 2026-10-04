/* ============================================================
   O MUNDO NA PLACA DE VIDEO (sondagem 17, ?mundo=placa)
   ------------------------------------------------------------
   O rasterizador por software (p5a.js) e dois tercos do quadro, e a placa
   ficava parada (medido em 3/10: GTX 960 quase sem uso, o processador no
   limite). Com ?mundo=placa, o ceu e as faces dos pedacos saem pela placa,
   com as mesmas contas do rasterizador:

   - a textura de indice e a tabela de cor de cada uma (cores.js): o texel
     e um indice, a tabela diz a cor dele em cada um dos 16 niveis de luz;
   - o nivel de luz pela distancia, da mesma LIGHTLUT, e o brilho proprio
     (emis) perto e longe como no rasterizador;
   - o mip escolhido pela media geometrica dos dois sentidos da tela, e o
     texel com o truncamento do `|0`, que repete a fileira do zero;
   - so a frente da face, pelo plano dela, e nada alem do alcance (FAR);
   - o ceu como a faixa de sempre, sem perspectiva.

   Todas as texturas do mundo cabem numa textura em camadas de 128x128 (a
   ilha usa 49, todas de 128; a cripta, 20 de 64): a de 64 entra no segundo
   nivel, e o primeiro fica sem uso. Cada pedaco vira um buffer, montado
   quando a lista de faces dele muda, e sai numa chamada so.

   Fica no software, por enquanto, o que nao e do mundo: bichos, cenario,
   itens e particulas. Eles saem numa imagem transparente, que a placa poe
   por cima do mundo com a profundidade de cada pixel (gpu.js) -- quem esta
   atras da parede continua atras.

   Sem WebGL2, ou se algo falhar, volta o rasterizador, sem aviso.
   ============================================================ */
const MUNDO_PLACA = {pedido: typeof BUSCA_INICIAL === "string" && /[?&]mundo=placa/.test(BUSCA_INICIAL),
                     ativo: false, motivo: "", prog: null, ceu: null,
                     arr: null, cap: 0, usadas: 0, registro: new Map(), info: null, infoTex: null, infoSujo: false,
                     cmTex: null, cmCap: 0, cms: new Map(),
                     luzTex: null, luzDe: null, ceuTex: null, ceuDe: null,
                     pedacos: new Map(), pedacosDe: null, ultimo: null};
const MP_LADO = 128, MP_NIVEIS = 5, MP_FLOATS = 13;   // 128 ate 8; por vertice: posicao, uv, plano, info

const MP_VS = [
  "#version 300 es", "precision highp float;",
  "layout(location=0) in vec3 aPos;", "layout(location=1) in vec2 aUv;", "layout(location=2) in vec4 aPlano;", "layout(location=3) in vec4 aInfo;",
  "uniform vec3 uCam; uniform vec4 uRot; uniform vec2 uF; uniform float uNear;",
  "out vec2 vUv; out float vFz; out vec2 vMundo; flat out vec4 vInfo;",
  "void main(){",
  /* de costas para a camera: os tres cantos no mesmo ponto, e o triangulo some */
  "  if (dot(aPlano.xyz, uCam) - aPlano.w <= 1e-7){ gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }",
  "  vec3 dc = aPos - uCam;",
  "  float h = dc.x*uRot.x + dc.y*uRot.y;",
  "  float rx = -dc.x*uRot.y + dc.y*uRot.x, fz = h*uRot.z + dc.z*uRot.w, uy = -h*uRot.w + dc.z*uRot.z;",
  /* a profundidade 1 - NEAR/fz, a mesma do personagem e da imagem do software */
  "  gl_Position = vec4(rx*uF.x, uy*uF.y, fz - 2.0*uNear, fz);",
  "  vUv = aUv; vFz = fz; vMundo = aPos.xy; vInfo = aInfo;",
  "}"].join("\n");
const MP_FS = [
  "#version 300 es", "precision highp float;", "precision highp int;",
  "precision highp usampler2DArray;", "precision highp usampler2D;", "precision highp sampler2D;",
  "uniform usampler2DArray uTex; uniform usampler2D uInfo; uniform sampler2D uCm; uniform usampler2D uLuz;",
  "uniform float uFar; uniform int uLmax; uniform float uTick; uniform vec2 uCam2;",
  "in vec2 vUv; in float vFz; in vec2 vMundo; flat in vec4 vInfo;",
  "out vec4 o;",
  "void main(){",
  "  if (length(vMundo - uCam2) > uFar + 0.71) discard;",
  /* o quadro da animacao (frameIdx) */
  "  int camada = int(vInfo.x), n = int(vInfo.y);",
  "  if (n > 1){ int q = int(uTick*vInfo.z) % n; if (q < 0) q += n; camada += q; }",
  "  uvec4 inf = texelFetch(uInfo, ivec2(camada, 0), 0);",
  "  int desloca = int(inf.x), nmips = int(inf.y), cm = int(inf.z), lado = int(inf.w);",
  "  vec2 t = vUv*float(lado);",
  /* o mip: a media geometrica do passo nos dois sentidos da tela */
  "  vec2 ddx = dFdx(t), ddy = dFdy(t);",
  "  float m = sqrt(max(abs(ddx.x), abs(ddx.y))*max(abs(ddy.x), abs(ddy.y)));",
  "  int k = 0;",
  "  for (int i = 0; i < 4; i++){ if (m >= 2.0 && k < nmips){ m *= 0.5; k++; } }",
  "  int lk = lado >> k;",
  "  ivec2 it = ivec2(t/float(1 << k)) & ivec2(lk - 1);",
  "  uint idx = texelFetch(uTex, ivec3(it, camada), desloca + k).r;",
  /* a luz: a da distancia, ou o brilho proprio */
  "  int nivel;",
  "  if (vInfo.w > 0.0) nivel = vFz > 7.0 ? int(vInfo.w) : 0;",
  "  else nivel = int(texelFetch(uLuz, ivec2(vFz >= uFar ? uLmax : int(vFz*4.0), 0), 0).r);",
  "  vec4 c = texelFetch(uCm, ivec2(int(idx), nivel + 16*cm), 0);",
  "  if (c.a < 0.5) discard;",
  "  o = vec4(c.rgb, 1.0);",
  "}"].join("\n");
/* o ceu: a faixa de drawSky, por pixel, onde o mundo nao pintou */
const MP_VS_CEU = "#version 300 es\nvoid main(){ vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0); gl_Position = vec4(p, 1.0, 1.0); }";
const MP_FS_CEU = [
  "#version 300 es", "precision highp float;", "precision highp int;",
  "uniform sampler2D uCeu; uniform float uU, uDu, uV, uDv; uniform int uLarg, uAlto, uAlt;",
  "out vec4 o;",
  "void main(){",
  "  int x = int(gl_FragCoord.x), y = uAlt - 1 - int(gl_FragCoord.y);",
  "  int u = int(uU + float(x)*uDu) & (uLarg - 1);",
  "  int v = int(uV + float(y)*uDv); v = clamp(v, 0, uAlto - 1);",
  "  o = vec4(texelFetch(uCeu, ivec2(u, v), 0).rgb, 1.0);",
  "}"].join("\n");

/* ---------- ligar ---------- */
function ligarMundoNaPlaca(){
  const M = MUNDO_PLACA;
  if (!M.pedido || M.motivo) return false;
  if (M.ativo) return !GPU.gl.isContextLost();
  if (!ligarGpu()){ M.motivo = GPU.motivo || "sem placa"; return false; }
  try {
    const gl = GPU.gl;
    M.prog = gpuPrograma(gl, MP_VS, MP_FS);
    M.ceu = gpuPrograma(gl, MP_VS_CEU, MP_FS_CEU);
    mpCrescerCamadas(64);
    mpCrescerTabelas(64);
    M.luzTex = gl.createTexture(); M.ceuTex = gl.createTexture(); M.infoTex = gl.createTexture();
    for (const t of [M.luzTex, M.ceuTex, M.infoTex]){
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    M.ativo = true;
  } catch(e){ M.motivo = e.message; M.ativo = false; }
  return M.ativo;
}

/* ---------- as texturas ---------- */
/* A textura em camadas cresce dobrando: a nova recebe de novo as que ja
   estavam, nas mesmas camadas, e os buffers dos pedacos continuam valendo. */
function mpCrescerCamadas(cap){
  const M = MUNDO_PLACA, gl = GPU.gl, velha = M.arr;
  M.arr = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, M.arr);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, MP_NIVEIS, gl.R8UI, MP_LADO, MP_LADO, cap);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const info = new Uint16Array(cap*4);
  if (M.info) info.set(M.info);
  M.info = info; M.cap = cap; M.infoSujo = true;
  if (velha){
    gl.deleteTexture(velha);
    for (const [, r] of M.registro) r.quadros.forEach(function(t, i){ mpSubirCamada(t, r.base + i); });
  }
}
function mpCrescerTabelas(cap){
  const M = MUNDO_PLACA, gl = GPU.gl, velha = M.cmTex;
  M.cmTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, M.cmTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, 256, 16*cap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  M.cmCap = cap;
  if (velha){
    gl.deleteTexture(velha);
    for (const [cm, i] of M.cms) mpSubirTabela(cm, i);
  }
}
function mpSubirTabela(cm, i){
  const gl = GPU.gl;
  gl.bindTexture(gl.TEXTURE_2D, MUNDO_PLACA.cmTex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 16*i, 256, 16, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(cm.buffer, cm.byteOffset, 256*16*4));
}
function mpTabela(cm){
  const M = MUNDO_PLACA;
  let i = M.cms.get(cm);
  if (i !== undefined) return i;
  if (cm.length !== 256*16) throw new Error("tabela de cor com " + cm.length + " cores");
  i = M.cms.size;
  if (i >= M.cmCap) mpCrescerTabelas(M.cmCap*2);
  M.cms.set(cm, i);
  mpSubirTabela(cm, i);
  return i;
}
/* a textura de lado L entra no nivel log2(128/L): o texel dela cai no mesmo
   lugar, e o mip k dela no nivel seguinte */
function mpSubirCamada(t, camada){
  const gl = GPU.gl, desloca = Math.round(Math.log2(MP_LADO/t.w));
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, MUNDO_PLACA.arr);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, desloca, 0, 0, camada, t.w, t.h, 1, gl.RED_INTEGER, gl.UNSIGNED_BYTE, t.px);
  const mips = t.mips || [];
  for (let k = 0; k < mips.length && desloca + k + 1 < MP_NIVEIS; k++)
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, desloca + k + 1, 0, 0, camada, mips[k].w, mips[k].h, 1, gl.RED_INTEGER, gl.UNSIGNED_BYTE, mips[k].px);
}
/* as camadas de uma textura (ou da lista de quadros de uma animada) */
function mpCamadas(tex){
  const M = MUNDO_PLACA;
  let r = M.registro.get(tex);
  if (r) return r;
  const quadros = Array.isArray(tex) ? tex : [tex];
  for (const t of quadros){
    const d = Math.log2(MP_LADO/t.w);
    if (t.w !== t.h || d !== Math.round(d) || d < 0 || d >= MP_NIVEIS) throw new Error("textura de " + t.w + "x" + t.h);
  }
  while (M.usadas + quadros.length > M.cap) mpCrescerCamadas(M.cap*2);
  r = {base: M.usadas, n: quadros.length, quadros: quadros};
  M.usadas += quadros.length;
  quadros.forEach(function(t, i){
    const c = r.base + i, d = Math.round(Math.log2(MP_LADO/t.w));
    mpSubirCamada(t, c);
    M.info.set([d, Math.min((t.mips || []).length, MP_NIVEIS - 1 - d), mpTabela(t.cm), t.w], c*4);
  });
  M.infoSujo = true;
  M.registro.set(tex, r);
  return r;
}

/* ---------- os pedacos ---------- */
function mpMontarPedaco(P){
  const M = MUNDO_PLACA, gl = GPU.gl, fs = P.faces;
  let nv = 0, ni = 0;
  for (const f of fs){ nv += f.n; ni += (f.n - 2)*3; }
  const v = new Float32Array(nv*MP_FLOATS), ix = new Uint32Array(ni);
  let a = 0, b = 0, base = 0;
  for (const f of fs){
    const r = mpCamadas(f.tex), anim = r.n > 1 ? (f.anim || 0) : 0;
    for (let i = 0; i < f.n; i++){
      v[a++] = f.p[3*i]; v[a++] = f.p[3*i + 1]; v[a++] = f.p[3*i + 2];
      v[a++] = f.uv[2*i]; v[a++] = f.uv[2*i + 1];
      v[a++] = f.nx; v[a++] = f.ny; v[a++] = f.nz; v[a++] = f.d;
      v[a++] = r.base; v[a++] = r.n; v[a++] = anim; v[a++] = f.emis || 0;
    }
    for (let i = 1; i < f.n - 1; i++){ ix[b++] = base; ix[b++] = base + i; ix[b++] = base + i + 1; }
    base += f.n;
  }
  let e = M.pedacos.get(P);
  if (!e){
    e = {vao: gl.createVertexArray(), vb: gl.createBuffer(), ib: gl.createBuffer(), faces: null, n: 0};
    gl.bindVertexArray(e.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, e.vb);
    const S = MP_FLOATS*4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 20);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, S, 36);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, e.ib);
    gl.bindVertexArray(null);
    M.pedacos.set(P, e);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, e.vb); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  gl.bindVertexArray(e.vao);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  e.faces = fs; e.n = ni;
  return e;
}
/* outro mapa: os buffers dos pedacos de antes vao embora */
function mpLimparPedacos(){
  const M = MUNDO_PLACA, gl = GPU.gl;
  for (const [, e] of M.pedacos){ gl.deleteVertexArray(e.vao); gl.deleteBuffer(e.vb); gl.deleteBuffer(e.ib); }
  M.pedacos.clear();
  M.pedacosDe = PEDACOS;
}

/* ---------- o quadro ----------
   No lugar de renderWorld: monta os pedacos que entraram no alcance (como
   buildGeometry), e deixa a imagem do software vazia para os bichos. */
function prepararMundoNaPlaca(){
  zbuf.fill(0); buf.fill(0);
  HZ_ATIVO = false; PIX_VISTOS = 0;
  remontarSujos(camX, camY);
}
/* Desenha o mundo e o ceu (gpu.js chama, com a vista ja posta). */
function desenharMundoNaPlaca(){
  const M = MUNDO_PLACA, gl = GPU.gl;
  if (M.pedacosDe !== PEDACOS) mpLimparPedacos();
  /* a tabela de luz e o ceu sobem quando o mapa os troca */
  if (M.luzDe !== LIGHTLUT){
    gl.bindTexture(gl.TEXTURE_2D, M.luzTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, LIGHTLUT.length, 1, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, LIGHTLUT);
    M.luzDe = LIGHTLUT;
  }
  if (M.ceuDe !== SKY){
    gl.bindTexture(gl.TEXTURE_2D, M.ceuTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SKY_W, SKY_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(SKY.buffer, SKY.byteOffset, SKY_W*SKY_H*4));
    M.ceuDe = SKY;
  }
  /* os pedacos que se veem, de perto para longe (o recorte de buildGeometry) */
  const vistos = [];
  for (const P of PEDACOS){
    if (P.sujo || !P.faces.length) continue;
    const ex = P.cx - camX, ey = P.cy - camY, d = Math.hypot(ex, ey);
    if (d > FAR + P.r) continue;
    if (d > P.r + 2){
      const fwd = ex*cyaw + ey*syaw, side = Math.abs(-ex*syaw + ey*cyaw);
      if (fwd < -P.r - 1.5 || side > (fwd + P.r + 1.5)*TANH + P.r + 1.5) continue;
    }
    vistos.push({P: P, d: d});
  }
  vistos.sort(function(a, b){ return a.d - b.d; });
  let faces = 0;
  for (const s of vistos){
    const e = M.pedacos.get(s.P);
    s.e = e && e.faces === s.P.faces ? e : mpMontarPedaco(s.P);
    faces += s.P.faces.length;
  }
  if (M.infoSujo){
    gl.bindTexture(gl.TEXTURE_2D, M.infoTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16UI, M.cap, 1, 0, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, M.info);
    M.infoSujo = false;
  }
  /* o mundo */
  const S = M.prog;
  gl.useProgram(S.p);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, M.arr); gl.uniform1i(S.u.uTex, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, M.infoTex); gl.uniform1i(S.u.uInfo, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, M.cmTex); gl.uniform1i(S.u.uCm, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, M.luzTex); gl.uniform1i(S.u.uLuz, 3);
  gl.uniform3f(S.u.uCam, camX, camY, camZ);
  gl.uniform4f(S.u.uRot, cyaw, syaw, cpit, spit);
  gl.uniform2f(S.u.uF, FX/HW, FY/HVH);
  gl.uniform1f(S.u.uNear, NEAR);
  gl.uniform1f(S.u.uFar, FAR);
  gl.uniform1i(S.u.uLmax, LMAX);
  gl.uniform1f(S.u.uTick, G.tick);
  gl.uniform2f(S.u.uCam2, camX, camY);
  for (const s of vistos){
    gl.bindVertexArray(s.e.vao);
    gl.drawElements(gl.TRIANGLES, s.e.n, gl.UNSIGNED_INT, 0);
  }
  gl.bindVertexArray(null);
  /* o ceu, so onde a profundidade ficou no fundo (as contas de drawSky) */
  const C = M.ceu, volta = AJUSTE.fov/360;
  gl.useProgram(C.p);
  gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, M.ceuTex); gl.uniform1i(C.u.uCeu, 0);
  gl.uniform1f(C.u.uU, ((P.ang/TAU + 0.125 - volta/2)*SKY_VOLTA % SKY_W) + SKY_W);
  gl.uniform1f(C.u.uDu, SKY_VOLTA*volta/RW);
  const dv = FY_REF/FY;
  gl.uniform1f(C.u.uV, SKY_HOR - (HVH + P.pitch*FY)*dv);
  gl.uniform1f(C.u.uDv, dv);
  gl.uniform1i(C.u.uLarg, SKY_W); gl.uniform1i(C.u.uAlto, SKY_H); gl.uniform1i(C.u.uAlt, RH);
  gl.bindVertexArray(GPU.vaoVazio);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
  gl.depthMask(true);
  M.ultimo = {pedacos: vistos.length, faces: faces, camadas: M.usadas};
}
