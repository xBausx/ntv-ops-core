/** Angular Imports */
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Third Party Imports */
import { Button, Card } from '@ntv360/component-pantry';

/** Local Imports */
import { SupabaseService } from '@core';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [Card, Button, RouterLink],
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
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div class="text-sm font-extrabold text-white/80">Access status</div>
              <div class="mt-1 text-sm text-white/60">
                Confirms you're signed in and provisioned via
                <span class="font-semibold">public.profiles</span>.
              </div>
            </div>
            <ntv-button (click)="checkAccess()" [disabled]="isLoading() || !isBrowser()">
              @if (isLoading()) {
                Checking…
              } @else {
                Check
              }
            </ntv-button>
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
              <div class="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p class="text-sm font-semibold text-white/80">Result</p>
                <p class="mt-1 whitespace-pre-wrap text-sm text-white/60">{{ infoText() }}</p>
              </div>
            }

            <div class="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p class="text-sm font-semibold text-white/80">Dev provisioning</p>
              <p class="mt-1 text-sm text-white/60">
                If you're signed in but not provisioned, add a role row in Supabase Studio:
              </p>
              <pre class="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70"><code>insert into public.profiles (user_id, role) values ('&lt;auth.users.id&gt;', 'ADMIN');</code></pre>
            </div>
          }
        </div>
      </ntv-card>

      <!-- Bootstrap import -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">Bootstrap import</div>
          <p class="mt-1 text-sm text-white/60">
            Open the import workspace to validate legacy installation-tracker source files before backend import is wired.
          </p>
          <div class="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
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
                class="inline-flex items-center rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5
                       text-sm font-semibold text-white/85 transition hover:border-white/20
                       hover:bg-white/[0.10] hover:text-white"
              >
                Open Bootstrap Import →
              </a>
            </div>
          </div>
        </div>
      </ntv-card>

      <!-- Quick links -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">Quick links</div>
          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <a
              routerLink="/admin/import"
              class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold
                     text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Bootstrap Import →
            </a>
            <a
              routerLink="/installations"
              class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold
                     text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Install Queue →
            </a>
            <a
              routerLink="/incidents"
              class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold
                     text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Incident Queue →
            </a>
            <a
              routerLink="/players"
              class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold
                     text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Players →
            </a>
          </div>
        </div>
      </ntv-card>
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