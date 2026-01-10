import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from './services/stock.service';
import { ChartComponent } from './components/chart/chart.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PredictionResult } from './types/stock.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ChartComponent, SidebarComponent],
  template: `
    <div class="app-layout">
      <header class="glass">
        <h1>기영이 차트 <small>Enterprise v20</small></h1>
        <div class="symbol-tabs">
          <button (click)="selectSymbol('005930.KS')" [class.active]="currentSymbol() === '005930.KS'">삼성전자</button>
          <button (click)="selectSymbol('000660.KS')" [class.active]="currentSymbol() === '000660.KS'">SK하이닉스</button>
        </div>
      </header>

      <main>
        <div class="chart-area">
          <app-chart [data]="predictionData()"></app-chart>
        </div>
        <aside>
          <app-sidebar [data]="predictionData()"></app-sidebar>
        </aside>
      </main>
    </div>
  `,
  styles: [`
    .app-layout { display: flex; flex-direction: column; height: 100vh; background: #131722; color: white; font-family: 'Inter', sans-serif; }
    header { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
    main { display: flex; flex: 1; overflow: hidden; }
    .chart-area { flex: 3; padding: 20px; }
    aside { flex: 1; min-width: 320px; border-left: 1px solid rgba(255, 255, 255, 0.1); }
    .symbol-tabs button { padding: 10px 20px; margin-left: 10px; background: rgba(255, 255, 255, 0.1); border: none; color: white; border-radius: 8px; cursor: pointer; }
    .symbol-tabs button.active { background: #2196f3; box-shadow: 0 0 15px rgba(33, 150, 243, 0.4); }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); }
  `]
})
export class App implements OnInit {
  currentSymbol = signal('005930.KS');
  predictionData = signal<PredictionResult | null>(null);

  constructor(private stockService: StockService) { }

  ngOnInit() {
    this.loadData();
  }

  async selectSymbol(symbol: string) {
    this.currentSymbol.set(symbol);
    await this.loadData();
  }

  private async loadData() {
    try {
      const result = await this.stockService.getStockData(this.currentSymbol());
      this.predictionData.set(result);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
}
