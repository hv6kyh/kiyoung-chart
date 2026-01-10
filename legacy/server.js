import express from 'express';
import cors from 'cors';
import YahooFinance from 'yahoo-finance2';

const app = express();
const PORT = 3000;
const yahooFinance = new YahooFinance();

app.use(cors());

// 주가 데이터 API 엔드포인트
app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    console.log(`[Proxy] Fetching data for: ${symbol} `);

    try {
        // yahoo-finance2 v2+ 에서는 보통 default export가 이미 인스턴스화 되어 있거나
        // 특정 메서드를 통해 접근합니다. 여기서는 .chart를 사용했습니다.
        const queryOptions = { period1: '2024-01-01', interval: '1d' };
        const result = await yahooFinance.chart(symbol, queryOptions);

        if (!result || !result.quotes) {
            throw new Error('No data returned from Yahoo Finance');
        }

        // Lightweight Charts OHLC 형식으로 변환
        const formattedData = result.quotes.map(quote => ({
            time: Math.floor(new Date(quote.date).getTime() / 1000),
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
        })).filter(d => d.open !== null && d.close !== null);

        res.json(formattedData);
    } catch (error) {
        console.error(`[Proxy] Error fetching ${symbol}: `, error);
        res.status(500).json({ error: 'Failed to fetch stock data', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Proxy Server] Running at http://localhost:${PORT}`);
});
