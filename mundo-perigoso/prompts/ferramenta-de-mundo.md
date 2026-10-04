# Prompt — a ferramenta de criação de mundo

Para colar numa sessão nova do Claude Code aberta na pasta do repositório.
Tudo abaixo da linha é o prompt.

---

Quero uma ferramenta própria de criação de mundo para o *Mundo Perigoso*, feita
do zero, com o mesmo cuidado e a mesma arquitetura do ateliê de personagem
(`mundo-perigoso/atelie/`). O ateliê é a régua de qualidade deste trabalho: leia
ele inteiro antes de começar.

## Leia antes de qualquer coisa

1. `DESIGN.md`, inteiro. Principalmente: *estética de 1993, jogo de 2026*
   (tela 640×360, textura de 64 por tile, cenário subindo de 37 para 64 voxels
   por tile), *o mundo*, *a guerra e o fim do mundo*, *a ilha inicial* com
   *escala* e *a montanha, as cavernas e o porto*, *decisões técnicas* e a
   *lista de tarefas*.
2. `mundo-perigoso/README.md`, inteiro. As *regras que os testes protegem*
   existem porque cada uma já quebrou uma vez.
3. O mundo de hoje:
   - `src/mapa.js`: o formato `MAPA 1`, documentado no topo;
   - `src/ilha.js`: como o mapa vira o que o motor entende;
   - `src/p2b.js`: alturas, telhados de quatro águas e a geometria;
   - `src/p2.js`: as texturas procedurais e o `REG_ILHA`;
   - `src/p3b.js` e `src/p3d.js`: o assador de voxel e o cenário;
   - `src/p4.js`: colisão, portas e física;
   - `src/p5a.js`: o rasterizador.
4. O editor de hoje, `editor/` (e os 78 testes dele em `teste/mapa.test.js`).
5. O ateliê, `atelie/`, pelo jeito de fazer: módulos puros sem DOM que rodam
   no node, linha de comando que faz o mesmo que a tela, formato documentado no
   topo do arquivo, validação que impede exportar, prévia com o código do
   próprio jogo e reprodução byte a byte.

## O que existe e onde trava

Um mapa hoje são três grades do mesmo tamanho (terreno, altura em degraus de
0,25 tile, teto relativo ao piso) mais uma lista de coisas. Há 16 terrenos e
20 tipos de coisa, e um tile mede uns 2 metros. O motor dá **um piso e um teto
por tile**:

- a parede é um bloco alto;
- a porta é um teto que desce até o chão, como no Doom;
- o telhado é sempre de quatro águas, calculado sozinho em volta do que tem forro;
- a janela nasce sozinha no meio da parede de fora;
- o cenário é um modelo de voxel assado num sprite de um quadro só;
- o jogo desenha até 60 tiles;
- trocar de mapa recarrega a página, porque o motor é montado para um mapa só.

O editor já tem:

- pincel, balde, retângulo e suavizar;
- régua em segundos andando e curvas de nível;
- imagem de referência, rascunho no navegador e avisos;
- **Ver no jogo** e **Começar daqui**;
- carimbos (casa de madeira, casa de pedra, escada) e copiar/colar com o relevo.

**Onde trava:** tudo é tile inteiro. Não existe parede fina, meia parede, arco,
coluna, sacada, andar de cima, ponte passando por cima de um caminho, escada em
caracol, ameia, torre redonda, nem telhado que não seja de quatro águas. A lista
de tarefas já registra que as casas são blocos. O rascunho da ilha nova, numa
grade de 650×650, está em `Arte/ilha 2.mapa`, a versão que vale; o rascunho
anterior, `Arte/ilha.mapa`, saiu da pasta e ficou no histórico do git.

## O objetivo

Uma ferramenta de ponta a ponta com **dois modos que editam o mesmo arquivo**:

- **Macro:** o mapa inteiro visto de cima. É onde se faz a geografia: relevo,
  costa, rios, estradas, regiões, onde ficam as cidades e as entradas das
  dungeons. Tem que aguentar 650×650 sem engasgar.
- **Micro:** entrar no mapa como no jogo, andando ou voando, com o motor, a luz,
  a névoa e a textura do próprio jogo, e construir peça por peça com um catálogo
  de peças de casa, castelo, dungeon, natureza e o que mais for preciso, em
  vários estilos. O que se vê construindo é o que o jogo mostra.

Uma tecla troca de um modo para o outro **no mesmo ponto do mapa**.

O mundo não é um mapa só: é a ilha, as dungeons e os interiores, cada um num
mapa, ligados por entradas. A ferramenta cuida do conjunto.

Nome de trabalho: *canteiro* (`mundo-perigoso/canteiro/`). Troque se tiver um
melhor.

## Macro — o mapa no todo

- **Vista de cima em camadas**: terreno, altura (com sombra de relevo), teto,
  peças desenhadas em planta, coisas, regiões e ligações. O zoom vai do mapa
  inteiro até o tile.
- **Relevo**:
  - pincéis de subir, descer, nivelar, suavizar e ruído;
  - a **rampa entre dois pontos**, pendente no `DESIGN.md`, que preenche os
    degraus sem passar de um por tile;
  - a **encosta de pedra**, um chão com cara de rocha onde se anda (a rocha
    continua sendo o penhasco);
  - relevo gerado por ruído com semente, **só como ponto de partida**: quem
    desenha a ilha é o Leandro.
- **Traçados por curva**: estrada, rio, muralha, cerca e trilha, com largura e
  estilo. O traçado acerta o relevo embaixo dele — estrada não sobe degrau
  alto, rio desce até o mar.
- **Vegetação por pintura de densidade**, com regras (árvore não nasce em
  estrada nem encostada em parede) e variação que só depende do lugar
  (`hashTile`).
- **Regiões nomeadas** com nome, perigo, música e som ambiente. As regras de
  gameplay ainda não estão decididas: guarde o dado, não invente a regra.
- **Lotes**: marcar um retângulo na cidade e "construir aqui uma casa no estilo
  X". Sai uma casa inteira de peças, que o micro depois refina à mão.
- **As réguas do `DESIGN.md` viram visualização**:
  - tempo de caminhada a partir do início, com a velocidade do jogo;
  - **mapa de calor do vazio**: onde se anda mais de 60 a 120 tiles sem nada
    novo (a regra é algo novo a cada 20 a 40 segundos);
  - **o que se vê daqui**, a linha de visão de um ponto, para o "mostrar muito
    antes de permitir";
  - o que se alcança andando a partir do início, com o limite de degrau do
    motor (sobe até 0,42 tile).

## Micro — construir dentro do mapa

- **Entrar no mapa com o motor do jogo**, andando com a física de verdade ou
  voando (o `N` do jogo já atravessa parede e voa).
- **Catálogo de peças** com miniatura assada pelo próprio assador, organizado
  por categoria e estilo, com busca e barra de atalhos.
- **Fantasma da peça** na mira: verde se cabe, vermelho se não cabe e por quê.
- **Encaixe**:
  - na grade (tile, meio tile, quarto de tile) e em degraus de 0,25 na
    vertical;
  - nos encaixes das outras peças: parede cola em parede, telhado senta na
    parede, escada liga dois pisos;
  - giro de 90° (45° onde fizer sentido) e espelho.
- **Conta-gotas** (apontar e pegar peça e estilo), apagar, trocar o estilo de
  uma peça sem mexer na forma, e **trocar o estilo de uma construção inteira**
  (a casa de madeira vira de pedra).
- **Seleção em caixa**, em 3D: copiar, colar, girar, espelhar, e **guardar como
  modelo** no catálogo (uma torre pronta, uma sala de dungeon pronta).
- **Mexer no terreno de perto**: subir, descer e pintar o chão debaixo do pé.
- **Coisas e marcadores** postos no mesmo modo (ver *mecânica e marcadores*).
- **Desfazer por ação.** Um traço, uma peça ou uma colagem é um Ctrl+Z só,
  e o desfazer é o mesmo nos dois modos.
- **Salvar sem sair**, com rascunho automático no navegador, como o editor e o
  ateliê já fazem.

## As peças

**Uma peça é dado ou função, não um desenho**, como as `PECAS` do personagem
em `src/p3e.js`. Um estilo nasce do mesmo jeito. Acrescentar um estilo novo não
pode exigir mexer no código da ferramenta nem do motor.

Cada **tipo de peça** tem encaixes padrão. Cada **estilo** dá os materiais (as
rampas de cor e as texturas procedurais de 64 por tile) e as variações de forma
de cada tipo. Os tipos que um estilo precisa ter:

- parede inteira, meia parede, parede com janela, parede com porta, canto de
  dentro e canto de fora, fim de parede;
- pilar e coluna, arco, piso, forro e laje de andar de cima;
- degrau, escada reta, escada em caracol, rampa;
- guarda-corpo, sacada;
- telhado (água, cumeeira, espigão, beiral, empena), chaminé;
- porta, portão, janela com e sem veneziana.

**Categorias e estilos.** A primeira versão tem pelo menos dois estilos
completos por categoria; o resto é acrescentar estilo.

| Categoria | Estilos para começar | Mais adiante |
|---|---|---|
| Casa | madeira de pescador; pedra rústica de vila | enxaimel, alvenaria de cidade, casa de anão na rocha |
| Castelo e fortaleza | pedra de fortaleza humana | fortaleza dos caídos, forte de paliçada |
| Dungeon | cripta de pedra (a de Vhalgorn); caverna natural | esgoto, mina escorada, ruína antiga, covil demoníaco |
| Natureza | rocha e penhasco modulares; árvores e arbustos do cenário de hoje | raízes, cogumelos, cristais |
| Infraestrutura | píer, cais, ponte de madeira e de pedra, muro, cerca, portão, poço, fonte | aqueduto, farol |
| Interior | mesa, cadeira, cama, estante, balcão, lareira, baú, barril, altar | — |
| Luz | tocha, lampião, vela, braseiro | — |

As peças do castelo e da fortaleza:

- muralha com ameias e adarve;
- torre quadrada e torre redonda;
- guarita;
- portão com grade levadiça;
- ponte levadiça;
- seteira;
- escada de muralha.

**As cidades fortaleza são o centro da guerra de fim de semana**, então esse
kit precisa dar conta de uma cidade murada inteira.

## Mecânica e marcadores

O protótipo já tem porta, porta trancada por chave e parede secreta. A
ferramenta põe e configura:

- porta, porta trancada (e qual chave), passagem secreta, alavanca, grade e
  armadilha;
- entrada e saída de dungeon, **em par**: as duas pontas se conhecem, e a volta
  sabe de onde se desceu;
- início do jogador, pontos de renascer e placa com texto;
- morador com nome e falas: ligar ao `src/conversa.js`, não duplicar;
- ponto de criatura, com tipo, quantidade e raio;
- luz, com cor, raio e se tremula. A luz dinâmica ainda não existe no motor:
  guarde o dado para quando existir;
- som ambiente e gatilho de área;
- baú. O loot não está decidido: é só o marcador.

**Segredo sorteável.** A cada era os segredos são sorteados de novo: a
montanha em outro lugar, a charada pedindo outro item. O formato precisa
aceitar um ponto de interesse com **alternativas** (vários lugares candidatos,
ou várias versões de uma sala) e um sorteio por semente. Não é para gerar o
continente agora, só para não fechar essa porta no formato.

## O motor — o que precisa mudar

O micro exige três coisas que o motor não tem. Elas são a parte mais difícil do
trabalho e vêm primeiro.

1. **Geometria que não é tile inteiro.** Peça fina, arco e telhado de qualquer
   forma precisam virar polígono no rasterizador, com a colisão acompanhando em
   `p4.js`.
2. **Mais de um andar no mesmo tile**: ponte sobre estrada, sobrado, sacada,
   adarve em cima do portão, masmorra debaixo da cidade. Hoje cada tile tem um
   piso e um teto só, e a física lê isso.
3. **Remontar só o pedaço que mudou**, com o jogo rodando. Hoje a geometria é
   refeita a cada quadro, e mudar de mapa recarrega a página. O `DESIGN.md` já
   lista *geometria montada uma vez só, em pedaços* como a primeira falta do
   motor: é a hora de fazer.

O mapa de tiles tem que continuar funcionando. `mapas/ilha.mapa` e a cripta
abrem como hoje, e as regras do README continuam valendo:

- parede da ilha é bloco alto;
- a faixa acima da porta para no telhado;
- o telhado cobre as quinas;
- só a parede de fora ganha janela;
- não se pula por cima do cenário;
- o relógio do jogo não anda para trás.

## Decisões que você toma medindo, e me mostra antes de construir

Não quero opinião; quero número. Meça no motor de verdade, em 640×360, no pior
lugar. O orçamento é 16,7 ms por quadro: ao ar livre o quadro fica entre 4 e
6,5 ms, e **dentro de casa já custa 20 ms**, que precisa de otimização antes do
co-op.

1. **Como uma peça vira geometria.**
   - As opções: polígono texturizado (como o *brush* do Quake), voxel em 64 por
     tile fundido em faces, ou sprite de voxel (como o cenário de hoje).
   - Minha aposta: arquitetura como geometria de verdade — ela colide, a
     câmera da terceira pessoa para nela, e de perto não gira com o olhar. O
     adereço pequeno continua sprite.
   - Meça e decida. **A estética mora nos pixels, não na geometria**: textura
     de 64 por tile, paleta indexada, COLORMAP de 16 níveis e névoa na cor do
     horizonte são intocáveis.
2. **A grade das peças**: o passo na horizontal, o passo na vertical e os
   ângulos de giro.
3. **Como representar vários andares** sem quebrar a colisão, o encaixe na
   grade e a busca de caminho dos inimigos.
4. **O formato `MAPA 2`**, seguindo as mesmas regras do formato de hoje:
   - ASCII puro, sem aspas, crase nem barra invertida, porque o build embute o
     mapa numa string do HTML;
   - lido e gravado de volta idêntico;
   - arquivo com erro de leitura não abre pela metade;
   - tipo desconhecido gera aviso e não se perde;
   - `MAPA 1` continua lido, e converte.

   Cuide do tamanho: 650×650 com milhares de peças. Veja se vale corridas,
   pedaços ou arquivo por região.
5. **Onde o micro roda.** Minha aposta: numa página da ferramenta que carrega
   os módulos de `src/` direto, como a prévia do ateliê carrega o `p3e.js`, e
   soma a camada de construção por cima. O jogo publicado não leva código de
   ferramenta.

Me mostre essas cinco decisões com os números antes de escrever o catálogo. O
que for só técnico, decida; o que for gosto ou design de jogo, pergunte.

## Validação — erro impede exportar

Rodar sozinha antes de exportar, em todos os mapas do mundo. Clicar num
problema leva até ele, nos dois modos.

- **Alcance.** O que tem de ser alcançável e não é, andando a partir do início,
  com o limite de degrau e o pulo do motor; o degrau alto que prende. O teste de
  hoje, que anda do píer até a cripta, vira regra geral.
- **Peças.** Peça solta no ar sem apoio; peça dentro de outra; buraco em telhado
  ou em parede de construção fechada; porta sem parede; escada que não chega em
  lugar nenhum.
- **Ligações.** Entrada de dungeon sem o par, ou apontando para mapa que não
  existe.
- **Coisas.** Morador sem nome ou sem falas; placa sem texto; coisa em lugar
  ocupado.
- **Terreno e texto.** Chão debaixo d'água; terreno com caractere proibido;
  arquivo com caractere que não é ASCII.
- **Custo do quadro.** Um número estimado de polígonos visíveis por ponto do
  mapa, e o pior lugar apontado — para eu saber onde o jogo vai engasgar antes
  de andar lá.

## Arquivos, linha de comando e o jogo lendo

- Os formatos novos são documentados no topo do arquivo que os escreve, como o
  `.atelie` e o `.personagem`.
- O jogo lê exatamente o que a ferramenta grava, e o `build.js` embute.
- A linha de comando faz o mesmo que a tela:
  - `validar` e `exportar`;
  - `converter` (`MAPA 1` para `MAPA 2`);
  - `planta` (a vista de cima em PNG, como a `folha` do ateliê);
  - `vista` (um PNG tirado de dentro do mapa, de um ponto e um rumo, com o
    motor do jogo);
  - `catalogo` (uma folha com todas as peças de todos os estilos).
- A ferramenta abre direto do disco no Chrome ou no Edge, grava por cima com
  Ctrl+S e aceita arquivo arrastado, como o editor e o ateliê.
- Sem dependência nenhuma: node puro e o navegador.

## Como trabalhar

- **Em fatias que deixam o jogo jogável.** Cada fatia termina com os testes
  passando e um commit na forma `mundo: ...`. Os ~500 testes de hoje continuam
  passando.
- **A ordem que eu imagino**, ajuste se as medições pedirem outra:
  1. as medições e as cinco decisões;
  2. o motor (geometria em pedaços, peças e andares, remontar sem recarregar);
  3. o `MAPA 2` com a conversão;
  4. o micro com um estilo de casa;
  5. o macro;
  6. o catálogo completo;
  7. a validação inteira;
  8. aposentar o editor antigo, quando o novo cobrir tudo o que ele faz.

  Aproveite de `editor/operacoes.js` o que já está testado — histórico,
  régua, carimbos — em vez de reescrever.
- **Testes novos protegem cada regra** que você descobrir quebrando, e a regra
  vai para a lista do README com o porquê, como as que já estão lá. Entre os
  testes novos:
  - ida e volta do formato;
  - conversão do `MAPA 1`;
  - alcance;
  - encaixe;
  - colisão em peça fina e em dois andares;
  - desempenho no pior lugar;
  - ASCII puro.
- **Olhe o resultado.** A cada fatia, tire vistas de dentro do mapa pelo motor
  e olhe antes de dizer que está pronto. Defeito de geometria só aparece
  olhando.
- **Documente no fim de cada fatia**: o `README.md` do `mundo-perigoso` (uma
  seção como a do ateliê) e o `DESIGN.md` (um *feito* com as decisões e o
  porquê, e a lista de tarefas atualizada; os itens de encosta, rampa e
  cenário em 64 podem entrar aqui).

## Pronto quer dizer

Sem escrever código, só com a ferramenta, dá para:

1. Esculpir o relevo da ilha de 650×650 a partir do rascunho, com um rio, uma
   estrada que sobe a montanha em rampa e as regiões nomeadas.
2. Levantar uma **casa de dois andares com sacada** num estilo, e trocar ela
   inteira para o outro estilo.
3. Levantar um **trecho de fortaleza**: muralha com ameias e adarve, uma torre
   redonda, portão com grade levadiça e ponte levadiça sobre um fosso.
4. Montar uma **dungeon de três salas** nos dois estilos (cripta e caverna),
   ligada à ilha por uma entrada com a volta certa.
5. Montar uma **vila de cinco casas** ao longo da estrada, com uma ponte de
   pedra passando por cima do rio e moradores com falas.

E em tudo isso:

- andar no jogo sem prender em degrau, sem atravessar parede e sem ver buraco;
- o quadro dentro do orçamento, no pior lugar;
- a validação sem erro;
- o arquivo lido e gravado de volta idêntico;
- `mapas/ilha.mapa` e a cripta funcionando como antes.
