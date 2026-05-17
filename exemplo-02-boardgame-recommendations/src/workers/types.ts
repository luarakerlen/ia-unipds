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
    numMechanics: number;
    numThemes: number;
    minPlaytime: number;
    maxPlaytime: number;
    minPlayersAvg: number;
    maxPlayersAvg: number;
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
