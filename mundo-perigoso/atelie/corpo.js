/* ============================================================
   ATELIE -- O CORPO
   ------------------------------------------------------------
   O corpo mora na bind pose (T-pose), numa caixa bem mais larga que a
   grade do jogo: de braco esticado o humano tem uns 107 voxels de ponta a
   ponta, e a grade do jogo tem 80. Foi exatamente assim que o corpo antigo
   perdeu as duas maos -- a conversao cortava o que passava da grade.

   Cada celula da caixa guarda a cor (0 e vazio) e o peso: os dois ossos
   que mais mandam nela e quanto o primeiro manda (0 a 255). O resto do
   atelie le e escreve isto; a grade de um byte do jogo so aparece na hora
   de exportar, ja posada.

   Aqui tambem entram os modelos de fora (.wgvox, .vox, .personagem), a
   reducao de cores para o que a paleta do jogo aguenta, e as operacoes de
   esculpir -- pincel, balde e espelho -- com desfazer.
   ============================================================ */
if (typeof module !== "undefined" && typeof GRADE === "undefined"){
  const M = require("./nucleo.js");
  for (const k in M) globalThis[k] = M[k];
}

/* a caixa da bind pose, em voxels do jogo: x de -30 a 109, y de -4 a 59,
   z de -3 a 120. O meio do corpo continua em CX, CY e o pe em z 0. */
const CAIXA = {ox: -30, oy: -4, oz: -3, bx: 140, by: 64, bz: 124};

function novoCorpo(nome){
  const n = CAIXA.bx*CAIXA.by*CAIXA.bz;
  return {nome: nome || "humano", ox: CAIXA.ox, oy: CAIXA.oy, oz: CAIXA.oz, bx: CAIXA.bx, by: CAIXA.by, bz: CAIXA.bz,
          cor: new Uint8Array(n), a: new Uint8Array(n), b: new Uint8Array(n), w: new Uint8Array(n),
          paleta: [], versao: 0, _lista: null, _versaoLista: -1, hist: {feitos: [], desfeitos: [], aberta: null}};
}
/* indice da celula de um voxel em coordenadas do jogo; -1 fora da caixa */
function celula(c, x, y, z){
  x -= c.ox; y -= c.oy; z -= c.oz;
  if (x < 0 || y < 0 || z < 0 || x >= c.bx || y >= c.by || z >= c.bz) return -1;
  return (z*c.by + y)*c.bx + x;
}
function posicaoDaCelula(c, i){
  const bxy = c.bx*c.by, z = Math.floor(i/bxy), r = i - z*bxy, y = Math.floor(r/c.bx), x = r - y*c.bx;
  return [x + c.ox, y + c.oy, z + c.oz];
}
function corEm(c, x, y, z){ const i = celula(c, x, y, z); return i < 0 ? 0 : c.cor[i]; }
/* as celulas cheias, em ordem; guardada ate o corpo mudar */
function voxelsDoCorpo(c){
  if (c._lista && c._versaoLista === c.versao) return c._lista;
  let n = 0;
  for (let i = 0; i < c.cor.length; i++) if (c.cor[i]) n++;
  const l = new Int32Array(n);
  n = 0;
  for (let i = 0; i < c.cor.length; i++) if (c.cor[i]) l[n++] = i;
  c._lista = l; c._versaoLista = c.versao;
  return l;
}
function limitesDoCorpo(c){
  const l = voxelsDoCorpo(c), m = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (let k = 0; k < l.length; k++){
    const p = posicaoDaCelula(c, l[k]);
    for (let e = 0; e < 3; e++){ if (p[e] < m[e]) m[e] = p[e]; if (p[e] > m[3 + e]) m[3 + e] = p[e]; }
  }
  return m;
}

/* ---------- desfazer ----------
   Cada acao (um traco de pincel, um balde, um recalculo de peso) guarda o
   valor antigo de cada celula que mudou, uma vez so. */
function abrirAcao(c, nome){ c.hist.aberta = {nome: nome, antes: new Map()}; }
function mudarCelula(c, i, cor, a, b, w){
  const h = c.hist.aberta;
  if (h && !h.antes.has(i)) h.antes.set(i, [c.cor[i], c.a[i], c.b[i], c.w[i]]);
  if (cor !== undefined && cor !== null) c.cor[i] = cor;
  if (a !== undefined && a !== null){ c.a[i] = a; c.b[i] = b; c.w[i] = w; }
  c.versao++;
}
function fecharAcao(c){
  const h = c.hist.aberta;
  c.hist.aberta = null;
  if (!h || !h.antes.size) return false;
  c.hist.feitos.push(h); c.hist.desfeitos.length = 0;
  if (c.hist.feitos.length > 200) c.hist.feitos.shift();
  return true;
}
function trocarHistorico(c, de, para){
  const h = de.pop();
  if (!h) return false;
  const volta = {nome: h.nome, antes: new Map()};
  for (const [i, v] of h.antes){
    volta.antes.set(i, [c.cor[i], c.a[i], c.b[i], c.w[i]]);
    c.cor[i] = v[0]; c.a[i] = v[1]; c.b[i] = v[2]; c.w[i] = v[3];
  }
  para.push(volta); c.versao++;
  return true;
}
function desfazer(c){ return trocarHistorico(c, c.hist.feitos, c.hist.desfeitos); }
function refazer(c){ return trocarHistorico(c, c.hist.desfeitos, c.hist.feitos); }

/* ---------- ler modelos de fora ----------
   Todo leitor devolve {gx, gy, gz, rgb(x,y,z) -> [r,g,b] ou null}, ja nos
   eixos do jogo: x esquerda->direita, y frente->costas, z pe->cabeca. */
function bytesDe(dados){
  if (dados instanceof Uint8Array) return dados;
  if (dados instanceof ArrayBuffer) return new Uint8Array(dados);
  return new Uint8Array(dados.buffer, dados.byteOffset, dados.byteLength);
}
function textoAscii(u, de, ate){ let s = ""; for (let i = de; i < ate; i++) s += String.fromCharCode(u[i]); return s; }
/* .wgvox (sorceress.games): "WGV2", cabecalho JSON, depois "WGV1", grade em
   RLE de pares u16 (tamanho, cor). A grade deles tem y para cima e a frente
   no z alto -- o y do jogo e a profundidade deles, invertida. */
function lerWgvox(dados){
  const u = bytesDe(dados), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  if (textoAscii(u, 0, 4) !== "WGV2") throw new Error("nao e um .wgvox (falta WGV2)");
  let p = 16 + dv.getUint32(8, true);
  if (textoAscii(u, p, p + 4) !== "WGV1") throw new Error(".wgvox sem a secao WGV1");
  const gx = dv.getUint16(p + 8, true), gy = dv.getUint16(p + 10, true), gz = dv.getUint16(p + 12, true);
  const nCores = dv.getUint16(p + 14, true);
  p += 24;
  const pal = [];
  for (let i = 0; i < nCores; i++){ pal.push([u[p], u[p + 1], u[p + 2]]); p += 3; }
  const nPares = dv.getUint32(p, true); p += 4;
  const g = new Uint16Array(gx*gy*gz);
  let k = 0;
  for (let i = 0; i < nPares; i++){
    const n = dv.getUint16(p, true), v = dv.getUint16(p + 2, true); p += 4;
    if (v) g.fill(v, k, Math.min(g.length, k + n));
    k += n;
  }
  /* O indice da grade aponta direto para a paleta: a entrada 0 da paleta e o
     "vazio" e nao se desenha (a descricao que o proprio arquivo traz no
     cabecalho JSON). Ate 1/10 se lia pal[v - 1]: cada voxel pegava a cor da
     entrada vizinha, que numa paleta de 23 mil cores sem ordem e outra cor
     qualquer -- o modelo saia salpicado, e a conclusao de 30/9 de que a cor
     do Sorceress era ruim vinha disso. Foi o Leandro que desconfiou do leitor. */
  return {gx: gx, gy: gz, gz: gy, rgb: function(x, y, z){
    const v = g[x + z*gx + (gz - 1 - y)*gx*gy];
    return v ? (pal[v] || [128, 128, 128]) : null;
  }};
}
/* .vox do MagicaVoxel, um modelo so, nos eixos do jogo (e como editor/vox.js
   grava) */
function lerVox(dados){
  const u = bytesDe(dados), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  if (textoAscii(u, 0, 4) !== "VOX ") throw new Error("nao e um arquivo .vox");
  let dim = null, lista = null, pal = null;
  (function pedacos(ini, fim){
    let p = ini;
    while (p + 12 <= fim){
      const id = textoAscii(u, p, p + 4), nc = dv.getInt32(p + 4, true), nf = dv.getInt32(p + 8, true), c0 = p + 12;
      if (id === "SIZE" && !dim) dim = [dv.getInt32(c0, true), dv.getInt32(c0 + 4, true), dv.getInt32(c0 + 8, true)];
      else if (id === "XYZI" && !lista){ const n = dv.getInt32(c0, true); lista = u.subarray(c0 + 4, c0 + 4 + n*4); }
      else if (id === "RGBA"){ pal = []; for (let i = 0; i < 255; i++) pal.push([u[c0 + i*4], u[c0 + i*4 + 1], u[c0 + i*4 + 2]]); }
      if (nf > 0) pedacos(c0 + nc, c0 + nc + nf);
      p = c0 + nc + nf;
    }
  })(20, u.length);
  if (!dim || !lista) throw new Error(".vox sem SIZE ou XYZI");
  const g = new Uint8Array(dim[0]*dim[1]*dim[2]);
  for (let i = 0; i + 3 < lista.length; i += 4) g[(lista[i + 2]*dim[1] + lista[i + 1])*dim[0] + lista[i]] = lista[i + 3];
  return {gx: dim[0], gy: dim[1], gz: dim[2], rgb: function(x, y, z){
    const v = g[(z*dim[1] + y)*dim[0] + x];
    return v ? (pal ? pal[v - 1] : [200, 200, 200]) : null;
  }};
}
/* .personagem do jogo: a grade da primeira pose (ou a unica) */
function lerPersonagemTexto(texto){
  const L = String(texto).replace(/\r\n/g, "\n").split("\n");
  if (!/^PERSONAGEM [12]/.test(L[0])) throw new Error("nao e um arquivo .personagem");
  let DX = 0, DY = 0, DZ = 0, cores = [], i = 1;
  for (; i < L.length; i++){
    const l = L[i].trim(), p = l.split(/\s+/);
    if (l === "[voxels]"){ i++; break; }
    if (p[0] === "grade"){ DX = +p[1]; DY = +p[2]; DZ = +p[3]; }
    else if (p[0] === "cores") cores = (L[++i] || "").trim().split(/\s+/).slice(0, +p[1]);
  }
  const g = new Uint8Array(DX*DY*DZ);
  let k = 0;
  for (; i < L.length && k < g.length; i++){
    if (L[i].charAt(0) === "[") break;
    for (const t of L[i].trim().split(/\s+/)){
      if (!t) continue;
      const e = t.indexOf("*"), v = parseInt(e < 0 ? t : t.slice(0, e), 36), n = e < 0 ? 1 : parseInt(t.slice(e + 1), 36);
      if (v) g.fill(v, k, Math.min(g.length, k + n));
      k += n;
    }
  }
  const pal = cores.map(function(h){ return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; });
  return {gx: DX, gy: DY, gz: DZ, rgb: function(x, y, z){ const v = g[(z*DY + y)*DX + x]; return v ? (pal[v - 1] || [128, 128, 128]) : null; }};
}

/* ---------- reduzir cores ----------
   k-medias sobre um histograma de 5 bits por canal, com pesos de
   luminancia, sementes k-medias++ num gerador fixo (a mesma entrada da
   sempre a mesma paleta). */
function gerador(semente){
  let s = semente >>> 0;
  return function(){ s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
}
function distCor(a, b){ const r = a[0] - b[0], g = a[1] - b[1], bl = a[2] - b[2]; return 2*r*r + 4*g*g + 3*bl*bl; }
function reduzirCores(cores, maximo){
  const baldes = new Map();
  for (const c of cores){
    const k = ((c[0] >> 3) << 10) | ((c[1] >> 3) << 5) | (c[2] >> 3);
    let e = baldes.get(k);
    if (!e){ e = [0, 0, 0, 0]; baldes.set(k, e); }
    e[0]++; e[1] += c[0]; e[2] += c[1]; e[3] += c[2];
  }
  const pts = Array.from(baldes.values()).map(function(e){ return {n: e[0], c: [e[1]/e[0], e[2]/e[0], e[3]/e[0]]}; });
  if (pts.length <= maximo) return pts.map(function(p){ return p.c.map(Math.round); });
  const rnd = gerador(1234), centros = [];
  pts.sort(function(a, b){ return b.n - a.n; });
  centros.push(pts[0].c.slice());
  const dmin = pts.map(function(p){ return distCor(p.c, centros[0]); });
  while (centros.length < maximo){
    let soma = 0;
    for (let i = 0; i < pts.length; i++) soma += dmin[i]*pts[i].n;
    let alvo = rnd()*soma, j = 0;
    for (; j < pts.length - 1; j++){ alvo -= dmin[j]*pts[j].n; if (alvo <= 0) break; }
    centros.push(pts[j].c.slice());
    for (let i = 0; i < pts.length; i++) dmin[i] = Math.min(dmin[i], distCor(pts[i].c, pts[j].c));
  }
  for (let it = 0; it < 14; it++){
    const acc = centros.map(function(){ return [0, 0, 0, 0]; });
    for (const p of pts){
      let m = 0, dm = 1e18;
      for (let k = 0; k < centros.length; k++){ const d = distCor(p.c, centros[k]); if (d < dm){ dm = d; m = k; } }
      const a = acc[m]; a[0] += p.n; a[1] += p.c[0]*p.n; a[2] += p.c[1]*p.n; a[3] += p.c[2]*p.n;
    }
    for (let k = 0; k < centros.length; k++) if (acc[k][0]) centros[k] = [acc[k][1]/acc[k][0], acc[k][2]/acc[k][0], acc[k][3]/acc[k][0]];
  }
  return centros.map(function(c){ return c.map(Math.round); });
}
function corMaisPerto(pal, c){
  let m = 0, dm = 1e18;
  for (let k = 0; k < pal.length; k++){ const d = distCor(c, pal[k]); if (d < dm){ dm = d; m = k; } }
  return m + 1;
}
function luminancia(c){ return 0.3*c[0] + 0.59*c[1] + 0.11*c[2]; }

/* ---------- importar ----------
   A altura do modelo vira ALTURA_DO_CORPO voxels, cada celula nova e
   a media de RGB das celulas de origem que ela cobre -- media e nao voto,
   porque um modelo gerado tem milhares de tons quase iguais e o voto sai
   salpicado -- e entra se pelo menos metade dela estiver cheia. O corpo e
   centrado (meio da largura em CX, meio do tronco em CY, pe em z 0), fica
   macico por dentro e as cores caem para o que a paleta do jogo aguenta. */
/* 115 e nao os 117 da grade: com o topo da cabeca parada no teto, nenhum
   passo consegue subir a bacia (na passagem de uma caminhada de verdade o
   corpo sobe) sem a cabeca sair da grade. Dois voxels de folga bastam. */
const ALTURA_DO_CORPO = 115;
function importarModelo(fonte, opcoes){
  opcoes = opcoes || {};
  const altura = opcoes.altura || ALTURA_DO_CORPO, maxCores = opcoes.maxCores || MAX_CORES_DO_CORPO;
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
  for (let z = 0; z < fonte.gz; z++) for (let y = 0; y < fonte.gy; y++) for (let x = 0; x < fonte.gx; x++){
    if (!fonte.rgb(x, y, z)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  if (x1 < 0) throw new Error("o modelo esta vazio");
  const esc = altura/(z1 - z0 + 1), passo = 1/esc;
  const nx = Math.max(1, Math.round((x1 - x0 + 1)*esc)), ny = Math.max(1, Math.round((y1 - y0 + 1)*esc));
  const tmp = new Array(nx*ny*altura).fill(null);
  for (let z = 0; z < altura; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++){
    const sx0 = x0 + Math.floor(x*passo), sx1 = Math.min(x1 + 1, x0 + Math.ceil((x + 1)*passo));
    const sy0 = y0 + Math.floor(y*passo), sy1 = Math.min(y1 + 1, y0 + Math.ceil((y + 1)*passo));
    const sz0 = z0 + Math.floor(z*passo), sz1 = Math.min(z1 + 1, z0 + Math.ceil((z + 1)*passo));
    let r = 0, g = 0, b = 0, cheios = 0, total = 0;
    for (let sz = sz0; sz < sz1; sz++) for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++){
      total++;
      const c = fonte.rgb(sx, sy, sz);
      if (!c) continue;
      cheios++; r += c[0]; g += c[1]; b += c[2];
    }
    if (cheios*2 >= total && cheios) tmp[(z*ny + y)*nx + x] = [r/cheios, g/cheios, b/cheios];
  }
  /* meio do tronco (um terco a dois tercos da altura, perto do meio da
     largura) para o y; meio da largura para o x */
  let sy = 0, ny2 = 0;
  for (let z = Math.round(altura*0.4); z < Math.round(altura*0.62); z++) for (let y = 0; y < ny; y++)
    for (let x = Math.round(nx*0.4); x < Math.round(nx*0.6); x++) if (tmp[(z*ny + y)*nx + x]){ sy += y; ny2++; }
  const dx = CENTRO.CX - Math.round((nx - 1)/2), dy = CENTRO.CY - Math.round(ny2 ? sy/ny2 : (ny - 1)/2);
  const c = novoCorpo(opcoes.nome);
  const cheios = [], rgbs = [], casca = [];
  const vazio = (x, y, z) => x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= altura || !tmp[(z*ny + y)*nx + x];
  for (let z = 0; z < altura; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++){
    const v = tmp[(z*ny + y)*nx + x];
    if (!v) continue;
    const i = celula(c, x + dx, y + dy, z);
    if (i < 0) continue;
    cheios.push(i); rgbs.push(v);
    if (vazio(x - 1, y, z) || vazio(x + 1, y, z) || vazio(x, y - 1, z) || vazio(x, y + 1, z) || vazio(x, y, z - 1) || vazio(x, y, z + 1)) casca.push(v);
  }
  /* A paleta sai so da casca, o que se ve: num modelo macico (o do Sorceress)
     o miolo e a maior parte dos voxels e roubava cores da paleta -- o olho,
     poucos voxels, sumia no tom da pele (1/10). */
  c.paleta = reduzirCores(casca.length ? casca : rgbs, maxCores).sort(function(a, b){ return luminancia(a) - luminancia(b); });
  for (let k = 0; k < cheios.length; k++) c.cor[cheios[k]] = corMaisPerto(c.paleta, rgbs[k]);
  c.versao++;
  solidificar(c);
  if (opcoes.limpeza !== 0) limparRuido(c, opcoes.limpeza || 1);
  return c;
}

/* ---------- limpezas ---------- */
const VIZ6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
/* Enche o que e oco por dentro: o vazio que nao se alcanca por fora vira
   corpo, com a cor do vizinho. Oco por dentro abre buraco quando a junta
   dobra e mostra o lado de dentro. */
function solidificar(c){
  const n = c.cor.length, fora = new Uint8Array(n), fila = new Int32Array(n);
  let ini = 0, fim = 0;
  function semear(i){ if (!c.cor[i] && !fora[i]){ fora[i] = 1; fila[fim++] = i; } }
  for (let z = 0; z < c.bz; z++) for (let y = 0; y < c.by; y++){ semear((z*c.by + y)*c.bx); semear((z*c.by + y)*c.bx + c.bx - 1); }
  for (let z = 0; z < c.bz; z++) for (let x = 0; x < c.bx; x++){ semear((z*c.by)*c.bx + x); semear((z*c.by + c.by - 1)*c.bx + x); }
  for (let y = 0; y < c.by; y++) for (let x = 0; x < c.bx; x++){ semear(y*c.bx + x); semear(((c.bz - 1)*c.by + y)*c.bx + x); }
  const passos = [1, -1, c.bx, -c.bx, c.bx*c.by, -c.bx*c.by];
  while (ini < fim){
    const i = fila[ini++];
    for (const d of passos){ const j = i + d; if (j >= 0 && j < n && !c.cor[j] && !fora[j]){ fora[j] = 1; fila[fim++] = j; } }
  }
  let enchidos = 0, pendentes = [];
  for (let i = 0; i < n; i++) if (!c.cor[i] && !fora[i]) pendentes.push(i);
  while (pendentes.length){
    const resto = [];
    for (const i of pendentes){
      let cor = 0;
      for (const d of passos){ const j = i + d; if (j >= 0 && j < n && c.cor[j]){ cor = c.cor[j]; break; } }
      if (cor){ c.cor[i] = cor; enchidos++; } else resto.push(i);
    }
    if (resto.length === pendentes.length) break;
    pendentes = resto;
  }
  if (enchidos) c.versao++;
  return enchidos;
}
/* Tira o salpicado: voxel de superficie cuja cor nenhum vizinho tem, e
   cercado por uma cor que pelo menos 40% dos vizinhos tem, vira ela. */
function limparRuido(c, passadas){
  let trocas = 0;
  for (let ps = 0; ps < (passadas || 1); ps++){
    const antes = c.cor.slice(), lista = voxelsDoCorpo(c), conta = new Map();
    for (let k = 0; k < lista.length; k++){
      const i = lista[k], p = posicaoDaCelula(c, i), c0 = antes[i];
      let exposto = false, n = 0, igual = false;
      conta.clear();
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
        if (!dx && !dy && !dz) continue;
        const j = celula(c, p[0] + dx, p[1] + dy, p[2] + dz), v = j < 0 ? 0 : antes[j];
        if (!v){ exposto = true; continue; }
        n++;
        if (v === c0) igual = true;
        conta.set(v, (conta.get(v) || 0) + 1);
      }
      if (!exposto || igual || !n) continue;
      let melhor = 0, bn = 0;
      for (const [v, q] of conta) if (q > bn){ bn = q; melhor = v; }
      if (bn >= 0.4*n){ c.cor[i] = melhor; trocas++; }
    }
    c.versao++;
  }
  return trocas;
}

/* ---------- esculpir ----------
   O espelho e ligado por padrao: o corpo e simetrico em volta de x = CX, e
   o voxel x vira 2*CX - x do outro lado. */
function espelhoX(x){ return 2*CENTRO.CX - x; }
function celulasDoPincel(c, centro, raio, espelho){
  const r = Math.max(0, raio), r2 = (r + 0.35)*(r + 0.35), l = [], vistos = new Set();
  const centros = espelho ? [centro, [espelhoX(centro[0]), centro[1], centro[2]]] : [centro];
  for (const q of centros){
    const R = Math.ceil(r);
    for (let dz = -R; dz <= R; dz++) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++){
      if (dx*dx + dy*dy + dz*dz > r2) continue;
      const i = celula(c, Math.round(q[0]) + dx, Math.round(q[1]) + dy, Math.round(q[2]) + dz);
      if (i >= 0 && !vistos.has(i)){ vistos.add(i); l.push(i); }
    }
  }
  return l;
}
/* modo: "por" poe voxel, "tirar" tira, "pintar" so troca a cor do que existe */
function pincelDeVoxel(c, centro, raio, modo, cor, espelho){
  let n = 0;
  for (const i of celulasDoPincel(c, centro, raio, espelho)){
    if (modo === "tirar"){ if (c.cor[i]){ mudarCelula(c, i, 0, 0, 0, 0); n++; } }
    else if (modo === "pintar"){ if (c.cor[i] && c.cor[i] !== cor){ mudarCelula(c, i, cor); n++; } }
    else if (!c.cor[i]){
      /* voxel novo herda o peso do vizinho, para nao nascer solto de osso */
      const p = posicaoDaCelula(c, i);
      let viz = -1;
      for (const d of VIZ6){ const j = celula(c, p[0] + d[0], p[1] + d[1], p[2] + d[2]); if (j >= 0 && c.cor[j]){ viz = j; break; } }
      if (viz >= 0) mudarCelula(c, i, cor, c.a[viz], c.b[viz], c.w[viz]); else mudarCelula(c, i, cor);
      n++;
    }
  }
  return n;
}
/* o balde troca a cor de toda a regiao ligada (vizinhanca 6) da mesma cor */
function baldeDeCor(c, pos, cor, espelho){
  let n = 0;
  const inicios = espelho ? [pos, [espelhoX(pos[0]), pos[1], pos[2]]] : [pos];
  for (const q of inicios){
    const i0 = celula(c, q[0], q[1], q[2]);
    if (i0 < 0 || !c.cor[i0] || c.cor[i0] === cor) continue;
    const alvo = c.cor[i0], fila = [i0], visto = new Set([i0]);
    while (fila.length){
      const i = fila.pop(), p = posicaoDaCelula(c, i);
      mudarCelula(c, i, cor); n++;
      for (const d of VIZ6){
        const j = celula(c, p[0] + d[0], p[1] + d[1], p[2] + d[2]);
        if (j >= 0 && !visto.has(j) && c.cor[j] === alvo){ visto.add(j); fila.push(j); }
      }
    }
  }
  return n;
}
/* poe uma cor nova na paleta, ou devolve a que ja existe igual */
function corNaPaleta(c, rgb){
  for (let k = 0; k < c.paleta.length; k++){ const p = c.paleta[k]; if (p[0] === rgb[0] && p[1] === rgb[1] && p[2] === rgb[2]) return k + 1; }
  if (c.paleta.length >= 255) return corMaisPerto(c.paleta, rgb);
  c.paleta.push(rgb.slice());
  return c.paleta.length;
}
/* Um corpo de exemplo, feito de capsulas em T-pose, para testar sem modelo
   nenhum. Nao e o humano do jogo -- e so o bastante para rig, peso e pose
   terem o que mover. */
function corpoDeExemplo(){
  const c = novoCorpo("exemplo");
  c.paleta = [[70, 50, 36], [210, 170, 130], [60, 110, 60], [90, 70, 50]];
  function capsula(a, b, r, cor){
    const x0 = Math.floor(Math.min(a[0], b[0]) - r), x1 = Math.ceil(Math.max(a[0], b[0]) + r);
    const y0 = Math.floor(Math.min(a[1], b[1]) - r), y1 = Math.ceil(Math.max(a[1], b[1]) + r);
    const z0 = Math.floor(Math.min(a[2], b[2]) - r), z1 = Math.ceil(Math.max(a[2], b[2]) + r);
    for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      if (distSegmento([x, y, z], a, b).d > r) continue;
      const i = celula(c, x, y, z);
      if (i >= 0) c.cor[i] = cor;
    }
  }
  capsula([40, 28, 94], [40, 28, 107], 9, 2);                            // cabeca
  capsula([40, 28, 45], [40, 28, 76], 13, 3);                            // tronco
  capsula([32, 28, 78], [-8, 28, 78], 4, 2); capsula([48, 28, 78], [88, 28, 78], 4, 2);   // bracos em T, nascendo dentro do tronco
  capsula([33, 28, 40], [31, 28, 5], 5, 4); capsula([47, 28, 40], [49, 28, 5], 5, 4);      // pernas
  capsula([31, 26, 3], [31, 17, 3], 3, 1); capsula([49, 26, 3], [49, 17, 3], 3, 1);        // pes, a sola em z 0
  c.versao++;
  return c;
}

if (typeof module !== "undefined") module.exports = {
  CAIXA, ALTURA_DO_CORPO, novoCorpo, celula, posicaoDaCelula, corEm, voxelsDoCorpo, limitesDoCorpo,
  abrirAcao, mudarCelula, fecharAcao, desfazer, refazer,
  lerWgvox, lerVox, lerPersonagemTexto, reduzirCores, corMaisPerto, luminancia, importarModelo,
  VIZ6, solidificar, limparRuido, espelhoX, celulasDoPincel, pincelDeVoxel, baldeDeCor, corNaPaleta, corpoDeExemplo
};
