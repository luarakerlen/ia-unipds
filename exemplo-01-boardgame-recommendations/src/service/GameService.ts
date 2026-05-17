import { Game } from '../workers/types';

export class GameService {
    async getGames(): Promise<Game[]> {
        const response = await fetch('./data/games.json');
        return await response.json();
    }

    async getGameById(id: string): Promise<Game | undefined> {
        const games = await this.getGames();
        return games.find(game => game.id === id);
    }

    async getGamesByIds(ids: string[]): Promise<Game[]> {
        const games = await this.getGames();
        return games.filter(game => ids.includes(game.id));
    }
}
