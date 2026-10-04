/* ============================================================
   SONDAGEM 13 -- O MUNDO EM 128
   ------------------------------------------------------------
   O Leandro (1/10): com o personagem de 256, o mundo tem que subir tambem.
   Aqui o mesmo lugar da ilha de 650 (a vila, sondagem 12), com guerreiros
   de 256, em 1280x720, com o mundo de hoje (texturas de 64 por tile,
   cenario de 37) e com ?mundo=128 (texturas de 128, cenario de 128).

   Mede o quadro (melhor de cinco rodadas), o tempo de montar o mundo (as
   texturas e o cenario assado) e grava as cenas lado a lado.

   Uso: node mundo-perigoso/sondagens/13-mundo-128/medir.js [saida]
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "..");
const M = require(path.join(RAIZ, "src", "mapa.js")), png = require(path.join(RAIZ, "editor", "png.js"));
const { carregar } = require(path.join(RAIZ, "teste", "harness"));
const SAIDA = process.argv[2] || __dirname;
const corpo = fs.readFileSync(path.join(RAIZ, "personagens", "guerreiro.personagem"), "utf8");
const textoMapa = fs.readFileSync(path.join(RAIZ, "mapas", "ilha-650.mapa"), "utf8");

const LUGAR = [239.5, 509.5];
/* duas vistas: a vila a oeste, de pe; e as casas de perto, ao sul */
const VISTAS = [{nome: "vila", ang: Math.PI, pitch: 0.05, dx: 0, dy: 0}, {nome: "casas", ang: Math.PI*1.04, pitch: 0.1, dx: -11, dy: 0}];
const rel = {};
for (const [nome, busca] of [["mundo-64", "?mapa=cripta&mundo=64"], ["mundo-128", "?mapa=cripta"]]){
  const t0 = Date.now();
  const { D } = carregar(path.join(RAIZ, "..", "cripta-vhalgorn.html"), {busca: busca, canvas: "software"});
  const mapa = M.lerMapa(textoMapa).mapa; if (mapa.versao < 2) M.converterMapa(mapa);
  const t1 = Date.now();
  D.trocarMundo("?mapa=canteiro", mapa);
  const msMundo = Date.now() - t1;
  D.usarCorpoDesenhado(D.lerPersonagem(corpo));
  const q = D.assarPersonagem(D.PERSONAGEM_PADRAO, 8, D.HORIZONTE || 0, [0])[0];
  const cenas = D.ents.filter(e => e.kind === "cena");
  D.alocarTela(4); D.prepararCamera(); D.G.mode = "play"; D.G.terceira = false;
  const r = rel[nome] = {carregar_s: +((t1 - t0)/1000).toFixed(1), montar_mundo_s: +(msMundo/1000).toFixed(1), quadro_ms: {}};
  for (const v of VISTAS){
    const x = LUGAR[0] + v.dx, y = LUGAR[1] + v.dy;
    D.ents.length = 0;
    const frente = [Math.cos(v.ang), Math.sin(v.ang)], lado = [-frente[1], frente[0]];
    for (const [d, l, rumo] of [[1.6, 0, 4], [2.6, 1.0, 2], [3.5, -1.3, 6], [6, 1.8, 0], [9, -2, 3]])
      D.ents.push({kind: "cena", type: "teste", x: x + frente[0]*d + lado[0]*l, y: y + frente[1]*d + lado[1]*l, z: D.floorAt(Math.floor(x + frente[0]*d), Math.floor(y + frente[1]*d)),
                   img: q[rumo], larg: D.DIM_PERSONAGEM.DX*D.VOX_PERSONAGEM, alto: D.DIM_PERSONAGEM.DZ*D.VOX_PERSONAGEM, raio: 0, fala: ""});
    for (const e of cenas) D.ents.push(e);
    D.P.x = x; D.P.y = y; D.P.z = D.floorAt(Math.floor(x), Math.floor(y)); D.P.ang = v.ang; D.P.pitch = v.pitch; D.P.bob = 0;
    const quadro = () => { D.setCamera(0); D.renderWorld(); D.renderEntities(); };
    for (let i = 0; i < 4; i++) quadro();
    let melhor = Infinity;
    for (let k = 0; k < 5; k++){ const t = process.hrtime.bigint(); for (let i = 0; i < 6; i++) quadro(); melhor = Math.min(melhor, Number(process.hrtime.bigint() - t)/6e6); }
    r.quadro_ms[v.nome] = +melhor.toFixed(1);
    quadro();
    const RW = D.RW, RH = D.RH, o = new Uint8Array(RW*RH*4);
    for (let i = 0; i < RW*RH; i++){ const c = D.buf[i]; o[4*i] = c & 255; o[4*i + 1] = (c >> 8) & 255; o[4*i + 2] = (c >> 16) & 255; o[4*i + 3] = 255; }
    fs.writeFileSync(path.join(SAIDA, v.nome + "-" + nome + ".png"), png.codificar(RW, RH, o));
    /* o recorte de perto: o chao e o guerreiro, pixel do jogo ampliado 2x */
    const cw = 420, ch = 300, x0 = (RW - cw) >> 1, y0 = RH - ch - 20, o2 = new Uint8Array(cw*2*ch*2*4);
    for (let yy = 0; yy < ch*2; yy++) for (let xx = 0; xx < cw*2; xx++){
      const s = ((y0 + (yy >> 1))*RW + x0 + (xx >> 1))*4, d = (yy*cw*2 + xx)*4;
      o2[d] = o[s]; o2[d + 1] = o[s + 1]; o2[d + 2] = o[s + 2]; o2[d + 3] = 255;
    }
    fs.writeFileSync(path.join(SAIDA, v.nome + "-" + nome + "-perto.png"), png.codificar(cw*2, ch*2, o2));
  }
  console.log(nome + ": " + JSON.stringify(r));
}
fs.writeFileSync(path.join(SAIDA, "relatorio.json"), JSON.stringify(rel, null, 1));
