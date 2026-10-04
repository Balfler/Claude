# Sondagem 12: o guerreiro de 256 no jogo, numa cena cheia (1/10)

**Pergunta:** antes de otimizar e de refazer as peças em 256, quanto custa de
verdade o personagem de 256 no jogo? O que pesa: a tela HD, o personagem, o
arquivo ou o assado?

**Como:** o motor do jogo agora aceita o corpo em qualquer densidade
(`src/p3e.js`: `usarCorpoDesenhado`, `reamostrarCorpo`, `naDensidade`, as cópias
para longe em cadeia). O guerreiro foi exportado pelo ateliê em 256
(`atelie/cli.js exportar ... --altura 256`), e 165 e 117 saíram dele
reamostrados, como a opção gráfica faria. Para comparar, também entrou o de 117
exportado pelo ateliê. A cena é a ilha de 650, num gramado com 23 coisas do
cenário à frente (a vila, árvores) e oito guerreiros de 1,6 a 12 tiles.
`medir.js` refaz tudo.

## O que se mediu

| | 117 | 165 | 256 |
|---|---|---|---|
| arquivo `.personagem` (texto) | 2,6 MB | 6,4 MB | **20,3 MB** (6,4 com gzip) |
| assar um visual (20 poses × 8 rumos, node) | 2,3 s | 5,1 s | **13 s** |
| sprites de um visual na memória | 1,9 MB | 3,7 MB | **9,4 MB** |
| reamostrar a partir do de 256, na carga | 1,3 s | 1,8 s | — |

O quadro (node, software, melhor de cinco rodadas; a máquina varia uns 30%):

| tela | cena sem guerreiros | com 8 guerreiros, de 117 a 256 |
|---|---|---|
| 640×360 | 7 ms | 12 a 16 ms |
| 960×540 | 18 ms | 17 a 25 ms |
| 1280×720 | 28 ms | 29 a 38 ms |

No navegador (Chromium desta máquina, a ilha, sem os guerreiros): 640×360 e
960×540 dão 60 quadros por segundo; **1280×720 dá 48**.

## O que isso diz

1. **A densidade quase não muda o quadro.** O sprite custa pelos pixels que
   ocupa na tela, não pelos voxels. O que pesa no quadro é a **tela HD**, e o
   peso está no **mundo**: a cena vazia já gasta 28 ms em 1280×720.
2. **Onde o 256 pesa é fora do quadro:** o arquivo (8 vezes o de 117), o
   assado (6 vezes) e a memória dos sprites (5 vezes, por visual). Com dez
   visuais diferentes na tela (coop e moradores) são uns 95 MB e 2 minutos de
   forno ao fundo.
3. **O reamostrado fica tão bom quanto o do ateliê** (`perto-lado-a-lado.png`,
   da esquerda para a direita: 117 do ateliê, 117 reamostrado, 165 e 256). Então
   basta guardar o de 256: as outras densidades saem dele na carga, em 1 a 2 s.
4. **As peças (armas, elmos) em 256 são as de 117 ampliadas**: funcionam, mas
   têm o degrau do 117. Desenhar as peças em 256 é trabalho de arte, à parte.
5. **O mundo de 64 por tile ao lado do personagem de 280 por tile** se vê em
   `cena-256-1280x720.png`: a grama e as árvores em blocos grandes ao lado do
   guerreiro fino. É uma decisão de estilo do Leandro.

## O que falta, em ordem

1. **Um formato menor para o de 256:** 20 MB de texto não entram no HTML. Há
   dois caminhos: o binário comprimido (uns 4 MB) ou levar a `.pele` (corpo,
   peso e poses) e posar no jogo, no forno (arquivo pequeno, mais assado).
2. **O guerreiro de 256 como corpo do jogo** e a **opção gráfica de densidade**
   (117, 165 ou 256, reamostrada na carga).
3. **Otimizar o mundo em 1280×720**, que é o gargalo do quadro.
4. **O assado de 256:** o forno já roda ao fundo. Falta priorizar o que se vê
   (parado e andar primeiro), e talvez assar só a cópia de longe de quem está
   longe.
