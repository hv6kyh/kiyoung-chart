import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { StockService } from './services/stock.service';
import { ChartComponent } from './components/chart/chart.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { StockSidebarComponent } from './components/stock-sidebar/stock-sidebar.component';
import { PredictionResult } from './types/stock.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    StockSidebarComponent,
    ChartComponent,
    SidebarComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
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
