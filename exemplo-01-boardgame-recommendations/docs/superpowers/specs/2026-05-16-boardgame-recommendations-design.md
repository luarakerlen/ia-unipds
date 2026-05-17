# Board Game Recommendation System — Design Spec

## Objetivo

Adaptar o sistema de recomendação de e-commerce existente (TensorFlow.js) para recomendar jogos de tabuleiro para aluguel, usando dados reais de clientes e catálogo. Projeto em pasta separada, com TypeScript + Vite e melhor modularização do worker.

## Dados de Origem (CSVs)

O projeto usa 3 arquivos CSV. Eles são copiados de `../exemplo-01-ecommerce-recomendations/docs/` para `data/` do novo projeto durante o setup:

| Arquivo | Conteúdo | Colunas |
|---|---|---|
| `export-353-boardgame-copies.csv` | Acervo de jogos | `boardgame_id`, `name`, `id_bgg`, `link_ludopedia`, `slug` |
| `export-355-products.csv` | Preços por categoria | `boardgame_id`, `titulo`, `categoria_preco`, `id_bgg`, `link_ludopedia` |
| `export-356-customers.csv` | Clientes e histórico | `name`, `birthdate`, `ordered_games` |

O campo `ordered_games` é uma string CSV com nomes de jogos separados por vírgula (ex: `"Azul, Dixit, Ticket to Ride"`). O script de setup faz o parse dessa string e faz join com `games.json` pelo nome do jogo para montar o histórico de aluguéis.

## Data Assembly Pipeline

O `games.json` e `users.json` finais são montados por 2 scripts executados em ordem:

### Script 1: `scripts/setup-data.ts`

Responsável por montar os JSONs base a partir dos CSVs.

```
export-355-products.csv ────► merge por boardgame_id ────► games_base.json
       +
export-353-boardgame-copies.csv
       │
       ▼
export-356-customers.csv ────► parse ordered_games ────► users_base.json
```

**Passos do merge de jogos:**

1. Copiar CSVs de `../exemplo-01-ecommerce-recommendations/docs/` para `data/`
2. Fazer inner join de `export-355-products.csv` e `export-353-boardgame-copies.csv` pela coluna `boardgame_id` (ambos devem ter a mesma lista de jogos, então registros órfãos indicam problema e devem ser logados)
3. Cada jogo resultante tem: `boardgame_id`, `name` (do `titulo`), `id_bgg`, `categoria_preco`, `slug`, `link_ludopedia`
4. Derivar `price_base` de `categoria_preco`: Brisa→10, Faísca→20, Chama→30, Fogo→40, Vulcão→50
5. Salvar como `data/games_base.json`

**Passos de montagem de usuários:**

1. Ler `export-356-customers.csv`
2. Para cada linha: gerar `id` sequencial (1-based), calcular `age` da `birthdate`, parsear `ordered_games`
3. Para o parse de `ordered_games`: split por vírgula, trim, buscar match em `games_base.json` (case-insensitive, match exato). Ignorar nomes sem match com warning.
4. Montar array de rentals com dados encontrados
5. Salvar como `data/users_base.json`

**Schema do `users_base.json`:** idêntico ao `users.json` final. A diferença é que no `users_base.json` os rentals referenciam `games_base.json` (sem dados BGG ainda). O `fetch-bgg-data.ts` relê este arquivo, re-executa o parse de rentals contra o `games.json` final (já enriquecido) usando `Rental.game_id` como chave de resolução, e sobrescreve como `data/users.json`.

### Script 2: `scripts/fetch-bgg-data.ts`

Lê `data/games_base.json`, enriquece com dados da BGG API e salva `data/games.json`.

1. Ler `data/games_base.json` → lista de `id_bgg`
2. Fetch em lotes: `GET https://boardgamegeek.com/xmlapi2/thing?id=ID1,ID2,...&stats=1`
3. Rate limit: 1 requisição por segundo (política BGG)
4. Parse XML → extrair:
   - `boardgamesubdomain` → theme
   - `boardgamemechanic` → mechanics[]
   - `minplayers`, `maxplayers`, `playingtime`
   - `boardgameweight` → complexity
   - `age` → min_age
5. Fazer merge com `games_base.json` → cada jogo vira objeto completo no `games.json`

### Finalização: `fetch-bgg-data.ts` também gera `users.json`

Após enriquecer `games.json`, o `fetch-bgg-data.ts` re-executa o parse de rentals de `data/users_base.json` contra o `games.json` final (com IDs BGG atualizados) e salva `data/users.json`.

**Ordem de execução:**
```
1. npm run setup-data     → gera games_base.json + users_base.json
2. npm run fetch-bgg-data → lê games_base.json, busca BGG, salva games.json + users.json
```

Ambos os scripts são re-executáveis (idempotentes). Rodar `setup-data` novamente sobrescreve os arquivos base. Rodar `fetch-bgg-data` novamente sobrescreve os arquivos finais.

## Arquitetura

Fork adaptativo do projeto `exemplo-01-ecommerce-recomendations`. MVC + Eventos + Web Worker com TF.js.

## Estrutura de Diretórios

```
exemplo-02-boardgame-recommendations/
├── data/
│   ├── games.json           # Catálogo final de board games (pós-BGG)
│   ├── users.json           # Clientes com histórico de aluguéis (pós-setup)
│   ├── games_base.json      # Intermediário: merge dos CSVs (antes do BGG)
│   └── users_base.json      # Intermediário: usuários do CSV (antes de re-link)
├── scripts/
│   ├── setup-data.ts        # Copia CSVs, merge, monta JSONs base (re-executável)
│   └── fetch-bgg-data.ts    # Busca dados da BGG API e finaliza games.json + users.json
├── src/
│   ├── index.ts             # Bootstrap da aplicação
│   ├── events/
│   │   ├── constants.ts
│   │   └── events.ts
│   ├── service/
│   │   ├── GameService.ts   # (era ProductService)
│   │   └── UserService.ts
│   ├── controller/
│   │   ├── GameController.ts
│   │   ├── ModelTrainingController.ts
│   │   ├── UserController.ts
│   │   ├── WorkerController.ts
│   │   └── TFVisorController.ts
│   ├── view/
│   │   ├── GameView.ts
│   │   ├── ModelTrainingView.ts
│   │   ├── TFVisorView.ts
│   │   ├── UserView.ts
│   │   └── View.ts
│   └── workers/
│       ├── types.ts              # Interfaces: Game, User, Context, Weights
│       ├── encoding.ts           # normalize, oneHotWeighted, encodeProduct, encodeUser, makeContext
│       ├── training.ts           # createTrainingData, configureNeuralNetAndTrain
│       └── modelTrainingWorker.ts # trainModel, recommend, message handlers
├── index.html
├── style.css
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Modelo de Dados

### Game (games.json)

| Campo | Tipo | Fonte | Encoding |
|---|---|---|---|
| id | string | CSV boardgame_id | — |
| name | string | CSV titulo | — |
| id_bgg | number | CSV id_bgg | — |
| price_category | string (Brisa/Faísca/Chama/Fogo/Vulcão) | CSV categoria_preco | ordinal 0-1 |
| price_base | number | Brisa=10, Faísca=20, Chama=30, Fogo=40, Vulcão=50 | — |
| mechanics | string[] | BGG API (boardgamemechanic) | multi-hot |
| min_players | number | BGG API | usado em avg |
| max_players | number | BGG API | usado em avg |
| playtime | number | BGG API (playingtime) | normalizado 0-1 |
| complexity | number | BGG API (boardgameweight) | normalizado 0-1 |
| theme | string | BGG API (boardgamesubdomain) | one-hot |
| min_age | number | BGG API (age) | — |
| slug | string | CSV (acervo) | Não usado no ML, apenas referência |
| link_ludopedia | string | CSV (acervo) | Não usado no ML, apenas referência |

### User (users.json)

| Campo | Tipo | Fonte |
|---|---|---|
| id | number | Índice sequencial (1-based, ordem do CSV) |
| name | string | CSV name |
| age | number | Calculado de birthdate |
| rentals | Rental[] | Ver abaixo |

Rental:
```
{ "game_id": string, "name": string, "price_category": string, "price_paid": number }
```

**Pipeline de montagem do Rental:**

1. Ler `export-356-customers.csv` → coluna `ordered_games` contém string com nomes separados por vírgula
2. Fazer split da string: `"Azul, Dixit, Ticket to Ride"` → `["Azul", "Dixit", "Ticket to Ride"]`
3. Para cada nome, limpar (trim) e buscar em `games.json` o jogo correspondente (case-insensitive, match exato após trim)
4. Se um nome em `ordered_games` não encontrar match em `games.json`, ignorar silenciosamente (log de warning)
5. Extrair `game_id`, `name`, `price_category`, `price_base` do jogo encontrado → compõe o Rental
6. `price_paid` = `price_base` (valor padrão para 6 dias de aluguel)

## Feature Encoding

### Pesos

| Feature | Encoding | Peso |
|---|---|---|
| mechanics | multi-hot (N bits) | 0.35 |
| complexity | normalizado 0-1 | 0.25 |
| price_category | ordinal normalizado 0-1 | 0.10 |
| playtime | normalizado 0-1 | 0.10 |
| players_avg | (min+max)/2 normalizado 0-1 | 0.10 |
| theme | one-hot | 0.10 |

### Multi-hot encoding

Diferente do one-hot (1 bit ligado), multi-hot permite múltiplos bits. Um jogo com mechanics=["deck-building", "card-game"] teria bits `[1, 0, 1, 0, ...]` no vetor de mecânicas.

### Price category ordinal

Brisa(10) < Faísca(20) < Chama(30) < Fogo(40) < Vulcão(50). Vira `[0.0, 0.25, 0.5, 0.75, 1.0]` normalizado, preservando a ordem (ao contrário de one-hot).

## BGG API Pipeline (detalhes técnicos)

O script `scripts/fetch-bgg-data.ts` enriquece `games_base.json` com dados da BoardGameGeek API:

- **Endpoint:** `https://boardgamegeek.com/xmlapi2/thing?id=ID1,ID2,...&stats=1`
- **Batch:** até 20 IDs por requisição (limite prático da BGG)
- **Rate limit:** 1 requisição por segundo
- **Formato:** XML (parse com `DOMParser` no Node)
- **Atributos extraídos por jogo:**
  - `<boardgamesubdomain>` → theme (string)
  - `<boardgamemechanic>` → mechanics (string[], pode ter múltiplos)
  - `<minplayers>`, `<maxplayers>` → players range
  - `<playingtime>` → playtime (minutos)
  - `<boardgameweight>` → complexity (float 1-5)
  - `<age>` → min_age (int)

## Arquitetura da Rede Neural (inalterada)

- Dense 128 (relu) → Dense 64 (relu) → Dense 32 (relu) → Dense 1 (sigmoid)
- Otimizador: Adam (lr 0.01)
- Loss: binaryCrossentropy
- Epochs: 100, batch: 32

## Modularização do Worker

Quebra do `modelTrainingWorker.js` (hoje 369 linhas) em 4 arquivos:

| Arquivo | Conteúdo | ~linhas |
|---|---|---|
| `types.ts` | Interfaces compartilhadas | 30 |
| `encoding.ts` | `normalize`, `oneHotWeighted`, `encodeProduct`, `encodeUser`, `makeContext` | 90 |
| `training.ts` | `createTrainingData`, `configureNeuralNetAndTrain` | 80 |
| `modelTrainingWorker.ts` | `trainModel`, `recommend`, handlers, `onmessage` | 90 |

## O que permanece idêntico ao e-commerce

- MVC + Eventos + Web Worker
- Pipeline de treino e inferência
- Arquitetura da rede neural
- Views, controllers (renomeados)
- UI (index.html + style.css com adaptações mínimas)

## Roadmap Futuro: Banco de Dados

0. Projeto atual: dados em JSON estático
1. Próximo passo: backend Node + SQLite/Postgres
2. API REST substitui JSON estático
3. Service.ts consome API em vez de fetch local
