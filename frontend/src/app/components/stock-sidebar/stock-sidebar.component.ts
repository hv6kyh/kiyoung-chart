import { Component, signal, output, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { StockService } from '../../services/stock.service';
import { AnalyticsService } from '../../services/analytics.service';
import { WatchlistService } from '../../services/watchlist.service';
import { AddStockModalComponent } from '../add-stock-modal/add-stock-modal.component';

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
  imports: [CommonModule, LucideAngularModule, AddStockModalComponent],
  templateUrl: './stock-sidebar.component.html',
  styleUrls: ['./stock-sidebar.component.css'],
})
export class StockSidebarComponent implements OnInit {
  isCollapsed = signal(false);
  isLoadingQuotes = signal(true);
  selectedStock = signal('000660.KS');
  showAddModal = signal(false);
  stockSelected = output<string>();

  public authService = inject(AuthService);
  public watchlistService = inject(WatchlistService);
  private stockService = inject(StockService);
  private analytics = inject(AnalyticsService);

  // 기본 종목 (항상 표시)
  defaultStocks = signal<StockSymbol[]>([
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

  // 사용자 종목 (가격 정보 포함)
  userStocksPrices = signal<StockSymbol[]>([]);

  constructor() {
    // 사용자 종목 변경 시 시세 새로고침
    effect(() => {
      const userStocks = this.watchlistService.userStocks();
      if (userStocks.length > 0) {
        this.refreshQuotes();
      } else {
        this.userStocksPrices.set([]);
      }
    });
  }

  ngOnInit() {
    this.refreshQuotes();
  }

  refreshQuotes() {
    const defaultCodes = this.defaultStocks().map((s) => s.code);
    const userCodes = this.watchlistService.userStocks().map((s) => s.code);
    const allCodes = [...defaultCodes, ...userCodes];

    this.stockService.getQuotes(allCodes).subscribe({
      next: (quotes) => {
        // 기본 종목 가격 업데이트
        this.defaultStocks.update((currentStocks) =>
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

        // 사용자 종목 가격 업데이트
        this.userStocksPrices.set(
          this.watchlistService.userStocks().map((row) => {
            const quote = quotes.find((q) => q.code === row.code);
            return {
              code: row.code,
              name: row.name,
              shortName: row.short_name,
              color: row.color,
              sector: row.sector,
              price: quote ? quote.price.toLocaleString() : '-',
              change: quote
                ? `${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}%`
                : '-',
              isUp: quote ? quote.isUp : false,
            };
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
      this.showAddModal.set(true);
    } else {
      this.authService.openModal('login');
    }
  }

  onAddModalClosed() {
    this.showAddModal.set(false);
  }

  async removeUserStock(event: Event, index: number) {
    event.stopPropagation();
    const row = this.watchlistService.userStocks()[index];
    if (row) {
      await this.watchlistService.removeStock(row.id);
    }
  }
}
