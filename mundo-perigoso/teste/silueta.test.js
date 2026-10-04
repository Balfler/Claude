/* Testes da silhueta do relevo alem da nevoa (DESIGN.md, o motor): desligada
   nada muda; ligada (?silhueta=sim), o relevo que sobe acima da linha dos
   olhos depois de FAR tiles vira silhueta no ceu, e na cripta, que nao tem
   ilha, nada muda. Uso: node mundo-perigoso/teste/silueta.test.js [caminho-do-html] */
const fs = require("fs");
const path = require("path");
const M = require("../src/mapa.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const mapa = () => { const m = M.lerMapa(fs.readFileSync(path.join(__dirname, "..", "mapas", "ilha-650.mapa"), "utf8")).mapa; if (m.versao < 2) M.converterMapa(m); return m; };
const quadro = D => { D.setCamera(0); D.renderWorld(); D.renderEntities(); return Uint32Array.from(D.buf); };
const diferentes = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

try {
  /* a ilha: de um chao baixo, olhando para o relevo alto de longe */
  const abrir = busca => { const { D } = carregar(arquivo, {busca: "?mapa=cripta" + busca, canvas: "software"}); D.trocarMundo("?mapa=canteiro", mapa()); D.G.mode = "play"; D.G.terceira = false; return D; };
  const pos = D => { D.P.x = 241.5; D.P.y = 417.5; D.P.z = D.floorAt(241, 417); D.P.ang = 199*Math.PI/180; D.P.pitch = 0.05; D.P.bob = 0; };
  const off = abrir(""), on = abrir("&silhueta=sim");
  check("desligada por padrao", off.SILUETA.ligada === false && on.SILUETA.ligada === true);
  pos(off); pos(on);
  const a = quadro(off), b = quadro(on);
  check("ligada, o ceu ganha a silhueta: centenas de pixels mudam", diferentes(a, b) > 300, diferentes(a, b) + " pixels");
  let maior = -1, acima = 0;
  for (let k = 0; k < on.SILUETA.n; k++) if (on.SILUETA.tan[k] > maior) maior = on.SILUETA.tan[k];
  check("o relevo alto de longe passa da linha dos olhos: a tangente e positiva", maior > 0.03, "tangente maxima " + maior.toFixed(3));
  const linhaDoOlho = on.RH/2;
  check("a silhueta fica acima da linha do olho, no ceu", Math.min.apply(null, Array.from(on.SILUETA.topo)) < linhaDoOlho);
  /* so o ceu muda: nenhum pixel do chao (a metade de baixo da tela) e tocado */
  let maisBaixo = -1;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) maisBaixo = Math.max(maisBaixo, (i / on.RW) | 0);
  check("a silhueta so pinta onde o mundo nao desenhou: nada abaixo do horizonte proximo", maisBaixo >= 0 && maisBaixo < on.RH*0.62, "linha mais baixa " + maisBaixo + " de " + on.RH);
  /* a cripta nao tem ilha: ligada, nada muda */
  const cA = carregar(arquivo, {busca: "?mapa=cripta", canvas: "software"}).D, cB = carregar(arquivo, {busca: "?mapa=cripta&silhueta=sim", canvas: "software"}).D;
  cA.G.mode = cB.G.mode = "play";
  check("na cripta, ligada, o quadro e identico", diferentes(quadro(cA), quadro(cB)) === 0);
} catch (e){
  check("EXCECAO: " + e.message + " @ " + (e.stack.split("\n")[1] || "").trim(), false);
}
fim();
