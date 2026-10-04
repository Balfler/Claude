# Captura de movimento

Arquivos de captura que o ateliê importa (`node mundo-perigoso/atelie/cli.js
captura`, ou a etapa Animar do `atelie/atelie.html`). Só ficam aqui os que o
jogo usa; a receita do personagem (`Arte/personagens/humano.receita.json`)
diz qual vai em qual animação.

## CMU Graphics Lab Motion Capture Database

`cmu/` vem do banco de captura da Carnegie Mellon University
(http://mocap.cs.cmu.edu), na conversão para BVH de Bruce Hahne (cgspeed),
baixada de https://github.com/una-dinosauria/cmu-mocap. Nas palavras da
CMU: "This dataset of motions is free for all uses" e "The motion capture
data may be copied, modified, or redistributed without permission". Crédito:
os dados foram obtidos em mocap.cs.cmu.edu; o banco foi criado com
financiamento da NSF EIA-0196217.

Para baixar outro clipe: `https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/<sujeito com 3 dígitos>/<sujeito>_<clipe>.bvh`
(por exemplo `data/143/143_32.bvh`). O índice com a descrição de cada clipe
está no mesmo repositório, em `cmu-mocap-index-text.txt`.

| Arquivo | Descrição na CMU | Vai em |
|---|---|---|
| `cmu/143_32.bvh` | sujeito 143, "Walk" | `andar` (6 quadros) |
| `cmu/09_01.bvh` | sujeito 9, "run" | `correr` (4 quadros, fase 0,375) |

Dois cuidados que esta conversão pede, e que o importador já toma:

- **O primeiro quadro é uma T-pose posta pelo conversor**, e os offsets do
  esqueleto têm as pernas 20 graus abertas. A referência do redirecionamento
  é a pose mais perto de T-pose entre os dois — o primeiro quadro — e ele sai
  do movimento.
- **O ator anda pela sala.** O vertical é o eixo exato da captura (a linha
  bacia-cabeça inclina uns graus, e inclinada o chão "subia" com os metros
  corridos), e o rumo de cada quadro sai, suavizado em meio segundo: alguns
  clipes correm de costas para a câmera.

## O que foi experimentado e ficou de fora

Uns quarenta clipes foram redirecionados para o humano e assados pelo
próprio jogo, lado a lado com as animações escritas (`atelie/escritas.js`).
O que decidiu foi a grade: 80 × 56 × 117, com só 28 voxels na frente do meio
do corpo, e armas que não giram com a mão.

- **Corrida de velocidade** (127_06 a 127_08, "Action Adventure"): a mais
  bonita crua, mas a passada é mais comprida que os 56 voxels de fundo. Para
  caber, a perna encolhia para 30–60% e o boneco parecia agachado.
  Trotes (35_17, 16_35, 143_01) cabem, mas nessa resolução leem como
  caminhada apressada. A 09_01 é o meio certo.
- **Caminhada**: 35_01 e 16_15 também servem; a 143_32 tem o balanço de
  quadril e ombro mais vivo.
- **Pulo** (16_01, 118_01, 118_10, 13_39, 143_06): no alto do salto a perna
  está esticada, e num quadro só isso lê como alguém em pé. O pulo escrito,
  de pernas recolhidas, lê como pulo.
- **Golpe** (02_07 a 02_09 "swordplay", 86_04, 144_20, 143_23): golpe de
  verdade passa a mão por cima da cabeça, e a lâmina da espada, que sempre
  aponta para cima, sai da grade. O braço era amortecido abaixo de 20% e o
  golpe perdia a força. Fica o corte escrito, na altura da cintura.
- **Arco** (79_86): puxar a corda põe o braço do arco uns 40 voxels na frente
  do ombro — a grade tem 28.
- **Bloqueio** (144_07, 144_26): a guarda capturada levanta o braço, mas o
  escudo do jogo é uma peça fixa ao lado do corpo. O bloqueio escrito leva a
  mão até a alça do escudo por IK.
- **Conjurar** (120_03, "Mickey cast spell"): caricato demais (inclina para
  trás e levanta a perna), e o braço lançado não cabe.
