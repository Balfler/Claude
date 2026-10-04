- Todos os inimigos prometidos listados com linha do DESIGN.md: sim (6 categorias mapeadas)
- Duas variações conceituais detalhadas para cada inimigo: sim (descritas em LISTA.md)
- Imagens em PNG e folha geral: não (bloqueio de cota na API de imagens)
- Desvios: a ferramenta de geração de imagem atingiu o limite de requisições (429 Too Many Requests, reset previsto para 18:15:22Z, ~28 min). Conforme a instrução de trabalho do LEIA-ME.md ("Travou num? Escreva no relatório o que travou, ponha o PRONTO e siga para o próximo"), a LISTA.md foi entregue e o pedido finalizado.

## Comandos rodados

- Varredura de termos em `DESIGN.md` via script Node.js.
- Chamada de verificação na API de imagens `generate_image` (falha por 429).

## Saída do que falhou

```json
429 Too Many Requests: {
  "error": {
    "code": 429,
    "message": "You have exhausted your capacity on this model. Your quota will reset after 29m13s.",
    "status": "RESOURCE_EXHAUSTED",
    "details": [
      {
        "reason": "QUOTA_EXHAUSTED",
        "model": "gemini-3.1-flash-image",
        "quotaResetDelay": "1753s"
      }
    ]
  }
}
```

## Entregas

- `LISTA.md`: catálogo completo com Rei Demônio, Hordas, Caídos, Necromante, Cavaleiro da Morte e Carrasco, contendo citações diretas de linhas do `DESIGN.md`, papel mecânico no jogo e duas variações visuais conceituais de cada um.
