/* Testes do mapa do editor rodando no motor: a traducao de ilha.js, as
   texturas por terreno, o ceu da tarde e a geometria ao ar livre.
   Uso: node mundo-perigoso/teste/ilha.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const CHAVE = (fs.readFileSync(path.join(__dirname, "..", "src", "ilha.js"), "utf8")
  .match(/CHAVE_MAPA_JOGAR = "([^"]+)"/) || [])[1];

const ch = c => M.TERRENO_POR_CHAR[c];
function ilhaDeTeste(comJogador){
  const m = M.novoMapa(40, 40, {nome:"teste"});        // mar no degrau 4, fundo 0
  const pinta = (x0, y0, x1, y1, c, h, teto) => {
    for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++){
      const i = y*40 + x;
      m.terreno[i] = ch(c);
      if (h !== undefined) m.altura[i] = h;
      if (teto !== undefined) m.teto[i] = teto;
    }
  };
  pinta(8, 8, 31, 31, "-", 3);        // agua rasa em volta
  pinta(10, 10, 29, 29, ":", 4);      // praia no nivel do mar
  pinta(13, 13, 26, 26, ",", 4);      // grama
  pinta(15, 15, 19, 19, ",", 12);     // morro: penhasco de oito degraus
  pinta(22, 14, 25, 17, "#", 4);      // bloco de pedra
  pinta(20, 20, 25, 24, "H", 4);      // casa de madeira...
  pinta(21, 21, 24, 23, "=", 4, 5);   // ...com forro a cinco degraus
  m.terreno[24*40 + 22] = ch("D");    // porta na parede de baixo
  pinta(13, 28, 18, 28, "n", 4);      // cerca na praia
  const poe = (x, y, tipo, texto) => m.coisas.push({x, y, tipo, texto: texto || ""});
  poe(14, 22, "arvore"); poe(14, 13, "pinheiro"); poe(14, 24, "arbusto"); poe(12, 20, "pedra");
  poe(23, 22, "barril"); poe(21, 21, "caixote"); poe(11, 15, "lampiao"); poe(27, 20, "poco");
  poe(13, 25, "placa", "Porto Velho"); poe(22, 22, "npc", "Teste, o morador");
  poe(27, 24, "entrada", "Cripta"); poe(25, 26, "saida");
  if (comJogador) m.coisas.push({x:12, y:12, tipo:"jogador", texto:""});
  return m;
}
const perto = (a, b) => Math.abs(a - b) < 1e-4;
const abrir = (texto, busca) => carregar(arquivo, {
  busca: busca === undefined ? "?mapa=editor" : busca,
  armazenamento: texto === null ? {} : {[CHAVE]: texto}
});

(async () => {
  try {
    check("ilha.js e o canteiro usam a mesma chave", !!CHAVE &&
      fs.readFileSync(path.join(__dirname, "..", "canteiro", "arquivos.js"), "utf8").includes('"' + CHAVE + '"'));

    /* 1. carrega no lugar da cripta */
    const texto = M.escreverMapa(ilhaDeTeste(true));
    const { D, frames } = abrir(texto);
    check("o mapa do editor toma o lugar da cripta",
      D.MW === 40 && D.MH === 40 && D.ILHA && D.ILHA.nome === "teste", "MW=" + D.MW + " MH=" + D.MH);
    check("jogador nasce no inicio marcado",
      perto(D.P.x, 12.5) && perto(D.P.y, 12.5) && perto(D.P.z, 1.0), D.P.x + "," + D.P.y + " z=" + D.P.z);
    check("jogador olha para o sol, a oeste", perto(D.P.ang, Math.PI));

    /* 2. alturas */
    check("areia no nivel do mar", perto(D.floorAt(12, 12), 1.0));
    check("agua rasa afunda o pe", perto(D.floorAt(9, 9), 1.0 - 0.12), "piso=" + D.floorAt(9, 9));
    check("agua funda fica na superficie, nao no fundo", perto(D.floorAt(2, 2), 1.0 - 0.12));
    check("agua funda nao se anda", D.tileBlocks(2, 2, 0.88, 0.85) === true);
    check("agua rasa se anda", D.tileBlocks(9, 9, 0.88, 0.85) === false);
    check("penhasco do morro tem oito degraus", perto(D.floorAt(17, 17), 3.0));
    check("parede vira bloco da altura padrao", perto(D.floorAt(23, 15), 1.0 + 6*0.25), "piso=" + D.floorAt(23, 15));
    check("parede nao se sobe nem no alto do pulo", D.tileBlocks(23, 15, 1.0 + 0.83, 0.85) === true);
    check("cerca e parede baixa, de dois degraus", perto(D.floorAt(15, 28), 1.5), "piso=" + D.floorAt(15, 28));
    check("cerca nao se passa andando, mas se pula", D.tileBlocks(15, 28, 1.0, 0.85) === true &&
      D.tileBlocks(15, 28, 1.2, 0.85) === false);
    check("ao ar livre nao ha teto", D.CEUZ[12*40 + 12] === 1);

    /* 3. casa */
    check("casa tem forro", D.CEUZ[22*40 + 22] === 0 && perto(D.ceilAt(22, 22), 1.0 + 1.25), "teto=" + D.ceilAt(22, 22));
    check("telhado fica um degrau acima do forro, na altura da parede",
      perto(D.TOPOZ[22*40 + 22], 2.5) && perto(D.floorAt(20, 22), 2.5));
    const TZ = (x, y) => D.TELHADO_Z[y*41 + x];
    let cumeeira = 0;
    for (let y=20; y<=25; y++) for (let x=20; x<=26; x++) cumeeira = Math.max(cumeeira, TZ(x, y));
    check("o telhado cobre as paredes da casa, cantos e porta inclusive",
      D.NO_TELHADO[20*40 + 20] === 2 && D.NO_TELHADO[22*40 + 22] === 1 && D.NO_TELHADO[24*40 + 22] === 1 &&
      D.NO_TELHADO[19*40 + 19] === 0);
    check("o telhado e de quatro aguas: beira no alto da parede, cumeeira dois tiles para dentro",
      perto(TZ(20, 20), 2.5) && perto(TZ(26, 25), 2.5) && perto(cumeeira, 3.5), "cumeeira=" + cumeeira);
    check("muro sem casa e cerca nao ganham telhado", D.NO_TELHADO[15*40 + 23] === 0 && D.NO_TELHADO[28*40 + 15] === 0);
    check("porta vira porta do motor", D.cellAt(22, 24) === "D" && !!D.doors.get(24*40 + 22));

    /* 4. texturas e ceu */
    check("todo terreno tem piso, parede, forro e telhado", D.REG.length === M.TERRENOS.length &&
      D.REG.every(r => D.TEX[r.floor] && D.TEX[r.wall] && D.TEX[r.ceil] && D.TEX[r.telhado]));
    const pisoRasa = D.TEX[D.REG[ch("-")].floor];
    check("agua anima em quatro quadros", Array.isArray(pisoRasa) && pisoRasa.length === 4);
    check("parede de terreno nunca e animada", D.REG.every(r => !Array.isArray(D.TEX[r.wall])));
    check("o ceu da ilha da a volta inteira de uma vez", D.SKY_W === D.SKY_VOLTA);
    check("a ilha desenha o dobro da cripta", D.FAR === 60, "FAR=" + D.FAR);
    check("bruma limpa perto e fechada no fim do alcance",
      D.lightAt(D.FAR*0.1) <= 1 && D.lightAt(D.FAR - 0.1) >= 14,
      "perto:" + D.lightAt(D.FAR*0.1) + " fim:" + D.lightAt(D.FAR - 0.1));

    /* 4b. cenario */
    const cenas = D.ents.filter(e => e.kind === "cena");
    const tiposCena = Object.keys(D.CENARIO);
    check("todo tipo de cenario do editor vira entidade com imagem",
      tiposCena.every(t => cenas.some(e => e.type === t && e.img && e.img.px && e.img.px.length)),
      "faltam: " + tiposCena.filter(t => !cenas.some(e => e.type === t)).join(","));
    check("o cenario cabe no tamanho do voxel das criaturas",
      cenas.every(e => e.larg > 0.2 && e.alto > 0.3 && e.alto < 2.6));
    const arvore = cenas.find(e => e.type === "arvore");
    check("arvore barra a passagem", D.blocked(arvore.x, arvore.y, 0.2, arvore.z, 0.85) === true);
    check("um tile ao lado da arvore passa", D.blocked(arvore.x + 1.2, arvore.y, 0.2, arvore.z, 0.85) === false);
    const arbusto = cenas.find(e => e.type === "arbusto");
    check("arbusto nao barra", D.blocked(arbusto.x, arbusto.y, 0.2, arbusto.z, 0.85) === false);
    check("arvore sai do centro do tile, porta nao", !(arvore.x === 14.5 && arvore.y === 22.5) &&
      cenas.find(e => e.type === "barril").x === 23.5);

    /* 5. o motor desenha sem quebrar e sem faixa voando.
       O pedaco e montado quando entra no alcance, entao o primeiro quadro num
       lugar novo monta os dele; aqui eles saem antes, e o que se mede e o
       desenho. A montagem tem o teste dela, em refazer.test.js. */
    D.G.mode = "play";
    D.remontarSujos();
    let maiorZ = -1e9, telhado = false, ms = 0, quadros = 0;
    const texturas = new Set();
    const olhar = (x, y, z, ang, pitch) => {
      D.P.x = x; D.P.y = y; D.P.z = z; D.P.ang = ang; D.P.pitch = pitch;
      D.P.vx = D.P.vy = D.P.vz = 0;
      const t0 = Date.now(); frames(3); ms += Date.now() - t0; quadros += 3;
      for (let i=0; i<D.nQuads(); i++){
        /* uma face tem tres ou quatro cantos: o quad torto do telhado perto
           da cumeeira vira dois triangulos na montagem do pedaco */
        const q = D.QUADS[i], p = q.p;
        texturas.add(q.tex);
        let alto = -1e9;
        for (let v=0; v<q.n; v++) alto = Math.max(alto, p[3*v + 2]);
        maiorZ = Math.max(maiorZ, alto);
        const noForro = p[0] >= 21 && p[0] <= 24 && p[1] >= 21 && p[1] <= 23;
        if (noForro && alto > 2.6) telhado = true;
      }
    };
    for (let a=0; a<8; a++) olhar(12.5, 12.5, 1.0, a*Math.PI/4, 0);
    for (let a=0; a<8; a++) olhar(17.5, 17.5, 3.0, a*Math.PI/4, -0.4);
    for (const lado of [[22.5, 18.5, Math.PI/2], [22.5, 26.5, -Math.PI/2], [18.5, 22.5, 0], [27.5, 22.5, Math.PI]])
      olhar(lado[0], lado[1], 1.0, lado[2], 0);
    /* De perto e do chao a agua do telhado fica acima da linha do olho e
       atras da parede: a face esta de costas e nao e desenhada. De cima,
       dos quatro lados, as duas aguas aparecem. */
    for (const lado of [[22.5, 16.5, Math.PI/2], [22.5, 28.5, -Math.PI/2], [16.5, 22.5, 0], [29.5, 22.5, Math.PI]])
      olhar(lado[0], lado[1], 3.0, lado[2], -0.4);
    check("o motor roda a ilha sem excecao", true, quadros + " quadros");
    check("nenhuma parede sobe ate o ceu", maiorZ < 5, "maior z=" + maiorZ.toFixed(2));
    check("o telhado da casa sobe da beira ate a cumeeira", telhado);
    check("parede de casa ganha janela no meio e quina nas pontas",
      texturas.has(D.TEX.ilhaTabuaJanela) && texturas.has(D.TEX.ilhaTabuaQuina));
    check("o telhado tem uma agua virada para o sol e outra de costas",
      texturas.has(D.TEX.ilhaTelhadoSol) && texturas.has(D.TEX.ilhaTelhadoSombra));
    check("quadro da ilha abaixo de 50 ms", ms/quadros < 50, (ms/quadros).toFixed(1) + " ms");

    /* 5a. a face de costas nao e desenhada.
       Voando por cima da casa se ve o telhado e nao se ve o forro, que olha
       para baixo. Antes as duas iam para a tela e o z-buffer resolvia -- meio
       trabalho do rasterizador jogado fora. */
    {
      const forro = D.TEX[D.REG[ch("=")].ceil];
      D.P.noclip = true;
      olhar(22.5, 22.5, 6.0, Math.PI/2, -1.2);
      let temForro = false, temTelhado = false;
      for (let i=0; i<D.nQuads(); i++){
        const q = D.QUADS[i];
        if (q.tex === forro) temForro = true;
        if (q.tex === D.TEX.ilhaTelhadoSol || q.tex === D.TEX.ilhaTelhadoSombra || q.tex === D.TEX.ilhaTelhado) temTelhado = true;
      }
      check("de cima da casa aparece o telhado e nao o forro, que olha para baixo", temTelhado && !temForro,
        "telhado=" + temTelhado + " forro=" + temForro);
      D.P.noclip = false;
    }

    /* 5b. morador diz o nome */
    D.P.x = 21.5; D.P.y = 22.5; D.P.z = 1.0; D.P.vx = D.P.vy = D.P.vz = 0; D.G.msg = "";
    frames(2);
    check("morador diz o nome quando se chega perto", /TESTE, O MORADOR/.test(D.G.msg), "msg=" + D.G.msg);
    D.G.msg = ""; frames(2);
    check("e nao repete enquanto voce fica ali", D.G.msg === "", "msg=" + D.G.msg);

    /* 6. sem inicio marcado, o ponto mais alto */
    const alto = abrir(M.escreverMapa(ilhaDeTeste(false))).D;
    check("sem inicio, nasce no ponto mais alto onde se pisa",
      perto(alto.P.z, 3.0) && alto.P.x > 15 && alto.P.x < 20, "z=" + alto.P.z + " x=" + alto.P.x);

    /* 6b. comecar daqui: o editor pede o tile e o rumo */
    const daqui = abrir(texto, "?mapa=editor&inicio=11,20,270").D;
    check("comecar daqui nasce no tile pedido, olhando para onde se arrastou",
      perto(daqui.P.x, 11.5) && perto(daqui.P.y, 20.5) && perto(daqui.P.ang, 270*Math.PI/180),
      daqui.P.x + "," + daqui.P.y + " ang=" + daqui.P.ang.toFixed(2));
    const naArvore = abrir(texto, "?mapa=editor&inicio=14,22").D;
    check("pedido em cima de uma arvore nasce no tile livre mais perto, olhando para oeste",
      Math.hypot(naArvore.P.x - 14.5, naArvore.P.y - 22.5) < 1.01 &&
      !(perto(naArvore.P.x, 14.5) && perto(naArvore.P.y, 22.5)) && perto(naArvore.P.ang, Math.PI),
      naArvore.P.x + "," + naArvore.P.y);
    const noMar = abrir(texto, "?mapa=editor&inicio=2,2,0").D;
    check("pedido no mar fundo, longe da terra, cai no inicio marcado",
      perto(noMar.P.x, 12.5) && perto(noMar.P.y, 12.5), noMar.P.x + "," + noMar.P.y);

    /* 7. a cripta continua sendo a cripta */
    const semPedido = abrir(texto, "?mapa=cripta").D;
    check("?mapa=cripta abre a cripta, mesmo com mapa guardado",
      semPedido.MW === 40 && semPedido.MH === 32 && semPedido.ILHA === null);
    check("a cripta mantem o ceu de 256 repetido", semPedido.SKY_W === 256);
    check("a cripta mantem o alcance de 30 e nao assa cenario", semPedido.FAR === 30 && semPedido.CENARIO === null);
    const quebrado = abrir("MAPA 1\nlixo").D;
    check("mapa quebrado abre a cripta", quebrado.MW === 40 && quebrado.MH === 32);
    const vazio = abrir(null).D;
    check("pedido sem mapa guardado abre a cripta", vazio.MW === 40 && vazio.MH === 32);

    /* 8. mais de um mapa: a entrada desce, e terminar a dungeon volta */
    D.G.mode = "play"; D.G.viagem = undefined;
    D.P.x = 27.5; D.P.y = 25.3; D.P.z = 1.0; D.P.ang = -Math.PI/2;
    D.useDoor();
    check("a entrada leva ao mapa escrito nela, lembrando de onde se desceu",
      D.G.viagem === "?mapa=cripta&volta=editor,27,24", "viagem=" + D.G.viagem);
    /* sem endereco o jogo abre na ilha -- e um mapa esquecido pelo editor no
       navegador nao toma o lugar dela */
    const embutida = abrir(texto, "").D;
    check("sem endereco o jogo abre na ilha embutida, e nao no mapa guardado do editor",
      !!embutida.ILHA && embutida.NOME_DO_MAPA === "ilha" && embutida.MW === 200 &&
      embutida.ents.some(e => e.destino === "cripta"), "MW=" + embutida.MW);
    /* A fatia pequena: da chegada no pier se anda ate a entrada da cripta.
       Porto, estrada, portao, escadaria, praca e capela sao um caminho so; um
       degrau alto demais no meio dele deixaria o jogador preso no porto. */
    {
      const E = embutida, W = E.MW, ini = [Math.floor(E.P.x), Math.floor(E.P.y)];
      const visto = new Uint8Array(W*E.MH), pilha = [ini];
      visto[ini[1]*W + ini[0]] = 1;
      let chegou = false;
      while (pilha.length && !chegou){
        const [x, y] = pilha.pop();
        for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1]]){
          const nx = x + dx, ny = y + dy, k = ny*W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= E.MH || visto[k]) continue;
          if (E.cellAt(nx, ny) !== "D" && E.tileBlocks(nx, ny, E.floorAt(x, y), 0.85)) continue;
          visto[k] = 1; pilha.push([nx, ny]);
          if (Math.abs(nx - 101) <= 1 && Math.abs(ny - 75) <= 1) chegou = true;
        }
      }
      check("da chegada no pier se anda ate a entrada da cripta", chegou && ini[0] >= 150, "inicio " + ini);
    }
    /* 8b. trocar de mundo sem recarregar: a grade, o ceu, o alcance e a
       geometria sao remontados no lugar, e o jogo continua andando. */
    {
      const v = abrir(texto, "?mapa=editor"), E = v.D;
      E.G.mode = "play"; v.frames(2);
      const antes = [E.mw, E.FAR_AGORA, E.nQuads()];
      E.trocarMundo("?mapa=cripta");
      v.frames(3);
      const naCripta = E.mw === 40 && E.mh === 32 && E.FAR_AGORA === 30 && E.ILHA_AGORA === null;
      E.trocarMundo("?mapa=editor");
      v.frames(3);
      const devolta = E.mw === 40 && E.FAR_AGORA === 60 && !!E.ILHA_AGORA && E.nomeDoMapa() === "editor";
      check("trocar de mapa remonta o mundo sem recarregar a pagina",
        antes[0] === 40 && antes[1] === 60 && naCripta && devolta,
        "ida=" + naCripta + " volta=" + devolta);
      check("depois da ida e da volta a mesma vista tem as mesmas faces",
        E.nQuads() === antes[2] && antes[2] > 0, antes[2] + " antes, " + E.nQuads() + " depois");
    }

    /* 8c. a entrada e a saida em par: desce-se pela entrada, nasce-se ao
       lado da saida do mesmo par, e sobe-se por ela de volta ao lado da
       entrada -- sem guardar coordenada nenhuma no endereco. */
    {
      const ilha = ilhaDeTeste(true);
      const ent = ilha.coisas.find(c => c.tipo === "entrada");
      ent.texto = ""; ent.campos = {mapa: "porao", id: "alcapao"};
      const v = abrir(M.escreverMapa(ilha), "?mapa=editor"), E = v.D;
      E.G.mode = "play"; E.P.x = 27.5; E.P.y = 25.3; E.P.z = 1.0;
      E.useDoor();
      check("a entrada leva ao mapa do campo e diz o par por onde se chega",
        E.G.viagem === "?mapa=porao&volta=editor,27,24&chegada=alcapao", "viagem=" + E.G.viagem);
      /* a dungeon: uma sala de pedra com a saida do mesmo par num canto */
      const porao = M.novoMapa(16, 16, {nome: "porao", terreno: ch("+"), altura: 4, mar: null});
      for (let i = 0; i < 16; i++) for (const [x, y] of [[i, 0], [i, 15], [0, i], [15, i]]) porao.terreno[y*16 + x] = ch("#");
      porao.coisas.push({x: 4, y: 4, tipo: "saida", texto: "", campos: {mapa: "editor", id: "alcapao"}});
      porao.coisas.push({x: 11, y: 11, tipo: "jogador", texto: ""});
      E.trocarMundo("?mapa=porao&volta=editor,27,24&chegada=alcapao", porao);
      check("na dungeon, nasce-se ao lado da saida do par, e nao no inicio do mapa",
        Math.hypot(E.P.x - 4.5, E.P.y - 4.5) < 2, "em " + E.P.x + "," + E.P.y);
      const saida = E.ents.find(e => e.kind === "cena" && e.saida);
      check("a saida aparece no jogo, com a arcada da entrada e o aviso de subir",
        saida && saida.destino === "editor" && /Sa.da: editor/.test(saida.fala), saida ? saida.fala : "sem saida");
      E.G.mode = "play"; E.P.x = saida.x; E.P.y = saida.y + 0.8; E.P.z = E.floorAt(4, 5);
      E.useDoor();
      check("subir pela saida volta ao mapa do par, chegando pela entrada",
        E.G.viagem === "?mapa=editor&chegada=alcapao" && E.nomeDoMapa() === "editor" &&
        Math.hypot(E.P.x - 27.5, E.P.y - 24.5) < 2.5, "viagem=" + E.G.viagem + " em " + E.P.x + "," + E.P.y);
    }

    const atlantida = abrir(null, "?mapa=atlantida").D;
    check("mapa que nao existe abre a cripta", atlantida.ILHA === null && atlantida.MW === 40);
    const cripta = abrir(null, "?mapa=cripta&volta=ilha,101,75");
    cripta.D.G.mode = "play"; cripta.D.P.x = 37.5; cripta.D.P.y = 28.5; cripta.D.P.ang = 0;
    cripta.D.useDoor();
    const venceu = cripta.D.G.mode === "won";
    cripta.emit("janela", "keydown", {key: "e"});
    /* a volta nao recarrega a pagina: o mundo troca para a ilha ali mesmo */
    check("terminar a cripta oferece a volta para onde se desceu, sem recarregar",
      venceu && cripta.D.G.viagem === "?mapa=ilha&inicio=101,75" && cripta.D.G.mode === "play" &&
      cripta.D.nomeDoMapa() === "ilha" && Math.hypot(cripta.D.P.x - 101.5, cripta.D.P.y - 75.5) < 3,
      "viagem=" + cripta.D.G.viagem + " mapa=" + cripta.D.nomeDoMapa() + " em " + cripta.D.P.x + "," + cripta.D.P.y);

    /* 9. conversa e bolsa */
    const falaTeste = abrir(texto), F = falaTeste.D;
    const tecla = k => { falaTeste.emit("janela", "keydown", {key: k}); falaTeste.emit("janela", "keyup", {key: k}); };
    F.G.mode = "play";
    F.P.x = 21.5; F.P.y = 22.5; F.P.z = 1.0; F.P.vx = F.P.vy = F.P.vz = 0; F.P.ground = true;
    falaTeste.frames(2);
    tecla("Enter"); ["o", "i", "w", "w"].forEach(tecla);
    falaTeste.frames(10);
    check("com a linha de fala aberta, W escreve e nao anda",
      F.G.falaAberta && F.G.falaTexto === "oiww" && Math.abs(F.P.y - 22.5) < 0.01, "texto=" + F.G.falaTexto);
    tecla("Backspace"); tecla("Backspace"); tecla("Enter"); falaTeste.frames(1);
    const ultima = F.G.conversa[F.G.conversa.length - 1];
    check("oi perto do morador tem resposta, com o primeiro nome dele",
      !F.G.falaAberta && !!ultima && ultima.quem === "Teste" && ultima.fala === "Olá, forasteiro.", JSON.stringify(ultima));
    F.P.bolsa.pocao = 1; F.P.hp = 50;
    tecla("4"); falaTeste.frames(1);
    check("4 usa a pocao da bolsa", F.P.hp === 75 && F.P.bolsa.pocao === 0, "hp=" + F.P.hp);
    tecla("4"); falaTeste.frames(1);
    check("sem pocao na bolsa, 4 nao cura", F.P.hp === 75);
    tecla("b"); falaTeste.frames(2);
    check("B abre a bolsa", F.G.bolsaAberta === true);
  } catch (e) {
    check("sem excecao", false, e.stack);
  }
  fim();
})();
