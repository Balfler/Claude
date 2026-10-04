/* ============================================================
   SONDAGEM 12 -- O GUERREIRO DE 256 NO JOGO, NUMA CENA CHEIA
   ------------------------------------------------------------
   O plano de 1/10 (PLANEJAMENTO.md, *256 voxels e HD*): antes de otimizar
   e de refazer as pecas, por o guerreiro de 256 no jogo de verdade e medir o
   que ele custa. Usa o motor do jogo (o corpo desenhado trocado em pleno jogo,
   usarCorpoDesenhado; as pecas levadas para a densidade; as copias para
   longe), na ilha de 650, com oito guerreiros de 1,6 a 12 tiles da camera.

   Mede, para 117, 165 e 256 (os dois menores reamostrados do de 256, como a
   opcao grafica faria, e o de 117 tambem exportado pelo atelie, para
   comparar a qualidade):
   - o arquivo .personagem (texto) e quanto ele comprime;
   - o tempo de assar um visual inteiro (20 poses, 8 rumos, as copias) e a
     memoria dos sprites dele;
   - o quadro medio da cena em 640x360, 960x540 e 1280x720 (node, software:
     sem o envio para a tela do navegador);
   e grava a cena em cada densidade e tela.

   Uso: node mundo-perigoso/sondagens/12-densidade-no-jogo/medir.js <pasta-dos-.personagem> [saida]
        a pasta tem g117/, g256/ (atelie/cli.js exportar ... --altura 256 --saida <pasta>/g256)
   ============================================================ */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const RAIZ = path.join(__dirname, "..", "..");
const M = require(path.join(RAIZ, "src", "mapa.js")), png = require(path.join(RAIZ, "editor", "png.js"));
const { carregar } = require(path.join(RAIZ, "teste", "harness"));

const PASTA = process.argv[2], SAIDA = process.argv[3] || __dirname;
if (!PASTA){ console.log("uso: medir.js <pasta-dos-.personagem> [saida]"); process.exit(1); }
const texto256 = fs.readFileSync(path.join(PASTA, "g256", "guerreiro.personagem"), "utf8");
const texto117 = fs.readFileSync(path.join(PASTA, "g117", "guerreiro.personagem"), "utf8");

const mapa = M.lerMapa(fs.readFileSync(path.join(RAIZ, "mapas", "ilha-650.mapa"), "utf8")).mapa; if (mapa.versao < 2) M.converterMapa(mapa);
const { D } = carregar(path.join(RAIZ, "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta", canvas: "software"});
D.trocarMundo("?mapa=canteiro", mapa);

const rel = {arquivo: {}, densidades: {}};
const mb = n => +(n/1e6).toFixed(2);
for (const [nome, t] of [["117 (do atelie)", texto117], ["256", texto256]])
  rel.arquivo[nome] = {texto_MB: mb(Buffer.byteLength(t)), gzip_MB: mb(zlib.gzipSync(t, {level: 9}).length)};

/* os corpos: 256 do arquivo; 165 e 117 reamostrados dele; 117 do atelie */
let t0 = Date.now();
const c256 = D.lerPersonagem(texto256);
D.usarCorpoDesenhado(c256);
const msLer = Date.now() - t0;
const corpos = [["256", D.CORPO_DESENHADO]];
for (const h of [165, 117]){ t0 = Date.now(); corpos.push([String(h), D.reamostrarCorpo(D.CORPO_DESENHADO, h)]); rel.densidades[String(h)] = {reamostrar_s: +((Date.now() - t0)/1000).toFixed(1)}; }
corpos.push(["117-atelie", D.lerPersonagem(texto117)]);
rel.ler256_s = +(msLer/1000).toFixed(1);

/* o lugar: chao plano com o maximo de cenario em volta (a cena cheia) */
const W = D.MW, H = D.MH, cenas = D.ents.filter(e => e.kind === "cena");
let lugar = null, melhor = -1;
for (let y = 20; y < H - 20; y += 3) for (let x = 20; x < W - 20; x += 3){
  const z0 = D.floorAt(x, y); let ok = z0 > 0.9;
  for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -14; dx <= 3 && ok; dx++){ if (D.floorAt(x + dx, y + dy) !== z0 || D.cellAt(x + dx, y + dy) !== ".") ok = false; }
  if (!ok) continue;
  let n = 0;
  for (const e of cenas){ const ex = x - e.x, ey = e.y - y; if (ex > 0 && ex < 25 && Math.abs(ey) < ex) n++; }    // na frente (oeste) da camera
  if (n > melhor){ melhor = n; lugar = [x + 0.5, y + 0.5, z0]; }
}
console.log("lugar " + lugar.map(v => v.toFixed(1)).join(", ") + ", " + melhor + " coisas do cenario na frente");
rel.cenario_na_frente = melhor;

/* oito guerreiros: de 1,6 a 12 tiles, em rumos variados */
const POS = [[1.6, 0, 0], [2.4, 0.9, 2], [3.2, -1.1, 5], [4.5, 1.6, 1], [6, -2, 3], [8, 2.2, 6], [10, -1, 4], [12, 1.5, 7]];
function cena(quadros, esc, arq, recorte){
  D.ents.length = 0;
  for (const [d, lado, rumo] of POS){
    const q = quadros[0][rumo];
    D.ents.push({kind: "cena", type: "teste", x: lugar[0] - d, y: lugar[1] + lado, z: lugar[2], img: q,
                 larg: D.DIM_PERSONAGEM.DX*D.VOX_PERSONAGEM, alto: D.DIM_PERSONAGEM.DZ*D.VOX_PERSONAGEM, raio: 0, fala: ""});
  }
  for (const e of cenas) D.ents.push(e);
  if (D.RW !== 320*esc){ D.alocarTela(esc); D.prepararCamera(); }
  D.G.mode = "play"; D.G.terceira = false;
  D.P.x = lugar[0]; D.P.y = lugar[1]; D.P.z = lugar[2]; D.P.ang = Math.PI; D.P.pitch = 0.05; D.P.bob = 0;
  for (let i = 0; i < 4; i++){ D.setCamera(0); D.renderWorld(); D.renderEntities(); }
  const ms = medirQuadro();
  D.P.ang = Math.PI; D.setCamera(0); D.renderWorld(); D.renderEntities();
  if (arq){
    const RW = D.RW, RH = D.RH, buf = D.buf;
    const [cw, ch] = recorte ? [Math.round(RW*recorte[0]), Math.round(RH*recorte[1])] : [RW, RH], x0 = (RW - cw) >> 1, y0 = recorte ? Math.round(RH*recorte[2]) : 0;
    const o = new Uint8Array(cw*ch*4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++){ const v = buf[(y0 + y)*RW + x0 + x], d = (y*cw + x)*4; o[d] = v & 255; o[d + 1] = (v >> 8) & 255; o[d + 2] = (v >> 16) & 255; o[d + 3] = 255; }
    fs.writeFileSync(path.join(SAIDA, arq), png.codificar(cw, ch, o));
  }
  return ms;
}
/* o quadro medio: o melhor de cinco rodadas de oito, que o node da tranco (coleta de lixo) */
function medirQuadro(){
  let melhor = Infinity;
  for (let k = 0; k < 5; k++){
    const t = process.hrtime.bigint();
    for (let i = 0; i < 8; i++){ D.P.ang = Math.PI + 0.004*(i % 3); D.setCamera(0); D.renderWorld(); D.renderEntities(); }
    melhor = Math.min(melhor, Number(process.hrtime.bigint() - t)/8e6);
  }
  D.P.ang = Math.PI;
  return melhor;
}
function bytes(quadros){ let n = 0; for (const p of quadros) for (const q of p) for (let c = q; c; c = c.longe) n += c.px.byteLength; return n; }

/* sem ninguem: o custo da cena sozinha */
{
  D.usarCorpoDesenhado(corpos[0][1]);
  const vazio = [[]]; rel.cena_sem_guerreiros_ms = {};
  for (const esc of [2, 3, 4]){
    D.ents.length = 0; for (const e of cenas) D.ents.push(e);
    if (D.RW !== 320*esc){ D.alocarTela(esc); D.prepararCamera(); }
    D.P.x = lugar[0]; D.P.y = lugar[1]; D.P.z = lugar[2]; D.P.ang = Math.PI; D.P.pitch = 0.05;
    for (let i = 0; i < 4; i++){ D.setCamera(0); D.renderWorld(); D.renderEntities(); }
    rel.cena_sem_guerreiros_ms[320*esc + "x" + 180*esc] = +medirQuadro().toFixed(1);
  }
}

for (const [nome, c] of corpos){
  D.usarCorpoDesenhado(c);
  const esc = Object.assign({}, D.PERSONAGEM_PADRAO);
  t0 = Date.now();
  const quadros = D.assarPersonagem(esc, 8, D.HORIZONTE || 0);
  const s = (Date.now() - t0)/1000;
  const r = rel.densidades[nome] = Object.assign(rel.densidades[nome] || {}, {grade: [c.DX, c.DY, c.DZ].join("x"), assar_um_visual_s: +s.toFixed(1), sprites_de_um_visual_MB: mb(bytes(quadros)), quadro_ms: {}});
  for (const e of [2, 3, 4]) r.quadro_ms[320*e + "x" + 180*e] = +cena(quadros, e, "cena-" + nome + "-" + 320*e + "x" + 180*e + ".png").toFixed(1);
  /* o de perto, ampliado: o recorte do meio da tela de 1280x720 */
  cena(quadros, 4, "perto-" + nome + "-1280x720.png", [0.42, 0.75, 0.1]);
  console.log(nome + ": " + JSON.stringify(r));
}
fs.writeFileSync(path.join(SAIDA, "relatorio.json"), JSON.stringify(rel, null, 1));
console.log(JSON.stringify(rel, null, 1));
