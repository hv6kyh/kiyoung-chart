import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, OnChanges, SimpleChanges, HostBinding } from '@angular/core';
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
    @Input() width: number = 300;
    @Input() height: number = 150;

    @HostBinding('style.width.px') get hostWidth() { return this.width; }
    @HostBinding('style.height.px') get hostHeight() { return this.height; }
    @HostBinding('style.display') display = 'block';

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
                background: { type: 'solid' as any, color: '#ffffff' },
                textColor: '#4E5968'
            },
            grid: {
                vertLines: { color: '#E8EBF0' },
                horzLines: { color: '#E8EBF0' }
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.15, bottom: 0.15 }
            },
            timeScale: {
                borderVisible: false,
                visible: true,
                timeVisible: true,
                secondsVisible: false
            },
            width: this.width,
            height: this.height,
        });

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
            upColor: '#ef5350',
            downColor: '#26a69a',
            borderVisible: true,
            borderUpColor: '#ef5350',
            borderDownColor: '#26a69a',
            wickUpColor: '#ef5350',
            wickDownColor: '#26a69a',
            priceLineVisible: false,
            lastValueVisible: false,
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
