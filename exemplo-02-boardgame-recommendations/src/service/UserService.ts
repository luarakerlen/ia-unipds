import { User } from '../workers/types';

export class UserService {
    #storageKey = 'ew-academy-users';

    async getDefaultUsers(): Promise<User[]> {
        const response = await fetch('./data/users.json');
        const users = await response.json();
        this.#setStorage(users);

        return users;
    }

    async getUsers(): Promise<User[]> {
        const users = this.#getStorage();
        return users;
    }

    async getUserById(userId: number): Promise<User | undefined> {
        const users = this.#getStorage();
        return users.find((user: User) => user.id === userId);
    }

    async updateUser(user: User): Promise<User> {
        const users = this.#getStorage();
        const userIndex = users.findIndex((u: User) => u.id === user.id);

        users[userIndex] = { ...users[userIndex], ...user };
        this.#setStorage(users);

        return users[userIndex];
    }

    async addUser(user: User): Promise<void> {
        const users = this.#getStorage();
        this.#setStorage([user, ...users]);
    }

    #getStorage(): User[] {
        const data = sessionStorage.getItem(this.#storageKey);
        return data ? JSON.parse(data) : [];
    }

    #setStorage(data: User[]): void {
        sessionStorage.setItem(this.#storageKey, JSON.stringify(data));
    }
}
