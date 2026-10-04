# Sondagem 1 — 30 personagens diferentes numa praça

**Feita em 26/09/2026**, na nuvem, pelo Claude.

## A pergunta

Assar um visual por jogador cabe no quadro e na memória?

Hoje só o jogador tem fornada: 20 poses em 8 rumos, cada quadro com a cópia de
meia resolução para longe. Num MMO, cada jogador por perto com equipamento
diferente pede a fornada dele. Se isso não coubesse, o jeito de fazer
personagem (`.personagem`, `p3e.js`) teria de mudar antes de ter muito
conteúdo em cima.

## Resposta curta

**Cabe, com dois ajustes que não mexem no formato do personagem.**

1. **Havia um vazamento de memória na fornada**, e ele era quase todo o
   problema. Consertado aqui com cinco linhas (`remendo-fornada.diff`), e os
   testes continuam passando.
2. **Assar precisa sair do laço do jogo** antes do co-op. Desenhar 30 ou 60
   personagens é barato; assar 30 visuais novos no laço do jogo trava o
   quadro centenas de vezes. Um *worker* resolve, e — medido aqui — ele
   funciona com o jogo aberto direto do disco, sem arquivo à parte.

Nem o `.personagem` nem ler a `.pele` precisam mudar por causa disso.

## Como foi medido

`praca.html` roda o jogo montado (`cripta-vhalgorn.html`) sem o laço dele,
como a bancada do canteiro, no Chromium sem tela (141), em 640×360, na praça
de Pedra Alta da `ilha.mapa`. Trinta visuais sorteados entre as peças do
provador (elmo, capa, escudo, arma, enfeite e cores) sobre o corpo desenhado.
A máquina é a da nuvem, 4 núcleos: os números absolutos no seu PC vão ser
outros, mas as proporções valem.

## Os números

### Assar e memória, antes e depois do remendo

| | Antes | Depois |
|---|---|---|
| Heap do navegador por visual, fornada pronta | **56,7 MB** | **2,4 MB** |
| Pixels de um visual (160 quadros, com a cópia de longe) | 1,8 MB | 1,8 MB |
| Assar um visual inteiro (CPU) | 1.128 ms | 732 ms |
| Tarefa de grade (uma pose: voxels, pele, cópia de longe) | 19,8 ms, pior 339 | 13,8 ms, pior 25 |
| Tarefa de rumo (um rumo, perto e longe) | 4,6 ms, pior 565 | 2,9 ms, pior 21 |
| 30 visuais | 34 s de CPU, 1,7 GB | 22 s de CPU, 72 MB |

**O vazamento:** cada tarefa da fornada guarda a pele da pose dela (a lista
de voxels de superfície, uns 17 mil objetos por pose), e a fornada pronta
continua segurando as 180 tarefas. Vinte peles vivas por visual davam os 55
MB, e o coletor de lixo do navegador, correndo atrás de 1,7 GB, era o que
fazia os soluços de 300 a 500 ms. O remendo solta a pele depois do último
rumo de cada pose e solta cada tarefa depois de feita. O jogador de hoje já
pagava isso: uns 55 MB presos pela fornada dele enquanto ela existe.

### Onde vai o tempo de uma tarefa de grade

| Passo | Tempo |
|---|---|
| Montar a grade (corpo do quadro + peças) | 0,4 ms |
| Pele: superfície com normal e sombra (17,6 mil de 39 mil voxels) | 6,8 ms |
| Reduzir para longe | 3,2 ms |
| Pele da cópia de longe | 1,0 ms |

As tarefas de rumo somam três quartos do tempo de assar (8 por pose). Se um
dia for preciso ganhar velocidade, é no `assarRotacoes` que se mexe.

### Desenhar a praça

O quadro inteiro, 640×360, pose parada, oito rumos de câmera:

| Personagens na tela | Quadro | Só as entidades |
|---|---|---|
| 0 | 4,6 ms | 0,3 ms |
| 10, de 2 a 14 tiles | 6,1 ms | 0,8 ms |
| 30, de 2 a 14 tiles | 5,6 ms | 1,2 ms |
| 60, de 2 a 14 tiles | 6,4 ms | 2,0 ms |
| 30 colados, de 1,6 a 3,6 tiles | 8,4 ms | 3,8 ms |

Os números oscilam em torno de 1 ms de uma rodada para outra (daí 10 dar
mais que 30). **Desenhar não é problema.** Cada personagem custa uns 0,03 ms; colado na
câmera, uns 0,12 ms. O orçamento é 16,7 ms.

### Trinta visuais novos chegando juntos

Com o forno de hoje (até 3 ms por quadro, mas sempre pelo menos uma tarefa
inteira), depois do remendo:

- 5.400 tarefas, **uns 74 segundos** a 60 quadros por segundo até o último
  ficar pronto;
- **637 quadros** em que o forno sozinho passa de 8 ms — cada tarefa de
  grade é um soluço de 14 a 25 ms.

Assar só o que aparece — uma pose num rumo — custa uns 19 ms na primeira
vez que um visual surge. É um soluço por jogador novo, no limite do
aceitável.

### O worker

`worker-teste.html` confere que um worker feito de um *Blob*, com o código
que já está dentro da página, **roda aberto por `file://`** no Chromium. Ida
e volta com uma grade do tamanho da do personagem: 27 ms, contando a partida
do worker. O `DESIGN.md` diz "sem worker — separar um arquivo à parte para a
thread quebraria" o arquivo único; com Blob não há arquivo à parte.

## O que isso muda

| O quê | Quando | Tamanho |
|---|---|---|
| Aplicar o `remendo-fornada.diff` | já | cinco linhas, testes passando |
| Um teste que proteja a regra "a fornada pronta não segura a pele" | junto | pequeno |
| Assar num worker (ou dois ou três), com o laço do jogo só recebendo as imagens | antes do co-op | médio: o `assarRotacoes` usa um canvas só para o `createImageData`; no worker vira um objeto com `data` |
| Prioridade: o rumo e a pose visíveis primeiro, depois parada e andar, depois o resto | antes do co-op | pequeno |
| Visuais iguais dividem as imagens (a chave é a escolha do personagem) | antes do co-op | pequeno |
| Limite de memória, soltando o visual que ninguém vê há tempo | quando passar de uns 100 visuais (2,4 MB cada) | pequeno |

**O que não precisa mudar:** o formato `.personagem`, as vinte poses, a
grade de 80×56×117, a `.pele`. O jogo ler a `.pele` continua sendo bom para
o tamanho do arquivo (180 KB contra 1,5 MB), mas não por memória nem por
quadro.

## Os arquivos

| Arquivo | O que é |
|---|---|
| `praca.html`, `praca.js` | A bancada: roda o jogo montado e mede |
| `rodar.js` | Roda a bancada no Chromium sem tela e grava o resultado e as fotos |
| `resultado.json` | Os números da última rodada (já com o remendo) |
| `praca-perto.png`, `praca-30.png` | Doze personagens colados na câmera, e trinta pela praça |
| `worker-teste.html` | O worker de Blob aberto por `file://` |
| `remendo-fornada.diff` | O conserto do vazamento, em `src/p3e.js` |

Para rodar de novo: `node mundo-perigoso/build.js` e depois
`node mundo-perigoso/sondagens/1-personagens/rodar.js` (precisa do
`playwright`: `npm i -g playwright`). Ou sirva a raiz e abra `praca.html`.
