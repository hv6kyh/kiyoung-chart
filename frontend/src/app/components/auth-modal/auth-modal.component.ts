import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, AuthMode } from '../../services/auth.service';

@Component({
    selector: 'app-auth-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './auth-modal.component.html',
    styleUrls: ['./auth-modal.component.css']
})
export class AuthModalComponent {
    constructor(public authService: AuthService) { }

    setMode(mode: AuthMode) {
        this.authService.openModal(mode);
    }
}
