import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button, Input, Table } from '@ntv360/component-pantry';

import { fetchInstallQueue, type InstallQueueRow } from '../../../core/supabase/ops-core.api';

@Component({
  selector: 'app-installations-page',
  standalone: true,
  imports: [RouterLink, FormsModule, Table, Input, Button],
  template: `
    <div class="min-h-screen bg-black text-white flex flex-col">
      <div class="w-full max-w-none mx-auto px-6 xl:px-10 2xl:px-12 py-6 flex flex-1 flex-col min-h-0">
        <div class="flex items-start justify-between gap-6">
          <div class="flex flex-col gap-2">
            <div class="inline-flex items-center gap-3">
              <span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600"></span>
              <span class="text-xs uppercase tracking-[0.22em] text-white/70">Ops Core</span>
            </div>

            <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Install Queue</h1>

            <p class="text-sm text-white/70 max-w-2xl">
              Spreadsheet replacement for “Today Forward” with saved views, strict statuses, and audit events.
            </p>
          </div>

          <a routerLink="/dashboard" class="text-sm font-semibold text-white/80 hover:text-white transition">
            Back to Launchpad →
          </a>
        </div>

        <div class="mt-6 flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
          <!-- Saved Views -->
          <div class="border border-white/10 bg-white/5 rounded-2xl p-6 xl:w-[360px] xl:shrink-0">
            <h2 class="text-base font-bold">Saved Views (MVP)</h2>
            <div class="mt-3 flex flex-wrap gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Today</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Tomorrow</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">This Week</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Blocked</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Unassigned</span>
            </div>

            <p class="mt-3 text-sm text-white/60">
              Backed by <span class="text-white">public.v_install_queue</span> (Supabase view).
            </p>

            @if (error()) {
              <div class="mt-4 text-xs text-red-200/90">
                {{ error() }}
              </div>
            }

            <div class="mt-5">
              <ntv-button variant="primary" size="sm" (click)="reload()">
                Refresh
              </ntv-button>
            </div>
          </div>

          <!-- Queue -->
          <div class="border border-white/10 bg-white/5 rounded-2xl p-6 flex flex-col flex-1 min-w-0 min-h-0">
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-base font-bold">Queue</h2>
              <span class="text-xs text-white/60">
                Source: <span class="text-white">public.v_install_queue</span>
              </span>
            </div>

            @if (isLoading()) {
              <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                Loading install queue…
              </div>
            } @else {
              @if (rows().length === 0) {
                <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                  No install work items found.
                </div>
              } @else {
                <!-- Quick Filter Bar -->
                <div class="mt-4 flex flex-col md:flex-row md:items-end gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-xs uppercase tracking-[0.18em] text-white/60">Quick Filter</div>
                      <ntv-input
                        class="mt-2 w-full"
                        type="text"
                        placeholder="Filter by license, hostname, dealer, site, status…"
                        [ngModel]="queryDraft()"
                        (ngModelChange)="onQueryDraftChange($event)"
                        ngDefaultControl
                      ></ntv-input>
                  </div>

                  @if (queryDraft().trim().length > 0) {
                    <ntv-button class="shrink-0" variant="primary" size="sm" (click)="clearSearch()">
                      Clear
                    </ntv-button>
                  }
                </div>

                <div class="mt-3 flex-1 min-h-0 rounded-xl border border-white/10 bg-black/30 p-2 overflow-hidden relative flex flex-col">
                  @if (filteredRows().length > 0) {
                    <ntv-table
                      class="w-full flex-1 min-h-0 block"
                      [columns]="columns()"
                      [data]="$any(filteredRows())"
                      [value]="$any(filteredRows())"
                      tableHeight="calc(100vh - 360px)"
                      (showMoreRequested)="onShowMore()"
                    ></ntv-table>
                  } @else {
                    <div class="flex-1 min-h-0 flex items-center justify-center">
                      <div class="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white/70">
                        No matches found.
                      </div>
                    </div>
                  }
                </div>

                <div class="mt-3 text-xs text-white/50 min-h-[16px]">
                  Showing {{ filteredRows().length }} / {{ rows().length }} row(s).
                  @if (query().trim().length > 0) { <span> Filter: “{{ query() }}”.</span> }
                  Click “Show More” to load more (simple paging for now).
                </div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class InstallationsPageComponent {
  // Keep widths only for the “small” fields; let the rest flex to use horizontal space.
  readonly columns = signal<any[]>([
    { field: 'scheduled_for', header: 'Scheduled', visible: true, width: '180px' },
    { field: 'status', header: 'Status', visible: true, width: '140px' },
    { field: 'priority', header: 'Priority', visible: true, width: '140px' },

    { field: 'primary_dealer_alias', header: 'Dealer', visible: true },
    { field: 'primary_site_alias', header: 'Site', visible: true },
    { field: 'primary_license_uuid', header: 'License UUID', visible: true },
    { field: 'primary_hostname', header: 'Hostname', visible: true },
  ]);

  readonly rows = signal<InstallQueueRow[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  private filterTimer: any = null;

  readonly queryDraft = signal<string>('');
  readonly query = signal<string>('');

  onQueryDraftChange(v: string): void {
    this.queryDraft.set(v);

    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.query.set(this.queryDraft());
    }, 150);
  }

  clearSearch(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.queryDraft.set('');
    this.query.set('');
  }

  readonly filteredRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.rows();

    return this.rows().filter((r: any) => {
      const hay = [
        r.work_id,
        r.scheduled_for,
        r.status,
        r.priority,
        r.primary_dealer_alias,
        r.primary_site_alias,
        r.primary_license_uuid,
        r.primary_hostname,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  });

  private pageSize = 25;
  private currentLimit = 25;

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.error.set(null);
    this.isLoading.set(true);

    try {
      this.currentLimit = this.pageSize;
      const data = await fetchInstallQueue({ limit: this.currentLimit });
      this.rows.set(data);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load install queue.');
      this.rows.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onShowMore(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      this.currentLimit += this.pageSize;
      const data = await fetchInstallQueue({ limit: this.currentLimit });
      this.rows.set(data);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load more installs.');
    } finally {
      this.isLoading.set(false);
    }
  }
}