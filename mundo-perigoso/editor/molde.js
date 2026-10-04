/* ============================================================
   O MOLDE DO HUMANO
   ------------------------------------------------------------
   Frente, lado e costas do corpo base, um pixel por voxel, com as linhas das
   juntas. E sobre ele que se desenha o personagem: cada desenho vira voxel
   sem precisar de escala nenhuma, e as juntas desenhadas caem onde o
   esqueleto do jogo dobra.

   O molde sai do mesmo codigo que monta o personagem no jogo (src/p3e.js),
   entao mudar a proporcao la e rodar isto de novo e o que basta.

   Uso: node mundo-perigoso/editor/molde.js
   Grava mundo-perigoso/Arte/molde-humano.png (para desenhar) e
   molde-humano-4x.png (para olhar).
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { carregar } = require("../teste/harness");
const { codificar } = require("./png");

const RAIZ = path.join(__dirname, "..", "..");
const { D } = carregar(path.join(RAIZ, "cripta-vhalgorn.html"));
const { DX, DY, DZ } = D.DIM_PERSONAGEM;
const MP = D.MP;
const s = D.esqueletoDaFormula(0);
const g = D.montarVoxels(D.pecaCorpo(s), DX, DY, DZ);
const cheio = (x, y, z) => (x >= 0 && y >= 0 && z >= 0 && x < DX && y < DY && z < DZ) ? g[(z*DY + y)*DX + x] : 0;

/* ---------- o arranjo ----------
   Tres colunas lado a lado, na ordem frente, lado, costas. A de lado e a
   do lado direito da tela visto de frente, com o rosto virado para a
   esquerda. As costas sao espelhadas: o que esta a esquerda nelas e o que
   esta a esquerda de quem olha as costas. */
const MARGEM = 8, VAO = 12;
const VISTAS = [
  {nome:"frente", largura:DX, ox:MARGEM,
   raio:function(u, z){ for (let y = 0; y < DY; y++){ const m = cheio(u, y, z); if (m) return m; } return 0; }},
  {nome:"lado", largura:DY, ox:MARGEM + DX + VAO,
   raio:function(u, z){ for (let x = DX - 1; x >= 0; x--){ const m = cheio(x, u, z); if (m) return m; } return 0; }},
  {nome:"costas", largura:DX, ox:MARGEM + DX + VAO + DY + VAO,
   raio:function(u, z){ for (let y = DY - 1; y >= 0; y--){ const m = cheio(DX - 1 - u, y, z); if (m) return m; } return 0; }}
];
const LARG = MARGEM*2 + DX*2 + DY + VAO*2, ALT = MARGEM*2 + DZ;
const img = new Uint8Array(LARG*ALT*4);
const linhaDoZ = z => MARGEM + DZ - 1 - z;

function por(x, y, cor){                         // cor = [r, g, b, a], por cima do que ja esta
  if (x < 0 || y < 0 || x >= LARG || y >= ALT) return;
  const i = (y*LARG + x)*4, a = cor[3]/255, b = img[i + 3]/255, sai = a + b*(1 - a);
  if (sai <= 0) return;
  for (let k = 0; k < 3; k++) img[i + k] = Math.round((cor[k]*a + img[i + k]*b*(1 - a))/sai);
  img[i + 3] = Math.round(sai*255);
}

const COR = {
  area:     [40, 60, 80, 34],                    // onde cabe o desenho de cada vista
  pele:     [222, 206, 184, 255],
  couro:    [168, 148, 122, 255],
  olho:     [58, 48, 42, 255],
  contorno: [92, 78, 64, 255],
  linha:    [60, 170, 214, 170],                 // altura das juntas
  meio:     [214, 128, 64, 150],                 // meio do corpo
  junta:    [220, 58, 48, 235]
};
const corDoMaterial = m => m === MP.COURO ? COR.couro : m === MP.OLHO ? COR.olho : COR.pele;

/* 1. a area de cada vista e a silhueta, com contorno */
for (const v of VISTAS){
  const mat = (u, z) => (u < 0 || u >= v.largura || z < 0 || z >= DZ) ? 0 : v.raio(u, z);
  for (let z = 0; z < DZ; z++) for (let u = 0; u < v.largura; u++){
    const x = v.ox + u, y = linhaDoZ(z);
    por(x, y, COR.area);
    const m = mat(u, z);
    if (!m) continue;
    const borda = !mat(u - 1, z) || !mat(u + 1, z) || !mat(u, z - 1) || !mat(u, z + 1);
    por(x, y, borda ? COR.contorno : corDoMaterial(m));
  }
}

/* 2. as linhas das juntas, tracejadas para nao esconder a silhueta */
const ALTURAS = {topo:DZ - 1, queixo:88, ombro:s.ombroE[2], cotovelo:s.cotoveloE[2], pulso:s.maoE[2],
                 quadril:s.quadrilE[2], joelho:s.joelhoE[2], tornozelo:s.peE[2], chao:0};
for (const nome in ALTURAS){
  const y = linhaDoZ(Math.round(ALTURAS[nome]));
  for (let x = MARGEM - 4; x < LARG - MARGEM + 4; x++) if (x % 2 === 0) por(x, y, COR.linha);
}
/* 3. o meio do corpo em cada vista */
for (const v of VISTAS){
  const u = v.nome === "lado" ? s.cabeca[1] : s.cabeca[0];
  for (let y = MARGEM; y < MARGEM + DZ; y++) if (y % 2 === 0) por(v.ox + Math.round(v.nome === "costas" ? DX - 1 - u : u), y, COR.meio);
}
/* 4. as juntas, em cruz */
const JUNTAS = ["ombroE", "ombroD", "cotoveloE", "cotoveloD", "maoE", "maoD", "quadrilE", "quadrilD", "joelhoE", "joelhoD", "peE", "peD", "pescoco"];
for (const v of VISTAS) for (const j of JUNTAS){
  const p = s[j];
  const u = v.nome === "lado" ? p[1] : v.nome === "costas" ? DX - 1 - p[0] : p[0];
  const x = v.ox + Math.round(u), y = linhaDoZ(Math.round(p[2]));
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) por(x + dx, y + dy, COR.junta);
}

function ampliar(fator){
  const w = LARG*fator, h = ALT*fator, out = new Uint8Array(w*h*4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const i = ((y/fator | 0)*LARG + (x/fator | 0))*4, o = (y*w + x)*4;
    out[o] = img[i]; out[o + 1] = img[i + 1]; out[o + 2] = img[i + 2]; out[o + 3] = img[i + 3];
  }
  return {w, h, out};
}

const ARTE = path.join(RAIZ, "mundo-perigoso", "Arte");
fs.writeFileSync(path.join(ARTE, "molde-humano.png"), codificar(LARG, ALT, img));
const grande = ampliar(4);
fs.writeFileSync(path.join(ARTE, "molde-humano-4x.png"), codificar(grande.w, grande.h, grande.out));

/* o arranjo, para o conversor saber onde cada vista comeca */
console.log("molde " + LARG + "x" + ALT + ": " + VISTAS.map(v => v.nome + " em x " + v.ox + ", largura " + v.largura).join("; ") +
            "; o chao fica na linha " + linhaDoZ(0) + " e o topo na " + linhaDoZ(DZ - 1));
console.log("juntas (altura em voxels): " + Object.keys(ALTURAS).map(k => k + " " + Math.round(ALTURAS[k])).join(", "));
