import express from 'express';
import cors from 'cors';
import YahooFinance from 'yahoo-finance2';
import { EngineService } from './services/engine.service.js';
import { OHLC } from './types/index.js';

const app = express();
const PORT = 3000;
const yahooFinance = new (YahooFinance as any)();
const engine = new EngineService();

app.use(cors());

app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    console.log(`[Backend TS] Processing request for: ${symbol}`);

    try {
        const queryOptions = {
            period1: '2024-01-01',
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
        })).filter((d: any) => d.open !== null && d.close !== null);

        // 엔진 작동: 주가 데이터 분석 및 예측 생성
        const analysisResult = engine.analyze(formattedData);

        res.json(analysisResult);
    } catch (error: any) {
        console.error(`[Backend TS] Error: `, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Kiyoung Backend] Running at http://localhost:${PORT}`);
});
