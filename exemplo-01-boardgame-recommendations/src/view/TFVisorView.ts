import { View } from './View';

declare const tfvis: any;

export class TFVisorView extends View {
    #weights: any = null;
    #catalog: any[] = [];
    #users: any[] = [];
    #logs: any[] = [];
    #lossPoints: { x: number; y: number }[] = [];
    #accPoints: { x: number; y: number }[] = [];

    constructor() {
        super();

        tfvis.visor().open();
    }

    renderData(data: { weights?: any; catalog?: any[]; users?: any[] }) {
        this.#weights = data.weights;
        this.#catalog = data.catalog ?? [];
        this.#users = data.users ?? [];
    }

    resetDashboard() {
        this.#weights = null;
        this.#catalog = [];
        this.#users = [];
        this.#logs = [];
        this.#lossPoints = [];
        this.#accPoints = [];
    }

    handleTrainingLog(log: { epoch: number; loss: number; accuracy: number }) {
        const { epoch, loss, accuracy } = log;
        this.#lossPoints.push({ x: epoch, y: loss });
        this.#accPoints.push({ x: epoch, y: accuracy });
        this.#logs.push(log);

        tfvis.render.linechart(
            {
                name: 'Precisão do Modelo',
                tab: 'Treinamento',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#accPoints, series: ['precisão'] },
            {
                xLabel: 'Época (Ciclos de Treinamento)',
                yLabel: 'Precisão (%)',
                height: 300
            }
        );

        tfvis.render.linechart(
            {
                name: 'Erro de Treinamento',
                tab: 'Treinamento',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#lossPoints, series: ['erros'] },
            {
                xLabel: 'Época (Ciclos de Treinamento)',
                yLabel: 'Valor do Erro',
                height: 300
            }
        );
    }
}
