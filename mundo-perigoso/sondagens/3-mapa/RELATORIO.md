# Sondagem 3 — o mapa aos pedaços, pelo servidor

**Feita em 26/09/2026**, na nuvem, pelo Claude.

## A pergunta

Dá para o segredo não ir no cliente?

Hoje o `build.js` embute todos os mapas no HTML (`MAPAS_EMBUTIDOS`): quem
abre o arquivo tem a ilha inteira, a semente do sorteio e toda passagem
secreta. O `DESIGN.md` já anota o risco: o que estiver no cliente sai num
fórum no primeiro dia. Se para esconder fosse preciso mudar o formato ou o
canteiro, era melhor saber antes de fazer muito mapa.

## Resposta curta

**Dá, e o formato e o motor já estão prontos para isso.**

- O `MAPA 2` já é escrito em pedaços de 32×32, uma linha por pedaço: é a
  unidade natural de mandar pela rede. A ilha de 650 inteira são **48 KB**
  comprimidos; uma caminhada de quase 5 minutos manda **29 KB**, e **10 KB**
  bastam para começar a jogar.
- O motor **recebe um pedaço em 5 a 8,5 ms** com o jogo rodando, pelo mesmo
  refazer-só-o-que-mudou do canteiro, e o mundo sai **idêntico** ao da ilha
  montada inteira.
- O segredo vira uma coisa simples: o cliente recebe a parede como parede;
  quando alguém acha a passagem, o servidor manda o pedaço atualizado. A
  semente e as alternativas que não valem nunca saem do servidor.
- **O canteiro não precisa mudar.** O arquivo inteiro continua sendo o que o
  canteiro grava e o que o servidor lê.

## Os números

No node, com `src/mapa.js` e o jogo montado de verdade (`pedacos.js`).
"Comprimido" é deflate, que o WebSocket faz sozinho.

### Os pedaços

| Mapa | Tamanho | Arquivo | Comprimido | Pedaços | Pedaço mediano | Maior pedaço |
|---|---|---|---|---|---|---|
| `ilha-650.mapa` | 650×650 | 217 KB | 48 KB | 441 | 209 B (138 comprimido) | 12,7 KB (1,9 comprimido) |
| `ilha.mapa` | 200×200 | 14,5 KB | 4,3 KB | 49 | 61 B | 2,2 KB |
| `gruta.mapa` | 48×34 | 1,5 KB | 0,6 KB | 4 | 480 B | 1,0 KB |

O mar pesa quase nada; o pedaço mais pesado é o de Pedra Alta, com as peças.

### Uma caminhada

Do início do jogador, de marco em marco (o mais perto que ainda não foi
visitado), em linha reta pela ilha de 650: 123 marcos, 849 tiles, uns 4,7
minutos andando. O servidor manda todo pedaço com algum tile dentro do
alcance.

| Alcance | Pedaços mandados | Total comprimido | Para começar a jogar |
|---|---|---|---|
| 60 tiles (o que o jogo desenha) | 81 de 441 | 29 KB | 10 KB |
| 96 tiles (com folga, para chegar antes de aparecer) | 128 de 441 | 37 KB | 16 KB |

**A banda do mapa não é problema.** É menos que dez segundos do retrato do
mundo da sondagem 2.

### O motor recebendo um pedaço

A ilha de 650 aberta com um pedaço de 32×32 apagado (mar fundo); o jogador
parado ali, com o alcance já montado; então as grades de verdade chegam e o
motor refaz o que mudou (`atualizarTerreno` e `remontarSujos`).

| Pedaço | Refazer | Tiles de chão diferentes da ilha inteira |
|---|---|---|
| 1,1 (mar) | 7,1 ms | 0 |
| 9,6 (serra) | 5,0 ms | 0 |
| 6,15 (Pedra Alta) | 8,5 ms | 0 |

Cabe num quadro. Montar o alcance inteiro ao abrir o mapa custa uns 300 ms,
mas isso já acontece hoje, na tela de entrada.

### A silhueta além da névoa

A silhueta do relevo no horizonte precisa enxergar mais longe que os
pedaços recebidos. Um resumo do relevo resolve: a maior altura de cada bloco,
um byte por bloco, uma vez por mapa.

| Bloco | Tamanho | Comprimido |
|---|---|---|
| 8×8 tiles | 82×82 = 6,6 KB | 0,7 KB |
| 16×16 tiles | 41×41 = 1,6 KB | 0,3 KB |

### Os segredos de hoje

Nenhum dos três mapas tem passagem secreta ainda, e o motor não faz nada com
o marco `segredo` do `MAPA 2`: ele só é guardado, com o sorteio pronto em
`sortearSegredos`. Então a regra do segredo pode nascer já do lado do
servidor, sem nada para desfazer no cliente.

## O que isso muda

| O quê | Quando | Tamanho |
|---|---|---|
| O jogo online deixa de embutir os mapas; o `build.js` continua embutindo para jogar sozinho e para o "Ver no jogo" do canteiro | no co-op | pequeno |
| Receber pedaço: grades, peças e coisas de um pedaço entram no mapa aberto, e o motor chama o `atualizarTerreno` que já existe | no co-op | pequeno |
| O servidor manda os pedaços pelo alcance, com folga, e o resumo do relevo | no co-op | pequeno |
| A passagem secreta: parede até alguém achar; achou, o pedaço vai de novo | quando a regra do segredo for decidida | pequeno |
| **O que mais é segredo e está no cliente:** as falas dos moradores (`conversa.js`) — a charada que muda pelo item no inventário, a resposta de um enigma — e, quando existirem, a tabela de loot e o gerador do continente com a semente da era | ao escrever missão, enigma e loot | depende |

A última linha é a que pede cuidado desde já: **conversa, charada, loot e
gerador são o conteúdo que a tese quer proteger**. Escrever essas regras
desde o começo como coisa que roda no servidor (o jogo pergunta, o servidor
responde) custa pouco agora e caro depois.

**O que não precisa mudar:** o `MAPA 2`, o canteiro, o motor em pedaços, o
refazer-só-o-que-mudou. Foram eles que deixaram esta resposta curta.

## Os arquivos

| Arquivo | O que é |
|---|---|
| `pedacos.js` | A sondagem: reparte os mapas, simula a caminhada, mede o motor recebendo pedaços |
| `pedacos.json` | Os números da última rodada |

Para rodar de novo: `node mundo-perigoso/build.js` e
`node mundo-perigoso/sondagens/3-mapa/pedacos.js`.
