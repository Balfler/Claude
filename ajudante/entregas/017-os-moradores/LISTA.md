# Catálogo de Moradores e Classes Sociais da Ilha

Levantamento dos personagens não-jogáveis (NPCs) existentes no código (`mundo-perigoso/src/`), nos mapas (`mapas/ilha.mapa`), e os prometidos no documento de design (`DESIGN.md`).

---

## 1. Moradores que existem no jogo (`src/` e `mapas/`)

| Nome | Ocupação / Função | Origem no Código / Mapas | Aparência e Vestimenta no Estilo 1993 |
|---|---|---|---|
| **Josias** | Barqueiro / Pescador | `src/ilha.js:52`; `src/conversa.js:15`; `DESIGN.md:706` | Pescador maduro de pele curtida pelo sol, chapéu de palha de abas largas, túnica azul lavada com mangas arregaçadas, colete marrom rústico, calças enroladas na canela, pés descalços/sandálias e rolo de corda de amarra no quadril. |
| **Anselmo** | Guarda do Portão | `src/ilha.js:53`; `src/conversa.js:24`; `DESIGN.md:699` | Sentinela veterano de feição séria, elmo caldeirão (kettle hat) de aço batido, couraça/peitoral de ferro rebitado sobre túnica marrom de lã, braçadeiras de couro, botas fortes e bainha de espada no cinto. |
| **Tobias** | Artesão / Marceneiro | `src/ilha.js:54`; `src/conversa.js:31`; `DESIGN.md:399` | Jovem carpinteiro/artesão de cabelos pretos crespos, camisa de linho cru com mangas dobradas, avental inteiriço de couro com bolsos e alças cruzadas nas costas, ferramentas (formão e maço de madeira) na cinta. |
| **Amadeu** | Ancião da Ilha | `src/ilha.js:55`; `src/conversa.js:37`; `DESIGN.md:586` | O morador mais velho da colônia, cabelos e barba branca longos, túnica rústica de lã cinza-terra até o tornozelo, cinto de cordão de cânhamo, xale/manto pesado sobre os ombros e calçados macios de tecido. |
| **Celeste** | Moradora / Tecelã | `src/ilha.js:56`; `src/conversa.js:43`; `DESIGN.md:389` | Moradora de Pedra Alta, lenço branco cobrindo os cabelos, vestido medieval (kirtle) em tom terracota com avental claro atado na cintura, braços livres para tecelagem e costura. |
| **Bruno** | Pedreiro / Trabalhador | `src/ilha.js:57`; `src/conversa.js:63`; `DESIGN.md:700` | Rapaz forte de compleição robusta, túnica curta sem mangas ou colete aberto, luvas grossas de couro para manusear blocos de cantaria e pedras da escadaria. |
| **Clarice (Irmã Clarice)** | Sacerdotisa da Capela | `src/ilha.js:58`; `src/conversa.js:48`; `DESIGN.md:604` | Guardiã da capela e do portal da cripta, hábito clerical em tons bege e branco com capuz/véu e amuleto sagrado de luz pendurado ao peito. |

---

## 2. Moradores Prometidos no `DESIGN.md`

| Morador | Ocupação / Local | Citação no `DESIGN.md` | Descrição Visual Planejada |
|---|---|---|---|
| **Anão Ferreiro** | Mestre Forjador do Cume | `DESIGN.md: linha 646` (*"Uma montanha que se sobe, com um anão ferreiro no topo"*) | Anão de estatura compacta e atarracada, barba ruiva volumosa trançada, avental grosso de forja chamuscado pelo fogo, luvas de proteção pesadas e semblante obstinado. |
| **Taverneiro** | Estalajadeiro | `DESIGN.md: linhas 400, 451, 700` (*"taverna com interior e NPC"*) | Homem corpulento e hospitaleiro, túnica verde-oliva com avental de pano cru manchado, chave grande da adega pendurada na cintura e pano de prato ao ombro. |

---

## 3. Relação de Classes Sociais (`DESIGN.md:380-413`)

O documento de design estabelece que a vestimenta e a mobília refletem a hierarquia social:

1. **Mendigo / Camponês Pobre (Plebe Rural):** Trapos remendados, linho cru sem tingimento, pés descalços ou alpargatas de palha, ausência total de adereços metálicos.
2. **Pescador / Operário:** Roupas funcionais reforçadas para o trabalho (lona, couro cru, cordas), mangas dobradas, calças arregaçadas.
3. **Artesão / Cidadão Comum (Plebe Urbana):** Tecidos de lã ou linho tingidos com cores simples (marrom, ocre, azul desbotado), avental de couro e ferramentas do ofício.
4. **Mercador / Burguês:** Sobretudo de lã fina escura ou veludo simples, golas bordadas, cinto largo com bolsa de moedas pesada e botas polidas de cano alto.
5. **Militar / Guarda:** Proteção corporal visível (peitoral de ferro, cota de malha ou elmo caldeirão), cinto de espada e postura disciplinada.
6. **Clero / Sacerdote:** Túnicas e hábitos longos com símbolos religiosos bordados, tons de marfim, cinza ou púrpura.
7. **Nobreza:** Roupas de veludo e seda com ornamentos dourados, mantos com forro contrastante, botões metálicos trabalhados e anéis.

---

## 4. Status das Entregas Visuais

- **Josias (Barqueiro):** Três vistas geradas e recortadas (`frente.png`, `lado.png`, `costas.png`).
- **Anselmo (Guarda):** Três vistas geradas e recortadas (`frente.png`, `lado.png`, `costas.png`).
- **Tobias (Artesão):** Três vistas geradas e recortadas (`frente.png`, `lado.png`, `costas.png`).
- **Amadeu (Ancião):** Três vistas geradas e recortadas (`frente.png`, `lado.png`, `costas.png`).
- **Folha Geral:** Montada com os 4 moradores iniciais em suas 3 vistas lado a lado.
- *Nota sobre os demais moradores (Celeste, Bruno, Clarice, Anão, Taverneiro e Moradores de classe):* A API de geração de imagens atingiu o teto temporário de requisições (`429 Too Many Requests: quota will reset after 50m28s`), sendo devidamente documentada no relatório conforme as diretrizes do `LEIA-ME.md`.
