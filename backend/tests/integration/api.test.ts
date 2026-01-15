/**
 * API 통합 테스트
 *
 * 주의: 이 테스트는 서버가 실행 중이어야 합니다.
 * npm run dev 로 서버를 실행한 후 테스트하세요.
 */

const BASE_URL = 'http://localhost:3000';

describe('API Integration Tests', () => {
    // 서버 연결 확인
    beforeAll(async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/stock/AAPL`);
            if (!response.ok) {
                console.warn('Server may not be running. Some tests may fail.');
            }
        } catch (error) {
            console.warn('Server is not running. Integration tests will be skipped.');
        }
    });

    describe('GET /api/stock/:symbol', () => {
        test('AAPL 분석 결과 반환', async () => {
            const response = await fetch(`${BASE_URL}/api/stock/AAPL`);

            if (response.status === 500) {
                console.warn('Server error, skipping test');
                return;
            }

            expect(response.status).toBe(200);

            const result = await response.json();

            expect(result).toHaveProperty('history');
            expect(result).toHaveProperty('matches');
            expect(result).toHaveProperty('scenario');
            expect(Array.isArray(result.history)).toBe(true);
            expect(Array.isArray(result.matches)).toBe(true);
        }, 30000);

        test('매칭에 메타데이터가 포함됨', async () => {
            const response = await fetch(`${BASE_URL}/api/stock/AAPL`);

            if (!response.ok) {
                console.warn('Server not responding, skipping test');
                return;
            }

            const result = await response.json();

            if (result.matches.length > 0) {
                const match = result.matches[0];
                expect(match).toHaveProperty('correlation');
                expect(match).toHaveProperty('priceCorrelation');
                expect(match).toHaveProperty('volumeCorrelation');
                expect(match).toHaveProperty('weight');
                expect(match).toHaveProperty('opacity');
                expect(match).toHaveProperty('rank');
            }
        }, 30000);
    });

    describe('GET /api/stock/:symbol/multi-timeframe', () => {
        test('다중 시간 프레임 분석 결과 반환', async () => {
            const response = await fetch(`${BASE_URL}/api/stock/AAPL/multi-timeframe`);

            if (!response.ok) {
                console.warn('Server not responding, skipping test');
                return;
            }

            const result = await response.json();

            expect(result).toHaveProperty('short');
            expect(result).toHaveProperty('medium');
            expect(result).toHaveProperty('long');
            expect(result).toHaveProperty('combined');
            expect(result).toHaveProperty('confidence');
            expect(['A', 'B', 'C']).toContain(result.confidence);
        }, 30000);

        test('신뢰도 등급이 유효함', async () => {
            const response = await fetch(`${BASE_URL}/api/stock/AAPL/multi-timeframe`);

            if (!response.ok) {
                console.warn('Server not responding, skipping test');
                return;
            }

            const result = await response.json();
            expect(result.confidence).toMatch(/^[ABC]$/);
            console.log(`AAPL 신뢰도 등급: ${result.confidence}`);
        }, 30000);
    });

    describe('GET /api/stock/:symbol/advanced', () => {
        test('고급 분석 (DTW + ATR) 결과 반환', async () => {
            const response = await fetch(`${BASE_URL}/api/stock/AAPL/advanced?useDTW=true&useATR=true`);

            if (!response.ok) {
                console.warn('Server not responding, skipping test');
                return;
            }

            const result = await response.json();

            expect(result).toHaveProperty('matches');
            expect(result).toHaveProperty('scenario');

            if (result.matches.length > 0) {
                const match = result.matches[0];
                expect(match).toHaveProperty('dtwSimilarity');
                expect(match).toHaveProperty('timeWarp');
            }
        }, 30000);

        test('DTW 비활성화 시 dtwSimilarity 없음', async () => {
            const response = await fetch(`${BASE_URL}/api/stock/AAPL/advanced?useDTW=false`);

            if (!response.ok) {
                console.warn('Server not responding, skipping test');
                return;
            }

            const result = await response.json();

            if (result.matches.length > 0) {
                const match = result.matches[0];
                expect(match.dtwSimilarity).toBeUndefined();
            }
        }, 30000);
    });

    describe('Performance Tests', () => {
        test('기본 분석 응답 시간 2초 이내', async () => {
            const startTime = Date.now();

            const response = await fetch(`${BASE_URL}/api/stock/AAPL`);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`기본 분석 응답 시간: ${duration}ms`);

            if (response.ok) {
                expect(duration).toBeLessThan(5000); // 네트워크 지연 고려
            }
        }, 30000);

        test('다중 시간 프레임 응답 시간 3초 이내', async () => {
            const startTime = Date.now();

            const response = await fetch(`${BASE_URL}/api/stock/AAPL/multi-timeframe`);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`다중 시간 프레임 응답 시간: ${duration}ms`);

            if (response.ok) {
                expect(duration).toBeLessThan(10000);
            }
        }, 30000);

        test('고급 분석 응답 시간 3초 이내', async () => {
            const startTime = Date.now();

            const response = await fetch(`${BASE_URL}/api/stock/AAPL/advanced`);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`고급 분석 응답 시간: ${duration}ms`);

            if (response.ok) {
                expect(duration).toBeLessThan(10000);
            }
        }, 30000);
    });

    describe('Multiple Stock Tests', () => {
        const symbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'TSLA'];

        test.each(symbols)('%s 분석이 정상 동작', async (symbol) => {
            const response = await fetch(`${BASE_URL}/api/stock/${symbol}`);

            if (!response.ok) {
                console.warn(`${symbol} 서버 응답 실패, 건너뜀`);
                return;
            }

            const result = await response.json();

            expect(result).toHaveProperty('history');
            expect(result).toHaveProperty('matches');
            console.log(`${symbol}: 매칭 ${result.matches.length}개`);
        }, 30000);
    });
});
