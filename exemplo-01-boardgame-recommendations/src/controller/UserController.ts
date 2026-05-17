import Events from '../events/events';
import { Rental } from '../workers/types';

export class UserController {
    #userService: any;
    #userView: any;
    #events: typeof Events;

    constructor({ userView, userService, events }: { userView: any; userService: any; events: typeof Events }) {
        this.#userView = userView;
        this.#userService = userService;
        this.#events = events;
    }

    static init(deps: { userView: any; userService: any; events: typeof Events }) {
        return new UserController(deps);
    }

    async renderUsers(nonTrainedUser: any) {
        const users = await this.#userService.getDefaultUsers();

        this.#userService.addUser(nonTrainedUser);
        const defaultAndNonTrained = [nonTrainedUser, ...users];

        this.#userView.renderUserOptions(defaultAndNonTrained);
        this.setupCallbacks();
        this.setupRentalObserver();

        this.#events.dispatchUsersUpdated({ users: defaultAndNonTrained });
    }

    setupCallbacks() {
        this.#userView.registerUserSelectCallback(this.handleUserSelect.bind(this));
        this.#userView.registerRentalRemoveCallback(this.handleRentalRemove.bind(this));
    }

    setupRentalObserver() {
        this.#events.onPurchaseAdded(async (data: any) => {
            return this.handleRentGame(data);
        });
    }

    async handleUserSelect(userId: number) {
        const user = await this.#userService.getUserById(userId);
        this.#events.dispatchUserSelected(user);
        return this.displayUserDetails(user);
    }

    async handleRentGame({ user, product }: { user: any; product: any }) {
        const updatedUser = await this.#userService.getUserById(user.id);
        updatedUser.rentals.push({
            ...product
        });

        await this.#userService.updateUser(updatedUser);

        const lastRental = updatedUser.rentals[updatedUser.rentals.length - 1];
        this.#userView.addPastRental(lastRental);
        this.#events.dispatchUsersUpdated({ users: await this.#userService.getUsers() });
    }

    async handleRentalRemove({ userId, rental }: { userId: number; rental: Rental }) {
        const user = await this.#userService.getUserById(userId);
        const index = user.rentals.findIndex((item: Rental) => item.game_id === rental.game_id);

        if (index !== -1) {
            user.rentals.splice(index, 1);
            await this.#userService.updateUser(user);

            const updatedUsers = await this.#userService.getUsers();
            this.#events.dispatchUsersUpdated({ users: updatedUsers });
        }
    }

    async displayUserDetails(user: any) {
        this.#userView.renderUserDetails(user);
        this.#userView.renderPastRentals(user.rentals);
    }

    getSelectedUserId() {
        return this.#userView.getSelectedUserId();
    }
}
