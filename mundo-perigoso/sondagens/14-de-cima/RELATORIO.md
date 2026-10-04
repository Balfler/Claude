# Sondagem 14: o personagem visto de cima (1/10)

**O que o Leandro viu:** olhando de cima, o andarilho virava um risco no chão.
O sprite é um cartaz de pé, e de cima um cartaz de pé não tem largura.

**O que foi feito:** o assador já sabia inclinar a câmera (o `inclina` do
`assarRotacoes`; negativo é a câmera acima). Agora o personagem é assado de
mais três alturas, **35, 70 e 90 graus** (a de 90, bem de cima, entrou no mesmo dia) (`ALTURAS_DA_CAMERA`, `src/p3e.js`), e
quem desenha escolhe a altura mais perto de onde a câmera o vê
(`desenharComAltura`, `src/p5a.js`):

- abaixo de 17,5 graus, é o cartaz de pé de sempre;
- acima disso, o quadro daquela altura vai num cartaz que encara a câmera,
  inclinação inclusive. É o mesmo cartaz do cadáver, centrado no meio do
  corpo, onde o assador ancora a imagem.

O de pé é assado primeiro, então o personagem aparece tão cedo quanto antes,
e as alturas vêm depois, ao fundo. Hoje só o jogador (em terceira pessoa) e
o andarilho usam as alturas.

**Imagens:**
- `inclinacoes.png`: o guerreiro assado em 0, 35, 70 e 90 graus.
- `no-jogo.png`: o andarilho no navegador, com a câmera subindo; a última
  imagem é de bem perto.

**Custo:** o forno faz quatro vezes o trabalho, e a memória dos sprites
quadruplica. O personagem de 256 é o que mais sente: uns 38 MB por visual em
vez de 9,4.

**Falta:**
- talvez só a cópia de metade para as alturas, para economizar memória.
