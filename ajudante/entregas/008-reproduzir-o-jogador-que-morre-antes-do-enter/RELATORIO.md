# Relatorio da entrega 008 -- Reproduzir o jogador que morre antes do Enter

- situacao B sem Enter por 60 s: sim
- situacao B com Enter imediato parada: sim
- quatro abas jogaram por 5 minutos: sim
- desvios: nenhum

## Passos exatos e o que aconteceu

### Caso 1: Aba B abre e nao aperta Enter por 60 s
1. Servidor subiu (`servidor.js --porta=8135`).
2. Aba A entrou, apertou Enter e avancou pelo corredor norte (3 s segurando `w`) acordando a aranha (`5.5, 27.5`) e o diabrete (`8.5, 24.5`).
3. Aba A recuou (3 s segurando `s`) trazendo os monstros ate a entrada (`7.5, 29.5`).
4. Aba B abriu a pagina e permaneceu na tela de titulo ("A CRIPTA DE VHALGORN -- Pressione ENTER para jogar") sem tocar no teclado por 60 s.
5. O que aconteceu no servidor: assim que B conectou e enviou `ola`, o servidor adicionou B na lista de jogadores (`x: 7.8, y: 29.5`). Os monstros na entrada miraram em B (jogador mais proximo). Aos 25 s, B tomou dano sucessivo e morreu (`hp: 0, dead: true`). Como o servidor reinicia o jogador morto apos alguns segundos na entrada, B renasceu e morreu novamente aos 35 s, 45 s e 55 s.
6. O que aconteceu no cliente de B: durante os 60 s inteiros, a tela de B ficou estatica no menu de titulo; como `reconciliar()` no cliente ignora pacotes quando `G.mode !== 'play'`, o objeto `P` local manteve `hp: 100`.
7. Ao apertar Enter em B aos 60 s: `G.mode` virou `'play'`, `reconciliar()` aplicou o estado enviado pelo servidor (`hp: 0, dead: true`) e B apareceu instantaneamente morto na tela com "VOCE MORREU" (prints `02_caso1_tabB_titulo_aos_60s.png` e `03_caso1_tabB_apos_enter.png`). Bug 100% confirmado.

### Caso 2: Aba B aperta Enter logo e fica parada
1. Servidor reiniciado. Aba A entrou e atraiu os mesmos monstros para a entrada.
2. Aba B abriu a pagina e apertou Enter imediatamente, ficando imovel no ponto de nascimento.
3. O que aconteceu: o cliente de B entrou em `modo: 'play'`. O jogador viu em tempo real no HUD a vida cair gradualmente (100% -> 42% -> 0% com face de dor/dano no HUD), caindo morto na tela (prints `04_caso2_tabB_levando_dano.png` e `05_caso2_tabB_morto.png`).
4. Comparacao com Caso 1: no Caso 2 o dano e a morte sao visiveis e interativos; no Caso 1 a morte ocorre de forma invisivel enquanto o jogador ainda le a tela de apresentacao.

### Caso 3: Quatro abas juntas (A, B, C, D) por 5 minutos (300 s)
1. Quatro abas conectadas simultaneamente na cripta, todas com Enter pressionado.
2. Durante 300 segundos, todas as abas alternaram movimento (`w`,`a`,`s`,`d`), pulo, dash, troca de armas (espada, cajado, arco), ataque (`z`) e mensagens de fala/chat (`/nome`, falas).
3. Achados e comportamentos estranhos:
   - Aos 88 s ocorreu uma morte tripla simultanea (Aba B, C e D morreram juntas encurraladas por enxame de monstros na entrada, print `08_caso3_morte_B_88s.png`).
   - O corpo morto permanece visivel no chao temporariamente antes de renascer.
   - O chat sincroniza entre todas as 4 abas perfeitamente, inclusive comandos `/nome`.
   - Inimigos trocam de alvo dinamicamente para o jogador vivo mais proximo.
   - Foram registradas 33 mortes ao longo dos 5 minutos devido a agressividade dos monstros no espaco reduzido da entrada/corredores.

## Comandos que rodou
- node mundo-perigoso/build.js
- node reproduzir.js (script automatizado com Playwright rodando servidor e 4 abas de Chromium)

## Prints entregues (em prints/)
- `01_caso1_tabA_aos_60s.png`: Aba A vendo os monstros atacando a posicao de B na entrada.
- `02_caso1_tabB_titulo_aos_60s.png`: Aba B na tela de titulo ("Pressione ENTER"), sem saber que ja morreu.
- `03_caso1_tabB_apos_enter.png`: Aba B imediatamente apos apertar Enter: exibe "VOCE MORREU".
- `04_caso2_tabB_levando_dano.png`: Aba B com Enter imediato, tomando dano visivel no HUD.
- `05_caso2_tabB_morto.png`: Aba B caindo morta apos o ataque continuado.
- `06_caso3_quatro_abas_inicio_A.png`: Visao da Aba A no inicio da partida com 4 jogadores.
- `07_caso3_quatro_abas_inicio_B.png`: Visao da Aba B no inicio da partida com 4 jogadores.
- `08_caso3_morte_B_88s.png`: Morte simultanea de jogadores encurralados por monstros.
- `09_caso3_meio_do_jogo_A.png`: Combate no meio da partida (visao A).
- `10_caso3_meio_do_jogo_B.png`: Combate no meio da partida (visao B).
- `11_caso3_fim_5min_A.png`: Final da sessao de 5 minutos (visao A).
- `12_caso3_fim_5min_B.png`: Final da sessao de 5 minutos (visao B).

## Entregou
- `RELATORIO.md`
- 12 imagens em `prints/`
- `PRONTO`
