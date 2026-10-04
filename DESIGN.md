# Mundo Perigoso — documento de design

> **Estado:** planejamento. Existe um protótipo jogável single-player
> (*A Cripta de Vhalgorn*). As mecânicas de MMO ainda não começaram.
>
> **Para uma sessão futura do Claude:** leia este arquivo antes de opinar ou
> codar. Ele contém as decisões já tomadas, o que ainda está em aberto, e o
> estado técnico do protótipo. O código fica em `cripta-vhalgorn.html`.

---

## Em uma frase

MMORPG com estética de 1993 e um mundo genuinamente perigoso, onde o conteúdo
real não são as masmorras — é **o que os jogadores descobrem e contam uns aos
outros**.

## Natureza do projeto

Hobby. **Não é para ficar rico.** Pode levar 5 ou 10 anos. O critério de
sucesso é ser "o joguinho que eu sempre quis jogar", não lançar.

Isso muda o que é bom conselho: as objeções clássicas contra MMO (volume de
conteúdo, mundo vazio, custo de operação) são todas sobre **taxa de queima**, e
hobby não tem folha de pagamento. O que mata projeto de hobby é **abandono**,
não escopo.

---

## A tese de design

Todo elemento do jogo serve à mesma ideia: **conhecimento compartilhado é o
conteúdo**.

| Elemento | O que ele produz |
|---|---|
| Mundo perigoso | Você não passa sozinho, então precisa de gente |
| Exploração difícil | Descoberta é rara, então vira história |
| Enigma não resolvido | Quem resolve é a comunidade, não o indivíduo |
| Guerra que pode ser perdida | Todo mundo tem a mesma aposta e a mesma memória |
| Builds divergentes | Seu personagem é uma opinião sobre como se joga |

Os MMOs antigos tinham isso por acidente — não existia wiki, mapa no HUD nem
viagem instantânea. Os modernos mataram sem querer, com conveniência.

**O inimigo natural do design é a informação virar commodity.** Um enigma de
seis meses de trabalho é resolvido por um post em três dias. Não dá para
impedir — dá para fazer expirar (ver *reset*).

---

## Decisões tomadas

### Risco, não porteiro — DECIDIDO

Nada de "esta masmorra exige 4 jogadores". Você **pode** ir sozinho se achar
que é bom o bastante; provavelmente vai morrer e perder coisa. Como seria se
fosse real.

*Por quê:* porteiro não escala com população. Com 3 pessoas online de
madrugada, um portão de 4 torna o jogo injogável — e é aí que a pessoa
desiste. Risco escala com qualquer população: só fica mais tenso.

### O reset leva o personagem junto — DECIDIDO

Quando a capital cai, o mundo acaba **e os personagens também**. Só
**cosméticos** atravessam os ciclos. O servidor reinicia **logo após a derrota**,
com o mesmo tema e **os segredos sorteados de novo**.

**O que acontece quando os jogadores vencem ainda não está decidido.** As opções
estão em *a guerra de fim de semana*.

*Por quê:* é o modelo de *league* do Path of Exile. Se todo mundo recomeça do
zero, a única coisa que atravessa é **conhecimento e habilidade** — exatamente
o conteúdo que o jogo quer valorizar. E fecha o ciclo contra a wiki: era nova,
mundo re-sorteado, personagens zerados, informação velha não vale mais nada.

Efeito colateral bom: perder o mundo deixa de ser catástrofe e vira história.
*"Eu tava lá no ciclo em que a capital caiu."*

### Combate baseado em habilidade — DECIDIDO

Não é tab-target. Cada classe exige competência mecânica diferente:

- **Guerreiro** — atacar, defender, esquivar no tempo certo
- **Mago** — profere feitiços digitando combinações
- **Arqueiro** — mira e noção de distância

**O mago digitando é o motivo mecânico da party existir.** Enquanto digita,
ele está de mãos ocupadas e vulnerável — precisa de alguém segurando a linha
na frente. Não é preciso *forçar* grupo por regra: a classe já obriga por
física. Isso é mais elegante que um portão.

### Sem classe fixa — SUBSTITUÍDO (27/9)

> Substituído por *classes por quest*. Os atributos e o combate, abaixo,
> continuam valendo.

O paladino não é uma classe: é alguém que pôs muita vitalidade, investiu em
magia sagrada e veste armadura pesada. Os nomes de classe viram **receitas**
sugeridas na criação, nunca regras. Inspiração em Ragnarok Online e Arcanum.

Os números abaixo são o ponto de partida para testar, não o equilíbrio final.
Todos moram em `mundo-perigoso/src/regras.js`, o mesmo arquivo que o simulador
de build lê hoje e o jogo vai ler quando o personagem existir.

- **Duas moedas, as duas por nível.** Cada nível dá 3 pontos de atributo e 1 de
  habilidade. Com a mesma moeda, cada mudança numa árvore mexeria no valor dos
  atributos, e o equilíbrio viraria um sistema só.
- **Seis atributos: FOR, AGI, VIT, INT, DES, SOR.** Começam em 5, com 10 pontos
  livres na criação e teto de 60. Cada ponto custa 1, mais 1 a cada dez que o
  atributo já tem: no nível 100 dá dois atributos em 50 ou três em 40.
- **Nenhum atributo decide se o golpe acerta.** Quem acerta é a mira. O atributo
  muda o que se consegue fazer: carga, velocidade, vida, mana, alcance.
- **A velocidade sai do peso da armadura**, aliviado pela força e pelos nós de
  armadura do guerreiro, mais um pouco de agilidade. O paladino é lento porque
  veste aço.
- **Sorte:** a chance de crítico cresce cada vez menos e se aproxima de 40% sem
  chegar; o dano do crítico sobe 1% por ponto.
- **As habilidades ficam num disco**, ver *a árvore de habilidades é um disco*.
  A roda de seis árvores com preço por distância, registrada antes, foi
  substituída.
- **Combate:** esquivar é sair da frente, e a velocidade por armadura é o que
  diferencia quem esquiva. Bloquear com escudo entra nos nós do guerreiro;
  aparar com arma fica para depois. Magia se conjura com uma tecla, digitando
  parado.

### A árvore de habilidades é um disco — SUBSTITUÍDO (27/9)

> Cada classe tem agora o seu círculo, e a tabela dos híbridos virou a das
> segundas classes: ver *classes por quest*. O formato de disco continua em
> cada círculo.

Substitui a roda de seis árvores com preço por distância. O desenho original é
do Leandro.

- **Uma árvore só, em forma de disco.** Todo mundo começa no nó do centro, que vem
  de graça. Cada ponto compra um nó encostado num que o personagem já tem. Perto
  do centro ficam as perícias básicas, como perícia com adagas e perícia com
  arcos; quanto mais para fora, mais especializado. A referência mais próxima é
  a árvore passiva do Path of Exile.
- **Seis fatias:** guerreiro, clérigo, ladino, mago, arqueiro e druida. O druida é
  fatia própria, porque formas animais, plantas e bichos são identidade demais
  para caber num híbrido. A armadura deixa de ser árvore e vira nós dentro do
  guerreiro.
- **O custo é o caminho.** Não existe preço por distância nem regra de centro.
  Num disco que começa no centro, investir em duas fatias custa o mesmo, sejam
  elas vizinhas ou opostas. Se uma combinação deve custar mais, isso fica na
  exigência dela.
- **Toda combinação de duas fatias tem um híbrido**, com perícias únicas que abrem
  depois de uma quantidade de pontos nas duas fatias. O paladino, que junta
  guerreiro e clérigo, é o exemplo do desenho original.
- **Existem classes de três fatias**, a planejar com cuidado. O preço de ser três
  coisas é não ir fundo em nenhuma: com 15 pontos em cada fatia, um trio abre no
  nível 45 e deixa 55 pontos para aprofundar no nível 100.
- **Uma especialização por personagem.** Quem se qualifica para vários híbridos
  escolhe qual carregar, e troca no mago da memória. O personagem ganha um nome
  para usar e para ser reconhecido de longe, e cada especialização só precisa
  ser equilibrada sozinha, não empilhada com outras.
- **O desenho e a regra ficam separados.** O disco é por onde o jogador anda. As
  combinações são uma tabela de exigências, então um híbrido novo é uma linha a
  mais, sem redesenhar o disco.
- **A regra da morte continua segura.** A morte tira os últimos nós comprados.
  Cada nó foi comprado encostado num anterior, e cada nó de híbrido depois de a
  exigência ser cumprida. Então nunca sobra nó solto, nem perícia de híbrido sem
  os pontos que ela pede.

#### Proposta, ainda não decidida

- **A ordem na volta alterna marcial e mágica:** guerreiro, clérigo, ladino, mago,
  arqueiro, druida. Cada marcial fica vizinha de duas mágicas e oposta a uma, e
  os pares a duas fatias de distância são justamente os do mesmo tipo.
- **A exigência sobe com a distância e conta em cada fatia**, não somada. Somada,
  um guerreiro com 29 pontos e 1 em clérigo abriria o paladino sem ter investido
  nas duas.
- **Os nomes.** Paladino, arqueiro arcano e guerreiro místico são do Leandro, e o
  resto é sugestão. Bárbaro para druida e guerreiro e envenenador para ladino e
  druida foram descartados.

| Combinação | Distância | Pontos em cada fatia | Híbrido |
|---|---|---|---|
| Guerreiro e clérigo | vizinhas | 15 | Paladino |
| Clérigo e ladino | vizinhas | 15 | Inquisidor |
| Ladino e mago | vizinhas | 15 | Ilusionista |
| Mago e arqueiro | vizinhas | 15 | Arqueiro arcano |
| Arqueiro e druida | vizinhas | 15 | Patrulheiro |
| Druida e guerreiro | vizinhas | 15 | Metamorfo, ou Guardião da Mata |
| Guerreiro e ladino | duas fatias | 18 | Duelista |
| Clérigo e mago | duas fatias | 18 | Teurgo |
| Ladino e arqueiro | duas fatias | 18 | Franco-atirador |
| Mago e druida | duas fatias | 18 | Elementalista |
| Arqueiro e guerreiro | duas fatias | 18 | Sentinela |
| Druida e clérigo | duas fatias | 18 | Xamã |
| Guerreiro e mago | opostas | 20 | Guerreiro místico |
| Clérigo e arqueiro | opostas | 20 | Caçador de demônios |
| Ladino e druida | opostas | 20 | Espreitador, ou Batedor |

- **Fazer em ondas.** Seis fatias, quinze pares e vinte trios somam 41
  identidades, conteúdo demais para uma vez só. Começar pelas seis fatias e pelos
  seis pares vizinhos, e abrir o resto ao longo das eras.
- **Trios secretos.** Vinte é demais para listar e pouco demais para ninguém
  achar. Se não aparecerem no jogo até alguém descobrir, e mudarem de exigência
  a cada era, viram o conhecimento compartilhado da tese.
- **Tamanho do disco.** Com uns 60 nós por fatia, um personagem no nível 100 enche
  a própria fatia e cobre metade de uma vizinha.

**Feito:** o simulador de build e `src/regras.js` usam o disco: seis fatias com
três ramos de 20 nós cada, pontes entre fatias vizinhas, os quinze pares, os
vinte trios e as exigências da proposta. Nomes e efeitos das perícias são
provisórios, para testar o formato.

**Cada especialização abre uma árvore própria**, desenhada por fora do disco. No
desenho do Leandro, as de fatias vizinhas ocupam uma faixa na borda, centrada na
fronteira entre as duas fatias e indo do meio de uma ao meio da outra. As seis
juntas fecham um anel em volta do disco. O paladino e o metamorfo, os dois
vizinhos do guerreiro, são o exemplo.

- *Proposta:* a entrada da faixa é pela ponta dos ramos que dão para aquela
  fronteira. O paladino entra pela armadura do guerreiro ou pela proteção do
  clérigo; o metamorfo, pelas armas do guerreiro ou pelas formas do druida. A
  especialização continua abrindo pela exigência de pontos, mas pisar na faixa
  pede um desses ramos levado até a borda, por volta do nível 36 no paladino.
- *Proposta para os pares distantes e os trios:* como o personagem carrega uma
  especialização só, a árvore escolhida aparece no arco entre as suas fatias
  pelo lado mais curto, e o anel das vizinhas sai do desenho enquanto isso. O
  trio usa o menor arco que cobre as três fatias; num trio alternado, como
  guerreiro, ladino e arqueiro, são 240 graus. A fatia do meio ganha uma terceira
  porta, na ponta do ramo central.

**Feito no simulador, com as duas propostas acima.** Toda árvore tem a mesma
forma, e só os nomes e os efeitos mudam:

- **Uma porta em cada fatia**, na ponta do ramo que dá para a outra, e o trio tem
  uma terceira. Basta a ponta de uma porta: de dentro da árvore se chega às
  outras.
- **O coração** tem o nome da especialização e fica entre as portas.
- **De cada porta das pontas sai um galho** com o sabor daquela fatia, e do
  coração sai o galho que termina a árvore, na maestria.
- **O tamanho:** um par tem 9 nós e um trio, 10. No lugar das 8 perícias em fila,
  a árvore custa uma a mais e pede caminho.
- **O paladino da receita** abre no nível 30 e pisa na árvore no 37, depois de
  levar a armadura até a ponta.

Algumas fatias podem ser trocadas por uma versão caída, numa traição. Ver *os
caídos*, em *a guerra e o fim do mundo*.

### Classes por quest — aceito como ponto de partida (27/9)

Substitui *sem classe fixa* e o disco único, acima. Desenho do Leandro, fechado
em conversa com o Claude em 27/9. Os números são para testar.

*Por quê:* o visual passa a ser da classe, como no Ragnarok e no Tibia, e isso
tira a combinatória das peças (ver *riscos conhecidos*): o projeto fica mais
simples. A classe ganha um nome para ser reconhecida de longe, e o paladino
continua natural: é o guerreiro que escolheu a magia sagrada como secundária.

- **Aprendiz.** Todo mundo começa aprendiz, na ilha inicial, com o visual do
  humano base. Na criação escolhe **um talento**, o caminho principal: adaga e
  arco, uma mão e escudo, duas mãos, magia arcana, magia sagrada ou natureza.
  Cada nível dá 1 ponto no círculo do aprendiz desse talento. Na ilha o mago da
  memória é de graça, então trocar de talento não custa.
- **A quest de classe**, por volta do nível 20, é a saída da ilha. O talento
  leva à classe; o de adaga e arco deixa escolher, sem restrição, entre
  arqueiro e ladino, e cada um faz a quest que quiser.

  | Talento | Primeira classe |
  |---|---|
  | Adaga e arco | Arqueiro ou ladino |
  | Uma mão e escudo | Guerreiro |
  | Duas mãos | Bárbaro |
  | Magia arcana | Mago |
  | Magia sagrada | Clérigo |
  | Natureza | Druida |

- **O caminho secundário** se escolhe na quest de classe: um dos outros cinco
  talentos. Dali em diante, cada nível dá 1 ponto no círculo da classe e, a
  cada dois níveis, 1 no secundário. O secundário só vai até a metade do
  círculo dele: o paladino nunca é um clérigo inteiro. No nível 100, uns 100
  pontos no principal e 40 no secundário.
- **A segunda classe.** Com os pontos pedidos no secundário, abre a quest da
  segunda classe, com visual novo. A exigência pode seguir a distância da
  tabela antiga (15, 18, 20). **A ordem importa:** guerreiro com magia sagrada
  é paladino; clérigo com uma mão e escudo é templário.

  | Principal / secundário | Adaga e arco | Uma mão e escudo | Duas mãos | Arcana | Sagrada | Natureza |
  |---|---|---|---|---|---|---|
  | **Arqueiro** | — | Besteiro | Monteiro | Arqueiro arcano | Caçador de demônios | Patrulheiro |
  | **Ladino** | — | Duelista | Salteador | Ilusionista | Penitente | Espreitador |
  | **Guerreiro** | Sentinela | — | Ferreiro | Guerreiro místico | Paladino | Cavaleiro verde |
  | **Bárbaro** | Saqueador | Gladiador | — | Rúnico | Zelote | Berserker |
  | **Mago** | Encantador | Guardião arcano | Mago de batalha | — | Oráculo | Elementalista |
  | **Clérigo** | Inquisidor | Templário | Cruzado | Teurgo | — | Alquimista |
  | **Druida** | Mateiro | Guardião da Mata | Metamorfo | Invocador | Xamã | — |

  Os nomes da tabela antiga continuam; templário, ferreiro e alquimista são do
  Leandro; os outros novos são sugestão do Claude, aceita em 27/9. "Rúnico" é
  provisório (runomante, entalhador de runas ou mestre rúnico). Saem o
  franco-atirador (ladino e arqueiro agora são o mesmo talento) e o mestre de
  armas (virou o ferreiro).
- **Os caídos: a sagrada vira profana.** Toda classe com magia sagrada,
  principal ou secundária, pode cair (ver *os caídos*):

  | Classe | Caída |
  |---|---|
  | Clérigo | Necromante |
  | Paladino | Cavaleiro da morte |
  | Inquisidor | Carrasco |
  | Teurgo | Lich |
  | Caçador de demônios | Caçador de almas |
  | Xamã | Semeador da praga |
  | Templário | Profanador |
  | Cruzado | Flagelo |
  | Alquimista | Mestre dos venenos |
  | Penitente | Apóstata |
  | Zelote | Carniceiro |
  | Oráculo | Agourento |

- **Os trios saem.** O papel deles, o conhecimento compartilhado, passa para
  **quests de segunda classe escondidas**: algumas duplas não têm a quest à
  vista, e o lugar dela muda a cada era.
- **O visual é da classe.** Aprendiz, primeira e segunda classe, e caído, cada
  um com o seu, em dois corpos. O cosmético é só de cabeça; a arma e o escudo
  aparecem conforme o que se usa. A armadura continua existindo como item, com
  peso e defesa, mas não aparece. Fazer em ondas: primeiro as sete classes, o
  paladino, o templário, o inquisidor e o necromante.
- **Os ofícios de classe.** Algumas classes produzem:
  - o **ferreiro**, armas e escudos (a armadura, a decidir);
  - o **alquimista**, poções; o **mestre dos venenos**, venenos;
  - o **arqueiro arcano**, o **guerreiro místico** e o **elementalista**: um
    sistema de elemento só, cada um num portador — a flecha, a arma e a
    armadura;
  - o **rúnico**, runas gravadas no chão, que viram armadilha ou marca de área;
  - o **espreitador**, armadilhas;
  - o **encantador**, pergaminhos **só de magia de utilidade** (luz, voltar à
    cidade, identificar, abrir passagem), para não furar o mago que digita;
  - o **xamã** acha mais ervas, e melhores.
- **Coleta aberta, criação exclusiva.** Qualquer um colhe; quem tem o ofício
  colhe melhor. Só a classe cria, e o NPC vende o básico de tudo, para uma era
  com pouca gente de uma classe não travar ninguém.
- **Beber poção leva tempo** e deixa vulnerável, como o mago digitando: a
  poção é decisão, não reflexo.
- **A loja não vende consumível**, para não competir com quem produz.
- **O que continua do sistema anterior:** os atributos; o formato de disco em
  cada círculo (compra-se nó encostado num que já se tem); a morte tirando os
  últimos nós comprados; o mago da memória; e a segunda classe como tabela de
  exigências, em que uma dupla nova é uma linha a mais.

### Morte e mago da memória — DECIDIDO

- **Curva de experiência do Tibia.** É ela que faz as perdas pesarem mais
  conforme o personagem cresce.
- **Morrer custa 5% da experiência total** e pode tirar nível. Os pontos que
  saem são os últimos comprados, e voltam quando o nível volta.
- **O mago da memória apaga todos os pontos por 3% da experiência.** Morrer
  sempre sai mais caro que ele, então ninguém morre de propósito para
  redistribuir. O custo de verdade vem da experiência. O ouro é moderado,
  medido em 20 minutos de caça no nível de quem paga, e **dobra a cada uso**:
  apagar a memória fica cada vez mais difícil para o mago.
- **Na ilha inicial o mago trabalha de graça**, e o uso não conta para dobrar o
  preço. É lá que se aprende o sistema.

### Cosmético é enfeite — MUDOU (27/9)

> Com *classes por quest*, o visual é da classe e o cosmético é só de cabeça.
> A regra de a tintura não disfarçar o material continua para a arma e o escudo.

Se o personagem veste armadura pesada, tem que parecer armadura pesada. O
cosmético é uma camada por cima e nunca substitui a peça. **Tintura é
cosmético** e muda a cor, não o material: aço pintado continua brilhando como
aço.

### Estética de 1993, jogo de 2026 — DECIDIDO

A aparência é dos anos 90; a jogabilidade é moderna (movimento livre, mira
livre, pulo, dash). O gênero de referência já existe e se chama *boomer
shooter* (Dusk, Amid Evil, Ultrakill, Cultic).

Regra que separa as duas coisas: **a estética mora nos pixels, não na
geometria.** 320×200, paleta indexada, dithering, colormaps, sprites — isso é
intocável. Como as paredes são calculadas por baixo, não importa.

**A tela é 640×360, em 16:9 e com pixel quadrado — DECIDIDO, e MUDOU em 30/9: o
padrão de desenvolvimento passou a ser HD (1280×720); ver *densidade e tela:
256 voxels e HD*, abaixo.** O jogo desenha
640×360 pixels e cada um vira um número inteiro de pixels do monitor: 2× numa
tela 720p, 3× em Full HD, 4× em 1440p e 6× em 4K. O pixel continua visível em
qualquer monitor, que é o que mantém a cara de pixel art. **320×180**, a metade
exata, fica de opção para máquina fraca. A paleta, o dithering e as colormaps
não mudam.

A decisão saiu de comparar a mesma cena no motor de verdade em 320×200, 640×360
e 1280×720. 1280×720 não encaixa inteiro em Full HD, o pixel do jogo quase some
num monitor comum e o processador não dá conta: uns 30 ms por quadro no píer
vazio. 640×360 custou uns 11 ms no píer e 20 ms dentro de casa, com parede
perto — o segundo número já passa dos 16,7 ms de 60 quadros e pede otimização
antes do co-op. Os 320×200 com pixel 1,2 vez mais alto saem de cena; painel,
menus, fontes e a arma são redesenhados para 16:9, e o campo de visão padrão
sobe para uns 96° para a vertical continuar a de hoje.

**Densidade: personagem em 128 por tile, mundo em 64 — DECIDIDO, e o personagem
MUDOU em 30/9: passa a ser de 256 voxels de altura; ver *densidade e tela: 256
voxels e HD*, abaixo.** Testado na
ilha, em 640×360, com o desenho de referência do humano convertido em voxel.

- **Personagens e criaturas: 128 voxels por tile**, um humano de uns 117 de
  altura. Em 64 (58 voxels) o rosto vira borrão e a alça da bolsa some; em 117
  aparecem o rosto, a alça, a fivela e a bolsa. É onde o jogador olha de perto:
  terceira pessoa a 1,6 tile, provador, conversa — e cosmético é o produto.
- **Paredes, chão e telhados: textura de 64 por tile.** Em 640×360 ela aparece
  1 para 1 a uns 5 tiles, então quase tudo fica ampliado, com pixel marcado e
  estável. As mesmas texturas geradas em 128 pelo mesmo código ficaram lisas:
  128 só vale desenhado com mais detalhe, e são quatro vezes mais pixels para
  pintar em centenas de superfícies.
- **Cenário — árvore, pedra, barril, lampião — sobe de 37 para 64** voxels por
  tile. É feito de bolas e cápsulas por código, então subir é refazer a conta.
- **Exceções em 128: o que se vê de perto e carrega informação** — placa com
  texto, porta, balcão. O motor já aceita um tamanho por textura.
- **A diferença é de propósito:** personagem mais detalhado que o fundo se
  destaca no meio de gente e de combate. Ragnarok Online vive disso.
- **Versões menores:** longe, o personagem troca pela cópia de 58 voxels; sem
  ela ele cintila ao andar a partir de uns 2,5 tiles. O mundo em 64 só cintila
  depois de uns 5 tiles e fica sem mipmap por enquanto.
- **Densidade quase não pesa no quadro.** No píer: 10,2 ms em 64, 10,4 em 128 e
  11,4 com versões menores. Quem pesa é a resolução da tela.

### Densidade e tela: 256 voxels e HD — DECIDIDO (30/9)

O Leandro achou os bloquinhos do personagem grandes. A sondagem 11 pôs o
mesmo guerreiro no jogo em 117, 165 e 256 voxels, e em telas de 640×360,
960×540 e 1280×720. **O padrão para seguir desenvolvendo é o personagem de 256
voxels de altura (uns 280 voxels por tile) e a tela HD de 1280×720**, com as
outras como opções para o jogador ajustar à máquina dele.

- **A fonte de verdade é a de alta resolução.** O personagem se desenha e se
  guarda em 256; 165 e 117 saem dele (o projeto do ateliê guarda a fonte,
  `atelie/resolucao.js`). Forma vinda de um gerador de malha, cor do desenho:
  a fonte só ganha detalhe de cor com um desenho de mais pixels de arte (o de
  hoje tem uns 125).
- **Opções gráficas, para o jogador:** a escala da tela (320×180, 640×360,
  960×540, 1280×720; existe no painel de ajuste, tecla T) e a densidade do
  personagem (117, 165, 256; falta fazer). A máquina fraca usa as menores.
- **Por quê:** a 1,6 tile (a câmera de terceira pessoa) o de 256 tem 0,64 pixel
  por voxel em 640×360 e o jogo amostra o sprite sem média, então só mostra o
  detalhe em tela maior: em 960×540 tem 1,0 e em 1280×720, 1,3. O ganho visual
  de 117 para 165 e para 256 é grande; de 256 para 512 é pequeno (a fonte não
  tem mais o que dar).
- **O que isso obriga (ver o `PLANEJAMENTO.md`):** o desenho de 1280×720 a 60
  quadros (hoje, 46 por segundo numa cena simples, no navegador), uma cópia
  reduzida do sprite escolhida pela distância (o mip), e refazer em 256 a
  grade do jogo, a mão da arma, o lugar da cabeça, as armas, os chapéus e o
  morador. O 1366×768 não entra: não é múltiplo de 320×180 (o HD inteiro mais
  perto é 1280×720).
- **1/10, decidido pelo Leandro:**
  - **O HD (1280×720) é o padrão de fábrica.** Na ilha ele roda a 60 quadros
    por segundo e na vila a 55 ou 58, depois da otimização do rasterizador.
  - **O guerreiro fica como corpo de teste** (`?corpo=guerreiro`). A skin é
    oficial e dá a prévia do 256; o humano continua sendo o corpo do jogo.
  - **O arquivo do corpo pode ir num formato menor, desde que não perca
    detalhe.** O PERSONAGEM 3 é comprimido sem perder nenhum voxel: em 256
    caem de 20 para 8 MB.
  - **O mundo tem que subir também.** Viu as imagens e aprovou: o padrão
    passa a ser **texturas de 128 por tile, com mip, e cenário de 128 voxels
    por tile** (sondagem 13). O `?mundo=64` volta ao de antes.
  - **Um andarilho com a skin do guerreiro passeia na vila**, para ver o 256
    de todos os lados (é de teste, como o corpo).

### Monetização só cosmética — DECIDIDO

Único item vendável, e só depois de muito tempo. Sem pay-to-win. Desde 27/9,
com *classes por quest*, o cosmético é só de cabeça, e a loja não vende
consumível, para não competir com o alquimista e o encantador.

---

## O mundo

- Dividido em **zonas** — países ou cidades-estado.
- Masmorras, cavernas, montanhas. Espaço aberto **e** interior.
- **Mostrar muito antes de permitir.** O objetivo fica no campo de visão desde
  o primeiro dia. Uma espada brilhando no topo de uma montanha que ninguém
  alcança vira lenda. Um dia alguém chega lá, e o servidor inteiro fica
  sabendo.
- **Enigmas que resistem à wiki:** uma porta cuja charada muda conforme o item
  no inventário de quem a examina. Um enigma que ninguém decifrou é conteúdo
  ativo, não conteúdo pendente.

### Geografia — DECIDIDO (24/9)

- **Clima por zona.** A ilha inicial é temperada. O continente tem zonas de
  clima diferente e várias cidades, uma delas com tema steampunk.
- **A montanha se explora em cima e por dentro.** Ela é oca, no próprio mapa,
  e não uma entrada que leva a outro mapa: entra-se por baixo, sai-se por
  cima, e pela boca da caverna se vê o céu.
- **Sobe-se só por trilha.** Sem corda nem gancho: complicaria tudo.
- **Sem nado.** A água funda é barreira. O rio se atravessa por tronco caído,
  pinguela, vau raso (com pedras; a água rasa já se anda), ponte de corda,
  açude, arco de pedra natural e, mais tarde, balsa na corda — nunca por algo
  de onde se caia na água funda.
- **Comunidade aberta.** Se houver divulgação, vai ser num canal do YouTube e
  em fóruns.

#### Aceito como ponto de partida (24/9)

O Leandro aceitou as propostas abaixo como plano: o que não agradar, muda.

- **O continente é gerado, não desenhado.** Ele é sorteado de novo a cada era,
  e uma pessoa não desenha um continente por era. O canteiro faz os
  **módulos** — um quarteirão, uma fortaleza, uma ruína, um trecho de serra com
  caverna — e as regras de onde cada um cabe; um gerador monta o continente
  com a semente da era, e a validação (alcance andando, pior quadro) confere e
  sorteia de novo onde falhou. O lote já é um gerador assim.
- **Oca para o raso, mapa separado para o fundo.** No mesmo mapa, o túnel que
  atravessa a serra, a gruta do mirante e o poço de luz que dá no cume; em
  mapa próprio, a dungeon funda, que no servidor pode ser instância por grupo.
  Cada oco pesa no quadro e complica o gerador.
- **A geografia serve a guerra.** Cada zona é um mapa — e um processo no
  servidor —, ligada às outras por gargalos: desfiladeiro, ponte, porto,
  portão. As fortalezas da guerra de fim de semana ficam nos gargalos, e a
  serra e o rio viram a linha de frente. A montanha oca dá a rota secreta que
  contorna a fortaleza.
- **A cidade steampunk.** O vapor vem do calor da terra — fonte termal, a
  caldeira de lava — e a técnica, dos anões (o ferreiro no alto da montanha
  da ilha já é um). É local e cara: fora da cidade aparece como mercadoria
  rara — o relógio na casa nobre, o lampião a gás, a arma do guarda.
  Dirigível ou trem entre as cidades é viagem rápida que custa e existe no
  mundo, sem viagem instantânea. Kit próprio: tijolo, chapa rebitada, cobre
  esverdeado, cano, engrenagem, chaminé de fábrica, poste a gás, torre do
  relógio. No motor ela pede peça animada, que serve também ao moinho, à roda
  d'água e à bandeira.
- **Vida pesa mais que prédio.** Fumaça na chaminé, galinha, cachorro, gado,
  pássaro, cervo que foge, varal, roça, morador com rotina, som do rio, passo
  diferente em cada chão. Os bichos que atacam já estão na lista; faltam os
  que não atacam.
- **A cidade gerada segue a classe.** O rico no alto, perto do castelo e
  contra o vento; o pobre no porto, perto do curtume, rio abaixo; os
  artesãos em ruas por ofício.

### As classes sociais e a mobília — aceito como ponto de partida (24/9)

Cada móvel é um tipo só, com a classe num campo — como a porta tem o
`aberta` —, e a classe muda a forma e o material. A cama vai da esteira de
palha ao catre, à cama com colchão e ao dossel; a mesa, da tábua sobre
cavaletes à mesa longa entalhada; a cadeira, do banquinho à poltrona
estofada; a estante, da prateleira de tábua à estante de livros. Materiais
novos saem do estilo, como a vidraça: tecido (palha, lã, linho, veludo),
metal (ferro, latão, ouro), louça, livros. Há móvel por ofício: cozinha,
taverna, ferreiro, loja, templo, quartel, alquimista, tecelã. O lote mobilia
sozinho pela classe e pelo ofício, sem tapar o giro da porta, a escada e a
janela, e a validação confere que se anda em todos os cômodos. O interior só
é desenhado com a câmera dentro ou perto da casa.

| Classe | Onde mora | O que marca a casa |
|---|---|---|
| Mendigo | barraco, sob a ponte, cortiço | palha, trapos, caixote de mesa |
| Camponês | choupana de um cômodo | catre, banco, fogo no chão, ferramenta de roça |
| Pescador | casa de tábua na beira | redes, remos, barril de sal |
| Artesão | loja embaixo, casa em cima | bancada do ofício, arca, cama de madeira |
| Estalajadeiro | estalagem | balcão, barris, quartos simples |
| Mercador | sobrado com armazém | balança, cofre, prateleiras |
| Mestre de guilda | casa de pedra com vidraça | tapete, tapeçaria, livros, louça |
| Cavaleiro | casa-forte | lareira grande, armas, estandarte, mesa longa |
| Alta nobreza | palácio | dossel, lustre, retratos, veludo |
| Clero | casa paroquial, mosteiro com celas, palácio do bispo | altar, manuscritos, bancos |
| Militar | quartel | catres, armeiro, mesa de mapas |
| Estudioso ou alquimista | torre, biblioteca | estantes, frascos, globo, luneta |
| Submundo | covil, taverna ruim | mesa de jogo, contrabando escondido |
| Mascate ou saltimbanco | carroça, tenda | baú, tapetes, varal |
| Operário (steampunk) | cortiço fabril | beliche de ferro, fogareiro |
| Inventor (steampunk) | oficina | engrenagens, plantas na parede, protótipos |
| Magnata (steampunk) | mansão | relógios, aquecimento a vapor, caixa de música |

## A guerra e o fim do mundo

Guerra contra o rei demônio (ou equivalente). As zonas vão sendo **conquistadas
uma a uma** até chegar às portas da capital. **Se a capital cair: game over e o
servidor reinicia** logo em seguida, com os segredos sorteados de novo. Inspirado
no Helldivers.

O reset não é só drama — é o mecanismo que **regenera o mistério**. Cada era
tem seu conjunto de segredos: enigmas re-sorteados, a montanha em outro lugar,
a charada pedindo outro item.

### Os caídos — DECIDIDO

Algumas classes podem **trair e cair** para o lado do rei demônio, numa quest. É
a traição do Griffith no Eclipse, em Berserk: sem consentimento de ninguém.

- **Cair exige o colar e a lua vermelha.** O aspirante precisa ter no inventário o
  colar dos fiéis do rei demônio e esperar a lua vermelha, o sinal de que há vaga
  aberta para caídos. Na lua vermelha, a quest do ritual dá a ele a opção de
  aceitar o poder, e só ele vê. Quem quer ser caído se prepara e espera, em vez de
  repetir a quest torcendo pela sorte e se frustrar. As quests não têm nível: quem
  limita é o colar.
- **O colar** é descrito como o símbolo que distingue os seguidores mais fiéis do
  rei demônio, e exala uma influência maligna. É **item de quest, drop raro de um
  chefe de dungeon, e pode ser vendido**. A raridade é o que equilibra: a ideia é
  que a traição aconteça em uma de cada dez vezes que a quest é feita, ou menos.
- **A lua vermelha sobe à noite enquanto houver vaga**, até fechar o número de
  caídos.
- **As vagas são 20% dos jogadores ativos**: 100 ativos dão 20 caídos. Jogador ativo
  é quem tem um nível mínimo e joga um tempo mínimo dentro de um número de dias.
  Os três valores ainda precisam ser definidos.
- **Aceitar é trair a party.** No exemplo, o clérigo vira necromante na hora, e o
  rei demônio manda criaturas fortes para a sala ajudarem a matar a party. É PvP
  aberto junto com criaturas.
- *(27/9: com classes por quest, cai quem tem magia sagrada, principal ou
  secundária; a tabela está em classes por quest.)*
- **A fatia muda, e as combinações mudam junto.** O clérigo some e o necromante
  toma o lugar dele no disco. Necromante com guerreiro dá **cavaleiro da morte**,
  o paladino caído.
- **Todos que estavam no ritual ficam marcados**, os que sobrevivem e os que
  morrem.
- **A marca é um radar dos dois lados.** O caído sente os marcados para caçá-los,
  e o marcado sente os caídos com **40% do alcance do caído**. O marcado nunca é
  pego totalmente de surpresa, e o caído tem uma ferramenta de caça. A preferência
  é que o sentido não seja um ponto no mapa, e sim um sinal que aparece e fica
  mais forte com a proximidade.
- **Os alcances são 100 tiles para o caído e 40 para o marcado**, 200 e 80 metros,
  como ponto de partida. Um personagem a 40 tiles tem 3 pixels de altura na tela de
  320×200, então ninguém reconhece o caído a essa distância, nem em campo aberto: a
  marca é aviso de verdade. Na velocidade de hoje, são uns 8 segundos de um caído
  correndo reto. No Tibia, um PK aparece na tela a uns 7 metros.
- **Os caídos ficam do lado do rei demônio e querem destruir o servidor.** Contra
  eles o PvP é aberto.
- **Não existe disfarce.** O caído é reconhecível. Nada impede um segundo
  personagem de espionar, e isso é aceito.
- **O caído ganha a experiência que a vítima perde**, os 5% da morte. Isso protege
  os novatos sozinho: um caído de nível 40 ganha 0,1 nível matando um de nível 20
  e 4,8 matando um de 80. O caído vai atrás de quem consegue reagir.
- **Derrotado, o caído renasce numa cidade caída**, no território do rei demônio.
- **As quests dos caídos aceleram o apocalipse:** abrir portais para criaturas mais
  fortes, em troca de itens melhores.

#### Proposta, ainda não decidida

- **Recusar a oferta também conta**, com um título ou uma bênção pequena. Assim,
  ter recusado o rei demônio também vira história.
- **Sem mínimo de vagas.** Com a proporção sobre jogadores ativos, um servidor
  pequeno não fica com metade dos jogadores caída.
- **Tempo jogando é atividade de verdade**, andar e lutar, não tempo logado. Senão um
  personagem parado conta como ativo.
- **Os caídos entram na mesma conta.** Um caído que para de jogar libera a vaga, e
  a lua volta a subir.
- **O colar aparece direto na mochila de quem o chefe escolheu**, sem ninguém ver.
  Se ele cair no chão como um drop comum, a party sabe quem pegou antes do ritual.
- **Vender o colar entrega uma informação:** quem vende sabe quem quer cair. É fonte
  de boato e de história.
- **Quem fica sem vaga guarda o colar para a próxima lua**, em vez de se frustrar
  de novo.
- **A surpresa precisa sobreviver à lua.** Ninguém vê o inventário dos outros, e a
  lua não diz onde nem quem. A quest precisa valer a pena mesmo na lua vermelha,
  senão as parties simplesmente evitam ela.
- **A lua usa o céu que já existe.** O céu da cripta já desenha uma lua avermelhada.
- **A sala do ritual tem saída**, que abre depois de um tempo, para fugir também
  ser um jeito de sobreviver.
- **A marca tem um custo**, como em Berserk: atrai criaturas à noite ou no
  território do rei demônio.
- **A mesma vítima rende cada vez menos** para o mesmo caído num período. Sem isso,
  um personagem secundário marcado pode morrer de propósito para passar nível a
  um amigo caído.
- **Caído não pisa na ilha inicial.**
- **A cidade caída precisa de loja, mago da memória e quests**, e cresce com a
  guerra: cada zona que cai vira mais uma cidade onde os caídos renascem.
- **Começar com uma conversão só**, a do necromante. Cada fatia caída pede 61 nós
  novos, cinco híbridos e dez trios.

  **Feito no simulador:** o necromante tem três ramos, ossos, drenar e maldição,
  na mesma ordem dos do clérigo, e os cinco híbridos e os dez trios dele. Uma
  caixa faz o clérigo trair: cada nó comprado vira o do necromante no mesmo lugar,
  a especialização vira a que espelha a dela, e nenhum ponto se perde. A receita
  do cavaleiro da morte é a do paladino depois da traição.
- **Os outros híbridos do necromante** espelham os do clérigo: carrasco com ladino,
  lich com mago, caçador de almas com arqueiro e semeador da praga com druida.

### A guerra de fim de semana — DECIDIDO

Todo fim de semana há guerra num território de fronteira, no estilo da Guerra do
Emperium do Ragnarok Online. É o que define o ritmo da guerra e como as zonas
caem.

- **A disputa é por uma cidade fortaleza.** Quem conquistar e mantiver até o fim do
  evento fica com ela.
- **A próxima guerra é no território de quem falhou.** Se os caídos não tomam a
  fortaleza, a próxima é no território deles. Se tomam, a próxima é no dos
  jogadores, uma fortaleza mais perto da capital.
- **Os caídos invocam hordas durante o evento**, porque são menos numerosos. As
  hordas não dropam nada e não dão experiência.
- **Durante o evento ninguém perde experiência** e, por isso, o caído também não
  ganha.

**A duração da era depende muito de quem vence mais.** Simulação com a guerra
começando no meio da linha de fortalezas:

| Fortalezas | Caídos vencem | Só a queda da capital encerra | Qualquer ponta encerra |
|---|---|---|---|
| 8 | 40% | 290 semanas | 13 semanas |
| 8 | 50% | 52 semanas | 16 semanas |
| 8 | 60% | 18 semanas | 13 semanas |
| 12 | 50% | 113 semanas | 36 semanas |

#### Proposta, ainda não decidida

- **O rei demônio fica mais forte a cada semana**, com hordas maiores e fortalezas
  mais duras. Mesmo um servidor que domina a guerra acaba cedendo com o tempo, e a
  era sempre termina. É a pressão da guerra do Helldivers, e é ela que evita a era
  de 290 semanas da tabela.
- **Chegar à última fortaleza do rei demônio abre a batalha final.** Se os jogadores
  vencem, ele cai e a era termina em vitória. Se perdem, a frente recua várias
  fortalezas de uma vez.
- **A era seguinte lembra a vitória**, com um cosmético para quem venceu e uma
  marca no mundo novo, como uma estátua com os nomes na nova capital.
- **Cosmético para o lado vencedor**, que é o que atravessa a era.
- **A semana prepara o fim de semana.** Os portais dos caídos enfraquecem a próxima
  fortaleza, e fechá-los é o trabalho dos jogadores durante a semana.
- **Quem defende renasce perto**, porque a cidade dele fica ao lado da fortaleza.
  Isso compensa o número menor de caídos, e as hordas equilibram o outro lado.
- **Hordas de um lado e guardas NPC do outro** fazem a guerra funcionar com pouca
  gente online.

#### Quando os jogadores vencem — em aberto

Na derrota, o servidor reinicia logo em seguida. Na vitória há três caminhos, e
uma enquete entre os jogadores pode decidir qual:

1. **O servidor reinicia depois de um tempo**, de um a três meses. Dá tempo de
   aproveitar a vitória e de perceber que o mundo perde a graça sem guerra.
2. **O servidor vencido fica, e abre um novo do começo.** Quem quer ter o que fazer
   migra. É o modelo de ligas do Path of Exile: o mundo vencido faz o papel da
   Standard, permanente e esvaziando aos poucos.
3. **Um portal leva a um mundo de outro tema**, como steampunk com classes novas, e
   recomeçar vira escolha de quem atravessa. Cada tema novo seria uma expansão.

Dois cuidados valem para qualquer caminho:

- **Dividir a população.** Servidores abertos ao mesmo tempo repartem os mesmos
  jogadores. Com poucos, cada um fica vazio demais para a guerra e para as vagas de
  caídos. O servidor novo deveria abrir quando o vencido esvaziar, e só um servidor
  por tema deveria estar em guerra.
- **Tema novo custa arte.** Um primeiro mundo diferente pode mudar a história e o
  mapa mantendo as classes; as classes novas vêm depois.

---

## A ilha inicial

Primeira zona permanente e MVP do mundo. Inspirada em Rookgaard: uma ilha
pequena com cidade, porto e as entradas das primeiras dungeons. É o que não
muda entre eras — o continente é o que se re-sorteia.

**Decidido:**

- **Inspirada, não copiada.** Os mesmos ingredientes de Rookgaard — porto,
  templo, lojas, academia, esgoto, mina, norte selvagem — com planta e nomes
  próprios. Copiar o mapa da CipSoft não tem problema num projeto pessoal; vira
  problema no dia em que o jogo for publicado ou vender cosmético.
- **Fim de tarde.** Sol baixo a oeste. Cidade inicial à noite parece morta, e
  sol a pino apaga as faixas de cor que dão a cara de 1993. O céu, a névoa e as
  texturas de fora vão ser refeitos para essa luz; a cripta continua escura.
- **A cripta vira a primeira dungeon.** Entra-se por uma porta ou escada da
  ilha, e ela passa a ser um mapa separado.
- **O mapa é desenhado num editor**, não à mão. São 40 mil caracteres: dá para
  escrever uma vez, não para manter por anos. Ver *o formato de mapa*, em
  decisões técnicas.
- **O jogo abre na ilha.** A cripta é a primeira dungeon dela: desce-se pela
  capela de Pedra Alta, e `?mapa=cripta` abre direto.
- **Velocidade andando: 65**, uns 6,1 m/s ou 3 tiles por segundo. Menos que
  isso ficou arrastado jogando.
- **A ilha de hoje é esboço e vai ser refeita do zero, bem maior**, pelo
  Leandro no editor. Não vale gastar trabalho nela: a cidade, as coisas e o porto
  são juntados ao mapa novo quando a geografia estiver pronta.

### Escala: copiar o mapa, não a grade

Um tile daqui mede uns 2 metros, pela altura do jogador e do teto. O quadrado
do Tibia mede 1. Rookgaard copiado quadrado por quadrado daria uma ilha de uns
75 tiles, atravessada andando em 16 segundos, com casas do tamanho de um
armário — as casas do Tibia são espremidas porque a câmera fica em cima.

A ilha copia Rookgaard **como diagrama**: o que fica perto de quê, onde a
estrada faz curva, o que se vê de cada ponto. Cada prédio ganha o tamanho de
quem anda dentro dele.

**O tamanho se mede em tempo, não em metros.** A ilha esboçada tem uns 182
tiles de lado, uns 360 metros, e a 65 se atravessa em um minuto: pequena demais
mesmo para começar. O alvo é **uns 3 minutos atravessando em linha reta**, que a
65 dá uns 550 tiles; com os desvios de floresta, lago e serra o caminho real
fica em 4 a 5 minutos, e dá para tirar um quarto dessa largura. Com mar em
volta, a grade fica na casa de 600 a 650 tiles de lado. O custo por quadro não
muda, porque só se desenha até 60 tiles; crescem o carregamento, o arquivo do
mapa e o peso no editor, que precisa ser testado nesse tamanho.

Três regras de exploração:

- **Algo novo a cada 20 a 40 segundos de caminhada**, uns 60 a 120 tiles.
- **Primeira pessoa encolhe o mundo.** No Tibia se vê uma dúzia de quadrados de
  cada vez; aqui se veem 60 tiles para a frente. O mapa precisa de mais área ou
  de mais coisa que esconda a vista: floresta, morro, curva de estrada.
- **Crescer para dentro.** Cavernas e a cripta são mapas separados e somam
  horas de exploração sem aumentar a ilha. A montanha, desde 24/9, é oca e se
  explora por dentro no próprio mapa — ver *geografia*.

### A montanha, as cavernas e o porto

Planos do Leandro para a ilha nova:

- **Uma montanha que se sobe, com um anão ferreiro no topo.** No motor de hoje
  todo tile de rocha é parede: vira um bloco dois tiles acima do chão mais alto
  do lado, e nenhuma encosta pintada de rocha se sobe. Falta um terreno de chão
  com cara de rocha, a **encosta de pedra**, para a parte que se anda — a rocha
  continua sendo o penhasco —, trilhas de no máximo um degrau por tile e uma
  **ferramenta de rampa** no editor, que preenche os degraus entre dois pontos.
- **Entradas de caverna que são dungeons**, com a entrada de dungeon que o
  editor já tem.
- **O porto numa ilhota**, ligada à ilha por uma passarela de tábua.
- **A silhueta do relevo além da névoa.** Para cada direção, o relevo que sobe
  mais no horizonte depois dos 60 tiles vira silhueta pintada, numa cor puxada
  para a do céu. Só entra o que fica acima da linha dos olhos, e o perfil é
  suavizado entre direções vizinhas para não parecer fileira de prédios.
  Recalcular custa uns 4 ms e só acontece quando a câmera anda meio tile. Foi
  vista num protótipo com o rascunho de 300×300; do alto da montanha, a terra
  baixa ao longe ainda não aparece.

### O que falta no motor, na ordem do que trava primeiro

1. **Geometria montada uma vez só**, em pedaços, com trechos de piso iguais
   fundidos num polígono. Ela ainda é refeita a cada quadro, mas a medição
   mostrou que isso cabe: a ilha passou a desenhar 60 tiles. Vira necessário
   quando o alcance precisar passar de 90.
2. ~~**Altura por tile vinda do mapa**, em vez de retângulos.~~ **Feito** na
   primeira passada do Ver no jogo.
3. ~~**Água e mar.**~~ **Feito em parte:** água rasa e funda animadas, e o mar
   desenhado no céu abaixo do horizonte. Falta espuma na beira e respingo.
   Nado não vai ter: a água funda é barreira (ver *geografia*).
4. **Mais de um mapa**, trocando numa porta ou escada.
5. ~~**Textura pelo terreno do tile**, e não pela sala da cripta.~~ **Feito**,
   junto com o céu de fim de tarde.
6. ~~**Objetos de cenário**~~ **Feito**, menos cerca e barco.
7. **NPC e caixa de conversa.** Os moradores existem em voxel e dizem o nome
   quando se chega perto. Falta a conversa, e a aparência deles espera o
   personagem composto por peças — corpo, cabeça, cabelo e roupa combinados de
   doze jeitos. O personagem do jogador sai quase de graça.

### Ordem de trabalho

1. ~~Editor de mapa.~~ **Feito.** Com **Ver no jogo**: um botão abre o jogo
   andando no mapa da tela, sem salvar. É uma primeira passada, sem conceito
   novo no motor — parede vira bloco alto, água é piso na altura do mar, casa
   com forro ganha telhado por cima. Existe para quem desenha ter noção do que
   desenhou.
2. ~~**Teste de desempenho.**~~ **Feito**, no navegador, com um mapa de 200
   tiles. O mundo custa 1,6 ms por quadro com 30 tiles de alcance, 2,5 ms com 60
   e 4 ms com 90, de um orçamento de 16. A ilha passou a desenhar 60, e com a
   cidade e o cenário o quadro inteiro fica entre 4 e 6,5 ms. O limite
   não é tempo: longe demais cada tile vira meio pixel e cintila, e o conserto
   é juntar os tiles distantes, não desenhar mais deles.
3. ~~**Cenário.**~~ **Feito**: árvore, pinheiro, arbusto, pedra, barril, caixote,
   lampião, poço, placa e morador, todos do assador de voxel, com um quadro só.
   O morador diz o nome quando se chega perto; conversa ainda não existe.
4. ~~**Pedra Alta**~~ **Feito como esboço**, em `mapas/ilha.mapa`: escadaria do
   leste até o platô, praça com poço, armazém, taverna, ferraria, três casas e o
   templo no pico. Serve para ter noção de escala, não é a planta final. Visto no
   jogo, ficou claro o que falta: pixels grossos na tela grande, moradores com
   aparência fraca e casas que são blocos. Os três estão no `PLANEJAMENTO.md`.
5. **Juntar os tiles distantes** quando o alcance precisar passar de 90.
6. ~~**Uma fatia pequena**~~ **Feita**: o porto, a praia e a estrada até o portão
   da cidade, com a casa do barqueiro de interior e NPC. O jogador chega pela
   ponta do píer. Ver o `PLANEJAMENTO.md`.
7. Cidade, mato, e as entradas das dungeons — que existem desde o começo,
   fechadas: caverna com grade, poço lacrado, o navio que ainda não zarpa. É o
   "mostrar antes de permitir".

---

## Referências e o que se pega de cada uma

| Fonte | O que se aproveita |
|---|---|
| **Tibia** | Mundo perigoso, morte que custa, poder solar sendo aterrorizante |
| **Ragnarok Online** | Builds divergentes dentro da mesma classe |
| **Helldivers** | Guerra global compartilhada que pode ser perdida |
| **Doom / Heretic** | A aparência: sprites, paleta, colormaps |
| **Quake** | A geometria 3D de verdade |
| **Dusk / Amid Evil** | A fórmula "estética antiga, desenho de jogo moderno" |
| **Path of Exile** | Ciclos com reset e persistência só cosmética |

---

## Riscos conhecidos

- **Traição e PvP contra caídos.** Morrer por confiar em alguém pode fazer gente
  largar o jogo. A marca, que dá vantagem a quem foi traído, é o que transforma a
  perda em história.
- **Contas falsas para abrir vagas de caídos.** Se as vagas crescem com o número de
  jogadores, criar contas aumenta as vagas. A definição de jogador ativo, com nível
  e tempo jogado, é o que torna cada conta falsa cara.
- **Latência × combate de habilidade.** Mirar e esquivar pela internet é bem
  mais difícil que tab-target. Não é impeditivo, mas exige netcode sério
  (passo de tempo fixo, predição no cliente, reconciliação). Proposta de
  24/9: testar com dois jogadores numa arena, com o servidor rodando o mesmo
  código do jogo, antes de encher o mundo de conteúdo — se o combate não se
  sentir bem com 100 a 150 ms de atraso, ele muda, e é melhor saber cedo.
- **O segredo no cliente.** O jogo é um HTML que qualquer um abre: o mapa, a
  resposta do enigma e a sala escondida que estiverem nele saem no primeiro
  dia num fórum — o contrário da tese. O servidor precisa mandar o mapa aos
  pedaços, conforme o jogador chega, e o segredo só quando descoberto. Hoje o
  mapa vai inteiro embutido no build.
- **Comunidade aberta.** Conta sem guardar senha (entrar pelo Discord ou pelo
  Google), LGPD, menor de idade, chat com denúncia e banimento, e moderação
  quando o Leandro não está. Traição e PvP aumentam tudo isso.
- **População mínima.** Mitigado pela decisão "risco, não porteiro", mas ainda
  é o risco estrutural do gênero.
- *(27/9: com classes por quest, o que se troca no corpo cai para cabeça, arma
  e escudo.)*
- **Cosmético × sprite é combinatório.** Cada peça precisaria existir em 8
  rotações × quadros de animação. Ver *decisão técnica pendente* abaixo.
- **Abandono.** O risco real de um projeto de 10 anos. Mitigações: git,
  testes, sempre manter jogável, nunca deixar quebrado por semanas. Proposta
  de 24/9: devlog público desde já — o motor em software feito do zero e o
  editor de mundo rendem vídeo, e ter público dá compromisso. O itch.io
  publica jogo em HTML de graça, e o Discord faz o papel de fórum.

---

## O protótipo hoje — *A Cripta de Vhalgorn*

Uma fase single-player jogável. Serve para testar estética e sensação de
movimento, **não** as mecânicas de MMO.

**O que existe:**

- Motor 3D próprio: rasterizador de polígonos por software, z-buffer, textura
  corrigida em perspectiva, 640×360 com pixel quadrado
- Altura de piso e teto por tile: poços, degraus, plataformas, mezanino, pé-direito alto
- Mira livre até 85°, pulo (com *coyote time* e buffer), agachar, dash de 2 cargas
- Movimento com inércia: resposta imediata no chão, controle parcial no ar
- Projéteis com eixo Z; flecha com gravidade, desenhada como segmento projetado
- 6 tipos de inimigo: diabrete, goblin arqueiro, cavaleiro espectral, aranha
  (rasteira), morcego (voa), e o chefe Vhalgorn
- Portas, porta selada por chave, parede secreta
- 3 armas: adaga, cajado, grimório
- Fervor: matar rápido acelera a regeneração de mana
- Céu noturno com serra no horizonte e névoa: fora da cripta as texturas
  desbotam na cor do horizonte em vez de escurecerem até o preto
- A câmara de lava é uma caldeira aberta para o céu
- Ferramentas de teste: `G` invencível, `N` atravessar paredes e voar,
  `K` arsenal completo, `V` vitrine. O HUD avisa quando estão ligadas.

  A vitrine para as criaturas onde estão: não perseguem, não atacam e não
  viram para encarar você. É o único jeito de conferir arte — com o bicho em
  cima de você não dá para ver de que lado ele está virado, que é justamente
  o que o modelo de voxel veio resolver. Elas continuam andando no lugar,
  para as duas poses da caminhada aparecerem.
- Painel de ajuste (`P`): velocidade com `H` e `J`, campo de visão, altura dos
  olhos, resolução do mundo e contador de quadro, guardados no navegador. A tela
  cresce só por números inteiros de pixels do monitor.
- Tudo procedural: texturas, sprites e áudio gerados por código, sem arquivo externo
- **418 testes automatizados** em nove baterias: 67 de jogo, 49 do motor 3D, 78
  do formato de mapa e do editor, 60 dos mapas rodando no motor, 88 das
  regras do personagem, 25 do personagem por peças e do provador, 28 do
  conversor de desenho, 13 da conversa e 10 dos formatos de voxel de
  terceiros (.vox e .wgvox)

**Desempenho:** 1 a 2,6 ms por quadro (update + render). Muita folga.

### Estrutura do código

O arquivo publicado é a concatenação de:

| Arquivo | Conteúdo |
|---|---|
| `p1.html` | Página, CSS, moldura |
| `p2.js` | Mapa ASCII, texturas procedurais |
| `p2b.js` | Alturas por tile, compilador de geometria |
| `p3.js` | Sprites e armas (pipeline de pixel art) |
| `p3b.js` | Maquinário de voxel: peças, pele, assador de rotações |
| `p3c.js` | Os modelos das seis criaturas |
| `p3e.js` | O personagem composto por peças |
| `p3d.js` | O cenário da ilha |
| `p4.js` | Áudio, estado, física, IA, projéteis — **é praticamente o servidor** |
| `p5a.js` | Renderizador 3D — **é praticamente o cliente** |
| `p5.js` | HUD, entrada, laço principal |

O `build.js` monta também o `provador.html`, com `p2.js`, `p3.js`, `p3b.js` e
`p3e.js` dentro de uma página própria.

Testes: `teste/jogo.test.js`, `teste/motor3d.test.js`, `teste/mapa.test.js`,
`teste/ilha.test.js`, `teste/regras.test.js`, `teste/personagem.test.js`,
`teste/conversa.test.js` e `teste/wgvox.test.js`.
`teste/verifica.js` valida sintaxe, o mapa da cripta, alcançabilidade e escapes
unicode. O README do código diz o que cada bateria cobre e lista as regras que os
testes protegem.

### Pipeline de arte

Sprites são desenhados com **gradientes reais** e depois quantizados para uma
paleta fixa com **dither ordenado de Bayer** — que é o processo original: os
sprites do Doom eram miniaturas de argila fotografadas e reduzidas a 256 cores.
O arquivo inteiro é **ASCII puro**, para não depender de charset declarado.

Toda imagem é guardada em **cor indexada**: um byte por pixel, e a cor sai de
uma **COLORMAP** de 16 níveis de luz compartilhada por quem usa a mesma paleta.
É como o Doom cabia na memória de 1993, e aqui resolve o mesmo problema por
outro motivo — ver "o custo de uma criatura", abaixo.

---

## Decisões técnicas

### Já tomadas

- **Manter o pipeline de pixel de 1993, trocar o de geometria pelo de 2026.**
  Foi o que permitiu mira livre e pulo sem perder a aparência.
- **Mapa continua sendo ASCII editável**, compilado em geometria com alturas
  vindas de zonas retangulares.
- **O formato de mapa.** A ilha e as dungeons novas moram em
  `mundo-perigoso/mapas/*.mapa`: texto ASCII com três grades do mesmo tamanho
  — terreno, altura e teto — e uma lista de coisas. O formato está documentado
  no topo de `mundo-perigoso/src/mapa.js`, que é o mesmo código que o jogo vai
  usar para carregar. Quem escreve é o canteiro, `mundo-perigoso/canteiro/canteiro.html`.
  O jogo lê esse formato quando é aberto pelo botão **Ver no jogo** do editor;
  sem isso, abre a cripta, que continua no mapa antigo até virar dungeon.

  Três escolhas do formato que valem para sempre: a altura é em **degraus de
  0,25 tile**, e um degrau se sobe andando enquanto dois já são parede — é o
  relevo em patamares do Tibia, e a colisão atual já funciona com ele. O
  **teto é relativo ao piso**, então uma casa em terreno inclinado pinta-se com
  um número só. E numa parede o mesmo número diz a **altura da parede**, que é
  o que falta saber ao ar livre, onde não há teto para a parede encostar.

### Pendente e importante — o personagem composto por peças

> 27/9: com *classes por quest*, o corpo é da classe, e as peças trocáveis são
> só a cabeça, a arma e o escudo.

Cosmético é o único produto, e desenhar sprites à mão não escala: cada
capacete novo viraria 40 desenhos.

**Solução:** montar personagens como **modelos de voxel compostos** (corpo +
cabeça + elmo + armadura + capa + arma) e assar as 8 rotações automaticamente
no carregamento. Um cosmético novo passa a ser uma peça, não um catálogo de
desenhos. De quebra, resolve as rotações dos monstros e permite iluminação
direcional de verdade.

**É a peça que mais precisa ser construída para durar.** Barato decidir agora,
caro depois.

**Decidido: como o personagem passa a ser feito.** As peças de hoje são bolas e
cápsulas escritas em código, e em 117 voxels isso só vira um boneco de massinha
maior. A resolução dá espaço; o que melhora é mudar o jeito de criar:

- **Desenho em escala 1 para 1:** um pixel do desenho é um voxel, e um humano
  tem 117 pixels de altura. O desenho de referência tinha uns 82, e convertido
  em 117 voxels aparece inteiro mas não ganha detalhe.
- **Três vistas sobre um molde fixo:** frente, lado e costas, na mesma altura,
  com ombro e quadril na mesma linha e os braços um pouco afastados do corpo.
- **Um conversor** recorta a silhueta das três vistas e pinta cada voxel com a
  cor da vista que o enxerga. Testado com a frente e as costas do desenho de
  referência: de frente o humano ficou reconhecível, rosto, colete, alça,
  cinto e bolsa; girado 90° ficou errado, porque sem a vista de lado os lados
  são inventados. O que as três vistas não mostram, como o vão entre braço e
  corpo, se retoca num editor de voxel.
- **Esqueleto com cotovelo e joelho**, umas 15 partes, cada peça presa a um osso.
  Uma pose nova vale para todo equipamento.
- **Equipamento é camada sobre o mesmo molde**, dividido pelas mesmas partes: a
  manga no braço, a bota na canela e no pé.
- **Assado em segundo plano e guardado por visual:** oito poses em oito rumos
  são 64 imagens, pesado demais para travar o jogo na hora de trocar de
  câmera. Sem *worker* — o `build.js` já concatena tudo num arquivo só, e
  separar um arquivo à parte para a thread quebraria isso — a fornada assa
  aos poucos dentro do próprio laço do jogo, um pouco por quadro, com a pose
  parada saindo primeiro em todos os rumos. Dez jogadores com o mesmo
  equipamento usam as mesmas imagens.
- **A cópia de 59 voxels de altura** assume quando o personagem está longe.

**Feito: o esqueleto de 117 e o molde.** O personagem passou a ter 117 voxels de
altura, a 128 por tile, numa grade de 80×56×117, com cotovelo e joelho que
dobram no passo e as proporções medidas no desenho de referência. As peças
provisórias foram refeitas nessa escala, e o provador, os moradores e a
terceira pessoa já usam o personagem novo, com a cópia de meia resolução para
longe. Montar a grade ficou cem vezes mais rápido — distância ao segmento no
lugar de esferas carimbadas — e assar uma pose com a cópia caiu de 840 para uns
220 ms. O molde para desenhar por cima está em `mundo-perigoso/Arte/`, com as
instruções no `LEIA-ME.md` de lá.

**Feito: o conversor de três vistas.** `editor/conversor.js` lê frente, lado
e costas desenhadas sobre o molde e devolve a grade de voxels: o casco vem da
silhueta de frente∪costas cruzada com a de lado, com seções arredondadas, e a
cor de cada voxel vem da vista que enxerga aquele lado do corpo. Sem a vista
de lado ele avisa em vez de inventar — foi o erro do primeiro teste, que girou
90° e saiu errado por falta dela. `editor/personagem.js` roda o conversor pela
linha de comando e grava um `.personagem`: texto ASCII com corridas
comprimidas, a mesma ideia de `.mapa`. Como ainda não existe o desenho do
Leandro, um conversor à parte (fora do jogo, script de uma vez só) tirou um
corpo provisório do desenho de referência que abriu esta seção — sem a vista
de lado, então o perfil é inventado por um cilindro achatado, e por isso ainda
não está bom visto de lado. `mundo-perigoso/personagens/humano.personagem`
guarda esse corpo, o jogo e o provador já o usam no lugar das cápsulas, e
trocar pelo desenho de verdade é rodar `editor/personagem.js` de novo — nenhum
código muda.

**Feito: assar em segundo plano**, mas sem thread: ver a fornada, abaixo.

**Feito:** o bestiário inteiro — diabrete, goblin, cavaleiro espectral,
aranha, morcego e Vhalgorn — é modelo de voxel com 8 rotações assadas no
carregamento — as cinco poses, morte e cadáver inclusive. **Falta o próprio
personagem**, que é onde o sistema de cosmético começa a existir de verdade.

**Feito: o personagem por peças e o provador**, com peças provisórias que esperam
as referências do Leandro (o corpo em si já não é provisório do mesmo jeito —
ver o conversor, acima). `src/p3e.js` monta o corpo e oito espaços — roupa,
armadura, cabelo, elmo, capa, escudo, arma e enfeite — num esqueleto de doze
juntas, e assa os oito rumos no mesmo assador das criaturas. Os moradores da
ilha já saem daí. O provador, `provador.html`, é uma página à parte, montada
pelo mesmo `build.js`, onde o personagem gira, anda e troca de peça.

**Feito: a movimentação.** O esqueleto deixou de guardar posições fixas por
pose e passou a calcular a pose por ângulo — cinemática inversa nas pernas (o
pé manda onde pisar, o joelho dobra para a frente sozinho para manter o
comprimento do osso) e balanço de ombro e cotovelo nos braços, sempre a partir
do mesmo repouso que o molde usa, então a pose parada continua sendo
exatamente o desenho. O ritmo do passo segue a distância andada, não o
relógio — meio tile por meio ciclo, então correr mais rápido faz passos mais
rápidos de verdade, e parado ele alterna para a respiração devagar. A postura
do passo ficou mais fechada (a queixa era "anda com as pernas muito abertas")
e ganhou vinte poses ao todo: parado, respirar, andar (6 quadros), correr (4,
amplitude maior, disparada no dash), pulo, atacar (2, golpe corpo a corpo),
conjurar (2, cajado ou grimório) e bloquear e atirar com arco (os dois
últimos ainda sem tecla própria no jogo — o bloqueio e o arco de verdade são
mecânicas a decidir, não só animação; por ora só aparecem no provador).

**Feito: a arma certa na mão.** Em terceira pessoa o personagem segura a arma
que está de fato equipada (`WPN[P.wpn]`), não uma escolha do provador — cada
arma do jogo (adaga, cajado, grimório — livro novo, `PECAS.arma.grimorio`)
vira a peça correspondente. Trocar de arma assa uma fornada nova por baixo,
com o jogador segurando a arma antiga até a nova ficar pronta, sem piscar. E
enquanto o `P.anim` de um golpe ou feitiço está contando, a pose vira ataque
ou conjurar na hora certa — não precisa que o quadro de terceira pessoa saiba
nada sobre `fire()`, só olha `P.anim` e o tipo da arma.

Assar vinte poses em oito rumos são 160 imagens: pesado demais para travar o
jogo ao apertar X, então vira uma fornada de tarefas pequenas (uma grade, uma
pele, uma rotação) que o laço do jogo processa aos poucos, uns 3 ms por
quadro — na prática cada tarefa é bem mais lenta que isso, e a fornada inteira
leva uns 7 s de mundo real espalhados em quadros com soluço, mas o jogo
continua jogável o tempo todo. A pose parada sai primeiro em todos os rumos;
o que ainda não assou usa a parada no lugar.

**Limite conhecido:** a grade do personagem (80×56×117) foi pensada para a
silhueta de pé, não para uma arma comprida esticada para a frente — o golpe
da adaga e da espada precisou ficar mais comedido do que um golpe de verdade
para a lâmina não vazar a caixa. O próximo passo aqui é fazer a arma
acompanhar a orientação do antebraço em vez de só a posição da mão (já
anotado como pendência antes desta rodada), que deve abrir espaço para golpes
mais largos sem estourar a grade.

**Feito: torção do tronco.** Nota de qualidade direta: "caminhar é 4/10,
correr é 3/10, atacar é 2/10" -- o braço e a perna só entortavam para a
frente e para trás, no mesmo plano, um boneco de papel encostado na tela sem
nenhum giro em volta da própria coluna. Ombro e quadril passaram a girar em
volta do eixo vertical (`girarEmPe`), não só balançar para a frente e para
trás: andando, o ombro do lado que o braço balança para a frente gira um
pouco junto, e o quadril torce para o lado oposto -- a contra-rotação que dá
o vaivém de um tronco de verdade, maior na corrida que no passo. No ataque é
a mesma peça girando bem mais e de um jeito só: o tronco gira para trás no
preparo e gira para dentro do golpe, e é esse giro -- não o braço sozinho --
que faz o golpe parecer ter peso; o osso do tronco passou a acompanhar o
meio do ombro e do meio do quadril girados, senão a pele da barriga ficava
parada enquanto braço e perna giravam nela, e o ombro parecia se soltar do
corpo nas torções maiores. Bloquear e o arco também usam a torção para virar
o corpo de lado, postura clássica de quem apara ou mira.

**Feito: a bota afinada.** A perna aberta continuava depois do passo mais
fechado da rodada anterior porque a causa era outra: medido no
`humano.personagem`, cada bota sozinha tem uns 22 voxels de largura -- quase
metade da largura do tronco --, provavelmente sobra da conversão sem vista
de lado (o "varrer" desenho de frente + costas sem saber a profundidade real
enche demais o volume perto do chão). Até o Leandro desenhar a vista de lado
de verdade, a canela e o pé do corpo desenhado são afinados uma vez, puxados
para o eixo da própria perna, mais forte perto do chão e sumindo por volta
do joelho -- estreita a bota sem aproximar uma perna da outra nem mexer no
osso que anima a perna.

**Feito: o corpo trocado por um modelo gerado, e o passo e o golpe por
captura de movimento real.** Nota direta, na mesma rodada da torção e da
bota: aparência 6/10, mas "não é só braço grosso... ele tá com a cara
amassada" — e o problema não era o desenho, era o conversor. `editor/
conversor.js` reconstrói a profundidade de cada altura a partir de UMA
silhueta de lado só, e onde o braço encosta no tronco na vista de frente
(sem vão entre eles na foto), o antebraço herda a profundidade do tronco
inteiro: rosto e braço incham juntos, e nenhum retoque resolve isso sem
redesenhar a vista de lado de verdade, que ainda não existia. Trocar de
ferramenta foi mais rápido que esperar o desenho: `sorceress.games/
voxelgen`, gratuita, gera um modelo já esculpido a partir de uma imagem de
referência e exporta em `.wgvox` (formato deles, autodescrito no próprio
cabeçalho — ver `editor/wgvox.js`), e junto guarda animação por captura de
movimento real (esqueleto SMPL de 22 juntas, ângulo por osso, por quadro,
em JSON). O rig e a pintura de peso da própria ferramenta travavam demais
pra confiar (o mesmo erro de aplicação cinco vezes seguidas) — o que se
aproveitou foi só o modelo pronto e os ângulos brutos de andar e soco,
sem depender do resto do produto deles.

`editor/personagem-wgvox.js` converte o `.wgvox` pro nosso `.personagem`:
existe ao lado de `editor/personagem.js` (o conversor de desenho) e os dois
terminam no mesmo formato — o jogo não distingue a origem. Duas contas que
não são óbvias, e que já saíram erradas uma vez cada: a redução de tamanho
tem que ser **média de RGB por célula**, não voto de maioria por índice de
cor — a paleta de origem tem sombreado fino (milhares de tons quase iguais),
e tratar cada tom como categoria separada dava ruído salpicado; e o **eixo
de profundidade vem invertido** entre a grade deles (Y pra cima) e a nossa —
sem inverter, cabelo e capa (que são de costas) apareciam na frente do
corpo. Os ângulos brutos de animação foram *retargetados* pros nossos
próprios ossos, não copiados com a escala deles: `juntasMocap`, em
`src/p3e.js`, aplica a rotação de cada quadro capturado ao comprimento de
osso do nosso `REPOUSO`, por cinemática direta — a animação herda só o
movimento, nunca a proporção do personagem de terceiros. Andar (6 quadros,
`ANDAR_MOCAP`) e atacar (2, `ATAQUE_MOCAP`) usam isso agora; correr, pulo,
conjurar, bloquear e arco continuam por fórmula, porque a demonstração
gratuita da ferramenta não tinha captura pronta pra eles.

Um efeito colateral do braço de verdade se afastar do quadril, que a fórmula
antiga não alcançava: no golpe, voxels da mão apareciam grudados no osso da
coxa. O raio de alcance do osso do antebraço (`ossosDoPersonagem`) cresceu
de 4.5 para 7 — a mão é mais larga que o antebraço, e perto do quadril na
pose parada um raio curto deixava o voxel da mão mais perto do osso da coxa
do que do próprio antebraço.

`editor/vox.js` — leitor e escritor do formato `.vox` do MagicaVoxel, do
zero, sem biblioteca — nasceu pra ida e volta durante essa mesma
investigação (esculpir um corpo à mão como alternativa, antes de achar o
`.wgvox`); ficou no repositório porque continua sendo o jeito de levar
qualquer grade nossa pro MagicaVoxel pra retocar.

**Feito: bind pose de verdade (T-pose), em vez de usar a pose parada como
referência de encaixe.** O raio maior no antebraço (acima) tapou o sintoma
no golpe, mas o mesmo defeito continuava aparecendo andando: voxels da mão
ficavam presos ao quadril ou ao tronco enquanto o resto do braço se afastava
-- visível em capturas de tela do próprio andar, círculo vermelho na altura
do quadril, em três quadros do passo. A causa de verdade nunca foi o raio de
um osso: `prepararCorpo()` classifica cada voxel UMA VEZ, na pose parada do
jogo (`esqueleto(0)`), e na pose parada a mão descansa perto do quadril --
ambíguo por natureza, não importa quanto se ajuste um raio.

A saída, ideia do Leandro: esculpir o modelo de novo com a imagem de
referência em T-pose (braços esticados na horizontal) em vez de A-pose.
T-pose é a bind pose padrão da indústria exatamente por isso -- com o braço
esticado, ele fica longe do quadril em QUALQUER altura, e não há como um
voxel de mão ser confundido com o quadril. `BIND`, em `src/p3e.js`, é esse
segundo esqueleto (mesmos comprimentos de osso do `REPOUSO`, braço na
horizontal) que `prepararCorpo()`/`posarPersonagem()` passaram a usar no
lugar de `esqueleto(0)` -- pose parada incluída, que deixou de ser uma
cópia direta do arquivo e passou a ser um giro de T-pose até a postura
natural, que é como qualquer engine de verdade faz esqueleto.

Duas asperezas nessa troca, uma de código e uma de geometria:

- **Bug real, não só ajuste:** `BIND` é só um dicionário de juntas, sem o
  `dz` que todo retorno de `esqueleto()` carrega -- e `ossosDoPersonagem()`
  lê `s.dz` sem checar. `undefined` virou `NaN` nas contas do quadril, do
  tronco e da cabeça, e `NaN < distância` é sempre falso em JS: os três
  ossos nunca venciam a comparação e ficavam fora do resultado -- o corpo
  inteiro (tronco, cabeça) acabava classificado como braço ou perna por
  eliminação. O sintoma era dramático (tronco descolado, cabeça caída para
  a frente na pose parada) e óbvio de ver; a causa era uma linha faltando.
  `BIND` ganhou `dz:0` (e `cx`,`cy`, para o resto do código que espera essas
  chaves em qualquer esqueleto).
- **Fresta no ombro, esperada:** a pele é um voxel preso a UM osso só, sem
  peso repartido entre dois ossos como uma pele de verdade (skinning de
  verdade) teria. Um giro pequeno (pose parada antiga, passo, golpe -- tudo
  formula, ângulos curtos) nunca abriu essa fresta; o giro de T-pose até a
  pose natural é bem maior, e no ombro -- onde o braço (gira bastante) e o
  tronco (não gira, na pose parada) se encontram -- abre uma rachadura de
  uns 2 a 3 voxels, medida por busca de componente conexo na grade posada.
  `remendoDoOmbro()`, em `src/p3e.js`, cobre com uma bolha de pele sempre no
  lugar do ombro de verdade (qualquer pose), por baixo de roupa e armadura
  como o resto do corpo -- a primeira tentativa (bolha grande, raio 6)
  ficou parecendo um caroço por cima da roupa; raio 4 com um deslocamento
  medido a partir da própria fresta ficou liso.

Verificado por componente conexo (busca de vizinhança 6) na grade posada,
em toda pose de andar/atacar/correr/parado: antes do remendo, o braço
inteiro saía como um pedaço à parte (unas 1700 voxels, dos ~40 mil do
corpo) em toda pose testada; depois, um corpo só (mais os dois olhos, que
já eram peças à parte antes disso). Sobra uma fresta pequena (2267 voxels)
só no quadro mais extremo do golpe (o braço se estica mais que em qualquer
outra pose) -- aceito por ora, e a placa de ombro de uma armadura de placas
cobre.

**Pendência:** o molde de desenho (`Arte/molde-humano.png`) não é T-pose --
os braços ficam só um pouco afastados do corpo, não esticados. Um desenho
feito sobre ele hoje não vai girar direito em `posarPersonagem()` fora da
própria pose guardada (andar, atacar etc.) -- corrigir isso pediria alargar
o molde inteiro (braço esticado quase dobra a largura do corpo de frente) e
aceitar que a vista de lado perde quase todo o desenho do braço (de lado,
T-pose mostra o braço quase de ponta). Ninguém desenhou por esse caminho
desde que o `humano.wgvox` assumiu, então ficou anotado (`Arte/LEIA-ME.md`,
`teste/conversor.test.js`) e não resolvido.

**Feito: o braço afinado, e mais cor no corpo esculpido.** Nota direta na
sequência: "os umbros desgrudaram" (a fresta do parágrafo acima, já coberta)
"e os detalhes perdidos... mal dá pra distinguir o rosto... a túnica também
não tá toda verde... os braços ainda estão muito abertos". Os braços abertos
eram reais, medidos: 60 voxels de largura na altura do peito contra 40 do
corpo anterior -- 50% mais grosso. A causa é o mesmo giro grande (T-pose até
pendurado) que abriu a fresta do ombro, só que na carne em vez do osso: o
braço esculpido em T-pose tem uma seção mais larga do que a do corpo
anterior, e girar um cilindro grosso uns 90 graus estica essa grossura para
o lado errado. `afinarBraco()`, em `src/p3e.js`, afina a seção transversal
do braço (y e z, sempre perto do plano do ombro em T-pose) puxando pra perto
do próprio eixo do osso, do mesmo jeito que `afinarPerna()` já afinava a
bota -- feito ainda em BIND, antes do giro, porque afinar-pra-perto-do-eixo
não muda com rotação nenhuma, então vale pra qualquer pose. Voltou pra uns
50 voxels de largura -- mais apertado ainda (0.4) do que a primeira tentativa
(0.6) porque a diferença ainda incomodava.

Detalhe perdido e a mancha na túnica eram a mesma causa: `editor/
personagem-wgvox.js` agrupava as cores médias por 4 bits por canal e cortava
em 48 cores -- o teto do conversor de desenho, pensado pra pixel art feita à
mão com poucas cores de propósito. A fonte esculpida tem textura fina de
verdade (14 mil tons distintos antes de reduzir), e 48 baldes de 4 bits
apagava tom raro e pequeno -- o brilho do olho, o degradê do pescoço da
túnica -- longe antes de qualquer coisa comum feito pele ou tecido. Subiu
pra 5 bits por canal (baldes mais finos antes de escolher os 160 maiores) e
o teto de cores foi de 48 pra 160 -- `Uint8Array` aguenta até 255, e 48 nunca
foi limite de formato, só o número que fazia sentido pro caminho do desenho.
Cara e roupa ficaram nitidamente mais legíveis.

**Feito: o ateliê de personagem, e o jogo parou de girar o corpo.** A sessão
anterior terminou num ciclo: usar uma ferramenta de terceiros que trava,
importar, descobrir por captura de tela que o encaixe de osso está errado,
remendar com um número mágico (raio de osso, fator de aperto, bolha de pele
na fresta), repetir. Os três defeitos que sobraram — mão grudada no quadril,
fresta no ombro, braço inchado — tinham a mesma raiz: cada voxel preso a UM
osso, girado duro. E dois defeitos que ninguém tinha visto: a conversão cortava
o corpo na grade de 80 de largura, e em T-pose o humano tem 107 de envergadura
— **as duas mãos tinham sido arrancadas no pulso**; e a paleta tinha 160 cores
× 3 tons + 92 fixas, quando o personagem só tem 255 entradas — mais de metade
das cores caía na mais perto, sem erro.

`mundo-perigoso/atelie/` é a ferramenta própria, de ponta a ponta, sem
serviço de fora no meio: importar ou esculpir em T-pose, rig proposto pela
silhueta, peso de osso, animar, prévia com o assador do jogo, validar e
exportar. As decisões que importam:

- **Peso repartido entre dois ossos, por distância geodésica.** Medida
  andando por dentro do volume de voxels — o "geodesic voxel binding" do
  Maya, e aqui o corpo já é voxel. Em linha reta a mão pendurada fica perto
  do quadril; por dentro do corpo, o caminho sobe o braço inteiro. O teste
  constrói um corpo de mão encostada na coxa e confere: nenhum voxel da mão
  pega peso da perna. Entre dois ossos pai e filho, a mistura é suave numa
  faixa em volta da junta, e o pincel só corrige.
- **Pele por quatérnio dual**, não média de matriz: a junta dobrada gira em
  volta dela em vez de murchar. E a grade posada é preenchida nos dois
  sentidos (o centro de cada voxel para a frente, e cada célula vazia em
  volta perguntando de volta se está dentro do cubo girado de um voxel): sem
  furo onde a pele estica e sem engordar onde o osso gira — espalhar amostras
  de meio voxel, como o jogo fazia, engordava a silhueta, parte do braço
  inchado.
- **Pose é rotação por osso a partir da bind pose.** Redirecionar qualquer
  fonte (a pose antiga do jogo, captura BVH, JSON tipo SMPL) é tirar só a
  DIREÇÃO dos ossos dela e aplicar nos do rig, por diferença a partir do
  repouso da fonte — o boneco esculpido guarda a própria postura, e a
  torção é transportada pela cadeia. Os ângulos do painel são anatômicos a
  partir do parado (frente, abrir, torcer), com o sinal espelhado entre E e D:
  medidos na T-pose, "frente" do antebraço seria torção.
- **O jogo não gira mais nada.** `.personagem` virou `PERSONAGEM 2`: vinte
  quadros já posados, cada um com as juntas dele. `BIND`, `prepararCorpo`,
  `posarPersonagem`, `afinarBraco`, `afinarPerna` e `remendoDoOmbro` saíram
  de `src/p3e.js`. As peças penduram nas juntas do quadro, e as de posição
  fixa andam com o meio do tronco em relação ao parado do próprio arquivo.
  O arquivo pesa 1,5 MB (vinte grades); a `.pele`, com o corpo, o peso e as
  poses em quatérnio, pesa 180 KB e está documentada e exportada — é o
  caminho para o motor fazer a pele sozinho e matar essa classe de defeito
  também dentro do jogo.
- **Validação embutida, antes de exportar**, em todos os quadros: voxel fora
  da grade, pedaço solto maior que 20 voxels (vizinhança 6), volume mudando
  mais de 15%, silhueta mais larga do que o mesmo quadro posado duro, peso
  entre ossos não vizinhos, paleta acima de 54 cores. Erro impede exportar.
  A régua da largura é o giro duro, e não o parado: braço que abre de
  propósito (o pulo) alargava a silhueta e dava falso alarme.
- **Animação escrita, não fórmula.** A captura antiga de andar era fraca na
  grade: passada curta, braço parado. Andar (contato, apoio, passagem),
  correr (passada no ar, passagem de joelho alto), pulo, atacar, conjurar e
  respirar estão escritos em ângulo anatômico em `atelie/escritas.js`, e
  servem para qualquer corpo. O ataque virou um corte na altura da cintura
  cruzando o corpo: a grade só tem 28 voxels na frente do meio do corpo, e
  estocada reta vaza.
- **Caber na grade e deixar a arma inteira é busca, não número mágico.** As
  armas do jogo não giram com a mão (a lâmina da espada sobe 52 voxels a
  partir dela), então cada quadro escrito é encaixado e, se preciso,
  amortecido — primeiro o corpo, só o bastante para caber, depois só os
  braços, para a mão ficar em `LUGAR_DA_MAO_DA_ARMA`. É o `ARMA_MOCAP = 0.55`
  de antes, calculado por quadro. A arma seguir a mão é pendência das peças.

O corpo do jogo sai de `Arte/personagens/humano.atelie` byte a byte, e a
prévia do ateliê é o próprio `src/p3e.js` num iframe. O que ficou de fora:
importar FBX (converter para BVH no Blender resolve), gerar corpo por IA
chamando a API direto, e captura de verdade para correr e pular — o
importador está pronto, falta o arquivo.

**Feito: andar e correr por captura de movimento da CMU.** O banco da
Carnegie Mellon é livre para qualquer uso; a conversão para BVH (Bruce Hahne)
veio de um espelho no GitHub. Uns quarenta clipes — corridas, trotes,
caminhadas, pulos, golpes de espada e soco, arco, bloqueio, feitiço — foram
redirecionados para o humano e assados pelo próprio jogo, lado a lado com as
animações escritas. Ficaram dois: a caminhada 143_32 e a corrida 09_01
(`mundo-perigoso/Arte/captura/`, com os créditos e por que cada um dos outros
ficou de fora). A receita `Arte/personagens/humano.receita.json` diz qual
captura vai em qual animação, e `atelie/cli.js receita` refaz o projeto do
zero, byte a byte.

O importador tinha três defeitos que só captura de verdade mostra:

- **A referência errada.** Na conversão da CMU os offsets do esqueleto têm
  as pernas 20 graus abertas; a T-pose de verdade é o primeiro quadro. A
  escolha agora é por ângulo (braço longe da horizontal, perna longe da
  vertical), e o quadro da T-pose sai do movimento.
- **O chão subindo com a distância.** O "para cima" era a linha
  bacia-cabeça, que inclina uns graus; o ator corre metros pela sala, e a
  inclinação virava altura — o boneco flutuava 15 voxels. O vertical agora é
  o eixo exato da captura, e o chão sai dos próprios quadros.
- **Correndo de costas.** Um clipe atravessa a sala para o outro lado. O
  rumo de cada quadro sai, suavizado em meio segundo, para o vaivém da bacia
  a cada passo ficar.

E duas coisas do jogo que só a captura mostrou:

- **A grade não comporta um sprint.** A passada de uma corrida de
  velocidade é mais comprida que os 56 voxels de fundo. O encaixe passou a
  amortecer por grupo — pernas, depois corpo, depois braços pela arma —,
  mas perna a 30% parece agachado; a solução foi escolher uma corrida mais
  curta (09_01) e começar o ciclo 3/8 depois da passada mais aberta.
- **A cabeça no teto.** O corpo importado tinha 117 de altura numa grade de
  117: na passagem de uma caminhada a bacia sobe, e a cabeça saía. Passou a
  115.
- **As peças de cabeça presas ao tronco.** Elmo fechado, viseira, nasal,
  olhos do capuz e pena ficavam numa altura fixa mais `dz`, o meio do
  tronco — e o tronco sobe de verdade quando o ator sai na ponta do pé. Agora
  seguem a junta da cabeça (no corpo de bolas a cabeça é 101 + `dz`, então
  ali nada mudou), e o encaixe cuida de a cabeça ficar num lugar onde as
  peças cabem (`LUGAR_DA_CABECA`). Quando a cabeça inclinada da corrida sai
  desse lugar, quem encolhe é o tronco, não a perna.
- **O pé na ponta.** O chão da captura era medido pelo tornozelo; com o ator
  na ponta do pé o personagem flutuava. Passou a ser sola contra sola, e a
  caminhada assenta o pé mais baixo de cada quadro no chão.

O ciclo capturado é espelhado: meio ciclo amostrado, a outra metade o espelho
dele — o ator sempre pisa diferente de um lado, e em 4 quadros isso vira
mancar. O bloqueio ganhou pose escrita com a mão indo por IK até a alça do
escudo, que é uma peça fixa e não segue a mão. Pulo, golpe, arco e feitiço
capturados não cabem ou não leem nessa resolução (a espada sempre de pé tira
a força de qualquer golpe por cima da cabeça), e continuam escritos.

- **A armadura é montada depois da roupa e cobre ela.** De placas sobra pouco
  tecido à vista, e placas têm mais volume que couro.
- **O enfeite é montado por último e fica por fora de qualquer armadura.** Trocar
  a cor dele não mexe em voxel nenhum nem na rampa de outro material — é
  *cosmético é enfeite* virado regra de código.
- **Arma e escudo ficam para fora da silhueta**, porque em 24 voxels de largura o
  que fica dentro do corpo some.

Morrer virou um giro do corpo em vez de um desenho à parte: o mesmo modelo
tomba no plano `(y,z)`, cai de costas e assenta no chão. No Doom a morte era
um desenho novo porque não havia de onde tirar outra coisa. Aqui o corpo já
existe em três dimensões, então o cadáver gira junto com todo o resto e
continua caído para o mesmo lado de qualquer ângulo que você olhe.

Os desenhos à mão das criaturas **saíram**: 353 linhas de `p3.js`, que agora
só guarda itens, tochas, projéteis e as rampas de cor que os materiais dos
modelos usam. O teste que conferia o grid contra o desenho passou a conferir
contra a caixa que o `EDEF` manda desenhar, que é a medida que de fato
importa — é ela que estica a imagem.

#### O cadáver não é um cartaz, é um desenho no chão

Um sprite girado só no eixo vertical mostra sempre a mesma imagem, você
olhando de frente ou de cima. Com o bicho de pé ninguém nota; com o corpo no
chão aos seus pés, é gritante.

A primeira tentativa foi assar o morto em várias alturas de câmera e tombar
o cartaz conforme você chegava perto. Funcionava e era caro: 32 imagens por
criatura, e mesmo assim o corpo brigava com o piso.

Decalque chapado no piso perdia o corpo: virava pintura. Quadro que
encarava a câmera inteira levantava o bicho: da altura dos olhos ele parecia
sentado. O certo é o que o Doom fazia, e o Leandro chegou nele primeiro: o
cadáver é **uma arte só**, um cartaz comum em pé, com o corpo desenhado **de
perfil, deitado, visto da altura dos olhos**. Não importa de que lado você
chega — é sempre o mesmo perfil.

E o corpo é **modelado deitado**, não derivado do bicho de pé. Tombar a pose
de pé era a saída barata e nunca deu certo: o corpo fica com as proporções de
quem está em pé, só que virado, e vira um bolo. Um corpo caído tem proporção
própria — comprido, baixo, a cabeça num ângulo que de pé seria impossível.
Isso se modela, não se gira.

Três coisas saíram junto e valem para o resto do projeto:

- **Cai de cara, não de costas.** De costas o rabo do diabrete ficava
  esmagado embaixo e o que sobrava virado para cima era a barriga, que não
  tem nada. De bruços aparecem as costas, os chifres e o rabo caído por cima.
- **Pose de morto própria.** Antes o cadáver era a pose de pé tombada
  rígida, braços colados, pernas juntas. Morto de verdade é o contrário: os
  membros largam. A aranha é o caso bonito — ela **encolhe**, que é o que os
  músculos dela fazem quando param de ser empurrados pela pressão do sangue.
- **Poça de sangue.** Uma mancha no chão embaixo do corpo. Era o que o Doom
  usava para dizer "alguém morreu aqui" sem depender de o corpo ser legível,
  e de quebra ancora o corpo no piso.
- **A cabeça é torcida para você, com o corpo de perfil.** É a licença que
  todo sprite de cadáver bom toma, e existe por um motivo: de perfil a cara
  vira um vulto sem leitura, e é a cara que diz o que morreu ali. De frente
  sobram três manchas reconhecíveis a qualquer distância — os dois olhos
  claros e o buraco escuro da boca.

O que a segunda passada nos modelos ensinou, e vale para qualquer peça nova:
em 24 voxels de largura, **tudo que fica dentro da silhueta do corpo some**.
Espada, arco e perna de aranha só aparecem se estiverem para fora dela. O
mesmo vale para material emissivo: dois voxels de brasa já leem como olho,
quatro viram um bloco branco.

#### O custo de uma criatura — resolvido

O primeiro diabrete em voxel pesou **4,7 MB**. O motivo não era o modelo: cada
imagem guardava 16 cópias sombreadas de si mesma, uma por nível de luz, 64
bytes por pixel. Converter as seis criaturas passaria de 25 MB, e o catálogo de
cosméticos — que é o produto — multiplicaria isso.

Com cor indexada o mesmo diabrete cabe em **74 KB**. Todo o jogo (86 imagens
entre texturas, sprites, armas e rostos) ocupa **750 KB**: 286 KB de pixels
mais 464 KB de tabelas.

O preço é que texturas com granulado têm mais de 255 cores e precisam ser
reduzidas. Medido: 5.607 cores caíram na mais parecida, com **erro médio de
5,4** numa escala que vai a 441 — abaixo do próprio degrau da tabela de luz.
Lado a lado com a versão anterior não há diferença visível.

**O gargalo saiu do caminho: dá para converter as outras criaturas.**

### Feito — o que fazer antes do multiplayer

Quatro mudanças baratas hoje, caras depois. Não pela rede em si, mas para nunca
bater na parede de "preciso reescrever tudo antes de continuar". **As quatro
estão feitas**, e cada uma tem teste:

1. **Separar simulação de renderização.** A simulação não toca som: ela anota
   o nome do som numa lista, e o laço principal toca depois do passo. Num
   servidor essa lista vira mensagem.
2. **Passo de tempo fixo.** A simulação anda sempre 1/60 s, quantas vezes o
   tempo real pedir — até oito por quadro —, e o desenho mostra o último estado.
   Ainda não interpola entre passos; a 60 quadros por segundo não se nota.
3. **Input como dado.** A cada passo teclado e mouse viram um objeto, e só ele
   entra no `update`. Ação de uma vez — usar, pular, trocar de arma, usar item,
   dizer — entra numa fila. O ângulo do olhar é a exceção: o mouse mexe nele na
   hora, porque atraso na mira se sente, e o ângulo vai junto na entrada.
4. **Tirar o `setTimeout`.** O golpe corpo a corpo, do jogador e dos bichos,
   entra numa agenda contada no relógio do jogo. As sequências de notas dos
   sons usam o relógio do próprio áudio. Não sobrou `setTimeout` no jogo.

### Falta no motor, para o mundo aberto

**Feito:** céu (faixa deslocada por guinada e inclinação, como no Doom) e
névoa (as texturas de fora desbotam na cor do horizonte em vez de no preto).
A caldeira de lava já é aberta e a serra no horizonte já dá o vocabulário do
"mostrar antes de permitir".

**Falta:** **distância de desenho longa**. A ilha já desenha 60 tiles, e a
medição mostrou que 90 ainda cabem folgados no quadro. Para a espada no alto
da montanha do fundo do vale vai precisar de mais, e aí o caminho é nível de
detalhe para o terreno distante.

### Servidor gratuito — estimativa (24/9)

Quem desenha é o navegador de cada jogador; o servidor guarda o mundo e manda
posições. A 10 atualizações por segundo, com umas 20 coisas à vista, são uns
3 KB/s por jogador. O único gratuito que aguenta mundo ligado o tempo todo é o
da Oracle: desde 15/6/2026, 2 núcleos ARM, 12 GB e 10 TB de saída por mês, e o
tráfego não aperta. Estimativa: **200 a 400 simultâneos** com mensagem
binária, só o que está perto e o servidor rodando o mesmo código do jogo; **30
a 60** do jeito ingênuo, JSON para todo mundo. O gratuito muda sem aviso — a
Oracle cortou pela metade em junho —, então o servidor não deve depender dele:
node puro roda em qualquer máquina, inclusive no PC de casa.

### O canteiro — a ferramenta de criação de mundo

O editor de mapa trava em tile inteiro: não existe parede fina, arco, sacada,
andar de cima, ponte sobre estrada nem telhado que não seja de quatro águas.
O **canteiro** (`mundo-perigoso/canteiro/`) é a ferramenta nova, feita com o
cuidado e a arquitetura do ateliê. Tem dois modos que editam o mesmo arquivo:
o **macro**, o mapa inteiro visto de cima, onde se faz a geografia; e o
**micro**, dentro do mapa com o motor do jogo, onde se constrói peça por peça.
Uma tecla troca de um para o outro no mesmo ponto.

Antes de construir, cinco decisões foram medidas no motor de verdade, em
640×360. A bancada que mede é `canteiro/bancada/`. Ela roda o jogo montado
dentro de uma página, sem o laço dele, e mede cada pedaço do quadro. Uma cópia
sai com contadores costurados no rasterizador, e outras com o rasterizador
trocado. Os números oscilam em torno de 1 ms de uma rodada para outra.

#### O que custa um quadro hoje

| Lugar | Quadro | Céu | Montar a geometria | Polígonos | Entidades | Cada pixel pintado |
|---|---|---|---|---|---|---|
| Píer, chegada | 14 ms | 0,9 | 2,7 | 9,6 | 0,3 | 0,8 vez |
| Taverna de Pedra Alta | 25 ms | 0,9 | 2,6 | 18,5 | 1,0 | 2,5 vezes |

Dentro de casa o tempo não vai para polígono demais: cada pixel é pintado
duas vezes e meia. O motor desenha na ordem dos tiles, com as duas faces de
cada parede, então a ilha inteira atrás da parede da taverna é pintada antes
dela. Montar um triângulo custa uns 0,4 µs; pintar um pixel, uns 24 ns, e a
tela inteira uma vez, uns 5,5 ms.

Desenhar de perto para longe e descartar a face de costas quase corta o
tempo dos polígonos pela metade. Somando a oclusão por blocos de 8×8 pixels,
em que o polígono escondido por inteiro nem chega ao rasterizador, fica
assim, em milissegundos só de polígono (sem céu, sem entidades e sem montar a
geometria, que com os pedaços deixa de existir):

| Lugar | Hoje | Ordenado, sem face de costas | E com oclusão |
|---|---|---|---|
| Ilha, píer | 9,1 | 6,3 | 7,3 |
| Ilha, taverna | 19,2 | 10,6 | 10,1 |
| Ilha, praça | 16,9 | 10,0 | 9,7 |
| Fortaleza, pátio | 23,6 | 13,7 | 12,5 |
| Fortaleza, portão | 22,8 | 14,4 | 12,8 |
| Fortaleza, dentro do sobrado | 31,6 | 16,9 | 13,3 |

A fortaleza é a do *pronto quer dizer*: 40 tiles de lado, muralha com ameias a
cada meio tile, quatro torres redondas com cone, portão em arco e doze
sobrados de dois andares com janela, sacada e chaminé. São 5.099 quads e,
de qualquer ponto de dentro, uns 5.600 de frente no alcance de 60 tiles.

A perspectiva calculada só a cada 16 pixels, como o Quake fazia, ganhou uns
10% e mudou até 5% dos pixels; fica de reserva. O laço isolado custa 8 ns por
pixel sem a divisão e 16 com ela, e o do motor custa 24: há gordura no
rasterizador, mas ela não decide nada daqui.

#### 1. Como uma peça vira geometria — DECIDIDO: polígono

Medido na fortaleza, no pior rumo de cada lugar:

| Lugar | A, polígono | B, voxel de 64 fundido em faces | C, sprite de voxel |
|---|---|---|---|
| Pátio | 14,3 ms, 5.571 quads | 78,6 ms, 82.675 quads | 10,6 ms |
| Portão | 16,1 ms | 70,3 ms | 10,5 ms |
| Adarve | 14,8 ms | 68,0 ms | 12,8 ms |
| Fora, a 28 tiles da muralha | 10,5 ms | 72,6 ms | 7,4 ms |

O voxel fundido só empata com o polígono em caixa. Em tudo que a fortaleza
precisa ele explode, porque cada degrau de voxel de uma curva ou de uma
rampa é uma face:

| Peça | Polígono | Voxel de 64 fundido |
|---|---|---|
| Ameia, trecho de muralha, parede fina | 5 a 6 | 6 |
| Portão em arco | 44 | 462 (×11) |
| Rampa de 1×2 tiles | 5 | 130 (×26) |
| Torre redonda, 16 lados | 32 | 1.122 (×35) |
| Telhado de duas águas | 4 | 534 (×134) |
| Cone do telhado da torre | 16 | 54.922 (×3.433) |

O sprite é o mais barato, mas uma parede que gira com o olhar, não colide e
não corta o chão no lugar certo não serve para arquitetura. **A arquitetura é
polígono**: colide, a câmera da terceira pessoa para nela, e de perto não
gira. **O adereço pequeno continua sprite de voxel**, como o cenário de hoje.
A estética não muda: a peça usa as mesmas texturas de 64 por tile, em
coordenada de mundo, a mesma paleta, a COLORMAP e a névoa.

Vêm junto, no motor: pedaços montados uma vez só, com face de costas
descartada, desenho de perto para longe e oclusão por blocos.

#### 2. A grade das peças — DECIDIDO

- **Na horizontal, quarto de tile** (meio metro, 16 texels). A parede fina
  mede 0,125 tile e fica centrada numa linha de tile ou de meio tile; a ameia
  mede um quarto.
- **Na vertical, degraus de 0,25 tile**, os mesmos do terreno. Um andar mede
  1,5 tile, seis degraus: 1,25 de pé-direito, o forro de hoje, e 0,25 de laje.
- **Giro de 90° em tudo, e de 45° nas peças que pedem**: muro, cerca,
  paliçada, guarda-corpo e muralha. Espelho em tudo.
- **As medidas que saem do jogador**: raio 0,26, altura 0,85 (0,55
  agachado), degrau de 0,42 e pulo de 0,83. O vão de porta mede 0,75 × 1,1
  tile. A escada colide como rampa, e o degrau desenhado é do estilo.

#### 3. Vários andares — DECIDIDO: peça é sólido, e a grade de andar sai dela

O terreno continua sendo um piso e um teto por tile. Tudo que se constrói é
peça, e **cada peça é um ou mais sólidos**: um polígono convexo no chão, de
uma altura a outra, com o topo reto ou inclinado (rampa, escada, telhado).
Os sólidos ficam guardados por tile. A física pergunta três coisas ao
terreno e aos sólidos juntos: se bate, qual é o chão sob o pé, dado a altura
de agora, e qual é o teto sobre a cabeça. Assim uma ponte sobre a estrada tem
dois chãos, e cada um responde para quem está na altura dele.

Na fortaleza são 416 sólidos, até 6 por tile. "Bate?" custa 0,32 µs e "qual
o chão?", 0,21 µs. Um passo de 1/60 s com o jogador e 30 criaturas faz umas
125 perguntas: 0,04 ms.

Para masmorra debaixo da cidade, um tile de terreno pode ser **oco**: o chão
vira uma laje, e embaixo dela se constrói.

A busca de caminho e o alcance da validação usam uma **grade de andar** de
meio tile, em que cada célula guarda os pisos onde se fica de pé. Na
fortaleza são 104 mil pisos, 672 células com mais de um andar, montados em 52
ms e percorridos inteiros em 76 ms. Na ilha de 650 isso passa de um segundo,
então só a ferramenta percorre tudo; o jogo monta e busca por região.

#### 4. O formato `MAPA 2` — DECIDIDO

Medido nos rascunhos de 650×650:

| | `ilha.mapa` | `ilha 2.mapa` |
|---|---|---|
| `MAPA 1`, um caractere por tile | 1.240 KB | 1.240 KB |
| Corridas por linha | 39 KB | 114 KB |
| Corridas em pedaços de 32×32 | 48 KB | 136 KB |
| Ler as três grades em corrida | 11 ms | 24 ms |

Um traço de pincel de 9 tiles atravessando 40 muda 28 linhas do arquivo com
corrida por linha e 3 com pedaços de 32. **As grades vão em pedaços de 32×32
com corridas**, uma linha por pedaço: o git mostra onde se mexeu, e o arquivo
inteiro cabe em uma ou duas centenas de KB. Arquivo por região não precisa.

- **Altura com até dois dígitos em base 36**, de 0 a 1.295 degraus. O `MAPA 1`
  para em 35 degraus, 8,75 tiles, uns 17 metros: pouco para a montanha.
- **Peça numa linha**: tipo, posição, giro, espelho. 5.000 peças de 60
  caracteres dão uns 300 KB, o maior pedaço do arquivo. **As peças ficam
  agrupadas por construção, e o estilo mora na construção**: trocar a casa de
  madeira para pedra é mudar uma linha.
- **Coisa e marcador numa linha**, com campos `chave=valor`.
- As regras do `MAPA 1` continuam: ASCII puro, sem aspas, crase nem barra
  invertida; lido e gravado de volta idêntico; com erro não abre pela
  metade; tipo desconhecido gera aviso e é guardado. O `MAPA 1` continua
  lido, e converte.

#### Feito: o motor em pedaços, com peças e andares

A primeira fatia depois das medições, em duas partes.

**A geometria é montada uma vez, em pedaços de 16×16 tiles.** O quad virou
**face**: um polígono de até oito cantos, cada um com a sua coordenada de
textura, com a frente dada pela ordem dos cantos. Só a frente é desenhada.
Piso e forro iguais vizinhos viram um quad só, até 4×4 tiles. Cada quadro
escolhe as faces que se veem, ordena por baldes de meio tile e desenha de
perto para longe; uma foto do z-buffer por blocos de 8×8 pixels, tirada
depois das faces até 3, 10 e 25 tiles, descarta a face escondida inteira
antes do rasterizador. O céu passou a ser desenhado **depois** do mundo, só
onde nenhuma face pintou. Mexer num tile suja só o pedaço dele.

Medido na bancada, o quadro inteiro em 640×360, antes e depois:

| Lugar | Antes | Depois |
|---|---|---|
| Taverna de Pedra Alta | 24,9 ms | 14,1 ms |
| Capela | 23,0 ms | 13,6 ms |
| Praça | 18,2 ms | 11,3 ms |
| Píer | 11,1 ms | 8,8 ms |
| Cripta (cinco lugares) | 8 a 15 ms | o mesmo |

A imagem é a mesma: no pior rumo de cada lugar, de 1 a 128 pixels diferentes
em 230 mil, todos em borda de piso fundido a distância. A primeira versão da
oclusão contava pixel a pixel dentro do rasterizador; custava 2 ms por quadro
e deixava a cripta mais lenta que antes.

**O mundo virou um objeto que se troca.** Grade, alturas, telhados, ambiente
e geometria são remontados sem recarregar a página: descer para a cripta e
voltar para a ilha não recarrega mais. O ambiente de cada mapa é guardado na
primeira vez.

**A peça é dado, e vira duas coisas.** `src/pecas.js` tem os tipos (parede,
meia parede, parede com janela, parede com porta, pilar, piso, laje, escada,
rampa, guarda-corpo e água de telhado) e os estilos (madeira de pescador e
pedra rústica). Cada peça dá **faces**, para o desenho, e **sólidos** --
prismas convexos com topo reto ou inclinado --, para a física. As três
perguntas da física (`src/solidos.js`) levam junto a altura de quem pergunta,
e é isso que faz os andares: embaixo da ponte o chão é a estrada, em cima é o
tabuado.

Uma casa de dois andares com porta, janelas, escada, sacada, guarda-corpo e
telhado já sobe e se anda dentro: 421 a 506 faces na vista, 95 sólidos. Da
janela do andar de cima se vê o céu pelo vão de verdade, não por uma textura
com janela pintada.

Dois defeitos que só apareceram olhando ou testando: o quad do telhado perto
da cumeeira não é plano, e o plano médio errava a frente dele no olhar
rasante (o alto do telhado sumia; virou dois triângulos); e a linha de visão
amostrava de 0,2 em 0,2 tile, o que pula uma parede de 0,125 -- o bicho
enxergava através da casa.

#### Feito: o MAPA 2 e o micro

O **`MAPA 2`** guarda as grades em pedaços de 32×32 com corridas e as peças
agrupadas por construção. A ilha de 200 tiles caiu de 122 KB para 14 KB e o
rascunho de 650×650 de 1.240 KB para 136 KB; o HTML montado encolheu 100 KB
junto. O `MAPA 1` continua lido, e `canteiro/cli.js converter` converte sem
mudar tile nenhum.

O **micro** já constrói: entra no mapa com o motor do jogo, anda com a física
de verdade ou voa, põe e tira peça na mira com o fantasma verde ou vermelho
(com o motivo escrito), gira, espelha, prende na grade de quarto de tile,
desfaz no mesmo histórico do editor, salva por cima do arquivo, guarda
rascunho e abre o jogo no ponto onde a câmera está. Uma casa de dois andares
com porta, janela, escada, sacada e telhado sobe inteira por ali.

O que ainda não entrou no micro, e vem com o catálogo: miniatura de peça
assada, encaixe nos encaixes das outras peças, conta-gotas, seleção em caixa,
mexer no terreno de perto e os marcadores.

#### Feito: a revisão antes do catálogo

Uma revisão do que estava pronto, antes de começar o catálogo, achou quatro
problemas. Os quatro estão consertados, cada um com teste:

- **O macro refazia a ilha inteira a cada pincelada.** Remontar os 1.681
  pedaços da ilha de 650 custa 3,9 s no node e perto de 1 s no navegador — os
  69 ms anotados em *onde o micro roda* eram da bancada, com geometria mais
  simples que a do motor. Agora o motor da ilha, as alturas e os telhados saem
  de novo só nos tiles mexidos, nos vizinhos e nos telhados que eles tocam: de
  2 a 10 ms por pincelada. E o pedaço só é montado quando entra no alcance:
  abrir a ilha monta uns 70 pedaços, saltar para longe monta 69 em 42 ms, e
  andando sai um por quadro, a 1,5 ms.
- **O micro não via o que o macro pintava**, e desfazer uma pincelada não
  voltava no mapa de cima: o motor da ilha só era calculado ao abrir o mapa.
  Agora ação, desfazer e refazer passam pelo mesmo caminho, que lê no registro
  do histórico o que mudou.
- **Todo mapa aberto do disco saía no estilo padrão.** O arquivo guarda o
  estilo na construção, e o motor lia o da peça. Agora vale o da construção,
  e escolher outro estilo no meio de uma casa abre uma construção nova.
- **O desfazer guardava a lista inteira de peças duas vezes a cada clique.**
  Agora toda peça tem um id, que não vai para o arquivo, e o histórico guarda
  só as peças que entraram, saíram ou mudaram. O motor guarda a geometria de
  cada peça pelo id e só refaz a que mudou: pôr uma parede na vila não
  remonta a fortaleza.

E os **estilos** saíram de `pecas.js` para `src/estilos.js`, com cada material
virando uma receita de textura. O pintor (`src/pintor.js`) desenha tábua,
assoalho, pedra assentada, cantaria, telha, rocha e terra pixel a pixel, sem
canvas, com o sorteio de semente tirada do nome do material. É o que deixa a
linha de comando desenhar a folha do catálogo e a vista de dentro sem
navegador, e a textura sair igual em qualquer máquina. São oito estilos, dois
por categoria onde a troca importa: madeira de pescador e pedra rústica de
vila, pedra de fortaleza humana, cripta de pedra e caverna natural, madeira
de porto e pedra de obra, e rocha e penhasco.

Ainda a medir quando a vila e a fortaleza existirem: montar as peças com
5.000 delas no mapa. O índice de sólidos sai de novo inteiro a cada mudança,
o que é barato até alguns milhares de peças; se passar de alguns ms, ele
também vira incremental.

#### 5. Onde o micro roda — DECIDIDO: numa página do canteiro, com os módulos do jogo

A página do canteiro carrega os módulos de `src/` direto, como a prévia do
ateliê carrega o `p3e.js`, e soma a camada de construção por cima. O jogo
publicado não leva nada dela.

Montar o motor do zero, com texturas e bichos assados, leva 0,6 s na cripta
e 1,1 s na ilha. A geometria da ilha de 650 inteira, em pedaços de 16 tiles
com piso igual fundido até 4×4, dá 74 mil quads, 4,8 MB, montados em 69 ms; o
pedaço mais cheio remonta em 0,06 ms. Então **o mundo vira um objeto que se
troca**: mudar de mapa ou mexer numa peça remonta só a geometria, sem
recarregar a página.

#### 6. O chão inclinado — proposta (29/9)

O primeiro passo da fase de relevo. Hoje o chão é plano em cada tile, e dois
tiles de alturas diferentes se ligam por parede vertical: a montanha vira
escadaria. O motor já tem o molde: o telhado guarda uma altura por canto e se
desenha em quad torto.

- **O mapa não muda.** O `MAPA 2` continua com uma altura por tile, e o
  canteiro continua como está. Quem tira os cantos é o motor, ao montar.
- **Cada tile ganha quatro cantos próprios.** Onde o vizinho está perto (a
  diferença até um limite), o canto é a média dos tiles em volta, e o chão
  corre contínuo. Onde passa do limite, é penhasco: o canto fica com a altura
  do tile, e a parede vertical continua ali. Água, piso de casa, parede e
  tile com peça ficam planos. **Só o chão natural inclina** (areia, grama,
  mato, lama, terra, encosta): calçada, lajota e tabuado são piso feito, e os
  degraus deles continuam escada (correção de 30/9, a pedido do Leandro).
- **O limite é decisão de olho.** O ruído do relevo sobe um degrau por tile
  (uns 14°); dois degraus são uns 27°, três uns 37°. Proposta: até dois
  degraus vira rampa.
- **O desenho:** o tile inclinado vira quad torto, com a textura presa no
  mundo. A parede entre tiles só sai no penhasco. A fusão de pisos iguais
  (até 4×4) só junta tiles planos, então vale medir o quadro na ilha de 650.
- **A física:** a altura num ponto sai dos quatro cantos, pelos mesmos dois
  triângulos em que o quad torto é desenhado. `groundUnder` e `pisosSob`
  perguntam a altura no ponto, e não mais no tile. O degrau (`STEP`, 0,42)
  continua valendo para o que é degrau.
- **A grade de andar** já pergunta os pisos por ponto; ganha uma inclinação
  máxima de andar, que marca o íngreme demais.
- **Em fatias:** 1) os cantos e o desenho, sem física, para o Leandro olhar no
  canteiro e escolher o limite; 2) a física e a grade de andar; 3) os testes,
  a validação (alcance, pior quadro) e a planta.

---

## O caminho

Escada, não salto:

1. **Protótipo single-player** — onde estamos, ~40%
2. **Co-op de 2 a 4 jogadores** — o salto técnico de verdade; ensina 80% do
   que um MMO exige
3. **Persistência** — conta, personagem, inventário, progressão
4. **Mundo persistente com zonas** — aí sim vira MMO pequeno

Sem pressa é vantagem. Cave Story levou ~5 anos de uma pessoa só; Stardew
Valley, ~4,5; Dwarf Fortress passa de duas décadas.

O andamento, o que falta fazer e o que falta decidir estão no `PLANEJAMENTO.md`.
