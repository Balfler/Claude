"""
O gerador local de forma: tres vistas em PNG (fundo transparente) -> .glb.

Usa o Hunyuan3D-2mv, versao turbo, so a parte de forma (hy3dgen.shapegen).
A cor nao sai daqui: o tresvistas.js projeta o proprio desenho na forma.

Uso (com o Python do ambiente em C:\\ferramentas\\gerador\\venv):

    python gerar.py --frente f.png --perfil p.png --costas c.png --saida forma.glb
        [--chave-perfil right] [--passos 5] [--semente 12345]
        [--octree 380] [--chunks 20000] [--guia 5.0]
        [--pouca-vram] [--cru] [--raiz C:\\ferramentas\\gerador]

--chave-perfil: o nome da vista de perfil para o Hunyuan. "left" e o
  personagem olhando para a ESQUERDA da imagem (o lado esquerdo dele); um
  perfil que olha para a direita e "right". Conferido na sondagem 17.
--pouca-vram: carrega tudo na memoria do PC e so leva para a placa a parte
  que esta trabalhando (o DINO, depois o DiT, depois o VAE).
--cru: nao tira os pedacos soltos da malha.

No fim imprime uma linha "RESULTADO {json}" com os tempos e a VRAM maxima,
que o atelie/cli.js gerar le.
"""
import argparse
import json
import os
import sys
import time


def argumentos():
    p = argparse.ArgumentParser(description="tres vistas -> .glb (Hunyuan3D-2mv turbo, so a forma)")
    p.add_argument("--frente", required=True)
    p.add_argument("--perfil", required=True)
    p.add_argument("--costas", required=True)
    p.add_argument("--saida", required=True)
    p.add_argument("--chave-perfil", default="right", choices=["left", "right"])
    p.add_argument("--passos", type=int, default=5)
    p.add_argument("--semente", type=int, default=12345)
    p.add_argument("--octree", type=int, default=380, help="octree_resolution: menos gasta menos VRAM e da menos detalhe")
    p.add_argument("--chunks", type=int, default=20000, help="num_chunks: menos gasta menos VRAM no VAE")
    p.add_argument("--guia", type=float, default=5.0, help="guidance_scale")
    p.add_argument("--pouca-vram", action="store_true")
    p.add_argument("--cru", action="store_true")
    p.add_argument("--raiz", default=os.environ.get("MUNDO_GERADOR", r"C:\ferramentas\gerador"))
    return p.parse_args()


def main():
    a = argumentos()
    raiz = a.raiz
    pesos = os.path.join(raiz, "pesos")
    codigo = os.path.join(raiz, "Hunyuan3D-2")
    dit = os.path.join(pesos, "tencent", "Hunyuan3D-2mv", "hunyuan3d-dit-v2-mv-turbo", "model.fp16.safetensors")
    vae_turbo = os.path.join(pesos, "tencent", "Hunyuan3D-2", "hunyuan3d-vae-v2-0-turbo", "model.fp16.safetensors")
    for nome, cam in (("o codigo do Hunyuan3D-2", codigo), ("os pesos do hunyuan3d-dit-v2-mv-turbo", dit)):
        if not os.path.exists(cam):
            print("FALTA " + nome + ": " + cam + " (ver mundo-perigoso/ferramentas/gerador/LEIA-ME.md)", file=sys.stderr)
            sys.exit(2)
    # tudo local: nada de baixar do Hugging Face no meio do caminho
    os.environ["HY3DGEN_MODELS"] = pesos
    os.environ["HF_HUB_OFFLINE"] = "1"
    sys.path.insert(0, codigo)

    t = {}
    t0 = time.time()
    import torch
    from PIL import Image
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline, FloaterRemover, DegenerateFaceRemover
    from hy3dgen.shapegen.pipelines import retrieve_timesteps
    import numpy as np
    if not torch.cuda.is_available():
        print("FALTA a placa: o PyTorch nao enxerga CUDA (torch " + torch.__version__ + ")", file=sys.stderr)
        sys.exit(3)
    cuda = torch.device("cuda")
    t["importar"] = time.time() - t0

    imagens = {}
    for chave, arq in (("front", a.frente), (a.chave_perfil, a.perfil), ("back", a.costas)):
        im = Image.open(arq)
        if im.mode != "RGBA":
            print("a vista " + arq + " precisa ter fundo transparente (RGBA)", file=sys.stderr)
            sys.exit(4)
        imagens[chave] = im

    # carregar: com pouca VRAM tudo fica na memoria do PC
    t0 = time.time()
    pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        "tencent/Hunyuan3D-2mv", subfolder="hunyuan3d-dit-v2-mv-turbo", variant="fp16",
        device="cpu" if a.pouca_vram else "cuda", dtype=torch.float16)
    # o VAE turbo (FlashVDM) e outro download; sem ele, o VAE que vem junto
    # com o DiT decodifica com o FlashVDM do mesmo jeito
    pipe.enable_flashvdm(replace_vae=os.path.exists(vae_turbo))
    if a.pouca_vram:
        pipe.vae.to("cpu")
    pipe.device = cuda
    torch.cuda.synchronize()
    t["carregar"] = time.time() - t0
    torch.cuda.reset_peak_memory_stats()

    def na_placa(parte):
        if a.pouca_vram:
            for outra in (pipe.conditioner, pipe.model, pipe.vae):
                if outra is not parte:
                    outra.to("cpu")
            torch.cuda.empty_cache()
            parte.to(cuda)

    with torch.no_grad():
        # 1. as vistas viram condicao (DINO)
        t0 = time.time()
        na_placa(pipe.conditioner)
        guia_embutido = getattr(pipe.model, "guidance_embed", False) is True
        cfg = a.guia >= 0 and not guia_embutido
        entrada = pipe.prepare_image(imagens)
        imagem = entrada.pop("image")
        cond = pipe.encode_cond(image=imagem, additional_cond_inputs=entrada,
                                do_classifier_free_guidance=cfg, dual_guidance=False)
        cond = {k: (v.to(cuda) if hasattr(v, "to") else v) for k, v in cond.items()}
        torch.cuda.synchronize()
        t["condicionar"] = time.time() - t0

        # 2. a difusao (DiT), poucos passos no turbo
        t0 = time.time()
        na_placa(pipe.model)
        gerador = torch.Generator(device="cpu").manual_seed(a.semente)
        sigmas = np.linspace(0, 1, a.passos)
        passos, _ = retrieve_timesteps(pipe.scheduler, a.passos, cuda, sigmas=sigmas)
        latentes = pipe.prepare_latents(imagem.shape[0], torch.float16, cuda, gerador)
        guia = torch.tensor([a.guia] * imagem.shape[0], device=cuda, dtype=torch.float16) if guia_embutido else None
        for passo in passos:
            x = torch.cat([latentes] * 2) if cfg else latentes
            tt = passo.expand(x.shape[0]).to(latentes.dtype) / pipe.scheduler.config.num_train_timesteps
            ruido = pipe.model(x, tt, cond, guidance=guia)
            if cfg:
                c, u = ruido.chunk(2)
                ruido = u + a.guia * (c - u)
            latentes = pipe.scheduler.step(ruido, passo, latentes).prev_sample
        torch.cuda.synchronize()
        t["difusao"] = time.time() - t0

        # 3. a malha (VAE e marching cubes)
        t0 = time.time()
        na_placa(pipe.vae)
        malha = pipe._export(latentes, "trimesh", 1.01, 0.0, a.chunks, a.octree, None, enable_pbar=False)[0]
        torch.cuda.synchronize()
        t["decodificar"] = time.time() - t0

    vram = torch.cuda.max_memory_allocated() / 2**30
    vram_reservada = torch.cuda.max_memory_reserved() / 2**30
    if malha is None:
        print("o gerador nao achou superficie nenhuma (malha vazia)", file=sys.stderr)
        sys.exit(5)

    t0 = time.time()
    if not a.cru:
        malha = FloaterRemover()(malha)
        malha = DegenerateFaceRemover()(malha)
    os.makedirs(os.path.dirname(os.path.abspath(a.saida)), exist_ok=True)
    malha.export(a.saida)
    t["limpar_e_gravar"] = time.time() - t0

    r = {
        "saida": a.saida, "vertices": int(len(malha.vertices)), "triangulos": int(len(malha.faces)),
        "tempos_s": {k: round(v, 2) for k, v in t.items()},
        "vram_max_gb": round(vram, 2), "vram_reservada_gb": round(vram_reservada, 2),
        "placa": torch.cuda.get_device_name(0), "pouca_vram": a.pouca_vram,
        "passos": a.passos, "semente": a.semente, "octree": a.octree, "chunks": a.chunks, "guia": a.guia,
        "chave_perfil": a.chave_perfil, "vae_turbo": os.path.exists(vae_turbo),
    }
    print("RESULTADO " + json.dumps(r))


if __name__ == "__main__":
    main()
