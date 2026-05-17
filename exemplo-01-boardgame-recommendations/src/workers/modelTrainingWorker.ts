import * as tf from '@tensorflow/tfjs';
import { workerEvents } from '../events/constants';
import { Game, User, Context } from './types';
import { encodeProduct, encodeUser, makeContext } from './encoding';
import { createTrainingData, configureNeuralNetAndTrain } from './training';

let _globalCtx: Context | null = null;
let _model: tf.LayersModel | null = null;

async function trainModel({ users }: { users: User[] }) {
    try {
        postMessage({
            type: workerEvents.progressUpdate,
            progress: { progress: 50 },
        });

        const products = await (await fetch('/data/games.json')).json() as Game[];
        const context = makeContext(products, users);

        context.productVectors = products.map(product => ({
            name: product.name,
            meta: { ...product },
            vector: encodeProduct(product, context).dataSync() as Float32Array,
        }));

        _globalCtx = context;

        const trainData = createTrainingData(context);
        _model = await configureNeuralNetAndTrain(trainData, {
            onEpochEnd: (epoch, logs) => {
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch,
                    loss: logs?.loss,
                    accuracy: logs?.acc,
                });
            },
        });

        postMessage({
            type: workerEvents.progressUpdate,
            progress: { progress: 100 },
        });
        postMessage({ type: workerEvents.trainingComplete });
    } catch (err) {
        postMessage({
            type: workerEvents.trainingLog,
            error: err instanceof Error ? err.message : String(err),
        });
        postMessage({ type: workerEvents.trainingComplete });
    }
}

function recommend(user: User) {
    if (!_model || !_globalCtx) return;

    const context = _globalCtx;
    const userVector = encodeUser(user, context).dataSync();

    const inputs = context.productVectors!.map(({ vector }) => [
        ...userVector,
        ...vector,
    ]);

    const inputTensor = tf.tensor2d(inputs);
    const predictions = _model.predict(inputTensor) as tf.Tensor;
    const scores = predictions.dataSync();

    const recommendations = context.productVectors!.map((item, index) => ({
        ...item.meta,
        name: item.name,
        score: scores[index],
    }));

    const sortedItems = recommendations.sort((a, b) => b.score - a.score);

    postMessage({
        type: workerEvents.recommend,
        user,
        recommendations: sortedItems,
    });
}

const handlers: Record<string, (data: any) => void> = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: (d: { user: User }) => recommend(d.user),
};

self.onmessage = (e: MessageEvent) => {
    const { action, ...data } = e.data;
    if (handlers[action]) {
        try {
            handlers[action](data);
        } catch (err) {
            postMessage({
                type: workerEvents.trainingLog,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
};
