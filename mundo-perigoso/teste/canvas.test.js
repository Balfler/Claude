/* Testes do canvas em software (teste/canvas.js), o que desenha as
   texturas no node: a vista em PNG e o tempo do quadro da linha de comando
   dependem dele.

   Uso: node mundo-perigoso/teste/canvas.test.js [caminho-do-html] */
const path = require("path");
const { canvasDeSoftware, corDaString } = require("./canvas");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const novo = function(w, h){ const c = canvasDeSoftware(w, h); return {c: c, g: c.getContext("2d")}; };
const px = function(g, x, y){ return Array.from(g.getImageData(x, y, 1, 1).data); };
const perto = function(a, b, tol){ return a.every(function(v, i){ return Math.abs(v - b[i]) <= (tol || 1); }); };

check("as cores: #rgb, #rrggbb, rgb() e rgba()",
  perto(corDaString("#f80"), [255, 136, 0, 1]) && perto(corDaString("#3a2e22"), [58, 46, 34, 1]) &&
  perto(corDaString("rgb(1,2,3)"), [1, 2, 3, 1]) && perto(corDaString("rgba(255,240,215,.25)"), [255, 240, 215, 0.25], 0.001));
{
  const {g} = novo(16, 16);
  g.fillStyle = "#ff0000"; g.fillRect(2, 2, 4, 4);
  check("o retangulo pinta dentro e nao fora", perto(px(g, 3, 3), [255, 0, 0, 255]) && px(g, 7, 7)[3] === 0);
  g.fillStyle = "#0000ff"; g.fillRect(8.5, 2, 2, 2);
  const borda = px(g, 8, 2);
  check("a borda no meio do pixel cobre metade", borda[3] > 110 && borda[3] < 145 && perto(px(g, 9, 2), [0, 0, 255, 255]), borda.join(","));
  g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(2, 2, 1, 1);
  check("a cor com alfa mistura com a de baixo", perto(px(g, 2, 2), [255, 128, 128, 255], 2), px(g, 2, 2).join(","));
  g.clearRect(0, 0, 16, 16);
  check("limpar deixa transparente", px(g, 3, 3)[3] === 0);
}
{
  const {g} = novo(40, 40);
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(20, 20, 10, 0, Math.PI*2); g.fill();
  const d = g.getImageData(0, 0, 40, 40).data;
  let area = 0;
  for (let i = 3; i < d.length; i += 4) area += d[i]/255;
  check("o circulo tem a area de pi r ao quadrado", Math.abs(area - Math.PI*100) < 3, area.toFixed(1));
}
{
  const {g} = novo(20, 20);
  g.strokeStyle = "#00ff00"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(2, 10); g.lineTo(18, 10); g.stroke();
  check("o traco tem a espessura pedida", px(g, 10, 8)[3] > 240 && px(g, 10, 11)[3] > 240 && px(g, 10, 13)[3] === 0 && px(g, 10, 6)[3] === 0);
}
{
  const {g} = novo(11, 1);
  const gr = g.createLinearGradient(0, 0, 11, 0);
  gr.addColorStop(0, "#000000"); gr.addColorStop(1, "#ffffff");
  g.fillStyle = gr; g.fillRect(0, 0, 11, 1);
  check("o gradiente linear vai de uma cor a outra", px(g, 0, 0)[0] < 20 && Math.abs(px(g, 5, 0)[0] - 128) < 8 && px(g, 10, 0)[0] > 235);
}
{
  const {g} = novo(20, 20);
  g.save(); g.translate(10, 10); g.rotate(Math.PI/4);
  g.fillStyle = "#ffffff"; g.fillRect(-1, -8, 2, 16);
  g.restore();
  g.fillStyle = "#ff0000"; g.fillRect(0, 0, 1, 1);
  /* no canvas o y cresce para baixo: +45 graus e o sentido do relogio, e a
     barra em pe deita na diagonal de cima a direita para baixo a esquerda */
  check("a transformacao gira o retangulo, e o restore a desfaz",
    px(g, 14, 6)[3] > 200 && px(g, 5, 14)[3] > 200 && px(g, 14, 14)[3] === 0 && perto(px(g, 0, 0), [255, 0, 0, 255]));
}
{
  const {g} = novo(20, 20);
  g.save(); g.beginPath(); g.rect(0, 0, 10, 20); g.clip();
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 20, 20);
  g.restore();
  check("o recorte so deixa pintar dentro dele", px(g, 5, 5)[3] === 255 && px(g, 15, 5)[3] === 0);
  g.globalCompositeOperation = "source-atop"; g.fillStyle = "#0000ff"; g.fillRect(0, 0, 20, 20);
  check("source-atop so pinta onde ja ha tinta", perto(px(g, 5, 5), [0, 0, 255, 255]) && px(g, 15, 5)[3] === 0);
}
{
  const {g} = novo(4, 4), img = g.createImageData(2, 2);
  img.data.set([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
  g.putImageData(img, 1, 1);
  check("os pixels vao e voltam", perto(px(g, 2, 2), [10, 11, 12, 255], 0) && px(g, 0, 0)[3] === 0);
}

/* o jogo com o canvas em software: as texturas tem tinta, e o quadro
   escreve no z-buffer */
{
  const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
  const {D} = carregar(arquivo, {busca: "?mapa=cripta", canvas: "software"});
  const t = D.TEX.stone;
  let pintados = 0;
  for (let i = 0; i < t.px.length; i++) if (t.px[i]) pintados++;
  check("a textura da cripta sai desenhada", pintados > t.px.length*0.9, pintados + " de " + t.px.length);
  D.G.mode = "play"; D.setCamera(0); D.renderWorld(); D.renderEntities();
  let cheios = 0;
  for (let i = 0; i < D.zbuf.length; i++) if (D.zbuf[i] > 0) cheios++;
  check("o quadro da cripta escreve no z-buffer", cheios > D.zbuf.length*0.5, cheios + " de " + D.zbuf.length);
}

fim();
