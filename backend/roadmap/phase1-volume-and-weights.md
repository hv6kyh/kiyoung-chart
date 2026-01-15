# Phase 1: 거래량 패턴 매칭 + 가중치 기반 예측

**목표**: 즉시 적용 가능한 단기 개선 (정확도 향상)
**예상 시간**: 2-3시간
**난이도**: 낮음
**우선순위**: 🥇 최우선

---

## 📋 작업 목록

### Task 1.1: 타입 정의 확장
**파일**: `src/types/index.ts`

#### 1.1.1 OHLC 인터페이스에 volume 필드 추가
```typescript
export interface OHLC {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;  // ✅ 추가
}
```

**체크리스트**:
- [x] OHLC 인터페이스에 `volume: number` 필드 추가
- [x] 기존 코드와의 호환성 확인

---

#### 1.1.2 PredictionMatch 인터페이스에 메타데이터 추가
```typescript
export interface PredictionMatch {
    correlation: number;
    future: number[];
    date: string;
    windowData: OHLC[];
    priceCorrelation?: number;      // ✅ 추가 (가격 상관계수)
    volumeCorrelation?: number;     // ✅ 추가 (거래량 상관계수)
    weight?: number;                // ✅ 추가 (가중치)
}
```

**체크리스트**:
- [x] `priceCorrelation` 필드 추가 (optional)
- [x] `volumeCorrelation` 필드 추가 (optional)
- [x] `weight` 필드 추가 (optional)

---

### Task 1.2: 엔진 서비스 개선
**파일**: `src/services/engine.service.ts`

#### 1.2.1 거래량 상관계수 계산 메서드 추가
**위치**: `getSpearmanCorrelation()` 메서드 다음에 추가

```typescript
// 거래량 상관계수 계산 (Pearson + Spearman 하이브리드)
private getVolumeCorrelation(x: OHLC[], y: OHLC[]): number {
    const volumesX = x.map(d => d.volume);
    const volumesY = y.map(d => d.volume);

    const pCorr = this.getPearsonCorrelation(volumesX, volumesY);
    const sCorr = this.getSpearmanCorrelation(volumesX, volumesY);

    return (pCorr + sCorr) / 2;
}
```

**체크리스트**:
- [x] `getVolumeCorrelation()` 메서드 추가
- [x] 거래량 배열 추출 로직 구현
- [x] Pearson + Spearman 하이브리드 계산

---

#### 1.2.2 analyze() 메서드에 거래량 로직 통합
**위치**: `analyze()` 메서드 내부, 48-50번째 줄 수정

**기존 코드**:
```typescript
const pCorr = this.getPearsonCorrelation(targetPrices, windowPrices);
const sCorr = this.getSpearmanCorrelation(targetPrices, windowPrices);
const hybridScore = (pCorr + sCorr) / 2;
```

**수정 코드**:
```typescript
// 가격 상관계수 (Pearson + Spearman)
const pCorr = this.getPearsonCorrelation(targetPrices, windowPrices);
const sCorr = this.getSpearmanCorrelation(targetPrices, windowPrices);
const priceScore = (pCorr + sCorr) / 2;

// 거래량 상관계수
const volumeScore = this.getVolumeCorrelation(targetWindow, windowData);

// 최종 점수: 가격(70%) + 거래량(30%)
const finalScore = priceScore * 0.7 + volumeScore * 0.3;
```

**체크리스트**:
- [x] 가격 상관계수를 `priceScore` 변수로 분리
- [x] 거래량 상관계수 계산 추가
- [x] 가중 평균 계산 (가격 70%, 거래량 30%)
- [x] `hybridScore` → `finalScore`로 변수명 변경

---

#### 1.2.3 임계값 조건 업데이트
**위치**: 52번째 줄

**기존 코드**:
```typescript
if (hybridScore >= threshold) {
```

**수정 코드**:
```typescript
if (finalScore >= threshold && volumeScore >= 0.6) {  // 거래량도 최소 0.6 이상
```

**체크리스트**:
- [x] `finalScore` 사용으로 변경
- [x] 거래량 최소 임계값 0.6 추가 (0.5로 조정됨)
- [x] 주석 추가

---

#### 1.2.4 매칭 결과에 메타데이터 추가
**위치**: 54-59번째 줄

**기존 코드**:
```typescript
matches.push({
    correlation: hybridScore,
    future,
    date: new Date(history[i].time * 1000).toLocaleDateString(),
    windowData
});
```

**수정 코드**:
```typescript
matches.push({
    correlation: finalScore,
    priceCorrelation: priceScore,
    volumeCorrelation: volumeScore,
    future,
    date: new Date(history[i].time * 1000).toLocaleDateString(),
    windowData
});
```

**체크리스트**:
- [x] `correlation`을 `finalScore`로 변경
- [x] `priceCorrelation` 필드 추가
- [x] `volumeCorrelation` 필드 추가

---

#### 1.2.5 가중치 계산 로직 추가
**위치**: 63번째 줄 다음

**기존 코드**:
```typescript
const sortedMatches = matches.sort((a, b) => b.correlation - a.correlation).slice(0, 5);
```

**수정 코드**:
```typescript
const sortedMatches = matches
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, 5)
    .map(match => ({
        ...match,
        weight: Math.pow(match.correlation, 3)  // 상관계수의 3제곱
    }));

// 전체 가중치 합계
const totalWeight = sortedMatches.reduce((sum, m) => sum + (m.weight || 0), 0);
```

**체크리스트**:
- [x] 상위 5개 매칭에 가중치 계산
- [x] `weight` 필드 추가 (correlation의 3제곱)
- [x] `totalWeight` 변수 계산

---

#### 1.2.6 예측 시나리오 계산에 가중치 적용
**위치**: 77-96번째 줄 수정

**기존 코드**:
```typescript
for (let step = 0; step < predictionSize; step++) {
    const normalizedPrices: number[] = [];

    sortedMatches.forEach(m => {
        const historicalStartPrice = m.windowData[m.windowData.length - 1].close;
        const historicalFuturePrice = m.future[step];
        const priceRatio = historicalFuturePrice / historicalStartPrice;
        const normalizedPrice = currentPrice * priceRatio;
        normalizedPrices.push(normalizedPrice);

        upper[step] = Math.max(upper[step], normalizedPrice);
        lower[step] = Math.min(lower[step], normalizedPrice);
    });

    // 평균 계산
    const mean = normalizedPrices.reduce((a, b) => a + b, 0) / normalizedPrices.length;
    scenario[step] = mean;
```

**수정 코드**:
```typescript
for (let step = 0; step < predictionSize; step++) {
    const normalizedPrices: number[] = [];
    const weights: number[] = [];

    sortedMatches.forEach(m => {
        const historicalStartPrice = m.windowData[m.windowData.length - 1].close;
        const historicalFuturePrice = m.future[step];
        const priceRatio = historicalFuturePrice / historicalStartPrice;
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
```

**체크리스트**:
- [x] `weights` 배열 추가
- [x] 각 매칭의 가중치 저장
- [x] 단순 평균 → 가중 평균으로 변경
- [x] `totalWeight`로 나누어 정규화

---

### Task 1.3: API 데이터 수집 확인
**파일**: Yahoo Finance API 호출 부분 확인 필요

#### 1.3.1 Yahoo Finance에서 volume 데이터 수집 확인
**예상 위치**: `src/services/yahoo.service.ts` 또는 API 호출 부분

**체크리스트**:
- [x] Yahoo Finance API가 volume 데이터를 반환하는지 확인
- [x] OHLC 객체 생성 시 volume 필드 포함 확인
- [x] volume 데이터가 0이거나 null인 경우 예외 처리

---

### Task 1.4: 테스트 및 검증

#### 1.4.1 콘솔 로그로 중간 값 확인
**위치**: `analyze()` 메서드 내부

**추가할 로그**:
```typescript
console.log('=== 패턴 매칭 결과 ===');
console.log(`총 매칭 개수: ${matches.length}`);
console.log(`상위 5개 평균 가격 상관계수: ${
    sortedMatches.reduce((sum, m) => sum + (m.priceCorrelation || 0), 0) / sortedMatches.length
}`);
console.log(`상위 5개 평균 거래량 상관계수: ${
    sortedMatches.reduce((sum, m) => sum + (m.volumeCorrelation || 0), 0) / sortedMatches.length
}`);
console.log('가중치:', sortedMatches.map(m => m.weight?.toFixed(4)));
```

**체크리스트**:
- [x] 매칭 개수가 10개 이상인지 확인 (너무 적으면 임계값 조정)
- [x] 거래량 상관계수가 의미 있는 값인지 확인
- [x] 가중치가 제대로 분포되는지 확인

---

#### 1.4.2 실제 주식으로 테스트
**테스트 케이스**:
1. 삼성전자 (005930.KS) - 거래량 안정적
2. 테슬라 (TSLA) - 거래량 변동성 큼
3. 애플 (AAPL) - 거래량 중간

**체크리스트**:
- [x] 각 주식에 대해 `/api/stock/:symbol` 호출
- [x] 반환된 매칭의 `priceCorrelation`, `volumeCorrelation` 확인
- [x] 예측 시나리오가 기존과 크게 달라지지 않는지 확인 (건전성 체크)

---

## ⚠️ 주의사항

### 1. 과적합 방지
- **거래량 임계값 0.6**: 가격보다 느슨하게 설정 (거래량은 노이즈가 많음)
- **매칭 개수 모니터링**: 최소 10개 이상 나와야 함
  - 10개 미만이면 `threshold`를 0.80으로 낮추거나 거래량 임계값을 0.5로 낮춤

### 2. 거래량 데이터 품질
- Yahoo Finance API에서 volume이 0인 경우가 있음 (장 마감 후, 휴장일 등)
- volume === 0인 데이터는 상관계수 계산에서 제외하거나 보간 처리

### 3. 성능
- 거래량 상관계수 계산은 O(n) 추가 비용
- 큰 데이터셋에서도 1초 이내 응답 유지

---

## 📊 예상 결과

### Before (기존)
```json
{
  "matches": [
    {
      "correlation": 0.87,
      "date": "2024-03-15"
    }
  ]
}
```

### After (개선)
```json
{
  "matches": [
    {
      "correlation": 0.85,
      "priceCorrelation": 0.87,
      "volumeCorrelation": 0.82,
      "weight": 0.614,
      "date": "2024-03-15"
    }
  ]
}
```

---

## 🎯 성공 기준

- [x] 모든 타입 정의 업데이트 완료
- [x] 거래량 상관계수 계산 정상 동작
- [x] 가중치 기반 예측 적용 완료
- [x] 최소 10개 이상의 매칭 패턴 유지
- [x] 기존 API 응답 구조와 호환성 유지
- [x] 테스트 주식 3개 이상에서 정상 동작 확인

---

## 📝 다음 단계
Phase 1 완료 후 → [Phase 2: 다중 시간 프레임 + 확률 구름](./phase2-multitimeframe-ribbon.md)
