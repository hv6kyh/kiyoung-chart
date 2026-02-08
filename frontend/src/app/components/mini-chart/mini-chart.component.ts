import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, OnChanges, SimpleChanges, HostBinding } from '@angular/core';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
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
    @Input() minimal: boolean = false;
    @Input() autoWidth: boolean = false;

    @HostBinding('style.width') get hostWidth() {
        return this.autoWidth ? '100%' : `${this.width}px`;
    }
    @HostBinding('style.height.px') get hostHeight() { return this.height; }
    @HostBinding('style.display') display = 'block';

    private chart!: IChartApi;
    private candleSeries!: ISeriesApi<'Candlestick'>;

    ngAfterViewInit() {
        if (this.autoWidth) {
            const containerEl = this.chartContainer.nativeElement as HTMLElement;
            this.width = containerEl.clientWidth || this.width;
        }
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
                textColor: this.minimal ? 'transparent' : '#8B95A1',
                fontFamily: "'Noto Sans KR', 'Outfit', sans-serif",
            },
            grid: {
                vertLines: { visible: !this.minimal, color: '#F2F4F6' },
                horzLines: { visible: !this.minimal, color: '#F2F4F6' },
            },
            rightPriceScale: {
                visible: !this.minimal,
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                visible: !this.minimal,
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: this.minimal ? {
                vertLine: { visible: false },
                horzLine: { visible: false },
            } : {},
            handleScroll: !this.minimal,
            handleScale: !this.minimal,
            width: this.width,
            height: this.height,
        });

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
            upColor: '#ef5350',
            downColor: '#26a69a',
            borderVisible: !this.minimal,
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
