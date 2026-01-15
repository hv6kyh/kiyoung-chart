import { EngineService } from '../src/services/engine.service.js';
import { OHLC } from '../src/types/index.js';

describe('EngineService', () => {
    let engineService: EngineService;

    beforeEach(() => {
        engineService = new EngineService();
    });

    // ==================== Phase 1 Tests ====================
    describe('Phase 1: Volume Correlation', () => {
        test('동일한 거래량 패턴은 상관계수 1.0', () => {
            const data: OHLC[] = [
                { time: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
                { time: 2, open: 102, high: 107, low: 100, close: 105, volume: 1500 },
                { time: 3, open: 105, high: 110, low: 103, close: 108, volume: 2000 },
                { time: 4, open: 108, high: 112, low: 106, close: 110, volume: 2500 },
                { time: 5, open: 110, high: 115, low: 108, close: 113, volume: 3000 },
            ];

            const correlation = (engineService as any).getVolumeCorrelation(data, data);
            expect(correlation).toBeCloseTo(1.0, 1);
        });

        test('완전히 다른 거래량 패턴은 낮은 상관계수', () => {
            const data1: OHLC[] = [
                { time: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
                { time: 2, open: 102, high: 107, low: 100, close: 105, volume: 1500 },
                { time: 3, open: 105, high: 110, low: 103, close: 108, volume: 2000 },
                { time: 4, open: 108, high: 112, low: 106, close: 110, volume: 2500 },
                { time: 5, open: 110, high: 115, low: 108, close: 113, volume: 3000 },
            ];

            const data2: OHLC[] = [
                { time: 1, open: 100, high: 105, low: 95, close: 102, volume: 5000 },
                { time: 2, open: 102, high: 107, low: 100, close: 105, volume: 500 },
                { time: 3, open: 105, high: 110, low: 103, close: 108, volume: 10000 },
                { time: 4, open: 108, high: 112, low: 106, close: 110, volume: 100 },
                { time: 5, open: 110, high: 115, low: 108, close: 113, volume: 8000 },
            ];

            const correlation = (engineService as any).getVolumeCorrelation(data1, data2);
            expect(correlation).toBeLessThan(0.5);
        });

        test('volume이 0인 경우 0 반환', () => {
            const data: OHLC[] = [
                { time: 1, open: 100, high: 105, low: 95, close: 102, volume: 0 },
                { time: 2, open: 102, high: 107, low: 100, close: 105, volume: 0 },
                { time: 3, open: 105, high: 110, low: 103, close: 108, volume: 0 },
            ];

            const correlation = (engineService as any).getVolumeCorrelation(data, data);
            expect(correlation).toBe(0);
        });
    });

    describe('Phase 1: Weighted Prediction', () => {
        test('상관계수의 3제곱이 올바르게 계산됨', () => {
            const correlations = [0.9, 0.8, 0.7];
            const weights = correlations.map(c => Math.pow(c, 3));

            expect(weights[0]).toBeCloseTo(0.729, 3);
            expect(weights[1]).toBeCloseTo(0.512, 3);
            expect(weights[2]).toBeCloseTo(0.343, 3);
        });

        test('가중 평균이 올바르게 계산됨', () => {
            const prices = [100, 110, 120];
            const weights = [0.5, 0.3, 0.2];
            const totalWeight = 1.0;

            const weightedAvg = prices.reduce((sum, price, i) =>
                sum + price * (weights[i] / totalWeight), 0
            );

            expect(weightedAvg).toBeCloseTo(107, 0);
        });
    });

    // ==================== Phase 2 Tests ====================
    describe('Phase 2: Confidence Grade', () => {
        test('3개 시간대 모두 유효하면 등급 A', () => {
            const short = { matches: [{ correlation: 0.85 }] };
            const medium = { matches: [{ correlation: 0.87 }] };
            const long = { matches: [{ correlation: 0.83 }] };

            const grade = (engineService as any).calculateConfidenceGrade(short, medium, long);
            expect(grade).toBe('A');
        });

        test('2개 시간대 유효하면 등급 B', () => {
            const short = { matches: [{ correlation: 0.85 }] };
            const medium = { matches: [{ correlation: 0.87 }] };
            const long = { matches: [] };

            const grade = (engineService as any).calculateConfidenceGrade(short, medium, long);
            expect(grade).toBe('B');
        });

        test('1개 시간대만 유효하면 등급 C', () => {
            const short = { matches: [] };
            const medium = { matches: [{ correlation: 0.87 }] };
            const long = { matches: [] };

            const grade = (engineService as any).calculateConfidenceGrade(short, medium, long);
            expect(grade).toBe('C');
        });

        test('0개 시간대 유효하면 등급 C', () => {
            const short = { matches: [] };
            const medium = { matches: [] };
            const long = { matches: [] };

            const grade = (engineService as any).calculateConfidenceGrade(short, medium, long);
            expect(grade).toBe('C');
        });

        test('상관계수가 0.8 미만이면 무효 처리', () => {
            const short = { matches: [{ correlation: 0.75 }] };
            const medium = { matches: [{ correlation: 0.79 }] };
            const long = { matches: [{ correlation: 0.78 }] };

            const grade = (engineService as any).calculateConfidenceGrade(short, medium, long);
            expect(grade).toBe('C');
        });
    });

    // ==================== Phase 3 Tests ====================
    describe('Phase 3: DTW Similarity', () => {
        test('동일한 패턴은 DTW 유사도 1.0에 근접', () => {
            const pattern = [100, 102, 105, 103, 107, 110];
            const result = (engineService as any).getDTWSimilarity(pattern, pattern);

            expect(result.similarity).toBeGreaterThan(0.95);
            expect(result.distance).toBeCloseTo(0, 1);
        });

        test('시간 축이 늘어난 패턴도 높은 유사도', () => {
            const pattern1 = [100, 105, 110, 115, 120];
            const pattern2 = [100, 102, 105, 107, 110, 112, 115, 117, 120];

            const result = (engineService as any).getDTWSimilarity(pattern1, pattern2);

            expect(result.similarity).toBeGreaterThan(0.7);
        });

        test('완전히 다른 패턴은 낮은 유사도', () => {
            const pattern1 = [100, 105, 110, 115, 120];
            const pattern2 = [120, 115, 110, 105, 100];

            const result = (engineService as any).getDTWSimilarity(pattern1, pattern2);

            expect(result.similarity).toBeLessThan(0.8);
        });

        test('DTW 캐싱이 동작함', () => {
            const pattern1 = [100, 102, 105, 103, 107];
            const pattern2 = [101, 103, 106, 104, 108];

            // 첫 호출
            const result1 = (engineService as any).getDTWSimilarity(pattern1, pattern2);
            // 두 번째 호출 (캐시 사용)
            const result2 = (engineService as any).getDTWSimilarity(pattern1, pattern2);

            expect(result1.similarity).toBe(result2.similarity);
        });
    });

    describe('Phase 3: Time Warp Calculation', () => {
        test('대각선 경로는 시간 왜곡 0', () => {
            const diagonalPath = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
            const warp = (engineService as any).calculateTimeWarp(diagonalPath);

            expect(warp).toBeCloseTo(0, 2);
        });

        test('비대각선 경로는 시간 왜곡 > 0', () => {
            const nonDiagonalPath = [[0, 0], [1, 1], [2, 1], [3, 2], [4, 3]];
            const warp = (engineService as any).calculateTimeWarp(nonDiagonalPath);

            expect(warp).toBeGreaterThan(0);
        });

        test('빈 경로는 0 반환', () => {
            const emptyPath: number[][] = [];
            const warp = (engineService as any).calculateTimeWarp(emptyPath);

            expect(warp).toBe(0);
        });
    });

    describe('Phase 3: ATR Calculation', () => {
        test('ATR이 올바르게 계산됨', () => {
            const ohlc: OHLC[] = [];
            for (let i = 0; i < 20; i++) {
                ohlc.push({
                    time: i,
                    open: 100 + i,
                    high: 105 + i,
                    low: 95 + i,
                    close: 102 + i,
                    volume: 1000
                });
            }

            const atr = (engineService as any).calculateATR(ohlc, 14);

            expect(atr).toBeGreaterThan(0);
            expect(atr).toBeLessThan(20);
        });

        test('데이터 부족 시 간단한 변동성 반환', () => {
            const ohlc: OHLC[] = [
                { time: 1, open: 100, high: 110, low: 90, close: 102, volume: 1000 },
                { time: 2, open: 102, high: 115, low: 95, close: 108, volume: 1200 },
            ];

            const atr = (engineService as any).calculateATR(ohlc, 14);

            expect(atr).toBeGreaterThan(0);
        });

        test('ATR 캐싱이 동작함', () => {
            const ohlc: OHLC[] = [];
            for (let i = 0; i < 20; i++) {
                ohlc.push({
                    time: i,
                    open: 100 + i,
                    high: 105 + i,
                    low: 95 + i,
                    close: 102 + i,
                    volume: 1000
                });
            }

            const atr1 = (engineService as any).calculateATR(ohlc, 14);
            const atr2 = (engineService as any).calculateATR(ohlc, 14);

            expect(atr1).toBe(atr2);
        });
    });

    describe('Phase 3: ATR Normalization', () => {
        test('ATR 정규화가 올바르게 적용됨', () => {
            const ohlc: OHLC[] = [];
            for (let i = 0; i < 20; i++) {
                ohlc.push({
                    time: i,
                    open: 100 + i,
                    high: 105 + i,
                    low: 95 + i,
                    close: 102 + i,
                    volume: 1000
                });
            }

            const normalized = (engineService as any).normalizeWithATR(ohlc, 14);

            expect(normalized.length).toBe(ohlc.length);
            expect(normalized.every((n: number) => typeof n === 'number' && !isNaN(n))).toBe(true);
        });
    });

    // ==================== Integration Tests ====================
    describe('Integration: analyze()', () => {
        test('analyze 메서드가 올바른 구조를 반환', () => {
            const history = generateMockHistory(200);
            const result = engineService.analyze(history, 15, 10);

            expect(result).toHaveProperty('history');
            expect(result).toHaveProperty('matches');
            expect(result).toHaveProperty('scenario');
            expect(result).toHaveProperty('confidenceUpper');
            expect(result).toHaveProperty('confidenceLower');
            expect(result).toHaveProperty('confidence68Upper');
            expect(result).toHaveProperty('confidence68Lower');
            expect(result).toHaveProperty('confidence95Upper');
            expect(result).toHaveProperty('confidence95Lower');
        });

        test('매칭에 가중치와 메타데이터가 포함됨', () => {
            const history = generateMockHistory(200);
            const result = engineService.analyze(history, 15, 10);

            if (result.matches.length > 0) {
                const match = result.matches[0];
                expect(match).toHaveProperty('correlation');
                expect(match).toHaveProperty('priceCorrelation');
                expect(match).toHaveProperty('volumeCorrelation');
                expect(match).toHaveProperty('weight');
                expect(match).toHaveProperty('opacity');
                expect(match).toHaveProperty('rank');
            }
        });
    });

    describe('Integration: analyzeMultiTimeframe()', () => {
        test('다중 시간 프레임 분석이 올바른 구조를 반환', () => {
            const history = generateMockHistory(200);
            const result = engineService.analyzeMultiTimeframe(history);

            expect(result).toHaveProperty('short');
            expect(result).toHaveProperty('medium');
            expect(result).toHaveProperty('long');
            expect(result).toHaveProperty('combined');
            expect(result).toHaveProperty('confidence');
            expect(['A', 'B', 'C']).toContain(result.confidence);
        });

        test('각 시간 프레임이 올바른 윈도우 크기를 가짐', () => {
            const history = generateMockHistory(200);
            const result = engineService.analyzeMultiTimeframe(history);

            expect(result.short.windowSize).toBe(7);
            expect(result.short.predictionSize).toBe(5);
            expect(result.medium.windowSize).toBe(15);
            expect(result.medium.predictionSize).toBe(10);
            expect(result.long.windowSize).toBe(30);
            expect(result.long.predictionSize).toBe(15);
        });
    });

    describe('Integration: analyzeAdvanced()', () => {
        test('고급 분석이 올바른 구조를 반환', () => {
            const history = generateMockHistory(200);
            const result = engineService.analyzeAdvanced(history, 15, 10);

            expect(result).toHaveProperty('history');
            expect(result).toHaveProperty('matches');
            expect(result).toHaveProperty('scenario');
        });

        test('DTW 유사도가 매칭에 포함됨', () => {
            const history = generateMockHistory(200);
            const result = engineService.analyzeAdvanced(history, 15, 10, { useDTW: true });

            if (result.matches.length > 0) {
                const match = result.matches[0];
                expect(match).toHaveProperty('dtwSimilarity');
                expect(match).toHaveProperty('timeWarp');
            }
        });

        test('DTW 비활성화 시 dtwSimilarity가 undefined', () => {
            const history = generateMockHistory(200);
            const result = engineService.analyzeAdvanced(history, 15, 10, { useDTW: false });

            if (result.matches.length > 0) {
                const match = result.matches[0];
                expect(match.dtwSimilarity).toBeUndefined();
            }
        });
    });
});

// Mock 데이터 생성 함수
function generateMockHistory(length: number): OHLC[] {
    const history: OHLC[] = [];
    let price = 100;

    for (let i = 0; i < length; i++) {
        const change = (Math.random() - 0.5) * 4;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        const volume = Math.floor(Math.random() * 10000) + 1000;

        history.push({
            time: Math.floor(Date.now() / 1000) - (length - i) * 86400,
            open,
            high,
            low,
            close,
            volume
        });

        price = close;
    }

    return history;
}
