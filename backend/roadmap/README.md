# 예측 엔진 고도화 로드맵

**프로젝트**: 주린이 차트 (Jurinee Chart)
**작성일**: 2026-01-15
**버전**: 1.0

---

## 📖 개요

이 로드맵은 주린이 차트의 주식 예측 엔진을 단계별로 고도화하는 전체 계획입니다. 각 Phase는 독립적으로 구현 및 테스트 가능하며, 이전 Phase의 안정성이 검증된 후 다음 Phase로 진행합니다.

---

## 🎯 전체 목표

1. **정확도 향상**: 거래량 패턴, 다중 시간 프레임, DTW 알고리즘 도입
2. **UX 강화**: 확률 구름 시각화, 신뢰도 등급 표시
3. **기술적 완성도**: ATR 정규화, 가중치 기반 예측

---

## 📋 Phase 구성

| Phase | 제목 | 난이도 | 예상 시간 | 우선순위 |
|-------|------|--------|----------|---------|
| **Phase 1** | [거래량 패턴 매칭 + 가중치 기반 예측](./phase1-volume-and-weights.md) | 낮음 | 2-3시간 | 🥇 최우선 |
| **Phase 2** | [다중 시간 프레임 + 확률 구름 시각화](./phase2-multitimeframe-ribbon.md) | 중간 | 4-5시간 | 🥈 Phase 1 후 |
| **Phase 3** | [DTW + ATR 정규화](./phase3-dtw-atr.md) | 높음 | 6-8시간 | 🥉 Phase 2 후 |

**총 예상 시간**: 12-16시간

---

## 📊 Phase별 상세 내용

### Phase 1: 거래량 패턴 매칭 + 가중치 기반 예측

**목표**: 즉시 적용 가능한 단기 개선 (정확도 향상)

#### 핵심 개선 사항
1. **거래량 상관계수 추가**
   - 가격(70%) + 거래량(30%) 가중 평균
   - 거래량 패턴도 Pearson + Spearman 하이브리드

2. **가중치 기반 예측**
   - 상관계수의 3제곱으로 가중치 차등화
   - 상위 매칭의 영향력 강화

#### 주요 작업
- [x] OHLC 인터페이스에 volume 필드 추가
- [x] `getVolumeCorrelation()` 메서드 구현
- [x] 가중 평균 예측 로직 구현
- [x] 테스트 및 검증

**상세 계획**: [phase1-volume-and-weights.md](./phase1-volume-and-weights.md)

---

### Phase 2: 다중 시간 프레임 + 확률 구름 시각화

**목표**: 중기 개선 (정확도 향상 + UX 강화)

**선행 조건**: ⚠️ Phase 1 완료 필수

#### 핵심 개선 사항
1. **다중 시간 프레임 분석**
   - 단기(7일), 중기(15일), 장기(30일) 동시 분석
   - 신뢰도 등급 계산 (A/B/C)
   - 가중 평균으로 통합 예측

2. **확률 구름 시각화**
   - 상위 10개 패턴 반환 (기존 5개)
   - 투명도 차등화 (1위: 1.0, 10위: 0.1)
   - 프론트엔드 시각화 가이드 제공

#### 주요 작업
- [x] `analyzeMultiTimeframe()` 메서드 구현
- [x] `calculateConfidenceGrade()` 구현
- [x] 상위 10개 패턴에 opacity, rank 추가
- [x] 새로운 API 엔드포인트 추가
- [x] 테스트 및 검증

**상세 계획**: [phase2-multitimeframe-ribbon.md](./phase2-multitimeframe-ribbon.md)

---

### Phase 3: DTW + ATR 정규화

**목표**: 장기 개선 (최첨단 기술 도입)

**선행 조건**: ⚠️ Phase 1, 2 완료 및 충분한 테스트 필수

#### 핵심 개선 사항
1. **DTW (Dynamic Time Warping)**
   - 시간 축 유연성 확보
   - "10일 걸린 패턴이 12일 걸림" 케이스 포착
   - 상관계수의 단점 보완

2. **ATR (Average True Range) 정규화**
   - 변동성 차이 정규화
   - 삼성전자(저변동)와 테슬라(고변동) 동일 척도 비교
   - 시장 환경 변화에 강건함

#### 주요 작업
- [x] DTW 라이브러리 설치 (`dynamic-time-warping`)
- [x] `getDTWSimilarity()` 메서드 구현
- [x] `calculateATR()` 메서드 구현
- [x] `analyzeAdvanced()` 구현 (DTW + ATR 통합)
- [x] 캐싱 최적화
- [x] 테스트 및 검증

**상세 계획**: [phase3-dtw-atr.md](./phase3-dtw-atr.md)

---

## 🧪 테스트 전략

각 Phase는 다음 테스트를 통과해야 다음 Phase로 진행할 수 있습니다:

1. **단위 테스트**: 개별 메서드 검증
2. **통합 테스트**: API 엔드포인트 검증
3. **성능 테스트**: 응답 시간 검증
4. **백테스트**: 예측 정확도 검증 (MAPE < 10%)

**상세 테스트 계획**: [testing-validation.md](./testing-validation.md)

---

## 📈 예상 효과

### Phase 1 완료 후
- ✅ 거래량이 터진 패턴 우선 감지
- ✅ 고품질 매칭에 가중치 집중
- ✅ 예측 정확도 10-15% 향상 예상

### Phase 2 완료 후
- ✅ 단기/중기/장기 트렌드 종합 판단
- ✅ 신뢰도 등급으로 예측 신뢰성 제공
- ✅ 확률 구름으로 불확실성 시각화
- ✅ 예측 정확도 추가 5-10% 향상

### Phase 3 완료 후
- ✅ 시간 왜곡 패턴 포착 (DTW)
- ✅ 변동성 정규화로 일관성 향상 (ATR)
- ✅ 예측 정확도 추가 5-10% 향상
- ✅ 최종 목표: MAPE 10% 이내

---

## 🚀 실행 계획

### 권장 진행 순서

#### Week 1: Phase 1 구현
- **Day 1-2**: 타입 정의 및 거래량 상관계수 구현
- **Day 3**: 가중치 기반 예측 구현
- **Day 4**: 테스트 및 검증
- **Day 5**: 버그 수정 및 최적화

#### Week 2: Phase 2 구현
- **Day 1-2**: 다중 시간 프레임 분석 구현
- **Day 3**: 신뢰도 등급 및 가중 평균 구현
- **Day 4**: 확률 구름 시각화 데이터 구조
- **Day 5**: 테스트 및 검증

#### Week 3: Phase 3 구현
- **Day 1-2**: DTW 알고리즘 구현
- **Day 3-4**: ATR 정규화 구현
- **Day 5**: 캐싱 최적화

#### Week 4: 통합 테스트 및 배포
- **Day 1-2**: 전체 백테스트
- **Day 3**: 성능 최적화
- **Day 4**: 문서화
- **Day 5**: 배포 및 모니터링

---

## ⚠️ 주의사항

### 1. 과적합 방지
- 매칭 개수가 10개 미만이면 임계값 조정
- 거래량 임계값은 가격보다 느슨하게 (0.6 vs 0.82)
- 백테스트로 실제 정확도 검증 필수

### 2. 성능 관리
- Phase 3의 DTW는 O(n²) 복잡도 → 캐싱 필수
- 응답 시간 목표: Phase 1 (2초), Phase 2 (3초), Phase 3 (3초)
- Redis 캐싱 고려

### 3. 데이터 품질
- Yahoo Finance의 volume이 0인 경우 처리
- ATR 계산 시 최소 데이터 개수 확인
- 휴장일, 장 마감 후 데이터 예외 처리

### 4. 하위 호환성
- 기존 API 엔드포인트 유지
- 새로운 기능은 별도 엔드포인트 또는 쿼리 파라미터로 제공
- 프론트엔드와 협의 필수

---

## 📝 체크리스트

### 시작 전
- [x] Git 브랜치 생성 (`feature/prediction-engine-upgrade`)
- [x] 현재 코드 백업
- [x] 테스트 환경 구축

### Phase 1 시작 전
- [x] [phase1-volume-and-weights.md](./phase1-volume-and-weights.md) 정독
- [x] Yahoo Finance API volume 데이터 확인
- [ ] Jest 테스트 환경 구축

### Phase 1 완료 후
- [x] 모든 Phase 1 테스트 통과
- [x] 3개 이상 주식에서 검증 (AAPL, MSFT, NVDA, GOOGL, META, TSLA)
- [ ] Git commit: "feat: Phase 1 - Volume correlation and weighted prediction"
- [x] Phase 2 시작 전 리뷰

### Phase 2 시작 전
- [x] [phase2-multitimeframe-ribbon.md](./phase2-multitimeframe-ribbon.md) 정독
- [x] Phase 1 테스트 재실행 (회귀 테스트)
- [ ] 프론트엔드 팀과 시각화 협의

### Phase 2 완료 후
- [x] 모든 Phase 2 테스트 통과
- [x] 신뢰도 등급 검증
- [ ] Git commit: "feat: Phase 2 - Multi-timeframe and confidence ribbon"
- [x] Phase 3 시작 전 리뷰

### Phase 3 시작 전
- [x] [phase3-dtw-atr.md](./phase3-dtw-atr.md) 정독
- [x] DTW 라이브러리 조사 및 선택 (`dynamic-time-warping`)
- [x] Phase 1, 2 테스트 재실행

### Phase 3 완료 후
- [x] 모든 Phase 3 테스트 통과
- [x] 캐싱 효과 검증
- [ ] Git commit: "feat: Phase 3 - DTW and ATR normalization"
- [x] 최종 통합 테스트

### 배포 전
- [ ] 전체 백테스트 실행
- [x] 성능 벤치마크 (9-18ms)
- [ ] 문서 업데이트 (CLAUDE.md)
- [ ] 프론트엔드 통합 테스트
- [ ] Staging 환경 배포 및 검증

---

## 📚 참고 자료

### 이론적 배경
- **Pearson vs Spearman**: 선형/비선형 상관관계
- **DTW**: [Dynamic Time Warping Paper](https://en.wikipedia.org/wiki/Dynamic_time_warping)
- **ATR**: [Average True Range - Investopedia](https://www.investopedia.com/terms/a/atr.asp)

### 라이브러리
- **DTW**: [ml-dtw](https://www.npmjs.com/package/ml-dtw)
- **Yahoo Finance**: [yahoo-finance2](https://www.npmjs.com/package/yahoo-finance2)
- **Testing**: [Jest](https://jestjs.io/)

---

## 🔧 문제 발생 시

### 매칭 개수 부족
1. 임계값 낮추기 (0.82 → 0.80 → 0.78)
2. 거래량 임계값 낮추기 (0.6 → 0.5)
3. 히스토리 기간 늘리기 (1년 → 2년)

### 응답 시간 초과
1. DTW 캐싱 강화
2. Redis 캐싱 도입
3. 병렬 처리 (Promise.all)
4. 데이터베이스 인덱싱

### 예측 정확도 낮음
1. 가중치 비율 조정
2. 시간 프레임 변경
3. 임계값 상향 조정
4. 백테스트로 최적 파라미터 탐색

---

## 💡 다음 단계 제안

### Phase 4 (선택 사항)
- **머신러닝 통합**: XGBoost, LSTM 등
- **실시간 분석**: WebSocket 기반 실시간 예측
- **섹터 분석**: 업종별 상관관계 분석
- **뉴스 감성 분석**: 뉴스 데이터 통합

### 프론트엔드 연계
- 확률 구름 SVG 렌더링
- 신뢰도 등급 배지 UI
- 시간 프레임 전환 기능
- 예측 정확도 대시보드

---

## 📞 지원

문제 발생 시:
1. [testing-validation.md](./testing-validation.md)의 문제 해결 가이드 참조
2. 각 Phase 문서의 "주의사항" 섹션 확인
3. Git 이슈 등록

---

## 📅 버전 히스토리

- **v1.0** (2026-01-15): 초기 로드맵 작성
  - Phase 1: 거래량 + 가중치
  - Phase 2: 다중 시간 프레임 + 확률 구름
  - Phase 3: DTW + ATR

---

## 🎉 시작하기

Phase 1부터 시작하려면:

```bash
# 1. 로드맵 확인
cat roadmap/phase1-volume-and-weights.md

# 2. 브랜치 생성
git checkout -b feature/phase1-volume-weights

# 3. 테스트 환경 구축
npm install --save-dev jest @types/jest ts-jest

# 4. 구현 시작!
```

**첫 번째 작업**: [phase1-volume-and-weights.md](./phase1-volume-and-weights.md) → Task 1.1.1

---

**행운을 빕니다! 🚀**
