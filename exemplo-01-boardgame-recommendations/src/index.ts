import { UserController } from './controller/UserController';
import { GameController } from './controller/GameController';
import { ModelController } from './controller/ModelTrainingController';
import { TFVisorController } from './controller/TFVisorController';
import { TFVisorView } from './view/TFVisorView';
import { UserService } from './service/UserService';
import { GameService } from './service/GameService';
import { UserView } from './view/UserView';
import { GameView } from './view/GameView';
import { ModelView } from './view/ModelTrainingView';
import Events from './events/events';
import { WorkerController } from './controller/WorkerController';

const userService = new UserService();
const gameService = new GameService();

const userView = new UserView();
const gameView = new GameView();
const modelView = new ModelView();
const tfVisorView = new TFVisorView();

const mlWorker = new Worker(
    new URL('./workers/modelTrainingWorker.ts', import.meta.url),
    { type: 'module' }
);

const w = WorkerController.init({
    worker: mlWorker,
    events: Events,
});

const users = await userService.getDefaultUsers();
w.triggerTrain(users);

ModelController.init({
    modelView,
    userService,
    events: Events,
});

TFVisorController.init({
    tfVisorView,
    events: Events,
});

GameController.init({
    gameView,
    gameService,
    events: Events,
});

const userController = UserController.init({
    userView,
    userService,
    events: Events,
});

userController.renderUsers({
    id: 99,
    name: "Josézin da Silva",
    age: 30,
    rentals: [],
});
