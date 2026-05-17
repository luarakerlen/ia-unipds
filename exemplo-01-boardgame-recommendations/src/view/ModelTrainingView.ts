import { View } from './View';
import { User } from '../workers/types';

export class ModelView extends View {
    #trainModelBtn = document.querySelector<HTMLButtonElement>('#trainModelBtn')!;
    #rentalsArrow = document.querySelector<HTMLElement>('#rentalsArrow')!;
    #rentalsDiv = document.querySelector<HTMLElement>('#rentalsDiv')!;
    #allUsersRentalsList = document.querySelector<HTMLElement>('#allUsersRentalsList')!;
    #runRecommendationBtn = document.querySelector<HTMLButtonElement>('#runRecommendationBtn')!;
    #onTrainModel: (() => void) | null = null;
    #onRunRecommendation: (() => void) | null = null;

    constructor() {
        super();
        this.attachEventListeners();
    }

    registerTrainModelCallback(callback: () => void) {
        this.#onTrainModel = callback;
    }

    registerRunRecommendationCallback(callback: () => void) {
        this.#onRunRecommendation = callback;
    }

    attachEventListeners() {
        this.#trainModelBtn.addEventListener('click', () => {
            this.#onTrainModel?.();
        });
        this.#runRecommendationBtn.addEventListener('click', () => {
            this.#onRunRecommendation?.();
        });

        this.#rentalsDiv.addEventListener('click', () => {
            const rentalsList = this.#allUsersRentalsList;

            const isHidden = window.getComputedStyle(rentalsList).display === 'none';

            if (isHidden) {
                rentalsList.style.display = 'block';
                this.#rentalsArrow.classList.remove('bi-chevron-down');
                this.#rentalsArrow.classList.add('bi-chevron-up');
            } else {
                rentalsList.style.display = 'none';
                this.#rentalsArrow.classList.remove('bi-chevron-up');
                this.#rentalsArrow.classList.add('bi-chevron-down');
            }
        });
    }

    enableRecommendButton() {
        this.#runRecommendationBtn.disabled = false;
    }

    updateTrainingProgress(progress: { progress?: number }) {
        this.#trainModelBtn.disabled = true;
        this.#trainModelBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Training...';

        if (progress.progress === 100) {
            this.#trainModelBtn.disabled = false;
            this.#trainModelBtn.innerHTML = 'Train Recommendation Model';
        }
    }

    renderAllUsersRentals(users: User[]) {
        const html = users.map(user => {
            const rentalsHtml = user.rentals.map(rental => {
                return `<span class="badge bg-light text-dark me-1 mb-1">${rental.name}</span>`;
            }).join('');

            return `
                <div class="user-rental-summary">
                    <h6>${user.name} (Age: ${user.age})</h6>
                    <div class="rentals-badges">
                        ${rentalsHtml || '<span class="text-muted">No rentals</span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.#allUsersRentalsList.innerHTML = html;
    }
}
