import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';
import posthog from 'posthog-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private initialized = false;
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);

    constructor() {}

    init(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        const { apiKey, apiHost } = environment.posthog;
        if (!apiKey) return;

        posthog.init(apiKey, {
            api_host: apiHost,
            capture_pageview: false,
            capture_pageleave: true,
            autocapture: true,
        });
        this.initialized = true;
        this.trackPageViews();
    }

    private trackPageViews(): void {
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => {
                posthog.capture('$pageview', { path: event.urlAfterRedirects });
            });
    }

    capture(event: string, properties?: Record<string, unknown>): void {
        if (!this.initialized) return;
        posthog.capture(event, properties);
    }

    identify(userId: string, traits?: Record<string, unknown>): void {
        if (!this.initialized) return;
        posthog.identify(userId, traits);
    }

    reset(): void {
        if (!this.initialized) return;
        posthog.reset();
    }
}
