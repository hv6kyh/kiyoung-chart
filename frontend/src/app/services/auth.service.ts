import { Injectable, inject, signal } from '@angular/core';
import { AnalyticsService } from './analytics.service';

export type AuthMode = 'login' | 'signup';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private analytics = inject(AnalyticsService);

    private _isLoggedIn = signal(false);
    private _showAuthModal = signal(false);
    private _authMode = signal<AuthMode>('login');

    isLoggedIn = this._isLoggedIn.asReadonly();
    showAuthModal = this._showAuthModal.asReadonly();
    authMode = this._authMode.asReadonly();

    openModal(mode: AuthMode = 'login') {
        this._authMode.set(mode);
        this._showAuthModal.set(true);
        this.analytics.capture('auth_modal_opened', { mode });
    }

    closeModal() {
        this._showAuthModal.set(false);
    }

    login() {
        // Mock login
        this._isLoggedIn.set(true);
        this.closeModal();
        this.analytics.capture('user_logged_in');
    }

    logout() {
        this._isLoggedIn.set(false);
        this.analytics.capture('user_logged_out');
        this.analytics.reset();
    }
}
