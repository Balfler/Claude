# Mundo Perigoso — planejamento

> O `DESIGN.md` guarda **o que o jogo é e por quê**. Este arquivo guarda **onde o
> projeto está**: o que está em andamento, o que falta fazer, o que falta
> decidir, o que entrou e o que saiu, e o diário. O detalhe de cada item fica
> no `DESIGN.md` ou no `mundo-perigoso/README.md`, e o item diz onde procurar.
>
> **Atualizado em:** 04/10/2026

## Como manter este arquivo

- **No fim de cada sessão**, uma linha no *diário*, e os itens mexidos mudam de
  lugar.
- **Nada se apaga.** O que fica pronto vai para *feito*. O que deixa de fazer
  parte do jogo vai para *entrou e saiu*, com o porquê.
- **Decidiu alguma coisa?** Sai de *por decidir*, e a decisão vai para o
  `DESIGN.md` com o porquê. Se mudou o que entra no jogo, anota também em
  *entrou e saiu*.
- **Coisa nova** entra em *a fazer*, na área dela, ou em *por decidir*.
- **Uma linha por item.** O detalhe mora no `DESIGN.md`.
- **Datas** em dia/mês/ano.

---

## Onde estamos

- **Fase:** 1 de 4, o protótipo single-player, uns 40%. Ver *o caminho*, no
  `DESIGN.md`.
- **Jeito de trabalhar (26/9):** ferramentas antes de conteúdo, e um pouco de
  cada frente em vez de fechar uma por vez, para descobrir cedo o que pode
  obrigar a refazer o que já existe. As *sondagens*, abaixo, existem para isso.
- **Frentes abertas:** o canteiro, o ateliê e o personagem do desenho.
- **Sondagens:** seis feitas em 26 e 27/9, na nuvem, e a sétima (o corpo pelas
  três vistas) em 29/9, no PC. A quinta já joga: a
  cripta em dupla (ou em quatro), com servidor, cada um com o seu visual, nome
  e fala. Nenhuma pede refazer o que existe; três pedem trabalho antes do
  co-op de verdade, e uma pede uma decisão de design (o preparo dos golpes).
  Ver *sondagens*.
- **As quatro propostas das sondagens** estão no `src/` desde 27/9: a fornada
  que solta as peles, o preparo do golpe como dado, o forno num worker e o
  jogador como parâmetro (a costura do co-op virando código de verdade).
- **Testes:** 32 baterias, 1156 verificações passando, mais as 8 do
  `verifica.js` (4/10); o co-op, 22 de 22. Tudo de uma vez:
  `node mundo-perigoso/teste/tudo.js`.

| Fase | O que é | Estado |
|---|---|---|
| 1. Protótipo single-player | O jogo sozinho, e as ferramentas | em andamento, uns 40% |
| 2. Co-op de 2 a 4 | A rede, o salto técnico de verdade | começada: um protótipo joga a cripta em dupla (sondagem 5) |
| 3. Persistência | Conta, personagem, inventário, progressão | não começada |
| 4. Mundo persistente com zonas | O MMO pequeno | não começada |

---

## Quem destrava o quê (30/9)

Tudo o que está aberto neste arquivo, separado por o que falta para andar.
Refazer esta lista quando algo mudar de coluna.

**O Claude pode fazer agora** (sem decisão e sem download):
- ~~o chão inclinado~~ — feito em 30/9, atrás de `?chao=inclinado`; falta o
  Leandro olhar e escolher o limite;
- ~~o cenário de 37 para 64 voxels por tile~~ — feito em 30/9, atrás de
  `?cenario=64` (sondagem 9); falta o Leandro olhar e decidir se liga;
- ~~a silhueta do relevo além da névoa~~ — feita em 30/9, atrás de
  `?silhueta=sim` (sondagem 10); falta o Leandro olhar;
- **256 voxels e HD (30/9, decidido):** o trabalho está em *a fazer*, em *256
  voxels e HD*;
- **Para o Leandro olhar as três de uma vez:** abrir o jogo com
  `cripta-vhalgorn.html?chao=inclinado&cenario=64&silhueta=sim` (ou o mesmo
  endereço no canteiro) e dizer o que liga por padrão;
- o campo de treino (boneco, medidor de dano, atraso simulado) — precisa
  de um mapa e de um bicho de treino, que ainda não existem;
- o forno: prioridade e cancelar — só faz diferença com muitos visuais no
  co-op, então espera o co-op de verdade;
- o resto de *a costura vira código*, exceto o que depende do fogo amigo.

**O Gemini pode fazer** (ver `ajudante/PEDIDOS.md`): refazer as imagens que
faltaram (024), as folhas de classe em T-pose (025), e o que for mecânico.

**Espera o olho ou a decisão do Leandro:** o limite do chão inclinado; os
círculos e as pendências das classes (*por decidir*); vender XP; o fogo
amigo; o preparo dos golpes; os nomes; o loot; tudo de PvP, guerra e era; o
ritmo do jogo.

**Espera download / uma conta:** os modelos de IA local (TripoSR, SF3D,
Hunyuan3D-2mini); o servidor no ar; o login (Discord, Google).

**Espera o Leandro gerar uma malha em T-pose:** o personagem. O leitor de
`.glb` já está pronto (29/9, sondagem 7): falta a malha, do 3D Studio do
Sorceress ou do Hunyuan, a partir de uma folha de frente em T-pose.

---

## Em andamento

### O canteiro — a ferramenta de mundo

- **Feito:** os itens 1 a 15 da antiga lista do `DESIGN.md` — as medições, o motor em
  pedaços, o `MAPA 2`, o micro, o macro, a grade de andar, o catálogo (68
  tipos em 8 estilos), os marcos, a validação, o conteúdo do pronto (ilha de
  650, fortaleza, gruta), o editor antigo aposentado, a revisão das peças e as
  portas e janelas que abrem.
- **A seguir, a fase de relevo e conteúdo** (planejada em 24/9, item 16):
  1. o chão inclinado, com altura por canto do tile — **feito em 30/9, atrás
     de `?chao=inclinado`, desligado por padrão** (sondagem 8, `DESIGN.md`,
     *o canteiro*, 6): o desenho, a física e a grade de andar, com 12 testes.
     Falta o Leandro olhar e escolher o limite (2 degraus é chute), e depois
     a validação, a planta e o canteiro ligados;
  2. a serra no macro, o material pela inclinação e pela altitude, e o relevo
     de longe;
  3. a montanha oca;
  4. as travessias sem nado;
  5. a mobília por classe, e o lote que mobilia;
  6. os geradores (fazenda, acampamento, moinho, pedreira, mina, cemitério) e
     o arruinar.
- **Onde está:** `DESIGN.md`, *o canteiro*;
  `mundo-perigoso/README.md`, *o canteiro*; `mundo-perigoso/prompts/ferramenta-de-mundo.md`.

### O ateliê — corpo, rig e animação

- **Feito:** esculpir, rig, peso geodésico, pele por quatérnio dual, animar,
  captura da CMU (andar e correr), prévia com o código do jogo, validação e
  exportar. O humano sai da receita byte a byte.
- **Falta:**
  - a espada e o arco seguirem o antebraço, e não só a mão;
  - andar de lado e andar para trás;
  - o jogo ler a `.pele`, em vez de vinte grades assadas;
  - aplicar o corpo às criaturas — ver a sondagem 4: a espécie vira dado;
  - o corpo definitivo do humano, que vai sair do personagem do desenho — é
    o aprendiz;
  - os visuais por classe, em dois corpos: primeiro as sete classes, o
    paladino, o templário, o inquisidor e o necromante.
- **Onde está:** `DESIGN.md`, *pendente e importante — o personagem composto
  por peças*; `mundo-perigoso/README.md`, *o ateliê de personagem*.

### O personagem do desenho — da imagem 2D ao corpo em voxel

- **Estado (29/9):** a medição começou. **O caminho só vistas está medido**
  (sondagem 7): uma folha com frente, perfil e costas em T-pose vira, em 1,5 s,
  um corpo do ateliê com rig sem aviso e as 20 poses. O Leandro olhou: "não
  está de todo ruim, mas não está no nível do Sorceress"; refeito em 256 de
  altura, "não ficou bom" — **o caminho sem IA fica parado**. O Sorceress,
  pelo que ele mesmo publica, usa o **Hunyuan 3D 3.1** da Tencent (malha com
  textura, depois convertida em voxel); os pesos abertos que achei vão até o
  Hunyuan3D 2.1 e o 2mini. Defeitos: a capa
  solta em 5 poses, o quadril do rig deslocado, o punho pintado no ombro de
  lado. **A malha de fora deu certo (30/9):** a forma de um gerador (o
  guerreiro do Leandro no Sorceress) com a cor projetada do desenho fica no
  nível esperado — rosto e pano nítidos, forma redonda. A capa esticava no
  rig (o peso ligava o pano aos braços): resolvido com `--pano` no ateliê
  (30/9), validação sem erro. O alinhamento fino também saiu (30/9): escala e deslocamento
  achados sozinhos, sobreposição de 0,85 para 0,90. Movimento e capa (30/9, a pedido do Leandro; a capa voltava a esticar
  quando ele mexia numa junta porque o painel refazia o peso sem o pano:
  agora a marca fica no projeto e o painel tem a caixa *pano*): as capturas da CMU
  entram no guerreiro, e o rig deixou de se enganar com capa e ombreira
  (virilha, pescoço, ombro), com o pano preso à bacia e ao tronco; a validação
  foi de 145 erros para 3. **Falta:** a passada ainda sai um pouco curta,
  testar manto e capuz, a capa como peça à parte com animação própria (osso
  próprio, se o Leandro quiser), melhorar a ferramenta de animação, e a IA local (TripoSR, Stable Fast 3D, Hunyuan3D-2mini; espera o
  download).
- **A entrada tem que ser T-pose.** As folhas do clérigo e do necromante (27/9)
  estão em pose A e não servem para o rig.
- **O primeiro passo pedido:** medir antes de fazer a tela — a imagem de
  referência pelos três caminhos (só vistas, IA local, malha de fora), cada
  modelo de IA que couber no Nitro V, e a folha lado a lado com o Sorceress.
- **Onde está:** `mundo-perigoso/prompts/personagem-do-desenho.md`.

### Higiene

- **Manter os testes.** São o que deixa sumir três meses, voltar sem lembrar
  de nada e mexer sabendo na hora se quebrou algo. Vale para sempre.

---

## Sondagens

Testes pequenos e feios para descobrir cedo se algo fundo vai ter de mudar.
Não é para terminar: é para saber. Levantadas em 26/9; cinco feitas no
mesmo dia, na nuvem, em `mundo-perigoso/sondagens/`, cada uma com um
`RELATORIO.md`.

| Sondagem | A pergunta | O que deu | Onde |
|---|---|---|---|
| 30 personagens diferentes numa praça | Assar um visual por jogador cabe no quadro e na memória? | **Cabe.** Havia um vazamento de 55 MB por visual na fornada, consertado com cinco linhas (2,4 MB depois; no `src/` desde 27/9). Desenhar 60 custa 2 ms. Assar é o problema: 0,7 s de CPU por visual, no laço do jogo; tem de ir para um worker — e um worker de Blob funciona aberto do disco | `sondagens/1-personagens/` |
| Arena de 2 jogadores, com atraso simulado | O servidor roda o código do jogo? O combate se sente bem com 100 a 150 ms? | **O servidor sobra:** 64 jogadores e 20 bichos, 0,35 ms por passo, 4 a 10 KB/s por jogador. **O combate não:** o golpe dos bichos leva 0,19 s e não se esquiva por reflexo nem sem rede. Precisa de uns 0,45 a 0,5 s para 100 a 150 ms. Tem simulador para jogar (`atraso.html`) | `sondagens/2-rede/` |
| O mapa aos pedaços pelo servidor | Dá para o segredo não ir no cliente? | **Dá.** O `MAPA 2` já é em pedaços; a ilha de 650 inteira são 48 KB, uma caminhada de 5 min manda 29 KB, e o motor recebe um pedaço em 5 a 8 ms, igual à ilha inteira. O canteiro não muda. Conversa, charada, loot e gerador devem nascer no servidor | `sondagens/3-mapa/` |
| Um lobo pelo ateliê | O ateliê serve para criatura que não é gente? | **Serve, generalizando.** O miolo não sabe que o corpo é de gente, e o esqueleto já é uma tabela (`OSSOS`). A espécie vira dado; o humano é a primeira | `sondagens/4-lobo/` |
| O co-op na cripta | Dá para jogar junto, com o código do jogo? | **Dá, e já joga.** Servidor em node sem dependência, que serve a página e roda a cripta; o navegador prevê o próprio corpo. Com 120 ms, a previsão não precisou de correção nenhuma. Uns 32 KB/s por jogador. **Versão 2 (27/9):** cada um com o visual do provador e o nome em cima, fala para todos, o golpe acertando onde você via o bicho (compensação de atraso), a contagem da cripta igual para todos e o fim em grupo. 21 conferências com dois navegadores. É costura, sem mexer no `src/` | `sondagens/5-coop/` |
| O forno do personagem num worker | Assar fora da linha principal, aberto do disco? | **Dá, igual byte a byte.** A linha principal gasta 1 ms por visual em vez de 800; quatro visuais ficam prontos em 3,4 s em vez de 25. E um achado: os 3 ms por quadro do forno de hoje não valem, porque a primeira tarefa de cada pose leva até 32 ms — cada visual assado dá trancos no jogo. O preço: o worker carrega o jogo inteiro de novo (uns 40 MB, 2 s) | `sondagens/6-forno/` |
| O corpo pelas três vistas, sem IA | Uma folha de frente, perfil e costas vira corpo do ateliê? | **Vira, abaixo do Sorceress** (o olho do Leandro). Em T-pose, 1,5 s; rig sem aviso, as 20 poses. A capa se solta em 5 poses, e a entrada em pose A não serve. Os outros dois caminhos (IA local, malha de fora) esperam download | `sondagens/7-tres-vistas/` |
| Uma armadura de verdade | O formato da peça aguenta as 20 poses? Cosmético é o produto | **não vai ser feita** (27/9): o visual passou a ser da classe; a armadura não aparece | — |
| 17. O mundo na placa (4/10) | O céu e as faces dos pedaços pela placa, com a cara do rasterizador? | **Dá, e sai igual a olho.** Usa as mesmas contas: índice, tabela de cor, luz pela distância, mip e o `\|0` do texel. Todas as texturas cabem numa textura em camadas, e cada pedaço sai numa chamada só. Medido no PC (GTX 960), a 1280×720: na ilha, de 45 para 60 quadros por segundo, preso no limite do monitor; na ilha de 650, de 34 para 60, com o processador em 8 ms por quadro em vez de 28; na cripta, de 34 para 60. Bichos, cenário e itens ainda saem do software, por cima, com a profundidade de cada pixel. `?mundo=placa`; sem WebGL2 volta o rasterizador | `src/mundo-placa.js` |

---

## Por decidir

### Combate e personagem

- **O preparo dos golpes dos bichos.** Hoje 0,19 s entre começar o golpe e
  acertar: medido, ninguém desvia por reflexo, nem sem rede. Para 100 a 150 ms
  de atraso, uns 0,45 a 0,5 s. Jogar o `atraso.html` da sondagem 2 (teclas `-`
  e `=`), ou o co-op com `--preparo=0.45`, e escolher, bicho por bicho. O
  valor já se escreve no `EDEF` (`src/p4.js`), por exemplo `preparo:.45`.
  — *sondagens/2-rede/RELATORIO.md*
- **O bloqueio:** segurar uma tecla, ou uma janela de tempo, tipo aparar? As
  poses já existem.
- **O arco como arma:** mira, munição e dano. As poses já existem.
- **Como o mago digita** sem virar datilografia: combos curtos, ou ritual longo
  feito em segurança?
- **Classes por quest, o que falta** (o resto foi aceito em 27/9 — *classes
  por quest*, no `DESIGN.md`):
  - o nome do rúnico: runomante, entalhador de runas ou mestre rúnico;
  - o mago da memória troca o secundário? E trocar o principal pede outra
    quest de classe?
  - a morte tira os últimos nós: e se o último for o que abriu a classe?
  - o nível da quest de classe (20 é chute: é o tempo na ilha);
  - a classe proíbe arma? O mago pode usar adaga?
  - quem forja a armadura;
  - os elementos: quais são, e quem resiste a quê;
  - o prédio do alquimista e o do ferreiro na cidade: o mesmo nome da classe,
    ou boticário?
  - **os nós dos círculos**, o que trava o simulador (29/9). Propostas do
    Claude:
    - o círculo de cada classe é a fatia antiga dela (entrada e três ramos de
      20, uns 61 nós); o do bárbaro é novo — por exemplo fúria, duas mãos e
      vigor, com o "arma de duas mãos" saindo do guerreiro;
    - o círculo do aprendiz de cada talento são os cinco primeiros nós de cada
      ramo da classe dele (os dois, em adaga e arco), e a quest abre quando se
      chega ao fim de um ramo;
    - o secundário "adaga e arco" usa o círculo do aprendiz dele, com os
      ramos do arco e da adaga, até a metade.
- **Vender XP.** Proposta do Leandro (27/9): consumível de XP para quem tem
  pouco tempo. Contra: o `DESIGN.md` decidiu só cosmético, e com a era zerando
  e o PvP, XP comprado compra lugar na corrida. Alternativa do Claude: XP
  descansado, de graça. Até decidir, vale o `DESIGN.md`.
- **O que se perde de itens ao morrer.** A experiência já está decidida: 5%.
- **O loot.** Nada definido.

### Co-op

- **O saque em grupo:** hoje o item é de quem pega primeiro, e a chave rúnica
  é de quem a pegou. — *sondagens/5-coop/RELATORIO.md*
- **Fogo amigo e empurrão entre jogadores:** hoje um atravessa o outro, e a
  magia não fere o outro (nem a explosão da bola de fogo, que no jogo sozinho
  fere quem está perto — e, no código, ainda só fere o jogador da tela).

### PvP e caídos

- **O PvP entre jogadores normais:** existe, falta definir como.
- **Jogador ativo:** o nível mínimo, o tempo jogado e a janela de dias que
  contam para as vagas de caídos.
- **As propostas dos caídos:** recusar também conta, sem mínimo de vagas, o
  colar direto na mochila, a sala do ritual com saída, a marca com custo, a
  mesma vítima rendendo menos, caído não pisar na ilha, começar só com o
  necromante. — *os caídos, proposta ainda não decidida*

### Guerra e eras

- **Quantas fortalezas.**
- **Quando os jogadores vencem:** o servidor reinicia depois de um a três
  meses; ou o vencido fica e abre outro; ou um portal leva a um mundo de outro
  tema. Uma enquete pode decidir. — *quando os jogadores vencem*
- **As propostas da guerra:** o rei demônio mais forte a cada semana, a batalha
  final, a semana preparando o fim de semana, hordas de um lado e guardas NPC
  do outro. — *a guerra de fim de semana, proposta*
- **O que fica igual entre eras**, além da ilha: as capitais? a cidade
  steampunk?

### Mundo e mapa

- **Os nomes** das regiões e das placas.
- **Se a ilha de 650 passa a ser a ilha do jogo.**
- **Como se chega às terras do outro lado dos rios:** ponte, vau ou barco.
- **As regras de jogo dos marcos:** porta trancada, alavanca, armadilha, ninho,
  luz, som e gatilho. O dado já fica guardado no mapa. A passagem secreta pode
  nascer já do lado do servidor — *sondagens/3-mapa/RELATORIO.md*

### O projeto

- **O nome do jogo.**
- **O motor por software continua a identidade?** (4/10) Com o mundo na placa
  (sondagem 17), o rasterizador vira a reserva de quem não tem WebGL2, e
  continua sendo o dos testes e do canteiro. O `DESIGN.md` usa o "motor em
  software feito do zero" como gancho do devlog.
- **O idioma.** Português primeiro; se vier inglês, separar os textos cedo.
- **O devlog público** (proposta de 24/9): itch.io para o jogo, Discord de
  fórum.
- **Onde o servidor fica.** A Oracle grátis tem uma região de casa; com São
  Paulo ou Vinhedo, o atraso para quem joga no Brasil fica em uns 10 a 70 ms,
  e o preparo dos golpes pode ser menor. — *sondagens/2-rede/RELATORIO.md*

---

## A fazer

### Consertos

- Nenhum aberto. Os de 29/9 estão em *feito*; dois achados da entrega 009
  foram conferidos e não eram bug: a conversa só não alcança morador em outro
  nível (todos os sete estão no chão, com lugar no nível deles em volta), e o
  portal não conclui para quem já morreu.

### 256 voxels e HD (30/9; ordem refeita em 1/10)

O Leandro decidiu: o padrão de desenvolvimento é o personagem de **256
voxels** e a tela **HD (1280×720)**, e as outras ficam como opções gráficas
(`DESIGN.md`, *densidade e tela*). Em 1/10 a ordem mudou: primeiro o 256
rodando no jogo e medido, depois otimizar o que a medição apontar (antes se
ia otimizar uma cena sem personagem nenhum).

1. **Feito (1/10): o jogo aceita qualquer densidade.** O `src/p3e.js` lê a
   densidade da grade do corpo; as peças continuam escritas em 117 e vão para
   a densidade (`naDensidade`); o corpo troca em pleno jogo
   (`usarCorpoDesenhado`, e o forno recebe o novo); um corpo dá as outras
   densidades (`reamostrarCorpo`); e em 256 há duas cópias para longe (metade
   e um quarto), escolhidas pela distância. O ateliê exporta em outra altura
   (`cli.js exportar --altura 256`). Testes em `teste/densidade.test.js`.
2. **Feito (1/10): o guerreiro de 256 no jogo, medido** (sondagem 12,
   `sondagens/12-densidade-no-jogo/RELATORIO.md`). A densidade quase não muda
   o quadro: quem pesa é a tela HD, no mundo (28 ms a cena vazia em 1280×720,
   no node; 48 quadros por segundo no navegador). O 256 pesa fora do quadro:
   arquivo de 20 MB, 13 s de forno e 9,4 MB de sprites por visual. O 117
   reamostrado do 256 fica tão bom quanto o do ateliê.
3. **Feito (1/10): o formato menor.** O PERSONAGEM 3 é compactado sem perder
   voxel (`editor/compacto.js`, `src/compacto.js`). O guerreiro de 256 caiu
   de 20 para 8 MB, e o humano de 1,5 para 0,6 MB.
4. **Feito (1/10): o guerreiro como corpo de teste e a densidade como opção.**
   - O guerreiro abre com `?corpo=guerreiro` e fica fora do HTML, em
     `personagens/guerreiro.corpo.js`; o humano continua sendo o corpo do jogo.
   - A tecla 9 no painel de ajuste troca a densidade (117, 165 ou 256), e a
     escolha fica guardada.
5. **Feito (1/10): o HD a 60 e como padrão de fábrica.** A medida é no
   navegador, em 1280×720:

   | Lugar | Antes | Depois |
   |---|---|---|
   | Ilha | 48 quadros por segundo | 60 |
   | Vila, com o guerreiro | — | 55 a 58 |

   O que mudou:
   - a divisão de perspectiva passou a ser feita a cada 16 pixels;
   - o céu é desenhado antes do mundo, copiando linha;
   - a foto de oclusão só refaz os blocos pintados;
   - o trecho com a mesma luz usa um laço sem luz.

   Só a primeira muda a imagem, em 0,3% dos pixels. O ajuste guardado antes
   (versão 2) perde só a tela. **Falta:** os 60 na vila; o rasterizador ainda
   é dois terços do quadro.
5b. **Feito (1/10): o mundo em 128 como padrão** (sondagem 13; `?mundo=64`
   volta ao de antes).
   - Texturas da ilha e dos estilos em 128 por tile, com mip escolhido pela
     média dos dois sentidos da tela.
   - Cenário em 128 voxels por tile, com cópias para longe.
   - Calçada (pedra com sombra e granulado) e telha (beira, fresta e barro
     manchado) ajustadas.
   - Custa uns 3 s a mais para montar o mundo.
   - **Falta:** as texturas da cripta, que ainda são de 64; o telhado visto de
     raspão, que ainda fica liso.
5c. **Feito (1/10): o andarilho da vila.**
   - O guerreiro de 256 passeia na rua perto do Guarda Anselmo.
   - É assado com o corpo dele, sem trocar o do jogador: `comCorpo` e
     `fornadaAoFundo` com outro corpo, o mesmo caminho que o co-op vai
     precisar para os outros jogadores.
   - **Custo:** a página sempre carrega o guerreiro (8 MB) e manda as grades
     dele ao worker (uns 110 MB copiados). Falta mandar só as 7 poses do
     andar, ou transferir em vez de copiar.
5d. **Feito (1/10): o personagem visto de cima** (sondagem 14).
   - O jogador e o andarilho são assados também de 35, 70 e 90 graus.
   - A partir de 17,5 graus de altura, o cartaz deita para encarar a câmera.
   - **Custo:** o forno faz quatro vezes o trabalho, e os sprites ocupam
     quatro vezes a memória.
   - **Falta:** talvez só a cópia de metade nas alturas, para economizar
     memória.
   - No modo vitrine (V), o andarilho congela onde está.
5e. **Feito (3/10): o andarilho em 3D pela placa, como padrão** (sondagem 16).
   - O Leandro viu o andarilho de perto virar um cartaz achatado e pediu "um
     personagem 3D mesmo". Com WebGL2, a placa desenha o corpo do ateliê
     posado a cada quadro (`src/gpu.js`), sem forno e sem sprite; sem WebGL2,
     ou com `?gpu=nao`, volta o sprite de sempre. `?gpu=sim` força a placa.
   - Quem decide é o carregador da página (`src/p1.html`): com a placa vem só
     o modelo (`guerreiro.gpu.js`, 2,5 MB) e não mais o corpo de 8 MB, e o
     forno não assa nem copia nada para o andarilho.
   - Conferido no Chromium (de frente, de costas, de lado, colado, de cima e
     andando): os furinhos de perto na gola de pele fecharam (corte das
     costas do voxel de 0,2 para 0,5, quadradinho de 1,5 para 1,75 voxel).
   - Num quadro sem ninguém para a placa desenhar, o mundo sai pelo
     `putImageData` de sempre, sem subir imagem para a placa.
   - **O jeito de desenho (3/10, o padrão):** o 3D mexia "muito boneco 3D".
     A pose troca em quadros, sem misturar, no ritmo do sprite; o corpo gira
     em 16 rumos; a borda escurece a 0,42, como o `CONTORNO_DO_PERSONAGEM` do
     sprite. `?anim=suave` volta ao 3D liso, e `?rumos=N` muda os rumos (0 é
     livre).
   - **O recheio atrás da casca:** fecha os buracos do ombro quando o braço
     balança. São três passadas por personagem (casca, recheio e contorno),
     acertadas em `GPU_CASCA`, `GPU_RECHEIO` e `GPU_CONTORNO`, no topo do
     `src/gpu.js`.
   - **O ombro fechado de vez (3/10, noite):** o recheio só tapava a fresta
     rasa. O buraco era o miolo, que não ia para a placa. Agora o modelo leva
     também o miolo a até 3 voxels de outro osso (`MIOLO_DA_JUNTA`, em
     `atelie/gpu.js`), com a normal zero, e a placa acende ele de frente.
     Medido fora do jogo, nos 20 quadros e de 8 lados: nenhum buraco. Em 256 o
     modelo foi de 279 mil para 347 mil voxels, e de 2,5 para 2,8 MB.
   - **Medido (3/10, no PC: GTX 960 e FX-6300, 1280×720):** perto do Anselmo,
     com o andarilho na tela, uns 41 quadros por segundo (o contador do F dá
     de 23 a 28 ms); com `?gpu=nao`, uns 37. A placa não pesa: quem pesa é o
     mundo no processador.
   - **Falta:** medir os quadros no notebook antigo; o jogador em terceira pessoa
     (X) continua sprite, porque ainda não há modelo da placa para o humano.
6. **O forno em 256:** assar primeiro o que se vê (parado e andar), e talvez
   só a cópia de longe de quem está longe; a memória de 9,4 MB por visual.
7. **As peças desenhadas em 256** (armas, elmos, chapéus, cabelo): hoje são
   as de 117 ampliadas, com o degrau do 117. Trabalho de arte.
8. **O peso do ateliê em 256** leva 27 s no navegador: levar para um worker ou
   guardar o peso pronto no projeto.
9. **Um desenho com mais pixels de arte** (hoje uns 125 de altura): é o que
   faz a *cor* ganhar com 256 (a forma já ganha).
10. **Malha de alta resolução de origem** (o `.glb` do gerador, que o
   `editor/glb.js` já lê) em vez do `.wgvox` de 257, se um dia se quiser
   passar de 256.

### Classes por quest (27/9)

- **O simulador de build e o `src/regras.js`** ainda usam o disco único:
  passar para aprendiz, classe, secundário e segunda classe. **Parte feita
  (29/9):** o `regras.js` já tem os talentos, as classes, o secundário, as 35
  segundas classes, as 12 quedas e os pontos por nível, com 13 testes. Falta
  o conteúdo dos círculos (em *por decidir*), e depois o simulador.

### Pedido pelas sondagens (26/9)

1. **Assar num worker:** feito (proposta 3, no `src/` desde 27/9). Falta:
   prioridade (o próprio personagem e quem está perto primeiro), cancelar, e
   talvez um pacote menor para o worker, montado pelo `build.js` (hoje ele
   carrega o jogo inteiro, uns 40 MB). — *sondagens/6-forno/RELATORIO.md*
2. **A costura vira código de verdade:** feito (proposta 4, no `src/` desde
   27/9: o passo do jogador e o do mundo, o jogador como parâmetro no golpe,
   dano, ação, porta, item e fala, o bicho perseguindo o mais perto). Falta:
   - ~~o fervor de quem mata~~ — feito em 30/9;
   - a explosão da bola de fogo, que ainda só fere o jogador da tela — espera
     a decisão do fogo amigo, em *por decidir*;
   - o som e a mensagem de quem pega item ou abre porta, que saem na tela de
     quem roda o mundo (no co-op, o servidor, que não tem tela) — os sons
     como evento por jogador;
   - separar no `G` o estado do mundo do efeito de tela.
3. **Conversa, charada, loot e gerador do continente escritos para rodar no
   servidor** desde o começo: o jogo pergunta, o servidor responde. Barato
   agora, caro depois. — *sondagens/3-mapa/*
4. **A espécie vira dado no ateliê**, e o primeiro bicho é o lobo. Quando
   chegar a vez das criaturas. — *sondagens/4-lobo/*
5. **Receber pedaço de mapa e o resumo do relevo.** No co-op.
   — *sondagens/3-mapa/*
6. **Jogar o co-op da cripta com alguém**, na mesma rede ou pelo túnel, e
   anotar o que incomoda. É o Leandro que sabe se está gostoso. O visual se
   escolhe em `/provador` no endereço do servidor, o nome com `?nome=`, e
   Enter fala. — *sondagens/5-coop/RELATORIO.md*, *como jogar*

### Na fila — a ordem combinada

1. **Acabar o personagem** — ver *em andamento, o ateliê*.
2. **O cenário de 37 para 64 voxels por tile.**
3. **A silhueta do relevo além da névoa**, no motor.
4. **A ilha nova, maior**, desenhada pelo Leandro: a cidade, o porto na
   ilhota, e as entradas de dungeon fechadas desde o começo.
5. **Otimizar o desenho antes do co-op.** Parcial: com os pedaços, a taverna
   caiu de 25 para 14 ms, num orçamento de 16,7. **O mundo na placa**
   (sondagem 17, `?mundo=placa`) leva a ilha a 60 no PC. Falta:
   - o Leandro comparar o visual;
   - medir no notebook antigo;
   - os sprites (bichos, cenário, itens, partículas) irem para a placa e a
     imagem do software parar de subir a cada quadro;
   - a silhueta do relevo (`?silhueta=sim`), que a placa ainda não desenha;
   - virar o padrão.
6. **Co-op de 2 a 4:** o protótipo da sondagem 5 já joga (WebSocket, o
   servidor manda na simulação e roda o código do jogo). Falta o que o
   relatório dela lista, e a costura virar código de verdade.

### Sem ordem ainda

- A luz das tochas e dos lampiões, e a luz dinâmica dos monstros.
- O som ao ar livre: mar, vento, e o passo diferente em cada chão.
- A água: espuma na beira e respingo.
- O navio aparecendo no jogo.
- Sair da cripta pelo começo, e a cripta lembrar o que já foi feito.
- Um conversor de arte de verdade.
- Juntar os tiles distantes, e o mirante com a espada no pico.
- Salvar o personagem localmente.
- O chat de texto (o co-op da sondagem 5 já tem um, simples).

### Sem nada feito ainda, por área — levantamento de 26/9

- **Combate e habilidades.** Os efeitos das perícias no jogo (projétil, área,
  bênção, invocação, transformação); o `regras.js` ainda não entra no jogo.
  *Ferramenta:* um campo de treino, com boneco, medidor de dano e atraso
  simulado — o `atraso.html` da sondagem 2 já é meio caminho.
- **Itens e loot.** A bolsa existe, mas não o sistema de item: a definição de
  cada item, a tabela de drop, a carga, e o equipamento que muda os números e
  a aparência ao mesmo tempo. *Ferramenta:* um catálogo de itens, no espírito
  do simulador de build.
- **Criaturas.** O bestiário como dado: vida, dano, preparo do golpe,
  comportamento, drop e onde nasce. Os bichos da ilha (rato, lobo, cobra,
  caranguejo) e os que não atacam (galinha, cachorro, gado, pássaro, cervo que
  foge).
- **Missões, falas e enigmas.** O estado de missão (o que foi feito, condição,
  recompensa), a charada que muda pelo item no inventário, e o segredo
  sorteado de novo a cada era — no servidor. *Ferramenta:* um editor de
  roteiro com os textos fora do código, o que de quebra resolve a tradução.
- **Mundo gerado por era.** O gerador do continente a partir dos módulos do
  canteiro e da semente da era, no servidor. *Ferramenta:* sortear uma era,
  ver, validar e sortear de novo. E o ciclo de dia e noite: a lua vermelha
  sobe à noite, mas cada mapa tem uma luz fixa.
- **Servidor, contas e persistência.** Entrar pelo Discord ou pelo Google,
  guardar personagem e inventário, um processo por zona, e pôr no ar.
  *Ferramenta:* o servidor rodando no PC com vários clientes, e bots sem tela
  para teste de carga — o `servidor-mudo.js` da sondagem 2 já é o começo.
- **Guerra e eras.** O calendário do evento, a tomada de fortaleza, as hordas,
  os guardas, o rei demônio crescendo, a lua vermelha, as vagas de caídos e o
  fim da era. *Ferramenta:* um simulador de guerra.
- **Social.** Chat, grupo, amigos e denúncia.
- **Interface.** Inventário, equipamento, o disco dentro do jogo, loja, diário
  de missões, janela de chat, criação de personagem com as receitas e
  configurar teclas. Um kit de interface em pixel (fonte, janela, botão).
- **Som.** A música: um tracker grátis (OpenMPT, o formato de música de jogo
  dos anos 90) e só um tocador no jogo, em vez de ferramenta própria.
- **Operação.** Comandos de mestre (teletransportar, criar criatura,
  expulsar), moderação, registro, e o mapa de calor de onde se morre e onde se
  trava, desenhado na planta do canteiro.

---

## Feito — os marcos

Os detalhes estavam na *lista de tarefas* do `DESIGN.md`, que saiu em 27/9
(ficam no histórico do git).

- O motor 3D próprio, por software, e a cripta jogável: seis criaturas, três
  armas, portas, porta com chave, parede secreta, fervor.
- Céu e névoa: a estética de 93 aguenta espaço aberto.
- As criaturas em voxel, com oito rotações, morte e cadáver.
- O teste de desempenho: a ilha desenha 60 tiles.
- O cenário em voxel e os moradores.
- O simulador de build: o disco, as especializações, a morte, o mago da memória
  e a traição do clérigo.
- O painel de ajuste (P).
- O personagem em 128 por tile, a terceira pessoa (X) e o provador.
- Mais de um mapa, o jogo abrindo na ilha, a velocidade 65, e trocar de mapa
  sem recarregar a página.
- A fatia pequena da ilha: o píer, a praia, a estrada e o portão de Pedra Alta.
- A conversa por palavras-chave e a bolsa.
- As quatro mudanças antes do multiplayer: simulação sem som, passo fixo,
  entrada como dado, nenhum `setTimeout`.
- A tela em 640×360, com pixel quadrado.
- A faxina do `DESIGN.md` (27/9): a *lista de tarefas* e o *em aberto* saíram,
  e moram aqui.
- Os arquivos do co-op com " (1)" no nome, do Drive, de volta ao nome certo
  (27/9).
- O projeto em git: o fonte mora em `mundo-perigoso/` e o HTML jogável sai do
  `mundo-perigoso/build.js`. Quase deu errado: o código morava num scratchpad
  temporário, parcialmente limpo, e `p2.js` e `p5a.js` só voltaram porque o
  HTML publicado era a concatenação de tudo.
- O ateliê de personagem, com andar e correr por captura da CMU.
- O canteiro, itens 1 a 15.
- As sondagens 1 a 4 (26/9): personagens na praça, rede e atraso, mapa aos
  pedaços, lobo no ateliê.
- O co-op na cripta (26/9): dois a quatro jogadores, servidor em node sem
  dependência, previsão do movimento — o primeiro multijogador.
- O co-op, versão 2 (27/9): visual e nome de cada um, fala, compensação de
  atraso no golpe, contagem e fim da cripta em grupo.
- A sondagem 6 (27/9): o personagem assado num worker, aberto do disco.
- As quatro propostas das sondagens no `src/` (27/9): a fornada que solta as
  peles, o preparo do golpe como dado, o forno num worker e o jogador como
  parâmetro. 997 testes, 8 de 8 no `verifica.js`, co-op 21 de 21, e a
  esquiva do simulador de atraso igual.
- A bateria num comando só (29/9): `node mundo-perigoso/teste/tudo.js`.
- O leitor de .glb e o voxelizador sólido (30/9): a malha do Sorceress
  voxelizada em 0,4 s, com o rosto limpo; 11 testes.
- O chão inclinado, fatias 1 a 3 (30/9), atrás de `?chao=inclinado`: o
  terreno natural corre de um tile ao vizinho até 2 degraus, o penhasco e a
  escada (piso feito) continuam, e quem anda acompanha; a mira do canteiro, o
  alcance e a planta (`--degraus=N`) já sabem dele; 13 testes. Sondagem 8.
- A silhueta do relevo além da névoa (30/9), atrás de `?silhueta=sim`: o
  relevo que passa da linha dos olhos depois de 60 tiles vira silhueta no
  céu, ~0,3 ms; 6 testes. Sondagem 10.
- O cenário em 64 voxels por tile (30/9), atrás de `?cenario=64`: os modelos
  crescem na conta, sem redesenhar; mesmo tamanho no mundo, 4 testes.
  Sondagem 9.
- O fervor é de quem matou, e não do jogador da tela (30/9), com 3 testes.
- Os consertos do co-op (29/9): o corpo só entra na cripta no Enter, e não
  morre mais na tela de título; as costuras aceitam o jogo montado em CRLF.
  Co-op 22 de 22.

---

## Entrou e saiu

As mudanças no que o jogo vai ter, e no jeito de trabalhar. As sem data são
anteriores a este arquivo.

| Data | Mudança | Por quê |
|---|---|---|
| — | **Saiu** a roda de seis árvores com preço por distância; **entrou** o disco de habilidades | desenho do Leandro: o custo é o caminho, sem regra de centro |
| — | **Entrou** o druida como fatia própria; a armadura virou nós do guerreiro | formas animais e plantas são identidade demais para um híbrido |
| — | **Saiu** a tela de 320×200; **entrou** 640×360 com pixel quadrado | medido: encaixa inteiro em qualquer monitor, e o pixel continua visível |
| — | **Saíram** os desenhos à mão das criaturas; **entrou** o voxel | rotações de graça, e cosmético como peça em vez de catálogo de desenhos |
| — | **Saiu** o editor de mapa antigo; **entrou** o canteiro | o editor travava em tile inteiro |
| — | **Saiu** a dependência do Sorceress; **entraram** o ateliê e, depois, o personagem do desenho | é pago, caro para o projeto, e o rig dele travava |
| 24/9 | **Saiu** o nado: a água funda é barreira | o rio se atravessa por tronco, pinguela, vau, ponte |
| 24/9 | **Saíram** corda e gancho: sobe-se só por trilha | complicaria tudo |
| 24/9 | **Entrou** a montanha oca, explorada em cima e por dentro, no próprio mapa | — |
| 24/9 | **Entrou** o continente gerado por era, com os módulos do canteiro | ninguém desenha um continente por era |
| 24/9 | **Entrou** a cidade steampunk | — |
| 24/9 | **Entraram** as classes sociais e a mobília por classe | a cidade gerada segue a classe |
| 26/9 | **Saiu** "fechar o personagem antes de seguir"; **entrou** um pouco de cada frente, com as sondagens | descobrir cedo o que pode obrigar a refazer o que já existe |
| 26/9 | **Entrou** este arquivo | um lugar só para o andamento do projeto |
| 27/9 | **Saíram** a classe livre e o disco único; **entraram** o aprendiz, a quest de classe, o caminho secundário e a segunda classe | o visual por classe tira a combinatória das peças; o projeto fica mais simples |
| 27/9 | **Saíram** a armadura que aparece e o cosmético de corpo; **entrou** o visual por classe, com cosmético só de cabeça | Ragnarok e Tibia nunca tiveram problema com isso |
| 27/9 | **Saíram** os trios; **entraram** as quests de segunda classe escondidas | o segredo continua, sem uma terceira camada de classes |
| 1/10 | **Mudou** o mundo de 64 para **128 por tile** (texturas com mip, cenário em 128 voxels); **entrou** o andarilho da vila, com a skin do guerreiro | o personagem de 256 pedia o mundo junto; o andarilho é para ver o 256 de todos os lados |
| 1/10 | **Mudou** a tela de fábrica de 640×360 para **1280×720** | o Leandro pediu, depois da otimização que levou o HD a 60 na ilha |
| 3/10 | **Mudou** o andarilho de sprite para **3D pela placa** por padrão (com WebGL2; `?gpu=nao` volta ao sprite) | de perto o sprite virava um cartaz achatado; o Leandro quer "um personagem 3D mesmo" |
| 3/10 | **Mudou** o andarilho 3D para o **jeito de desenho** (pose em quadros, 16 rumos, contorno); `?anim=suave` volta ao 3D liso | o 3D mexia "muito boneco 3D", e o sprite tinha "uma pegada mais desenho" |
| 30/9 | **Mudaram** o padrão de desenvolvimento: personagem de 117 para **256 voxels** e tela de 640×360 para **HD (1280×720)**; as outras viram opções gráficas | os bloquinhos do personagem ficavam grandes; o teste no jogo (sondagem 11) mostrou o ganho, principalmente em tela maior |
| 27/9 | **Entraram** os ofícios de classe (ferreiro, alquimista, venenos, elemento, runas, armadilhas, pergaminhos) | economia entre jogadores a cada era |
| 26/9 | **Saiu** o GitHub; **ficou** o Drive como o lugar do projeto | o que ia para o GitHub não subia direito, e o Drive deixa trabalhar de qualquer máquina, uma por vez |

---

## Diário

- **26/09/2026** — Levantamento do que falta para o jogo completo, as cinco
  sondagens, e a criação deste arquivo e do `CLAUDE.md`. Sessão pela web, lendo
  o Drive.
- **26/09/2026** — Sondagens 1 a 4, na nuvem, sobre uma cópia do projeto (zip
  do `mundo-perigoso`), com os 972 testes passando antes e depois. Achados: o
  vazamento da fornada (remendo pronto, não aplicado), o golpe dos bichos
  curto demais para esquivar com rede, e três caminhos abertos sem refazer
  nada (servidor com o código do jogo, mapa aos pedaços, espécie como dado).
  Tudo em `mundo-perigoso/sondagens/`, como arquivo novo; nada do que existia
  foi mexido.
- **26/09/2026** — Sondagem 5, na nuvem: o co-op na cripta. Servidor com o
  código do jogo, WebSocket feito à mão, cliente com previsão e
  interpolação, os outros jogadores com o boneco do provador. Testado com dois
  navegadores (um com 120 ms simulados): nove de nove conferências. Para
  jogar: `node mundo-perigoso/sondagens/5-coop/servidor.js`.
- **27/09/2026** — Na nuvem, de madrugada, com os créditos que sobraram. O
  co-op ganhou a versão 2 (visual do provador, nome, fala, compensação de
  atraso no golpe, contagem e fim da cripta em grupo, `--preparo`): 21 de 21
  conferências. Duas propostas para o `src/` em `mundo-perigoso/propostas/`,
  cada uma com teste que falha sem ela: a fornada que solta as peles e o
  preparo do golpe como dado (972 → 975 testes, nenhum falhando); as costuras
  das sondagens 2 e 5 aceitam o `src/` com ou sem a 2. Sondagem 6: o forno do
  personagem num worker, igual byte a byte, e o achado de que os 3 ms por
  quadro do forno não valem (tarefas de até 32 ms). Nada do que existia foi
  mexido; no Drive, só arquivos novos e os das sondagens trocados.
- **27/09/2026** — Na nuvem, de manhã, com os US$ 28 que restavam. Proposta
  3, o forno do personagem num worker dentro do jogo: no navegador, a troca
  de arma passou de uns 700 ms de forno no laço do jogo para 0 a 1 ms.
  Proposta 4, a costura virando código: `passoDoJogador` e `passoDoMundo`, o
  jogador como parâmetro, o bicho perseguindo o mais perto, com um teste de
  dois jogadores no mesmo mundo. As quatro propostas juntas: 997 testes, em
  qualquer ordem. O co-op (21 de 21) e o simulador de atraso funcionam com e
  sem elas; e o servidor do co-op parou de acumular som e faísca, que ninguém
  esvaziava.
- **27/09/2026** — No PC, com o ajudante (o Gemini). Revistas as entregas 001
  a 004 e a 001b (as quatro propostas: 997 testes mais as 8 do `verifica.js`,
  0 falhas). A faxina do `DESIGN.md`: a *lista de tarefas* e o *em aberto*
  saíram (o diff do ajudante sem o BOM que ele punha), e os dois itens que só
  estavam lá vieram para cá. Do jogar e anotar: três consertos no co-op, em
  *a fazer*. O `CLAUDE.md` passou a apontar para o `ajudante/`. As quatro propostas
  aplicadas no `src/` e conferidas pelo ajudante (pedido 005: 997 testes, 8
  de 8, co-op 21 de 21, esquiva igual); os `.diff` foram apagados. As vistas
  do humano em `Arte/personagens/Referência/`. E um listão para o ajudante
  (pedidos 006 a 016): bateria num comando só, CRLF na costura, o bug do
  co-op, a cripta até o fim, bichos e textos em tabela, referências
  quebradas, pesquisa de imagem para 3D, bichos e armaduras em três vistas,
  rascunho de nomes; e conceitos de arte (017 a 022): moradores, os bichos
  da cripta, os inimigos do `DESIGN.md`, armas, peças de roupa e os lugares; e o book do
  jogo pronto (023), como proposta visual.
- **27/09/2026** — Conversa de design com o Leandro: o visual passa a ser da
  classe, e a classe sai de quest. Aprendiz com talento, sete primeiras
  classes, caminho secundário, 35 segundas classes, caídos pela magia
  sagrada, ofícios de classe. Registrado no `DESIGN.md`, *classes por quest*,
  como aceito como ponto de partida; o que falta, em *por decidir*.
- **29/09/2026** — Revistas as entregas 006 a 023 do ajudante: a bateria num
  comando só (`node mundo-perigoso/teste/tudo.js`) entrou no projeto; o bug
  do co-op foi confirmado, e mais dois consertos entraram em *a fazer*; a
  cota de imagem acabou no meio, e a 021 veio vazia (recusada). O que faltou
  é o pedido 024. A pasta `Arte/personagens/` foi reorganizada pelo Leandro
  (`modelos vox/`, `Referência/`); os caminhos do código foram atualizados, e
  o `humano.png`, que tinha sumido, voltou do git para `Referência/`. 997
  testes e 8 de 8.
- **29/09/2026** — Com o limite renovado, os quatro itens sem download.
  1) Consertos: no co-op o corpo só entra na cripta no Enter (co-op 22 de
  22, com um teste novo), e as costuras aceitam o jogo em CRLF; os dois
  achados da 009 não eram bug. 2) Sondagem 7: o corpo pelas três vistas,
  sem IA, medido com a folha do guerreiro em T-pose. 3) O `regras.js` ganhou
  as classes por quest (talentos, classes, secundário, 35 segundas classes,
  12 quedas, pontos), com 13 testes; os nós dos círculos esperam decisão. 4)
  O chão inclinado foi planejado no `DESIGN.md`; a primeira fatia espera o
  olho do Leandro. 1010 testes e 8 de 8.
- **30/09/2026** — Mais um dia de tarefas sem depender de decisão nem de
  download. O leitor de `.glb` e o voxelizador sólido (11 testes): a malha do
  Sorceress voxelizada por nós sai limpa (o rosto que o `.wgvox` deles
  salpica), e isso desenha o caminho do personagem: a forma vem de um gerador
  de malha, a cor da textura ou do desenho. O fervor passou a ser de quem
  matou (3 testes). O chão inclinado, desenho e física, atrás de
  `?chao=inclinado` (sondagem 8, 12 testes): falta o Leandro olhar as imagens
  e escolher o limite. A triagem "quem destrava o quê" entrou no topo. Pedido
  025 ao ajudante: as folhas de classe em T-pose. 1036 testes e 8 de 8.
- **30/09/2026, à tarde** — Com o Leandro longe do PC, o resto do que dava sem
  decisão nem download. O chão inclinado ganhou a fatia 3 (mira do canteiro,
  alcance, planta e CLI) e a correção pedida pelo Leandro: **escada é
  escada** — só o chão natural inclina, e a escadaria de Pedra Alta
  (calçada, lajota, tabuado) continua com degraus; a pincelada do canteiro
  refaz só os cantos vizinhos (de 63 ms para o que mudou). O cenário em 64
  voxels por tile (`?cenario=64`, sondagem 9) e a silhueta do relevo além da
  névoa (`?silhueta=sim`, sondagem 10), cada um com imagens antes e depois e
  testes. A seção *opções no endereço* do README junta as quatro propostas.
  O canteiro carrega no navegador com as três ligadas, sem erro. 1050 testes
  e 8 de 8.
- **01/10/2026** — Com o Opus 5.5, o plano do 256 e HD foi reordenado: primeiro
  o 256 no jogo e medido, depois otimizar o que pesar. O jogo passou a aceitar
  o corpo em qualquer densidade (as peças escritas em 117 levadas para a
  grade, a troca de corpo em pleno jogo, o reamostrar, duas cópias para
  longe em 256), e o ateliê exporta em 165 e 256. Sondagem 12: o guerreiro de
  256 na ilha, com oito guerreiros. O quadro depende da tela, não da
  densidade; o 256 custa no arquivo (20 MB), no forno (13 s por visual) e na
  memória (9,4 MB por visual); o 117 reamostrado do 256 fica tão bom quanto o
  do ateliê. 1084 testes e 8 de 8.
- **01/10/2026, à noite** — O Leandro decidiu o resto do 256 e HD: o
  guerreiro fica como corpo de teste (`?corpo=guerreiro`), o arquivo pode ir
  num formato menor desde que não perca detalhe, o HD vira padrão de fábrica,
  e o mundo tem que subir também.
  - **O formato:** PERSONAGEM 3, sem perder voxel; o guerreiro de 256 caiu de
    20 para 8 MB.
  - **A opção de densidade:** a tecla 9 no painel de ajuste.
  - **A otimização:** a ilha em 1280×720 passou de 48 para 60 quadros por
    segundo; a vila fica entre 55 e 58.
  - **O mundo em 128** (`?mundo=128`, sondagem 13): texturas com mip e
    cenário com cópias para longe, sem custo no quadro.
  - 1105 testes e 8 de 8.
- **01/10/2026, madrugada** — O Leandro aprovou o mundo em 128 e pediu um NPC
  com a skin do guerreiro andando pela cidade.
  - **O mundo em 128 virou o padrão.** O mip passou a ser escolhido pela média
    dos dois sentidos da tela. A calçada e a telha ganharam detalhe fino.
  - **O andarilho:** o guerreiro passeia na rua perto do Guarda Anselmo, assado
    no forno com o corpo dele (`comCorpo`), sem trocar o do jogador.
  - **Medido no navegador:** 59 quadros por segundo perto dele, em 1280×720.
  - 1111 testes e 8 de 8.
- **01/10/2026, de manhã** — O Leandro viu o andarilho deslizar sem mexer as
  pernas.
  - **O defeito:** o worker tomava o pedido do andarilho, que leva o nome do
    corpo, como se fosse o próprio corpo, e nunca assava. Só aparecia a pose
    parada que a página tinha assado.
  - **Corrigido:** o worker passou a separar o pedido do corpo, com um teste
    do worker de verdade.
  - **Página sem trancos:** ela não assa mais o corpo de 256 enquanto o forno
    sobe.
  - **Passo mais curto:** um ciclo a cada 0,8 tile; antes era a cada 2.
  - **Conferido no navegador:** as 7 poses chegam em uns 8 s.
  - 1112 testes e 8 de 8.
- **01/10/2026, de manhã (2)** — O Leandro viu o andarilho achatado olhando
  de cima.
  - **A correção:** o jogador e o andarilho ganharam os quadros de 35 e 70
    graus. O cartaz encara a câmera, inclinação inclusive (sondagem 14), e o
    de pé continua vindo primeiro.
  - **Conferido no navegador** com a câmera subindo.
  - 1114 testes e 8 de 8.
- **01/10/2026, de manhã (3)** — Pedido do Leandro: entrou a altura de 90
  graus (vista bem de cima), e o modo vitrine (V) passou a congelar o
  andarilho, até no meio do passo, para ele olhar em volta e tirar print.
  1115 testes e 8 de 8.
- **01/10/2026, à tarde** — O Leandro achou o guerreiro malfeito de perto
  (rosto estranho, cabelo na pele da capa) e desconfiou do leitor do `.wgvox`.
  - **Ele estava certo:** o índice da paleta estava deslocado em um, e cada
    voxel pegava a cor da entrada vizinha. Isso derruba a conclusão de 30/9
    de que a cor do Sorceress era ruim: lida certo, ela é limpa.
  - **Leitor consertado.** O humano foi refeito pela receita.
  - **O guerreiro** é agora o modelo do Sorceress, forma e cor, com o rig e o
    andar que o Leandro corrigiu (sondagem 15).
  - **A paleta do corpo** sai só da casca.
  - **A pintura com o desenho** melhorou (alinhamento por vista, cabeça pelo
    rosto, guia da cor) e ficou como opção.
  - **Falta:** o andar novo dele passa 2 ou 3 voxels da grade.
  - 1115 testes e 8 de 8.
- **01/10/2026, à tarde (2)** — O Leandro viu o guerreiro parado de pernas
  tortas.
  - **A causa:** o repouso do ateliê levava a perna ao REPOUSO do jogo
    (quadril a 37, joelho a 20). Com o rig novo dele, isso entortava o joelho.
  - **A correção:** o repouso agora deixa a perna como foi esculpida
    (`repousoDoRig`), e as poses escritas do guerreiro e do humano foram
    refeitas.
  - **O pulo:** recolhe a canela um pouco menos (-74 em vez de -80); com a
    perna reta, o pano atrás do joelho do humano se soltava.
  - 1115 testes e 8 de 8.
- **01/10/2026, fim da tarde** — Sondagem 16 começada (personagem 3D na placa,
  `?gpu=sim`).
  - **Feito:**
    - `atelie/gpu.js` e `cli.js gpu` exportam o corpo com peso de osso e as
      poses (`personagens/guerreiro.gpu`: 279 mil voxels em 256 e 38 mil em
      117, 2,5 MB);
    - `src/gpu.js`: WebGL2, o mundo sobe com a profundidade, o personagem é
      posado pelo quaternião dual na placa;
    - ligado ao andarilho e a `?andarilhos=N`; a bateria passa.
  - **Conferido:** o mundo sai pela placa no Chromium.
  - **Falta conferir:** o andarilho desenhado pela placa (a orientação, a luz
    e se aparece); a medição de quadros; o teste no notebook antigo.
- **03/10/2026** — Na nuvem, lendo o Drive. O Leandro viu o andarilho de
  perto virar um cartaz achatado e pediu um personagem 3D de verdade.
  - **A sondagem 16 conferida:** o andarilho pela placa aparece, virado para
    o lado certo, com luz, e anda misturando os quadros do passo.
  - **Virou o padrão:** com WebGL2 a página baixa só o modelo da placa
    (2,5 MB) em vez do corpo de 8 MB; `?gpu=nao` volta ao sprite.
  - **De perto:** furinhos na gola de pele fechados (corte das costas do
    voxel e quadradinho maior).
  - Testes que carregam o jogo iguais antes e depois: jogo 73, forno 10,
    jogadores 15. A bateria inteira não rodou aqui (a cópia de 26/9 do Drive
    não tem os outros testes atualizados).
  - **Também:** a fila da placa esvazia se o contexto do WebGL se perde (antes
    crescia a cada quadro), e o "Você" da conversa saiu do escape unicode
    para `String.fromCharCode(234)`, como o `MID` (o conector do Drive troca
    o escape pelo acento, e o fonte tem que ser ASCII).
  - **No Drive** foram trocados só `src/p1.html`, `p2.js`, `gpu.js` e `p5.js`
    (os antigos estão na lixeira). O `cripta-vhalgorn.html` sai do
    `node mundo-perigoso/build.js`.
  - **Segunda mudança, só no `src/gpu.js`:** o jeito de desenho, agora o
    padrão (pose em quadros, no ritmo do sprite; 16 rumos; contorno a 0,42).
    `?anim=suave` volta ao 3D liso, e `?rumos=N` muda os rumos. Também o
    recheio atrás da casca, que fecha os buracos do ombro. São três passadas
    por personagem (`GPU_CASCA`, `GPU_RECHEIO` e `GPU_CONTORNO`).
  - **Falta:** quadros numa placa de verdade e no notebook antigo; o jogador
    em terceira pessoa ainda é sprite.
- **03/10/2026, à noite** — No PC. O build não montava: o Drive tinha gravado
  `src/p1.html`, `p2.js`, `p5.js` e o `PLANEJAMENTO.md` como cópias "(1)", e
  os originais sumiram. O Leandro renomeou as cópias, e o build montou. A
  bateria inteira passou: 31 arquivos, 1152 verificações e 8 de 8.
  - **Os quadros, numa placa de verdade** (GTX 960 e FX-6300): perto do
    Anselmo, com o andarilho no jeito de desenho, uns 41 por segundo; com
    `?gpu=nao`, uns 37. O que pesa é o mundo no processador.
  - **O movimento "cartoon"** o Leandro achou bom.
  - **O buraco no ombro** continuava. O recheio não bastava, porque o oco
    era o miolo, que o modelo não levava. O `atelie/gpu.js` agora manda
    também o miolo perto da junta (3 voxels de outro osso), e o shader acende
    o voxel sem normal de frente para a câmera. O `guerreiro.gpu` foi gerado
    de novo: 347 mil voxels em 256, 46 mil em 117 e 2,8 MB. Fora do jogo, nos
    20 quadros e de 8 lados, nenhum buraco (antes, o leque do ombro em todo
    passo). No jogo, cinco andarilhos dão 832 mil voxels a uns 45 quadros por
    segundo. A bateria inteira continua passando.
  - **Falta:** o notebook antigo; o
    jogador em terceira pessoa (X) continua sprite, e o modelo da placa para
    o humano sairia do `atelie/cli.js gpu`.
- **04/10/2026** — No PC. Sondagem 17: o mundo na placa (`?mundo=placa`,
  `src/mundo-placa.js`). Ver *sondagens*.
  - **O que vai pela placa:** o céu e as faces dos pedaços.
  - **As mesmas contas do rasterizador:**
    - a textura de índice e a tabela de cor;
    - o nível de luz da `LIGHTLUT` e o brilho próprio;
    - o mip pela média geométrica dos dois sentidos da tela;
    - o texel com o truncamento do `|0`;
    - só a frente da face;
    - nada além do alcance.
  - **Como cabe:** as 49 texturas da ilha (128) e as 20 da cripta (64) numa
    textura em camadas; a de 64 entra um nível abaixo. Cada pedaço vira um
    buffer, refeito quando a lista de faces dele muda, e sai numa chamada.
  - **O que fica no software:** bichos, cenário e itens, numa imagem
    transparente que a placa põe por cima com a profundidade de cada pixel
    (o `gpu.js` já fazia isso com o mundo inteiro).
  - **Conferido no navegador** (GTX 960, 1280×720), lado a lado com o
    software: a mesma imagem na ilha, na vila, na ilha de 650 e na cripta.
    Ritmo real da tela: ilha de 45 para 60, ilha de 650 de 34 para 60,
    cripta de 34 para 60 (60 é o limite do monitor).
  - **Teste novo:** `mundo-placa.test.js` (sem WebGL2 volta o rasterizador,
    com o mesmo quadro). 32 baterias, 1156 verificações, 8 de 8.
  - **Por decidir:** se o motor por software continua a identidade.
  - **Falta:** o olho do Leandro; o notebook antigo; os sprites na placa; a
    silhueta; virar o padrão.
