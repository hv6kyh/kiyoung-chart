import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { HeaderComponent } from '../../components/header/header.component';
import { StockSidebarComponent } from '../../components/stock-sidebar/stock-sidebar.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { MatchDetailModalComponent } from '../../components/match-detail-modal/match-detail-modal.component';
import { StockService } from '../../services/stock.service';
import { AuthService } from '../../services/auth.service';
import { PredictionResult, MultiTimeframeResult } from '../../types/stock.types';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        HeaderComponent,
        StockSidebarComponent,
        ChartComponent,
        SidebarComponent,
        AuthModalComponent,
        MatchDetailModalComponent,
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
    currentSymbol = signal('005930.KS');
    predictionData = signal<PredictionResult | null>(null);
    multiTimeframeData = signal<MultiTimeframeResult | null>(null);
    analysisMode = signal<'BASIC' | 'MULTI' | 'ADVANCED'>('BASIC');
    isLoading = signal(false);

    private stockNameMap: Record<string, { name: string; sector: string }> = {
        '005930.KS': { name: '삼성전자', sector: '반도체' },
        '000660.KS': { name: 'SK하이닉스', sector: '반도체' },
        'AAPL': { name: '애플', sector: 'M7' },
        'GOOGL': { name: '구글', sector: 'M7' },
    };

    analysisModes = [
        { key: 'BASIC' as const, label: '기본 분석', desc: '최근 15일 패턴 비교' },
        { key: 'MULTI' as const, label: '다중 프레임', desc: '7/15/30일 종합 분석' },
        { key: 'ADVANCED' as const, label: '정밀 분석', desc: 'DTW + ATR 보정' },
    ];

    currentStockInfo = computed(() =>
        this.stockNameMap[this.currentSymbol()] || { name: this.currentSymbol(), sector: '' },
    );

    currentPrice = computed(() => {
        const data = this.predictionData();
        if (!data || data.history.length === 0) return 0;
        return data.history[data.history.length - 1].close;
    });

    priceChange = computed(() => {
        const data = this.predictionData();
        if (!data || data.history.length < 2) return { value: 0, percent: 0, isUp: true };
        const last = data.history[data.history.length - 1].close;
        const prev = data.history[data.history.length - 2].close;
        const diff = last - prev;
        const percent = (diff / prev) * 100;
        return {
            value: Math.abs(diff),
            percent: Math.abs(percent),
            isUp: diff >= 0,
        };
    });

    constructor(
        private stockService: StockService,
        public authService: AuthService,
    ) {}

    ngOnInit() {
        this.loadData();
    }

    async selectSymbol(symbol: string) {
        this.currentSymbol.set(symbol);
        this.loadData();
    }

    setAnalysisMode(mode: 'BASIC' | 'MULTI' | 'ADVANCED') {
        this.analysisMode.set(mode);
        this.loadData();
    }

    private loadData() {
        this.isLoading.set(true);
        const symbol = this.currentSymbol();
        const mode = this.analysisMode();

        if (mode === 'BASIC') {
            this.stockService.getAnalysis(symbol).subscribe({
                next: (result) => {
                    this.predictionData.set(result);
                    this.multiTimeframeData.set(null);
                    this.isLoading.set(false);
                },
                error: (error) => {
                    console.error('Error loading data:', error);
                    this.isLoading.set(false);
                },
            });
        } else if (mode === 'MULTI') {
            this.stockService.getMultiTimeframe(symbol).subscribe({
                next: (result) => {
                    this.multiTimeframeData.set(result);
                    this.predictionData.set(result.combined);
                    this.isLoading.set(false);
                },
                error: (error) => {
                    console.error('Error loading multi-timeframe data:', error);
                    this.isLoading.set(false);
                },
            });
        } else if (mode === 'ADVANCED') {
            this.stockService.getAdvancedAnalysis(symbol, { useDTW: true, useATR: true }).subscribe({
                next: (result) => {
                    this.predictionData.set(result);
                    this.multiTimeframeData.set(null);
                    this.isLoading.set(false);
                },
                error: (error) => {
                    console.error('Error loading advanced data:', error);
                    this.isLoading.set(false);
                },
            });
        }
    }
}
