
/* ============================================================
   O PERSONAGEM NA PLACA DE VIDEO (padrao com WebGL2; ?gpu=nao desliga)
   ------------------------------------------------------------
   A sondagem 16 (1/10, pedido do Leandro): em vez de sprites assados de oito
   rumos e quatro alturas, o personagem e o corpo 3D do atelie, com o peso de
   osso, posado e desenhado pela placa a cada quadro -- qualquer angulo, a
   animacao misturando um quadro no outro, sem forno.

   O mundo continua no rasterizador de software (p5a.js). A cada quadro a
   imagem dele e o z-buffer sobem para a placa; a placa pinta o mundo com a
   profundidade dele e desenha os personagens por cima, com o teste de
   profundidade -- quem esta atras da parede fica atras da parede. O HUD
   continua no canvas 2D, transparente, por cima de tudo.

   Cada voxel da casca do corpo e um quadradinho virado para a camera (o
   tamanho de um voxel e tres quartos, para nao abrir fresta quando o corpo
   gira: com um e meio, bem de perto, ainda se via o fundo por furinhos),
   posado pelo quaternio dual dos dois ossos dele, a mesma conta do atelie
   (deformar.js). Longe, vai o modelo leve de 117.

   O arquivo do modelo e o GPU 1 (atelie/gpu.js), que a pagina carrega de
   personagens/<nome>.gpu.js. Sem WebGL2, ou sem o modelo, tudo fica como
   sempre, com sprites.

   Desde 3/10 e o padrao (o Leandro: "quero que seja um personagem 3D mesmo"):
   o sprite de perto virava um cartaz achatado. O carregador da pagina
   (p1.html) confere o WebGL2 e escolhe o que baixar; PLACA_PEDIDA (p2.js) e
   a resposta dele. Num quadro sem ninguem na fila, a placa fica quieta e o
   mundo sai pelo putImageData de sempre, sem subir imagem nenhuma.

   O JEITO DE DESENHO (3/10, o Leandro: o 3D mexia "muito boneco 3D", o
   sprite tinha "uma pegada mais desenho"). O que o sprite tinha e o 3D
   perdeu, devolvido aqui:
   - o passo em quadros: a pose troca de uma vez, no ritmo do sprite (uns 9
     por segundo andando), em vez de misturar um quadro no outro a 60;
   - o giro em degraus: 16 rumos (?rumos=N; 0 e livre), em vez de girar liso;
   - o contorno: a borda escurece um passo (0,42, o CONTORNO_DO_PERSONAGEM
     do sprite), sem virar traco preto -- e a mesma conta faz a linha onde o
     braco passa na frente do corpo.
   ?anim=suave volta ao 3D liso, sem contorno.

   Cada personagem sai em ate tres passadas, todas com o teste de
   profundidade: a casca; o recheio, um pouco atras, com o quadradinho maior e
   sem cortar as costas -- onde a casca abre ao esticar (o ombro, com o braco
   balancando) aparece o corpo, e nao o ceu; e o contorno, mais atras ainda e
   maior, que so sobra na borda. O recheio so tapa a fresta rasa: o oco
   fundo do ombro fecha com o miolo da junta, que o modelo traz (atelie/gpu.js).
   ============================================================ */
const GPU = {pedido: PLACA_PEDIDA, exigido: typeof BUSCA_INICIAL === "string" && /[?&]gpu=sim/.test(BUSCA_INICIAL),
             ativo: false, motivo: "", gl: null, canvas: null, modelos: {}, fila: [], W: 0, H: 0, VH: 0};
/* o jeito: "desenho" (o padrao) ou "suave" (?anim=suave); e os rumos do giro */
GPU.estilo = typeof BUSCA_INICIAL === "string" && /[?&]anim=suave/.test(BUSCA_INICIAL) ? "suave" : "desenho";
GPU.rumos = typeof BUSCA_INICIAL === "string" && /[?&]rumos=(\d+)/.test(BUSCA_INICIAL) ? +BUSCA_INICIAL.match(/[?&]rumos=(\d+)/)[1]
          : GPU.estilo === "desenho" ? 16 : 0;
/* as passadas: [corte das costas (acima de 1 nao corta), voxels a mais no
   quadradinho, voxels para tras, quanto da luz fica, pixels a mais] */
const GPU_CASCA    = [0.5, 0,   0,   1,    0];
const GPU_RECHEIO  = [2,   0.6, 1.5, 0.8,  0];
const GPU_CONTORNO = [2,   0.8, 4,   0.42, 0.75];

/* ---------- o modelo ---------- */
function lerModeloGpu(texto){
  const L = String(texto).split("\n");
  if (L[0].trim() !== "GPU 1") throw new Error("nao e um modelo GPU 1");
  const m = {nome: "", niveis: []};
  let n = null, i = 1;
  for (; i < L.length; i++){
    const l = L[i].trim();
    if (!l) continue;
    const p = l.split(/\s+/);
    if (p[0] === "nome") m.nome = p[1];
    else if (l.charAt(0) === "["){ n = {altura: +l.slice(7, -1), quadros: {}}; m.niveis.push(n); }
    else if (p[0] === "grade"){ n.DX = +p[1]; n.DY = +p[2]; n.DZ = +p[3]; n.CX = +p[4]; n.CY = +p[5]; }
    else if (p[0] === "cores"){ const k = +p[1]; n.cores = new Float32Array(64*3); for (let c = 0; c < k; c++){ const h = p[2 + c]; n.cores[c*3] = parseInt(h.slice(0, 2), 16); n.cores[c*3 + 1] = parseInt(h.slice(2, 4), 16); n.cores[c*3 + 2] = parseInt(h.slice(4, 6), 16); } }
    else if (p[0] === "pivos"){ const k = +p[1]; n.pivos = []; for (let o = 0; o < k; o++) n.pivos.push([+p[2 + o*3], +p[3 + o*3], +p[4 + o*3]]); }
    else if (p[0] === "quadros"){
      const k = +p[1];
      for (let q = 0; q < k; q++){
        const s = L[++i].trim().split(/\s+/), raiz = [+s[2], +s[3], +s[4]], rot = [];
        for (let o = 0; o < n.pivos.length; o++) rot.push([+s[6 + o*4], +s[7 + o*4], +s[8 + o*4], +s[9 + o*4]]);
        n.quadros[s[0]] = {raiz: raiz, rot: rot};
      }
    } else if (p[0] === "voxels"){
      n.n = +p[1];
      const partes = [];
      while (i + 1 < L.length && L[i + 1].trim() && L[i + 1].charAt(0) !== "["){ partes.push(L[++i].trim()); }
      n.dados = new Uint8Array(n.n*12);
      const lidos = INFLATE(deBase64(partes.join("")), n.dados);
      if (lidos !== n.n*12) throw new Error("modelo GPU: " + lidos + " bytes, esperava " + n.n*12);
    }
  }
  return m;
}

/* ---------- quaternios (w, x, y, z), como no atelie ---------- */
function gqMul(a, b){
  return [a[0]*b[0] - a[1]*b[1] - a[2]*b[2] - a[3]*b[3], a[0]*b[1] + a[1]*b[0] + a[2]*b[3] - a[3]*b[2],
          a[0]*b[2] - a[1]*b[3] + a[2]*b[0] + a[3]*b[1], a[0]*b[3] + a[1]*b[2] - a[2]*b[1] + a[3]*b[0]];
}
function gqGira(q, v){
  const r = gqMul(gqMul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]);
  return [r[1], r[2], r[3]];
}
function gqNorm(q){ const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0]/l, q[1]/l, q[2]/l, q[3]/l]; }
function gqSlerp(a, b, t){
  let d = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3], s = 1;
  if (d < 0){ d = -d; s = -1; }
  if (d > 0.9995) return gqNorm([a[0] + (s*b[0] - a[0])*t, a[1] + (s*b[1] - a[1])*t, a[2] + (s*b[2] - a[2])*t, a[3] + (s*b[3] - a[3])*t]);
  const th = Math.acos(d), sa = Math.sin((1 - t)*th)/Math.sin(th), sb = s*Math.sin(t*th)/Math.sin(th);
  return [a[0]*sa + b[0]*sb, a[1]*sa + b[1]*sb, a[2]*sa + b[2]*sb, a[3]*sa + b[3]*sb];
}
/* OSSOS do atelie (nucleo.js), so os pais, na mesma ordem */
const GPU_PAIS = [-1, 0, 1, 1, 3, 1, 5, 0, 7, 8, 0, 10, 11];
/* a pose de dois quadros misturados (t de 0 a 1) */
function gpuPose(nivel, a, b, t){
  const A = nivel.quadros[a] || nivel.quadros.parado, B = nivel.quadros[b] || A;
  const rot = [];
  for (let o = 0; o < A.rot.length; o++) rot.push(t > 0 ? gqSlerp(A.rot[o], B.rot[o], t) : A.rot[o]);
  return {raiz: [A.raiz[0] + (B.raiz[0] - A.raiz[0])*t, A.raiz[1] + (B.raiz[1] - A.raiz[1])*t, A.raiz[2] + (B.raiz[2] - A.raiz[2])*t], rot: rot};
}
/* o quaternio dual de cada osso (posarEsqueleto + posarCorpo do atelie) */
function gpuDualDosOssos(nivel, pose, saidaR, saidaD){
  const q = [], t = [];
  for (let o = 0; o < nivel.pivos.length; o++){
    const L = pose.rot[o], P0 = nivel.pivos[o], pai = GPU_PAIS[o];
    let W, P1;
    if (pai < 0){ W = gqNorm(L); P1 = [P0[0] + pose.raiz[0], P0[1] + pose.raiz[1], P0[2] + pose.raiz[2]]; }
    else { W = gqNorm(gqMul(q[pai], L)); const g = gqGira(q[pai], P0); P1 = [g[0] + t[pai][0], g[1] + t[pai][1], g[2] + t[pai][2]]; }
    q.push(W);
    const g = gqGira(W, P0), T = [P1[0] - g[0], P1[1] - g[1], P1[2] - g[2]];
    t.push(T);
    const d = gqMul([0, T[0], T[1], T[2]], W);
    saidaR.set(W, o*4);
    saidaD.set([0.5*d[0], 0.5*d[1], 0.5*d[2], 0.5*d[3]], o*4);
  }
}

/* ---------- os shaders ---------- */
const GPU_VS_MUNDO = "#version 300 es\nvoid main(){ vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0); gl_Position = vec4(p, 0.0, 1.0); }";
const GPU_FS_MUNDO = [
  "#version 300 es", "precision highp float;", "precision highp sampler2D;",
  "uniform sampler2D uCor; uniform sampler2D uProf; uniform float uNear; uniform int uAlt; uniform int uVazio;",
  "out vec4 o;",
  "void main(){",
  "  ivec2 q = ivec2(gl_FragCoord.xy); q.y = uAlt - 1 - q.y;",
  "  float iz = texelFetch(uProf, q, 0).r;",
  /* com o mundo na placa (mundo-placa.js) a imagem do software so tem os bichos: o vazio nao pinta */
  "  if (uVazio == 1 && iz <= 0.0) discard;",
  "  o = texelFetch(uCor, q, 0);",
  /* a profundidade do mundo na mesma conta da dos personagens: 1 - NEAR/z */
  "  gl_FragDepth = iz > 0.0 ? clamp(1.0 - uNear*iz, 0.0, 1.0) : 1.0;",
  "}"].join("\n");
const GPU_VS_CORPO = [
  "#version 300 es", "precision highp float;",
  "layout(location=0) in vec3 aPos;", "layout(location=1) in vec3 aNor;", "layout(location=2) in vec3 aInfo;",
  "uniform vec4 uDQr[13]; uniform vec4 uDQd[13];",
  "uniform vec3 uBase; uniform vec2 uAng; uniform vec4 uGrade;",
  "uniform vec3 uCam; uniform vec4 uRot; uniform vec2 uF; uniform float uNear;",
  "uniform vec3 uPal[64]; uniform vec3 uLuz; uniform vec3 uNevoa; uniform float uFar;",
  "uniform vec4 uPasso; uniform vec2 uPx;",
  "out vec3 vCor;",
  "vec3 girar(vec4 q, vec3 v){ vec3 u = q.yzw; return v + 2.0*cross(u, cross(u, v) + q.x*v); }",
  "void main(){",
  "  float w = aInfo.z/255.0; int ia = int(mod(aInfo.y, 16.0)); int ib = int(floor(aInfo.y/16.0));",
  "  vec4 ra = uDQr[ia], da = uDQd[ia], rb = uDQr[ib], db = uDQd[ib];",
  "  float wb = 1.0 - w; if (dot(ra, rb) < 0.0) wb = -wb;",
  "  vec4 r = w*ra + wb*rb, d = w*da + wb*db; float L = length(r); r /= L; d /= L;",
  "  vec3 t = 2.0*(r.x*d.yzw - d.x*r.yzw + cross(r.yzw, d.yzw));",
  "  vec3 p = girar(r, aPos) + t, n = girar(r, aNor);",
  /* da grade do personagem para o mundo, do jeito do sprite (o rumo 0 e ele de frente) */
  "  float vox = uGrade.z;",
  "  vec2 ex = vec2(uAng.x, -uAng.y), ey = vec2(-uAng.y, -uAng.x);",
  "  vec3 m = vec3(uBase.xy + (p.x - uGrade.x)*vox*ex + (p.y - uGrade.y)*vox*ey, uBase.z + p.z*vox);",
  "  vec3 nm = vec3(n.x*ex + n.y*ey, n.z);",
  "  vec3 dc = m - uCam;",
  /* as costas do voxel para a camera: nao desenha. So as que viram bem de
     costas: com o corte em 0,2 a borda da silhueta (a gola de pele, de
     perto) abria furinhos por onde se via o fundo */
  "  if (dot(nm, dc) > uPasso.x*length(nm)*length(dc)){ gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCor = vec3(0.0); return; }",
  "  float h = dc.x*uRot.x + dc.y*uRot.y;",
  "  float rx = -dc.x*uRot.y + dc.y*uRot.x, fz = h*uRot.z + dc.z*uRot.w, uy = -h*uRot.w + dc.z*uRot.z;",
  "  vec2 k = vec2((gl_VertexID == 1 || gl_VertexID == 3) ? 1.0 : -1.0, gl_VertexID >= 2 ? 1.0 : -1.0);",
  "  float meio = 0.5*(uGrade.w + uPasso.y)*vox;",
  "  rx += k.x*meio; uy += k.y*meio;",
  /* empurrar para tras so a profundidade (a de um ponto uPasso.z mais longe), sem mudar o tamanho */
  "  float zf = fz + uPasso.z*vox;",
  "  gl_Position = vec4(rx*uF.x + k.x*uPx.x*fz, uy*uF.y + k.y*uPx.y*fz, fz - 2.0*uNear*fz/zf, fz);",
  /* o recheio pega tambem o lado de dentro da casca: ele acende como se
     fosse o de fora, senao o buraco tapado vira mancha escura */
  "  if (uPasso.x > 1.0 && dot(nm, dc) > 0.0) nm = -nm;",
  /* o miolo da junta vem sem normal (atelie/gpu.js): acende de frente para a camera */
  "  if (dot(nm, nm) < 1e-4) nm = -dc;",
  /* a luz em faixas, como a da paleta, e a nevoa da distancia */
  "  vec3 base = uPal[int(aInfo.x) - 1];",
  "  float lam = max(dot(normalize(nm), uLuz), 0.0);",
  "  float luz = floor((0.62 + 0.46*lam)*6.0 + 0.5)/6.0;",
  "  float f = clamp((fz - uFar*0.3)/(uFar*0.7), 0.0, 1.0);",
  "  vCor = mix(base*luz*uPasso.w/255.0, uNevoa, f);",
  "}"].join("\n");
const GPU_FS_CORPO = "#version 300 es\nprecision mediump float;\nin vec3 vCor; out vec4 o;\nvoid main(){ o = vec4(vCor, 1.0); }";

function gpuPrograma(gl, vs, fs){
  function sh(tipo, txt){
    const s = gl.createShader(tipo);
    gl.shaderSource(s, txt); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s));
    return s;
  }
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("programa: " + gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++){ const a = gl.getActiveUniform(p, i), nome = a.name.replace(/\[0\]$/, ""); u[nome] = gl.getUniformLocation(p, a.name); }
  return {p: p, u: u};
}

/* ---------- ligar ---------- */
function ligarGpu(){
  if (!GPU.pedido || GPU.ativo || GPU.motivo) return GPU.ativo;
  try {
    if (typeof __FORNO_NO_WORKER !== "undefined" || typeof WebGL2RenderingContext === "undefined" || typeof document === "undefined" || !cvs.parentElement)
      throw new Error("sem WebGL2");
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", {antialias: false, depth: true, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance"});
    if (!gl || !(gl instanceof WebGL2RenderingContext)) throw new Error("o navegador nao deu WebGL2");
    /* o canvas da placa fica embaixo do 2D, do mesmo tamanho na pagina */
    c.style.position = "absolute"; c.style.left = "0"; c.style.top = "0"; c.style.zIndex = "0"; c.style.pointerEvents = "none";
    cvs.parentElement.insertBefore(c, cvs);
    cvs.style.position = "relative"; cvs.style.zIndex = "1"; cvs.style.background = "transparent";
    GPU.gl = gl; GPU.canvas = c;
    GPU.mundo = gpuPrograma(gl, GPU_VS_MUNDO, GPU_FS_MUNDO);
    GPU.corpo = gpuPrograma(gl, GPU_VS_CORPO, GPU_FS_CORPO);
    GPU.vaoVazio = gl.createVertexArray();
    GPU.texCor = gl.createTexture(); GPU.texProf = gl.createTexture();
    GPU.dqR = new Float32Array(13*4); GPU.dqD = new Float32Array(13*4);
    GPU.renderer = (function(){ try { const e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch(e){ return ""; } })();
    GPU.ativo = true;
  } catch(e){ GPU.motivo = e.message; GPU.ativo = false; }
  return GPU.ativo;
}
/* o modelo de um nome, lido e mandado para a placa uma vez so */
function modeloGpu(nome){
  if (!GPU.ativo) return null;
  if (GPU.modelos[nome] !== undefined) return GPU.modelos[nome];
  GPU.modelos[nome] = null;
  const texto = typeof self !== "undefined" && self.PERSONAGENS_GPU ? self.PERSONAGENS_GPU[nome] : null;
  if (!texto) return null;
  try {
    const m = lerModeloGpu(texto), gl = GPU.gl;
    for (const n of m.niveis){
      n.vao = gl.createVertexArray(); gl.bindVertexArray(n.vao);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, n.dados, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.SHORT, false, 12, 0); gl.vertexAttribDivisor(0, 1);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, 12, 6); gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.UNSIGNED_BYTE, false, 12, 9); gl.vertexAttribDivisor(2, 1);
      gl.bindVertexArray(null);
      n.dados = null;                                   // ja esta na placa
    }
    GPU.modelos[nome] = m;
  } catch(e){ GPU.motivo = "modelo " + nome + ": " + e.message; }
  return GPU.modelos[nome];
}

/* ---------- o quadro ---------- */
/* quem desenha um personagem pela placa poe ele na fila (renderEntities) */
function gpuNaFila(modelo, x, y, z, ang, a, b, t){
  /* no jeito de desenho a pose nao se mistura (o quadro fica ate o proximo) e o giro anda em degraus */
  if (GPU.estilo === "desenho"){ b = a; t = 0; }
  if (GPU.rumos > 0){ const d = TAU/GPU.rumos; ang = Math.round(ang/d)*d; }
  GPU.fila.push({m: modelo, x: x, y: y, z: z, ang: ang, a: a, b: b, t: t});
}
/* Sobe o mundo, pinta e desenha a fila. Devolve false se nao desenhou (quem
   chama faz o putImageData de sempre). */
function gpuDesenhar(){
  const mundo = typeof MUNDO_PLACA !== "undefined" && MUNDO_PLACA.ativo;
  if (!GPU.ativo || (!GPU.fila.length && !mundo)) return false;
  const gl = GPU.gl, c = GPU.canvas;
  /* placa perdida (o driver reiniciou): a fila esvazia mesmo assim, senao cresce a cada quadro */
  if (gl.isContextLost()){ GPU.fila.length = 0; return false; }
  /* o tamanho: o do mundo, e o mesmo da tela 2D na pagina */
  if (GPU.W !== RW || GPU.H !== RH || GPU.VH !== RVH){
    GPU.W = RW; GPU.H = RH; GPU.VH = RVH; c.width = RW; c.height = RH;
    gl.bindTexture(gl.TEXTURE_2D, GPU.texCor);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, RW, RVH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, GPU.texProf);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, RW, RVH, 0, gl.RED, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }
  if (c.style.width !== cvs.style.width || c.style.height !== cvs.style.height){ c.style.width = cvs.style.width; c.style.height = cvs.style.height; }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.bindTexture(gl.TEXTURE_2D, GPU.texCor);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, RW, RVH, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(buf.buffer, 0, RW*RVH*4));
  gl.bindTexture(gl.TEXTURE_2D, GPU.texProf);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, RW, RVH, gl.RED, gl.FLOAT, zbuf.subarray(0, RW*RVH));

  gl.viewport(0, 0, RW, RH);
  gl.clearColor(0, 0, 0, 1); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, RH - RVH, RW, RVH);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.ALWAYS); gl.depthMask(true);
  /* 1. o mundo, com a profundidade dele: a imagem do software inteira, ou
     -- com o mundo na placa -- o ceu e as faces, e por cima so os bichos da
     imagem do software, cada pixel com a profundidade dele */
  if (mundo){ desenharMundoNaPlaca(); gl.depthFunc(gl.LESS); }
  const M = GPU.mundo;
  gl.useProgram(M.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GPU.texCor); gl.uniform1i(M.u.uCor, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, GPU.texProf); gl.uniform1i(M.u.uProf, 1);
  gl.uniform1f(M.u.uNear, NEAR); gl.uniform1i(M.u.uAlt, RH); gl.uniform1i(M.u.uVazio, mundo ? 1 : 0);
  gl.bindVertexArray(GPU.vaoVazio);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  /* 2. os personagens */
  gl.depthFunc(gl.LESS);
  const C = GPU.corpo;
  gl.useProgram(C.p);
  gl.uniform3f(C.u.uCam, camX, camY, camZ);
  gl.uniform4f(C.u.uRot, cyaw, syaw, cpit, spit);
  gl.uniform2f(C.u.uF, FX/HW, FY/HVH);
  gl.uniform1f(C.u.uNear, NEAR);
  gl.uniform1f(C.u.uFar, FAR);
  const nv = HORIZONTE;
  gl.uniform3f(C.u.uNevoa, (nv & 255)/255, ((nv >> 8) & 255)/255, ((nv >> 16) & 255)/255);
  /* o sol: do oeste e de cima, como a luz do ceu do fim de tarde */
  const lz = 0.62, lh = Math.sqrt(1 - lz*lz);
  gl.uniform3f(C.u.uLuz, -lh*0.8, -lh*0.6, lz);
  let desenhados = 0, voxels = 0;
  for (const f of GPU.fila){
    const dist = Math.hypot(f.x - camX, f.y - camY);
    if (dist > FAR) continue;
    /* o nivel: o leve quando um pixel ja cobre mais de um voxel e meio do cheio */
    let nivel = f.m.niveis[0];
    const vpp = 128*nivel.altura/117*dist/FY;
    if (vpp >= 1.5 && f.m.niveis[1]) nivel = f.m.niveis[1];
    const pose = gpuPose(nivel, f.a, f.b, f.t);
    gpuDualDosOssos(nivel, pose, GPU.dqR, GPU.dqD);
    gl.uniform4fv(C.u.uDQr, GPU.dqR); gl.uniform4fv(C.u.uDQd, GPU.dqD);
    gl.uniform3fv(C.u.uPal, nivel.cores);
    gl.uniform3f(C.u.uBase, f.x, f.y, f.z);
    gl.uniform2f(C.u.uAng, Math.sin(f.ang), Math.cos(f.ang));
    gl.uniform4f(C.u.uGrade, nivel.CX, nivel.CY, 1/(128*nivel.altura/117), 1.75);
    gl.bindVertexArray(nivel.vao);
    /* a casca, o recheio e (no jeito de desenho) o contorno; o que ficou atras
       da casca nem pinta, porque a profundidade dela ja esta la */
    for (const ps of GPU.estilo === "desenho" ? [GPU_CASCA, GPU_RECHEIO, GPU_CONTORNO] : [GPU_CASCA, GPU_RECHEIO]){
      gl.uniform4f(C.u.uPasso, ps[0], ps[1], ps[2], ps[3]);
      gl.uniform2f(C.u.uPx, ps[4]/RW*2, ps[4]/RVH*2);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nivel.n);
    }
    desenhados++; voxels += nivel.n;
  }
  gl.bindVertexArray(null);
  GPU.ultimo = {personagens: desenhados, voxels: voxels};
  GPU.fila.length = 0;
  return true;
}
