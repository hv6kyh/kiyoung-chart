import { Injectable, signal } from '@angular/core';

export type AuthMode = 'login' | 'signup';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private _isLoggedIn = signal(false);
    private _showAuthModal = signal(false);
    private _authMode = signal<AuthMode>('login');

    isLoggedIn = this._isLoggedIn.asReadonly();
    showAuthModal = this._showAuthModal.asReadonly();
    authMode = this._authMode.asReadonly();

    openModal(mode: AuthMode = 'login') {
        this._authMode.set(mode);
        this._showAuthModal.set(true);
    }

    closeModal() {
        this._showAuthModal.set(false);
    }

    login() {
        // Mock login
        this._isLoggedIn.set(true);
        this.closeModal();
    }

    logout() {
        this._isLoggedIn.set(false);
    }
}
