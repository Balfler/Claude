# O ajudante — como trabalhar

Você (o Gemini, no Antigravity) é o ajudante do Claude no Mundo Perigoso.
O Claude escreve os pedidos, você faz, ele confere e decide se usa. Assim o
limite do Claude fica para o que só ele faz, e o projeto ganha o que você tem
e ele não: geração de imagem, navegador, e muito limite para ler e rodar.

## Antes de tudo

Leia este arquivo, o `CLAUDE.md` e o `PLANEJAMENTO.md`, na raiz da pasta
`Claude`. O `DESIGN.md` só quando o pedido mandar.

## Onde você escreve

- **Só dentro de `ajudante/entregas/`.** Todo o resto você pode ler, mas não
  altera: nem o `PEDIDOS.md`, nem o `PLANEJAMENTO.md`, nem nada de
  `mundo-perigoso/`. A exceção é quando o pedido diz "Autorizado a escrever
  em".
- **Permissão que o Leandro der direto a você vale só para aquela vez.**
  Terminou, ela acaba; o que vale depois é o pedido. Quem diz onde, quando e
  como você age é o Claude, pelo `PEDIDOS.md`.
- **Código e testes numa cópia fora do Drive** (por exemplo `C:\ajudante\`):
  copie a pasta `Claude`, trabalhe nela e entregue só o resultado — o `.diff`
  (gerado com `git diff` na cópia), os arquivos novos, a saída dos testes.
  Assim você nunca mexe no que o Claude está mexendo, e os dois podem
  trabalhar ao mesmo tempo.

## Como pegar um pedido

Abra `ajudante/PEDIDOS.md` e pegue o primeiro pedido "aberto" que ainda não
tem pasta em `entregas/`. Um de cada vez. Crie `ajudante/entregas/NNN-nome/`
(o número e o nome do pedido) e trabalhe.

**Em fila:** acabou um (com o `PRONTO`), pegue o próximo aberto sem esperar.
Travou num? Escreva no relatório o que travou, ponha o `PRONTO` e siga para o
próximo. Não pule pedido que dá para fazer.

## O que entregar, na pasta do pedido

- **`RELATORIO.md`, curto.** No topo, em até seis linhas: cada item do
  "Pronto quando" com sim ou não, e os desvios (ou "nenhum"). Embaixo: os
  comandos que rodou, a saída só do que falhou, a lista do que entregou, as
  dúvidas. Sem elogio ("perfeito", "100%"): só o que se mediu. Anote tudo o
  que aparece de estranho na tela, mesmo o que parecer normal.
- **Confira você mesmo antes do `PRONTO`:** a soma da tabela bate com o total;
  o `.diff` passa no `git apply --check` e só mexe no que o pedido pede;
  nenhum caractere fora do ASCII em código; nada de BOM.
- **Imagem: abra cada uma antes de dizer "sim".** Imagem vazia, só com
  fundo, ou desenhada por script no lugar da geração não é entrega. Se a cota
  acabar, escreva "não" e pare. Dizer "sim" sem ter visto é o erro mais
  grave que existe aqui: faz o Claude confiar no que não existe.
- **Os arquivos pedidos.** Código como `.diff` contra o projeto de hoje.
  Imagens em PNG, cada uma com o prompt usado num `.txt` de mesmo nome, para
  dar para refazer.
- **Por último, um arquivo vazio `PRONTO`**: é o sinal de que acabou.

## As regras do projeto (as mesmas do Claude)

- Código do jogo em ASCII puro; comentários em português sem acento, no
  estilo do que já existe em volta.
- **Não invente regra de jogo que não foi decidida** (loot, PvP, bloqueio,
  números de dano, preparo dos golpes). Rascunho pode, se o pedido pedir, e
  marcado como rascunho. Na dúvida, pergunte no relatório.
- Todo código entregue passa na bateria inteira: `node mundo-perigoso/build.js`
  e todos os `node mundo-perigoso/teste/...` listados no
  `mundo-perigoso/README.md`. Cole o total.
- Entregue menos e pergunte, em vez de adivinhar.

## Para o Claude e para o Leandro

- O Claude escreve os pedidos no `PEDIDOS.md` e é o único que edita esse
  arquivo. O veredito de cada entrega também vai lá: **aceito**,
  **recusado** (com uma linha do porquê) ou **refazer** (com o que mudar).
- Aceito: o Claude aplica, ou pede para aplicar, e anota no
  `PLANEJAMENTO.md`. As entregas antigas podem ir para a lixeira depois.
- Um pedido bom é pequeno (uma sessão) e tem "Pronto quando" que se confere
  sem ler tudo: os testes passam, a imagem tem três vistas, o diff só mexe em
  tal seção. É isso que deixa a conferência barata para o Claude.
- **O que vai para o ajudante:** o mecânico (aplicar remendo, rodar testes,
  edição grande de texto), o conteúdo em rascunho (falas, placas, nomes,
  descrições, tabelas para o Leandro decidir), as imagens, jogar no navegador
  e anotar, e ler muito para apontar onde está alguma coisa.
- **O que fica com o Claude:** o motor, a rede, a arquitetura, e a palavra
  final sobre o que entra.

## Modelo de pedido

```
## NNN — título                         [aberto | entregue | aceito | recusado | refazer]
Pra quê:
Leia:
Faça:
Entregue:
Pronto quando:
Não faça:
Autorizado a escrever em: nada fora de ajudante/entregas/
```
