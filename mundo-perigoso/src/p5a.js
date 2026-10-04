
/* ============================================================
   RENDERIZADOR
   ------------------------------------------------------------
   Rasterizador de poligonos por software com z-buffer, escrevendo
   no mesmo buffer indexado de 320x200 e usando as mesmas texturas
   64x64 e os mesmos colormaps de 16 niveis. A estetica continua
   sendo a de 1993 -- ela mora nos pixels, nao na geometria. O que
   muda e que a camera agora tem inclinacao de verdade, entao da
   pra olhar 85 graus pra cima e pra baixo, pular e ter plataforma.
   ============================================================ */
/* A camera depende do campo de visao e da resolucao, que o painel de ajuste
   muda com o jogo rodando -- por isso sao `let` e saem de prepararCamera(). */
let HW = 0, HVH = 0, FX = 0, FY = 0, TANH = 0;
let zbuf = null;                        // guarda 1/z: maior = mais perto
const NEAR = 0.055;
/* O FY da camera de referencia, 90 graus em 320x200. O ceu nao tem
   perspectiva e foi pintado para ela: e esta razao que diz quantas linhas da
   faixa cabem em cada linha da tela com outro campo de visao ou resolucao. */
const FY_REF = (W/2) / Math.tan(Math.PI/4) / 1.2;
function prepararCamera(){
  HW = RW/2; HVH = RVH/2;
  TANH = Math.tan(AJUSTE.fov*Math.PI/360);
  FX = HW / TANH;
  FY = FX;                              // pixel quadrado: a tela e 16:9 de verdade
  if (!zbuf || zbuf.length !== RW*RVH) zbuf = new Float32Array(RW*RVH);
  HZ_W = RW >> 3;
  const nb = HZ_W*(RVH >> 3);
  if (!HZ_Z || HZ_Z.length !== nb){ HZ_Z = new Float32Array(nb); HZ_SUJO = new Uint8Array(nb); }
}
/* A oclusao por blocos de 8x8 pixels. De vez em quando -- depois das faces
   perto, que quase nunca estao escondidas -- tira-se uma foto do z-buffer:
   cada bloco guarda o 1/z mais baixo entre os pixels dele, a profundidade
   mais longe, e zero se sobrou pixel vazio. Uma face cujo retangulo na tela
   so cai em blocos cheios e mais perto que ela nao chega ao rasterizador.
   Dentro de casa quase tudo la fora morre aqui.

   A primeira versao contava cada pixel pintado; custava uns 2 ms por quadro
   no rasterizador e deixava a cripta mais lenta que antes. A foto custa uma
   leitura do z-buffer por vez. */
/* So se refaz o bloco em que o rasterizador pintou desde a foto anterior
   (HZ_SUJO, marcado por linha de varredura, nao por pixel): em 1280x720 o
   chao perto ja estava na primeira foto e nao muda nas outras duas. */
let HZ_Z = null, HZ_W = 0, HZ_ATIVO = false, HZ_SUJO = null;
function hzFoto(){
  const W = RW, nbx = HZ_W, nby = RVH >> 3;
  for (let by=0; by<nby; by++) for (let bx=0; bx<nbx; bx++){
    if (!HZ_SUJO[by*nbx + bx]) continue;
    HZ_SUJO[by*nbx + bx] = 0;
    let m = 1e9;
    for (let y=by*8, fim=y+8; y<fim && m > 0; y++){
      const o = y*W + bx*8;
      for (let x=0; x<8; x++){ const z = zbuf[o + x]; if (z < m) m = z; }
    }
    HZ_Z[by*nbx + bx] = m;
  }
  HZ_ATIVO = true;
}
prepararCamera();

/* camera */
let camX=0, camY=0, camZ=0, cyaw=1, syaw=0, cpit=1, spit=0;
/* Terceira pessoa: a camera fica atras e um pouco acima da cabeca, olhando
   para onde o jogador olha. Ela recua em passos curtos e para no primeiro
   que entraria em parede, piso ou teto, com uma folga -- senao se veria o
   mundo por dentro da parede. */
const ATRAS = 1.6, ACIMA = 0.28;
function setCamera(shake){
  cyaw = Math.cos(P.ang); syaw = Math.sin(P.ang);
  cpit = Math.cos(P.pitch); spit = Math.sin(P.pitch);
  const olho = P.z + P.eye + P.bob + (shake||0)*0.01;
  if (!G.terceira){ camX = P.x; camY = P.y; camZ = olho; return; }
  const cz = olho + ACIMA;
  let d = 0;
  for (let s = 0.1; s <= ATRAS + 1e-6; s += 0.1){
    const tx = Math.floor(P.x - cyaw*s), ty = Math.floor(P.y - syaw*s);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) break;
    if (cz < floorAt(tx, ty) + 0.15 || cz > ceilAt(tx, ty) - 0.12) break;
    if (pontoNoSolido(SOLIDOS, P.x - cyaw*s, P.y - syaw*s, cz)) break;
    d = s;
  }
  d = Math.max(0, d - 0.2);
  camX = P.x - cyaw*d; camY = P.y - syaw*d; camZ = cz;
}

/* luz por profundidade, na mesma escala de bandas de antes. E do mundo:
   refeita a cada troca, porque o alcance e o escuro mudam. */
const LSTEP = 4;
let LMAX = 0, LIGHTLUT = null;
function prepararLuz(){
  LMAX = (FAR*LSTEP)|0;
  LIGHTLUT = new Uint8Array(LMAX+2);
  for (let i=0;i<=LMAX+1;i++){
    const z = i/LSTEP;
    /* Na cripta a luz some em 14 tiles, que e o escuro dela. Ao ar livre a
       bruma e quadratica: limpa no primeiro terco do alcance e fechada no fim
       dele, onde o desenho corta -- assim o corte some na cor do horizonte. */
    const k = z/FAR;
    const nivel = ILHA_MOTOR ? k*k*14 + k*1.05 : z*1.02 + 0.9;
    LIGHTLUT[i] = Math.max(0, Math.min(15, nivel|0));
  }
}
prepararLuz();
const lightAt = (z)=> LIGHTLUT[z >= FAR ? LMAX : (z*LSTEP)|0];

/* ---------- vertices em espaco de camera ---------- */
function VX(){ return {rx:0, uy:0, fz:0, u:0, v:0, sx:0, sy:0, iz:0, uz:0, vz:0}; }
const VA = [], VB = [];
/* pixels que o rasterizador visitou neste quadro, pintados ou recusados pelo
   z-buffer: com as faces, e o que diz quanto o quadro custa (a validacao do
   canteiro mede o pior lugar com eles). Uma soma por linha de varredura. */
let PIX_VISTOS = 0;
for (let i=0;i<10;i++){ VA.push(VX()); VB.push(VX()); }

function toCam(px,py,pz, u,v, out){
  const dx = px-camX, dy = py-camY, dz = pz-camZ;
  const h = dx*cyaw + dy*syaw;
  out.rx = -dx*syaw + dy*cyaw;
  out.fz =  h*cpit + dz*spit;
  out.uy = -h*spit + dz*cpit;
  out.u = u; out.v = v;
  return out;
}
function project(v){
  const iz = 1/v.fz;
  v.iz = iz;
  v.sx = HW + v.rx*FX*iz;
  v.sy = HVH - v.uy*FY*iz;
  v.uz = v.u*iz; v.vz = v.v*iz;
}
function lerpV(a,b,t,out){
  out.rx = a.rx + (b.rx-a.rx)*t;
  out.uy = a.uy + (b.uy-a.uy)*t;
  out.fz = a.fz + (b.fz-a.fz)*t;
  out.u  = a.u  + (b.u -a.u )*t;
  out.v  = a.v  + (b.v -a.v )*t;
  return out;
}
/* recorte contra o plano proximo; devolve quantos vertices sobraram em VB */
function clipNear(n){
  let m = 0;
  for (let i=0;i<n;i++){
    const a = VA[i], b = VA[(i+1)%n];
    const ain = a.fz >= NEAR, bin = b.fz >= NEAR;
    if (ain){ const o=VB[m++]; o.rx=a.rx; o.uy=a.uy; o.fz=a.fz; o.u=a.u; o.v=a.v; }
    if (ain !== bin) lerpV(a,b,(NEAR-a.fz)/(b.fz-a.fz), VB[m++]);
  }
  return m;
}

/* ---------- triangulo texturizado ---------- */
function rasterTri(a,b,c, tex, emis, spr){
  let t;
  if (a.sy > b.sy){ t=a; a=b; b=t; }
  if (b.sy > c.sy){ t=b; b=c; c=t; }
  if (a.sy > b.sy){ t=a; a=b; b=t; }
  const yTop = Math.max(0, Math.ceil(a.sy - 0.5));
  const yBot = Math.min(RVH, Math.ceil(c.sy - 0.5));
  if (yBot <= yTop) return;

  const tw = tex.w, th = tex.h, mw = tw-1, mh = th-1;
  const tpx = tex.px, tcm = tex.cm;
  /* os globais em nomes locais: lidos a cada pixel, eles custavam uma busca
     no escopo de fora por pixel (em 1280x720, a maior parte do quadro) */
  const B = buf, Z = zbuf, LUT = LIGHTLUT, far = FAR, lmax = LMAX, W = RW;
  /* O mip (cores.js, comMips): quantos texels um pixel cobre, nos dois
     sentidos da tela, decide a copia de cada trecho de 16 pixels. Ao longo da
     linha, o passo do proprio trecho; de uma linha para a outra, pelo plano do
     triangulo -- e o que pega o chao visto de raspao, que encolhe na vertical. */
  const mips = !spr && tex.mips ? tex.mips : null;
  let gyZ = 0, gyU = 0, gyV = 0;
  if (mips){
    const dxb = b.sx - a.sx, dyb = b.sy - a.sy, dxc = c.sx - a.sx, dyc = c.sy - a.sy, det = dxb*dyc - dxc*dyb;
    if (Math.abs(det) > 1e-9){
      gyZ = ((c.iz - a.iz)*dxb - (b.iz - a.iz)*dxc)/det;
      gyU = ((c.uz - a.uz)*dxb - (b.uz - a.uz)*dxc)/det;
      gyV = ((c.vz - a.vz)*dxb - (b.vz - a.vz)*dxc)/det;
    }
  }
  const hAC = c.sy - a.sy; if (hAC < 1e-9) return;
  const iAC = 1/hAC;
  const xsAC = (c.sx-a.sx)*iAC, zsAC = (c.iz-a.iz)*iAC,
        usAC = (c.uz-a.uz)*iAC, vsAC = (c.vz-a.vz)*iAC;
  const hAB = b.sy - a.sy, hBC = c.sy - b.sy;
  const iAB = hAB > 1e-9 ? 1/hAB : 0, iBC = hBC > 1e-9 ? 1/hBC : 0;
  const xsAB = (b.sx-a.sx)*iAB, zsAB = (b.iz-a.iz)*iAB,
        usAB = (b.uz-a.uz)*iAB, vsAB = (b.vz-a.vz)*iAB;
  const xsBC = (c.sx-b.sx)*iBC, zsBC = (c.iz-b.iz)*iBC,
        usBC = (c.uz-b.uz)*iBC, vsBC = (c.vz-b.vz)*iBC;

  for (let y=yTop; y<yBot; y++){
    const yc = y + 0.5;
    const tA = yc - a.sy;
    let xL = a.sx + xsAC*tA, zL = a.iz + zsAC*tA,
        uL = a.uz + usAC*tA, vL = a.vz + vsAC*tA;
    let xR, zR, uR, vR;
    if (yc < b.sy){
      if (hAB <= 1e-9) continue;
      xR = a.sx + xsAB*tA; zR = a.iz + zsAB*tA;
      uR = a.uz + usAB*tA; vR = a.vz + vsAB*tA;
    } else {
      if (hBC <= 1e-9) continue;
      const tB = yc - b.sy;
      xR = b.sx + xsBC*tB; zR = b.iz + zsBC*tB;
      uR = b.uz + usBC*tB; vR = b.vz + vsBC*tB;
    }
    if (xL > xR){
      let s;
      s=xL; xL=xR; xR=s;  s=zL; zL=zR; zR=s;
      s=uL; uL=uR; uR=s;  s=vL; vL=vR; vR=s;
    }
    const wSpan = xR - xL; if (wSpan < 1e-9) continue;
    const inv = 1/wSpan;
    const zs = (zR-zL)*inv, us = (uR-uL)*inv, vs = (vR-vL)*inv;
    let px = Math.max(0, Math.ceil(xL - 0.5));
    const pxe = Math.min(W, Math.ceil(xR - 0.5));
    if (pxe <= px) continue;
    const off = px + 0.5 - xL;
    let iz = zL + zs*off, uz = uL + us*off, vz = vL + vs*off;
    const row = y*W;
    PIX_VISTOS += pxe - px;
    for (let k = (y >> 3)*HZ_W + (px >> 3), kf = (y >> 3)*HZ_W + ((pxe - 1) >> 3); k <= kf; k++) HZ_SUJO[k] = 1;
    /* A divisao da perspectiva (1/iz) e feita so nas pontas de cada trecho de
       16 pixels; no meio, u, v e a distancia andam em linha reta -- o truque
       do Quake. Em 16 pixels o erro fica abaixo de um texel. */
    while (px < pxe){
      const n = pxe - px < 16 ? pxe - px : 16;
      const z0 = 1/iz, izF = iz + zs*n, z1 = 1/izF, uzF = uz + us*n, vzF = vz + vs*n;
      let u = uz*z0*tw, v = vz*z0*th, z = z0;
      let du = (uzF*z1*tw - u)/n, dv = (vzF*z1*th - v)/n;
      const dz = (z1 - z0)/n;
      let qpx = tpx, qw = tw, qmw = mw, qmh = mh;
      if (mips){
        /* a media geometrica dos dois sentidos: pelo maior, o telhado e o chao
           vistos de raspao borravam; pelo menor, voltavam as listras */
        const mx = Math.max(Math.abs(du), Math.abs(dv)), my = Math.max(Math.abs((tw*gyU - u*gyZ)*z0), Math.abs((th*gyV - v*gyZ)*z0));
        let m = Math.sqrt(mx*my), k = 0;
        while (m >= 2 && k < mips.length){ m *= 0.5; k++; }
        if (k){
          const L = mips[k - 1], s = 1/(1 << k);
          qpx = L.px; qw = L.w; qmw = L.w - 1; qmh = L.h - 1;
          u *= s; v *= s; du *= s; dv *= s;
        }
      }
      /* o caso comum: textura que se repete, sem brilho proprio, e a mesma
         faixa de luz nas duas pontas do trecho (a luz so piora com a
         distancia, entao vale para o trecho todo) -- um laco sem a luz */
      if (!spr && !emis){
        const l0 = LUT[z0 >= far ? lmax : (z0*LSTEP)|0];
        if (l0 === LUT[z1 >= far ? lmax : (z1*LSTEP)|0]){
          const base = l0 << 8;
          for (const fim = px + n; px < fim; px++){
            const i = row + px;
            if (iz > Z[i]){
              const col = tcm[base | qpx[((v|0) & qmh)*qw + ((u|0) & qmw)]];
              if (col){ B[i] = col; Z[i] = iz; }
            }
            iz += zs; u += du; v += dv;
          }
          uz = uzF; vz = vzF;
          continue;
        }
      }
      for (const fim = px + n; px < fim; px++){
        const i = row + px;
        if (iz > Z[i]){
          let ui, vi;
          if (spr){
            ui = u < 0 ? 0 : (u >= tw ? mw : u|0);
            vi = v < 0 ? 0 : (v >= th ? mh : v|0);
          } else {
            ui = (u|0) & qmw;
            vi = (v|0) & qmh;
          }
          const nivel = emis ? (z > 7 ? emis : 0) : LUT[z >= far ? lmax : (z*LSTEP)|0];       // lightAt, aberto
          const col = tcm[(nivel<<8) | qpx[vi*qw + ui]];
          if (col){ B[i] = col; Z[i] = iz; }
        }
        iz += zs; u += du; v += dv; z += dz;
      }
      uz = uzF; vz = vzF;
    }
  }
}

/* poligono convexo -> recorta -> leque de triangulos */
function drawPoly(n, tex, emis, spr){
  const m = clipNear(n);
  if (m < 3) return;
  for (let i=0;i<m;i++) project(VB[i]);
  if (HZ_ATIVO && !spr){
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, izm = 0;
    for (let i=0;i<m;i++){
      const v = VB[i];
      if (v.sx < x0) x0 = v.sx; if (v.sx > x1) x1 = v.sx;
      if (v.sy < y0) y0 = v.sy; if (v.sy > y1) y1 = v.sy;
      if (v.iz > izm) izm = v.iz;
    }
    const bx0 = Math.max(0, x0|0) >> 3, bx1 = Math.min(RW-1, x1|0) >> 3;
    const by0 = Math.max(0, y0|0) >> 3, by1 = Math.min(RVH-1, y1|0) >> 3;
    if (bx1 < bx0 || by1 < by0) return;                  // fora da tela
    let oculto = true;
    for (let by=by0; by<=by1 && oculto; by++)
      for (let bx=bx0; bx<=bx1; bx++){
        const k = by*HZ_W + bx;
        if (HZ_Z[k] <= izm){ oculto = false; break; }
      }
    if (oculto) return;
  }
  for (let i=1;i<m-1;i++) rasterTri(VB[0], VB[i], VB[i+1], tex, emis, spr);
}
/* uma face do mundo, com a coordenada de textura de cada canto */
function desenharFace(f){
  const p = f.p, uv = f.uv, n = f.n;
  const tex = f.anim ? f.tex[frameIdx(G.tick*f.anim, f.tex.length)] : f.tex;
  for (let i=0;i<n;i++) toCam(p[3*i], p[3*i+1], p[3*i+2], uv[2*i], uv[2*i+1], VA[i]);
  drawPoly(n, tex, f.emis, 0);
}
function drawQuad(p, u0,v0,u1,v1, tex, emis, spr){
  toCam(p[0],p[1],p[2],   u0,v0, VA[0]);
  toCam(p[3],p[4],p[5],   u1,v0, VA[1]);
  toCam(p[6],p[7],p[8],   u1,v1, VA[2]);
  toCam(p[9],p[10],p[11], u0,v1, VA[3]);
  drawPoly(4, tex, emis, spr);
}

/* ---------- a miniatura ----------
   O catalogo do canteiro mostra cada peca desenhada pelo proprio motor: as
   mesmas texturas, o mesmo rasterizador, sem nevoa. Ela sai num buffer
   proprio, com uma camera propria de tres quartos, olhando a frente da peca
   (o lado -y) de cima -- e tudo volta como estava: o mundo aberto nao
   percebe. Devolve os pixels (ABGR, 0 onde nao ha peca). */
function assarMiniatura(faces, lado, yaw, pitch){
  const salvo = [RW, RH, RVH, buf, zbuf, HW, HVH, FX, FY, TANH, camX, camY, camZ, cyaw, syaw, cpit, spit, HZ_ATIVO, LIGHTLUT, LMAX];
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (const f of faces) for (let i = 0; i < f.n; i++){
    const x = f.p[3*i], y = f.p[3*i+1], z = f.p[3*i+2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  const cx = (x0 + x1)/2, cy = (y0 + y1)/2, cz = (z0 + z1)/2;
  const raio = Math.max(0.3, Math.hypot(x1 - x0, y1 - y0, z1 - z0)/2), meioCampo = 22*Math.PI/180;
  const dist = raio/Math.sin(meioCampo)*1.02;
  const ya = yaw === undefined ? 65*Math.PI/180 : yaw, pi = pitch === undefined ? -28*Math.PI/180 : pitch;
  try {
    RW = RH = RVH = lado; buf = new Uint32Array(lado*lado); zbuf = new Float32Array(lado*lado);
    HW = lado/2; HVH = lado/2; TANH = Math.tan(meioCampo); FX = FY = HW/TANH;
    cyaw = Math.cos(ya); syaw = Math.sin(ya); cpit = Math.cos(pi); spit = Math.sin(pi);
    camX = cx - cyaw*cpit*dist; camY = cy - syaw*cpit*dist; camZ = cz - spit*dist;
    HZ_ATIVO = false; LIGHTLUT = new Uint8Array(LMAX + 2);            // tudo aceso, sem nevoa
    for (const f of faces){
      if (f.nx*camX + f.ny*camY + f.nz*camZ - f.d <= 1e-7) continue;   // de costas
      desenharFace(f);
    }
    return buf;
  } finally {
    [RW, RH, RVH, buf, zbuf, HW, HVH, FX, FY, TANH, camX, camY, camZ, cyaw, syaw, cpit, spit, HZ_ATIVO, LIGHTLUT, LMAX] = salvo;
  }
}
/* A miniatura de um tipo de peca num estilo, na origem. */
function miniaturaDaPeca(tipo, estilo, lado, inst){
  const p = Object.assign({tipo: tipo, estilo: estilo, x: 0, y: 0, z: 0, giro: 0, espelho: 0}, inst);
  const g = geometriaDaPeca(p, estilo);
  if (!g || !g.faces.length) return null;
  /* o forro so tem face para baixo: a miniatura dele olha de baixo */
  const def = TIPOS_DE_PECA[tipo], deBaixo = def && def.miniatura && def.miniatura.deBaixo;
  return assarMiniatura(facesDoMotor(g, estilo, 0), lado || 64, undefined, deBaixo ? 28*Math.PI/180 : undefined);
}

/* Ceu: a faixa rola com a guinada e sobe/desce com a inclinacao. Sem
   perspectiva -- e o truque do Doom, custa duas somas por pixel e ninguem
   percebe. Desenhado DEPOIS do mundo, so onde nenhuma face pintou: dentro de
   casa ele quase nao custa nada. Antes das entidades, que tem buraco. */
/* ---------- a silhueta do relevo alem da nevoa ----------
   DESIGN.md, o motor: o mundo so se desenha ate FAR tiles, e depois disso a
   serra sumia -- o ceu ia direto ate o horizonte. Para cada direcao, o
   relevo que mais sobe (a tangente da elevacao) depois de FAR vira uma
   silhueta pintada, numa cor puxada para a bruma. So entra o que passa da
   linha dos olhos, e o perfil e suavizado entre direcoes vizinhas para nao
   parecer fileira de predios. Refaz so quando a camera anda meio tile.
   Desligada por padrao: ?silhueta=sim. */
const SILUETA = {ligada: typeof BUSCA_INICIAL === "string" && /[?&]silhueta=sim/.test(BUSCA_INICIAL),
                 n: 360, tan: new Float32Array(360), x: -1e9, y: -1e9, z: -1e9, alcance: 260, topo: null, cores: null};
function calcularSilueta(){
  const S = SILUETA, n = S.n, bruto = new Float32Array(n);
  const passo = 3, d0 = FAR + 1, W = MW, H = MH;
  for (let k = 0; k < n; k++){
    const a = k*TAU/n, ca = Math.cos(a), sa = Math.sin(a);
    let m = -1;
    for (let d = d0; d <= S.alcance; d += passo){
      const tx = Math.floor(camX + ca*d), ty = Math.floor(camY + sa*d);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
      const tg = (FLOORZ[ty*W + tx] - camZ)/d;
      if (tg > m) m = tg;
    }
    bruto[k] = m;
  }
  /* suaviza: media de 5 vizinhas, tres vezes */
  let a1 = bruto;
  for (let r = 0; r < 3; r++){
    const b = new Float32Array(n);
    for (let k = 0; k < n; k++){
      let s = 0;
      for (let j = -2; j <= 2; j++) s += a1[(k + j + n) % n];
      b[k] = s/5;
    }
    a1 = b;
  }
  S.tan.set(a1);
  S.x = camX; S.y = camY; S.z = camZ;
}
/* A linha de cima da silhueta em cada coluna da tela, em pixels; RVH se nao
   ha nada. A direcao da coluna vem do campo de visao (sem contar a
   inclinacao da cabeca, que aqui e ruido); a altura, da tangente. */
/* a cor: a rocha longe, puxada para a bruma do horizonte (ABGR) */
function corDaSilueta(){
  const b = HORIZONTE, hr = b & 255, hg = (b >> 8) & 255, hb = (b >> 16) & 255, k = 0.62;
  const r = Math.round(104*(1 - k) + hr*k), g = Math.round(100*(1 - k) + hg*k), bl = Math.round(112*(1 - k) + hb*k);
  return (0xFF000000 | (bl << 16) | (g << 8) | r) >>> 0;
}
function topoDaSilueta(){
  const S = SILUETA;
  if (!S.topo || S.topo.length !== RW) S.topo = new Int16Array(RW);
  if (Math.abs(camX - S.x) > 0.5 || Math.abs(camY - S.y) > 0.5 || Math.abs(camZ - S.z) > 0.25) calcularSilueta();
  const n = S.n, topo = S.topo;
  for (let x = 0; x < RW; x++){
    const delta = Math.atan((x - HW)/FX), a = (P.ang + delta)*n/TAU;
    let k0 = Math.floor(a), f = a - k0;
    k0 = ((k0 % n) + n) % n;
    const tg = S.tan[k0]*(1 - f) + S.tan[(k0 + 1) % n]*f;
    if (!(tg > 0)){ topo[x] = RVH; continue; }               // so o que passa da linha dos olhos
    const cd = Math.cos(delta), den = cd*cpit + tg*spit;
    if (!(den > 0.001)){ topo[x] = RVH; continue; }
    const sy = HVH - FY*(tg*cpit - cd*spit)/den;
    topo[x] = sy < 0 ? 0 : sy > RVH ? RVH : (sy | 0);
  }
  return topo;
}
let CEU_U = new Int32Array(0);
/* o ceu antes das faces (sem silhueta) ou depois (com ela): ver drawSky */
function ceuAntesDoMundo(){ return !(SILUETA.ligada && ILHA_MOTOR); }
function drawSky(){
  /* uBase positivo de proposito: com valor negativo o `|0` trunca em direcao
     ao zero e duas colunas vizinhas caem no mesmo texel, engrossando a
     costura em vez de so cruza-la. */
  /* A tela mostra fov/360 da volta, e o meio da tela fica sempre no mesmo
     ponto da faixa: abrir o campo de visao nao faz o sol andar. */
  const volta = AJUSTE.fov/360;
  const uBase = ((P.ang/TAU + 0.125 - volta/2)*SKY_VOLTA % SKY_W) + SKY_W;
  const du = SKY_VOLTA*volta/RW;
  /* dv e quantas linhas da faixa cabem numa linha da tela. A faixa foi
     pintada para a camera de referencia; com outro campo de visao ou outra
     resolucao ela estica junto com o mundo.

     O sinal do pitch e negativo, e ja foi positivo: olhando pra cima o mundo
     desce na tela, entao o horizonte do ceu tem que descer junto. Com o sinal
     trocado ele subia, e levantar a cabeca mostrava a serra e a lua em vez
     das estrelas -- o ceu nadava ao contrario do mundo. */
  const dv = FY_REF/FY;
  const vBase = SKY_HOR - (HVH + P.pitch*FY)*dv;
  const sil = SILUETA.ligada && ILHA_MOTOR ? topoDaSilueta() : null;
  const corSil = sil ? corDaSilueta() : 0;
  /* Sem a silhueta, o ceu vai ANTES das faces, na tela inteira, e o mundo
     pinta por cima: o resultado e o mesmo de pintar so onde o mundo nao
     pintou, sem olhar o z-buffer pixel a pixel. A coluna da faixa de cada x
     e a mesma em todas as linhas (conta uma vez), e a linha da faixa vale
     para varias linhas da tela (dv < 1 acima de 320x180: em 1280x720, cada
     uma serve a quatro) -- as repetidas sao copia de memoria. No navegador,
     em 1280x720, o ceu custava 3 ms por quadro. */
  if (!sil){
    if (CEU_U.length !== RW) CEU_U = new Int32Array(RW);
    let u = uBase;
    for (let x=0; x<RW; x++){ CEU_U[x] = (u|0) & (SKY_W-1); u += du; }
    let vAntes = -1;
    for (let y=0; y<RVH; y++){
      let v = (vBase + y*dv)|0;
      if (v < 0) v = 0; else if (v >= SKY_H) v = SKY_H-1;
      const saida = y*RW;
      if (v === vAntes){ buf.copyWithin(saida, saida - RW, saida); continue; }
      vAntes = v;
      const linha = v*SKY_W;
      for (let x=0; x<RW; x++) buf[saida + x] = SKY[linha + CEU_U[x]];
    }
    return;
  }
  for (let y=0; y<RVH; y++){
    let v = (vBase + y*dv)|0;
    if (v < 0) v = 0; else if (v >= SKY_H) v = SKY_H-1;
    const linha = v*SKY_W, saida = y*RW;
    /* onde o mundo nao pintou o z-buffer fica em zero: o indexOf do vetor tipado
       acha o primeiro e o ultimo sem um laco em JS, e a linha que o mundo
       cobriu inteira (o chao, dentro de casa) nem entra. Em 1280x720 o laco
       pixel a pixel custava uns 3 ms por quadro. */
    const linhaZ = zbuf.subarray(saida, saida + RW), a0 = linhaZ.indexOf(0);   // a visao limita a busca a esta linha
    if (a0 < 0) continue;
    const a = saida + a0, b = saida + linhaZ.lastIndexOf(0);
    let u = uBase + a0*du;
    if (sil){
      for (let i=a; i<=b; i++){ if (zbuf[i] === 0) buf[i] = y >= sil[i - saida] ? corSil : SKY[linha + ((u|0) & (SKY_W-1))]; u += du; }
    } else {
      for (let i=a; i<=b; i++){ if (zbuf[i] === 0) buf[i] = SKY[linha + ((u|0) & (SKY_W-1))]; u += du; }
    }
  }
}

/* ---------- mundo ---------- */
/* as fotos da oclusao: depois das faces ate 3, 10 e 25 tiles */
const MARCOS_DA_FOTO = [6, 20, 50];
function renderWorld(){
  zbuf.fill(0); HZ_Z.fill(0); HZ_SUJO.fill(0);
  PIX_VISTOS = 0;
  HZ_ATIVO = false;
  buildGeometry(camX, camY, cyaw, syaw, TANH, camZ);
  const ceuAntes = ceuAntesDoMundo();
  if (ceuAntes) drawSky();
  const marcos = MARCOS_DA_FOTO.map(function(b){ return b < BALDE_INICIO.length ? BALDE_INICIO[b] : Infinity; });
  let m = 0;
  for (let i=0;i<quadCount;i++){
    let foto = false;
    while (m < marcos.length && i >= marcos[m]){ m++; foto = true; }
    if (foto && i > 0) hzFoto();
    desenharFace(QUADS[i]);
  }
  if (!ceuAntes) drawSky();
}

/* Decalque no chao: um quadrado deitado, um dedo acima do piso para nao
   brigar com ele no z-buffer. */
function drawDecalque(x, y, z, raio, tex){
  const zz = z + 0.012;
  toCam(x-raio, y-raio, zz,  0,0, VA[0]);
  toCam(x+raio, y-raio, zz,  1,0, VA[1]);
  toCam(x+raio, y+raio, zz,  1,1, VA[2]);
  toCam(x-raio, y+raio, zz,  0,1, VA[3]);
  drawPoly(4, tex, 0, 1);
}

/* O quadro do cadaver.

   Encara a camera INTEIRA, inclinacao inclusive: o cartaz comum so gira no
   eixo vertical, entao quando voce passa por cima de um corpo ele fica de
   lado e some. Este deita junto com o seu olhar.

   E centrado no meio da caixa do bicho, nao apoiado no pe dela -- que e o
   mesmo ponto onde o assador centra a imagem. E essa coincidencia que faz o
   corpo pousar onde deve em qualquer inclinacao: a diferenca entre onde o
   quadro poe um ponto e onde o ponto esta de verdade e sempre ao longo da
   linha de visao, que e justamente a direcao que nao muda nada na tela.

   O desenho e de perfil, entao de cima voce ve um perfil deitado no chao.
   Nao e anatomicamente certo e e o preco de ter uma arte so -- de todo jeito
   melhor do que um corpo que desaparece quando voce chega perto.

   `espelha` troca o desenho de lado. Um corpo tem dois flancos, e de um lado
   voce ve a cabeca a esquerda e do outro a direita; sem inverter, atravessar
   para o outro lado parece um giro. */
function drawCadaver(x,y,z, wid,hgt, tex, olhar, espelha){
  const u0 = espelha ? 1 : 0, u1 = espelha ? 0 : 1;
  const rx = -syaw*wid*0.5, ry = cyaw*wid*0.5;
  const s = Math.sin(olhar), c = Math.cos(olhar);
  const hx = cyaw*s*hgt*0.5, hy = syaw*s*hgt*0.5, hz = c*hgt*0.5;
  const mz = z + hgt*0.5;
  toCam(x-rx-hx, y-ry-hy, mz-hz,   u0,1, VA[0]);
  toCam(x+rx-hx, y+ry-hy, mz-hz,   u1,1, VA[1]);
  toCam(x+rx+hx, y+ry+hy, mz+hz,   u1,0, VA[2]);
  toCam(x-rx+hx, y-ry+hy, mz+hz,   u0,0, VA[3]);
  drawPoly(4, tex, 0, 1);
}

/* ---------- billboards ---------- */
/* O quadro normal fica sempre de pe, que e o certo para quem esta de pe.

   Com o tombo, ele gira em torno da propria borda de baixo e deita para
   longe de voce. E o que o cadaver precisa: visto de longe continua um
   cartaz no chao, visto de cima vira decalque de piso. Sem isso, olhar para
   baixo mostrava um corpo em pe no ar, porque um cartaz vertical nao tem
   como mostrar a propria face de cima. */
/* O quadro de sempre: de pe, ancorado no chao. Serve para item, tocha e
   projetil, que nunca precisaram de outra coisa. */
function drawBillboard(x,y,z, wid,hgt, tex){
  const rx = -syaw*wid*0.5, ry = cyaw*wid*0.5;
  toCam(x-rx, y-ry, z,       0,1, VA[0]);
  toCam(x+rx, y+ry, z,       1,1, VA[1]);
  toCam(x+rx, y+ry, z+hgt,   1,0, VA[2]);
  toCam(x-rx, y-ry, z+hgt,   0,0, VA[3]);
  drawPoly(4, tex, 0, 1);
}

/* O quadro do cadaver.

   Encara a camera inteira, inclinacao inclusive, e e centrado no meio da
   caixa do bicho em vez de apoiado no pe dela -- que e o mesmo ponto onde o
   assador centra a imagem. E essa coincidencia que faz o corpo pousar onde
   deve de qualquer angulo: um ponto do modelo cai no quadro exatamente onde
   a camera o veria.

/* ---------- linha no espaco (flecha, faisca) ---------- */
function hexABGR(hex, f){
  const r = parseInt(hex.slice(1,3),16)*f | 0,
        g = parseInt(hex.slice(3,5),16)*f | 0,
        b = parseInt(hex.slice(5,7),16)*f | 0;
  return 0xFF000000 | (b<<16) | (g<<8) | r;
}
function rampABGR(hex){
  const a = new Uint32Array(16);
  for (let L=0;L<16;L++) a[L] = hexABGR(hex, Math.max(0, 1-L/17));
  return a;
}
const C_SHAFT = rampABGR("#7d5730"), C_TIP = rampABGR("#d2bd94"),
      C_FLETCH = rampABGR("#55762e"), C_SPARK = rampABGR("#ffab2a");

/* segmento 3D projetado -- e assim que a flecha ganha o angulo certo:
   ela e uma reta no mundo, entao encurta sozinha quando vem na sua direcao */
function drawSeg(x0,y0,z0, x1,y1,z1, ramp, thick){
  const a = toCam(x0,y0,z0, 0,0, VA[0]);
  const b = toCam(x1,y1,z1, 0,0, VA[1]);
  let ax=a.rx, ay=a.uy, az=a.fz, bx=b.rx, by=b.uy, bz=b.fz;
  if (az < NEAR && bz < NEAR) return;
  if (az < NEAR){ const t=(NEAR-az)/(bz-az); ax+=(bx-ax)*t; ay+=(by-ay)*t; az=NEAR; }
  else if (bz < NEAR){ const t=(NEAR-bz)/(az-bz); bx+=(ax-bx)*t; by+=(ay-by)*t; bz=NEAR; }
  const iza = 1/az, izb = 1/bz;
  const sxa = HW + ax*FX*iza, sya = HVH - ay*FY*iza;
  const sxb = HW + bx*FX*izb, syb = HVH - by*FY*izb;
  const dx = sxb-sxa, dy = syb-sya;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const t2 = Math.max(1, (thick*ESC)|0);
  for (let s=0;s<=steps;s++){
    const t = s/steps;
    const px = (sxa + dx*t)|0, py = (sya + dy*t)|0;
    const iz = iza + (izb-iza)*t;
    const col = ramp[lightAt(1/iz)];
    for (let oy=0; oy<t2; oy++) for (let ox=0; ox<t2; ox++){
      const qx = px+ox-(t2>>1), qy = py+oy-(t2>>1);
      if (qx<0||qy<0||qx>=RW||qy>=RVH) continue;
      const i = qy*RW+qx;
      if (iz > zbuf[i]){ buf[i] = col; zbuf[i] = iz; }
    }
  }
}

/* A pose do jogador em terceira pessoa, na ordem que importa: no ar sempre
   pulo, atacando (P.anim ainda contando) o golpe ou o conjurar conforme a
   arma, andando o ciclo que a distancia andada pede -- corrida durante o
   dash, senao o passo -- e parado alterna para a respiracao devagar. */
function poseDoJogador(){
  if (!P.ground) return POSE.PULO;
  if (P.anim > 0){
    const w = WPN[P.wpn], k = 1 - P.anim/w.cd;         // 0 no instante do golpe, 1 no fim da animacao
    if (w.kind === "melee") return POSE.ATAQUE[k < 0.22 ? 0 : 1];
    return POSE.CONJURAR[k < 0.3 ? 0 : 1];
  }
  if (Math.hypot(P.vx, P.vy) > 0.4){
    const ciclo = P.dashT > 0 ? POSE.CORRER : POSE.ANDAR;
    return ciclo[frameIdx(P.passada*ciclo.length, ciclo.length)];
  }
  return frameIdx(G.time*1.2, 2) ? POSE.RESPIRAR : POSE.PARADO;
}

/* O personagem pela altura de onde a camera o ve (ALTURAS_DA_CAMERA, p3e.js):
   o quadro assado na altura mais perto, num cartaz que encara a camera
   inteira, inclinacao inclusive -- o do cadaver --, centrado no meio do
   corpo, que e onde o assador ancora a imagem. Perto do chao continua o
   cartaz de pe de sempre. Se a altura pedida ainda esta no forno, vai o de pe
   deitado na mesma conta: melhor que um risco no chao. */
function desenharComAltura(x, y, z, larg, hgt, quadros, alto, pose, ang){
  const dx = camX - x, dy = camY - y, h = Math.hypot(dx, dy);
  const olhar = Math.atan2(camZ - (z + hgt*0.5), Math.max(0.05, h)), graus = olhar*180/Math.PI;
  const nivel = nivelDaAltura(graus);
  const rumo = frameIdx(Math.round((ang - Math.atan2(dy, dx))/(TAU/ROTACOES)) + ROTACOES*4, ROTACOES);
  let q = nivel && alto && alto[nivel - 1][pose] ? alto[nivel - 1][pose][rumo] : null;
  if (!q) q = quadroDaPose(quadros, pose, rumo);
  if (!q) return;
  q = quadroPelaDistancia(q, h);
  if (nivel === 0) drawBillboard(x, y, z, larg, hgt, q);
  else drawCadaver(x, y, z, larg, hgt, q, olhar);
}

/* ---------- entidades ---------- */
function renderEntities(){
  /* O proprio jogador, so em terceira pessoa: o boneco do provador, com o
     rumo tirado da diferenca entre para onde ele olha e de onde a camera ve
     -- a mesma conta das criaturas. De tras, e o quadro de costas. */
  if (G.terceira && QUADROS_JOGADOR && !P.dead)
    desenharComAltura(P.x, P.y, P.z, DIM_PERSONAGEM.DX*VOX_PERSONAGEM, DIM_PERSONAGEM.DZ*VOX_PERSONAGEM,
                      QUADROS_JOGADOR, FORNADA_JOGADOR && FORNADA_JOGADOR.alto, poseDoJogador(), P.ang);
  for (const e of ents){
    if (e.gone) continue;
    if (e.kind === "enemy"){
      const vox = SPR[e.d.vox];
      const caido = e.dead && e.dieT >= 0.32;
      const pose = e.dead ? (caido ? 4 : 3)
                 : (e.anim > 0 || e.painT > 0) ? 2
                 : frameIdx((e.walk||0)*1.7, 2);
      /* Rotacao 0 e o bicho de frente para voce. Conforme ele vira, a
         diferenca entre o rumo dele e a direcao ate a camera escolhe o quadro
         -- e o que faz dar pra ver as costas de quem foge.

         Como a IA para de mexer no rumo assim que o bicho cai, o cadaver
         guarda o rumo que tinha na hora da morte, e e dai que sai tambem o
         encurtamento dele mais abaixo. */
      const paraCamera = Math.atan2(camY - e.y, camX - e.x);
      const rel = (e.ang || 0) - paraCamera;
      const f = vox[pose][frameIdx(Math.round(rel/(TAU/ROTACOES)) + ROTACOES*4, ROTACOES)];
      /* a poca cresce enquanto o corpo tomba e depois fica */
      if (e.dead && e.dieT > 0.05)
        drawDecalque(e.x, e.y, e.z, e.d.wid * Math.min(1, e.dieT/0.8) * 0.56, TEX.sangue);
      if (caido){
        let olhar = Math.atan2(camZ - e.z - e.d.hgt*0.5,
                               Math.max(0.05, Math.hypot(camX-e.x, camY-e.y)));
        if (olhar < 0) olhar = 0;

        /* O cadaver tem os oito rumos como qualquer outra pose, entao o
           encurtamento ja vem desenhado em cada um deles: de lado o corpo e
           comprido, de cara e curto. Aqui so resta o tamanho.

           Um corpo deitado e mais comprido do que o bicho era largo -- a
           caixa dele serve para colisao, nao para o desenho. */
        drawCadaver(e.x, e.y, e.z, e.d.wid*1.35, e.d.hgt, f, olhar);
      }
      else drawBillboard(e.x, e.y, e.z, e.d.wid, e.d.hgt, f);
    } else if (e.kind === "item"){
      const set = SPR[e.type];
      drawBillboard(e.x, e.y, e.z + Math.sin(G.tick*2.2 + e.x)*0.05,
                    e.sz, e.sz*1.15, set[0]);
    } else if (e.kind === "cena"){
      /* a ilha tem centenas destes: o que esta fora do alcance ou atras da
         camera nem chega no recorte */
      const dx = e.x - camX, dy = e.y - camY;
      if (dx*dx + dy*dy > FAR2 || dx*cyaw + dy*syaw < -1) continue;
      drawBillboard(e.x, e.y, e.z, e.larg, e.alto, quadroPelaDistancia(e.img, Math.sqrt(dx*dx + dy*dy)));
    } else if (e.kind === "andarilho" && e.gpu){
      /* pela placa (gpu.js): o passo e a mistura de dois quadros do andar, sem salto */
      const dx = e.x - camX, dy = e.y - camY;
      if (dx*dx + dy*dy > FAR2 || dx*cyaw + dy*syaw < -1) continue;
      if (e.andando){
        const t = e.passada*POSE.ANDAR.length, i = frameIdx(t, POSE.ANDAR.length);
        gpuNaFila(e.gpu, e.x, e.y, e.z, e.ang, "andar-" + (i + 1), "andar-" + ((i + 1) % POSE.ANDAR.length + 1), t - Math.floor(t));
      } else gpuNaFila(e.gpu, e.x, e.y, e.z, e.ang, "parado", "parado", 0);
    } else if (e.kind === "andarilho"){
      if (ANDARILHO.fornada) desenharComAltura(e.x, e.y, e.z, e.larg, e.alto, ANDARILHO.fornada.quadros, ANDARILHO.fornada.alto, poseDoAndarilho(e), e.ang);
    } else {
      const set = SPR[e.type];
      drawBillboard(e.x, e.y, e.z, e.sz, e.sz*1.9, set[frameIdx(G.tick*9, set.length)]);
    }
  }
  for (const p of projs){
    if (p.type === "arrow"){
      const L = Math.hypot(p.vx,p.vy,p.vz) || 1;
      const ux = p.vx/L, uy = p.vy/L, uz = p.vz/L;
      drawSeg(p.x-ux*0.34, p.y-uy*0.34, p.z-uz*0.34,
              p.x+ux*0.14, p.y+uy*0.14, p.z+uz*0.14, C_SHAFT, 2);
      drawSeg(p.x+ux*0.10, p.y+uy*0.10, p.z+uz*0.10,
              p.x+ux*0.22, p.y+uy*0.22, p.z+uz*0.22, C_TIP, 2);
      drawSeg(p.x-ux*0.36, p.y-uy*0.36, p.z-uz*0.36,
              p.x-ux*0.24, p.y-uy*0.24, p.z-uz*0.24, C_FLETCH, 2);
    } else {
      drawBillboard(p.x, p.y, p.z-0.11, 0.30, 0.30, SPR[p.type][0]);
    }
  }
  for (const q of parts){
    const a = toCam(q.x,q.y,q.z, 0,0, VA[0]);
    if (a.fz < NEAR) continue;
    const iz = 1/a.fz;
    const sx = (HW + a.rx*FX*iz)|0, sy = (HVH - a.uy*FY*iz)|0;
    const sz = Math.max(1, (2.2*iz*FX/160)|0);          // 160 e o FX da camera de referencia
    const col = (q.col === "#8c1f14" ? C_BLOOD : q.col === "#c0301c" ? C_BLOOD : C_SPARK)[lightAt(a.fz)];
    for (let oy=0;oy<sz;oy++) for (let ox=0;ox<sz;ox++){
      const px = sx+ox, py = sy+oy;
      if (px<0||py<0||px>=RW||py>=RVH) continue;
      const i = py*RW+px;
      if (iz > zbuf[i]){ buf[i] = col; zbuf[i] = iz; }
    }
  }
}
const C_BLOOD = rampABGR("#8c1f14");
