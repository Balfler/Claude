# Pedido: o gerador local de personagem em voxel (imagem → 3D → ateliê)

Você vai trabalhar no jogo **Mundo Perigoso**, do Leandro, em `G:\Meu Drive\Claude`.
Antes de tudo, leia `CLAUDE.md`, `DESIGN.md` e `PLANEJAMENTO.md` (no topo dele está
como mantê-lo).

## Regras do projeto

- Respostas em português, curtas.
- **Não se commita.** O Google Drive é o local de trabalho.
- O que está em `mundo-perigoso/src/` é **ASCII puro**: acento só como `\uXXXX`.
  Isso não vale para os scripts Python novos nem para os `.md`.
- Não invente regra de jogo; decisão de design é do Leandro.
- Ao terminar, atualize o `PLANEJAMENTO.md`: uma linha no diário, e os itens
  mexidos mudam de lugar.
- **Não mexa** na sondagem 16 (`src/gpu.js`, `atelie/gpu.js`, `?gpu=sim`). Ela
  está em andamento em outro chat.
- A bateria de testes é `node mundo-perigoso/teste/tudo.js`. Tem que continuar
  passando, e os testes novos entram nela.

## O objetivo

Uma ferramenta **local** que transforma a folha de referência do personagem
(frente, perfil e costas em T-pose, numa imagem só) num projeto do ateliê
(`.atelie`) com rig, peso e animações. É o caminho que hoje passa pelo site do
Sorceress, só que rodando na máquina do Leandro.

## A máquina

- Placa de vídeo **RTX 4050 Laptop, 6 GB de VRAM** (driver 581).
- 24 GB de RAM, i5-13420H, Windows 11.
- 160 GB livres no C:.
- Python instalado: só 3.13 e 3.14 (`py -0`). Git e Node existem.
- O Pinokio está em `C:\pinokio`, mas não será usado aqui.

## A decisão já tomada

**Gerador: Hunyuan3D-2mv, versão turbo** (`tencent/Hunyuan3D-2mv`, subpasta
`hunyuan3d-dit-v2-mv-turbo`).
- Recebe **várias vistas** (frente, lado, costas), como a folha em T-pose.
- É da família que o Sorceress usa.
- **Só a forma.** A pintura do Hunyuan pede uns 16 GB e não cabe.
- **A cor sai do próprio desenho**, projetado na forma pelo
  `sondagens/7-tres-vistas/tresvistas.js`, com `--forma=<arquivo.glb>`. Ele já
  alinha cada vista por si, acerta a cabeça pelo rosto e usa a cor da forma
  como guia.
- **Se não couber nos 6 GB:**
  1. tente o descarregamento para a CPU, ou menos `octree_resolution` e
     `num_chunks`;
  2. em último caso, `tencent/Hunyuan3D-2mini`, que usa uma imagem só (a de
     frente).

  Registre o que funcionou.
- **Licença:** a Tencent Hunyuan Community License permite uso comercial no
  Brasil até 1 milhão de usuários ativos por mês, e exclui a UE, o Reino Unido e
  a Coreia do Sul. Anote no relatório.

**Os downloads que o Leandro autorizou** (confirme com ele antes de começar, com
os tamanhos que você encontrar):

| O quê | De onde | Tamanho estimado |
|---|---|---|
| Código do Hunyuan3D-2 | github.com/Tencent-Hunyuan/Hunyuan3D-2 | ~50 MB |
| Pesos `hunyuan3d-dit-v2-mv-turbo` | huggingface.co/tencent/Hunyuan3D-2mv | ~5 GB |
| PyTorch com CUDA e as dependências da parte de **forma** (`hy3dgen.shapegen`) | pypi, download.pytorch.org | ~4 GB |
| Python 3.11 | python.org | ~30 MB |

- **Onde instalar:** o pesado (Python, ambiente virtual, código e pesos) vai em
  **`C:\ferramentas\gerador\`**, fora do Drive, para não sincronizar 10 GB.
- **No projeto** ficam só os scripts, em `mundo-perigoso/ferramentas/gerador/`
  (`gerar.py` e `LEIA-ME.md` com o passo a passo de instalação).
- **Não instale** a parte de textura (`hy3dgen.texgen`, o rasterizador
  compilado).

## O que já existe e deve ser reaproveitado

- **`sondagens/7-tres-vistas/tresvistas.js`:**
  - recorta a folha (`mascara`, `separarVistas`, `perfilOlhaPara`);
  - `processar(folha, {forma})` pinta a forma com o desenho;
  - a linha de comando grava o `.atelie` com a fonte de alta resolução, o rig,
    o peso (com `pano`) e as capturas de andar e correr da CMU.

  Uso:

  ```
  node mundo-perigoso/sondagens/7-tres-vistas/tresvistas.js <folha.png> <pasta> --nome=x --forma=arquivo.glb
  ```
- **`editor/glb.js`:** `lerGlb` e `voxelizar(m, {alto})`. O `tresvistas.js` já
  aceita `.glb` como forma (`carregarForma`, com 250 de altura).
- **`atelie/cli.js`:**
  - `novo`, `pesos [--pano]`, `validar`, `folha`;
  - `exportar --altura 256` (o `.personagem` compactado do jogo);
  - `gpu`.
- **`sondagens/15-lapidar-o-guerreiro/olhar.js`:**
  - `vista(f, graus, caixa, esc)` e `deCima` desenham um volume de qualquer
    lado;
  - serve para comparar com o modelo do Sorceress.
- **A folha de teste:** `Arte/personagens/Referência/guerreiro-folha.png`
  (2752×1536, frente, perfil olhando para a direita, costas).
- **A referência de qualidade:** `Arte/personagens/guerreiro.wgvox`, o modelo do
  Sorceress feito dessa mesma imagem. Lido com `atelie/corpo.js lerWgvox`, que
  foi consertado em 1/10: a cor dele é limpa.

## O que fazer

1. **Instalar e rodar o Hunyuan3D-2mv**, só a forma, em
   `C:\ferramentas\gerador\`.
   - Confira a API no README do repositório. É algo como
     `Hunyuan3DDiTFlowMatchingPipeline.from_pretrained('tencent/Hunyuan3D-2mv', subfolder='hunyuan3d-dit-v2-mv-turbo', variant='fp16')`,
     mais `enable_flashvdm()`, chamado com `image={'front':..., 'left':..., 'back':...}`
     e poucos passos no turbo.
   - **Descubra qual chave** (`left` ou `right`) corresponde a um perfil que
     olha para a direita: teste e confira o resultado.
2. **`mundo-perigoso/ferramentas/gerador/gerar.py`:**
   - recebe as 3 vistas em PNG com fundo transparente e devolve um `.glb`;
   - tem argumentos para passos, semente, `octree_resolution` e um modo de
     pouca VRAM;
   - imprime o tempo e a VRAM máxima usada.
3. **Recortar a folha para o gerador, em Node, reaproveitando o
   `tresvistas.js`:** cada vista vira um PNG RGBA quadrado, com o fundo
   transparente, a figura centrada e uma margem. O fundo da folha é liso; não
   precisa de rembg.
4. **Um comando só que faz tudo:**

   ```
   node mundo-perigoso/atelie/cli.js gerar <folha.png> [--nome x] [--semente N] [--saida pasta]
   ```

   Ele:
   1. recorta a folha;
   2. chama o Python do `C:\ferramentas\gerador\`, com o caminho configurável
      por variável de ambiente ou opção;
   3. recebe o `.glb`;
   4. roda o `tresvistas.js` com `--forma` e grava o `.atelie`, com fonte, rig,
      peso com pano e capturas.

   Com `--jogo`, também exporta o de 256. Mensagens claras quando o Python ou o
   modelo não estiverem instalados.
5. **Sondagem 17** (`sondagens/17-gerador-local/`), com o guerreiro:
   - imagens lado a lado do Sorceress e do gerador local: corpo inteiro de 6
     ângulos e a cabeça de perto (use o `olhar.js`);
   - o tempo de cada etapa e a VRAM máxima;
   - o `RELATORIO.md`: o que ficou bom, o que ficou ruim e o que tentar depois.

   Rode 2 ou 3 sementes e mostre a melhor.
6. **Testes** que não dependem da placa, em `teste/`, entrando no `tudo.js`:
   - o recorte das vistas em RGBA: tamanho, transparência, figura centrada;
   - o comando `gerar` falhando com mensagem clara quando o gerador não está
     instalado;
   - o caminho `.glb` → `tresvistas` com um `.glb` pequeno sintético.
7. **Documentar:** o README (`mundo-perigoso/README.md`, a seção de comandos), o
   `PLANEJAMENTO.md` (diário, e o item da IA local em *a fazer* passa para
   *feito*) e o `LEIA-ME.md` da ferramenta.

## Cuidados

- O Leandro **edita junto** no Drive (e às vezes o Gemini também). Se um
  arquivo "voltar" sozinho, não reverta: pergunte.
- Mostre ao Leandro as imagens da comparação (com a ferramenta de enviar
  arquivo) e diga com honestidade se ficou no nível do Sorceress ou não.
- O andar do guerreiro passa 2 ou 3 voxels da grade do jogo. Isso é conhecido,
  e não é desta tarefa.
