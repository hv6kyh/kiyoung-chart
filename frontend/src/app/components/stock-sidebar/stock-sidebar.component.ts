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
    { code: '005930.KS', name: '삼성전자', icon: '📱', price: '139,500', change: '+1.38%', isUp: true, sector: '반도체' },
    { code: '000660.KS', name: 'SK하이닉스', icon: '💾', price: '162,200', change: '-0.45%', isUp: false, sector: '반도체' },
    { code: '035420.KS', name: 'NAVER', icon: '🌐', price: '210,500', change: '+2.10%', isUp: true, sector: 'IT개발' },
    { code: '035720.KS', name: '카카오', icon: '💬', price: '54,200', change: '-1.23%', isUp: false, sector: 'IT개발' },
    { code: '051910.KS', name: 'LG화학', icon: '🧪', price: '458,000', change: '+0.88%', isUp: true, sector: '2차전지' },
    { code: '006400.KS', name: '삼성SDI', icon: '🔋', price: '382,500', change: '+3.45%', isUp: true, sector: '2차전지' },
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
