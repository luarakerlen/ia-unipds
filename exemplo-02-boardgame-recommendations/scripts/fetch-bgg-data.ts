import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '..', 'data');

const RATE_LIMIT_MS = 2000;

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
    const fullPath = resolve(DATA_DIR, filePath);
    return JSON.parse(readFileSync(fullPath, 'utf-8')) as T;
}

function writeJson(filePath: string, data: unknown): void {
    const fullPath = resolve(DATA_DIR, filePath);
    writeFileSync(fullPath, JSON.stringify(data, null, 4), 'utf-8');
}

function extractSlug(link: string | undefined): string | null {
    if (!link) return null;
    const match = link.match(/\/jogo\/(.+)$/);
    return match ? match[1] : null;
}

async function fetchLudopediaGame(slug: string): Promise<Partial<EnrichedFields>> {
    const url = `https://ludopedia.com.br/jogo/${slug}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${slug}`);
    }
    const html = await response.text();

    const playersMatch = html.match(/(\d+)\s*a\s*(\d+)\s*jogadores/);
    const timeMatch = html.match(/(\d+)\s*min/);
    const complexityMatch = html.match(/Complexidade:\s*([\d,]+)/);
    const ageMatch = html.match(/Idade\s*(\d+)\s*\+?/);
    const mechanics = [...html.matchAll(/\/mecanica\/\d+[^>]*>([^<]+)/g)].map(m => m[1].trim());
    const themes = [...html.matchAll(/\/tema\/\d+[^>]*>([^<]+)/g)].map(m => m[1].trim());

    return {
        mechanics: mechanics.length > 0 ? mechanics : [],
        min_players: playersMatch ? Number(playersMatch[1]) : 0,
        max_players: playersMatch ? Number(playersMatch[2]) : 0,
        playtime: timeMatch ? Number(timeMatch[1]) : 0,
        complexity: complexityMatch ? Number(complexityMatch[1].replace(',', '.')) : 0,
        theme: themes.length > 0 ? themes[0] : '',
        min_age: ageMatch ? Number(ageMatch[1]) : 0,
    };
}

async function main(): Promise<void> {
    const gamesBase = readJson<GameBase[]>('games_base.json');
    let existingGames: Game[] = [];
    try {
        existingGames = readJson<Game[]>('games.json');
    } catch {
        existingGames = [];
    }
    const existingMap = new Map(existingGames.map(g => [g.id, g]));

    let games: Game[] = [];
    let enriched = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < gamesBase.length; i++) {
        const base = gamesBase[i];
        const existing = existingMap.get(base.id);

        if (existing && (existing.playtime > 0 || existing.complexity > 0)) {
            games.push(existing);
            skipped++;
            continue;
        }

        const slug = extractSlug(base.link_ludopedia);

        let enrichment: Partial<EnrichedFields> = {};

        if (slug) {
            process.stdout.write(`[${i + 1}/${gamesBase.length}] ${base.name}... `);
            try {
                enrichment = await fetchLudopediaGame(slug);
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
            min_players: enrichment.min_players ?? 0,
            max_players: enrichment.max_players ?? 0,
            playtime: enrichment.playtime ?? 0,
            complexity: enrichment.complexity ?? 0,
            theme: enrichment.theme ?? '',
            min_age: enrichment.min_age ?? 0,
        });
    }

    writeJson('games.json', games);
    console.log(`\nSaved ${games.length} games to data/games.json`);
    console.log(`Skipped: ${skipped}, Enriched: ${enriched}, Failed: ${failed}`);

    const usersBase = readJson<UserBase[]>('users_base.json');
    const gameById = new Map(games.map(g => [g.id, g]));

    const users = usersBase.map(user => ({
        ...user,
        rentals: user.rentals.map(rental => {
            const game = gameById.get(rental.game_id);
            if (game) {
                return {
                    game_id: game.id,
                    name: game.name,
                    price_category: game.price_category,
                    price_paid: game.price_base,
                };
            }
            return rental;
        }),
    }));

    writeJson('users.json', users);
    console.log(`Saved ${users.length} users to data/users.json`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
