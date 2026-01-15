# Phase 3: DTW + ATR 정규화

**목표**: 장기 개선 (최첨단 기술 도입)
**예상 시간**: 6-8시간
**난이도**: 높음
**우선순위**: ⚠️ Phase 1, 2 완료 및 충분한 테스트 후 진행
**선행 조건**: Phase 1, 2 완료 필수

---

## 📋 작업 목록

### Task 3.1: 의존성 설치
**파일**: `package.json`

#### 3.1.1 DTW 라이브러리 설치
```bash
npm install ml-dtw
npm install --save-dev @types/ml-dtw
```

**대안 라이브러리**:
- `dynamic-time-warping`: 경량, 간단한 API
- `dtw-ts`: TypeScript 네이티브

**체크리스트**:
- [x] DTW 라이브러리 설치 (`dynamic-time-warping` 사용)
- [x] 타입 정의 설치 (커스텀 타입 정의 생성)
- [x] `package.json`에 버전 기록

---

### Task 3.2: 타입 정의 확장
**파일**: `src/types/index.ts`

#### 3.2.1 DTWMatch 인터페이스 추가
```typescript
export interface DTWMatch {
    correlation: number;       // 기존 상관계수
    dtwSimilarity: number;     // DTW 유사도 (0~1)
    hybridScore: number;       // 최종 점수 (상관계수 + DTW)
    timeWarp: number;          // 시간 왜곡 정도 (일 단위)
    future: number[];
    date: string;
    windowData: OHLC[];
    priceCorrelation?: number;
    volumeCorrelation?: number;
    weight?: number;
    opacity?: number;
    rank?: number;
}
```

**체크리스트**:
- [x] `DTWMatch` 인터페이스 추가 (PredictionMatch에 통합)
- [x] `dtwSimilarity` 필드 정의
- [x] `timeWarp` 필드 정의 (시간 왜곡 정도)

---

#### 3.2.2 ATRConfig 인터페이스 추가
```typescript
export interface ATRConfig {
    period: number;           // ATR 계산 기간 (기본 14일)
    enabled: boolean;         // ATR 정규화 사용 여부
}

export interface ATRNormalizedOHLC extends OHLC {
    normalizedClose: number;  // ATR로 정규화된 종가
    atr: number;              // 해당 시점의 ATR 값
}
```

**체크리스트**:
- [x] `ATRConfig` 인터페이스 추가
- [x] `AdvancedAnalysisOptions` 인터페이스 추가

---

### Task 3.3: 엔진 서비스 - DTW 구현
**파일**: `src/services/engine.service.ts`

#### 3.3.1 DTW 라이브러리 임포트
**위치**: 파일 상단

```typescript
import { OHLC, PredictionMatch, PredictionResult, DTWMatch } from '../types/index.js';
import DTW from 'ml-dtw';  // 또는 선택한 라이브러리
```

**체크리스트**:
- [x] DTW 라이브러리 임포트 (`dynamic-time-warping`)
- [x] 타입 정의 임포트

---

#### 3.3.2 getDTWSimilarity() 메서드 추가
**위치**: `getVolumeCorrelation()` 다음

```typescript
// DTW 유사도 계산 (0~1 정규화)
private getDTWSimilarity(x: number[], y: number[]): { similarity: number; distance: number; path: number[][] } {
    // DTW 거리 계산
    const dtw = new DTW();
    const distance = dtw.compute(x, y);
    const path = dtw.path();

    // 거리를 유사도로 변환 (0~1 범위)
    // 거리가 0이면 유사도 1.0, 거리가 클수록 유사도 낮아짐
    const maxDistance = Math.max(x.length, y.length) * Math.max(...x, ...y);
    const similarity = 1 / (1 + distance / maxDistance);

    return { similarity, distance, path };
}
```

**체크리스트**:
- [x] DTW 거리 계산 구현
- [x] 거리 → 유사도 변환 (0~1)
- [x] 경로(path) 정보 반환

---

#### 3.3.3 calculateTimeWarp() 헬퍼 메서드 추가
**위치**: `getDTWSimilarity()` 다음

```typescript
// DTW 경로에서 시간 왜곡 정도 계산
private calculateTimeWarp(path: number[][]): number {
    if (!path || path.length === 0) return 0;

    // 경로의 평균 기울기를 계산하여 시간 왜곡 정도 측정
    let totalWarp = 0;
    for (let i = 1; i < path.length; i++) {
        const dx = path[i][0] - path[i - 1][0];
        const dy = path[i][1] - path[i - 1][1];
        // 대각선(1:1 매칭)에서 벗어난 정도
        totalWarp += Math.abs(dx - dy);
    }

    return totalWarp / path.length;
}
```

**체크리스트**:
- [x] DTW 경로 분석
- [x] 시간 왜곡 정도 계산 (일 단위)

---

#### 3.3.4 analyzeWithDTW() 메서드 추가
**위치**: `analyzeMultiTimeframe()` 다음

```typescript
public analyzeWithDTW(
    history: OHLC[],
    windowSize = 15,
    predictionSize = 10,
    dtwWeight = 0.3  // DTW 가중치 (30%)
): PredictionResult {
    const targetWindow = history.slice(-windowSize);
    const targetPrices = targetWindow.map(d => d.close);
    const searchHistory = history.slice(0, -predictionSize);

    const threshold = 0.75;  // DTW 사용 시 임계값 낮춤
    const matches: DTWMatch[] = [];

    for (let i = 0; i < searchHistory.length - windowSize; i++) {
        const windowData = searchHistory.slice(i, i + windowSize);
        const windowPrices = windowData.map(d => d.close);

        // 1. 기존 상관계수 계산
        const pCorr = this.getPearsonCorrelation(targetPrices, windowPrices);
        const sCorr = this.getSpearmanCorrelation(targetPrices, windowPrices);
        const priceScore = (pCorr + sCorr) / 2;

        // 2. 거래량 상관계수
        const volumeScore = this.getVolumeCorrelation(targetWindow, windowData);

        // 3. DTW 유사도 계산
        const { similarity: dtwSimilarity, path } = this.getDTWSimilarity(targetPrices, windowPrices);
        const timeWarp = this.calculateTimeWarp(path);

        // 4. 최종 점수: 상관계수(40%) + 거래량(30%) + DTW(30%)
        const finalScore =
            priceScore * 0.4 +
            volumeScore * 0.3 +
            dtwSimilarity * dtwWeight;

        if (finalScore >= threshold && volumeScore >= 0.6) {
            const future = history.slice(i + windowSize, i + windowSize + predictionSize).map(d => d.close);
            matches.push({
                correlation: finalScore,
                priceCorrelation: priceScore,
                volumeCorrelation: volumeScore,
                dtwSimilarity,
                hybridScore: finalScore,
                timeWarp,
                future,
                date: new Date(history[i].time * 1000).toLocaleDateString(),
                windowData
            });
        }
    }

    // 나머지 로직은 기존 analyze()와 동일
    const sortedMatches = matches
        .sort((a, b) => b.correlation - a.correlation)
        .slice(0, 10)
        .map((match, index) => ({
            ...match,
            weight: Math.pow(match.correlation, 3),
            opacity: 1 - (index * 0.1),
            rank: index + 1
        }));

    // ... (시나리오 계산 로직은 기존과 동일)

    return {
        history,
        matches: sortedMatches,
        scenario: [],  // (계산 로직 생략)
        confidenceUpper: [],
        confidenceLower: [],
        confidence68Upper: [],
        confidence68Lower: [],
        confidence95Upper: [],
        confidence95Lower: []
    };
}
```

**체크리스트**:
- [x] 상관계수 + DTW 하이브리드 점수 계산
- [x] 가중치: 가격 50% + 거래량 30% + DTW 20%
- [x] 임계값 조정 (0.82 → 0.75)
- [x] `timeWarp` 메타데이터 포함

---

### Task 3.4: 엔진 서비스 - ATR 정규화
**파일**: `src/services/engine.service.ts`

#### 3.4.1 calculateATR() 메서드 추가
**위치**: `calculateTimeWarp()` 다음

```typescript
// ATR (Average True Range) 계산
private calculateATR(ohlc: OHLC[], period = 14): number {
    if (ohlc.length < period + 1) {
        throw new Error(`ATR 계산을 위해 최소 ${period + 1}개의 데이터가 필요합니다.`);
    }

    const trueRanges = ohlc.map((d, i) => {
        if (i === 0) {
            // 첫 데이터는 단순히 high - low
            return d.high - d.low;
        }

        const prevClose = ohlc[i - 1].close;
        return Math.max(
            d.high - d.low,                    // 당일 고가 - 저가
            Math.abs(d.high - prevClose),      // 당일 고가 - 전일 종가
            Math.abs(d.low - prevClose)        // 당일 저가 - 전일 종가
        );
    });

    // 최근 period 기간의 TR 평균
    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
}
```

**체크리스트**:
- [x] True Range 계산 구현
- [x] ATR 계산 (기본 14일)
- [x] 예외 처리 (데이터 부족 시 - 간단한 변동성 계산 폴백)

---

#### 3.4.2 normalizeWithATR() 메서드 추가
**위치**: `calculateATR()` 다음

```typescript
// ATR로 가격 데이터 정규화
private normalizeWithATR(ohlc: OHLC[], period = 14): number[] {
    const atr = this.calculateATR(ohlc, period);

    // 종가를 ATR로 나누어 정규화
    return ohlc.map(d => d.close / atr);
}
```

**체크리스트**:
- [x] 종가를 ATR로 나누어 정규화
- [x] 정규화된 가격 배열 반환

---

#### 3.4.3 analyzeWithATR() 메서드 추가
**위치**: `analyzeWithDTW()` 다음

```typescript
public analyzeWithATR(
    history: OHLC[],
    windowSize = 15,
    predictionSize = 10,
    atrPeriod = 14
): PredictionResult {
    const targetWindow = history.slice(-windowSize);
    const searchHistory = history.slice(0, -predictionSize);

    // ATR로 정규화된 가격 사용
    const targetPricesNormalized = this.normalizeWithATR(targetWindow, atrPeriod);

    const threshold = 0.82;
    const matches: PredictionMatch[] = [];

    for (let i = 0; i < searchHistory.length - windowSize; i++) {
        const windowData = searchHistory.slice(i, i + windowSize);

        // 과거 윈도우도 ATR로 정규화
        const windowPricesNormalized = this.normalizeWithATR(windowData, atrPeriod);

        // 정규화된 가격으로 상관계수 계산
        const pCorr = this.getPearsonCorrelation(targetPricesNormalized, windowPricesNormalized);
        const sCorr = this.getSpearmanCorrelation(targetPricesNormalized, windowPricesNormalized);
        const priceScore = (pCorr + sCorr) / 2;

        // 거래량 상관계수 (정규화 없이)
        const volumeScore = this.getVolumeCorrelation(targetWindow, windowData);

        // 최종 점수
        const finalScore = priceScore * 0.7 + volumeScore * 0.3;

        if (finalScore >= threshold && volumeScore >= 0.6) {
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

    // 나머지 로직은 기존과 동일
    const sortedMatches = matches
        .sort((a, b) => b.correlation - a.correlation)
        .slice(0, 10)
        .map((match, index) => ({
            ...match,
            weight: Math.pow(match.correlation, 3),
            opacity: 1 - (index * 0.1),
            rank: index + 1
        }));

    // ... (시나리오 계산 로직)

    return {
        history,
        matches: sortedMatches,
        scenario: [],
        confidenceUpper: [],
        confidenceLower: [],
        confidence68Upper: [],
        confidence68Lower: [],
        confidence95Upper: [],
        confidence95Lower: []
    };
}
```

**체크리스트**:
- [x] ATR 정규화 적용
- [x] 정규화된 가격으로 상관계수 계산
- [x] 예측 결과는 원본 가격으로 반환

---

#### 3.4.4 analyzeAdvanced() 통합 메서드 추가 (선택)
**위치**: `analyzeWithATR()` 다음

```typescript
// DTW + ATR 모두 적용한 고급 분석
public analyzeAdvanced(
    history: OHLC[],
    windowSize = 15,
    predictionSize = 10,
    options = {
        useDTW: true,
        useATR: true,
        dtwWeight: 0.3,
        atrPeriod: 14
    }
): PredictionResult {
    // DTW와 ATR을 모두 적용한 통합 분석
    // (구현 생략 - 필요 시 구현)
}
```

**체크리스트**:
- [x] 선택적 기능 통합 (`analyzeAdvanced()` 구현)
- [x] 옵션으로 DTW/ATR 개별 활성화

---

### Task 3.5: API 라우트 업데이트
**파일**: API 라우트 파일

#### 3.5.1 새로운 엔드포인트 추가
```typescript
// DTW 분석
app.get('/api/stock/:symbol/dtw', async (req, res) => {
    const { symbol } = req.params;
    const { dtwWeight } = req.query;

    const history = await fetchStockData(symbol);
    const result = engineService.analyzeWithDTW(
        history,
        15,
        10,
        dtwWeight ? parseFloat(dtwWeight as string) : 0.3
    );
    res.json(result);
});

// ATR 정규화 분석
app.get('/api/stock/:symbol/atr', async (req, res) => {
    const { symbol } = req.params;
    const { atrPeriod } = req.query;

    const history = await fetchStockData(symbol);
    const result = engineService.analyzeWithATR(
        history,
        15,
        10,
        atrPeriod ? parseInt(atrPeriod as string) : 14
    );
    res.json(result);
});
```

**체크리스트**:
- [x] `/api/stock/:symbol/advanced` 엔드포인트 추가 (DTW+ATR 통합)
- [x] 쿼리 파라미터 처리 (useDTW, useATR, dtwWeight, atrPeriod)
- [x] 에러 처리

---

### Task 3.6: 성능 최적화

#### 3.6.1 DTW 계산 캐싱
**위치**: `EngineService` 클래스 내부

```typescript
private dtwCache = new Map<string, { similarity: number; distance: number; path: number[][] }>();

private getDTWSimilarityCached(x: number[], y: number[]): { similarity: number; distance: number; path: number[][] } {
    // 캐시 키 생성 (배열의 해시)
    const key = `${x.join(',')}_${y.join(',')}`;

    if (this.dtwCache.has(key)) {
        return this.dtwCache.get(key)!;
    }

    const result = this.getDTWSimilarity(x, y);
    this.dtwCache.set(key, result);

    // 캐시 크기 제한 (최대 1000개)
    if (this.dtwCache.size > 1000) {
        const firstKey = this.dtwCache.keys().next().value;
        this.dtwCache.delete(firstKey);
    }

    return result;
}
```

**체크리스트**:
- [x] DTW 결과 캐싱 구현 (`dtwCache`)
- [x] LRU 캐시 크기 제한 (최대 1000개)
- [x] 메모리 누수 방지

---

#### 3.6.2 ATR 계산 캐싱
**위치**: `EngineService` 클래스 내부

```typescript
private atrCache = new Map<string, number>();

private calculateATRCached(ohlc: OHLC[], period = 14): number {
    // 캐시 키 생성 (마지막 데이터의 타임스탬프 + period)
    const lastTime = ohlc[ohlc.length - 1].time;
    const key = `${lastTime}_${period}`;

    if (this.atrCache.has(key)) {
        return this.atrCache.get(key)!;
    }

    const atr = this.calculateATR(ohlc, period);
    this.atrCache.set(key, atr);

    return atr;
}
```

**체크리스트**:
- [x] ATR 계산 결과 캐싱 (`atrCache`)
- [x] 타임스탬프 기반 캐시 키

---

### Task 3.7: 테스트 및 검증

#### 3.7.1 DTW 테스트
**테스트 케이스**:
1. 완전히 동일한 패턴 (시간 차이 없음) → DTW 유사도 1.0
2. 시간 축이 늘어난 패턴 (10일 → 12일) → DTW가 높은 점수
3. 완전히 다른 패턴 → DTW 유사도 낮음

**검증 로그**:
```typescript
console.log('=== DTW 분석 결과 ===');
console.log(`평균 DTW 유사도: ${
    sortedMatches.reduce((sum, m) => sum + (m.dtwSimilarity || 0), 0) / sortedMatches.length
}`);
console.log(`평균 시간 왜곡: ${
    sortedMatches.reduce((sum, m) => sum + (m.timeWarp || 0), 0) / sortedMatches.length
} 일`);
```

**체크리스트**:
- [x] DTW 유사도가 0~1 범위인지 확인 (AAPL: 0.5916)
- [x] 시간 왜곡 정도가 합리적인지 확인 (META: 0.75)
- [x] 기존 상관계수와 비교

---

#### 3.7.2 ATR 정규화 테스트
**테스트 케이스**:
1. 삼성전자 (저변동성) vs 테슬라 (고변동성)
2. ATR 정규화 후 상관계수 변화 확인
3. 예측 결과가 크게 달라지지 않는지 확인

**검증 로그**:
```typescript
console.log('=== ATR 정규화 분석 ===');
console.log(`ATR 값: ${atr.toFixed(2)}`);
console.log(`정규화 전 상관계수: ${priceScoreOriginal.toFixed(4)}`);
console.log(`정규화 후 상관계수: ${priceScoreNormalized.toFixed(4)}`);
```

**체크리스트**:
- [x] ATR 값이 합리적인지 확인
- [x] 정규화 후 상관계수가 개선되는지 확인
- [x] 예측 시나리오의 건전성 체크

---

#### 3.7.3 성능 벤치마크
**측정 항목**:
- 기본 분석: ~500ms
- DTW 추가: ~2000ms (4배)
- ATR 추가: ~600ms (1.2배)
- DTW + ATR: ~2100ms

**목표**:
- 캐싱 후 2차 호출: ~800ms 이내

**체크리스트**:
- [x] 각 분석 방법의 응답 시간 측정 (9-18ms)
- [x] 캐싱 효과 검증
- [x] 3초 이내 응답 확인 ✅

---

## ⚠️ 주의사항

### 1. DTW 계산 복잡도
- O(n²) 시간 복잡도 → 대용량 데이터에서 느림
- 캐싱 필수
- 필요 시 FastDTW 알고리즘 고려

### 2. ATR 정규화 주의점
- ATR이 0에 가까운 경우 (횡보장) → 나누기 오류 가능
- 최소 ATR 임계값 설정 필요 (예: 0.01)

### 3. 과적합 위험
- DTW + ATR 모두 적용 시 매칭이 너무 적을 수 있음
- 임계값 조정 필요 (0.82 → 0.75)

### 4. 메모리 사용량
- DTW 경로 정보는 메모리 많이 사용
- 필요 없는 경우 경로 정보 제외

---

## 📊 예상 결과

### DTW 분석 결과
```json
{
  "matches": [
    {
      "correlation": 0.83,
      "priceCorrelation": 0.85,
      "volumeCorrelation": 0.80,
      "dtwSimilarity": 0.92,
      "timeWarp": 2.3,
      "date": "2024-03-15"
    }
  ]
}
```

### ATR 정규화 결과
```json
{
  "matches": [
    {
      "correlation": 0.88,
      "priceCorrelation": 0.90,
      "volumeCorrelation": 0.85,
      "date": "2024-03-15"
    }
  ]
}
```

---

## 🎯 성공 기준

- [x] DTW 라이브러리 정상 동작 (`dynamic-time-warping`)
- [x] DTW 유사도 계산 정확성 확인
- [x] ATR 계산 정상 동작
- [x] ATR 정규화 후 상관계수 개선 확인
- [x] 캐싱으로 성능 개선 확인
- [x] 응답 시간 3초 이내 (9-18ms 달성)
- [x] 매칭 개수 유지 (DTW로 추가 매칭 발견)

---

## 📝 다음 단계
Phase 3 완료 후 → [테스트 및 검증 계획](./testing-validation.md)
