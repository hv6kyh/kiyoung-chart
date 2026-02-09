import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';
import { AuthService } from './services/auth.service';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AuthModalComponent],
  template: `
    <router-outlet></router-outlet>
    @if (authService.showAuthModal()) {
      <app-auth-modal></app-auth-modal>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
    `,
  ],
})
export class App {
  constructor(
    analytics: AnalyticsService,
    public authService: AuthService,
  ) {
    analytics.init();
  }
}
