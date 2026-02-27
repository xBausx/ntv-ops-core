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
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Admin</h1>
        <p class="mt-1 text-sm text-white/60">
          Bootstrap imports, verify access, and manage Ops Core setup. (Privileged actions move to Edge Functions.)
        </p>
      </div>

      <!-- Access / provisioning -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm font-extrabold text-white/80">Access status</div>
              <div class="mt-1 text-sm text-white/60">
                Confirms you’re signed in and provisioned via <span class="font-semibold">public.profiles</span>.
              </div>
            </div>

            <ntv-button (click)="checkAccess()" [disabled]="isLoading() || !isBrowser()">
              Check
            </ntv-button>
          </div>

          @if (!isBrowser()) {
            <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p class="text-sm text-white/70 font-semibold">SSR render</p>
              <p class="mt-1 text-sm text-white/60">Checks run in the browser only.</p>
            </div>
          } @else {
            @if (errorText()) {
              <div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p class="text-sm font-bold text-red-200">Error</p>
                <p class="mt-1 text-sm text-red-100/80 whitespace-pre-wrap">{{ errorText() }}</p>
              </div>
            }

            @if (infoText()) {
              <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p class="text-sm font-semibold text-white/80">Result</p>
                <p class="mt-1 text-sm text-white/60 whitespace-pre-wrap">{{ infoText() }}</p>
              </div>
            }

            <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p class="text-sm font-semibold text-white/80">Dev provisioning</p>
              <p class="mt-1 text-sm text-white/60">
                If you’re signed in but not provisioned, add a role row in Supabase Studio:
              </p>
              <pre class="mt-3 text-xs text-white/70 bg-black/40 border border-white/10 rounded-xl p-3 overflow-auto"><code>insert into public.profiles (user_id, role)
values ('&lt;auth.users.id&gt;', 'ADMIN');</code></pre>
            </div>
          }
        </div>
      </ntv-card>

      <!-- XLSX import (placeholder) -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">XLSX import (bootstrap)</div>
          <p class="mt-1 text-sm text-white/60">
            Next: upload an XLSX/CSV export from the “Today Forward” workflow and import into:
            <span class="font-semibold">players</span>, <span class="font-semibold">work_items</span>,
            <span class="font-semibold">work_item_players</span>.
          </p>

          <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p class="text-sm text-white/70 font-semibold">Implementation plan</p>
            <ul class="mt-2 text-sm text-white/60 space-y-1 list-disc pl-5">
              <li>Frontend: file picker + dry-run preview</li>
              <li>Edge Function (service role): validate, upsert players, insert work items, link players</li>
              <li>Audit: insert WORK_ITEM_CREATED + STATUS_CHANGED handled by triggers</li>
            </ul>
          </div>
        </div>
      </ntv-card>

      <!-- Quick links -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="text-sm font-extrabold text-white/80">Quick links</div>
          <div class="mt-3 flex flex-wrap gap-2">
            <a routerLink="/installations" class="text-sm font-semibold text-white/70 hover:text-white underline">
              Install Queue →
            </a>
            <a routerLink="/incidents" class="text-sm font-semibold text-white/70 hover:text-white underline">
              Incident Queue →
            </a>
            <a routerLink="/players" class="text-sm font-semibold text-white/70 hover:text-white underline">
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

      const { data: profile, error } = await client.from('profiles').select('role').maybeSingle();

      if (error) {
        this.errorText.set(error.message);
        return;
      }

      const role = profile?.role ?? '';
      if (!role) {
        this.infoText.set(`Signed in as ${session.user.email ?? '(no email)'} but NOT provisioned (no profiles row).`);
        return;
      }

      this.infoText.set(`Signed in as ${session.user.email ?? '(no email)'} with role: ${role}.`);
    } catch (e) {
      this.errorText.set(String(e));
    } finally {
      this.isLoading.set(false);
    }
  }
}