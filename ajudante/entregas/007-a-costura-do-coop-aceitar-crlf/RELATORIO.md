# Relatorio da entrega 007 -- A costura do co-op aceitar CRLF

- testar.js da 21 de 21 em LF: sim
- testar.js da 21 de 21 em CRLF: nao (ver desvios)
- montar-atraso.js roda sem erro em LF: sim
- montar-atraso.js roda sem erro em CRLF: nao (ver desvios)
- o diff so mexe nas duas costuras: sim
- desvios: as expressoes regulares de busca nas duas costuras (VISITADOS em costura.js e /<script>\r?\n/ em costura-coop.js) foram atualizadas para aceitar \r?\n. Porem, conforme ressalva do pedido ("Se alguma troca nao for possivel sem mudar a logica, nao faca e explique no relatorio"), as strings literais passadas para trocarUma(js, "...\n", ...) usam \n literal em strings (nao sao RegExp). Trocar "\n" por "\r?\n" em literal de string busca os caracteres literais \ r ? \ n e falha. Alem disso, servidor.js (linha 45) e montar-atraso.js (linha 56) contem /<script>\n/ fora das duas costuras e quebram com TypeError ao ler HTML com CRLF se nao forem alterados.

## Comandos que rodou
- node mundo-perigoso/build.js
- node mundo-perigoso/sondagens/2-rede/montar-atraso.js (em LF: sucesso; em CRLF: falha em montar-atraso.js:60)
- node mundo-perigoso/sondagens/5-coop/testar.js (em LF: 21 ok, 0 falharam; em CRLF: falha em servidor.js:47)
- git apply --check costura.diff (sucesso)

## Saida do que falhou
Com `cripta-vhalgorn.html` convertido para CRLF:
1. `node mundo-perigoso/sondagens/2-rede/montar-atraso.js`:
```
TypeError: Cannot read properties of null (reading '1')
    at Object.<anonymous> (.../montar-atraso.js:60:29)
```
(Ocorre porque a linha 56 de `montar-atraso.js` faz `html.match(/<script>\n([\s\S]*)<\/script>/);` que busca `\n` e nao esta nas duas costuras autorizadas no diff).

2. `node mundo-perigoso/sondagens/5-coop/testar.js`:
```
Error: o servidor nao subiu:
TypeError: Cannot read properties of null (reading '1')
    at jogoDoServidor (.../servidor.js:47:39)
```
(Ocorre porque a linha 45 de `servidor.js` faz `html.match(/<script>\n([\s\S]*)<\/script>/);` que busca `\n` e nao esta nas duas costuras autorizadas no diff).

3. Mesmo isolando `costurarCoop(m[1])` com bloco extraido com `\r?\n`:
```
Error: costura: esperava 1 ocorrencia, achei 0 de:
function passoDoJogador(P, dt, ent){
```
(Ocorre porque `trocarUma` busca strings com `\n` e o texto contem `\r\n`).

## Entregou
- `costura.diff`: alteracoes nas duas costuras (`mundo-perigoso/sondagens/2-rede/costura.js` e `mundo-perigoso/sondagens/5-coop/costura-coop.js`)
- `RELATORIO.md`
- `PRONTO`
