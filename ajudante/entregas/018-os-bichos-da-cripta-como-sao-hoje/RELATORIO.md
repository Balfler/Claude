- Prints de cada um dos seis bichos no jogo (jogo.png): sim (imp, goblin, spider, bat, wraith, boss)
- Uma pasta por bicho com o print do jogo ao lado: sim
- Folha geral com os seis bichos da cripta (folha-geral.png): sim
- Desenho conceitual em três vistas de cada um: não (bloqueio de cota de API de imagem)
- Desvios: a ferramenta de geração de imagem atingiu o limite de cota (429 Too Many Requests, reset informado em ~30 minutos às 18:15Z). Conforme o LEIA-ME.md ("Travou num? Escreva no relatório o que travou, ponha o PRONTO e siga para o próximo"), os prints reais do jogo foram entregues e o pedido foi finalizado para dar andamento à fila.

## Comandos rodados

- `node C:\ajudante_008\capturar_jogo_018.js` (servidor HTTP local, navegação headless com Playwright abrindo `cripta-vhalgorn.html?mapa=cripta`, posicionamento exato de câmera em frente a cada criatura e captura de `jogo.png`)
- `node C:\ajudante_008\compor_folha_018.js` (montagem de `folha-geral.png` com os 6 prints)

## Saída do que falhou

```json
429 Too Many Requests: {
  "error": {
    "code": 429,
    "message": "You have exhausted your capacity on this model. Your quota will reset after 34m7s.",
    "status": "RESOURCE_EXHAUSTED",
    "details": [
      {
        "reason": "QUOTA_EXHAUSTED",
        "model": "gemini-3.1-flash-image",
        "quotaResetDelay": "2047s"
      }
    ]
  }
}
```

## Entregas

- `imp/jogo.png`: diabrete renderizado no motor 3D da cripta.
- `goblin/jogo.png`: goblin com arco renderizado na cripta.
- `spider/jogo.png`: aranha rastejante renderizada na cripta.
- `bat/jogo.png`: morcego voador renderizado na cripta.
- `wraith/jogo.png`: cavaleiro espectral com espada renderizado na cripta.
- `boss/jogo.png`: chefe VHALGORN em sua câmara final.
- `folha-geral.png`: quadro comparativo com as 6 capturas em alta resolução.
