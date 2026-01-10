export interface OHLC {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface PredictionMatch {
    correlation: number;
    future: number[];
    date: string;
    windowData: OHLC[];
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
