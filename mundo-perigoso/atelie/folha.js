/* ============================================================
   ATELIE -- A FOLHA DE CONTATO
   ------------------------------------------------------------
   Desenha grades posadas lado a lado numa imagem RGBA, de frente e de
   lado, com uma luz simples pela profundidade. Nao e o assador do jogo (esse
   e a previa do atelie, no navegador) -- e o jeito de olhar todas as poses
   de uma vez da linha de comando, e de um teste guardar uma imagem.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}

/* uma vista: "frente" (olhando de y pequeno), "lado" (olhando de x grande)
   ou "costas". Devolve {w, h, px: Uint8Array RGBA} */
function vistaDaGrade(g, paleta, vista, D){
  D = D || GRADE;
  const DX = D.DX, DY = D.DY, DZ = D.DZ;
  const w = vista === "lado" ? DY : DX, h = DZ, prof = new Float32Array(w*h).fill(1e9), cor = new Int32Array(w*h).fill(0);
  for (let z = 0; z < DZ; z++) for (let u = 0; u < w; u++){
    const L = vista === "lado" ? DX : DY;
    for (let s = 0; s < L; s++){
      let x, y;
      if (vista === "lado"){ x = DX - 1 - s; y = u; }
      else if (vista === "costas"){ x = DX - 1 - u; y = DY - 1 - s; }
      else { x = u; y = s; }
      const v = g[(z*DY + y)*DX + x];
      if (v){ const i = (DZ - 1 - z)*w + u; prof[i] = s; cor[i] = v; break; }
    }
  }
  const px = new Uint8Array(w*h*4);
  for (let yy = 0; yy < h; yy++) for (let u = 0; u < w; u++){
    const i = yy*w + u;
    if (!cor[i]) continue;
    const d = prof[i], dl = u > 0 && cor[i - 1] ? prof[i - 1] : d + 2, dc = yy > 0 && cor[i - w] ? prof[i - w] : d + 2;
    const luz = Math.max(0.55, Math.min(1.15, 0.9 + 0.12*(dl - d) + 0.1*(dc - d)));
    const c = paleta[cor[i] - 1] || [255, 0, 255];
    px[i*4] = Math.min(255, c[0]*luz); px[i*4 + 1] = Math.min(255, c[1]*luz); px[i*4 + 2] = Math.min(255, c[2]*luz); px[i*4 + 3] = 255;
  }
  return {w: w, h: h, px: px};
}
/* Monta a folha: uma coluna por pose, com as vistas pedidas empilhadas, na
   escala dada, sobre fundo escuro. */
function montarFolha(grades, paleta, opcoes){
  opcoes = opcoes || {};
  const vistas = opcoes.vistas || ["frente", "lado"], esc = opcoes.escala || 3, D = opcoes.grade || GRADE, vao = 4;
  const cols = grades.length, larguraVistas = vistas.map(function(v){ return v === "lado" ? D.DY : D.DX; });
  const colW = Math.max.apply(null, larguraVistas), W = (cols*(colW + vao) + vao)*esc, H = (vistas.length*(D.DZ + vao) + vao)*esc;
  const px = new Uint8Array(W*H*4);
  for (let i = 0; i < W*H; i++){ px[i*4] = 24; px[i*4 + 1] = 22; px[i*4 + 2] = 30; px[i*4 + 3] = 255; }
  grades.forEach(function(g, ci){
    vistas.forEach(function(v, vi){
      const img = vistaDaGrade(g, paleta, v, D), ox = vao + ci*(colW + vao) + ((colW - img.w) >> 1), oy = vao + vi*(D.DZ + vao);
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++){
        const s = (y*img.w + x)*4;
        if (!img.px[s + 3]) continue;
        for (let ey = 0; ey < esc; ey++) for (let ex = 0; ex < esc; ex++){
          const d = (((oy + y)*esc + ey)*W + (ox + x)*esc + ex)*4;
          px[d] = img.px[s]; px[d + 1] = img.px[s + 1]; px[d + 2] = img.px[s + 2];
        }
      }
    });
  });
  return {w: W, h: H, px: px};
}

if (typeof module !== "undefined") module.exports = {vistaDaGrade, montarFolha};
