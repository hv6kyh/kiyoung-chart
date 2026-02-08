import { Component, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { StockService } from '../../services/stock.service';

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
  selectedStock = signal('005930.KS');
  stockSelected = output<string>();

  constructor(
    public authService: AuthService,
    private router: Router,
    private stockService: StockService,
  ) {}

  stocks = signal<StockSymbol[]>([
    {
      code: '005930.KS',
      name: '삼성전자',
      shortName: '삼전',
      color: '#1428a0',
      price: '-',
      change: '-',
      isUp: true,
      sector: '반도체',
    },
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
      code: 'AAPL',
      name: '애플',
      shortName: 'AP',
      color: '#555555',
      price: '-',
      change: '-',
      isUp: true,
      sector: 'M7',
    },
    {
      code: 'GOOGL',
      name: '구글',
      shortName: 'GG',
      color: '#4285f4',
      price: '-',
      change: '-',
      isUp: true,
      sector: 'M7',
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
  }

  onAddStock() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/stocks/add']);
    } else {
      this.authService.openModal('login');
    }
  }
}
