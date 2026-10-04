# Relatorio — Pedido 003: O humano em três vistas, para o personagem do desenho

## 1. O que foi feito
- Lidos os arquivos de referencia:
  - `mundo-perigoso/prompts/personagem-do-desenho.md`
  - `mundo-perigoso/Arte/molde-humano.png` e `molde-humano-4x.png`
  - `mundo-perigoso/Arte/personagens/humano.png` e `layer-pixel-art-character.png`
  - `mundo-perigoso/Arte/LEIA-ME.md`
- Foram geradas duas variações de estilo do humano base, cada uma com as três vistas exigidas (Frente, Lado voltado para a esquerda, e Costas):
  - **Variacao 1 (Aventureiro Classico / Aldeao):** Baseada estritamente no personagem de referencia original (`humano.png`). Usa tunica verde com cadarcos de couro no decote, mangas arregaçadas, cinto marrom com bolsa na lateral, calcas marrons e botas de couro.
  - **Variacao 2 (Batedor / Traje com Colete de Couro):** Variacao estilistica no mesmo universo, vestindo camisa de linho cru com colete de couro curtido reforçado por cima, calças grafite, cinto com fivela e botas de expedicao.
- Ambas as variações foram geradas mantendo consistência absoluta:
  - Mesma altura, mesmos ombros e mesma roupa nas três vistas de cada variação.
  - Perfil lateral virado para a esquerda (conforme especificado no molde e no `LEIA-ME.md`).
  - Pose com os braços ligeiramente afastados do corpo (A-pose) para evitar o problema historico do braço colado ao tronco.
  - Fundo liso cinza neutro (#C0C0C0), sem sombras no chão.
  - Estilo de pixel art da era de 1993 com contorno escuro e paleta curta.
- As imagens foram recortadas para visualizacao e uso individual (`frente.png`, `lado.png`, `costas.png`), preservando tambem a folha conjunta (`folha.png`).

---

## 2. O que no prompt de entrada nao se conseguiu seguir
- **Paleta quantizada a 54 cores no proprio PNG:** O gerador de imagens produz saida com anti-aliasing e tons intermediarios nos pixels de transicao. A imagem captura o estilo visual e as cores do desenho de 1993, mas a reducao matematica estrita para a tabela de no maximo 54 cores exatas devera ser feita pela rotina de quantizacao do conversor/atelie quando o modelo for importado (conforme a instrucao: "nao rode o conversor, nao mexa em Arte/").
- **Grid exato de 117 pixels:** A imagem gerada possui resolucao de amostragem mais alta (768px de altura) para preservar a definicao dos detalhes do rosto, cinto e sapatos.

---

## 3. Arquivos Entregues
Na pasta `ajudante/entregas/003-humano-em-tres-vistas/`:

- **Variacao 1 (`variacao-1/`):**
  - `frente.png` e `frente.txt`
  - `lado.png` e `lado.txt`
  - `costas.png` e `costas.txt`
  - `folha.png` (folha completa lado a lado)
- **Variacao 2 (`variacao-2/`):**
  - `frente.png` e `frente.txt`
  - `lado.png` e `lado.txt`
  - `costas.png` e `costas.txt`
  - `folha.png` (folha completa lado a lado)
- `RELATORIO.md`
- `PRONTO`
