/** Angular Imports */
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/** Third Party Imports */
import { Button, Card } from '@ntv360/component-pantry';

/** Local Imports */
import { SupabaseService } from '@core';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [Card, Button, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-3rem)] flex items-center justify-center">
      <div class="w-full max-w-md">
        <ntv-card>
          <div class="p-6 space-y-5">
            <div>
              <div class="text-2xl font-extrabold tracking-tight">Sign in</div>
              <div class="mt-1 text-sm text-white/60">
                Ops Core uses Supabase Auth + RLS. You must sign in to load queues.
              </div>
            </div>

            @if (!isBrowser()) {
              <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                <p class="text-sm font-semibold text-white/70">SSR render</p>
                <p class="mt-1 text-sm text-white/60">
                  Sign-in runs in the browser only.
                </p>
              </div>
            } @else {
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-bold text-white/60 mb-1">Email</label>
                  <input
                    class="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                    placeholder="you@ntv360.com"
                    [value]="email()"
                    (input)="onEmail($event)"
                    autocomplete="email"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-white/60 mb-1">Password</label>
                  <input
                    class="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
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
                    <div class="mt-1 text-sm text-red-100/80 whitespace-pre-wrap">
                      {{ errorText() }}
                    </div>
                  </div>
                }

                <div class="flex items-center justify-between gap-3 pt-2">
                  <a
                    class="text-sm font-semibold text-white/60 hover:text-white transition"
                    routerLink="/installations"
                  >
                    Continue without signing in →
                  </a>

                  <ntv-button (click)="signIn()" [disabled]="isLoading() || !canSubmit()">
                    @if (isLoading()) { Signing in… } @else { Sign in }
                  </ntv-button>
                </div>

                <div class="rounded-xl border border-white/10 bg-white/5 p-4 mt-2">
                  <div class="text-xs font-bold text-white/50">Dev note</div>
                  <div class="mt-1 text-sm text-white/60">
                    After signing in, if queues show “permission denied”, your user likely has no role row in
                    <span class="font-semibold text-white/70">public.profiles</span>.
                    Add one in Supabase Studio SQL:
                  </div>
                  <pre class="mt-2 text-xs text-white/70 bg-black/40 border border-white/10 rounded-xl p-3 overflow-auto"><code>insert into public.profiles (user_id, role)
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

    if (!this.supabase.isBrowser()) {
      return;
    }

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
    } catch (e) {
      this.errorText.set(String(e));
    } finally {
      this.isLoading.set(false);
    }
  }
}