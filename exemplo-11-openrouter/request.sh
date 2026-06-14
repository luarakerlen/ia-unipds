source .env

API_URL="https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_SITE_URL="https://localhost:3000"
OPENROUTER_SITE_NAME="My Example"

NLP_MODEL="google/gemma-4-31b-it:free"

curl --silent -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "HTTP-Referer: $OPENROUTER_SITE_URL" \
  -H "X-Title: $OPENROUTER_SITE_NAME" \
  -d '{
    "model": "'"$NLP_MODEL"'",
    "messages": [
      {
        "role": "user",
        "content": "Me conte uma curiosidade sobre a copa do mundo 2026"
      }
    ],
    "temperature": 0.3,
    "max_tokens": 1000
  }' | jq

# {
#   "id": "gen-1781451892-Bxko9lF85Bnj4pIB9ayU",
#   "object": "chat.completion",
#   "created": 1781451892,
#   "model": "google/gemma-4-31b-it-20260402:free",
#   "provider": "OpenInference",
#   "system_fingerprint": "vllm-0.21.1rc1.dev262+g33d7cbe02-tp8-dd71347d",
#   "service_tier": null,
#   "choices": [
#     {
#       "index": 0,
#       "logprobs": null,
#       "finish_reason": "stop",
#       "native_finish_reason": "stop",
#       "message": {
#         "role": "assistant",
#         "content": "Uma das curiosidades mais marcantes da Copa do Mundo de 2026 é que ela será a **primeira edição da história a contar com 48 seleções**.\n\nAnteriormente, o torneio era limitado a 32 equipes. Com essa expansão, a Copa de 2026 terá mudanças significativas:\n\n1.  **Mais Jogos:** O número total de partidas saltará de 64 para **104 jogos**.\n2.  **Novo Formato:** Para acomodar tantas seleções, a fase de grupos será reorganizada (inicialmente prevista para 12 grupos de 4 seleções), e haverá a introdução de uma nova fase: a **dezesseis avos de final** (32 seleções avançando para o mata-mata).\n3.  **Três Países-Sede:** Será a primeira vez que a Copa será sediada conjuntamente por três nações: **Canadá, Estados Unidos e México**.\n\nIsso significa que o torneio será gigantesco, cobrindo distâncias geográficas enormes e dando a chance para países que raramente conseguem se classificar de participarem da maior festa do futebol.",
#         "refusal": null,
#         "reasoning": null
#       }
#     }
#   ],
#   "usage": {
#     "prompt_tokens": 28,
#     "completion_tokens": 252,
#     "total_tokens": 280,
#     "cost": 0,
#     "is_byok": false,
#     "prompt_tokens_details": {
#       "cached_tokens": 0,
#       "cache_write_tokens": 0,
#       "audio_tokens": 0,
#       "video_tokens": 0
#     },
#     "cost_details": {
#       "upstream_inference_cost": 0,
#       "upstream_inference_prompt_cost": 0,
#       "upstream_inference_completions_cost": 0
#     },
#     "completion_tokens_details": {
#       "reasoning_tokens": 0,
#       "image_tokens": 0,
#       "audio_tokens": 0
#     }
#   }
# }