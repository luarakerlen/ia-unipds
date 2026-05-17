import { View } from './View';
import { Game } from '../workers/types';

export class GameView extends View {
    #gameList = document.querySelector<HTMLElement>('#gameList')!;
    #buttons: NodeListOf<HTMLButtonElement> | null = null;
    #gameTemplate: string | null = null;
    #onRentGame: ((game: Game, button: HTMLButtonElement) => void) | null = null;

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#gameTemplate = await this.loadTemplate('./src/view/templates/game-card.html');
    }

    onUserSelected(user: { id?: number }) {
        this.setButtonsState(!user.id);
    }

    registerRentGameCallback(callback: (game: Game, button: HTMLButtonElement) => void) {
        this.#onRentGame = callback;
    }

    render(games: Game[], disableButtons = true) {
        if (!this.#gameTemplate) return;
        const html = games.map(game => {
            return this.replaceTemplate(this.#gameTemplate!, {
                id: game.id,
                name: game.name,
                price_category: game.price_category,
                price_base: game.price_base,
                mechanics: game.mechanics.join(', '),
                complexity: game.complexity,
                playtime: game.playtime,
                min_players: game.min_players,
                max_players: game.max_players,
                game: JSON.stringify(game)
            });
        }).join('');

        this.#gameList.innerHTML = html;
        this.attachRentButtonListeners();
        this.setButtonsState(disableButtons);
    }

    setButtonsState(disabled: boolean) {
        if (!this.#buttons) {
            this.#buttons = document.querySelectorAll('.rent-now-btn');
        }
        this.#buttons.forEach(button => {
            button.disabled = disabled;
        });
    }

    attachRentButtonListeners() {
        this.#buttons = document.querySelectorAll('.rent-now-btn');
        this.#buttons.forEach(button => {
            button.addEventListener('click', () => {
                const game: Game = JSON.parse(button.dataset.game!);
                const originalText = button.innerHTML;

                button.innerHTML = '<i class="bi bi-check-circle-fill"></i> Added';
                button.classList.remove('btn-primary');
                button.classList.add('btn-success');
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('btn-success');
                    button.classList.add('btn-primary');
                }, 500);
                this.#onRentGame?.(game, button);
            });
        });
    }
}
