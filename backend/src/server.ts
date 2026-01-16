import express from 'express';
import cors from 'cors';
import YahooFinance from 'yahoo-finance2';
import dotenv from 'dotenv';
import { EngineService } from './services/engine.service.js';
import { OHLC } from './types/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const yahooFinance = new (YahooFinance as any)();
const engine = new EngineService();
const getStartDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().split('T')[0];
};

app.use(cors());

app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    console.log(`[Backend TS] Processing request for: ${symbol}`);

    try {
        const queryOptions = {
            period1: getStartDate(),
            interval: '1d'
        };
        // Use any assertion to bypass library overload issues
        const result = await (yahooFinance as any).chart(symbol, queryOptions);

        if (!result || !result.quotes) {
            throw new Error('No data returned from Yahoo Finance');
        }

        const formattedData: OHLC[] = result.quotes.map((quote: any) => ({
            time: Math.floor(new Date(quote.date).getTime() / 1000),
            open: quote.open!,
            high: quote.high!,
            low: quote.low!,
            close: quote.close!,
            volume: quote.volume || 0,  // 거래량 추가
        })).filter((d: any) => d.open !== null && d.close !== null);

        // 엔진 작동: 주가 데이터 분석 및 예측 생성
        const analysisResult = engine.analyze(formattedData);

        console.log(`[Backend TS] Analysis complete:`, {
            historyLength: analysisResult.history.length,
            scenarioLength: analysisResult.scenario.length,
            matchesCount: analysisResult.matches.length,
            firstScenarioValues: analysisResult.scenario.slice(0, 3)
        });

        res.json(analysisResult);
    } catch (error: any) {
        console.error(`[Backend TS] Error: `, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

// Phase 2: 다중 시간 프레임 분석 엔드포인트
app.get('/api/stock/:symbol/multi-timeframe', async (req, res) => {
    const { symbol } = req.params;
    console.log(`[Backend TS] Multi-timeframe analysis for: ${symbol}`);

    try {
        const queryOptions = {
            period1: getStartDate(),
            interval: '1d'
        };
        const result = await (yahooFinance as any).chart(symbol, queryOptions);

        if (!result || !result.quotes) {
            throw new Error('No data returned from Yahoo Finance');
        }

        const formattedData: OHLC[] = result.quotes.map((quote: any) => ({
            time: Math.floor(new Date(quote.date).getTime() / 1000),
            open: quote.open!,
            high: quote.high!,
            low: quote.low!,
            close: quote.close!,
            volume: quote.volume || 0,
        })).filter((d: any) => d.open !== null && d.close !== null);

        // 다중 시간 프레임 분석
        const analysisResult = engine.analyzeMultiTimeframe(formattedData);

        console.log(`[Backend TS] Multi-timeframe analysis complete:`, {
            shortMatches: analysisResult.short.matches.length,
            mediumMatches: analysisResult.medium.matches.length,
            longMatches: analysisResult.long.matches.length,
            confidence: analysisResult.confidence
        });

        res.json(analysisResult);
    } catch (error: any) {
        console.error(`[Backend TS] Multi-timeframe Error: `, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

// Phase 3: DTW + ATR 고급 분석 엔드포인트
app.get('/api/stock/:symbol/advanced', async (req, res) => {
    const { symbol } = req.params;
    const { useDTW, useATR, dtwWeight, atrPeriod } = req.query;

    console.log(`[Backend TS] Advanced analysis for: ${symbol}`, {
        useDTW: useDTW !== 'false',
        useATR: useATR !== 'false'
    });

    try {
        const queryOptions = {
            period1: getStartDate(),
            interval: '1d'
        };
        const result = await (yahooFinance as any).chart(symbol, queryOptions);

        if (!result || !result.quotes) {
            throw new Error('No data returned from Yahoo Finance');
        }

        const formattedData: OHLC[] = result.quotes.map((quote: any) => ({
            time: Math.floor(new Date(quote.date).getTime() / 1000),
            open: quote.open!,
            high: quote.high!,
            low: quote.low!,
            close: quote.close!,
            volume: quote.volume || 0,
        })).filter((d: any) => d.open !== null && d.close !== null);

        // 고급 분석 옵션
        const options = {
            useDTW: useDTW !== 'false',
            useATR: useATR !== 'false',
            dtwWeight: dtwWeight ? parseFloat(dtwWeight as string) : 0.2,
            atrPeriod: atrPeriod ? parseInt(atrPeriod as string) : 14
        };

        const startTime = Date.now();
        const analysisResult = engine.analyzeAdvanced(formattedData, 15, 10, options);
        const elapsed = Date.now() - startTime;

        // DTW 통계 로깅
        const avgDTW = analysisResult.matches.length > 0
            ? analysisResult.matches.reduce((sum, m) => sum + (m.dtwSimilarity || 0), 0) / analysisResult.matches.length
            : 0;
        const avgTimeWarp = analysisResult.matches.length > 0
            ? analysisResult.matches.reduce((sum, m) => sum + (m.timeWarp || 0), 0) / analysisResult.matches.length
            : 0;

        console.log(`[Backend TS] Advanced analysis complete:`, {
            matchesCount: analysisResult.matches.length,
            avgDTWSimilarity: avgDTW.toFixed(4),
            avgTimeWarp: avgTimeWarp.toFixed(2),
            elapsedMs: elapsed
        });

        res.json(analysisResult);
    } catch (error: any) {
        console.error(`[Backend TS] Advanced analysis Error: `, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

// Phase 4: 시세 정보 조회 엔드포인트 (사이드바용)
app.get('/api/stocks/quotes', async (req, res) => {
    const symbolsQuery = req.query.symbols as string;
    if (!symbolsQuery) {
        return res.status(400).json({ error: 'Symbols are required' });
    }

    const symbols = symbolsQuery.split(',');
    console.log(`[Backend TS] Fetching quotes for: ${symbols}`);

    try {
        // yahooFinance.quote는 단일 심볼 또는 배열을 받을 수 있음
        const quotes = await (yahooFinance as any).quote(symbols);

        // 배열이 아닌 경우 배열로 변환 (심볼이 하나인 경우 대응)
        const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

        const formattedQuotes = quoteArray.map((quote: any) => ({
            code: quote.symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChangePercent,
            previousClose: quote.regularMarketPreviousClose,
            isUp: quote.regularMarketChange >= 0
        }));

        res.json(formattedQuotes);
    } catch (error: any) {
        console.error(`[Backend TS] Quote Error: `, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Kiyoung Backend] Running at http://localhost:${PORT}`);
});
