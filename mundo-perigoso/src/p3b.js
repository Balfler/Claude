
/* ============================================================
   CRIATURAS EM VOXEL
   ------------------------------------------------------------
   Ate aqui cada criatura era um desenho por pose. Isso tem dois limites que
   batem exatamente no que o jogo precisa: o bicho sempre encara voce (nao da
   pra saber pra onde ele esta virado) e cada peca de cosmetico nova custaria
   um desenho por rotacao por quadro.

   Aqui a criatura vira um modelo de voxels montado por PECAS. As rotacoes
   sao assadas no carregamento: gira o modelo, projeta em ortografica, ilumina
   pela normal de cada voxel e joga o resultado no mesmo pipeline de pixel art
   de sempre (paleta fixa + dither). Uma peca de cosmetico passa a ser uma
   peca, nao um catalogo de desenhos.

   E, de quebra, isso reproduz melhor o processo original do que desenhar:
   os sprites do Doom eram miniaturas de argila fotografadas de varios angulos.
   ============================================================ */

/* ---------- primitivas de modelagem ---------- */
/* Tudo em voxels inteiros. x = esquerda->direita visto de frente,
   y = frente->fundo, z = pes->cabeca. */
function vxCaixa(x0,y0,z0, w,d,h, mat){
  return {tipo:"caixa", x0:x0, y0:y0, z0:z0, x1:x0+w, y1:y0+d, z1:z0+h, mat:mat};
}
function vxBola(cx,cy,cz, rx,ry,rz, mat){
  return {tipo:"bola", cx:cx, cy:cy, cz:cz, rx:rx, ry:ry, rz:rz, mat:mat};
}
/* Membro conico entre dois pontos -- perna, braco, chifre, cauda. */
function vxOsso(x0,y0,z0, x1,y1,z1, r0, r1, mat){
  return {tipo:"osso", a:[x0,y0,z0], b:[x1,y1,z1], r0:r0, r1:r1===undefined?r0:r1, mat:mat};
}

/* Rasteriza as pecas num grid. Material 0 = vazio, entao os materiais
   comecam em 1. */
/* `base`, se vier, e uma grade ja cheia -- o corpo desenhado, posado -- e as
   pecas sao pintadas por cima dela. */
function montarVoxels(pecas, DX, DY, DZ, base){
  const g = base || new Uint8Array(DX*DY*DZ);
  for (const p of pecas){
    const m = p.mat;
    if (p.tipo === "caixa"){
      for (let z=p.z0;z<p.z1;z++){
        if (z<0||z>=DZ) continue;
        for (let y=p.y0;y<p.y1;y++){
          if (y<0||y>=DY) continue;
          for (let x=p.x0;x<p.x1;x++) if (x>=0 && x<DX) g[(z*DY + y)*DX + x] = m;
        }
      }
    } else if (p.tipo === "bola"){
      const x0=Math.max(0, Math.floor(p.cx-p.rx)), x1=Math.min(DX-1, Math.ceil(p.cx+p.rx));
      const y0=Math.max(0, Math.floor(p.cy-p.ry)), y1=Math.min(DY-1, Math.ceil(p.cy+p.ry));
      const z0=Math.max(0, Math.floor(p.cz-p.rz)), z1=Math.min(DZ-1, Math.ceil(p.cz+p.rz));
      for (let z=z0;z<=z1;z++) for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){
        const dx=(x-p.cx)/p.rx, dy=(y-p.cy)/p.ry, dz=(z-p.cz)/p.rz;
        if (dx*dx+dy*dy+dz*dz <= 1.0) g[(z*DY + y)*DX + x] = m;
      }
    } else {
      /* A capsula conica: entra o voxel cuja distancia ao segmento e menor que
         o raio naquele ponto dele. Antes era uma esfera carimbada a cada meio
         voxel do segmento, e num personagem de 117 voxels isso repetia o mesmo
         voxel milhares de vezes -- montar levava mais que assar. O centro de
         cada amostra continua marcado, para capsula mais fina que um voxel nao
         virar pontilhado. */
      const ax=p.a[0], ay=p.a[1], az=p.a[2], dx=p.b[0]-ax, dy=p.b[1]-ay, dz=p.b[2]-az;
      const L2 = dx*dx + dy*dy + dz*dz, r0 = p.r0, dr = p.r1 - p.r0, rmax = Math.max(p.r0, p.r1);
      const x0=Math.max(0, Math.floor(Math.min(ax, ax+dx) - rmax)), x1=Math.min(DX-1, Math.ceil(Math.max(ax, ax+dx) + rmax));
      const y0=Math.max(0, Math.floor(Math.min(ay, ay+dy) - rmax)), y1=Math.min(DY-1, Math.ceil(Math.max(ay, ay+dy) + rmax));
      const z0=Math.max(0, Math.floor(Math.min(az, az+dz) - rmax)), z1=Math.min(DZ-1, Math.ceil(Math.max(az, az+dz) + rmax));
      for (let z=z0;z<=z1;z++) for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){
        const px=x-ax, py=y-ay, pz=z-az;
        let t = L2 > 0 ? (px*dx + py*dy + pz*dz)/L2 : 0;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const qx=px-dx*t, qy=py-dy*t, qz=pz-dz*t, r=r0+dr*t;
        if (qx*qx + qy*qy + qz*qz <= r*r) g[(z*DY + y)*DX + x] = m;
      }
      const comp = Math.max(1, Math.round(Math.sqrt(L2)*2));
      for (let i=0;i<=comp;i++){
        const t=i/comp, x=Math.round(ax+dx*t), y=Math.round(ay+dy*t), z=Math.round(az+dz*t);
        if (x>=0 && y>=0 && z>=0 && x<DX && y<DY && z<DZ) g[(z*DY + y)*DX + x] = m;
      }
    }
  }
  return g;
}

/* Extrai so os voxels de superficie, ja com normal e oclusao.
   Feito uma vez por modelo; as rotacoes depois so giram estes numeros. */
function peleDoModelo(g, DX, DY, DZ){
  const cheio = (x,y,z) =>
    (x<0||y<0||z<0||x>=DX||y>=DY||z>=DZ) ? 0 : g[(z*DY+y)*DX+x];
  const pele = [];
  for (let z=0;z<DZ;z++) for (let y=0;y<DY;y++) for (let x=0;x<DX;x++){
    const m = g[(z*DY+y)*DX+x];
    if (!m) continue;
    let nx=0, ny=0, nz=0, vizinhos=0, expostos=0;
    for (let dz=-1;dz<=1;dz++) for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++){
      if (!dx && !dy && !dz) continue;
      if (cheio(x+dx,y+dy,z+dz)) vizinhos++;
      else { expostos++; nx+=dx; ny+=dy; nz+=dz; }
    }
    if (!expostos) continue;                       // voxel interno, nunca aparece
    const L = Math.hypot(nx,ny,nz) || 1;
    pele.push({
      x:x, y:y, z:z, mat:m,
      nx:nx/L, ny:ny/L, nz:nz/L,
      ao: 1 - (vizinhos/26)*0.62                   // quanto mais cercado, mais escuro
    });
  }
  return pele;
}

/* ---------- assar as rotacoes ----------
   Projecao ortografica. Primeiro o modelo gira em torno do proprio eixo
   vertical -- e o angulo do bicho. Depois a camera se inclina: e o angulo de
   quem olha. As duas coisas sao diferentes, e por muito tempo so a primeira
   existia. O sintoma era o cadaver no chao: de pe em frente a ele voce via
   um corpo deitado, mas olhando pra baixo continuava vendo a MESMA imagem,
   porque o sprite so sabia girar de lado. Um corpo visto de cima tem que ser
   visto de cima.

   A inclinacao e quanto a camera esta acima do bicho, em radianos. Zero e olhar
   de frente; perto de PI/2 e olhar de cima. A altura na tela encolhe por
   cos e o que estava longe sobe por sin -- que e exatamente o que a
   perspectiva faz quando voce levanta a cabeca sobre uma mesa.

   Luz fixa em espaco de tela, vinda de cima e da esquerda -- a mesma direcao
   dos sprites desenhados a mao. */
const LUZ = (function(){ const v=[-0.52,-0.58,0.63], L=Math.hypot(v[0],v[1],v[2]);
                         return [v[0]/L, v[1]/L, v[2]/L]; })();

function assarRotacoes(pele, DX, DY, DZ, rampas, nRot, escala, pal, rim, inclina, giro, nevoa){
  const LARG = DX*escala, ALT = DZ*escala;
  const cx = (DX-1)/2, cy = (DY-1)/2;
  const ci = Math.cos(inclina || 0), si = Math.sin(inclina || 0);
  const saida = [];
  const cvs = document.createElement("canvas");
  cvs.width = LARG; cvs.height = ALT;
  const g2 = cvs.getContext("2d", {willReadFrequently:true});

  /* O quadro e ancorado no CENTRO do grid, nao no pe do bicho.

     Parece um detalhe e nao e: inclinada a camera, o pe deixa de ser o ponto
     mais baixo da imagem -- o que estava atras sobe, o que estava na frente
     desce -- entao "o pe fica embaixo" deixa de ser uma regra. O centro do
     grid, nao. Ele e um ponto do modelo, esta sempre no mesmo lugar do mundo
     e projeta sempre no meio do sprite, seja qual for o angulo.

     Amarrar os dois lados nesse mesmo ponto -- aqui e no quadro que o
     renderizador desenha -- e o que faz o corpo pousar no chao em vez de
     boiar meio metro acima dele. */
  const cz = (DZ-1)/2;
  const linhaCentro = ALT - 1 - cz*escala;

  /* O indice de cada tom de cada rampa, uma vez so. Antes cada voxel, em cada
     rumo, procurava a cor pelo texto dela num Map -- num personagem de 117
     voxels isso eram 240 mil buscas por pose. */
  const indices = rampas.map(function(rampa){ return rampa.tons.map(indiceDaCor); });
  for (let r=0; r<nRot; r++){
    const ang = (giro || 0) + r * TAU / nRot;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const prof = new Float32Array(LARG*ALT).fill(1e9);
    const cor  = new Int32Array(LARG*ALT).fill(-1);

    for (const v of pele){
      const ox = v.x - cx, oy = v.y - cy;
      const rx =  ox*ca + oy*sa;
      const ry0 = -ox*sa + oy*ca;
      const nrx =  v.nx*ca + v.ny*sa;
      const nry0 = -v.nx*sa + v.ny*ca;
      /* inclinar a camera troca altura por profundidade */
      const alt = v.z*ci - ry0*si;
      const ry  = v.z*si + ry0*ci;
      const nry = v.nz*si + nry0*ci;
      const nAlt = v.nz*ci - nry0*si;
      /* normal virada para longe do observador: nao ilumina o que nao se ve */
      if (nry > 0.45) continue;
      const px = Math.round((rx + cx)*escala);
      const py = Math.round(linhaCentro - (alt - cz*ci)*escala);
      const rampa = rampas[v.mat-1];
      let tom;
      const dif = nrx*LUZ[0] + nry*LUZ[1] + nAlt*LUZ[2];
      if (rampa.emissivo) tom = 1;
      /* Cor desenhada ja traz a luz pintada: o motor so tira um passo do lado
         da sombra e da um passo so onde a superficie encara a luz, sem a
         oclusao -- que e o que fazia chuvisco em cima do desenho. */
      else if (rampa.plano) tom = Math.max(0, Math.min(1, 0.3 + 0.45*dif));
      else tom = Math.max(0, Math.min(1, (0.30 + 0.78*Math.max(0,dif)) * v.ao));
      const ton = indices[v.mat-1], kt = Math.round(tom*(ton.length-1));
      const c = ton[kt < 0 ? 0 : kt >= ton.length ? ton.length-1 : kt];
      for (let sy=0; sy<escala+1; sy++) for (let sx=0; sx<escala+1; sx++){
        const qx = px+sx-((escala)>>1), qy = py+sy-((escala)>>1);
        if (qx<0||qy<0||qx>=LARG||qy>=ALT) continue;
        const i = qy*LARG+qx;
        if (ry < prof[i]){ prof[i] = ry; cor[i] = c; }
      }
    }
    /* Voxel girado deixa pixel solto na imagem, sem a limpeza que um desenho a
       mao teria. Com desenho no modelo: pixel sem vizinho cheio nos quatro
       lados some, e pixel de cor que nenhum dos oito vizinhos tem vira a cor
       que pelo menos cinco deles tem. */
    if (rampas.some(function(r){ return r.plano; })){
      const antes = cor.slice(), conta = new Map();
      for (let y=0; y<ALT; y++) for (let x=0; x<LARG; x++){
        const i = y*LARG + x, c0 = antes[i];
        if (c0 < 0) continue;
        const cheio = function(xx, yy){ return xx>=0 && yy>=0 && xx<LARG && yy<ALT && antes[yy*LARG + xx] >= 0; };
        if (!cheio(x-1,y) && !cheio(x+1,y) && !cheio(x,y-1) && !cheio(x,y+1)){ cor[i] = -1; continue; }
        conta.clear();
        let igual = false;
        for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
          if (!dx && !dy) continue;
          const xx = x+dx, yy = y+dy;
          if (xx<0 || yy<0 || xx>=LARG || yy>=ALT) continue;
          const c = antes[yy*LARG + xx];
          if (c < 0) continue;
          if (c === c0){ igual = true; break; }
          conta.set(c, (conta.get(c) || 0) + 1);
        }
        if (igual) continue;
        for (const [c, n] of conta) if (n >= 5){ cor[i] = c; break; }
      }
    }
    /* Antes isto era um fillStyle e um fillRect de 1x1 por pixel: para o
       Vhalgorn davam 10 mil chamadas de canvas por quadro, 880 mil por
       criatura, e era ai que o carregamento estava indo embora. Escrever
       direto no buffer faz a mesma imagem sem chamar nada. */
    const id = g2.createImageData(LARG, ALT);
    const dst = new Uint32Array(id.data.buffer);
    for (let i=0;i<cor.length;i++) if (cor[i] >= 0) dst[i] = COR_ABGR[cor[i]];
    crispen(id, pal, rim);
    saida.push(shadeStack(new Uint32Array(id.data.buffer).slice(), LARG, ALT, 0,
                          pal && pal.length ? tabelaDaPaleta(pal, nevoa || 0) : null));
  }
  return saida;
}

/* `at` devolve string hex; guardo um indice para nao refazer parse por voxel */
const COR_HEX = [];
const corIdx = new Map();
const COR_ABGR = [];
function indiceDaCor(hex){
  let i = corIdx.get(hex);
  if (i === undefined){
    i = COR_HEX.length;
    COR_HEX.push(hex);
    COR_ABGR.push(0xFF000000 |
      (parseInt(hex.slice(5,7),16) << 16) |
      (parseInt(hex.slice(3,5),16) << 8) |
       parseInt(hex.slice(1,3),16));
    corIdx.set(hex, i);
  }
  return i;
}
/* embrulha `at` para devolver indice em vez de string */
const atOriginal = at;
function atIdx(tons, t){ return indiceDaCor(atOriginal(tons, t)); }

/* ---------- tombar ----------
   Morrer e cair. No Doom a morte era um desenho a parte porque nao havia de
   onde tirar outra coisa; aqui o corpo ja existe em tres dimensoes, entao a
   queda e um giro dele. Cai de CARA, para a frente, no rumo em que estava
   indo. De costas era a escolha obvia e estava errada: o diabrete tem rabo,
   que ficava esmagado embaixo, e o que sobrava virado pra cima era a barriga
   -- a parte do bicho que nao tem nada. De bruces aparecem as costas, os
   chifres e o rabo caido por cima.

   Gira no plano (y,z), em torno do eixo x. Duas correcoes no final, e as
   duas existem porque sem elas o resultado some:

   1. Deitado, o bicho fica tao comprido quanto era alto -- 32 voxels para um
      sprite de 24 de largura. Visto de lado ele passaria da moldura, entao o
      comprimento e comprimido para caber. Cadaver e monte de coisa: ninguem
      percebe, e o desenho a mao ja fazia o mesmo com um transform.
   2. Metade do corpo cai abaixo de z=0 e sai do recorte. O ultimo passo
      assenta o que sobrou no chao. */
function tombar(pele, DX, DY, ang, achata){
  const cy = (DY-1)/2, ca = Math.cos(ang), sa = Math.sin(ang);
  const caidos = pele.map(function(v){
    const oy = v.y - cy;
    return {
      x: v.x, y: cy + oy*ca - v.z*sa, z: (oy*sa + v.z*ca) * achata,
      mat: v.mat, ao: v.ao,
      nx: v.nx, ny: v.ny*ca - v.nz*sa, nz: v.ny*sa + v.nz*ca
    };
  });
  let y0 = 1e9, y1 = -1e9, z0 = 1e9;
  for (const v of caidos){
    if (v.y < y0) y0 = v.y;
    if (v.y > y1) y1 = v.y;
    if (v.z < z0) z0 = v.z;
  }
  const comp = y1 - y0, cabe = DX - 2;
  const k = comp > cabe ? cabe/comp : 1;
  const meio = (y0 + y1)/2;
  for (const v of caidos){
    v.y = cy + (v.y - meio)*k;
    v.z -= z0;
  }
  return caidos;
}

const ROTACOES = 8;

/* ---------- sprite escrito a mao, em texto ----------
   Quase tudo neste jogo sai de um modelo, porque quase tudo gira e se mexe.
   O cadaver nao faz nem uma coisa nem outra, e por isso ele e o unico lugar
   onde um desenho a mao ganha do modelo: ninguem modela um corpo caido
   melhor do que alguem desenha um.

   O arquivo original nao entra no jogo. Ele foi convertido uma vez para esta
   tabela de indices na paleta da propria criatura -- que e ASCII, cabe no
   fonte, e passa pelos mesmos dezesseis niveis de luz que todo o resto.
   Ponto e vazio; qualquer outro caractere e uma cor, em base 36.

   O desenho e encostado na base do quadro, que e onde fica o chao, e
   centrado na largura. Centrar importa: as vistas de um mesmo corpo tem
   larguras diferentes -- de lado ele e comprido, de frente e curto -- e e
   essa diferenca que faz a perspectiva. Alinhadas pela esquerda, o corpo
   pularia de lugar a cada quarto de volta.

   `espelha` desenha ao contrario. Um corpo visto pela direita e o mesmo
   visto pela esquerda, invertido, entao cinco desenhos cobrem oito rumos. */
function spriteDeTexto(linhas, pal, larg, alt, espelha){
  const src = new Uint32Array(larg*alt);
  const base = alt - linhas.length;
  for (let y=0; y<linhas.length; y++){
    const l = linhas[y];
    const dx = ((larg - l.length)/2) | 0;
    for (let x=0; x<l.length; x++){
      const ch = espelha ? l[l.length-1-x] : l[x];
      if (ch === ".") continue;
      const cor = pal[parseInt(ch, 36)];
      if (!cor) continue;
      const px = dx + x;
      if (px < 0 || px >= larg) continue;
      src[(base+y)*larg + px] = 0xFF000000 | (cor[2]<<16) | (cor[1]<<8) | cor[0];
    }
  }
  return shadeStack(src, larg, alt, 0, tabelaDaPaleta(pal, 0));
}

/* As cinco vistas de um cadaver viram os oito rumos: as tres do meio servem
   duas vezes, uma delas invertida. As pontas -- de cara e de pe -- sao
   simetricas o bastante para servirem sozinhas. */
function cadaverEmOitoRumos(vistas, pal, larg, alt){
  const um = (i, esp)=> spriteDeTexto(vistas[i], pal, larg, alt, esp);
  return [um(0), um(1), um(2), um(3), um(4), um(3,1), um(2,1), um(1,1)];
}

/* ---------- de que lado se ve um corpo caido ----------
   Duas tentativas erradas antes desta, e as duas erraram pelo mesmo motivo:
   quiseram resolver o angulo. Decalque chapado no piso perdia o corpo, virava
   pintura; quadro que encarava a camera inteira levantava o bicho, ele
   parecia sentado olhando pra voce.

   O certo e o que o Doom fazia: o cadaver e um cartaz comum, em pe, com o
   corpo desenhado DE PERFIL, deitado, visto da altura dos olhos. Nao importa
   de que lado voce chega -- e sempre o mesmo perfil, e e exatamente assim
   que se lembra dos corpos daquele jogo.

   OLHAR_CAIDO e a altura de quem esta em pe a dois passos do corpo. O modelo
   ja vem deitado ao longo do eixo x, entao nao ha giro a dar. */
const OLHAR_CAIDO = 0.25;

/* Assa as cinco poses de uma criatura. As tres primeiras se mexem; as duas
   ultimas sao o mesmo corpo tombando, entao reaproveitam a pele de pe em vez
   de remontar o bicho. */
function assarCriatura(modelo, DX, DY, DZ, mats, escala, pal){
  const porPose = [];
  let dePe = null;
  const assa = (p)=> assarRotacoes(p, DX, DY, DZ, mats, ROTACOES, escala, pal, 0.62, 0);
  for (const pose of [0,1,2]){
    const grid = montarVoxels(modelo(pose), DX, DY, DZ);
    const pele = peleDoModelo(grid, DX, DY, DZ);
    if (pose === 0) dePe = pele;
    porPose.push(assa(pele));
  }
  /* A queda usa o corpo de pe, porque quem tomba ainda esta rigido; so o
     cadaver usa a pose de membros largados. */
  const peleMorta = peleDoModelo(montarVoxels(modelo(3), DX, DY, DZ), DX, DY, DZ);
  porPose.push(assa(tombar(dePe, DX, DY, 1.05, 0.90)));    // 3 caindo, ainda cartaz

  /* Oito rumos no cadaver tambem. Com um quadro so ele girava no chao
     enquanto voce andava em volta: encarar voce e girar, e quem esta deitado
     tem um rumo que o chao atras denuncia. Com oito, o quadro gira e a
     imagem troca junto, e o resultado e uma coisa parada no mundo. */
  porPose.push(assarRotacoes(peleMorta, DX, DY, DZ, mats, ROTACOES, escala, pal, 0.62,
                             OLHAR_CAIDO, 0));
  return porPose;                                  // [pose][rotacao]
}
