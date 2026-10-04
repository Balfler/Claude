/* ============================================================
   AS TRES VISTAS DO MOLDE
   ------------------------------------------------------------
   O arranjo da folha em que se desenha o personagem -- frente, lado e
   costas, lado a lado, um pixel por voxel -- e o que cada vista enxerga de
   uma grade de voxels. O molde (molde.js) desenha com isto, o conversor
   (conversor.js) le com isto, e o teste confere que os dois concordam.

   A vista de lado e a do lado de x alto, com o rosto virado para a
   esquerda. As costas sao espelhadas: o que esta a esquerda na imagem e o
   que esta a esquerda de quem olha as costas.
   ============================================================ */
const MARGEM = 8, VAO = 12;

function arranjo(dim){
  const DX = dim.DX, DY = dim.DY, DZ = dim.DZ;
  return {
    largura: MARGEM*2 + DX*2 + DY + VAO*2,
    altura: MARGEM*2 + DZ,
    vistas: {
      frente: {ox: MARGEM, largura: DX},
      lado:   {ox: MARGEM + DX + VAO, largura: DY},
      costas: {ox: MARGEM + DX + VAO + DY + VAO, largura: DX}
    },
    linhaDoZ: function(z){ return MARGEM + DZ - 1 - z; }
  };
}

/* O indice do primeiro voxel cheio que a vista enxerga na coluna u da
   imagem, na altura z; -1 se nao ha nada. */
function raio(g, dim, vista, u, z){
  const DX = dim.DX, DY = dim.DY;
  if (vista === "frente"){
    for (let y = 0; y < DY; y++){ const i = (z*DY + y)*DX + u; if (g[i]) return i; }
  } else if (vista === "costas"){
    const x = DX - 1 - u;
    for (let y = DY - 1; y >= 0; y--){ const i = (z*DY + y)*DX + x; if (g[i]) return i; }
  } else {
    for (let x = DX - 1; x >= 0; x--){ const i = (z*DY + u)*DX + x; if (g[i]) return i; }
  }
  return -1;
}

module.exports = {MARGEM, VAO, arranjo, raio};
