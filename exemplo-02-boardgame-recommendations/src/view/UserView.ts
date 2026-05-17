import { View } from './View';
import { User, Rental } from '../workers/types';

export class UserView extends View {
    #userSelect = document.querySelector<HTMLSelectElement>('#userSelect')!;
    #userAge = document.querySelector<HTMLInputElement>('#userAge')!;
    #pastRentalsList = document.querySelector<HTMLElement>('#pastRentalsList')!;

    #rentalTemplate: string | null = null;
    #onUserSelect: ((userId: number) => void) | null = null;
    #onRentalRemove: ((data: { element: HTMLElement; userId: number; rental: Rental }) => void) | null = null;
    #pastRentalElements: HTMLElement[] = [];

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#rentalTemplate = await this.loadTemplate('./src/view/templates/past-rental.html');
        this.attachUserSelectListener();
    }

    registerUserSelectCallback(callback: (userId: number) => void) {
        this.#onUserSelect = callback;
    }

    registerRentalRemoveCallback(callback: (data: { element: HTMLElement; userId: number; rental: Rental }) => void) {
        this.#onRentalRemove = callback;
    }

    renderUserOptions(users: User[]) {
        const options = users.map(user => {
            return `<option value="${user.id}">${user.name}</option>`;
        }).join('');

        this.#userSelect.innerHTML += options;
    }

    renderUserDetails(user: User) {
        this.#userAge.value = String(user.age);
    }

    renderPastRentals(pastRentals: Rental[]) {
        if (!this.#rentalTemplate) return;

        if (!pastRentals || pastRentals.length === 0) {
            this.#pastRentalsList.innerHTML = '<p>No past rentals found.</p>';
            return;
        }

        const html = pastRentals.map(rental => {
            return this.replaceTemplate(this.#rentalTemplate!, {
                ...rental,
                game: JSON.stringify(rental)
            });
        }).join('');

        this.#pastRentalsList.innerHTML = html;
        this.attachRentalClickHandlers();
    }

    addPastRental(rental: Rental) {
        if (this.#pastRentalsList.innerHTML.includes('No past rentals found')) {
            this.#pastRentalsList.innerHTML = '';
        }

        const rentalHtml = this.replaceTemplate(this.#rentalTemplate!, {
            ...rental,
            game: JSON.stringify(rental)
        });

        this.#pastRentalsList.insertAdjacentHTML('afterbegin', rentalHtml);

        const newRental = this.#pastRentalsList.firstElementChild!.querySelector('.past-rental') as HTMLElement;
        newRental.classList.add('past-rental-highlight');

        setTimeout(() => {
            newRental.classList.remove('past-rental-highlight');
        }, 1000);

        this.attachRentalClickHandlers();
    }

    attachUserSelectListener() {
        this.#userSelect.addEventListener('change', (event) => {
            const userId = (event.target as HTMLSelectElement).value ? Number((event.target as HTMLSelectElement).value) : null;

            if (userId) {
                if (this.#onUserSelect) {
                    this.#onUserSelect(userId);
                }
            } else {
                this.#userAge.value = '';
                this.#pastRentalsList.innerHTML = '';
            }
        });
    }

    attachRentalClickHandlers() {
        this.#pastRentalElements = [];

        const rentalElements = document.querySelectorAll<HTMLElement>('.past-rental');

        rentalElements.forEach(rentalElement => {
            this.#pastRentalElements.push(rentalElement);

            rentalElement.onclick = (event) => {
                const rental: Rental = JSON.parse(rentalElement.dataset.game!);
                const userId = this.getSelectedUserId()!;
                const element = rentalElement.closest('.col-md-6') as HTMLElement;

                this.#onRentalRemove?.({ element, userId, rental });

                element.style.transition = 'opacity 0.5s ease';
                element.style.opacity = '0';

                setTimeout(() => {
                    element.remove();

                    if (document.querySelectorAll('.past-rental').length === 0) {
                        this.renderPastRentals([]);
                    }
                }, 500);
            };
        });
    }

    getSelectedUserId(): number | null {
        return this.#userSelect.value ? Number(this.#userSelect.value) : null;
    }
}
