import { Injectable, inject, signal, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { UserStockRow, UserStockInsert } from '../types/watchlist.types';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private analytics = inject(AnalyticsService);

  private _userStocks = signal<UserStockRow[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  readonly userStocks = this._userStocks.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    // 로그인 상태 변경 시 자동으로 종목 로드/클리어
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.loadUserStocks();
      } else {
        this._userStocks.set([]);
      }
    });
  }

  async loadUserStocks(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    const { data, error } = await this.supabase.client
      .from('user_stocks')
      .select('*')
      .order('created_at', { ascending: true });

    this._isLoading.set(false);

    if (error) {
      this._error.set(error.message);
      return;
    }

    this._userStocks.set((data as UserStockRow[]) ?? []);
  }

  async addStock(stock: UserStockInsert): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user) return false;

    this._error.set(null);

    const { error } = await this.supabase.client.from('user_stocks').insert({
      user_id: user.id,
      code: stock.code,
      name: stock.name,
      short_name: stock.short_name,
      market: stock.market,
      color: stock.color ?? '#6b7280',
      sector: stock.sector ?? '',
    });

    if (error) {
      if (error.code === '23505') {
        this._error.set('이미 추가된 종목입니다.');
      } else {
        this._error.set(error.message);
      }
      return false;
    }

    this.analytics.capture('watchlist_stock_added', {
      code: stock.code,
      market: stock.market,
    });

    await this.loadUserStocks();
    return true;
  }

  async removeStock(id: string): Promise<boolean> {
    const stock = this._userStocks().find((s) => s.id === id);

    const { error } = await this.supabase.client.from('user_stocks').delete().eq('id', id);

    if (error) {
      this._error.set(error.message);
      return false;
    }

    this.analytics.capture('watchlist_stock_removed', {
      code: stock?.code,
      market: stock?.market,
    });

    // 로컬 상태 즉시 제거 (낙관적 업데이트)
    this._userStocks.update((stocks) => stocks.filter((s) => s.id !== id));
    return true;
  }
}
