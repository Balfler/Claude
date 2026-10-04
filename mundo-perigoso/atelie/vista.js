/* ============================================================
   ATELIE -- A VISTA 3D
   ------------------------------------------------------------
   WebGL puro, sem biblioteca: o corpo vira uma malha so das faces de voxel
   que dao para o vazio, com a luz de face assada na cor (cima clara, lados
   medios, baixo escura) -- o jeito classico de ler voxel.

   A camera e sempre ortografica, que e como o jogo projeta o personagem: de
   frente, de lado, de costas, de cima, ou girando livre. Uma camada 2D por
   cima desenha juntas e ossos; outra por baixo, a imagem de referencia.

   O clique vira um raio que anda de celula em celula ate achar voxel
   (percorrer a grade, nao testar triangulo), e devolve a celula e a face.
   ============================================================ */

function novaVista(canvasGL, canvasSobre, canvasSob){
  const gl = canvasGL.getContext("webgl", {antialias: false, alpha: true, preserveDrawingBuffer: true});
  if (!gl) throw new Error("este navegador nao tem WebGL");
  const vs = "attribute vec3 p; attribute vec3 c; uniform mat4 m; varying vec3 vc;" +
             "void main(){ gl_Position = m*vec4(p, 1.0); vc = c; }";
  const fs = "precision mediump float; varying vec3 vc; void main(){ gl_FragColor = vec4(vc, 1.0); }";
  function sombreador(tipo, fonte){
    const s = gl.createShader(tipo);
    gl.shaderSource(s, fonte); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sombreador(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sombreador(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  const aP = gl.getAttribLocation(prog, "p"), aC = gl.getAttribLocation(prog, "c"), uM = gl.getUniformLocation(prog, "m");
  const buf = gl.createBuffer();
  let nVertices = 0;

  const V = {
    /* camera: giro em volta do eixo z (graus), inclinacao, zoom (pixels por voxel), alvo */
    cam: {giro: 0, incl: 0, zoom: 5, alvo: [40, 28, 58]},
    grade: null,                         // {cheio(x,y,z) -> cor, x0..x1, y0..y1, z0..z1}
    pontos: [], ossos: [], selecionado: null, destaque: null,
    referencia: null, opacidadeRef: 0.5,
    fundo: [0.07, 0.06, 0.05]
  };

  /* ---------- a matriz ----------
     mundo -> vista: gira em z por `giro`, inclina por `incl`, e projeta
     ortografico. Olhando "de frente", a camera fica em y pequeno olhando
     para +y, com x para a direita e z para cima. */
  function base(){
    const g = V.cam.giro*Math.PI/180, i = V.cam.incl*Math.PI/180;
    const cg = Math.cos(g), sg = Math.sin(g), ci = Math.cos(i), si = Math.sin(i);
    /* eixos da tela no mundo */
    /* inclinacao positiva: a camera sobe e olha para baixo */
    const direita = [cg, sg, 0];
    const fundo = [-sg*ci, cg*ci, -si];           // para dentro da tela
    const cima = [-sg*si, cg*si, ci];
    return {direita: direita, fundo: fundo, cima: cima};
  }
  function tamanho(){
    const r = canvasGL.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    return {w: Math.max(1, Math.round(r.width*dpr)), h: Math.max(1, Math.round(r.height*dpr)), dpr: dpr, cw: r.width, ch: r.height};
  }
  /* ponto do mundo -> pixel CSS na tela, e profundidade */
  function projetar(p){
    const b = base(), t = tamanho(), a = V.cam.alvo, d = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    return [t.cw/2 + (d[0]*b.direita[0] + d[1]*b.direita[1] + d[2]*b.direita[2])*V.cam.zoom,
            t.ch/2 - (d[0]*b.cima[0] + d[1]*b.cima[1] + d[2]*b.cima[2])*V.cam.zoom,
            d[0]*b.fundo[0] + d[1]*b.fundo[1] + d[2]*b.fundo[2]];
  }
  /* pixel CSS -> raio no mundo (origem bem na frente, direcao para o fundo) */
  function raio(px, py){
    const b = base(), t = tamanho(), a = V.cam.alvo;
    const u = (px - t.cw/2)/V.cam.zoom, v = -(py - t.ch/2)/V.cam.zoom;
    const o = [a[0] + b.direita[0]*u + b.cima[0]*v - b.fundo[0]*400,
               a[1] + b.direita[1]*u + b.cima[1]*v - b.fundo[1]*400,
               a[2] + b.direita[2]*u + b.cima[2]*v - b.fundo[2]*400];
    return {o: o, d: b.fundo};
  }
  /* no plano da tela que passa por p: o deslocamento de um arraste em pixels */
  function arrasteNoPlano(dxPx, dyPx){
    const b = base(), k = 1/V.cam.zoom;
    return [(b.direita[0]*dxPx - b.cima[0]*dyPx)*k, (b.direita[1]*dxPx - b.cima[1]*dyPx)*k, (b.direita[2]*dxPx - b.cima[2]*dyPx)*k];
  }

  /* ---------- a malha ----------
     `grade.cheio(x, y, z)` devolve 0 ou um indice; `grade.cor(v, x, y, z)`
     devolve [r, g, b] de 0 a 255. */
  const LUZ_FACE = [0.8, 0.8, 0.92, 0.72, 1.0, 0.55];   // +x, -x, +y(costas), -y(frente), +z, -z
  function montarMalha(){
    const G = V.grade;
    if (!G){ nVertices = 0; return; }
    const dados = [];
    const F = [
      [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]],
      [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]],
      [[0, 1, 0], [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]],
      [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
      [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]],
      [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]]
    ];
    for (let z = G.z0; z <= G.z1; z++) for (let y = G.y0; y <= G.y1; y++) for (let x = G.x0; x <= G.x1; x++){
      const v = G.cheio(x, y, z);
      if (!v) continue;
      const cor = G.cor(v, x, y, z);
      for (let f = 0; f < 6; f++){
        const n = F[f][0];
        if (G.cheio(x + n[0], y + n[1], z + n[2])) continue;
        const l = LUZ_FACE[f], r = cor[0]/255*l, g = cor[1]/255*l, bl = cor[2]/255*l, q = F[f][1];
        for (const k of [0, 1, 2, 0, 2, 3])
          dados.push(x - 0.5 + q[k][0], y - 0.5 + q[k][1], z - 0.5 + q[k][2], r, g, bl);
      }
    }
    const arr = new Float32Array(dados);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
    nVertices = arr.length/6;
  }

  function desenhar(){
    const t = tamanho();
    if (canvasGL.width !== t.w || canvasGL.height !== t.h){ canvasGL.width = t.w; canvasGL.height = t.h; }
    for (const c of [canvasSobre, canvasSob]) if (c && (c.width !== t.w || c.height !== t.h)){ c.width = t.w; c.height = t.h; }
    gl.viewport(0, 0, t.w, t.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    if (nVertices){
      const b = base(), a = V.cam.alvo, sx = 2*V.cam.zoom/t.cw, sy = 2*V.cam.zoom/t.ch, sz = 1/400;
      /* coluna a coluna (WebGL): clip = S * R * (p - alvo) */
      const R = [b.direita, b.cima, b.fundo], S = [sx, sy, sz];
      const m = new Float32Array(16);
      for (let i = 0; i < 3; i++){
        for (let j = 0; j < 3; j++) m[j*4 + i] = R[i][j]*S[i];
        m[12 + i] = -(R[i][0]*a[0] + R[i][1]*a[1] + R[i][2]*a[2])*S[i];
      }
      m[15] = 1;
      gl.useProgram(prog);
      gl.uniformMatrix4fv(uM, false, m);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aC);
      gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, nVertices);
    }
    desenharSob(t);
    desenharSobre(t);
  }
  /* a imagem de referencia: em pe no plano do meio do corpo, da altura 0 a 117 */
  function desenharSob(t){
    if (!canvasSob) return;
    const g = canvasSob.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, t.w, t.h);
    const R = V.referencia;
    if (!R || !R.img) return;
    g.setTransform(t.dpr, 0, 0, t.dpr, 0, 0);
    const alt = R.altura || 117, larg = alt*R.img.width/R.img.height;
    let a, b;
    if (R.vista === "lado"){ a = projetar([40, 28 - larg/2, alt]); b = projetar([40, 28 + larg/2, 0]); }
    else if (R.vista === "costas"){ a = projetar([40 + larg/2, 28, alt]); b = projetar([40 - larg/2, 28, 0]); }
    else { a = projetar([40 - larg/2, 28, alt]); b = projetar([40 + larg/2, 28, 0]); }
    g.globalAlpha = V.opacidadeRef;
    g.imageSmoothingEnabled = false;
    g.drawImage(R.img, Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1]);
    g.globalAlpha = 1;
  }
  function desenharSobre(t){
    if (!canvasSobre) return;
    const g = canvasSobre.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, t.w, t.h);
    g.setTransform(t.dpr, 0, 0, t.dpr, 0, 0);
    g.lineWidth = 2;
    for (const o of V.ossos){
      const a = projetar(o.a), b = projetar(o.b);
      g.strokeStyle = o.cor || "rgba(232,184,96,0.85)";
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    for (const p of V.pontos){
      const s = projetar(p.pos), sel = V.selecionado === p.nome, dest = V.destaque === p.nome;
      g.fillStyle = sel ? "#ffe08a" : p.cor || (p.extra ? "#7fb0d8" : "#d0503a");
      g.strokeStyle = "#000";
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(s[0], s[1], sel || dest ? 6 : 4, 0, Math.PI*2); g.fill(); g.stroke();
      if (sel || dest){ g.fillStyle = "#e6d8c0"; g.font = "12px Segoe UI, sans-serif"; g.fillText(p.rotulo || p.nome, s[0] + 8, s[1] - 6); }
    }
    if (V.cursor){
      g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1;
      g.beginPath(); g.arc(V.cursor[0], V.cursor[1], Math.max(3, V.cursor[2]*V.cam.zoom), 0, Math.PI*2); g.stroke();
    }
  }
  /* o ponto de juntas mais perto do pixel, ate `raio` pixels */
  function pontoEm(px, py, raioPx){
    let melhor = null, dm = (raioPx || 10)*(raioPx || 10);
    for (const p of V.pontos){
      const s = projetar(p.pos), d = (s[0] - px)*(s[0] - px) + (s[1] - py)*(s[1] - py);
      if (d < dm){ dm = d; melhor = p; }
    }
    return melhor;
  }
  /* percorre a grade ao longo do raio (Amanatides-Woo) e devolve a primeira
     celula cheia e a celula vazia de antes dela */
  function voxelEm(px, py){
    const G = V.grade;
    if (!G) return null;
    const r = raio(px, py), o = r.o, d = r.d;
    let x = Math.round(o[0]), y = Math.round(o[1]), z = Math.round(o[2]);
    const passo = [Math.sign(d[0]) || 1, Math.sign(d[1]) || 1, Math.sign(d[2]) || 1];
    const tDelta = [Math.abs(1/(d[0] || 1e-9)), Math.abs(1/(d[1] || 1e-9)), Math.abs(1/(d[2] || 1e-9))];
    const tMax = [0, 1, 2].map(function(e){
      const borda = [x, y, z][e] + 0.5*passo[e];
      return Math.abs((borda - o[e])/(d[e] || 1e-9));
    });
    let antes = null;
    for (let i = 0; i < 1600; i++){
      if (x >= G.x0 && x <= G.x1 && y >= G.y0 && y <= G.y1 && z >= G.z0 && z <= G.z1 && G.cheio(x, y, z))
        return {pos: [x, y, z], antes: antes};
      antes = [x, y, z];
      const e = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      if (e === 0){ x += passo[0]; tMax[0] += tDelta[0]; }
      else if (e === 1){ y += passo[1]; tMax[1] += tDelta[1]; }
      else { z += passo[2]; tMax[2] += tDelta[2]; }
    }
    return null;
  }

  V.montarMalha = montarMalha;
  V.desenhar = desenhar;
  V.projetar = projetar;
  V.raio = raio;
  V.arrasteNoPlano = arrasteNoPlano;
  V.pontoEm = pontoEm;
  V.voxelEm = voxelEm;
  V.olhar = function(nome){
    const vistas = {frente: [0, 0], lado: [90, 0], costas: [180, 0], cima: [0, 89.9], livre: [30, 15]};
    const v = vistas[nome] || vistas.livre;
    V.cam.giro = v[0]; V.cam.incl = v[1];
  };
  return V;
}
