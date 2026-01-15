import { OHLC, PredictionMatch, PredictionResult, TimeframeAnalysis, MultiTimeframeResult, AdvancedAnalysisOptions } from '../types/index.js';
import DynamicTimeWarping from 'dynamic-time-warping';

export class EngineService {
    // DTW 캐시 (성능 최적화)
    private dtwCache = new Map<string, { similarity: number; distance: number; path: number[][] }>();
    // ATR 캐시
    private atrCache = new Map<string, number>();
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

    // 거래량 상관계수 계산 (Pearson + Spearman 하이브리드)
    private getVolumeCorrelation(x: OHLC[], y: OHLC[]): number {
        const volumesX = x.map(d => d.volume);
        const volumesY = y.map(d => d.volume);

        // volume이 0인 데이터가 있으면 상관계수 계산에서 제외
        const validIndices = volumesX.map((v, i) => v > 0 && volumesY[i] > 0 ? i : -1).filter(i => i >= 0);
        if (validIndices.length < 5) return 0; // 유효 데이터가 5개 미만이면 0 반환

        const filteredX = validIndices.map(i => volumesX[i]);
        const filteredY = validIndices.map(i => volumesY[i]);

        const pCorr = this.getPearsonCorrelation(filteredX, filteredY);
        const sCorr = this.getSpearmanCorrelation(filteredX, filteredY);

        return (pCorr + sCorr) / 2;
    }

    // Phase 3: DTW 유사도 계산 (0~1 정규화)
    private getDTWSimilarity(x: number[], y: number[]): { similarity: number; distance: number; path: number[][] } {
        // 캐시 키 생성
        const key = `${x.slice(0, 5).join(',')}_${y.slice(0, 5).join(',')}_${x.length}`;

        if (this.dtwCache.has(key)) {
            return this.dtwCache.get(key)!;
        }

        // 거리 함수 정의
        const distFunc = (a: number, b: number) => Math.abs(a - b);

        // DTW 계산
        const dtw = new DynamicTimeWarping(x, y, distFunc);
        const distance = dtw.getDistance();
        const path = dtw.getPath();

        // 거리를 유사도로 변환 (0~1 범위)
        const maxVal = Math.max(...x, ...y);
        const minVal = Math.min(...x, ...y);
        const range = maxVal - minVal || 1;
        const normalizedDistance = distance / (x.length * range);
        const similarity = 1 / (1 + normalizedDistance);

        const result = { similarity, distance, path };

        // 캐시 저장 (최대 1000개)
        this.dtwCache.set(key, result);
        if (this.dtwCache.size > 1000) {
            const firstKey = this.dtwCache.keys().next().value;
            if (firstKey) this.dtwCache.delete(firstKey);
        }

        return result;
    }

    // Phase 3: DTW 경로에서 시간 왜곡 정도 계산
    private calculateTimeWarp(path: number[][]): number {
        if (!path || path.length === 0) return 0;

        let totalWarp = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i][0] - path[i - 1][0];
            const dy = path[i][1] - path[i - 1][1];
            // 대각선(1:1 매칭)에서 벗어난 정도
            totalWarp += Math.abs(dx - dy);
        }

        return totalWarp / path.length;
    }

    // Phase 3: ATR (Average True Range) 계산
    private calculateATR(ohlc: OHLC[], period = 14): number {
        if (ohlc.length < period + 1) {
            // 데이터가 부족하면 간단한 변동성 계산
            const prices = ohlc.map(d => d.close);
            const range = Math.max(...prices) - Math.min(...prices);
            return range / ohlc.length || 1;
        }

        // 캐시 확인
        const lastTime = ohlc[ohlc.length - 1].time;
        const cacheKey = `${lastTime}_${period}`;
        if (this.atrCache.has(cacheKey)) {
            return this.atrCache.get(cacheKey)!;
        }

        const trueRanges = ohlc.map((d, i) => {
            if (i === 0) {
                return d.high - d.low;
            }
            const prevClose = ohlc[i - 1].close;
            return Math.max(
                d.high - d.low,
                Math.abs(d.high - prevClose),
                Math.abs(d.low - prevClose)
            );
        });

        // 최근 period 기간의 TR 평균
        const recentTRs = trueRanges.slice(-period);
        const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / period;

        // 캐시 저장
        this.atrCache.set(cacheKey, atr);

        // ATR이 0에 가까우면 최소값 반환
        return Math.max(atr, 0.01);
    }

    // Phase 3: ATR로 가격 데이터 정규화
    private normalizeWithATR(ohlc: OHLC[], period = 14): number[] {
        const atr = this.calculateATR(ohlc, period);
        return ohlc.map(d => d.close / atr);
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

            // 가격 상관계수 (Pearson + Spearman)
            const pCorr = this.getPearsonCorrelation(targetPrices, windowPrices);
            const sCorr = this.getSpearmanCorrelation(targetPrices, windowPrices);
            const priceScore = (pCorr + sCorr) / 2;

            // 거래량 상관계수
            const volumeScore = this.getVolumeCorrelation(targetWindow, windowData);

            // 최종 점수: 가격(70%) + 거래량(30%)
            const finalScore = priceScore * 0.7 + volumeScore * 0.3;

            // 거래량도 최소 0.6 이상이어야 함 (단, volumeScore가 0이면 거래량 데이터 부족으로 패스)
            const volumeCondition = volumeScore === 0 || volumeScore >= 0.6;

            if (finalScore >= threshold && volumeCondition) {
                const future = history.slice(i + windowSize, i + windowSize + predictionSize).map(d => d.close);
                matches.push({
                    correlation: finalScore,
                    priceCorrelation: priceScore,
                    volumeCorrelation: volumeScore,
                    future,
                    date: new Date(history[i].time * 1000).toLocaleDateString(),
                    windowData
                });
            }
        }

        const sortedMatches = matches
            .sort((a, b) => b.correlation - a.correlation)
            .slice(0, 10)  // 5개 → 10개로 확장 (확률 구름 시각화용)
            .map((match, index) => ({
                ...match,
                weight: Math.pow(match.correlation, 3),  // 상관계수의 3제곱
                opacity: 1 - (index * 0.1),  // 투명도: 1위=1.0, 10위=0.1
                rank: index + 1              // 순위: 1~10
            }));

        // 상위 5개만 평균 계산에 사용 (시각화는 10개 모두 사용)
        const top5Matches = sortedMatches.slice(0, 5);
        const totalWeight = top5Matches.reduce((sum, m) => sum + (m.weight || 0), 0);

        // 하이라이트: 시나리오 계산 (가중 평균으로 현재 가격 수준으로 정규화)
        const scenario = new Array(predictionSize).fill(0);
        const upper = new Array(predictionSize).fill(-Infinity);
        const lower = new Array(predictionSize).fill(Infinity);
        const confidence68Upper = new Array(predictionSize).fill(0);
        const confidence68Lower = new Array(predictionSize).fill(0);
        const confidence95Upper = new Array(predictionSize).fill(0);
        const confidence95Lower = new Array(predictionSize).fill(0);

        if (top5Matches.length > 0) {
            const currentPrice = targetWindow[targetWindow.length - 1].close;

            for (let step = 0; step < predictionSize; step++) {
                const normalizedPrices: number[] = [];
                const weights: number[] = [];

                top5Matches.forEach(m => {
                    // 과거 패턴의 시작 가격 대비 미래 가격의 비율을 계산
                    const historicalStartPrice = m.windowData[m.windowData.length - 1].close;
                    const historicalFuturePrice = m.future[step];
                    const priceRatio = historicalFuturePrice / historicalStartPrice;

                    // 현재 가격에 비율을 적용하여 정규화된 예측값 생성
                    const normalizedPrice = currentPrice * priceRatio;
                    normalizedPrices.push(normalizedPrice);
                    weights.push(m.weight || 1);  // 가중치 저장

                    upper[step] = Math.max(upper[step], normalizedPrice);
                    lower[step] = Math.min(lower[step], normalizedPrice);
                });

                // 가중 평균 계산
                const weightedSum = normalizedPrices.reduce((sum, price, i) =>
                    sum + price * (weights[i] / totalWeight), 0
                );
                scenario[step] = weightedSum;

                // 표준편차 계산 (가중 평균 기준)
                const mean = weightedSum;
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

    // Phase 2: 다중 시간 프레임 분석
    public analyzeMultiTimeframe(history: OHLC[]): MultiTimeframeResult {
        // 단기: 7일 패턴 → 5일 예측
        const shortAnalysis = this.analyze(history, 7, 5);

        // 중기: 15일 패턴 → 10일 예측 (기존 방식)
        const mediumAnalysis = this.analyze(history, 15, 10);

        // 장기: 30일 패턴 → 15일 예측
        const longAnalysis = this.analyze(history, 30, 15);

        // 신뢰도 등급 계산
        const confidence = this.calculateConfidenceGrade(
            shortAnalysis,
            mediumAnalysis,
            longAnalysis
        );

        // 가중 평균 결과 (중기 중심)
        const combined = this.combineTimeframes(
            shortAnalysis,
            mediumAnalysis,
            longAnalysis
        );

        return {
            short: this.toTimeframeAnalysis(shortAnalysis, 7, 5),
            medium: this.toTimeframeAnalysis(mediumAnalysis, 15, 10),
            long: this.toTimeframeAnalysis(longAnalysis, 30, 15),
            combined,
            confidence
        };
    }

    // 신뢰도 등급 계산 (A/B/C)
    private calculateConfidenceGrade(
        short: PredictionResult,
        medium: PredictionResult,
        long: PredictionResult
    ): 'A' | 'B' | 'C' {
        // 각 시간 프레임에서 유효 매칭이 있는지 확인 (상관계수 0.8 이상)
        const shortValid = short.matches.length > 0 && short.matches[0].correlation >= 0.8;
        const mediumValid = medium.matches.length > 0 && medium.matches[0].correlation >= 0.8;
        const longValid = long.matches.length > 0 && long.matches[0].correlation >= 0.8;

        const validCount = [shortValid, mediumValid, longValid].filter(Boolean).length;

        if (validCount === 3) return 'A';  // 3개 시간대 모두 유효
        if (validCount === 2) return 'B';  // 2개 시간대 유효
        return 'C';                        // 1개 이하
    }

    // 시간 프레임 가중 평균
    private combineTimeframes(
        short: PredictionResult,
        medium: PredictionResult,
        long: PredictionResult
    ): PredictionResult {
        // 가중치: 단기 20%, 중기 50%, 장기 30%
        const weights = { short: 0.2, medium: 0.5, long: 0.3 };

        // 중기 예측 길이를 기준으로 사용 (10일)
        const predictionSize = medium.scenario.length;
        const scenario = new Array(predictionSize).fill(0);
        const confidence68Upper = new Array(predictionSize).fill(0);
        const confidence68Lower = new Array(predictionSize).fill(0);
        const confidence95Upper = new Array(predictionSize).fill(0);
        const confidence95Lower = new Array(predictionSize).fill(0);

        for (let step = 0; step < predictionSize; step++) {
            // 단기는 5일까지만 데이터 있음
            const shortValue = step < short.scenario.length ? short.scenario[step] : medium.scenario[step];
            const shortUpper68 = step < short.confidence68Upper.length ? short.confidence68Upper[step] : medium.confidence68Upper[step];
            const shortLower68 = step < short.confidence68Lower.length ? short.confidence68Lower[step] : medium.confidence68Lower[step];

            // 장기는 15일까지 데이터 있음
            const longValue = step < long.scenario.length ? long.scenario[step] : medium.scenario[step];
            const longUpper68 = step < long.confidence68Upper.length ? long.confidence68Upper[step] : medium.confidence68Upper[step];
            const longLower68 = step < long.confidence68Lower.length ? long.confidence68Lower[step] : medium.confidence68Lower[step];

            // 가중 평균
            scenario[step] =
                shortValue * weights.short +
                medium.scenario[step] * weights.medium +
                longValue * weights.long;

            confidence68Upper[step] =
                shortUpper68 * weights.short +
                medium.confidence68Upper[step] * weights.medium +
                longUpper68 * weights.long;

            confidence68Lower[step] =
                shortLower68 * weights.short +
                medium.confidence68Lower[step] * weights.medium +
                longLower68 * weights.long;

            // 95% 신뢰구간도 동일하게 계산
            const shortUpper95 = step < short.confidence95Upper.length ? short.confidence95Upper[step] : medium.confidence95Upper[step];
            const shortLower95 = step < short.confidence95Lower.length ? short.confidence95Lower[step] : medium.confidence95Lower[step];
            const longUpper95 = step < long.confidence95Upper.length ? long.confidence95Upper[step] : medium.confidence95Upper[step];
            const longLower95 = step < long.confidence95Lower.length ? long.confidence95Lower[step] : medium.confidence95Lower[step];

            confidence95Upper[step] =
                shortUpper95 * weights.short +
                medium.confidence95Upper[step] * weights.medium +
                longUpper95 * weights.long;

            confidence95Lower[step] =
                shortLower95 * weights.short +
                medium.confidence95Lower[step] * weights.medium +
                longLower95 * weights.long;
        }

        // 중기 분석 결과를 베이스로 하되 시나리오만 교체
        return {
            ...medium,
            scenario,
            confidence68Upper,
            confidence68Lower,
            confidence95Upper,
            confidence95Lower
        };
    }

    // PredictionResult → TimeframeAnalysis 변환
    private toTimeframeAnalysis(result: PredictionResult, windowSize: number, predictionSize: number): TimeframeAnalysis {
        return {
            windowSize,
            predictionSize,
            matches: result.matches,
            scenario: result.scenario,
            confidence68Upper: result.confidence68Upper,
            confidence68Lower: result.confidence68Lower,
            confidence95Upper: result.confidence95Upper,
            confidence95Lower: result.confidence95Lower
        };
    }

    // Phase 3: DTW + ATR 통합 고급 분석
    public analyzeAdvanced(
        history: OHLC[],
        windowSize = 15,
        predictionSize = 10,
        options: Partial<AdvancedAnalysisOptions> = {}
    ): PredictionResult {
        const opts: AdvancedAnalysisOptions = {
            useDTW: options.useDTW ?? true,
            useATR: options.useATR ?? true,
            dtwWeight: options.dtwWeight ?? 0.2,
            atrPeriod: options.atrPeriod ?? 14
        };

        const targetWindow = history.slice(-windowSize);
        const searchHistory = history.slice(0, -predictionSize);

        // ATR 정규화 여부에 따른 가격 데이터
        const targetPrices = opts.useATR
            ? this.normalizeWithATR(targetWindow, opts.atrPeriod)
            : targetWindow.map(d => d.close);

        // DTW 사용 시 임계값 낮춤
        const threshold = opts.useDTW ? 0.75 : 0.82;
        const matches: PredictionMatch[] = [];

        for (let i = 0; i < searchHistory.length - windowSize; i++) {
            const windowData = searchHistory.slice(i, i + windowSize);

            // ATR 정규화 적용
            const windowPrices = opts.useATR
                ? this.normalizeWithATR(windowData, opts.atrPeriod)
                : windowData.map(d => d.close);

            // 1. 기존 상관계수 계산
            const pCorr = this.getPearsonCorrelation(targetPrices, windowPrices);
            const sCorr = this.getSpearmanCorrelation(targetPrices, windowPrices);
            const priceScore = (pCorr + sCorr) / 2;

            // 2. 거래량 상관계수
            const volumeScore = this.getVolumeCorrelation(targetWindow, windowData);

            // 3. DTW 유사도 계산 (옵션)
            let dtwSimilarity = 0;
            let timeWarp = 0;
            if (opts.useDTW) {
                const dtwResult = this.getDTWSimilarity(targetPrices, windowPrices);
                dtwSimilarity = dtwResult.similarity;
                timeWarp = this.calculateTimeWarp(dtwResult.path);
            }

            // 4. 최종 점수 계산
            // DTW 사용: 가격(50%) + 거래량(30%) + DTW(20%)
            // DTW 미사용: 가격(70%) + 거래량(30%)
            const finalScore = opts.useDTW
                ? priceScore * 0.5 + volumeScore * 0.3 + dtwSimilarity * opts.dtwWeight
                : priceScore * 0.7 + volumeScore * 0.3;

            const volumeCondition = volumeScore === 0 || volumeScore >= 0.5;

            if (finalScore >= threshold && volumeCondition) {
                const future = history.slice(i + windowSize, i + windowSize + predictionSize).map(d => d.close);
                matches.push({
                    correlation: finalScore,
                    priceCorrelation: priceScore,
                    volumeCorrelation: volumeScore,
                    dtwSimilarity: opts.useDTW ? dtwSimilarity : undefined,
                    timeWarp: opts.useDTW ? timeWarp : undefined,
                    future,
                    date: new Date(history[i].time * 1000).toLocaleDateString(),
                    windowData
                });
            }
        }

        const sortedMatches = matches
            .sort((a, b) => b.correlation - a.correlation)
            .slice(0, 10)
            .map((match, index) => ({
                ...match,
                weight: Math.pow(match.correlation, 3),
                opacity: 1 - (index * 0.1),
                rank: index + 1
            }));

        // 상위 5개만 평균 계산에 사용
        const top5Matches = sortedMatches.slice(0, 5);
        const totalWeight = top5Matches.reduce((sum, m) => sum + (m.weight || 0), 0);

        // 시나리오 계산
        const scenario = new Array(predictionSize).fill(0);
        const upper = new Array(predictionSize).fill(-Infinity);
        const lower = new Array(predictionSize).fill(Infinity);
        const confidence68Upper = new Array(predictionSize).fill(0);
        const confidence68Lower = new Array(predictionSize).fill(0);
        const confidence95Upper = new Array(predictionSize).fill(0);
        const confidence95Lower = new Array(predictionSize).fill(0);

        if (top5Matches.length > 0) {
            const currentPrice = targetWindow[targetWindow.length - 1].close;

            for (let step = 0; step < predictionSize; step++) {
                const normalizedPrices: number[] = [];
                const weights: number[] = [];

                top5Matches.forEach(m => {
                    const historicalStartPrice = m.windowData[m.windowData.length - 1].close;
                    const historicalFuturePrice = m.future[step];
                    const priceRatio = historicalFuturePrice / historicalStartPrice;
                    const normalizedPrice = currentPrice * priceRatio;

                    normalizedPrices.push(normalizedPrice);
                    weights.push(m.weight || 1);

                    upper[step] = Math.max(upper[step], normalizedPrice);
                    lower[step] = Math.min(lower[step], normalizedPrice);
                });

                const weightedSum = normalizedPrices.reduce((sum, price, i) =>
                    sum + price * (weights[i] / totalWeight), 0
                );
                scenario[step] = weightedSum;

                const mean = weightedSum;
                const variance = normalizedPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / normalizedPrices.length;
                const stdDev = Math.sqrt(variance);

                confidence68Upper[step] = mean + stdDev;
                confidence68Lower[step] = mean - stdDev;
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
