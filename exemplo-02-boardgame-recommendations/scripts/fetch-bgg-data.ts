import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '..', 'data');

const RATE_LIMIT_MS = 2000;
const API_BASE = 'https://ludopedia.com.br/api/v1';

const ACCESS_TOKEN = 'c5747500d588db623132f79936bc186c';

interface GameBase {
    id: string;
    name: string;
    id_bgg: number;
    price_category: string;
    price_base: number;
    slug?: string;
    link_ludopedia?: string;
}

interface EnrichedFields {
    mechanics: string[];
    categories: string[];
    min_players: number;
    max_players: number;
    playtime: number;
    complexity: number;
    theme: string;
    min_age: number;
}

type Game = GameBase & EnrichedFields;

interface Rental {
    game_id: string;
    name: string;
    price_category: string;
    price_paid: number;
}

interface UserBase {
    id: number;
    name: string;
    age: number;
    rentals: Rental[];
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function readJson<T>(filePath: string): T {
    return JSON.parse(readFileSync(resolve(DATA_DIR, filePath), 'utf-8')) as T;
}

function writeJson(filePath: string, data: unknown): void {
    writeFileSync(resolve(DATA_DIR, filePath), JSON.stringify(data, null, 4), 'utf-8');
}

function extractSlug(link: string | undefined): string | null {
    if (!link) return null;
    const match = link.match(/\/jogo\/(.+)$/);
    return match ? match[1] : null;
}

async function tryApi(slug: string): Promise<Partial<EnrichedFields> | null> {
    try {
        const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` };
        let id: number | null = null;

        const directRes = await fetch(`${API_BASE}/jogos/${slug}`, { headers });
        if (directRes.ok) {
            const direct = await directRes.json();
            if (direct?.id_jogo) id = direct.id_jogo;
        }

        if (!id) {
            const searchRes = await fetch(`${API_BASE}/jogos?search=${encodeURIComponent(slug.replace(/-/g, ' '))}`, { headers });
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const targetLink = `jogo/${slug}`;
                const match = searchData.jogos?.find((j: any) => j.link === targetLink) ?? searchData.jogos?.[0];
                if (match?.id_jogo) id = match.id_jogo;
            } else if (searchRes.status === 429) {
                return null;
            }
        }

        if (!id) return null;

        const detailRes = await fetch(`${API_BASE}/jogos/${id}`, { headers });
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();
        if (!detail?.id_jogo) return null;

        return {
            mechanics: detail.mecanicas?.map((m: any) => m.nm_mecanica) ?? [],
            categories: detail.categorias?.map((c: any) => c.nm_categoria) ?? [],
            min_players: detail.qt_jogadores_min ?? 0,
            max_players: detail.qt_jogadores_max ?? 0,
            playtime: detail.vl_tempo_jogo ?? 0,
            complexity: 0,
            theme: detail.temas?.length ? detail.temas[0].nm_tema : '',
            min_age: detail.idade_minima ?? 0,
        };
    } catch {
        return null;
    }
}

async function scrapeHtml(slug: string): Promise<Partial<EnrichedFields>> {
    const res = await fetch(`https://ludopedia.com.br/jogo/${slug}`);
    const html = await res.text();

    const playersMatch = html.match(/(\d+)\s*a\s*(\d+)\s*jogadores/);
    const timeMatch = html.match(/(\d+)\s*min/);
    const complexityMatch = html.match(/Complexidade:\s*([\d,]+)/);
    const ageMatch = html.match(/Idade\s*(\d+)\s*\+?/);
    const mechanics = [...html.matchAll(/\/mecanica\/\d+[^>]*>([^<]+)/g)].map(m => m[1].trim());
    const themes = [...html.matchAll(/\/tema\/\d+[^>]*>([^<]+)/g)].map(m => m[1].trim());
    const categories = [...html.matchAll(/\/categoria\/\d+[^>]*>([^<]+)/g)].map(m => m[1].trim());

    return {
        mechanics, categories,
        min_players: playersMatch ? Number(playersMatch[1]) : 0,
        max_players: playersMatch ? Number(playersMatch[2]) : 0,
        playtime: timeMatch ? Number(timeMatch[1]) : 0,
        complexity: complexityMatch ? Number(complexityMatch[1].replace(',', '.')) : 0,
        theme: themes.length > 0 ? themes[0] : '',
        min_age: ageMatch ? Number(ageMatch[1]) : 0,
    };
}

async function fetchGame(slug: string): Promise<Partial<EnrichedFields>> {
    const apiResult = await tryApi(slug);
    if (apiResult) return apiResult;
    return scrapeHtml(slug);
}

async function main(): Promise<void> {
    const gamesBase = readJson<GameBase[]>('games_base.json');
    let existingGames: Game[] = [];
    try { existingGames = readJson<Game[]>('games.json'); } catch { existingGames = []; }
    const existingMap = new Map(existingGames.map(g => [g.id, g]));

    const games: Game[] = [];
    let enriched = 0, failed = 0, skipped = 0, apiOk = 0;

    for (let i = 0; i < gamesBase.length; i++) {
        const base = gamesBase[i];
        const existing = existingMap.get(base.id);
        if (existing && (existing.playtime > 0 || existing.mechanics.length > 0)) {
            games.push(existing);
            skipped++;
            continue;
        }

        const slug = extractSlug(base.link_ludopedia);
        let enrichment: Partial<EnrichedFields> = {};

        if (slug) {
            process.stdout.write(`[${i + 1}/${gamesBase.length}] ${base.name}... `);
            try {
                enrichment = await fetchGame(slug);
                if ((enrichment as any)._fromApi) apiOk++;
                enriched++;
                process.stdout.write('OK\n');
            } catch (err) {
                failed++;
                process.stdout.write(`FAIL (${(err as Error).message})\n`);
            }
            await sleep(RATE_LIMIT_MS);
        } else {
            process.stdout.write(`[${i + 1}/${gamesBase.length}] ${base.name}... NO SLUG\n`);
        }

        games.push({
            ...base,
            mechanics: enrichment.mechanics ?? [],
            categories: enrichment.categories ?? [],
            min_players: enrichment.min_players ?? 0,
            max_players: enrichment.max_players ?? 0,
            playtime: enrichment.playtime ?? 0,
            complexity: enrichment.complexity ?? 0,
            theme: enrichment.theme ?? '',
            min_age: enrichment.min_age ?? 0,
        });
    }

    writeJson('games.json', games);
    console.log(`\nSaved ${games.length} games | Skipped: ${skipped}, Enriched: ${enriched}, Failed: ${failed}`);

    const usersBase = readJson<UserBase[]>('users_base.json');
    const gameById = new Map(games.map(g => [g.id, g]));
    const users = usersBase.map(user => ({
        ...user,
        rentals: user.rentals.map(rental => {
            const game = gameById.get(rental.game_id);
            return game ? { game_id: game.id, name: game.name, price_category: game.price_category, price_paid: game.price_base } : rental;
        }),
    }));

    writeJson('users.json', users);
    console.log(`Saved ${users.length} users`);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
