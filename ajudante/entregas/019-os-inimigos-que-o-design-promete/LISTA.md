# Inimigos Prometidos no DESIGN.md

Levantamento completo dos inimigos citados no documento de design que ainda não existem no código do protótipo (os bichos da ilha já foram entregues no pedido 014 e não são repetidos aqui).

---

## 1. Tabela de Inimigos Prometidos

| Inimigo / Ameaça | Citação no `DESIGN.md` | Papel no Jogo / Mecânica | Conceito Visual 1 (Rascunho) | Conceito Visual 2 (Rascunho) |
|---|---|---|---|---|
| **Rei Demônio** | `DESIGN.md`: linhas 416, 427, 431, 437, 543, 547; `src/conversa.js:55` | O arqui-inimigo global do mundo. Comanda o avanço territorial contra o servidor, fortalece-se a cada semana e habita a fortaleza final que abre a batalha de fim de era. | **O Tirano Coroado:** Silhueta régia colossal, chifres pontiagudos curvados formando uma coroa natural de obsidiana, manto rasgado de sombras, couraça de ferro negro com veios carmesim incandescentes, olhos de brasa pura. | **A Entidade Quimérica:** Monstro demoníaco ancestral desfigurado, quatro olhos de fogo, asas coriáceas parcialmente recolhidas no dorso, garras de lâmina e halo de runas profanas flutuantes. |
| **Hordas do Rei Demônio** | `DESIGN.md`: linhas 526, 543, 550, 556, 557 | Tropas invasoras de infantaria em massa que atacam fortalezas na guerra de fim de semana e acompanham os caídos. Não dropam loot nem concedem XP. | **Guerreiro Ímpio:** Demônio bípede com pele cinzenta coriácea, elmo de ferro rústico com fendas brutais, armado com machado lascado de guerra e cota de malha podre. | **Fera do Cerco:** Carniçal bestial musculoso de quatro patas dianteiras reforçadas, couraça de placas de osso nos ombros e mandíbula dupla. |
| **Os Caídos (Geral)** | `DESIGN.md`: linhas 425-470, 501, 526 | Jogadores que aceitaram o colar dos fiéis do Rei Demônio na lua vermelha. Inimigos do servidor, lutam pelo fim do mundo e renascem na cidade caída. | **O Traidor Marcado:** Corpo humano da silhueta base com o colar profano brilhando em rubi no peito, pele acinzentada pálida, olhos vermelhos e marcas negras de corrupção subindo pelos braços. | **A Sombra Corrompida:** Humano em A-pose com armadura trincada de onde escapa uma névoa escura avermelhada, rosto sombrio oculto sob capuz rasgado com olhos vítreos. |
| **Necromante** | `DESIGN.md`: linhas 445-450, 504-512; `PLANEJAMENTO.md:159` | A primeira classe caída, originada da traição do clérigo. Domina os ramos de ossos, drenar vida e maldição; invoca mortos para matar a antiga party. | **O Patriarca dos Ossos:** Túnica cerimonial eclesiástica invertida em tons de púrpura escuro e cinza, colar de falanges no pescoço, cajado com crânio humano ornado com gemas negras, mãos cadavéricas. | **O Ceifador Profano:** Manto com capuz negro profundo, amuleto do Rei Demônio visível, livro de feitiços de pele humana aberto na cintura e fumaça verde espectral envolta nas mãos. |
| **Cavaleiro da Morte** | `DESIGN.md`: linha 449 (*"Necromante com guerreiro dá cavaleiro da morte"*) | Híbrido caído corpo a corpo. Combina resistência física pesada com maldições e dreno vital na lâmina. | **O Paladino Caído:** Armadura de placas góticas negras completas com reforços em forma de costelas humanas, elmo fechado emitindo brilho carmesim, montante pesado manchado de sangue. | **O Campeão do Túmulo:** Couraça oxidada com runas gravadas a fogo, capa rasgada acinzentada, escudo de torre com símbolo da caveira partida e espada de lâmina dentada. |
| **Carrasco** | `DESIGN.md`: linha 512 (*"carrasco com ladino"*) | Híbrido caído de agilidade e dano crítico. Embosca jogadores com sangramentos brutais e decapitações. | **O Degolador de Capuz:** Capuz de carrasco de couro preto liso com dois furos estreitos para os olhos, avental de couro grosso manchado de óleo e sangue, machado largo de decapitação. | **O Flagelador:** Traje leve de couro escuro reforçado com correias de ferro, máscara de ferro rebitada e dois cutelos curvos de abate nas mãos. |

---

## 2. Observações sobre as Diretrizes de Design

1. **Continuidade de Estilo:**
   Todas as variações respeitam a paleta de 1993, os limites de altura de 117 voxels para figuras humanoides (Caídos, Necromante, Carrasco, Cavaleiro da Morte) e proporções ampliadas para o Rei Demônio e as criaturas das Hordas.
2. **Separação de Regras e Propostas:**
   Conforme especificado no `DESIGN.md`, a mecânica de traição dos caídos e a existência do necromante estão **DECIDIDAS**, enquanto a frequência das hordas e os híbridos específicos constam como **PROPOSTA** sujeita a balanceamento durante os testes de cerco.
