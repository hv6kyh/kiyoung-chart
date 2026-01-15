import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
export class StockSidebarComponent {
  isCollapsed = signal(false);
  selectedStock = signal('005930.KS');
  stockSelected = output<string>();

  constructor(public authService: AuthService, private router: Router) { }

  stocks = signal<StockSymbol[]>([
    { code: '005930.KS', name: '삼성전자', icon: '📱', price: '72,100', change: '+1.38%', isUp: true, sector: '반도체' },
    { code: '000660.KS', name: 'SK하이닉스', icon: '💾', price: '182,200', change: '-2.45%', isUp: false, sector: '반도체' },
    { code: 'TSLA', name: '테슬라', icon: '🚗', price: '258.80', change: '+4.20%', isUp: true, sector: 'AI' },
    { code: 'NVDA', name: '엔비디아', icon: '🎮', price: '128.50', change: '+1.15%', isUp: true, sector: 'AI' },
  ]);

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
