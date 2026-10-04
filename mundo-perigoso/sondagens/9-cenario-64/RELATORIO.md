# Sondagem 9 — o cenário em 64 voxels por tile

**Pergunta:** subir o cenário (árvore, pedra, barril, lampião...) de 37 para
64 voxels por tile, como o `DESIGN.md` decidiu (*densidade*), dá para fazer
sem redesenhar cada modelo? E custa quanto?

**Resposta: dá, é uma conta só, e já está no jogo atrás de `?cenario=64`,
desligado por padrão.** Feito em 30/9, no PC, pelo Claude.

## Como funciona

Os modelos do cenário são bolas, cápsulas e caixas escritas em coordenadas de
voxel, no `src/p3d.js`. Com `?cenario=64` cada peça do modelo (posição e
raio) cresce por 64 ÷ 37,2 = 1,72, o volume de trabalho cresce junto, e o
assador de voxel faz o resto. O tamanho no mundo não muda (a árvore continua
do tamanho dela, `larg` e `alto` em tiles são os mesmos): só tem mais voxels.
Nenhum modelo foi redesenhado. O morador (que já é de 128) e o personagem não
mudam.

## O que se vê

`perto-37.png` / `perto-64.png` (a 2 tiles de uma árvore) e `longe-37.png` /
`longe-64.png`: a copa e o tronco perdem o serrilhado de degrau e ganham
tufos; de longe a diferença é pequena, como o `DESIGN.md` previa ("o cenário
só cintila depois de uns 5 tiles").

## Custo (software, no node, na ilha de 650)

- Quadro: de 9,4 para 10,1 ms com 9 coisas em volta (perto: 12,7 ms com a
  árvore em cima); no navegador com GPU o desenho do sprite é o mesmo custo.
- Assar o cenário na abertura: de 0,8 para 1,0 s.
- Imagem do sprite: 1,72 vezes maior em cada lado (3 vezes em pixels).

## O que falta

- **O Leandro olhar e decidir** se liga por padrão. Na conta, é trocar o 0 de
  `CENARIO_VOX_POR_TILE` por 64.
- **Os modelos que não são só peça** (barril, poço, placa com texto) não foram
  olhados um a um; o teste só garante o tamanho e a razão da imagem.
- **Medir no navegador**, com a ilha cheia de árvore.
