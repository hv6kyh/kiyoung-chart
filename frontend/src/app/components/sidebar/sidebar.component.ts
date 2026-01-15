import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionResult, PredictionMatch } from '../../types/stock.types';
import { MiniChartComponent } from '../mini-chart/mini-chart.component';
import { UIStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MiniChartComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  data = input<PredictionResult | null>(null);
  hoveredMatch = signal<PredictionMatch | null>(null);
  tooltipY = signal<number>(0);

  avgSimilarity = computed(() => {
    const result = this.data();
    if (!result || result.matches.length === 0) return 0;
    const sum = result.matches.reduce((acc, m) => acc + m.correlation, 0);
    return (sum / result.matches.length) * 100;
  });

  totalMatches = computed(() => {
    const result = this.data();
    return result?.matches.length || 0;
  });

  rsiAnalysis = computed(() => {
    return this.data()?.integratedAnalysis || null;
  });

  rsiStatusDisplay = computed(() => {
    const analysis = this.rsiAnalysis();
    if (!analysis) return '분석 중...';
    if (analysis.status === '과매수') return '과매수(70↑)';
    if (analysis.status === '과매도') return '과매도(30↓)';
    return '중립';
  });

  momentumSignal = computed(() => {
    const analysis = this.rsiAnalysis();
    if (!analysis) return '대기 중';
    if (analysis.divergence_type === 'Bullish') return '상승 다이버전스 포착';
    if (analysis.divergence_type === 'Bearish') return '하락 다이버전스 포착';
    return '정상 신호';
  });

  confidenceScore = computed(() => {
    return this.data()?.integratedAnalysis?.confidence_score || 0;
  });

  confidenceLevel = computed(() => {
    const score = this.confidenceScore();
    if (score >= 80) return '(매우 높음)';
    if (score >= 60) return '(높음)';
    if (score >= 40) return '(보통)';
    return '(낮음)';
  });

  constructor(public uiService: UIStateService) { }

  openProof(match: PredictionMatch) {
    this.uiService.openMatchDetail(match);
  }

  onMatchHover(event: MouseEvent, match: PredictionMatch | null) {
    this.hoveredMatch.set(match);
    if (event && event.currentTarget) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const parentRect = (event.currentTarget as HTMLElement).closest('.sidebar-wrapper')?.getBoundingClientRect();
      if (parentRect) {
        this.tooltipY.set(rect.top - parentRect.top);
      }
    }
  }
}
