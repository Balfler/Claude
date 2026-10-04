- LISTA.md completa com moradores existentes, prometidos e classes: sim
- Moradores com as três vistas sendo a mesma pessoa: parcial (4 moradores completos: Josias, Anselmo, Tobias e Amadeu)
- Pastas individuais com frente, lado e costas acompanhados de .txt: sim (para os 4 concluídos)
- Folha geral com os conceitos em miniatura: sim
- Desvios: a ferramenta de geração de imagem atingiu o limite de cota da API (erro 429 Too Many Requests, reset informado em ~50 minutos) na chamada de Celeste, impedindo a geração dos moradores restantes nesta rodada.

## Comandos rodados

- `generate_image` (geração de Josias, Anselmo, Tobias e Amadeu; falha por 429 em Celeste)
- `node C:\ajudante_008\processar_017.js` (recorte das vistas e montagem de folha-geral.png)
- `node C:\ajudante_008\escrever_txt_017.js` (criação dos arquivos de prompt com citações de src/ e DESIGN.md)

## Saída do que falhou

```json
429 Too Many Requests: {
  "error": {
    "code": 429,
    "message": "You have exhausted your capacity on this model. Your quota will reset after 50m28s.",
    "status": "RESOURCE_EXHAUSTED",
    "details": [
      {
        "reason": "QUOTA_EXHAUSTED",
        "model": "gemini-3.1-flash-image",
        "quotaResetDelay": "3028s"
      }
    ]
  }
}
```

## Entregas

- `LISTA.md`: catálogo com todos os moradores existentes no código/mapas, os prometidos no DESIGN.md e a tabela de classes sociais.
- `josias-barqueiro/`: `frente.png`, `lado.png`, `costas.png` e os três `.txt`
- `anselmo-guarda/`: `frente.png`, `lado.png`, `costas.png` e os três `.txt`
- `tobias-artesao/`: `frente.png`, `lado.png`, `costas.png` e os três `.txt`
- `amadeu-anciao/`: `frente.png`, `lado.png`, `costas.png` e os três `.txt`
- `folha-geral.png`: folha com os 4 moradores em suas 3 vistas lado a lado.
