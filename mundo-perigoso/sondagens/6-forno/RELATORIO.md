# Sondagem 6 — o forno do personagem num worker

**Feita em 27/09/2026**, na nuvem, pelo Claude. Continuação da sondagem 1.

## A pergunta

O personagem (o boneco do provador) é assado aos poucos na linha principal:
20 poses × 8 rumos, mais a cópia para longe, com um orçamento de 3 ms por
quadro (`FORNO_MS`). Isso acontece no jogo de hoje (terceira pessoa, troca de
arma) e acontece muito mais no co-op e no MMO: cada jogador de fora, com cada
arma, é uma fornada. A sondagem 1 perguntou se dava para assar num *Worker*
(outra linha de execução, que não trava a tela) mesmo abrindo o jogo direto
do disco, e viu que um worker feito de Blob funciona em `file://`. Esta
sondagem assou de verdade.

## Como foi feito

Sem mudar nada no `src/`. O worker nasce de um Blob com **o próprio código
do jogo** (o texto do `<script>` da página) e uma casca de mentira no lugar
do documento e do canvas — o mesmo truque do harness dos testes. Ele carrega
o jogo inteiro, sem tela, e fica esperando pedidos: recebe uma escolha do
provador, roda a mesma `novaFornada` e devolve pose por pose, transferindo
os buffers (sem copiar). Na página, `__FORNO.fornada(escolha)` devolve um
objeto com a mesma cara do de `novaFornada` (`quadros`, `pronta`,
`trabalhar`), que se enche sozinho conforme as poses chegam. A tabela de
cores não viaja: é a mesma dos dois lados.

`medir.js` abre a página num navegador sem tela, com a cripta rodando, e
compara os dois jeitos.

## O que deu

**O worker assa igual, byte a byte:** os 160 quadros (e as 160 cópias para
longe) de um visual saíram idênticos aos da linha principal.

| | Linha principal (hoje) | Worker |
|---|---|---|
| Trabalho de um visual | 800 ms de CPU, na linha que desenha | 700 a 900 ms, na outra linha |
| O que a linha principal gasta por visual | os mesmos 800 ms, em fatias | **1,2 ms** para receber as 21 mensagens; a maior, 0,1 ms |
| Um visual pronto em | 3,4 s | **0,8 s** |
| Quatro visuais prontos em | 25 s | **3,4 s** |
| O pior pedaço de forno num quadro | **32 ms** | 1,3 ms (receber uma pose) |
| Subir o worker (carregar o jogo nele) | — | 1,5 a 2,6 s, uma vez, fora da linha principal |
| Memória a mais | — | uns 40 MB: é uma segunda cópia do jogo |

### O achado: os 3 ms por quadro não valem hoje

O forno trabalha em tarefas inteiras, e uma tarefa começada vai até o fim.
Os rumos são rápidos (metade das tarefas leva menos de 2,7 ms), mas a
primeira tarefa de cada pose — a grade, a pele e a redução — é bem mais
pesada: uma em cada vinte tarefas passa de 14 ms, e a maior chegou a
**32 ms**, dois quadros inteiros. São 20 poses por visual: cada visual
assado na linha principal espalha esses trancos pelo jogo, com o
`FORNO_MS = 3` e tudo. No jogo de hoje isso acontece ao ligar a terceira
pessoa e a cada troca de arma; no co-op, a cada jogador que entra e a cada
arma que alguém troca. No worker, a tarefa pode demorar o que quiser.

### Mais de um worker

Com três workers, os quatro visuais ficaram prontos no mesmo tempo que com
um (3,5 s contra 3,4 s): nesta máquina da nuvem (4 núcleos, dividindo com o
navegador e o jogo), o limite era a máquina. Um worker basta por enquanto.

### O que não serve daqui

O tempo entre os quadros da tela, medido aqui, é ruim até sem nada assando
(o navegador sem tela desenha o jogo em software, numa máquina dividida). Por
isso as conclusões usam o tempo gasto pela linha principal, que é o que o
worker muda, e não a fluidez da tela. Na sua máquina, a diferença deve
aparecer como trancos quando o forno roda na linha principal, e não no worker.

## Como entraria no jogo

`__FORNO.fornada` tem a cara de `novaFornada`: trocar uma pela outra onde o
jogo assa — a fornada do jogador em `p5.js` (`FORNADA_JOGADOR`,
`FORNADA_PROXIMA`) e, no co-op, as dos outros jogadores — e deixar a linha
principal como reserva quando não houver Worker. É mudança de arquitetura
pequena, mas é no `src/`: fica em *pedido pelas sondagens* no
`PLANEJAMENTO.md`, para uma sessão local.

O que falta decidir ou fazer nesse passo:

| O quê | Por quê |
|---|---|
| O worker carrega o jogo inteiro (40 MB, 1,5 a 2,6 s) | É o preço do "mesmo código" sem mudar o `build.js`. Um pacote só com o que assa (o corpo, as peças, as cores) seria bem menor; o `build.js` teria de montá-lo |
| Prioridade | O próprio personagem antes dos outros; quem está perto antes de quem está longe |
| Cancelar | Quem saiu, ou trocou de arma de novo, antes de ficar pronto |
| Guardar | O mesmo visual assado duas vezes é desperdício: guardar por escolha (o co-op já divide a fornada entre quem tem o mesmo visual) |

## Os arquivos

| Arquivo | O que é |
|---|---|
| `forno.js` | O que entra no jogo: o lado do worker, o lado da página e as medidas |
| `costura-forno.js` | Monta `forno.html`: o jogo montado com `forno.js` dentro, abrindo na cripta |
| `medir.js` | A medição num navegador sem tela (precisa do playwright); grava `medidas.json` |
| `medidas.json` | Os números de cada rodada, gravados pelo `medir.js` (os desta estão acima) |

Para rodar: `node mundo-perigoso/build.js`, depois
`node mundo-perigoso/sondagens/6-forno/costura-forno.js` e
`node mundo-perigoso/sondagens/6-forno/medir.js`. O `forno.html` também abre
direto no navegador; no console, `__FORNO_DBG` fica à mão, e
`await __FORNO_DBG.comparar({elmo: "fechado"})` faz a comparação na hora.
