/* Testes das regras do personagem: pontos, o disco, as especializacoes e
   suas arvores, a traicao, experiencia, morte, mago e as receitas. Nao
   precisa do jogo montado.
   Uso: node mundo-perigoso/teste/regras.test.js */
const fs = require("fs");
const path = require("path");
const G = require("../src/regras.js");
const { placar } = require("./harness");
const { check, fim } = placar();
const R = G.REGRAS, D = G.DISCO;
const perto = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-9);
const receita = id => G.RECEITAS.find(r => r.id === id);
const opc = rec => ({especializacao: rec.especializacao, caidas: rec.caidas});
const ramo = (cod, b, de, ate) => { const l = []; for (let p=de; p<=ate; p++) l.push(cod + b + "-" + p); return l; };

/* 1. experiencia: a curva do Tibia */
check("nivel 1 comeca em zero", G.xpDoNivel(1) === 0);
check("nivel 2 pede 100", G.xpDoNivel(2) === 100);
check("nivel 8 pede 4200", G.xpDoNivel(8) === 4200);
check("nivel da experiencia desfaz a experiencia do nivel",
  [1, 2, 20, 60, 99].every(n => G.nivelDaXp(G.xpDoNivel(n)).nivel === n));
check("nivel nao passa do teto", G.nivelDaXp(1e15).nivel === R.nivelMax);

/* 2. pontos */
check("nivel 100 tem 307 pontos de atributo", G.pontosDeAtributo(100) === 307);
check("nivel 100 tem 100 pontos de habilidade", G.pontosDeHabilidade(100) === 100);
check("atributo de 5 a 50 custa 145", G.custoAtributoAte(5, 50) === 145);
check("atributo nao passa de 60", G.montar({atributos: Array(80).fill("FOR"), nos: []}, 100, {}).atributos.FOR === 60);

/* 3. o disco */
check("o disco tem o centro e 61 nos por fatia", D.nos.length === 1 + 6 * 61, "nos " + D.nos.length);
const todos = Object.keys(D.porId);
check("todo id e unico", new Set(D.nos.map(n => n.id)).size === D.nos.length);
check("toda ligacao vai e volta", todos.every(id => D.viz[id].every(v => D.viz[v].includes(id))));
{
  const visto = new Set(["centro"]), fila = ["centro"];
  while (fila.length) for (const v of D.viz[fila.pop()]) if (!visto.has(v)){ visto.add(v); fila.push(v); }
  check("do centro se chega em todo no, das arvores inclusive", visto.size === todos.length, visto.size + " de " + todos.length);
}
check("a volta alterna marcial e magica", G.FATIAS.every((f, i) => f.tipo !== G.FATIAS[(i + 1) % 6].tipo));
check("a armadura do guerreiro encosta no clerigo pela ponte",
  D.porId["G2-12"].ramoNome === "Armadura" && D.viz["G2-12"].includes("C0-12"));
check("quatro pericias grandes por ramo", D.nos.filter(n => n.tipo === "notavel").length === 6 * 3 * 4);

/* 4. comprar anda pelo disco */
{
  const e0 = G.montar({atributos: [], nos: ["G0-1"]}, 10, {});
  check("no sem caminho nao entra nem gasta ponto", e0.invalidos.length === 1 && !e0.donos["G0-1"] && e0.gastoHab === 0);
  const e1 = G.montar({atributos: [], nos: ["G", "G0-1", "G0-2"]}, 10, {});
  check("do centro para fora, um ponto por no", e1.gastoHab === 3 && e1.porFatia[0] === 3 && e1.sobraHab === 7);
  check("o centro vem de graca", e1.donos.centro === true);
  const e2 = G.montar({atributos: [], nos: ["G", "G0-1", "G0-2", "G0-3"]}, 2, {});
  check("compra so o que cabe na verba", e2.gastoHab === 2 && e2.esperaNos === 2);
}

/* 5. especializacoes */
{
  const pares = G.ESPECIALIZACOES.filter(e => e.tipo === "par"), trios = G.ESPECIALIZACOES.filter(e => e.tipo === "trio");
  check("quinze pares e vinte trios", pares.length === 15 && trios.length === 20);
  const chaves = new Set(pares.map(e => e.fatias.slice().sort().join("-")));
  check("todo par de fatias tem uma so especializacao", chaves.size === 15);
  check("vizinhas pedem 15, a duas fatias 18, opostas 20",
    G.ESP_POR_ID.paladino.exige === 15 && G.ESP_POR_ID.duelista.exige === 18 && G.ESP_POR_ID["guerreiro-mistico"].exige === 20);
  const trio = {atributos: [], nos: []};
  for (const cod of ["G", "C", "M"]) trio.nos.push(cod, ...ramo(cod, 0, 1, 14));
  check("trio com 15 em cada fatia abre no nivel 45, nao no 44",
    G.montar(trio, 45, {especializacao: "trio-gcm"}).espAberta && !G.montar(trio, 44, {especializacao: "trio-gcm"}).espAberta);
}

/* 6. a arvore propria de cada especializacao */
{
  const pares = G.ESPECIALIZACOES.filter(e => e.tipo === "par"), trios = G.ESPECIALIZACOES.filter(e => e.tipo === "trio");
  check("cada par tem arvore de 9 nos e cada trio de 10",
    pares.every(e => D.arvores[e.id].length === 9) && trios.every(e => D.arvores[e.id].length === 10));
  check("as arvores ficam por fora do disco", todos.every(id => !D.porId[id].esp || D.porId[id].anel > 21));
  check("as portas do paladino ficam na ponta da armadura do guerreiro e da protecao do clerigo",
    D.viz["+paladino-1"].includes("G2-20") && D.viz["+paladino-7"].includes("C0-20"));
  check("so a porta encosta no disco, e sempre na ponta de um ramo",
    G.ESPECIALIZACOES.every(e => D.arvores[e.id].every(n =>
      D.viz[n.id].filter(v => !D.porId[v].esp).every(v => D.porId[v].pos === R.tamanhoRamo) &&
      (n.tipo === "porta") === D.viz[n.id].some(v => !D.porId[v].esp))));
  const gla = D.arvores["trio-gla"].filter(n => n.tipo === "porta").map(n => n.ponta).sort().join(" ");
  check("o trio alternado guerreiro, ladino e arqueiro tambem tem arvore, com tres portas",
    gla === "A0-20 G2-20 L1-20", gla);

  const quinze = {atributos: [], nos: ["G", ...ramo("G", 2, 1, 14), "C", ...ramo("C", 0, 1, 14)]};
  const aberto = G.montar(quinze, 100, {especializacao: "paladino"});
  check("15 em guerreiro e 15 em clerigo abrem o paladino", aberto.espAberta && aberto.gastoHab === 30);
  const semPonta = {atributos: [], nos: quinze.nos.concat(["+paladino-1"])};
  check("a especializacao aberta nao basta: a porta pede a ponta do ramo",
    G.montar(semPonta, 100, {especializacao: "paladino"}).invalidos.some(i => i.id === "+paladino-1" && i.motivo === "sem caminho"));
  const comPonta = {atributos: [], nos: quinze.nos.concat(ramo("G", 2, 15, 20), ["+paladino-1", "+paladino-2", "+paladino-7"])};
  const dentro = G.montar(comPonta, 100, {especializacao: "paladino"});
  check("com a ponta comprada entra, e de dentro chega a outra porta",
    dentro.espComprados === 3 && dentro.invalidos.length === 0, "arvore " + dentro.espComprados);
  check("no da arvore de outra especializacao nao entra",
    G.montar(comPonta, 100, {especializacao: "teurgo"}).invalidos.some(i => i.motivo === "outra especialização"));
  check("arvore de especializacao fechada nao entra",
    G.montar({atributos: [], nos: ["G", ...ramo("G", 2, 1, 20), "+paladino-1"]}, 100, {especializacao: "paladino"})
      .invalidos.some(i => i.motivo === "fechada"));
  check("devolver a ponta de um ramo e aceito sem arvore", G.podeDevolver(quinze, "G2-14", {especializacao: "paladino"}));
  check("devolver a ponta que sustenta a porta e recusado", !G.podeDevolver(comPonta, "G2-20", {especializacao: "paladino"}));
  check("devolver o no que mantem a especializacao aberta e recusado", !G.podeDevolver(comPonta, "C0-14", {especializacao: "paladino"}));
  check("devolver a entrada com ramo comprado e recusado", !G.podeDevolver(comPonta, "G", {especializacao: "paladino"}));
}

/* 7. receitas */
for (const rec of G.RECEITAS){
  const p = G.planoDaReceita(rec);
  const e = G.montar(p, 100, opc(rec));
  const alvo = Object.keys(rec.atributos).every(id => e.atributos[id] === rec.atributos[id]);
  check("receita " + rec.id + " cabe inteira no nivel 100",
    alvo && e.esperaNos === 0 && e.invalidos.length === 0 && e.sobraHab === 0 && e.sobraAtr <= 2 &&
    (!rec.especializacao || (e.espAberta && e.espComprados === e.tamanhoArvore)),
    "nos " + e.gastoHab + ", sobra " + e.sobraHab + ", invalidos " + e.invalidos.length + ", arvore " + e.espComprados);
  let limpo = true;
  for (let n=1; n<=100; n++) if (G.montar(p, n, opc(rec)).invalidos.length) limpo = false;
  check("receita " + rec.id + " nunca tem compra invalida em nivel nenhum", limpo);
}
{
  const pal = receita("paladino"), p = G.planoDaReceita(pal);
  check("o paladino abre no nivel 30", G.montar(p, 30, opc(pal)).espAberta && !G.montar(p, 29, opc(pal)).espAberta);
  check("e pisa na arvore no 37, com a armadura na ponta",
    G.montar(p, 36, opc(pal)).espComprados === 0 && G.montar(p, 37, opc(pal)).espComprados === 1);
  const gm = receita("guerreiro-mistico"), q = G.planoDaReceita(gm);
  check("o guerreiro mistico, oposto, abre no nivel 40", G.montar(q, 40, opc(gm)).espAberta && !G.montar(q, 39, opc(gm)).espAberta);
}

/* 8. a traicao: o necromante toma o lugar do clerigo */
{
  const Mc = G.mundo(["necromante"]);
  check("o mundo sem traicao e o de sempre", G.mundo() === G.MUNDO && G.mundo([]).fatias[1].id === "clerigo");
  check("o necromante toma o lugar do clerigo no disco",
    Mc.fatias[1].id === "necromante" && !!Mc.disco.porId["N0-12"] && !Mc.disco.porId["C0-12"] && Mc.disco.nos.length === D.nos.length);
  const comN = Mc.especializacoes.filter(e => e.fatias.includes(1));
  check("cinco hibridos e dez trios com o necromante",
    comN.filter(e => e.tipo === "par").length === 5 && comN.filter(e => e.tipo === "trio").length === 10);
  const cav = Mc.espPorId["cavaleiro-da-morte"];
  check("necromante com guerreiro da o cavaleiro da morte, que espelha o paladino",
    !!cav && cav.espelha === "paladino" && cav.exige === 15 && !Mc.espPorId.paladino);

  const pal = receita("paladino"), p = G.planoDaReceita(pal);
  const antes = G.montar(p, 70, opc(pal));
  const t = G.converter(p, "paladino", "necromante", true);
  const depois = G.montar(t.plano, 70, {especializacao: t.especializacao, caidas: ["necromante"]});
  check("trair nao perde ponto nem no da arvore",
    t.especializacao === "cavaleiro-da-morte" && depois.gastoHab === antes.gastoHab &&
    depois.espComprados === antes.espComprados && depois.invalidos.length === 0);
  const volta = G.converter(t.plano, t.especializacao, "necromante", false);
  check("desfazer a traicao devolve a mesma build", volta.especializacao === "paladino" && volta.plano.nos.join(" ") === p.nos.join(" "));
  check("o plano do clerigo nao vale depois da traicao",
    G.montar(p, 70, {especializacao: "paladino", caidas: ["necromante"]}).invalidos.some(i => i.motivo === "desconhecido"));
  check("trio com o clerigo vira o mesmo trio com o necromante",
    G.converter({atributos: [], nos: []}, "trio-gcl", "necromante", true).especializacao === "trio-gnl");
}

/* 9. morte e mago */
{
  const perdido = (n0, r) => n0 - (r.nivel + r.progresso);
  check("morrer no nivel 60 tira perto de um nivel", perto(perdido(60, G.perderXp(60, 0, R.morte)), 1, 0.1));
  check("morrer sai mais caro que o mago em qualquer nivel",
    [5, 20, 60, 99].every(n0 => perdido(n0, G.perderXp(n0, 0.5, R.morte)) > perdido(n0, G.perderXp(n0, 0.5, R.mago))));
  check("o ouro do mago dobra a cada uso", G.magoMinutos(0) === 20 && G.magoMinutos(3) === 160);
  const pal = receita("paladino"), p = G.planoDaReceita(pal);
  const antes = G.montar(p, 60, opc(pal)), r = G.perderXp(60, 0, R.morte), depois = G.montar(p, r.nivel, opc(pal));
  check("a morte tira os ultimos nos comprados", depois.gastoHab < antes.gastoHab &&
    depois.ordem.every((id, k) => antes.ordem[k] === id));
}

/* 10. o que tudo isso da */
{
  check("sorte 40: 20% de chance e 190% de dano", perto(G.critico(40).chance, 20) && G.critico(40).dano === 190);
  const vel = id => { const rec = receita(id);
    return G.derivar(G.montar(G.planoDaReceita(rec), 100, opc(rec)), rec.equipamento, rec.escudo).velocidade; };
  check("paladino de placas e mais lento que hoje", vel("paladino") < 100,
    G.RECEITAS.map(r => r.id + " " + vel(r.id).toFixed(0)).join(", "));
  check("ladino e mais rapido que guerreiro", vel("ladino") > vel("guerreiro"));
  const pal = receita("paladino");
  const d = G.derivar(G.montar(G.planoDaReceita(pal), 100, opc(pal)), "placas", true);
  check("escudo so bloqueia com escudo na mao", d.bloqueio > 0 &&
    G.derivar(G.montar(G.planoDaReceita(pal), 100, opc(pal)), "placas", false).bloqueio === 0);
  const cav = receita("cavaleiro-da-morte");
  const dc = G.derivar(G.montar(G.planoDaReceita(cav), 100, opc(cav)), "placas", true);
  check("o no do necromante conta no que o personagem da", dc.vida > 0 && dc.vida !== d.vida, dc.vida + " contra " + d.vida);
  check("efeito vira texto", G.textoDoEfeito({vida: 8, velocidade: 0.25}) === "+8 de vida, +0,25% de velocidade");
}

/* 11. a build em texto */
{
  const rec = receita("arqueiro-arcano");
  const b = {nivel: 42, progresso: 0.37, especializacao: rec.especializacao, equipamento: "couro",
             escudo: false, esquecimentos: 2, plano: G.planoDaReceita(rec)};
  const t = G.escreverBuild(b), lido = G.lerBuild(t);
  check("build escrita e lida de volta sem erro", lido.erro === null, lido.erro);
  check("ida e volta devolve o mesmo texto", lido.build && G.escreverBuild(lido.build) === t);
  check("no desconhecido diz qual", /desconhecido Z9-9/.test(G.lerBuild(t.replace("nos A", "nos Z9-9 A")).erro || ""));
  check("build da roda antiga e recusada com o motivo", /roda antiga/.test(G.lerBuild("BUILD 1\nnivel 3 0").erro || ""));
  const cav = receita("cavaleiro-da-morte");
  const tc = G.escreverBuild({nivel: 50, progresso: 0, especializacao: cav.especializacao, caidas: cav.caidas,
                              equipamento: "placas", escudo: true, esquecimentos: 0, plano: G.planoDaReceita(cav)});
  const lc = G.lerBuild(tc);
  check("build de caido e lida de volta igual", lc.erro === null && G.escreverBuild(lc.build) === tc, lc.erro);
  check("no do necromante sem a traicao e recusado",
    /desconhecido N/.test(G.lerBuild(tc.replace("caidas necromante", "caidas -")).erro || ""));
}

/* 12. ASCII puro, como o resto do fonte */
for (const f of ["src/regras.js", "simulador/simulador.html", "simulador/simulador.js"]){
  const p = path.join(__dirname, "..", f);
  if (!fs.existsSync(p)){ check(f + " existe", false); continue; }
  const s = fs.readFileSync(p, "utf8");
  const k = s.split("").findIndex(c => c.charCodeAt(0) > 127);
  check(f + " e ASCII puro", k < 0, k < 0 ? "" : "posicao " + k);
}

/* classes por quest (27/9): talentos, classes, secundario, segunda classe, queda */
{
  const T = G.TALENTOS, C = G.CLASSES;
  check("seis talentos e sete primeiras classes", T.length === 6 && C.length === 7);
  check("todo talento leva a uma classe que existe, e toda classe vem de um talento",
    T.every(t => t.classes.every(c => G.CLASSE_POR_ID[c] && G.CLASSE_POR_ID[c].talento === t.id)) &&
    C.every(c => T.some(t => t.classes.includes(c.id))));
  check("adaga e arco deixa escolher arqueiro ou ladino", T.find(t => t.id === "adaga-e-arco").classes.join() === "arqueiro,ladino");
  const todas = [];
  for (const c of C) for (const t of G.secundariosDe(c.id)) todas.push(G.segundaClasse(c.id, t));
  check("toda classe pega os cinco outros talentos, e cada par da uma segunda classe: 35",
    C.every(c => G.secundariosDe(c.id).length === 5) && todas.length === 35 && todas.every(Boolean));
  check("as 35 segundas classes tem nome e id sem repetir",
    new Set(todas.map(s => s.id)).size === 35 && new Set(todas.map(s => s.nome)).size === 35);
  check("a ordem importa: guerreiro com sagrada e paladino, clerigo com uma mao e escudo e templario",
    G.segundaClasse("guerreiro", "sagrada").id === "paladino" && G.segundaClasse("clerigo", "uma-mao-e-escudo").id === "templario");
  check("o secundario nao pode ser o proprio talento", G.segundaClasse("ladino", "adaga-e-arco") === null &&
    G.segundaClasse("clerigo", "sagrada") === null && !G.secundariosDe("arqueiro").includes("adaga-e-arco"));
  const podem = [{id: "clerigo", cai: true}].concat(todas.map(s => ({id: s.id, cai: G.temSagrada(s.classe, s.secundario)})));
  check("cai quem tem magia sagrada, principal ou secundaria, e so quem tem: 12",
    podem.every(p => !!G.queda(p.id) === p.cai) && Object.keys(G.QUEDAS).length === 12);
  check("o clerigo cai para necromante, o paladino para cavaleiro da morte e o inquisidor para carrasco",
    G.queda("clerigo").id === "necromante" && G.queda("paladino").id === "cavaleiro-da-morte" && G.queda("inquisidor").id === "carrasco");
  const p20 = G.pontosDeCaminho(20), p22 = G.pontosDeCaminho(22), p100 = G.pontosDeCaminho(100);
  check("ate a quest (nivel 20) e aprendiz: 20 pontos no principal, nenhum no secundario",
    p20.principal === 20 && p20.secundario === 0 && p20.aprendiz && !p22.aprendiz);
  check("depois da quest, 1 no secundario a cada dois niveis: nivel 22 da 1", p22.principal === 22 && p22.secundario === 1);
  check("no nivel 100, 100 no principal e 40 no secundario", p100.principal === 100 && p100.secundario === 40);
  check("o secundario vai ate a metade do circulo", G.limiteDoSecundario(61) === 30);
}

fim();
