# Board Game Recommendations — PostgreSQL + pgvector

## Objetivo

Adicionar persistência e recomendação por **similaridade de vetores** ao sistema de aluguel de jogos de tabuleiro, usando **PostgreSQL** com a extensão **pgvector**. Os embeddings devem ser os mesmos produzidos por `src/workers/encoding.ts` (`encodeProduct`, `encodeUser`, `makeContext`), garantindo comparabilidade com o pipeline TF.js já existente.

Esta especificação descreve **o que** construir e **como** integrar; a implementação só começa após aprovação deste documento.

## Escopo

### Incluído (v1)

- Banco PostgreSQL local via Docker (`pgvector/pgvector`)
- Schema relacional: jogos, usuários, aluguéis + colunas `embedding`
- Tabela de **contexto de encoding** (vocabulários e normalizações) para reproduzir vetores de forma determinística
- Scripts Node/TS: aplicar schema, popular dados a partir de `data/*.json`, calcular e gravar embeddings
- API HTTP mínima (Node): recomendação por similaridade (cosseno)
- Documentação de variáveis de ambiente e ordem de execução
- Coexistência com o frontend atual: TF.js no worker **permanece**; recomendação via pgvector é um **caminho paralelo** (novo botão ou modo comparativo)

### Fora de escopo (v1)

- Substituir ou remover o treino TF.js no browser
- Autenticação, multi-tenant, deploy em produção
- Re-treino automático de embeddings quando o catálogo muda (apenas script manual reexecutável)
- Híbrido vector DB + rede neural (re-ranking) — marcado como v2 no roadmap
- Prisma/Drizzle ORM (usar `pg` direto para reduzir superfície de aprendizado)
- Sincronização bidirecional JSON ↔ Postgres em tempo real

## Contexto do sistema atual

| Aspecto | Estado atual |
|---|---|
| Dados | `data/games.json` (~90 jogos), `data/users.json` (~54 usuários) |
| Vetores | Calculados em memória no Web Worker; perdidos ao recarregar |
| Recomendação | Rede densa TF.js sobre concatenação `[userVector, productVector]` |
| Encoding | `makeContext` → índices de mechanics/categories/theme + normalizações |
| Dimensões (catálogo atual) | **126** (`encodeProduct`), **127** (`encodeUser` = 1 idade + 126 preferência) |

Contagem derivada do catálogo em maio/2026: 91 mechanics, 12 categories, 20 themes → `3 + 91 + 12 + 20 = 126`.

> **Regra crítica:** se `games.json` ganhar novas mechanics/categories/themes, `dimensions` muda. Embeddings antigos ficam inválidos até reindexação com o mesmo `encoding_context`.

## Arquitetura alvo

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Vite — inalterado na maior parte)                      │
│  ┌──────────────┐  ┌─────────────────────────────────────────┐ │
│  │ TF.js Worker │  │ RecommendationService (novo)            │ │
│  │ (existente)  │  │ GET /api/recommend/:userId              │ │
│  └──────────────┘  └──────────────────┬──────────────────────┘ │
└───────────────────────────────────────┼──────────────────────────┘
                                        │ HTTP
┌───────────────────────────────────────▼──────────────────────────┐
│  server/ (Node + Express ou Fastify)                              │
│  ├── routes/recommend.ts                                          │
│  └── db/pool.ts                                                   │
└───────────────────────────────────────┬──────────────────────────┘
                                        │ SQL + pgvector
┌───────────────────────────────────────▼──────────────────────────┐
│  PostgreSQL 16 + extensão vector                                  │
│  games · users · rentals · encoding_context                       │
└──────────────────────────────────────────────────────────────────┘
         ▲
         │ scripts (offline)
┌────────┴────────┐
│ seed-db.ts      │  ← data/games.json, data/users.json
│ index-vectors.ts│  ← reutiliza encoding.ts (via import compartilhado)
└─────────────────┘
```

### Princípio de compartilhamento de código

`encoding.ts` hoje depende de `@tensorflow/tfjs` para tensores. Para scripts e servidor:

1. **Opção escolhida (v1):** extrair funções puras que retornam `number[]` em `src/encoding/encodingCore.ts`, mantendo `encoding.ts` no worker como thin wrapper TF (ou importar core e converter para tensor só onde necessário).
2. Scripts e API importam **apenas** o core numérico — sem carregar TF no servidor.

Alternativa rejeitada: duplicar lógica de encoding em `scripts/` (drift garantido).

## Infraestrutura local

### Docker Compose

Arquivo: `docker-compose.yml` na raiz do projeto.

| Serviço | Imagem | Porta |
|---|---|---|
| `postgres` | `pgvector/pgvector:pg16` | `5432:5432` |

Variáveis padrão (desenvolvimento):

| Variável | Valor dev |
|---|---|
| `POSTGRES_USER` | `boardgames` |
| `POSTGRES_PASSWORD` | `boardgames` |
| `POSTGRES_DB` | `boardgames` |

Volume nomeado para persistência entre reinícios do container.

### Conexão da aplicação

Arquivo: `.env.example` (commitado). `.env` no `.gitignore`.

```
DATABASE_URL=postgresql://boardgames:boardgames@localhost:5432/boardgames
API_PORT=3001
```

## Modelo de dados (PostgreSQL)

### Extensão

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Tabela `encoding_context`

Uma linha ativa por “versão” do vocabulário. Permite invalidar embeddings quando o catálogo muda.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |
| `product_dimensions` | `INTEGER NOT NULL` | Ex.: 126 |
| `user_dimensions` | `INTEGER NOT NULL` | Ex.: 127 |
| `payload` | `JSONB NOT NULL` | Snapshot serializado do `Context` necessário para encoding (índices, min/max, `productAvgAgeNorm`, listas ordenadas de mechanics/categories/themes) |
| `is_active` | `BOOLEAN DEFAULT true` | Apenas um `true` por vez |

Índice único parcial: `UNIQUE (is_active) WHERE is_active = true` (opcional; ou controle no script).

### Tabela `games`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID PRIMARY KEY` | Mesmo `id` de `games.json` |
| `name` | `TEXT NOT NULL` | |
| `id_bgg` | `INTEGER` | |
| `price_category` | `TEXT` | Brisa, Faísca, … |
| `price_base` | `INTEGER` | |
| `mechanics` | `TEXT[]` | |
| `categories` | `TEXT[]` | |
| `theme` | `TEXT` | |
| `min_players` | `INTEGER` | |
| `max_players` | `INTEGER` | |
| `playtime` | `INTEGER` | |
| `complexity` | `REAL` | |
| `min_age` | `INTEGER` | |
| `slug` | `TEXT` | |
| `link_ludopedia` | `TEXT` | |
| `embedding` | `vector(126)` | Nullable até `index-vectors` |
| `encoding_context_id` | `INTEGER REFERENCES encoding_context(id)` | Qual contexto gerou o vetor |
| `updated_at` | `TIMESTAMPTZ DEFAULT now()` | |

> Dimensão fixa `126` válida para o catálogo atual. Se `product_dimensions` no contexto ativo divergir, migration ou `ALTER COLUMN` antes de reindexar.

### Tabela `users`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY` | Mesmo `id` de `users.json` |
| `name` | `TEXT NOT NULL` | |
| `age` | `INTEGER NOT NULL` | |
| `embedding` | `vector(127)` | Nullable até indexação |
| `encoding_context_id` | `INTEGER REFERENCES encoding_context(id)` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT now()` | |

### Tabela `rentals`

Histórico de aluguéis (normalizado; substitui array embutido no JSON para consultas SQL).

| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | `INTEGER REFERENCES users(id) ON DELETE CASCADE` | |
| `game_id` | `UUID REFERENCES games(id) ON DELETE CASCADE` | |
| `price_category` | `TEXT` | Cópia no momento do aluguel |
| `price_paid` | `INTEGER` | |
| `PRIMARY KEY` | `(user_id, game_id)` | Um registro por par (suficiente para histórico estático do CSV) |

### Índices pgvector

Para ~90 jogos, busca sequencial é aceitável. Mesmo assim, definir índice para documentar o padrão e escalar depois:

```sql
CREATE INDEX games_embedding_hnsw_idx
  ON games USING hnsw (embedding vector_cosine_ops);
```

Índice em `users.embedding` **opcional** na v1 (consultas partem do vetor do usuário e varrem `games`).

### Diagrama ER

```
encoding_context (1) ──< (N) games
encoding_context (1) ──< (N) users
users (1) ──< (N) rentals >── (N) games
```

## Pipeline de dados

### Ordem de execução

```
1. docker compose up -d
2. npm run db:migrate      → aplica db/schema.sql
3. npm run db:seed         → seed-db.ts (JSON → tabelas, rentals)
4. npm run db:index-vectors → index-vectors.ts (context + embeddings)
5. npm run server:dev      → API na porta 3001
6. npm run dev             → Vite (frontend) com proxy /api → :3001
```

Todos os scripts devem ser **idempotentes** onde possível (`ON CONFLICT` / truncate seletivo documentado).

### Script `scripts/seed-db.ts`

**Entrada:** `data/games.json`, `data/users.json`

**Passos:**

1. Conectar via `DATABASE_URL`
2. Inserir/atualizar `games` e `users` (upsert por PK)
3. Para cada `user.rentals[]`, inserir em `rentals`
4. Não calcular embeddings neste passo
5. Log: contagem inserida, rentals ignorados (game_id inexistente)

### Script `scripts/index-vectors.ts`

**Entrada:** linhas de `games` e `users` no banco (ou re-leitura dos JSON + merge — preferir ler do banco após seed)

**Passos:**

1. Carregar todos os jogos e usuários necessários para `makeContext`
2. Chamar `makeContext(products, users)` (core numérico)
3. Inserir nova linha em `encoding_context` com `payload` JSON e dimensões; desativar contexto anterior (`is_active = false`)
4. Para cada jogo: `embedding = encodeProduct(game, context)` → `UPDATE games SET embedding = $1, encoding_context_id = $2`
5. Para cada usuário: `embedding = encodeUser(user, context)` → `UPDATE users SET embedding = $1, encoding_context_id = $2`
6. Validar: nenhum `embedding` NULL nas tabelas principais
7. Log: dimensões, tempo total, amostra de norma L2 de 3 jogos (sanity check)

**Formato do vetor para `pg`:** string `'[0.1,0.2,...]'` ou uso de biblioteca compatível; documentar no README do server.

### Arquivo `db/schema.sql`

- DDL completo (tabelas, FKs, extensão, índices)
- Sem dados; apenas estrutura
- Comentários inline explicando dimensões fixas vs `encoding_context`

## API HTTP

Base URL dev: `http://localhost:3001`

### `GET /health`

Resposta `200`: `{ "status": "ok", "db": true }` após `SELECT 1`.

### `GET /api/recommend/:userId`

Recomenda jogos por similaridade de cosseno entre `users.embedding` e `games.embedding`.

**Query params (opcionais):**

| Param | Default | Descrição |
|---|---|---|
| `limit` | `10` | Máximo de resultados |
| `exclude_rented` | `true` | Excluir jogos já em `rentals` |

**SQL conceitual:**

```sql
SELECT
  g.id,
  g.name,
  g.theme,
  g.price_category,
  g.playtime,
  1 - (g.embedding <=> u.embedding) AS score
FROM users u
CROSS JOIN games g
WHERE u.id = $userId
  AND u.embedding IS NOT NULL
  AND g.embedding IS NOT NULL
  AND g.encoding_context_id = u.encoding_context_id
  AND ($excludeRented = false OR g.id NOT IN (
    SELECT game_id FROM rentals WHERE user_id = $userId
  ))
ORDER BY g.embedding <=> u.embedding ASC
LIMIT $limit;
```

**Resposta `200`:**

```json
{
  "userId": 1,
  "method": "pgvector_cosine",
  "encodingContextId": 3,
  "recommendations": [
    {
      "id": "uuid",
      "name": "Azul",
      "theme": "Arte",
      "price_category": "Fogo",
      "playtime": 45,
      "score": 0.87
    }
  ]
}
```

**Erros:**

| Código | Condição |
|---|---|
| `404` | Usuário inexistente |
| `409` | Usuário sem `embedding` (rodar `db:index-vectors`) |
| `503` | Banco indisponível |

### `GET /api/games/:id/similar` (opcional v1.1)

Top-K jogos parecidos com um jogo (útil para “quem gostou de X também…”).

Mesma métrica, filtro `g.id != :id`.

## Integração no frontend

### Novos artefatos

| Arquivo | Responsabilidade |
|---|---|
| `src/service/VectorRecommendService.ts` | `fetch('/api/recommend/${userId}')` |
| `src/controller/VectorRecommendController.ts` | Ou método em `GameController` |
| `src/view/ModelTrainingView.ts` | Botão “Recommend (Vector DB)” habilitado se API healthy |
| `vite.config.ts` | Proxy `/api` → `localhost:3001` |

### Fluxo UX (v1)

1. Usuário seleciona cliente na lista (como hoje)
2. Pode usar **Run Recommendation** (TF.js) **ou** **Recommend (PostgreSQL)** (novo)
3. `GameView` renderiza lista com badge opcional `score` e indicação da fonte (`tfjs` vs `pgvector`)
4. Se API offline, botão vector desabilitado com tooltip “Start API: npm run server:dev”

### Eventos

Reutilizar `recommendations:ready` com payload estendido:

```ts
{ recommendations: Game[], source: 'tfjs' | 'pgvector', scores?: number[] }
```

## Comparação TF.js vs pgvector (documentação para o usuário)

| | TF.js (atual) | pgvector (novo) |
|---|---|---|
| Onde roda | Browser (worker) | Servidor + Postgres |
| Score | Saída sigmoid da rede | `1 - distância_cosseno` |
| Aprendizado | Pesos treinados com pares alugou/não alugou | Nenhum; assume proximidade no espaço de features |
| Persistência | Sessão | Banco |
| Quando preferir | Demo offline, comparar com aula de redes | Persistência, SQL, escala, integração com outros sistemas |

## Estrutura de diretórios (incremento)

```
exemplo-01-boardgame-recommendations/
├── docker-compose.yml
├── .env.example
├── db/
│   └── schema.sql
├── server/
│   ├── index.ts
│   ├── db/
│   │   └── pool.ts
│   └── routes/
│       ├── health.ts
│       └── recommend.ts
├── scripts/
│   ├── seed-db.ts          # novo
│   └── index-vectors.ts    # novo
├── src/
│   ├── encoding/
│   │   └── encodingCore.ts # extraído de workers/encoding.ts
│   ├── service/
│   │   └── VectorRecommendService.ts
│   └── ...
└── docs/superpowers/specs/
    └── 2026-05-18-boardgame-pgvector-design.md  # este arquivo
```

## Dependências npm (novas)

| Pacote | Uso |
|---|---|
| `pg` | Cliente PostgreSQL |
| `express` ou `fastify` | API |
| `dotenv` | Variáveis de ambiente |
| `@types/pg` | Tipos (dev) |

Scripts `package.json`:

```json
{
  "db:migrate": "tsx scripts/migrate.ts",
  "db:seed": "tsx scripts/seed-db.ts",
  "db:index-vectors": "tsx scripts/index-vectors.ts",
  "server:dev": "tsx watch server/index.ts"
}
```

`scripts/migrate.ts`: lê e executa `db/schema.sql` (pode usar `psql` via child_process ou executar SQL via `pg`).

## Critérios de aceite (v1)

- [ ] `docker compose up` sobe Postgres com pgvector
- [ ] `npm run db:migrate && npm run db:seed && npm run db:index-vectors` completa sem erro
- [ ] `SELECT COUNT(*) FROM games WHERE embedding IS NOT NULL` = 90
- [ ] `SELECT COUNT(*) FROM users WHERE embedding IS NOT NULL` = 54
- [ ] `GET /api/recommend/1` retorna JSON com ≥1 jogo e `score` entre 0 e 1
- [ ] Jogos já alugados pelo usuário 1 não aparecem quando `exclude_rented=true`
- [ ] Frontend exibe recomendações pgvector sem quebrar fluxo TF.js existente
- [ ] README ou comentário em `.env.example` documenta ordem de execução

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Dimensão do vetor muda ao atualizar catálogo | `encoding_context` + script `db:index-vectors` obrigatório após mudança em JSON |
| TF.js e pgvector divergem no encoding | Um único `encodingCore.ts` compartilhado |
| CORS no dev | Proxy Vite para `/api` |
| `game_id` UUID vs tipos SQL | Usar `UUID` nativo no Postgres |
| Catálogo pequeno mascara necessidade de índice HNSW | Manter índice no schema como referência; performance OK sem ele |

## Roadmap pós-v1

1. **v1.1:** `GET /api/games/:id/similar`
2. **v2:** Híbrido — pgvector retorna top-50, TF.js re-ranqueia no servidor
3. **v2:** Substituir `fetch('/data/*.json')` no frontend por `GET /api/games` e `GET /api/users`
4. **v3:** Embeddings de texto (descrição BGG) com modelo de linguagem — outro espaço vetorial, outra coluna ou tabela

## Plano de implementação (referência)

Documento de plano separado (opcional): `docs/superpowers/plans/2026-05-18-boardgame-pgvector-implementation.md`, gerado após aprovação desta spec, com tarefas checkbox por arquivo.

Ordem sugerida de entrega:

1. Docker + `schema.sql` + `migrate`
2. `encodingCore.ts` (refactor sem mudar comportamento do worker)
3. `seed-db.ts` + `index-vectors.ts`
4. `server/` + endpoint recommend
5. Frontend (botão + service + proxy)
6. README da feature pgvector

## Referências

- Spec base do projeto: `docs/superpowers/specs/2026-05-16-boardgame-recommendations-design.md`
- Encoding atual: `src/workers/encoding.ts`, `src/workers/types.ts`
- pgvector: [https://github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- Operadores: `<=>` cosseno, `<->` L2

---

**Status:** Rascunho para revisão — implementação bloqueada até aprovação explícita.
