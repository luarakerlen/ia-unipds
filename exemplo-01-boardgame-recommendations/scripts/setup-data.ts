import * as fs from 'fs';
import * as path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.resolve(projectRoot, '..', 'exemplo-01-ecommerce-recomendations', 'docs');
const dataDir = path.resolve(projectRoot, 'data');

const PRICE_MAP: Record<string, number> = {
    Brisa: 10,
    Faísca: 20,
    Chama: 30,
    Fogo: 40,
    Vulcão: 50,
};

function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

function extractPriceCategory(categoriaPreco: string): { name: string; base: number } {
    const parts = categoriaPreco.split(' - ');
    const name = parts[parts.length - 1].trim();
    return { name, base: PRICE_MAP[name] ?? 0 };
}

function parseCSV(filePath: string): { headers: string[]; rows: string[][] } {
    const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    return { headers, rows };
}

function rowToMap(headers: string[], row: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
        obj[headers[i].trim()] = (row[i] ?? '').trim();
    }
    return obj;
}

// Step 1: Copy CSVs to data/
const csvFiles = ['export-355-products.csv', 'export-353-boardgame-copies.csv', 'export-356-customers.csv'];
for (const file of csvFiles) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(dataDir, file));
}
console.log('CSV files copied to data/');

// Step 2: Parse and merge games CSVs
const products = parseCSV(path.join(sourceDir, 'export-355-products.csv'));
const copies = parseCSV(path.join(sourceDir, 'export-353-boardgame-copies.csv'));

const copiesById = new Map<string, Record<string, string>>();
for (const row of copies.rows) {
    const map = rowToMap(copies.headers, row);
    copiesById.set(map.boardgame_id, map);
}

const games: {
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
}[] = [];

for (const row of products.rows) {
    const prod = rowToMap(products.headers, row);
    const copy = copiesById.get(prod.boardgame_id);
    if (!copy) continue;

    const { name: priceCategory, base: priceBase } = extractPriceCategory(prod.categoria_preco);

    games.push({
        id: prod.boardgame_id,
        name: prod.titulo,
        id_bgg: parseInt(prod.id_bgg, 10),
        price_category: priceCategory,
        price_base: priceBase,
        mechanics: [],
        min_players: 0,
        max_players: 0,
        playtime: 0,
        complexity: 0,
        theme: '',
        min_age: 0,
        slug: copy.slug,
        link_ludopedia: copy.link_ludopedia,
    });
}

fs.writeFileSync(path.join(dataDir, 'games_base.json'), JSON.stringify(games, null, 2));
console.log(`games_base.json created with ${games.length} games`);

// Step 3: Parse customers CSV
const customers = parseCSV(path.join(sourceDir, 'export-356-customers.csv'));

const gameNameIndex = new Map<string, (typeof games)[0]>();
for (const g of games) {
    gameNameIndex.set(g.name.toLowerCase(), g);
}

const users: {
    id: number;
    name: string;
    age: number;
    rentals: { game_id: string; name: string; price_category: string; price_paid: number }[];
}[] = [];

for (const row of customers.rows) {
    const cust = rowToMap(customers.headers, row);
    const id = users.length + 1;

    const birthMatch = cust.birthdate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let age = 0;
    if (birthMatch) {
        const birthDate = new Date(
            parseInt(birthMatch[1]),
            parseInt(birthMatch[2]) - 1,
            parseInt(birthMatch[3])
        );
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
    }

    const rentals: {
        game_id: string;
        name: string;
        price_category: string;
        price_paid: number;
    }[] = [];

    if (cust.ordered_games.trim().length > 0) {
        const gameNames = cust.ordered_games.split(',').map(n => n.trim());
        for (const gname of gameNames) {
            const match = gameNameIndex.get(gname.toLowerCase());
            if (match) {
                rentals.push({
                    game_id: match.id,
                    name: match.name,
                    price_category: match.price_category,
                    price_paid: match.price_base,
                });
            } else {
                console.warn(`Warning: Game "${gname}" not found for customer "${cust.name}"`);
            }
        }
    }

    users.push({ id, name: cust.name, age, rentals });
}

fs.writeFileSync(path.join(dataDir, 'users_base.json'), JSON.stringify(users, null, 2));
console.log(`users_base.json created with ${users.length} users`);
