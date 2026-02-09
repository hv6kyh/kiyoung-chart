import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, AuthMode } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css'],
})
export class AuthModalComponent {
  email = signal('');
  password = signal('');

  constructor(public authService: AuthService) {}

  setMode(mode: AuthMode) {
    this.authService.openModal(mode);
    this.email.set('');
    this.password.set('');
  }

  onEmailInput(event: Event) {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event) {
    this.password.set((event.target as HTMLInputElement).value);
  }

  async onSubmit() {
    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) return;

    if (this.authService.authMode() === 'login') {
      await this.authService.loginWithEmail(email, password);
    } else {
      await this.authService.signup(email, password);
    }
  }

}
