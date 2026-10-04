# Arte de origem

Aqui ficam os desenhos originais que **não** entram no jogo.

O HTML montado é ASCII puro, então nenhuma imagem binária é embutida. Cada
desenho é convertido **uma vez** para uma tabela de índices na paleta da
própria criatura — texto, que cabe no fonte e passa pelos mesmos dezesseis
níveis de luz que todo o resto. O corpo escurece com a distância junto com a
parede atrás dele.

| Arquivo | Vira |
|---|---|
| `diabrete-morto-5-vistas.jpeg` | `DIABRETE_MORTO` em `src/p3c.js` |
| `diabrete-morto.jpeg` | primeira versão, de uma vista só — substituída |

## Como a conversão funciona

Feita no navegador, uma vez por desenho:

1. Recorta o fundo quadriculado. São dois cinzas neutros, 84 e 155; o bicho é
   vermelho e o osso é creme, os dois com bastante diferença entre os canais.
2. **Só é fundo o vazio que se alcança a partir da borda.** O gerador desenha
   os olhos como buraco, então o quadriculado aparece dentro da cabeça — e
   aquilo não é fundo, é olho. Os buracos internos viram osso, e são eles as
   duas manchas claras que se reconhecem de longe.
3. Separa os borrões, reduz cada um para a largura do sprite e quantiza com
   dither ordenado para a paleta da criatura.

**São cinco vistas ao redor do corpo**, não uma: de cara, três quartos, de
lado, três quartos do outro lado e de pé. Espelhando as três do meio saem os
oito rumos, e é isso que faz o corpo ficar parado no chão enquanto você anda
em volta. Com uma vista só ele girava, porque encarar você é girar.

Se um desenho for redesenhado, a tabela no fonte é que precisa ser refeita —
o arquivo aqui é só o arquivo morto.

**Quase tudo no jogo sai de um modelo de voxel, não daqui.** Desenho à mão só
ganha do modelo onde a coisa nunca anima, que é o caso do cadáver.

## O humano.wgvox e o humano.atelie

O corpo que está valendo **não** vem do molde abaixo. `humano.wgvox` é um
modelo já esculpido numa ferramenta de terceiros (sorceress.games/voxelgen) a
partir de uma imagem de referência **em T-pose**, e é só a origem: ele entra
no ateliê (`mundo-perigoso/atelie`, ver o README de lá) e vira
`humano.atelie`, o projeto — corpo em T-pose com as duas mãos, rig, peso de
osso e animações. É do projeto que sai `personagens/humano.personagem`, o que
o jogo lê.

```bash
node mundo-perigoso/atelie/cli.js receita mundo-perigoso/Arte/personagens/humano.receita.json
node mundo-perigoso/atelie/cli.js exportar mundo-perigoso/Arte/personagens/humano.atelie
node mundo-perigoso/build.js
```

`humano.receita.json` diz o modelo e quais capturas de movimento vão em
quais animações (andar e correr vêm da CMU, ver `captura/LEIA-ME.md`; o
resto é escrito no ateliê). O primeiro comando refaz o projeto do zero e
**descarta o que foi mexido à mão nele** (pincel de peso, pose ajustada no
painel). Para mexer, abra `humano.atelie` no ateliê e grave por cima; para o
jogo, só o segundo e o terceiro.

Dois cuidados que o ateliê já toma e que a conversão antiga não tomava: o
braço esticado tem 107 voxels de ponta a ponta e a grade do jogo tem 80 — o
corpo em T-pose mora numa caixa mais larga, e só a pose posada precisa caber
em 80; e a paleta do corpo tem no máximo 54 cores, que é o que sobra das 255
entradas do personagem no jogo. O corpo importado tem 115 de altura, não 117:
os dois voxels de folga no teto deixam a bacia subir no passo.

## O molde do humano

`molde-humano.png` (256×133) é o molde para desenhar personagem;
`molde-humano-4x.png` é a mesma imagem ampliada, só para olhar. Os dois saem de
`node mundo-perigoso/editor/molde.js`, a partir do mesmo esqueleto que o jogo usa
em `src/p3e.js` — mudou a proporção lá, roda de novo.

- **Um pixel do desenho é um voxel.** O humano tem 117 pixels, do chão (linha
  124 da imagem) ao topo da cabeça (linha 8). Não amplie nem reduza.
- **Três vistas, cada uma na sua área cinza:** frente (x de 8 a 87), lado (x de
  100 a 155, com o rosto virado para a esquerda) e costas (x de 168 a 247). As
  costas são espelhadas: o lado esquerdo da imagem é o esquerdo de quem olha as
  costas.
- **As linhas azuis tracejadas** marcam a altura das juntas: topo 116, queixo 88,
  ombro 78, cotovelo 61, pulso 46, quadril 37, joelho 20, tornozelo 5 e chão 0.
  As cruzes vermelhas são as juntas, e a linha laranja é o meio do corpo.
- **Mantenha a pose do molde:** braços um pouco afastados do corpo, pés no chão,
  cotovelo e joelho nas cruzes. É isso que faz o braço dobrar onde foi desenhado
  dobrando.
- **As três vistas concordam entre si:** a mesma altura, ombro e quadril na mesma
  linha, frente e costas com a mesma largura. Onde uma vista discorda da outra,
  o conversor não tem como adivinhar.
- **Desenhe numa camada por cima e grave só ela**, com fundo transparente e no
  mesmo tamanho do molde, em `Arte/personagens/Referência/humano.png`. É daí que o
  conversor lê: `node mundo-perigoso/editor/personagem.js` e depois o build.
  Equipamento, quando vier, é outra camada sobre o mesmo molde, dividida pelas
  mesmas partes do corpo.
- **Contorno escuro pode ficar no desenho.** O conversor tira o que estiver na
  borda da silhuete e o jogo desenha um contorno novo em cada rumo — senão,
  girado, ele vira risco no meio do corpo.
- **Até 48 cores ficam exatas.** Mais que isso, as parecidas se juntam.

**O `humano.png` que está aqui é provisório, e não é mais o que o jogo usa**
(ver `humano.wgvox`, acima). Saiu do desenho de referência do humano: frente
e costas recortadas, reduzidas para 117 pixels e postas no arranjo do molde.
A vista de lado **não existe** na referência e foi inventada a partir do
volume das outras duas — sem ela, onde o braço encosta no tronco de frente o
conversor não tem como saber que ali é braço fino, e não tronco grosso; foi
essa a causa do rosto amassado que tirou este caminho de uso. Fica arquivado
para quando existir a vista de lado de verdade, ou outro personagem for feito
por este caminho.

**Este molde não é T-pose.** O braço dele só se afasta do corpo, e a pose
parada é ambígua perto do quadril para decidir de que osso é cada voxel. Um
desenho feito aqui e convertido por `editor/personagem.js` ainda pode entrar
no ateliê (ele importa `.personagem`), mas o rig vai sair da proporção do jogo
e pedir acerto à mão. Para desenhar um personagem novo, o caminho é o próprio
ateliê: imagens de referência de frente, lado e costas **em T-pose** atrás do
corpo, na etapa Esculpir.
