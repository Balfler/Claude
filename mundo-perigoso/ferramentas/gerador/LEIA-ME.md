# O gerador local de personagem

A folha de referência (frente, perfil e costas em T-pose, numa imagem só)
vira um projeto do ateliê (`.atelie`) com rig, peso e animações, rodando
nesta máquina. É o caminho que passava pelo site do Sorceress.

```
node mundo-perigoso/atelie/cli.js gerar <folha.png> [--nome x] [--semente N] [--saida pasta] [--jogo]
```

1. **Recorta** a folha em três PNG RGBA quadrados, de 1024 pixels: fundo
   transparente, a figura no meio, 10% de margem (`atelie/gerador.js`, com o
   recorte do `tresvistas.js`).
2. **Gera a forma** com o **Hunyuan3D-2mv turbo**, só a forma (`gerar.py`,
   aqui), e grava um `.glb` sem cor.
3. **Pinta a forma com o próprio desenho** e monta o `.atelie`, com a fonte
   de alta resolução, o rig, o peso com pano e as capturas de andar e correr
   (`sondagens/7-tres-vistas/tresvistas.js --forma`).
4. Com `--jogo`, também exporta o de 256 (`cli.js exportar --altura 256`).

Sem `--saida`, tudo vai para `Arte/personagens/gerados/<nome>/`: as três
vistas, o `.glb`, o `.atelie`, o `.vox`, a folha de contato e o
`<nome>-gerar.json`, com os tempos e a VRAM máxima.

## Opções

| Opção | O quê | Padrão |
|---|---|---|
| `--nome` | nome do personagem e dos arquivos | o nome da folha |
| `--semente` | a semente do sorteio; outra semente dá outra forma | 12345 |
| `--passos` | passos da difusão (o turbo foi feito para poucos) | 5 |
| `--octree` | resolução da grade da malha; menos gasta menos VRAM | 380 |
| `--chunks` | pedaços por vez no VAE; menos gasta menos VRAM | 20000 |
| `--guia` | o quanto a forma segue as vistas (guidance) | 5,0 |
| `--pouca-vram` | só a parte que trabalha fica na placa; o resto fica na RAM | desligado |
| `--chave-perfil` | `left` ou `right`, o nome do perfil para o Hunyuan | pelo lado para onde o perfil olha |
| `--perfil` | `direita` ou `esquerda`, se a adivinhação pelos pés errar | adivinha |
| `--gerador` | a pasta do gerador (também pela variável `MUNDO_GERADOR`) | `C:\ferramentas\gerador` |
| `--python` | outro Python (também `MUNDO_GERADOR_PYTHON`) | `<gerador>\venv\Scripts\python.exe` |
| `--jogo` | exporta o `.personagem` de 256 | desligado |

A opção vem **depois** da folha: `cli.js gerar folha.png --pouca-vram`.

O `gerar.py` também roda sozinho, com as três vistas já recortadas:

```
C:\ferramentas\gerador\venv\Scripts\python.exe mundo-perigoso\ferramentas\gerador\gerar.py ^
  --frente f.png --perfil p.png --costas c.png --saida forma.glb --chave-perfil right
```

No fim, ele imprime uma linha `RESULTADO {...}` com os tempos de cada etapa
(importar, carregar, condicionar, difusão, decodificar, limpar e gravar) e a
VRAM máxima.

## A chave do perfil

O Hunyuan chama as vistas de `front`, `left`, `back` e `right`. Nos exemplos
dele (`assets/example_mv_images/1/left.png`), `left` é o personagem olhando
para a **esquerda** da imagem, mostrando o lado esquerdo dele. Então um
perfil que olha para a **direita**, como o da folha do guerreiro, é `right`.
Isso é o que o código faz sozinho. A sondagem 17 confere na forma gerada.

## Instalação

Tudo o que é pesado fica em `C:\ferramentas\gerador\`, fora do Drive, para
não sincronizar 10 GB. No projeto ficam só estes arquivos.

O jeito mais curto é o `instalar.ps1`, ao lado, rodado pelo Leandro num
PowerShell comum. Ele pula o que já está feito:

```
powershell -ExecutionPolicy Bypass -File "G:\Meu Drive\Claude\mundo-perigoso\ferramentas\gerador\instalar.ps1"
```

O mesmo, passo a passo:

1. **Python 3.11** (a máquina só tem 3.13 e 3.14), instalado só para o
   usuário, sem mexer no PATH nem no `py`:
   ```
   C:\ferramentas\gerador\python-3.11.9-amd64.exe /quiet InstallAllUsers=0 TargetDir=C:\ferramentas\gerador\python311 PrependPath=0 Include_launcher=0 Shortcuts=0 AssociateFiles=0 Include_test=0 Include_doc=0
   ```
   O instalador já está baixado nessa pasta. Ele usa o Windows Installer,
   que não roda de dentro da caixa de proteção do Claude Code: este passo é
   do Leandro.
2. **O ambiente virtual:**
   ```
   C:\ferramentas\gerador\python311\python.exe -m venv C:\ferramentas\gerador\venv
   ```
3. **O PyTorch com CUDA e o que a parte de forma importa.** Sem a textura
   (`hy3dgen.texgen`, o rasterizador compilado) e sem o `rembg`:
   ```
   C:\ferramentas\gerador\venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
   C:\ferramentas\gerador\venv\Scripts\python.exe -m pip install diffusers transformers accelerate safetensors einops omegaconf pyyaml tqdm numpy pillow opencv-python-headless trimesh pymeshlab scikit-image
   ```
   O código do Hunyuan3D-2 é do GitHub:
   ```
   git clone --depth 1 https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git C:\ferramentas\gerador\Hunyuan3D-2
   ```
   O `gerar.py` põe a pasta no caminho do Python; não precisa de
   `pip install -e`.
4. **Os pesos**: só o `hunyuan3d-dit-v2-mv-turbo` do
   `tencent/Hunyuan3D-2mv`, que já traz o DINO, o DiT e o VAE num arquivo de
   4,93 GB, em
   `C:\ferramentas\gerador\pesos\tencent\Hunyuan3D-2mv\hunyuan3d-dit-v2-mv-turbo\`
   (`config.yaml` e `model.fp16.safetensors`; sha256 `172d7a98…74e45`). O
   `gerar.py` põe `HY3DGEN_MODELS` nessa pasta e `HF_HUB_OFFLINE=1`: nada é
   baixado no meio de uma geração.
5. **Opcional, o VAE turbo** (407 MB, `tencent/Hunyuan3D-2`, subpasta
   `hunyuan3d-vae-v2-0-turbo`), em
   `pesos\tencent\Hunyuan3D-2\hunyuan3d-vae-v2-0-turbo\`. É o que o
   `enable_flashvdm()` do README usa. Sem ele, o FlashVDM decodifica com o
   VAE que vem junto do DiT.

**Feito em 03/10/2026:** os pesos, o código e o instalador do Python estão
em `C:\ferramentas\gerador\`. **Falta:** o passo 1, que é do Leandro, e
depois os passos 2 e 3.

## Se não couber nos 6 GB

Na ordem:

1. `--pouca-vram`: o DINO, o DiT e o VAE vão à placa um de cada vez;
2. menos `--octree` (256) e menos `--chunks` (8000);
3. em último caso, o `tencent/Hunyuan3D-2mini`, com uma imagem só, a de
   frente. Ainda não está no `gerar.py`.

O que funcionou fica registrado na sondagem 17.

## A licença

Os pesos e o código são da **Tencent Hunyuan 3D 2.0 Community License**:

- vale no mundo todo, **menos na União Europeia, no Reino Unido e na Coreia
  do Sul**. O uso, e também o uso do que o modelo gera, fica fora da licença
  nesses lugares;
- uso comercial é permitido, até **1 milhão de usuários ativos por mês**;
  passou disso, é preciso pedir licença à Tencent;
- não dá direito a usar a marca da Tencent.

Para o Mundo Perigoso: ok no Brasil. **Se o jogo for vendido ou ficar
disponível na UE, no Reino Unido ou na Coreia do Sul, um personagem feito
com o Hunyuan não pode ir para lá.** É uma decisão a tomar antes de
publicar.
