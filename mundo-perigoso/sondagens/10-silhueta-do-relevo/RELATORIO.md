# Sondagem 10 — a silhueta do relevo além da névoa

**Pergunta:** o motor desenha só até FAR (60 tiles na ilha) e depois o céu vai
direto até o horizonte, então a serra some. Dá para pôr o relevo de longe como
silhueta, barato? Plano: `DESIGN.md`, *o motor*, "a silhueta do relevo além da
névoa".

**Resposta: dá, custa uns 0,3 ms por quadro, e já está no motor atrás de
`?silhueta=sim`, desligado por padrão.** Feito em 30/9, no PC, pelo Claude.

## Como funciona (`src/p5a.js`, antes do `drawSky`)

- Para 360 direções em volta da câmera, marcha do FAR até 260 tiles em passos
  de 3 e guarda a **maior tangente de elevação** do piso (`FLOORZ`, que já
  traz o alto da rocha e das paredes). Suaviza 3 vezes entre direções
  vizinhas, para não virar fileira de prédios.
- Refaz só quando a câmera anda meio tile (ou 0,25 de altura).
- Por coluna da tela: acha a direção, interpola a tangente e projeta o ponto
  no quadro (com a inclinação da cabeça). Só entra o que passa da linha dos
  olhos.
- No `drawSky`, onde nenhuma face pintou (`zbuf` vazio), a partir da linha de
  cima da silhueta troca o céu pela cor dela: a rocha longe puxada para a
  bruma do horizonte (62%).

## O que se vê

`sem-silhueta.png` / `com-silhueta.png`: do chão baixo, olhando para o pico
mais alto da ilha de 650, a uns 90 tiles. Antes o céu ia até o horizonte;
depois o relevo aparece, cinza-azulado, acima da linha dos olhos.

## Custo

Quadro de 5,2 → 5,5 ms (software, no node); o recálculo é quase de graça
porque só roda quando a câmera anda.

## O que falta

- **O Leandro olhar** e decidir a cor (hoje 62% de bruma) e se liga por padrão.
- **Do alto da montanha**, a terra baixa ao longe ainda não aparece (só o que
  passa da linha dos olhos entra), como o `DESIGN.md` já dizia.
- **A borda é serrilhada** onde há rocha alta (as paredes `^` de 8 degraus):
  aparece como blocos; uma malha de direções mais fina resolve, se incomodar.
- **Só na ilha** (`ILHA_MOTOR`); a cripta não muda, e há teste para isso.
