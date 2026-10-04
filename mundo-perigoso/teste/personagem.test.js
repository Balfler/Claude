/* Testes do personagem composto por pecas e do provador.
   Uso: node mundo-perigoso/teste/personagem.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D } = carregar(arquivo);
const { DX, DY, DZ } = D.DIM_PERSONAGEM;
const MP = D.MP;

/* a caixa que uma primitiva ocupa, em voxels */
function limites(p){
  if (p.tipo === "caixa") return [p.x0, p.y0, p.z0, p.x1 - 1, p.y1 - 1, p.z1 - 1];
  if (p.tipo === "bola") return [p.cx - p.rx, p.cy - p.ry, p.cz - p.rz, p.cx + p.rx, p.cy + p.ry, p.cz + p.rz];
  const r = Math.max(p.r0, p.r1);
  return [Math.min(p.a[0], p.b[0]) - r, Math.min(p.a[1], p.b[1]) - r, Math.min(p.a[2], p.b[2]) - r,
          Math.max(p.a[0], p.b[0]) + r, Math.max(p.a[1], p.b[1]) + r, Math.max(p.a[2], p.b[2]) + r];
}
const grade = (esc, pose) => D.montarVoxels(D.pecasDoPersonagem(esc, pose || 0), DX, DY, DZ);
const pele = (esc, pose) => D.peleDoModelo(grade(esc, pose), DX, DY, DZ);
const conta = (lista, fn) => lista.filter(fn).length;
/* roupa e cabelo fixos: com corpo desenhado o padrao e a roupa do desenho, e as
   regras daqui sao das pecas */
const com = mudanca => Object.assign({}, D.PERSONAGEM_PADRAO, {roupa: "tunica", cabelo: "curto"}, mudanca);

/* 0. a escala: 128 voxels por tile, um humano de 117 */
check("o humano tem 117 voxels de altura, a 128 por tile",
  DZ === 117 && D.VOX_PERSONAGEM === 1/128 && Math.abs(DZ*D.VOX_PERSONAGEM - 0.914) < 0.01, DZ + " voxels");
{
  /* pose 1 e o instante de apoio duplo (os dois pes no chao, quase esticados,
     como no talao-no-chao de um passo real); pose 2 pega o meio da passada,
     com a perna direita no ar -- e ai que o joelho dobra bem para a frente */
  const s0 = D.esqueleto(0), s1 = D.esqueleto(2);
  const meioY = (a, b) => (a[1] + b[1])/2;
  check("no meio do passo o joelho dobra para a frente", s1.joelhoE[1] < meioY(s1.quadrilE, s1.peE) && s1.joelhoD[1] < meioY(s1.quadrilD, s1.peD),
    "joelhoE y " + s1.joelhoE[1] + ", linha " + meioY(s1.quadrilE, s1.peE));
  check("no passo o cotovelo acompanha a mao que balanca",
    Math.sign(s1.cotoveloD[1] - s0.cotoveloD[1]) === Math.sign(s1.maoD[1] - s0.maoD[1]) && s1.maoD[1] !== s0.maoD[1]);
  /* o passo agora vem de captura de movimento real, nao de uma formula
     sincronizada a mao -- pe e mao do mesmo lado nao ficam mais em espelho
     exato quadro a quadro (amplitude e fase diferem, como num corpo de
     verdade). O que continua valendo, e o que testamos, e a correlacao ao
     longo do ciclo inteiro: quando o pe vai mais para a frente, a mao do
     mesmo lado tende a ir para tras, e vice-versa. */
  const peEy = D.POSE.ANDAR.map(p => D.esqueleto(p).peE[1]), maoEy = D.POSE.ANDAR.map(p => D.esqueleto(p).maoE[1]);
  const media = xs => xs.reduce((a,b) => a+b, 0)/xs.length, mPe = media(peEy), mMao = media(maoEy);
  const covariancia = peEy.reduce((s,v,i) => s + (v-mPe)*(maoEy[i]-mMao), 0);
  check("no ciclo do passo, a mao do lado do pe que avanca tende a recuar", covariancia < 0, "covariancia " + covariancia.toFixed(1));
}

/* 1. toda peca monta dentro do grid -- nas poses que ela de fato aparece. Uma
   adaga nunca aparece na pose de conjurar nem um arco na de atacar (o jogo
   so poe a arma equipada na pose da propria arma, em ARMA_DO_WPN), entao so
   testamos cada arma nas poses de sempre mais a acao que e dela. */
{
  const POSES_SEMPRE = [D.POSE.PARADO].concat(D.POSE.ANDAR, [D.POSE.RESPIRAR], D.POSE.CORRER, [D.POSE.PULO, D.POSE.BLOQUEAR]);
  const POSES_DA_ARMA = {adaga: D.POSE.ATAQUE, espada: D.POSE.ATAQUE, cajado: D.POSE.CONJURAR,
                         grimorio: D.POSE.CONJURAR, arco: D.POSE.ARCO};
  const fora = [];
  for (const espaco of D.ORDEM_PECAS) for (const op of Object.keys(D.PECAS[espaco])){
    const esc = com({[espaco]: op, armadura: espaco === "armadura" ? op : "placas", elmo: espaco === "elmo" ? op : "fechado"});
    const poses = POSES_SEMPRE.concat(POSES_DA_ARMA[esc.arma] || []);
    for (const pose of poses) for (const p of D.pecasDoPersonagem(esc, pose)){
      const b = limites(p);
      if (b[0] < -2 || b[1] < -2 || b[2] < -2 || b[3] > DX + 1 || b[4] > DY + 1 || b[5] > DZ + 1) fora.push(espaco + ":" + op + " pose " + pose);
    }
  }
  check("toda peca de todo espaco monta dentro do grid, em todas as poses", fora.length === 0, [...new Set(fora)].join(", "));
}

/* 2. a armadura cobre a roupa e pesa o que parece */
{
  const tecido = arm => conta(pele(com({armadura: arm})), v => v.mat === MP.TECIDO);
  check("placas cobrem a roupa: sobra pouco tecido a vista", tecido("placas") < tecido("roupa") * 0.4,
    "roupa " + tecido("roupa") + ", placas " + tecido("placas"));
  const volume = arm => grade(com({armadura: arm})).filter(Boolean).length;
  check("placas tem mais volume que couro, e couro que so a roupa",
    volume("placas") > volume("couro") && volume("couro") > volume("roupa"),
    ["roupa", "couro", "malha", "placas"].map(a => a + " " + volume(a)).join(", "));
}

/* 3. cosmetico e enfeite */
{
  const a = D.materiaisDoPersonagem(com({corEnfeite: 0})), b = D.materiaisDoPersonagem(com({corEnfeite: 2}));
  check("trocar a cor do enfeite so muda a rampa do enfeite",
    a.every((m, i) => (i === MP.ENFEITE - 1) === (m.tons !== b[i].tons)));
  const gridSem = grade(com({armadura: "placas", corEnfeite: 0}));
  const gridCom = grade(com({armadura: "placas", corEnfeite: 3}));
  check("a cor do enfeite nao mexe em voxel nenhum", gridSem.every((m, i) => m === gridCom[i]));
  const falhas = [];
  for (const arm of ["roupa", "couro", "malha", "placas"]) for (const enf of ["faixa", "brasao"]){
    const n = conta(pele(com({armadura: arm, enfeite: enf})), v => v.mat === MP.ENFEITE);
    if (n < 40) falhas.push(arm + "+" + enf + "=" + n);
  }
  check("o enfeite fica por fora de qualquer armadura", falhas.length === 0, falhas.join(", "));
  const pena = conta(pele(com({elmo: "fechado", enfeite: "pena"})), v => v.mat === MP.ENFEITE);
  check("a pena aparece ate por cima do elmo fechado", pena >= 20, "voxels " + pena);
}

/* 4. arma e escudo ficam para fora da silhueta: a mao direita vai ate x 69 e
   o braco esquerdo comeca em x 11 */
{
  /* para fora da silhueta do proprio corpo, e nao de um x fixo: o corpo do
     atelie tem outra largura que o de bolas */
  const semArma = pele(com({})), borda = Math.max.apply(null, semArma.map(v => v.x));
  const espada = conta(pele(com({arma: "espada"})), v => v.mat === MP.METAL && v.x > borda + 1);
  check("a espada sai para fora do corpo", espada >= 20, "voxels " + espada + " alem de x " + borda);
  const escudo = conta(pele(com({escudo: "redondo"})), v => v.mat === MP.MADEIRA && v.x <= 11);
  check("o escudo fica do lado de fora do braco", escudo >= 30, "voxels " + escudo);
}

/* 5. poses, rumos, a copia para longe e as escolhas */
{
  const g1 = grade(D.PERSONAGEM_PADRAO, 1), g2 = grade(D.PERSONAGEM_PADRAO, 2);
  check("dois instantes do passo sao poses diferentes", g1.some((m, i) => m !== g2[i]));
  const q = D.assarPersonagem(D.PERSONAGEM_PADRAO);
  check("o personagem assado tem todas as poses em oito rumos, um pixel por voxel",
    q.length === D.TODAS_AS_POSES.length && q.every(p => p.length === 8) && q[0][0].w === DX && q[0][0].h === DZ);
  check("cada quadro leva a copia de meia resolucao para longe",
    q.every(p => p.every(f => f.longe && f.longe.w === DX >> 1 && f.longe.h === (DZ + 1) >> 1)));
  const cheia = grade(D.PERSONAGEM_PADRAO), r = D.reduzirGrade(cheia, DX, DY, DZ);
  const n1 = cheia.filter(Boolean).length, n2 = r.g.filter(Boolean).length;
  check("a copia para longe guarda o volume, sem engordar nem sumir",
    n2 > n1/8*0.7 && n2 < n1/8*1.3, n1 + " voxels viram " + n2 + " (esperado perto de " + Math.round(n1/8) + ")");
  const e = D.escolhaDoPersonagem({armadura: "dragao", corRoupa: 9, arma: "espada"});
  check("peca ou cor desconhecida volta ao padrao, e o resto fica", e.armadura === "roupa" && e.corRoupa === 0 && e.arma === "espada");
  check("os moradores saem do mesmo sistema", [0, 1, 2, 3].every(v => D.PECAS.cabelo.hasOwnProperty(D.moradorDaVariante(v).cabelo)));
  /* a fornada pronta nao segura mais nada: sem soltar, cada visual prendia as
     peles de todas as poses, uns 55 MB (sondagens/1-personagens) */
  const f = D.novaFornada(D.PERSONAGEM_PADRAO, 0, [0, 1], 2);
  f.trabalhar(Infinity);
  check("a fornada pronta solta as peles e as tarefas", f.pronta() && f.presas() === 0, "presas " + f.presas());
}

/* 6. o provador */
{
  const html = path.join(__dirname, "..", "..", "provador.html");
  const existe = fs.existsSync(html);
  check("o provador e montado", existe);
  if (existe){
    const s = fs.readFileSync(html, "utf8");
    const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
    check("provador.html e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);
    const js = (s.match(/<script>\n([\s\S]*)<\/script>/) || [])[1] || "";
    let ok = true, erro = "";
    try { new vm.Script(js); } catch (e) { ok = false; erro = e.message; }
    check("o script do provador compila", ok && js.includes("assarPersonagem") && js.includes("ORDEM_PECAS"), erro);
  }
  for (const f of ["src/p3e.js", "src/provador.js", "src/provador.html"]){
    const s = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
    check(f + " e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);
  }
}

fim();
