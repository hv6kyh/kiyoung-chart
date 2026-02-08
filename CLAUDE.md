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
- `AuthService` — Mock authentication
- `UIStateService` — Shared UI state via RxJS

**Environment config:** API base URL set in `src/environments/environment.ts` (dev: `localhost:3000/api`) and `environment.prod.ts` (AWS App Runner).

**Prettier config** is embedded in `package.json`: printWidth 100, singleQuote, Angular HTML parser.

### Docker

Both services have multi-stage Dockerfiles. Frontend builds to Nginx with gzip and SPA fallback routing (`nginx.conf`). Backend runs Node 24-alpine.
