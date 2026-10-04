/* A densidade do personagem (DESIGN.md, *densidade e tela*): o jogo aceita o
   corpo desenhado em 117, 165 ou 256 voxels de altura; as pecas, escritas em
   117, vao para a grade da densidade; e o corpo de uma densidade da as
   outras (reamostrarCorpo). Roda com o corpo embutido (117), levado a 256. */
const path = require("path");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const { D } = carregar(path.join(__dirname, "..", "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta", canvas: "software"});
const perto = (a, b, e) => a.every((v, i) => Math.abs(v - b[i]) <= e);
const cheios = g => { let n = 0; for (const v of g) if (v) n++; return n; };

const c117 = D.CORPO_DESENHADO;
check("o corpo embutido e de 117: densidade 1, a grade de sempre", c117 && D.DENSIDADE === 1 &&
  D.DIM_PERSONAGEM.DX === 80 && D.DIM_PERSONAGEM.DY === 56 && D.DIM_PERSONAGEM.DZ === 117 && Math.abs(D.VOX_PERSONAGEM - 1/128) < 1e-12);
check("em 117 as pecas nao mudam", D.naDensidade([{tipo: "caixa", x0: 1, y0: 2, z0: 3, x1: 4, y1: 5, z1: 6, mat: 1}])[0].x1 === 4);

const largura0 = D.DIM_PERSONAGEM.DX*D.VOX_PERSONAGEM, altura0 = D.DIM_PERSONAGEM.DZ*D.VOX_PERSONAGEM;
const s117 = D.esqueleto(13), g117 = D.gradeDoPersonagem(Object.assign({}, D.PERSONAGEM_PADRAO, {arma: "espada", elmo: "elmo"}), 13);

/* 1. o mesmo corpo em 256 */
const t0 = Date.now();
const c256 = D.reamostrarCorpo(c117, 256);
const msReamostrar = Date.now() - t0;
check("reamostrar da a grade de 256: 175x123x256", c256 && c256.DX === 175 && c256.DY === 123 && c256.DZ === 256, c256 && c256.DX + "x" + c256.DY + "x" + c256.DZ + ", " + msReamostrar + " ms");
const razao = cheios(c256.poses[0].g)/cheios(c117.poses[0].g), K = 256/117;
check("em 256 o corpo tem uns K^3 vezes os voxels (o volume se mantem)", Math.abs(razao/(K*K*K) - 1) < 0.15, "razao " + razao.toFixed(2) + ", K^3 " + (K*K*K).toFixed(2));
check("as juntas vao junto: a mao na mesma altura relativa", perto([c256.poses[13].juntas.maoD[2]/256], [c117.poses[13].juntas.maoD[2]/117], 0.01));

check("usar o corpo de 256 troca a densidade e a grade", D.usarCorpoDesenhado(c256) && Math.abs(D.DENSIDADE - K) < 1e-12 &&
  D.DIM_PERSONAGEM.DX === 175 && D.DIM_PERSONAGEM.DZ === 256 && D.DIM_PERSONAGEM.CX === 88 && D.DIM_PERSONAGEM.CY === 61);
check("o personagem continua do mesmo tamanho no mundo", Math.abs(D.DIM_PERSONAGEM.DX*D.VOX_PERSONAGEM - largura0) < 0.01 &&
  Math.abs(D.DIM_PERSONAGEM.DZ*D.VOX_PERSONAGEM - altura0) < 0.005);
check("o esqueleto continua em 117: a mao no mesmo lugar, a menos de meio voxel", perto(D.esqueleto(13).maoD, s117.maoD, 0.5) && D.esqueleto(0).dz === 0,
  D.esqueleto(13).maoD.map(v => v.toFixed(1)).join(",") + " x " + s117.maoD.map(v => v.toFixed(1)).join(","));

/* 2. as pecas em 256 */
const esc = Object.assign({}, D.PERSONAGEM_PADRAO, {arma: "espada", elmo: "elmo"});
const pecas = D.pecasDoPersonagem(esc, 13, true), caixas = pecas.filter(p => p.tipo === "caixa");
check("as caixas continuam de voxel inteiro e com espessura", caixas.length > 0 && caixas.every(p => [p.x0, p.x1, p.y0, p.y1, p.z0, p.z1].every(Number.isInteger) && p.x1 > p.x0 && p.y1 > p.y0 && p.z1 > p.z0));
const g256 = D.gradeDoPersonagem(esc, 13), mao = D.CORPO_DESENHADO.porPose[13].juntas.maoD;
let metalPerto = 0;
for (let z = Math.round(mao[2]); z < Math.min(256, mao[2] + 40); z++) for (let y = 0; y < 123; y++) for (let x = 0; x < 175; x++)
  if (g256[(z*123 + y)*175 + x] === D.MP.METAL && Math.hypot(x - mao[0], y - mao[1]) < 40) metalPerto++;
check("a espada sai da mao, na grade de 256", metalPerto > 200, metalPerto + " voxels de metal acima da mao");
const r = cheios(g256)/cheios(g117);
check("com as pecas, o personagem de 256 tambem tem uns K^3 vezes os voxels", Math.abs(r/(K*K*K) - 1) < 0.15, r.toFixed(2));

/* 3. as copias para longe: em 256, metade e um quarto */
const t1 = Date.now();
const q = D.assarPersonagem(D.PERSONAGEM_PADRAO, 1, 0, [0])[0][0];
const msAssar = Date.now() - t1;
check("em 256 o quadro leva duas copias para longe", q.longe && q.longe.longe && !q.longe.longe.longe &&
  q.longe.h === 128 && q.longe.longe.h === 64, [q.h, q.longe && q.longe.h, q.longe && q.longe.longe && q.longe.longe.h].join(" > ") + ", " + msAssar + " ms um rumo");
const FY = D.FY, dist = v => v*FY/(128*D.DENSIDADE);   // a distancia em que cada pixel cobre v voxels
check("a distancia escolhe a copia: inteira, metade, um quarto", D.quadroPelaDistancia(q, dist(1.4)) === q &&
  D.quadroPelaDistancia(q, dist(1.6)) === q.longe && D.quadroPelaDistancia(q, dist(3.2)) === q.longe.longe && D.quadroPelaDistancia(q, dist(20)) === q.longe.longe);

/* 4. de volta para 117: o corpo de 256 reamostrado da a grade de sempre */
const de256 = D.reamostrarCorpo(c256, 117);
const igual = cheios(de256.poses[0].g)/cheios(c117.poses[0].g);
check("256 reamostrado para 117 volta a grade de sempre, com o mesmo volume (5%)", de256.DX === 80 && de256.DZ === 117 && Math.abs(igual - 1) < 0.05, igual.toFixed(3));
check("de volta ao corpo de 117: uma copia para longe so", D.usarCorpoDesenhado(c117) && D.DENSIDADE === 1 && D.DIM_PERSONAGEM.DX === 80 &&
  !D.assarPersonagem(D.PERSONAGEM_PADRAO, 1, 0, [0])[0][0].longe.longe);
check("corpo de grade torta nao vale", !D.corpoValido({versao: 2, DX: 100, DY: 56, DZ: 117, cores: [], poses: []}));

/* 5. o formato compacto (PERSONAGEM 3): sem perder voxel */
{
  const fs = require("fs"), zlib = require("zlib"), Cp = require("../editor/compacto.js"), I = require("../src/compacto.js");
  const texto = fs.readFileSync(path.join(__dirname, "..", "personagens", "humano.personagem"), "utf8");
  const a = D.lerPersonagem(texto), b = D.lerPersonagem(Cp.compactarPersonagem(texto));
  let dif = 0;
  a.poses.forEach((p, i) => { for (let k = 0; k < p.g.length; k++) if (p.g[k] !== b.poses[i].g[k]) dif++; });
  check("o humano compactado volta voxel a voxel, com as juntas e as cores", b.versao === 3 && dif === 0 &&
    JSON.stringify(a.poses.map(p => [p.nome, p.juntas])) === JSON.stringify(b.poses.map(p => [p.nome, p.juntas])) && a.cores.join() === b.cores.join(),
    dif + " voxels diferentes");
  check("compactado e menor", Cp.compactarPersonagem(texto).length < texto.length/2, (Cp.compactarPersonagem(texto).length/1e6).toFixed(2) + " MB de " + (texto.length/1e6).toFixed(2));
  /* o inflate nos tres tipos de bloco: guardado (nivel 0), Huffman fixo (pouco dado) e dinamico */
  const dados = new Uint8Array(70000); for (let i = 0; i < dados.length; i++) dados[i] = (i*7 + (i >> 9)) & 63;
  const ok = (buf, n) => { const o = new Uint8Array(n); return I.INFLATE(new Uint8Array(buf), o) === n && o.every((v, i) => v === dados[i]); };
  check("o inflate le bloco guardado, fixo e dinamico", ok(zlib.deflateRawSync(dados, {level: 0}), dados.length) &&
    ok(zlib.deflateRawSync(dados.subarray(0, 40), {level: 9}), 40) && ok(zlib.deflateRawSync(dados, {level: 9}), dados.length));
  check("o base64 volta", I.deBase64(Buffer.from(dados.subarray(0, 1001)).toString("base64")).every((v, i) => v === dados[i]));
}

/* 6. o corpo de teste pelo endereco (?corpo=guerreiro) e a opcao grafica de densidade (painel, tecla 9) */
{
  const fs = require("fs"), arq = path.join(__dirname, "..", "personagens", "guerreiro.personagem");
  if (!fs.existsSync(arq)) check("(sem personagens/guerreiro.personagem: o corpo de teste nao foi conferido)", true);
  else {
    const textoG = require("../editor/compacto.js").compactarPersonagem(fs.readFileSync(arq, "utf8"));
    const G = carregar(path.join(__dirname, "..", "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta&corpo=guerreiro", corposDeFora: {guerreiro: textoG}}).D;
    check("?corpo=guerreiro usa o corpo de fora, de 256, e avisa o forno", G.CORPO_DESENHADO.DZ === 256 && G.CORPO_DE_FORA && Math.abs(G.DENSIDADE - 256/117) < 1e-12);
    check("com ele, a opcao tem 117, 165 e 256", G.alturasPossiveis().join() === "117,165,256");
    G.G.mode = "play"; G.G.painel = true;
    G.ajustar("9");
    const a = G.CORPO_DESENHADO.DZ, guardado = G.AJUSTE.densidade;
    G.ajustar("9");
    const b = G.CORPO_DESENHADO.DZ;
    G.ajustar("9");
    check("a tecla 9 passa por 117, 165 e volta ao 256, e guarda", a === 117 && guardado === 117 && b === 165 && G.CORPO_DESENHADO.DZ === 256 && G.AJUSTE.densidade === 0 &&
      G.DIM_PERSONAGEM.DZ === 256 && G.CORPO_DESENHADO === G.CORPO_NATIVO, [a, b, G.CORPO_DESENHADO.DZ].join(" > "));
    const H = carregar(path.join(__dirname, "..", "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta&corpo=guerreiro", corposDeFora: {guerreiro: textoG},
      armazenamento: {"cripta-vhalgorn:ajuste": JSON.stringify({versao: 2, vel: 65, fov: 96, olho: 0.6, esc: 2, quadro: false, densidade: 165})}}).D;
    check("a densidade guardada vale desde a carga", H.CORPO_DESENHADO.DZ === 165 && H.CORPO_NATIVO.DZ === 256 && H.DIM_PERSONAGEM.DZ === 165 && H.CORPO_DE_FORA);
    check("sem o corpo de fora, ?corpo= cai no humano", carregar(path.join(__dirname, "..", "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta&corpo=guerreiro"}).D.CORPO_DESENHADO.DZ === 117);
  }
  check("o humano so tem 117: a tecla 9 avisa e nao troca", (function(){ D.G.mode = "play"; D.G.painel = true; const c = D.CORPO_DESENHADO; D.ajustar("9"); return D.alturasPossiveis().join() === "117" && D.CORPO_DESENHADO === c; })());
}

/* 7. o andarilho da vila: o guerreiro de 256 andando, assado com o corpo dele sem trocar o do jogador */
{
  const fs = require("fs"), M = require("../src/mapa.js"), arq = path.join(__dirname, "..", "personagens", "guerreiro.personagem");
  if (!fs.existsSync(arq)) check("(sem personagens/guerreiro.personagem: o andarilho nao foi conferido)", true);
  else {
    const textoG = require("../editor/compacto.js").compactarPersonagem(fs.readFileSync(arq, "utf8"));
    const A = carregar(path.join(__dirname, "..", "..", "cripta-vhalgorn.html"), {busca: "?mapa=cripta", corposDeFora: {guerreiro: textoG}}).D;
    const m = M.lerMapa(fs.readFileSync(path.join(__dirname, "..", "mapas", "ilha.mapa"), "utf8")).mapa; if (m.versao < 2) M.converterMapa(m);
    A.trocarMundo("?mapa=canteiro", m);
    const e = A.ents.find(x => x.kind === "andarilho"), casa = A.ents.find(x => x.kind === "cena" && x.type === "npc" && Math.hypot(e.x - x.x, e.y - x.y) < 1.6);
    check("na ilha nasce um andarilho na rua, ao lado de um morador (o Guarda Anselmo)", !!e && !!casa && /Anselmo/.test(casa.fala) && A.ceilAt(Math.floor(e.x), Math.floor(e.y)) > 10, casa && casa.fala);
    const corpoJogador = A.CORPO_DESENHADO, palJogador = A.P_PERSONAGEM;
    A.ANDARILHO.fornada.trabalhar(Infinity);
    const qs = A.ANDARILHO.fornada.quadros;
    check("ele e assado com o corpo de 256: parado e o passo, nos 8 rumos, com as copias para longe", qs.length === 7 && qs.every(p => p.every(q => q && q.h > 200 && q.longe && q.longe.longe)) &&
      Math.abs(qs[0][0].porTile - 128*256/117) < 1e-9);
    const alto = A.ANDARILHO.fornada.alto;
    check("e de cima tambem: 35, 70 e 90 graus, cada pose e rumo, um desenho diferente do de pe", alto && alto.length === 3 &&
      alto.every(n => n.length === 7 && n.every(p => p.every(q => q && q.longe))) && alto[1][0][0].px.some((v, i) => v !== qs[0][0].px[i]));
    check("assar o andarilho nao troca o corpo nem a paleta do jogador", A.CORPO_DESENHADO === corpoJogador && A.P_PERSONAGEM === palJogador && A.DIM_PERSONAGEM.DZ === 117);
    check("a cor do quadro e a paleta do guerreiro", qs[0][0].cm === A.tabelaDaPaleta(A.paletaDoCorpo(A.ANDARILHO.corpo), A.ANDARILHO.nevoa).cm);
    /* anda: 20 s de passos, e nunca vai longe de casa */
    let andou = 0, longe = 0, viuAndar = false; const x0 = e.x, y0 = e.y;
    for (let k = 0; k < 600; k++){ const px = e.x, py = e.y; A.passoDoAndarilho(e, 1/30); andou += Math.hypot(e.x - px, e.y - py); longe = Math.max(longe, Math.hypot(e.x - e.casa[0], e.y - e.casa[1])); if (e.andando) viuAndar = true; if (A.ceilAt(Math.floor(e.x), Math.floor(e.y)) - A.floorAt(Math.floor(e.x), Math.floor(e.y)) <= 10) longe = 99; }
    check("em 20 s ele anda, para, e fica perto de casa, sempre na rua", andou > 3 && viuAndar && longe < 7.6, "andou " + andou.toFixed(1) + " tiles, ate " + longe.toFixed(1) + " de casa");
    { const x = e.x, y = e.y, pas = e.passada, and = e.andando; A.G.vitrine = true; for (let k = 0; k < 60; k++) A.passoDoAndarilho(e, 1/30); A.G.vitrine = false;
      check("no modo vitrine ele congela: lugar, passo e pose", e.x === x && e.y === y && e.passada === pas && e.andando === and); }
    check("andando, o quadro e um do passo; parado, o parado", (function(){ e.andando = true; e.passada = 0.3; const q1 = A.quadroDoAndarilho(e); e.andando = false; const q0 = A.quadroDoAndarilho(e); return q1 && q0 && q1 !== q0 && qs.slice(1).some(p => p.includes(q1)) && qs[0].includes(q0); })());
  }
}

fim();
