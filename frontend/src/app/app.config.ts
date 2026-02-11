import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import {
  LUCIDE_ICONS, LucideIconProvider,
  TrendingUp, Bell, Settings, LogOut,
  Info, ChevronLeft, ChevronRight, Plus,
  Activity, MessageCircle, HelpCircle, ArrowRight,
  X, Calendar, Lightbulb,
} from 'lucide-angular';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

const icons = {
  TrendingUp, Bell, Settings, LogOut,
  Info, ChevronLeft, ChevronRight, Plus,
  Activity, MessageCircle, HelpCircle, ArrowRight,
  X, Calendar, Lightbulb,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
    provideClientHydration(withEventReplay()),
  ]
};
