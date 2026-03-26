/** Angular Imports */
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

/** Local Imports */
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Authentication service backed by the current Supabase browser session.
 *
 * This service intentionally preserves the existing synchronous `checkAuthStatus()`
 * shape for compatibility with remaining guards while removing the old
 * sessionStorage-based auth truth.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  private readonly _isAuthenticated = signal<boolean>(false);

  public readonly isAuthenticated = this._isAuthenticated.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const client = this.supabase.client();

    client.auth.onAuthStateChange((_event, session) => {
      this._isAuthenticated.set(!!session);
    });

    void this.refreshAuthState();
  }

  /**
   * Returns the current in-memory auth state and refreshes it from Supabase in the background.
   *
   * This preserves the existing synchronous guard API while shifting auth truth
   * to the real Supabase session.
   */
  public checkAuthStatus(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    void this.refreshAuthState();
    return this._isAuthenticated();
  }

  /**
   * Compatibility shim for older callers.
   *
   * The app no longer persists arbitrary auth tokens in sessionStorage.
   * Successful authentication is owned by Supabase Auth.
   */
  public setAuthenticated(_token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    void this.refreshAuthState();
  }

  /**
   * Clears local auth state and signs out from Supabase.
   */
  public clearAuthentication(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this._isAuthenticated.set(false);
    void this.supabase.client().auth.signOut();
  }

  private async refreshAuthState(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client().auth.getSession();
      const isAuthenticated = !error && !!data.session;
      this._isAuthenticated.set(isAuthenticated);
      return isAuthenticated;
    } catch {
      this._isAuthenticated.set(false);
      return false;
    }
  }
}