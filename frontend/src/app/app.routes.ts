import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: 'stocks/add',
        component: class DummyComponent { }, // Dummy component because the guard will stop navigation anyway
        canActivate: [authGuard]
    }
];
