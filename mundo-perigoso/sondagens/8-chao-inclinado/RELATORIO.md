# Sondagem 8 — o chão inclinado

**Pergunta:** dá para o terreno correr de um tile ao vizinho, sem refazer o
mapa nem o canteiro, e sem quebrar o resto? Plano: `DESIGN.md`, *o canteiro*, 6.

**Resposta: dá, e já anda.** Está no motor (`src/p2b.js`, `src/p4.js`),
**desligado por padrão**, e o jogo de hoje não muda (a bateria inteira passa
igual). Feito em 30/9, no PC, pelo Claude.

## Ligar

- No jogo: `cripta-vhalgorn.html?chao=inclinado` (ou o endereço do canteiro
  com o mesmo `?chao=inclinado`); `&degraus=3` muda o limite (padrão 2).
- Em código: `CHAO.ligado = true` e `montarChaoInclinado()`.

## Como funciona

- O `MAPA 2` não muda: continua uma altura por tile. O motor calcula quatro
  cantos por tile: a média do piso dele e dos tiles em volta do canto que
  estão a até `degraus` degraus de diferença. Onde passa disso é penhasco: os
  cantos não coincidem e a parede vertical continua (agora como um trapézio
  que segue os cantos).
- Só é rampa o chão **natural** ao ar livre (areia, grama, mato, lama, terra,
  encosta). Água, parede, porta, casa, o tile onde uma peça se apoia (e os
  vizinhos dela) e o piso feito (calçada, lajota, tabuado) ficam planos: os
  degraus deles são escada e continuam escada. Foi um erro da primeira versão,
  apontado pelo Leandro: a escadaria de Pedra Alta virava rampa.
- O desenho: o tile inclinado vira quad torto (dois triângulos), fora da
  fusão dos pisos iguais; o resto continua fundido em até 4×4.
- A física: a altura num ponto sai dos quatro cantos, pelos mesmos dois
  triângulos do desenho (`alturaDoChao(x, y)`). `groundUnder`, `pisosSob` (a
  grade de andar) e o degrau (`tileBlocks`) perguntam a altura no ponto do
  tile mais perto de quem anda. Morador, cenário, item, bicho, projétil e a
  linha de visão usam a mesma altura.

## O que se vê

`lugarN-degraus.png` e `lugarN-inclinado.png`: o mesmo lugar da ilha de 650,
antes e depois. A escadaria de paredes verticais vira colina; o penhasco de
pedra continua penhasco.

## Números

- **Desenho:** 1.523 faces contra 1.364 no lugar 2 (menos paredes); nada de
  mais custoso medido ainda no quadro.
- **Andar:** subindo a encosta sem pular, o maior salto de altura por passo
  cai de 0,250 (escada) para 0,075 (ladeira). Dois degraus seguidos, que na
  escada pediam pulo (0,5 contra o degrau de 0,42), viram ladeira que se sobe.
- **Testes:** `teste/chao.test.js`, 12. Na ilha de 650: 1.826 ladeiras e 25
  penhascos amostrados; nas ladeiras os cantos da aresta coincidem em 99,3%
  (as 12 rachaduras de 1.826 vêm de três tiles que não se ligam entre si
  ao redor de um canto; o trapézio da parede fecha o vão).

## O que falta (e o que decide o Leandro)

- **O limite de 2 degraus é chute:** ligar e olhar no jogo, ou no canteiro,
  com `&degraus=1`, `2`, `3`. Com 1 quase nada vira rampa; com 3, colinas de
  uns 37°.
- **O canteiro pinta e desfaz com o chão inclinado ligado** (recalcula tudo
  a cada pincelada; medir na ilha de 650 antes de deixar ligado).
- **A peça em cima de rampa:** hoje a peça e o tile dela ficam planos; uma
  casa numa encosta continua pedindo o terraço do canteiro.
- **A validação (alcance, pior quadro) e a planta** ainda não sabem do
  inclinado; a grade de andar já sabe.
- **Inclinação máxima de andar:** hoje só o limite de degraus.
- **Ligar por padrão** depois do olhar do Leandro.
