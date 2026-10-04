/* ============================================================
   CANTEIRO -- O MICRO
   ------------------------------------------------------------
   Construir de dentro do mapa, com o motor do jogo: o que se ve
   construindo e o que o jogo mostra, porque e o mesmo codigo (src/) que
   desenha. A pagina carrega os modulos ate p5.js; teclado, mouse e laco
   sao daqui.

   Andar usa a fisica de verdade -- degrau, pulo, colisao -- e voar usa o
   mesmo "atravessar paredes" da tecla N do jogo: a camera vai para onde se
   olha, sem colidir.

   A peca na mao aparece como fantasma na mira, num pontilhado verde se cabe
   e vermelho se nao cabe. O pontilhado e a translucidez de 1993: um xadrez
   de pixel pintado e pixel vazio, que o rasterizador ja sabe desenhar.
   ============================================================ */
"use strict";
const MICRO = {
  ligado: false,
  voando: false,
  grade: 0.25,                       // quarto de tile; G alterna 0.25, 0.5 e 1
  giro: 0,
  espelho: 0,
  tipo: "parede",
  estilo: "madeira-pescador",
  construcao: 1,
  encaixar: true,                    // E liga e desliga o encaixe
  alvo: null,                        // {x, y, z, ok, porque, encaixe}
  cantoA: null,                      // B: o primeiro canto da caixa
  selecao: null,                     // a caixa escolhida
  prancheta: null,                   // o modelo copiado
  colando: null,                     // o modelo na mao, a espera do clique
  texVerde: null, texVermelha: null,
  destaque: null,                    // o problema clicado na lista: {x, y, z, pecas, ate}
  aviso: "",
  passos: 0
};
const PASSO_MICRO = 1/60;

/* ---------- o pontilhado do fantasma ----------
   Um xadrez: metade dos pixels da cor, metade vazios (indice 0). Por cima
   do mundo ja desenhado, isso le como vidro colorido. */
function texturaPontilhada(cor){
  return makeTex(function(c, TS){
    c.clearRect(0, 0, TS, TS);
    c.fillStyle = cor;
    for (let y = 0; y < TS; y++) for (let x = (y & 1); x < TS; x += 2) c.fillRect(x, y, 1, 1);
  });
}

/* ---------- a mira ----------
   Anda pela linha de visao em passos curtos ate bater em terreno ou peca, e
   devolve o ultimo ponto livre e o ponto batido. E a mesma pergunta que a
   fisica faz, so que ponto a ponto. */
function pontoCheio(x, y, z){
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  if (z < alturaDoChao(x, y) || z > ceilAt(tx, ty)) return true;
  return pontoNoSolido(SOLIDOS, x, y, z);
}
function miraNoMundo(alcance){
  const cp = Math.cos(P.pitch);
  const dx = Math.cos(P.ang)*cp, dy = Math.sin(P.ang)*cp, dz = Math.sin(P.pitch);
  const x0 = camX, y0 = camY, z0 = camZ;
  let livre = {x: x0, y: y0, z: z0};
  for (let d = 0.1; d <= alcance; d += 0.04){
    const x = x0 + dx*d, y = y0 + dy*d, z = z0 + dz*d;
    if (pontoCheio(x, y, z)) return {livre: livre, bateu: {x: x, y: y, z: z}, dist: d};
    livre = {x: x, y: y, z: z};
  }
  return {livre: livre, bateu: null, dist: alcance};
}
/* De que lado se bateu: o eixo cujo passo sozinho ja bate e a face. E o que
   faz a peca encostar no lado em que se aponta em vez de nascer dentro da
   parede que se mirou. */
function faceBatida(livre, bateu){
  if (!bateu) return {x: 0, y: 0, z: 1};
  if (pontoCheio(bateu.x, livre.y, livre.z)) return {x: Math.sign(livre.x - bateu.x), y: 0, z: 0};
  if (pontoCheio(livre.x, bateu.y, livre.z)) return {x: 0, y: Math.sign(livre.y - bateu.y), z: 0};
  if (pontoCheio(livre.x, livre.y, bateu.z)) return {x: 0, y: 0, z: Math.sign(livre.z - bateu.z)};
  return {x: 0, y: 0, z: 1};
}
/* O lugar onde a peca vai: o ponto batido, preso na grade e empurrado para
   o lado de fora da face. Sem face, o ultimo ponto livre assentado no chao. */
function lugarDaPeca(){
  const m = MICRO.mapa;
  if (!m) return null;
  const r = miraNoMundo(8);
  const g = MICRO.grade, n = faceBatida(r.livre, r.bateu);
  const alvo = r.bateu || r.livre;
  const prende = function(v, passo, dir){
    if (dir > 0) return Math.ceil(v/passo - 1e-6)*passo;
    if (dir < 0) return Math.floor(v/passo + 1e-6)*passo;
    return Math.round(v/passo)*passo;
  };
  const x = prende(alvo.x, g, n.x), y = prende(alvo.y, g, n.y);
  let z = prende(alvo.z, 0.25, n.z);
  if (n.z === 0){                              // parede: assenta no chao de baixo se estiver perto
    const chao = groundUnder(x, y, 0.05, z + 0.3);
    if (Math.abs(chao - z) < 0.6) z = Math.round(chao/0.25)*0.25;
  }
  return {x: x, y: y, z: z};
}

/* ---------- o encaixe ----------
   A peca na mao, posta na grade, procura nas pecas de perto um encaixe que
   combine com um dela (ENCAIXA_EM, em pecas.js) a menos de 0,45 tile -- mais
   que a diagonal de um quarto de tile, o passo da grade -- e
   cola ali, com o desvio que faltava. E o que faz a segunda parede fechar a
   quina da primeira sem ninguem mirar o quarto de tile certo. Os encaixes de
   cada peca do mapa ficam guardados pela chave dela. */
const ENCAIXES_DO_MAPA = new Map();              // id -> {chave, encaixes}
function encaixesDaPeca(p){
  const chave = p.tipo + "|" + p.x + "|" + p.y + "|" + p.z + "|" + (p.giro || 0) + "|" + (p.espelho ? 1 : 0);
  let e = ENCAIXES_DO_MAPA.get(p.id);
  if (!e || e.chave !== chave){
    const g = geometriaDaPeca(p);
    e = {chave: chave, encaixes: g ? g.encaixes : []};
    ENCAIXES_DO_MAPA.set(p.id, e);
  }
  return e.encaixes;
}
function encaixar(inst){
  const m = MICRO.mapa, g = geometriaDaPeca(inst);
  if (!m || !g || !g.encaixes.length) return null;
  let melhor = null, dm = 0.45*0.45;
  for (const p of m.pecas){
    if (Math.abs(p.x - inst.x) > 4 || Math.abs(p.y - inst.y) > 4 || Math.abs(p.z - inst.z) > 4) continue;
    for (const w of encaixesDaPeca(p)) for (const k of g.encaixes){
      const aceita = ENCAIXA_EM[k.tipo];
      if (!aceita || aceita.indexOf(w.tipo) < 0) continue;
      const dx = w.em[0] - k.em[0], dy = w.em[1] - k.em[1], dz = w.em[2] - k.em[2], d = dx*dx + dy*dy + dz*dz;
      if (d < dm - 1e-12){ dm = d; melhor = {dx: dx, dy: dy, dz: dz, tipo: k.tipo + " na " + w.tipo, id: p.id}; }
    }
  }
  return melhor;
}

/* ---------- cabe? ----------
   Vermelho quando a peca sai do mapa ou entra dentro de outra. "Sem apoio"
   e so um aviso: ponte e sacada nascem no ar de proposito. */
function conferirPeca(inst){
  const m = MICRO.mapa;
  const g = geometriaDaPeca(inst);
  if (!g) return {ok: false, porque: "tipo de peca desconhecido"};
  if (!giroAceito(inst.tipo, inst.giro)) return {ok: false, porque: "esta peca so gira de 90 em 90"};
  let apoio = false;
  for (const s of g.solidos){
    for (const p of s.pts){
      if (p[0] < 0 || p[1] < 0 || p[0] > m.larg || p[1] > m.alt) return {ok: false, porque: "fora do mapa"};
    }
    /* dentro de outra peca: o meio do solido e os cantos puxados para dentro */
    let cx = 0, cy = 0;
    for (const p of s.pts){ cx += p[0]; cy += p[1]; }
    cx /= s.pts.length; cy /= s.pts.length;
    const alturas = [s.z0 + 0.05, (s.z0 + s.z1)/2, s.z1 - 0.05];
    for (const z of alturas){
      if (z <= s.z0 || z >= s.z1) continue;
      if (pontoNoSolido(SOLIDOS, cx, cy, z)) return {ok: false, porque: "dentro de outra peca"};
      for (const p of s.pts){
        const px = p[0] + (cx - p[0])*0.2, py = p[1] + (cy - p[1])*0.2;
        if (pontoNoSolido(SOLIDOS, px, py, z)) return {ok: false, porque: "dentro de outra peca"};
      }
    }
    /* apoio: terreno ou outra peca logo abaixo do fundo */
    const chao = groundUnder(cx, cy, 0.05, s.z0 + 0.1);
    if (Math.abs(chao - s.z0) < 0.12) apoio = true;
    if (pontoNoSolido(SOLIDOS, cx, cy, s.z0 - 0.05)) apoio = true;
  }
  /* a peca sem solido -- a folha da porta, a tocha -- se apoia pelo pe dela */
  if (!g.solidos.length && Math.abs(groundUnder(inst.x, inst.y, 0.05, inst.z + 0.1) - inst.z) < 0.12) apoio = true;
  return {ok: true, porque: apoio ? "" : "sem apoio embaixo"};
}

/* ---------- desenhar ---------- */
function desenharFantasma(inst, ok){
  const g = geometriaDaPeca(inst);
  if (!g) return;
  const tex = ok === null ? MICRO.texAmarela : (ok ? MICRO.texVerde : MICRO.texVermelha);
  for (const f of g.faces){
    const n = f.pts.length;
    for (let i = 0; i < n; i++) toCam(f.pts[i][0], f.pts[i][1], f.pts[i][2], f.uv[i][0], f.uv[i][1], VA[i]);
    drawPoly(n, tex, 0, 0);
  }
}
function desenharMicro(){
  setCamera(0);
  renderWorld();
  renderEntities();
  /* a selecao em amarelo, o modelo na mao ou a peca na mao */
  for (const p of selecionadas()) desenharFantasma(p, null);
  if (MICRO.cantoA) desenharFantasma({tipo: "pilar", x: MICRO.cantoA.x - 0.125, y: MICRO.cantoA.y - 0.125, z: MICRO.cantoA.z, giro: 0}, null);
  /* o problema clicado na lista da validacao: as pecas dele e um poste no
     lugar, em amarelo, por uns segundos */
  const d = MICRO.destaque;
  if (d && performance.now() < d.ate && MICRO.mapa){
    if (d.pecas && d.pecas.length){
      const ids = new Set(d.pecas);
      for (const p of MICRO.mapa.pecas) if (ids.has(p.id)) desenharFantasma(p, null);
    }
    desenharFantasma({tipo: "pilar", x: d.x + 0.375, y: d.y + 0.375, z: d.z, giro: 0}, null);
  }
  if (MICRO.colando && MICRO.alvo) for (const p of pecasColando()) desenharFantasma(p, MICRO.alvo.ok);
  else {
    const inst = pecaNaMao();
    if (inst && MICRO.alvo) desenharFantasma(inst, MICRO.alvo.ok);
  }
  ctx.putImageData(img, 0, 0);
  /* a mira e os avisos, na tela logica de 320x180 */
  ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
  desenharMarcos();
  ctx.fillStyle = "rgba(230,220,190,.75)";
  ctx.fillRect(159, 89, 2, 3); ctx.fillRect(159, 95, 2, 3);
  ctx.fillRect(154, 92, 3, 2); ctx.fillRect(163, 92, 3, 2);
  if (MICRO.alvo && !MICRO.alvo.ok) txt(MICRO.alvo.porque.toUpperCase(), 160, 108, 13, "#d0503a", "center");
  else if (MICRO.alvo && MICRO.alvo.porque) txt(MICRO.alvo.porque.toUpperCase(), 160, 108, 13, "#c8963c", "center");
  if (MICRO.aviso) txt(MICRO.aviso, 6, 14, 14, "#ffd88a");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* ---------- os marcos na vista ----------
   O marco nao e objeto no jogo, mas quem constroi precisa ver onde esta a
   porta trancada e o ninho: um poste fino da cor dele, com a letra em cima,
   projetado pela camera do motor. Ate 24 tiles; atras da parede tambem --
   e sobreposicao de ferramenta, nao cena. */
function desenharMarcos(){
  const m = MICRO.mapa;
  if (!m) return;
  const v0 = VA[0], v1 = VA[1];
  for (const c of m.coisas){
    const def = COISA_POR_ID[c.tipo];
    if (!def || def.grupo !== "marco") continue;
    const x = c.x + 0.5, y = c.y + 0.5;
    if (Math.abs(x - camX) > 24 || Math.abs(y - camY) > 24) continue;
    const z = c.campos && isFinite(Number(c.campos.z)) && c.campos.z !== "" ? Number(c.campos.z) : floorAt(c.x, c.y);
    toCam(x, y, z, 0, 0, v0); toCam(x, y, z + 0.9, 0, 0, v1);
    if (v0.fz < 0.3 || v1.fz < 0.3) continue;
    project(v0); project(v1);
    const sx = v0.sx/ESC, sb = v0.sy/ESC, st = v1.sy/ESC;
    if (sx < -10 || sx > W + 10) continue;
    ctx.fillStyle = def.cor;
    ctx.fillRect(sx - 0.5, st, 1, Math.max(1, sb - st));
    txt(def.letra || "?", sx, st - 7, 9, def.cor, "center");
  }
}

/* ---------- a peca na mao ----------
   O estilo e o da construcao de agora; construcao nova usa o escolhido. */
function estiloNaMao(){
  const c = MICRO.mapa && MICRO.mapa.construcoes.find(function(k){ return k.id === MICRO.construcao; });
  return c && ESTILOS[c.estilo] ? c.estilo : MICRO.estilo;
}
function pecaNaMao(){
  const a = MICRO.alvo;
  if (!a) return null;
  const inst = {tipo: MICRO.tipo, estilo: a.estilo || estiloNaMao(), construcao: MICRO.construcao,
                x: a.x, y: a.y, z: a.z,
                giro: a.giro === undefined ? MICRO.giro : a.giro, espelho: a.espelho === undefined ? MICRO.espelho : a.espelho};
  if (a.campos) inst.campos = Object.assign({}, a.campos);
  return inst;
}
/* ---------- trocar uma peca por outra da mesma familia ----------
   Com a janela, a porta ou o arco na mao, mirar numa parede troca a parede
   por ela -- no mesmo lugar, com o mesmo giro e na mesma construcao, um
   Ctrl+Z so. Sem isso a janela so entrava tirando a parede antes: posta por
   cima, ela caia "dentro de outra peca". */
function trocaNaMira(){
  const id = pecaNaMira();
  if (id < 0 || !MICRO.mapa) return null;
  const p = MICRO.mapa.pecas.find(function(q){ return q.id === id; });
  return p && trocaDePeca(MICRO.tipo, p.tipo) ? p : null;
}
/* A empena desce ate o que estiver embaixo dela -- o alto da parede --, e
   o triangulo vira trapezio: a ponta do telhado fecha sem peca de enchimento. */
function descerEmpena(inst){
  const r = (inst.giro || 0)*Math.PI/180, wx = inst.x + 0.5*Math.cos(r), wy = inst.y + 0.5*Math.sin(r);
  const embaixo = groundUnder(wx, wy, 0.05, inst.z + 0.01);
  const base = Math.round((inst.z - embaixo)/0.25)*0.25;
  if (base > 0 && base <= 4) inst.campos = {base: String(base)};
}
/* Qual peca esta na mira: anda pela linha de visao e ve de quem e o solido
   que ela bate. Devolve o id da peca, ou -1. */
function pecaNaMira(){
  const cp = Math.cos(P.pitch);
  const dx = Math.cos(P.ang)*cp, dy = Math.sin(P.ang)*cp, dz = Math.sin(P.pitch);
  for (let d = 0.1; d <= 8; d += 0.04){
    const x = camX + dx*d, y = camY + dy*d, z = camZ + dz*d;
    let achou = -1;
    cadaSolido(SOLIDOS, x, y, 0.001, function(s){
      if (achou < 0 && z >= s.z0 && z <= topoDoSolido(s, x, y)) achou = s.dono;
    });
    if (achou >= 0) return achou;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return -1;
    if (z < alturaDoChao(x, y) || z > ceilAt(tx, ty)) return -1;    // bateu no terreno antes
  }
  return -1;
}

/* ---------- a selecao em caixa e o modelo ----------
   B marca um canto da caixa na mira, B de novo marca o outro, e B mais uma
   vez larga a selecao. A caixa pega as pecas que nascem dentro dela; com os
   dois cantos na mesma altura, ela pega um andar inteiro para cima. Ctrl+C
   copia, Ctrl+X recorta, Delete apaga, Ctrl+V poe o modelo na mao: R gira,
   F espelha, o clique cola -- tudo um Ctrl+Z so cada. A conta de girar e
   espelhar mora em canteiro/modelo.js. */
function marcarCanto(){
  const a = MICRO.alvo;
  if (MICRO.selecao){ MICRO.selecao = null; MICRO.cantoA = null; MICRO.aviso = "SELECAO LARGADA"; return; }
  if (!a){ MICRO.aviso = "MIRE ONDE COMECA A CAIXA"; return; }
  if (!MICRO.cantoA){ MICRO.cantoA = {x: a.x, y: a.y, z: a.z}; MICRO.aviso = "B DE NOVO NO OUTRO CANTO"; return; }
  const c = caixaDeCantos(MICRO.cantoA, a);
  if (c.z1 - c.z0 < ANDAR) c.z1 = c.z0 + ANDAR;
  MICRO.selecao = c; MICRO.cantoA = null;
  MICRO.aviso = pecasNaCaixa(MICRO.mapa, c).length + " PECAS NA CAIXA";
}
function selecionadas(){ return MICRO.selecao && MICRO.mapa ? pecasNaCaixa(MICRO.mapa, MICRO.selecao) : []; }
function copiarSelecao(recortar){
  const s = selecionadas();
  if (!s.length){ MICRO.aviso = "NADA SELECIONADO"; return false; }
  const c = MICRO.selecao;
  MICRO.prancheta = modeloDaCaixa(MICRO.mapa, c, "copia");
  if (recortar) apagarSelecao();
  MICRO.aviso = s.length + (recortar ? " PECAS RECORTADAS" : " PECAS COPIADAS");
  return true;
}
function apagarSelecao(){
  const ids = new Set(selecionadas().map(function(p){ return p.id; }));
  if (!ids.size){ MICRO.aviso = "NADA SELECIONADO"; return false; }
  acaoDoCanteiro("apagar selecao", function(m, h){
    marcarPecas(h, m);
    m.pecas = m.pecas.filter(function(p){ return !ids.has(p.id); });
  });
  MICRO.selecao = null;
  return true;
}
function comecarAColar(modelo){
  const mod = modelo || MICRO.prancheta;
  if (!mod){ MICRO.aviso = "NADA COPIADO"; return false; }
  MICRO.colando = JSON.parse(JSON.stringify(mod));
  MICRO.aviso = "R GIRA, F ESPELHA, CLIQUE COLA, ESC LARGA";
  return true;
}
function largarColando(){ MICRO.colando = null; MICRO.aviso = ""; }
/* as pecas do modelo na mao, no lugar da mira, como pecas soltas */
function pecasColando(){
  const mod = MICRO.colando, a = MICRO.alvo;
  if (!mod || !a) return [];
  return mod.pecas.map(function(p){
    const est = mod.grupos.find(function(g){ return g.grupo === p.grupo; });
    return {tipo: p.tipo, estilo: est ? est.estilo : "madeira-pescador", campos: p.campos,
            x: a.x + p.x, y: a.y + p.y, z: a.z + p.z, giro: p.giro, espelho: p.espelho};
  });
}
function conferirColando(){
  for (const inst of pecasColando()){
    const r = conferirPeca(inst);
    if (!r.ok) return r;
  }
  return {ok: true, porque: ""};
}
function colarAqui(){
  const a = MICRO.alvo;
  if (!MICRO.colando || !a) return false;
  const r = conferirColando();
  if (!r.ok){ MICRO.aviso = "NAO CABE: " + r.porque.toUpperCase(); return false; }
  const mod = MICRO.colando;
  acaoDoCanteiro("colar " + (mod.nome || "modelo"), function(m, h){
    marcarPecas(h, m);
    porModelo(m, mod, a.x, a.y, a.z);
  });
  MICRO.aviso = mod.pecas.length + " PECAS COLADAS";
  return true;
}

/* ---------- o conta-gotas e o estilo de uma peca ----------
   Q (ou o botao do meio) pega a peca da mira: tipo, giro, espelho e a
   construcao dela, para continuar a mesma casa. V poe o estilo escolhido so
   na peca da mira, num campo dela. */
function pegarDaMira(){
  const id = pecaNaMira(), m = MICRO.mapa;
  const p = id >= 0 && m ? m.pecas.find(function(k){ return k.id === id; }) : null;
  if (!p){ MICRO.aviso = "NADA NA MIRA"; return null; }
  MICRO.tipo = p.tipo; MICRO.giro = p.giro || 0; MICRO.espelho = p.espelho ? 1 : 0;
  if (p.construcao !== undefined) MICRO.construcao = p.construcao;
  MICRO.aviso = "";
  return p;
}
function estiloNaPeca(){
  const id = pecaNaMira();
  if (id < 0){ MICRO.aviso = "NADA NA MIRA"; return false; }
  const estilo = MICRO.estilo;
  const mudou = acaoDoCanteiro("estilo da peca", function(m, h){
    marcarPecas(h, m);
    const p = m.pecas.find(function(k){ return k.id === id; });
    const daCasa = estiloDaPeca(Object.assign({}, p, {campos: null}), estilosDasConstrucoes(m));
    const campos = Object.assign({}, p.campos);
    if (estilo === daCasa) delete campos.estilo; else campos.estilo = estilo;   // o da casa nao precisa de campo
    if (Object.keys(campos).length) p.campos = campos; else delete p.campos;
  });
  MICRO.aviso = mudou ? "" : "A PECA JA E DESSE ESTILO";
  return mudou;
}

/* O que abre na mira: a peca que a linha de visao bate, se ela abre; senao
   a que abre com o ponto dela mais perto da linha -- a porta aberta nao tem
   solido no vao, e mirar no vao tem que achar ela. */
function abrivelNaMira(){
  const abre = function(p){ return !!p && !!TIPOS_DE_PECA[p.tipo] && !!TIPOS_DE_PECA[p.tipo].abre; };
  const id = pecaNaMira();
  const m = MICRO.mapa;
  if (!m) return null;
  const mirada = id >= 0 ? m.pecas.find(function(k){ return k.id === id; }) : null;
  if (abre(mirada)) return mirada;
  const cp = Math.cos(P.pitch), dx = Math.cos(P.ang)*cp, dy = Math.sin(P.ang)*cp, dz = Math.sin(P.pitch);
  const estilos = estilosDasConstrucoes(m);
  let melhor = null, dm = 0.6;
  for (const p of m.pecas){
    if (!abre(p) || Math.abs(p.x - camX) > 6 || Math.abs(p.y - camY) > 6) continue;
    const c = pontoQueAbre(p, estiloDaPeca(p, estilos));
    const vx = c[0] - camX, vy = c[1] - camY, vz = c[2] - camZ;
    const t = Math.max(0, Math.min(5, vx*dx + vy*dy + vz*dz));
    const d = Math.hypot(vx - dx*t, vy - dy*t, vz - dz*t);
    if (d < dm){ dm = d; melhor = p; }
  }
  return melhor;
}
/* U abre ou fecha a porta, a janela, a veneziana ou a grade na mira -- e
   ela fica assim no mapa: e assim que o jogo comeca. Um Ctrl+Z so. */
function abrirNaMira(){
  const p = abrivelNaMira();
  if (!p){ MICRO.aviso = "NADA QUE ABRA NA MIRA"; return false; }
  const id = p.id, abrindo = !pecaAberta(p);
  acaoDoCanteiro(abrindo ? "abrir" : "fechar", function(m, h){
    marcarPecas(h, m);
    const q = m.pecas.find(function(k){ return k.id === id; });
    if (q) alternarAberta(q);
  });
  MICRO.aviso = "";
  if (typeof faixa === "function") faixa(TIPOS_DE_PECA[p.tipo].nome + (abrindo ? ": aberta" : ": fechada"));   // a faixa e da tela do canteiro
  return true;
}

/* ---------- por e tirar ----------
   Cada acao e um Ctrl+Z so, no mesmo historico do macro (operacoes.js). */
function porPeca(){
  if (MICRO.colando){ colarAqui(); return; }
  const inst = pecaNaMao();
  if (!inst) return;
  const troca = MICRO.alvo && MICRO.alvo.troca;
  if (troca){
    const tipo = MICRO.tipo;
    acaoDoCanteiro("trocar peca", function(m, h){
      marcarPecas(h, m);
      const p = m.pecas.find(function(q){ return q.id === troca; });
      if (p) p.tipo = tipo;                        // o lugar, o giro, a construcao e o estilo ficam
    });
    MICRO.aviso = "";
    return;
  }
  const r = conferirPeca(inst);
  if (!r.ok){ MICRO.aviso = "NAO CABE: " + r.porque.toUpperCase(); return; }
  acaoDoCanteiro("por peca", function(m, h){
    marcarPecas(h, m);
    garantirConstrucao(m, MICRO.construcao, MICRO.estilo);
    delete inst.estilo;                          // no mapa o estilo e da construcao
    m.pecas.push(inst);
  });
  MICRO.aviso = "";
}
function tirarPeca(){
  const i = pecaNaMira();
  if (i < 0){ MICRO.aviso = "NADA NA MIRA"; return; }
  acaoDoCanteiro("tirar peca", function(m, h){
    marcarPecas(h, m);
    m.pecas = m.pecas.filter(function(p){ return p.id !== i; });
  });
  MICRO.aviso = "";
}
function garantirConstrucao(m, id, estilo){
  let c = m.construcoes.find(function(k){ return k.id === id; });
  if (!c){ c = {id: id, estilo: estilo, nome: "constru\u00e7\u00e3o " + id}; m.construcoes.push(c); }
  return c;
}

/* ---------- entrada ---------- */
const teclasMicro = Object.create(null);
function entradaDoMicro(){
  return {
    frente: (teclasMicro["w"] ? 1 : 0) - (teclasMicro["s"] ? 1 : 0),
    lado: (teclasMicro["d"] ? 1 : 0) - (teclasMicro["a"] ? 1 : 0),
    girar: (teclasMicro["arrowright"] ? 1 : 0) - (teclasMicro["arrowleft"] ? 1 : 0),
    subir: !!teclasMicro[" "], agachar: !!teclasMicro["c"], dash: !!teclasMicro["shift"],
    atirar: false, ang: P.ang, pitch: P.pitch, acoes: []
  };
}
function passoDoMicro(dt){
  P.noclip = MICRO.voando;
  P.god = true;                                  // ninguem morre construindo
  let acumulado = dt;
  let n = 0;
  while (acumulado >= PASSO_MICRO && n < 8){ update(PASSO_MICRO, entradaDoMicro()); acumulado -= PASSO_MICRO; n++; }
  MICRO.passos += n;
  const l = lugarDaPeca();
  if (l && MICRO.colando){
    MICRO.alvo = {x: l.x, y: l.y, z: l.z, ok: true, porque: "", encaixe: ""};
    const r = conferirColando();
    MICRO.alvo.ok = r.ok; MICRO.alvo.porque = r.porque;
  } else if (l){
    const alvo = trocaNaMira();
    if (alvo){
      const nomes = function(t){ return (TIPOS_DE_PECA[t] || {nome: t}).nome; };
      MICRO.alvo = {x: alvo.x, y: alvo.y, z: alvo.z, giro: alvo.giro || 0, espelho: alvo.espelho ? 1 : 0, ok: true,
                    porque: "troca " + nomes(alvo.tipo) + " por " + nomes(MICRO.tipo), encaixe: "", troca: alvo.id,
                    estilo: estiloDaPeca(alvo, estilosDasConstrucoes(MICRO.mapa)), campos: alvo.campos || null};
      return;
    }
    const inst = {tipo: MICRO.tipo, estilo: estiloNaMao(), construcao: MICRO.construcao,
                  x: l.x, y: l.y, z: l.z, giro: MICRO.giro, espelho: MICRO.espelho};
    const enc = MICRO.encaixar ? encaixar(inst) : null;
    if (enc){ inst.x += enc.dx; inst.y += enc.dy; inst.z += enc.dz; }
    if (inst.tipo === "telhado-empena") descerEmpena(inst);
    const r = conferirPeca(inst);
    MICRO.alvo = {x: inst.x, y: inst.y, z: inst.z, ok: r.ok, porque: r.porque, encaixe: enc ? enc.tipo : "", campos: inst.campos || null};
  } else MICRO.alvo = null;
}
