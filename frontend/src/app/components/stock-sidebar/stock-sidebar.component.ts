import { Component, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { StockService } from '../../services/stock.service';

export interface StockSymbol {
  code: string;
  name: string;
  icon: string;
  price: string;
  change: string;
  isUp: boolean;
  sector: string;
}

@Component({
  selector: 'app-stock-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stock-sidebar.component.html',
  styleUrls: ['./stock-sidebar.component.css']
})
export class StockSidebarComponent implements OnInit {
  isCollapsed = signal(false);
  selectedStock = signal('005930.KS');
  stockSelected = output<string>();

  constructor(
    public authService: AuthService,
    private router: Router,
    private stockService: StockService
  ) { }

  stocks = signal<StockSymbol[]>([
    { code: '005930.KS', name: '삼성전자', icon: '📱', price: '-', change: '-', isUp: true, sector: '반도체' },
    { code: '000660.KS', name: 'SK하이닉스', icon: '💾', price: '-', change: '-', isUp: false, sector: '반도체' },
    { code: 'AAPL', name: '애플', icon: '🍎', price: '-', change: '-', isUp: true, sector: 'M7' },
    { code: 'GOOGL', name: '구글', icon: '💻', price: '-', change: '-', isUp: true, sector: 'M7' },
  ]);

  ngOnInit() {
    this.refreshQuotes();
  }

  refreshQuotes() {
    const symbols = this.stocks().map(s => s.code);
    this.stockService.getQuotes(symbols).subscribe({
      next: (quotes) => {
        this.stocks.update(currentStocks =>
          currentStocks.map(stock => {
            const quote = quotes.find(q => q.code === stock.code);
            if (quote) {
              return {
                ...stock,
                price: quote.price.toLocaleString(),
                change: `${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}%`,
                isUp: quote.isUp
              };
            }
            return stock;
          })
        );
      },
      error: (err) => console.error('Failed to fetch quotes:', err)
    });
  }

  toggleSidebar() {
    this.isCollapsed.update(value => !value);
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
