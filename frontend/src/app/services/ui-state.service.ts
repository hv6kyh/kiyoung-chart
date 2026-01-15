import { Injectable, signal } from '@angular/core';
import { PredictionMatch } from '../types/stock.types';

@Injectable({
    providedIn: 'root'
})
export class UIStateService {
    private _showMatchModal = signal(false);
    private _selectedMatch = signal<PredictionMatch | null>(null);

    showMatchModal = this._showMatchModal.asReadonly();
    selectedMatch = this._selectedMatch.asReadonly();

    openMatchDetail(match: PredictionMatch) {
        this._selectedMatch.set(match);
        this._showMatchModal.set(true);
    }

    closeMatchDetail() {
        this._showMatchModal.set(false);
        this._selectedMatch.set(null);
    }
}
