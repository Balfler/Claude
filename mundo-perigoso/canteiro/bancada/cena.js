/* ============================================================
   BANCADA -- AS CENAS DE TESTE
   ------------------------------------------------------------
   Geometria de peca escrita direto em quads, so para medir: a fortaleza do
   "pronto quer dizer" (muralha com ameias e adarve, torres redondas, portao
   em arco, sobrados dentro) montada de tres jeitos:

     A  poligono -- caixa, prisma, cone e arco em quads, textura de 64 por
        tile em coordenada de mundo;
     B  voxel em 64 por tile fundido em faces (malha gulosa): a mesma forma
        rasterizada em voxels e as faces iguais juntadas;
     C  sprite de voxel, um quadro por peca, como o cenario de hoje.

   Convencao destes quads: a normal (p1-p0)x(p3-p0) aponta para quem ve a
   face. Puro, roda no node (contagem) e no navegador (tempo).
   ============================================================ */
"use strict";
(function(raiz){

function quad(lista, a, b, c, d, tex, uv){
  lista.push({p: [a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2], d[0],d[1],d[2]],
              uv: uv || [0, 0, 1, 1], tex: tex, emis: 0, f: 1});
}
/* uv de mundo: numa face vertical u corre ao longo dela e v e a altura */
function uvParede(a, b, z0, z1){
  const u0 = a[0] + a[1], u1 = u0 + Math.hypot(b[0]-a[0], b[1]-a[1]);
  return [u0, -z0, u1, -z1];
}
/* caixa com as faces para fora; `sem` pula faces ("baixo", "cima", "n", "s", "l", "o") */
function caixa(L, x0, y0, z0, x1, y1, z1, tex, sem){
  const s = new Set((sem || "").split(" "));
  if (!s.has("cima")) quad(L, [x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1], tex, [x0, y0, x1, y1]);
  if (!s.has("baixo")) quad(L, [x0,y1,z0], [x1,y1,z0], [x1,y0,z0], [x0,y0,z0], tex, [x0, y1, x1, y0]);
  const lado = function(a, b){ quad(L, [a[0],a[1],z0], [b[0],b[1],z0], [b[0],b[1],z1], [a[0],a[1],z1], tex, uvParede(a, b, z0, z1)); };
  if (!s.has("s")) lado([x0,y0], [x1,y0]);                        // face y0, olhando -y
  if (!s.has("l")) lado([x1,y0], [x1,y1]);
  if (!s.has("n")) lado([x1,y1], [x0,y1]);
  if (!s.has("o")) lado([x0,y1], [x0,y0]);
}
/* prisma de n lados em volta de (cx, cy) -- torre redonda */
function prisma(L, cx, cy, r, z0, z1, n, tex, tampa){
  const p = [];
  for (let i = 0; i <= n; i++){ const a = i/n*Math.PI*2; p.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]); }
  for (let i = 0; i < n; i++){
    const a = p[i], b = p[i+1], per = 2*Math.PI*r/n;
    quad(L, [a[0],a[1],z0], [b[0],b[1],z0], [b[0],b[1],z1], [a[0],a[1],z1], tex, [i*per, -z0, (i+1)*per, -z1]);
  }
  if (tampa) for (let i = 0; i < n; i++){
    const a = p[i], b = p[i+1];
    quad(L, [cx,cy,z1], [a[0],a[1],z1], [b[0],b[1],z1], [cx,cy,z1], tampa, [cx, cy, a[0], a[1]]);
  }
}
function cone(L, cx, cy, r, z0, h, n, tex){
  for (let i = 0; i < n; i++){
    const a0 = i/n*Math.PI*2, a1 = (i+1)/n*Math.PI*2;
    const a = [cx + Math.cos(a0)*r, cy + Math.sin(a0)*r, z0], b = [cx + Math.cos(a1)*r, cy + Math.sin(a1)*r, z0];
    quad(L, a, b, [cx, cy, z0 + h], [cx, cy, z0 + h], tex, [0, 0, 2, 2]);
  }
}
/* telhado de duas aguas sobre o retangulo, cumeeira ao longo de x */
function duasAguas(L, x0, y0, x1, y1, z, h, tex, texEmpena){
  const ym = (y0 + y1)/2;
  quad(L, [x0,y0,z], [x1,y0,z], [x1,ym,z+h], [x0,ym,z+h], tex, [x0, 0, x1, 2]);
  quad(L, [x1,y1,z], [x0,y1,z], [x0,ym,z+h], [x1,ym,z+h], tex, [x0, 0, x1, 2]);
  quad(L, [x0,y1,z], [x0,y0,z], [x0,ym,z+h], [x0,ym,z+h], texEmpena, [y0, -z, y1, -z-h]);
  quad(L, [x1,y0,z], [x1,y1,z], [x1,ym,z+h], [x1,ym,z+h], texEmpena, [y0, -z, y1, -z-h]);
}
/* fachada com vao em arco: uma parede de espessura e, ao longo de x, com
   vao de largura 2r e ombreira ate zi; o arco pleno fecha em cima. n
   segmentos no arco. */
function arco(L, x0, x1, y, e, z0, z1, cx, r, zi, n, tex){
  const pts = [];
  for (let i = 0; i <= n; i++){ const a = Math.PI - i/n*Math.PI; pts.push([cx + Math.cos(a)*r, zi + Math.sin(a)*r]); }
  for (const lado of [0, 1]){
    const yy = lado ? y + e : y;
    const Q = function(a, b, c, d){
      const P = function(q){ return [q[0], yy, q[1]]; };
      if (lado) quad(L, P(a), P(b), P(c), P(d), tex, [a[0], -a[1], c[0], -c[1]]);
      else quad(L, P(d), P(c), P(b), P(a), tex, [a[0], -a[1], c[0], -c[1]]);
    };
    Q([x0, z0], [cx - r, z0], [cx - r, z1], [x0, z1]);                 // pano da esquerda
    Q([cx + r, z0], [x1, z0], [x1, z1], [cx + r, z1]);                 // da direita
    for (let i = 0; i < n; i++){                                         // em cima do arco
      const a = pts[i], b = pts[i+1];
      Q([a[0], a[1]], [b[0], b[1]], [b[0], z1], [a[0], z1]);
    }
  }
  for (let i = 0; i < n; i++){                                           // intradorso
    const a = pts[i], b = pts[i+1];
    quad(L, [a[0], y, a[1]], [b[0], y, b[1]], [b[0], y + e, b[1]], [a[0], y + e, a[1]], tex, [0, 0, 1, e]);
  }
  quad(L, [cx - r, y, z0], [cx - r, y + e, z0], [cx - r, y + e, zi], [cx - r, y, zi], tex, [y, -z0, y + e, -zi]);
  quad(L, [cx + r, y + e, z0], [cx + r, y, z0], [cx + r, y, zi], [cx + r, y + e, zi], tex, [y, -z0, y + e, -zi]);
}

/* ---------- a fortaleza ----------
   Centro (cx, cy), lado S tiles, chao em z. Muralha de 1 tile de espessura
   e 4 de altura, adarve no alto, ameias de meio tile na borda de fora a cada
   meio tile, quatro torres redondas de raio 2,5 com cone, portao em arco ao
   sul entre duas torres quadradas, e sobrados de dois andares dentro, com
   janela, sacada e telhado de duas aguas. `T` sao as texturas. */
function fortaleza(cx, cy, S, z, T, opcoes){
  const o = opcoes || {}, L = [], nT = o.lados || 16, h = S/2, alto = 4, x0 = cx - h, y0 = cy - h, x1 = cx + h, y1 = cy + h;
  const pecas = [];                            // para os sprites: {x, y, z, larg, alto, tipo}
  /* muralha: cada lado em trechos de um tile */
  const trecho = function(ax, ay, bx, by, fora){
    const n = Math.round(Math.hypot(bx - ax, by - ay));
    for (let i = 0; i < n; i++){
      const t0 = i/n, t1 = (i+1)/n;
      const qx0 = ax + (bx - ax)*t0, qy0 = ay + (by - ay)*t0, qx1 = ax + (bx - ax)*t1, qy1 = ay + (by - ay)*t1;
      const gx0 = Math.min(qx0, qx1), gx1 = Math.max(qx0, qx1), gy0 = Math.min(qy0, qy1), gy1 = Math.max(qy0, qy1);
      const bx0 = ax === bx ? gx0 - 0.5 : gx0, bx1 = ax === bx ? gx1 + 0.5 : gx1;
      const by0 = ay === by ? gy0 - 0.5 : gy0, by1 = ay === by ? gy1 + 0.5 : gy1;
      caixa(L, bx0, by0, z, bx1, by1, z + alto, T.muro, "baixo");
      pecas.push({x: (bx0 + bx1)/2, y: (by0 + by1)/2, z: z, larg: 1, alto: alto, tipo: "muralha"});
      for (const m of [0, 0.5]){                                   // duas ameias por tile, na borda de fora
        let mx0, my0, mx1, my1;
        if (ay === by){ mx0 = gx0 + m; mx1 = mx0 + 0.25; my0 = fora < 0 ? by0 : by1 - 0.25; my1 = my0 + 0.25; }
        else { my0 = gy0 + m; my1 = my0 + 0.25; mx0 = fora < 0 ? bx0 : bx1 - 0.25; mx1 = mx0 + 0.25; }
        caixa(L, mx0, my0, z + alto, mx1, my1, z + alto + 0.5, T.muro, "baixo");
        pecas.push({x: (mx0 + mx1)/2, y: (my0 + my1)/2, z: z + alto, larg: 0.25, alto: 0.5, tipo: "ameia"});
      }
    }
  };
  const porta0 = cx - 2, porta1 = cx + 2;
  trecho(x0 + 2.5, y0, porta0 - 2, y0, -1); trecho(porta1 + 2, y0, x1 - 2.5, y0, -1);
  trecho(x0 + 2.5, y1, x1 - 2.5, y1, 1);
  trecho(x0, y0 + 2.5, x0, y1 - 2.5, -1); trecho(x1, y0 + 2.5, x1, y1 - 2.5, 1);
  /* torres redondas nos cantos */
  for (const c of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]){
    prisma(L, c[0], c[1], 2.5, z, z + alto + 2, nT, T.muro, T.laje);
    for (let i = 0; i < nT; i++){                                  // ameias em volta
      if (i % 2) continue;
      const a = (i + 0.5)/nT*Math.PI*2, mx = c[0] + Math.cos(a)*2.35, my = c[1] + Math.sin(a)*2.35;
      caixa(L, mx - 0.13, my - 0.13, z + alto + 2, mx + 0.13, my + 0.13, z + alto + 2.5, T.muro, "baixo");
    }
    cone(L, c[0], c[1], 1.6, z + alto + 2, 2.4, nT, T.telha);
    pecas.push({x: c[0], y: c[1], z: z, larg: 5, alto: alto + 4.4, tipo: "torre"});
  }
  /* portao: duas torres quadradas e o arco entre elas, com o adarve por cima */
  caixa(L, porta0 - 2, y0 - 1.5, z, porta0, y0 + 1.5, z + alto + 1.5, T.muro, "baixo");
  caixa(L, porta1, y0 - 1.5, z, porta1 + 2, y0 + 1.5, z + alto + 1.5, T.muro, "baixo");
  arco(L, porta0, porta1, y0 - 0.5, 1, z, z + alto, cx, 1.5, z + 1.8, o.segArco || 8, T.muro);
  pecas.push({x: cx, y: y0, z: z, larg: 8, alto: alto + 1.5, tipo: "portao"});
  /* sobrados dentro: 4x5 de chao, dois andares de 1,5, parede fina de 0,125,
     janela como vao com moldura, sacada no andar de cima, duas aguas */
  const casas = o.casas === undefined ? 12 : o.casas;
  for (let k = 0; k < casas; k++){
    const col = k % 4, lin = (k / 4) | 0;
    const hx = x0 + 5 + col*7.5, hy = y0 + 6 + lin*9.5;
    sobrado(L, hx, hy, z, T, pecas);
  }
  return {quads: L, pecas: pecas};
}
function sobrado(L, hx, hy, z, T, pecas){
  const W = 5, D = 4, e = 0.125, andar = 1.5;
  for (let a = 0; a < 2; a++){
    const zb = z + a*andar, zt = zb + andar;
    /* quatro paredes finas, cada uma com dois vaos de janela (no terreo, uma porta) */
    const parede = function(ax, ay, bx, by, vaos){
      const Lx = Math.hypot(bx - ax, by - ay), dx = (bx - ax)/Lx, dy = (by - ay)/Lx, nx = -dy*e, ny = dx*e;
      let t = 0;
      const pano = function(t0, t1, za, zb2){
        const p0 = [ax + dx*t0, ay + dy*t0], p1 = [ax + dx*t1, ay + dy*t1];
        const g = function(p, zz, f){ return [p[0] + nx*f, p[1] + ny*f, zz]; };
        quad(L, g(p0, za, 0), g(p1, za, 0), g(p1, zb2, 0), g(p0, zb2, 0), T.parede, uvParede(p0, p1, za, zb2));
        quad(L, g(p1, za, 1), g(p0, za, 1), g(p0, zb2, 1), g(p1, zb2, 1), T.parede, uvParede(p0, p1, za, zb2));
      };
      for (const v of vaos){
        pano(t, v[0], zb, zt);
        pano(v[0], v[1], zb, zb + v[2]);                           // peitoril
        pano(v[0], v[1], zb + v[3], zt);                           // verga
        /* moldura do vao: quatro faces de espessura */
        const q0 = [ax + dx*v[0], ay + dy*v[0]], q1 = [ax + dx*v[1], ay + dy*v[1]];
        quad(L, [q0[0], q0[1], zb + v[2]], [q1[0], q1[1], zb + v[2]], [q1[0] + nx, q1[1] + ny, zb + v[2]], [q0[0] + nx, q0[1] + ny, zb + v[2]], T.moldura);
        quad(L, [q0[0] + nx, q0[1] + ny, zb + v[3]], [q1[0] + nx, q1[1] + ny, zb + v[3]], [q1[0], q1[1], zb + v[3]], [q0[0], q0[1], zb + v[3]], T.moldura);
        quad(L, [q0[0], q0[1], zb + v[2]], [q0[0] + nx, q0[1] + ny, zb + v[2]], [q0[0] + nx, q0[1] + ny, zb + v[3]], [q0[0], q0[1], zb + v[3]], T.moldura);
        quad(L, [q1[0] + nx, q1[1] + ny, zb + v[2]], [q1[0], q1[1], zb + v[2]], [q1[0], q1[1], zb + v[3]], [q1[0] + nx, q1[1] + ny, zb + v[3]], T.moldura);
        t = v[1];
      }
      pano(t, Lx, zb, zt);
    };
    const jan = function(c){ return [c - 0.35, c + 0.35, 0.45, 1.1]; };
    const porta = a === 0 ? [[2.1, 2.9, 0, 1.2]] : [jan(2.5)];
    parede(hx, hy, hx + W, hy, [jan(1.2)].concat(porta, [jan(3.8)]));
    parede(hx + W, hy, hx + W, hy + D, [jan(2)]);
    parede(hx + W, hy + D, hx, hy + D, [jan(1.2), jan(3.8)]);
    parede(hx, hy + D, hx, hy, [jan(2)]);
    caixa(L, hx, hy, zb, hx + W, hy + D, zb + 0.02, T.piso, "baixo l n o s");      // piso
    caixa(L, hx, hy, zt - 0.12, hx + W, hy + D, zt, T.forro, "cima l n o s");      // forro
  }
  /* sacada no andar de cima, na frente: laje e guarda-corpo de balaustres */
  caixa(L, hx + 1.5, hy - 1, z + andar - 0.12, hx + 3.5, hy, z + andar, T.piso);
  for (let i = 0; i <= 8; i++) caixa(L, hx + 1.5 + i*0.25 - 0.03, hy - 1, z + andar, hx + 1.5 + i*0.25 + 0.03, hy - 0.94, z + andar + 0.5, T.moldura, "baixo");
  caixa(L, hx + 1.5, hy - 1, z + andar + 0.5, hx + 3.5, hy - 0.92, z + andar + 0.56, T.moldura);
  duasAguas(L, hx - 0.25, hy - 0.25, hx + W + 0.25, hy + D + 0.25, z + 2*andar, 1.4, T.telha, T.parede);
  caixa(L, hx + 3.6, hy + 2.6, z + 2*andar + 0.4, hx + 4.1, hy + 3.1, z + 2*andar + 2.1, T.muro, "baixo");   // chamine
  pecas.push({x: hx + W/2, y: hy + D/2, z: z, larg: W, alto: 3 + 1.4, tipo: "sobrado"});
}

/* ---------- B: voxel fundido em faces ----------
   Rasteriza uma funcao "dentro" numa grade de V voxels por tile e junta as
   faces expostas iguais (malha gulosa, por direcao e fatia). Devolve a
   contagem e, se pedido, os quads em coordenada de mundo. */
function malhaGulosa(dentro, x0, y0, z0, nx, ny, nz, V, quads, tex){
  const g = new Uint8Array(nx*ny*nz);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++)
    if (dentro(x0 + (x + 0.5)/V, y0 + (y + 0.5)/V, z0 + (z + 0.5)/V)) g[(z*ny + y)*nx + x] = 1;
  const cheio = function(x, y, z){ return x >= 0 && y >= 0 && z >= 0 && x < nx && y < ny && z < nz && g[(z*ny + y)*nx + x]; };
  let faces = 0;
  const dims = [nx, ny, nz];
  for (let eixo = 0; eixo < 3; eixo++) for (const s of [-1, 1]){
    const u = (eixo + 1) % 3, v = (eixo + 2) % 3, nu = dims[u], nv = dims[v];
    const mask = new Uint8Array(nu*nv);
    for (let d = 0; d < dims[eixo]; d++){
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++){
        const c = [0, 0, 0]; c[eixo] = d; c[u] = i; c[v] = j;
        const f = [c[0], c[1], c[2]]; f[eixo] += s;
        mask[j*nu + i] = cheio(c[0], c[1], c[2]) && !cheio(f[0], f[1], f[2]) ? 1 : 0;
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; ){
        if (!mask[j*nu + i]){ i++; continue; }
        let w = 1; while (i + w < nu && mask[j*nu + i + w]) w++;
        let h = 1;
        fora: while (j + h < nv){ for (let k = 0; k < w; k++) if (!mask[(j + h)*nu + i + k]) break fora; h++; }
        for (let jj = 0; jj < h; jj++) for (let k = 0; k < w; k++) mask[(j + jj)*nu + i + k] = 0;
        faces++;
        if (quads){
          const pl = (d + (s > 0 ? 1 : 0))/V, a = i/V, b = (i + w)/V, c2 = j/V, e2 = (j + h)/V;
          const P = function(pu, pv){ const r = [0, 0, 0]; r[eixo] = pl; r[u] = pu; r[v] = pv; return [x0 + r[0], y0 + r[1], z0 + r[2]]; };
          if (s > 0) quad(quads, P(a, c2), P(b, c2), P(b, e2), P(a, e2), tex, [a, c2, b, e2]);
          else quad(quads, P(a, e2), P(b, e2), P(b, c2), P(a, c2), tex, [a, c2, b, e2]);
        }
        i += w;
      }
    }
  }
  return faces;
}

const API = {quad, caixa, prisma, cone, duasAguas, arco, fortaleza, sobrado, malhaGulosa};
if (typeof module !== "undefined") module.exports = API; else raiz.CENA = API;
})(typeof window !== "undefined" ? window : globalThis);
