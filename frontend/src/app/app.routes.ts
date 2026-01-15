import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LandingComponent } from './pages/landing/landing.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { StockQnaComponent } from './pages/stock-qna/stock-qna.component';

export const routes: Routes = [
    {
        path: '',
        component: LandingComponent
    },
    {
        path: 'chart',
        component: DashboardComponent
    },
    {
        path: 'stock-qna',
        component: StockQnaComponent
    },
    {
        path: 'stocks/add',
        component: class DummyComponent { },
        canActivate: [authGuard]
    }
];
