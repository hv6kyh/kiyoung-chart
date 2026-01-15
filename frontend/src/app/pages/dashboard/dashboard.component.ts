import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { StockSidebarComponent } from '../../components/stock-sidebar/stock-sidebar.component';
import { ChartComponent } from '../../components/chart/chart.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { MatchDetailModalComponent } from '../../components/match-detail-modal/match-detail-modal.component';
import { StockService } from '../../services/stock.service';
import { AuthService } from '../../services/auth.service';
import { PredictionResult } from '../../types/stock.types';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        HeaderComponent,
        FooterComponent,
        StockSidebarComponent,
        ChartComponent,
        SidebarComponent,
        AuthModalComponent,
        MatchDetailModalComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    currentSymbol = signal('005930.KS');
    predictionData = signal<PredictionResult | null>(null);
    isLoading = signal(false);

    constructor(private stockService: StockService, public authService: AuthService) { }

    ngOnInit() {
        this.loadData();
    }

    async selectSymbol(symbol: string) {
        this.currentSymbol.set(symbol);
        await this.loadData();
    }

    private async loadData() {
        this.isLoading.set(true);
        try {
            const result = await this.stockService.getStockData(this.currentSymbol());
            this.predictionData.set(result);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            this.isLoading.set(false);
        }
    }
}
