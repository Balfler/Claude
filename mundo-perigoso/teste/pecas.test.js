/* Testes das pecas: a forma e os solidos (modulo puro) e elas dentro do
   motor -- parede fina, vao de porta, dois andares, escada como rampa e
   ponte sobre a estrada.

   Uso: node mundo-perigoso/teste/pecas.test.js [caminho-do-html] */
const path = require("path");
const M = require("../src/mapa.js");
const Pc = require("../src/pecas.js");
const S = require("../src/solidos.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const perto = (a, b, tol) => Math.abs(a - b) < (tol === undefined ? 1e-6 : tol);

/* ---------- 1. o modulo puro ---------- */
{
  const p = {tipo:"parede", estilo:"madeira-pescador", x:10, y:10, z:1, giro:0};
  const g = Pc.geometriaDaPeca(p);
  check("a parede vira faces e solido", g.faces.length > 0 && g.solidos.length === 1);
  const s = g.solidos[0];
  check("a parede fina tem 0,125 de espessura e um andar de altura",
    perto(s.caixa === undefined ? Math.max.apply(null, s.pts.map(q => q[1])) - Math.min.apply(null, s.pts.map(q => q[1])) : 0, Pc.FINA, 1e-9) &&
    perto(s.z1 - s.z0, Pc.ANDAR), "espessura e altura " + (s.z1 - s.z0));
  check("a parede nasce onde foi posta", perto(s.z0, 1) &&
    perto(Math.min.apply(null, s.pts.map(q => q[0])), 10) &&
    perto(Math.max.apply(null, s.pts.map(q => q[0])), 11));

  const giro = Pc.geometriaDaPeca({tipo:"parede", estilo:"madeira-pescador", x:10, y:10, z:1, giro:90});
  const sg = giro.solidos[0];
  check("girada 90 graus a parede corre no outro eixo",
    perto(Math.max.apply(null, sg.pts.map(q => q[1])) - Math.min.apply(null, sg.pts.map(q => q[1])), 1) &&
    perto(Math.max.apply(null, sg.pts.map(q => q[0])) - Math.min.apply(null, sg.pts.map(q => q[0])), Pc.FINA),
    "corre " + (Math.max.apply(null, sg.pts.map(q => q[1])) - Math.min.apply(null, sg.pts.map(q => q[1]))) + " em y");

  const porta = Pc.geometriaDaPeca({tipo:"parede-porta", estilo:"madeira-pescador", x:0, y:0, z:0, giro:0});
  const ind = S.novoIndiceDeSolidos();
  for (const s2 of porta.solidos) S.porNoIndice(ind, s2);
  /* a porta vem com a folha: fechada ela barra o vao, e o solido dela e de
     porta -- a conta de quem alcanca o que passa por ele */
  check("a parede com porta fechada barra no vao, com um solido de porta",
    S.solidosBatem(ind, 0.5, 0, 0.05, 0, 0.85, 0.42) === true && porta.solidos.filter(function(q){ return q.porta; }).length === 1,
    "solidos: " + porta.solidos.length);
  S.PORTAS_DAS_PECAS.abertas = true;
  check("com as portas na conta, o vao passa e do lado a parede bate",
    S.solidosBatem(ind, 0.1, 0, 0.05, 0, 0.85, 0.42) === true && S.solidosBatem(ind, 0.5, 0, 0.05, 0, 0.85, 0.42) === false);
  S.PORTAS_DAS_PECAS.abertas = false;
  const aberta = Pc.geometriaDaPeca({tipo:"parede-porta", estilo:"madeira-pescador", x:0, y:0, z:0, giro:0, campos:{aberta:"1"}});
  const ind2 = S.novoIndiceDeSolidos();
  for (const s2 of aberta.solidos) S.porNoIndice(ind2, s2);
  check("aberta, o vao deixa passar e acima dele continua cheio",
    S.solidosBatem(ind2, 0.5, 0, 0.05, 0, 0.85, 0.42) === false &&
    S.pontoNoSolido(ind2, 0.5, 0, 1.3) === true && S.pontoNoSolido(ind2, 0.5, 0, 0.9) === false,
    "a verga fica entre 1,1 e 1,5");
  /* para que lado cada folha vai: y de todas as faces de um material */
  const faixaY = function(g, mat){
    let a = Infinity, b = -Infinity;
    for (const fc of g.faces) if (fc.mat === mat) for (const q of fc.pts){ a = Math.min(a, q[1]); b = Math.max(b, q[1]); }
    return [a, b];
  };
  const folhaAberta = faixaY(aberta, "porta");
  check("a folha aberta vai para dentro, o +y da parede", folhaAberta[0] > -1e-6 && perto(folhaAberta[1], Pc.PORTA_L), folhaAberta.join(" a "));
  const ven = Pc.geometriaDaPeca({tipo:"parede-veneziana", estilo:"pedra-vila", x:0, y:0, z:0, giro:0, campos:{aberta:"1"}});
  const venY = faixaY(ven, "veneziana");
  check("a veneziana aberta dobra para fora, contra a fachada", venY[1] < -0.125 + 1e-6, venY.join(" a "));
  const vidro = Pc.geometriaDaPeca({tipo:"parede-janela", estilo:"madeira-pescador", x:3, y:2, z:0, giro:90});
  const caras = vidro.faces.filter(function(fc){ return fc.mat === "vidraca"; });
  const us = [].concat.apply([], caras.map(function(fc){ return fc.uv.map(function(u){ return u[0]; }); }));
  check("a vidraca fechada e o desenho inteiro, preso nela (u de 0 a 1), e barra",
    caras.length === 2 && Math.min.apply(null, us) === 0 && Math.max.apply(null, us) === 1 && vidro.solidos.some(function(q){ return q.porta; }));
  /* a textura presa no mundo: a empena em cima da parede continua a pedra
     dela -- mesmo u no mesmo x, v pela altura */
  const par = Pc.geometriaDaPeca({tipo:"parede", estilo:"pedra-vila", x:5, y:5, z:1, giro:0});
  const emp = Pc.geometriaDaPeca({tipo:"telhado-empena", estilo:"pedra-vila", x:5, y:5, z:2.5, giro:0, campos:{base:"0.5"}});
  const naFrente = function(g){ return g.faces.find(function(fc){ return fc.mat === "parede" && fc.pts.every(function(q){ return perto(q[1], 5 - 0.125); }); }); };
  const uvEm = function(fc, x, z){
    const k = fc.pts.findIndex(function(q){ return perto(q[0], x) && perto(q[2], z); });
    return k < 0 ? null : fc.uv[k];
  };
  const pf = naFrente(par), ef = naFrente(emp);
  const u1 = pf && uvEm(pf, 6, 2.5), u2 = ef && uvEm(ef, 6, 2);
  check("a textura e do mundo: a empena continua o desenho da parede de baixo",
    !!u1 && !!u2 && perto(u1[0], u2[0]) && perto(u1[1], -2.5) && perto(u2[1], -2), JSON.stringify([u1, u2]));

  const esc = Pc.geometriaDaPeca({tipo:"escada", estilo:"madeira-pescador", x:0, y:0, z:0, giro:0});
  const e0 = esc.solidos[0];
  check("a escada colide como rampa, do chao ate um andar",
    !!e0.topo && perto(S.topoDoSolido(e0, 0.01, 0.5), 0, 0.02) &&
    perto(S.topoDoSolido(e0, 1.49, 0.5), Pc.ANDAR, 0.02),
    "topo no comeco " + S.topoDoSolido(e0, 0.01, 0.5).toFixed(2) + ", no fim " + S.topoDoSolido(e0, 1.49, 0.5).toFixed(2));
  check("a escada sobe menos que o degrau a cada passo do jogador",
    S.topoDoSolido(e0, 0.08, 0.5) - S.topoDoSolido(e0, 0, 0.5) < 0.42);

  const madeira = Pc.geometriaDaPeca({tipo:"parede", estilo:"madeira-pescador", x:0, y:0, z:0, giro:0});
  const pedra = Pc.geometriaDaPeca({tipo:"parede", estilo:"pedra-vila", x:0, y:0, z:0, giro:0});
  /* o estilo troca a textura e a medida -- a pedra e mais grossa que a
     madeira --, e nao o desenho nem o nome do material */
  const largura = function(g){ let a = Infinity, b = -Infinity; for (const q of g.solidos[0].pts){ a = Math.min(a, q[1]); b = Math.max(b, q[1]); } return b - a; };
  check("trocar o estilo nao muda o desenho nem o nome do material, e a pedra e mais grossa",
    madeira.faces.length === pedra.faces.length &&
    madeira.faces.every(function(f, i){ return f.mat === pedra.faces[i].mat; }) &&
    Math.abs(largura(madeira) - 0.125) < 1e-9 && Math.abs(largura(pedra) - 0.25) < 1e-9, largura(madeira) + " e " + largura(pedra));
  check("a face da peca so diz o material: a textura e o estilo que resolve",
    madeira.faces.every(function(f){ return typeof f.mat === "string" && f.tex === undefined; }));

  const espelho = Pc.geometriaDaPeca({tipo:"parede-porta", estilo:"madeira-pescador", x:0, y:0, z:0, giro:0, espelho:1});
  check("espelhar mantem o poligono no sentido anti-horario", espelho.solidos.every(function(s2){
    let a = 0;
    for (let i = 0; i < s2.pts.length; i++){
      const p1 = s2.pts[i], p2 = s2.pts[(i + 1) % s2.pts.length];
      a += p1[0]*p2[1] - p2[0]*p1[1];
    }
    return a > 0;
  }));
}

/* ---------- 2. dentro do motor ----------
   Um mapa plano com uma casa de dois andares de pecas, uma escada dentro,
   uma sacada e uma ponte sobre a estrada. */
function mundoDePecas(){
  const m = M.novoMapa(40, 40, {nome:"pecas", terreno:M.TERRENO_POR_CHAR[","], altura:4});
  m.coisas.push({x:6, y:6, tipo:"jogador", texto:""});
  const pecas = [];
  const por = (tipo, x, y, z, giro, extra) =>
    pecas.push(Object.assign({tipo:tipo, estilo:"madeira-pescador", x:x, y:y, z:z, giro:giro || 0, construcao:1}, extra));
  const Z = 1.0, A = Pc.ANDAR;                       // o chao do mapa: 4 degraus
  /* casa de 4x3 tiles em (10,10), dois andares. A porta fica ao sul, no
     meio; o resto e parede, com janela no andar de cima. */
  for (let andar = 0; andar < 2; andar++){
    const z = Z + andar*A;
    for (let i = 0; i < 4; i++){
      por(andar === 0 && i === 1 ? "parede-porta" : (andar === 1 ? "parede-janela" : "parede"), 10 + i, 10, z, 0);
      por(andar === 1 ? "parede-janela" : "parede", 10 + i, 13, z, 0);
    }
    for (let j = 0; j < 3; j++){
      por("parede", 10, 10 + j, z, 90);
      por("parede", 14, 10 + j, z, 90);
    }
  }
  /* a laje do andar de cima cobre a casa inteira, menos o buraco da escada */
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++){
    if (i >= 2 && j === 2) continue;                 // o vao por onde a escada sobe
    por("laje", 10 + i, 10 + j, Z + A, 0);
  }
  por("escada", 12, 12, Z, 0);                       // sobe para leste, ate o vao da laje
  /* sacada ao sul, no andar de cima */
  for (let i = 0; i < 2; i++) por("laje", 11 + i, 9, Z + A, 0);
  for (let i = 0; i < 2; i++) por("guarda-corpo", 11 + i, 9, Z + A, 0);
  /* ponte: uma passarela de lajes a um andar de altura, sobre a estrada */
  for (let i = 0; i < 6; i++) por("laje", 20 + i, 20, Z + A, 0);
  m.pecas = pecas;
  return m;
}

const { D, frames } = carregar(arquivo, {busca: "?mapa=cripta"});
const m = mundoDePecas();
D.trocarMundo("?mapa=editor", m);
D.G.mode = "play";
frames(2);

const Z = 1.0, A = Pc.ANDAR;
check("o mundo de pecas entrou no motor", D.mw === 40 && D.PECAS_NO_MUNDO() === m.pecas.length,
  D.PECAS_NO_MUNDO() + " pecas");

/* parede fina */
check("a parede fina barra quem tenta atravessar",
  D.blocked(12.5, 13.0, 0.26, Z, 0.85) === true, "na linha da parede");
check("meio tile adiante ja passa",
  D.blocked(12.5, 11.5, 0.26, Z, 0.85) === false);
check("a porta fechada barra o vao",
  D.blocked(11.5, 10.0, 0.26, Z, 0.85) === true, "porta no meio do tile 11");
/* o E abre a porta que esta na frente, e fecha de novo */
{
  const pp = D.ILHA_AGORA.pecas.find(function(p){ return p.tipo === "parede-porta"; });
  const ficar = function(x, y){ D.P.x = x; D.P.y = y; D.P.z = Z; D.P.ang = Math.PI/2; D.P.pitch = 0; D.P.vx = D.P.vy = D.P.vz = 0; };
  ficar(11.5, 9.3);
  D.useDoor();
  check("o E abre a porta da frente, e o vao passa", D.pecaAberta(pp) && D.blocked(11.5, 10.0, 0.26, Z, 0.85) === false);
  ficar(11.5, 10.0);
  D.useDoor();
  check("em cima de quem esta no vao ela nao fecha", D.pecaAberta(pp));
  ficar(11.5, 9.3);
  D.useDoor();
  check("e o E de novo fecha", !D.pecaAberta(pp) && D.blocked(11.5, 10.0, 0.26, Z, 0.85) === true);
}
check("do lado da porta a parede continua barrando",
  D.blocked(10.9, 10.0, 0.26, Z, 0.85) === true);

/* dois andares */
check("no terreo o chao e o terreno", perto(D.groundUnder(11.5, 11.5, 0.26, Z), Z),
  "chao=" + D.groundUnder(11.5, 11.5, 0.26, Z));
check("no andar de cima o chao e a laje", perto(D.groundUnder(11.5, 11.5, 0.26, Z + A), Z + A),
  "chao=" + D.groundUnder(11.5, 11.5, 0.26, Z + A));
check("de baixo, a laje do andar de cima e o teto",
  perto(D.ceilingOver(11.5, 11.5, 0.26, Z), Z + A - Pc.DEGRAU/2),
  "teto=" + D.ceilingOver(11.5, 11.5, 0.26, Z));
check("em cima da laje nao ha teto nenhum",
  D.ceilingOver(11.5, 11.5, 0.26, Z + A) > 30, "teto=" + D.ceilingOver(11.5, 11.5, 0.26, Z + A));
check("a laje nao barra quem anda em cima dela",
  D.blocked(11.5, 11.5, 0.26, Z + A, 0.85) === false);
check("a laje barra quem tenta subir por baixo dela",
  D.blocked(11.5, 11.5, 0.26, Z + A - 0.5, 0.85) === true);

/* ponte sobre a estrada */
check("embaixo da ponte o chao e a estrada", perto(D.groundUnder(22.5, 20.5, 0.26, Z), Z));
check("em cima da ponte o chao e o tabuado", perto(D.groundUnder(22.5, 20.5, 0.26, Z + A), Z + A));
check("embaixo da ponte se anda", D.blocked(22.5, 20.5, 0.26, Z, 0.85) === false);

/* a escada sobe andando */
{
  D.P.noclip = false; D.P.god = true;
  D.P.x = 12.1; D.P.y = 12.5; D.P.z = Z; D.P.vx = D.P.vy = D.P.vz = 0; D.P.ang = 0;
  frames(4);
  const z0 = D.P.z;
  D.keys["w"] = true;
  frames(40);
  D.keys["w"] = false;
  check("a escada leva ao andar de cima andando, sem pular",
    D.P.z > z0 + 1.2 && D.P.ground, "de " + z0.toFixed(2) + " para " + D.P.z.toFixed(2));
  check("no andar de cima o jogador esta em pe sobre a laje",
    D.P.z > Z + A - 0.3, "z=" + D.P.z.toFixed(2));
}

/* as pecas aparecem no quadro, e o estilo troca sem mexer na forma */
{
  D.P.x = 12.5; D.P.y = 7.5; D.P.z = Z; D.P.ang = Math.PI/2; D.P.pitch = 0;
  D.P.vx = D.P.vy = D.P.vz = 0;
  frames(2);
  const paredeDe = function(id){ return D.texturaDoEstilo(id, "parede", D.HORIZONTE); };
  let daPeca = 0;
  for (let i = 0; i < D.nQuads(); i++) if (D.QUADS[i].tex === paredeDe("madeira-pescador")) daPeca++;
  check("as faces das pecas aparecem no quadro", daPeca > 10, daPeca + " faces de parede de madeira");

  const antes = D.PEDACOS_MONTADOS;
  /* como o arquivo guarda: a peca nao tem estilo, a construcao tem */
  m.construcoes = [{id: 1, estilo: "pedra-vila", nome: "casa"}];
  for (const p of m.pecas) delete p.estilo;
  D.montarPecas(); D.remontarPecas();
  frames(2);
  let dePedra = 0, deMadeira = 0;
  for (let i = 0; i < D.nQuads(); i++){
    if (D.QUADS[i].tex === paredeDe("pedra-vila")) dePedra++;
    if (D.QUADS[i].tex === paredeDe("madeira-pescador")) deMadeira++;
  }
  check("trocar o estilo da construcao troca a textura de tudo",
    dePedra >= daPeca && deMadeira === 0, dePedra + " de pedra, " + deMadeira + " de madeira");
  check("a forma nao mudou: a parede continua barrando",
    D.blocked(12.5, 13.0, 0.26, Z, 0.85) === true);
  check("trocar o estilo remonta so os pedacos com peca",
    D.PEDACOS_MONTADOS - antes <= 4, (D.PEDACOS_MONTADOS - antes) + " pedacos remontados");
}

/* o tiro e a linha de visao param na peca */
{
  check("a parede fina corta a linha de visao",
    D.los3(12.5, 11.5, Z + 0.6, 12.5, 8.5, Z + 0.6) === false, "por cima da parede cheia");
  check("pelo vao da porta a linha de visao passa",
    D.los3(11.5, 11.5, Z + 0.6, 11.5, 8.5, Z + 0.6) === true, "a porta fica no meio do tile 11");
}


/* ---------- a malha: toda peca e um solido, de qualquer lado ----------
   A peca desenhada de 65 direcoes, com o recorte de faces do motor, tem que
   mostrar o mesmo que com todas as faces dos dois lados (teste/malha.js).
   Ate 24/9 so 2 dos 68 tipos passavam: a caixa, o pano e o prisma saiam com
   as laterais viradas para dentro, e a peca parecia folha -- a escada
   sumia de lado, a chamine era um papel. Todo tipo em todo estilo, e cada
   um tambem girado e espelhado. */
{
  const {vistaDaPeca} = require("./malha");
  const ruins = [];
  let vistas = 0;
  for (const t of Object.keys(Pc.TIPOS_DE_PECA)) for (const est of Object.keys(Pc.ESTILOS)){
    const r = vistaDaPeca(Pc.geometriaDaPeca({tipo: t, x: 0, y: 0, z: 0, giro: 0}, est));
    vistas++;
    if (r.pior > 0.002) ruins.push(t + "/" + est + " " + (100*r.pior).toFixed(1) + "%");
  }
  check("toda peca, em todo estilo, e inteira de qualquer lado (" + vistas + " pecas)", ruins.length === 0, ruins.slice(0, 6).join(", "));
  const giradas = [];
  for (const t of Object.keys(Pc.TIPOS_DE_PECA)){
    const giro = Pc.giroAceito(t, 45) ? 45 : 90;
    const r = vistaDaPeca(Pc.geometriaDaPeca({tipo: t, x: 3.5, y: 2, z: 1, giro: giro, espelho: 1}, "madeira-pescador"));
    if (r.pior > 0.002) giradas.push(t + " " + (100*r.pior).toFixed(1) + "%");
  }
  check("girada e espelhada, tambem", giradas.length === 0, giradas.slice(0, 6).join(", "));
  const empena = vistaDaPeca(Pc.geometriaDaPeca({tipo: "telhado-empena", x: 0, y: 0, z: 0, giro: 0, campos: {base: "1.5"}}, "pedra-vila"));
  check("a empena com base, que desce ate a parede, tambem", empena.pior <= 0.002);
  const abertas = [];
  for (const t of Object.keys(Pc.TIPOS_DE_PECA)) if (Pc.TIPOS_DE_PECA[t].abre) for (const est of ["madeira-pescador", "fortaleza-humana"]){
    const r = vistaDaPeca(Pc.geometriaDaPeca({tipo: t, x: 0, y: 0, z: 0, giro: 0, campos: {aberta: "1"}}, est));
    if (r.pior > 0.002) abertas.push(t + "/" + est + " " + (100*r.pior).toFixed(1) + "%");
  }
  check("e a porta, a janela e a grade abertas", abertas.length === 0, abertas.join(", "));
}

fim();
