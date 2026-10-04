# Instala o gerador local (Hunyuan3D-2mv turbo, so a forma) em C:\ferramentas\gerador.
# Pode rodar de novo: o que ja esta feito e pulado.
#
#   powershell -ExecutionPolicy Bypass -File "G:\Meu Drive\Claude\mundo-perigoso\ferramentas\gerador\instalar.ps1"
#
# Ver o LEIA-ME.md ao lado.

$ErrorActionPreference = "Stop"
$raiz = if ($env:MUNDO_GERADOR) { $env:MUNDO_GERADOR } else { "C:\ferramentas\gerador" }
New-Item -ItemType Directory -Force $raiz | Out-Null
Set-Location $raiz

# 1. Python 3.11, so para o usuario, sem mexer no PATH nem no "py"
$py = Join-Path $raiz "python311\python.exe"
if (-not (Test-Path $py)) {
    $inst = Join-Path $raiz "python-3.11.9-amd64.exe"
    if (-not (Test-Path $inst)) {
        Write-Host "baixando o Python 3.11.9..."
        Invoke-WebRequest "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -OutFile $inst
    }
    Write-Host "instalando o Python 3.11.9 em $raiz\python311..."
    $p = Start-Process -FilePath $inst -Wait -PassThru -ArgumentList "/quiet", "InstallAllUsers=0", "TargetDir=$raiz\python311",
        "PrependPath=0", "Include_launcher=0", "InstallLauncherAllUsers=0", "AssociateFiles=0", "Shortcuts=0", "Include_test=0", "Include_doc=0"
    if (-not (Test-Path $py)) { throw "o instalador do Python saiu com $($p.ExitCode) e nao deixou $py" }
}
& $py --version

# 2. o ambiente virtual
$vpy = Join-Path $raiz "venv\Scripts\python.exe"
if (-not (Test-Path $vpy)) { & $py -m venv (Join-Path $raiz "venv") }
& $vpy -m pip install --upgrade pip

# 3. o PyTorch com CUDA e o que a parte de forma importa (sem textura, sem rembg)
& $vpy -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
& $vpy -m pip install diffusers transformers accelerate safetensors einops omegaconf pyyaml tqdm `
    numpy pillow opencv-python-headless trimesh pymeshlab scikit-image

# 4. o codigo do Hunyuan3D-2
if (-not (Test-Path (Join-Path $raiz "Hunyuan3D-2"))) {
    git clone --depth 1 https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git (Join-Path $raiz "Hunyuan3D-2")
}

# 5. os pesos do DiT turbo multivista (4,9 GB)
$pasta = Join-Path $raiz "pesos\tencent\Hunyuan3D-2mv\hunyuan3d-dit-v2-mv-turbo"
New-Item -ItemType Directory -Force $pasta | Out-Null
$base = "https://huggingface.co/tencent/Hunyuan3D-2mv/resolve/main/hunyuan3d-dit-v2-mv-turbo"
if (-not (Test-Path "$pasta\config.yaml")) { Invoke-WebRequest "$base/config.yaml" -OutFile "$pasta\config.yaml" }
if (-not (Test-Path "$pasta\model.fp16.safetensors")) {
    Write-Host "baixando os pesos (4,9 GB)..."
    curl.exe -L -C - -o "$pasta\model.fp16.safetensors" "$base/model.fp16.safetensors"
}

# 6. conferir
& $vpy -c "import torch; print('torch', torch.__version__, 'cuda', torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else '')"
Write-Host "pronto. Teste, na pasta do projeto: node mundo-perigoso/atelie/cli.js gerar <guerreiro-folha.png> --nome guerreiro"
