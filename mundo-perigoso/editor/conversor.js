/* ============================================================
   DO DESENHO AO VOXEL
   ------------------------------------------------------------
   Le a folha desenhada sobre o molde -- frente, lado e costas, um pixel por
   voxel -- e devolve a grade de voxels do personagem, com as cores.

   O contorno. Pixel art tem um contorno escuro em volta da silhueta. Virado
   voxel, esse contorno fica nas bordas do modelo, e girado 45 graus ele
   aparece como risco no meio do corpo. Entao ele sai aqui: o pixel escuro
   na borda da silhueta ganha a cor do vizinho de dentro, e o assador do
   jogo desenha um contorno novo em volta da silhueta de cada rumo.

   O volume. Um voxel entra se a frente (ou as costas) e o lado estao
   desenhados na altura dele: e o que as duas silhuetas permitem. So isso
   daria braco e perna de secao quadrada, entao cada trecho de uma linha da
   frente vira a fatia de um cilindro achatado -- braco e perna redondos,
   tronco mais chato -- sem nunca passar do que o lado desenhou. Nos pes a
   regra nao vale: o pe e comprido para a frente, e o lado manda.

   A cor. Cada voxel da superficie pega a cor da vista que mais encara ele:
   frente, costas ou lado. Um desenho de ate MAX_CORES cores fica com as
   cores exatas -- pixel art vive de tons proximos escolhidos a mao, e media
   apagaria isso. Com mais cores que isso, as parecidas se juntam.

   O arquivo. Texto ASCII, como toda arte que entra no jogo:

     PERSONAGEM 1
     nome humano
     grade 80 56 117
     cores 2
     c8a07a 5a3a22
     [voxels]
     0*1ab 1*3 2 ...

   A grade vai de z em z, y em y, x em x; cada token e o numero da cor
   (0 e vazio) em base 36, com *quantas vezes ele se repete, tambem em base
   36. O jogo le isto em src/p3e.js.
   ============================================================ */
const { arranjo } = require("./vistas");
const MAX_CORES = 48;

const luz = function(r, g, b){ return 0.299*r + 0.587*g + 0.114*b; };

/* tira o contorno pintado em volta da silhueta de cada vista */
function semContorno(img, A){
  const rgba = new Uint8Array(img.rgba), L = img.largura;
  for (const nome in A.vistas){
    const v = A.vistas[nome], x0 = v.ox, x1 = v.ox + v.largura - 1, y0 = A.linhaDoZ(A.altura - 1), y1 = A.altura - 1;
    const cheio = function(x, y){ return x >= x0 && x <= x1 && y >= 0 && y <= y1 && img.rgba[(y*L + x)*4 + 3] >= 128; };
    for (let y = Math.max(0, y0); y <= y1; y++) for (let x = x0; x <= x1; x++){
      if (!cheio(x, y)) continue;
      const borda = !cheio(x - 1, y) || !cheio(x + 1, y) || !cheio(x, y - 1) || !cheio(x, y + 1);
      if (!borda) continue;
      const i = (y*L + x)*4, l = luz(img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]);
      /* o vizinho de dentro mais claro: se o pixel e bem mais escuro que ele, era contorno */
      let melhor = -1, lm = -1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]){
        const nx = x + dx, ny = y + dy;
        if (!cheio(nx, ny)) continue;
        const bordaV = !cheio(nx - 1, ny) || !cheio(nx + 1, ny) || !cheio(nx, ny - 1) || !cheio(nx, ny + 1);
        if (bordaV) continue;
        const j = (ny*L + nx)*4, lj = luz(img.rgba[j], img.rgba[j + 1], img.rgba[j + 2]);
        if (lj > lm){ lm = lj; melhor = j; }
      }
      if (melhor >= 0 && l < lm*0.55){
        rgba[i] = img.rgba[melhor]; rgba[i + 1] = img.rgba[melhor + 1]; rgba[i + 2] = img.rgba[melhor + 2];
      }
    }
  }
  return {largura: img.largura, altura: img.altura, rgba: rgba};
}

function converter(img0, dim, opcoes){
  const DX = dim.DX, DY = dim.DY, DZ = dim.DZ, A = arranjo(dim), V = A.vistas, avisos = [];
  if (img0.largura !== A.largura || img0.altura !== A.altura)
    throw new Error("o desenho tem " + img0.largura + "x" + img0.altura + ", e o molde " + A.largura + "x" + A.altura +
                    ": desenhe sobre o molde, sem mudar o tamanho");
  const img = opcoes && opcoes.manterContorno ? img0 : semContorno(img0, A);
  const alturaDoPe = opcoes && opcoes.alturaDoPe !== undefined ? opcoes.alturaDoPe : 8;
  const pixel = function(vista, u, z){ return (A.linhaDoZ(z)*img.largura + V[vista].ox + u)*4; };
  const opaco = function(vista, u, z){
    if (u < 0 || z < 0 || u >= V[vista].largura || z >= DZ) return false;
    return img.rgba[pixel(vista, u, z) + 3] >= 128;
  };
  const corDe = function(vista, u, z){
    if (!opaco(vista, u, z)) return null;
    const i = pixel(vista, u, z);
    return (img.rgba[i] << 16) | (img.rgba[i + 1] << 8) | img.rgba[i + 2];
  };

  const topo = function(vista){
    for (let z = DZ - 1; z >= 0; z--) for (let u = 0; u < V[vista].largura; u++) if (opaco(vista, u, z)) return z;
    return -1;
  };
  const tf = topo("frente"), tl = topo("lado"), tc = topo("costas");
  if (tf < 0) throw new Error("a frente esta vazia: desenhe na primeira area do molde");
  if (tl < 0) throw new Error("o lado esta vazio: sem ele nao da para saber a profundidade");
  if (Math.abs(tf - tl) > 2 || (tc >= 0 && Math.abs(tf - tc) > 2))
    avisos.push("as vistas nao tem a mesma altura: frente " + (tf + 1) + ", lado " + (tl + 1) + ", costas " + (tc + 1));
  if (tc < 0) avisos.push("sem as costas: a parte de tras usa as cores da frente");

  /* as duas silhuetas: frente junto com as costas espelhadas, e o lado */
  const F = new Uint8Array(DX*DZ), S = new Uint8Array(DY*DZ);
  for (let z = 0; z < DZ; z++){
    for (let x = 0; x < DX; x++) F[z*DX + x] = opaco("frente", x, z) || opaco("costas", DX - 1 - x, z) ? 1 : 0;
    for (let y = 0; y < DY; y++) S[z*DY + y] = opaco("lado", y, z) ? 1 : 0;
  }

  /* o volume */
  const g = new Uint8Array(DX*DY*DZ);
  for (let z = 0; z < DZ; z++){
    let y0 = DY, y1 = -1;
    for (let y = 0; y < DY; y++) if (S[z*DY + y]){ if (y < y0) y0 = y; y1 = y; }
    if (y1 < 0) continue;
    const yc = (y0 + y1)/2, meiaDoLado = (y1 - y0 + 1)/2;
    let x = 0;
    while (x < DX){
      if (!F[z*DX + x]){ x++; continue; }
      const a = x;
      while (x < DX && F[z*DX + x]) x++;
      const b = x - 1, w = b - a + 1, c = (a + b)/2;
      for (let xx = a; xx <= b; xx++){
        let meia = meiaDoLado;
        if (z > alturaDoPe){
          const u = (xx - c)/(w/2 + 0.5), k = w <= 14 ? 0.5 : 0.36;
          meia = Math.min(meiaDoLado, Math.max(1, w*k*Math.sqrt(Math.max(0, 1 - u*u))));
        }
        for (let y = Math.ceil(yc - meia); y <= Math.floor(yc + meia); y++)
          if (y >= 0 && y < DY && S[z*DY + y]) g[(z*DY + y)*DX + xx] = 1;
      }
    }
  }

  /* a cor de cada voxel, pela vista que mais encara a superficie dele */
  const vazio = function(x, y, z){ return x < 0 || y < 0 || z < 0 || x >= DX || y >= DY || z >= DZ || !g[(z*DY + y)*DX + x]; };
  const rgb = new Int32Array(DX*DY*DZ).fill(-1);
  for (let z = 0; z < DZ; z++) for (let y = 0; y < DY; y++) for (let x = 0; x < DX; x++){
    const i = (z*DY + y)*DX + x;
    if (!g[i]) continue;
    let nx = 0, ny = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if ((dx || dy || dz) && vazio(x + dx, y + dy, z + dz)){ nx += dx; ny += dy; }
    }
    const frente = function(){ return corDe("frente", x, z); };
    const costas = function(){ return corDe("costas", DX - 1 - x, z); };
    const lado = function(){ return corDe("lado", y, z); };
    const ordem = Math.abs(nx) > Math.abs(ny) ? [lado, ny > 0 ? costas : frente, frente, costas]
                : ny > 0 ? [costas, lado, frente] : [frente, lado, costas];
    let c = null;
    for (const f of ordem){ c = f(); if (c !== null) break; }
    rgb[i] = c === null ? 0x808080 : c;
  }

  /* as cores: exatas se couberem; senao, agrupadas por 3 bits de cada canal,
     as mais usadas viram centros, e o resto cai no centro mais parecido */
  const contagem = new Map();
  for (let i = 0; i < rgb.length; i++) if (rgb[i] >= 0) contagem.set(rgb[i], (contagem.get(rgb[i]) || 0) + 1);
  let centros;
  if (contagem.size <= MAX_CORES){
    centros = Array.from(contagem.entries()).sort(function(a, b){ return b[1] - a[1]; })
      .map(function(e){ return [(e[0] >> 16) & 255, (e[0] >> 8) & 255, e[0] & 255]; });
  } else {
    const grupos = new Map();
    for (const [c, n] of contagem){
      const k = ((c >> 21) & 7) << 6 | ((c >> 13) & 7) << 3 | ((c >> 5) & 7);
      let gr = grupos.get(k);
      if (!gr){ gr = [0, 0, 0, 0]; grupos.set(k, gr); }
      gr[0] += n; gr[1] += ((c >> 16) & 255)*n; gr[2] += ((c >> 8) & 255)*n; gr[3] += (c & 255)*n;
    }
    centros = Array.from(grupos.values()).sort(function(a, b){ return b[0] - a[0]; }).slice(0, MAX_CORES)
      .map(function(gr){ return [Math.round(gr[1]/gr[0]), Math.round(gr[2]/gr[0]), Math.round(gr[3]/gr[0])]; });
  }
  const indice = new Map();
  for (let i = 0; i < rgb.length; i++){
    if (rgb[i] < 0) continue;
    const c = rgb[i];
    let k = indice.get(c);
    if (k === undefined){
      const r = (c >> 16) & 255, gg = (c >> 8) & 255, b = c & 255;
      let dist = 1e9;
      centros.forEach(function(p, j){
        const d = (r - p[0])*(r - p[0]) + (gg - p[1])*(gg - p[1]) + (b - p[2])*(b - p[2]);
        if (d < dist){ dist = d; k = j; }
      });
      indice.set(c, k);
    }
    g[i] = k + 1;
  }
  return {dim: {DX: DX, DY: DY, DZ: DZ}, cores: centros, g: g, avisos: avisos};
}

function escrever(conv, nome){
  const linhas = ["PERSONAGEM 1", "nome " + nome, "grade " + conv.dim.DX + " " + conv.dim.DY + " " + conv.dim.DZ,
                  "cores " + conv.cores.length,
                  conv.cores.map(function(c){ return c.map(function(v){ return v.toString(16).padStart(2, "0"); }).join(""); }).join(" "),
                  "[voxels]"];
  const tokens = [], g = conv.g;
  let v = g[0], n = 0;
  const empurra = function(){ tokens.push(n > 1 ? v.toString(36) + "*" + n.toString(36) : v.toString(36)); };
  for (let i = 0; i < g.length; i++){
    if (g[i] === v) n++;
    else { empurra(); v = g[i]; n = 1; }
  }
  empurra();
  for (let i = 0; i < tokens.length; i += 40) linhas.push(tokens.slice(i, i + 40).join(" "));
  return linhas.join("\n") + "\n";
}

module.exports = {converter, escrever, semContorno, MAX_CORES};
