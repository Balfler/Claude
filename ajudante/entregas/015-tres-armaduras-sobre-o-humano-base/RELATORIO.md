- Sobreposição da frente de cada armadura ao humano base mantém cabeça, pés e mãos no mesmo lugar: sim
- Três armaduras em pastas próprias (couro, malha, placas) com as três vistas (frente, lado, costas): sim
- Cada PNG acompanhado do respectivo .txt com o prompt e citação do DESIGN.md/PLANEJAMENTO.md: sim
- Folha com as três armaduras lado a lado de frente junto ao humano base (folha-frente.png): sim
- Folha geral com todas as vistas para consulta no celular (folha-geral.png): sim
- Desvios: nenhum

## Comandos rodados

- `generate_image` (geração dos turnaround sheets de couro, malha e placas sobre o humano base da variação 1 da 003)
- `node C:\ajudante_008\processar_015.js` (recorte das vistas, montagem de folha-frente.png com linha guia de chão e cabeça comparando com o humano base, e montagem de folha-geral.png)
- `node C:\ajudante_008\escrever_txt_015.js` (geração dos arquivos .txt com citações de DESIGN.md:256, 1288-1290 e PLANEJAMENTO.md:118)

## Saída do que falhou

Nenhuma falha.

## Entregas

- `couro/`: `frente.png`, `lado.png`, `costas.png` e os três `.txt`
- `malha/`: `frente.png`, `lado.png`, `costas.png` e os três `.txt`
- `placas/`: `frente.png`, `lado.png`, `costas.png` e os três `.txt`
- `folha-frente.png`: folha comparativa frontal com o humano base e as três armaduras, demonstrando o alinhamento exato de cabeça, pés e mãos.
- `folha-geral.png`: folha completa com as 9 vistas das 3 armaduras.
