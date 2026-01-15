import { Component, input, signal } from '@angular/core';
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
