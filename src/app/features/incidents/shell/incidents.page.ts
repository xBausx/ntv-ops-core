import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, Table } from '@ntv360/component-pantry';

import { fetchIncidentQueue, type IncidentQueueRow } from '../../../core/supabase/ops-core.api';

@Component({
  selector: 'app-incidents-page',
  standalone: true,
  imports: [RouterLink, Table, Button],
  template: `
    <div class="min-h-screen bg-black text-white flex flex-col">
      <div class="w-full max-w-none mx-auto px-6 xl:px-10 2xl:px-12 py-6 flex flex-1 flex-col min-h-0">
        <div class="flex items-start justify-between gap-6">
          <div class="flex flex-col gap-2">
            <div class="inline-flex items-center gap-3">
              <span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600"></span>
              <span class="text-xs uppercase tracking-[0.22em] text-white/70">Ops Core</span>
            </div>

            <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Incident Queue</h1>

            <p class="text-sm text-white/70 max-w-2xl">
              Centralize support work with SLA visibility, strict statuses, and an auditable timeline.
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
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Open</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">High Priority</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">SLA Due</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Blocked</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Unassigned</span>
            </div>

            <p class="mt-3 text-sm text-white/60">
              Backed by <span class="text-white">public.v_incident_queue</span> (Supabase view).
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
                Source: <span class="text-white">public.v_incident_queue</span>
              </span>
            </div>

            @if (isLoading()) {
              <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                Loading incident queue…
              </div>
            } @else {
              @if (rows().length === 0) {
                <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                  No incident work items found.
                </div>
              } @else {
                <div class="mt-4 flex-1 min-h-0 rounded-xl border border-white/10 bg-black/30 p-2 overflow-hidden">
                  <ntv-table
                    [columns]="columns()"
                    [data]="$any(rows())"
                    [value]="$any(rows())"
                    tableHeight="100%"
                    (showMoreRequested)="onShowMore()"
                  ></ntv-table>
                </div>

                <div class="mt-3 text-xs text-white/50">
                  Showing {{ rows().length }} row(s). Click “Show More” to load more (simple paging for now).
                </div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class IncidentsPageComponent {
  // Start with fields we know should exist (work/status/priority + primary player fields).
  // We can extend columns once v_incident_queue exposes SLA + assignee + last event explicitly.
  readonly columns = signal<any[]>([
    { field: 'sla_due_at', header: 'SLA Due', visible: true, width: '180px' },
    { field: 'sla_overdue', header: 'Overdue', visible: true, width: '120px' },
    { field: 'status', header: 'Status', visible: true, width: '140px' },
    { field: 'priority', header: 'Priority', visible: true, width: '140px' },
    { field: 'primary_dealer_alias', header: 'Dealer', visible: true },
    { field: 'primary_site_alias', header: 'Site', visible: true },
    { field: 'primary_license_uuid', header: 'License UUID', visible: true },
    { field: 'primary_hostname', header: 'Hostname', visible: true },
    { field: 'last_event_type', header: 'Last Event', visible: true, width: '160px' },
    { field: 'last_event_at', header: 'Last Event At', visible: true, width: '180px' },
  ]);

  readonly rows = signal<IncidentQueueRow[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

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
      const data = await fetchIncidentQueue({ limit: this.currentLimit });
      this.rows.set(data);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load incident queue.');
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
      const data = await fetchIncidentQueue({ limit: this.currentLimit });
      this.rows.set(data);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load more incidents.');
    } finally {
      this.isLoading.set(false);
    }
  }
}