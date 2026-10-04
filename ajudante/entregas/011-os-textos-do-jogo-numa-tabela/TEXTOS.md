# Os textos do jogo numa tabela

Catalogação de todo texto visível pelo jogador em `mundo-perigoso/src/`, com códigos Unicode (`\uXXXX`) convertidos em caracteres acentuados.

## Contagem por arquivo no topo

| Arquivo | Quantidade de textos catalogados |
|---|---|
| `conversa.js` | 32 |
| `p1.html` | 1 |
| `p4.js` | 21 |
| `p5.js` | 44 |
| `p5b.js` | 6 |
| `provador.html` | 1 |
| `provador.js` | 17 |
| **Total geral** | **122** |

### Verificação de ocorrências de `say(`

- **Comando executado:** `git grep -n "say(" mundo-perigoso/src`
- **Total de linhas retornadas:** 31 (1 declaração da função `function say(t)` em `src/p4.js:156` e 30 invocações ativas)
- **Distribuição de chamadas `say(`:**
  - `src/p4.js`: 12 chamadas (mais a declaração)
  - `src/p5.js`: 12 chamadas
  - `src/p5b.js`: 6 chamadas

---

## Tabela detalhada de textos

| Arquivo:Linha | Texto | Onde aparece / Contexto |
|---|---|---|
| `conversa.js:17` | poção de cura | Loja - Nome de item para compra |
| `conversa.js:18` | cristal de mana | Loja - Nome de item para compra |
| `conversa.js:19` | escudo | Loja - Nome de item para compra |
| `conversa.js:25` | Alto lá. Bem-vindo a Pedra Alta. Pergunte da {cidade} ou da {cripta}. | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:26` | Armazém, taverna e ferraria ficam na praça. A capela, no alto. | Conversa - Palavra-chave/Fala [cidade] |
| `conversa.js:27` | Fica debaixo da capela. A Irmã Clarice guarda a descida. | Conversa - Palavra-chave/Fala [cripta] |
| `conversa.js:28` | Eu guardo o portão. | Conversa - Palavra-chave/Fala [trabalho] |
| `conversa.js:31` | Bem-vindo ao armazém! Diga {comprar} para ver o que tenho. | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:32` | Tenho {poção} de cura por 10 moedas e {cristal} de mana por 15. | Conversa - Palavra-chave/Fala [comprar] |
| `conversa.js:33` | Tenho {poção} de cura por 10 moedas e {cristal} de mana por 15. | Conversa - Palavra-chave/Fala [loja] |
| `conversa.js:36` | Vendo o que o navio traz, quando traz. | Conversa - Palavra-chave/Fala [trabalho] |
| `conversa.js:39` | Senta aí. Quer {cerveja}, ou veio pelos {boatos}? | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:40` | Acabou. O navio não veio. | Conversa - Palavra-chave/Fala [cerveja] |
| `conversa.js:41` | Dizem que algo acordou debaixo da capela. E o Josias jura que o mar anda estranho. | Conversa - Palavra-chave/Fala [boatos] |
| `conversa.js:44` | Hmpf. Ferraria. Tenho {escudo}, se tiver moeda. | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:46` | Martelo e fogo, desde menino. | Conversa - Palavra-chave/Fala [trabalho] |
| `conversa.js:49` | Que a luz te guarde. Posso te dar {cura}, ou falar da {cripta}. | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:51` | Três criptas abaixo da capela. A escada fica atrás de mim. Desça só se estiver pronto. | Conversa - Palavra-chave/Fala [cripta] |
| `conversa.js:54` | Hein? Ah, um forasteiro. Na minha época esta {ilha} era só pedra e gaivota. | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:55` | O povo chegou pelo mar, fugido do {rei} demônio. | Conversa - Palavra-chave/Fala [ilha] |
| `conversa.js:56` | Não se diz o nome dele. Ele espera. Um dia a lua fica vermelha. | Conversa - Palavra-chave/Fala [rei] |
| `conversa.js:59` | Ahoy! O {navio} ainda não zarpa. | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:60` | Só quando a maré virar. Volte quando estiver pronto para o continente. | Conversa - Palavra-chave/Fala [navio] |
| `conversa.js:61` | Levo gente para o continente, quando o mar deixa. | Conversa - Palavra-chave/Fala [trabalho] |
| `conversa.js:66` | Olá, forasteiro. | Conversa - Palavra-chave/Fala [oi] |
| `conversa.js:67` | Me chamo %nome%. | Conversa - Palavra-chave/Fala [nome] |
| `conversa.js:68` | Vivo aqui em Pedra Alta. | Conversa - Palavra-chave/Fala [trabalho] |
| `conversa.js:69` | Até mais. | Conversa - Palavra-chave/Fala [tchau] |
| `conversa.js:103` | Custa  | Conversa - Resposta do sistema de loja/cura |
| `conversa.js:104` | Aqui está:  | Conversa - Resposta do sistema de loja/cura |
| `conversa.js:107` | Pronto. Vá com a luz. | Conversa - Resposta do sistema de loja/cura |
| `conversa.js:110` | Hm? Não entendi. | Conversa - Resposta do sistema de loja/cura |
| `p4.js:131` | diabrete | EDEF - Nome de criatura |
| `p4.js:135` | goblin | EDEF - Nome de criatura |
| `p4.js:138` | aranha | EDEF - Nome de criatura |
| `p4.js:142` | morcego | EDEF - Nome de criatura |
| `p4.js:145` | cavaleiro espectral | EDEF - Nome de criatura |
| `p4.js:148` | VHALGORN | EDEF - Nome de criatura |
| `p4.js:151` | ADAGA RUNICA | WPN - Nome de arma equipável |
| `p4.js:152` | CAJADO ARCANO | WPN - Nome de arma equipável |
| `p4.js:153` | GRIMORIO DE CHAMAS | WPN - Nome de arma equipável |
| `p4.js:229` | "MAPA DO EDITOR: " + String(ILHA.nome | say() - Notificação/Alerta temporário na tela |
| `p4.js:518` | VOCE MORREU | say() - Notificação/Alerta temporário na tela |
| `p4.js:532` | O SELO DA CRIPTA SE ROMPE. O PORTAL AGUARDA. | say() - Notificação/Alerta temporário na tela |
| `p4.js:792` | NOME_DO_LUGAR | say() - Notificação/Alerta temporário na tela |
| `p4.js:819` | O SELO EXIGE A CHAVE RUNICA | say() - Notificação/Alerta temporário na tela |
| `p4.js:822` | SEGREDO ENCONTRADO! | say() - Notificação/Alerta temporário na tela |
| `p4.js:823` | O SELO SE ABRE | say() - Notificação/Alerta temporário na tela |
| `p4.js:873` | POCAO DE CURA +25 | say() - Notificação/Alerta temporário na tela |
| `p4.js:875` | CRISTAL DE MANA +30 | say() - Notificação/Alerta temporário na tela |
| `p4.js:877` | ESCUDO DE AZO +50 | say() - Notificação/Alerta temporário na tela |
| `p4.js:880` | ALMA DE FOGO! GRIMORIO DE CHAMAS OBTIDO | say() - Notificação/Alerta temporário na tela |
| `p4.js:882` | CHAVE RUNICA OBTIDA | say() - Notificação/Alerta temporário na tela |
| `p5.js:49` | VIDA | HUD do jogo |
| `p5.js:53` | MANA | HUD do jogo |
| `p5.js:58` | ESCUDO | HUD do jogo |
| `p5.js:62` | ARMAS | HUD do jogo |
| `p5.js:67` | SELO | HUD do jogo |
| `p5.js:73` | OK | HUD do jogo |
| `p5.js:133` | G.terceira ? "TERCEIRA PESSOA" : "PRIMEIRA PESSOA" | say() - Notificação/Alerta temporário na tela |
| `p5.js:198` | MORTES  | HUD do jogo |
| `p5.js:213` | A CRIPTA DE VHALGORN | Nome de lugar (título da cripta) |
| `p5.js:214` | PEDRA ALTA | Nome de lugar (vila da ilha) |
| `p5.js:228` | O barco deixou voce no porto. | Tela de título (apresentação e controles) |
| `p5.js:229` | Sob a capela, a cripta espera. | Tela de título (apresentação e controles) |
| `p5.js:230` | Diga OI aos moradores. | Tela de título (apresentação e controles) |
| `p5.js:232` | Tres criptas abaixo da capela, | Tela de título (apresentação e controles) |
| `p5.js:233` | algo antigo acordou. | Tela de título (apresentação e controles) |
| `p5.js:234` | Encontre a Chave Runica. Quebre o Selo. | Tela de título (apresentação e controles) |
| `p5.js:237` | PRESSIONE ENTER OU CLIQUE PARA COMECAR | Tela de título (apresentação e controles) |
| `p5.js:238` | WASD andar   | Tela de título (apresentação e controles) |
| `p5.js:240` | CLIQUE atacar   | Tela de título (apresentação e controles) |
| `p5.js:248` | VOCE MORREU | Tela de derrota (VOCÊ MORREU) |
| `p5.js:249` | VOCE MORREU | Tela de derrota (VOCÊ MORREU) |
| `p5.js:252` | PRESSIONE R PARA TENTAR DE NOVO | Tela de derrota (VOCÊ MORREU) |
| `p5.js:259` | FASE 1 CONCLUIDA | Tela de vitória (A CRIPTA FOI VENCIDA) |
| `p5.js:261` | O SELO FOI QUEBRADO | Tela de vitória (A CRIPTA FOI VENCIDA) |
| `p5.js:262` | O SELO FOI QUEBRADO | Tela de vitória (A CRIPTA FOI VENCIDA) |
| `p5.js:339` | WPN[a.i].n | say() - Notificação/Alerta temporário na tela |
| `p5.js:342` | WPN[P.wpn].n | say() - Notificação/Alerta temporário na tela |
| `p5.js:365` | MANA INSUFICIENTE | say() - Notificação/Alerta temporário na tela |
| `p5.js:421` | ARRASTE COM O MOUSE OU USE AS SETAS PARA OLHAR | say() - Notificação/Alerta temporário na tela |
| `p5.js:433` | e.fala.toUpperCase( | say() - Notificação/Alerta temporário na tela |
| `p5.js:602` | Você | Histórico de conversa - Nome do jogador local |
| `p5.js:624` | id === "pocao" ? "NENHUMA POCAO NA BOLSA" : "NENHUM CRISTAL NA BOLSA" | say() - Notificação/Alerta temporário na tela |
| `p5.js:629` | id === "pocao" ? "POCAO DE CURA +25" : "CRISTAL DE MANA +30" | say() - Notificação/Alerta temporário na tela |
| `p5.js:663` | >  | HUD do jogo |
| `p5.js:670` | BOLSA | Painel da bolsa (inventário aberto com B) |
| `p5.js:672` | POCAO DE CURA | Painel da bolsa (inventário aberto com B) |
| `p5.js:673` | CRISTAL DE MANA | Painel da bolsa (inventário aberto com B) |
| `p5.js:704` | AJUSTES DE VOLTA AO PADRAO | say() - Notificação/Alerta temporário na tela |
| `p5.js:709` | AJUSTE.quadro ? "CONTADOR DE QUADRO LIGADO" : "CONTADOR DE QUADRO DESLIGADO" | say() - Notificação/Alerta temporário na tela |
| `p5.js:715` | textoDoAjuste("esc" | say() - Notificação/Alerta temporário na tela |
| `p5.js:724` | textoDoAjuste(campo | say() - Notificação/Alerta temporário na tela |
| `p5.js:738` | AJUSTE | Painel de ajustes (menu P) |
| `p5.js:739` | P FECHA | Painel de ajustes (menu P) |
| `p5.js:747` | L VOLTA TUDO AO PADRAO | Painel de ajustes (menu P) |
| `p5b.js:42` | P.god ? "MODO DEUS LIGADO" : "MODO DEUS DESLIGADO" | say() - Notificação de atalho/tecla |
| `p5b.js:47` | P.noclip ? "ATRAVESSAR PAREDES LIGADO" : "ATRAVESSAR PAREDES DESLIGADO" | say() - Notificação de atalho/tecla |
| `p5b.js:52` | G.vitrine ? "MODO VITRINE LIGADO" : "MODO VITRINE DESLIGADO" | say() - Notificação de atalho/tecla |
| `p5b.js:57` | ARSENAL COMPLETO | say() - Notificação de atalho/tecla |
| `p5b.js:62` | AU.on ? "SOM LIGADO" : "SOM DESLIGADO" | say() - Notificação de atalho/tecla |
| `p5b.js:118` | NOME_DO_LUGAR | say() - Notificação de atalho/tecla |
| `p1.html:1` | A Cripta de Vhalgorn | HTML - Título da janela |
| `provador.html:1` | Provador | HTML - Título da janela do provador |
| `provador.js:15` | Túnica | Provador - Opção visual de vestuário/arma |
| `provador.js:15` | Camisa | Provador - Opção visual de vestuário/arma |
| `provador.js:15` | Só a roupa | Provador - Opção visual de vestuário/arma |
| `provador.js:15` | Couro | Provador - Opção visual de vestuário/arma |
| `provador.js:15` | Cota de malha | Provador - Opção visual de vestuário/arma |
| `provador.js:19` | Grimório | Provador - Opção visual de vestuário/arma |
| `provador.js:19` | Pena | Provador - Opção visual de vestuário/arma |
| `provador.js:19` | Faixa | Provador - Opção visual de vestuário/arma |
| `provador.js:19` | Brasão | Provador - Opção visual de vestuário/arma |
| `provador.js:38` | de frente | Provador - Legenda do ângulo da câmera |
| `provador.js:38` | três quartos | Provador - Legenda do ângulo da câmera |
| `provador.js:38` | de lado | Provador - Legenda do ângulo da câmera |
| `provador.js:38` | costas e lado | Provador - Legenda do ângulo da câmera |
| `provador.js:38` | de costas | Provador - Legenda do ângulo da câmera |
| `provador.js:38` | costas e lado | Provador - Legenda do ângulo da câmera |
| `provador.js:38` | de lado | Provador - Legenda do ângulo da câmera |
| `provador.js:38` | três quartos | Provador - Legenda do ângulo da câmera |
