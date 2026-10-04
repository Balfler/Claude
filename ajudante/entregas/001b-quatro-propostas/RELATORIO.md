# Relatório de Verificação — 001b: Quatro Propostas

Data: 27 de setembro de 2026  
Ambiente: Windows, cópia limpa em `C:\ajudante_001b\` fora do Google Drive  
Status: **Todas as 4 propostas aplicadas com sucesso (100% dos testes e verificações passaram)**

---

## 1. Ajuste Autorizado na Proposta 4

Conforme autorização expressa do usuário, foi feita uma única alteração pontual no arquivo `mundo-perigoso/propostas/4-o-jogador-vira-parametro.diff` na linha 375:

- **Original:** `   G.conversa.push({quem:"Você", fala:texto, t:G.tick});`
- **Alterado para:** `   G.conversa.push({quem:"Voc\u00ea", fala:texto, t:G.tick});`

Nenhuma outra linha do diff ou de qualquer outro arquivo foi alterada.

---

## 2. Aplicação dos Patches com `git apply`

Em um repositório limpo inicializado fora do Drive (`C:\ajudante_001b\`), as quatro propostas foram aplicadas rigorosamente na ordem:

1. `git apply -v mundo-perigoso/propostas/1-fornada-solta-as-peles.diff`
   - `Checking patch mundo-perigoso/README.md...`
   - `Checking patch mundo-perigoso/src/p3e.js...`
   - `Checking patch mundo-perigoso/teste/personagem.test.js...`
   - **Resultado:** Aplicado com sucesso (`Applied cleanly`).

2. `git apply -v mundo-perigoso/propostas/2-preparo-do-golpe-como-dado.diff`
   - `Checking patch mundo-perigoso/README.md...`
   - `Checking patch mundo-perigoso/src/p4.js...`
   - `Checking patch mundo-perigoso/teste/jogo.test.js...`
   - **Resultado:** Aplicado com sucesso (`Applied cleanly`).

3. `git apply -v mundo-perigoso/propostas/3-forno-ao-fundo.diff`
   - `Checking patch mundo-perigoso/README.md...`
   - `Checking patch mundo-perigoso/build.js...`
   - `Checking patch mundo-perigoso/src/forno.js...`
   - `Checking patch mundo-perigoso/src/p5.js...`
   - `Checking patch mundo-perigoso/teste/forno.test.js...`
   - `Checking patch mundo-perigoso/teste/harness.js...`
   - **Resultado:** Aplicado com sucesso (`Applied cleanly`).

4. `git apply -v mundo-perigoso/propostas/4-o-jogador-vira-parametro.diff`
   - `Checking patch mundo-perigoso/README.md...`
   - `Checking patch mundo-perigoso/src/p4.js...`
   - `Checking patch mundo-perigoso/src/p5.js...`
   - `Checking patch mundo-perigoso/teste/harness.js...`
   - `Checking patch mundo-perigoso/teste/jogadores.test.js...`
   - **Resultado:** Aplicado com sucesso (`Applied cleanly`).

---

## 3. Montagem do Jogo (`build.js`)

Comando executado: `node mundo-perigoso/build.js`  
Saída:
```
montado: cripta-vhalgorn.html  (10027 linhas, 2195103 bytes)
montado: provador.html  (3792 linhas, 1663564 bytes)
```
Resultado: **Código 0 (sucesso)**.

---

## 4. Execução dos Testes Automatizados

Todos os testes listados em `mundo-perigoso/README.md` foram executados sequencialmente.

| Arquivo de Teste | Passaram | Falharam | Código de Saída |
| :--- | :---: | :---: | :---: |
| `mundo-perigoso/teste/atelie.test.js` | 90 | 0 | 0 |
| `mundo-perigoso/teste/conversor.test.js` | 25 | 0 | 0 |
| `mundo-perigoso/teste/wgvox.test.js` | 10 | 0 | 0 |
| `mundo-perigoso/teste/jogo.test.js` | 69 | 0 | 0 |
| `mundo-perigoso/teste/motor3d.test.js` | 53 | 0 | 0 |
| `mundo-perigoso/teste/mapa.test.js` | 142 | 0 | 0 |
| `mundo-perigoso/teste/ilha.test.js` | 67 | 0 | 0 |
| `mundo-perigoso/teste/conversa.test.js` | 13 | 0 | 0 |
| `mundo-perigoso/teste/regras.test.js` | 88 | 0 | 0 |
| `mundo-perigoso/teste/personagem.test.js` | 26 | 0 | 0 |
| `mundo-perigoso/teste/pecas.test.js` | 45 | 0 | 0 |
| `mundo-perigoso/teste/estilos.test.js` | 50 | 0 | 0 |
| `mundo-perigoso/teste/canteiro.test.js` | 63 | 0 | 0 |
| `mundo-perigoso/teste/refazer.test.js` | 18 | 0 | 0 |
| `mundo-perigoso/teste/andar.test.js` | 70 | 0 | 0 |
| `mundo-perigoso/teste/modelo.test.js` | 27 | 0 | 0 |
| `mundo-perigoso/teste/jogadores.test.js` | 12 | 0 | 0 |
| `mundo-perigoso/teste/catalogo.test.js` | 20 | 0 | 0 |
| `mundo-perigoso/teste/validacao.test.js` | 39 | 0 | 0 |
| `mundo-perigoso/teste/planta.test.js` | 10 | 0 | 0 |
| `mundo-perigoso/teste/canvas.test.js` | 14 | 0 | 0 |
| `mundo-perigoso/teste/pronto.test.js` | 17 | 0 | 0 |
| `mundo-perigoso/teste/olhar.test.js` | 19 | 0 | 0 |
| `mundo-perigoso/teste/forno.test.js` | 10 | 0 | 0 |
| **TOTAL DOS TESTES** | **997** | **0** | **0** |

---

## 5. Verificação Estática (`verifica.js`)

Comando executado: `node mundo-perigoso/teste/verifica.js`  
Saída:
```
  ok  sintaxe JS (10014 linhas)
  ok  mapa 32x32
  ok  da pra chegar em: chave runica
  ok  da pra chegar em: alma do segredo
  ok  da pra chegar em: portal de saida
  ok  arquivo e ASCII puro
  ok  escapes unicode intactos
  ok  fontes do canteiro e mapas em ASCII (34 arquivos)

tudo certo
```
Resultado: **8 verificações passaram, 0 problemas (Código de Saída: 0)**.

---

## 6. Conclusão

Com a troca de `Você` por `Voc\u00ea` no diff da proposta 4, a aplicação de todas as quatro propostas transcorreu sem atritos ou rejeições. A meta de **997 testes passando** e **8 verificações do verifica.js aprovadas** foi atingida integralmente.
