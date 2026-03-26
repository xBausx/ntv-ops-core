/** Angular Imports */
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/** Third Party Imports */
import { Button, Card } from '@ntv360/component-pantry';

/** Local Imports */
import { SupabaseService } from '@core';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [Card, Button],
  template: `
    <div class="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <div class="w-full max-w-md">
        <ntv-card>
          <div class="space-y-6 p-6 md:p-7">
            <div>
              <div class="text-2xl font-extrabold tracking-tight text-white">Sign in</div>
              <div class="mt-1 max-w-md text-sm text-white/60">
                Ops Core uses Supabase Auth + RLS. You must sign in to load queues.
              </div>
            </div>

            @if (!isBrowser()) {
              <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p class="text-sm font-semibold text-white/75">SSR render</p>
                <p class="mt-1 text-sm text-white/60">Sign-in runs in the browser only.</p>
              </div>
            } @else {
              <div class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Email</label>
                  <input
                    class="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06]"
                    placeholder="you@ntv360.com"
                    [value]="email()"
                    (input)="onEmail($event)"
                    autocomplete="email"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Password</label>
                  <input
                    class="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06]"
                    placeholder="••••••••"
                    type="password"
                    [value]="password()"
                    (input)="onPassword($event)"
                    autocomplete="current-password"
                  />
                </div>

                @if (errorText()) {
                  <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                    <div class="text-sm font-bold text-red-200">Sign-in failed</div>
                    <div class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">
                      {{ errorText() }}
                    </div>
                  </div>
                }

                <div class="flex items-center justify-end gap-3 pt-1">
                  <ntv-button (click)="signIn()" [disabled]="isLoading() || !canSubmit()">
                    @if (isLoading()) {
                      Signing in…
                    } @else {
                      Sign in
                    }
                  </ntv-button>
                </div>

                <div class="mt-1 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div class="text-xs font-bold uppercase tracking-wide text-white/45">Dev note</div>
                  <div class="mt-2 text-sm text-white/60">
                    After signing in, if queues show “permission denied”, your user likely has no role row in
                    <span class="font-semibold text-white/75">public.profiles</span>.
                    Add one in Supabase Studio SQL:
                  </div>
                  <pre class="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70"><code>insert into public.profiles (user_id, role)
values ('&lt;your-auth-users-id-uuid&gt;', 'ADMIN');</code></pre>
                </div>
              </div>
            }
          </div>
        </ntv-card>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly errorText = signal<string>('');
  readonly isLoading = signal<boolean>(false);

  isBrowser(): boolean {
    return this.supabase.isBrowser();
  }

  canSubmit(): boolean {
    return this.email().trim().length > 0 && this.password().trim().length > 0;
  }

  onEmail(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.email.set(input?.value ?? '');
  }

  onPassword(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.password.set(input?.value ?? '');
  }

  async signIn(): Promise<void> {
    this.errorText.set('');

    if (!this.supabase.isBrowser()) return;

    this.isLoading.set(true);

    try {
      const { error } = await this.supabase.client().auth.signInWithPassword({
        email: this.email().trim(),
        password: this.password(),
      });

      if (error) {
        this.errorText.set(error.message);
        return;
      }

      await this.router.navigateByUrl('/installations');
    } catch (error: unknown) {
      this.errorText.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}