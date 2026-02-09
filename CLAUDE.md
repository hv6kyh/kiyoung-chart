# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jurinee Chart (주린이 차트) — 주식 투자 초보자(주린이 = 주식 + 어린이)를 위한 차트 분석 서비스. 실제 주가 데이터를 기반으로 과거 패턴과의 상관관계를 분석하여 예측 시나리오와 신뢰구간을 생성한다. Angular 21 프론트엔드와 Express 5 백엔드로 구성, 모두 TypeScript.

**중요: 모든 예측은 과거 패턴에 기반한 확률적 제안일 뿐이며, 실제 미래 주가를 반영하지 않는다. 사용자에게 노출되는 예측 결과에는 반드시 "투자 참고용이며 실제 결과를 보장하지 않는다"는 면책 안내를 포함해야 한다.**

## Commands

```bash
# Run both backend (port 3000) and frontend (port 4200) concurrently
npm run dev

# Build both backend and frontend for production
npm run build

# Backend only
cd backend
npm run dev              # tsx watch with hot reload
npm run build            # tsc compilation
npm run start            # node dist/server.js
npm run test             # Jest (requires --experimental-vm-modules, handled by script)
npm run test:watch       # Jest watch mode
npm run test:coverage    # Jest coverage report

# Frontend only
cd frontend
ng serve                 # Dev server on port 4200
ng build                 # Production build
ng test                  # Vitest
npx playwright test      # E2E tests
```

## Architecture

### Backend (`backend/`)

Express 5 server fetching stock data from Yahoo Finance and running pattern analysis.

**API Endpoints:**
- `GET /api/stock/:symbol` — Basic analysis: last 15 days vs 5-year history, Pearson+Spearman correlation, returns top 5 matches with confidence intervals
- `GET /api/stock/:symbol/multi-timeframe` — Short (7d), medium (15d), long (30d) analysis with combined confidence grade (A/B/C)
- `GET /api/stock/:symbol/advanced?useDTW&useATR&dtwWeight&atrPeriod` — DTW pattern matching + ATR volatility normalization
- `GET /api/stocks/quotes?symbols=AAPL,MSFT` — Real-time price quotes for sidebar ticker

**Core engine** (`src/services/engine.service.ts`): Hybrid scoring with Pearson correlation, Spearman rank correlation, volume correlation, Dynamic Time Warping (DTW), and ATR normalization. Matches with correlation >= 0.82 generate prediction scenarios normalized to current price with 68%/95% confidence intervals.

**Key types** (`src/types/index.ts`): `OHLC`, `PredictionMatch`, `PredictionResult`, `MultiTimeframeResult`, `AdvancedAnalysisOptions`

**Auth middleware** (`src/middleware/auth.middleware.ts`): Supabase JWT를 `jsonwebtoken`으로 HS256 검증. `requireAuth`(인증 필수, 401 응답)와 `optionalAuth`(토큰 있으면 검증, 없어도 통과) 두 가지 미들웨어 제공. 현재 기존 엔드포인트는 모두 public이며, 향후 보호가 필요한 라우트에 적용.

Uses ESM modules throughout (`"type": "module"`). TypeScript target: ESNext.

### Frontend (`frontend/`)

Angular 21 with standalone components, lightweight-charts for candlestick visualization, lucide-angular for icons.

**Routing** (`src/app/app.routes.ts`):
- `/` — Landing page
- `/chart` — Main dashboard with chart, analysis sidebar, and stock ticker
- `/stock-qna` — Q&A page
- `/stocks/add` — Auth-protected placeholder

**Service layer:**
- `StockService` — HTTP calls to backend API
- `AuthService` — Supabase Auth 기반 인증 (이메일/비밀번호 로그인, 회원가입, 세션 관리). Signal 기반 상태 관리 (`isLoggedIn`, `currentUser`, `authError`, `authLoading`). `onAuthStateChange` 리스너가 단일 진입점으로 모든 인증 상태를 동기화한다.
- `SupabaseService` — `@supabase/supabase-js` 클라이언트 싱글턴 래퍼. `autoRefreshToken`, `persistSession` 활성화.
- `UIStateService` — Shared UI state via RxJS
- `AnalyticsService` — PostHog SDK 래퍼 (아래 Analytics 섹션 참조)

**Auth modal:** `app.ts` 루트에서 렌더링되어 랜딩 페이지, 대시보드 등 모든 경로에서 접근 가능. `AuthService.showAuthModal()` signal로 표시/숨김을 제어한다.

**Environment config:** API base URL, PostHog 키, Supabase URL/anonKey가 `src/environments/environment.ts` (dev) 및 `environment.prod.ts` (prod)에 설정되어 있다. dev에서는 PostHog `apiKey`가 빈 문자열이면 초기화를 건너뛴다.

**Prettier config** is embedded in `package.json`: printWidth 100, singleQuote, Angular HTML parser.

### Analytics (PostHog)

`posthog-js`를 통해 사용자 행동을 추적한다. `AnalyticsService` (`src/app/services/analytics.service.ts`)가 유일한 진입점이며, 앱 루트(`app.ts`)에서 초기화된다.

**자동 수집 (Autocapture):** 모든 클릭, 페이지뷰, 체류 시간, 세션, 유니크 유저, 기기/브라우저 정보가 코드 없이 자동 수집된다.

**커스텀 이벤트:**

| 이벤트명 | 위치 | 프로퍼티 |
|----------|------|----------|
| `stock_selected` | DashboardComponent | `{ symbol }` |
| `analysis_mode_changed` | DashboardComponent | `{ mode, symbol }` |
| `analysis_loaded` | DashboardComponent | `{ symbol, mode, matchCount }` |
| `analysis_error` | DashboardComponent | `{ symbol, mode, error }` |
| `sidebar_stock_clicked` | StockSidebarComponent | `{ code }` |
| `add_stock_clicked` | StockSidebarComponent | `{ isLoggedIn }` |
| `match_proof_opened` | SidebarComponent | `{ correlation, date, rank }` |
| `landing_section_viewed` | LandingComponent | `{ section }` |
| `auth_modal_opened` | AuthService | `{ mode }` |
| `user_signed_up` | AuthService | `{ email }` |
| `user_logged_in` | AuthService | — |
| `user_logged_out` | AuthService | — |
| `auth_error` | AuthService | `{ mode, error }` |

**새 이벤트 추가 시:** 컴포넌트에 `AnalyticsService`를 주입하고 `this.analytics.capture('event_name', { ... })`를 호출한다. 이벤트명은 `snake_case`, 프로퍼티 키도 `snake_case`로 통일한다.

### Testing

**Backend (Jest):**
- 테스트 파일: `backend/tests/*.test.ts`
- 실행: `cd backend && npm test`

**Frontend 유닛 테스트 (Vitest):**
- Angular `@angular/build:unit-test` 빌더 사용, `jsdom` 환경
- 테스트 파일: `src/**/*.spec.ts`
- 실행: `cd frontend && ng test` (watch 모드) / `ng test --no-watch` (CI)
- `SupabaseService`, `AnalyticsService`를 mock하여 네트워크 없이 격리 테스트

**Frontend E2E 테스트 (Playwright):**
- 테스트 파일: `frontend/tests/*.spec.ts`
- 실행: `cd frontend && npx playwright test`
- `http://localhost:4200` 기반 — dev 서버가 실행 중이어야 함
- Supabase 인증 플로우 테스트는 `TEST_EMAIL`, `TEST_PASSWORD` 환경변수 필요 (없으면 자동 skip)

### Docker

Both services have multi-stage Dockerfiles. Frontend builds to Nginx with gzip and SPA fallback routing (`nginx.conf`). Backend runs Node 24-alpine.
