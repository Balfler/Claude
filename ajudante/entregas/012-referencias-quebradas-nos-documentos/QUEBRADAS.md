# Referências Quebradas nos Documentos

Levantamento de menções a seções, itens e arquivos inexistentes ou desatualizados em `DESIGN.md`, `PLANEJAMENTO.md`, `mundo-perigoso/README.md` e nos relatórios de `mundo-perigoso/sondagens/`.

---

## 1. DESIGN.md

| arquivo:linha | Trecho | O que falta | Para onde provavelmente devia apontar |
|---|---|---|---|
| `DESIGN.md:7` | `> codar. Ele contém as decisões já tomadas, o que ainda está em aberto, e o` | A seção `## Em aberto` foi retirada do `DESIGN.md` na faxina de 27/9 (pedido 002) | `PLANEJAMENTO.md`, seção `## Por decidir` |
| `DESIGN.md:602` | `São 40 mil caracteres: dá para escrever uma vez, não para manter por anos. Ver *o formato de mapa*, em decisões técnicas.` | Não existe seção `o formato de mapa` em `## Decisões técnicas` | `DESIGN.md:1541` (`#### 4. O formato MAPA 2 — DECIDIDO`, dentro de `### O canteiro — a ferramenta de criação de mundo`) |
| `DESIGN.md:753` | `Cada peça precisaria existir em 8 rotações × quadros de animação. Ver *decisão técnica pendente* abaixo.` | Não existe seção intitulada `decisão técnica pendente` | `DESIGN.md:868` (`### Pendente e importante — o personagem composto por peças`) |
| `DESIGN.md:808-820` | Tabela de módulos com caminhos sem `src/` (`p1.html`, `p2.js`, `p2b.js`, `p3.js`, `p3b.js`, `p3c.js`, `p3e.js`, `p3d.js`, `p4.js`, `p5a.js`, `p5.js`) e omitindo novos módulos | Faltam na tabela os módulos criados depois: `src/mapa.js`, `src/ilha.js`, `src/cores.js`, `src/pintor.js`, `src/estilos.js`, `src/pecas.js`, `src/solidos.js` e `src/p5b.js` (o laço principal hoje mora em `p5b.js`, não em `p5.js`) | `mundo-perigoso/README.md:69` (`## Os módulos`), com os 18 arquivos do motor atual |
| `DESIGN.md:821-822` | `O build.js monta também o provador.html, com p2.js, p3.js, p3b.js e p3e.js dentro de uma página própria.` | O `provador.html` hoje leva também `src/cores.js`, `src/pintor.js`, `src/estilos.js`, `src/pecas.js`, `src/provador.js` e caminhos com `src/` | `mundo-perigoso/README.md:635` (`## O provador`) e `mundo-perigoso/build.js` |
| `DESIGN.md:824-826` | `Testes: teste/jogo.test.js, teste/motor3d.test.js, teste/mapa.test.js, teste/ilha.test.js, teste/regras.test.js, teste/personagem.test.js, teste/conversa.test.js e teste/wgvox.test.js.` | Lista desatualizada de testes: cita apenas 8 arquivos; hoje o projeto conta com 24 testes automatizados em `teste/` | `mundo-perigoso/README.md:15` (`## Como mexer`), que lista todos os testes atuais |
| `DESIGN.md:1037` | `editor/personagem-wgvox.js converte o .wgvox pro nosso .personagem: existe ao lado de editor/personagem.js...` | O arquivo `mundo-perigoso/editor/personagem-wgvox.js` foi aposentado e removido (commit 59292b1); a importação foi absorvida pelo ateliê | `mundo-perigoso/atelie/` e `mundo-perigoso/README.md:668` (`## O ateliê de personagem`) |

---

## 2. PLANEJAMENTO.md

| arquivo:linha | Trecho | O que falta | Para onde provavelmente devia apontar |
|---|---|---|---|
| `PLANEJAMENTO.md:57` | `- **Feito:** os itens 1 a 15 da antiga lista do DESIGN.md — as medições...` | A lista de tarefas numerada (itens 1 a 15) foi removida do `DESIGN.md` em 27/9 (pedido 002) | Histórico do git (registro da faxina do pedido 002) ou nota de arquivo histórico |
| `PLANEJAMENTO.md:62` | `- **A seguir, a fase de relevo e conteúdo** (planejada em 24/9, item 16):` | O "item 16" era o item seguinte da antiga lista numerada do `DESIGN.md`, que não existe mais | Subitens 1 a 6 logo abaixo (`PLANEJAMENTO.md:63-70`) |
| `PLANEJAMENTO.md:71` | `- **Onde está:** DESIGN.md, *o canteiro*;` | No `DESIGN.md`, o título exato da seção é `### O canteiro — a ferramenta de criação de mundo` (linha 1417) | `DESIGN.md:1417` (`### O canteiro — a ferramenta de criação de mundo`) |
| `PLANEJAMENTO.md:159` | `— *os caídos, proposta ainda não decidida*` | Não há seção com essa redação no `DESIGN.md`. A seção é `### Os caídos — DECIDIDO` (linha 425) com subseção `#### Proposta, ainda não decidida` (linha 474) | `DESIGN.md:425` e `DESIGN.md:474` |
| `PLANEJAMENTO.md:166` | `— *quando os jogadores vencem*` | No `DESIGN.md`, o título completo da seção é `#### Quando os jogadores vencem — em aberto` (linha 560) | `DESIGN.md:560` (`#### Quando os jogadores vencem — em aberto`) |
| `PLANEJAMENTO.md:169` | `— *a guerra de fim de semana, proposta*` | No `DESIGN.md`, a seção principal é `### A guerra de fim de semana — DECIDIDO` (linha 515) e a subseção é `#### Proposta, ainda não decidida` (linha 541) | `DESIGN.md:515` e `DESIGN.md:541` |

---

## 3. mundo-perigoso/README.md

| arquivo:linha | Trecho | O que falta | Para onde provavelmente devia apontar |
|---|---|---|---|
| `README.md:54` | `As medições e as cinco decisões que saíram dela estão no DESIGN.md, em *o canteiro*.` | Em `DESIGN.md`, a seção é `### O canteiro — a ferramenta de criação de mundo` (linha 1417) | `DESIGN.md:1417` (`### O canteiro — a ferramenta de criação de mundo`) |
| `README.md:230` | `O editor de mapa antigo (editor/editor.html) foi aposentado: o canteiro, abaixo, faz tudo o que ele fazia...` | O arquivo `mundo-perigoso/editor/editor.html` foi excluído do repositório físico | `mundo-perigoso/canteiro/canteiro.html` (ou histórico git) |
| `README.md:239` | `O personagem desenhado e os voxels (ver *o ateliê*)` | No próprio `README.md`, o título da seção é `## O ateliê de personagem` (linha 668), não `*o ateliê*` | `mundo-perigoso/README.md:668` (`## O ateliê de personagem`) |

---

## 4. mundo-perigoso/sondagens/

| arquivo:linha | Trecho | O que falta | Para onde provavelmente devia apontar |
|---|---|---|---|
| `5-coop/RELATORIO.md:158` | `| **A costura vira código de verdade** | é o item 3 de *pedido pelas sondagens* no PLANEJAMENTO.md | médio |` | Em `PLANEJAMENTO.md:212`, a costura é o **item 2** de `### Pedido pelas sondagens (26/9)`, não o item 3 (o item 3 é conversa/charada/loot) | `PLANEJAMENTO.md:212` (`### Pedido pelas sondagens (26/9)`, item 2) |
| `6-forno/RELATORIO.md:78-79` | `fica em *pedido pelas sondagens* no PLANEJAMENTO.md, para uma sessão local.` | No `PLANEJAMENTO.md`, a seção intitula-se `### Pedido pelas sondagens (26/9)` (linha 206) | `PLANEJAMENTO.md:206` (`### Pedido pelas sondagens (26/9)`) |
| `1-personagens/RELATORIO.md:131-132` | `resultado.json`, `praca-perto.png`, `praca-30.png` listados em `## Os arquivos` | Arquivos gerados durante a execução do teste que não foram commitados na pasta | São saídas produzidas pelo script `rodar.js` |
