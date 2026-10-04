- Toda arma da lista tem as três imagens (frente, lado, sozinha): sim (adaga, espada, cajado, arco, grimorio)
- Na mão do humano o tamanho da arma bate exatamente com a mão: sim (capturado diretamente do provador 3D oficial do jogo)
- LISTA.md com linha de código e citação do DESIGN.md para cada uma: sim
- Folha geral com todas as armas em miniatura lado a lado (folha-geral.png): sim
- Desvios: nenhum

## Comandos rodados

- `node C:\ajudante_008\processar_020.js` (automação com Playwright sobre `provador.html`, seleção das armas Adaga, Espada, Cajado, Arco e Grimório, captura frontal e lateral empunhadas na mão do personagem de 117 voxels, renderização das peças sozinhas e montagem de folha-geral.png)

## Saída do que falhou

Nenhuma falha.

## Entregas

- `LISTA.md`: catálogo com as armas existentes (`src/p4.js`, `src/p3.js`, `src/p3e.js`) e as prometidas no `DESIGN.md`/`PLANEJAMENTO.md`.
- `adaga/`: `frente.png`, `lado.png`, `sozinha.png`
- `espada/`: `frente.png`, `lado.png`, `sozinha.png`
- `cajado/`: `frente.png`, `lado.png`, `sozinha.png`
- `arco/`: `frente.png`, `lado.png`, `sozinha.png`
- `grimorio/`: `frente.png`, `lado.png`, `sozinha.png`
- `folha-geral.png`: folha comparativa contendo as 5 armas, suas vistas de frente e de lado empunhadas pelo personagem e o ícone centrado de cada uma.
