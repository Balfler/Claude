# Sondagem 17 — o gerador local contra o Sorceress

**Pergunta:** o Hunyuan3D-2mv turbo, rodando na RTX 4050 de 6 GB, faz do
guerreiro uma forma que, pintada com o desenho, fica no nível do Sorceress?

**Estado (03/10/2026): preparada, ainda não rodou.** O caminho inteiro está
escrito e testado sem a placa. O que falta é instalar o Python 3.11: o
instalador usa o Windows Installer, e ele não roda de dentro da caixa de
proteção do Claude Code. Esse passo é do Leandro (ver *o que falta*).

Pedido: `prompts/gerador-local.md`.

## O que está pronto

- **Em `C:\ferramentas\gerador\`** (fora do Drive):
  - os pesos do `hunyuan3d-dit-v2-mv-turbo` (4,93 GB, sha256 conferido);
  - o código do Hunyuan3D-2 (clone raso);
  - o instalador do Python 3.11.9.
- **`ferramentas/gerador/gerar.py`:** três vistas RGBA viram `.glb`. Tem
  passos, semente, `octree_resolution`, `num_chunks`, guidance e o modo de
  pouca VRAM. Imprime o tempo de cada etapa e a VRAM máxima. Roda as etapas à
  mão (DINO, DiT, VAE) em vez de chamar o pipeline inteiro, por dois motivos:
  - para medir cada uma;
  - porque o `enable_model_cpu_offload` do Hunyuan está quebrado (chama um
    `self.components` que não existe). No modo de pouca VRAM, cada parte vai
    à placa na sua vez.
- **`atelie/gerador.js`:** o recorte da folha em três PNG RGBA de 1024, com o
  recorte do `tresvistas.js`.
- **`cli.js gerar`:** junta tudo (recorte, Python, `tresvistas.js --forma`,
  e com `--jogo`, o 256).
- **`tresvistas.js`:** uma forma sem textura (a do Hunyuan) não vira mais guia
  de cor. Com o guia todo cinza, a vista de cor mais apagada ganharia sempre.
- **`comparar.js`, aqui:** grava o corpo de 6 ângulos e a cabeça de perto,
  com o Sorceress em cima e o local embaixo (o `olhar.js` da sondagem 15).
  Foi testado com a forma do Sorceress no lugar da do Hunyuan.
- **`teste/gerador.test.js`:** 35 testes, sem a placa.

## A chave do perfil

Nos exemplos do Hunyuan (`assets/example_mv_images/1/left.png`), a vista
`left` é o personagem olhando para a **esquerda** da imagem. O perfil da
folha do guerreiro olha para a direita, então a chave dele é **`right`**. É
o que o código usa. **Falta conferir na forma gerada:** se a capa sair na
frente, a chave está errada.

## O que falta

1. **O Leandro instala o Python 3.11** (passo 1 do
   `ferramentas/gerador/LEIA-ME.md`, ou o `instalar.ps1` inteiro).
2. O ambiente virtual e o `pip` (PyTorch cu128, uns 4 GB).
3. Rodar o guerreiro com 3 sementes:
   ```
   node mundo-perigoso/atelie/cli.js gerar "mundo-perigoso/Arte/personagens/Referência/guerreiro-folha.png" --nome guerreiro --semente 1 --saida mundo-perigoso/sondagens/17-gerador-local/semente-1
   node mundo-perigoso/sondagens/17-gerador-local/comparar.js "mundo-perigoso/Arte/personagens/Referência/guerreiro-folha.png" mundo-perigoso/sondagens/17-gerador-local/semente-1/guerreiro.glb ...
   ```
4. Anotar aqui:
   - o tempo de cada etapa e a VRAM máxima;
   - o que coube nos 6 GB;
   - se a chave `right` estava certa;
   - o que ficou bom, o que ficou ruim e o que tentar depois.
5. **Decidir (o Leandro) o VAE turbo:** são 407 MB a mais, fora da lista
   autorizada. É o que o `enable_flashvdm()` do README do Hunyuan usa. Sem
   ele, o `gerar.py` usa o VAE que vem junto do DiT.

## A licença

É a Tencent Hunyuan 3D 2.0 Community License:

- vale no mundo todo, **menos na UE, no Reino Unido e na Coreia do Sul**, e
  isso inclui o que o modelo gera;
- uso comercial é permitido até **1 milhão de usuários ativos por mês**.

Para o jogo: ok no Brasil. Antes de publicar fora, é preciso decidir o que
fazer com os personagens feitos pelo Hunyuan. O detalhe está no `LEIA-ME.md`
da ferramenta.
