- o tudo.js imprime 24 arquivos, 997 e 0, e 8 de 8 no verifica: sim
- sai com 0: sim
- com teste quebrado de proposito sai com 1: sim
- o README.diff so troca numeros e poe a linha nova: sim
- desvios: nenhum

## Comandos rodados

```bash
node mundo-perigoso/teste/tudo.js
git diff --output=README.diff mundo-perigoso/README.md
git apply --check --reverse README.diff
```

## Saida do tudo.js (sucesso, codigo 0)

```
mundo-perigoso/teste/atelie.test.js: 90 passaram, 0 falharam
mundo-perigoso/teste/conversor.test.js: 25 passaram, 0 falharam
mundo-perigoso/teste/wgvox.test.js: 10 passaram, 0 falharam
mundo-perigoso/teste/jogo.test.js: 69 passaram, 0 falharam
mundo-perigoso/teste/motor3d.test.js: 53 passaram, 0 falharam
mundo-perigoso/teste/mapa.test.js: 142 passaram, 0 falharam
mundo-perigoso/teste/ilha.test.js: 67 passaram, 0 falharam
mundo-perigoso/teste/conversa.test.js: 13 passaram, 0 falharam
mundo-perigoso/teste/regras.test.js: 88 passaram, 0 falharam
mundo-perigoso/teste/personagem.test.js: 26 passaram, 0 falharam
mundo-perigoso/teste/pecas.test.js: 45 passaram, 0 falharam
mundo-perigoso/teste/estilos.test.js: 50 passaram, 0 falharam
mundo-perigoso/teste/canteiro.test.js: 63 passaram, 0 falharam
mundo-perigoso/teste/refazer.test.js: 18 passaram, 0 falharam
mundo-perigoso/teste/andar.test.js: 70 passaram, 0 falharam
mundo-perigoso/teste/modelo.test.js: 27 passaram, 0 falharam
mundo-perigoso/teste/jogadores.test.js: 12 passaram, 0 falharam
mundo-perigoso/teste/catalogo.test.js: 20 passaram, 0 falharam
mundo-perigoso/teste/validacao.test.js: 39 passaram, 0 falharam
mundo-perigoso/teste/planta.test.js: 10 passaram, 0 falharam
mundo-perigoso/teste/canvas.test.js: 14 passaram, 0 falharam
mundo-perigoso/teste/pronto.test.js: 17 passaram, 0 falharam
mundo-perigoso/teste/olhar.test.js: 19 passaram, 0 falharam
mundo-perigoso/teste/forno.test.js: 10 passaram, 0 falharam
mundo-perigoso/teste/verifica.js: 8 de 8 no verifica (0 falhas)

total: 24 arquivos, 997 e 0, e 8 de 8 no verifica
```

## Saida do teste quebrado de proposito (codigo 1)

Quebrado em `mundo-perigoso/teste/wgvox.test.js` (linha 25 forçada para `false` e desfeita em seguida):

```
mundo-perigoso/teste/atelie.test.js: 90 passaram, 0 falharam
mundo-perigoso/teste/conversor.test.js: 25 passaram, 0 falharam
mundo-perigoso/teste/wgvox.test.js: 9 passaram, 1 falharam
mundo-perigoso/teste/jogo.test.js: 69 passaram, 0 falharam
mundo-perigoso/teste/motor3d.test.js: 53 passaram, 0 falharam
mundo-perigoso/teste/mapa.test.js: 142 passaram, 0 falharam
mundo-perigoso/teste/ilha.test.js: 67 passaram, 0 falharam
mundo-perigoso/teste/conversa.test.js: 13 passaram, 0 falharam
mundo-perigoso/teste/regras.test.js: 88 passaram, 0 falharam
mundo-perigoso/teste/personagem.test.js: 26 passaram, 0 falharam
mundo-perigoso/teste/pecas.test.js: 45 passaram, 0 falharam
mundo-perigoso/teste/estilos.test.js: 50 passaram, 0 falharam
mundo-perigoso/teste/canteiro.test.js: 63 passaram, 0 falharam
mundo-perigoso/teste/refazer.test.js: 18 passaram, 0 falharam
mundo-perigoso/teste/andar.test.js: 70 passaram, 0 falharam
mundo-perigoso/teste/modelo.test.js: 27 passaram, 0 falharam
mundo-perigoso/teste/jogadores.test.js: 12 passaram, 0 falharam
mundo-perigoso/teste/catalogo.test.js: 20 passaram, 0 falharam
mundo-perigoso/teste/validacao.test.js: 39 passaram, 0 falharam
mundo-perigoso/teste/planta.test.js: 10 passaram, 0 falharam
mundo-perigoso/teste/canvas.test.js: 14 passaram, 0 falharam
mundo-perigoso/teste/pronto.test.js: 17 passaram, 0 falharam
mundo-perigoso/teste/olhar.test.js: 19 passaram, 0 falharam
mundo-perigoso/teste/forno.test.js: 10 passaram, 0 falharam
mundo-perigoso/teste/verifica.js: 8 de 8 no verifica (0 falhas)

total: 24 arquivos, 996 e 1, e 8 de 8 no verifica

=== DETALHE DAS FALHAS ===

--- mundo-perigoso/teste/wgvox.test.js ---
=== PASSOU (9) ===
  ok  .vox: a dimensao volta igual
  ok  .vox: cada voxel volta na mesma posicao e cor (primeira diferenca no indice -1)
  ok  .vox: a paleta volta igual (indice de cor i -> posicao i-1)
  ok  .vox: grade vazia nao quebra (SIZE e XYZI sem voxel nenhum)
  ok  .wgvox: le a grade certa
  ok  .wgvox: le o cabecalho JSON
  ok  .wgvox: le a paleta na ordem certa
  ok  .wgvox: o RLE decodifica pra grade original, celula por celula (primeira diferenca no indice -1)
  ok  wgvox.test.js e ASCII puro

=== FALHOU (1) ===
  XX  .vox: comeca com a assinatura certa
```

## Arquivos entregues

- `tudo.js`
- `README.diff`
- `RELATORIO.md`
- `PRONTO`
