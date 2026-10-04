# Modelos Abertos de Imagem para 3D (Avaliação para o Nitro V)

## Especificações da Máquina de Teste

- **Modelo:** Acer Nitro V 15 (ANV15-51)
- **Processador:** 13th Gen Intel(R) Core(TM) i5-13420H (8 núcleos, 12 threads)
- **Placa de Vídeo (GPU):** NVIDIA GeForce RTX 4050 Laptop GPU (6.141 MiB / 6 GB GDDR6 VRAM, 70W TGP, Driver 581.42, CUDA 13.0)
- **Memória RAM:** 24 GB DDR5 (23,7 GB utilizáveis)
- **Sistema Operacional:** Windows 11 Home 64-bit

---

## Tabela Comparativa de Modelos

| Modelo | VRAM Pedida | Entrada | Saída | Tempo por Peça | Licença (Uso Comercial?) | Cabe no Nitro V (6 GB)? | Pinokio? |
|---|---|---|---|---|---|---|---|
| **TripoSR** | **~6 GB** (ajustável via `chunk_size`) [[Fonte]](https://github.com/VAST-AI-Research/TripoSR) | 1 imagem (RGB) | Malha 3D (.obj / .glb) com cores de vértice | **~0,5 s** [[Fonte]](https://arxiv.org/abs/2403.02151) | **MIT** (Sim, livre) [[Fonte]](https://github.com/VAST-AI-Research/TripoSR/blob/main/LICENSE) | **Sim** (folgado com `chunk_size` menor) | Sim [[Pinokio]](https://pinokio.co/app/triposr) |
| **Stable Fast 3D (SF3D)** | **~6 GB** [[Fonte]](https://github.com/Stability-AI/stable-fast-3d) | 1 imagem (RGB) | Malha (.glb / .obj) com UV unwrapping, textura e delighting | **~0,3 a 0,5 s** [[Fonte]](https://github.com/Stability-AI/stable-fast-3d) | **Stability Community** (Sim, até $1M faturamento anual) [[Fonte]](https://huggingface.co/stabilityai/stable-fast-3d) | **Sim** (limite exato dos 6 GB) | Sim [[Pinokio]](https://pinokio.co/app/sf3d) |
| **Hunyuan3D-2mini** | **~5 GB** (só geometria) [[Fonte]](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | 1 imagem ou multi-vistas (`Hunyuan3D-2mv`) | Malha 3D (.obj / .glb) | **~10 a 25 s** (modelo turbo/fast) [[Fonte]](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | **Tencent Hunyuan Community** (Sim, até 1M usuários/mês; restrições territoriais EU/UK/KR) [[Fonte]](https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE) | **Sim** (ideal para geometria do corpo) | Sim [[Pinokio]](https://pinokio.co/app/hunyuan3d-2) |
| **TripoSG** | **~8 GB** (recomendado; ~6 GB em FP16/offload) [[Fonte]](https://github.com/VAST-AI-Research/TripoSG) | 1 imagem (ou rascunho/scribble) | Malha 3D (.obj / .glb) de alta geometria | **~5 a 15 s** [[Fonte]](https://github.com/VAST-AI-Research/TripoSG) | **MIT** (Sim, livre) [[Fonte]](https://github.com/VAST-AI-Research/TripoSG/blob/main/LICENSE) | **Com restrição** (precisa de FP16 ou offload para os 24 GB de RAM) | ComfyUI / Pinokio [[Fonte]](https://github.com/VAST-AI-Research/TripoSG) |
| **InstantMesh** | **8 a 16 GB** (mínimo 8 GB, ideal 12-16 GB) [[Fonte]](https://github.com/TencentARC/InstantMesh) | 1 imagem (RGB) | Malha 3D (.obj com cores de vértice ou textura) | **~10 s** [[Fonte]](https://github.com/TencentARC/InstantMesh) | **Apache 2.0** (Sim, livre com atribuição) [[Fonte]](https://github.com/TencentARC/InstantMesh/blob/main/LICENSE.txt) | **Não** (OOM em 6 GB sem ComfyUI com offload agressivo) | Via ComfyUI no Pinokio |
| **TRELLIS / TRELLIS.2** | **8 GB** (FP16 otimizado) a **24 GB** (padrão) [[Fonte]](https://github.com/microsoft/TRELLIS) | 1 imagem ou texto | Gaussian Splatting, Radiance Fields e malha (.glb) | **~30 s** [[Fonte]](https://github.com/microsoft/TRELLIS) | **MIT** (núcleo e pesos; bibliotecas de renderização externas têm restrições) [[Fonte]](https://github.com/microsoft/TRELLIS/blob/main/LICENSE) | **Não** (requer 8 GB+ mesmo otimizado; recomendável 12 GB+) | Sim [[Pinokio]](https://pinokio.co/app/trellis) |
| **Hunyuan3D-2.0 / 2.1 (Full)** | **6 GB** (geometria) / **12 a 16 GB** (com texturização PBR) [[Fonte]](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | 1 imagem ou várias vistas | Malha (.glb / .obj) + texturas completas PBR | **~30 a 90 s** [[Fonte]](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | **Tencent Hunyuan Community** (Sim, até 1M usuários/mês) [[Fonte]](https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE) | **Só geometria** (texturização requer 12 GB+ de VRAM) | Sim [[Pinokio]](https://pinokio.co/app/hunyuan3d-2) |
| **Unique3D** | **12 a 16 GB** [[Fonte]](https://github.com/AiuniAI/Unique3D) | 1 imagem (RGB) | Malha 3D detalhada com mapas normais | **~30 s** [[Fonte]](https://arxiv.org/abs/2405.20343) | **MIT** (código) / **CC BY-NC-SA 4.0** (pesos/pesquisa - não comercial) [[Fonte]](https://github.com/AiuniAI/Unique3D#license) | **Não** (estoura os 6 GB de VRAM) | Sim (Unique3D-pinokio) |

---

## Conclusões e Recomendações para o Projeto

1. **Modelos que cabem no Nitro V (6 GB VRAM):**
   - **TripoSR:** O mais leve e rápido (<0,5 s). Licença MIT limpa para uso comercial. Gera forma rápida, embora mais simples e às vezes "derretida".
   - **Stable Fast 3D (SF3D):** Cabe em 6 GB, gera malha com UV unwrapping em ~0,4 s. Licença Stability Community permite faturamento até $1M/ano.
   - **Hunyuan3D-2mini:** Excelente candidato para *geometria pura* (pede apenas ~5 GB de VRAM). Permite gerar a forma 3D precisa sem gastar VRAM com textura, alinhando-se perfeitamente com a diretriz do projeto (a textura vem da projeção do desenho 2D original).
   - **TripoSG:** Modelo promissor (1.5B parâmetros, licença MIT). Em FP16 com descarregamento parcial de tensores para a RAM do sistema (24 GB disponíveis no Nitro V), é testável localmente.

2. **Modelos inviáveis localmente (6 GB VRAM):**
   - **TRELLIS / TRELLIS.2:** O padrão pede 24 GB de VRAM (otimizado em FP16 pede 8 GB). Fica reservado para execuções pontuais em nuvem (ex: Google Colab / HuggingFace Spaces).
   - **InstantMesh e Unique3D:** Ambos exigem de 8 a 16 GB de VRAM e dão erro de falta de memória (OOM) em GPUs de 6 GB, sendo que o Unique3D ainda possui restrição de licença não-comercial nos pesos.

3. **Facilidade de Instalação (Pinokio):**
   - TripoSR, SF3D, Hunyuan3D-2 e TRELLIS possuem instaladores automatizados em um clique no ecossistema Pinokio, facilitando testes sem atrito de configuração manual de dependências CUDA no Windows.
