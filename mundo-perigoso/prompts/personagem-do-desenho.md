# Prompt — do desenho 2D ao personagem em voxel

Para colar numa sessão nova do Claude Code aberta na pasta do repositório.
Tudo abaixo da linha é o prompt.

---

Quero uma ferramenta própria que transforme **imagens 2D de um personagem** no
**corpo em voxel** que o ateliê rigga e anima. Hoje isso é feito no Sorceress
(sorceress.games/voxelgen), que é pago e ficaria caro para o projeto. A meta é
fazer algo parecido ou melhor, de graça e dentro do nosso fluxo.

## Leia antes de qualquer coisa

1. `mundo-perigoso/README.md`, a seção do ateliê, e `DESIGN.md`, as seções do
   personagem (*pendente e importante — o personagem composto por peças* e o
   *feito* do ateliê). **Cosmético é o único produto do jogo**, então o
   personagem é onde a qualidade mais importa.
2. O ateliê inteiro (`mundo-perigoso/atelie/`). A ferramenta nova entrega o
   `corpo` que o ateliê já usa. Veja:
   - `importarModelo` em `corpo.js`: a altura vira 115, cor por média, paleta
     de no máximo 54 cores, macio por dentro;
   - `proporRig` em `rig.js`, que precisa de T-pose;
   - a validação e o formato `.atelie`.
3. O caminho antigo, que falhou, e o porquê:
   - `editor/conversor.js` e `editor/vistas.js`: três vistas desenhadas sobre o
     molde, silhueta cruzada com seções de cilindro achatado, cor da vista que
     mais encara, contorno pintado removido;
   - `Arte/LEIA-ME.md`: o rosto saiu amassado porque não existia a vista de
     lado, e o molde não é T-pose.
4. `Arte/LEIA-ME.md` e `Arte/captura/LEIA-ME.md`, pelo jeito de registrar
   origem, crédito e licença de tudo que vem de fora.

## A régua: o que o Sorceress entregou

Em `Arte/personagens/` estão dois modelos gerados no Sorceress, os dois da mesma
imagem, `Referência/humano-3-vistas-1/layer-pixel-art-character.png` (o nome está no cabeçalho
JSON do `.wgvox`):

| Arquivo | Grade | Voxels | Cores |
|---|---|---|---|
| `humano.wgvox` (o `... T pose 256.wgvox` do Sorceress, renomeado) | 235 × 257 × 56 | 412.764 | 14.348 |
| `layer-pixel-art-character_png T pose 96.wgvox` | 88 × 97 × 22 | 23.640 | 4.532 |

Olhando o de 256 de frente, de costas e de lado:

- **as costas e o perfil foram inventados**: cabelo atrás, camisa e cinto nas
  costas, nariz e orelha de lado. É uma IA de imagem para 3D, com o resultado
  convertido em voxel;
- **a cor é a textura da IA**, salpicada, com o rosto de frente borrado. São
  quatorze mil cores, e o ateliê precisa reduzir para 54.

**A imagem original** está em
`Arte/personagens/Referência/humano-3-vistas-1/layer-pixel-art-character.png`: 817×914 pixels,
RGBA com fundo transparente, T-pose, pixel art com contorno escuro. Ela é a
entrada da comparação. Atenção ao acento no nome da pasta, em script e no git.

## O fato que decide o projeto

Uma imagem só não diz como são as costas nem a profundidade. Algoritmo escrito
à mão não inventa isso; quem inventa é um modelo treinado. Então a ferramenta
tem duas fontes de forma e **uma fonte de cor só: o desenho**.

- **Forma pelas vistas, sem IA.**
  - Com várias vistas (frente, costas, lado, três quartos), a forma é o
    cruzamento das silhuetas. Cada vista a mais recorta o volume, e com três
    quartos o corte da seção passa de retângulo para octógono.
  - Seções arredondadas por parte do corpo (braço, perna, tronco, cabeça,
    separados pelo rig proposto, que a T-pose permite), sem nunca passar da
    silhueta.
  - Só com a frente, a profundidade vem da proporção humana por parte: o
    resultado é boneco de pano, e a ferramenta tem que dizer isso.
  - As vistas que faltam podem ser desenhadas, ou geradas numa IA de imagem
    grátis como uma folha de vistas em T-pose.
- **Forma por IA local, só a geometria.** Não precisamos da textura da IA
  (a cor vem do desenho) nem de resolução alta (o corpo tem 115 voxels de
  altura). Isso põe o modelo de forma dentro da máquina de produção: um
  **Acer Nitro V com RTX 4050 de 6 GB**. A sessão pode estar em outra
  máquina; esta parte roda no Nitro V. Os candidatos, na ordem de
  preferência:
  1. **TripoSG** (VAST, licença MIT, 1,5 bilhão de parâmetros): gera só a
     forma, que é o que precisamos, na mesma classe de qualidade do Hunyuan.
     O README pede 8 GB, e a 4050 tem 6: tente meia precisão e descarregar
     para a memória do sistema, e meça.
  2. **Hunyuan3D-2 mini** (Tencent): só a forma, uns 5 GB, cabe folgado. A
     licença comunitária não vale na União Europeia, no Reino Unido e na
     Coreia do Sul, proíbe usar o resultado para treinar outra IA e pede
     licença própria acima de 1 milhão de usuários por mês. A Tencent não
     reivindica direito sobre o modelo gerado. Fica como reserva: se o
     TripoSG não couber, ou se sair visivelmente pior.
  3. **TripoSR** (MIT): cabe em 6 GB, mas é uma geração mais velha e dá
     forma mais "derretida". Último recurso.
  4. **TRELLIS.2** (Microsoft, MIT): o melhor aberto, mas pede 24 GB e Linux.
     Só na nuvem grátis, e só como comparação.

  Esses números vêm de pesquisa rápida: meça no Nitro V antes de decidir. O
  teste é barato, então rode o TripoSG e o Hunyuan mini na mesma imagem. Se a
  diferença na escala do jogo for pequena, fique com o de licença MIT.
- **Qualquer malha de fora** (`.glb`, `.obj`): Blender, gerador online grátis,
  ou o `.glb` que o próprio Sorceress exporta.

**A cor é sempre projetada do desenho original**, pixel a pixel. Cada voxel da
superfície pega a vista que mais encara ele, com teste de oclusão, para o braço
não pintar o peito. O que nenhuma vista enxerga (debaixo do braço, o lado sem
vista de lado) herda do vizinho visto mais perto, com opção de espelhar. O
contorno pintado sai, como no `conversor.js`. Até 54 cores ficam exatas; acima
disso, redução.

**Combinação:** a silhueta do desenho corta a malha da IA. O contorno de frente
é o do desenho; a IA só diz a profundidade e o que está atrás.

## O que a ferramenta faz

Minha aposta é uma etapa nova no começo do ateliê, **"0. Do desenho"**, porque
a saída é o `corpo` dele e a etapa Esculpir já põe imagem de referência atrás do
corpo. Se for melhor uma página própria, decida e explique.

1. **Entrada.**
   - Uma ou mais imagens. A frente em T-pose é obrigatória; costas, lados e
     três quartos são opcionais.
   - Aceita uma folha com várias vistas lado a lado, recortando sozinha.
   - Tira o fundo: transparente, cor lisa, ou o quadriculado que o conversor do
     diabrete já tirava (ver `Arte/LEIA-ME.md`).
2. **Alinhamento.**
   - Todas as vistas com a mesma altura, do topo da cabeça à sola, o meio do
     corpo alinhado, e ombro e quadril na mesma linha.
   - Proposto sozinho, com ajuste fino na tela.
   - Avisa quando uma vista discorda da outra (ombro mais alto de lado do que
     de frente).
3. **Forma**, pelas fontes acima, com o botão de refazer ao mudar uma opção.
4. **Cor** projetada, com a vista de diferença (ver a validação).
5. **Limpeza.** A peça do ateliê que já existe (macio por dentro, tirar o
   salpicado), mais **simetria opcional**: espelhar o lado melhor, ou só a
   forma e não a cor.
6. **Saída.** O corpo em T-pose, 115 de altura, caixa de 140, no máximo 54
   cores, e daí o fluxo de sempre: rig proposto, peso, animações, prévia do jogo
   e exportar.

## Validação e fidelidade

A diferença do nosso resultado para o desenho tem que ser um número, não uma
impressão:

- **Silhueta.** Desenhar o boneco em cada vista de entrada e medir quanto a
  silhueta bate com a do desenho (interseção sobre união), com um número por
  vista e um mapa do que sobra e do que falta.
- **Cor.** A diferença de cor por pixel nas mesmas vistas.
- **Os erros do ateliê continuam valendo**: paleta, pedaço solto, T-pose que o
  rig não reconhece.
- **Uma folha de comparação**: o desenho, o nosso e o do Sorceress lado a lado,
  pela linha de comando.

## Arquivos e reprodução

- Uma **receita**, como `humano.receita.json`: as imagens, as opções e a malha
  usada. **A IA não é determinística**, então a malha que ela gerou fica guardada
  em `Arte/` e a receita aponta para ela. Da receita ao `.atelie`, byte a byte,
  com teste.
- **O núcleo continua sem dependência**, como o ateliê: JavaScript puro, sem
  DOM onde der, rodando no node e no navegador aberto do disco. Isso inclui os
  leitores de `.glb` e `.obj` e a conversão de malha em voxel (sólido, não
  casca).
- **A parte de IA fica isolada** numa pasta própria:
  - em Python, com um README de instalação no Windows com a RTX 4050;
  - recebe a imagem e grava a malha;
  - **nenhum teste depende dela**: os testes usam uma malha pequena de
    exemplo.
- **Licença e origem de cada modelo** registradas no `Arte/LEIA-ME.md`, como os
  créditos da captura da CMU. A regra de ouro: só usar em arte do jogo o que a
  licença permite vender como cosmético.

## Como trabalhar

1. **Primeiro, a medição, e me mostre antes de construir a tela:**
   - a imagem de referência pelos três caminhos (só vistas, IA local, malha
     de fora);
   - com cada modelo de IA que couber no Nitro V, com o tempo e a memória de
     vídeo usados;
   - numa folha lado a lado com o Sorceress, e assado pela prévia do jogo nos
     oito rumos.

   Eu escolho pelo olho, e você me diz o custo de cada um.
2. **Depois, em fatias com commit** na forma `personagem: ...`, os testes
   passando (os de hoje e os novos) e o README e o `DESIGN.md` atualizados em
   cada fatia, como no ateliê. Os testes novos cobrem:
   - leitores de malha;
   - voxelização sólida;
   - projeção de cor com oclusão;
   - alinhamento das vistas;
   - fidelidade medida;
   - receita byte a byte;
   - ASCII puro.
3. **Olhe o resultado a cada fatia**, pela `folha` e pela prévia do jogo.
   Defeito de voxel só aparece olhando.

## Pronto quer dizer

- **Com a mesma imagem que foi para o Sorceress**, o nosso corpo sai **pelo
  menos tão bom quanto o `humano.wgvox`** na prévia do jogo, nos oito rumos e
  nas vinte poses. Isso quer dizer:
  - rosto legível de frente, na escala do jogo;
  - cor limpa, com as cores do desenho;
  - costas e perfil coerentes;
  - validação do ateliê sem erro;
  - a fidelidade de silhueta medida e registrada.
- **Com três vistas desenhadas** (frente, lado e costas), sai sem IA nenhuma,
  melhor que o caminho antigo: sem rosto amassado e sem braço colado no
  tronco.
- Refazer é rodar a receita, de graça, sem serviço pago no meio.

**Não agora, mas não feche a porta:** a mesma projeção serve para roupa e
equipamento desenhados como camada por cima das mesmas vistas, que é o jeito
de cosmético novo nascer de desenho.
