/** Angular Imports */
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/** Third Party Imports */
import { Button, Card } from '@ntv360/component-pantry';

/** Local Imports */
import { SupabaseService } from '@core';

type SeedAccount = {
  label: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'OPS' | 'READ_ONLY';
};

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [Card, Button],
  template: `
    <div class="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <div class="w-full max-w-2xl">
        <ntv-card>
          <div class="space-y-6 p-6 md:p-7">
            <div>
              <div class="text-2xl font-extrabold tracking-tight text-white">Sign in</div>
              <div class="mt-1 max-w-2xl text-sm text-white/60">
                Ops Core uses Supabase Auth + RLS. Reset the local database once, then sign in with one of the seeded
                accounts below.
              </div>
            </div>

            @if (!isBrowser()) {
              <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p class="text-sm font-semibold text-white/75">SSR render</p>
                <p class="mt-1 text-sm text-white/60">Sign-in runs in the browser only.</p>
              </div>
            } @else {
              <div class="grid gap-3 md:grid-cols-3">
                @for (account of seedAccounts; track account.email) {
                  <button
                    type="button"
                    class="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
                    (click)="useSeedAccount(account)"
                  >
                    <div class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">{{ account.role }}</div>
                    <div class="mt-2 text-sm font-semibold text-white/80">{{ account.label }}</div>
                    <div class="mt-3 space-y-1 text-sm text-white/60">
                      <div>{{ account.email }}</div>
                      <div>Password: {{ account.password }}</div>
                    </div>
                    <div class="mt-4 text-xs font-semibold text-white/40">Click to fill the form</div>
                  </button>
                }
              </div>

              <div class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Email</label>
                  <input
                    class="input-modern w-full text-white"
                    placeholder="you@ntv360.com"
                    [value]="email()"
                    (input)="onEmail($event)"
                    autocomplete="email"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Password</label>
                  <input
                    class="input-modern w-full text-white"
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

                <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div class="text-xs font-bold uppercase tracking-wide text-white/45">Local dev flow</div>
                  <div class="mt-2 space-y-2 text-sm text-white/60">
                    <p>Run <span class="font-semibold text-white/75">npm run db:reset</span> once to seed local auth, roles, players, queues, and work history.</p>
                    <p>
                      If you just enabled seeding, restart the local Supabase stack so the updated
                      <span class="font-semibold text-white/75">supabase/config.toml</span> is applied.
                    </p>
                    <p>
                      Self-signup is still enabled for ad hoc testing, but newly created users will remain unprovisioned
                      until you add a matching <span class="font-semibold text-white/75">public.profiles</span> row.
                    </p>
                  </div>
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

  readonly email = signal<string>('admin@ntv360.local');
  readonly password = signal<string>('OpsCore123');
  readonly errorText = signal<string>('');
  readonly isLoading = signal<boolean>(false);

  readonly seedAccounts: SeedAccount[] = [
    {
      label: 'Local Admin',
      email: 'admin@ntv360.local',
      password: 'OpsCore123',
      role: 'ADMIN',
    },
    {
      label: 'Local Ops',
      email: 'ops@ntv360.local',
      password: 'OpsCore123',
      role: 'OPS',
    },
    {
      label: 'Local Read Only',
      email: 'readonly@ntv360.local',
      password: 'OpsCore123',
      role: 'READ_ONLY',
    },
  ];

  isBrowser(): boolean {
    return this.supabase.isBrowser();
  }

  canSubmit(): boolean {
    return this.email().trim().length > 0 && this.password().trim().length > 0;
  }

  useSeedAccount(account: SeedAccount): void {
    this.errorText.set('');
    this.email.set(account.email);
    this.password.set(account.password);
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
