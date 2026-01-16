import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createChart, IChartApi, ISeriesApi, LineStyle, CandlestickData, LineData, Time, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { PredictionResult, OHLC } from '../../types/stock.types';

@Component({
    selector: 'app-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.css']
})
export class ChartComponent implements AfterViewInit, OnDestroy {
    @ViewChild('chartContainer') chartContainer!: ElementRef;

    private chart!: IChartApi;
    private candleSeries!: ISeriesApi<'Candlestick'>;
    private predictionSeries!: ISeriesApi<'Line'>;
    private matchSeries: ISeriesApi<'Line'>[] = [];

    // 95% 신뢰구간 (외부 구름대)
    private area95UpperSeries!: ISeriesApi<'Area'>;
    private area95LowerSeries!: ISeriesApi<'Area'>;

    // 68% 신뢰구간 (내부 구름대)
    private area68UpperSeries!: ISeriesApi<'Area'>;
    private area68LowerSeries!: ISeriesApi<'Area'>;

    private isInitialized = signal(false);

    private resizeObserver?: ResizeObserver;

    data = input<PredictionResult | null>(null);

    constructor() {
        effect(() => {
            const result = this.data();
            const initialized = this.isInitialized();
            if (result && initialized && this.candleSeries) {
                this.renderData(result);
            }
        });
    }

    ngAfterViewInit() {
        this.initChart();
        this.setupResizeObserver();
        this.isInitialized.set(true);
    }

    private setupResizeObserver() {
        // ResizeObserver를 사용하여 컨테이너 크기 변경 감지
        this.resizeObserver = new ResizeObserver(() => {
            if (this.chart && this.chartContainer) {
                const container = this.chartContainer.nativeElement;
                this.chart.applyOptions({
                    width: container.clientWidth,
                    height: container.clientHeight,
                });
            }
        });

        this.resizeObserver.observe(this.chartContainer.nativeElement);
    }

    private initChart() {
        this.chart = createChart(this.chartContainer.nativeElement, {
            layout: {
                background: { type: 'solid' as any, color: 'transparent' },
                textColor: '#4E5968'
            },
            grid: { vertLines: { color: '#F2F4F6' }, horzLines: { color: '#F2F4F6' } },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false },
        });

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
            upColor: '#ef5350', downColor: '#26a69a', borderVisible: false,
            wickUpColor: '#ef5350', wickDownColor: '#26a69a',
        });

        // 95% 신뢰구간 하한 (가장 아래)
        this.area95LowerSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(49, 130, 246, 0.15)',
            bottomColor: 'rgba(49, 130, 246, 0.05)',
            lineColor: 'rgba(49, 130, 246, 0.4)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 95% 신뢰구간 상한
        this.area95UpperSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(49, 130, 246, 0.15)',
            bottomColor: 'rgba(49, 130, 246, 0.05)',
            lineColor: 'rgba(49, 130, 246, 0.4)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 68% 신뢰구간 하한
        this.area68LowerSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(49, 130, 246, 0.25)',
            bottomColor: 'rgba(49, 130, 246, 0.12)',
            lineColor: 'rgba(49, 130, 246, 0.5)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 68% 신뢰구간 상한
        this.area68UpperSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(49, 130, 246, 0.25)',
            bottomColor: 'rgba(49, 130, 246, 0.12)',
            lineColor: 'rgba(49, 130, 246, 0.5)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 평균 예측선 (굵은 실선)
        this.predictionSeries = this.chart.addSeries(LineSeries, {
            color: '#ff6b6b',
            lineWidth: 3,
            priceLineVisible: false,
            lastValueVisible: true,
        });
    }

    private clearProbabilityCloud() {
        this.matchSeries.forEach(series => this.chart.removeSeries(series));
        this.matchSeries = [];
    }

    // 다음 거래일 계산 (주말 건너뛰기)
    private getNextTradingDay(timestamp: number, daysToAdd: number): number {
        let currentDate = new Date(timestamp * 1000);
        let addedDays = 0;

        while (addedDays < daysToAdd) {
            currentDate.setDate(currentDate.getDate() + 1);
            const dayOfWeek = currentDate.getDay();
            // 주말이 아니면 카운트
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                addedDays++;
            }
        }

        return Math.floor(currentDate.getTime() / 1000);
    }

    private renderData(result: PredictionResult) {
        console.log('📊 Rendering chart data:', {
            historyLength: result.history.length,
            scenarioLength: result.scenario.length,
            matchesCount: result.matches.length,
            scenario: result.scenario,
            confidence95Upper: result.confidence95Upper,
            confidence95Lower: result.confidence95Lower
        });

        this.candleSeries.setData(result.history as any);

        // Note: setMarkers is not available in all versions of lightweight-charts
        // The "Future Estimate" label in the overlay serves the same purpose
        /*
        const lastCandle = result.history[result.history.length - 1];
        (this.candleSeries as any).setMarkers([
            {
                time: lastCandle.time as any,
                position: 'aboveBar',
                color: '#3182F6',
                shape: 'arrowDown',
                text: '미래 예측 시작',
                size: 1
            }
        ]);
        */

        // 이전 확률 구름 제거
        this.clearProbabilityCloud();

        // 예측 데이터 시각화
        const hasValidScenario = result.scenario.length > 0 && result.scenario.some(v => v !== 0);
        if (hasValidScenario) {
            const lastCandle = result.history[result.history.length - 1];
            const lastTime = lastCandle.time as number;

            // 1. 확률 구름: 각 매칭 패턴을 투명도로 표시
            result.matches.forEach((match) => {
                const lineSeries = this.chart.addSeries(LineSeries, {
                    color: `rgba(66, 133, 244, ${match.opacity * 0.4})`,
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                const futureSeriesData = [
                    { time: lastTime as any, value: lastCandle.close },
                    ...match.future.map((price, i) => ({
                        time: this.getNextTradingDay(lastTime, i + 1) as any,
                        value: price
                    }))
                ];
                lineSeries.setData(futureSeriesData);
                this.matchSeries.push(lineSeries);
            });

            // 2. 메인 예측 시나리오 (굵은 선)
            const predictionData = [
                { time: lastTime as any, value: lastCandle.close },
                ...result.scenario.map((price, i) => ({
                    time: this.getNextTradingDay(lastTime, i + 1) as any,
                    value: price
                }))
            ];
            this.predictionSeries.setData(predictionData);

            // 3. 신뢰구간 렌더링
            const area95UpperData = [
                { time: lastTime as any, value: lastCandle.close },
                ...result.confidence95Upper.map((price, i) => ({
                    time: this.getNextTradingDay(lastTime, i + 1) as any,
                    value: price
                }))
            ];
            this.area95UpperSeries.setData(area95UpperData);

            const area95LowerData = [
                { time: lastTime as any, value: lastCandle.close },
                ...result.confidence95Lower.map((price, i) => ({
                    time: this.getNextTradingDay(lastTime, i + 1) as any,
                    value: price
                }))
            ];
            this.area95LowerSeries.setData(area95LowerData);

            const area68UpperData = [
                { time: lastTime as any, value: lastCandle.close },
                ...result.confidence68Upper.map((price, i) => ({
                    time: this.getNextTradingDay(lastTime, i + 1) as any,
                    value: price
                }))
            ];
            this.area68UpperSeries.setData(area68UpperData);

            const area68LowerData = [
                { time: lastTime as any, value: lastCandle.close },
                ...result.confidence68Lower.map((price, i) => ({
                    time: this.getNextTradingDay(lastTime, i + 1) as any,
                    value: price
                }))
            ];
            this.area68LowerSeries.setData(area68LowerData);
        } else {
            this.predictionSeries.setData([]);
            this.area95UpperSeries.setData([]);
            this.area95LowerSeries.setData([]);
            this.area68UpperSeries.setData([]);
            this.area68LowerSeries.setData([]);
        }

        // 최근 1년 데이터만 표시 (예측 포함)
        const lastTime = result.history[result.history.length - 1].time as number;
        const oneYearAgo = lastTime - (365 * 86400); // 1년 전
        const futureEnd = this.getNextTradingDay(lastTime, result.scenario.length + 10); // 여유 여백 추가

        this.chart.timeScale().setVisibleRange({
            from: oneYearAgo as any,
            to: futureEnd as any,
        });
    }

    ngOnDestroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.chart) {
            this.chart.remove();
        }
    }
}
