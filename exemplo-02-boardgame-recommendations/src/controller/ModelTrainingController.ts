import Events from '../events/events';

export class ModelController {
    #modelView: any;
    #userService: any;
    #events: typeof Events;
    #currentUser: any = null;
    #alreadyTrained = false;

    constructor({ modelView, userService, events }: { modelView: any; userService: any; events: typeof Events }) {
        this.#modelView = modelView;
        this.#userService = userService;
        this.#events = events;
        this.init();
    }

    static init(deps: { modelView: any; userService: any; events: typeof Events }) {
        return new ModelController(deps);
    }

    async init() {
        this.setupCallbacks();
    }

    setupCallbacks() {
        this.#modelView.registerTrainModelCallback(this.handleTrainModel.bind(this));
        this.#modelView.registerRunRecommendationCallback(this.handleRunRecommendation.bind(this));

        this.#events.onUserSelected((user: any) => {
            this.#currentUser = user;
            if (!this.#alreadyTrained) return;
            this.#modelView.enableRecommendButton();
        });

        this.#events.onTrainingComplete(() => {
            this.#alreadyTrained = true;
            if (!this.#currentUser) return;
            this.#modelView.enableRecommendButton();
        });

        this.#events.onUsersUpdated(async (data: any) => {
            return this.refreshUsersPurchaseData(data);
        });

        this.#events.onProgressUpdate((progress: any) => {
            this.handleTrainingProgressUpdate(progress);
        });
    }

    async handleTrainModel() {
        const users = await this.#userService.getUsers();
        this.#events.dispatchTrainModel(users);
    }

    handleTrainingProgressUpdate(progress: any) {
        this.#modelView.updateTrainingProgress(progress);
    }

    async handleRunRecommendation() {
        const currentUser = this.#currentUser;
        const updatedUser = await this.#userService.getUserById(currentUser.id);
        this.#events.dispatchRecommend(updatedUser);
    }

    async refreshUsersPurchaseData({ users }: { users: any[] }) {
        this.#modelView.renderAllUsersRentals(users);
    }
}
