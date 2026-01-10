import { Injectable } from '@angular/core';
import { PredictionResult } from '../types/stock.types';

@Injectable({
    providedIn: 'root'
})
export class StockService {
    private apiUrl = 'http://localhost:3000/api/stock';

    async getStockData(symbol: string): Promise<PredictionResult> {
        const response = await fetch(`${this.apiUrl}/${symbol}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }
}
