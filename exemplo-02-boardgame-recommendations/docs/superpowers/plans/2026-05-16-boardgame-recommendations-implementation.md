# Board Game Recommendation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a board game rental recommendation system by forking the existing e-commerce project, adapting it to board game features with TypeScript + Vite, modularizing the TF.js worker.

**Architecture:** Fork adaptativo — mesma arquitetura MVC + Eventos + Web Worker com TensorFlow.js, mas os arquivos Product* viram Game*, dados são board games reais do CSV + BGG API, encoding usa multi-hot para mecânicas.

**Tech Stack:** TypeScript 5, Vite 5, TensorFlow.js 4.22, Bootstrap 5

**New project path:** `../exemplo-02-boardgame-recommendations/` (relativo ao projeto atual)

**Spec:** `docs/superpowers/specs/2026-05-16-boardgame-recommendations-design.md`

---

### Task 1: Project Scaffold

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/package.json`
- Create: `../exemplo-02-boardgame-recommendations/tsconfig.json`
- Create: `../exemplo-02-boardgame-recommendations/vite.config.ts`
- Create: `../exemplo-02-boardgame-recommendations/index.html`
- Create: `../exemplo-02-boardgame-recommendations/style.css`

- [ ] **Step 1: Create directory and package.json**

Create new project directory. Copy package.json from e-commerce project and adapt:
```json
{
    "name": "boardgame-recommendations",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "setup-data": "npx tsx scripts/setup-data.ts",
        "fetch-bgg": "npx tsx scripts/fetch-bgg-data.ts"
    },
    "dependencies": {
        "@tensorflow/tfjs": "^4.22.0"
    },
    "devDependencies": {
        "typescript": "^5.7.0",
        "vite": "^6.0.0",
        "tsx": "^4.19.0",
        "@xmldom/xmldom": "^0.9.0"
    }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "skipLibCheck": true,
        "lib": ["ES2020", "DOM", "DOM.Iterable"]
    },
    "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
    server: { port: 3000 },
    build: { target: 'es2020' }
});
```

- [ ] **Step 4: Create index.html**

Same structure as original but title "Board Game Rental Recommendation System" and script points to `./src/index.ts`.

- [ ] **Step 5: Create style.css**

Copy from original project's style.css.

- [ ] **Step 6: Run npm install**

Run: `cd ../exemplo-02-boardgame-recommendations && npm install`
Expected: node_modules created

---

### Task 2: Types Module

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/workers/types.ts`

- [ ] **Step 1: Create types.ts**

```ts
export interface Game {
    id: string;
    name: string;
    id_bgg: number;
    price_category: string;
    price_base: number;
    mechanics: string[];
    min_players: number;
    max_players: number;
    playtime: number;
    complexity: number;
    theme: string;
    min_age: number;
    slug?: string;
    link_ludopedia?: string;
}

export interface Rental {
    game_id: string;
    name: string;
    price_category: string;
    price_paid: number;
}

export interface User {
    id: number;
    name: string;
    age: number;
    rentals: Rental[];
}

export interface Context {
    products: Game[];
    users: User[];
    colorsIndex: never;
    categoriesIndex: Record<string, number>;
    minAge: number;
    maxAge: number;
    minPrice: number;
    maxPrice: number;
    numCategories: number;
    numColors: number;
    dimensions: number;
    productAvgAgeNorm: Record<string, number>;
    mechanicsIndex: Record<string, number>;
    themesIndex: Record<string, number>;
    productVectors?: { name: string; meta: Game; vector: Float32Array }[];
}

export const WEIGHTS = {
    mechanics: 0.35,
    complexity: 0.25,
    price_category: 0.10,
    playtime: 0.10,
    players_avg: 0.10,
    theme: 0.10,
};

export const PRICE_MAP: Record<string, number> = {
    Brisa: 10,
    Faísca: 20,
    Chama: 30,
    Fogo: 40,
    Vulcão: 50,
};
```

---

### Task 3: Encoding Module

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/workers/encoding.ts`

- [ ] **Step 1: Create encoding.ts**

Contains:
- `normalize(value, min, max)` — same as original
- `oneHotWeighted(index, length, weight)` — same as original
- `multiHotWeighted(indices, length, weight)` — new: sets multiple bits for mechanics
- `makeContext(products, users)` — adapted: no colorsIndex, adds mechanicsIndex + themesIndex
- `encodeProduct(product, context)` — adapted: mechanics as multi-hot, price as ordinal, no color
- `encodeUser(user, context)` — adapted: uses rentals instead of purchases

---

### Task 4: Training Module

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/workers/training.ts`

- [ ] **Step 1: Create training.ts**

Contains:
- `createTrainingData(context)` — same logic as original but adapted for Game/User types
- `configureNeuralNetAndTrain(trainData)` — identical to original (128→64→32→1)

---

### Task 5: Model Training Worker

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/workers/modelTrainingWorker.ts`

- [ ] **Step 1: Create modelTrainingWorker.ts**

The entry point. Imports from encoding.ts and training.ts.
- `trainModel({ users })` — build context, pre-compute product vectors, train
- `recommend(user, ctx)` — encode user, predict scores, sort
- `handlers` — message routing
- `self.onmessage` — same as original

---

### Task 6: Events Module

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/events/constants.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/events/events.ts`

- [ ] **Step 1: Create constants.ts**

Identical to original.

- [ ] **Step 2: Create events.ts**

Identical to original.

---

### Task 7: Services

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/service/GameService.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/service/UserService.ts`

- [ ] **Step 1: Create GameService.ts**

Same as ProductService but fetches `games.json` instead of `products.json`, returns `Game[]`.

- [ ] **Step 2: Create UserService.ts**

Identical to original (renames purchase→rental in code).

---

### Task 8: Views

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/view/View.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/view/GameView.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/view/UserView.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/view/ModelTrainingView.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/view/TFVisorView.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/view/templates/`

- [ ] **Step 1: Create View.ts**

Identical to original.

- [ ] **Step 2: Create GameView.ts**

Adapted from ProductView: renders games with rental info (price_category, base_price), no color badges, shows mechanics.

- [ ] **Step 3: Create UserView.ts**

Identical to original but uses "Rentals" instead of "Purchases" in labels.

- [ ] **Step 4: Create ModelTrainingView.ts**

Identical to original.

- [ ] **Step 5: Copy template files**

Copy `src/view/templates/` from original project.

---

### Task 9: Controllers

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/controller/GameController.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/controller/ModelTrainingController.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/controller/UserController.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/controller/WorkerController.ts`
- Create: `../exemplo-02-boardgame-recommendations/src/controller/TFVisorController.ts`

- [ ] **Step 1: Create GameController.ts**

Adapted from ProductController: uses GameService, renders games, dispatches recommend on user select.

- [ ] **Step 2: Create ModelTrainingController.ts**

Identical to original.

- [ ] **Step 3: Create UserController.ts**

Identical to original (adapts purchase→rental naming).

- [ ] **Step 4: Create WorkerController.ts**

Identical to original.

- [ ] **Step 5: Create TFVisorController.ts**

Identical to original.

---

### Task 10: Bootstrap (index.ts)

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/src/index.ts`

- [ ] **Step 1: Create index.ts**

Same structure as original. Imports renamed controllers/views. Uses `GameService`, `GameController`, `GameView`.

The ML worker path: `new Worker(new URL('./workers/modelTrainingWorker.ts', import.meta.url), { type: 'module' })`

---

### Task 11: Data Setup Script

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/scripts/setup-data.ts`

- [ ] **Step 1: Create setup-data.ts**

Node script (uses `fs`, `path`):
1. Copy CSVs from `../exemplo-01-ecommerce-recomendations/docs/` to `data/`
2. Parse and merge `export-355-products.csv` + `export-353-boardgame-copies.csv` by `boardgame_id`
3. Derive `price_base` from `categoria_preco` (Brisa→10, Faísca→20, Chama→30, Fogo→40, Vulcão→50)
4. Save `data/games_base.json`
5. Parse `export-356-customers.csv`: read each row, parse `ordered_games`, compute `age` from `birthdate`, match game names case-insensitively against `games_base.json`
6. Rental construction: `price_paid = price_base` (do `categoria_preco` → Brisa=10, etc.)
7. Save `data/users_base.json`

---

### Task 12: BGG Fetch Script

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/scripts/fetch-bgg-data.ts`

- [ ] **Step 1: Create fetch-bgg-data.ts**

Node script:
1. Read `data/games_base.json` → get unique `id_bgg` list
2. Batch `id_bgg` into groups of 20
3. For each batch: `fetch(https://boardgamegeek.com/xmlapi2/thing?id=ID1,ID2,...&stats=1)`
4. Rate limit: 1s between requests
5. Parse XML: Node.js não tem DOMParser nativo. Usar `npm install @xmldom/xmldom` ou fazer parse manual (regex simples — o XML da BGG tem estrutura previsível com tags aninhadas).
6. Parse XML response for each game:
   - `boardgamesubdomain` → theme
   - `boardgamemechanic` → mechanics[]
   - `minplayers`, `maxplayers`, `playingtime`
   - `boardgameweight` → complexity
   - `age` → min_age
6. Merge enriched data with `games_base.json` → save `data/games.json`
7. Re-read `data/users_base.json`, re-resolve rentals against final `games.json` by `game_id` → save `data/users.json`

---

### Task 13: Run Data Pipeline

- [ ] **Step 1: Run setup-data**

Run: `cd ../exemplo-02-boardgame-recommendations && npm run setup-data`
Expected: `data/games_base.json` and `data/users_base.json` created

- [ ] **Step 2: Run fetch-bgg**

Run: `cd ../exemplo-02-boardgame-recommendations && npm run fetch-bgg`
Expected: `data/games.json` and `data/users.json` created with enriched BGG data

---

### Task 14: Verify the application runs

- [ ] **Step 1: Start dev server**

Run: `cd ../exemplo-02-boardgame-recommendations && npx vite`
Expected: Server starts on localhost:3000

- [ ] **Step 2: Open in browser**

Verify: user list loads, game cards render, Train Model button works, Run Recommendation shows results sorted by score.

---

### Task 15: Add .gitignore

**Files:**
- Create: `../exemplo-02-boardgame-recommendations/.gitignore`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
.superpowers/
data/games_base.json
data/users_base.json
```
