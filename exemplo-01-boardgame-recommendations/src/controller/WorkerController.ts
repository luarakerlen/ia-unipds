import Events from '../events/events';
import { workerEvents } from '../events/constants';

export class WorkerController {
    #worker: Worker;
    #events: typeof Events;
    #alreadyTrained = false;

    constructor({ worker, events }: { worker: Worker; events: typeof Events }) {
        this.#worker = worker;
        this.#events = events;
        this.#alreadyTrained = false;
        this.init();
    }

    async init() {
        this.setupCallbacks();
    }

    static init(deps: { worker: Worker; events: typeof Events }) {
        return new WorkerController(deps);
    }

    setupCallbacks() {
        this.#events.onTrainModel((data: any) => {
            this.#alreadyTrained = false;
            this.triggerTrain(data);
        });
        this.#events.onTrainingComplete(() => {
            this.#alreadyTrained = true;
        });

        this.#events.onRecommend((data: any) => {
            if (!this.#alreadyTrained) return;

            this.triggerRecommend(data);
        });

        const eventsToIgnoreLogs = [
            workerEvents.progressUpdate,
            workerEvents.trainingLog,
            workerEvents.tfVisData,
            workerEvents.tfVisLogs,
            workerEvents.trainingComplete,
        ];
        this.#worker.onmessage = (event: MessageEvent) => {
            if (event.data.error) console.error('WORKER_ERROR:', event.data.error);

            if (event.data.type === workerEvents.progressUpdate) {
                this.#events.dispatchProgressUpdate(event.data.progress);
            }

            if (event.data.type === workerEvents.trainingComplete) {
                this.#events.dispatchTrainingComplete(event.data);
            }

            if (event.data.type === workerEvents.tfVisData) {
                this.#events.dispatchTFVisorData(event.data.data);
            }

            if (event.data.type === workerEvents.trainingLog) {
                this.#events.dispatchTFVisLogs(event.data);
            }
            if (event.data.type === workerEvents.recommend) {
                this.#events.dispatchRecommendationsReady(event.data);
            }
        };
    }

    triggerTrain(users: any) {
        this.#worker.postMessage({ action: workerEvents.trainModel, users });
    }

    triggerRecommend(user: any) {
        this.#worker.postMessage({ action: workerEvents.recommend, user });
    }
}
