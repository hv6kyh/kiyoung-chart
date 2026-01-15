# Phase 2: 다중 시간 프레임 + 확률 구름 시각화

**목표**: 중기 개선 (정확도 향상 + UX 강화)
**예상 시간**: 4-5시간
**난이도**: 중간
**우선순위**: 🥈 Phase 1 완료 후 진행
**선행 조건**: Phase 1 완료 필수

---

## 📋 작업 목록

### Task 2.1: 타입 정의 확장
**파일**: `src/types/index.ts`

#### 2.1.1 TimeframeAnalysis 인터페이스 추가
```typescript
export interface TimeframeAnalysis {
    windowSize: number;
    predictionSize: number;
    matches: PredictionMatch[];
    scenario: number[];
    confidence68Upper: number[];
    confidence68Lower: number[];
    confidence95Upper: number[];
    confidence95Lower: number[];
}
```

**체크리스트**:
- [x] `TimeframeAnalysis` 인터페이스 추가
- [x] 각 시간 프레임별 분석 결과 저장 구조 정의

---

#### 2.1.2 MultiTimeframeResult 인터페이스 추가
```typescript
export interface MultiTimeframeResult {
    short: TimeframeAnalysis;   // 7일 → 5일 예측
    medium: TimeframeAnalysis;  // 15일 → 10일 예측
    long: TimeframeAnalysis;    // 30일 → 15일 예측
    combined: PredictionResult; // 가중 평균 결과
    confidence: 'A' | 'B' | 'C'; // 신뢰도 등급
}
```

**체크리스트**:
- [x] `MultiTimeframeResult` 인터페이스 추가
- [x] 신뢰도 등급 타입 정의

---

#### 2.1.3 PredictionMatch에 시각화 필드 추가
```typescript
export interface PredictionMatch {
    correlation: number;
    future: number[];
    date: string;
    windowData: OHLC[];
    priceCorrelation?: number;
    volumeCorrelation?: number;
    weight?: number;
    opacity?: number;           // ✅ 추가 (시각화용 투명도)
    rank?: number;              // ✅ 추가 (순위 1-10)
}
```

**체크리스트**:
- [x] `opacity` 필드 추가 (0.1 ~ 1.0)
- [x] `rank` 필드 추가 (1 ~ 10)

---

### Task 2.2: 엔진 서비스 - 다중 시간 프레임 분석
**파일**: `src/services/engine.service.ts`

#### 2.2.1 analyzeMultiTimeframe() 메서드 추가
**위치**: `analyze()` 메서드 다음에 추가

```typescript
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
        short: this.toTimeframeAnalysis(shortAnalysis),
        medium: this.toTimeframeAnalysis(mediumAnalysis),
        long: this.toTimeframeAnalysis(longAnalysis),
        combined,
        confidence
    };
}
```

**체크리스트**:
- [x] `analyzeMultiTimeframe()` 메서드 추가
- [x] 3개 시간 프레임 동시 분석
- [x] 메서드 시그니처 정의

---

#### 2.2.2 calculateConfidenceGrade() 헬퍼 메서드 추가
**위치**: `analyzeMultiTimeframe()` 다음

```typescript
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
```

**체크리스트**:
- [x] 각 시간 프레임의 매칭 유효성 검증
- [x] 신뢰도 등급 계산 (A/B/C)
- [x] 주석 추가

---

#### 2.2.3 combineTimeframes() 헬퍼 메서드 추가
**위치**: `calculateConfidenceGrade()` 다음

```typescript
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
```

**체크리스트**:
- [x] 가중치 정의 (단기 20%, 중기 50%, 장기 30%)
- [x] 예측 길이 차이 처리 (단기 5일, 중기 10일, 장기 15일)
- [x] 가중 평균 계산
- [x] 신뢰구간 가중 평균 계산

---

#### 2.2.4 toTimeframeAnalysis() 헬퍼 메서드 추가
**위치**: `combineTimeframes()` 다음

```typescript
private toTimeframeAnalysis(result: PredictionResult): TimeframeAnalysis {
    return {
        windowSize: result.matches[0]?.windowData.length || 0,
        predictionSize: result.scenario.length,
        matches: result.matches,
        scenario: result.scenario,
        confidence68Upper: result.confidence68Upper,
        confidence68Lower: result.confidence68Lower,
        confidence95Upper: result.confidence95Upper,
        confidence95Lower: result.confidence95Lower
    };
}
```

**체크리스트**:
- [x] `PredictionResult` → `TimeframeAnalysis` 변환
- [x] windowSize 자동 추출

---

### Task 2.3: 엔진 서비스 - 확률 구름 시각화
**파일**: `src/services/engine.service.ts`

#### 2.3.1 analyze() 메서드 수정 - 상위 10개 반환
**위치**: 63번째 줄 수정

**기존 코드**:
```typescript
const sortedMatches = matches
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, 5)
    .map(match => ({
        ...match,
        weight: Math.pow(match.correlation, 3)
    }));
```

**수정 코드**:
```typescript
const sortedMatches = matches
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, 10)  // ✅ 5개 → 10개로 확장
    .map((match, index) => ({
        ...match,
        weight: Math.pow(match.correlation, 3),
        opacity: 1 - (index * 0.1),  // ✅ 투명도: 1위=1.0, 10위=0.1
        rank: index + 1              // ✅ 순위: 1~10
    }));
```

**체크리스트**:
- [x] 상위 5개 → 10개로 변경
- [x] `opacity` 필드 계산 (선형 감소)
- [x] `rank` 필드 추가

---

#### 2.3.2 예측 시나리오 계산 로직 수정
**위치**: 74-110번째 줄 수정

**수정 방향**:
- 상위 5개만 평균 계산에 사용 (기존 유지)
- 6-10위는 시각화용으로만 반환

**기존 코드**:
```typescript
if (sortedMatches.length > 0) {
    const currentPrice = targetWindow[targetWindow.length - 1].close;
    // ...
}
```

**수정 코드**:
```typescript
if (sortedMatches.length > 0) {
    const currentPrice = targetWindow[targetWindow.length - 1].close;

    // 상위 5개만 평균 계산에 사용
    const top5Matches = sortedMatches.slice(0, 5);
    const totalWeight = top5Matches.reduce((sum, m) => sum + (m.weight || 0), 0);

    for (let step = 0; step < predictionSize; step++) {
        const normalizedPrices: number[] = [];
        const weights: number[] = [];

        top5Matches.forEach(m => {  // ✅ sortedMatches → top5Matches
            // ... (기존 로직 동일)
        });

        // 가중 평균 계산
        const weightedSum = normalizedPrices.reduce((sum, price, i) =>
            sum + price * (weights[i] / totalWeight), 0
        );
        scenario[step] = weightedSum;

        // 표준편차 계산 (기존 로직 유지)
        // ...
    }
}
```

**체크리스트**:
- [x] `top5Matches` 변수 추가
- [x] 평균 계산은 상위 5개만 사용
- [x] `sortedMatches`는 10개 전체 반환 (시각화용)

---

### Task 2.4: API 라우트 업데이트
**파일**: API 라우트 파일 (예: `src/routes/stock.routes.ts` 또는 `src/server.ts`)

#### 2.4.1 새로운 엔드포인트 추가 (선택사항)
```typescript
// 기존 엔드포인트: 단일 시간 프레임
app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const history = await fetchStockData(symbol);
    const result = engineService.analyze(history);
    res.json(result);
});

// ✅ 새로운 엔드포인트: 다중 시간 프레임
app.get('/api/stock/:symbol/multi-timeframe', async (req, res) => {
    const { symbol } = req.params;
    const history = await fetchStockData(symbol);
    const result = engineService.analyzeMultiTimeframe(history);
    res.json(result);
});
```

**체크리스트**:
- [x] `/api/stock/:symbol/multi-timeframe` 엔드포인트 추가
- [x] 기존 엔드포인트는 유지 (하위 호환성)
- [x] 에러 처리 추가

---

#### 2.4.2 기존 엔드포인트 개선 (대안)
```typescript
app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const { mode } = req.query;  // ?mode=multi

    const history = await fetchStockData(symbol);

    if (mode === 'multi') {
        const result = engineService.analyzeMultiTimeframe(history);
        res.json(result);
    } else {
        const result = engineService.analyze(history);
        res.json(result);
    }
});
```

**체크리스트**:
- [x] `mode` 쿼리 파라미터 추가 (별도 엔드포인트로 구현)
- [x] 분기 처리 구현
- [x] 기본값은 단일 시간 프레임

---

### Task 2.5: 프론트엔드 시각화 가이드 작성
**파일**: `roadmap/frontend-visualization-guide.md` (새 파일)

#### 2.5.1 확률 구름 렌더링 가이드 작성
```markdown
# 프론트엔드 시각화 가이드

## 확률 구름 (Confidence Ribbon) 렌더링

### 데이터 구조
- `matches` 배열에 10개 패턴 포함
- 각 패턴에 `opacity`, `rank`, `weight` 포함

### 렌더링 방법
1. 1-5위: 실선 (stroke-width: 2-1, opacity 적용)
2. 6-10위: 점선 (stroke-dasharray, opacity 적용)
3. 색상: 주린이 테마 컬러 사용

### 예시 코드 (SVG)
```typescript
matches.forEach(match => {
  const line = createLine(match.future);
  line.style.opacity = match.opacity;
  line.style.strokeWidth = match.rank <= 5 ? 2 : 1;
  if (match.rank > 5) {
    line.style.strokeDasharray = '4 4';
  }
});
```
```

**체크리스트**:
- [ ] 프론트엔드 가이드 문서 작성
- [ ] SVG/Canvas 렌더링 예시 포함
- [ ] 색상 팔레트 제안

---

### Task 2.6: 테스트 및 검증

#### 2.6.1 다중 시간 프레임 테스트
**테스트 케이스**:
1. 삼성전자 (005930.KS)
2. 테슬라 (TSLA)
3. 애플 (AAPL)

**검증 항목**:
```typescript
// 콘솔 로그 추가
console.log('=== 다중 시간 프레임 분석 ===');
console.log(`단기(7일) 매칭 개수: ${result.short.matches.length}`);
console.log(`중기(15일) 매칭 개수: ${result.medium.matches.length}`);
console.log(`장기(30일) 매칭 개수: ${result.long.matches.length}`);
console.log(`신뢰도 등급: ${result.confidence}`);
console.log(`상위 10개 투명도:`, result.combined.matches.map(m => m.opacity));
```

**체크리스트**:
- [x] 각 시간 프레임에서 매칭이 발견되는지 확인
- [x] 신뢰도 등급이 올바르게 계산되는지 확인
- [x] 투명도가 1.0 ~ 0.1로 선형 감소하는지 확인

---

#### 2.6.2 성능 테스트
**측정 항목**:
- 단일 시간 프레임: ~500ms
- 다중 시간 프레임: ~1500ms (3배)

**최적화 필요 시**:
- 병렬 처리 고려 (Promise.all)
- 중복 계산 캐싱

**체크리스트**:
- [x] 응답 시간 측정
- [x] 2초 이내 응답 확인
- [x] 필요 시 최적화

---

## ⚠️ 주의사항

### 1. 시간 프레임 길이 차이
- 단기: 5일 예측
- 중기: 10일 예측
- 장기: 15일 예측

→ 프론트엔드에서 렌더링 시 예측 길이 차이 고려 필요

### 2. 데이터 부족 시나리오
- 장기(30일) 분석은 최소 40일 이상의 히스토리 필요
- 데이터 부족 시 장기 분석 생략 처리

### 3. 성능
- 3배의 계산 비용 발생
- 캐싱 전략 고려 (Redis, 메모리 캐시)

---

## 📊 예상 결과

### API 응답 예시
```json
{
  "short": {
    "windowSize": 7,
    "predictionSize": 5,
    "matches": [...],
    "scenario": [100, 102, 103, ...]
  },
  "medium": {
    "windowSize": 15,
    "predictionSize": 10,
    "matches": [...],
    "scenario": [100, 101, 102, ...]
  },
  "long": {
    "windowSize": 30,
    "predictionSize": 15,
    "matches": [...],
    "scenario": [100, 100.5, 101, ...]
  },
  "combined": {
    "history": [...],
    "matches": [
      {
        "correlation": 0.87,
        "opacity": 1.0,
        "rank": 1,
        "weight": 0.658
      },
      {
        "correlation": 0.85,
        "opacity": 0.9,
        "rank": 2,
        "weight": 0.614
      },
      // ... 총 10개
    ],
    "scenario": [100, 101.5, 102.3, ...],
    "confidence68Upper": [...],
    "confidence68Lower": [...],
    "confidence95Upper": [...],
    "confidence95Lower": [...]
  },
  "confidence": "A"
}
```

---

## 🎯 성공 기준

- [x] 3개 시간 프레임 동시 분석 정상 동작
- [x] 신뢰도 등급 계산 정확성 확인
- [x] 가중 평균 결과가 합리적인지 확인
- [x] 상위 10개 패턴이 투명도와 함께 반환
- [x] 응답 시간 2초 이내
- [x] 기존 API와 하위 호환성 유지

---

## 📝 다음 단계
Phase 2 완료 후 → [Phase 3: DTW + ATR 정규화](./phase3-dtw-atr.md)
