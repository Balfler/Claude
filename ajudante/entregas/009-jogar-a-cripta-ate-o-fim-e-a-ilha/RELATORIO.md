# Relatorio da entrega 009 -- Jogar a cripta ate o fim, e a ilha

- chegou ao fim: sim
- tempo: 37 s (cripta) + 120 s (ilha)
- mortes: 0
- quantas coisas estranhas: 2
- desvios: nenhum

## Coisas estranhas

1. **Restricao estrita de altura (z) no sistema de dialogo:**
   - **O que fez:** Tentativa de falar com moradores em Pedra Alta com variacao na altura vertical `z`.
   - **O que esperava:** Que ao aproximar-se visualmente do morador (em raio horizontal de 3 tiles), o morador respondesse.
   - **O que aconteceu:** O codigo de busca de interlocutor em `p5.js` (linha 607) exige estritamente `Math.abs(e.z - P.z) < 1.5`. Como Pedra Alta fica no plato z=3 e a capela em z=4.75 (enquanto o nivel do mar e pier ficam em z=1), se o jogador estiver em degrau ou desnivel acima de 1.5 tiles, a fala e totalmente ignorada ("fingem que nao ouviram").
   - **Print:** `04_ilha_guarda_anselmo.png` e `10_ilha_irma_clarice.png`.

2. **Ativacao do portal de saida da Cripta:**
   - **O que fez:** Chegou diante do portal de saida `x` em (38, 28) e apertou `e`.
   - **O que esperava:** Que a saida ativasse imediatamente (`G.mode = "won"`).
   - **O que aconteceu:** A ativacao da celula `x` via `useDoor()` exige que o vetor a frente `P.x + cos(ang)*0.9` caia exatamente dentro do tile `x` e que o jogador esteja vivo (`G.mode === "play"`). Se o jogador sofrer dano fatal de projetil residual ao entrar na camara do portal (`G.mode === "dead"`), a tecla `e` nao tem efeito e o portal nao conclui a fase ate reiniciar com `r`.
   - **Print:** `20_cripta_portal_saida.png` e `21_cripta_vencida_won.png`.

## Palavras-chave dos moradores

### Josias, o barqueiro (Pier)
- **Funcionou:**
  - `oi`: "Ahoy! O {navio} ainda não zarpa."
  - `navio`: "Só quando a maré virar. Volte quando estiver pronto para o continente."
  - `trabalho`: "Levo gente para o continente, quando o mar deixa."
  - `nome`: "Me chamo Josias, o barqueiro."
  - `tchau`: "Até mais."
- **Nao funcionou:** `batata` (sem resposta; ignorado corretamente).

### Guarda Anselmo (Portao de Pedra Alta)
- **Funcionou:**
  - `oi`: "Alto lá. Bem-vindo a Pedra Alta. Pergunte da {cidade} ou da {cripta}."
  - `cidade`: "Armazém, taverna e ferraria ficam na praça. A capela, no alto."
  - `cripta`: "Fica debaixo da capela. A Irmã Clarice guarda a descida."
  - `trabalho`: "Eu guardo o portão."
  - `nome`: "Me chamo Guarda Anselmo."
  - `tchau`: "Até mais."
- **Nao funcionou:** `ouro` (sem resposta).

### Tobias, o lojista (Armazem)
- **Funcionou:**
  - `oi`: "Bem-vindo ao armazém! Diga {comprar} para ver o que tenho."
  - `comprar` / `loja`: "Tenho {poção} de cura por 10 moedas e {cristal} de mana por 15."
  - `pocao`: "Aqui está: poção de cura, por 10 moedas." (compra efetuada, adicionada a bolsa)
  - `cristal`: "Aqui está: cristal de mana, por 15 moedas." (compra efetuada, adicionada a bolsa)
  - `trabalho`: "Vendo o que o navio traz, quando traz."
  - `nome`: "Me chamo Tobias, o lojista."
  - `tchau`: "Até mais."
- **Nao funcionou:** nenhuma falhou.

### Uso da Bolsa (tecla B)
- **O que aconteceu:** Abertura com `b` exibe painel HUD superior direito com 0 Ouro (apos compras), `x1` Pocao de Cura e `x1` Cristal de Mana (print `06_ilha_bolsa_aberta.png`). Fechamento com `b` funciona perfeitamente.

### Velho Amadeu (Praca/Ruas)
- **Funcionou:**
  - `oi`: "Hein? Ah, um forasteiro. Na minha época esta {ilha} era só pedra e gaivota."
  - `ilha`: "O povo chegou pelo mar, fugido do {rei} demônio."
  - `rei`: "Não se diz o nome dele. Ele espera. Um dia a lua fica vermelha."
  - `trabalho`: "Vivo aqui em Pedra Alta."
  - `nome`: "Me chamo Velho Amadeu."
  - `tchau`: "Até mais."
- **Nao funcionou:** `magia` (sem resposta).

### Celeste, a taverneira (Taverna do Javali)
- **Funcionou:**
  - `oi`: "Senta aí. Quer {cerveja}, ou veio pelos {boatos}?"
  - `cerveja`: "Acabou. O navio não veio."
  - `boatos`: "Dizem que algo acordou debaixo da capela. E o Josias jura que o mar anda estranho."
  - `trabalho`: "Vivo aqui em Pedra Alta."
  - `nome`: "Me chamo Celeste, a taverneira."
  - `tchau`: "Até mais."
- **Nao funcionou:** `comida` (sem resposta).

### Bruno, o ferreiro (Ferraria)
- **Funcionou:**
  - `oi`: "Hmpf. Ferraria. Tenho {escudo}, se tiver moeda."
  - `escudo`: "Custa 20 moedas, e você não tem." (recusa correta por falta de moedas)
  - `trabalho`: "Martelo e fogo, desde menino."
  - `nome`: "Me chamo Bruno, o ferreiro."
  - `tchau`: "Até mais."
- **Nao funcionou:** `espada` (sem resposta).

### Irma Clarice, a sacerdotisa (Capela)
- **Funcionou:**
  - `oi`: "Que a luz te guarde. Posso te dar {cura}, ou falar da {cripta}."
  - `cura`: "Pronto. Vá com a luz." (efeito de cura executado)
  - `cripta`: "Três criptas abaixo da capela. A escada fica atrás de mim. Desça só se estiver pronto."
  - `trabalho`: "Vivo aqui em Pedra Alta."
  - `nome`: "Me chamo Irma Clarice, a sacerdotisa."
  - `tchau`: "Até mais."
- **Nao funcionou:** `pecado` (sem resposta).

## Jornada na Cripta (Passo a Passo)
1. **Inicio no spawn:** Entrada (7.5, 29.5) -> print `11_cripta_inicio.png`.
2. **Salao dos Pilares:** Avanco pelo corredor sul ate o salao (7.5, 17.5) -> print `12_cripta_salao_dos_pilares.png`.
3. **Porta D:** Interacao com a tecla `e` na porta em (16, 17) -> print `13_cripta_porta_d_aberta.png`.
4. **Biblioteca e Camara de Lava:** Entrada na biblioteca e subida ao norte para a lava -> print `14_cripta_camara_de_lava.png`.
5. **Chave Runica:** Pulo sobre a lava e coleta da chave `k` em (27.5, 6.5); mensagem "CHAVE RUNICA OBTIDA" -> print `15_cripta_chave_runica_obtida.png`.
6. **Porta Selada L:** Retorno ao sul ate (34.5, 21.0), destrancamento do selo com a chave `k` -> prints `16_cripta_selo_fechado.png` e `17_cripta_selo_aberto.png`.
7. **Encontro com Vhalgorn:** Entrada na camara final e confronto contra o chefe Vhalgorn (560 HP) -> print `18_cripta_vhalgorn_encontro.png`.
8. **Derrota de Vhalgorn:** Mensagem "O SELO DA CRIPTA SE ROMPE. O PORTAL AGUARDA." -> print `19_cripta_vhalgorn_derrotado.png`.
9. **Portal de Saida:** Avanco ate a celula `x` em (38.5, 28.5) e ativacao da saida com `e` -> prints `20_cripta_portal_saida.png` e `21_cripta_vencida_won.png` (tela "A CRIPTA FOI VENCIDA", `G.mode = "won"`).

## Entregou
- `RELATORIO.md`
- 21 imagens em `prints/`
- `PRONTO`
