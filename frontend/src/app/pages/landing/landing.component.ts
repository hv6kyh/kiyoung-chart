import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
    version = 'v0.2';
    private analytics = inject(AnalyticsService);

    /* ── animated counters ── */
    matchRate = 0;
    matchCount = 0;
    dataYears = 0;
    patternCount = 0;

    private readonly targets = {
        matchRate: 94.8,
        matchCount: 1240,
        dataYears: 5,
        patternCount: 380000,
    };

    /* ── chat demo ── */
    chatMessages: { type: 'bot' | 'user'; content: string; visible: boolean }[] = [
        {
            type: 'bot',
            content: '안녕하세요! 주식 용어나 지표에 대해 무엇이든 물어보세요.',
            visible: false,
        },
        { type: 'user', content: '골든크로스가 뭔가요?', visible: false },
        {
            type: 'bot',
            content:
                '골든크로스는 단기 이동평균선(예: 50일)이 장기 이동평균선(예: 200일)을 아래에서 위로 돌파하는 시점이에요. 상승 추세 전환의 강력한 신호로 해석됩니다! 📈',
            visible: false,
        },
    ];

    private observer!: IntersectionObserver;
    private rafIds: number[] = [];
    private statsAnimated = false;
    private chatAnimated = false;

    /* ── lifecycle ── */

    ngAfterViewInit() {
        this.initScrollObserver();
    }

    ngOnDestroy() {
        this.observer?.disconnect();
        this.rafIds.forEach((id) => cancelAnimationFrame(id));
    }

    /* ── scroll-triggered reveals ── */

    private initScrollObserver() {
        this.observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.classList.add('in-view');
                    const section = entry.target.getAttribute('data-section') || entry.target.className;
                    this.analytics.capture('landing_section_viewed', { section });

                    if (entry.target.classList.contains('stats-trigger') && !this.statsAnimated) {
                        this.statsAnimated = true;
                        this.runCounters();
                    }
                    if (entry.target.classList.contains('chat-trigger') && !this.chatAnimated) {
                        this.chatAnimated = true;
                        this.revealChat();
                    }
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
        );

        requestAnimationFrame(() => {
            document.querySelectorAll('.scroll-reveal').forEach((el) => this.observer.observe(el));
        });
    }

    /* ── counter animation (ease-out cubic) ── */

    private runCounters() {
        this.tweenTo('matchRate', this.targets.matchRate, 2200, 1);
        this.tweenTo('matchCount', this.targets.matchCount, 2200, 0);
        this.tweenTo('dataYears', this.targets.dataYears, 1600, 0);
        this.tweenTo('patternCount', this.targets.patternCount, 2800, 0);
    }

    private tweenTo(prop: string, target: number, duration: number, decimals: number) {
        const t0 = performance.now();
        const step = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const v = ease * target;
            (this as any)[prop] = decimals ? +v.toFixed(decimals) : Math.floor(v);
            if (p < 1) this.rafIds.push(requestAnimationFrame(step));
        };
        this.rafIds.push(requestAnimationFrame(step));
    }

    /* ── chat message reveal ── */

    private revealChat() {
        this.chatMessages.forEach((m, i) => setTimeout(() => (m.visible = true), i * 900));
    }
}
