# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (with hot reload)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm run start
```

## Architecture

This is a stock analysis backend using Express 5 and Yahoo Finance API.

### Core Flow
1. Client requests `/api/stock/:symbol` with a stock ticker
2. Server fetches historical OHLC data from Yahoo Finance (daily data since 2024-01-01)
3. `EngineService.analyze()` finds historical patterns that correlate with recent price movements
4. Returns prediction scenarios with confidence intervals based on similar past patterns

### Pattern Matching Engine (`src/services/engine.service.ts`)
- Uses hybrid correlation scoring (Pearson + Spearman average)
- Compares the last 15 trading days against all historical windows
- Matches with correlation >= 0.82 are used for prediction
- Top 5 matches inform the prediction scenario
- Predictions are normalized to current price level using price ratios
- Generates 68% and 95% confidence intervals based on standard deviation

### Key Types (`src/types/index.ts`)
- `OHLC`: Standard candlestick data (time, open, high, low, close)
- `PredictionMatch`: A historical pattern match with its future price movement
- `PredictionResult`: Complete analysis output including history, matches, and scenario arrays

### Notes
- Uses ESM modules (`"type": "module"` in package.json)
- TypeScript compiled to ESNext with Node module resolution
- Server runs on port 3000
