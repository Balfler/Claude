# Sondagem 4 — um lobo pelo ateliê

**Feita em 26/09/2026**, na nuvem, pelo Claude. Por leitura do código, sem
esculpir o lobo: a leitura respondeu a pergunta, e o lobo de verdade fica
como o primeiro passo do trabalho que ela aponta.

## A pergunta

O ateliê serve para criatura que não é gente? Lobo, aranha, morcego, a forma
animal do druida e as invocações do necromante dependem disso. Se não
servisse, cada bicho ficaria preso ao jeito de hoje — modelo escrito em
código, pose por pose (`src/p3c.js`) — e o jeito de fazer personagem teria
de mudar antes de ter bicho demais.

## Resposta curta

**Serve com uma generalização, não com uma reescrita.** O ateliê tem dois
andares:

- **O miolo não sabe que o corpo é de gente.** O corpo em voxel, esculpir,
  importar, a paleta, a pele por quatérnio dual, a prévia, a folha e a linha
  de comando: nenhuma menção a ombro, quadril ou mão.
- **O humano mora em poucos lugares, e o principal já é uma tabela.** O
  esqueleto é a lista `OSSOS` em `atelie/nucleo.js`: nome, pai, pivô, ponta.
  Um lobo é outra lista, não outro ateliê.

O que falta é a **espécie virar dado**: a grade, os pontos, os ossos, o
repouso e as poses que o jogo pede, num arquivo por espécie, com o humano
sendo a primeira.

## O que está preso ao humano

Contando os nomes de junta humana (ombro, cotovelo, mão, quadril, joelho,
pé, pescoço) e as medidas fixas da grade (`GRADE`, `DIM_PERSONAGEM`,
`REPOUSO`):

| Arquivo | Menções | O que é |
|---|---|---|
| `src/p3e.js` | 237 | O personagem no jogo: esqueleto, peças de roupa e armadura penduradas nas juntas, a fornada. É do humano de propósito, e continua sendo |
| `atelie/nucleo.js` | 63 | Os fatos: a grade de 80×56×117, as juntas, o repouso do jogo, os quadros pedidos, o lugar da mão da arma |
| `atelie/rig.js` | 44 | O rig proposto pela silhueta em T-pose, o ângulo anatômico, o pé no chão |
| `atelie/captura.js` | 43 | Redirecionar captura BVH e SMPL, que são de gente |
| `atelie/escritas.js` | 18 | Andar, correr, pulo, atacar, conjurar, bloquear, respirar |
| `atelie/painel.js` | 11 | Os controles de ângulo na tela |
| `atelie/validar.js` | 10 | A validação por quadro |
| `atelie/pesos.js` | 9 | O peso geodésico: o raio de cada osso, e a bacia e o tronco com segmento próprio |
| `atelie/encaixe.js` | 7 | Caber na grade e deixar a mão da arma no lugar |
| `atelie/animacao.js` | 6 | As animações do jogo |
| `atelie/arquivos.js` | 1 | Os formatos |
| `corpo.js`, `deformar.js`, `vista.js`, `previa.js`, `folha.js`, `cli.js` | 0 | O miolo |

E o jogo desenha os seis bichos de hoje de outro jeito: `src/p3c.js` monta
cada um por código, uma função por pose (`modeloDiabrete(pose)`), e o
assador de sempre gira nos oito rumos. Sem esqueleto, sem ateliê.

## O que muda para o lobo existir

| Passo | Onde | Tamanho |
|---|---|---|
| **A espécie vira dado:** grade, pontos, `OSSOS`, repouso, as poses que o jogo pede e o raio de cada osso, num objeto por espécie. O humano é a primeira espécie, e nada nele muda | `atelie/nucleo.js`, e quem importa dele | médio, mecânico |
| **O rig proposto por espécie:** o humano continua pela silhueta em T-pose; para as outras, o esqueleto modelo da espécie esticado na caixa do corpo, e o ajuste à mão que a tela já faz (arrastar a junta) | `atelie/rig.js` | pequeno |
| **O peso geodésico sem caso especial:** o segmento da bacia e do tronco vira campo do osso na tabela | `atelie/pesos.js` | pequeno |
| **Animações por espécie**, escritas em ângulo como as do humano. Captura de bicho quase não existe de graça, então elas nascem escritas | `atelie/escritas.js` | médio, é arte |
| **O bicho sai num arquivo**, os quadros já posados como o `PERSONAGEM 2`, e o jogo assa como assa o personagem, no lugar da função em `p3c.js` | `atelie/arquivos.js`, `src/p3c.js` | médio |
| **A grade por espécie.** O lobo é comprido de frente para trás: a grade do humano tem 56 voxels de fundo, uns 0,44 tile, e um lobo passa de 1 tile | o arquivo da espécie | pequeno |

**O que não precisa mudar:** o corpo em voxel, a pele por quatérnio dual, a
paleta, a validação de pedaço solto e de inchaço, a prévia com o assador do
jogo, o formato do humano. A forma animal do druida e as invocações do
necromante saem do mesmo caminho.

**O primeiro teste de verdade**, quando for a hora: esculpir um lobo
simples, escrever a tabela de ossos dele (coluna, pescoço, cabeça, rabo e
quatro pernas de três ossos) e posar uma passada. Se a pele por quatérnio
dual e o peso geodésico derem conta de quatro pernas e rabo sem furo — e
nada no código deles diz que não darão —, o resto é trabalho mecânico.
