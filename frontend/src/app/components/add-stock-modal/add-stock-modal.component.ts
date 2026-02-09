import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatchlistService } from '../../services/watchlist.service';
import { UserStockInsert } from '../../types/watchlist.types';

@Component({
  selector: 'app-add-stock-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-stock-modal.component.html',
  styleUrls: ['./add-stock-modal.component.css'],
})
export class AddStockModalComponent {
  private watchlistService = inject(WatchlistService);

  closed = output<void>();

  market = signal<'KRX' | 'US'>('KRX');
  ticker = signal('');
  name = signal('');
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  private colors = [
    '#ed1c24',
    '#00a4ef',
    '#00a1e0',
    '#0052ff',
    '#ff6b35',
    '#7c3aed',
    '#059669',
    '#dc2626',
    '#d97706',
    '#2563eb',
  ];

  get placeholder(): string {
    return this.market() === 'KRX' ? '예: 005930 (삼성전자)' : '예: AAPL (Apple)';
  }

  get namePlaceholder(): string {
    return this.market() === 'KRX' ? '예: 삼성전자' : '예: Apple';
  }

  setMarket(market: 'KRX' | 'US') {
    this.market.set(market);
    this.ticker.set('');
    this.name.set('');
    this.errorMessage.set(null);
  }

  onTickerInput(event: Event) {
    this.ticker.set((event.target as HTMLInputElement).value.trim().toUpperCase());
  }

  onNameInput(event: Event) {
    this.name.set((event.target as HTMLInputElement).value.trim());
  }

  onClose() {
    this.closed.emit();
  }

  async onSubmit() {
    const ticker = this.ticker();
    const name = this.name();

    if (!ticker || !name) {
      this.errorMessage.set('종목 코드와 이름을 모두 입력해주세요.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const code = this.market() === 'KRX' ? `${ticker}.KS` : ticker;
    const shortName = name.substring(0, 2);
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];

    const stock: UserStockInsert = {
      code,
      name,
      short_name: shortName,
      market: this.market(),
      color,
    };

    const success = await this.watchlistService.addStock(stock);
    this.isSubmitting.set(false);

    if (success) {
      this.closed.emit();
    } else {
      this.errorMessage.set(this.watchlistService.error() ?? '종목 추가에 실패했습니다.');
    }
  }
}
