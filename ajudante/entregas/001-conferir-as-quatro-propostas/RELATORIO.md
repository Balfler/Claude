# Relatorio — Pedido 001: Conferir as quatro propostas

## 1. O que foi feito
- Copiado o projeto completo de `g:\Meu Drive\Claude\` para uma area de trabalho local externa (`C:\ajudante\`) via Robocopy.
- Verificadas as ferramentas:
  - `git version 2.54.0.windows.1`
  - `node v24.16.0`
- Aplicadas as propostas em sequencia via `git apply`:
  - **Proposta 1 (`1-fornada-solta-as-peles.diff`)**: aplicada com sucesso.
  - **Proposta 2 (`2-preparo-do-golpe-como-dado.diff`)**: aplicada com sucesso.
  - **Proposta 3 (`3-forno-ao-fundo.diff`)**: aplicada com sucesso.
  - **Proposta 4 (`4-o-jogador-vira-parametro.diff`)**: FALHA na aplicacao com `git apply`.
- Executado o `node mundo-perigoso/build.js`.
- Executadas todas as baterias de teste existentes + a nova adicionada pela proposta 3 (`forno.test.js`).

---

## 2. Erro no `git apply` da Proposta 4

Conforme instrucao ("se o git apply reclamar de alguma linha, cole o erro inteiro no relatorio e nao tente consertar"):

### Saida completa do comando `git apply -v mundo-perigoso/propostas/4-o-jogador-vira-parametro.diff`:
```text
Checking patch mundo-perigoso/README.md...
Checking patch mundo-perigoso/src/p4.js...
Hunk #6 succeeded at 796 (offset 5 lines).
Hunk #7 succeeded at 824 (offset 5 lines).
Hunk #8 succeeded at 845 (offset 5 lines).
Hunk #9 succeeded at 868 (offset 5 lines).
Checking patch mundo-perigoso/src/p5.js...
Hunk #1 succeeded at 332 (offset 1 line).
Hunk #2 succeeded at 354 (offset 1 line).
Hunk #3 succeeded at 395 (offset 1 line).
Hunk #4 succeeded at 403 (offset 1 line).
Hunk #5 succeeded at 482 (offset 1 line).
Hunk #6 succeeded at 548 (offset 1 line).
Hunk #7 succeeded at 568 (offset 1 line).
error: while searching for:
   e o que se pode perguntar em seguida.
   ============================================================ */
const COR_CHAVE = "#8fd0ff";
function dizer(texto){
  G.conversa.push({quem:"Você", fala:texto, t:G.tick});
  let morador = null, dm = 3.2;
  for (const e of ents){

error: patch failed: mundo-perigoso/src/p5.js:578
error: mundo-perigoso/src/p5.js: patch does not apply
Checking patch mundo-perigoso/teste/harness.js...
Hunk #1 succeeded at 45 (offset 2 lines).
Checking patch mundo-perigoso/teste/jogadores.test.js...
```

### Observacao sobre a causa da falha:
No arquivo `mundo-perigoso/src/p5.js` da base (linha 583), a palavra esta escapada em ASCII puro como `quem:"Voc\u00ea"`, enquanto o diff da proposta 4 procurava pelo caractere literal UTF-8 com acento `quem:"Você"`. Seguindo estritamente a instrucao, o remendo **nao** foi corrigido manualmente e a proposta 4 permaneceu nao aplicada.

---

## 3. Build

Comando: `node mundo-perigoso/build.js`
Saida:
```text
montado: cripta-vhalgorn.html  (9977 linhas, 2194913 bytes)
montado: provador.html  (3792 linhas, 1664223 bytes)
```

---

## 4. Resultados dos Testes

Total de baterias executadas: 24 (23 originais + `forno.test.js` da Proposta 3).
Nenhuma falha em nenhum teste executado.

| Arquivo de Teste | Passaram | Falharam | Status |
|---|---|---|---|
| `mundo-perigoso/teste/atelie.test.js` | 90 | 0 | OK |
| `mundo-perigoso/teste/conversor.test.js` | 25 | 0 | OK |
| `mundo-perigoso/teste/wgvox.test.js` | 10 | 0 | OK |
| `mundo-perigoso/teste/verifica.js` | 8 verificacoes (tudo certo) | 0 | OK |
| `mundo-perigoso/teste/jogo.test.js` | 69 | 0 | OK (+2 da Proposta 2) |
| `mundo-perigoso/teste/motor3d.test.js` | 53 | 0 | OK |
| `mundo-perigoso/teste/mapa.test.js` | 142 | 0 | OK |
| `mundo-perigoso/teste/ilha.test.js` | 67 | 0 | OK |
| `mundo-perigoso/teste/conversa.test.js` | 13 | 0 | OK |
| `mundo-perigoso/teste/regras.test.js` | 88 | 0 | OK |
| `mundo-perigoso/teste/personagem.test.js` | 26 | 0 | OK (+1 da Proposta 1) |
| `mundo-perigoso/teste/pecas.test.js` | 45 | 0 | OK |
| `mundo-perigoso/teste/estilos.test.js` | 50 | 0 | OK |
| `mundo-perigoso/teste/canteiro.test.js` | 63 | 0 | OK |
| `mundo-perigoso/teste/refazer.test.js` | 18 | 0 | OK |
| `mundo-perigoso/teste/andar.test.js` | 70 | 0 | OK |
| `mundo-perigoso/teste/modelo.test.js` | 27 | 0 | OK |
| `mundo-perigoso/teste/catalogo.test.js` | 20 | 0 | OK |
| `mundo-perigoso/teste/validacao.test.js` | 39 | 0 | OK |
| `mundo-perigoso/teste/planta.test.js` | 10 | 0 | OK |
| `mundo-perigoso/teste/canvas.test.js` | 14 | 0 | OK |
| `mundo-perigoso/teste/pronto.test.js` | 17 | 0 | OK |
| `mundo-perigoso/teste/olhar.test.js` | 19 | 0 | OK |
| `mundo-perigoso/teste/forno.test.js` | 10 | 0 | OK (+10 da Proposta 3) |
| **TOTAL** | **988 testes / verificacoes** | **0** | **100% sucesso** |

*(Nota: os 12 testes restantes para alcancar os 997 previstos pertencem a `jogadores.test.js`, arquivo criado pela Proposta 4 que nao pode ser aplicada pelo erro acima).*

---

## 5. Lista de Arquivos Entregues
- `RELATORIO.md`
- `PRONTO`
