export interface OHLC {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface PredictionMatch {
    correlation: number;
    future: number[];
    date: string;
    windowData: OHLC[];
    priceCorrelation?: number;
    volumeCorrelation?: number;
    weight?: number;
    opacity?: number;  // 시각화용 투명도 (0.1 ~ 1.0)
    rank?: number;     // 순위 (1 ~ 10)
    // Phase 3: DTW 관련 필드
    dtwSimilarity?: number;  // DTW 유사도 (0~1)
    timeWarp?: number;       // 시간 왜곡 정도 (일 단위)
}

export interface PredictionResult {
    history: OHLC[];
    matches: PredictionMatch[];
    scenario: number[];
    confidenceUpper: number[];
    confidenceLower: number[];
    confidence68Upper: number[];
    confidence68Lower: number[];
    confidence95Upper: number[];
    confidence95Lower: number[];
}

// Phase 2: 다중 시간 프레임 분석용 타입
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

export interface MultiTimeframeResult {
    short: TimeframeAnalysis;   // 7일 → 5일 예측
    medium: TimeframeAnalysis;  // 15일 → 10일 예측
    long: TimeframeAnalysis;    // 30일 → 15일 예측
    combined: PredictionResult; // 가중 평균 결과
    confidence: 'A' | 'B' | 'C'; // 신뢰도 등급
}

// Phase 3: ATR 설정 인터페이스
export interface ATRConfig {
    period: number;    // ATR 계산 기간 (기본 14일)
    enabled: boolean;  // ATR 정규화 사용 여부
}

// Phase 3: 고급 분석 옵션
export interface AdvancedAnalysisOptions {
    useDTW: boolean;     // DTW 사용 여부
    useATR: boolean;     // ATR 정규화 사용 여부
    dtwWeight: number;   // DTW 가중치 (기본 0.3)
    atrPeriod: number;   // ATR 기간 (기본 14)
}
