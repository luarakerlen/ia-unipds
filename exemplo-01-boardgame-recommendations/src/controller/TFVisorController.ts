import Events from '../events/events';

export class TFVisorController {
    #tfVisorView: any;
    #events: typeof Events;

    constructor({ tfVisorView, events }: { tfVisorView: any; events: typeof Events }) {
        this.#tfVisorView = tfVisorView;
        this.#events = events;

        this.init();
    }

    static init(deps: { tfVisorView: any; events: typeof Events }) {
        return new TFVisorController(deps);
    }

    async init() {
        this.setupCallbacks();
    }

    setupCallbacks() {
        this.#events.onTrainModel(() => {
            this.#tfVisorView.resetDashboard();
        });

        this.#events.onTFVisLogs(
            (log: any) => {
                this.#tfVisorView.handleTrainingLog(log);
            }
        );
    }
}
