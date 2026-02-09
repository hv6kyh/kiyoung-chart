import { test, expect, type Page } from '@playwright/test';

// ──────────────────────────────────────────────
// 헬퍼: 모달이 열릴 때까지 대기
// ──────────────────────────────────────────────
async function waitForModal(page: Page) {
  await expect(page.locator('.modal-overlay')).toBeVisible();
}

// ══════════════════════════════════════════════
// 1. 모달 UI 테스트 (Supabase 연결 불필요)
// ══════════════════════════════════════════════
test.describe('Auth Modal UI', () => {

  // --- 진입점 ---

  test('랜딩 페이지 헤더에서 로그인 모달이 열린다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');

    await waitForModal(page);
    // 로그인 탭이 활성화되어 있어야 한다
    await expect(page.locator('.tab-btn.active')).toHaveText('로그인');
  });

  test('랜딩 페이지 헤더에서 회원가입 모달이 열린다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("회원가입")');

    await waitForModal(page);
    await expect(page.locator('.tab-btn.active')).toHaveText('회원가입');
  });

  test('대시보드 헤더에서 로그인 모달이 열린다', async ({ page }) => {
    await page.goto('/chart');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("로그인")');

    await waitForModal(page);
    await expect(page.locator('.tab-btn.active')).toHaveText('로그인');
  });

  // --- 모달 닫기 ---

  test('오버레이 클릭 시 모달이 닫힌다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    // 오버레이의 왼쪽 상단(모달 바깥) 클릭
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('X 버튼 클릭 시 모달이 닫힌다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    await page.click('.close-btn');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('모달 내부 클릭은 모달을 닫지 않는다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    await page.click('.modal-content');
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  // --- 탭 전환 ---

  test('로그인 ↔ 회원가입 탭 전환이 동작한다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    // 로그인 → 회원가입
    await page.locator('.tab-btn:has-text("회원가입")').click();
    await expect(page.locator('.tab-btn.active')).toHaveText('회원가입');
    await expect(page.locator('.submit-btn')).toHaveText('가입하기');

    // 회원가입 → 로그인
    await page.locator('.tab-btn:has-text("로그인")').click();
    await expect(page.locator('.tab-btn.active')).toHaveText('로그인');
    await expect(page.locator('.submit-btn')).toHaveText('로그인');
  });

  test('탭 전환 시 입력값이 초기화된다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    // 이메일 입력
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');

    // 탭 전환
    await page.locator('.tab-btn:has-text("회원가입")').click();

    // 필드가 비어있어야 한다
    await expect(page.locator('input[type="email"]')).toHaveValue('');
    await expect(page.locator('input[type="password"]')).toHaveValue('');
  });

  // --- 폼 입력 ---

  test('이메일과 비밀번호 input에 값을 입력할 수 있다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    await page.locator('input[type="email"]').fill('user@test.com');
    await page.locator('input[type="password"]').fill('mypassword');

    await expect(page.locator('input[type="email"]')).toHaveValue('user@test.com');
    await expect(page.locator('input[type="password"]')).toHaveValue('mypassword');
  });
});

// ══════════════════════════════════════════════
// 2. 인증 플로우 테스트 (실제 Supabase 필요)
// ══════════════════════════════════════════════
test.describe('Auth Flow (Supabase)', () => {
  // 테스트용 계정 — 환경변수로 주입하거나 여기에 설정
  const TEST_EMAIL = process.env['TEST_EMAIL'] ?? '';
  const TEST_PASSWORD = process.env['TEST_PASSWORD'] ?? '';

  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'TEST_EMAIL / TEST_PASSWORD 환경변수가 필요합니다');

  test('잘못된 비밀번호로 로그인 시 에러 메시지가 표시된다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill('wrong-password-123');
    await page.click('.submit-btn');

    // 로딩 스피너 표시 확인
    await expect(page.locator('.spinner')).toBeVisible();

    // 에러 메시지 표시 확인
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.auth-error')).toContainText('이메일 또는 비밀번호');
  });

  test('올바른 계정으로 로그인하면 모달이 닫히고 헤더가 전환된다', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.click('.submit-btn');

    // 모달이 닫혀야 한다
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });

    // 헤더에 로그아웃 버튼이 표시되어야 한다
    await expect(page.locator('.btn-logout')).toBeVisible();
    // 로그인/회원가입 버튼은 사라져야 한다
    await expect(page.locator('button:has-text("로그인")')).not.toBeVisible();
  });

  test('로그인 후 새로고침해도 로그인 상태가 유지된다', async ({ page }) => {
    // 로그인
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.click('.submit-btn');
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });

    // 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 여전히 로그인 상태
    await expect(page.locator('.btn-logout')).toBeVisible({ timeout: 5000 });
  });

  test('로그아웃하면 헤더가 비로그인 상태로 복귀한다', async ({ page }) => {
    // 로그인
    await page.goto('/');
    await page.click('button:has-text("로그인")');
    await waitForModal(page);

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.click('.submit-btn');
    await expect(page.locator('.btn-logout')).toBeVisible({ timeout: 10000 });

    // 로그아웃
    await page.click('.btn-logout');

    // 로그인/회원가입 버튼이 다시 보여야 한다
    await expect(page.locator('button:has-text("로그인")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("회원가입")')).toBeVisible();
  });
});
