import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { AnalyticsService } from './analytics.service';

// --- Mock 팩토리 ---

function createMockSupabaseService() {
  const listeners: Array<(event: string, session: any) => void> = [];

  return {
    client: {
      auth: {
        onAuthStateChange: vi.fn((cb: any) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    // 테스트에서 onAuthStateChange 콜백을 수동 트리거하기 위한 헬퍼
    _fireAuthEvent(event: string, session: any) {
      listeners.forEach((cb) => cb(event, session));
    },
  };
}

function createMockAnalyticsService() {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  };
}

// --- 테스트 ---

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabase: ReturnType<typeof createMockSupabaseService>;
  let mockAnalytics: ReturnType<typeof createMockAnalyticsService>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseService();
    mockAnalytics = createMockAnalyticsService();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AnalyticsService, useValue: mockAnalytics },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  // --- 초기 상태 ---

  describe('초기 상태', () => {
    it('isLoggedIn은 false여야 한다', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('showAuthModal은 false여야 한다', () => {
      expect(service.showAuthModal()).toBe(false);
    });

    it('authMode 기본값은 login이어야 한다', () => {
      expect(service.authMode()).toBe('login');
    });

    it('authError는 null이어야 한다', () => {
      expect(service.authError()).toBeNull();
    });

    it('authLoading은 false여야 한다', () => {
      expect(service.authLoading()).toBe(false);
    });

    it('currentUser는 null이어야 한다', () => {
      expect(service.currentUser()).toBeNull();
    });
  });

  // --- 모달 제어 ---

  describe('openModal / closeModal', () => {
    it('openModal은 모달을 표시하고 모드를 설정해야 한다', () => {
      service.openModal('signup');

      expect(service.showAuthModal()).toBe(true);
      expect(service.authMode()).toBe('signup');
      expect(service.authError()).toBeNull();
    });

    it('openModal은 auth_modal_opened 이벤트를 캡처해야 한다', () => {
      service.openModal('login');

      expect(mockAnalytics.capture).toHaveBeenCalledWith('auth_modal_opened', { mode: 'login' });
    });

    it('closeModal은 모달을 숨기고 에러/로딩을 초기화해야 한다', () => {
      service.openModal('login');
      service.closeModal();

      expect(service.showAuthModal()).toBe(false);
      expect(service.authError()).toBeNull();
      expect(service.authLoading()).toBe(false);
    });
  });

  // --- 로그인 ---

  describe('loginWithEmail', () => {
    it('성공 시 모달을 닫아야 한다', async () => {
      service.openModal('login');

      await service.loginWithEmail('test@example.com', 'password123');

      expect(mockSupabase.client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(service.showAuthModal()).toBe(false);
      expect(service.authLoading()).toBe(false);
    });

    it('실패 시 에러 메시지를 설정해야 한다', async () => {
      mockSupabase.client.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: 'Invalid login credentials' },
      });

      await service.loginWithEmail('test@example.com', 'wrong');

      expect(service.authError()).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
      expect(service.authLoading()).toBe(false);
    });

    it('실패 시 auth_error 이벤트를 캡처해야 한다', async () => {
      mockSupabase.client.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: 'Invalid login credentials' },
      });

      await service.loginWithEmail('test@example.com', 'wrong');

      expect(mockAnalytics.capture).toHaveBeenCalledWith('auth_error', {
        mode: 'login',
        error: 'Invalid login credentials',
      });
    });
  });

  // --- 회원가입 ---

  describe('signup', () => {
    it('성공 시 user_signed_up 이벤트를 캡처하고 모달을 닫아야 한다', async () => {
      service.openModal('signup');

      await service.signup('new@example.com', 'password123');

      expect(mockSupabase.client.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
      expect(mockAnalytics.capture).toHaveBeenCalledWith('user_signed_up', {
        email: 'new@example.com',
      });
      expect(service.showAuthModal()).toBe(false);
    });

    it('실패 시 에러 메시지를 설정하고 user_signed_up은 캡처하지 않아야 한다', async () => {
      mockSupabase.client.auth.signUp.mockResolvedValueOnce({
        data: {},
        error: { message: 'User already registered' },
      });

      await service.signup('existing@example.com', 'password123');

      expect(service.authError()).toBe('이미 가입된 이메일입니다.');
      expect(mockAnalytics.capture).not.toHaveBeenCalledWith(
        'user_signed_up',
        expect.anything(),
      );
    });
  });

  // --- onAuthStateChange ---

  describe('onAuthStateChange', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser };

    it('SIGNED_IN 시 isLoggedIn=true, identify, user_logged_in 이벤트', () => {
      mockSupabase._fireAuthEvent('SIGNED_IN', mockSession);

      expect(service.isLoggedIn()).toBe(true);
      expect(service.currentUser()).toEqual(mockUser);
      expect(mockAnalytics.identify).toHaveBeenCalledWith('user-123', {
        email: 'test@example.com',
      });
      expect(mockAnalytics.capture).toHaveBeenCalledWith('user_logged_in');
    });

    it('SIGNED_OUT 시 isLoggedIn=false, user_logged_out, reset', () => {
      // 먼저 로그인 상태로 만든 뒤 로그아웃
      mockSupabase._fireAuthEvent('SIGNED_IN', mockSession);
      mockAnalytics.capture.mockClear();

      mockSupabase._fireAuthEvent('SIGNED_OUT', null);

      expect(service.isLoggedIn()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(mockAnalytics.capture).toHaveBeenCalledWith('user_logged_out');
      expect(mockAnalytics.reset).toHaveBeenCalled();
    });
  });

  // --- 에러 번역 ---

  describe('translateError', () => {
    const errorCases = [
      ['Invalid login credentials', '이메일 또는 비밀번호가 올바르지 않습니다.'],
      ['Email not confirmed', '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.'],
      ['User already registered', '이미 가입된 이메일입니다.'],
      ['Password should be at least 6 characters', '비밀번호는 최소 6자 이상이어야 합니다.'],
      [
        'Unable to validate email address: invalid format',
        '올바른 이메일 형식을 입력해주세요.',
      ],
      ['Signups not allowed for this instance', '현재 회원가입이 비활성화되어 있습니다.'],
    ] as const;

    it.each(errorCases)('"%s" → 한국어 번역', async (supabaseError, expectedKorean) => {
      mockSupabase.client.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: supabaseError },
      });

      await service.loginWithEmail('x@x.com', 'x');

      expect(service.authError()).toBe(expectedKorean);
    });

    it('알 수 없는 에러는 원문 포함 메시지로 표시', async () => {
      mockSupabase.client.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: 'Some unknown error' },
      });

      await service.loginWithEmail('x@x.com', 'x');

      expect(service.authError()).toBe('오류가 발생했습니다: Some unknown error');
    });
  });

  // --- 로그아웃 ---

  describe('logout', () => {
    it('Supabase signOut을 호출해야 한다', async () => {
      await service.logout();

      expect(mockSupabase.client.auth.signOut).toHaveBeenCalled();
    });
  });

  // --- getAccessToken ---

  describe('getAccessToken', () => {
    it('세션이 있으면 토큰을 반환해야 한다', async () => {
      mockSupabase.client.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'jwt-token-123' } },
      });

      const token = await service.getAccessToken();

      expect(token).toBe('jwt-token-123');
    });

    it('세션이 없으면 null을 반환해야 한다', async () => {
      mockSupabase.client.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      });

      const token = await service.getAccessToken();

      expect(token).toBeNull();
    });
  });
});
