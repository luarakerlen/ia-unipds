import Events from '../events/events';
import { Game } from '../workers/types';

export class GameController {
    #gameView: any;
    #currentUser: any = null;
    #events: typeof Events;
    #gameService: any;

    constructor({ gameView, events, gameService }: { gameView: any; events: typeof Events; gameService: any }) {
        this.#gameView = gameView;
        this.#gameService = gameService;
        this.#events = events;
        this.init();
    }

    static init(deps: { gameView: any; events: typeof Events; gameService: any }) {
        return new GameController(deps);
    }

    async init() {
        this.setupCallbacks();
        this.setupEventListeners();
        const games = await this.#gameService.getGames();
        this.#gameView.render(games, true);
    }

    setupEventListeners() {
        this.#events.onUserSelected((user: any) => {
            this.#currentUser = user;
            this.#gameView.onUserSelected(user);
            this.#events.dispatchRecommend(user);
        });

        this.#events.onRecommendationsReady(({ recommendations }: { recommendations: Game[] }) => {
            this.#gameView.render(recommendations, false);
        });
    }

    setupCallbacks() {
        this.#gameView.registerRentGameCallback(this.handleRentGame.bind(this));
    }

    async handleRentGame(game: Game) {
        const user = this.#currentUser;
        this.#events.dispatchPurchaseAdded({ user, product: game });
    }
}
