# Sondagem 13: o mundo em 128 (1/10)

**Pedido do Leandro:** com o personagem de 256 (uns 280 voxels por tile), o
mundo tem que subir também. Hoje as texturas têm 64 por tile e o cenário,
37 voxels por tile.

**O que foi feito:** a opção `?mundo=128`, desligada por padrão.
- **As texturas da ilha e dos estilos saem em 128 por tile.** As receitas
  continuam escritas em 64. O que é forma (tábua, fileira de pedra, junta,
  telha) mantém o tamanho no tile, e o que é fino (folha de grama, pedrisco,
  grão, veio) é pintado em pixel de 128 e vem em maior quantidade. Assim a
  textura ganha detalhe, em vez de só ficar maior e mais lisa. As texturas
  presas na folha (vidraça, porta, veneziana) são desenhos medidos em 64 e
  saem ampliadas, iguais.
- **O mip:** sem ele, o chão de 128 longe vira listras. Cada textura de 128
  ganha cópias de 64, 32, 16 e 8. O rasterizador escolhe a cópia a cada
  trecho de 16 pixels, pelo tanto de texel que o pixel cobre, nos dois
  sentidos da tela. Em cada cópia, o texel novo é, dos quatro que cobre, o de
  cor mais perto da média deles. Pela maioria, a calçada escurecia ao longe.
- **O cenário em 128 voxels por tile:** um pixel por voxel e duas cópias
  para longe, como o personagem.

Sem `?mundo=128` nada muda: a imagem sai igual pixel a pixel.

## O que se vê

As cenas estão em `vila-mundo-64.png` / `vila-mundo-128.png` e
`casas-mundo-64.png` / `casas-mundo-128.png`. Os recortes ampliados, lado a
lado (64 à esquerda, 128 à direita), estão em `vila-perto-64-x-128.png`,
`casas-perto-64-x-128.png` e `casa-parede-64-x-128.png`.

- **A grama e a areia em 128 ficam na mesma escala do guerreiro.** Em 64 o
  chão era de blocos grandes ao lado dele.
- **A parede de tábua e a pedra** ficam com as frestas do mesmo tamanho e o
  veio mais fino.
- **O que pede um olhar de arte:**
  - a calçada em 128 vira pedras redondas e lisas, porque o desenho é de
    elipses;
  - o telhado fica com menos contraste;
  - a janela (desenho de 64) não ganha nada.

## Custo

| | 64 | 128 |
|---|---|---|
| quadros por segundo, navegador, 1280×720, girando na ilha | 60 | 60 |
| quadros por segundo, idem, na vila da ilha de 650, com o guerreiro | 56 a 57 | 56 |
| montar o mundo (texturas e cenário assado) | 0,7 s | 3 a 4 s |

`medir.js` refaz as imagens e a medida no node (que varia uns 30%).
