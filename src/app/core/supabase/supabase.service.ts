/** Angular Imports */
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/** Third Party Imports */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Local Imports */
import { environment } from '../../../environments/environment';

/**
 * Supabase client wrapper (browser-first).
 *
 * Notes:
 * - Uses anon key only (safe for client). Service-role must NEVER be used in-browser.
 * - SSR-safe: we only initialize the client in the browser to avoid storage/session issues on server render.
 * - For privileged operations (imports/role mgmt), use Edge Functions or server-side only.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);

  private _client: SupabaseClient | null = null;

  /** True when running in the browser (not SSR). */
  public isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /** Access the initialized Supabase client (browser only). */
  public client(): SupabaseClient {
    if (!this._client) {
      throw new Error(
        'Supabase client is not initialized. This is expected during SSR. Call client() only in the browser.',
      );
    }
    return this._client;
  }

  constructor() {
    if (!this.isBrowser()) {
      return;
    }

    this._client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
}