import { events } from './constants.js';

export default class Events {

    static onTrainingComplete(callback: (data: any) => void) {
        document.addEventListener(events.trainingComplete, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchTrainingComplete(data: any) {
        const event = new CustomEvent(events.trainingComplete, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onRecommend(callback: (data: any) => void) {
        document.addEventListener(events.recommend, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchRecommend(data: any) {
        const event = new CustomEvent(events.recommend, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onRecommendationsReady(callback: (data: any) => void) {
        document.addEventListener(events.recommendationsReady, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchRecommendationsReady(data: any) {
        const event = new CustomEvent(events.recommendationsReady, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onTrainModel(callback: (data: any) => void) {
        document.addEventListener(events.modelTrain, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchTrainModel(data: any) {
        const event = new CustomEvent(events.modelTrain, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onTFVisLogs(callback: (data: any) => void) {
        document.addEventListener(events.tfvisLogs, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }

    static dispatchTFVisLogs(data: any) {
        const event = new CustomEvent(events.tfvisLogs, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onTFVisorData(callback: (data: any) => void) {
        document.addEventListener(events.tfvisData, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchTFVisorData(data: any) {
        const event = new CustomEvent(events.tfvisData, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onProgressUpdate(callback: (data: any) => void) {
        document.addEventListener(events.modelProgressUpdate, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }

    static dispatchProgressUpdate(progressData: any) {
        const event = new CustomEvent(events.modelProgressUpdate, {
            detail: progressData
        });
        document.dispatchEvent(event);
    }

    static onUserSelected(callback: (data: any) => void) {
        document.addEventListener(events.userSelected, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchUserSelected(data: any) {
        const event = new CustomEvent(events.userSelected, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onUsersUpdated(callback: (data: any) => void) {
        document.addEventListener(events.usersUpdated, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchUsersUpdated(data: any) {
        const event = new CustomEvent(events.usersUpdated, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onPurchaseAdded(callback: (data: any) => void) {
        document.addEventListener(events.purchaseAdded, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }
    static dispatchPurchaseAdded(data: any) {
        const event = new CustomEvent(events.purchaseAdded, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    static onPurchaseRemoved(callback: (data: any) => void) {
        document.addEventListener(events.purchaseRemoved, (event) => {
            return callback((event as CustomEvent).detail);
        });
    }

    static dispatchEventPurchaseRemoved(data: any) {
        const event = new CustomEvent(events.purchaseRemoved, {
            detail: data
        });
        document.dispatchEvent(event);
    }
}
