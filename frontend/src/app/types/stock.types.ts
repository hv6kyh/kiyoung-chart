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
    priceCorrelation: number;
    volumeCorrelation: number;
    weight: number;
    opacity: number;
    rank: number;
    future: number[];
    date: string;
    windowData: OHLC[];
    dtwSimilarity?: number;
    timeWarp?: number;
}

export type DivergenceType = "Bullish" | "Bearish" | "None";

export interface IntegratedAnalysis {
    rsi_value: number;
    status: '과매수' | '과매도' | '중립';
    divergence_type: DivergenceType;
    confidence_score: number;
    comment: string;
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
    integratedAnalysis?: IntegratedAnalysis;
}

export interface MultiTimeframeResult {
    short: TimeframeAnalysis;
    medium: TimeframeAnalysis;
    long: TimeframeAnalysis;
    combined: PredictionResult;
    confidence: 'A' | 'B' | 'C';
}

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
