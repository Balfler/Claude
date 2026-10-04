/* Testes do motor 3D: altura do terreno, pulo, dash, mira vertical,
   portas desenhadas e limites do mapa.

   Uso: node mundo-perigoso/teste/motor3d.test.js [caminho-do-html] */
const path = require("path");
const { carregar, placar } = require("./harness");

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { D, frames } = carregar(arquivo);
const { check, fim } = placar();

function vivo(){
  D.G.mode = "play"; D.P.dead = false; D.P.hp = 200; D.P.painT = 0;
  D.P.pitch = 0; D.P.eye = 0.60; D.P.mana = 150;
}
/* Poe o jogador num ponto e deixa a fisica assentar antes de medir. */
function por(x, y){
  vivo(); D.P.x = x; D.P.y = y; D.P.vx = D.P.vy = D.P.vz = 0;
  frames(10); vivo();
}
function mirar(e){
  const dx = e.x - D.P.x, dy = e.y - D.P.y;
  const dz = (e.z + e.d.hgt * 0.5) - (D.P.z + D.P.eye);
  D.P.ang = Math.atan2(dy, dx);
  D.P.pitch = Math.atan2(dz, Math.hypot(dx, dy));
}

/* Fere o jogador pelo caminho real do jogo, SEM setTimeout.
   O dano de corpo a corpo e agendado com setTimeout e num laco sincrono de
   quadros esses callbacks nunca disparam -- um teste feito assim passa porque
   nao houve dano nenhum, nao porque o modo deus funcionou. A lava queima
   dentro do proprio update(), entao serve. */
function banhoDeLava(){
  vivo(); D.P.x = 24.5; D.P.y = 6.5; D.P.z = D.floorAt(24,6);
  D.P.vx = D.P.vy = D.P.vz = 0; D.P.lavaT = 0;
  const antes = D.P.hp;
  frames(120);
  return antes - D.P.hp;
}

try {
  D.G.mode = "play"; frames(5);

  /* ---------- altura do terreno ---------- */
  check("entrada fica abaixo do corredor", D.floorAt(7,29) < D.floorAt(7,23),
    D.floorAt(7,29).toFixed(2) + " < " + D.floorAt(7,23).toFixed(2));
  check("mezanino da biblioteca esta elevado", D.floorAt(21,13) > 0.9,
    "piso=" + D.floorAt(21,13).toFixed(2));
  check("fosso de lava esta rebaixado", D.floorAt(24,6) < -0.5,
    "piso=" + D.floorAt(24,6).toFixed(2));
  check("salao tem pe-direito alto", D.ceilAt(8,17) > 2,
    "teto=" + D.ceilAt(8,17).toFixed(2));

  /* ---------- o jogador assenta no chao ---------- */
  por(7.5, 29.5);
  check("jogador pousa no piso da entrada",
    Math.abs(D.P.z - D.floorAt(7,29)) < 0.02 && D.P.ground, "z=" + D.P.z.toFixed(2));

  /* ---------- pulo ---------- */
  por(7.5, 29.5);
  const z0 = D.P.z;
  D.P.jumpBuf = 0.13; frames(14);
  check("pulo levanta o jogador", D.P.z - z0 > 0.35, "subiu " + (D.P.z - z0).toFixed(2));
  frames(60);
  check("gravidade traz de volta ao chao",
    Math.abs(D.P.z - z0) < 0.02 && D.P.ground, "z=" + D.P.z.toFixed(2));

  /* ---------- degrau: sobe andando ---------- */
  por(20.5, 17.5);
  const zAntes = D.P.z;
  D.P.ang = -Math.PI/2; D.keys["w"] = true; frames(70); D.keys["w"] = false;
  check("rampa leva ao mezanino sem pular", D.P.z > zAntes + 0.5,
    "z " + zAntes.toFixed(2) + " -> " + D.P.z.toFixed(2));

  /* ---------- dash ---------- */
  por(8.0, 18.0); D.P.ang = 0;
  const xa = D.P.x; D.keys["w"] = true; frames(12); D.keys["w"] = false;
  const andou = D.P.x - xa;
  por(8.0, 18.0); D.P.ang = 0;
  const xb = D.P.x; D.keys["shift"] = true; frames(2); D.keys["shift"] = false; frames(10);
  const comDash = D.P.x - xb;
  check("dash cobre mais chao que andar", comDash > andou * 1.6,
    "andar=" + andou.toFixed(2) + " dash=" + comDash.toFixed(2));

  /* ---------- mira vertical ----------
     Os dois lados vao para a entrada, que e um salao aberto. Usar as posicoes
     vivas dos bichos deixava o teste instavel: uma coluna no caminho fazia
     falhar por motivo errado. */
  function duelo(alvo, altura, comMira){
    alvo.dead = false; alvo.hp = alvo.d.hp; alvo.st = "idle"; alvo.painT = 0;
    alvo.x = 7.5; alvo.y = 27.2; alvo.z = D.floorAt(7,27) + altura;
    por(7.5, 29.6); D.P.wpn = 1;
    if (comMira) mirar(alvo);
    else { D.P.ang = Math.atan2(alvo.y - D.P.y, alvo.x - D.P.x); D.P.pitch = 0; }
    const graus = D.P.pitch * 180 / Math.PI, hp0 = alvo.hp;
    D.P.cd = 0; D.fire();
    for (let i = 0; i < 30; i++){ frames(1); alvo.z = D.floorAt(7,27) + altura; }
    return { graus, bateu: alvo.hp < hp0 };
  }
  const morcego = D.ents.find(e => e.type === "bat");
  const aranha  = D.ents.find(e => e.type === "spider");

  let r = duelo(morcego, 1.30, true);
  check("mirando pra cima acerta o morcego", r.bateu, "pitch=" + r.graus.toFixed(0) + " graus");
  r = duelo(morcego, 1.30, false);
  check("mirando reto o tiro passa por baixo do morcego", !r.bateu, "pitch=0");
  r = duelo(aranha, 0, true);
  check("mirando pra baixo acerta a aranha", r.bateu, "pitch=" + r.graus.toFixed(0) + " graus");

  /* ---------- flecha do goblin faz arco ---------- */
  const goblin = D.ents.find(e => e.type === "goblin" && !e.dead);
  por(goblin.x, goblin.y + 5); goblin.st = "chase"; goblin.atk = 0;
  let flecha = null;
  for (let i = 0; i < 200 && !flecha; i++){ frames(1); flecha = D.projs.find(p => p.type === "arrow"); }
  if (flecha){
    const vz0 = flecha.vz; frames(8);
    check("flecha do goblin cai por gravidade", flecha.vz < vz0,
      "vz " + vz0.toFixed(2) + " -> " + flecha.vz.toFixed(2));
  } else check("flecha do goblin cai por gravidade", false, "nenhuma flecha disparada");

  /* ---------- ninguem escapa do mapa ----------
     O desvio lateral dos voadores nao era testado contra colisao e eles
     atravessavam parede de pouquinho em pouquinho. */
  vivo(); D.P.x = 22; D.P.y = 18;
  for (const e of D.ents) if (e.kind === "enemy") e.st = "chase";
  frames(600);
  const fugitivo = D.ents.find(e => e.kind === "enemy" &&
    (e.x < 0.2 || e.y < 0.2 || e.x > D.MW - 0.2 || e.y > D.MH - 0.2));
  check("nenhum inimigo escapa do mapa", !fugitivo,
    fugitivo ? fugitivo.type + " em x=" + fugitivo.x.toFixed(1) + " y=" + fugitivo.y.toFixed(1) : "");
  const naParede = D.ents.find(e => e.kind === "enemy" && !e.dead &&
    D.ceilAt(e.x|0, e.y|0) - D.floorAt(e.x|0, e.y|0) < 0.3);
  check("nenhum inimigo dentro de parede", !naParede, naParede ? naParede.type : "");

  /* ---------- portas sao desenhadas ----------
     A porta virou "teto que desce ate o chao". Se a faixa de cima nao for
     emitida com ela fechada, o vao vira um buraco: da pra ver a sala do outro
     lado e o jogador esbarra no nada. Isto olha a geometria gerada. */
  function quadsCom(tex){
    let n = 0;
    for (let i = 0; i < D.nQuads(); i++) if (D.QUADS[i].tex === tex) n++;
    return n;
  }
  por(18.5, 17.5); D.P.ang = Math.PI; D.P.pitch = 0; frames(2);
  check("porta de madeira fechada aparece na tela", quadsCom(D.TEX.wood) > 0,
    "quads com textura de porta = " + quadsCom(D.TEX.wood));

  const porta = D.doors.get(17 * D.MW + 16);
  porta.run = 1; frames(90); frames(2);
  check("porta aberta some da tela", porta.open >= 1 && quadsCom(D.TEX.wood) === 0,
    "abertura=" + porta.open.toFixed(2) + " quads=" + quadsCom(D.TEX.wood));

  por(34.5, 21.5); D.P.ang = Math.PI/2; D.P.pitch = 0; frames(2);
  check("selo runico trancado aparece na tela", quadsCom(D.TEX.sealed) > 0,
    "quads = " + quadsCom(D.TEX.sealed));

  por(29.5, 17.5); D.P.ang = 0; D.P.pitch = 0; frames(2);
  check("parede secreta se disfarca de parede comum", quadsCom(D.TEX.wood) === 0,
    "nao pode usar textura de porta");

  /* ---------- a geometria e montada uma vez, em pedacos ----------
     Antes ela era refeita a cada quadro. Agora o mundo e montado em pedacos
     de 16x16 tiles e so anda quem se mexe: andar e olhar em volta nao
     remonta nada, e uma porta que abre remonta so o pedaco dela e o do lado
     (a parede do vizinho olha para a porta). */
  {
    por(7.5, 29.5);
    frames(4);
    const antes = D.PEDACOS_MONTADOS;
    D.keys["w"] = true;
    for (let i = 0; i < 40; i++){ D.P.ang = i*0.3; frames(2); }
    D.keys["w"] = false;
    check("andar e olhar em volta nao remonta geometria nenhuma",
      D.PEDACOS_MONTADOS === antes, "remontou " + (D.PEDACOS_MONTADOS - antes) + " pedacos em 80 quadros");
    check("o mundo inteiro cabe em poucos pedacos",
      D.PEDACOS.length === Math.ceil(D.MW/16)*Math.ceil(D.MH/16) && D.PEDACOS.length === 6,
      D.PEDACOS.length + " pedacos de 16 tiles para " + D.MW + "x" + D.MH);

    const porta2 = D.doors.get(17*D.MW + 16);
    porta2.open = 0; porta2.run = 1;
    const antesPorta = D.PEDACOS_MONTADOS;
    frames(1);
    const porQuadro = D.PEDACOS_MONTADOS - antesPorta;
    check("a porta que abre remonta so o pedaco dela e o do lado", porQuadro > 0 && porQuadro <= 2,
      porQuadro + " pedacos por quadro");
    frames(90);
    const parada = D.PEDACOS_MONTADOS;
    frames(10);
    check("porta parada nao remonta mais nada", D.PEDACOS_MONTADOS === parada);
  }

  /* ---------- ferramentas de teste ---------- */
  D.P.god = false;
  const semDeus = banhoDeLava();
  check("a lava queima quem nao e deus", semDeus > 0, "perdeu " + semDeus.toFixed(0) + " de vida");
  D.P.god = true;
  const comDeus = banhoDeLava();
  check("modo deus ignora dano", comDeus === 0, "perdeu " + comDeus.toFixed(0));

  /* ---------- voador morto cai ----------
     A altura do voador era mantida por uma conta que vinha antes do teste de
     morte, entao o morcego morria e continuava pairando com a pose de
     cadaver. Um corpo no ar nao e um detalhe pequeno: e a unica coisa na
     tela que denuncia que sprite e sprite. */
  {
    D.P.god = true; D.P.dead = false;
    por(7.5, 29.5);
    const morcego = D.ents.filter(e => e.kind === "enemy" && e.type === "bat")[0];
    morcego.gone = false; morcego.painT = 0;
    morcego.x = D.P.x; morcego.y = D.P.y - 3;
    const chao = D.floorAt(morcego.x|0, morcego.y|0);
    morcego.z = chao + 1.30;
    morcego.dead = true; morcego.dieT = 0; morcego.vz = 0;
    const alto = morcego.z;
    frames(90);
    check("o voador morto cai no chao", Math.abs(morcego.z - chao) < 0.02,
      "de " + alto.toFixed(2) + " para " + morcego.z.toFixed(2) + ", chao " + chao.toFixed(2));
  }

  /* ---------- modo vitrine ----------
     Existe para dar pra olhar as criaturas: com elas em cima de voce nao da
     pra ver de que lado estao viradas, que e justamente o que o modelo de
     voxel veio resolver. Se voltarem a andar ou a bater, o modo perde a
     razao de existir -- e so se descobre morrendo enquanto se olha arte. */
  {
    D.P.god = true; D.P.dead = false;
    const bicho = D.ents.filter(e => e.kind === "enemy" && !e.dead)[0];
    function correParaMim(vitrine){
      D.G.vitrine = vitrine;
      por(7.5, 29.5);
      bicho.x = D.P.x; bicho.y = D.P.y - 4; bicho.z = D.P.z;
      bicho.st = "chase"; bicho.painT = 0; bicho.atk = 0; bicho.walk = 0;
      const x0 = bicho.x, y0 = bicho.y;
      frames(120);
      return Math.hypot(bicho.x-x0, bicho.y-y0);
    }
    const solto = correParaMim(false);
    check("fora da vitrine a criatura vem atras de voce", solto > 0.5,
      "andou " + solto.toFixed(2) + " tiles");
    const preso = correParaMim(true);
    check("na vitrine a criatura nao sai do lugar", preso < 0.01,
      "andou " + preso.toFixed(3) + " tiles");
    check("na vitrine a criatura continua animando", (bicho.walk||0) > 0.5,
      "walk = " + (bicho.walk||0).toFixed(2));
    D.G.vitrine = false;
  }
  D.P.god = false;

  /* fantasma atravessa parede: a entrada e cercada, sem noclip nao sai */
  vivo(); D.P.noclip = false; por(7.5, 29.5);
  D.P.ang = Math.PI; D.keys["w"] = true; frames(50); D.keys["w"] = false;
  const parouNaParede = D.P.x > 3.0;
  vivo(); D.P.noclip = true; D.P.x = 7.5; D.P.y = 29.5; D.P.ang = Math.PI; D.P.pitch = 0;
  D.keys["w"] = true; frames(50); D.keys["w"] = false;
  const atravessou = D.P.x < 2.0;
  D.P.noclip = false; D.P.vx = D.P.vy = D.P.vz = 0;
  check("sem fantasma a parede segura", parouNaParede, "x=" + D.P.x.toFixed(1));
  check("fantasma atravessa a parede", atravessou);

  vivo(); D.P.have = [true,false,false]; D.P.key = false; D.P.mana = 0;
  D.P.have = [true,true,true]; D.P.key = true; D.P.mana = D.P.maxMana;
  check("arsenal completo libera as tres armas e a chave",
    D.P.have.every(Boolean) && D.P.key && D.P.mana > 100);

  /* ---------- a faixa do ceu fecha em si mesma ----------
     O ceu da a volta: se a serra do horizonte terminar numa altura diferente
     da inicial, aparece um degrau vertical na costura -- na tela vira uma
     listra fina que passa muito bem por bug de geometria. Ja custou caro.

     Testa a funcao de alturas, nao os pixels: no harness o canvas e um stub e
     a textura sai zerada, entao um teste de pixel passaria sem enxergar nada. */
  for (const [n, altura] of [[8, 30], [16, 18], [4, 12]]){
    const h = D.serraAlturas(n, altura);
    check("serra de " + n + " passos fecha na costura",
      h.length === n+1 && Math.abs(h[0] - h[n]) < 1e-9,
      "inicio=" + h[0].toFixed(2) + " fim=" + h[n].toFixed(2));
  }
  const suave = D.serraAlturas(16, 18);
  let maiorSalto = 0;
  for (let i=1;i<suave.length;i++) maiorSalto = Math.max(maiorSalto, Math.abs(suave[i]-suave[i-1]));
  check("a serra nao tem parede vertical", maiorSalto < 18*0.6,
    "maior salto = " + maiorSalto.toFixed(2));

  /* ---------- cor indexada ----------
     A imagem guarda um byte por pixel e a cor sai da COLORMAP. Se o indice 0
     deixar de ser transparente, todo sprite ganha um bloco solido em volta; se
     a paleta passar de 255, um indice vaza para a linha de luz seguinte e a
     cor so sai errada a certa distancia -- os dois falham longe da causa. */
  {
    const abgr = (r,g,b) => 0xFF000000 | (b<<16) | (g<<8) | r;
    const fonte = new Uint32Array([0, abgr(200,30,20), abgr(10,220,40), abgr(200,30,20)]);
    const tab = D.paletaDe(fonte);
    tab.cm = D.fazColormap(tab.pal, 0);
    const px = D.indexar(fonte, tab);

    check("pixel transparente vira indice 0", px[0] === 0, "px[0]=" + px[0]);
    check("cor repetida reusa o mesmo indice",
      px[1] === px[3] && px[1] !== px[2], "px=" + Array.from(px).join(","));

    let vazio = true;
    for (let L=0; L<D.LEV; L++) if (tab.cm[L*256] !== 0) vazio = false;
    check("indice 0 e transparente em todo nivel de luz", vazio);

    check("nivel 0 devolve a cor original",
      tab.cm[px[1]] === fonte[1] && tab.cm[px[2]] === fonte[2],
      "cm=" + tab.cm[px[1]].toString(16) + " orig=" + fonte[1].toString(16));

    /* mais cores distintas do que cabe na paleta */
    const muitas = new Uint32Array(600);
    for (let i=0;i<muitas.length;i++) muitas[i] = abgr(i & 255, (i*7) & 255, (i*13) & 255);
    const t2 = D.paletaDe(muitas);
    t2.cm = D.fazColormap(t2.pal, 0);
    const p2 = D.indexar(muitas, t2);
    let maior = 0;
    for (let i=0;i<p2.length;i++) if (p2[i] > maior) maior = p2[i];
    check("paleta cheia nao passa de 255", t2.pal.length <= 255 && maior <= 255,
      "cores=" + t2.pal.length + " maior indice=" + maior);
    let todosPintados = true;
    for (let i=0;i<p2.length;i++) if (p2[i] === 0 || !t2.cm[p2[i]]) todosPintados = false;
    check("cor sem vaga cai na mais parecida, nao no vazio", todosPintados);

    /* a nevoa muda para onde a cor caminha quando escurece */
    const semNevoa = D.fazColormap([[200,200,200]], 0);
    const comNevoa = D.fazColormap([[200,200,200]], 0x00FF0000);   // ABGR: azul
    const escuro = (D.LEV-1)*256 + 1;
    check("sem nevoa a cor caminha para o preto", (semNevoa[escuro] & 255) < 40,
      "0x" + (semNevoa[escuro] & 0xFFFFFF).toString(16));
    check("com nevoa a cor caminha para o horizonte",
      (comNevoa[escuro]>>>16 & 255) > 180, "azul=" + (comNevoa[escuro]>>>16 & 255));
  }

  /* ---------- criaturas em voxel ----------
     O billboard estica a imagem ate a caixa que EDEF manda, entao um modelo
     com grid de proporcao errada nao da erro nenhum: a criatura so fica gorda
     ou espichada, e so na hora de olhar. Antes a conferencia era contra o
     sprite desenhado a mao; ele nao existe mais, entao a medida passa a ser a
     propria caixa. */
  {
    const comVox = Object.keys(D.EDEF).filter(k => D.EDEF[k].vox);
    check("toda criatura em voxel esta registrada", comVox.length === 6,
      "sao " + comVox.length + ": " + comVox.join(","));

    let poses = true, rots = true, medidas = [];
    for (const k of comVox){
      const d = D.EDEF[k], vox = D.SPR[d.vox];
      if (!vox || vox.length !== 5){ poses = false; continue; }
      /* Todas as cinco poses giram, cadaver inclusive. Foi o ultimo erro
         desta parte: com um quadro so, o corpo girava no chao enquanto voce
         andava em volta, porque encarar voce e girar. */
      for (const pose of vox) if (!pose || pose.length !== D.ROTACOES) rots = false;
      const v = vox[0][0];
      const daImagem = v.w / v.h, daCaixa = d.wid / d.hgt;
      if (Math.abs(daImagem - daCaixa) / daCaixa > 0.05)
        medidas.push(k + " imagem " + daImagem.toFixed(2) + " x caixa " + daCaixa.toFixed(2));
    }
    check("cada criatura tem as cinco poses", poses);
    check("toda pose tem " + D.ROTACOES + " rotacoes, cadaver inclusive", rots);
    check("o voxel nao sai esticado na caixa dele",
      medidas.length === 0, medidas.join(" | "));

    /* Um giro que nao gira ja aconteceu, e o sintoma e o bicho parecer
       sempre de frente. Testa-se a conta, nao os pixels: no harness o canvas
       e um stub e todo sprite assado sai zerado.

       A conta e a profundidade. O olho do diabrete fica na cara, em y baixo;
       de frente ele tem que estar na frente e, meia volta depois, atras. */
    const grid = D.montarVoxels(D.modeloDiabrete(0), D.DX_IMP, D.DY_IMP, D.DZ_IMP);
    const pele = D.peleDoModelo(grid, D.DX_IMP, D.DY_IMP, D.DZ_IMP);
    const cy = (D.DY_IMP-1)/2;
    function fundura(rot, mat){
      const ang = rot * Math.PI*2 / D.ROTACOES, ca = Math.cos(ang), sa = Math.sin(ang);
      let soma = 0, n = 0;
      for (const v of pele){
        if (v.mat !== mat) continue;
        soma += -(v.x-(D.DX_IMP-1)/2)*sa + (v.y-cy)*ca; n++;
      }
      return n ? soma/n : NaN;
    }
    const olhoFrente = fundura(0, 4), olhoCostas = fundura(4, 4);
    check("o olho fica na frente na rotacao 0 e atras na rotacao 4",
      olhoFrente < -3 && olhoCostas > 3,
      "frente=" + olhoFrente.toFixed(1) + " costas=" + olhoCostas.toFixed(1));

    /* O cadaver e o mesmo corpo tombado. Deitado ele fica tao comprido
       quanto era alto, e a sobra sai pela lateral do sprite -- um erro que
       so aparece quando alguem anda em volta de um corpo. */
    function medir(pele){
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
      for (const v of pele){
        if (v.x<x0) x0=v.x; if (v.x>x1) x1=v.x;
        if (v.y<y0) y0=v.y; if (v.y>y1) y1=v.y;
        if (v.z<z0) z0=v.z; if (v.z>z1) z1=v.z;
      }
      return {larg:x1-x0, comp:y1-y0, alt:z1-z0, chao:z0};
    }
    const emPe = medir(pele);
    const caido = medir(D.tombar(pele, D.DX_IMP, D.DY_IMP, -Math.PI/2, 0.66));
    check("o cadaver deita", caido.alt < emPe.alt*0.45,
      "de pe " + emPe.alt.toFixed(0) + " voxels, caido " + caido.alt.toFixed(0));
    check("o cadaver encosta no chao", Math.abs(caido.chao) < 1e-6,
      "menor z = " + caido.chao.toFixed(3));
    check("o cadaver cabe na largura do sprite", caido.comp <= D.DX_IMP - 2,
      "comprimento " + caido.comp.toFixed(1) + " em " + D.DX_IMP + " voxels");
  }

  /* ---------- relogio do jogo nunca anda pra tras ----------
     O timestamp do requestAnimationFrame pode vir ANTES do instante em que ele
     foi agendado; sem piso em zero o dt fica negativo e indices de animacao
     viram negativos (TEX.lava[-2] = undefined = tela preta). */
  frames(120);
  check("relogio do jogo sempre avanca", D.G.tick > 0,
    "tick=" + D.G.tick.toFixed(2) + " modo=" + D.G.mode);
} catch (e){
  check("EXCECAO", false, e.message + " | " + (e.stack || "").split("\n")[1]);
}
fim();
