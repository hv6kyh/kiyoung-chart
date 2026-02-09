import { Component, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { StockService } from '../../services/stock.service';
import { AnalyticsService } from '../../services/analytics.service';

export interface StockSymbol {
  code: string;
  name: string;
  shortName: string;
  color: string;
  price: string;
  change: string;
  isUp: boolean;
  sector: string;
}

@Component({
  selector: 'app-stock-sidebar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './stock-sidebar.component.html',
  styleUrls: ['./stock-sidebar.component.css'],
})
export class StockSidebarComponent implements OnInit {
  isCollapsed = signal(false);
  isLoadingQuotes = signal(true);
  selectedStock = signal('000660.KS');
  stockSelected = output<string>();

  constructor(
    public authService: AuthService,
    private router: Router,
    private stockService: StockService,
    private analytics: AnalyticsService,
  ) {}

  stocks = signal<StockSymbol[]>([
    {
      code: '000660.KS',
      name: 'SK하이닉스',
      shortName: 'SK',
      color: '#ed1c24',
      price: '-',
      change: '-',
      isUp: false,
      sector: '반도체',
    },
    {
      code: 'MSFT',
      name: '마이크로소프트',
      shortName: 'MS',
      color: '#00a4ef',
      price: '-',
      change: '-',
      isUp: true,
      sector: 'M7',
    },
    {
      code: 'CRM',
      name: '세일즈포스',
      shortName: 'SF',
      color: '#00a1e0',
      price: '-',
      change: '-',
      isUp: true,
      sector: 'SaaS',
    },
    {
      code: 'COIN',
      name: '코인베이스',
      shortName: 'CB',
      color: '#0052ff',
      price: '-',
      change: '-',
      isUp: true,
      sector: '크립토',
    },
  ]);

  ngOnInit() {
    this.refreshQuotes();
  }

  refreshQuotes() {
    const symbols = this.stocks().map((s) => s.code);
    this.stockService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        this.stocks.update((currentStocks) =>
          currentStocks.map((stock) => {
            const quote = quotes.find((q) => q.code === stock.code);
            if (quote) {
              return {
                ...stock,
                price: quote.price.toLocaleString(),
                change: `${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}%`,
                isUp: quote.isUp,
              };
            }
            return stock;
          }),
        );
        this.isLoadingQuotes.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch quotes:', err);
        this.isLoadingQuotes.set(false);
      },
    });
  }

  toggleSidebar() {
    this.isCollapsed.update((value) => !value);
  }

  selectStock(code: string) {
    this.selectedStock.set(code);
    this.stockSelected.emit(code);
    this.analytics.capture('sidebar_stock_clicked', { code });
  }

  onAddStock() {
    this.analytics.capture('add_stock_clicked', { isLoggedIn: this.authService.isLoggedIn() });
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/stocks/add']);
    } else {
      this.authService.openModal('login');
    }
  }
}
