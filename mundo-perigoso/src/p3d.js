/* ============================================================
   O CENARIO DA ILHA EM VOXELS
   ------------------------------------------------------------
   Arvores, pedras, moveis de rua e os moradores. Saem do mesmo assador das
   criaturas, entao tem o mesmo volume, a mesma luz e o mesmo pontilhado --
   so que com um quadro so. Uma arvore nao tem frente, e o Doom desenhava a
   dele assim. O morador tambem vai de um quadro so por enquanto: ele sempre
   encara voce, ate o personagem por pecas existir.

   So e assado quando o jogo abre um mapa do editor; a cripta nao paga nada.

   Tres regras que todos seguem:
   - O voxel tem o tamanho do voxel das criaturas, VOX_TILE. E o que deixa
     uma arvore do tamanho certo ao lado de um goblin.
   - Tudo desbota na bruma do fim de tarde, como o terreno. Arvore longe que
     escurecesse em vez de desbotar ficaria recortada contra o morro.
   - Nada tem coordenada quebrada em caixa: o grid e inteiro, e caixa com
     canto fracionado escreve fora dele sem dar erro.
   ============================================================ */
/* VOX_TILE, as rampas de roupa e cabelo e o morador moram em p3e.js, o
   personagem por pecas: o morador e montado pelo mesmo sistema do jogador. */
const R_FOLHA   = ["#0e1a0a","#1a3012","#2a4a1a","#3d6424","#557f30","#72993e","#95b456"];
const R_PINHO   = ["#08140e","#102419","#1a3824","#264d30","#35623c","#4a784a"];
const R_CASCA   = ["#140c06","#24160c","#382414","#4e341e","#664628"];
const R_ROCHA   = ["#1a1916","#2e2c28","#46423c","#5f5a52","#7a746a","#969084","#b4ae9f"];
const R_MUSGO   = ["#1a2410","#2c3c18","#415622","#566e2e"];
const R_FERRO   = ["#0e0e10","#1e1e22","#34343a","#4e4e56","#6c6c76"];
const R_TELHA   = ["#2a0e08","#4a1a10","#6e2a1a","#8e3c26","#ac5436"];
const R_POCO    = ["#060c14","#0c1828","#16283e"];
const R_BAGA    = ["#3a0806","#7a140e","#c02a1c","#e85a40"];
const R_CHAMA   = ["#e2760e","#ffab2a","#ffe08a","#fff6d0"];
const R_TINTA   = ["#0c0804","#1a1006","#241808"];
const R_TABUA   = ["#3a2412","#5a3a1e","#7c5630","#a07a4a","#c29c68"];

const P_CENARIO = hexPal(R_FOLHA.concat(R_PINHO, R_CASCA, R_ROCHA, R_MUSGO, R_WOOD, R_FERRO,
                                        R_TELHA, R_POCO, R_BAGA, R_CHAMA, R_TINTA, R_TABUA));

/* variacao que so depende do lugar -- a mesma arvore no mesmo tile, sempre */
function hashTile(x, y){ return (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0; }
/* e a do morador depende do nome, para o Tobias ter sempre a mesma roupa */
function hashTexto(s){
  let h = 2166136261;
  for (let i=0; i<s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* Assado na primeira vez que um mapa do editor abre -- no carregamento, ou
   quando se chega nele vindo da cripta. */
/* voxels por tile do cenario; 0 = os 37 de sempre. ?cenario=64 muda */
const CENARIO_VOX_POR_TILE = typeof BUSCA_INICIAL === "string" && /[?&]cenario=(\d+)/.test(BUSCA_INICIAL) ? +BUSCA_INICIAL.match(/[?&]cenario=(\d+)/)[1] : TEXTURA_POR_TILE > 64 ? TEXTURA_POR_TILE : 0;   // ?mundo=128 sobe o cenario junto
function moradoresAssados(){
  return {imgs:[0,1,2,3].map(function(v){ return assarPersonagem(moradorDaVariante(v), 1, HORIZONTE, [0])[0][0]; }),
          larg:DIM_PERSONAGEM.DX*VOX_PERSONAGEM, alto:DIM_PERSONAGEM.DZ*VOX_PERSONAGEM, raio:0.24, fala:1, porNome:1};
}
function assarCenario(){

  function modeloArvore(v){
    const p = [], c = 22;
    const meio = v ? 2 : -1, topo = v ? -2 : 3;
    p.push(vxOsso(c, c, 0, c+meio, c, 22, 3.6, 2.6, 1));            // tronco torto
    p.push(vxOsso(c+meio, c, 22, c+topo, c-1, 40, 2.6, 1.8, 1));
    p.push(vxOsso(c, c, 2, c-7, c+2, 0, 1.8, 1.0, 1));              // raizes
    p.push(vxOsso(c, c, 2, c+7, c-2, 0, 1.8, 1.0, 1));
    p.push(vxOsso(c, c, 30, c-10, c, 44, 1.6, 1.0, 1));             // galhos
    p.push(vxOsso(c, c, 32, c+11, c+2, 46, 1.6, 1.0, 1));
    const copa = v
      ? [[22,22,54,15,14,12],[12,20,48,9,9,8],[32,24,50,10,9,8],[20,26,64,10,9,8],[28,18,60,8,8,7]]
      : [[22,22,52,16,15,13],[10,22,46,9,9,8],[34,20,47,9,9,8],[24,22,64,11,10,8],[14,24,60,8,8,6]];
    for (const b of copa) p.push(vxBola(b[0], b[1], b[2], b[3], b[4], b[5], 2));
    /* tufos soltos na borda: copa lisa vira bola de gude */
    for (let k=0; k<10; k++){
      const a = k/10*TAU + v;
      p.push(vxBola(22 + Math.cos(a)*15, 22 + Math.sin(a)*12, 50 + (k*7)%9, 3.5, 3.5, 3, 2));
    }
    return p;
  }

  function modeloPinheiro(){
    const p = [], c = 18;
    p.push(vxOsso(c, c, 0, c, c, 30, 2.8, 2.0, 1));
    for (let k=0; k<7; k++){                                        // andares de galhos
      const t = k/6, z = 18 + t*56, r = 16 - t*12;
      p.push(vxBola(c, c, z, r, r, 5.5 - t*2, 2));
      p.push(vxBola(c, c, z+4, r*0.7, r*0.7, 4, 2));
    }
    p.push(vxOsso(c, c, 72, c, c, 84, 2.5, 0.6, 2));                // ponta
    return p;
  }

  function modeloArbusto(v){
    const p = [];
    const bolas = v
      ? [[17,17,9,11,10,8],[9,18,7,7,7,6],[25,16,8,7,7,6],[16,20,15,7,7,6]]
      : [[17,17,8,12,11,7],[10,15,7,7,7,6],[24,19,7,8,7,6],[18,14,13,7,6,6]];
    for (const b of bolas) p.push(vxBola(b[0], b[1], b[2], b[3], b[4], b[5], 1));
    if (v) for (let k=0; k<6; k++) p.push(vxCaixa(7 + k*4, 6 + (k%2), 6 + (k*5)%8, 1, 1, 1, 2));   // bagas
    return p;
  }

  function modeloPedra(v){
    const p = [];
    if (v){ p.push(vxBola(15,13,7, 13,11,8, 1)); p.push(vxBola(10,11,12, 7,6,5, 1)); p.push(vxBola(21,15,5, 6,6,5, 1)); }
    else  { p.push(vxBola(14,13,8, 12,10,9, 1)); p.push(vxBola(20,12,12, 6,6,6, 1)); p.push(vxBola(7,14,4, 5,5,4, 1)); }
    p.push(vxBola(12, 12, v ? 15 : 14, 6, 5, 2, 2));                 // musgo por cima
    return p;
  }

  function modeloBarril(){
    const p = [];
    for (let z=0; z<22; z++){
      const bojo = 7 + Math.sin(z/21*Math.PI)*1.6;
      const aro = z === 3 || z === 4 || z === 17 || z === 18;
      p.push(vxBola(9, 9, z + 0.5, bojo, bojo, 0.8, aro ? 2 : 1));
    }
    p.push(vxBola(9, 9, 22, 6.8, 6.8, 0.8, 1));
    return p;
  }

  function modeloCaixote(){
    const p = [vxCaixa(2, 2, 0, 16, 16, 15, 1)];
    p.push(vxCaixa(2, 1, 0, 16, 1, 2, 2)); p.push(vxCaixa(2, 1, 13, 16, 1, 2, 2));   // moldura
    p.push(vxCaixa(2, 1, 0, 2, 1, 15, 2)); p.push(vxCaixa(16, 1, 0, 2, 1, 15, 2));
    for (let k=0; k<13; k++) p.push(vxCaixa(3 + k, 1, 1 + k, 2, 1, 1, 2));             // travessa
    return p;
  }

  function modeloLampiao(){
    const p = [];
    p.push(vxCaixa(4, 4, 0, 6, 6, 3, 2));                            // base de pedra
    p.push(vxCaixa(6, 6, 3, 2, 2, 36, 1));                           // poste
    p.push(vxCaixa(3, 3, 39, 8, 8, 1, 3));
    p.push(vxCaixa(4, 4, 40, 6, 6, 6, 4));                           // vidro aceso
    for (const q of [[4,4],[9,4],[4,9],[9,9]]) p.push(vxCaixa(q[0], q[1], 40, 1, 1, 6, 3));
    p.push(vxCaixa(3, 3, 46, 8, 8, 1, 3));
    p.push(vxOsso(7, 7, 47, 7, 7, 49, 2.5, 0.5, 3));
    return p;
  }

  function modeloPoco(){
    const p = [], c = 18;
    for (let a=0; a<24; a++){                                        // mureta redonda
      const t = a/24*TAU;
      p.push(vxBola(c + Math.cos(t)*12, c + Math.sin(t)*12, 5, 3.4, 3.4, 5.5, 1));
    }
    p.push(vxBola(c, c, 7, 9, 9, 1, 5));                             // agua escura
    p.push(vxCaixa(4, c-1, 10, 3, 3, 28, 2)); p.push(vxCaixa(29, c-1, 10, 3, 3, 28, 2));
    p.push(vxCaixa(4, c-1, 30, 28, 2, 2, 2));                        // sarilho
    p.push(vxOsso(c, c, 30, c, c, 21, 0.8, 0.8, 2));                 // corda
    p.push(vxCaixa(c-2, c-2, 17, 4, 4, 4, 2));                       // balde
    for (let k=0; k<7; k++)                                          // telhadinho
      p.push(vxCaixa(2, 8 + Math.round(k*1.5), 38 + k, 32, Math.max(2, 20 - k*3), 1, 4));
    return p;
  }

  function modeloPlaca(){
    const p = [];
    p.push(vxCaixa(10, 4, 0, 2, 2, 24, 1));                          // poste
    p.push(vxCaixa(2, 3, 12, 18, 2, 10, 2));                         // tabua
    p.push(vxCaixa(2, 2, 12, 18, 1, 1, 1)); p.push(vxCaixa(2, 2, 21, 18, 1, 1, 1));
    for (let k=0; k<3; k++) p.push(vxCaixa(5, 2, 14 + k*2, 12 - k*2, 1, 1, 3));   // letras
    return p;
  }

  /* A entrada de dungeon: um arco de pedra sobre uma escada que desce para o
     escuro. E o escuro que diz "entrada" de longe; os degraus aparecem na
     frente dele. */
  function modeloEntrada(){
    const p = [];
    p.push(vxCaixa(3, 5, 0, 7, 7, 30, 1)); p.push(vxCaixa(24, 5, 0, 7, 7, 30, 1));      // pilares
    for (let a=0; a<=12; a++){                                                          // arco
      const t = a/12*Math.PI;
      p.push(vxBola(17 - Math.cos(t)*10.5, 8.5, 28 + Math.sin(t)*7, 3.6, 3.6, 3.2, 1));
    }
    p.push(vxCaixa(10, 7, 0, 14, 3, 30, 2));                                             // o escuro
    for (let k=0; k<4; k++) p.push(vxCaixa(10, 6, 2 + k*5, 14, 1, 1, 1));                // degraus
    p.push(vxBola(8, 5, 32, 3, 2, 2, 3)); p.push(vxBola(27, 5, 20, 2.5, 2, 3, 3));        // musgo
    return p;
  }

  /* Voxels por tile do cenario: 37 hoje; ?cenario=64 (o plano do DESIGN.md) refaz
     a conta -- cada peca do modelo, que e bola e capsula por codigo, cresce
     na mesma proporcao, e o volume tem mais voxels para o mesmo tamanho no
     mundo. A arvore continua do tamanho dela: so ganha detalhe. */
  const K = CENARIO_VOX_POR_TILE > 0 ? CENARIO_VOX_POR_TILE*VOX_TILE : 1;
  function crescer(pecas){
    if (K === 1) return pecas;
    return pecas.map(function(p){
      const q = Object.assign({}, p);
      for (const c of ["x0","y0","z0","x1","y1","z1","cx","cy","cz","rx","ry","rz","r0","r1"]) if (q[c] !== undefined) q[c] *= K;
      if (q.a) q.a = q.a.map(function(v){ return v*K; });
      if (q.b) q.b = q.b.map(function(v){ return v*K; });
      return q;
    });
  }
  /* Em 37 cada voxel vira 2x2 pixels no sprite; com mais voxels, um pixel por
     voxel ja basta (o sprite de 128 com 2x2 teria 256 pixels por tile). E com
     mais voxels o sprite ganha as copias para longe, como o personagem
     (reduzirGrade, p3e.js): sem elas a arvore cintila de longe. `porTile` e
     quantos pixels do sprite cabem num tile, para quadroPelaDistancia. */
  const ESC_CENARIO = K > 1 ? 1 : 2;
  function assa(pecas, DX, DY, DZ, mats, pal){
    if (K !== 1){ pecas = crescer(pecas); DX = Math.ceil(DX*K); DY = Math.ceil(DY*K); DZ = Math.ceil(DZ*K); }
    const g = montarVoxels(pecas, DX, DY, DZ);
    const q = assarRotacoes(peleDoModelo(g, DX, DY, DZ), DX, DY, DZ, mats, 1, ESC_CENARIO, pal, 0.62, 0, 0, HORIZONTE)[0];
    if (K > 1){
      q.porTile = ESC_CENARIO*K/VOX_TILE;
      let r = {g:g, DX:DX, DY:DY, DZ:DZ}, ant = q;
      for (let n = 0; n < 2 && r.DZ > 8; n++){
        r = reduzirGrade(r.g, r.DX, r.DY, r.DZ);
        ant.longe = assarRotacoes(peleDoModelo(r.g, r.DX, r.DY, r.DZ), r.DX, r.DY, r.DZ, mats, 1, ESC_CENARIO, pal, 0.62, 0, 0, HORIZONTE)[0];
        ant = ant.longe;
      }
    }
    return q;
  }
  /* raio e o circulo que barra a passagem; zero atravessa. `solto` sorteia um
     deslocamento dentro do tile, para a floresta nao nascer em grade. */
  function tipo(imgs, DX, DZ, raio, extra){
    return Object.assign({imgs:imgs, larg:DX*VOX_TILE, alto:DZ*VOX_TILE, raio:raio}, extra || {});
  }
  const M_ARVORE   = [{tons:R_CASCA}, {tons:R_FOLHA}];
  const M_PINHEIRO = [{tons:R_CASCA}, {tons:R_PINHO}];
  const M_ARBUSTO  = [{tons:R_FOLHA}, {tons:R_BAGA}];
  const M_PEDRA    = [{tons:R_ROCHA}, {tons:R_MUSGO}];
  const M_BARRIL   = [{tons:R_WOOD}, {tons:R_FERRO}];
  const M_CAIXOTE  = [{tons:R_TABUA}, {tons:R_WOOD.slice(0,4)}];
  const M_LAMPIAO  = [{tons:R_WOOD}, {tons:R_ROCHA}, {tons:R_FERRO}, {tons:R_CHAMA, emissivo:1}];
  const M_POCO     = [{tons:R_ROCHA}, {tons:R_WOOD}, {tons:R_FERRO}, {tons:R_TELHA}, {tons:R_POCO}];
  const M_PLACA    = [{tons:R_WOOD}, {tons:R_TABUA}, {tons:R_TINTA}];

  return {
    arvore:   tipo([assa(modeloArvore(0), 44, 44, 76, M_ARVORE, P_CENARIO),
                    assa(modeloArvore(1), 44, 44, 76, M_ARVORE, P_CENARIO)], 44, 76, 0.20, {solto:1}),
    pinheiro: tipo([assa(modeloPinheiro(), 36, 36, 86, M_PINHEIRO, P_CENARIO)], 36, 86, 0.18, {solto:1}),
    arbusto:  tipo([assa(modeloArbusto(0), 34, 34, 24, M_ARBUSTO, P_CENARIO),
                    assa(modeloArbusto(1), 34, 34, 24, M_ARBUSTO, P_CENARIO)], 34, 24, 0, {solto:1}),
    pedra:    tipo([assa(modeloPedra(0), 30, 26, 20, M_PEDRA, P_CENARIO),
                    assa(modeloPedra(1), 30, 26, 20, M_PEDRA, P_CENARIO)], 30, 20, 0.34, {solto:1}),
    barril:   tipo([assa(modeloBarril(), 18, 18, 24, M_BARRIL, P_CENARIO)], 18, 24, 0.22),
    caixote:  tipo([assa(modeloCaixote(), 20, 20, 18, M_CAIXOTE, P_CENARIO)], 20, 18, 0.26),
    lampiao:  tipo([assa(modeloLampiao(), 14, 14, 50, M_LAMPIAO, P_CENARIO)], 14, 50, 0.10),
    poco:     tipo([assa(modeloPoco(), 36, 36, 50, M_POCO, P_CENARIO)], 36, 50, 0.46),
    placa:    tipo([assa(modeloPlaca(), 22, 10, 26, M_PLACA, P_CENARIO)], 22, 26, 0.10, {fala:1}),
    entrada:  tipo([assa(modeloEntrada(), 34, 16, 40, [{tons:R_ROCHA}, {tons:R_POCO}, {tons:R_MUSGO}], P_CENARIO)],
                   34, 40, 0, {fala:1, entrada:1}),
    /* o morador e o personagem por pecas, de um quadro so: ele sempre encara
       voce, ate os moradores terem conversa e rumo */
    npc:      moradoresAssados()
  };
}
/* a saida de dungeon e a mesma arcada da entrada, com outra mao: sobe */
function comSaida(c){ if (c && c.entrada && !c.saida) c.saida = Object.assign({}, c.entrada, {entrada: 0, saida: 1}); return c; }
let CENARIO = ILHA ? comSaida(assarCenario()) : null;
