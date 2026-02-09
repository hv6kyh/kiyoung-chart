import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { HeaderComponent } from '../../components/header/header.component';
import { StockSidebarComponent } from '../../components/stock-sidebar/stock-sidebar.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { MatchDetailModalComponent } from '../../components/match-detail-modal/match-detail-modal.component';
import { StockService } from '../../services/stock.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
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
        MatchDetailModalComponent,
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
    currentSymbol = signal('000660.KS');
    predictionData = signal<PredictionResult | null>(null);
    multiTimeframeData = signal<MultiTimeframeResult | null>(null);
    analysisMode = signal<'BASIC' | 'MULTI' | 'ADVANCED'>('BASIC');
    isLoading = signal(false);

    private stockNameMap: Record<string, { name: string; sector: string }> = {
        '000660.KS': { name: 'SK하이닉스', sector: '반도체' },
        'MSFT': { name: '마이크로소프트', sector: 'M7' },
        'CRM': { name: '세일즈포스', sector: 'SaaS' },
        'COIN': { name: '코인베이스', sector: '크립토' },
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
        private analytics: AnalyticsService,
    ) {}

    ngOnInit() {
        this.loadData();
    }

    async selectSymbol(symbol: string) {
        this.currentSymbol.set(symbol);
        this.analytics.capture('stock_selected', { symbol });
        this.loadData();
    }

    setAnalysisMode(mode: 'BASIC' | 'MULTI' | 'ADVANCED') {
        this.analysisMode.set(mode);
        this.analytics.capture('analysis_mode_changed', { mode, symbol: this.currentSymbol() });
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
                    this.analytics.capture('analysis_loaded', { symbol, mode, matchCount: result.matches.length });
                },
                error: (error) => {
                    console.error('Error loading data:', error);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_error', { symbol, mode, error: String(error.message ?? error) });
                },
            });
        } else if (mode === 'MULTI') {
            this.stockService.getMultiTimeframe(symbol).subscribe({
                next: (result) => {
                    this.multiTimeframeData.set(result);
                    this.predictionData.set(result.combined);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_loaded', { symbol, mode, matchCount: result.combined.matches.length });
                },
                error: (error) => {
                    console.error('Error loading multi-timeframe data:', error);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_error', { symbol, mode, error: String(error.message ?? error) });
                },
            });
        } else if (mode === 'ADVANCED') {
            this.stockService.getAdvancedAnalysis(symbol, { useDTW: true, useATR: true }).subscribe({
                next: (result) => {
                    this.predictionData.set(result);
                    this.multiTimeframeData.set(null);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_loaded', { symbol, mode, matchCount: result.matches.length });
                },
                error: (error) => {
                    console.error('Error loading advanced data:', error);
                    this.isLoading.set(false);
                    this.analytics.capture('analysis_error', { symbol, mode, error: String(error.message ?? error) });
                },
            });
        }
    }
}
