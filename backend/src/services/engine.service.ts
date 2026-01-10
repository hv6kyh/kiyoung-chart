import { OHLC, PredictionMatch, PredictionResult } from '../types/index.js';

export class EngineService {
    // 피어슨 상관계수 (선형)
    private getPearsonCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }
        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return den === 0 ? 0 : num / den;
    }

    // 스피어만 상관계수 (비선형 추세)
    private getSpearmanCorrelation(x: number[], y: number[]): number {
        const ranksX = this.arrayToRanks(x);
        const ranksY = this.arrayToRanks(y);
        return this.getPearsonCorrelation(ranksX, ranksY);
    }

    private arrayToRanks(arr: number[]): number[] {
        const sorted = [...arr].map((val, i) => ({ val, i })).sort((a, b) => a.val - b.val);
        const ranks = new Array(arr.length);
        for (let i = 0; i < sorted.length; i++) {
            ranks[sorted[i].i] = i + 1;
        }
        return ranks;
    }

    public analyze(history: OHLC[], windowSize = 15, predictionSize = 10): PredictionResult {
        const targetWindow = history.slice(-windowSize);
        const targetPrices = targetWindow.map(d => d.close);
        const searchHistory = history.slice(0, -predictionSize);

        const threshold = 0.82;
        const matches: PredictionMatch[] = [];

        for (let i = 0; i < searchHistory.length - windowSize; i++) {
            const windowData = searchHistory.slice(i, i + windowSize);
            const windowPrices = windowData.map(d => d.close);

            const pCorr = this.getPearsonCorrelation(targetPrices, windowPrices);
            const sCorr = this.getSpearmanCorrelation(targetPrices, windowPrices);
            const hybridScore = (pCorr + sCorr) / 2;

            if (hybridScore >= threshold) {
                const future = history.slice(i + windowSize, i + windowSize + predictionSize).map(d => d.close);
                matches.push({
                    correlation: hybridScore,
                    future,
                    date: new Date(history[i].time * 1000).toLocaleDateString(),
                    windowData
                });
            }
        }

        const sortedMatches = matches.sort((a, b) => b.correlation - a.correlation).slice(0, 5);

        // 하이라이트: 시나리오 계산 (평균 흐름을 현재 가격 수준으로 정규화)
        const scenario = new Array(predictionSize).fill(0);
        const upper = new Array(predictionSize).fill(-Infinity);
        const lower = new Array(predictionSize).fill(Infinity);
        const confidence68Upper = new Array(predictionSize).fill(0);
        const confidence68Lower = new Array(predictionSize).fill(0);
        const confidence95Upper = new Array(predictionSize).fill(0);
        const confidence95Lower = new Array(predictionSize).fill(0);

        if (sortedMatches.length > 0) {
            const currentPrice = targetWindow[targetWindow.length - 1].close;

            for (let step = 0; step < predictionSize; step++) {
                const normalizedPrices: number[] = [];

                sortedMatches.forEach(m => {
                    // 과거 패턴의 시작 가격 대비 미래 가격의 비율을 계산
                    const historicalStartPrice = m.windowData[m.windowData.length - 1].close;
                    const historicalFuturePrice = m.future[step];
                    const priceRatio = historicalFuturePrice / historicalStartPrice;

                    // 현재 가격에 비율을 적용하여 정규화된 예측값 생성
                    const normalizedPrice = currentPrice * priceRatio;
                    normalizedPrices.push(normalizedPrice);

                    upper[step] = Math.max(upper[step], normalizedPrice);
                    lower[step] = Math.min(lower[step], normalizedPrice);
                });

                // 평균 계산
                const mean = normalizedPrices.reduce((a, b) => a + b, 0) / normalizedPrices.length;
                scenario[step] = mean;

                // 표준편차 계산
                const variance = normalizedPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / normalizedPrices.length;
                const stdDev = Math.sqrt(variance);

                // 68% 신뢰구간 (±1 표준편차)
                confidence68Upper[step] = mean + stdDev;
                confidence68Lower[step] = mean - stdDev;

                // 95% 신뢰구간 (±2 표준편차)
                confidence95Upper[step] = mean + 2 * stdDev;
                confidence95Lower[step] = mean - 2 * stdDev;
            }
        }

        return {
            history,
            matches: sortedMatches,
            scenario,
            confidenceUpper: upper,
            confidenceLower: lower,
            confidence68Upper,
            confidence68Lower,
            confidence95Upper,
            confidence95Lower
        };
    }
}
