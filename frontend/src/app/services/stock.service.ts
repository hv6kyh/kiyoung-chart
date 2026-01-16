import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PredictionResult, MultiTimeframeResult } from '../types/stock.types';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class StockService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // 기본 분석
    getAnalysis(symbol: string): Observable<PredictionResult> {
        return this.http.get<PredictionResult>(`${this.baseUrl}/stock/${symbol}`);
    }

    // 다중 시간 프레임 분석
    getMultiTimeframe(symbol: string): Observable<MultiTimeframeResult> {
        return this.http.get<MultiTimeframeResult>(
            `${this.baseUrl}/stock/${symbol}/multi-timeframe`
        );
    }

    // 고급 분석 (DTW + ATR)
    getAdvancedAnalysis(
        symbol: string,
        options?: {
            useDTW?: boolean;
            useATR?: boolean;
            dtwWeight?: number;
            atrPeriod?: number;
        }
    ): Observable<PredictionResult> {
        let url = `${this.baseUrl}/stock/${symbol}/advanced`;
        const params = new URLSearchParams();
        if (options?.useDTW !== undefined) params.set('useDTW', String(options.useDTW));
        if (options?.useATR !== undefined) params.set('useATR', String(options.useATR));
        if (options?.dtwWeight !== undefined) params.set('dtwWeight', String(options.dtwWeight));
        if (options?.atrPeriod !== undefined) params.set('atrPeriod', String(options.atrPeriod));

        const queryString = params.toString();
        if (queryString) {
            url += '?' + queryString;
        }
        return this.http.get<PredictionResult>(url);
    }
}
