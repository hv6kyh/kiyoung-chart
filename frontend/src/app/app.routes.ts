import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { StockQnaComponent } from './pages/stock-qna/stock-qna.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    data: {
      title: '주린이 차트 - 주식 초보를 위한 패턴 분석 서비스',
      description:
        '근거 없는 추천 대신 5년치 빅데이터로 주가 패턴을 분석합니다. Pearson·Spearman 상관분석, DTW 알고리즘 기반 무료 차트 분석 도구.',
      keywords:
        '주린이,주식 초보,차트 분석,패턴 매칭,주가 예측,빅데이터,상관분석,DTW,캔들 차트,주식 투자',
    },
  },
  {
    path: 'chart',
    component: DashboardComponent,
    data: {
      title: '차트 분석 - 주린이 차트',
      description:
        '실시간 주가 데이터를 기반으로 과거 패턴과의 상관관계를 분석하여 예측 시나리오와 신뢰구간을 제공합니다.',
      keywords:
        '주가 분석,캔들 차트,패턴 매칭,신뢰구간,Pearson 상관계수,Spearman 상관계수,ATR,주가 예측',
    },
  },
  {
    path: 'stock-qna',
    component: StockQnaComponent,
    data: {
      title: '주식 무물보 - AI 주식 용어 Q&A | 주린이 차트',
      description:
        '골든크로스, PER, PBR 등 어려운 주식 용어를 AI가 초보자 눈높이에서 쉽고 빠르게 설명해드립니다.',
      keywords: '주식 용어,골든크로스,PER,PBR,주식 Q&A,주식 초보 질문,AI 주식 상담',
    },
  },
];
