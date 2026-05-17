import * as tf from '@tensorflow/tfjs';
import { Game, User, Context, WEIGHTS, PRICE_MAP } from './types';

export function normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min) || 1;
}

export function oneHotWeighted(index: number, length: number, weight: number): tf.Tensor1D {
    return tf.oneHot(index, length).cast('float32').mul(weight) as tf.Tensor1D;
}

export function multiHotWeighted(indices: number[], length: number, weight: number): tf.Tensor1D {
    const arr = new Array(length).fill(0);
    indices.forEach(i => { arr[i] = 1; });
    return tf.tensor1d(arr, 'float32').mul(weight) as tf.Tensor1D;
}

export function makeContext(products: Game[], users: User[]): Context {
    const ages = users.map(u => u.age);
    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);
    const midAge = (minAge + maxAge) / 2;

    const basePrices = products.map(p => PRICE_MAP[p.price_category] ?? 0);
    const minPrice = Math.min(...basePrices);
    const maxPrice = Math.max(...basePrices);

    const allMechanics = [...new Set(products.flatMap(p => p.mechanics))];
    const allCategories = [...new Set(products.flatMap(p => p.categories))];
    const allThemes = [...new Set(products.map(p => p.theme))];

    if (allMechanics.length === 0) allMechanics.push('(none)');
    if (allCategories.length === 0) allCategories.push('(none)');
    if (allThemes.length < 2) {
        if (!allThemes.includes('(none)')) allThemes.push('(none)');
    }

    const mechanicsIndex: Record<string, number> = Object.fromEntries(
        allMechanics.map((m, i) => [m, i])
    );

    const categoriesIndex: Record<string, number> = Object.fromEntries(
        allCategories.map((c, i) => [c, i])
    );

    const themesIndex: Record<string, number> = Object.fromEntries(
        allThemes.map((t, i) => [t, i])
    );

    const playtimes = products.map(p => p.playtime);
    const minPlaytime = Math.min(...playtimes);
    const maxPlaytime = Math.max(...playtimes);

    const playersAvgs = products.map(p => (p.min_players + p.max_players) / 2);
    const minPlayersAvg = Math.min(...playersAvgs);
    const maxPlayersAvg = Math.max(...playersAvgs);

    const ageSums: Record<string, number> = {};
    const ageCounts: Record<string, number> = {};

    users.forEach(user => {
        user.rentals?.forEach(rental => {
            const game = products.find(g => g.id === rental.game_id);
            if (game) {
                ageSums[game.name] = (ageSums[game.name] || 0) + user.age;
                ageCounts[game.name] = (ageCounts[game.name] || 0) + 1;
            }
        });
    });

    const productAvgAgeNorm: Record<string, number> = {};
    products.forEach(product => {
        const avg = ageCounts[product.name]
            ? ageSums[product.name] / ageCounts[product.name]
            : midAge;
        productAvgAgeNorm[product.name] = normalize(avg, minAge, maxAge);
    });

    const numMechanics = allMechanics.length;
    const numCategories = allCategories.length;
    const numThemes = allThemes.length;
    const dimensions = 3 + numMechanics + numCategories + numThemes;

    return {
        products,
        users,
        minAge,
        maxAge,
        minPrice,
        maxPrice,
        dimensions,
        productAvgAgeNorm,
        mechanicsIndex,
        categoriesIndex,
        themesIndex,
        numMechanics,
        numCategories,
        numThemes,
        minPlaytime,
        maxPlaytime,
        minPlayersAvg,
        maxPlayersAvg,
    };
}

export function encodeProduct(product: Game, context: Context): tf.Tensor1D {
    const basePrice = PRICE_MAP[product.price_category] ?? 0;

    const price = tf.tensor1d([
        normalize(basePrice, context.minPrice, context.maxPrice) * WEIGHTS.price_category
    ]);

    const playtime = tf.tensor1d([
        normalize(product.playtime, context.minPlaytime, context.maxPlaytime) * WEIGHTS.playtime
    ]);

    const players = tf.tensor1d([
        normalize(
            (product.min_players + product.max_players) / 2,
            context.minPlayersAvg,
            context.maxPlayersAvg
        ) * WEIGHTS.players_avg
    ]);

    const mechanicIndices = product.mechanics
        .map(m => context.mechanicsIndex[m])
        .filter(i => i !== undefined);
    const mechanics = multiHotWeighted(mechanicIndices, context.numMechanics, WEIGHTS.mechanics);

    const categoryIndices = product.categories
        .map(c => context.categoriesIndex[c])
        .filter(i => i !== undefined);
    const categories = multiHotWeighted(categoryIndices, context.numCategories, WEIGHTS.categories);

    let theme: tf.Tensor1D;
    if (context.numThemes < 2) {
        theme = tf.tensor1d([1 * WEIGHTS.theme]);
    } else {
        const themeIndex = context.themesIndex[product.theme] ?? 0;
        theme = oneHotWeighted(themeIndex, context.numThemes, WEIGHTS.theme);
    }

    return tf.concat1d([price, playtime, players, mechanics, categories, theme]);
}

export function encodeUser(user: User, context: Context): tf.Tensor1D {
    const ageFeature = tf.tensor1d([
        normalize(user.age, context.minAge, context.maxAge) * WEIGHTS.age
    ]);

    if (user.rentals.length) {
        const encodedGames = user.rentals.map(rental => {
            const game = context.products.find(g => g.id === rental.game_id);
            if (!game) throw new Error(`Game not found for rental: ${rental.name}`);
            return encodeProduct(game, context);
        });
        const preference = tf.stack(encodedGames).mean(0) as tf.Tensor1D;
        return tf.concat1d([ageFeature, preference]);
    }

    return tf.concat1d([ageFeature, tf.zeros([context.dimensions])]);
}
