import { Injectable, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  private defaultTitle = '주린이 차트 - 주식 패턴 분석 서비스';
  private defaultDescription =
    '주식 투자 초보자를 위한 차트 패턴 분석 서비스. 5년치 빅데이터 기반 패턴 매칭으로 객관적인 예측 시나리오를 제공합니다.';
  private baseUrl = 'https://junior-chart.vercel.app';

  init(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.updateMetaTags();
      });

    // Initial update on service init
    this.updateMetaTags();
  }

  private updateMetaTags(): void {
    // Walk the activated route tree to the leaf child
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }

    // Extract data from route
    const data = route.snapshot.data;
    const title = data['title'] || this.defaultTitle;
    const description = data['description'] || this.defaultDescription;
    const keywords = data['keywords'] || '';
    const currentUrl = this.baseUrl + this.router.url;

    // Update title
    this.title.setTitle(title);

    // Update meta tags
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: keywords });

    // Open Graph tags
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: currentUrl });

    // Update canonical link
    this.updateCanonicalUrl(currentUrl);
  }

  private updateCanonicalUrl(url: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Remove existing canonical link if present
    const existingLink = document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.remove();
    }

    // Create and append new canonical link
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    document.head.appendChild(link);
  }
}
