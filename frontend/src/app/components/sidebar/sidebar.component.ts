import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionResult, PredictionMatch, OHLC } from '../../types/stock.types';
import { MiniChartComponent } from '../mini-chart/mini-chart.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MiniChartComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  data = input<PredictionResult | null>(null);
  tooltipVisible = signal(false);
  tooltipData = signal<PredictionMatch | null>(null);
  tooltipPosition = signal({ x: 0, y: 0 });

  showTooltip(match: PredictionMatch, event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Position tooltip to the left of the match item
    this.tooltipPosition.set({
      x: rect.left - 330, // 300px width + 30px margin
      y: rect.top
    });

    this.tooltipData.set(match);
    this.tooltipVisible.set(true);
  }

  hideTooltip() {
    this.tooltipVisible.set(false);
    this.tooltipData.set(null);
  }

  diagnosisMessage = computed(() => {
    const res = this.data();
    if (!res || !res.history || res.history.length < 2) {
      return '데이터 분석 전입니다.';
    }

    const lastPrice = res.history[res.history.length - 1].close;
    const prevPrice = res.history[res.history.length - 2].close;

    if (lastPrice > prevPrice) {
      return '기영이가 기분이 좋아요! 머리카락이 솟구치고 있네요. 바나나가 더 필요할 것 같습니다.';
    } else {
      return '기영이가 눈물을 흘리고 있어요... 머리카락이 축 처졌네요. 잠시 관망할까요?';
    }
  });
}
