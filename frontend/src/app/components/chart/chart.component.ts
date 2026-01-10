import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, effect, input } from '@angular/core';
import { createChart, IChartApi, ISeriesApi, LineStyle, CandlestickData, LineData, Time, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { PredictionResult, OHLC } from '../../types/stock.types';

@Component({
    selector: 'app-chart',
    standalone: true,
    template: `<div #chartContainer class="chart-container"></div>`,
    styles: [`
    .chart-container {
      width: 100%;
      height: 600px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `]
})
export class ChartComponent implements AfterViewInit, OnDestroy {
    @ViewChild('chartContainer') chartContainer!: ElementRef;

    private chart!: IChartApi;
    private candleSeries!: ISeriesApi<'Candlestick'>;
    private predictionSeries!: ISeriesApi<'Line'>;

    // 95% 신뢰구간 (외부 구름대)
    private area95UpperSeries!: ISeriesApi<'Area'>;
    private area95LowerSeries!: ISeriesApi<'Area'>;

    // 68% 신뢰구간 (내부 구름대)
    private area68UpperSeries!: ISeriesApi<'Area'>;
    private area68LowerSeries!: ISeriesApi<'Area'>;

    data = input<PredictionResult | null>(null);

    constructor() {
        effect(() => {
            const result = this.data();
            if (result && this.candleSeries) {
                this.renderData(result);
            }
        });
    }

    ngAfterViewInit() {
        this.initChart();
    }

    private initChart() {
        this.chart = createChart(this.chartContainer.nativeElement, {
            layout: {
                background: { type: 'solid' as any, color: 'transparent' },
                textColor: '#d1d4dc'
            },
            grid: { vertLines: { color: 'rgba(42, 46, 57, 0.5)' }, horzLines: { color: 'rgba(42, 46, 57, 0.5)' } },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false },
        });

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
            upColor: '#ef5350', downColor: '#26a69a', borderVisible: false,
            wickUpColor: '#ef5350', wickDownColor: '#26a69a',
        });

        // 95% 신뢰구간 하한 (가장 아래)
        this.area95LowerSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(33, 150, 243, 0.08)',
            bottomColor: 'rgba(33, 150, 243, 0.02)',
            lineColor: 'rgba(33, 150, 243, 0.25)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 95% 신뢰구간 상한
        this.area95UpperSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(33, 150, 243, 0.08)',
            bottomColor: 'rgba(33, 150, 243, 0.02)',
            lineColor: 'rgba(33, 150, 243, 0.25)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 68% 신뢰구간 하한
        this.area68LowerSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(33, 150, 243, 0.18)',
            bottomColor: 'rgba(33, 150, 243, 0.08)',
            lineColor: 'rgba(33, 150, 243, 0.35)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 68% 신뢰구간 상한
        this.area68UpperSeries = this.chart.addSeries(AreaSeries, {
            topColor: 'rgba(33, 150, 243, 0.18)',
            bottomColor: 'rgba(33, 150, 243, 0.08)',
            lineColor: 'rgba(33, 150, 243, 0.35)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 평균 예측선 (점선, 가장 위)
        this.predictionSeries = this.chart.addSeries(LineSeries, {
            color: 'rgba(255, 255, 255, 0.7)',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
        });
    }

    private renderData(result: PredictionResult) {
        this.candleSeries.setData(result.history as any);

        // 예측 데이터 시각화
        if (result.scenario.length > 0) {
            const lastPrice = result.history[result.history.length - 1];
            const lastTime = lastPrice.time;

            // 평균 예측선
            const predictionData = [
                { time: lastTime as any, value: lastPrice.close },
                ...result.scenario.map((price, i) => ({
                    time: ((lastTime as number) + (i + 1) * 86400) as any,
                    value: price
                }))
            ];
            this.predictionSeries.setData(predictionData);

            // 95% 신뢰구간 상한
            const area95UpperData = [
                { time: lastTime as any, value: lastPrice.close },
                ...result.confidence95Upper.map((price, i) => ({
                    time: ((lastTime as number) + (i + 1) * 86400) as any,
                    value: price
                }))
            ];
            this.area95UpperSeries.setData(area95UpperData);

            // 95% 신뢰구간 하한
            const area95LowerData = [
                { time: lastTime as any, value: lastPrice.close },
                ...result.confidence95Lower.map((price, i) => ({
                    time: ((lastTime as number) + (i + 1) * 86400) as any,
                    value: price
                }))
            ];
            this.area95LowerSeries.setData(area95LowerData);

            // 68% 신뢰구간 상한
            const area68UpperData = [
                { time: lastTime as any, value: lastPrice.close },
                ...result.confidence68Upper.map((price, i) => ({
                    time: ((lastTime as number) + (i + 1) * 86400) as any,
                    value: price
                }))
            ];
            this.area68UpperSeries.setData(area68UpperData);

            // 68% 신뢰구간 하한
            const area68LowerData = [
                { time: lastTime as any, value: lastPrice.close },
                ...result.confidence68Lower.map((price, i) => ({
                    time: ((lastTime as number) + (i + 1) * 86400) as any,
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

        this.chart.timeScale().fitContent();
    }

    ngOnDestroy() {
        if (this.chart) this.chart.remove();
    }
}
