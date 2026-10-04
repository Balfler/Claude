/* Monta o jogo e o provador: concatena os modulos de src/ em HTML unicos.
   A saida vai para a raiz do repositorio porque e o caminho que o README e
   o .claude/launch.json ja usam (servidor "cripta", porta 8123).

   Uso:  node mundo-perigoso/build.js            (monta)
         node mundo-perigoso/build.js --check    (so confere se esta atualizado) */
const fs = require("fs");
const path = require("path");

const AQUI = __dirname;
const SRC = path.join(AQUI, "src");

/* A ordem importa: p2b usa REG/regionOf que vivem em p5, mas so em tempo de
   execucao. O que nao pode e um const ser usado antes de existir no carregamento. */
const JOGO = [
  "p1.html",   // pagina, CSS, moldura
  "mapa.js",   // formato de mapa, o mesmo do editor
  "@mapas",    // os mapas de mapas/, embutidos -- ver mapasEmbutidos
  "ilha.js",   // mapa vindo do editor, traduzido para o motor
  "cores.js",  // paleta, COLORMAP e o indexador -- puro, o node tambem usa
  "pintor.js", // o pintor de texturas sem canvas: tabua, pedra, telha
  "estilos.js",// os estilos de peca: materiais como receita de textura
  "pecas.js",  // os tipos de peca: forma e solidos
  "solidos.js",// os solidos das pecas, e as tres perguntas da fisica
  "p2.js",     // mapa ASCII, texturas procedurais
  "p2b.js",    // alturas por tile, compilador de geometria
  "p3.js",     // sprites e armas
  "p3b.js",    // maquinario de voxel: pecas, pele, assador de rotacoes
  "p3c.js",    // os modelos das criaturas
  "compacto.js", // o .personagem compacto (PERSONAGEM 3): base64 e inflate
  "@personagens", // os personagens desenhados e convertidos -- ver personagensEmbutidos
  "p3e.js",    // o personagem composto por pecas
  "forno.js",  // a fornada do personagem num worker, fora do laco principal
  "p3d.js",    // o cenario da ilha: arvores, pedras, moveis e moradores
  "conversa.js", // o que os moradores respondem, por palavra-chave
  "gpu.js",    // ?gpu=sim: o personagem 3D desenhado pela placa de video (sondagem 16)
  "mundo-placa.js", // ?mundo=placa: o ceu e as faces do mundo pela placa (sondagem 17)
  "p4.js",     // audio, estado, fisica, IA  (o "servidor")
  "p5a.js",    // rasterizador 3D            (o "cliente")
  "p5.js",     // HUD, telas, entrada como dado e o passo da simulacao
  "p5b.js"     // teclado, mouse e o laco principal (o canteiro nao leva)
];
/* O provador usa so o que o personagem precisa: paleta, rampas e o assador.
   p2.js vem junto porque e ele que faz a paleta e a tabela de luz. */
const PROVADOR = ["provador.html", "mapa.js", "ilha.js", "cores.js", "p2.js", "p3.js", "p3b.js", "compacto.js", "@personagens", "p3e.js", "provador.js"];

const PRODUTOS = [
  {ordem: JOGO,     saida: path.join(AQUI, "..", "cripta-vhalgorn.html")},
  {ordem: PROVADOR, saida: path.join(AQUI, "..", "provador.html")}
];

/* "@mapas" nao e arquivo: sao os mapas de mapas/ embutidos numa string cada,
   para o jogo abrir a ilha sem o editor, com ?mapa=ilha */
function mapasEmbutidos(){
  const dir = path.join(AQUI, "mapas"), mapas = {};
  for (const f of fs.readdirSync(dir).sort())
    if (/^[a-z0-9-]+\.mapa$/.test(f)) mapas[f.slice(0, -5)] = fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");
  return "\n/* gerado pelo build.js a partir de mapas/: abre com ?mapa=nome */\nconst MAPAS_EMBUTIDOS = " +
         JSON.stringify(mapas) + ";\n";
}

/* "@personagens": o humano de personagens/, compactado (PERSONAGEM 3,
   editor/compacto.js), vai dentro do HTML. Os outros .personagem de la
   (o guerreiro de 256, de teste) ficam de fora, cada um num
   personagens/<nome>.corpo.js que a pagina so carrega com ?corpo=<nome>:
   assim o jogo nao leva 8 MB de um corpo que nao usa. Sem nenhum, o
   personagem continua sendo as pecas de p3e.js. */
const { compactarPersonagem } = require("./editor/compacto.js");
const DIR_PERSONAGENS = path.join(AQUI, "personagens");
function personagensDaPasta(){
  const lista = {};
  if (fs.existsSync(DIR_PERSONAGENS)) for (const f of fs.readdirSync(DIR_PERSONAGENS).sort())
    if (/^[a-z0-9-]+\.personagem$/.test(f)) lista[f.slice(0, -11)] = compactarPersonagem(fs.readFileSync(path.join(DIR_PERSONAGENS, f), "utf8"));
  return lista;
}
const PERSONAGENS = personagensDaPasta();
function personagensEmbutidos(){
  const dentro = PERSONAGENS.humano ? {humano: PERSONAGENS.humano} : {};
  return "\n/* gerado pelo build.js a partir de personagens/: o humano, compactado */\nconst PERSONAGENS_EMBUTIDOS = " +
         JSON.stringify(dentro) + ";\n";
}
/* os modelos para a placa (atelie/cli.js gpu): personagens/<nome>.gpu.js, que
   a pagina so carrega com ?gpu=sim */
function modelosGpu(){
  const l = [];
  if (fs.existsSync(DIR_PERSONAGENS)) for (const f of fs.readdirSync(DIR_PERSONAGENS).sort())
    if (/^[a-z0-9-]+\.gpu$/.test(f)){
      const n = f.slice(0, -4), txt = fs.readFileSync(path.join(DIR_PERSONAGENS, f), "utf8").replace(/\r\n/g, "\n");
      l.push({saida: path.join(DIR_PERSONAGENS, n + ".gpu.js"),
              html: "/* gerado pelo build.js a partir de personagens/" + f + ": abre com ?gpu=sim */\n" +
                    "self.PERSONAGENS_GPU = self.PERSONAGENS_GPU || {};\nself.PERSONAGENS_GPU[" + JSON.stringify(n) + "] = " + JSON.stringify(txt) + ";\n"});
    }
  return l;
}
function corposDeFora(){
  return Object.keys(PERSONAGENS).filter(n => n !== "humano").map(n => ({
    saida: path.join(DIR_PERSONAGENS, n + ".corpo.js"),
    html: "/* gerado pelo build.js a partir de personagens/" + n + ".personagem: abre com ?corpo=" + n + " */\n" +
          "self.PERSONAGENS_DE_FORA = self.PERSONAGENS_DE_FORA || {};\nself.PERSONAGENS_DE_FORA[" + JSON.stringify(n) + "] = " + JSON.stringify(PERSONAGENS[n]) + ";\n"
  }));
}

function montar(ordem){
  return ordem.map(n => {
    if (n === "@mapas") return mapasEmbutidos();
    if (n === "@personagens") return personagensEmbutidos();
    const p = path.join(SRC, n);
    if (!fs.existsSync(p)) throw new Error("modulo faltando: " + n);
    return fs.readFileSync(p, "utf8");
  }).join("");
}

const montados = PRODUTOS.map(p => ({saida: p.saida, html: montar(p.ordem)})).concat(corposDeFora(), modelosGpu());

if (process.argv.includes("--check")){
  const velhos = montados.filter(m => !fs.existsSync(m.saida) || fs.readFileSync(m.saida, "utf8") !== m.html);
  if (!velhos.length){ console.log("build atualizado"); process.exit(0); }
  console.log("build DESATUALIZADO (" + velhos.map(m => path.basename(m.saida)).join(", ") +
              ") -- rode: node mundo-perigoso/build.js");
  process.exit(1);
}

/* os arquivos tem que continuar ASCII puro: sem isso os acentos quebram quando
   eles sao abertos do disco ou servidos sem charset declarado */
for (const m of montados){
  const naoAscii = m.html.split("").findIndex(c => c.charCodeAt(0) > 127);
  if (naoAscii >= 0){
    const trecho = m.html.slice(Math.max(0, naoAscii - 40), naoAscii + 40);
    console.error("ERRO: caractere nao-ASCII em " + path.basename(m.saida) + " na posicao " + naoAscii +
                  "\n  ..." + trecho + "...");
    process.exit(1);
  }
}
for (const m of montados){
  fs.writeFileSync(m.saida, m.html);
  console.log("montado: " + path.relative(path.join(AQUI, ".."), m.saida) +
              "  (" + m.html.split("\n").length + " linhas, " + m.html.length + " bytes)");
}
