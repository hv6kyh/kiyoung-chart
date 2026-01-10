import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StockSymbol {
  code: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-stock-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-sidebar.component.html',
  styleUrls: ['./stock-sidebar.component.css']
})
export class StockSidebarComponent {
  isCollapsed = signal(false);
  selectedStock = signal('005930.KS');
  stockSelected = output<string>();

  stocks = signal<StockSymbol[]>([
    { code: '005930.KS', name: '삼성전자', icon: '📱' },
    { code: '000660.KS', name: 'SK하이닉스', icon: '💾' },
    { code: '035420.KS', name: 'NAVER', icon: '🌐' },
    { code: '035720.KS', name: '카카오', icon: '💬' },
    { code: '051910.KS', name: 'LG화학', icon: '🧪' },
    { code: '006400.KS', name: '삼성SDI', icon: '🔋' },
  ]);

  toggleSidebar() {
    this.isCollapsed.update(value => !value);
  }

  selectStock(code: string) {
    this.selectedStock.set(code);
    this.stockSelected.emit(code);
  }
}
