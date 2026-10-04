# Sondagem 5 — o co-op na cripta

**Feita em 26/09/2026**, na nuvem, pelo Claude. **Versão 2** na madrugada seguinte:
cada um com o seu visual e o seu nome, fala para todos, golpe com compensação
de atraso, a contagem da cripta igual para todos e o fim da cripta em grupo.

## O que é

A primeira vez que o jogo roda com mais de um jogador. Um servidor em node,
sem dependência nenhuma, roda a cripta com o código do próprio jogo; cada
navegador que abre o endereço dele vira um jogador. Dá para jogar em dupla
(ou em quatro) na mesma rede, ou pela internet com um túnel.

É protótipo: o jogo não foi reescrito. O servidor e a página do cliente
saem do jogo montado (`cripta-vhalgorn.html`) com uma costura — a da
sondagem 2 mais a deste co-op —, e nada em `src/` mudou.

## Como jogar

No terminal, na pasta `Claude`:

```
node mundo-perigoso/build.js
node mundo-perigoso/sondagens/5-coop/servidor.js
```

(`node .../servidor.js --preparo=0.45` muda o preparo do golpe dos bichos;
ver adiante.) O servidor escreve os endereços:

- **Nesta máquina:** `http://localhost:8124/`. Para testar sozinho, abra em
  duas abas; em uma delas, `http://localhost:8124/?atraso=120` soma 120 ms
  de ida e volta de mentira.
- **Na mesma rede** (o notebook e o PC, ou um amigo na sua casa): o
  endereço com o IP desta máquina, que o servidor mostra. Se não abrir, o
  firewall do Windows está bloqueando a porta 8124 — ele pergunta na primeira
  vez; é só permitir.
- **Pela internet:** o jeito mais simples, sem conta nem roteador, é um túnel
  grátis da Cloudflare: instalar o `cloudflared` e rodar
  `cloudflared tunnel --url http://localhost:8124`. Ele dá um endereço
  `https://....trycloudflare.com` que o amigo abre. O outro jeito é abrir a
  porta 8124 no roteador.

**O nome:** `?nome=Leandro` no fim do endereço (fica guardado no navegador;
da próxima vez não precisa). Sem nome, aparece "Jogador 1", "Jogador 2"...
Dentro do jogo, `/nome Fulano` na linha de fala troca.

**O visual:** abra `/provador` no mesmo endereço do jogo (por exemplo
`http://localhost:8124/provador`), escolha, e recarregue o jogo. Tem de ser
pelo servidor: o navegador guarda a escolha por endereço, e a feita no
`provador.html` aberto direto do disco não chega na página do co-op.

Enter começa. Jogo normal: WASD, mouse, pular, dash, armas 1 a 3, E para
porta. X mostra o próprio boneco em terceira pessoa. O topo da tela diz
quantos estão na cripta e o ping. **Enter, durante o jogo, abre a linha de
fala**, e o que se escreve vai para todos. Cada um aparece com o nome em
cima, na cor da vida (claro, amarelo, vermelho).

## Como funciona

- **O servidor roda o mundo** a 60 passos por segundo: os bichos, os
  projéteis, as portas e os itens, uma vez por passo para todos. Cada bicho
  persegue o jogador vivo mais perto.
- **Cada entrada do navegador** (teclado e mira, a cada 1/60 s, numerada)
  roda no servidor como um passo daquele jogador — o mesmo `passoDoJogador`
  do jogo.
- **O seu corpo é previsto:** o mesmo passo roda no navegador na hora, e
  você anda, pula e dá dash sem esperar a rede.
- **20 vezes por segundo** o servidor manda o retrato: onde estão os
  outros, os bichos, os projéteis, as portas e o que sumiu, mais o seu
  estado depois da última entrada que ele processou. O navegador põe o corpo
  ali e roda de novo por cima as entradas que o servidor ainda não viu. Como
  os dois lados rodam o mesmo código, **a previsão acerta sempre**: a
  correção medida andando, pulando e dando dash com 120 ms de atraso foi
  zero.
- **Os outros e os bichos** são desenhados 100 ms no passado, entre dois
  retratos, para não tremer.
- **O golpe é do servidor.** No navegador ele só faz o efeito (a animação e
  o som saem na hora); o acerto e o dano chegam no retrato.
- **O golpe acerta onde você via o bicho.** Junto de cada entrada vai o
  passo do servidor que a sua tela está mostrando. Quando o golpe corpo a
  corpo sai, o servidor volta os bichos para aquele passo (guarda 40 passos
  de história, e volta no máximo 30, meio segundo), escolhe o alvo ali, e
  devolve todos; o dano cai no presente. No teste, o golpe de quem estava
  sem atraso voltou 8 a 10 passos (os 100 ms da interpolação mais a idade do
  retrato), e o de quem estava com 120 ms, 15 a 18. `--sem-compensacao`
  desliga, para comparar. É o jeito que a sondagem 2 indicou; o projétil não
  volta, porque anda no mundo do presente.
- **Cada um com o seu visual:** o navegador manda a escolha do provador ao
  entrar, e os outros assam o boneco dele com a arma que ele está usando, nas
  poses de andar, correr, pular, atacar e conjurar.
  Quem tem o mesmo visual divide a fornada; trocando de arma, fica a velha
  até a nova ter o que mostrar.
- **A contagem é da cripta:** mortes, itens e segredos vêm do servidor, e
  são os mesmos no painel de todos.
- **O fim em grupo:** quando alguém atravessa o portal, todos vencem e veem
  a tela de fase concluída com a contagem do grupo; em 15 segundos a cripta
  recomeça para todos, com todo mundo na entrada.
- **Quem morre** volta na entrada depois de 4 segundos.

## O teste

`testar.js` sobe o servidor (com `--preparo=0.45`) e abre dois navegadores
sem tela: Ana, sem atraso e com um visual escolhido (armadura de couro, elmo
fechado, capa), e Bia, com 120 ms simulados. Vinte e duas conferências,
todas passando:

| Conferência | Resultado |
|---|---|
| Quem está na tela de título não está no mundo: o corpo só entra no Enter (29/9) | sim |
| As duas entram, cada uma vê 2 jogadores | sim |
| O mundo do cliente e o do servidor batem (entidade por entidade) | sim |
| O preparo escolhido no servidor chega nos navegadores | 0,45 s |
| Ana anda, e Bia vê Ana onde Ana se vê | diferença de 0,004 tile |
| Bia anda, pula e dá dash com 120 ms, e a previsão não corrige | correção de 0,000 tile |
| Bia vê Ana com o nome e o visual dela | "Ana", couro, elmo fechado, capa |
| A fala de Ana chega para Bia | sim |
| `/nome Beatriz`, e Ana vê o nome novo | sim |
| Ana bate num diabrete, e Bia vê o bicho morrer | vida 30 → morto |
| A contagem de mortes é a mesma nas duas | 1/20 e 1/20 |
| Bia, com 120 ms, bate num diabrete, e Ana vê | vida 30 → morto |
| O servidor volta os bichos mais para quem tem atraso | Ana 8,7 passos em média, Bia 16,8 |
| Bia vê Ana de perto, na frente, desenhada | a 2,2 tiles, bem no meio da tela |
| Ana atravessa o portal, e as duas venceram | sim |
| A cripta recomeça junto, contagem zerada | rodada 2 nas duas, 0 mortes |
| Depois do recomeço, Ana vê Bia andar onde Bia se vê | diferença de 0,005 tile |
| O servidor também serve o provador | sim |
| Nenhum erro nas páginas | nenhum |

No teste ninguém morre e a cripta recomeça em 3 s (`--teste`): na primeira
versão do teste, A morreu no meio da briga, renasceu na entrada, e B foi
procurá-lo no lugar errado.

O teste grava fotos: `visto-por-B.png` (Ana vista por Bia: o elmo fechado,
o nome em cima, a fala no canto) e `vencida.png` (a tela de fase concluída
no co-op). Elas não foram para o Drive (subir imagem daqui sai caro);
rodando o `testar.js` na sua máquina, elas aparecem nesta pasta.

### Os números

| | |
|---|---|
| Passo do servidor com 2 jogadores e 20 bichos | 0,2 a 0,3 ms (de 16,7) |
| Retrato que cada navegador recebe | uns 32 KB/s, em JSON |
| O que o servidor manda, com 2 jogadores | 50 a 70 KB/s |
| Ping medido na mesma máquina | 14 a 19 ms (é a página ocupada, não a rede) |

## O que ainda não tem

| O quê | Por quê importa | Tamanho |
|---|---|---|
| **Projétil previsto.** O raio do cajado só aparece quando o servidor o cria: uma ida e volta depois do clique | a magia parece atrasada | médio |
| **O preparo dos golpes dos bichos** (0,19 s), que não se esquiva nem sem rede | ver a sondagem 2; agora dá para sentir em grupo com `--preparo=0.45` | decisão sua |
| **O saque em grupo:** hoje o item é de quem pega primeiro, e a chave rúnica é de quem a pegou (o selo, depois de aberto, fica aberto para todos) | quem fica com o quê | decisão sua |
| **Fogo amigo, empurrão entre jogadores** | hoje um atravessa o outro, e a magia não fere o outro | decisão sua |
| **A explosão da bola de fogo no co-op** não fere jogador nenhum: a conta dela olha só o jogador global, que no servidor é um fantasma parado na entrada (no jogo sozinho, ela fere quem está perto, até quem lançou) | vem junto com a decisão do fogo amigo | pequeno |
| **O retrato em binário, só com o que mudou** | 32 KB/s viram uns 5 | médio |
| **O servidor confiar menos no navegador:** hoje ele aceita a entrada como vem | entre amigos não importa; aberto ao público, sim | médio |
| **A ilha e as outras dungeons:** o servidor só roda a cripta | o mundo | vem com o mapa aos pedaços (sondagem 3) |
| **A costura vira código de verdade** | é o item 3 de *pedido pelas sondagens* no `PLANEJAMENTO.md` | médio |

## Os arquivos

| Arquivo | O que é |
|---|---|
| `servidor.js` | O servidor: http para a página, WebSocket para o jogo, o mundo a 60 passos por segundo |
| `ws.js` | O WebSocket feito à mão (o protocolo, sem biblioteca) |
| `costura-coop.js` | A costura do co-op sobre a da sondagem 2, e a montagem da página do cliente |
| `cliente.js` | O que entra no jogo no navegador: previsão, retratos, os outros jogadores, nomes, fala, a contagem |
| `testar.js` | O teste com dois navegadores sem tela (precisa do playwright) |
| `teste.json` e as fotos | O resultado do teste, gravado cada vez que ele roda |

O servidor lê o jogo montado ao subir: depois de mexer no `src/`, é rodar o
`build.js` de novo e reiniciar o servidor.
