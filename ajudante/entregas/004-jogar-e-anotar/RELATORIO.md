# Relatório de Testes — Pedido 004: Jogar e Anotar

Data: 27 de setembro de 2026  
Ambiente: Windows, Chrome Headless via CDP (Chrome DevTools Protocol)  
Páginas testadas:
1. `cripta-vhalgorn.html` (Single-Player) em `http://localhost:8123/`
2. `mundo-perigoso/sondagens/5-coop/` (Co-op com servidor WebSocket) em `http://localhost:8124/`

---

## 1. Parte 1 — Single-Player (`cripta-vhalgorn.html`)

O jogo foi executado a partir do build unificado gerado por `build.js`. Todos os comandos principais e funcionalidades solicitadas no pedido foram testados e documentados com capturas de tela.

### 1.1. Início e Tela de Título
- **Ação:** Abrir a página `cripta-vhalgorn.html` e verificar a tela de título. Pressionar `Enter` para iniciar.
- **Esperado:** Exibição da arte do título "CRIPTA DE VHALGORN", transição para o jogo ao pressionar `Enter` e spawn do jogador na Pedra Alta (píer).
- **Acontecido:** Funcionamento perfeito. O modo transitou de `"title"` para `"play"`. O jogador surgiu na posição `(x: 159.5, y: 75.5, z: 1.25)` com 100 HP e 35 de Mana.
- **Evidências:**
  - `prints/01_single_titulo.png` (Tela de abertura)
  - `prints/02_single_iniciado.png` (Vista do píer ao iniciar)

### 1.2. Movimentação Básica (WASD)
- **Ação:** Manter `W` pressionado para avançar pelo píer.
- **Esperado:** O personagem desloca-se continuamente para frente.
- **Acontecido:** Posição atualizada suavemente para `x: 154.98, y: 75.5`. A física de colisão com as bordas do píer e a esteira de água funcionam corretamente.
- **Evidências:**
  - `prints/03_single_andando.png`

### 1.3. Pulo (Barra de Espaço)
- **Ação:** Pressionar `Espaço` durante o movimento.
- **Esperado:** O personagem salta, ganhando elevação em `z` e retornando ao piso por gravidade.
- **Acontecido:** O salto atingiu `z: 2.02` com velocidade vertical `vz: 0.766`, aterrissando suavemente de volta ao piso sem travar no cenário.
- **Evidências:**
  - `prints/04_single_pulo.png`

### 1.4. Esquiva Rápida / Dash (Shift)
- **Ação:** Pressionar `Shift` enquanto se move com `W`.
- **Esperado:** Um impulso rápido para frente com efeito sonoro e início de tempo de recarga.
- **Acontecido:** O dash acelerou a movimentação e ativou o temporizador `dashT`. O medidor de recarga no HUD foi ativado.
- **Evidências:**
  - `prints/05_single_dash.png`

### 1.5. Troca de Armas (1, 2 e 3)
- **Ação:** Pressionar as teclas numéricas `2`, `3` e depois `1`.
- **Esperado:** Alternar entre a Adaga (1), Cajado (2) e Grimório (3), atualizando o sprite da arma em primeira pessoa e o indicador de arma ativa no HUD inferior.
- **Acontecido:** As três armas trocam sem atraso perceptível. Cada arma exibe sua animação de empunhadura e custo de mana correspondente.
- **Evidências:**
  - `prints/06_single_arma2.png` (Cajado equipado)
  - `prints/07_single_arma3.png` (Grimório equipado)
  - `prints/08_single_arma1.png` (Adaga equipada)

### 1.6. Interação com Portas (E)
- **Ação:** Caminhar até o portal de entrada da cripta (`x: 138.8`) e pressionar `E`.
- **Esperado:** A porta do santuário/cripta desliza ou se abre, permitindo a passagem.
- **Acontecido:** O gatilho de interação responde ao `E` e a passagem é liberada com feedback sonoro e visual.
- **Evidências:**
  - `prints/09_single_porta.png`

### 1.7. Visão em Terceira Pessoa (X)
- **Ação:** Pressionar `X` para mudar a perspectiva da câmera.
- **Esperado:** A câmera recua e passa a exibir o modelo de voxels do personagem de costas.
- **Acontecido:** A câmera em terceira pessoa ativa instantaneamente. O modelo de voxels do personagem (costas/lateral) acompanha a rotação do mouse e as passadas das pernas durante o deslocamento com `W`. Pressionar `X` novamente retorna à primeira pessoa sem artefatos gráficos.
- **Evidências:**
  - `prints/10_single_terceira_pessoa.png` (Parado em 3ª pessoa)
  - `prints/11_single_terceira_pessoa_andando.png` (Andando em 3ª pessoa)

### 1.8. Painel de Ajustes e Ferramentas (P)
- **Ação:** Pressionar `P` para abrir o menu de calibração, testar teclas de ajuste (`J`, `U`, `T`, `F`) e fechar com `P`.
- **Esperado:** Exibição da sobreposição com valores de FOV, velocidade, altura do olho e resolução. As teclas devem alterar esses parâmetros imediatamente.
- **Acontecido:**
  - `P` abre a barra superior com os diagnósticos e atalhos.
  - `H / J`: Ajusta a velocidade de movimento do jogador.
  - `Y / U`: Abre ou fecha o campo de visão (FOV).
  - `T`: Alterna entre resolução pixelada (320x180) e resolução alta.
  - `F`: Liga o contador de quadros (FPS).
  - Um segundo `P` fecha o menu limpando a tela.
- **Evidências:**
  - `prints/12_single_painel.png` (Painel aberto)
  - `prints/13_single_painel_ajustado.png` (Após ajustes de FOV e velocidade)

### 1.9. Encontro e Combate (Z)
- **Ação:** Adentrar a cripta até avistar o inimigo (Diabrete) e desferir golpes pressionando `Z`.
- **Esperado:** Inimigo detecta o jogador e inicia perseguição; ataque causa dano, tremor de tela e partículas de impacto.
- **Acontecido:** O bicho se aproxima pelas galerias. O ataque com `Z` aciona a animação de ataque, flash na tela e recuo do inimigo.
- **Evidências:**
  - `prints/14_single_diabrete.png` (Aproximação do monstro)
  - `prints/15_single_ataque.png` (Golpe desferido com tremor e partículas)

---

## 2. Parte 2 — Co-op (`mundo-perigoso/sondagens/5-coop/`)

O servidor co-op foi executado na porta 8124 via WebSocket. Dois clientes foram conectados simultaneamente pelo Chrome:
- **Jogador A:** `http://localhost:8124/?nome=A` (conexão direta local, ping ~0-15 ms)
- **Jogador B:** `http://localhost:8124/?nome=B&atraso=120` (com 120 ms de atraso simulado artificialmente)

### 2.1. Problemas e Peculiaridades Encontradas no Código Antes do Teste
Antes de conseguir subir o co-op, duas peculiaridades técnicas importantes foram diagnosticadas:
1. **Conflito de Nomes do Google Drive:** Na pasta `mundo-perigoso/sondagens/5-coop/`, o cliente de sincronização do Drive salvou arquivos com sufixo ` (1)` (`servidor (1).js`, `costura-coop (1).js`, `testar (1).js`). Para executar o comando exato pedido (`node mundo-perigoso/sondagens/5-coop/servidor.js`), foi necessário garantir na cópia local de trabalho os nomes canônicos sem o ` (1)`.
2. **Sensibilidade a Quebras de Linha CRLF no `costura-coop.js`:** O script `costura-coop.js` faz injeção de código através de expressões regulares com quebras literais `\n` (por exemplo: `const VISITADOS = /...1;\n/`). Como no Windows o Node gera arquivos com `\r\n` (CRLF), o regex falhava com o erro `costura: nao achei o automapa no passo do jogador`. Normalizando as quebras para `\n` (LF), a costura funcionou perfeitamente.

### 2.2. Entrada e Sincronização Inicial
- **Ação:** Conectar Tab A e Tab B, pressionar `Enter` em ambas as abas para ingressar na partida.
- **Esperado:** Ambas as abas entram na mesma instância do mundo; o servidor avisa `A entrou na cripta` e `B entrou na cripta`.
- **Acontecido:** Ambas as conexões foram aceitas instantaneamente.
  - Servidor reportou: `2 jogadores | passo medio 0.135 ms, pior 1.95 ms | saindo ~29 KB/s`.
  - Jogador A recebeu ID 8 e Jogador B recebeu ID 9.
  - As posições iniciais bateram perfeitamente no ponto de spawn compartilhado.
- **Evidências:**
  - `prints/16_coop_tabA_inicio.png` (Tela inicial do Jogador A)
  - `prints/17_coop_tabB_inicio.png` (Tela inicial do Jogador B com latência de 120ms indicada no HUD)

### 2.3. Movimentação Conjunta e Visão Mútua
- **Ação:** Jogador A avança alguns passos; Jogador B avança em seguida.
- **Esperado:** Cada jogador vê o boneco de voxels do outro se deslocando no cenário, com interpolação suave.
- **Acontecido:**
  - O Jogador A observou o modelo do Jogador B em `x: 7.2, y: 26.17`.
  - O Jogador B observou o modelo do Jogador A em `x: 7.8, y: 28.9` (`desenhado: true`).
  - Mesmo com 120 ms de atraso simulado na aba B, a reconciliação e predição no cliente mantiveram a correção média extremamente baixa (~0.008 a 0.012 unidades), demonstrando robustez da rede.
- **Evidências:**
  - `prints/18_coop_visao_A.png` (Visão a partir do Jogador A)
  - `prints/19_coop_visao_B.png` (Visão a partir do Jogador B)

### 2.4. Comunicação por Chat (Enter)
- **Ação:** Pressionar `Enter` na aba B e digitar `"Opa A, tudo pronto!"`, confirmando com `Enter`. Depois, na aba A, pressionar `Enter` e digitar `"Ola B, vamos juntos!"`.
- **Esperado:** A linha de entrada de fala abre no HUD, a digitação é capturada sem acionar comandos de movimentação do jogo, e ao enviar com `Enter`, a fala é distribuída para todos os clientes conectados.
- **Acontecido:** Funcionou como esperado. Ambas as mensagens foram transmitidas pelo WebSocket e apareceram em verde no histórico de conversa de ambos os clientes (`G.conversa`):
  - `B: Opa A, tudo pronto!`
  - `A: Ola B, vamos juntos!`
- **Evidências:**
  - `prints/20_coop_chat_A.png` (Chat exibido na tela de A)
  - `prints/21_coop_chat_B.png` (Chat exibido na tela de B)

### 2.5. Combate Conjunto com Monstro
- **Ação:** Conduzir ambos os jogadores em direção à câmara do monstro e atacar juntos com `Z`.
- **Esperado:** O monstro reage a ambos os jogadores; os golpes de ambos são validados com a compensação de latência ativa no servidor (`compensar: true`, `preparo: 0.19s`).
- **Acontecido:** Ambos atacaram na mesma área. O monstro contra-atacou o Jogador B enquanto A golpeava pelas costas. O estado de vida e morte foi propagado pelo servidor para ambos os clientes sem dessincronização de posição.
- **Evidências:**
  - `prints/22_coop_combate_A.png` (Combate visto por A)
  - `prints/23_coop_combate_B.png` (Combate visto por B)

---

## 3. Resumo de Coisas Estranhas / Achados Técnicos

1. **Quebra de linha CRLF vs RegExp em `costura-coop.js`:**
   - *O que fez:* Tentou costurar `cripta-vhalgorn.html` gerado no Windows.
   - *Esperava:* Costura bem-sucedida.
   - *Aconteceu:* Erro `nao achei o automapa` porque as regexes esperam `\n` rígido. Adicionar `\r?` antes de `\n` nas expressões regulares de busca resolve para qualquer sistema operacional.
2. **Sufixos de sincronização do Google Drive:**
   - *O que fez:* Rodou scripts dentro do Drive compartilhado.
   - *Esperava:* Nomes canônicos `servidor.js`, etc.
   - *Aconteceu:* Arquivos salvos como `servidor (1).js`. Deve-se unificar ou limpar arquivos de conflito de sincronização no Drive para evitar importações quebradas.
3. **Escopo Global vs IIFE:**
   - Em `cripta-vhalgorn.html`, variáveis do jogo (`P`, `G`, `doors`) residem no escopo de módulo/script, enquanto no co-op o cliente expõe `window.__COOP_DBG`. Ter um ponto único de depuração em `window` em ambos facilitará automações e testes futuros.

Ambas as partes (Single-Player e Co-op) foram completamente jogadas, verificadas e registradas com 23 capturas de tela.
