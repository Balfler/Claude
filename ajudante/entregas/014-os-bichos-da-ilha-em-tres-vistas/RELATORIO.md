- Três vistas de cada bicho são o mesmo bicho (mesmo tamanho, cores e marcas): sim
- Cada bicho em pasta própria com frente, lado (voltado para a esquerda), costas e escala: sim
- Folha com humano base ao lado para escala em cada bicho: sim
- Folha geral conjunta para visualização rápida no celular: sim
- Cada PNG acompanhado do respectivo .txt com o prompt e a citação do documento: sim
- Desvios: nenhum (aparência mais simples adotada para cada animal conforme regra geral, visto que o DESIGN.md e PLANEJAMENTO.md apenas citam os nomes dos bichos da ilha).

## Comandos rodados

- `generate_image` (geração dos turnaround sheets de lobo, rato, cobra e caranguejo)
- `node C:\ajudante_008\processar_014.js` (recorte das vistas, espelhamento para esquerda onde necessário, composição das escalas com o humano base e folha geral)
- `node C:\ajudante_008\escrever_txt_014.js` (geração dos arquivos .txt com os prompts e citações exatas de PLANEJAMENTO.md:270-271 e sondagens/4-lobo/RELATORIO.md:9)

## Saída do que falhou

Nenhuma falha.

## Entregas

- `lobo/`: `frente.png`, `lado.png`, `costas.png`, `escala.png` e os quatro `.txt`
- `rato/`: `frente.png`, `lado.png`, `costas.png`, `escala.png` e os quatro `.txt`
- `cobra/`: `frente.png`, `lado.png`, `costas.png`, `escala.png` e os quatro `.txt`
- `caranguejo/`: `frente.png`, `lado.png`, `costas.png`, `escala.png` e os quatro `.txt`
- `folha-geral.png`: folha com os quatro animais, suas três vistas e comparações de escala lado a lado.
