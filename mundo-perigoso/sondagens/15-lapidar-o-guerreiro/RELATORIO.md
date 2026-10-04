# Sondagem 15: lapidar o guerreiro (1/10)

**O que o Leandro viu no jogo:**
- o rosto estranho;
- o cabelo pintando a pelugem da capa na nuca;
- o corpo todo precisando de ajuste.

**O que ele desconfiou:** no Sorceress o modelo não tinha falhas; o problema
devia estar na leitura.

**Ele estava certo.** O `.wgvox` traz no cabeçalho a descrição do próprio
formato: a entrada 0 da paleta é o vazio, e o índice de cada voxel aponta
direto para a paleta. O `lerWgvox` (`atelie/corpo.js`) lia `pal[v - 1]`, e cada
voxel pegava a cor da entrada vizinha. Numa paleta de 23 mil cores sem ordem,
isso é outra cor qualquer. O modelo saía salpicado, e a conclusão de 30/9 ("a
cor do Sorceress é ruim, pinta com o desenho") vinha disso.
`leitor-errado-x-certo.png` mostra o mesmo modelo, lido errado e lido certo.

## O que mudou

1. **O leitor:** `pal[v]`. O humano (que também vem de um `.wgvox`) foi
   refeito pela receita e exportado de novo: o rosto ficou limpo e a mancha
   marrom no peito sumiu.
2. **A paleta do corpo sai só da casca**, o que se vê (`importarModelo`). Num
   modelo maciço, o miolo roubava cores da paleta de 54.
3. **O guerreiro** é agora o modelo do Sorceress, forma e cor, com o rig e o
   andar que o Leandro corrigiu no ateliê. O projeto dele, que estava na Área
   de Trabalho, tinha perdido a fonte de alta resolução: a forma é a mesma, então
   os pesos dele foram mantidos, e o projeto foi para
   `Arte/personagens/guerreiro.atelie`, com a fonte. `montar.js` refaz isso; o
   `.personagem` de 256 do jogo sai dele.
4. **A pintura com o desenho** (`--cor=desenho`, `tresvistas.js`) também
   melhorou e fica como opção: cada vista é alinhada por si, a cabeça pelo
   rosto (a pele contra a pele), a vista de raspão não vale, e a cor do
   Sorceress serve de guia. `cabeca-antes-x-depois.png` mostra o efeito.

## Falta

- **O andar novo do Leandro sai da grade do jogo** em 2 ou 3 voxels: o pé passa
  do chão em `andar-1`, a ponta do pé passa da frente em `andar-4` e a cabeça
  passa do teto em `correr-1`. O ateliê acusa 6 erros; o jogo corta esses
  voxels.
- **O rosto de frente sai um pouco largo** no sprite. É a forma do modelo; dá
  para acertar no ateliê ou no Sorceress.
- **54 cores no corpo:** é o limite da paleta do jogo (255, com as rampas fixas
  das peças e 3 tons por cor). Para a qualidade máxima, separar a paleta do
  corpo da das peças.
