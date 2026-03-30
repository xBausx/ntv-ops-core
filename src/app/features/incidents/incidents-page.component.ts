/** Angular Imports */
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Third Party Imports */
import { Table } from '@ntv360/component-pantry';

/** Local Imports */
import { SupabaseService, SwrCacheService } from '@core';
import {
  CLIENT_CREATABLE_INCIDENT_STATUSES,
  INCIDENT_WORK_STATUSES,
  type IncidentCacheState,
  type IncidentQueueRow,
  type IncidentQueueTableRow,
} from './models/incidents.models';

@Component({
  selector: 'app-incidents-page',
  standalone: true,
  imports: [Table, RouterLink],
  template: `
    <section class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <h1 class=\"page-title\">Incident Queue</h1>
          <p class="mt-1 max-w-3xl text-sm text-white/60">
            Track incidents/support work with strict statuses and audit history.
          </p>

          @if (lastUpdatedLabel()) {
            <div class="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-white/45">
              <span>Last updated:</span>
              <span class="ml-1 text-white/65">{{ lastUpdatedLabel() }}</span>
              @if (isRevalidating()) {
                <span class="ml-2 text-white/30">(refreshing…)</span>
              }
            </div>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="btn-modern btn-secondary"
            (click)="openCreate()"
            [disabled]="!isBrowser() || !isWritable()"
          >
            New incident
          </button>

          <button class="btn-modern btn-secondary" (click)="refreshHard()" [disabled]="isLoading() || !isBrowser()">
            Refresh
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="card-modern overflow-hidden">
        <div class="p-4 md:p-5">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div class="min-w-0 flex-1">
              <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Search</label>
              <input
                class="input-modern w-full"
                placeholder="Search summary, hostname, site, dealer, license UUID…"
                [value]="searchText()"
                (input)="onSearchInput($event)"
              />
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                aria-label="Clear search"
                title="Clear search"
                class="icon-button-modern"
                (click)="onClear()"
              >
                <span class="text-xl leading-none">×</span>
              </button>

              <button
                class="btn-modern btn-secondary"
                (click)="onExport()"
                [disabled]="filteredTableRows().length === 0"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Queue -->
      <div class="card-modern overflow-hidden">
        <div class="p-4 md:p-5">
          <div class="flex items-center justify-between gap-4">
            <div class="text-sm font-bold text-white/70">
              Queue
              <span class="ml-2 text-xs font-semibold text-white/40">
                ({{ filteredTableRows().length }} loaded)
              </span>
            </div>

            <div class="text-xs font-semibold text-white/40 text-right">
              <div>
                Source: <span class="text-white/60">v_incident_queue</span>
              </div>
              @if (userEmail()) {
                <div class="mt-1">
                  <span class="text-white/30">User:</span>
                  <span class="text-white/60 font-semibold">{{ userEmail() }}</span>
                  @if (userRole()) {
                    <span class="mx-1 text-white/20">•</span>
                    <span class="text-white/30">Role:</span>
                    <span class="text-white/60 font-semibold">{{ userRole() }}</span>
                  }
                </div>
              }
            </div>
          </div>

          @if (!isBrowser()) {
            <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p class="text-sm text-white/70 font-semibold">SSR render</p>
              <p class="mt-1 text-sm text-white/60">Data loads in the browser only.</p>
            </div>
          } @else {
            @if (authHint()) {
              <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p class="text-sm text-white/70 font-semibold">Sign-in required</p>
                <p class="mt-1 text-sm text-white/60">
                  Go to
                  <a routerLink="/login" class="font-semibold text-white/80 hover:text-white underline">/login</a>
                  to authenticate.
                </p>
              </div>
            }

            @if (needsProvisioning()) {
              <div class="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p class="text-sm font-bold text-amber-200">Account not provisioned</p>
                <p class="mt-1 text-sm text-amber-100/80">
                  You’re signed in, but missing a role row in <span class="font-semibold">public.profiles</span>.
                </p>
                <pre class="mt-3 text-xs text-white/70 bg-black/40 border border-white/10 rounded-xl p-3 overflow-auto"><code>insert into public.profiles (user_id, role)
values ('{{ userId() }}', 'ADMIN');</code></pre>
              </div>
            }

            @if (errorText()) {
              <div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p class="text-sm font-bold text-red-200">Load failed</p>
                <p class="mt-1 text-sm text-red-100/80 whitespace-pre-wrap">{{ errorText() }}</p>
              </div>
            }

            @if (isLoading() && rows().length === 0) {
              <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p class="text-sm text-white/70 font-semibold">Loading…</p>
              </div>
            } @else if (!authHint() && !needsProvisioning() && filteredTableRows().length === 0) {
              <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p class="text-sm text-white/70 font-semibold">No results</p>
                <p class="mt-1 text-sm text-white/60">
                  Create a work item (New incident) or clear filters.
                </p>
              </div>
            } @else if (filteredTableRows().length > 0) {
              <div class="mt-4">
                <div class="table-shell">
                @if (tableMounted()) {
                  <ntv-table
                    [columns]="columns()"
                    [value]="filteredTableRows()"
                    [data]="filteredTableRows()"
                    [filterEnabled]="true"
                    [hasIndex]="true"
                    [expandableRows]="true"
                    dataKey="work_id"
                    tableHeight="calc(100vh - 360px)"
                    (showMoreRequested)="onLoadMore()"
                  >
                    <ng-template #expandedContent let-row>
                      <div class="rounded-xl border border-white/10 bg-black/30 p-4">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div class="min-w-0">
                            <div class="text-xs font-bold text-white/50">Work ID</div>
                            <div class="text-sm font-semibold text-white/80 break-all">
                              {{ row.work_id }}
                            </div>

                            @if (row.license_uuids?.length) {
                              <div class="mt-2 text-xs text-white/60">
                                Linked players:
                                <span class="text-white/80 font-semibold">{{ row.license_uuids.length }}</span>
                              </div>
                            }
                          </div>

                          <div class="flex items-center gap-2">
                            <a
                              class="btn-modern btn-secondary"
                              [routerLink]="['/work', row.work_id]"
                            >
                              Open
                            </a>
                          </div>
                        </div>
                      </div>
                    </ng-template>
                  </ntv-table>
                }
                </div>

                @if (!hasMore() && rows().length > 0) {
                  <div class="mt-3 text-xs font-semibold text-white/40">
                    All rows loaded.
                  </div>
                }
              </div>
            }
          }
        </div>
      </div>
    </section>

    <!-- Create modal -->
    @if (isCreateOpen()) {
      <div class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/70" (click)="closeCreate()"></div>

        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="card-modern w-full max-w-xl bg-neutral-950 shadow-2xl">
            <div class="p-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div class="text-lg font-extrabold tracking-tight">New incident</div>
                <div class="mt-1 text-sm text-white/60">
                  Creates a work item (type INCIDENT). Audit events are handled by DB triggers.
                </div>
              </div>

              <button
                class="btn-modern btn-secondary"
                (click)="closeCreate()"
              >
                Close
              </button>
            </div>

            <div class="p-5 space-y-4">
              @if (createError()) {
                <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <div class="text-sm font-bold text-red-200">Create failed</div>
                  <div class="mt-1 text-sm text-red-100/80 whitespace-pre-wrap">{{ createError() }}</div>
                </div>
              }

              <div>
                <label class="block text-xs font-bold text-white/60 mb-1">Summary *</label>
                <input
                  class="input-modern w-full"
                  placeholder="e.g. Player offline at Site XYZ"
                  [value]="createSummary()"
                  (input)="onCreateSummary($event)"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-bold text-white/60 mb-1">Priority</label>
                  <select
                    class="input-modern w-full"
                    [value]="createPriority()"
                    (change)="onCreatePriority($event)"
                  >
                    <option [value]="1">1 (Highest)</option>
                    <option [value]="2">2</option>
                    <option [value]="3">3 (Default)</option>
                    <option [value]="4">4</option>
                    <option [value]="5">5 (Lowest)</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-white/60 mb-1">Status</label>
                  <select
                    class="input-modern w-full"
                    [value]="createStatus()"
                    (change)="onCreateStatus($event)"
                  >
                    @for (s of createStatuses(); track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-white/60 mb-1">Scheduled for</label>
                  <input
                    type="datetime-local"
                    class="input-modern w-full"
                    [value]="createScheduledFor()"
                    (input)="onCreateScheduledFor($event)"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-white/60 mb-1">Description</label>
                <textarea
                  class="input-modern min-h-[96px] w-full resize-y"
                  placeholder="Optional details…"
                  [value]="createDescription()"
                  (input)="onCreateDescription($event)"
                ></textarea>
              </div>

              @if (createStatus() === 'BLOCKED') {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-white/60 mb-1">Blocked reason code</label>
                    <input
                      class="input-modern w-full"
                      placeholder="e.g. WAITING_ON_VENDOR"
                      [value]="createBlockedCode()"
                      (input)="onCreateBlockedCode($event)"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-white/60 mb-1">Blocked details</label>
                    <input
                      class="input-modern w-full"
                      placeholder="Explain what’s blocking…"
                      [value]="createBlockedDetail()"
                      (input)="onCreateBlockedDetail($event)"
                    />
                  </div>
                </div>
              }

              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  class="btn-modern btn-secondary disabled:opacity-50"
                  (click)="resetCreate()"
                  [disabled]="isCreating()"
                >
                  Reset
                </button>

                <button
                  class="btn-modern btn-primary"
                  (click)="createWorkItem()"
                  [disabled]="isCreating() || !isWritable() || createSummary().trim().length === 0"
                >
                  @if (isCreating()) { Creating… } @else { Create }
                </button>
              </div>

              @if (!isWritable()) {
                <div class="text-xs font-semibold text-white/40">
                  Read-only access: creating work items requires role OPS or ADMIN.
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class IncidentsPageComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly swr = inject(SwrCacheService);

  private readonly cacheKey = 'queue:incidents:v1';
  private readonly ttlMs = 30_000;

  readonly isBrowser = signal<boolean>(this.supabase.isBrowser());

  readonly searchText = signal<string>('');

  // remount toggle to reset Pantry table internal filters
  readonly tableMounted = signal<boolean>(true);

  readonly isLoading = signal<boolean>(false);
  readonly isRevalidating = signal<boolean>(false);

  readonly errorText = signal<string>('');

  readonly authHint = signal<boolean>(false);
  readonly needsProvisioning = signal<boolean>(false);

  readonly userEmail = signal<string>('');
  readonly userId = signal<string>('');
  readonly userRole = signal<string>('');

  readonly isWritable = computed(() => this.userRole() === 'ADMIN' || this.userRole() === 'OPS');

  // Pagination
  private readonly pageSize = 100;
  readonly currentPage = signal<number>(1);
  readonly hasMore = signal<boolean>(true);

  readonly rows = signal<IncidentQueueRow[]>([]);

  readonly lastUpdatedLabel = computed(() => {
    const ts = this.swr.fetchedAt(this.cacheKey);
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  });

  readonly tableRows = computed<IncidentQueueTableRow[]>(() =>
    this.rows().map((r) => ({
      ...r,
      hostnames_display: (r.hostnames ?? []).slice(0, 4).join(', '),
      site_display: (r.site_aliases ?? []).slice(0, 3).join(', '),
      dealer_display: (r.dealer_aliases ?? []).slice(0, 3).join(', '),
    })),
  );

  readonly filteredTableRows = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const all = this.tableRows();
    if (!q) return all;
    return all.filter((r) => this.matches(r, q));
  });

  readonly createStatuses = signal<string[]>([...CLIENT_CREATABLE_INCIDENT_STATUSES]);

  readonly columns = signal<any[]>([
    { field: 'status', header: 'Status', visible: true, width: '140px', filter: true, type: 'select', options: [...INCIDENT_WORK_STATUSES] },
    { field: 'priority', header: 'P', visible: true, width: '70px', filter: true, type: 'number' },
    { field: 'summary', header: 'Summary', visible: true, filter: true, filterType: 'text' },
    { field: 'hostnames_display', header: 'Hostnames', visible: true, width: '260px', filter: true, filterType: 'text' },
    { field: 'site_display', header: 'Site', visible: true, width: '180px', filter: true, filterType: 'text' },
    { field: 'dealer_display', header: 'Dealer', visible: true, width: '180px', filter: true, filterType: 'text' },
    { field: 'player_count', header: '#', visible: true, width: '80px', type: 'number' },
    { field: 'sla_due', header: 'SLA Due', visible: true, width: '190px', filter: true, filterType: 'text' },
    { field: 'updated_at', header: 'Updated', visible: true, width: '210px', filter: true, filterType: 'text' },
    { field: 'work_id', header: 'Work ID', visible: false, width: '280px' },
  ]);

  // Create modal state
  readonly isCreateOpen = signal<boolean>(false);
  readonly isCreating = signal<boolean>(false);
  readonly createError = signal<string>('');

  readonly createSummary = signal<string>('');
  readonly createDescription = signal<string>('');
  readonly createPriority = signal<number>(3);
  readonly createStatus = signal<string>('NEW');
  readonly createScheduledFor = signal<string>(''); // datetime-local

  readonly createBlockedCode = signal<string>('');
  readonly createBlockedDetail = signal<string>('');

  constructor() {
    if (this.supabase.isBrowser()) {
      void this.initLoad();
    }
  }

  private async initLoad(): Promise<void> {
    const cached = this.swr.read<IncidentCacheState>(this.cacheKey);
    if (cached) {
      this.rows.set(cached.rows ?? []);
      this.currentPage.set(cached.currentPage ?? 1);
      this.hasMore.set(cached.hasMore ?? true);
      this.userEmail.set(cached.userEmail ?? '');
      this.userId.set(cached.userId ?? '');
      this.userRole.set(cached.userRole ?? '');
    }

    if (this.swr.isStale(this.cacheKey, this.ttlMs)) {
      if (cached) {
        this.isRevalidating.set(true);
        try {
          await this.load(false, Math.max(1, this.currentPage()));
        } finally {
          this.isRevalidating.set(false);
        }
      } else {
        await this.load(false, 1);
      }
    }
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchText.set(input?.value ?? '');
  }

  onClear(): void {
    this.searchText.set('');
    this.remountTable();
  }

  async refreshHard(): Promise<void> {
    const pagesToReload = Math.max(1, this.currentPage());
    await this.load(false, pagesToReload);
  }

  async load(append: boolean, pagesToReload: number = 1): Promise<void> {
    this.errorText.set('');
    this.authHint.set(false);
    this.needsProvisioning.set(false);

    if (!this.supabase.isBrowser()) return;

    const blocking = this.rows().length === 0 || append;
    if (blocking) this.isLoading.set(true);
    else this.isRevalidating.set(true);

    try {
      const nextPage = append ? this.currentPage() + 1 : 1;

      const state = await this.swr.revalidate<IncidentCacheState>(this.cacheKey, async () => {
        if (append) {
          const baseRows = this.rows();
          const basePage = this.currentPage();
          const fetched = await this.fetchPage(nextPage);

          return {
            rows: [...baseRows, ...fetched.batch],
            currentPage: basePage + 1,
            hasMore: fetched.hasMore,
            userEmail: this.userEmail(),
            userId: this.userId(),
            userRole: this.userRole(),
          };
        }

        // refresh: re-fetch same number of pages already loaded (prevents “jump/flash”)
        const targetPages = Math.max(1, Math.min(pagesToReload, 10)); // safety cap
        let merged: IncidentQueueRow[] = [];
        let hasMore = true;
        let loadedPages = 0;

        for (let p = 1; p <= targetPages; p++) {
          const fetched = await this.fetchPage(p);
          merged = [...merged, ...fetched.batch];
          hasMore = fetched.hasMore;
          loadedPages = p;
          if (!fetched.hasMore) break;
        }

        return {
          rows: merged,
          currentPage: loadedPages,
          hasMore,
          userEmail: this.userEmail(),
          userId: this.userId(),
          userRole: this.userRole(),
        };
      });

      this.rows.set(state.rows);
      this.currentPage.set(state.currentPage);
      this.hasMore.set(state.hasMore);

      this.swr.write<IncidentCacheState>(this.cacheKey, {
        ...state,
        userEmail: this.userEmail(),
        userId: this.userId(),
        userRole: this.userRole(),
      });
    } catch (e) {
      this.errorText.set(String(e));
    } finally {
      if (blocking) this.isLoading.set(false);
      else this.isRevalidating.set(false);
    }
  }

  async onLoadMore(): Promise<void> {
    if (this.isLoading() || !this.hasMore() || !this.supabase.isBrowser()) return;
    await this.load(true);
  }

  private async fetchPage(page: number): Promise<{ batch: IncidentQueueRow[]; hasMore: boolean }> {
    const client = this.supabase.client();

    const sessionRes = await client.auth.getSession();
    const session = sessionRes.data.session;

    if (!session) {
      this.authHint.set(true);
      this.userEmail.set('');
      this.userId.set('');
      this.userRole.set('');
      this.rows.set([]);
      this.currentPage.set(1);
      this.hasMore.set(true);
      return { batch: [], hasMore: false };
    }

    this.userEmail.set(session.user.email ?? '');
    this.userId.set(session.user.id);

    const { data: profile, error: profileError } = await client.from('profiles').select('role').maybeSingle();
    if (profileError) this.errorText.set(profileError.message);

    const role = profile?.role ?? '';
    this.userRole.set(role);

    if (!role) {
      this.needsProvisioning.set(true);
      this.rows.set([]);
      this.currentPage.set(1);
      this.hasMore.set(true);
      return { batch: [], hasMore: false };
    }

    const from = (page - 1) * this.pageSize;
    const to = from + this.pageSize - 1;

    const { data, error } = await client
      .from('v_incident_queue')
      .select(
        `
        work_id,
        type,
        status,
        priority,
        assignee_user_id,
        scheduled_for,
        sla_due,
        summary,
        description,
        blocked_reason_code,
        blocked_reason_detail,
        verified_at,
        closed_at,
        created_at,
        updated_at,
        player_count,
        license_uuids,
        hostnames,
        site_aliases,
        dealer_aliases
      `,
      )
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.errorText.set(error.message);
      return { batch: [], hasMore: false };
    }

    const batch = (data ?? []) as IncidentQueueRow[];
    return { batch, hasMore: batch.length === this.pageSize };
  }

  // Create modal handlers
  openCreate(): void {
    this.createError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    if (this.isCreating()) return;
    this.isCreateOpen.set(false);
  }

  resetCreate(): void {
    this.createSummary.set('');
    this.createDescription.set('');
    this.createPriority.set(3);
    this.createStatus.set('NEW');
    this.createScheduledFor.set('');
    this.createBlockedCode.set('');
    this.createBlockedDetail.set('');
    this.createError.set('');
  }

  onCreateSummary(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.createSummary.set(input?.value ?? '');
  }

  onCreateDescription(event: Event): void {
    const input = event.target as HTMLTextAreaElement | null;
    this.createDescription.set(input?.value ?? '');
  }

  onCreatePriority(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const n = Number(select?.value ?? 3);
    this.createPriority.set(Number.isFinite(n) ? n : 3);
  }

  onCreateStatus(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.createStatus.set(select?.value ?? 'NEW');
  }

  onCreateScheduledFor(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.createScheduledFor.set(input?.value ?? '');
  }

  onCreateBlockedCode(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.createBlockedCode.set(input?.value ?? '');
  }

  onCreateBlockedDetail(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.createBlockedDetail.set(input?.value ?? '');
  }

  async createWorkItem(): Promise<void> {
    this.createError.set('');

    if (!this.supabase.isBrowser()) return;
    if (!this.isWritable()) return;

    const summary = this.createSummary().trim();
    if (!summary) return;

    this.isCreating.set(true);

    try {
      const client = this.supabase.client();

      const status = this.createStatus();

      if (status === 'VERIFIED' || status === 'CLOSED') {
        this.createError.set(
          `${status} must be created by a privileged backend operation. Start the work item in a client-allowed status instead.`,
        );
        return;
      }

      const scheduledLocal = this.createScheduledFor().trim();
      const scheduledForIso = scheduledLocal ? new Date(scheduledLocal).toISOString() : null;

      const isBlocked = status === 'BLOCKED';

      const payload: any = {
        type: 'INCIDENT',
        status,
        priority: this.createPriority(),
        summary,
        description: this.createDescription().trim() || null,
        scheduled_for: scheduledForIso,
        blocked_reason_code: isBlocked ? (this.createBlockedCode().trim() || null) : null,
        blocked_reason_detail: isBlocked ? (this.createBlockedDetail().trim() || null) : null,
      };

      const { error } = await client.from('work_items').insert(payload);

      if (error) {
        this.createError.set(error.message);
        return;
      }

      this.swr.invalidate(this.cacheKey);

      this.isCreateOpen.set(false);
      this.resetCreate();

      await this.initLoad();
    } catch (e) {
      this.createError.set(String(e));
    } finally {
      this.isCreating.set(false);
    }
  }

  onExport(): void {
    console.log('Export requested', this.filteredTableRows().length);
  }

  private remountTable(): void {
    this.tableMounted.set(false);
    const fn = () => this.tableMounted.set(true);
    if (typeof queueMicrotask === 'function') queueMicrotask(fn);
    else setTimeout(fn, 0);
  }

  private matches(row: IncidentQueueTableRow, q: string): boolean {
    const haystack: string[] = [
      row.work_id,
      row.status,
      String(row.priority),
      row.summary ?? '',
      row.description ?? '',
      row.hostnames_display ?? '',
      row.site_display ?? '',
      row.dealer_display ?? '',
      ...(row.license_uuids ?? []),
    ];

    return haystack.some((v) => (v ?? '').toLowerCase().includes(q));
  }
}