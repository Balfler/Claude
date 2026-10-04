# Catálogo das Armas do Jogo

Levantamento das armas presentes no código do protótipo (`mundo-perigoso/src/`) e das prometidas no documento de design (`DESIGN.md`).

---

## 1. Armas Existentes no Código

| Arma | Arquivo:Linha | Tipo / Alcance | Dano / Atributos | Modelo 3D / Peça | Descrição e Papel no Jogo |
|---|---|---|---|---|---|
| **Adaga Rúnica** (`dagger`) | `src/p4.js:151`; `src/p3.js:332`; `src/p3e.js:487` | Melee curto (alcance 1.7 tiles), cooldown 0.42 s | [18, 34] pontos de dano físico | Peça em `src/p3e.js`: cabo de couro (2.2 voxels) e lâmina metálica com ponta afiada | Arma inicial de combate corpo a corpo rápido. Lâmina com runas luminosas azuis/ciano entalhadas que brilham ao desferir golpes. |
| **Cajado Arcano** (`staff`) | `src/p4.js:152`; `src/p3.js:364`; `src/p3e.js:494` | Projétil (`bolt`), custo 1 mana, cd 0.28 s | 24 pontos de dano mágico, velocidade 13 tiles/s | Haste longa de madeira (altura 3 a 108 voxels) com esfera/cristal no topo (z=111) | Arma mágica de disparo rápido à distância. Dispara projéteis de energia arcana concentrada. Empunhada na mão direita e apoiada próxima ao chão. |
| **Grimório de Chamas** (`tome`) | `src/p4.js:153`; `src/p3.js:394`; `src/p3e.js:501` | Projétil em área (`fire`), custo 6 mana, cd 0.90 s | 58 pontos de dano direto + 42 em área (raio 2.1 tiles) | Livro de couro (8×10×5 voxels) com páginas internas (6×8×3) | Arma mágica pesada para controle de grupos de monstros (bola de fogo). Livro mágico encadernado em couro com fecho metálico mantido aberto na palma da mão. |
| **Espada** (`espada`) | `src/p3e.js:490`; `src/provador.js:18` | Melee médio (prometida para o guerreiro) | Prevista para combate corpo a corpo balanceado | Cabo de couro (comprimento 9 voxels), guarda cruzada de metal (15×5×3) e lâmina de aço (50 voxels) | Espada reta medieval clássica com guarda cruzada e pomo arredondado, modelada para acompanhar o antebraço e a mão do personagem. |
| **Arco** (`arco`) | `src/p3e.js:497`; `src/provador.js:18` | Projétil físico à distância (prometido para ladino/caçador) | Prevista com mecânica de mira, munição e dano | Haste de madeira recurva em dois segmentos (arco de 54 voxels) e corda de couro tensionada | Arco clássico recurvo de madeira nobre com corda tencionada, modelado para a postura de disparo na mão do humano base. |

---

## 2. Armas Prometidas no `DESIGN.md` e `PLANEJAMENTO.md`

| Arma / Equipamento | Citação no `DESIGN.md` / `PLANEJAMENTO.md` | Status / Planejamento |
|---|---|---|
| **Espada Longa** | `PLANEJAMENTO.md: linha 80` (*"a espada e o arco seguirem o antebraço, e não só a mão"*); `DESIGN.md: linha 322` (*"uma espada brilhando no topo"*), linha 403 (*"armas do cavaleiro"*). | Já possui modelo de voxel em `src/p3e.js:490` e suporte no provador. Falta a lógica de golpe corpo a corpo e balanceamento no combate. |
| **Arco e Flechas** | `PLANEJAMENTO.md: linhas 80, 134` (*"O arco como arma: mira, munição e dano. As poses já existem"*); `DESIGN.md: linha 1004` (*"o arco também usa a torção para virar o corpo de lado"*). | Já possui modelo de voxel em `src/p3e.js:497`, poses de disparo (18 e 19) no motor. Falta a definição de munição (aljava), mira e balística do projétil físico. |
| **Escudo** | `DESIGN.md: linhas 132, 946, 1004`; `src/p3e.js:475` (*"escudo redondo"*); `src/p4.js:216`. | Já modelado como peça (`PECA.escudo.redondo`). Falta definir se o bloqueio será por tecla contínua ou janela de aparar (*parry*). |
| **Montante / Arma de Duas Mãos** | `DESIGN.md: linha 449` (*"cavaleiro da morte"*); `DESIGN.md: linha 1120` (*"guerreiro com arma pesada"*). | Prometida para as classes marciais pesadas e o Cavaleiro da Morte. |
| **Lança / Pique de Guarda** | `DESIGN.md: linha 406` (*"quartel e armeiro"*); guarda Anselmo. | Prometida para armamento de sentinelas e combate com maior alcance de perfuração. |

---

## 3. Conformidade das Dimensões com o Humano Base

Todas as cinco armas (`adaga`, `espada`, `cajado`, `arco`, `grimorio`) foram renderizadas diretamente a partir do motor e do provador do jogo (`provador.html`):
- Na vista frontal (`frente.png`), a empunhadura alinha-se precisamente com a junta `maoD` (mão direita do personagem de 117 voxels).
- Na vista lateral (`lado.png`), a arma acompanha o giro do corpo sem penetrar a coxa ou o tronco, preservando a escala anatômica.
- Na vista isolada (`sozinha.png`), a arma é exibida centrada e em grande escala, pronta para servir de ícone de inventário e referência de peça.
