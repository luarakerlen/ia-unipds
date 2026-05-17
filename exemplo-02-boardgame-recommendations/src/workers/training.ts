import * as tf from '@tensorflow/tfjs';
import { Context } from './types';
import { encodeUser, encodeProduct } from './encoding';

export function createTrainingData(context: Context) {
    const inputs: number[][] = [];
    const labels: number[] = [];

    context.users
        .filter((u) => u.rentals.length)
        .forEach((user) => {
            const userVector = encodeUser(user, context).dataSync();
            context.products.forEach((product) => {
                const productVector = encodeProduct(product, context).dataSync();

                const label = user.rentals.some((rental) =>
                    rental.game_id === product.id
                ) ? 1 : 0;

                inputs.push([...userVector, ...productVector]);
                labels.push(label);
            });
        });

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimensions: context.dimensions * 2 + 1,
    };
}

export async function configureNeuralNetAndTrain(
    trainData: { xs: tf.Tensor2D; ys: tf.Tensor2D; inputDimensions: number },
    callbacks?: tf.CustomCallbackArgs,
) {
    const model = tf.sequential();
    model.add(tf.layers.dense({
        inputShape: [trainData.inputDimensions],
        units: 128,
        activation: 'relu',
    }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });
    await model.fit(trainData.xs, trainData.ys, {
        epochs: 50,
        batchSize: 32,
        shuffle: true,
        callbacks,
    });
    return model;
}
