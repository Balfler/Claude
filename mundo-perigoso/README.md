# Mundo Perigoso — código do protótipo

Fonte de *A Cripta de Vhalgorn*, o protótipo jogável. O design do projeto está
em [`../DESIGN.md`](../DESIGN.md) — **leia antes de mexer**.

## Como mexer

```bash
node mundo-perigoso/build.js              # monta ../cripta-vhalgorn.html e ../provador.html
node mundo-perigoso/editor/molde.js       # desenha Arte/molde-humano.png, o molde para desenhar personagem
node mundo-perigoso/editor/personagem.js  # converte Arte/personagens/Referência/humano.png em personagens/humano.personagem
node mundo-perigoso/atelie/cli.js receita mundo-perigoso/Arte/personagens/humano.receita.json  # refaz o humano do zero: modelo + capturas
node mundo-perigoso/atelie/cli.js exportar mundo-perigoso/Arte/personagens/humano.atelie  # valida e grava personagens/humano.personagem e .pele (--altura 165 ou 256: em outra densidade, de projeto com a fonte de alta resolucao)
node mundo-perigoso/atelie/cli.js captura <projeto.atelie> <arquivo.bvh> <animacao>  # captura de movimento numa animacao
node mundo-perigoso/atelie/cli.js gerar <folha.png> [--nome x] [--semente N] [--saida pasta] [--jogo]  # a folha em T-pose vira .atelie pelo gerador local (Hunyuan3D-2mv); ver ferramentas/gerador/LEIA-ME.md
node mundo-perigoso/teste/tudo.js         # a bateria inteira: build, todos os testes e a verificacao (1111 testes)
node mundo-perigoso/teste/atelie.test.js  # atelie: rig, peso, pele, captura, encaixe, validacao, arquivos e o jogo lendo (108 testes)
node mundo-perigoso/teste/conversor.test.js  # PNG, molde, conversor de tres vistas e pose do desenho (25 testes)
node mundo-perigoso/teste/wgvox.test.js   # leitor .wgvox e leitor/escritor .vox (10 testes)
node mundo-perigoso/teste/verifica.js     # sintaxe, mapa, topologia, ASCII
node mundo-perigoso/teste/jogo.test.js    # regras do jogo, painel, tela 16:9, terceira pessoa, passo fixo e o preparo do golpe dos bichos (71 testes)
node mundo-perigoso/teste/motor3d.test.js # motor 3D, geometria em pedacos (53 testes)
node mundo-perigoso/teste/mapa.test.js    # formato de mapa (MAPA 1 e 2), marcos, acento escapado, operações e carimbo (142 testes)
node mundo-perigoso/teste/ilha.test.js    # mapas no motor, viagem, entrada e saída em par, conversa e bolsa (67 testes)
node mundo-perigoso/teste/densidade.test.js  # o personagem em 117, 165 ou 256: as pecas na densidade, o reamostrar, as copias para longe, o formato compacto, ?corpo= e a tecla 9 (26 testes)
node mundo-perigoso/teste/mundo.test.js  # o mundo em 128 (?mundo=128): texturas e mip, o cenario com copias para longe (9 testes)
node mundo-perigoso/teste/gerador.test.js  # o gerador local sem a placa: o recorte das vistas em RGBA, o gerar sem o gerador instalado, o .glb sem cor no tresvistas (35 testes)
node mundo-perigoso/teste/conversa.test.js  # palavras-chave dos moradores (13 testes)
node mundo-perigoso/teste/regras.test.js  # regras do personagem, e as classes por quest (101 testes)
node mundo-perigoso/teste/personagem.test.js  # personagem de 117 voxels, peças, provador e a fornada (26 testes)
node mundo-perigoso/teste/pecas.test.js   # peças: forma, sólidos, dois andares, escada, a malha de 65 direções, a porta que abre, a textura do mundo (45 testes)
node mundo-perigoso/teste/estilos.test.js # estilos e o pintor de texturas, sem navegador (50 testes)
node mundo-perigoso/teste/canteiro.test.js # o micro do canteiro: mira, fantasma, pôr, tirar, desfazer, id, encaixe, conta-gotas, seleção, trocar, abrir (63 testes)
node mundo-perigoso/teste/refazer.test.js # refazer só o que mudou dá o mesmo mundo que montar do zero (18 testes)
node mundo-perigoso/teste/andar.test.js   # grade de andar: pisos, degrau, porta (fechada, aberta, na conta), escada, agachar, ponte, régua, cada tipo de peça, a casa do lote (70 testes)
node mundo-perigoso/teste/modelo.test.js  # modelo: copiar, girar, espelhar, colar, o arquivo .modelo, o lote (27 testes)
node mundo-perigoso/teste/jogadores.test.js # varios jogadores no mesmo mundo: o passo de cada um, o do mundo, quem apanha, pega e abre (12 testes)
node mundo-perigoso/teste/catalogo.test.js # catálogo: todo tipo em todo estilo, girado e espelhado; a miniatura do motor (20 testes)
node mundo-perigoso/teste/validacao.test.js # validação: formato, ligações entre mapas, peças soltas, alcance, escada, pior quadro (39 testes)
node mundo-perigoso/teste/planta.test.js  # a planta: a cor do macro, penhasco, peças, coisas, o PNG igual byte a byte (10 testes)
node mundo-perigoso/teste/canvas.test.js  # o canvas em software do node: retângulo, arco, traço, gradiente, recorte, as texturas do jogo (14 testes)
node mundo-perigoso/teste/pronto.test.js  # o conteúdo do pronto: a ilha de 650, Pedra Alta, a fortaleza, a gruta, da praça ao pico andando (17 testes)
node mundo-perigoso/teste/olhar.test.js   # o relevo com ruído, o calor do vazio e a vista de um ponto (19 testes)
node mundo-perigoso/teste/forno.test.js   # o forno ao fundo: o worker assa igual, byte a byte, e a reserva na linha principal (10 testes)
node mundo-perigoso/teste/glb.test.js     # o leitor de .glb e o voxelizador solido, com a cor da textura (11 testes)
node mundo-perigoso/teste/chao.test.js    # o chao inclinado: desligado nada muda; ligado, cantos, ladeira, penhasco e quem anda, a pincelada parcial (14 testes)
node mundo-perigoso/teste/cenario.test.js # o cenario em 64 voxels por tile (?cenario=64): mesmo tamanho no mundo, mais voxels (4 testes)
node mundo-perigoso/teste/silueta.test.js # a silhueta do relevo alem da nevoa (?silhueta=sim): so o ceu muda, na cripta nada (6 testes)
node mundo-perigoso/canteiro/cli.js converter mundo-perigoso/mapas/ilha.mapa  # MAPA 1 -> MAPA 2
node mundo-perigoso/canteiro/cli.js ver mundo-perigoso/mapas/ilha.mapa       # o que o arquivo tem
node mundo-perigoso/canteiro/cli.js validar mundo-perigoso/mapas/ilha.mapa   # a validação inteira, com o motor
node mundo-perigoso/canteiro/cli.js planta mundo-perigoso/mapas/ilha.mapa ilha.png --problemas  # a vista de cima em PNG
node mundo-perigoso/canteiro/cli.js vista mundo-perigoso/mapas/ilha.mapa 139.5,75.5,180 vista.png  # um quadro do jogo em PNG
node mundo-perigoso/canteiro/cli.js catalogo auto catalogo.png              # a folha do catálogo, desenhada pelo motor
node mundo-perigoso/canteiro/bancada/formato.js  # canteiro: quanto o mapa ocupa em cada jeito de escrever
node mundo-perigoso/canteiro/bancada/pedacos.js  # canteiro: geometria em pedaços, colisão com peça, grade de andar
```

A bancada do canteiro que mede o quadro roda no navegador, com o jogo montado:
sirva a raiz do repositório (servidor `cripta`) e abra
`mundo-perigoso/canteiro/bancada/bancada.html?rodar=base` (ou `triangulo`,
`fortaleza`, `rasterizador`). As medições e as cinco decisões que saíram dela
estão no `DESIGN.md`, em *o canteiro*.

`?rodar=comparar` põe o motor de agora ao lado do de antes dos pedaços, lido de
`bancada/antigo.html` — fora do git, e refeito do histórico quando precisar:

```bash
git show 0ba4e21:cripta-vhalgorn.html > mundo-perigoso/canteiro/bancada/antigo.html
```

O jogo é **um arquivo HTML só**, montado por concatenação dos módulos de
`src/`. Edite `src/`, nunca o HTML montado — ele é gerado.

A saída vai para a raiz do repositório porque é o caminho que o `README.md` de
lá e o `.claude/launch.json` já usam (servidor `cripta`, porta 8123).

## Opções no endereço (todas desligadas por padrão)

Propostas de 29 e 30/9 que esperam o olho do Leandro. Valem no jogo e no
canteiro (`canteiro.html?chao=inclinado`), e se somam com `&`.

| Opção | O que faz | Onde está |
|---|---|---|
| `?chao=inclinado` | o terreno natural corre de um tile ao vizinho, até 2 degraus; penhasco e escada (piso feito) continuam | `sondagens/8-chao-inclinado/` |
| `&degraus=3` | muda o limite entre rampa e penhasco (padrão 2) | idem |
| `?cenario=64` | árvore, pedra, barril e lampião com 64 voxels por tile, no mesmo tamanho | `sondagens/9-cenario-64/` |
| `?silhueta=sim` | o relevo que passa da linha dos olhos depois de 60 tiles vira silhueta no céu | `sondagens/10-silhueta-do-relevo/` |
| `?corpo=guerreiro` | o corpo de teste, o guerreiro de 256 voxels (a skin oficial), no lugar do humano; a página carrega `personagens/guerreiro.corpo.js` | `sondagens/12-densidade-no-jogo/` |
| `?mundo=64` | o mundo de antes de 1/10: texturas de 64 por tile e cenário de 37 voxels por tile (o padrão agora é 128, com mip) | `sondagens/13-mundo-128/` |
| `?mundo=placa` | o céu e as faces do mundo desenhados pela placa (WebGL2), com as mesmas contas do rasterizador; bichos, cenário e itens continuam no software, por cima. Sem WebGL2, volta o rasterizador. O contador (F) diz quantos pedaços e faces | `src/mundo-placa.js` (sondagem 17) |

No painel de ajuste (P), **T** troca a tela (o padrão de fábrica é 1280×720 desde 1/10) e **9** a densidade do personagem (117, 165 ou 256, até a do corpo; o de 256 dá os outros reamostrado). O `.personagem` que vai para o jogo sai compactado (PERSONAGEM 3, `editor/compacto.js`, sem perder voxel): o `build.js` compacta o humano para dentro do HTML e escreve os outros em `personagens/<nome>.corpo.js`.

Na ilha, um **andarilho** com o corpo do guerreiro de 256 passeia na rua perto do morador com mais rua em volta (o Guarda Anselmo, na ilha de sempre): é para ver o 256 de todos os lados, parado e andando. A página sempre carrega `personagens/guerreiro.corpo.js` para ele; sem o arquivo, ele não aparece.

Na linha de comando do canteiro: `--inclinado` (e `--degraus=N`) no `validar`
e no `vista` liga o chão inclinado no jogo que mede, e `--degraus=N` na
`planta` marca o penhasco pelo mesmo limite. No ateliê, `--pano` faz voxel
longe do eixo do braço (capa, manga larga) não seguir o braço, e o que fica
atrás do tronco seguir só a bacia e o tronco. **A marca fica no projeto**
(`"pano": true` no `.atelie`, e a caixa *pano* no painel de peso): sem isso,
mexer numa junta ou apertar Recalcular refazia o peso sem o pano e a capa
voltava a se esticar.

## Os módulos

A ordem de concatenação está em `build.js` e importa.

| Arquivo | Conteúdo |
|---|---|
| `src/p1.html` | Página, CSS, moldura |
| `src/mapa.js` | O formato do mapa (MAPA 1 e MAPA 2), o mesmo do jogo e do canteiro |
| `src/ilha.js` | O mapa de `mapas/` ou o que o canteiro mandou, traduzido para o motor |
| `src/cores.js` | Paleta, COLORMAP e o indexador de textura — puro, o node também usa |
| `src/pintor.js` | O pintor de texturas sem canvas: tábua, pedra, cantaria, telha, rocha, terra |
| `src/estilos.js` | Os estilos de peça: cada material é uma receita do pintor |
| `src/pecas.js` | Os tipos de peça: forma e sólidos |
| `src/solidos.js` | Os sólidos das peças e as três perguntas da física |
| `src/andar.js` | A grade de andar: onde se fica em pé e aonde se chega, com a física do motor. O canteiro usa; o jogo não leva |
| `src/p2.js` | Mapa ASCII, texturas procedurais, o ambiente (céu e bruma) |
| `src/p2b.js` | Alturas por tile, e a geometria do mundo em pedaços de 16 tiles |
| `src/p3.js` | Itens, tochas, armas e as rampas de cor |
| `src/p3b.js` | Maquinário de voxel: peças, pele, assador de rotações |
| `src/p3c.js` | Os modelos das seis criaturas |
| `src/p3e.js` | O personagem composto por peças: esqueleto, peças, montagem e assador |
| `src/p3d.js` | O cenário da ilha: árvores, pedras, móveis de rua e moradores |
| `src/gpu.js` | O personagem 3D desenhado pela placa, e a imagem do software posta por cima com a profundidade |
| `src/mundo-placa.js` | Com `?mundo=placa`: o céu e as faces dos pedaços pela placa |
| `src/p4.js` | Áudio, estado, física, IA — *é praticamente o servidor* |
| `src/p5a.js` | Rasterizador 3D — *é praticamente o cliente* |
| `src/p5.js` | HUD, telas, entrada como dado e o passo da simulação |
| `src/p5b.js` | Teclado, mouse e o laço principal — o canteiro não leva |

`teste/harness.js` roda o jogo sem navegador: stub de canvas, fila manual de
`requestAnimationFrame` e um gancho para o estado interno.

## O painel de ajuste

Para achar jogando os valores que ainda não estão decididos. Cada tecla mostra o
valor novo na tela, e **P** abre o painel com todos. Os valores ficam guardados
no navegador.

| Tecla | Ajuste | Padrão |
|---|---|---|
| **H** / **J** | Velocidade andando, de 5 em 5, de 30 a 200 | 65 = 3 tiles/s, uns 6,1 m/s |
| **Y** / **U** | Campo de visão horizontal, de 60 a 110 graus | 96 |
| **I** / **O** | Altura dos olhos, de 10 em 10 cm | 1,20 m (0,60 tile) |
| **T** | Resolução do mundo: 640×360 ou 320×180 | 640×360 |
| **F** | Contador de quadro, em ms de update + render | desligado |
| **L** | Volta tudo ao padrão, só com o painel aberto | |

A velocidade multiplica andar, agachar e o controle no ar; o dash não muda. Os
inimigos continuam na velocidade de antes. A régua do canteiro mede os
segundos andando nessa velocidade.

**X** liga a terceira pessoa: a câmera recua até 1,4 tile para trás e um pouco
acima da cabeça, parando antes de parede, piso e teto, e o jogador aparece como o
boneco escolhido no provador (`provador:v1` no navegador).

A tela é 16:9, com pixel quadrado, e cresce só por números inteiros de pixels do
monitor (`encaixarTela`, em `p5.js`). HUD, arma e menus são desenhados na tela
lógica de 320×180 e ampliados por cima do mundo, que vai até embaixo: o painel
fica nos dois cantos de baixo, sem faixa cortando a vista. Um ajuste guardado
antes da tela 16:9 só aproveita velocidade, olhos e contador.

## O mundo em pedaços

A geometria do mundo é montada **uma vez**, em pedaços de 16×16 tiles, e não
a cada quadro. Cada quadro escolhe as faces que se veem — dentro do alcance,
no cone de visão e de frente para a câmera — e as desenha de perto para
longe, com uma oclusão por blocos de 8×8 pixels que descarta a face escondida
inteira antes do rasterizador. Mexer num tile — uma porta que abre, uma peça
posta — suja só o pedaço dele e o dos vizinhos que olham para ele.

Uma **face** é um polígono de até oito cantos, cada um com a sua coordenada
de textura. A ordem dos cantos diz a frente: a normal aponta para quem vê, e
só a frente é desenhada.

Uma **peça** (`src/pecas.js`) é dado, não desenho: o tipo diz a forma e o
estilo diz os materiais. Ela vira faces, para o desenho, e **sólidos** —
prismas convexos com topo reto ou inclinado —, para a física. As três
perguntas da física (`src/solidos.js`) levam junto a altura de quem pergunta,
e é isso que faz vários andares funcionarem: embaixo da ponte o chão é a
estrada, em cima é o tabuado.

Trocar de mapa **não recarrega a página**: grade, alturas, telhados, ambiente
(céu, bruma, alcance e luz), geometria e coisas são remontados no lugar por
`trocarMundo`.

O pedaço só é **montado quando entra no alcance**. Abrir a ilha de 650 monta
uns 70 pedaços dos 1.681, saltar para longe monta outros 70 em 42 ms, e
andando sai um por quadro, a 1,5 ms. Montar todos custava 1 s no navegador,
e quem está num canto nunca vê o outro.

Mexer no terreno refaz **só o que mudou**: `atualizarTerreno` recalcula os
tiles mexidos e os vizinhos, os telhados que eles tocam — os de antes e os
de agora, que podem ter juntado ou partido — e suja os pedaços deles. As
peças também: o motor guarda a geometria de cada uma pelo id e só refaz a
que mudou. `teste/refazer.test.js` confere que o mundo refeito aos pedaços é
igual, face por face, ao montado do zero.

A **textura das peças** vem do estilo: cada material é uma receita que o
pintor (`src/pintor.js`) desenha pixel a pixel, sem canvas, com sorteio de
semente tirada do nome do material. Sai igual no jogo, no canteiro e no node,
em qualquer máquina. A textura é **presa no mundo**, não na peça: no chão, u e
v são o x e o y; na parede, u corre ao longo dela e v é a altura; no telhado,
u corre ao longo da beira e v sobe pela água. Duas peças no mesmo plano
continuam o mesmo desenho — a empena em cima da parede, o piso girado ao lado
do outro. Só a folha que abre (a vidraça, a veneziana, a porta) traz o
desenho dela inteiro, de 0 a 1 na folha.

## Os mapas

O jogo abre na ilha: sem endereço, ou com `?mapa=ilha`, abre `mapas/ilha.mapa`,
que o `build.js` embute no HTML. `?mapa=editor` abre o que o canteiro mandou
(o nome vem do editor antigo, e ficou), e
`?mapa=cripta` — ou um nome que não existe — abre a cripta.

`?mapa=ilha-650` abre a ilha grande, o rascunho de 650 tiles com o que o
canteiro construiu nele (ver *o conteúdo do pronto*), e `?mapa=gruta` a
dungeon dela.

Uma **entrada de dungeon** leva ao mapa escrito nela. A da ilha fica dentro da
capela de Pedra Alta e desce para a cripta, e o endereço guarda de onde se desceu
(`&volta=ilha,101,75`). Terminar a cripta oferece a volta com **E**. Trocar de
mapa **não recarrega a página**: o mundo é remontado no lugar e o endereço
acompanha, então recarregar abre no mesmo lugar.

A entrada e a **saída** podem vir em **par**: a entrada leva ao `mapa=` dela
com o `id=` do par (`&chegada=alcapao`), e no destino o jogador nasce ao lado
da saída do mesmo par; subir por ela o põe ao lado da entrada. A volta certa
não depende de coordenada guardada — mexer na ilha não quebra a descida.

Os **marcos** são as coisas que dizem o que o lugar faz, cada uma com os
campos dela (`k=valor`, sem espaço, no arquivo): início do jogador, ponto de
volta, morador, placa, entrada e saída, porta (com a chave que abre),
passagem secreta, alavanca (com o id do que abre), grade, armadilha, baú (com
o conteúdo), ninho de criaturas (qual, quantas, raio), luz (cor, raio,
tremor), som ambiente e gatilho de área. Todo marco aceita `z`, a altura do
piso em que fica — o baú no andar de cima. A **passagem secreta** pode ter
alternativas: várias com o mesmo `grupo`, e a `semente` do mapa sorteia qual
vale — a mesma semente, o mesmo segredo, em qualquer máquina e em qualquer
ordem de arquivo. Luz, som, gatilho, armadilha e ninho por enquanto só
guardam o dado: as regras de jogo deles ainda não estão decididas.

O arquivo é o **MAPA 2**: as três grades vão em pedaços de 32×32 tiles, com
corridas (`~*400`), e o arquivo traz também as peças, agrupadas por
construção — o estilo mora na construção. O **MAPA 1**, a grade de um
caractere por tile, continua sendo lido, e `canteiro/cli.js converter`
converte. A ilha de 200 tiles passou de 122 KB para 14 KB; o rascunho de
650×650, de 1.240 KB para 136 KB. O formato está documentado no topo de
`src/mapa.js`.

## Conversa e bolsa

Como no Tibia: **Enter** abre a linha de fala, e **oi** perto de um morador começa
a conversa. Dali ele responde a palavras, e as que ele entende aparecem em azul
nas falas dele — é assim que se descobre o que perguntar. **Tchau**, ou se
afastar, encerra. As falas moram em `src/conversa.js`, por morador: Tobias vende
poção e cristal, Bruno vende escudo, a Irmã Clarice cura, e os outros contam da
cidade, da cripta e do rei demônio.

**B** abre a bolsa, com o ouro — 25 para começar — e o que se comprou. **4** usa a
poção e **5**, o cristal.

## O editor de mapa, aposentado

O editor de mapa antigo (`editor/editor.html`) foi aposentado: o canteiro,
abaixo, faz tudo o que ele fazia, no mesmo formato e com o mesmo desfazer.
Dele ficaram, em `editor/`, os módulos que o canteiro e o ateliê usam:

| Arquivo | Conteúdo |
|---|---|
| `editor/operacoes.js` | Pincel, balde, retângulo, rampa, traço, suavizar, espalhar, coisas, carimbo, redimensionar, desfazer. Puro, testado no node |
| `editor/png.js` | O PNG sem dependência, para a linha de comando |
| `editor/escapar.js` | Troca acento por escape, para o fonte continuar ASCII |
| `editor/conversor.js`, `vistas.js`, `molde.js`, `personagem.js`, `vox.js`, `wgvox.js` | O personagem desenhado e os voxels (ver *o ateliê*) |

O que o editor fazia e onde está no canteiro: **pintar terreno acerta a
altura do mar** (as mesmas operações); a **régua**, agora andando; as
**curvas de nível**; a **imagem de referência** para decalcar (Vista, no
macro); o **rascunho** no navegador; os **avisos**, agora a lista de
problemas que leva ao lugar; **Ver no jogo** (J); **Começar daqui** vira **K**
(ir até lá) e **J** (abrir o jogo ali, olhando para onde a câmera olha); o
**carimbo** (C), que agora leva também as peças e os campos dos marcos; o
**conta-gotas** (I); **nome, mar, semente, redimensionar e o mapa novo** —
ilha ou dungeon, com o tamanho — no bloco Mapa do macro.

## O canteiro

`canteiro/canteiro.html` é a ferramenta de criação de mundo: abre direto do
disco no Chrome ou no Edge, ou servida por http com
`?abrir=mundo-perigoso/mapas/ilha.mapa`. **Ctrl+S** grava por cima do mesmo
arquivo, e a cada pausa o mapa vai para o rascunho do navegador.

Ela tem dois modos sobre o mesmo arquivo, e **Tab** troca de um para o outro
no mesmo ponto. O **micro** entra no mapa com o motor do jogo — as mesmas
texturas, a mesma luz, a mesma névoa, a mesma física — e constrói peça por
peça. O **macro** é a vista de cima, onde se faz a geografia: relevo, costa,
estrada, rio e as regiões nomeadas.

A página carrega os módulos de `src/` direto, até `p5.js`. O que fica de fora
é `p5b.js`, o teclado, o mouse e o laço do jogo: a ferramenta põe os dela por
cima. **O jogo publicado não leva nada do canteiro**, e o canteiro não tem
cópia do motor.

| Tecla | No micro |
|---|---|
| **WASD**, mouse | andar e olhar, com a física do jogo |
| **N** | trocar entre andar e voar (o voar é o mesmo do `N` do jogo) |
| **clique** | pôr a peça onde está o fantasma |
| **clique direito** | tirar a peça que está na mira |
| **1..9** | a casa da barra de peças |
| **/** | procurar peça pelo nome |
| **R**, **Shift+R**, **F** | girar 90°, girar ao contrário, espelhar |
| **T** | girar 45° — só a peça que aceita: parede, meia parede, cerca, guarda-corpo |
| **E** | encaixe ligado ou desligado |
| **Q**, **botão do meio** | conta-gotas: a peça da mira vai para a mão, com giro e construção |
| **V** | o estilo escolhido só na peça da mira |
| **U** | abrir ou fechar a porta, a janela, a veneziana ou a grade da mira — fica assim no mapa |
| **M** | pôr o marco escolhido na mira |
| **B**, **B** | a seleção em caixa: um canto, o outro (e B de novo larga) |
| **Ctrl+C**, **Ctrl+X**, **Ctrl+V**, **Delete** | copiar, recortar, colar, apagar a seleção |
| colando: **R**, **F**, clique, **Esc** | girar o modelo, espelhar, colar, largar |
| **G** | grade: quarto de tile, meio tile, tile |
| **J** | ver no jogo, no ponto onde a câmera está |
| **Ctrl+Z**, **Ctrl+Y** | desfazer e refazer, no mesmo histórico do macro |

O **fantasma** da peça aparece na mira num pontilhado verde se ela cabe e
vermelho se não cabe, com o motivo escrito: *fora do mapa*, *dentro de outra
peça*. *Sem apoio embaixo* é aviso, não impedimento — ponte e sacada nascem
no ar de propósito. A peça encosta na face que se mira, como em qualquer
editor de blocos: mirando o alto de uma parede, a próxima nasce em cima dela.

O **encaixe** cola a peça na mão num encaixe de uma peça de perto, a menos de
0,45 tile — mais que a diagonal de um quarto de tile, o passo da grade: a
ponta da parede na ponta da outra (a quina fecha sozinha), o pé da parede no
alto da de baixo (o andar de cima), a borda do piso na do outro, o alto da
escada no meio da borda da laje. A barra de baixo diz o que encaixou em quê.

**Trocar** uma peça por outra da mesma família: com a janela, a porta, a
veneziana ou o arco na mão, mirar numa parede mostra "troca parede por
janela", e o clique troca — no mesmo lugar, com o mesmo giro, na mesma
construção, um Ctrl+Z só. O mesmo vale para muralha e seteira, e para cerca
e portão de cerca. A **empena** posta acima de uma parede desce
sozinha até o alto dela, e vira trapézio: a ponta do telhado fecha sem peça
de enchimento.

**Porta, janela e veneziana abrem e fecham.** A parede com porta já vem com a
folha de tábua; a parede com janela, com a vidraça (o vidro é o pixel que o
motor não desenha, e se vê a rua através dele); a janela com veneziana, com as
duas folhas de tabuinha. Fechadas, barram o corpo; o campo `aberta=1` as abre
— a porta e a vidraça para dentro, que é o +y da parede, e a veneziana
dobrada para fora, contra a fachada. **U** na mira vira uma e outra no mapa, e
é assim que o jogo começa; no jogo, o **E** abre e fecha a que está na frente
(e não fecha em cima de quem está no vão). A grade levadiça e o portão de
cerca também. A **folha de porta** solta é para o arco: encaixa no batente
dele, e o alto dela entra na curva.

O **estilo mora na construção**: cada peça posta entra na construção da vez, e
*Trocar o estilo dela* troca a textura da casa inteira sem mexer na forma.
Escolher outro estilo no meio de uma casa abre uma construção nova com ele.
Uma peça sozinha pode ter o estilo dela (**V**), num campo `estilo=` da
linha dela no arquivo — a porta de madeira na casa de pedra.
São oito estilos: madeira de pescador e pedra rústica de vila (casa), pedra
de fortaleza humana (castelo), cripta de pedra e caverna natural (dungeon),
madeira de porto e pedra de obra (infraestrutura), rocha e penhasco
(natureza). Um estilo novo é uma entrada em `src/estilos.js`.

### O catálogo

São **68 tipos de peça** em sete categorias, e todos saem em qualquer um dos
oito estilos — a parede da fortaleza sai grossa e alta, a da casa fina:

- **casa**: parede, meia parede, parede com janela, janela com veneziana,
  parede com porta e a folha da porta, arco, canto de fora e de dentro, fim de
  parede, pilar, coluna, piso, laje, forro, degrau, escada reta, escada
  caracol, guarda-corpo, sacada, água de telhado, beiral, cumeeira, espigão,
  empena e chaminé;
- **castelo**: muralha, ameias, muralha com adarve, seteira, portão em arco,
  grade levadiça (erguida com `aberta=1`), ponte levadiça, torre quadrada,
  torre redonda, guarita e escada de muralha;
- **dungeon**: parede com nicho, sarcófago, estalagmite;
- **natureza**: rocha pequena, rocha, rocha grande, penhasco e laje de pedra —
  a rocha sorteia a forma pelo lugar, então sai sempre igual ali e diferente
  da vizinha;
- **infraestrutura**: rampa, píer, cais, trecho de ponte, ponte em arco, muro,
  cerca, portão de cerca, poço e fonte;
- **interior**: mesa, cadeira, cama, estante, balcão, lareira, baú, barril e
  altar;
- **luz**: tocha de parede, lampião, vela e braseiro. A chama é um material
  universal, o mesmo em todo estilo, desenhado aceso; a luz de cada uma (cor,
  raio, tremor) fica guardada no tipo — o motor ainda não acende nada.

Cada tipo é montado com meia dúzia de **formas simples** — o pano de parede
com vãos, a caixa, o prisma de um polígono, o anel, o plano inclinado, a
escada e o arco dentro do pano —, e os **encaixes** (a ponta e o alto da
parede, a borda do piso, o pé e o alto da escada) saem delas, então sempre
batem com a geometria. Face de mais de oito cantos, como o topo da torre de
doze lados, vira um leque de pedaços que o rasterizador aceita.

No micro, o catálogo fica no painel: a **barra de nove** (as teclas 1..9), a
busca — sem acento, "balcao" acha "balcão" —, as categorias e a grade de
miniaturas, todas no estilo da construção da vez: trocar a casa de madeira
para pedra troca as miniaturas junto. Clicar numa miniatura põe a peça na
casa escolhida da barra, como no modo criativo de todo jogo de blocos; a
barra fica guardada no navegador.

A **miniatura** de cada peça é desenhada pelo próprio motor: `assarMiniatura`
(em `p5a.js`) desenha num buffer à parte, com uma câmera de três quartos e
sem névoa, e devolve tudo como estava — o mundo aberto não percebe. É a mesma
função que a folha do catálogo usa na linha de comando.

No **macro**, na camada de coisas, o clique num tile vazio põe a coisa com
os campos do tipo; num tile que já tem, escolhe ela, e o painel mostra os
campos — a lista vira escolha, o sim vira caixa, a cor vira cor. Campo que
não serve (com espaço, número que não é número) não entra e diz por quê. No
**micro**, **M** põe o marco escolhido na mira, com o `z` do piso mirado, e os
marcos aparecem na vista como um poste fino da cor deles com a letra em cima.

A **seleção em caixa** vira um **modelo** (`canteiro/modelo.js`): as peças
com o lugar relativo ao canto da caixa, agrupadas pelo estilo da construção.
Colar dá uma construção nova com o mesmo estilo, que se troca sozinha depois.
Girar um quarto de volta gira o lugar de cada peça e soma 90 ao giro dela;
espelhar troca o espelho, inverte o giro e anda o canto da peça o
comprimento dela — que o estilo pode mudar, então a conta pergunta o tamanho
ao tipo. O teste confere que o modelo girado ou espelhado dá exatamente os
sólidos de antes girados ou espelhados. **Salvar modelo** grava um
`.modelo`, que é o trecho `[pecas]` do MAPA 2 com o lugar relativo, e
**Abrir modelo** o põe na mão.

O **lote** (`canteiro/lote.js`, tecla **H** no macro) é o "construa uma casa
no estilo X aqui": arrasta-se um retângulo, e o chão dele é nivelado no mais
alto, o forro pintado sai e sobe uma casa de um ou dois andares, de frente
para o lado escolhido: porta na frente, janela sim, janela não, escada
encostada na parede do fundo com o vão da laje sobre o lance inteiro,
sacada com porta no andar de cima, telhado de duas águas com as empenas e
chaminé, piso no térreo (meio degrau acima do chão), um pilar da espessura
da parede em cada quina e o forro no último andar. Toda parede vai com o
lado de dentro para dentro de casa: a porta e a vidraça abrem para a sala.
Tudo num Ctrl+Z só, e depois a casa se mexe peça por peça no micro.
O teste anda com o jogador da rua até a sacada, e confere pela grade de andar
que se entra, se sobe e se sai na sacada nos três estilos — foi assim que a
casa de fortaleza ganhou a escada a meio tile da parede grossa.

Toda peça tem um **id**, que não vai para o arquivo — ao ler, as peças são
numeradas na ordem. É por ele que a mira, o desfazer e o motor acham a peça,
e o histórico guarda só as peças que entraram, saíram ou mudaram.

No **macro**, o mapa inteiro vive numa imagem de um pixel por tile que o
canvas estica com o zoom: na ilha de 650×650, desenhar custa de 0,2 a 1,2 ms
e um traço de pincel de 9 tiles custa 0,3 ms. Ao soltar o traço, o motor
refaz só os tiles dele — de 2 a 10 ms —, então o micro já mostra o que o
macro pintou. Ação, desfazer e refazer passam pelo mesmo caminho, que lê no
registro do histórico o que mudou.

| Tecla | No macro |
|---|---|
| **1..5** | camada: terreno, altura, teto, coisas, regiões |
| **B F R A T E M K** | pincel, balde, retângulo, rampa, traço, espalhar, régua, ir até lá |
| **L** | alcance: pinta de vermelho o chão sem caminho do início do jogador |
| **H** | lote: arrastar um retângulo e erguer uma casa nele |
| **I** | conta-gotas: o valor da camada no tile vai para o pincel |
| **C**, **G**, **Esc** | carimbo: arrastar copia o pedaço — chão, relevo, teto, coisas e peças —, cada clique carimba; G gira, Esc larga |
| **F7** | conferir tudo: o alcance andando e o pior quadro entram na lista de problemas |
| **O** | relevo: arrastar um retângulo sobe morros de ruído no chão dele — força, tamanho e semente no painel |
| **V** | vista: clicar num tile mostra o que se vê dali até 60 tiles, em pé, do alto da torre ou voando |
| **[** **]** | tamanho do pincel |
| **roda**, **espaço+arrastar** | zoom e arrastar a vista |
| **0** | enquadrar o mapa inteiro |

A **rampa** entre dois pontos preenche os degraus sem passar de um por tile —
que é o que se sobe andando — e avisa quando a subida não cabe no
comprimento. O **traço** pinta estrada, rio ou muro com a largura escolhida e
acerta o relevo embaixo: a estrada vira rampa entre as pontas. A **encosta de
pedra** é o terreno novo do chão da montanha: tem cara de rocha e se anda em
cima, enquanto a rocha continua sendo o penhasco. **Espalhar** semeia mato com
regra: nada nasce em estrada nem encostado em parede.

A **região** é um pedaço do mundo com nome, perigo, música e som ambiente. As
regras de jogo disso ainda não estão decididas: a ferramenta guarda o dado.

O **relevo** (O) sobe morros de uma vez: um ruído suave, em três oitavas,
somado ao chão do retângulo e sumindo na beira, só no chão (água e rocha
ficam). A mesma semente dá os mesmos morros. Com "que se ande", o pico é
aparado até nenhum tile ficar mais de um degrau acima do vizinho mais baixo:
o morro se sobe de qualquer lado.

Duas camadas olham o mapa em vez de mexer nele (`canteiro/olhar.js`):

- o **vazio** (na Vista) pinta quantos tiles se anda de cada chão até a coisa
  interessante mais perto — um marco ou uma construção. A regra do DESIGN é
  algo novo a cada 20 a 40 segundos de caminhada: amarelo chegando em 60
  tiles, vermelho de 60 a 120 e além, e vermelho inteiro onde nenhuma fonte
  chega, do outro lado de um rio. Na ilha de 650 leva uns 70 ms;
- a **vista** (V): de um tile, na altura do olho, o que se vê até o alcance
  do motor, com o relevo e a rocha tapando — onde pôr a torre que se vê de
  longe, a curva que esconde o que vem.

`canteiro/cli.js` faz o mesmo sem navegador: `converter`, `validar`,
`exportar`, `planta` (a vista de cima em PNG, com a cor do macro), `vista`
(um quadro do jogo em PNG), `ver` e `catalogo`.

### A grade de andar

`src/andar.js` diz onde se fica em pé e aonde se chega andando. Há um ponto a
cada meio tile — o meio e o canto de cada tile, então o corredor de um tile
passa pelo meio e a parede fina cai entre dois pontos —, e cada ponto guarda
os pisos onde o corpo do jogador cabe: o chão, o piso da casa, a laje do
andar de cima, o topo da muralha.

Ela **não tem regra de física própria**: quem responde se bate, que chão fica
sob o pé e que teto fica sobre a cabeça é o motor, as mesmas perguntas que
movem o jogador. Um passo de um ponto ao vizinho sobe até um degrau (0,42) e
desce qualquer altura; a escada, que sobe mais que um degrau a cada meio
tile, é conferida em oitavos, como o jogador a sobe. E como o jogador agacha
— sozinho debaixo de teto baixo, ou com **C** —, aonde se chega é com o corpo
agachado, e o passo que só dá agachado fica marcado.

O ponto vale pela **célula** dele: se o corpo não cabe bem no ponto mas cabe
até um quarto de tile ao lado, o piso fica guardado com esse desvio — o de
mais folga. E o passo que raspa, perto de peça, procura uma **raia** paralela
até um quarto de tile para o lado. As duas coisas existem pela porta de uma
parede posta num quarto de tile, que a grade das peças deixa: o vão dela cai
entre dois pontos, e sem isso a grade dizia que ali não se passa.

O teste anda com o jogador, pela física do jogo, o caminho que a grade achou,
e ele chega — pela escada, agachado debaixo da laje baixa, por cima da ponte e
pela porta fora da grade. Todo tipo de peça diz o que o corpo faz com ele —
`barra`, `passa`, `sobe`, `pisa`, `obstaculo` — e ganha o teste de graça:
a porta abre a sala, a parede fecha, a escada leva ao alto, e de fora não se
chega ao meio da fonte.

A porta, a janela e a grade fechadas são **sólido de porta**: barram o corpo
no jogo, mas a conta de quem alcança o quê — a grade, a validação, a régua —
passa por elas, porque no jogo elas abrem. É o `PORTAS_DAS_PECAS.abertas`
de `src/solidos.js`, que o `comPortasAbertas` do canteiro liga enquanto a
conta roda, junto com as portas do terreno.

Na ilha de 650 no navegador: montar a grade inteira leva 3,4 s (1,7 milhão de
pontos) e percorrer tudo, 2,4 s. Na de 200, 0,5 s e 0,3 s.

No macro, ela aparece de dois jeitos, e os dois andam aos poucos, sem
travar a tela:

- A **régua** (M) mede o caminho andando, não a linha reta: contorna o morro,
  atravessa pela ponte, entra pela porta, e diz quanto tempo leva na
  velocidade do painel de ajuste, quantos degraus sobe e quanto vai
  agachado. A busca é um A* que só acha os pisos dos pontos por onde passa;
  o caminho em cruz que ela acha é depois esticado em retas que o corpo anda
  de verdade, conferidas com a física. Na ilha de 650, um caminho de 365
  tiles sai em 0,7 s. Clique na água mede do ponto em pé mais perto.
- O **alcance** (L) pinta de vermelho o chão onde se fica em pé mas não se
  chega a partir do início do jogador. No rascunho da ilha de 650 ele
  mostra de cara o que falta: a montanha sem rampa, e tudo do outro lado dos
  rios, que ainda não têm ponte. Mexer no mapa deixa a camada apagada; L
  refaz. É o mesmo chão que a validação conta (ver abaixo).

### A validação

A lista de **Problemas**, no alto do painel, diz o que está errado no mapa e
onde. **Erro** é o que quebra no jogo, e impede exportar; **aviso** é o que
vale olhar. Clicar num problema leva até ele: no macro a vista centra e marca
o lugar — e todos os lugares do mesmo problema —; no micro a câmera vai
voando para uns três tiles dele, olhando, com as peças do problema em
amarelo. O mesmo problema em muitos tiles, a areia abaixo do mar numa praia
inteira, é um item só, e clicar de novo vai ao próximo lugar.

Sozinha, meio segundo depois de cada mudança, sem motor
(`canteiro/validacao.js`):

- o **formato**: campo que não serve, id repetido, coisa dentro da parede, o
  início do jogador;
- as **ligações entre mapas**: a entrada leva a um mapa que existe, o par dela
  está lá — quem sobe pela saída nasce ao lado da entrada certa — e a ponta de
  lá volta para cá; a chave da porta está num baú de algum mapa; o morador tem
  conversa própria em `src/conversa.js`;
- as **peças**: duas iguais no mesmo lugar; peça solta no ar, que não encosta
  em chão, rocha, teto nem numa peça que encoste — a casa inteira erguida por
  engano é um aviso só —; peça enterrada.

Com **Conferir tudo** (**F7**) entra o motor (`canteiro/alcance.js`):

- o **alcance andando** do início do jogador. O morador, a entrada, a saída, o
  baú e a alavanca que não se alcançam são erro. O marco só conta como
  alcançado se o piso perto dele o enxerga — o morador a um tile da parede não
  se alcança de fora dela. O chão ilhado — o platô sem rampa, a casa sem
  porta, a margem sem ponte — é aviso, com os pedaços do maior para o menor, e
  é o mesmo chão que a camada vermelha do **L** pinta: alto de rocha e telhado
  ficam de fora. E a escada cujo alto não tem onde ficar, ou que se alcança
  pelo pé e não se sobe;
- o **pior quadro**. Dos pedaços com mais faces por perto, o motor monta a
  lista do quadro olhando para oito lados, e nas vistas mais cheias desenha de
  verdade, três vezes, e fica o tempo mais curto. O tempo é **medido**, neste
  computador: nenhuma conta de faces e pixels acertou o tempo na bancada,
  porque o pixel que o z-buffer recusa custa bem menos que o pintado. O limite
  é 33 ms, 30 quadros por segundo. Na ilha do jogo o pior lugar leva 8 ms no
  navegador.

Os outros mapas vêm da pasta `mapas/` do jogo (botão **Pasta**, no Chrome e no
Edge) ou, servido por http, do `../mapas/` ao lado, conforme as entradas
pedem. Só com a pasta o conjunto é completo; sem ela, o destino que não se
achou é aviso de "não conferi", e não erro. O **nome no jogo** é o nome com
que o mapa vai para `mapas/` — o do arquivo, se não se disser outro.

**Exportar** confere tudo e, sem erro, grava em `mapas/`; o
`build.js` monta o jogo com ele. **Salvar** continua gravando o arquivo de
trabalho, com erro ou sem: o que a validação barra é a ida para o jogo.

```
node mundo-perigoso/canteiro/cli.js validar mundo-perigoso/Arte/ilha-650.mapa             # tudo, com os mapas de mapas/
node mundo-perigoso/canteiro/cli.js validar mundo-perigoso/Arte/ilha-650.mapa --rapido    # sem o motor
node mundo-perigoso/canteiro/cli.js exportar mundo-perigoso/Arte/ilha-650.mapa ilha       # confere, grava mapas/ilha.mapa e monta o jogo
```

Na linha de comando o motor roda no harness dos testes, com as texturas
desenhadas por um canvas em software (`teste/canvas.js`): sem elas o mundo
saía transparente, nada escrevia no z-buffer e o tempo do quadro não dizia
nada. Com elas, o pior quadro da ilha do jogo leva 10 ms no node e 8 ms no
navegador.

`cli.js vista mapa.mapa x,y,graus` grava um quadro do jogo de dentro do mapa
num PNG, desenhado pelo motor — para olhar um lugar sem abrir o navegador.

### O conteúdo do pronto

O pedido do canteiro terminava numa lista de "pronto" — o que a ferramenta
tinha que conseguir construir. Está em `mapas/ilha-650.mapa` e
`mapas/gruta.mapa` (e as cópias de trabalho em `Arte/`), feito por
`canteiro/bancada/pronto.js` com as mesmas operações da ferramenta, sobre o
rascunho de 650 do Leandro — a geografia dele fica:

- **a montanha que se sobe**: a rocha esculpida de encosta suave virou
  encosta de pedra, e a de mais de um degrau ficou rocha, os penhascos. Uma
  trilha de terra sobe em rampa, com patamares, da fortaleza ao pico — 189
  tiles andando da praça, uns 40 segundos —, onde fica a forja do Bruno;
- **Pedra Alta**, ao sul da montanha: a praça com o poço, as duas ruas de
  pedra, cinco casas do lote — a de dois andares com sacada foi erguida em
  madeira e trocada para pedra —, a ponte de pedra de dois arcos sobre o
  riacho e os sete moradores, cada um com a conversa dele;
- **a fortaleza** na saída norte: a muralha com adarve e ameias, as torres
  redonda e quadrada nas pontas, as escadas de dentro até o adarve, o portão
  com a grade levadiça erguida, o fosso e a ponte levadiça;
- **a gruta**: três salas — a cripta de pedra, a caverna e a sala do tesouro
  — nos dois estilos de dungeon, com a boca ao lado do primeiro patamar da
  trilha e a saída em par com ela: quem sobe nasce ao lado da boca;
- **as regiões**, com nomes de proposta, cada tile de terra na da semente
  mais perto.

A validação inteira dá zero erro; o aviso que sobra são as terras do outro
lado dos rios, que o rascunho ainda não liga por ponte nem vau. O pior
quadro leva 10 ms. `teste/pronto.test.js` confere tudo isso, e anda da praça
ao pico com a física do jogo.

## O simulador de build

`simulador/simulador.html` abre direto do disco. Monta um personagem sem classe:
atributos, o disco de perícias, a especialização e a árvore própria dela, o que
isso dá em vida, velocidade e crítico, e o que a morte e o mago da memória tiram
dele. Uma caixa faz o clérigo trair e virar necromante, convertendo a build no
lugar.

Toda regra mora em `src/regras.js`, que não entra no jogo ainda e é o mesmo
arquivo que ele vai ler. Ajustar o equilíbrio é mexer nele, e o simulador mostra
o efeito na hora.

Para publicar como link, junte tudo num arquivo só:

```bash
node mundo-perigoso/simulador/montar.js caminho/da/saida.html
```

## O provador

`provador.html`, na raiz, é montado pelo `build.js` junto com o jogo: a página de
`src/provador.html` e `src/provador.js` em volta de `p2.js`, `p3.js`, `p3b.js` e
`p3e.js`. O personagem gira pelos oito rumos, anda e troca de peça em oito
espaços. A escolha fica guardada no navegador, na chave `provador:v1`, e é dali
que o jogador sai na tecla `X` (terceira pessoa), no jogo.

O corpo (`personagens/humano.personagem`) sai do **ateliê** (`atelie/`,
seção abaixo): vinte quadros já posados, cada um com a grade 80×56×117 e as
juntas daquele quadro. O jogo não gira o corpo — `gradeDoPersonagem()` pega a
grade do quadro e `esqueleto()` devolve as juntas dele, e as peças de roupa,
armadura e equipamento são penduradas nelas e pintadas por cima. As peças
continuam provisórias, de cápsula, e esperam as referências desenhadas. Uma
peça é uma função em `PECAS`, em `src/p3e.js`, que devolve primitivas de
voxel penduradas no esqueleto da pose; as de posição fixa (peitoral, cinto,
capa) usam `cx`, `cy` e `dz`, o quanto o meio do tronco saiu do lugar em
relação ao parado do próprio arquivo.

Sem arquivo de personagem (ou com um `PERSONAGEM 1`, o formato de antes, de
uma grade só), o jogo volta ao corpo de bolas, posado pela fórmula e pela
captura antiga (`esqueletoDaFormula`, `ANDAR_MOCAP`, `ATAQUE_MOCAP`).

A animação é do ateliê: rotação por osso a partir da bind pose, com peso de
osso repartido e pele por quaternião dual. São vinte quadros — parado,
respirar, andar (6), correr (4, disparada no dash), pulo, atacar, conjurar,
bloquear e arco (2 cada, exceto pulo e bloquear) — assados nos oito rumos aos
poucos, dentro do laço do jogo e do laço do provador (`novaFornada`/
`trabalhar`), para não travar a página assando 160 imagens de uma vez. Em terceira pessoa o
personagem segura a arma equipada de verdade (`ARMA_DO_WPN`, em `src/p5.js`),
não a escolha do provador, e troca de fornada sozinho quando o jogador troca
de arma.

## O ateliê de personagem

`atelie/atelie.html` abre direto do disco, no Chrome ou no Edge, e cobre o
personagem inteiro sem sair dele: esculpir, rig, peso de osso, animar, prévia
com o assador do jogo, validar e exportar. `atelie/cli.js` faz o mesmo fluxo
sem navegador. O projeto do humano é `Arte/personagens/humano.atelie`, e ele
sai da receita `Arte/personagens/humano.receita.json` (o modelo e quais
capturas vão em quais animações); o que o jogo lê sai do projeto. As duas
passagens são byte a byte (`teste/atelie.test.js` confere).

**Ver em 117, 165 ou 256 voxels (30/9).** A caixa *N voxels*, no alto, mostra o
mesmo personagem em outra quantidade de voxels (`atelie/resolucao.js`). Vale
para os projetos que guardam a **fonte de alta resolução** (o volume colorido
de onde o corpo de 117 saiu, no bloco `fonte` do `.atelie`; o
`sondagens/7-tres-vistas/tresvistas.js` já a grava): o corpo, o peso e as poses
são refeitos nessa escala, o esqueleto e as larguras só mudam de escala, e a
raiz das poses divide por K na volta. Em 165 e 256 **só se olha e se anima**;
para esculpir, rig, peso, captura, validar e exportar, volta-se para 117. O
que se pintou à mão no corpo de 117 não vai para as outras resoluções (elas
saem da fonte). A primeira troca leva uns segundos (o peso; 27 s em 256 no
navegador), e as seguintes saem do cache. Salvar grava sempre o projeto de 117,
com as animações de volta. O humano de camisa não tem fonte: a caixa fica
desligada.

| Etapa | O que faz |
|---|---|
| **Esculpir** | Pincel de pôr, tirar e pintar voxel, balde, espelho E/D ligado, desfazer. Imagem de referência de frente, lado e costas atrás do corpo. Importa `.wgvox`, `.vox` e `.personagem`: altura vira 117, cor por média de RGB, macio por dentro, e a paleta cai para as **54 cores** que o jogo aguenta (92 das 255 entradas são rampas das peças, e cada cor do corpo vira 3 tons). |
| **Rig** | Propõe as 13 juntas pela silhueta em T-pose, simétricas; arrastar ajusta e espelha. A bind pose é T-pose numa caixa de 140 de largura — o humano tem 107 de envergadura, e a conversão antiga, cortando em 80, tinha arrancado as duas mãos. |
| **Peso de osso** | Cada voxel reparte peso entre dois ossos pai e filho, calculado por **distância geodésica** (andando por dentro do corpo, como o "geodesic voxel binding" do Maya): a mão encostada na coxa continua do braço. Faixa de mistura por junta, pincel de somar, tirar e suavizar, e o pintado à mão sobrevive ao recálculo. |
| **Animar** | Pose é rotação por osso; os ângulos do painel são anatômicos (frente, abrir, torcer) a partir do parado. Arrastar mão ou pé dobra braço ou perna sozinho (IK). Espelhar, ciclo espelhado, entre vizinhos. Importa captura de movimento (BVH, JSON de posições, JSON de rotação tipo SMPL) e redireciona para o rig: o ângulo vem da captura, o comprimento de osso é o do rig. Num ciclo (andar, correr) acha o trecho que se repete, começa na passada mais aberta e espelha a segunda metade; numa ação usa os quadros pedidos. |
| **Prévia do jogo** | Um iframe carrega `src/p2.js`, `p3.js`, `p3b.js` e `p3e.js` **do jogo** e assa o `.personagem` exportado nos oito rumos, com as peças de verdade — o que aparece é o que o jogo mostra. |
| **Validar e exportar** | Em todos os quadros: voxel fora da grade, pedaço solto maior que 20 voxels (vizinhança 6), volume mudando mais de 15%, silhueta mais larga do que o mesmo quadro posado duro (inchaço), peso entre ossos não vizinhos, paleta grande demais. Erro impede exportar. |

| Arquivo | Conteúdo |
|---|---|
| `atelie/nucleo.js` | Os fatos do jogo (grade, juntas, repouso, quadros, paleta, lugar da mão da arma) e vetor, quatérnio |
| `atelie/corpo.js` | O corpo em bind pose: cor e peso por célula, importar, reduzir cores, esculpir, desfazer |
| `atelie/rig.js` | Rig proposto, cinemática direta, redirecionar, espelhar, IK, ângulos anatômicos, pé no chão |
| `atelie/pesos.js` | Peso geodésico e o pincel de peso |
| `atelie/deformar.js` | A pele posada por quatérnio dual, na grade do jogo |
| `atelie/animacao.js` | Animações do jogo, as poses antigas, amostrar clipe, achar ciclo |
| `atelie/escritas.js` | Andar, correr, pulo, atacar, conjurar, bloquear e respirar escritos em ângulo |
| `atelie/encaixe.js` | Caber no jogo: encaixa na grade e amortece — pernas, corpo, braços — só o necessário |
| `atelie/captura.js` | BVH, JSON de posições e de rotação (SMPL), redirecionados; de captura para animação do jogo |
| `atelie/validar.js` | A validação |
| `atelie/arquivos.js` | `.atelie`, `.personagem` (PERSONAGEM 2) e `.pele` — os três formatos documentados no topo |
| `atelie/vista.js`, `painel.js`, `atelie.html` | A tela: WebGL, mouse e painéis |
| `atelie/previa.html`, `previa.js` | A prévia com o código do jogo |
| `atelie/folha.js`, `cli.js` | Folha de contato em PNG e a linha de comando |

**O gerador local (3/10).** `cli.js gerar <folha.png>` faz a folha de
frente, perfil e costas em T-pose virar projeto do ateliê nesta máquina: o
`atelie/gerador.js` recorta as três vistas em PNG RGBA (fundo transparente,
figura no meio, 10% de margem); o `ferramentas/gerador/gerar.py`, com o
Python de `C:\ferramentas\gerador`, faz a forma com o Hunyuan3D-2mv turbo
(só a forma, sem cor); e o `tresvistas.js --forma` pinta a forma com o
desenho e grava o `.atelie` com fonte, rig, peso com pano e capturas. Com
`--jogo`, exporta o de 256. A forma sem textura não serve de guia de cor no
`tresvistas.js` (`semCor`). Instalação, opções e licença em
`ferramentas/gerador/LEIA-ME.md`; a medição contra o Sorceress em
`sondagens/17-gerador-local/`.

**A `.pele`** leva o corpo com peso de osso (dois ossos e o peso por voxel),
o rig e as poses em quatérnio. O jogo ainda não lê: é o caminho para o próprio
motor fazer a pele e a pose deixar de ser uma grade assada por quadro — o que
também encolheria o arquivo (1,5 MB de grades contra 180 KB de pele).

**A arma não gira com a mão.** As armas do jogo apontam sempre para o mesmo
lado a partir de `maoD`, então uma mão alta põe a ponta da espada fora da
grade. Toda pose que vai para o jogo — escrita ou capturada — passa por
`caberNoJogo` (`atelie/encaixe.js`): encaixa na grade mexendo a bacia e, se
não bastar, amortece por grupo — só as pernas (uma passada de corrida de
verdade é mais comprida que os 56 voxels de fundo) ou só o tronco (a cabeça
inclinada leva o capuz para fora), o que mudar menos; o corpo inteiro só se
nenhum bastar; e por fim só os braços, para a mão ficar em
`LUGAR_DA_MAO_DA_ARMA` — em vez do número mágico de antes. A cabeça também
tem lugar (`LUGAR_DA_CABECA`): as peças de cabeça — elmo, capuz, cabelo,
pena — seguem a junta da cabeça, e não o meio do tronco, e são maiores que
ela.

**O corpo tem 115 de altura numa grade de 117.** Com o topo da cabeça parada
no teto, nenhum passo consegue subir a bacia — e na passagem de uma caminhada
de verdade o corpo sobe.

**Andar e correr são captura de movimento da CMU** (`Arte/captura/`, com os
créditos e o que foi testado e ficou de fora); pulo, atacar, conjurar,
bloquear e respirar são escritos.

## Regras que os testes protegem

Cada uma existe porque já quebrou uma vez.

- **Toda peça é um sólido inteiro, de qualquer lado.** O motor só desenha a
  face do lado para onde aponta a normal de Newell dos cantos dela; a
  `caixa`, o `pano` e o `prisma` saíam com as laterais viradas para dentro,
  e de fora se via o avesso do fundo — a escada sumia de lado, a chaminé era
  uma folha, a parede parecia papel. Só 2 dos 68 tipos estavam inteiros. O
  teste (`teste/malha.js`) desenha cada tipo, em cada estilo, girado e
  espelhado, de 65 direções, e compara com todas as faces dos dois lados.
  Face escrita à mão vai por `Forma.convexo`, que vira cada uma para fora.

- **A textura é do mundo, não da peça.** Cada peça começava o desenho no
  primeiro canto dela, e a pedra da empena não batia com a da parede de
  baixo — o Leandro viu o buraco fechado "claramente desalinhado". O uv sai
  dos cantos já postos no lugar (`uvDoMundo`, em `src/pecas.js`), e o teste
  confere que a empena continua o desenho da parede.

- **A porta fechada barra o corpo e não barra a conta.** A casa com a porta
  fechada tem que ser alcançável na validação, e o jogador não pode passar
  por ela no jogo sem abrir: o sólido da folha leva `porta: true`, e só a
  conta de quem alcança o quê o pula.

- **A armadura cobre a roupa, e o enfeite fica por fora de tudo.** Trocar a cor
  do enfeite não mexe em voxel nenhum nem na rampa de outro material: cosmético é
  enfeite, e nunca troca o material da armadura.
- **Arma e escudo ficam para fora da silhueta.** Em 24 voxels de largura, o que
  fica dentro do corpo some sem dar erro nenhum.

- **O corpo do jogo sai do projeto do ateliê, byte a byte.** Refazer o
  personagem é rodar `atelie/cli.js exportar`; nada depende de script avulso.
- **Nenhum quadro do personagem abre fresta nem vaza a grade.** Pedaço solto,
  volume, inchaço e mão da arma fora do lugar são erro de validação, não
  descoberta em captura de tela.
- **A paleta do personagem cabe em 255 entradas.** O corpo tem no máximo 54
  cores; mais que isso cai na cor mais perto sem dar erro nenhum.
- **O arquivo é ASCII puro.** Sem isso os acentos viram mojibake quando o HTML
  é aberto do disco ou servido sem charset declarado. O `build.js` se recusa a
  gravar se entrar um acento.
- **Escapes unicode não podem ser mutilados.** Um `·` que perde a barra
  vira `00b7` na tela.
- **O relógio do jogo nunca anda para trás.** O timestamp do
  `requestAnimationFrame` pode vir *antes* do instante em que foi agendado; sem
  piso em zero o `dt` fica negativo, índices de animação viram negativos e a
  tela fica preta.
- **Porta fechada tem que ser desenhada.** Portas são "teto que desce até o
  chão"; se a faixa de cima não for emitida, o vão vira um buraco por onde se
  vê e não se passa.
- **Nenhum inimigo escapa do mapa.** O desvio lateral dos voadores precisa ser
  testado contra colisão, senão eles atravessam parede aos poucos.
- **Mirar reto tem que errar um alvo elevado.** É o teste de que o tiro segue
  a mira vertical de verdade.
- **A inclinação do céu acompanha o mundo, não o contrário.** O deslocamento
  vertical da faixa entra com sinal negativo: olhando para cima o mundo desce
  na tela e o horizonte do céu tem que descer junto. Com o sinal trocado,
  levantar a cabeça mostrava a serra e a lua em vez das estrelas.
- **A faixa do céu cobre o pescoço inteiro.** São 282 linhas acima do
  horizonte. Com menos, o recorte prende as últimas linhas e a mesma fileira
  de estrelas se repete tela abaixo, em riscos verticais.
- **O quadro do cadáver encara a câmera inteira, inclinação inclusive.** O
  cartaz comum só gira no eixo vertical, então quando você passa por cima de
  um corpo ele fica de lado e some. É também por isso que ele é ancorado no
  centro da caixa e não no pé dela.
- **O cadáver encurta em vez de girar.** Com uma imagem só, encarar você é
  girar, e quem está deitado tem um rumo — o chão atrás denuncia. O quadro
  encurta conforme você sai do flanco e inverte ao passar para o outro lado.
- **O voador morto cai no chão.** A altura do voador era mantida por uma conta
  que vinha antes do teste de morte, então o morcego morria e continuava
  pairando. Um corpo no ar é a única coisa na tela que denuncia que sprite é
  sprite.
- **O cadáver cabe na largura do sprite.** Deitado, o bicho fica tão comprido
  quanto era alto, e a sobra sai pela lateral — um erro que só aparece quando
  alguém anda em volta de um corpo.
- **O índice 0 da paleta é sempre o vazio.** A imagem guarda um byte por pixel
  e a cor sai da COLORMAP; se o zero deixar de ser transparente, todo sprite
  ganha um bloco sólido em volta.
- **O voxel tem o tamanho do sprite desenhado à mão.** O billboard estica a
  imagem até as medidas que `EDEF` manda, então um grid errado não dá erro
  nenhum — a criatura só fica gorda ou espichada, e só na hora de olhar.
- **A paleta não passa de 255 cores.** Um índice que vaze para 256 cai na linha
  de luz seguinte da tabela — a cor só sai errada a certa distância da câmera.
- **A geometria é montada uma vez, em pedaços.** Andar e olhar em volta não
  remonta nada; uma porta que abre remonta só o pedaço dela e o do lado.
- **A face de costas não é desenhada.** A ordem dos cantos de cada face diz a
  frente. Desenhar as duas era metade do trabalho do rasterizador jogado
  fora, e o z-buffer escondia o desperdício.
- **O quad torto vira dois triângulos.** Os quatro cantos do telhado perto da
  cumeeira não cabem num plano só, e um plano médio erra a frente no olhar
  rasante: o alto do telhado sumia.
- **A altura de quem pergunta separa os andares.** "Que chão está sob o pé" e
  "que teto está sobre a cabeça" respondem conforme a altura de quem
  pergunta; sem ela a ponte não tem embaixo.
- **A linha de visão amostra mais fino que a parede fina.** Com peça no mundo
  o passo cai para menos de 0,125 tile, senão o bicho enxerga através da casa
  pelo vão entre duas amostras.
- **Trocar de mapa remonta o mundo sem recarregar a página**, e as texturas
  do ambiente saem do mesmo sorteio, na mesma ordem — a ilha tem que sair
  igual abrindo nela ou chegando nela vindo da cripta.
- **O mapa escrito é lido de volta idêntico.** O canteiro grava por cima do
  arquivo; qualquer diferença na ida e volta seria um estrago silencioso a cada
  Ctrl+S. Por isso também o arquivo com erro de leitura não abre pela metade.
- **Nenhum terreno usa aspas, crase ou barra invertida.** Um dia o build embute
  o mapa numa string do HTML, e esses três caracteres quebrariam a string.
- **Um traço de pincel é um Ctrl+Z só**, e subir o terreno com o botão parado no
  lugar sobe um degrau, não uma torre.
- **Parede da ilha é bloco alto, não tile maciço.** Tile maciço vai do piso até o
  teto do vizinho, e ao ar livre o teto do vizinho é o céu: toda parede subiria
  até as nuvens. O teste procura qualquer polígono acima do morro mais alto.
- **A faixa acima de uma porta para no telhado.** É o mesmo problema visto do
  outro lado: quem está ao ar livre desenharia parede do batente até o céu.
- **O telhado cobre as paredes da casa, cantos inclusive.** Contando só os
  tiles cobertos, o telhado ficava para dentro da parede e cada quina ficava
  aberta, com o alto da parede aparecendo.
- **Só ganha janela a parede de fora de uma casa**, a que tem chão coberto do
  outro lado. Muro de jardim e cerca não.
- **Sem endereço, abre a ilha embutida**, e não o mapa que o canteiro guardou. Um
  mapa esquecido no navegador não pode sequestrar o jogo. `?mapa=editor` com o
  mapa quebrado ou ausente abre a cripta.
- **Não se pula por cima do cenário.** A colisão de árvore, barril e morador é
  um cilindro sem topo. Se desse para pular, quem pousasse num barril ficaria
  dentro do círculo dele, e dali todo passo seria barrado.
- **Morrer sempre custa mais que o mago da memória.** Se um dia a morte ficar
  mais barata, morrer vira o jeito barato de redistribuir pontos.
- **As receitas cabem inteiras no nível 100.** Uma receita que não cabe mostra
  para o jogador novo um personagem que ele nunca vai conseguir montar.
- **Nó só se compra encostado num comprado, e não se devolve nó que sustenta
  outro.** Sem isso o disco vira lista de compras e o custo do caminho some.
- **Nenhuma receita tem compra inválida em nível nenhum.** É o que garante que a
  morte, que tira da ponta da fila, nunca deixa nó solto nem nó de árvore sem a
  especialização aberta.
- **A porta da árvore própria pede a ponta do ramo.** Só com a especialização
  aberta, a árvore virava lista de compras de novo, e levar o ramo até a borda
  deixava de custar.
- **Trair não perde ponto.** Cada nó do clérigo vira o do necromante no mesmo
  lugar. Se sobrasse compra inválida, a traição tiraria nível do personagem por
  um motivo que não é a morte.
- **A simulação anda em passos fixos de 1/60 s.** Um quadro de 50 ms roda três
  passos. Com o passo variável a física saía diferente em cada máquina, e a rede
  não teria como concordar com ela.
- **O `update` não lê tecla.** Teclado e mouse viram um objeto de entrada por
  passo, e ação de uma vez entra numa fila. É o que um dia trafega no fio.
- **A simulação anota o som; quem toca é o laço.** E não há `setTimeout` no jogo:
  o golpe corpo a corpo entra na agenda, no relógio do jogo.
- **Velocidade 50 anda metade da 100.** O painel multiplica o alvo da aceleração,
  não o jeito de acelerar, então o embalo é o mesmo em qualquer valor e o número
  do painel diz a verdade.
- **Ajuste guardado fora do limite volta ao padrão.** Um valor estragado no
  navegador não pode abrir o jogo com campo de visão de 999 graus.
- **Mudar a resolução leva a câmera junto.** Buffer, z-buffer e projeção são
  refeitos na hora; sem isso o mundo sairia desenhado num canto da tela.
- **O estilo mora na construção.** A peça no arquivo não tem estilo; o motor
  lia o da peça, e toda casa aberta do disco saía no estilo padrão.
- **Estilo sem algum material é erro.** Material que falta cai em "parede" sem
  aviso nenhum: o telhado sairia de tábua e só se veria olhando.
- **A textura do estilo sai igual em qualquer máquina.** O pintor sorteia com
  semente tirada do nome do material, não de um sorteio global, onde
  acrescentar uma textura no meio mudaria todas as de depois.
- **Refazer aos pedaços dá o mesmo mundo que montar do zero** — alturas,
  telhados, chaminés, letras do mapa e faces. O caso que quebra é o canto de
  telhado dividido por duas casas encostadas pela quina: mexer numa não pode
  baixar o canto da outra.
- **Pedaço fora do alcance não é montado, e não faz falta.** O quadro com só o
  alcance montado é o mesmo com tudo montado.
- **O desfazer guarda a diferença, não a lista.** Pôr uma peça grava uma peça,
  e a peça desfeita volta com o mesmo id. Com a vila e a fortaleza são
  milhares de peças, e a lista inteira duas vezes por clique enchia a memória.
- **Pôr uma peça remonta só o pedaço dela.**
- **O que a grade de andar diz que se alcança, o jogador alcança andando.** O
  teste anda o caminho dela com a física do jogo. Foi assim que ela achou os
  dois erros da casa do primeiro teste: a escada encostada na porta tranca a
  casa, e a laje em cima do começo da escada faz a cabeça bater — sobe-se,
  mas agachado.
- **Todo tipo de peça diz o que o corpo faz com ele**, e o teste confere.
- **Todo tipo, em todo estilo, girado e espelhado, sai com face plana e
  convexa de até oito cantos e sólido convexo no sentido anti-horário.** Face
  torta some num ângulo e aparece noutro; sólido no sentido errado deixa o
  jogador atravessar a parede.
- **O par de entrada e saída leva e traz pelo id**, e a volta cai ao lado da
  entrada, sem coordenada no endereço.
- **O segredo sorteado depende só da semente e do grupo**, não da ordem das
  coisas no arquivo — senão salvar o mapa trocaria o segredo.
- **Campo de marco com espaço não entra.** O arquivo separa os campos por
  espaço: um valor com espaço viraria dois pedaços, e o segundo, texto.
- **Girar ou espelhar o modelo dá exatamente os sólidos girados ou
  espelhados**, e girar zero quartos não gira nada — girava um, e a casa de
  frente para o sul saía de frente para o oeste.
- **A casa do lote se entra, se sobe e dá na sacada**, nos três estilos, e o
  jogador faz esse caminho andando.
- **O encaixe fecha a quina e empilha o andar.** A parede girada perto da
  ponta de outra cola nela; a de cima senta no alto da de baixo; o alto da
  escada, no meio da borda da laje.
- **O estilo de uma peça vai e volta pelo arquivo**, como campo dela, e o
  motor desenha aquela peça com ele e o resto da casa com o da construção.
- **Assar a miniatura não mexe na tela do jogo.** O rasterizador guarda câmera
  e buffers em variáveis do módulo; a miniatura troca tudo e devolve.
- **Cada grade é percorrida com o mundo dela aberto.** A grade guarda os
  pisos, mas os passos perguntam à física do mundo de agora — um teste que
  abria o segundo mapa antes de percorrer o primeiro passava por sorte.
- **Água funda e lava só barram quem está na altura delas.** Barravam em
  qualquer altura, e nenhuma ponte atravessava o rio — foi a régua que achou.

## Cuidado

O protótipo já morou em pasta temporária e quase se perdeu numa limpeza —
`p2.js` e `p5a.js` só foram recuperados porque o HTML montado tinha tudo
concatenado. **O fonte mora aqui, no git.**
