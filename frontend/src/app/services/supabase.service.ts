import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    this.client = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        autoRefreshToken: isBrowser,
        persistSession: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  }
}
