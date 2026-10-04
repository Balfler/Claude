/* O mundo na placa (sondagem 17, src/mundo-placa.js): sem WebGL2 -- o node, ou
   um navegador sem ela -- ?mundo=placa tem de voltar ao rasterizador sem
   quebrar nada. O desenho pela placa se confere no navegador.
   Uso: node mundo-perigoso/teste/mundo-placa.test.js [caminho-do-html] */
const path = require("path");
const { carregar, placar } = require("./harness");

const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
const { check, fim } = placar();

try {
  const { D, frames } = carregar(arquivo, {busca: "?mapa=cripta&mundo=placa"});
  check("?mundo=placa e pedido", D.MUNDO_PLACA.pedido === true);
  D.G.mode = "play";
  frames(10);
  check("sem WebGL2 a placa nao liga, e diz por que", !D.MUNDO_PLACA.ativo && D.MUNDO_PLACA.motivo !== "", D.MUNDO_PLACA.motivo);
  /* o mesmo quadro que sem a opcao: so os bichos, que andam ao acaso, mudam uns pixels */
  const B = carregar(arquivo, {busca: "?mapa=cripta"});
  B.D.G.mode = "play";
  B.frames(10);
  let dif = 0, pintados = 0;
  for (let i = 0; i < D.buf.length; i++){ if (D.buf[i] !== B.D.buf[i]) dif++; if (D.zbuf[i]) pintados++; }
  check("e o rasterizador desenha o mesmo quadro de sem a opcao", D.buf.length === B.D.buf.length && pintados > 0 && dif < pintados*0.05,
    pintados + " pixels de mundo, " + dif + " diferentes");

  const sem = carregar(arquivo, {busca: "?mapa=cripta&mundo=64"}).D;
  check("sem ?mundo=placa (nem com ?mundo=64) ela nao e pedida", sem.MUNDO_PLACA.pedido === false);
} catch (e){
  check("EXCECAO: " + e.message + " @ " + (e.stack.split("\n")[1] || "").trim(), false);
}
fim();
