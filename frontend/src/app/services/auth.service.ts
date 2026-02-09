import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { User, Subscription } from '@supabase/supabase-js';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from './supabase.service';

export type AuthMode = 'login' | 'signup';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private analytics = inject(AnalyticsService);
  private supabase = inject(SupabaseService);

  // 기존 signal 인터페이스 (유지)
  private _isLoggedIn = signal(false);
  private _showAuthModal = signal(false);
  private _authMode = signal<AuthMode>('login');

  // 새 signal (에러, 로딩, 유저)
  private _authError = signal<string | null>(null);
  private _authLoading = signal(false);
  private _currentUser = signal<User | null>(null);

  // Public readonly (기존 — 유지)
  isLoggedIn = this._isLoggedIn.asReadonly();
  showAuthModal = this._showAuthModal.asReadonly();
  authMode = this._authMode.asReadonly();

  // Public readonly (새로 추가)
  authError = this._authError.asReadonly();
  authLoading = this._authLoading.asReadonly();
  currentUser = this._currentUser.asReadonly();

  private authSubscription: Subscription | null = null;

  constructor() {
    // Supabase 인증 상태 변경 리스너 — 모든 signal 업데이트의 단일 진입점
    const { data } = this.supabase.client.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      this._currentUser.set(user);
      this._isLoggedIn.set(!!user);

      if (user) {
        this.analytics.identify(user.id, { email: user.email });
      }

      if (event === 'SIGNED_IN') {
        this.analytics.capture('user_logged_in');
      } else if (event === 'SIGNED_OUT') {
        this.analytics.capture('user_logged_out');
        this.analytics.reset();
      }
    });
    this.authSubscription = data.subscription;

    this.restoreSession();
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  private async restoreSession() {
    const {
      data: { session },
    } = await this.supabase.client.auth.getSession();
    if (session?.user) {
      this._currentUser.set(session.user);
      this._isLoggedIn.set(true);
      this.analytics.identify(session.user.id, { email: session.user.email });
    }
  }

  // --- 모달 제어 (기존 API 유지) ---

  openModal(mode: AuthMode = 'login') {
    this._authMode.set(mode);
    this._authError.set(null);
    this._showAuthModal.set(true);
    this.analytics.capture('auth_modal_opened', { mode });
  }

  closeModal() {
    this._showAuthModal.set(false);
    this._authError.set(null);
    this._authLoading.set(false);
  }

  // --- 인증 메서드 ---

  async loginWithEmail(email: string, password: string): Promise<void> {
    this._authLoading.set(true);
    this._authError.set(null);

    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });

    this._authLoading.set(false);

    if (error) {
      this._authError.set(this.translateError(error.message));
      this.analytics.capture('auth_error', { mode: 'login', error: error.message });
      return;
    }

    this.closeModal();
  }

  async signup(email: string, password: string): Promise<void> {
    this._authLoading.set(true);
    this._authError.set(null);

    const { error } = await this.supabase.client.auth.signUp({ email, password });

    this._authLoading.set(false);

    if (error) {
      this._authError.set(this.translateError(error.message));
      this.analytics.capture('auth_error', { mode: 'signup', error: error.message });
      return;
    }

    this.closeModal();
  }

  async logout(): Promise<void> {
    await this.supabase.client.auth.signOut();
    // onAuthStateChange 핸들러가 signal 업데이트 + 애널리틱스 처리
  }

  async getAccessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await this.supabase.client.auth.getSession();
    return session?.access_token ?? null;
  }

  // --- 에러 번역 ---

  private translateError(message: string): string {
    const map: Record<string, string> = {
      'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
      'User already registered': '이미 가입된 이메일입니다.',
      'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
      'Unable to validate email address: invalid format': '올바른 이메일 형식을 입력해주세요.',
      'Signups not allowed for this instance': '현재 회원가입이 비활성화되어 있습니다.',
    };
    return map[message] || `오류가 발생했습니다: ${message}`;
  }
}
