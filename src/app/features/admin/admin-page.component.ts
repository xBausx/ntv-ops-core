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
    <section class="space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Admin</div>
          <h1 class="mt-1 page-title">Ops Core Admin</h1>
          <p class="mt-1 max-w-3xl text-sm text-white/60">
            Bootstrap imports, verify access, and manage Ops Core setup. Privileged actions move to Edge Functions.
          </p>
        </div>
      </div>

      <!-- Access / provisioning -->
      <div class="card-modern overflow-hidden">
        <div class="p-4 md:p-5">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div class="text-sm font-extrabold text-white/80">Access status</div>
              <div class="mt-1 text-sm text-white/60">
                Confirms you're signed in and provisioned via
                <span class="font-semibold">public.profiles</span>.
              </div>
            </div>
            <button class="btn-modern btn-secondary" (click)="checkAccess()" [disabled]="isLoading() || !isBrowser()">
              @if (isLoading()) {
                Checking…
              } @else {
                Check
              }
            </button>
          </div>

          @if (!isBrowser()) {
            <div class="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-sm font-semibold text-white/75">SSR render</p>
              <p class="mt-1 text-sm text-white/60">Checks run in the browser only.</p>
            </div>
          } @else {
            @if (errorText()) {
              <div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p class="text-sm font-bold text-red-200">Error</p>
                <p class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">{{ errorText() }}</p>
              </div>
            }

            @if (infoText()) {
              <div class="mt-4 panel-modern">
              <p class="text-sm font-semibold text-white/80">Result</p>
                <p class="mt-1 whitespace-pre-wrap text-sm text-white/60">{{ infoText() }}</p>
              </div>
            }

            <div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p class="text-sm font-semibold text-emerald-200">Local seeded access</p>
              <p class="mt-1 text-sm text-emerald-100/80">
                Local reset now seeds provisioned accounts. Use <span class="font-semibold">admin@ntv360.local</span>, <span class="font-semibold">ops@ntv360.local</span>, or <span class="font-semibold">readonly@ntv360.local</span> with password <span class="font-semibold">OpsCore123</span>.
              </p>
            </div>
          }
        </div>
      </div>

      <!-- Bootstrap import -->
      <div class="card-modern overflow-hidden">
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">Bootstrap import</div>
          <p class="mt-1 text-sm text-white/60">
            Open the import workspace to validate legacy installation-tracker source files before backend import is wired.
          </p>
          <div class="mt-4 panel-modern">
            <p class="text-sm font-semibold text-white/75">Current status</p>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-white/60">
              <li>Frontend file picker is available</li>
              <li>CSV dry-run preview is available</li>
              <li>Validation issues and normalized preview rows are shown before import</li>
              <li>XLSX/XLS parsing and backend import action still need to be wired</li>
            </ul>
            <div class="mt-4 flex flex-wrap gap-2">
              <a
                routerLink="/admin/import"
                class="btn-modern btn-secondary"
              >
                Open Bootstrap Import →
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick links -->
      <div class="card-modern overflow-hidden">
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">Quick links</div>
          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <a
              routerLink="/admin/import"
              class="btn-modern btn-secondary justify-start"
            >
              Bootstrap Import →
            </a>
            <a
              routerLink="/installations"
              class="btn-modern btn-secondary justify-start"
            >
              Install Queue →
            </a>
            <a
              routerLink="/incidents"
              class="btn-modern btn-secondary justify-start"
            >
              Incident Queue →
            </a>
            <a
              routerLink="/players"
              class="btn-modern btn-secondary justify-start"
            >
              Players →
            </a>
          </div>
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
          `Signed in as ${session.user.email ?? '(no email)'} but NOT provisioned (no profiles row).`,
        );
        return;
      }

      this.infoText.set(
        `Signed in as ${session.user.email ?? '(no email)'} with role: ${role}.`,
      );
    } catch (error: unknown) {
      this.errorText.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}