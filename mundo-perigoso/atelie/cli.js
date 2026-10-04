/* ============================================================
   ATELIE -- A LINHA DE COMANDO
   ------------------------------------------------------------
   O mesmo fluxo do painel, sem navegador -- para refazer um personagem do
   zero de forma reproduzivel e para os testes.

     node mundo-perigoso/atelie/cli.js novo <modelo> [projeto.atelie] [--nome humano]
         importa .wgvox, .vox, .glb (malha de fora) ou .personagem em T-pose, propoe o rig, calcula
         o peso e poe as animacoes de partida

     node mundo-perigoso/atelie/cli.js pesos <projeto.atelie> [--pano]
         (--pano, no fim: voxel longe do eixo do braco, como capa e manga larga, nao
         segue o braco; o humano de camisa nao muda)
         recalcula o peso automatico (o que foi pintado a mao fica)

     node mundo-perigoso/atelie/cli.js captura <projeto.atelie> <arquivo.bvh|.json> <animacao>
         [--quadros 12,40] [--inicio N --fim N] [--espelhar] [--assimetrico] [--cru]
         importa captura de movimento para uma animacao: num ciclo (andar,
         correr) acha o trecho que se repete sozinho; numa acao usa os quadros
         pedidos; e faz cada quadro caber no jogo (--cru nao faz)

     node mundo-perigoso/atelie/cli.js receita <personagem.receita.json> [projeto.atelie]
         refaz o projeto do zero: o modelo, e as capturas nas animacoes que a
         receita manda (os caminhos sao relativos a receita)

     node mundo-perigoso/atelie/cli.js validar <projeto.atelie>

     node mundo-perigoso/atelie/cli.js exportar <projeto.atelie> [--forcar] [--altura 256] [--saida pasta]
         valida e grava personagens/<nome>.personagem (o jogo) e .pele; com
         --altura (165 ou 256), o .personagem sai nessa quantidade de voxels,
         refeito da fonte de alta resolucao (resolucao.js): a validacao e a do
         projeto em 117, e na outra altura so se confere que cabe na grade; sai
         compactado (PERSONAGEM 3, editor/compacto.js), sem perder voxel

     node mundo-perigoso/atelie/cli.js folha <projeto.atelie> <saida.png> [--quadros andar-1,pulo]

     node mundo-perigoso/atelie/cli.js gpu <projeto.atelie> [--alturas 256,117]
         grava personagens/<nome>.gpu: o corpo com peso de osso e as poses, para
         a placa de video posar e desenhar (atelie/gpu.js, src/gpu.js)

     node mundo-perigoso/atelie/cli.js gerar <folha.png> [--nome x] [--semente N] [--saida pasta] [--jogo]
         [--gerador C:\ferramentas\gerador] [--python exe] [--passos 5] [--octree 380]
         [--chunks 20000] [--pouca-vram] [--chave-perfil left|right]
         a folha de frente, perfil e costas em T-pose vira projeto do atelie
         pelo gerador local (atelie/gerador.js, ferramentas/gerador/): recorta
         as vistas, o Hunyuan3D-2mv faz a forma (.glb), o tresvistas.js pinta
         com o desenho e grava o .atelie com fonte, rig, peso com pano e as
         capturas; com --jogo, tambem exporta o de 256. Sem --saida, grava em
         Arte/personagens/gerados/<nome>/
   ============================================================ */
const fs = require("fs");
const path = require("path");
const N = require("./nucleo.js"), C = require("./corpo.js"), Ar = require("./arquivos.js"), V = require("./validar.js");
const P = require("./pesos.js"), D = require("./deformar.js"), F = require("./folha.js"), An = require("./animacao.js");
const png = require("../editor/png.js");

const RAIZ = path.join(__dirname, "..");
const args = process.argv.slice(2), opc = {}, pos = [];
for (let i = 0; i < args.length; i++){
  if (args[i].startsWith("--")){
    const k = args[i].slice(2), v = args[i + 1];
    if (v === undefined || v.startsWith("--")) opc[k] = true; else { opc[k] = v; i++; }
  } else pos.push(args[i]);
}
function sair(msg){ console.error(msg); process.exit(1); }
function lerModelo(arq){
  const dados = fs.readFileSync(arq), ext = path.extname(arq).toLowerCase();
  if (ext === ".wgvox") return C.lerWgvox(dados);
  if (ext === ".vox") return C.lerVox(dados);
  if (ext === ".personagem") return C.lerPersonagemTexto(dados.toString("utf8"));
  /* malha de fora: voxeliza solido, com a cor da textura, em 256 de altura */
  if (ext === ".glb") return require("../editor/glb.js").voxelizar(require("../editor/glb.js").lerGlb(dados), {alto: 256});
  sair("modelo de formato desconhecido: " + ext + " (vale .wgvox, .vox, .glb ou .personagem)");
}
const abrir = arq => Ar.lerProjeto(fs.readFileSync(arq, "utf8"));
const gravar = (arq, proj) => { fs.writeFileSync(arq, Ar.salvarProjeto(proj)); console.log("gravado " + path.relative(process.cwd(), arq)); };
function relatorio(v){
  for (const e of v.erros) console.log("  ERRO  " + e);
  for (const a of v.avisos) console.log("  aviso " + a);
  console.log(v.quadros.map(q => q.nome + " " + q.voxels).join(", "));
  console.log(v.erros.length ? v.erros.length + " erro(s)" : "sem erro" + (v.avisos.length ? ", " + v.avisos.length + " aviso(s)" : ""));
}

const cmd = pos[0];
if (cmd === "novo"){
  if (!pos[1]) sair("uso: cli.js novo <modelo> [projeto.atelie] [--nome humano]");
  const nome = (opc.nome || "humano").toLowerCase();
  const corpo = C.importarModelo(lerModelo(pos[1]), {nome: nome});
  const proj = Ar.novoProjeto(corpo, {pano: !!opc.pano});
  for (const a of proj.avisosDoRig) console.log("aviso do rig: " + a);
  console.log(C.voxelsDoCorpo(corpo).length + " voxels, " + corpo.paleta.length + " cores, limites " + C.limitesDoCorpo(corpo).join(" "));
  gravar(pos[2] || path.join(RAIZ, "Arte", "personagens", nome + ".atelie"), proj);
} else if (cmd === "pesos"){
  const proj = abrir(pos[1]);
  if (opc.pano) proj.pano = true;                   // fica no projeto, para os proximos calculos
  const r = P.calcularPesos(proj.corpo, proj.juntas, {larguras: proj.larguras, pano: !!proj.pano});
  console.log(r.voxels + " voxels, " + r.travados + " pintados a mao ficaram");
  gravar(pos[1], proj);
} else if (cmd === "captura"){
  const Cap = require("./captura.js");
  if (!pos[3]) sair("uso: cli.js captura <projeto.atelie> <arquivo.bvh|.json> <animacao> [--quadros 12,40] [--inicio N --fim N] [--espelhar] [--assimetrico] [--cru] [--fase 0.375]");
  const proj = abrir(pos[1]);
  const clipe = Cap.lerCaptura(fs.readFileSync(pos[2], "utf8"), path.extname(pos[2]));
  const r = Cap.animacaoDaCaptura(proj, clipe, pos[3], {
    quadros: opc.quadros ? String(opc.quadros).split(",").map(Number) : null,
    inicio: opc.inicio !== undefined ? +opc.inicio : undefined, fim: opc.fim !== undefined ? +opc.fim : undefined,
    espelhar: !!opc.espelhar, assimetrico: !!opc.assimetrico, cru: !!opc.cru,
    fase: opc.fase !== undefined ? +opc.fase : undefined});
  proj.animacoes[pos[3]] = r.quadros;
  console.log(clipe.juntas.length + " quadros lidos (" + clipe.origem + ", " + Math.round(clipe.fps) + " por segundo)");
  console.log("usado: " + JSON.stringify(r.info) + (r.quadros.some(q => q.amortecido) ? "; amortecido " + r.quadros.map(q => q.amortecido ? JSON.stringify(q.amortecido) : "-").join(" ") : ""));
  gravar(pos[1], proj);
} else if (cmd === "receita"){
  if (!pos[1]) sair("uso: cli.js receita <personagem.receita.json> [projeto.atelie]");
  const Cap = require("./captura.js"), dir = path.dirname(pos[1]), rec = JSON.parse(fs.readFileSync(pos[1], "utf8"));
  const proj = Ar.novoProjeto(C.importarModelo(lerModelo(path.join(dir, rec.modelo)), {nome: rec.nome}));
  console.log("modelo " + rec.modelo + ": " + C.voxelsDoCorpo(proj.corpo).length + " voxels, " + proj.corpo.paleta.length + " cores");
  for (const c of rec.capturas || []){
    const clipe = Cap.lerCaptura(fs.readFileSync(path.join(dir, c.arquivo), "utf8"), path.extname(c.arquivo));
    const r = Cap.animacaoDaCaptura(proj, clipe, c.animacao, c.opcoes || {});
    proj.animacoes[c.animacao] = r.quadros;
    console.log(c.animacao + " <- " + c.arquivo + ": " + JSON.stringify(r.info) +
      (r.quadros.some(q => q.amortecido) ? "; amortecido " + r.quadros.map(q => q.amortecido ? JSON.stringify(q.amortecido) : "-").join(" ") : ""));
  }
  gravar(pos[2] || path.join(dir, rec.nome + ".atelie"), proj);
} else if (cmd === "validar"){
  relatorio(V.validarProjeto(abrir(pos[1])));
} else if (cmd === "exportar"){
  const proj = abrir(pos[1]), v = V.validarProjeto(proj);
  relatorio(v);
  if (v.erros.length && !opc.forcar) sair("nada exportado: corrija os erros (ou --forcar)");
  const dir = opc.saida || path.join(RAIZ, "personagens");
  fs.mkdirSync(dir, {recursive: true});
  const a = path.join(dir, proj.nome + ".personagem"), b = path.join(dir, proj.nome + ".pele");
  const altura = +(opc.altura || 117);
  if (altura !== 117){
    const Rs = require("./resolucao.js"), K = altura/117, t0 = Date.now();
    if (!proj.fonte) sair("este projeto nao guarda a fonte de alta resolucao: so sai em 117");
    const voltar = Rs.usarResolucao(K);
    try {
      const d = Rs.projetoEm(proj, K), vd = V.validarProjeto(d, {rapido: true}), fora = vd.quadros.reduce((s, q) => s + q.fora, 0);
      if (fora) console.log("  AVISO em " + altura + ": " + fora + " voxels fora da grade, somando os quadros");
      fs.writeFileSync(a, require("../editor/compacto.js").compactarPersonagem(Ar.exportarPersonagem(d, vd)));     // em 256 o texto teria 20 MB
      console.log("em " + altura + " voxels (grade " + N.GRADE.DX + "x" + N.GRADE.DY + "x" + N.GRADE.DZ + "), " + ((Date.now() - t0)/1000).toFixed(1) + " s");
    } finally { voltar(); }
  } else fs.writeFileSync(a, Ar.exportarPersonagem(proj, v));
  fs.writeFileSync(b, Ar.exportarPele(proj));
  console.log("gravado " + path.relative(process.cwd(), a) + " e " + path.basename(b) + "\nagora: node mundo-perigoso/build.js");
} else if (cmd === "gpu"){
  const proj = abrir(pos[1]), alturas = String(opc.alturas || (proj.fonte ? "256,117" : "117")).split(",").map(Number), t0 = Date.now();
  const r = require("./gpu.js").exportarGpu(proj, alturas);
  const dir = opc.saida || path.join(RAIZ, "personagens"), a = path.join(dir, proj.nome + ".gpu");
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(a, r.texto);
  console.log(r.info.join("; ") + "; " + (Buffer.byteLength(r.texto)/1e6).toFixed(2) + " MB em " + ((Date.now() - t0)/1000).toFixed(0) + " s; gravado " + path.relative(process.cwd(), a));
} else if (cmd === "gerar"){
  if (!pos[1]) sair("uso: cli.js gerar <folha.png> [--nome x] [--semente N] [--saida pasta] [--jogo]");
  const G = require("./gerador.js"), {spawnSync} = require("child_process");
  const folha = pos[1], nome = String(opc.nome || path.basename(folha, path.extname(folha))).toLowerCase();
  if (!fs.existsSync(folha)) sair("nao achei a folha " + folha);
  /* o gerador primeiro: sem ele nao adianta recortar */
  const loc = G.localizar({raiz: opc.gerador, python: opc.python});
  if (loc.faltas.length) sair("gerar: " + loc.faltas.join("\n       "));
  const dir = opc.saida || path.join(RAIZ, "Arte", "personagens", "gerados", nome), tempos = {};
  fs.mkdirSync(dir, {recursive: true});
  let t0 = Date.now();
  const R = G.recortarVistas(png.decodificar(fs.readFileSync(folha)), {perfil: opc.perfil});
  const vistas = {};
  for (const v of ["frente", "perfil", "costas"]){
    vistas[v] = path.join(dir, nome + "-" + v + ".png");
    fs.writeFileSync(vistas[v], png.codificar(R.vistas[v].largura, R.vistas[v].altura, R.vistas[v].rgba));
  }
  tempos.recortar = (Date.now() - t0)/1000;
  console.log("1. recortado: perfil olhando para a " + R.olha + " (chave " + (opc["chave-perfil"] || R.chavePerfil) + ")");
  /* a forma, pelo Python */
  const glb = path.join(dir, nome + ".glb");
  const argsPy = [loc.script, "--frente", vistas.frente, "--perfil", vistas.perfil, "--costas", vistas.costas, "--saida", glb,
    "--raiz", loc.raiz, "--chave-perfil", opc["chave-perfil"] || R.chavePerfil];
  for (const k of ["semente", "passos", "octree", "chunks", "guia"]) if (opc[k] !== undefined) argsPy.push("--" + k, String(opc[k]));
  if (opc["pouca-vram"]) argsPy.push("--pouca-vram");
  console.log("2. gerando a forma (Hunyuan3D-2mv turbo)...");
  t0 = Date.now();
  const py = spawnSync(loc.python, argsPy, {encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 26});
  tempos.gerar = (Date.now() - t0)/1000;
  if (py.error) sair("gerar: nao consegui rodar o Python " + loc.python + ": " + py.error.message);
  const res = G.lerResultado(py.stdout || "");
  if (py.status !== 0 || !res || !fs.existsSync(glb)) sair("gerar: o gerador falhou (saida " + py.status + ")\n" + (py.stdout || "").trim());
  console.log("   " + res.triangulos + " triangulos; " + JSON.stringify(res.tempos_s) + "; VRAM maxima " + res.vram_max_gb + " GB");
  /* a cor do desenho na forma, e o .atelie */
  console.log("3. pintando com o desenho e montando o projeto...");
  t0 = Date.now();
  const tv = spawnSync(process.execPath, [path.join(RAIZ, "sondagens", "7-tres-vistas", "tresvistas.js"), folha, dir, "--nome=" + nome, "--forma=" + glb]
    .concat(opc.perfil ? ["--perfil=" + opc.perfil] : []), {encoding: "utf8", maxBuffer: 1 << 26});
  tempos.pintar_e_montar = (Date.now() - t0)/1000;
  if (tv.status !== 0) sair("gerar: o tresvistas.js falhou\n" + (tv.stderr || tv.stdout));
  const atelie = path.join(dir, nome + ".atelie");
  const relTv = JSON.parse(fs.readFileSync(path.join(dir, nome + ".json"), "utf8"));
  if (relTv.avisos_do_rig.length) console.log("   avisos do rig: " + relTv.avisos_do_rig.join("; "));
  console.log("   gravado " + path.relative(process.cwd(), atelie));
  if (opc.jogo){
    console.log("4. exportando o de 256 para o jogo...");
    t0 = Date.now();
    const ex = spawnSync(process.execPath, [__filename, "exportar", atelie, "--altura", "256"].concat(opc.forcar ? ["--forcar"] : []), {encoding: "utf8", stdio: "inherit"});
    tempos.exportar = (Date.now() - t0)/1000;
    if (ex.status !== 0) sair("gerar: a exportacao falhou");
  }
  const rel = {folha: folha, nome: nome, olha: R.olha, gerador: res, tresvistas: {fidelidade: relTv.fidelidade_da_silhueta, cor: relTv.cor_da_superficie, avisos_do_rig: relTv.avisos_do_rig},
               tempos_s: Object.fromEntries(Object.entries(tempos).map(([k, v]) => [k, +v.toFixed(1)]))};
  fs.writeFileSync(path.join(dir, nome + "-gerar.json"), JSON.stringify(rel, null, 1));
  console.log("pronto em " + Object.values(tempos).reduce((a, b) => a + b, 0).toFixed(0) + " s: " + JSON.stringify(rel.tempos_s));
} else if (cmd === "folha"){
  if (!pos[2]) sair("uso: cli.js folha <projeto.atelie> <saida.png> [--quadros andar-1,pulo] [--vistas frente,lado]");
  const proj = abrir(pos[1]), quais = opc.quadros ? String(opc.quadros).split(",") : null;
  const grades = An.quadrosDoProjeto(proj.animacoes).filter(q => !quais || quais.includes(q.nome))
    .map(q => D.posarCorpo(proj.corpo, proj.juntas, q.pose).g);
  const f = F.montarFolha(grades, proj.corpo.paleta, {escala: +(opc.escala || 2), vistas: opc.vistas ? String(opc.vistas).split(",") : undefined});
  fs.writeFileSync(pos[2], png.codificar(f.w, f.h, f.px));
  console.log("gravado " + pos[2] + " (" + grades.length + " quadros)");
} else {
  console.log(fs.readFileSync(__filename, "utf8").split("============================================================ */")[0].split("\n").slice(3).join("\n"));
}
