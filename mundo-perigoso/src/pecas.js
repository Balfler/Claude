/* ============================================================
   AS PECAS
   ------------------------------------------------------------
   Uma peca e dado, nao desenho. O TIPO diz a forma -- montada com meia
   duzia de formas simples, num sistema de coordenadas proprio -- e o ESTILO
   diz os materiais e as medidas que mudam (src/estilos.js). Acrescentar um
   estilo e uma entrada la; acrescentar um tipo e uma entrada aqui. Nem o
   motor nem a ferramenta mudam.

   Uma peca posta no mundo e:

     {id, tipo, x, y, z, giro, espelho, construcao, campos}

   `x, y` e o canto de onde a peca cresce, em quartos de tile; `z`, a altura
   em degraus de 0,25; `giro`, o quarto de volta (0, 90, 180, 270 -- e 45
   nos tipos que aceitam); `espelho` troca esquerda e direita. `construcao`
   agrupa as pecas de uma casa, e o estilo mora nela. `campos` guarda o que
   o tipo aceita a mais (a grade levantada, a cor da luz).

   Cada tipo devolve tres coisas:

   - **faces**: poligonos convexos com material, para o desenho. A textura
     e LOCAL a peca: u corre ao longo da face e v e a altura (-z), a mesma
     conta das paredes de terreno.
   - **solidos**: prismas convexos -- um poligono no chao, de z0 a z1, com o
     topo reto ou inclinado. E o que a fisica pergunta: se bate, que chao
     esta sob o pe e que teto esta sobre a cabeca.
   - **encaixes**: pontos onde outra peca cola -- a ponta e o alto da
     parede, a borda do piso, o pe e o alto da escada. Saem das formas
     simples, entao sempre batem com a geometria.

   As formas simples sao: o PANO de parede com vaos (e o arco dentro dele),
   a CAIXA, o PRISMA de um poligono qualquer (a coluna, a torre, a rocha), o
   ANEL (a parede da torre redonda, o poco), o plano INCLINADO (rampa, agua
   de telhado) e a ESCADA.

   As medidas saem do jogador (raio 0,26, altura 0,85, degrau de 0,42): um
   andar tem 1,5 tile, a parede fina 0,125 de espessura, e o vao de porta
   0,75 x 1,1.

   `andar` diz o que o corpo faz com a peca, e o teste da grade de andar
   confere todo tipo que diz: "barra" (fechando uma sala, ninguem entra),
   "passa" (no lugar de uma parede da sala, entra-se por ela -- a porta e a
   grade fechadas tambem, que abrem), "sobe" (leva
   do chao ao alto dela), "pisa" (fica-se em pe em cima) e "obstaculo" (de
   fora nao se chega ao meio dela: a rocha, o poco, a fonte).

   Puro: nao toca em DOM nem em textura. A face sai so com o nome do
   material; o motor pede a textura a estilos.js, o canteiro desenha a
   miniatura com a mesma, e o teste roda no node.
   ============================================================ */
const ANDAR = 1.5;                 // altura de um andar, em tiles (seis degraus)
const FINA = 0.125;                // espessura da parede fina
const DEGRAU = 0.25;               // o degrau do terreno, e o passo vertical das pecas
const PORTA_L = 0.75, PORTA_A = 1.1;
const JANELA_L = 0.7, JANELA_BAIXO = 0.55, JANELA_ALTO = 1.15;

/* ---------- a forma, em coordenada da peca ----------
   x corre ao longo da peca, y para dentro, z para cima. A peca de parede
   nasce na linha y=0 e cresce para +x: a espessura fica metade para cada
   lado, que e o que faz duas paredes em L se encontrarem na quina.

   O poligono de chao vem no sentido anti-horario (x para leste, y para o
   sul): e o que a fisica espera, e o que faz a face de cima olhar para
   cima. */
function face(pts, mat, uv){ return {pts:pts, mat:mat, uv:uv}; }

/* A textura presa no mundo, e nao na peca: calcula-se nos cantos ja postos
   no lugar. No chao e no teto, u e v sao o proprio x e y; na parede, u corre
   na horizontal ao longo da face e v e a altura; no telhado, u corre ao
   longo da beira e v sobe pela agua. Duas pecas no mesmo plano continuam o
   mesmo desenho -- a empena em cima da parede, o piso girado ao lado do
   outro. Ate 24/9 cada peca comecava o desenho no primeiro canto dela, e a
   pedra da empena nao batia com a da parede de baixo. */
function uvDoMundo(pts){
  const n = normalDe(pts), l = Math.hypot(n[0], n[1], n[2]) || 1;
  const nx = n[0]/l, ny = n[1]/l, nz = n[2]/l, h = Math.hypot(nx, ny);
  if (h < 1e-6) return pts.map(function(p){ return [p[0], p[1]]; });
  const tx = -ny/h, ty = nx/h;                              // ao longo da face, na horizontal
  const bx = -nz*ty, by = nz*tx, bz = nx*ty - ny*tx;        // n x t: subindo pela face
  return pts.map(function(p){ return [p[0]*tx + p[1]*ty, -(p[0]*bx + p[1]*by + p[2]*bz)]; });
}

/* Caixa com as faces para fora. `sem` pula faces pelo nome:
   "cima baixo x0 x1 y0 y1".

   A frente de uma face e o lado para onde aponta a normal de Newell dos
   cantos na ordem dada (fecharFace, em src/p2b.js): e so dela que a face e
   desenhada. Numa lateral, os cantos de baixo vem primeiro, andando da
   esquerda para a direita de quem olha de fora. Ate a revisao de 24/9 as
   quatro laterais saiam viradas para dentro -- de fora se via o avesso da
   parede do fundo, e a peca parecia uma folha; o teste da malha
   (teste/pecas.test.js) confere todo tipo agora. */
function caixa(out, x0, y0, z0, x1, y1, z1, mat, sem){
  const s = " " + (sem || "") + " ";
  const tem = function(n){ return s.indexOf(" " + n + " ") < 0; };
  if (tem("cima")) out.push(face([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], mat, null));
  if (tem("baixo")) out.push(face([[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0]], mat, null));
  if (tem("y0")) out.push(face([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]], mat, null));
  if (tem("x1")) out.push(face([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]], mat, null));
  if (tem("y1")) out.push(face([[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1]], mat, null));
  if (tem("x0")) out.push(face([[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1]], mat, null));
}
function solidoCaixa(x0, y0, z0, x1, y1, z1){
  return {pts:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]], z0:z0, z1:z1, topo:null};
}
/* Um pano de parede com vaos: `vaos` sao [x0, x1, z0, z1] no plano da
   parede. Sai a fachada dos dois lados, a moldura de cada vao, o alto e as
   pontas. A espessura e a do estilo: 0,125 na casa, 0,5 na fortaleza. */
/* o vao dentro do pano: o que passa do alto ou do pe e cortado -- a janela
   no estilo baixo, a seteira que chega no alto da muralha */
function vaosNoPano(vaos, z0, z1){
  return vaos.map(function(v){ return [v[0], v[1], Math.max(z0, v[2]), Math.min(z1, v[3])]; })
             .filter(function(v){ return v[1] > v[0] + 1e-9 && v[3] > v[2] + 1e-9; })
             .sort(function(a, b){ return a[0] - b[0]; });
}
function pano(out, x0, x1, z0, z1, vaos, mat, moldura, pontas, esp){
  const e = (esp || FINA)/2;
  const cortes = vaosNoPano(vaos, z0, z1);
  const partes = [];                      // os retangulos cheios da fachada
  let x = x0;
  for (const v of cortes){
    if (v[0] > x) partes.push([x, v[0], z0, z1]);
    if (v[2] > z0) partes.push([v[0], v[1], z0, v[2]]);          // peitoril
    if (v[3] < z1) partes.push([v[0], v[1], v[3], z1]);          // verga
    x = v[1];
  }
  if (x < x1) partes.push([x, x1, z0, z1]);
  for (const p of partes){
    out.push(face([[p[0],-e,p[2]],[p[1],-e,p[2]],[p[1],-e,p[3]],[p[0],-e,p[3]]], mat, null));
    out.push(face([[p[1],e,p[2]],[p[0],e,p[2]],[p[0],e,p[3]],[p[1],e,p[3]]], mat, null));
  }
  for (const v of cortes){                 // a espessura vista no vao
    if (v[2] > z0) out.push(face([[v[0],-e,v[2]],[v[1],-e,v[2]],[v[1],e,v[2]],[v[0],e,v[2]]], moldura, null));
    if (v[3] < z1) out.push(face([[v[0],e,v[3]],[v[1],e,v[3]],[v[1],-e,v[3]],[v[0],-e,v[3]]], moldura, null));
    out.push(face([[v[0],-e,v[2]],[v[0],e,v[2]],[v[0],e,v[3]],[v[0],-e,v[3]]], moldura, null));   // o batente de la olha para o vao
    out.push(face([[v[1],e,v[2]],[v[1],-e,v[2]],[v[1],-e,v[3]],[v[1],e,v[3]]], moldura, null));
  }
  /* o alto, aberto onde um vao chega nele */
  let xa = x0;
  for (const v of cortes){
    if (v[3] < z1 - 1e-9) continue;
    if (v[0] > xa + 1e-9) out.push(face([[xa,-e,z1],[v[0],-e,z1],[v[0],e,z1],[xa,e,z1]], mat, null));
    xa = v[1];
  }
  if (x1 > xa + 1e-9) out.push(face([[xa,-e,z1],[x1,-e,z1],[x1,e,z1],[xa,e,z1]], mat, null));
  if (pontas !== false){
    out.push(face([[x0,e,z0],[x0,-e,z0],[x0,-e,z1],[x0,e,z1]], mat, null));
    out.push(face([[x1,-e,z0],[x1,e,z0],[x1,e,z1],[x1,-e,z1]], mat, null));
  }
}
/* os solidos de um pano com vaos: o cheio barra, o vao deixa passar */
function solidosDoPano(x0, x1, z0, z1, vaos, esp){
  const e = (esp || FINA)/2, fora = [];
  const cortes = vaosNoPano(vaos, z0, z1);
  let x = x0;
  for (const v of cortes){
    if (v[0] > x) fora.push(solidoCaixa(x, -e, z0, v[0], e, z1));
    if (v[2] > z0) fora.push(solidoCaixa(v[0], -e, z0, v[1], e, v[2]));
    if (v[3] < z1) fora.push(solidoCaixa(v[0], -e, v[3], v[1], e, z1));
    x = v[1];
  }
  if (x < x1) fora.push(solidoCaixa(x, -e, z0, x1, e, z1));
  return fora;
}

/* ---------- o construtor de formas ----------
   Cada tipo recebe as medidas (`e`, do estilo com o padrao do tipo) e um
   construtor, e so chama formas simples nele. */
function Forma(e){ this.e = e; this.faces = []; this.solidos = []; this.encaixes = []; }
Forma.prototype.encaixe = function(x, y, z, tipo){ this.encaixes.push({em:[x, y, z], tipo:tipo}); };
/* a caixa, com o solido junto; `solida` false e so desenho */
Forma.prototype.caixa = function(x0, y0, z0, x1, y1, z1, mat, sem, solida){
  caixa(this.faces, x0, y0, z0, x1, y1, z1, mat, sem);
  if (solida !== false) this.solidos.push(solidoCaixa(x0, y0, z0, x1, y1, z1));
};
/* O pano de parede, com os encaixes das pontas e do alto. */
Forma.prototype.pano = function(x0, x1, z0, z1, vaos, mat, moldura, esp, pontas){
  pano(this.faces, x0, x1, z0, z1, vaos, mat, moldura || "moldura", pontas, esp);
  for (const s of solidosDoPano(x0, x1, z0, z1, vaos, esp)) this.solidos.push(s);
  this.encaixe(x0, 0, z0, "ponta"); this.encaixe(x1, 0, z0, "ponta");
  this.encaixe(x0, 0, z1, "alto");  this.encaixe(x1, 0, z1, "alto");
};
/* Um chao retangular (piso, laje, deck): caixa de z0 a z1 e os quatro
   cantos de cima como encaixe de borda. */
Forma.prototype.chao = function(x0, y0, z0, x1, y1, z1, mat, matBaixo){
  if (matBaixo){
    caixa(this.faces, x0, y0, z0, x1, y1, z1, mat, "baixo");
    this.faces.push(face([[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0]], matBaixo, null));
  } else caixa(this.faces, x0, y0, z0, x1, y1, z1, mat, "");
  this.solidos.push(solidoCaixa(x0, y0, z0, x1, y1, z1));
  /* os cantos e o meio de cada lado: a escada, larga como o piso, encosta
     pelo meio do lado dele */
  for (const c of [[x0,y0],[x1,y0],[x1,y1],[x0,y1],[(x0+x1)/2,y0],[x1,(y0+y1)/2],[(x0+x1)/2,y1],[x0,(y0+y1)/2]])
    this.encaixe(c[0], c[1], z1, "borda");
};
/* O prisma de um poligono convexo no sentido anti-horario, de z0 a z1.
   o.sem: "cima", "baixo"; o.semLado(i) pula o lado i; o.matTopo;
   o.solida false e so desenho. */
Forma.prototype.prisma = function(pts, z0, z1, mat, o){
  o = o || {};
  const n = pts.length, sem = " " + (o.sem || "") + " ";
  /* o sentido do poligono decide a ordem dos cantos: a tampa de cima olha
     para cima e cada lado para fora, venha ele de um lado ou do outro */
  let area = 0;
  for (let i = 0; i < n; i++){ const a = pts[i], b = pts[(i + 1) % n]; area += (a[0] - b[0])*(a[1] + b[1]); }
  const cima = area > 0 ? pts : pts.slice().reverse();
  if (sem.indexOf(" cima ") < 0) this.faces.push(face(cima.map(function(p){ return [p[0], p[1], z1]; }), o.matTopo || mat, null));
  if (sem.indexOf(" baixo ") < 0) this.faces.push(face(cima.slice().reverse().map(function(p){ return [p[0], p[1], z0]; }), o.matBaixo || mat, null));
  for (let i = 0; i < n; i++){
    if (o.semLado && o.semLado(i)) continue;
    const a = area > 0 ? pts[i] : pts[(i + 1) % n], b = area > 0 ? pts[(i + 1) % n] : pts[i];
    this.faces.push(face([[a[0],a[1],z0],[b[0],b[1],z0],[b[0],b[1],z1],[a[0],a[1],z1]], mat, null));
  }
  if (o.solida !== false) this.solidos.push({pts:pts.map(function(p){ return [p[0], p[1]]; }), z0:z0, z1:z1, topo:null});
};
/* Um solido convexo escrito a mao, face por face: cada face sai virada para
   fora do meio dele, seja qual for a ordem em que os cantos vieram -- a
   rampa, o espigao, a estalagmite. */
function normalDe(pts){
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++){
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1])*(a[2] + b[2]); ny += (a[2] - b[2])*(a[0] + b[0]); nz += (a[0] - b[0])*(a[1] + b[1]);
  }
  return [nx, ny, nz];
}
/* `cada`, se vier, da a cada face o material e o uv dela: {mat, uv} */
Forma.prototype.convexo = function(faces, mat, cada){
  let cx = 0, cy = 0, cz = 0, n = 0;
  for (const pts of faces) for (const p of pts){ cx += p[0]; cy += p[1]; cz += p[2]; n++; }
  cx /= n; cy /= n; cz /= n;
  faces.forEach(function(pts, i){
    const nv = normalDe(pts), c = (cada && cada[i]) || {};
    let mx = 0, my = 0, mz = 0;
    for (const p of pts){ mx += p[0]; my += p[1]; mz += p[2]; }
    mx /= pts.length; my /= pts.length; mz /= pts.length;
    const fora = nv[0]*(mx - cx) + nv[1]*(my - cy) + nv[2]*(mz - cz) >= 0;
    const uv = c.uv ? (fora ? c.uv : c.uv.slice().reverse()) : null;
    this.faces.push(face(fora ? pts : pts.slice().reverse(), c.mat || mat, uv));
  }, this);
};
/* A folha que abre -- porta, vidraca, veneziana, portao de cerca: uma caixa
   fina que sai da dobradica (hx, hy) na direcao `ang` (em graus), larga w e
   grossa t, de z0 a z1. As duas caras levam `matCara`: com `faixa`
   [u0, u1] o desenho vai preso na folha (u0 na dobradica, u1 na ponta, e a
   altura inteira), sem ela vai preso no mundo como o resto. A borda e
   `matBorda`. Com `solida`, e solido de porta: barra o corpo, mas a conta
   de quem alcanca o que passa por ela, porque no jogo ela abre. `solida`
   em numero e a altura do solido, quando ele nao vai ate o alto da folha. */
Forma.prototype.folha = function(hx, hy, ang, w, t, z0, z1, matCara, matBorda, faixa, solida){
  const r = ang*Math.PI/180, dx = Math.round(Math.cos(r)*1e9)/1e9, dy = Math.round(Math.sin(r)*1e9)/1e9;
  const ponto = function(s, lado, z){ return [hx + dx*s - dy*lado*t/2, hy + dy*s + dx*lado*t/2, z]; };
  const a = [ponto(0, -1, z0), ponto(w, -1, z0), ponto(w, -1, z1), ponto(0, -1, z1)];
  const b = [ponto(0, 1, z0), ponto(w, 1, z0), ponto(w, 1, z1), ponto(0, 1, z1)];
  const uv = faixa ? [[faixa[0], 1], [faixa[1], 1], [faixa[1], 0], [faixa[0], 0]] : null;
  const cara = {mat: matCara, uv: uv}, borda = {mat: matBorda};
  this.convexo([a, b, [a[0], a[1], b[1], b[0]], [a[3], a[2], b[2], b[3]], [a[0], b[0], b[3], a[3]], [a[1], b[1], b[2], a[2]]],
               matBorda, [cara, cara, borda, borda, borda, borda]);
  if (solida){
    let pts = [a[0], a[1], b[1], b[0]].map(function(p){ return [p[0], p[1]]; });
    let area = 0;
    for (let i = 0; i < 4; i++){ const p = pts[i], q = pts[(i + 1) % 4]; area += p[0]*q[1] - q[0]*p[1]; }
    if (area < 0) pts = pts.reverse();
    const zs = typeof solida === "number" ? Math.min(z1, z0 + solida) : z1;
    this.solidos.push({pts: pts, z0: z0, z1: zs, topo: null, porta: true});
  }
};
/* A coluna redonda: um prisma de n lados. */
Forma.prototype.cilindro = function(cx, cy, r, n, z0, z1, mat, o){
  this.prisma(poligonoRegular(cx, cy, r, n, 0), z0, z1, mat, o);
};
/* O anel: a parede da torre redonda, o poco, a fonte. n gomos de a0 a a1
   (em graus); o gomo i para o qual `vao(i)` devolve [z0, z1] fica aberto
   nessa altura -- e a porta da torre. */
Forma.prototype.anel = function(cx, cy, r0, r1, n, z0, z1, mat, vao){
  const ponto = function(r, a){ return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; };
  for (let i = 0; i < n; i++){
    const a = i/n*Math.PI*2, b = (i + 1)/n*Math.PI*2;
    const pts = [ponto(r1, a), ponto(r1, b), ponto(r0, b), ponto(r0, a)];
    const v = vao ? vao(i) : null;
    /* os lados 1 e 3 sao as juntas com o gomo vizinho: so aparecem na porta */
    const junta = function(k){ return (k === 1 && !(vao && vao((i + 1) % n))) || (k === 3 && !(vao && vao((i + n - 1) % n))); };
    if (v){
      if (v[0] > z0) this.prisma(pts, z0, v[0], mat, {semLado: junta});
      if (v[1] < z1) this.prisma(pts, v[1], z1, mat, {semLado: junta});
    } else this.prisma(pts, z0, z1, mat, {semLado: junta});
  }
};
/* O plano inclinado: sobe de z0 na borda y0 ate z1 na borda y1, com
   espessura `esp` para baixo. O solido tem o topo no plano, que e o que faz
   rampa e telhado serem chao para quem pisa. */
/* o avesso (matBaixo) e o que se ve de dentro: o forro, e nao a telha */
Forma.prototype.inclinado = function(x0, y0, x1, y1, z0, z1, mat, esp, matBaixo){
  const h = esp || 0.1;
  /* a borda de cima pode vir antes da de baixo (a agua que desce para o
     norte): arruma para o poligono sair no sentido anti-horario */
  if (x1 < x0){ const t = x0; x0 = x1; x1 = t; }
  if (y1 < y0){ let t = y0; y0 = y1; y1 = t; t = z0; z0 = z1; z1 = t; }
  this.faces.push(face([[x0,y0,z0],[x1,y0,z0],[x1,y1,z1],[x0,y1,z1]], mat, null));
  this.faces.push(face([[x0,y1,z1-h],[x1,y1,z1-h],[x1,y0,z0-h],[x0,y0,z0-h]], matBaixo || mat, null));
  this.faces.push(face([[x0,y0,z0],[x0,y1,z1],[x0,y1,z1-h],[x0,y0,z0-h]], mat, null));
  this.faces.push(face([[x1,y1,z1],[x1,y0,z0],[x1,y0,z0-h],[x1,y1,z1-h]], mat, null));
  this.faces.push(face([[x0,y0,z0-h],[x1,y0,z0-h],[x1,y0,z0],[x0,y0,z0]], mat, null));
  this.faces.push(face([[x1,y1,z1-h],[x0,y1,z1-h],[x0,y1,z1],[x1,y1,z1]], mat, null));
  this.solidos.push({pts:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]], z0:Math.min(z0, z1) - h, z1:Math.max(z0, z1),
                     topo:[[x0,y0,z0],[x1,y0,z0],[x0,y1,z1]]});
};
/* A escada reta ao longo de x, de 0 a comp, larga `larg`, subindo `alto`:
   um bloco em degraus, macico ate o chao. Os degraus sao desenho: a colisao
   e uma rampa, que e como todo motor faz -- degrau de verdade prende o pe. */
Forma.prototype.escada = function(comp, larg, alto, degrau, mat){
  const n = Math.max(1, Math.round(alto/degrau)), passo = comp/n, dz = alto/n;
  for (let i = 0; i < n; i++){
    const x = i*passo, z = i*dz;
    caixa(this.faces, x, 0, 0, x + passo, larg, z + dz, mat, "baixo x0 x1");
    this.faces.push(face([[x,larg,z],[x,0,z],[x,0,z+dz],[x,larg,z+dz]], mat, null));      // o espelho, para quem sobe
  }
  this.faces.push(face([[comp,0,0],[comp,larg,0],[comp,larg,alto],[comp,0,alto]], mat, null));  // as costas, para quem passa por tras
  this.solidos.push({pts:[[0,0],[comp,0],[comp,larg],[0,larg]], z0:-DEGRAU, z1:alto,
                     topo:[[0,0,0],[comp,0,alto],[0,larg,0]]});
  this.encaixe(0, larg/2, 0, "pe"); this.encaixe(comp, larg/2, alto, "topo");
};
/* O arco dentro de um pano: o vao retangular ate o alto do arco, e as
   cunhas que fecham os cantos de cima, em faixas convexas. */
Forma.prototype.arco = function(x0, x1, zPe, esp, mat, moldura, n){
  const e = esp/2, r = (x1 - x0)/2, cx = (x0 + x1)/2, zt = zPe + r, k = n || 8;
  for (let i = 0; i < k; i++){
    const ta = Math.PI*(1 - i/k), tb = Math.PI*(1 - (i + 1)/k);
    const xa = cx + r*Math.cos(ta), za = zPe + r*Math.sin(ta);
    const xb = cx + r*Math.cos(tb), zb = zPe + r*Math.sin(tb);
    if (zt - Math.min(za, zb) < 1e-6) continue;
    this.faces.push(face([[xa,-e,za],[xb,-e,zb],[xb,-e,zt],[xa,-e,zt]], mat, null));
    this.faces.push(face([[xb,e,zb],[xa,e,za],[xa,e,zt],[xb,e,zt]], mat, null));
    this.faces.push(face([[xa,e,za],[xb,e,zb],[xb,-e,zb],[xa,-e,za]], moldura, null));
    if (zt - Math.max(za, zb) > 1e-6) this.solidos.push(solidoCaixa(Math.min(xa, xb), -e, Math.max(za, zb), Math.max(xa, xb), e, zt));
  }
};
/* Um pano de parede de (x0, y0) a (x1, y1), para as pecas que sao varias
   paredes (a torre, a guarita): monta em coordenada propria e gira. */
Forma.prototype.paredeEntre = function(x0, y0, x1, y1, alto, vaos, mat, esp){
  const g = new Forma(this.e);
  g.pano(0, Math.hypot(x1 - x0, y1 - y0), 0, alto, vaos || [], mat, "moldura", esp, false);
  const ang = Math.atan2(y1 - y0, x1 - x0), c = Math.cos(ang), s = Math.sin(ang);
  const mover = function(p){ return [x0 + p[0]*c - p[1]*s, y0 + p[0]*s + p[1]*c, p[2]]; };
  for (const fc of g.faces) this.faces.push(face(fc.pts.map(mover), fc.mat, null));
  for (const so of g.solidos) this.solidos.push({pts:so.pts.map(function(p){ const q = mover([p[0], p[1], 0]); return [q[0], q[1]]; }),
                                                 z0:so.z0, z1:so.z1, topo:null});
};
function poligonoRegular(cx, cy, r, n, rot){
  const pts = [];
  for (let i = 0; i < n; i++){
    const a = (rot || 0) + i/n*Math.PI*2;
    pts.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]);
  }
  return pts;
}
/* Sorteio pela posicao da peca: a rocha de um lugar sai sempre igual, e
   duas vizinhas saem diferentes. */
function sorteioDaPeca(inst, k){
  let h = Math.imul(Math.round((inst.x || 0)*4) + 7919*k, 73856093) ^ Math.imul(Math.round((inst.y || 0)*4), 19349663) ^
          Math.imul(Math.round((inst.z || 0)*4), 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0)/4294967296;
}
/* Uma pedra: um poligono de n lados com os raios sorteados, de z0 a z1, e
   o topo um pouco menor -- a pedra afina para cima. Tres camadas de
   prisma, cada uma convexa. */
function pedra(f, cx, cy, r, alto, n, sorte, mat){
  const raios = [];
  /* raio de 0,8 a 1: com nove lados ainda da poligono convexo */
  for (let i = 0; i < n; i++) raios.push(r*(0.8 + 0.2*sorte(i)));
  const anel = function(escala){
    return raios.map(function(ri, i){ const a = i/n*Math.PI*2; return [cx + ri*escala*Math.cos(a), cy + ri*escala*Math.sin(a)]; });
  };
  f.prisma(anel(1), 0, alto*0.55, mat, {sem: "cima"});
  const meio = anel(1), cima = anel(0.62);
  /* a parte de cima afina: faces inclinadas do anel de baixo para o de cima */
  for (let i = 0; i < n; i++){
    const a = meio[i], b = meio[(i + 1) % n], c = cima[(i + 1) % n], d = cima[i];
    f.faces.push(face([[a[0],a[1],alto*0.55],[b[0],b[1],alto*0.55],[c[0],c[1],alto],[d[0],d[1],alto]], mat, null));
  }
  f.faces.push(face(cima.map(function(p){ return [p[0], p[1], alto]; }), mat, null));
  f.solidos.push({pts:anel(0.8), z0:alto*0.55, z1:alto, topo:null});
}

/* ---------- os tipos ----------
   `tamanho` e quanto a peca ocupa em tiles (x, y) -- ou uma funcao das
   medidas, quando o estilo muda o tamanho --, e e em torno dele que o
   espelho vira a peca. `categoria` agrupa no catalogo. */
const TIPOS_DE_PECA = {
  /* ================= casa ================= */
  parede: {
    nome: "parede", categoria: "casa", tamanho: [1, FINA], diagonal: true, andar: "barra",
    forma: function(e, f){ f.pano(0, e.larg, 0, e.alto, [], "parede", "moldura", e.espessura); }
  },
  "meia-parede": {
    nome: "meia parede", categoria: "casa", tamanho: [1, FINA], diagonal: true, andar: "barra",
    forma: function(e, f){ f.pano(0, e.larg, 0, e.alto/2, [], "parede", "moldura", e.espessura); }
  },
  /* A janela, a veneziana e a porta abrem e fecham: o campo aberta=1 abre.
     No jogo o E vira uma e outra, no canteiro o U -- e `abre` diz o ponto
     para onde se mira. O lado de dentro da parede e o +y dela: a vidraca e
     a porta abrem para dentro, a veneziana dobra para fora. */
  "parede-janela": {
    nome: "parede com janela", categoria: "casa", tamanho: [1, FINA], andar: "barra",
    abre: function(e){ return [e.larg/2, 0, (JANELA_BAIXO + JANELA_ALTO)/2]; },
    forma: function(e, f, inst){
      const m = (e.larg - JANELA_L)/2, zb = JANELA_BAIXO, za = Math.min(JANELA_ALTO, e.alto);
      f.pano(0, e.larg, 0, e.alto, [[m, m + JANELA_L, JANELA_BAIXO, JANELA_ALTO]], "parede", "moldura", e.espessura);
      /* a vidraca: fechada, um caixilho so no vao; aberta, as duas metades
         viradas para dentro, cada uma na sua ombreira */
      if (pecaAberta(inst)){
        f.folha(m + 0.02, 0, 90, JANELA_L/2, 0.04, zb, za, "vidraca", "madeira", [0, 0.5], false);
        f.folha(m + JANELA_L - 0.02, 0, 90, JANELA_L/2, 0.04, zb, za, "vidraca", "madeira", [1, 0.5], false);
      } else f.folha(m, 0, 0, JANELA_L, 0.04, zb, za, "vidraca", "madeira", [0, 1], true);
    }
  },
  "parede-veneziana": {
    nome: "janela com veneziana", categoria: "casa", tamanho: [1, FINA], andar: "barra",
    abre: function(e){ return [e.larg/2, 0, (JANELA_BAIXO + JANELA_ALTO)/2]; },
    forma: function(e, f, inst){
      const m = (e.larg - JANELA_L)/2, esp = e.espessura || FINA, t = 0.04, L = JANELA_L;
      const zb = JANELA_BAIXO, za = Math.min(JANELA_ALTO, e.alto);
      f.pano(0, e.larg, 0, e.alto, [[m, m + L, JANELA_BAIXO, JANELA_ALTO]], "parede", "moldura", esp);
      /* as duas folhas de tabuinha: fechadas no vao, rente a fachada de
         fora; abertas, dobradas contra ela */
      if (pecaAberta(inst)){
        const y = -esp/2 - t/2 - 0.01;
        f.folha(m, y, 180, L/2, t, zb, za, "veneziana", "madeira", [0, 1], false);
        f.folha(m + L, y, 0, L/2, t, zb, za, "veneziana", "madeira", [0, 1], false);
      } else {
        const y = -esp/2 + t/2 + 0.01;
        f.folha(m, y, 0, L/2, t, zb, za, "veneziana", "madeira", [0, 1], true);
        f.folha(m + L, y, 180, L/2, t, zb, za, "veneziana", "madeira", [0, 1], true);
      }
    }
  },
  "parede-porta": {
    nome: "parede com porta", categoria: "casa", tamanho: [1, FINA], andar: "passa",
    abre: function(e){ return [e.larg/2, 0, PORTA_A/2]; },
    forma: function(e, f, inst){
      const m = (e.larg - PORTA_L)/2;
      f.pano(0, e.larg, 0, e.alto, [[m, m + PORTA_L, 0, PORTA_A]], "parede", "moldura", e.espessura);
      /* a folha: fechada no meio do vao; aberta, para dentro, na ombreira
         da esquerda de quem entra */
      if (pecaAberta(inst)) f.folha(m + 0.025, 0, 90, PORTA_L, 0.05, 0, PORTA_A - 0.01, "porta", "madeira", [0, 1], false);
      else f.folha(m, 0, 0, PORTA_L, 0.05, 0, PORTA_A - 0.01, "porta", "madeira", [0, 1], true);
    }
  },
  porta: {
    /* A folha de porta solta, para o vao que nao tem a sua: encaixa no
       batente do arco. Abre e fecha como a da parede com porta. O solido
       dela vai ate 0,95, mais alto que o corpo: acima disso, no arco, o
       alto da folha entra na curva, que ja e solida. */
    nome: "folha de porta", categoria: "casa", tamanho: [PORTA_L, 0.06],
    abre: function(){ return [PORTA_L/2, 0, PORTA_A/2]; },
    forma: function(e, f, inst){
      if (pecaAberta(inst)) f.folha(0.025, 0, 90, PORTA_L, 0.05, 0, PORTA_A - 0.01, "porta", "madeira", [0, 1], false);
      else f.folha(0, 0, 0, PORTA_L, 0.05, 0, PORTA_A - 0.01, "porta", "madeira", [0, 1], 0.95);
      f.encaixe(0, 0, 0, "folha");                          // a dobradica: encaixa no batente do vao
    }
  },
  arco: {
    nome: "parede com arco", categoria: "casa", tamanho: [1, FINA], andar: "passa",
    forma: function(e, f){
      const esp = e.espessura || FINA, m = (e.larg - PORTA_L)/2, zPe = PORTA_A - PORTA_L/2;
      f.pano(0, e.larg, 0, e.alto, [[m, m + PORTA_L, 0, zPe + PORTA_L/2]], "parede", "moldura", esp);
      /* na parede baixa demais para o arco, o vao fica reto */
      if (zPe + PORTA_L/2 < e.alto - 1e-9) f.arco(m, m + PORTA_L, zPe, esp, "parede", "moldura");
      f.encaixe(m, 0, 0, "batente");                        // onde a folha de porta solta gira
    }
  },
  "canto-fora": {
    nome: "canto de fora", categoria: "casa", tamanho: [0.25, 0.25], andar: null,
    forma: function(e, f){
      const r = Math.max(0.1, (e.espessura || FINA)/2 + 0.04);
      f.caixa(-r, -r, 0, r, r, e.alto + 0.02, "moldura", "baixo");
      f.encaixe(0, 0, 0, "ponta");
    }
  },
  "canto-dentro": {
    nome: "canto de dentro", categoria: "casa", tamanho: [0.1, 0.1],
    forma: function(e, f){
      const d = (e.espessura || FINA)/2;
      f.caixa(d, d, 0, d + 0.06, d + 0.06, e.alto, "moldura", "baixo", false);
      f.encaixe(0, 0, 0, "ponta");
    }
  },
  "fim-de-parede": {
    nome: "fim de parede", categoria: "casa", tamanho: [0.2, FINA],
    forma: function(e, f){
      const d = (e.espessura || FINA)/2 + 0.03;
      f.caixa(-0.08, -d, 0, 0.08, d, e.alto + 0.04, "moldura", "baixo");
      f.encaixe(0, 0, 0, "ponta");
    }
  },
  pilar: {
    nome: "pilar", categoria: "casa", tamanho: [0.25, 0.25],
    encaixes: [{em:[0.125,0.125,ANDAR], tipo:"alto"}],
    forma: function(e, f){ f.caixa(0, 0, 0, 0.25, 0.25, e.alto, "moldura", "baixo"); f.encaixe(0.125, 0.125, e.alto, "alto"); }
  },
  coluna: {
    nome: "coluna", categoria: "casa", tamanho: [0.5, 0.5],
    forma: function(e, f){
      f.caixa(0.05, 0.05, 0, 0.45, 0.45, 0.12, "pedra", "baixo");
      f.cilindro(0.25, 0.25, 0.14, 8, 0.12, e.alto - 0.12, "moldura", {sem: "cima baixo"});
      f.caixa(0.05, 0.05, e.alto - 0.12, 0.45, 0.45, e.alto, "pedra", "");
      f.encaixe(0.25, 0.25, e.alto, "alto");
    }
  },
  piso: {
    nome: "piso", categoria: "casa", tamanho: [1, 1], andar: "pisa",
    forma: function(e, f){ f.chao(0, 0, -DEGRAU/2, e.larg, e.fundo, 0, "piso"); }
  },
  laje: {
    nome: "laje de andar", categoria: "casa", tamanho: [1, 1], andar: "pisa",
    forma: function(e, f){ f.chao(0, 0, -DEGRAU/2, e.larg, e.fundo, 0, "piso", "forro"); }
  },
  forro: {
    /* So o teto: fino, visto de baixo. E teto para a fisica, nao chao. */
    nome: "forro", categoria: "casa", tamanho: [1, 1], miniatura: {deBaixo: true},
    forma: function(e, f){
      f.faces.push(face([[0,e.fundo,0],[e.larg,e.fundo,0],[e.larg,0,0],[0,0,0]], "forro", null));
      f.solidos.push(solidoCaixa(0, 0, 0, e.larg, e.fundo, 0.05));
    }
  },
  degrau: {
    nome: "degrau", categoria: "casa", tamanho: [1, 0.5], andar: "pisa",
    forma: function(e, f){ f.chao(0, 0, 0, e.larg, 0.5, DEGRAU, "piso"); }
  },
  escada: {
    nome: "escada reta", categoria: "casa", tamanho: function(e){ return [e.comp, e.larg]; },
    andar: "sobe", saida: function(e){ return [e.comp + 0.5, e.larg/2]; },
    forma: function(e, f){ f.escada(e.comp, e.larg, e.alto, e.degrau, "piso"); }
  },
  "escada-caracol": {
    /* Doze cunhas em volta de um mastro, subindo um andar numa volta: cada
       uma 1/12 do andar acima da outra, bem menos que o degrau. */
    nome: "escada caracol", categoria: "casa", tamanho: [2, 2],
    andar: "sobe", saida: function(e){ return [1.55, 1.45]; },
    forma: function(e, f){
      const n = 12, r0 = 0.12, r1 = 1, dz = e.alto/n;
      f.cilindro(1, 1, r0, 8, 0, e.alto + 1.1, "moldura", {sem: "baixo"});
      for (let i = 0; i < n; i++){
        const a = i/n*Math.PI*2, b = (i + 1)/n*Math.PI*2;
        const p = function(r, t){ return [1 + r*Math.cos(t), 1 + r*Math.sin(t)]; };
        const z1 = (i + 1)*dz;
        f.prisma([p(r1, a), p(r1, b), p(r0, b), p(r0, a)], Math.max(0, z1 - 0.2), z1, "piso");
      }
      f.encaixe(2, 1, 0, "pe"); f.encaixe(2, 1, e.alto, "topo");
    }
  },
  rampa: {
    nome: "rampa", categoria: "infra", tamanho: function(e){ return [e.comp, e.larg]; }, padrao: {alto: 0.5},
    andar: "sobe", saida: function(e){ return [e.comp + 0.5, e.larg/2]; },
    forma: function(e, f){
      /* a rampa sobe ao longo de x: o inclinado sobe ao longo de y, entao
         e o mesmo com os eixos trocados a mao */
      const c = e.comp, l = e.larg, a = e.alto, h = DEGRAU/2;
      const t = [[0,0,0],[c,0,a],[c,l,a],[0,l,0]], b = t.map(function(p){ return [p[0], p[1], p[2] - h]; });
      f.convexo([t, b, [b[0],b[1],t[1],t[0]], [t[3],t[2],b[2],b[3]], [b[0],t[0],t[3],b[3]], [b[1],b[2],t[2],t[1]]], "piso");
      f.solidos.push({pts:[[0,0],[c,0],[c,l],[0,l]], z0:-DEGRAU, z1:a, topo:[[0,0,0],[c,0,a],[0,l,0]]});
      f.encaixe(0, l/2, 0, "pe"); f.encaixe(c, l/2, a, "topo");
    }
  },
  "guarda-corpo": {
    nome: "guarda-corpo", categoria: "casa", tamanho: [1, 0.06], diagonal: true, andar: "barra",
    forma: function(e, f){
      const a = 0.5, r = 0.03;
      for (let i = 0; i <= 4; i++){
        const x = i*(e.larg/4) - r;
        caixa(f.faces, Math.max(0, x), -r, 0, Math.min(e.larg, x + 2*r), r, a, "moldura", "baixo");
      }
      caixa(f.faces, 0, -r, a, e.larg, r, a + 0.06, "moldura", "");
      f.solidos.push(solidoCaixa(0, -r, 0, e.larg, r, a + 0.06));
      f.encaixe(0, 0, 0, "ponta"); f.encaixe(e.larg, 0, 0, "ponta");
    }
  },
  sacada: {
    /* um tile de laje para fora da casa, com guarda-corpo nos tres lados */
    nome: "sacada", categoria: "casa", tamanho: [1, 1], andar: "pisa",
    forma: function(e, f){
      f.chao(0, 0, -DEGRAU/2, 1, 1, 0, "piso", "forro");
      const r = 0.03, a = 0.5;
      for (const lado of [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0, 1, 0]]){
        const x0 = Math.min(lado[0], lado[2]) - r, x1 = Math.max(lado[0], lado[2]) + r;
        const y0 = Math.min(lado[1], lado[3]) - r, y1 = Math.max(lado[1], lado[3]) + r;
        f.caixa(x0, y0, a, x1, y1, a + 0.06, "moldura", "");
        f.solidos.push(solidoCaixa(x0, y0, 0, x1, y1, a));
        for (let i = 0; i <= 3; i++){
          const t = i/3, px = lado[0] + (lado[2] - lado[0])*t, py = lado[1] + (lado[3] - lado[1])*t;
          caixa(f.faces, px - r, py - r, 0, px + r, py + r, a, "moldura", "");
        }
      }
    }
  },
  /* Uma agua de telhado: um plano inclinado com espessura, que sobe ao longo
     de y -- meio tile de subida por tile, a mesma inclinacao do telhado de
     quatro aguas do terreno. */
  "telhado-agua": {
    nome: "agua de telhado", categoria: "casa", tamanho: [1, 1], padrao: {alto: 0.5},
    encaixes: [{em:[0,0,0], tipo:"beira"}],
    forma: function(e, f){ f.inclinado(0, 0, e.larg, e.fundo, 0, e.alto, "telha", 0.1, "forro"); f.encaixe(0, 0, 0, "beira"); }
  },
  "telhado-beiral": {
    nome: "beiral", categoria: "casa", tamanho: [1, 0.5], padrao: {alto: 0.25},
    forma: function(e, f){ f.inclinado(0, 0, e.larg, 0.5, 0, e.alto, "telha", 0.08, "forro"); }
  },
  "telhado-cumeeira": {
    /* as duas aguas se encontrando no meio, com a telha de cumeeira em cima */
    nome: "cumeeira", categoria: "casa", tamanho: [1, 1], padrao: {alto: 0.25},
    forma: function(e, f){
      f.inclinado(0, 0, e.larg, 0.5, 0, e.alto, "telha", 0.1, "forro");
      /* a outra agua desce de 0,5 a 1: o mesmo inclinado visto do outro lado */
      const a = e.alto, L = e.larg;
      f.inclinado(0, 1, L, 0.5, 0, a, "telha", 0.1, "forro");
      f.caixa(0, 0.44, a - 0.02, L, 0.56, a + 0.06, "cumeeira", "", false);
    }
  },
  "telhado-espigao": {
    /* A quina de um telhado de quatro aguas: duas aguas triangulares que se
       encontram na diagonal. O canto (0,0) e a beira, o (1,1) o alto. */
    nome: "espigao", categoria: "casa", tamanho: [1, 1], padrao: {alto: 0.5},
    forma: function(e, f){
      const a = e.alto;
      for (const tri of [[[0,0,0],[1,0,0],[1,1,a]], [[0,0,0],[1,1,a],[0,1,0]]]){
        const t = tri, b = tri.map(function(p){ return [p[0], p[1], p[2] - 0.1]; });
        f.convexo([t, b, [t[0],t[1],b[1],b[0]], [t[1],t[2],b[2],b[1]], [t[2],t[0],b[0],b[2]]], "telha", [null, {mat: "forro"}]);
      }
      f.solidos.push({pts:[[0,0],[1,0],[1,1]], z0:-0.1, z1:a, topo:[[0,0,0],[1,0,0],[1,1,a]]});
      f.solidos.push({pts:[[0,0],[1,1],[0,1]], z0:-0.1, z1:a, topo:[[0,0,0],[1,1,a],[0,1,0]]});
      f.caixa(0.46, 0.46, a - 0.03, 0.54, 0.54, a + 0.03, "cumeeira", "", false);
    }
  },
  "telhado-empena": {
    /* A parede em triangulo que fecha a ponta do telhado: sobe de 0 em x=0
       ate o alto em x=1, na inclinacao da agua. Duas espelhadas fazem o
       triangulo. */
    nome: "empena", categoria: "casa", tamanho: [1, FINA], padrao: {alto: 0.5},
    /* o campo base: quanto a empena desce abaixo dela ate o alto da parede --
       o triangulo de cima vira trapezio, e a ponta do telhado fecha. O lote
       poe; no micro ela desce sozinha ate o que estiver embaixo. */
    forma: function(e, f, inst){
      const d = (e.espessura || FINA)/2, a = e.alto, L = e.larg;
      const b = Math.max(0, Math.min(6, Number(inst && inst.campos && inst.campos.base) || 0));
      const frente = b > 0 ? [[0,-d,-b],[L,-d,-b],[L,-d,a],[0,-d,0]] : [[0,-d,0],[L,-d,0],[L,-d,a]];
      const tras = frente.map(function(p){ return [p[0], d, p[2]]; });
      const lados = [frente, tras];
      for (let i = 0; i < frente.length; i++){
        const j = (i + 1) % frente.length;
        lados.push([frente[i], frente[j], tras[j], tras[i]]);
      }
      f.convexo(lados, "parede");
      f.solidos.push({pts:[[0,-d],[L,-d],[L,d],[0,d]], z0:-b, z1:a, topo:[[0,-d,0],[L,-d,a],[0,d,0]]});
      f.encaixe(0, 0, -b, "ponta"); f.encaixe(L, 0, -b, "ponta");
    }
  },
  chamine: {
    nome: "chamine", categoria: "casa", tamanho: [0.5, 0.5],
    forma: function(e, f){
      f.caixa(0, 0, 0, 0.5, 0.5, 1.4, "pedra", "baixo");
      f.caixa(-0.04, -0.04, 1.4, 0.54, 0.54, 1.5, "pedra", "", false);
    }
  },

  /* ================= castelo e fortaleza ================= */
  muralha: {
    nome: "muralha", categoria: "castelo", tamanho: [1, 0.5], andar: "barra",
    forma: function(e, f){ f.pano(0, e.larg, 0, e.alto, [], "parede", "moldura", e.espessura); }
  },
  ameias: {
    /* A fileira de merloes no alto de uma muralha: um merlao, um vao, na
       beira de fora. Senta no encaixe "alto". */
    nome: "ameias", categoria: "castelo", tamanho: [1, 0.25],
    forma: function(e, f){
      const d = (e.espessura || 0.5)/2;
      f.caixa(0, -d, 0, 0.5, -d + 0.2, 0.55, "moldura", "baixo");
      f.caixa(0.5, -d, 0, 1, -d + 0.2, 0.2, "moldura", "baixo");
    }
  },
  "muralha-adarve": {
    /* A muralha grossa, de um tile: em cima se anda (o adarve), com as ameias
       na beira de fora. */
    nome: "muralha com adarve", categoria: "castelo", tamanho: [1, 1], andar: "barra",
    forma: function(e, f){
      f.caixa(0, -0.5, 0, e.larg, 0.5, e.alto, "parede", "baixo");
      f.caixa(0, -0.5, e.alto, 0.5, -0.3, e.alto + 0.55, "moldura", "baixo");
      f.caixa(0.5, -0.5, e.alto, 1, -0.3, e.alto + 0.2, "moldura", "baixo");
      f.encaixe(0, 0, 0, "ponta"); f.encaixe(e.larg, 0, 0, "ponta");
      f.encaixe(0, 0, e.alto, "adarve"); f.encaixe(e.larg, 0, e.alto, "adarve");
    }
  },
  seteira: {
    nome: "muralha com seteira", categoria: "castelo", tamanho: [1, 0.5], andar: "barra",
    forma: function(e, f){
      f.pano(0, e.larg, 0, e.alto, [[0.44, 0.56, 0.7, 1.5]], "parede", "moldura", e.espessura);
    }
  },
  portao: {
    /* O portao da fortaleza: dois tiles de muralha com um arco de 1,25 de
       vao, alto o bastante para um cavaleiro. A grade vem a parte. */
    nome: "portao em arco", categoria: "castelo", tamanho: [2, 0.5], andar: "passa",
    forma: function(e, f){
      const esp = e.espessura || 0.5, x0 = 0.375, x1 = 1.625, zPe = 1.2;
      f.pano(0, 2, 0, Math.max(e.alto, zPe + 0.625 + 0.3), [[x0, x1, 0, zPe + 0.625]], "parede", "moldura", esp);
      f.arco(x0, x1, zPe, esp, "parede", "moldura", 10);
    }
  },
  "grade-levadica": {
    /* A grade do portao: barras de ferro. Descida, barra o corpo; com o
       campo aberta=1, fica erguida dentro da muralha. Para a conta de quem
       alcanca o que ela passa, como a porta: no jogo o E a ergue. */
    nome: "grade levadica", categoria: "castelo", tamanho: [1.25, 0.1], andar: "passa",
    abre: function(){ return [0.625, 0, 0.75]; },
    forma: function(e, f, inst){
      const sobe = inst && inst.campos && inst.campos.aberta === "1" ? 1.45 : 0;
      for (let i = 0; i <= 5; i++){
        const x = i*1.25/5;
        caixa(f.faces, x - 0.03, -0.03, sobe, x + 0.03, 0.03, sobe + 1.5, "metal", "");
      }
      for (const z of [0.3, 0.8, 1.3]) caixa(f.faces, 0, -0.035, sobe + z, 1.25, 0.035, sobe + z + 0.05, "metal", "");
      if (!sobe) f.solidos.push(Object.assign(solidoCaixa(-0.03, -0.04, 0, 1.28, 0.04, 1.55), {porta: true}));
    }
  },
  "ponte-levadica": {
    /* O tabuado da ponte levadica, baixado sobre o fosso, com as correntes
       subindo para o portao. */
    nome: "ponte levadica", categoria: "castelo", tamanho: [1.5, 3], andar: "pisa",
    forma: function(e, f){
      f.chao(0, 0, -0.15, 1.5, 3, 0, "madeira");
      for (const x of [0.05, 1.45]) caixa(f.faces, x - 0.025, 0.1, 0, x + 0.025, 0.15, 2.2, "metal", "");
    }
  },
  "torre-quadrada": {
    /* Tres por tres, paredes de meio tile, porta no lado de dentro (+y),
       piso de cima no alto e ameias em volta. */
    nome: "torre quadrada", categoria: "castelo", tamanho: [3, 3],
    forma: function(e, f){
      const a = e.alto*1.5, d = 0.25, porta = [1.125, 1.875, 0, PORTA_A];
      f.paredeEntre(0, d, 3, d, a, [], "parede", 0.5);                 // norte
      f.paredeEntre(3 - d, 0, 3 - d, 3, a, [], "parede", 0.5);         // leste
      f.paredeEntre(3, 3 - d, 0, 3 - d, a, [porta], "parede", 0.5);    // sul, com a porta
      f.paredeEntre(d, 3, d, 0, a, [], "parede", 0.5);                 // oeste
      f.chao(0.5, 0.5, a - DEGRAU/2, 2.5, 2.5, a, "piso", "forro");
      for (let i = 0; i < 6; i++){
        const t = i*0.5;
        f.caixa(t, 0, a, t + 0.25, 0.2, a + 0.55, "moldura", "baixo");
        f.caixa(t, 2.8, a, t + 0.25, 3, a + 0.55, "moldura", "baixo");
        f.caixa(0, t, a, 0.2, t + 0.25, a + 0.55, "moldura", "baixo");
        f.caixa(2.8, t, a, 3, t + 0.25, a + 0.55, "moldura", "baixo");
      }
    }
  },
  "torre-redonda": {
    /* Doze gomos de parede em anel, porta no gomo de baixo (+y), piso de
       cima e ameias alternadas no alto. */
    nome: "torre redonda", categoria: "castelo", tamanho: [3, 3],
    forma: function(e, f){
      const a = e.alto*1.5, n = 12;
      f.anel(1.5, 1.5, 1.0, 1.5, n, 0, a, "parede", function(i){ return i === 3 ? [0, PORTA_A] : null; });
      f.cilindro(1.5, 1.5, 1.02, n, a - DEGRAU/2, a, "piso");
      /* as ameias: um gomo alto, um baixo, na beira de fora */
      for (let i = 0; i < n; i++){
        const t0 = i/n*Math.PI*2, t1 = (i + 1)/n*Math.PI*2;
        const p = function(r, t){ return [1.5 + r*Math.cos(t), 1.5 + r*Math.sin(t)]; };
        f.prisma([p(1.5, t0), p(1.5, t1), p(1.25, t1), p(1.25, t0)], a, a + (i % 2 ? 0.2 : 0.55), "moldura", {sem: "baixo"});
      }
    }
  },
  guarita: {
    /* A casinha de vigia em cima da muralha: um por um, porta de tras,
       telhado de uma agua. */
    nome: "guarita", categoria: "castelo", tamanho: [1, 1],
    forma: function(e, f){
      const esp = 0.1, a = 1.4;
      f.paredeEntre(0, 0.05, 1, 0.05, a, [[0.3, 0.7, 0.8, 1.1]], "madeira", esp);
      f.paredeEntre(0.95, 0, 0.95, 1, a, [], "madeira", esp);
      f.paredeEntre(1, 0.95, 0, 0.95, a, [[0.2, 0.8, 0, 1.1]], "madeira", esp);
      f.paredeEntre(0.05, 1, 0.05, 0, a, [], "madeira", esp);
      f.inclinado(-0.1, 1.1, 1.1, -0.1, a - 0.1, a + 0.3, "telha", 0.06);
    }
  },
  "escada-muralha": {
    /* A escada encostada no lado de dentro da muralha, subindo ate o adarve:
       a escada reta com as medidas da fortaleza. */
    nome: "escada de muralha", categoria: "castelo", tamanho: function(e){ return [e.comp, e.larg]; },
    andar: "sobe", saida: function(e){ return [e.comp + 0.5, e.larg/2]; },
    forma: function(e, f){
      f.escada(e.comp, e.larg, e.alto, e.degrau, "pedra");
      f.caixa(0, e.larg - 0.02, 0, e.comp, e.larg, e.alto*0.5, "pedra", "", false);
    }
  },

  /* ================= dungeon ================= */
  nicho: {
    /* Parede com um nicho que nao atravessa: o lado de dentro fundo. */
    nome: "parede com nicho", categoria: "dungeon", tamanho: [1, 0.25], andar: "barra",
    forma: function(e, f){
      const esp = Math.max(0.25, e.espessura || 0.25), d = esp/2;
      f.pano(0, e.larg, 0, e.alto, [], "parede", "moldura", esp);
      /* o nicho e um recuo so desenhado na face de dentro */
      f.caixa(0.25, -d - 0.001, 0.4, 0.75, -d + 0.12, 1.2, "moldura", "", false);
    }
  },
  sarcofago: {
    nome: "sarcofago", categoria: "dungeon", tamanho: [1, 2],
    forma: function(e, f){
      f.caixa(0.1, 0.1, 0, 0.9, 1.9, 0.55, "pedra", "baixo");
      f.caixa(0.05, 0.05, 0.55, 0.95, 1.95, 0.68, "moldura", "");
    }
  },
  estalagmite: {
    nome: "estalagmite", categoria: "dungeon", tamanho: [0.5, 0.5],
    forma: function(e, f, inst){
      const s = function(i){ return sorteioDaPeca(inst || {}, i); };
      const alto = 0.8 + 0.8*s(1);
      const base = poligonoRegular(0.25, 0.25, 0.22, 6, s(2)), topo = poligonoRegular(0.25, 0.25, 0.05, 6, s(2));
      const lados = [];
      for (let i = 0; i < 6; i++){
        const a = base[i], b = base[(i + 1) % 6], c = topo[(i + 1) % 6], d = topo[i];
        lados.push([[a[0],a[1],0],[b[0],b[1],0],[c[0],c[1],alto],[d[0],d[1],alto]]);
      }
      lados.push(topo.map(function(p){ return [p[0], p[1], alto]; }));
      f.convexo(lados, "pedra");
      f.solidos.push({pts:poligonoRegular(0.25, 0.25, 0.15, 6, s(2)), z0:0, z1:alto, topo:null});
    }
  },

  /* ================= natureza ================= */
  "rocha-pequena": {
    nome: "rocha pequena", categoria: "natureza", tamanho: [0.5, 0.5],
    forma: function(e, f, inst){ pedra(f, 0.25, 0.25, 0.25, 0.3, 7, function(i){ return sorteioDaPeca(inst || {}, i); }, "pedra"); }
  },
  rocha: {
    nome: "rocha", categoria: "natureza", tamanho: [1, 1],
    forma: function(e, f, inst){ pedra(f, 0.5, 0.5, 0.5, 0.75, 8, function(i){ return sorteioDaPeca(inst || {}, i); }, "pedra"); }
  },
  "rocha-grande": {
    nome: "rocha grande", categoria: "natureza", tamanho: [2, 2], andar: "obstaculo",
    forma: function(e, f, inst){ pedra(f, 1, 1, 1, 1.6, 9, function(i){ return sorteioDaPeca(inst || {}, i); }, "pedra"); }
  },
  penhasco: {
    /* Um bloco de penhasco de um tile, tres de alto, com a face da frente
       (y=0) quebrada em facetas: empilhando, sai o paredao. */
    nome: "penhasco", categoria: "natureza", tamanho: [1, 1],
    forma: function(e, f, inst){
      const s = function(i){ return sorteioDaPeca(inst || {}, i); }, a = 3;
      const fr = [[0, 0.05 + 0.1*s(1)], [0.33, 0.1*s(2)], [0.66, 0.1*s(3)], [1, 0.05 + 0.1*s(4)]];
      /* frente quebrada nao e convexa sempre: vai em faixas convexas */
      for (let i = 0; i < 3; i++){
        const p = [fr[i], fr[i + 1], [fr[i + 1][0], 1], [fr[i][0], 1]];
        f.prisma(p, 0, a, "pedra", {semLado: function(k){ return (k === 1 && i < 2) || (k === 3 && i > 0) || k === 2; }});
      }
      f.faces.push(face([[1,1,0],[0,1,0],[0,1,a],[1,1,a]], "pedra", null));
    }
  },
  "laje-de-pedra": {
    nome: "laje de pedra", categoria: "natureza", tamanho: [1, 1], andar: "pisa",
    forma: function(e, f){ f.chao(0, 0, -0.15, 1, 1, 0, "pedra"); }
  },

  /* ================= infraestrutura ================= */
  pier: {
    /* O tabuado do pier sobre estacas que descem ate o fundo. */
    nome: "pier", categoria: "infra", tamanho: [1, 1], andar: "pisa",
    forma: function(e, f){
      f.chao(0, 0, -0.1, 1, 1, 0, "madeira");
      for (const p of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]])
        f.cilindro(p[0], p[1], 0.07, 6, -2, -0.1, "madeira", {sem: "baixo"});
    }
  },
  cais: {
    nome: "cais de pedra", categoria: "infra", tamanho: [1, 1], andar: "pisa",
    forma: function(e, f){
      f.chao(0, 0, -1.5, 1, 1, 0, "pedra");
      f.caixa(0, 0, 0, 1, 0.15, 0.12, "moldura", "baixo");
    }
  },
  ponte: {
    /* Um trecho de ponte: tabuado de um por dois com guarda-corpo dos dois
       lados. De madeira ou de pedra, conforme o estilo. */
    nome: "trecho de ponte", categoria: "infra", tamanho: [1, 2], andar: "pisa",
    forma: function(e, f){
      f.chao(0, 0, -0.2, 1, 2, 0, "piso", "madeira");
      for (const y of [0.05, 1.95]){
        f.caixa(0, y - 0.05, 0, 1, y + 0.05, 0.6, "moldura", "baixo");
      }
    }
  },
  "ponte-arco": {
    /* A ponte de pedra em arco: tres tiles de vao, o tabuado em cima e o
       arco embaixo, para o rio passar. */
    nome: "ponte em arco", categoria: "infra", tamanho: [3, 2], andar: "pisa",
    forma: function(e, f){
      f.chao(0, 0, -0.25, 3, 2, 0, "piso", "pedra");
      for (const y of [0.05, 1.95]) f.caixa(0, y - 0.06, 0, 3, y + 0.06, 0.55, "moldura", "");
      /* os dois lados do arco, faixas convexas do intradorso ate o tabuado */
      const k = 10, r = 1.5, zPe = -1.8;
      for (let i = 0; i < k; i++){
        const ta = Math.PI*(1 - i/k), tb = Math.PI*(1 - (i + 1)/k);
        const xa = 1.5 + r*Math.cos(ta), za = zPe + r*Math.sin(ta), xb = 1.5 + r*Math.cos(tb), zb = zPe + r*Math.sin(tb);
        f.faces.push(face([[xa,0,za],[xb,0,zb],[xb,0,-0.25],[xa,0,-0.25]], "pedra", null));
        f.faces.push(face([[xb,2,zb],[xa,2,za],[xa,2,-0.25],[xb,2,-0.25]], "pedra", null));
        f.faces.push(face([[xa,2,za],[xb,2,zb],[xb,0,zb],[xa,0,za]], "moldura", null));
      }
      f.caixa(-0.3, 0, zPe - 1, 0, 2, -0.25, "pedra", "baixo");
      f.caixa(3, 0, zPe - 1, 3.3, 2, -0.25, "pedra", "baixo");
    }
  },
  muro: {
    nome: "muro", categoria: "infra", tamanho: [1, 0.25], andar: "barra",
    forma: function(e, f){ f.pano(0, e.larg, 0, 1, [], "pedra", "moldura", 0.25); }
  },
  cerca: {
    nome: "cerca", categoria: "infra", tamanho: [1, 0.1], diagonal: true, andar: "barra",
    forma: function(e, f){
      for (const x of [0, 1]) caixa(f.faces, x - 0.05, -0.05, 0, x + 0.05, 0.05, 0.85, "madeira", "baixo");
      for (const z of [0.35, 0.7]) caixa(f.faces, 0, -0.03, z, 1, 0.03, z + 0.08, "madeira", "");
      f.solidos.push(solidoCaixa(-0.05, -0.05, 0, 1.05, 0.05, 0.85));
      f.encaixe(0, 0, 0, "ponta"); f.encaixe(1, 0, 0, "ponta");
    }
  },
  "portao-cerca": {
    /* O portao da cerca: os dois mouroes e a folha, fechada entre eles ou
       aberta para o +y, encostada no da esquerda. */
    nome: "portao de cerca", categoria: "infra", tamanho: [1, 0.1], andar: "passa",
    abre: function(){ return [0.5, 0, 0.45]; },
    forma: function(e, f, inst){
      for (const x of [0, 1]){
        caixa(f.faces, x - 0.06, -0.06, 0, x + 0.06, 0.06, 1.0, "madeira", "baixo");
        f.solidos.push(solidoCaixa(x - 0.06, -0.06, 0, x + 0.06, 0.06, 1.0));
      }
      if (pecaAberta(inst)) f.folha(0.09, 0.06, 90, 0.84, 0.05, 0.1, 0.8, "madeira", "madeira", null, false);
      else f.folha(0.06, 0, 0, 0.88, 0.05, 0.1, 0.8, "madeira", "madeira", null, true);
      f.encaixe(0, 0, 0, "ponta"); f.encaixe(1, 0, 0, "ponta");
    }
  },
  poco: {
    nome: "poco", categoria: "infra", tamanho: [1.5, 1.5], andar: "obstaculo",
    forma: function(e, f){
      f.anel(0.75, 0.75, 0.45, 0.62, 10, 0, 0.7, "pedra");
      for (const x of [0.1, 1.4]) f.caixa(x - 0.05, 0.7, 0.7, x + 0.05, 0.8, 1.8, "madeira", "");
      f.caixa(0.05, 0.72, 1.55, 1.45, 0.78, 1.62, "madeira", "", false);
      f.inclinado(-0.05, 0.05, 1.55, 0.75, 1.75, 2.1, "telha", 0.05);
      f.inclinado(-0.05, 1.45, 1.55, 0.75, 1.75, 2.1, "telha", 0.05);
    }
  },
  fonte: {
    nome: "fonte", categoria: "infra", tamanho: [3, 3], andar: "obstaculo",
    forma: function(e, f){
      f.anel(1.5, 1.5, 1.2, 1.45, 14, 0, 0.55, "pedra");
      f.cilindro(1.5, 1.5, 1.2, 14, -0.05, 0.25, "moldura", {sem: "baixo"});
      f.cilindro(1.5, 1.5, 0.18, 8, 0.25, 1.4, "pedra", {sem: "baixo"});
      f.cilindro(1.5, 1.5, 0.45, 8, 1.4, 1.52, "pedra");
    }
  },

  /* ================= interior ================= */
  mesa: {
    nome: "mesa", categoria: "interior", tamanho: [1, 0.75],
    forma: function(e, f){
      f.caixa(0, 0, 0.62, 1, 0.75, 0.7, "madeira", "");
      for (const p of [[0.06, 0.06], [0.94, 0.06], [0.06, 0.69], [0.94, 0.69]])
        f.caixa(p[0] - 0.04, p[1] - 0.04, 0, p[0] + 0.04, p[1] + 0.04, 0.62, "madeira", "baixo cima", false);
    }
  },
  cadeira: {
    nome: "cadeira", categoria: "interior", tamanho: [0.4, 0.4],
    forma: function(e, f){
      f.caixa(0, 0, 0.36, 0.4, 0.4, 0.42, "madeira", "");
      f.caixa(0, 0.34, 0.42, 0.4, 0.4, 0.9, "madeira", "", false);
      for (const p of [[0.04, 0.04], [0.36, 0.04], [0.04, 0.36], [0.36, 0.36]])
        f.caixa(p[0] - 0.03, p[1] - 0.03, 0, p[0] + 0.03, p[1] + 0.03, 0.36, "madeira", "baixo cima", false);
    }
  },
  cama: {
    nome: "cama", categoria: "interior", tamanho: [1, 2],
    forma: function(e, f){
      f.caixa(0.05, 0.05, 0, 0.95, 1.95, 0.4, "madeira", "baixo");
      f.caixa(0.08, 0.35, 0.4, 0.92, 1.92, 0.48, "forro", "baixo", false);
      f.caixa(0.02, 0.0, 0, 0.98, 0.08, 0.9, "madeira", "baixo");
    }
  },
  estante: {
    nome: "estante", categoria: "interior", tamanho: [1, 0.35],
    forma: function(e, f){
      f.caixa(0, 0.3, 0, 1, 0.35, 1.6, "madeira", "baixo");
      for (const x of [0, 0.95]) f.caixa(x, 0, 0, x + 0.05, 0.3, 1.6, "madeira", "baixo", false);
      for (const z of [0.05, 0.45, 0.85, 1.25, 1.55]) f.caixa(0.05, 0, z, 0.95, 0.3, z + 0.05, "madeira", "", false);
      f.solidos.push(solidoCaixa(0, 0, 0, 1, 0.35, 1.6));
    }
  },
  balcao: {
    nome: "balcao", categoria: "interior", tamanho: [1, 0.5],
    forma: function(e, f){
      f.caixa(0.03, 0.05, 0, 0.97, 0.5, 0.85, "madeira", "baixo");
      f.caixa(0, 0, 0.85, 1, 0.5, 0.92, "moldura", "", false);
    }
  },
  lareira: {
    nome: "lareira", categoria: "interior", tamanho: [1.5, 0.6],
    forma: function(e, f){
      f.pano(0, 1.5, 0, 1.3, [[0.35, 1.15, 0, 0.75]], "pedra", "pedra", 0.6);
      f.caixa(0.35, -0.3, 0, 1.15, 0.3, 0.05, "pedra", "baixo", false);
      f.caixa(0.55, -0.1, 0.05, 0.95, 0.1, 0.35, "chama", "baixo", false);
    }
  },
  bau: {
    nome: "bau", categoria: "interior", tamanho: [0.7, 0.45],
    forma: function(e, f){
      f.caixa(0, 0, 0, 0.7, 0.45, 0.35, "madeira", "baixo");
      f.caixa(-0.01, -0.01, 0.35, 0.71, 0.46, 0.45, "madeira", "", false);
      for (const x of [0.12, 0.55]) f.caixa(x, -0.02, 0, x + 0.04, 0.47, 0.46, "metal", "baixo", false);
    }
  },
  barril: {
    nome: "barril", categoria: "interior", tamanho: [0.5, 0.5],
    forma: function(e, f){
      f.cilindro(0.25, 0.25, 0.22, 10, 0, 0.12, "madeira", {sem: "baixo"});
      f.cilindro(0.25, 0.25, 0.25, 10, 0.12, 0.58, "madeira");
      f.cilindro(0.25, 0.25, 0.22, 10, 0.58, 0.7, "madeira");
      f.cilindro(0.25, 0.25, 0.26, 10, 0.2, 0.24, "metal", {solida: false});
      f.cilindro(0.25, 0.25, 0.26, 10, 0.46, 0.5, "metal", {solida: false});
    }
  },
  altar: {
    nome: "altar", categoria: "interior", tamanho: [1.5, 0.75],
    forma: function(e, f){
      f.caixa(0.1, 0.1, 0, 1.4, 0.65, 0.8, "pedra", "baixo");
      f.caixa(0, 0, 0.8, 1.5, 0.75, 0.92, "moldura", "", false);
    }
  },

  /* ================= luz ================= */
  tocha: {
    /* Na parede: o suporte de ferro, o cabo e a chama. A luz fica guardada
       no tipo (cor, raio, tremor); o motor ainda nao acende nada com ela. */
    nome: "tocha de parede", categoria: "luz", tamanho: [0.25, 0.3], luz: {cor: "#ffa040", raio: 5, tremor: 0.35},
    forma: function(e, f){
      f.caixa(0.08, 0, 1.1, 0.17, 0.12, 1.16, "metal", "", false);
      f.caixa(0.1, 0.1, 1.05, 0.15, 0.16, 1.45, "madeira", "", false);
      f.caixa(0.07, 0.07, 1.45, 0.18, 0.19, 1.62, "chama", "", false);
    }
  },
  lampiao: {
    nome: "lampiao de poste", categoria: "luz", tamanho: [0.5, 0.5], luz: {cor: "#ffd080", raio: 7, tremor: 0.1},
    forma: function(e, f){
      f.caixa(0.2, 0.2, 0, 0.3, 0.3, 1.9, "metal", "baixo");
      f.caixa(0.1, 0.1, 1.9, 0.4, 0.4, 2.25, "chama", "", false);
      f.caixa(0.06, 0.06, 2.25, 0.44, 0.44, 2.32, "metal", "", false);
    }
  },
  vela: {
    nome: "vela", categoria: "luz", tamanho: [0.15, 0.15], luz: {cor: "#ffc070", raio: 3, tremor: 0.25},
    forma: function(e, f){
      f.cilindro(0.075, 0.075, 0.035, 6, 0, 0.18, "forro", {solida: false});
      f.caixa(0.06, 0.06, 0.18, 0.09, 0.09, 0.24, "chama", "baixo", false);
    }
  },
  braseiro: {
    nome: "braseiro", categoria: "luz", tamanho: [0.6, 0.6], luz: {cor: "#ff8030", raio: 6, tremor: 0.45},
    forma: function(e, f){
      for (const p of [[0.12, 0.12], [0.48, 0.12], [0.3, 0.5]]) f.caixa(p[0] - 0.03, p[1] - 0.03, 0, p[0] + 0.03, p[1] + 0.03, 0.55, "metal", "", false);
      f.cilindro(0.3, 0.3, 0.3, 8, 0.55, 0.75, "metal");
      f.cilindro(0.3, 0.3, 0.22, 8, 0.7, 0.95, "chama", {sem: "baixo", solida: false});
      f.solidos.push(solidoCaixa(0.05, 0.05, 0, 0.55, 0.55, 0.75));
    }
  }
};
const CATEGORIAS_DE_PECA = ["casa", "castelo", "dungeon", "natureza", "infra", "interior", "luz"];

/* Os estilos moram em src/estilos.js: la cada material e uma receita de
   textura. Aqui so importa a forma que o estilo muda. */
if (typeof ESTILOS === "undefined" && typeof module !== "undefined") globalThis.ESTILOS = require("./estilos.js").ESTILOS;

/* O giro que o tipo aceita: todo tipo gira de 90 em 90, e o que diz
   `diagonal` gira tambem de 45 -- a parede e a cerca na diagonal. */
function giroAceito(tipo, giro){
  const def = TIPOS_DE_PECA[tipo], g = ((giro || 0) % 360 + 360) % 360;
  return g % 90 === 0 || (!!def && !!def.diagonal && g % 45 === 0);
}
/* O que encaixa em que: a ponta de uma parede na ponta da outra (a quina,
   a parede seguinte), o pe de uma parede no alto de outra (o andar de cima),
   a borda de um piso na do outro, o alto da escada na borda da laje. */
const ENCAIXA_EM = {
  ponta: ["ponta", "alto"], alto: ["ponta"], borda: ["borda", "topo", "pe"],
  topo: ["borda"], pe: ["borda"], beira: ["alto"], adarve: ["adarve"],
  folha: ["batente"], batente: ["folha"]
};
/* As familias de peca que ocupam o mesmo lugar: com uma delas na mao, mirar
   na outra troca uma pela outra -- a janela entra no lugar da parede, a
   porta tambem, sem tirar e por de novo. */
const FAMILIA_DE_PECA = {
  parede: "parede", "meia-parede": "parede", "parede-janela": "parede", "parede-veneziana": "parede",
  "parede-porta": "parede", arco: "parede",
  muralha: "muralha", seteira: "muralha",
  cerca: "cerca", "portao-cerca": "cerca", muro: "muro"
};
function trocaDePeca(tipoNaMao, tipoMirado){
  const a = FAMILIA_DE_PECA[tipoNaMao], b = FAMILIA_DE_PECA[tipoMirado];
  return !!a && a === b && tipoNaMao !== tipoMirado;
}

/* ---------- por no mundo ----------
   Espelho primeiro (e a ordem dos cantos inverte junto, senao a face vira
   de costas), depois o giro, depois o lugar. */
function transformar(p, inst, tamanho){
  let x = p[0], y = p[1];
  if (inst.espelho) x = tamanho[0] - x;
  const g = ((inst.giro || 0) % 360 + 360) % 360, r = g*Math.PI/180;
  const c = Math.abs(Math.cos(r)) < 1e-12 ? 0 : Math.cos(r), s = Math.abs(Math.sin(r)) < 1e-12 ? 0 : Math.sin(r);
  return [inst.x + x*c - y*s, inst.y + x*s + y*c, inst.z + p[2]];
}
/* O estilo mora na construcao -- e o que o arquivo guarda, uma linha "c"
   por casa. A peca sem construcao conhecida (a miniatura do catalogo, o
   fantasma na mao, o teste) pode trazer o seu; sem nenhum, vale o padrao.
   `construcoes` e o Map id -> estilo de estilosDasConstrucoes. */
function estiloDaPeca(inst, construcoes){
  /* a peca pode ter o estilo dela, num campo: a porta de madeira na casa de
     pedra. O campo vai e volta pelo arquivo como qualquer outro. */
  if (inst.campos && ESTILOS[inst.campos.estilo]) return inst.campos.estilo;
  if (construcoes && inst.construcao !== undefined){
    const c = construcoes.get(inst.construcao);
    if (c && ESTILOS[c]) return c;
  }
  return ESTILOS[inst.estilo] ? inst.estilo : "madeira-pescador";
}
function estilosDasConstrucoes(m){
  const out = new Map();
  for (const c of (m && m.construcoes) || []) out.set(c.id, c.estilo);
  return out;
}
/* as medidas da peca: as do estilo, com o padrao do tipo por cima */
function medidasDaPeca(tipo, estiloId, inst){
  const estilo = ESTILOS[estiloId] || ESTILOS["madeira-pescador"];
  return Object.assign({}, estilo.forma, tipo.padrao, inst && inst.forma);
}
function tamanhoDoTipo(tipo, e){
  const t = typeof tipo.tamanho === "function" ? tipo.tamanho(e) : tipo.tamanho;
  return [t[0], t[1]];
}
function geometriaDaPeca(inst, estiloId){
  const tipo = TIPOS_DE_PECA[inst.tipo];
  if (!tipo) return null;
  const est = ESTILOS[estiloId] ? estiloId : estiloDaPeca(inst);
  const e = medidasDaPeca(tipo, est, inst);
  const f = new Forma(e);
  tipo.forma(e, f, inst);
  const tamanho = tamanhoDoTipo(tipo, e);
  /* O rasterizador aceita poligono de ate 8 cantos: o topo da torre de 12
     lados vira um leque de pedacos convexos. */
  const partidas = [];
  for (const fc of f.faces){
    if (fc.pts.length <= 8){ partidas.push(fc); continue; }
    for (let k = 1; k < fc.pts.length - 1; k += 6)
      partidas.push(face([fc.pts[0]].concat(fc.pts.slice(k, Math.min(k + 7, fc.pts.length))), fc.mat, null));
  }
  const faces = partidas.map(function(fc){
    const pts = fc.pts.map(function(p){ return transformar(p, inst, tamanho); });
    if (inst.espelho) pts.reverse();
    /* a folha da janela traz o uv dela (o desenho inteiro na folha); o
       resto vai preso no mundo */
    const uv = fc.uv ? (inst.espelho ? fc.uv.slice().reverse() : fc.uv) : uvDoMundo(pts);
    return {pts:pts, uv:uv, mat:fc.mat};
  });
  const solidos = f.solidos.map(function(s){
    const pts = s.pts.map(function(p){ return transformar([p[0], p[1], 0], inst, tamanho); })
                     .map(function(p){ return [p[0], p[1]]; });
    if (inst.espelho) pts.reverse();
    const out = {pts:pts, z0:inst.z + s.z0, z1:inst.z + s.z1, topo:null};
    if (s.porta) out.porta = true;
    if (s.topo){
      const t = s.topo.map(function(p){ return transformar(p, inst, tamanho); });
      out.topo = planoPor(t[0], t[1], t[2]);
    }
    return out;
  });
  const encaixes = f.encaixes.map(function(k){ return {em:transformar(k.em, inst, tamanho), tipo:k.tipo}; });
  return {faces:faces, solidos:solidos, encaixes:encaixes};
}
/* A porta, a janela, a grade: aberta e o campo aberta=1, e sem ele fecha.
   Alternar faz um campos novo -- o historico do canteiro guarda o velho. */
function pecaAberta(inst){ return !!(inst && inst.campos && inst.campos.aberta === "1"); }
function alternarAberta(inst){
  const campos = Object.assign({}, inst.campos);
  if (campos.aberta === "1") delete campos.aberta; else campos.aberta = "1";
  if (Object.keys(campos).length) inst.campos = campos; else delete inst.campos;
}
/* O ponto do que abre, no mundo: e para ele que o E do jogo e o U do
   canteiro miram. null no que nao abre. */
function pontoQueAbre(inst, estiloId){
  const tipo = TIPOS_DE_PECA[inst.tipo];
  if (!tipo || !tipo.abre) return null;
  const est = ESTILOS[estiloId] ? estiloId : estiloDaPeca(inst);
  const e = medidasDaPeca(tipo, est, inst);
  return transformar(tipo.abre(e), inst, tamanhoDoTipo(tipo, e));
}
/* Onde se chega la em cima de uma peca que sobe -- escada, rampa, caracol
   --, no mundo: o ponto que o tipo diz (saida), na altura do encaixe do
   topo. E o pe dela: o encaixe de baixo. A validacao do canteiro confere
   que no alto se fica em pe, e que quem chega ao pe chega ao alto. */
function pontasDaSubida(inst, estiloId){
  const tipo = TIPOS_DE_PECA[inst.tipo];
  if (!tipo || !tipo.saida) return null;
  const est = ESTILOS[estiloId] ? estiloId : estiloDaPeca(inst);
  const e = medidasDaPeca(tipo, est, inst), f = new Forma(e);
  tipo.forma(e, f, inst);
  const tam = tamanhoDoTipo(tipo, e), s = tipo.saida(e);
  const topo = f.encaixes.find(function(k){ return k.tipo === "topo"; });
  const pe = f.encaixes.find(function(k){ return k.tipo === "pe"; });
  return {topo: transformar([s[0], s[1], topo ? topo.em[2] : e.alto], inst, tam),
          pe: pe ? transformar(pe.em, inst, tam) : transformar([0, 0, 0], inst, tam)};
}
/* Toda peca no mundo tem um id, unico no mapa, que nao muda enquanto ela
   existe: e por ele que o desfazer, a mira, a selecao e o motor acham a
   peca. Nao vai para o arquivo -- ao ler, as pecas sao numeradas na ordem.
   Peca sem id, ou com id repetido (uma copia colada), ganha o proximo. */
function garantirIdsDePeca(pecas){
  let maior = 0;
  for (const p of pecas) if (p.id > maior) maior = p.id;
  const vistos = new Set();
  for (const p of pecas){
    if (!(p.id > 0) || vistos.has(p.id)) p.id = ++maior;
    vistos.add(p.id);
  }
  return maior;
}
/* o plano z = a + b*x + c*y que passa pelos tres pontos */
function planoPor(p, q, r){
  const ux = q[0]-p[0], uy = q[1]-p[1], uz = q[2]-p[2];
  const vx = r[0]-p[0], vy = r[1]-p[1], vz = r[2]-p[2];
  const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
  if (Math.abs(nz) < 1e-9) return null;
  return {b: -nx/nz, c: -ny/nz, a: p[2] + (nx*p[0] + ny*p[1])/nz};
}

if (typeof module !== "undefined") module.exports = {
  ANDAR, FINA, DEGRAU, PORTA_L, PORTA_A, TIPOS_DE_PECA, CATEGORIAS_DE_PECA, ESTILOS, geometriaDaPeca, planoPor,
  estiloDaPeca, estilosDasConstrucoes, garantirIdsDePeca, medidasDaPeca, tamanhoDoTipo, sorteioDaPeca, pontasDaSubida,
  giroAceito, ENCAIXA_EM, FAMILIA_DE_PECA, trocaDePeca, pecaAberta, alternarAberta, pontoQueAbre
};
