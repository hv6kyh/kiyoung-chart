import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { UIStateService } from '../../services/ui-state.service';
import { MiniChartComponent } from '../mini-chart/mini-chart.component';

@Component({
    selector: 'app-match-detail-modal',
    standalone: true,
    imports: [CommonModule, MiniChartComponent, LucideAngularModule],
    templateUrl: './match-detail-modal.component.html',
    styleUrls: ['./match-detail-modal.component.css']
})
export class MatchDetailModalComponent {
    constructor(public uiService: UIStateService) { }
}
