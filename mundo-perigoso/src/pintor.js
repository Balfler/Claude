/* ============================================================
   O PINTOR DE TEXTURAS
   ------------------------------------------------------------
   Desenha as texturas de 64 por tile dos estilos: tijolo, pedra assentada,
   tabua, telha, terra, rocha. Pinta pixel a pixel num Uint32Array, sem
   canvas -- entao roda igual no jogo, na ferramenta e no node, que e o que
   deixa a linha de comando desenhar a folha do catalogo e a vista de dentro
   do mapa sem navegador.

   Tudo aqui e deterministico: o sorteio e um gerador com semente, e a
   semente sai do nome do material. A mesma textura sai igual em qualquer
   maquina e em qualquer ordem de carregamento -- o contrario do que
   acontece com um sorteio global, onde acrescentar uma textura no meio muda
   todas as de depois.

   A borda fecha: tudo que o pintor desenha continua do outro lado, porque
   chao e parede se repetem lado a lado e costura vira grade na tela.
   ============================================================ */
/* So PINTOR sai daqui: o jogo e a ferramenta sao scripts soltos no mesmo
   escopo, e "por" e "retangulo" ja sao nomes de outros arquivos. */
const PINTOR = (function(){
/* O tile tem 128 por 128 (TEXTURA_POR_TILE, ilha.js), ou 64 com ?mundo=64.
   As receitas sao escritas em 64: E e quantas vezes a tela e maior. Medida de
   forma (fileira, tabua, bloco, mancha) vai vezes E; o que e de pixel
   (granulado, pedrisco, a luz de um pixel na beira) continua de um pixel, e
   as coisas espalhadas vem E*E vezes mais -- e isso que da o detalhe, em vez
   da mesma textura so mais lisa. */
const PINTOR_TS = typeof TEXTURA_POR_TILE === "number" ? TEXTURA_POR_TILE : 128;   // no node, sem o jogo, o padrao
const E = PINTOR_TS/64;

/* ---------- cor ---------- */
function corDeHex(h){
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function misturar(a, b, t){
  return [a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t];
}
function clarear(c, f){
  return [Math.max(0, Math.min(255, c[0]*f)), Math.max(0, Math.min(255, c[1]*f)), Math.max(0, Math.min(255, c[2]*f))];
}
function abgr(c){
  return 0xFF000000 | ((c[2] & 255) << 16) | ((c[1] & 255) << 8) | (c[0] & 255);
}

/* ---------- o sorteio com semente ---------- */
function semear(texto){
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++){ h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  return function(){ s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s/4294967296; };
}

/* ---------- a tela do pintor ---------- */
function novaTela(){
  return {px: new Uint32Array(PINTOR_TS*PINTOR_TS), n: PINTOR_TS};
}
function por(t, x, y, cor){
  const n = t.n;
  const xi = ((x | 0) % n + n) % n, yi = ((y | 0) % n + n) % n;   // a borda fecha
  t.px[yi*n + xi] = abgr(cor);
}
function pegar(t, x, y){
  const n = t.n, xi = ((x | 0) % n + n) % n, yi = ((y | 0) % n + n) % n;
  const v = t.px[yi*n + xi];
  return [v & 255, (v >> 8) & 255, (v >> 16) & 255];
}
function encher(t, cor){
  const v = abgr(cor);
  t.px.fill(v);
}
function retangulo(t, x0, y0, larg, alt, cor){
  for (let y = y0; y < y0 + alt; y++) for (let x = x0; x < x0 + larg; x++) por(t, x, y, cor);
}
/* variacao fina por pixel, o granulado que tira o chapado */
function granular(t, quanto, sorte){
  const n = t.n;
  for (let i = 0; i < n*n; i++){
    const v = t.px[i];
    const f = 1 + (sorte()*2 - 1)*quanto;
    const c = clarear([v & 255, (v >> 8) & 255, (v >> 16) & 255], f);
    t.px[i] = abgr(c);
  }
}
/* manchas redondas, que fecham na borda */
function manchar(t, quantas, raio, cor, forca, sorte){
  for (let k = 0; k < quantas; k++){
    const cx = sorte()*t.n, cy = sorte()*t.n, r = raio*(0.5 + sorte());
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++){
      const d = Math.hypot(x - cx, y - cy);
      if (d > r) continue;
      const f = forca*(1 - d/r);
      por(t, x, y, misturar(pegar(t, x, y), cor, f));
    }
  }
}
/* uma risca, que fecha na borda */
function riscar(t, x0, y0, x1, y1, cor, forca){
  const passos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= passos; i++){
    const s = i/passos, x = Math.round(x0 + (x1 - x0)*s), y = Math.round(y0 + (y1 - y0)*s);
    por(t, x, y, misturar(pegar(t, x, y), cor, forca === undefined ? 1 : forca));
  }
}

/* ---------- os desenhos ----------
   Cada um recebe a cor base e devolve a tela pintada. Os numeros vem do
   material, e o sorteio da semente dele. */

/* Pedra assentada: fileiras de altura diferente que somam 64, com a ultima
   encostando na primeira. E o muro da ilha, agora sem canvas. */
function pedraAssentada(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "pedra");
  const base = corDeHex(cor), junta = clarear(base, o.junta || 0.42);
  encher(t, junta);
  const alturas = (o.fileiras || [14, 11, 13, 12, 14]).map(function(h){ return h*E; });
  let y = 0;
  for (const h of alturas){
    let x = -Math.floor(sorte()*12*E);
    while (x < PINTOR_TS){
      const w = Math.round(((o.minima || 12) + Math.floor(sorte()*(o.variacao || 14)))*E);
      const tom = clarear(base, 0.86 + sorte()*0.34);
      /* a junta e forma (vezes E); a luz e a sombra na beira, um pixel */
      retangulo(t, x, y + E, w - 2*E, h - 2*E, tom);
      retangulo(t, x, y + E, w - 2*E, 1, clarear(tom, 1.16));          // luz em cima
      retangulo(t, x, y + h - E - 1, w - 2*E, 1, clarear(tom, 0.78));  // sombra embaixo
      x += w;
    }
    y += h;
  }
  granular(t, o.granulado === undefined ? 0.06 : o.granulado, sorte);
  return t;
}
/* Cantaria: blocos grandes e regulares, a pedra da fortaleza */
function cantaria(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "cantaria");
  const base = corDeHex(cor);
  encher(t, clarear(base, o.junta || 0.5));
  const alt = (o.alturaDoBloco || 16)*E, larg = (o.larguraDoBloco || 32)*E;
  for (let fila = 0; fila*alt < PINTOR_TS; fila++){
    const desloca = (fila % 2) ? larg/2 : 0;
    for (let x = -larg; x < PINTOR_TS; x += larg){
      const tom = clarear(base, 0.9 + sorte()*0.2);
      retangulo(t, x + desloca + E, fila*alt + E, larg - 2*E, alt - 2*E, tom);
      retangulo(t, x + desloca + E, fila*alt + E, larg - 2*E, 1, clarear(tom, 1.14));
      retangulo(t, x + desloca + E, fila*alt + alt - E - 1, larg - 2*E, 1, clarear(tom, 0.82));
      /* o desgaste do canto, que tira a cara de desenho vetorial */
      for (let k = 0; k < 6*E*E; k++)
        por(t, x + desloca + 2 + Math.floor(sorte()*(larg - 4)), fila*alt + 2 + Math.floor(sorte()*(alt - 4)),
            clarear(tom, 0.8 + sorte()*0.3));
    }
  }
  granular(t, 0.05, sorte);
  return t;
}
/* Tabua em pe: a parede de madeira */
function tabuado(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "tabua");
  const base = corDeHex(cor), larg = (o.larguraDaTabua || 8)*E;
  encher(t, clarear(base, 0.55));
  for (let x = 0; x < PINTOR_TS; x += larg){
    const tom = clarear(base, 0.85 + sorte()*0.3);
    retangulo(t, x, 0, larg - E, PINTOR_TS, tom);                  // a fresta entre as tabuas e forma: E pixels
    retangulo(t, x, 0, 1, PINTOR_TS, clarear(tom, 1.12));
    for (let k = 0; k < 4*E*E; k++){                                // veios
      const vx = x + 1 + Math.floor(sorte()*(larg - 2)), vy = Math.floor(sorte()*PINTOR_TS);
      riscar(t, vx, vy, vx, vy + (8 + Math.floor(sorte()*16))*E, clarear(tom, 0.76), 0.6);
    }
    if (sorte() < 0.4){                                             // no da madeira
      const nx = x + 2 + Math.floor(sorte()*(larg - 4)), ny = Math.floor(sorte()*PINTOR_TS);
      manchar(t, 1, 1.6, clarear(tom, 0.6), 0.8, function(){ return 0.5; });
      por(t, nx, ny, clarear(tom, 0.55));
    }
  }
  if (o.travessas !== false){
    for (const y of (o.ondeTravessa || [10, 50])) retangulo(t, 0, y*E, PINTOR_TS, 3*E, clarear(base, 0.62));
  }
  granular(t, 0.05, sorte);
  return t;
}
/* Tabuado deitado: o piso de madeira */
function assoalho(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "assoalho");
  const base = corDeHex(cor), alt = (o.larguraDaTabua || 8)*E;
  encher(t, clarear(base, 0.55));
  for (let y = 0; y < PINTOR_TS; y += alt){
    const tom = clarear(base, 0.85 + sorte()*0.3);
    retangulo(t, 0, y, PINTOR_TS, alt - E, tom);
    for (let k = 0; k < 5*E*E; k++){
      const vy = y + 1 + Math.floor(sorte()*(alt - 2)), vx = Math.floor(sorte()*PINTOR_TS);
      riscar(t, vx, vy, vx + (6 + Math.floor(sorte()*14))*E, vy, clarear(tom, 0.78), 0.55);
    }
    retangulo(t, Math.floor(sorte()*PINTOR_TS), y, E, alt - E, clarear(tom, 0.6));   // emenda
  }
  granular(t, 0.05, sorte);
  return t;
}
/* Telha de barro, vista de cima */
function telha(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "telha");
  const base = corDeHex(cor);
  encher(t, clarear(base, 0.5));
  const alt = (o.passo || 8)*E;
  for (let fila = 0; fila*alt < PINTOR_TS; fila++){
    const desloca = (fila % 2) ? alt/2 : 0;
    for (let x = -alt; x < PINTOR_TS; x += alt){
      const tom = clarear(base, 0.86 + sorte()*0.32);
      for (let dy = 0; dy < alt - E; dy++){
        const largura = alt - E - Math.max(0, dy - (alt - 4*E));
        retangulo(t, x + desloca, fila*alt + dy, largura, 1, clarear(tom, 1 - dy*0.02/E));
      }
      retangulo(t, x + desloca, fila*alt + alt - E, alt - E, E, clarear(base, 0.55));
      if (E > 1){                                                   // em 128: a fresta do lado e o barro manchado
        retangulo(t, x + desloca + alt - E - 1, fila*alt, 1, alt - E, clarear(tom, 0.62));
        retangulo(t, x + desloca, fila*alt, alt - E - 1, 1, clarear(tom, 1.18));
        for (let k = 0; k < 4*E*E; k++)
          por(t, x + desloca + Math.floor(sorte()*(alt - E - 1)), fila*alt + 1 + Math.floor(sorte()*(alt - E - 2)), clarear(tom, 0.78 + sorte()*0.4));
      }
    }
  }
  granular(t, 0.05, sorte);
  return t;
}
/* Rocha: facetas irregulares, para penhasco e caverna */
function rocha(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "rocha");
  const base = corDeHex(cor);
  encher(t, base);
  for (let k = 0; k < (o.facetas || 60)*E*E; k++){
    const cx = sorte()*PINTOR_TS, cy = sorte()*PINTOR_TS, r = (3 + sorte()*9)*(E > 1 ? 0.5 + 0.5*E*sorte() : 1);
    const tom = clarear(base, 0.72 + sorte()*0.5);
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++){
      const dx = (x - cx)/r, dy = (y - cy)/r;
      if (dx*dx + dy*dy > 1) continue;
      if (dx + dy > 0.7) continue;                       // corta reto: vira faceta, nao bola
      por(t, x, y, tom);
    }
  }
  for (let k = 0; k < (o.fendas || 10)*E; k++){          // fendas
    let x = sorte()*PINTOR_TS, y = sorte()*PINTOR_TS;
    for (let s = 0; s < 5; s++){
      const nx = x + (sorte() - 0.5)*10*E, ny = y + (3 + sorte()*6)*E;
      riscar(t, x, y, nx, ny, clarear(base, 0.55), 0.8);
      x = nx; y = ny;
    }
  }
  granular(t, 0.08, sorte);
  return t;
}
/* Terra, areia, lama: manchas e pedriscos */
function terra(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "terra");
  const base = corDeHex(cor);
  encher(t, base);
  manchar(t, (o.manchas || 40)*E*E, 6*E, clarear(base, 0.78), 0.4, sorte);
  manchar(t, (o.manchas || 40)*E*E, 5*E, clarear(base, 1.2), 0.3, sorte);
  for (let k = 0; k < (o.pedriscos || 50)*E*E; k++){
    const x = sorte()*PINTOR_TS, y = sorte()*PINTOR_TS;
    por(t, x, y, clarear(base, 1.35));
    por(t, x + 1, y, clarear(base, 0.7));
  }
  granular(t, 0.07, sorte);
  return t;
}
/* A chama: amarela embaixo, laranja e vermelha para cima, em linguas que
   sobem. E a mesma em todo estilo -- fogo nao muda com a casa. */
function chama(cor, opcoes){
  const o = opcoes || {}, t = novaTela(), sorte = semear(o.semente || "chama");
  const base = corDeHex(cor || "#ff8a30");
  for (let y = 0; y < PINTOR_TS; y++){
    const v = y/PINTOR_TS;                              // 0 no alto da textura, 1 embaixo
    const c = v > 0.6 ? misturar(base, [255, 236, 150], (v - 0.6)/0.4) : misturar([200, 50, 20], base, v/0.6);
    for (let x = 0; x < PINTOR_TS; x++) por(t, x, y, c);
  }
  for (let k = 0; k < (o.linguas || 14)*E; k++){
    const x = sorte()*PINTOR_TS, alto = (12 + sorte()*28)*E;
    riscar(t, x, PINTOR_TS, x + (sorte() - 0.5)*10*E, PINTOR_TS - alto, [255, 214, 110], 0.55);
  }
  granular(t, 0.08, sorte);
  return t;
}
/* A vidraca: o caixilho de madeira em volta, a cruz no meio e quatro vidros
   -- transparentes, que o pixel vazio o motor nao desenha --, cada um com um
   reflexo largo, em xadrez, e um fino ao lado. A textura vai presa na folha
   inteira (de 0 a 1 nela), nao repetida no mundo; por isso nao granula, que
   o granulado encheria o vidro. */
/* As texturas presas na folha (vidraca, porta, veneziana) sao desenhos com
   medida certa em pixel de 64: em 128 elas saem em 64 e cada pixel vira E*E,
   o mesmo desenho, que nao repete no mundo e nao ganharia com mais pixel. */
function em64(desenho){
  return function(cor, opcoes){
    if (E === 1) return desenho(cor, opcoes, novaTela());
    const p = desenho(cor, opcoes, {px: new Uint32Array(64*64), n: 64}), t = novaTela();
    for (let y = 0; y < PINTOR_TS; y++) for (let x = 0; x < PINTOR_TS; x++) t.px[y*PINTOR_TS + x] = p.px[((y/E) | 0)*64 + ((x/E) | 0)];
    return t;
  };
}
const vidraca = em64(function(cor, opcoes, t){
  const o = opcoes || {}, sorte = semear(o.semente || "vidraca");
  const base = corDeHex(cor), n = t.n, borda = o.borda || 5, cruz = o.cruz || 2, meio = n/2;
  const vidros = [];
  for (const y0 of [borda, meio + cruz]) for (const x0 of [borda, meio + cruz]) vidros.push([x0, y0, meio - cruz - borda]);
  const noVidro = function(x, y){
    for (const v of vidros) if (x >= v[0] && x < v[0] + v[2] && y >= v[1] && y < v[1] + v[2]) return v;
    return null;
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++){
    if (noVidro(x, y)) continue;
    /* a quina de dentro do caixilho mais escura, o resto com um veio */
    const quina = noVidro(x + 1, y) || noVidro(x, y + 1) || noVidro(x - 1, y) || noVidro(x, y - 1);
    por(t, x, y, clarear(base, quina ? 0.62 : 0.9 + sorte()*0.2));
  }
  const reflexo = [206, 222, 228];
  for (const v of vidros){
    const lado = v[2];
    for (let dy = 0; dy < lado; dy++) for (let dx = 0; dx < lado; dx++){
      const d = dx + (lado - 1 - dy);                     // a diagonal que sobe para a direita
      const largo = d >= lado*0.55 && d < lado*0.55 + 4 && ((dx + dy) & 1) === 0;
      const fino = d === Math.round(lado*0.55) + 6;
      if (largo || fino) por(t, v[0] + dx, v[1] + dy, reflexo);
    }
  }
  return t;
});
/* A folha de porta: tabuas em pe, as duas travessas e a mao-francesa entre
   elas, os pregos, e a argola de ferro perto da ponta que abre (u alto).
   Mais escura que a madeira do estilo, para a porta nao sumir na parede de
   tabua. Presa na folha, como a vidraca. */
const portaDeTabuas = em64(function(cor, opcoes, t){
  const o = opcoes || {}, sorte = semear(o.semente || "porta");
  const base = clarear(corDeHex(cor), o.tom || 0.78), n = t.n, larg = 8;
  const ferro = [58, 56, 60];
  for (let x = 0; x < n; x += larg){
    const tom = clarear(base, 0.88 + sorte()*0.24);
    retangulo(t, x, 0, larg, n, tom);
    retangulo(t, x, 0, 1, n, clarear(tom, 0.55));                  // a junta entre as tabuas
    for (let k = 0; k < 3; k++){
      const vx = x + 2 + Math.floor(sorte()*(larg - 3)), vy = Math.floor(sorte()*n);
      riscar(t, vx, vy, vx, vy + 6 + Math.floor(sorte()*14), clarear(tom, 0.8), 0.6);
    }
  }
  const travessa = function(y0){
    retangulo(t, 0, y0, n, 6, clarear(base, 1.08));
    retangulo(t, 0, y0 + 6, n, 1, clarear(base, 0.5));             // a sombra embaixo
    for (let x = 4; x < n; x += larg) por(t, x, y0 + 3, ferro);    // os pregos
  };
  travessa(8); travessa(50);
  /* a mao-francesa: sobe da dobradica, embaixo, para a ponta, em cima */
  for (let y = 15; y < 50; y++){
    const x = Math.round(4 + (49 - y)*(n - 12)/35);
    for (let k = -3; k <= 3; k++) por(t, x + k, y, clarear(base, k === 3 ? 0.5 : (k === -3 ? 1.28 : 1.1)));
  }
  /* a argola */
  const ax = n - 9, ay = 33;
  for (let a = 0; a < 16; a++){
    const r = a/16*Math.PI*2;
    por(t, Math.round(ax + Math.cos(r)*3), Math.round(ay + 1 + Math.sin(r)*3), ferro);
  }
  retangulo(t, ax - 1, ay - 4, 3, 3, ferro);
  granular(t, 0.04, sorte);
  return t;
});
/* A veneziana: o quadro de madeira e as tabuinhas deitadas, cada uma com a
   beira de cima clara e a sombra embaixo, e a travessa no meio. Presa na
   folha como a vidraca. */
const persiana = em64(function(cor, opcoes, t){
  const o = opcoes || {}, sorte = semear(o.semente || "persiana");
  const base = corDeHex(cor), n = t.n, borda = o.borda || 6, passo = o.passo || 5, meio = n/2;
  encher(t, clarear(base, 0.95));
  for (let y = borda; y < n - borda; y++){
    const k = (y - borda) % passo;
    const f = k === 0 ? 1.22 : (k === passo - 1 ? 0.42 : 1.02 - k*0.07);
    for (let x = borda; x < n - borda; x++) por(t, x, y, clarear(base, f));
  }
  retangulo(t, borda, meio - 2, n - 2*borda, 4, clarear(base, 0.95));
  for (let x = borda; x < n - borda; x++){ por(t, x, borda, clarear(base, 0.5)); por(t, x, meio + 2, clarear(base, 0.5)); }
  for (let y = borda; y < n - borda; y++){ por(t, borda, y, clarear(base, 0.62)); por(t, n - borda - 1, y, clarear(base, 0.8)); }
  granular(t, 0.04, sorte);
  return t;
});
/* Um vao com moldura -- janela, seteira, grade -- pintado por cima de outra
   textura. `forma` diz o desenho do buraco. */
function abrirVao(t, x0, y0, larg, alt, escuro, moldura, forma){
  for (let y = y0; y < y0 + alt; y++) for (let x = x0; x < x0 + larg; x++){
    const u = (x - x0)/larg, v = (y - y0)/alt;
    if (forma === "arco" && v < 0.35 && Math.hypot((u - 0.5)/0.5, (v - 0.35)/0.35) > 1) continue;
    if (forma === "fresta" && (u < 0.35 || u > 0.65) && v > 0.25 && v < 0.75) continue;
    por(t, x, y, escuro);
  }
  if (moldura){
    for (let x = x0 - 1; x <= x0 + larg; x++){ por(t, x, y0 - 1, moldura); por(t, x, y0 + alt, moldura); }
    for (let y = y0 - 1; y <= y0 + alt; y++){ por(t, x0 - 1, y, moldura); por(t, x0 + larg, y, moldura); }
  }
  return t;
}

return {
  TS: PINTOR_TS, corDeHex, misturar, clarear, abgr, semear,
  novaTela, por, pegar, encher, retangulo, granular, manchar, riscar,
  pedraAssentada, cantaria, tabuado, assoalho, telha, rocha, terra, chama, vidraca, persiana, portaDeTabuas, abrirVao
};
})();
if (typeof module !== "undefined") module.exports = PINTOR;
