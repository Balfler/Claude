# Sondagem 11 — o guerreiro no jogo, em 117 e em 165 voxels

**Pergunta (Leandro, 30/9):** os bloquinhos do personagem parecem grandes;
aumentar a resolução ajuda? O `DESIGN.md` escolheu 128 voxels por tile
(personagem de 117 de altura); aqui a mesma figura é assada em 117 e em 165
voxels (1,41 vez), pelo assador do jogo, e posta lado a lado no jogo.

**Resposta: ajuda, de perto; de longe ajuda pouco.** Feito em 30/9 pelo Claude.

## O que foi feito

`comparar-no-jogo.js`: escala por um momento a grade, a caixa e o centro do
ateliê dentro do processo, refaz o corpo do guerreiro a partir do volume de
alta resolução (forma do Sorceress, cor do desenho), o rig (juntas e larguras
× 1,41) e o peso (com `pano`), põe na pose parada, e assa com o mesmo código
do jogo (`assarRotacoes`, rampas de cor desenhada, contorno do personagem),
em 8 rumos. Os sprites entram na ilha como os do cenário. Nada do projeto foi
mexido: o ateliê e o jogo continuam em 117.

## O que se vê (`frente-1.6.png`, `costas-1.6.png`, `frente-3.png`, `costas-3.png`)

Cada quadro tem o de 117 à esquerda e o de 165 à direita, na tela de 640×360
do jogo; o `-ampliado.png` é um recorte em 3× (o pixel do jogo em monitor
Full HD). A 1,6 tile (a câmera de terceira pessoa):

- o rosto de 165 tem olhos, nariz e sobrancelha legíveis; o de 117 é uma
  mancha com dois pontos;
- as correias, a fivela, as joelheiras e a pele da gola têm borda definida
  em 165 e serrilhado em 117;
- a capa e a barra dela perdem o degrau.

A 3 tiles a diferença cai, mas o rosto ainda se vê melhor.

## Números

| | 117 | 165 |
|---|---|---|
| Grade | 80×56×117 | 113×79×165 |
| Voxels do corpo | 55 mil | 156 mil (2,8×) |
| Cálculo do peso (ateliê) | 0,6 s | 1,5 s |
| Sprite de cada rumo | 80×117 px | 113×165 px (2× os pixels) |
| Assar os 8 rumos (as duas juntas) | 0,3 s | |

O assado por visual no jogo hoje custa uns 0,7 s por visual com as 20 poses
(sondagem 1); em 165, por volta de 2 vezes isso, e cada visual assado segura
2 vezes a memória.

## O que isso não responde

- **Só a pose parada**, sem andar nem correr, e só o guerreiro; o jogo de
  verdade refaz a grade, a mão da arma, o lugar da cabeça, as armas, os
  chapéus, o cabelo e o morador em 1,41 (ver a conversa de 30/9): é trabalho
  de alguns dias, não de uma tarde.
- **O limite da tela:** a 1,6 tile o personagem de 165 cobre uns 164 pixels
  de altura, 1 pixel por voxel; acima disso o pixel do jogo não mostra mais
  detalhe. Mais que 165 só com câmera mais perto ou tela maior.
- **A cor é a do desenho:** ele tem ~125 pixels de altura, então a cor não
  ganha detalhe acima disso; o que sobe é a forma.

## Como rodar

```
node mundo-perigoso/sondagens/11-resolucao-do-personagem/comparar-no-jogo.js <folha.png> <forma.wgvox> <projeto.atelie> <pasta> [--K=1.41]
```

## Com 256 voxels também (30/9, a pedido do Leandro)

`3-frente-1.6-ampliado.png` e os outros `3-*`: 117 (esquerda), 165 (meio) e
256 (direita), no mesmo quadro. O 256 é a resolução nativa do `.wgvox` do
Sorceress (257 de altura).

| | 117 | 165 | 256 |
|---|---|---|---|
| Grade | 80×56×117 | 113×79×165 | 175×123×256 |
| Voxels do corpo | 55 mil | 156 mil | 611 mil (11×) |
| Cálculo do peso (ateliê) | 0,6 s | 1,6 s | 7,4 s |
| Sprite de cada rumo | 80×117 px | 113×165 px | 175×256 px (4,8× os pixels) |
| Voxels fora da grade, parado | 0 | 0 | 6 |

- **De 165 para 256 ainda se ganha**, mas bem menos que de 117 para 165: o
  rosto e o cinto ficam mais firmes, a pele da gola ganha tufos. A 1,6 tile o
  personagem ocupa uns 164 pixels de altura, então em 256 cada voxel é 0,64
  pixel: o ganho que sobra vem do sprite ser reduzido com mais informação.
- **O custo sobe rápido:** 11 vezes os voxels, e o assado por visual fica
  em uns 3 s contra 0,7 s de hoje, além de 4,8 vezes a memória por sprite. Com
  quatro jogadores de visual diferente na tela, são uns 12 s de forno.
- Apareciam dois pontinhos soltos perto dos ombros em 256 (6 voxels fora da
  grade). **Era um erro meu:** as constantes do peso do pano (a folga em volta
  do braço, o raio da junta, as faixas da capa) estavam em voxels absolutos, e
  em 256 o braço é mais grosso que a folga. Agora escalam com a resolução
  (`atelie/pesos.js`), e o problema sumiu (0 voxels fora da grade, peso de
  7,4 s para 5,7 s). Em 117 nada mudou.

### Por que o 256 parecia pouco detalhado a 1,6 tile (análise, 30/9)

1. **A tela de 640×360 não tem pixels para ele.** A 1,6 tile o personagem
   ocupa 164 pixels: em 256 é 0,64 pixel por voxel. O jogo amostra o sprite
   pelo vizinho mais perto, sem tirar média: o detalhe que sobra é sorteado, e
   a figura não ganha nada sobre a de 165. O remédio é uma cópia reduzida
   com média (o mip) escolhida pela distância, como a `longe` que já existe
   para 117 (`quadroPelaDistancia`): é parte do que falta fazer.
2. **De perto o 256 ganha:** `perto-1.0-ampliado.png`, a 1 tile, cada voxel
   tem 1,3 pixel: o rosto (sobrancelha, nariz, boca), a fivela do cinto e os
   tufos da gola aparecem só em 256.
3. **O desenho de origem tem só uns 105 a 125 pixels de arte de altura** (o
   bloco do pixel de arte mede uns 11 a 13 pixels na folha de 1352): então em
   256 cada pixel de arte vira um bloco de 2×2 voxels. A *forma* ganha (vem do
   Sorceress, que tem 257), a *cor* não tem mais o que dar. Para a cor ganhar
   também seria preciso uma folha desenhada com mais pixels de arte.

## E em 512? (30/9, a pedido do Leandro)

`4-perto-0.5-ampliado.png`: o rosto a 0,5 tile, em 117, 165, 256 e 512 (da
esquerda para a direita), no jogo.

**O 512 não é dado novo.** A fonte (o `.wgvox`) tem 257 de altura, e o desenho
uns 125 pixels de arte; o pipeline refeito em 512 precisaria de uma malha de
origem (só se tem o `.wgvox`) e de bilhões de células (caixa de 93 milhões,
peso geodésico com 5 milhões de voxels: não cabe no processo). O que se
mostra é o corpo de 256 com cada voxel partido em 8, as quinas arredondadas
(ocupação interpolada, corte em 0,5) e a cor do voxel de origem.

- **O ganho de 256 para 512 é pequeno:** as bordas da pele da gola e do cabelo
  ficam mais lisas, sem degrau; o rosto e a cor são os mesmos, porque o
  desenho não tem mais o que dar. De 117 para 165 e para 256 o salto é
  grande; daí para cima, não.
- **Custo:** 4,9 milhões de voxels (8× os de 256), sprite de 350×512 pixels, e
  uns 2 s só para assar um rumo.
- Para o 512 valer, a origem tem que ter mais informação: uma malha de alta
  resolução (o `.glb` do gerador) e um desenho com mais pixels de arte. O
  leitor de `.glb` e o voxelizador (30/9) já fazem a parte da forma.

`comparar-no-jogo.js --Ks=1,1.41,2.19,4.38 --soPerto --dist=0.5 --crop=300,300,0`
refaz a imagem.

## Em 960×540 e em 1280×720 (30/9, a pedido do Leandro)

`5-tela-<resolução>-frente-1.6.png` e os outros `5-*`: o mesmo guerreiro em
117 (esquerda), 165 (meio) e 256 (direita), com o jogo desenhando em 640×360
(hoje), 960×540 e 1280×720. A tela do jogo é 320×180 vezes um número inteiro
(`ESC` no `src/p2.js`), para o pixel ficar quadrado e inteiro no monitor.

**Sobre o 1366×768:** não é múltiplo de 320×180 (dá 4,27), então o jogo não
desenha nele com pixel inteiro. O HD inteiro mais perto é **1280×720 (4×)**, que
num monitor de 1366×768 sai com uma borda ou esticado 1,067 (pixel desigual).
Desenhar direto em 1366×768 pediria mudar a tela-base do jogo.

| Tela do jogo | Pixels | Quadro (node, software, cena simples) | Personagem a 1,6 tile |
|---|---|---|---|
| 640×360 (hoje) | 230 mil | 3,3 ms | 164 px de altura |
| 960×540 | 518 mil | 8,6 ms | 246 px |
| 1280×720 | 922 mil | 18,0 ms | 328 px |

- **Com a tela maior, o 256 passa a valer a pena:** em 960×540 o personagem de
  256 tem 1,0 pixel por voxel (contra 0,64 em 640×360), e em 1280×720, 1,3. Aí
  a diferença entre 165 e 256 aparece no rosto, na fivela e nas correias
  mesmo a 1,6 tile, e o de 117 fica nitidamente grosseiro.
- **O preço é o quadro:** 2,6× mais tempo em 960×540 e 5,5× em 1280×720. Em
  1280×720 esta cena simples já passa dos 16,7 ms do orçamento de 60 quadros,
  medida em software no node (num navegador com GPU o desenho do quadro pode
  ser mais leve, mas o rasterizador do jogo é por software). Em 960×540 cabe
  com folga numa cena leve e aperta na ilha cheia (a taverna media 14 ms em
  640×360).
- **A otimização que está na fila** (o desenho antes do co-op) decide qual
  tela o jogo aguenta; o personagem de 165 ou 256 vale mais nas telas maiores.

`comparar-no-jogo.js ... --Ks=1,1.41,2.19 --esc=3` refaz as imagens (`--esc=4`
para 1280×720).
