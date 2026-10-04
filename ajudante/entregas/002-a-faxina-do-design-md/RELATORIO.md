# Relatorio — Pedido 002: A faxina do DESIGN.md

## 1. O que foi feito
- Lidos na integra os arquivos `DESIGN.md` e `PLANEJAMENTO.md`.
- Mapeadas as seções correspondentes no `DESIGN.md`:
  - `## Em aberto` (linhas 728 a 752)
  - `## Lista de tarefas` (linhas 1736 a 1996, com as subseções `### Feito`, `### A fazer, em ordem`, `### Sem ordem ainda` e `### Higiene do projeto`).
- Conferido item por item contra o `PLANEJAMENTO.md`:
  - Todos os 10 itens de `## Em aberto` estao presentes no `PLANEJAMENTO.md` sob `## Por decidir`.
  - Todos os itens de `### Feito`, `### A fazer, em ordem` e `### Sem ordem ainda` estao devidamente registrados no `PLANEJAMENTO.md` (em `## Em andamento`, `## A fazer`, `## Feito — os marcos` ou `## Por decidir`).
  - Dois itens da subsecao `### Higiene do projeto` nao constavam no `PLANEJAMENTO.md` e foram listados no `FALTANDO.md`.
- Numa copia isolada (`C:\ajudante\DESIGN.md`), foram removidas as seções `## Em aberto` e `## Lista de tarefas`, inserindo no lugar de encerramento a linha exata solicitada:
  `O andamento, o que falta fazer e o que falta decidir estão no \`PLANEJAMENTO.md\`.`
- Gerado o arquivo de patch unificado `DESIGN.diff` (em UTF-8 limpo sem BOM, testado e validado com `git apply --check` com 100% de sucesso).
- Gerado o arquivo `FALTANDO.md`.

---

## 2. Itens que constavam no DESIGN.md e nao estavam no PLANEJAMENTO.md
Registrados em `FALTANDO.md`:
1. `Higiene do projeto: Colocar em git (Feito — o fonte mora em mundo-perigoso/ e o HTML jogavel e gerado por mundo-perigoso/build.js; o codigo morava no scratchpad temporario e foi parcialmente limpo)`
2. `Higiene do projeto: Manter os testes (Sao o que deixa voce sumir tres meses, voltar sem lembrar de nada e mexer sabendo na hora se quebrou algo)`

---

## 3. Validação do Diff
Comando executado:
```bash
git apply -v --check DESIGN.diff
```
Saida:
```text
Checking patch DESIGN.md...
(0 erros, 0 avisos, aplicacao limpa)
```

O diff apenas remove as seções especificadas e adiciona a linha de apontamento ao final, mantendo todo o restante do `DESIGN.md` intacto.

---

## 4. Arquivos entregues
- `DESIGN.diff`
- `FALTANDO.md`
- `RELATORIO.md`
- `PRONTO`
