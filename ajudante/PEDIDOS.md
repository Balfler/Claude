# Pedidos para o ajudante

Escritos pelo Claude, que é o único que edita este arquivo. O ajudante pega o
primeiro "aberto" sem pasta em `entregas/`. Como trabalhar: `LEIA-ME.md`.

---

## 001 — Conferir as quatro propostas                    [aceito]

**Pra quê:** saber se estão prontas para entrar no projeto, sem gastar o
Claude.
**Leia:** `mundo-perigoso/propostas/README.md`.
**Faça:** copie a pasta `Claude` para fora do Drive. Na cópia, aplique as
quatro com `git apply` (ou `patch -p1 <`), na ordem 1, 2, 3, 4. Rode
`node mundo-perigoso/build.js` e depois cada `node mundo-perigoso/teste/...`
listado no `mundo-perigoso/README.md`.
**Entregue:** `RELATORIO.md` com o total de testes que passaram e falharam em
cada arquivo, e a saída inteira de qualquer falha.
**Pronto quando:** a conta bater (o esperado são 997 passando e nenhuma
falha) ou as falhas estiverem copiadas no relatório.
**Não faça:** não aplique no projeto do Drive, não conserte nada.

**Veredito (27/9): aceito.** A 4 não aplicou por culpa do upload (o `ê`
virou `ê` no `.diff`), não do ajudante. Obs.: a tabela somava 993 (com as 8
do `verifica.js`) e o texto dizia 988 — conferir a soma antes de escrever o
total. Pedida a reconferência, 001b.

---

## 001b — Reconferir as quatro propostas                 [aceito]

**Pra quê:** a 001 de novo, com a proposta 4 consertada.
**Faça, Entregue, Pronto quando:** os da 001. O esperado: 997 testes, mais
as 8 conferências do `verifica.js`, 0 falhas.

**Veredito (27/9): aceito.** 997 + 8, 0 falhas, e a soma por arquivo bate.
O ajudante trocou o `ê` por `ê` no `.diff` do Drive, com o OK do
Leandro.

---

## 002 — A faxina do DESIGN.md                            [aceito em parte]

**Pra quê:** o item *Higiene* do `PLANEJAMENTO.md`. O `DESIGN.md` ainda tem a
*lista de tarefas* e o *em aberto*, que agora moram no `PLANEJAMENTO.md`.
**Leia:** o `DESIGN.md` e o `PLANEJAMENTO.md`, inteiros.
**Faça:** numa cópia, tire do `DESIGN.md` as seções da lista de tarefas e do
em aberto, e ponha no lugar uma linha: "O andamento, o que falta fazer e o
que falta decidir estão no `PLANEJAMENTO.md`." Antes de tirar, confira item
por item se cada coisa já está no `PLANEJAMENTO.md`.
**Entregue:** `DESIGN.diff`; e `FALTANDO.md`, com o que estava nessas seções
e não está no `PLANEJAMENTO.md` — um item por linha, com a seção de onde
veio. Não ponha nada no `PLANEJAMENTO.md` você mesmo.
**Pronto quando:** o diff só tira essas seções e põe a linha; o resto do
`DESIGN.md` fica igual.
**Não faça:** reescrever, resumir ou reordenar outras partes do `DESIGN.md`.

**Veredito (27/9): aceito em parte.** As duas seções saíram certas, e os 2
itens do `FALTANDO.md` conferem. Recusado o primeiro trecho do diff: punha um
BOM (caractere invisível) no começo do `DESIGN.md`. O Claude aplicou o resto.
Da próxima vez, gerar o diff sem BOM e conferir que só as linhas pedidas
mudam.

---

## 003 — O humano em três vistas, para o personagem do desenho   [aceito]

**Pra quê:** as imagens de entrada do caminho "imagem 2D → corpo em voxel" e
do conversor de três vistas. Gerar imagem é o que o ajudante tem e o Claude
não.
**Leia:** `mundo-perigoso/prompts/personagem-do-desenho.md` (o que a imagem de
entrada precisa ter); olhe `mundo-perigoso/Arte/molde-humano.png` e o que há
em `mundo-perigoso/Arte/personagens/`.
**Faça:** gere o humano base em três vistas — frente, lado e costas —, com as
proporções do molde, a pose que o prompt pede (na falta, braços um pouco
abertos), fundo liso de uma cor só, sem sombra no chão, no estilo de pixel
art de 1993 com paleta curta. No máximo duas variações de estilo.
**Entregue:** por variação, `frente.png`, `lado.png` e `costas.png`, cada um
com o `.txt` do prompt; e no relatório, o que no prompt de entrada você não
conseguiu seguir.
**Pronto quando:** as três vistas de cada variação são o mesmo personagem:
mesma altura, mesmos ombros, mesma roupa.
**Não faça:** não rode o conversor, não mexa em `Arte/`.

**Veredito (27/9): aceito.** O Leandro aprovou as vistas. Falta ele dizer
onde guardar as imagens.

---

## 004 — Jogar e anotar                                   [aceito]

**Pra quê:** achar o que está quebrado ou estranho, sem gastar o Claude.
**Faça:** abra `cripta-vhalgorn.html` no navegador do Antigravity, Enter, e
jogue uns 10 minutos: andar, pular, dash, as três armas, portas, o X
(terceira pessoa), o P (painel). Depois o co-op: rode
`node mundo-perigoso/sondagens/5-coop/servidor.js` e abra duas abas,
`http://localhost:8124/?nome=A` e `http://localhost:8124/?nome=B&atraso=120`;
andem juntos, briguem com um bicho, usem a fala (Enter).
**Entregue:** `RELATORIO.md` com cada coisa estranha: o que fez, o que
esperava, o que aconteceu, e um print.
**Pronto quando:** as duas partes foram jogadas, mesmo que não se ache nada.
**Não faça:** não conserte nada; só anote.

**Veredito (27/9): aceito.** Os achados que valem foram para o
`PLANEJAMENTO.md`: os arquivos do co-op com " (1)" no nome, e o jogador que
morre antes de apertar Enter. Faltou um: os prints 22 e 23 mostram "VOCE
MORREU" nas duas abas, e o relatório não fala disso — anotar tudo o que
aparece na tela, mesmo o que parecer normal.

---

## 005 — Conferir o src/ com as quatro propostas aplicadas   [aceito]

**Pra quê:** o Claude aplicou as quatro propostas no `src/` do Drive em 27/9.
Falta rodar tudo em cima, sem gastar o Claude.
**Leia:** `mundo-perigoso/README.md` (a bateria), `sondagens/5-coop/RELATORIO.md`
e `sondagens/2-rede/RELATORIO.md` (como rodar).
**Faça:** copie a pasta `Claude` de agora para fora do Drive (uma cópia nova,
não reaproveite a da 001b). Na cópia, **sem aplicar nada** (já está aplicado):
1. `node mundo-perigoso/build.js`, todos os `teste/*.test.js` do README e o
   `teste/verifica.js`;
2. `node mundo-perigoso/sondagens/5-coop/testar.js`;
3. `node mundo-perigoso/sondagens/2-rede/montar-atraso.js` e depois
   `node mundo-perigoso/sondagens/2-rede/medir-esquiva.js`; compare com o
   `esquiva.json` do Drive.
Se a costura do co-op falhar com "nao achei", rode de novo com o HTML montado
convertido para LF e diga no relatório que precisou.
**Entregue:** `RELATORIO.md` **curto**. No topo, só isto, em cinco linhas:
- bateria: N testes, N falhas (a soma da tabela tem que dar o total);
- verifica: N de 8;
- co-op: N de 21;
- esquiva: os números de agora ao lado dos do `esquiva.json`;
- desvios: o que saiu diferente do esperado, ou "nenhum".
Embaixo, a tabela por arquivo e a saída inteira só do que falhou.
**Pronto quando:** 997 testes e 0 falhas; 8 de 8; 21 de 21; esquiva igual à
do `esquiva.json` (29/30%, 14%, 10%) ou perto.
**Não faça:** não conserte nada, não escreva no Drive fora desta pasta de
entrega. Antes de entregar, confira você mesmo a soma e as cinco linhas.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/005-*/`.

**Veredito (27/9): aceito.** 997 e 0 falhas, a soma bate; 8 de 8; 21 de 21;
a esquiva dentro do ruído do robô. O relatório curto, com as cinco linhas no
topo, é o formato daqui em diante.

---

# O listão de 27/9 — em fila, na ordem

Todos: trabalhe numa cópia da pasta `Claude` fora do Drive (uma cópia nova
por pedido que mexe em código), e no Drive escreva só na pasta de entrega.
Relatório curto, como manda o `LEIA-ME.md`. Nenhum pedido daqui decide regra
de jogo: onde houver escolha, ofereça opções marcadas **RASCUNHO**.

---

## 006 — Um comando que roda a bateria inteira                [aceito]

**Pra quê:** hoje são 26 comandos à mão, e o README tem contagens erradas
(diz 28 no conversor, 49 no estilos, 21 no modelo; a 001b contou 25, 50, 27).
**Leia:** `mundo-perigoso/README.md`, as linhas `node mundo-perigoso/...`;
dois ou três `teste/*.test.js`, para ver como cada um imprime o resultado.
**Faça:** na cópia, um arquivo novo `mundo-perigoso/teste/tudo.js`, em node
sem dependência, ASCII, comentários em português sem acento: roda o
`build.js`, cada `teste/*.test.js` na ordem do README e o `verifica.js`;
imprime uma linha por arquivo (nome, passaram, falharam) e no fim o total;
sai com código 1 se algo falhar. E acerte no README as contagens `(N testes)`
que estiverem erradas, e ponha a linha do `tudo.js` no começo da lista.
**Entregue:** `tudo.js`, `README.diff` e a saída do `tudo.js` na cópia.
**Pronto quando:** o `tudo.js` imprime 24 arquivos, 997 e 0, e 8 de 8 no
verifica; sai com 0; e, com um teste quebrado de propósito na cópia (desfeito
depois), sai com 1 — cole essa saída também. O `README.diff` só troca números
e põe a linha nova.
**Não faça:** não mexa em teste nenhum, nem no `src/`.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/006-*/`.

---

## 007 — A costura do co-op aceitar CRLF                        [refazer]

**Pra quê:** o achado da 004: a costura procura `\n` e falha ("nao achei")
com o HTML montado em CRLF.
**Leia:** `mundo-perigoso/sondagens/5-coop/costura-coop.js` e
`mundo-perigoso/sondagens/2-rede/costura.js`.
**Faça:** na cópia, troque nas expressões de busca das duas costuras o `\n`
literal por `\r?\n`, e só isso. Se alguma troca não for possível sem mudar a
lógica, não faça e explique no relatório.
**Entregue:** `costura.diff`.
**Pronto quando:** `node mundo-perigoso/sondagens/5-coop/testar.js` dá 21 de
21 duas vezes: com o `cripta-vhalgorn.html` montado em LF e convertido para
CRLF. E o `montar-atraso.js` roda sem erro nos dois. O diff só mexe nas duas
costuras.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/007-*/`.

---

## 008 — Reproduzir o jogador que morre antes do Enter         [aceito]

**Pra quê:** confirmar o bug de *a fazer › consertos*, no `PLANEJAMENTO.md`.
**Faça:** suba `node mundo-perigoso/sondagens/5-coop/servidor.js`. Aba A:
entra (Enter) e vai acordar bichos, trazendo-os para a entrada. Aba B: abre
a página e **não** aperta Enter por 60 s. Olhe a vida de B (no HUD de B
depois do Enter, ou no que o servidor manda). Repita com B apertando Enter
logo e ficando parado, para comparar. Depois, quatro abas juntas (A, B, C, D),
andando e brigando uns 5 minutos; anote o que estranhar.
**Entregue:** relatório com os passos exatos, o que aconteceu em cada caso, e
prints só do que for estranho.
**Pronto quando:** as duas situações de B foram feitas, e as quatro abas
jogaram.
**Não faça:** não conserte.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/008-*/`.

---

## 009 — Jogar a cripta até o fim, e a ilha                    [aceito]

**Pra quê:** a 004 jogou 10 minutos. Falta saber se tudo se completa.
**Faça:** abra `cripta-vhalgorn.html`. Na ilha: ande do píer ao portão de
Pedra Alta, fale com cada morador que achar (as palavras-chave), use a bolsa.
Na cripta: jogue até o fim — chave rúnica, selo, o que dorme lá dentro, a
saída. Se morrer, continue.
**Entregue:** no topo: chegou ao fim? tempo, mortes, quantas coisas
estranhas. Embaixo, cada coisa estranha (o que fez, o que esperava, o que
aconteceu, print), e cada palavra-chave que funcionou e que não.
**Pronto quando:** a cripta foi até o fim, ou o relatório diz onde travou e
por quê.
**Não faça:** não conserte; não use o painel P para trapacear, a não ser que
trave (e diga).
**Autorizado a escrever em:** nada fora de `ajudante/entregas/009-*/`.

---

## 010 — Os bichos como estão no código                         [aceito]

**Pra quê:** a base do bestiário e da decisão do preparo dos golpes. Só tirar
do código, sem inventar.
**Leia:** o `EDEF` em `mundo-perigoso/src/p4.js` (perto da linha 128) e onde
ele é usado.
**Faça:** `BICHOS.md`: uma linha por bicho do `EDEF`, uma coluna por campo,
com o valor de hoje e a unidade quando der para saber (s, tiles, pontos). Em
seguida, quantos de cada há na cripta. Por último, a lista dos bichos que o
`DESIGN.md` promete e ainda não existem (rato, lobo, cobra, caranguejo,
galinha, cachorro, gado, pássaro, cervo...), com a linha do `DESIGN.md` de
onde saiu cada um, e as colunas em branco.
**Pronto quando:** todo bicho e todo campo do `EDEF` estão na tabela; cada
bicho prometido tem a linha de onde veio.
**Não faça:** não preencha número que não está no código.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/010-*/`.

---

## 011 — Os textos do jogo numa tabela                          [aceito]

**Pra quê:** tirar os textos do código um dia (tradução, editor de roteiro).
Hoje é só saber quantos são e onde estão.
**Faça:** `TEXTOS.md`: todo texto que o jogador vê, em `mundo-perigoso/src/`
(o `say(...)`, as falas e palavras-chave dos moradores, placas, HUD, títulos,
menus), numa tabela: arquivo:linha, o texto com os `\uXXXX` já convertidos
em acento, e onde aparece. No topo, quantos são por arquivo.
**Pronto quando:** o número de `say(` no relatório bate com o de um `grep`
(cole o comando), e as conversas dos moradores estão todas.
**Não faça:** não corrija nem reescreva texto nenhum.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/011-*/`.

---

## 012 — Referências quebradas nos documentos                   [aceito]

**Pra quê:** a *lista de tarefas* e o *em aberto* saíram do `DESIGN.md` em
27/9; pode ter sobrado quem aponte para eles.
**Faça:** no `DESIGN.md`, no `PLANEJAMENTO.md`, no `mundo-perigoso/README.md`
e nos `RELATORIO.md` das sondagens, liste toda menção a seção, item ou
arquivo que não existe mais (ex.: "item 16", "em aberto", "lista de
tarefas", um arquivo que não está na pasta). Os nomes de seção em itálico
(*assim*) são a pista: confira cada um contra os títulos `#` do `DESIGN.md`.
**Entregue:** `QUEBRADAS.md`: arquivo:linha, o trecho, o que falta, e para
onde provavelmente devia apontar.
**Não faça:** não edite os documentos.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/012-*/`.

---

## 013 — Pesquisa: de imagem para 3D, no Nitro V                 [aceito]

**Pra quê:** o primeiro passo do *personagem do desenho*: saber que modelos
de IA de imagem para 3D cabem no PC.
**Leia:** `mundo-perigoso/prompts/personagem-do-desenho.md`.
**Faça:** descubra a placa de vídeo e a memória do PC (`nvidia-smi`,
`dxdiag`). Pesquise na web os modelos abertos de imagem (uma ou várias
vistas) para malha 3D: TripoSR, Stable Fast 3D, InstantMesh, Hunyuan3D,
TRELLIS e o que mais achar. Olhe também se há instalador no Pinokio.
**Entregue:** `MODELOS.md`: a máquina no topo; uma linha por modelo com
memória de vídeo pedida, entrada (1 imagem ou várias vistas), saída, tempo
por peça se alguém mediu, licença (pode uso comercial?), link da fonte de
cada número, e se cabe no PC.
**Pronto quando:** pelo menos seis modelos, cada número com link.
**Não faça:** não instale nem baixe nada.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/013-*/`.

---

## 014 — Os bichos da ilha em três vistas                        [aceito]

**Pra quê:** referência para o ateliê fazer criatura (a sondagem 4: o lobo é
o primeiro).
**Leia:** `mundo-perigoso/Arte/personagens/Referência/humano-3-vistas-1/`, com
os `.txt` dos prompts.
**Faça:** no mesmo estilo da variação 1 da 003 (contorno, paleta curta, 1993,
fundo liso de uma cor só, sem sombra), o lobo, o rato, a cobra e o
caranguejo, cada um em frente, lado (virado para a esquerda) e costas. E uma
folha por bicho com o humano base ao lado, para a escala.
**Entregue:** uma pasta por bicho: `frente.png`, `lado.png`, `costas.png`,
`escala.png`, cada um com o `.txt` do prompt.
**Pronto quando:** as três vistas de cada bicho são o mesmo bicho (mesmo
tamanho, mesmas cores, mesmas marcas).
**Autorizado a escrever em:** nada fora de `ajudante/entregas/014-*/`.

---

## 015 — Três armaduras sobre o humano base                     [aceito]

**Pra quê:** a sondagem 7, *uma armadura de verdade*, que pede o olho do
Leandro. Cosmético é o produto.
**Faça:** sobre o humano da variação 1 da 003, com o mesmo corpo e a mesma
pose, três armaduras — couro, cota de malha, placas —, cada uma em frente,
lado e costas, no mesmo estilo. O corpo não pode mudar: só o que se veste.
**Entregue:** uma pasta por armadura, com os PNG e os `.txt`, e uma folha com
as três lado a lado, de frente.
**Pronto quando:** sobrepondo a frente de cada armadura ao humano base, a
cabeça, os pés e as mãos ficam no mesmo lugar.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/015-*/`.

---

## 016 — Rascunho de nomes para a ilha                           [aceito]

**Pra quê:** *os nomes das regiões e das placas*, em *por decidir*. O
Leandro escolhe; você só dá opções.
**Leia:** no `DESIGN.md`, o que fala da ilha, de Pedra Alta, do porto, da
fortaleza e da gruta; os nomes que já existem no jogo.
**Faça:** `NOMES.md`, marcado **RASCUNHO** no topo: primeiro, os nomes que já
existem (e onde); depois, para cada lugar sem nome, três opções no mesmo tom
dos que já existem, cada uma com meia linha do porquê.
**Não faça:** não mude nada no jogo nem nos mapas.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/016-*/`.

---

# Conceitos de arte — 017 a 022

**Para todos os de imagem (014 e 015 também):**
- O estilo é o da variação 1 da 003 (`mundo-perigoso/Arte/personagens/Referência/humano-3-vistas-1/`):
  pixel art de 1993, contorno escuro, paleta curta, fundo liso de uma cor só,
  sem sombra no chão. Gente usa o corpo e as proporções do humano base.
- Tudo é **conceito para o Leandro escolher**, não arte final: no máximo duas
  variações por coisa.
- **Não invente o mundo:** o que desenhar sai do `DESIGN.md` e do código. Cada
  coisa desenhada tem, no `.txt`, a linha do `DESIGN.md` (ou arquivo:linha do
  código) de onde saiu. Se o `DESIGN.md` não descreve a aparência, desenhe o
  mais simples e diga no relatório.
- Cada PNG com o `.txt` do prompt. E, por pedido, uma `folha-geral.png` com
  tudo lado a lado, pequeno, para o Leandro olhar no celular de uma vez.
- Nada vai para `Arte/`; tudo fica na pasta de entrega.

---

## 017 — Os moradores                                          [refazer]

**Pra quê:** os NPCs do jogo têm "aparência fraca" (o `DESIGN.md` diz). Base
para refazer no ateliê.
**Faça:** primeiro liste os moradores que existem no jogo (no `src/` e nos
mapas: o barqueiro, os de Pedra Alta...) e os que o `DESIGN.md` promete
(ferreiro, taverneiro, sacerdote, guarda, o que houver). Depois desenhe cada
um em frente, lado e costas. Se o `DESIGN.md` fala de classes sociais, faça
também o mesmo morador comum em cada classe, para ver a diferença.
**Entregue:** `LISTA.md` (quem, de onde saiu), uma pasta por morador, e a
`folha-geral.png`.
**Pronto quando:** todo morador da lista tem as três vistas, e as três são a
mesma pessoa.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/017-*/`.

---

## 018 — Os bichos da cripta, como são hoje                      [refazer]

**Pra quê:** as seis criaturas da cripta existem em voxel; um desenho fiel
de cada uma é a referência para refazê-las no ateliê.
**Leia:** o `EDEF` em `src/p4.js`; olhe `Arte/diabrete-morto*.jpeg` e tire
prints de cada bicho no jogo (o `cripta-vhalgorn.html`).
**Faça:** cada uma das seis em frente, lado e costas, **fiel ao que está no
jogo** (cores, forma, chifres, número de patas), só que desenhada no estilo.
**Entregue:** uma pasta por bicho, com o print do jogo ao lado
(`jogo.png`), e a `folha-geral.png`.
**Pronto quando:** pondo o desenho ao lado do print, dá para reconhecer o
bicho; e as três vistas são o mesmo bicho.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/018-*/`.

---

## 019 — Os inimigos que o DESIGN promete                        [refazer]

**Pra quê:** ver a cara do que ainda não existe.
**Faça:** liste do `DESIGN.md` todo inimigo citado que ainda não está no
jogo (o rei demônio, as hordas, os caídos, o necromante, os bichos da ilha
que atacam, e o que mais houver), com a linha de onde saiu. Os bichos da
ilha já estão na 014: aqui, não repita. Para cada um, duas variações de
conceito, de frente, e da escolhida por você, lado e costas.
**Entregue:** `LISTA.md`, uma pasta por inimigo e a `folha-geral.png`.
**Pronto quando:** todo inimigo da lista tem as duas variações de frente e a
linha do `DESIGN.md`.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/019-*/`.

---

## 020 — As armas                                                 [aceito]

**Pra quê:** as três armas de hoje e as que vêm (a espada e o arco, ao
menos), para o jogo e para o ateliê.
**Faça:** liste as armas do jogo (no `src/`: adaga, cajado, grimório...) e
as que o `DESIGN.md` promete, com a linha de onde saiu cada uma. Para cada
arma: de lado, sozinha, grande e centrada (vai virar ícone e peça); e na mão
do humano base, de frente e de lado. Para as que já existem, fiel ao que está
no jogo (tire print).
**Entregue:** `LISTA.md`, uma pasta por arma e a `folha-geral.png`.
**Pronto quando:** toda arma da lista tem as três imagens, e na mão do humano
o tamanho da arma bate com a mão.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/020-*/`.

---

## 021 — Peças de roupa e armadura, soltas                        [recusado]

**Pra quê:** no jogo, o cosmético é peça, não desenho inteiro. Depois das
três armaduras inteiras da 015, as peças separadas.
**Faça:** sobre o humano base, peças que se trocam uma a uma: elmo ou chapéu,
capa, ombreiras, luvas, botas, cinto — duas ou três versões de cada (pano,
couro, metal). Cada versão em frente, lado e costas, vestida no humano, e a
mesma peça sozinha, de frente. Se o `DESIGN.md` fala de roupa por classe de
personagem (guerreiro, mago, clérigo, druida...), faça também um conjunto por
classe, de frente.
**Entregue:** uma pasta por peça e a `folha-geral.png`.
**Pronto quando:** cada peça vestida fica no mesmo lugar do corpo nas três
vistas, e o corpo não muda.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/021-*/`.

---

## 022 — Os lugares                                               [aceito]

**Pra quê:** o clima de cada lugar antes de construir no canteiro.
**Faça:** uma pintura de cada lugar que o `DESIGN.md` descreve (o píer e a
praia, Pedra Alta com a praça e o templo no pico, a taverna por dentro, a
cripta, a fortaleza, a gruta, a montanha oca, a cidade steampunk, o que mais
houver), vista de dentro do jogo, na altura do olho, em 640×360, no estilo
de 1993. Use o que o `DESIGN.md` diz de cada um (cite a linha no `.txt`), e
os prints do jogo onde o lugar já existe.
**Entregue:** uma imagem por lugar, com o `.txt`, e a `folha-geral.png`.
**Pronto quando:** todo lugar descrito no `DESIGN.md` tem a sua imagem com a
linha citada.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/022-*/`.

---

## 023 — O book do jogo pronto                                    [refazer]

**Pra quê:** uma proposta visual de como o jogo vai ser quando estiver
pronto, para guiar o desenvolvimento. É o último da fila de propósito: use
os seus conceitos da 014 à 022 como base, para tudo ficar coerente.
**Leia:** o `DESIGN.md` inteiro (as classes e o disco de habilidades, o
PvP, os caídos, a guerra de fim de semana, a lua vermelha, as cidades); o
`PLANEJAMENTO.md`, *por decidir*; e prints do jogo de hoje, para o HUD e o
enquadramento.
**Faça:** as cenas abaixo, em 640×360, no estilo das outras. Primeira pessoa
com o HUD do jogo de hoje (vida, mana, escudo, armas) como base; terceira
pessoa com a câmera do X.
1. A cidade cheia de jogadores, cada classe com o equipamento dela.
2. Uma por classe, lado a lado, de frente: a tela de escolher personagem.
3. Primeira pessoa, uma por classe, usando uma habilidade dela: a bola de
   fogo do mago, o guerreiro bloqueando com o escudo, o arco mirando, o
   clérigo curando, o druida transformado — as classes e habilidades que o
   `DESIGN.md` tiver.
4. As mesmas em terceira pessoa.
5. PvP: um duelo entre jogadores; e caídos contra jogadores.
6. Um grupo de quatro contra um chefe grande (o "MVP"): o que dorme na
   cripta, ou o rei demônio.
7. A guerra de fim de semana: a tomada da fortaleza, as hordas, a lua
   vermelha.
8. A interface: inventário, equipamento, o disco de habilidades, o chat, a
   loja, a criação de personagem — telas de mentira, no estilo do HUD de
   hoje.
9. O mundo: a ilha de noite, a cidade steampunk, o navio, a montanha oca.
**Entregue:**
- `book.html`, que abre do disco: uma página por cena, com a imagem e a
  legenda. A legenda diz o que a cena mostra; o que é **decidido** (com a
  linha do `DESIGN.md`); e o que é **PROPOSTA**, porque ainda está em *por
  decidir* (o PvP, o bloqueio, o arco, o loot, a interface...).
- O mesmo book em `book.pdf`, para ler no celular.
- As imagens soltas, cada uma com o `.txt` do prompt.
**Pronto quando:** as nove cenas existem, e toda legenda separa o decidido
da proposta.
**Não faça:** não escreva regra nova como se fosse decidida; o que não está
no `DESIGN.md` é PROPOSTA na legenda.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/023-*/`.

---

# Veredictos do listão (29/9)

- **006 — aceito.** O `tudo.js` e o `README.diff` foram aplicados no projeto.
- **007 — refazer**, no pedido 024.
- **008 — aceito.** O bug está confirmado e os passos estão bem descritos.
- **009 — aceito, com ressalva.** Os dois achados foram conferidos pelo
  Claude e **não eram bug**: o morador só não ouve quem está em outro nível
  (abaixo do penhasco, por exemplo), e o portal não conclui para quem já
  morreu. Antes de chamar de estranho, veja se não é a regra. Mas 37 s na cripta não é jogar: se usou atalho ou
  teleporte, o relatório tem que dizer.
- **010, 011, 012, 013 e 016 — aceitos.** O Claude confere a fundo quando for
  usar cada um.
- **014, 015 e 020 — aceitos.** A 020 são prints do provador, e não conceito;
  servem assim mesmo.
- **017, 018 e 019 — refazer as imagens**, no pedido 024. A cota acabou, e os
  relatórios disseram isso direito.
- **021 — recusado.** 78 dos 79 PNG estão vazios (2 KB, só o fundo) e a folha
  geral está em branco, mas o relatório dizia "sim" e "desvios: nenhum". Isso
  é o pior que pode acontecer numa entrega: ver a regra nova no `LEIA-ME.md`.
- **022 — aceito.** As pinturas existem, mas a folha geral saiu com os quadros
  vazios: refazer só a folha, no 024.
- **023 — refazer as cenas 5 a 9**, no 024. As cenas 1 a 4 estão boas. As de 5
  a 9 são desenho de script, quase vazias. A 9 inventa uma "cidade dos
  anões", que não está no `DESIGN.md`.

---

## 024 — Refazer o que faltou no listão                    [aberto]

**Pra quê:** fechar o 006–023. Agora a cota de imagem voltou.
**Leia:** os veredictos logo acima; e o `DESIGN.md`, *classes por quest*
(mudou em 27/9: o visual é da classe, e o cosmético é só de cabeça).
**Faça, em ordem, cada um na pasta de entrega dele com o sufixo `b`**
(`017b-...`, `018b-...`):
1. **017b:** os moradores que faltaram.
2. **018b:** as três vistas dos seis bichos da cripta.
3. **019b:** as imagens dos inimigos da `LISTA.md` da 019.
4. **021b:** em vez das peças soltas, que saíram do jogo em 27/9, **só os
   cosméticos de cabeça**: 8 a 10 chapéus, elmos e enfeites sobre o humano
   base, de frente e de lado.
5. **022b:** só a `folha-geral.png`, com as pinturas que já existem.
6. **023b:** as cenas 5 a 9, geradas como as de 1 a 4, e o `book.html` e o
   `book.pdf` de novo. Na legenda, as classes são as de *classes por quest*.
7. ~~**007b:**~~ **Cancelado: feito pelo Claude em 29/9.** A costura aceitar CRLF sem mexer nas buscas uma por uma. Ao ler
   o HTML (nas costuras, no `servidor.js` e no `montar-atraso.js`), troque
   `\r\n` por `\n` antes de tudo. Pronto quando: `testar.js` dá 21 de 21 em LF
   e em CRLF, e o `montar-atraso.js` roda nos dois.
**Pronto quando:** cada item acima tem a sua pasta com `PRONTO`, e **toda
imagem entregue foi aberta e vista por você**. Se a cota acabar de novo,
escreva "não" e pare as imagens; não entregue imagem feita por script no
lugar.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/0NNb-*/`.

---

## 025 — As folhas de classe em T-pose                        [aberto]

**Pra quê:** o personagem do desenho só entra no ateliê com folha em T-pose
(o rig pede os braços esticados). As folhas de 27/9 do clérigo e do necromante
estão em pose A e não servem. O modelo é a folha do guerreiro em T-pose:
`mundo-perigoso/Arte/personagens/Referência/Gemini_Generated_Image_9jp9w9jp9w9jp9w9.jpeg`
(frente, perfil olhando para a direita e costas, lado a lado, fundo cinza liso).
**Leia:** o `DESIGN.md`, *classes por quest*; e olhe a folha do guerreiro e as
duas em pose A (`Referência/Gemini_Generated_Image_b7rr...` e `..._uf9y...`).
**Faça:** uma folha por classe, **igual à do guerreiro em tudo menos na roupa
e no equipamento**: mesma pose (T-pose, braços esticados na altura dos ombros,
palmas para baixo), mesmo corpo, mesmo enquadramento (as três vistas na
mesma altura), mesmo fundo cinza liso, sem legenda em cima. As classes:
aprendiz (o humano base, o de camisa verde), arqueiro, ladino, bárbaro, mago,
clérigo e druida — com o equipamento que o `DESIGN.md` e a `LISTA.md` da 017
sugerirem para cada uma, sem arma na mão (a arma é peça à parte). O clérigo e
o necromante: refazer as duas de 27/9 em T-pose, com o mesmo desenho de roupa.
**Entregue:** uma pasta por classe com `folha.png` (as três vistas numa
imagem só, 2752×1536 se der) e `folha.txt` (o prompt). No topo do relatório,
por classe: as três vistas são a mesma pessoa? os braços estão esticados? o
perfil olha para a direita? sim ou não, **depois de abrir cada imagem**.
**Pronto quando:** as oito folhas existem e cada uma passa nas três
perguntas; se alguma não passar, escreva "não" e diga qual.
**Não faça:** não invente classe nem roupa que o `DESIGN.md` não diga; não use
script no lugar da geração; não mexa em `Arte/`.
**Autorizado a escrever em:** nada fora de `ajudante/entregas/025-*/`.
