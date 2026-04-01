/** Angular Imports */
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Local Imports */
import { SupabaseService } from '@core';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="space-y-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <h1 class="page-title">Admin</h1>
          <p class="mt-1 max-w-3xl text-sm text-white/60">
            Verify access, launch import workflows, and manage privileged Ops Core setup tasks.
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/45">
            <span class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
              Role-gated
            </span>
            <span class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
              Admin tools
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button class="btn-modern btn-primary" (click)="checkAccess()" [disabled]="isLoading() || !isBrowser()">
            @if (isLoading()) {
              Checking…
            } @else {
              Check access
            }
          </button>

          <a routerLink="/admin/import" class="btn-modern btn-secondary">
            Open import
          </a>
        </div>
      </div>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div class="card-modern p-4 md:p-5">
          <div class="table-toolbar-modern">
            <div>
              <div class="text-sm font-bold text-white/80">Access status</div>
              <div class="mt-1 text-xs text-white/45">
                Source <span class="font-semibold text-white/65">auth + public.profiles</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold text-white/45">
              <span class="table-chip">Admin only</span>
              @if (!isBrowser()) {
                <span class="table-chip">SSR</span>
              } @else {
                <span class="table-chip">Browser</span>
              }
            </div>
          </div>

          @if (!isBrowser()) {
            <div class="panel-modern mt-4">
              <p class="text-sm font-semibold text-white/75">SSR render</p>
              <p class="mt-1 text-sm text-white/60">Access checks run in the browser only.</p>
            </div>
          } @else {
            @if (errorText()) {
              <div class="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p class="text-sm font-bold text-red-200">Check failed</p>
                <p class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">{{ errorText() }}</p>
              </div>
            }

            @if (infoText()) {
              <div class="panel-modern mt-4">
                <p class="text-sm font-semibold text-white/80">Result</p>
                <p class="mt-1 whitespace-pre-wrap text-sm text-white/60">{{ infoText() }}</p>
              </div>
            }

            <div class="mt-4 grid gap-3 md:grid-cols-3">
              <div class="readonly-field">
                <span class="readonly-label">Seeded admin</span>
                <div class="readonly-value">admin@ntv360.local</div>
              </div>

              <div class="readonly-field">
                <span class="readonly-label">Seeded ops</span>
                <div class="readonly-value">ops@ntv360.local</div>
              </div>

              <div class="readonly-field">
                <span class="readonly-label">Seeded readonly</span>
                <div class="readonly-value">readonly@ntv360.local</div>
              </div>
            </div>

            <div class="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p class="text-sm font-semibold text-emerald-200">Local credential set</p>
              <p class="mt-1 text-sm text-emerald-100/80">
                All seeded local accounts use password <span class="font-semibold">OpsCore123</span>.
              </p>
            </div>
          }
        </div>

        <div class="card-modern p-4 md:p-5">
          <div class="text-sm font-bold text-white/80">Quick actions</div>
          <p class="mt-1 text-sm text-white/60">
            Common admin routes and setup shortcuts.
          </p>

          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <a routerLink="/admin/import" class="btn-modern btn-secondary justify-start">
              Bootstrap Import →
            </a>
            <a routerLink="/installations" class="btn-modern btn-secondary justify-start">
              Install Queue →
            </a>
            <a routerLink="/incidents" class="btn-modern btn-secondary justify-start">
              Incident Queue →
            </a>
            <a routerLink="/players" class="btn-modern btn-secondary justify-start">
              Players →
            </a>
          </div>
        </div>
      </div>

      <div class="card-modern p-4 md:p-5">
        <div class="table-toolbar-modern">
          <div>
            <div class="text-sm font-bold text-white/80">Bootstrap import</div>
            <div class="mt-1 text-xs text-white/45">
              Import workspace readiness and current scope
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold text-white/45">
            <span class="table-chip">Dry-run ready</span>
            <span class="table-chip">Backend pending</span>
          </div>
        </div>

        <div class="mt-4 grid gap-3 lg:grid-cols-2">
          <div class="readonly-field">
            <span class="readonly-label">Frontend file picker</span>
            <div class="readonly-value">Available</div>
          </div>

          <div class="readonly-field">
            <span class="readonly-label">CSV dry-run preview</span>
            <div class="readonly-value">Available</div>
          </div>

          <div class="readonly-field">
            <span class="readonly-label">Validation issues</span>
            <div class="readonly-value">Shown before import</div>
          </div>

          <div class="readonly-field">
            <span class="readonly-label">XLSX / backend import</span>
            <div class="readonly-value">Still needs wiring</div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <a routerLink="/admin/import" class="btn-modern btn-primary">
            Open import workspace
          </a>
        </div>
      </div>
    </section>
  `,
})
export class AdminPageComponent {
  private readonly supabase = inject(SupabaseService);

  readonly isLoading = signal<boolean>(false);
  readonly errorText = signal<string>('');
  readonly infoText = signal<string>('');

  isBrowser(): boolean {
    return this.supabase.isBrowser();
  }

  async checkAccess(): Promise<void> {
    this.errorText.set('');
    this.infoText.set('');

    if (!this.supabase.isBrowser()) return;

    this.isLoading.set(true);

    try {
      const client = this.supabase.client();
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        this.infoText.set('Not signed in. Go to /login.');
        return;
      }

      const { data: profile, error } = await client
        .from('profiles')
        .select('role')
        .maybeSingle();

      if (error) {
        this.errorText.set(error.message);
        return;
      }

      const role = profile?.role ?? '';

      if (!role) {
        this.infoText.set(
          `Signed in as ${session.user.email ?? '(no email)'} but not provisioned in public.profiles.`,
        );
        return;
      }

      this.infoText.set(
        `Signed in as ${session.user.email ?? '(no email)'} with role ${role}.`,
      );
    } catch (error: unknown) {
      this.errorText.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
