import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from 'lightweight-charts';
import { OHLC } from '../../types/stock.types';

@Component({
    selector: 'app-mini-chart',
    standalone: true,
    templateUrl: './mini-chart.component.html',
    styleUrls: ['./mini-chart.component.css']
})
export class MiniChartComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ViewChild('chartContainer') chartContainer!: ElementRef;
    @Input() data: OHLC[] = [];

    private chart!: IChartApi;
    private candleSeries!: ISeriesApi<'Candlestick'>;

    ngAfterViewInit() {
        this.initChart();
        if (this.data && this.data.length > 0) {
            this.renderData();
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['data'] && !changes['data'].firstChange && this.candleSeries) {
            this.renderData();
        }
    }

    private initChart() {
        this.chart = createChart(this.chartContainer.nativeElement, {
            layout: {
                background: { type: 'solid' as any, color: 'transparent' },
                textColor: '#d1d4dc'
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.3)' }
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.1 }
            },
            timeScale: {
                borderVisible: false,
                visible: true,
                timeVisible: false,
                secondsVisible: false
            },
            width: 300,
            height: 150,
        });

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
            upColor: '#ef5350',
            downColor: '#26a69a',
            borderVisible: false,
            wickUpColor: '#ef5350',
            wickDownColor: '#26a69a',
        });
    }

    private renderData() {
        if (this.data && this.data.length > 0) {
            this.candleSeries.setData(this.data as any);
            this.chart.timeScale().fitContent();
        }
    }

    ngOnDestroy() {
        if (this.chart) this.chart.remove();
    }
}
