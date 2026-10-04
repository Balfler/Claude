/* ============================================================
   OPERACOES DO EDITOR
   ------------------------------------------------------------
   Tudo que o editor faz com um mapa -- pincel, balde, suavizar, coisas,
   redimensionar e o historico de desfazer. Puro, sem DOM: a tela so chama
   isto e redesenha, e o teste roda no node.

   Precisa de src/mapa.js carregado antes.
   ============================================================ */
if (typeof module !== "undefined" && typeof TERRENOS === "undefined"){
  const M = require("../src/mapa.js");
  for (const k in M) globalThis[k] = M[k];
}

/* Um tile mede uns 2 metros, e 4.7 tiles por segundo e a velocidade andando
   de p5.js. A regua usa os dois para dizer quanto tempo leva ir de um ponto a
   outro -- que e a medida que importa numa ilha, mais do que metros. */
const METROS_POR_TILE = 2;
const TILES_POR_SEGUNDO = 4.7;

function copiaCoisas(cs){
  return cs.map(function(c){
    const o = {x:c.x, y:c.y, tipo:c.tipo, texto:c.texto};
    if (c.campos) o.campos = Object.assign({}, c.campos);
    return o;
  });
}
/* As pecas entram no mesmo historico das grades e das coisas: o desfazer e
   um so, e vale igual no macro e no micro. */
function copiaPeca(p){
  const o = {id:p.id, construcao:p.construcao, tipo:p.tipo, estilo:p.estilo, x:p.x, y:p.y, z:p.z, giro:p.giro, espelho:p.espelho};
  if (p.campos) o.campos = Object.assign({}, p.campos);
  return o;
}
function copiaPecas(ps){ return (ps || []).map(copiaPeca); }
function mesmaPeca(a, b){
  return a.construcao === b.construcao && a.tipo === b.tipo && a.estilo === b.estilo &&
         a.x === b.x && a.y === b.y && a.z === b.z && (a.giro || 0) === (b.giro || 0) &&
         (a.espelho || 0) === (b.espelho || 0) &&
         JSON.stringify(a.campos || null) === JSON.stringify(b.campos || null);
}
/* O que mudou entre duas listas de pecas, pelo id: `antes` tem as que sairam
   ou mudaram, como eram; `depois`, as que entraram ou mudaram, como ficaram.
   E so isso que o historico guarda -- com a vila e a fortaleza sao milhares
   de pecas, e guardar a lista inteira duas vezes a cada clique enchia a
   memoria. */
function diferencaDePecas(antes, depois){
  const porId = new Map();
  for (const p of antes) porId.set(p.id, p);
  const a = [], d = [];
  for (const p of depois){
    const velha = porId.get(p.id);
    if (!velha){ d.push(copiaPeca(p)); continue; }
    porId.delete(p.id);
    if (!mesmaPeca(velha, p)){ a.push(velha); d.push(copiaPeca(p)); }
  }
  porId.forEach(function(p){ a.push(p); });
  return {antes:a, depois:d};
}
function idsDePeca(m){
  if (typeof garantirIdsDePeca === "function") return garantirIdsDePeca(m.pecas);
  return require("../src/pecas.js").garantirIdsDePeca(m.pecas);
}
function copiaConstrucoes(cs){ return (cs || []).map(function(c){ return {id:c.id, estilo:c.estilo, nome:c.nome}; }); }
function copiaRegioes(rs){
  return (rs || []).map(function(r){
    const o = {id:r.id, nome:r.nome};
    if (r.campos) o.campos = Object.assign({}, r.campos);
    return o;
  });
}

function clonarMapa(m){
  return {versao:m.versao, nome:m.nome, larg:m.larg, alt:m.alt, passo:m.passo, mar:m.mar, semente:m.semente === undefined ? null : m.semente,
          terreno:m.terreno.slice(), altura:m.altura.slice(), teto:m.teto.slice(),
          regiao:m.regiao ? m.regiao.slice() : null, regioes:copiaRegioes(m.regioes),
          pecas:copiaPecas(m.pecas), construcoes:copiaConstrucoes(m.construcoes),
          coisas:copiaCoisas(m.coisas), extras:m.extras.slice()};
}
/* troca o conteudo sem trocar o objeto: quem guarda referencia ao mapa
   continua apontando para o mapa certo depois de um desfazer */
function copiarPara(m, de){
  const c = clonarMapa(de);
  for (const k in c) m[k] = c[k];
}

/* ---------- historico ----------
   Cada acao guarda so as celulas que mudaram, com o valor de antes e o de
   depois. Um traco de pincel inteiro -- do botao descer ao botao subir -- e
   uma acao so, que e o que se espera de um Ctrl+Z. */
function novoHistorico(limite){
  return {feitas:[], desfeitas:[], aberta:null, limite:limite || 300};
}
function abrirAcao(h, nome){
  h.aberta = {nome:nome, grades:{}, coisasAntes:null, mapaAntes:null};
}
function mudar(h, m, camada, i, v){
  const g = m[camada];
  if (g[i] === v) return false;
  if (h && h.aberta){
    let reg = h.aberta.grades[camada];
    if (!reg) reg = h.aberta.grades[camada] = new Map();
    if (!reg.has(i)) reg.set(i, g[i]);        // so o valor de ANTES do traco
  }
  g[i] = v;
  return true;
}
function marcarCoisas(h, m){
  if (h && h.aberta && !h.aberta.coisasAntes) h.aberta.coisasAntes = copiaCoisas(m.coisas);
}
function marcarPecas(h, m){
  if (h && h.aberta && !h.aberta.pecasAntes){
    idsDePeca(m);
    h.aberta.pecasAntes = copiaPecas(m.pecas);
    h.aberta.construcoesAntes = copiaConstrucoes(m.construcoes);
  }
}
function marcarMapaInteiro(h, m){
  if (h && h.aberta && !h.aberta.mapaAntes) h.aberta.mapaAntes = clonarMapa(m);
}
/* Devolve true se a acao mudou alguma coisa. Acao vazia -- um clique que
   pintou grama em cima de grama -- nao entra no historico. */
function fecharAcao(h, m){
  const a = h.aberta;
  h.aberta = null;
  if (!a) return false;
  const reg = {nome:a.nome, grades:{}, coisas:null, pecas:null, mapa:null};
  let mudou = false;

  if (a.mapaAntes){
    reg.mapa = {antes:a.mapaAntes, depois:clonarMapa(m)};
    mudou = true;
  } else {
    for (const camada in a.grades){
      const arr = [];
      for (const par of a.grades[camada]){
        const i = par[0], antes = par[1], depois = m[camada][i];
        if (antes !== depois) arr.push(i, antes, depois);
      }
      if (arr.length){ reg.grades[camada] = Int32Array.from(arr); mudou = true; }
    }
    if (a.coisasAntes){
      const depois = copiaCoisas(m.coisas);
      if (JSON.stringify(depois) !== JSON.stringify(a.coisasAntes)){
        reg.coisas = {antes:a.coisasAntes, depois:depois};
        mudou = true;
      }
    }
    if (a.pecasAntes){
      idsDePeca(m);
      const dif = diferencaDePecas(a.pecasAntes, m.pecas), cons = copiaConstrucoes(m.construcoes);
      if (dif.antes.length || dif.depois.length ||
          JSON.stringify(cons) !== JSON.stringify(a.construcoesAntes)){
        reg.pecas = {antes:dif.antes, depois:dif.depois, consAntes:a.construcoesAntes, consDepois:cons};
        mudou = true;
      }
    }
  }
  if (!mudou) return false;
  h.feitas.push(reg);
  if (h.feitas.length > h.limite) h.feitas.shift();
  h.desfeitas.length = 0;
  return true;
}
function aplicarRegistro(m, r, frente){
  if (r.mapa){ copiarPara(m, frente ? r.mapa.depois : r.mapa.antes); return; }
  for (const camada in r.grades){
    const arr = r.grades[camada], g = m[camada];
    for (let k=0; k<arr.length; k+=3) g[arr[k]] = frente ? arr[k+2] : arr[k+1];
  }
  if (r.coisas) m.coisas = copiaCoisas(frente ? r.coisas.depois : r.coisas.antes);
  if (r.pecas){
    const sai = new Set();
    for (const p of r.pecas.antes) sai.add(p.id);
    for (const p of r.pecas.depois) sai.add(p.id);
    m.pecas = m.pecas.filter(function(p){ return !sai.has(p.id); })
                     .concat(copiaPecas(frente ? r.pecas.depois : r.pecas.antes))
                     .sort(function(a, b){ return a.id - b.id; });
    m.construcoes = copiaConstrucoes(frente ? r.pecas.consDepois : r.pecas.consAntes);
  }
}
function desfazer(h, m){
  const r = h.feitas.pop();
  if (!r) return null;
  aplicarRegistro(m, r, false);
  h.desfeitas.push(r);
  return r;
}
function refazer(h, m){
  const r = h.desfeitas.pop();
  if (!r) return null;
  aplicarRegistro(m, r, true);
  h.feitas.push(r);
  return r;
}
/* Os tiles que um registro mexeu, nas camadas pedidas (todas, sem pedir):
   quem desenha refaz so ali. Registro de mapa inteiro devolve null -- ai e
   refazer tudo. */
function tilesDoRegistro(r, camadas){
  if (r.mapa) return null;
  const out = new Set();
  for (const c of camadas || Object.keys(r.grades)){
    const arr = r.grades[c];
    if (arr) for (let k = 0; k < arr.length; k += 3) out.add(arr[k]);
  }
  return Array.from(out);
}
function ultimoRegistro(h){ return h.feitas.length ? h.feitas[h.feitas.length - 1] : null; }

/* ---------- pincel ----------
   Os tiles cujo centro cai no circulo. Tamanho 1 e um tile, 2 e uma cruz,
   3 e um quadrado 3x3; dali pra cima vai arredondando. */
function tilesDoPincel(cx, cy, tamanho){
  const r2 = (tamanho/2)*(tamanho/2);
  const alcance = Math.ceil(tamanho/2);
  const out = [];
  for (let dy=-alcance; dy<=alcance; dy++)
    for (let dx=-alcance; dx<=alcance; dx++)
      if (dx*dx + dy*dy <= r2 || (dx === 0 && dy === 0)) out.push([cx+dx, cy+dy]);
  return out;
}

const dentro = function(m, x, y){ return x>=0 && y>=0 && x<m.larg && y<m.alt; };

/* Pintar terreno acerta a altura junto quando o mapa tem mar. Sem isso, pintar
   areia em cima do mar deixaria a praia debaixo d'agua, e pintar agua num
   morro faria um lago flutuando -- os dois viram aviso e ninguem quer
   consertar tile por tile. Agua rasa fica um degrau abaixo do mar, funda
   pelo menos dois, e chao pelo menos no nivel. Parede e porta nao mexem. */
function pintarTerreno(h, m, x, y, valor){
  if (!dentro(m, x, y)) return false;
  const i = y*m.larg + x;
  let mudou = mudar(h, m, "terreno", i, valor);
  if (m.mar !== null){
    const t = TERRENOS[valor], a = m.altura[i];
    let nova = a;
    if (t.id === "rasa") nova = Math.max(0, m.mar - 1);
    else if (t.id === "funda") nova = Math.max(0, Math.min(a, m.mar - 2));
    else if (t.tipo === "chao") nova = Math.max(a, m.mar);
    if (mudar(h, m, "altura", i, nova)) mudou = true;
  }
  return mudou;
}
function pintar(h, m, camada, x, y, valor){
  if (!dentro(m, x, y)) return false;
  if (camada === "terreno") return pintarTerreno(h, m, x, y, valor);
  if (camada === "altura" || camada === "teto") valor = Math.max(0, Math.min(alturaMaxima(m), valor));
  return mudar(h, m, camada, y*m.larg + x, valor);
}
function retangulo(h, m, camada, x0, y0, x1, y1, valor){
  const xa = Math.max(0, Math.min(x0, x1)), xb = Math.min(m.larg-1, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1)), yb = Math.min(m.alt-1,  Math.max(y0, y1));
  let n = 0;
  for (let y=ya; y<=yb; y++) for (let x=xa; x<=xb; x++) if (pintar(h, m, camada, x, y, valor)) n++;
  return n;
}
/* balde: inunda os vizinhos de lado com o mesmo valor */
function balde(h, m, camada, x, y, valor){
  if (!dentro(m, x, y)) return 0;
  const g = m[camada], W = m.larg;
  const alvo = g[y*W + x];
  if (alvo === valor && camada !== "terreno") return 0;
  const visto = new Uint8Array(g.length);
  const fila = [y*W + x];
  visto[y*W + x] = 1;
  let n = 0;
  while (fila.length){
    const i = fila.pop();
    const tx = i % W, ty = (i / W) | 0;
    if (pintar(h, m, camada, tx, ty, valor)) n++;
    const viz = [tx>0 ? i-1 : -1, tx<W-1 ? i+1 : -1, ty>0 ? i-W : -1, ty<m.alt-1 ? i+W : -1];
    for (const v of viz){
      if (v < 0 || visto[v]) continue;
      /* compara com o valor ORIGINAL da regiao, que o pintar acima pode ja ter trocado */
      const orig = (h && h.aberta && h.aberta.grades[camada] && h.aberta.grades[camada].has(v))
        ? h.aberta.grades[camada].get(v) : g[v];
      if (orig !== alvo) continue;
      visto[v] = 1;
      fila.push(v);
    }
  }
  return n;
}

/* ---------- altura ----------
   Subir e descer mexem uma vez por tile a cada traco -- `mexidos` guarda
   quem ja foi. Sem isso, segurar o botao parado no lugar faria uma torre. */
function ajustarAltura(h, m, x, y, delta, mexidos){
  if (!dentro(m, x, y)) return false;
  const i = y*m.larg + x;
  if (mexidos){ if (mexidos.has(i)) return false; mexidos.add(i); }
  return pintar(h, m, "altura", x, y, m.altura[i] + delta);
}
/* media arredondada do 3x3. Aplicada de novo, alisa mais. */
function suavizar(h, m, x, y){
  if (!dentro(m, x, y)) return false;
  let soma = 0, n = 0;
  for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
    const nx = x+dx, ny = y+dy;
    if (!dentro(m, nx, ny)) continue;
    soma += m.altura[ny*m.larg + nx]; n++;
  }
  return pintar(h, m, "altura", x, y, Math.round(soma/n));
}

/* ---------- o relevo com ruido ----------
   Morros de uma vez: um ruido suave -- valores sorteados nos cantos de uma
   grade e misturados entre eles, em tres oitavas, cada uma com a metade do
   tamanho e da forca --, com a semente dizendo o sorteio: a mesma semente da
   os mesmos morros. Soma ao relevo que ja esta la, so no chao (agua e rocha
   ficam), e some na beira do retangulo, para o morro nao nascer num degrau.
   \`amplitude\` e em degraus; \`escala\`, o tamanho do morro em tiles.
   \`andavel\` (o padrao) apara o pico ate cada tile ficar no maximo um
   degrau acima do vizinho mais baixo: o morro se sobe de qualquer lado. */
function hashDoRuido(x, y, semente){
  let n = (x*374761393 + y*668265263 + semente*1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0)/4294967296;
}
function ruidoSuave(x, y, semente){
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const u = fx*fx*(3 - 2*fx), v = fy*fy*(3 - 2*fy);
  const a = hashDoRuido(x0, y0, semente), b = hashDoRuido(x0 + 1, y0, semente);
  const c = hashDoRuido(x0, y0 + 1, semente), d = hashDoRuido(x0 + 1, y0 + 1, semente);
  return (a + (b - a)*u) + ((c + (d - c)*u) - (a + (b - a)*u))*v;
}
/* de -1 a 1 */
function ruidoDoRelevo(x, y, escala, semente){
  let soma = 0, peso = 0, f = 1/Math.max(1, escala), a = 1;
  for (let o = 0; o < 3; o++){
    soma += (ruidoSuave(x*f, y*f, semente + o*101)*2 - 1)*a; peso += a;
    f *= 2; a *= 0.5;
  }
  return soma/peso;
}
function relevoComRuido(h, m, x0, y0, x1, y1, opcoes){
  const o = opcoes || {}, amp = o.amplitude === undefined ? 6 : o.amplitude, esc = o.escala || 16, sem = o.semente | 0;
  const xa = Math.max(0, Math.min(x0, x1)), xb = Math.min(m.larg-1, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1)), yb = Math.min(m.alt-1,  Math.max(y0, y1));
  const bx = Math.max(1, (xb - xa + 1)*0.2), by = Math.max(1, (yb - ya + 1)*0.2);
  const W = m.larg, w = xb - xa + 1, antes = new Uint16Array(w*(yb - ya + 1)), alvo = new Int32Array(w*(yb - ya + 1));
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){ const k = (y - ya)*w + x - xa; antes[k] = alvo[k] = m.altura[y*W + x]; }
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){
    const i = y*W + x;
    if (TERRENOS[m.terreno[i]].tipo !== "chao") continue;
    /* a beira: o peso sobe de 0 a 1 nos primeiros 20% de cada lado */
    const ex = Math.min(x - xa + 0.5, xb - x + 0.5)/bx, ey = Math.min(y - ya + 0.5, yb - y + 0.5)/by;
    const t = Math.min(1, ex, ey), peso = t*t*(3 - 2*t);
    /* o ruido de -1 a 1 vira de 0 a 1: o morro sobe, nao cava o chao */
    alvo[(y - ya)*w + x - xa] += Math.round(amp*peso*(ruidoDoRelevo(x, y, esc, sem)*0.5 + 0.5));
  }
  /* aparar: ate parar de mudar, nenhum tile subido fica mais de um degrau
     acima do vizinho mais baixo -- e nenhum fica abaixo de onde estava */
  if (o.andavel !== false){
    const alt = function(x, y){ return x >= xa && x <= xb && y >= ya && y <= yb ? alvo[(y - ya)*w + x - xa] : m.altura[y*W + x]; };
    for (let volta = 0, mexeu = true; mexeu && volta < 200; volta++){
      mexeu = false;
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){
        const k = (y - ya)*w + x - xa;
        if (alvo[k] === antes[k]) continue;
        let baixo = Infinity;
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= m.alt) continue;
          baixo = Math.min(baixo, alt(nx, ny));
        }
        const novo = Math.max(antes[k], Math.min(alvo[k], baixo + 1));
        if (novo !== alvo[k]){ alvo[k] = novo; mexeu = true; }
      }
    }
  }
  let n = 0;
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){
    const k = (y - ya)*w + x - xa;
    if (alvo[k] !== antes[k] && pintar(h, m, "altura", x, y, alvo[k])) n++;
  }
  return n;
}

/* ---------- tracados ----------
   Uma linha grossa de tiles, do ponto ao ponto: e com ela que se faz estrada,
   rio, muralha, cerca e trilha. `largura` e em tiles, contada em volta da
   linha do meio. */
function tilesDaLinha(x0, y0, x1, y1, largura){
  const dx = x1 - x0, dy = y1 - y0;
  const comp = Math.max(Math.abs(dx), Math.abs(dy));
  const r = (largura - 1)/2, alcance = Math.ceil(r);
  const marcados = new Set(), out = [];
  const passos = Math.max(1, Math.ceil(comp*2));
  const L2 = dx*dx + dy*dy;
  for (let s = 0; s <= passos; s++){
    const t = s/passos;
    const cx = Math.round(x0 + dx*t), cy = Math.round(y0 + dy*t);
    for (let oy = -alcance; oy <= alcance; oy++) for (let ox = -alcance; ox <= alcance; ox++){
      if (largura > 1 && ox*ox + oy*oy > r*r + 0.25) continue;
      const x = cx + ox, y = cy + oy, k = x + "," + y;
      if (marcados.has(k)) continue;
      marcados.add(k);
      /* o quanto o tile ja andou da linha sai da projecao dele, nao do passo
         que o marcou: um tile da borda e marcado pelo vizinho e ficaria com o
         t errado -- era o fim da rampa parando um degrau antes */
      let t2 = L2 > 0 ? ((x - x0)*dx + (y - y0)*dy)/L2 : 0;
      t2 = t2 < 0 ? 0 : (t2 > 1 ? 1 : t2);
      out.push([x, y, t2]);
    }
  }
  return out;
}
/* A RAMPA ENTRE DOIS PONTOS, que faltava no editor: preenche os degraus
   entre a altura de um ponto e a do outro, sem passar de um degrau por tile
   -- que e o que se sobe andando. Se a subida nao couber no comprimento, ela
   sobe um por tile e avisa quanto faltou: a resposta e alongar a rampa, nao
   fazer um degrau alto no meio. */
function rampaEntre(h, m, x0, y0, x1, y1, largura){
  if (!dentro(m, x0, y0) || !dentro(m, x1, y1)) return {mexidos:0, faltou:0};
  const za = m.altura[y0*m.larg + x0], zb = m.altura[y1*m.larg + x1];
  const comp = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  const subida = zb - za;
  const cabe = Math.min(Math.abs(subida), comp);
  const passo = Math.sign(subida)*cabe/comp;
  let n = 0;
  for (const t of tilesDaLinha(x0, y0, x1, y1, largura || 1)){
    const alvo = Math.round(za + passo*comp*t[2]);
    if (pintar(h, m, "altura", t[0], t[1], alvo)) n++;
  }
  return {mexidos:n, faltou: Math.abs(subida) - cabe};
}
/* O traco de estrada, rio ou muro: pinta o terreno na linha e, se pedido,
   acerta o relevo embaixo dele -- a estrada vira rampa entre as duas pontas,
   e o rio desce ate o mar. */
function tracar(h, m, x0, y0, x1, y1, largura, terreno, opcoes){
  const o = opcoes || {};
  let n = 0;
  if (o.relevo === "rampa") rampaEntre(h, m, x0, y0, x1, y1, largura);
  for (const t of tilesDaLinha(x0, y0, x1, y1, largura || 1)){
    if (pintar(h, m, "terreno", t[0], t[1], terreno)) n++;
    if (o.relevo === "nivelar" && dentro(m, t[0], t[1]))
      pintar(h, m, "altura", t[0], t[1], m.altura[y0*m.larg + x0]);
  }
  return n;
}

/* ---------- coisas ----------
   Uma coisa por tile, como no Tibia. Colocar em cima de outra troca. */
function coisaEm(m, x, y){
  for (let k=0; k<m.coisas.length; k++) if (m.coisas[k].x === x && m.coisas[k].y === y) return k;
  return -1;
}
function colocarCoisa(h, m, x, y, tipo, texto, campos){
  if (!dentro(m, x, y)) return false;
  const k = coisaEm(m, x, y);
  const c = m.coisas[k];
  if (c && c.tipo === tipo && c.texto === (texto || "")) return false;
  marcarCoisas(h, m);
  /* inicio do jogador e unico: colocar um novo tira o antigo */
  if (tipo === "jogador") m.coisas = m.coisas.filter(function(o){ return o.tipo !== "jogador"; });
  const k2 = coisaEm(m, x, y);
  if (k2 >= 0) m.coisas.splice(k2, 1);
  const nova = {x:x, y:y, tipo:tipo, texto:texto || ""};
  if (campos && Object.keys(campos).length) nova.campos = Object.assign({}, campos);
  m.coisas.push(nova);
  return true;
}
function apagarCoisa(h, m, x, y){
  const k = coisaEm(m, x, y);
  if (k < 0) return false;
  marcarCoisas(h, m);
  m.coisas.splice(k, 1);
  return true;
}
/* Os campos de uma coisa, de uma vez: valor vazio tira o campo. */
function editarCamposCoisa(h, m, x, y, campos){
  const k = coisaEm(m, x, y);
  if (k < 0) return false;
  const c = m.coisas[k], novo = {};
  for (const n of Object.keys(campos)) if (campos[n] !== "" && campos[n] !== undefined && campos[n] !== null) novo[n] = String(campos[n]);
  /* campo com espaco quebra a linha do arquivo: nao entra */
  for (const n of Object.keys(novo)) if (/\s/.test(novo[n]) || !/^[a-z][a-z0-9_]*$/.test(n)) return false;
  if (JSON.stringify(novo) === JSON.stringify(c.campos || {})) return false;
  marcarCoisas(h, m);
  if (Object.keys(novo).length) c.campos = novo; else delete c.campos;
  return true;
}
function editarTextoCoisa(h, m, x, y, texto){
  const k = coisaEm(m, x, y);
  if (k < 0 || m.coisas[k].texto === texto) return false;
  marcarCoisas(h, m);
  m.coisas[k].texto = texto;
  return true;
}
/* Espalhar e o pincel de floresta: cada tile vazio e de chao tem `densidade`
   de chance de ganhar uma das coisas escolhidas. `sorte` e um gerador de 0 a
   1 -- no editor e Math.random, no teste e fixo.

   Duas regras, para a mata nascer onde faria sentido: nada nasce em chao de
   caminho -- terra batida, calcamento, lajota, tabuado -- e nada nasce
   encostado numa parede ou numa porta, que e onde uma arvore ficaria dentro
   da casa de alguem. `opcoes.semRegras` desliga as duas. */
const CHAO_DE_CAMINHO = {terra:1, calcada:1, lajota:1, tabuado:1};
function podePlantar(m, x, y){
  if (!dentro(m, x, y)) return false;
  if (CHAO_DE_CAMINHO[TERRENOS[m.terreno[y*m.larg + x]].id]) return false;
  for (const d of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx = x + d[0], ny = y + d[1];
    if (!dentro(m, nx, ny)) continue;
    const t = TERRENOS[m.terreno[ny*m.larg + nx]].tipo;
    if (t === "parede" || t === "porta") return false;
  }
  return true;
}
function espalhar(h, m, tiles, tipos, densidade, sorte, opcoes){
  const o = opcoes || {};
  let n = 0;
  for (const t of tiles){
    const x = t[0], y = t[1];
    if (!dentro(m, x, y) || coisaEm(m, x, y) >= 0) continue;
    if (TERRENOS[m.terreno[y*m.larg + x]].tipo !== "chao") continue;
    if (!o.semRegras && !podePlantar(m, x, y)) continue;
    if (sorte() >= densidade) continue;
    const tipo = tipos[Math.min(tipos.length-1, (sorte()*tipos.length) | 0)];
    if (colocarCoisa(h, m, x, y, tipo, "")) n++;
  }
  return n;
}

/* ---------- tamanho ----------
   `ancora` "centro" cresce igual para os quatro lados, que e o que se quer
   quando a ilha ficou apertada. "canto" cresce para a direita e para baixo.
   Coisas que ficam fora do mapa novo sao descartadas. */
/* O mapa noutro tamanho, pelo centro ou pelo canto de cima: tudo vai junto
   -- terreno, relevo, teto, regiao, coisas com os campos, pecas --, e o que
   cai fora fica de fora. O que sobra em volta e mar na ilha e rocha na
   dungeon. As construcoes ficam todas: a que perdeu as pecas nao atrapalha. */
function redimensionar(m, larg, alt, ancora){
  const dungeon = m.mar === null;
  const n = novoMapa(larg, alt, {nome:m.nome, passo:m.passo, mar:m.mar, versao:m.versao,
                                  terreno: dungeon ? TERRENO_POR_CHAR["#"] : undefined,
                                  altura: dungeon ? 0 : Math.max(0, m.mar - 2)});
  n.extras = m.extras.slice();
  n.semente = m.semente === undefined ? null : m.semente;
  n.regioes = copiaRegioes(m.regioes);
  n.construcoes = copiaConstrucoes(m.construcoes);
  if (m.regiao) n.regiao = new m.regiao.constructor(larg*alt);
  const dx = ancora === "centro" ? Math.floor((larg - m.larg)/2) : 0;
  const dy = ancora === "centro" ? Math.floor((alt  - m.alt )/2) : 0;
  for (let y=0; y<m.alt; y++) for (let x=0; x<m.larg; x++){
    const nx = x+dx, ny = y+dy;
    if (nx<0 || ny<0 || nx>=larg || ny>=alt) continue;
    const a = y*m.larg + x, b = ny*larg + nx;
    n.terreno[b] = m.terreno[a]; n.altura[b] = m.altura[a]; n.teto[b] = m.teto[a];
    if (m.regiao) n.regiao[b] = m.regiao[a];
  }
  for (const c of copiaCoisas(m.coisas)){
    c.x += dx; c.y += dy;
    if (c.x >= 0 && c.y >= 0 && c.x < larg && c.y < alt) n.coisas.push(c);
  }
  for (const p of copiaPecas(m.pecas)){
    p.x += dx; p.y += dy;
    if (p.x >= 0 && p.y >= 0 && p.x < larg && p.y < alt) n.pecas.push(p);
  }
  return n;
}

/* ---------- carimbos ----------
   Um carimbo e um pedaco de mapa aplicado de uma vez: uma casa pronta, uma
   escada ou o pedaco que se copiou. Por dentro todos tem a mesma forma:
     larg, alt   o tamanho
     terreno     indice de TERRENOS por celula, ou -1 para nao mexer no tile
     altura      degraus acima do chao onde se carimba
     teto        o teto de cada celula
     coisas      [{x, y, tipo, texto, campos}], com x e y dentro do carimbo
     pecas       [{grupo, tipo, x, y, z, giro, espelho, campos}], o lugar
                 relativo ao canto e o z ao chao mais baixo
     grupos      [{grupo, estilo, nome}]: cada construcao do pedaco
   A altura e relativa de proposito: a mesma casa assenta num morro ou na
   praia, e a escada sobe a partir de onde se clica. Carimbada, cada grupo
   vira uma construcao nova, com o estilo dele: a casa colada e outra casa.

   Os prontos sao escritos como o proprio mapa: uma linha por fileira, o
   caractere do terreno, espaco para nao mexer. `degraus` e a altura de cada
   fileira, e `teto` o teto de cada caractere. */
const CARIMBOS = [
  {id:"casa-madeira", nome:"Casa de madeira",
   terreno:["HHHHH",
            "H===H",
            "H===H",
            "H===H",
            "HHDHH"],
   teto:{"H":6, "=":5, "D":5}},
  {id:"casa-pedra", nome:"Casa de pedra",
   terreno:["#######",
            "#+++++#",
            "#+++++#",
            "#+++++#",
            "###D###"],
   teto:{"#":7, "+":6, "D":5}},
  {id:"escada", nome:"Escada",
   terreno:["+++",
            "+++",
            "+++",
            "+++",
            "+++",
            "+++"],
   degraus:[5, 4, 3, 2, 1, 0]}
];
function carimboPronto(def){
  const alt = def.terreno.length, larg = def.terreno[0].length, n = larg*alt;
  const c = {nome:def.nome, larg:larg, alt:alt, terreno:new Array(n).fill(-1),
             altura:new Array(n).fill(0), teto:new Array(n).fill(0), coisas:[], pecas:[], grupos:[]};
  for (let y=0; y<alt; y++) for (let x=0; x<larg; x++){
    const ch = def.terreno[y].charAt(x), i = y*larg + x;
    if (ch === " ") continue;
    c.terreno[i] = TERRENO_POR_CHAR[ch];
    c.altura[i] = def.degraus ? def.degraus[y] : 0;
    c.teto[i] = def.teto && def.teto[ch] ? def.teto[ch] : 0;
  }
  return c;
}
/* O pedaco entre dois cantos vira carimbo. O chao mais baixo dele vira o
   zero: colado noutro lugar, e esse ponto que assenta na altura do clique. */
function recortar(m, x0, y0, x1, y1){
  const xa = Math.max(0, Math.min(x0, x1)), xb = Math.min(m.larg-1, Math.max(x0, x1));
  const ya = Math.max(0, Math.min(y0, y1)), yb = Math.min(m.alt-1,  Math.max(y0, y1));
  if (xb < xa || yb < ya) return null;
  let base = Infinity;
  for (let y=ya; y<=yb; y++) for (let x=xa; x<=xb; x++) base = Math.min(base, m.altura[y*m.larg + x]);
  const c = {nome:"Peda\u00e7o copiado", larg:xb - xa + 1, alt:yb - ya + 1, terreno:[], altura:[], teto:[], coisas:[], pecas:[], grupos:[]};
  for (let y=ya; y<=yb; y++) for (let x=xa; x<=xb; x++){
    const i = y*m.larg + x;
    c.terreno.push(m.terreno[i]); c.altura.push(m.altura[i] - base); c.teto.push(m.teto[i]);
  }
  for (const co of copiaCoisas(m.coisas))
    if (co.x >= xa && co.x <= xb && co.y >= ya && co.y <= yb){ co.x -= xa; co.y -= ya; c.coisas.push(co); }
  /* a peca vai com o pedaco se nasce dentro dele */
  const grupos = new Map(), estilos = new Map();
  for (const k of m.construcoes || []) estilos.set(k.id, k);
  for (const p of m.pecas || []){
    if (!(p.x >= xa && p.x < xb + 1 && p.y >= ya && p.y < yb + 1)) continue;
    if (!grupos.has(p.construcao)){
      const k = estilos.get(p.construcao);
      grupos.set(p.construcao, grupos.size + 1);
      c.grupos.push({grupo: grupos.size, estilo: k ? k.estilo : (p.estilo || "madeira-pescador"), nome: k ? k.nome : ""});
    }
    const q = {grupo: grupos.get(p.construcao), tipo: p.tipo, x: p.x - xa, y: p.y - ya, z: p.z - base*m.passo,
               giro: p.giro || 0, espelho: p.espelho ? 1 : 0};
    if (p.campos) q.campos = Object.assign({}, p.campos);
    c.pecas.push(q);
  }
  return c;
}
/* um quarto de volta no sentido do relogio */
function girarCarimbo(c){
  const n = {nome:c.nome, larg:c.alt, alt:c.larg, terreno:[], altura:[], teto:[], coisas:[], pecas:[], grupos:[]};
  for (let ny=0; ny<n.alt; ny++) for (let nx=0; nx<n.larg; nx++){
    const i = (c.alt - 1 - nx)*c.larg + ny;
    n.terreno.push(c.terreno[i]); n.altura.push(c.altura[i]); n.teto.push(c.teto[i]);
  }
  for (const co of c.coisas){
    const q = {x:c.alt - 1 - co.y, y:co.x, tipo:co.tipo, texto:co.texto};
    if (co.campos) q.campos = Object.assign({}, co.campos);
    n.coisas.push(q);
  }
  /* a peca gira em volta do canto, como no modelo: (x, y) vai para
     (alt - y, x), e o giro dela soma um quarto */
  n.grupos = (c.grupos || []).map(function(g){ return Object.assign({}, g); });
  n.pecas = (c.pecas || []).map(function(p){
    const q = Object.assign({}, p, {x: c.alt - p.y, y: p.x, giro: ((p.giro || 0) + 90) % 360});
    if (p.campos) q.campos = Object.assign({}, p.campos);
    return q;
  });
  return n;
}
/* o carimbo fica com o meio no tile clicado */
function cantoDoCarimbo(c, x, y){ return {x:x - Math.floor(c.larg/2), y:y - Math.floor(c.alt/2)}; }
/* Assenta na altura do tile clicado. O que cai fora do mapa fica de fora;
   coisa em tile coberto sai, e as do carimbo entram. Devolve quantos tiles
   mudaram. */
function carimbar(h, m, c, x, y){
  if (!dentro(m, x, y)) return 0;
  const base = m.altura[y*m.larg + x], k = cantoDoCarimbo(c, x, y);
  const cobertos = new Set();
  let n = 0;
  for (let cy=0; cy<c.alt; cy++) for (let cx=0; cx<c.larg; cx++){
    const j = cy*c.larg + cx, mx = k.x + cx, my = k.y + cy;
    if (c.terreno[j] < 0 || !dentro(m, mx, my)) continue;
    const i = my*m.larg + mx;
    let mudou = mudar(h, m, "terreno", i, c.terreno[j]);
    if (mudar(h, m, "altura", i, Math.max(0, Math.min(ALTURA_MAX, base + c.altura[j])))) mudou = true;
    if (mudar(h, m, "teto", i, c.teto[j])) mudou = true;
    if (mudou) n++;
    cobertos.add(i);
  }
  const entram = c.coisas.filter(function(co){ return dentro(m, k.x + co.x, k.y + co.y); });
  const saem = m.coisas.some(function(co){ return cobertos.has(co.y*m.larg + co.x); });
  if (saem || entram.length){
    marcarCoisas(h, m);
    m.coisas = m.coisas.filter(function(co){ return !cobertos.has(co.y*m.larg + co.x); });
    for (const co of entram) colocarCoisa(h, m, k.x + co.x, k.y + co.y, co.tipo, co.texto, co.campos ? Object.assign({}, co.campos) : null);
  }
  /* as pecas: as do chao coberto saem, e as do carimbo entram em
     construcoes novas, assentadas no chao do clique */
  const pecas = (c.pecas || []).filter(function(p){ return dentro(m, Math.floor(k.x + p.x), Math.floor(k.y + p.y)); });
  const cobertas = (m.pecas || []).some(function(p){ return cobertos.has(Math.floor(p.y)*m.larg + Math.floor(p.x)); });
  if (pecas.length || cobertas){
    marcarPecas(h, m);
    m.pecas = m.pecas.filter(function(p){ return !cobertos.has(Math.floor(p.y)*m.larg + Math.floor(p.x)); });
    let maior = 0;
    for (const q of m.construcoes) if (q.id > maior) maior = q.id;
    for (const p of m.pecas) if (p.construcao > maior) maior = p.construcao;
    const nova = new Map();
    for (const g of c.grupos || []){
      if (!pecas.some(function(p){ return p.grupo === g.grupo; })) continue;
      nova.set(g.grupo, ++maior);
      m.construcoes.push({id: maior, estilo: g.estilo, nome: g.nome || c.nome || "carimbo"});
    }
    const chao = base*m.passo, r = function(v){ return Math.round(v*1e6)/1e6; };
    for (const p of pecas){
      const q = {tipo: p.tipo, construcao: nova.get(p.grupo), x: r(k.x + p.x), y: r(k.y + p.y), z: r(chao + p.z),
                 giro: p.giro || 0, espelho: p.espelho ? 1 : 0};
      if (p.campos) q.campos = Object.assign({}, p.campos);
      m.pecas.push(q);
    }
    idsDePeca(m);
  }
  return n;
}

/* ---------- regua ----------
   `vel` e a velocidade do painel de ajuste do jogo, em porcentagem. Sem ela
   vale a original. */
function medir(x0, y0, x1, y1, vel){
  const tiles = Math.hypot(x1-x0, y1-y0);
  const porSegundo = TILES_POR_SEGUNDO * (vel || 100) / 100;
  return {tiles:tiles, metros:tiles*METROS_POR_TILE, segundos:tiles/porSegundo};
}

if (typeof module !== "undefined") module.exports = {
  METROS_POR_TILE, TILES_POR_SEGUNDO,
  copiaCoisas, copiaPeca, copiaPecas, mesmaPeca, diferencaDePecas, copiaConstrucoes, copiaRegioes, clonarMapa, copiarPara,
  novoHistorico, abrirAcao, fecharAcao, marcarMapaInteiro, marcarCoisas, marcarPecas, desfazer, refazer,
  tilesDoRegistro, ultimoRegistro,
  tilesDoPincel, pintar, retangulo, balde, ajustarAltura, suavizar,
  tilesDaLinha, rampaEntre, tracar, ruidoDoRelevo, relevoComRuido,
  coisaEm, colocarCoisa, apagarCoisa, editarTextoCoisa, editarCamposCoisa, espalhar, podePlantar,
  redimensionar, medir,
  CARIMBOS, carimboPronto, recortar, girarCarimbo, cantoDoCarimbo, carimbar
};
