import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionResult, PredictionMatch, OHLC } from '../../types/stock.types';
import { MiniChartComponent } from '../mini-chart/mini-chart.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MiniChartComponent],
  template: `
    <div class="sidebar-container glass">
      <section class="diagnosis-card card">
        <h3>기영이의 진단</h3>
        <div class="diagnosis-content">
          <div class="kiyoung-avatar">🍌</div>
          <p>{{ diagnosisMessage() }}</p>
        </div>
      </section>

      <section class="matches-card card">
        <h3>예측 근거 (Past Matches)</h3>
        <div class="matches-list">
          @for (match of data()?.matches; track match.date; let i = $index) {
            <div class="match-item glass-dark" 
                 (mouseenter)="showTooltip(match, $event)"
                 (mouseleave)="hideTooltip()">
              <span class="match-date">과거: {{ match.date }}</span>
              <span class="match-corr">종합 유사도: {{ (match.correlation * 100) | number:'1.1-1' }}%</span>
            </div>
          } @empty {
            <p class="empty-msg">데이터 분석 중...</p>
          }
        </div>
      </section>

      @if (tooltipVisible()) {
        <div class="tooltip-container" 
             [style.top.px]="tooltipPosition().y"
             [style.left.px]="tooltipPosition().x">
          <div class="tooltip-header">
            <span>{{ tooltipData()?.date }} 패턴</span>
          </div>
          <app-mini-chart [data]="tooltipData()?.windowData || []"></app-mini-chart>
        </div>
      }
    </div>
  `,
  styles: [`
    .sidebar-container { display: flex; flex-direction: column; gap: 20px; padding: 20px; color: white; height: 100%; position: relative; }
    .card { background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 15px; border: 1px solid rgba(255, 255, 255, 0.1); }
    .kiyoung-avatar { font-size: 40px; margin-bottom: 10px; }
    .match-item { 
      padding: 10px; 
      margin-bottom: 8px; 
      border-radius: 8px; 
      display: flex; 
      flex-direction: column; 
      font-size: 0.9rem; 
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .match-item:hover {
      background: rgba(33, 150, 243, 0.2);
      transform: translateX(5px);
    }
    .match-corr { color: #fbc02d; font-weight: bold; }
    .glass-dark { background: rgba(0, 0, 0, 0.3); }
    .tooltip-container {
      position: fixed;
      z-index: 1000;
      background: rgba(19, 23, 34, 0.98);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      pointer-events: none;
    }
    .tooltip-header {
      font-size: 0.85rem;
      color: #2196f3;
      margin-bottom: 8px;
      font-weight: 600;
    }
  `]
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
