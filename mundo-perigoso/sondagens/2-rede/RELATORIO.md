# Sondagem 2 — a rede: o servidor e o atraso

**Feita em 26/09/2026**, na nuvem, pelo Claude.

## As perguntas

1. **O servidor consegue rodar o mesmo código do jogo** com vários
   jogadores? E quanto custa em processador e em banda?
2. **O combate se sente bem com 100 a 150 ms de atraso?** É o risco que o
   `DESIGN.md` manda medir "antes de encher o mundo de conteúdo".

## Resposta curta

1. **Sim, e sobra.** Com uma costura mecânica (`costura.js`) o jogo de um
   jogador vira um de N jogadores sem reescrever nada: 64 jogadores e os 20
   bichos da cripta acordados custam **0,35 ms por passo** (2% de um
   núcleo), e cada jogador recebe **uns 4 a 10 KB/s** em binário. A
   estimativa do `DESIGN.md` (3 KB/s) estava certa.
2. **Não do jeito que está — e o problema já existe sem rede.** O golpe dos
   bichos leva **0,19 s** do começo ao acerto. Medido com um robô de reação
   humana (0,2 s): **0% de esquiva, com ou sem atraso**. Com rede, nem
   reação perfeita salva (de 31% sem atraso para 3% com 150 ms). O remédio
   é de design, e é seu: **preparo de golpe mais longo** (uns 0,45 a 0,5 s
   para 100 a 150 ms), **servidor perto dos jogadores**, ou os dois.
3. **Para sentir jogando:** `atraso.html`, a cripta de verdade com o atraso
   simulado, e teclas para mudar o atraso e o preparo na hora.

## 1. O servidor rodando o código do jogo

### A costura

O jogo usa um jogador global, `P`, em uns 430 lugares. Quase tudo está em
poucas funções:

| Função | Usos de `P` | O que é |
|---|---|---|
| `update` (o passo) | 183 | movimento, pulo, dash, degrau, lava, tiro, mana |
| `fire`, `pickup` | 17 cada | atacar, pegar item |
| `hurtPlayer` | 13 | levar dano |
| `aplicarAcao`, `dizer`, `usarItem` | 11, 11, 9 | ações: usar, pular, trocar arma, falar |
| `updateEnemy` | 10 | a IA mira no jogador |
| `useDoor`, `pecaQueAbreNaFrente` | 8, 8 | portas |
| HUD, arma, automapa | ~40 | só o cliente desenha |

A costura usa uma propriedade do JavaScript: dentro de uma função com um
parâmetro chamado `P`, todo `P.` fala do parâmetro. Então **o corpo das
funções continua igual, só a assinatura muda**:

- o passo do jogador sai de dentro de `update()` e vira
  `passoDoJogador(P, dt, entrada)`;
- o passo do mundo (agenda, portas, bichos, itens, projéteis) vira
  `passoDoMundo(dt)`, uma vez por passo para todos;
- cada bicho mira no jogador vivo mais perto, e o golpe agendado dele acerta
  quem ele mirou;
- o projétil do bicho testa todos os jogadores.

Ficaram de fora de propósito, ainda no jogador global: usar porta, falar,
pegar item e o fervor.

### Os números

A cripta com N jogadores robôs (andam, viram, atiram, dão dash e pulam ao
acaso), 60 passos por segundo, retrato do mundo a 20 por segundo num raio de
30 tiles. Node 22, máquina da nuvem (Xeon, 4 núcleos).

| Jogadores | Passo médio | Pior | Retrato JSON | Retrato binário |
|---|---|---|---|---|
| 1 | 0,05 ms | 2,0 ms | 10 KB/s | 4,1 KB/s |
| 4 | 0,06 ms | 1,1 ms | 13 KB/s | 5,4 KB/s |
| 16 | 0,11 ms | 1,9 ms | 23 KB/s | 9,2 KB/s |
| 64 | 0,36 ms | 1,8 ms | 66 KB/s | 25 KB/s |
| 20, cada um ao lado de um bicho (todos acordados) | 0,13 ms | 0,9 ms | 27 KB/s | 10 KB/s |
| 64, idem | 0,35 ms | 2,3 ms | 62 KB/s | 24 KB/s |

O orçamento do passo é 16,7 ms. **O processador do servidor não é o
limite**; a banda cresce com quantos jogadores se veem, e o binário é
2,5 vezes menor que o JSON. Mandar só o que mudou encolheria mais.

## 2. O atraso

### O simulador

`atraso.html` é o jogo montado com `atraso.js` costurado dentro. Faz a
cripta se comportar como se o jogo rodasse num servidor longe, do jeito
normal dos jogos de ação:

- **O seu corpo é previsto:** anda, pula e dá dash na hora.
- **Bichos e projéteis aparecem no passado:** a ida, mais 50 ms de folga
  para interpolar entre dois retratos. Medido: a 150 ms, a aranha que está
  brigando com você aparece até 0,41 tile atrás de onde está.
- **O seu golpe vale quando chega no servidor.** A animação e o som saem
  na hora. Com a **compensação** ligada, o servidor volta o relógio dos
  bichos para o que você via na hora do clique, e acerta o que você mirou.
  Desligada, acerta onde o bicho está quando o clique chega.
- **O dano que você leva** é decidido pelo servidor, que vê você uma ida
  atrás, e a notícia volta com mais uma ida.
- O projétil do cajado e do grimório não é previsto: sai com o atraso
  inteiro. Num jogo de verdade ele sairia na hora, então aqui ele parece
  pior do que seria.

Com atraso zero, o jogo costurado passa na bateria `jogo.test.js` (67 de
67).

**Teclas:** `[` e `]` mudam o atraso (0, 50, 100, 150, 200, 300 ms), `\`
liga e desliga a compensação, `-` e `=` mudam o preparo do golpe dos bichos.
No endereço: `atraso.html?atraso=150&comp=0&preparo=0.5`.

### A esquiva, medida

Um robô fica na frente de um diabrete e, quando **vê** o golpe começar (no
mundo desenhado, atrasado), espera o tempo de reação e dá dash para trás.
Sessenta segundos de duelo por linha, uns 70 golpes cada.

Com o preparo de hoje, 0,19 s:

| Ida e volta | Reação perfeita: desviou | Reação humana (0,2 s): desviou |
|---|---|---|
| 0 ms | 31% | 0% |
| 50 ms | 22% | 1% |
| 100 ms | 14% | 0% |
| 150 ms | 3% | 0% |
| 200 ms | 3% | 0% |
| 300 ms | 4% | 0% |

O robô é tosco: mesmo no caso fácil ele não passa de uns 20 a 30%, então a
tabela vale pelo desenho, não pelo número. E o desenho diz que **com 0,19 s
de preparo ninguém desvia por reflexo**, nem sem rede. Quem joga hoje desvia
por antecipação (o ritmo do bicho), e a rede come também essa margem.

Com reação humana e preparos maiores:

| Preparo | 0 ms | 100 ms | 150 ms | 200 ms | 300 ms |
|---|---|---|---|---|---|
| 0,35 s | 19% | 3% | 1% | 3% | 4% |
| 0,50 s | 19% | 15% | 22% | 3% | 3% |
| 0,70 s | 14% | 10% | 9% | 9% | 13% |

Onde o robô ainda consegue desviar, ele fica perto do teto dele; onde não
consegue, cai para uns 3%. A fronteira cai onde a conta abaixo diz: 0,35 s só
serve sem rede, 0,5 s aguenta até uns 150 ms, 0,7 s aguenta 300.

### Quanto de preparo precisa

A conta, sem robô: para desviar reagindo, o preparo tem de cobrir a reação,
o golpe chegando atrasado na tela, a esquiva chegando atrasada no servidor e
o tempo de sair do alcance.

> preparo ≥ reação (~0,25 s) + ida e volta + folga (0,05 s) + sair do alcance (~0,04 s)

| Ida e volta | Preparo mínimo |
|---|---|
| 0 ms (sozinho) | ~0,3 s |
| 50 ms | ~0,4 s |
| 100 ms | ~0,45 s |
| 150 ms | ~0,5 s |
| 200 ms | ~0,55 s |

Jogos de ação online usam preparos de meio segundo a um segundo nos golpes
feitos para serem esquivados, e deixam os rápidos para golpes pequenos, que
não se esquivam — só se evitam pela posição.

## O que isso muda

| O quê | Quem decide | Tamanho |
|---|---|---|
| **O preparo dos golpes dos bichos.** 0,19 s não se esquiva nem sozinho. Jogar o simulador com `-` e `=` e escolher | o Leandro, jogando | um número por bicho no `EDEF` |
| **Onde o servidor fica.** A Oracle tem regiões em São Paulo e em Vinhedo; a conta grátis tem uma região de casa. Com o servidor no Brasil, o atraso para quem joga no Brasil fica em torno de 10 a 70 ms | o Leandro, ao criar a conta | nada de código |
| **A costura vira código de verdade:** o passo do jogador recebe o jogador, o passo do mundo roda uma vez, `fire`, `hurtPlayer`, `aplicarAcao`, `pickup`, portas e fervor recebem o jogador | técnico | médio, mecânico, com os testes de hoje segurando |
| **Separar o `G`:** hoje ele mistura estado do mundo (tempo, agenda) com efeito de tela (clarão, tremor, mensagem, modo) | técnico | médio |
| **Os sons viram eventos por jogador** (hoje é uma lista só, `SONS`) | técnico | pequeno |
| **Compensação de atraso no ataque do jogador** e **projétil previsto** | técnico, no co-op | médio |

**O que não precisa mudar:** o motor, a física, o passo fixo, a entrada
como dado. As quatro mudanças "antes do multiplayer" que já estão feitas
foram exatamente o que deixou esta costura possível.

## Os arquivos

| Arquivo | O que é |
|---|---|
| `costura.js` | O jogo de um jogador vira de N jogadores, por texto, sem mexer no `src/` |
| `servidor-mudo.js` | O servidor sem rede: roda a cripta com N robôs e mede passo e banda |
| `servidor-mudo.json` | Os números da última rodada |
| `atraso.js` | O simulador de atraso, que entra dentro do jogo |
| `montar-atraso.js` | Monta o `atraso.html`, um arquivo só que abre direto do disco |
| `medir-esquiva.js` | O robô de esquiva no Chromium sem tela |
| `esquiva.json` | Os números da esquiva |

**Para jogar o simulador:** no terminal, na pasta `Claude`:

```
node mundo-perigoso/build.js
node mundo-perigoso/sondagens/2-rede/montar-atraso.js
```

e abrir `mundo-perigoso/sondagens/2-rede/atraso.html` no Chrome. Enter
começa. O `atraso.html` não vai para o Drive pronto porque tem 2 MB; ele sai
do jogo montado com esses dois comandos.

**Para medir de novo:** `node mundo-perigoso/sondagens/2-rede/servidor-mudo.js`
e, com o playwright, `node mundo-perigoso/sondagens/2-rede/medir-esquiva.js`.
