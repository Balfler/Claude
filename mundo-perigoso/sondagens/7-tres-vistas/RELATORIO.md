# Sondagem 7 — o corpo pelas três vistas, sem IA

**Pergunta:** o caminho "só vistas" do `prompts/personagem-do-desenho.md` dá
um corpo que presta? É o primeiro dos três caminhos da medição; os outros dois
(IA local e malha de fora) esperam os downloads.

**Resposta curta: dá um corpo que funciona, mas abaixo do Sorceress.** Uma
folha com frente, perfil e costas em T-pose vira, em 1,5 s, um corpo do
ateliê com rig proposto sem aviso e as 20 poses. **O veredito do Leandro
(29/9): "não está de todo ruim, mas não está no nível do Sorceress".**

Feito em 29/9, no PC, pelo Claude.

## A entrada

`Arte/personagens/Referência/Gemini_Generated_Image_9jp9w9jp9w9jp9w9.jpeg`: um
guerreiro com gola de pele, armadura e capa, em T-pose, de frente, de perfil
(olhando para a direita) e de costas, fundo cinza liso, 2752×1536. O leitor de
imagem do projeto só lê PNG; a conversão foi pelo Windows:

```
powershell -Command "Add-Type -AssemblyName System.Drawing; [System.Drawing.Image]::FromFile('entrada.jpeg').Save('folha.png', [System.Drawing.Imaging.ImageFormat]::Png)"
```

As duas folhas em pose A (braço caído, as de 27/9: o clérigo e o necromante)
**não servem**: o rig do ateliê pede T-pose, e de lado o braço caído se
confunde com o tronco.

## O que o `tresvistas.js` faz

1. **Recorta.** O fundo é o que se alcança da borda por cor parecida com a
   dela: o contorno escuro do desenho fecha a silhueta, então o cinza da
   armadura, parecido com o do fundo, não vaza. O texto ("FRONT VIEW") sai
   por ser pedaço pequeno. As três vistas são os três maiores pedaços — por
   coluna vazia não dava, porque a mão estendida da frente chega na coluna da
   capa do perfil.
2. **Esculpe** num volume de trabalho de 230 de altura (o dobro dos 115). O
   volume é o cruzamento das silhuetas; cada fatia horizontal vira
   superelipses (expoente 2,5) em vez de caixas; e o braço em T-pose, que de
   lado se esconde atrás do tronco, vira um cilindro com a grossura que a
   frente mostra.
3. **Pinta** cada voxel da superfície com a vista que mais o encara e que o
   enxerga (teste de oclusão pelo primeiro voxel no raio). O lado sem vista (o
   esquerdo, aqui) copia o voxel espelhado do perfil. O contorno pintado na
   borda troca pela cor de dentro. O miolo herda a cor da casca, senão a média
   do ateliê suja a superfície (foi o primeiro erro: o corpo saiu salpicado de
   cinza).
4. **Entrega ao ateliê** (`importarModelo`): 115 de altura, 54 cores, macio
   por dentro, e daí `novoProjeto` propõe o rig, o peso e as animações.

```
node mundo-perigoso/sondagens/7-tres-vistas/tresvistas.js <folha.png> <pasta> --nome=guerreiro
node mundo-perigoso/sondagens/7-tres-vistas/comparar.js <pasta>/guerreiro.atelie comparacao.png
node mundo-perigoso/atelie/cli.js folha <pasta>/guerreiro.atelie poses.png
```

## Os números

| | |
|---|---|
| Tempo | 0,8 s recortar, 0,1 esculpir, 0,25 pintar, 0,3 o ateliê |
| Corpo | 76.911 voxels, 54 cores |
| Rig proposto | sem aviso |
| Silhueta (interseção sobre união, no volume de trabalho) | frente 0,86, costas 0,97, perfil 1,00 |
| De onde veio a cor da superfície | frente 14.495, costas 14.295, perfil 6.708, espelho 3.846, vizinho 17.441 |
| Validação do ateliê | 5 erros (pedaço solto) e 1 aviso (quadril) |

A frente fica em 0,86 porque o desenho de costas não bate exatamente com o de
frente (a capa e as mãos mudam de uma vista para a outra), e o volume só tem o
que as duas vistas concordam.

## O que se vê (`resultado/`)

- `comparacao.png`: à esquerda o nosso, à direita o do Sorceress, de frente,
  de lado e de costas. Rosto, correias, cinto, joelheiras, a gola de pele e a
  capa aparecem, com as cores do desenho.
- `poses.png`: as 20 poses de frente e de lado. Anda, corre, pula, ataca,
  conjura, bloqueia e atira de arco, com a capa acompanhando.
- `guerreiro.atelie`, para abrir no ateliê; `guerreiro.vox`, para o
  MagicaVoxel; `guerreiro.json`, os números.

## Em 256 de altura, como o do Sorceress (29/9)

O Leandro achou o primeiro "de baixa resolução": a comparação era dos dois
corpos já reduzidos aos 115 do ateliê. Então o modelo cru foi feito na altura
da fonte do Sorceress, com `--alto=256`, e a cor passou a ser a mediana dos
pixels em volta, e não a média (a média misturava dois pixels de arte
vizinhos e o ruído do JPEG).

- `guerreiro-256.vox`: 231×75×256, 823 mil voxels, 255 cores (o limite do
  `.vox`). O do Sorceress, `humano.wgvox`: 235×56×257.
- `guerreiro-256-comparacao.png`: os dois crus, lado a lado, na mesma luz.
- **De frente e de costas, o nosso fica nítido:** rosto, correias, fivela,
  joelheiras, a pele da gola e as dobras da capa. O rosto de frente sai mais
  limpo que o do Sorceress, que é salpicado.
- **De lado, o nosso perde:** o perfil da cabeça sai quebrado, e o punho
  aparece pintado no ombro. É onde a forma inventada pela IA faz falta: três
  silhuetas planas não dão a cabeça redonda.

## O que está ruim

- **Pedaço solto em 5 poses** (21 a 45 voxels): a capa se descola quando a
  perna anda. A capa é um pano; no rig ela é tratada como corpo.
- **O quadril do rig sai 15 voxels do repouso do jogo**, porque a capa alarga
  a silhueta. Peças presas em posição fixa (cinto, capa) podem ficar fora do
  lugar.
- **O punho no ombro, de lado.** No perfil em T-pose, o braço aponta para quem
  olha, e o punho fica pintado em cima do ombro.
- **17 mil voxels de superfície** pegam a cor do vizinho: o de cima do braço,
  o alto da cabeça e o vão entre as pernas, que nenhuma das três vistas
  enxerga.
- **As vistas não concordam** em alguns pontos (0,86 na frente). A ferramenta
  de verdade tem que avisar onde, como o prompt pede.

## Para decidir (Leandro)

- Se o nível serve, o caminho "só vistas" já é a base da etapa "0. Do
  desenho" do ateliê. A IA local entra depois só onde falta forma: as costas
  inventadas quando só houver a frente.
- **A entrada tem que ser T-pose**, com frente, perfil e costas. As folhas de
  classe (o clérigo e o necromante de 27/9) precisam ser refeitas em T-pose.

## O caminho "malha de fora" (29/9)

Com o leitor de `.glb` novo (`editor/glb.js`, 11 testes), o `.glb` que o
Leandro exportou do Sorceress (`Arte/personagens/pixel-art-character-1_png.glb`,
158 mil triângulos, textura de 968×968) foi voxelizado sólido em 256 de altura
pelo nosso voxelizador, com a cor da textura por vizinho mais perto (pixel
art não se mistura). **Levou 0,2 s de leitura e 0,2 s de voxelização.**

`resultado/malha-de-fora-comparacao.png`: à esquerda a nossa voxelização da
malha; à direita o `.wgvox` do Sorceress (de outra imagem, em T-pose).

- **O rosto e o pano saem limpos e nítidos:** olhos, cabelo, dobras da manga,
  bolsa, cinto. O `.wgvox` do Sorceress é salpicado (14 mil cores). O
  Sorceress estraga a malha ao voxelizar; a malha em si é boa.
- **Então a forma vinda de IA resolve o que o caminho só-vistas não resolvia**
  (a cabeça, o perfil, a capa). Quem gera a forma pode ser qualquer gerador
  de malha; a voxelização e a cor ficam por nossa conta.
- O `.glb` está em pose A, então o rig avisa que não há T-pose. Mesmo assim o
  ateliê monta o projeto, e a validação dá 1 erro (pedaço solto).
- `node mundo-perigoso/atelie/cli.js novo arquivo.glb projeto.atelie` já
  aceita `.glb`.

**Para decidir:** o passo que falta para virar o caminho de produção é a
**malha em T-pose**: gerar no Hunyuan3D (site ou local) a partir da folha em
T-pose e passar pelo mesmo caminho. A cor pode vir da textura da malha, como
aqui, ou reprojetada do desenho.

## A forma do Sorceress com a cor do desenho (30/9)

O Leandro fez o guerreiro no Sorceress (`guerreiro.wgvox`, 229×81×257, 627 mil
voxels, 23 mil cores) e deixou na Área de Trabalho. Olhando o modelo cru:

- **A forma é boa**, como a do humano de antes: cabeça redonda, ombro, volume
  de perfil, a pele da gola. É o que as três silhuetas não dão.
- **A cor é ruim:** salpicada, o rosto com manchas, a capa cheia de pontos
  escuros. É a textura da IA reduzida a voxel.

Então o `tresvistas.js` ganhou `--forma=arquivo.wgvox|.glb`: usa **só a forma**
(quais voxels existem), alinha o volume às vistas da folha pela altura e pelo
meio do tronco, e **pinta com a cor projetada do desenho** — a receita que o
`prompts/personagem-do-desenho.md` já propunha.

`resultado/forma-do-sorceress/comparacao-sorceress-x-forma+cor-do-desenho.png`:
à esquerda o modelo do Sorceress como veio; à direita a mesma forma pintada
com o desenho. Rosto legível, correias, fivela, joelheiras, pele e dobras da
capa, nas três vistas. Processa em 2 s.

- Fontes da cor: frente 19 mil, costas 19,5 mil, perfil 9,9 mil, espelho 5,7
  mil, vizinho 56 mil voxels. Silhueta (interseção sobre união) 0,90 na frente,
  0,81 nas costas, 0,88 no perfil: a folha e o modelo não são exatamente o
  mesmo desenho.
- **O rig sai sem aviso** (a forma é T-pose de verdade) e as 20 poses saem.
  De início a **capa se esticava em fios** (145 erros de pedaço solto e de
  voxels fora da grade): o peso automático, geodésico, ligava a capa larga aos
  braços. Consertado com `opcoes.pano` no `atelie/pesos.js`: voxel longe do
  eixo do braço em linha reta (raio + 6) não pode ser do braço. Agora a
  validação dá **sem erro** (1 aviso, o quadril), e a capa acompanha o corpo
  em todas as poses. É opcional (`--pano` no CLI do ateliê) porque o humano
  de camisa não muda com ele (0 de 37 mil voxels) e a receita dele é byte a
  byte. 2 testes novos.
- Rosto de frente: a IA do Sorceress fez o rosto de frente feio (sombreado
  pesado); o desenho é melhor. Nas costas e no perfil a forma é a inventada
  por ela.

**Conclusão:** o caminho de produção é esse: **forma de um gerador de malha
(Sorceress, Hunyuan), cor do desenho.** Dá o nível que o Leandro esperava. O
que falta é o alinhamento fino (a forma e o desenho de frente diferem 10%) e
testar com outras classes, com manto e capuz.

### O alinhamento fino (30/9)

A forma e o desenho não são exatamente a mesma imagem (o Sorceress re-enquadra
a entrada), e a cor vazava nas bordas. O `tresvistas.js` agora procura sozinho,
em `volumeDeFora`, uma escala e um deslocamento em x e em z que maximizem a
interseção sobre a união da silhueta da forma com a do desenho de frente e a
de costas (625 candidatos, grossa e fina, uns 2 s). No guerreiro do Leandro:
escala 0,94 em x e 0,96 em z, e 9,5 voxels de deslocamento vertical, e a
sobreposição média sobe de 0,854 para 0,902. A fidelidade da silhueta na
frente sobe de 0,90 para 0,95, e nas costas de 0,81 para 0,85. `guerreiro.json`
traz os parâmetros em `alinhamento`. As imagens de `resultado/forma-do-sorceress/`
são as de depois.

### A movimentação e a capa, de novo (30/9, a pedido do Leandro)

O Leandro abriu o guerreiro no ateliê: bom de forma, ruim de movimento, capa
ainda dando problema, "o outro modelo tinha uma movimentação bem melhor". O
corpo do humano tem andar e correr da captura da CMU (na receita dele); o
guerreiro tinha só as animações escritas de partida. E o rig proposto estava
errado por causa da roupa. Consertado:

1. **As capturas da CMU** (andar e correr, as mesmas da receita do humano)
   agora entram no guerreiro (`aplicarCapturas` no `tresvistas.js`; `--fase`
   no CLI de captura do ateliê).
2. **A virilha** do rig: a capa enche o meio atrás das pernas, e o rig punha
   o quadril a 17 voxels do chão (o do humano fica a 38). Agora só conta o que
   está na frente do corpo, e fora da faixa humana (24 a 40% da altura) vale a
   proporção do jogo. Com e sem capa o quadril fica na mesma altura (teste).
3. **O pescoço** subia para o queixo por causa da gola de pele (96 em vez de
   88): agora só até 80% da altura.
4. **O ombro** ficava a 20 do centro por causa das ombreiras (o do humano, a
   12), o braço pendurado nascia fora do lugar da mão, e a captura amortecia o
   braço a 3%: agora no máximo 14 do centro. O braço passou a balançar por
   inteiro (amortecimento 1,00).
5. **O pano** (`--pano`): além de o voxel longe do braço não seguir o braço, o
   que está bem atrás do tronco, ou de lado longe do meio acima da barra,
   segue só a bacia e o tronco. A capa deixou de se esticar em fios e de se
   soltar com a perna: a validação foi de 145 erros para 3 (fragmentos de 28
   e 29 voxels e 2 voxels fora da grade).

`resultado/forma-do-sorceress/poses.png` é a folha nova: as pernas passam, o
braço balança, a capa acompanha o corpo. **O que ainda não está no nível do
humano:** o andar mostra a passada um pouco mais curta (amortecimento das
pernas em 0,87 e 0,25 em alguns quadros, porque a grade de 80×56 e a capa
apertam), e o guerreiro continua com a capa presa ao corpo. **Se o Leandro
preferir a capa como peça à parte com animação própria** (tirar do desenho,
modelar o corpo sem ela, e a capa como peça), o caminho é o de cosmético de
cabeça, só que para as costas: um osso `capa` preso ao tronco. Está anotado
no PLANEJAMENTO.
