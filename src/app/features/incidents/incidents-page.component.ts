/** Angular Imports */
import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink, NgClass, DatePipe],
  template: `
    <section class="page-shell gap-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <h1 class="page-title">Incident Queue</h1>
          <p class="mt-1 max-w-3xl text-sm text-white/60">
            Track incidents/support work with strict statuses and audit history.
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/45">
            @if (lastUpdatedLabel()) {
              <span class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                Last updated <span class="text-white/65">{{ lastUpdatedLabel() }}</span>
              </span>
            }
            @if (isRevalidating()) {
              <span class="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-200/80">
                Refreshing…
              </span>
            }
            <span class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
              {{ filteredTableRows().length }} visible / {{ rows().length }} loaded
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="btn-modern btn-primary"
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

      <div class="card-modern p-4 md:p-5">
        <div class="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_180px_150px_auto] xl:items-end">
          <div class="min-w-0">
            <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Search</label>
            <input
              class="input-modern w-full"
              placeholder="Search summary, hostname, site, dealer, license UUID…"
              [value]="searchText()"
              (input)="onSearchInput($event)"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Status</label>
            <select class="select-modern w-full" [value]="statusFilter()" (change)="onStatusFilterChange($event)">
              <option value="ALL">All statuses</option>
              @for (status of incidentStatuses; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Priority</label>
            <select class="select-modern w-full" [value]="priorityFilter()" (change)="onPriorityFilterChange($event)">
              <option value="ALL">All priorities</option>
              @for (priority of priorityOptions; track priority) {
                <option [value]="priority">P{{ priority }}</option>
              }
            </select>
          </div>

          <div class="flex flex-wrap items-center gap-2 xl:justify-end">
            <button class="btn-modern btn-secondary" (click)="resetFilters()" [disabled]="activeFilterCount() === 0">
              Reset filters
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

        <div class="filter-summary-row mt-3">
          <div class="filter-chip-rail">
            <span class="table-chip table-chip-compact">
              Filters <span class="text-white/75">{{ activeFilterCount() }}</span>
            </span>
            @for (item of statusPillCounts(); track item.label) {
              <button
                type="button"
                class="table-chip table-chip-compact transition hover:border-white/20 hover:text-white"
                [title]="item.label"
                [class.border-blue-400/30]="statusFilter() === item.label"
                [class.bg-blue-500/10]="statusFilter() === item.label"
                (click)="statusFilter() === item.label ? statusFilter.set('ALL') : statusFilter.set(item.label)"
              >
                {{ item.label }} <span class="text-white/70">{{ item.count }}</span>
              </button>
            }
          </div>
        </div>
      </div>

      <div class="card-modern table-page-card p-4 md:p-5">
        <div class="table-toolbar-modern">
          <div>
            <div class="text-sm font-bold text-white/80">Queue</div>
            <div class="mt-1 text-xs text-white/45">
              Source <span class="font-semibold text-white/65">v_incident_queue</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold text-white/45">
            @if (userEmail()) {
              <span class="table-chip">
                {{ userEmail() }}
                @if (userRole()) {
                  <span class="text-white/30">•</span>
                  <span class="text-white/70">{{ userRole() }}</span>
                }
              </span>
            }
            <span class="table-chip">Loaded {{ rows().length }}</span>
            @if (hasMore()) {
              <span class="table-chip">More available</span>
            } @else if (rows().length > 0) {
              <span class="table-chip">Complete</span>
            }
          </div>
        </div>

        @if (!isBrowser()) {
          <div class="panel-modern mt-4">
            <p class="text-sm font-semibold text-white/75">SSR render</p>
            <p class="mt-1 text-sm text-white/60">Data loads in the browser only.</p>
          </div>
        } @else {
          @if (authHint()) {
            <div class="panel-modern mt-4">
              <p class="text-sm font-semibold text-white/75">Sign-in required</p>
              <p class="mt-1 text-sm text-white/60">
                Go to
                <a routerLink="/login" class="font-semibold text-white/85 underline hover:text-white">/login</a>
                to authenticate.
              </p>
            </div>
          }

          @if (needsProvisioning()) {
            <div class="panel-modern mt-4">
              <p class="text-sm font-semibold text-white/75">Role configuration issue</p>
              <p class="mt-1 text-sm text-white/60">
                Your account is signed in but does not have a matching role in
                <span class="font-semibold text-white/80">public.profiles</span>.
              </p>
            </div>
          }

          @if (errorText()) {
            <div class="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p class="text-sm font-bold text-red-200">Load failed</p>
              <p class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">{{ errorText() }}</p>
            </div>
          }

          @if (isLoading() && rows().length === 0) {
            <div class="panel-modern mt-4">
              <p class="text-sm font-semibold text-white/75">Loading…</p>
            </div>
          } @else if (!authHint() && !needsProvisioning() && filteredTableRows().length === 0) {
            <div class="panel-modern mt-4">
              <p class="text-sm font-semibold text-white/75">No results</p>
              <p class="mt-1 text-sm text-white/60">Create a work item, widen the filters, or clear the search.</p>
            </div>
          } @else if (filteredTableRows().length > 0) {
            <div class="table-region mt-4">
              <div class="table-scroll-region incident-queue-table-wrap">
                <table class="table-modern table-dense incident-queue-table w-full">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Summary</th>
                      <th>Site</th>
                      <th>Dealer</th>
                      <th>Scheduled</th>
                      <th>Priority</th>
                    </tr>
                  </thead>

                  <tbody>
                    @for (item of filteredTableRows(); track item.work_id) {
                      <tr class="cursor-pointer">
                        <td>
                          <span
                            class="status-badge"
                            [ngClass]="{
                              'status-new': item.status === 'NEW',
                              'status-in-progress': item.status === 'IN_PROGRESS' || item.status === 'SCHEDULED',
                              'status-blocked': item.status === 'BLOCKED',
                              'status-verified': item.status === 'VERIFIED' || item.status === 'CLOSED'
                            }"
                          >
                            {{ item.status }}
                          </span>
                        </td>

                        <td>
                          <div class="col-primary incident-cell-primary" [title]="item.summary">
                            {{ item.summary }}
                          </div>
                          <div class="col-secondary incident-cell-secondary" [title]="item.hostnames_display">
                            {{ item.hostnames_display }}
                          </div>
                        </td>

                        <td class="col-secondary">
                          <span class="incident-cell-secondary" [title]="item.site_display">{{ item.site_display }}</span>
                        </td>

                        <td class="col-muted">
                          <span class="incident-cell-muted" [title]="item.dealer_display">{{ item.dealer_display }}</span>
                        </td>

                        <td class="col-secondary">
                          <span class="incident-cell-secondary">{{ item.scheduled_for | date:'MMM d, HH:mm' }}</span>
                        </td>

                        <td>
                          <span
                            [ngClass]="{
                              'priority-high': item.priority === 1,
                              'priority-medium': item.priority === 2,
                              'priority-low': item.priority >= 3
                            }"
                          >
                            P{{ item.priority }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="table-footer-region">
              @if (hasMore()) {
                <button class="btn-modern btn-secondary" (click)="onLoadMore()" [disabled]="isLoading()">
                  Load more
                </button>
              } @else if (rows().length > 0) {
                <div class="text-xs font-semibold text-white/40">All rows loaded.</div>
              }
            </div>
          }
        }
      </div>
    </section>

    @if (isCreateOpen()) {
      <div class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/70" (click)="closeCreate()"></div>

        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
            <div class="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <div class="text-lg font-extrabold tracking-tight">New incident</div>
                <div class="mt-1 text-sm text-white/60">
                  Creates a work item (type INCIDENT). Audit events are handled by DB triggers.
                </div>
              </div>

              <button class="btn-modern btn-secondary" (click)="closeCreate()">Close</button>
            </div>

            <div class="space-y-4 p-5">
              @if (createError()) {
                <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <div class="text-sm font-bold text-red-200">Create failed</div>
                  <div class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">{{ createError() }}</div>
                </div>
              }

              <div>
                <label class="mb-1 block text-xs font-bold text-white/60">Summary *</label>
                <input
                  class="input-modern w-full"
                  placeholder="e.g. Player offline at Site XYZ"
                  [value]="createSummary()"
                  (input)="onCreateSummary($event)"
                />
              </div>

              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label class="mb-1 block text-xs font-bold text-white/60">Priority</label>
                  <select class="select-modern w-full" [value]="createPriority()" (change)="onCreatePriority($event)">
                    <option [value]="1">1 (Highest)</option>
                    <option [value]="2">2</option>
                    <option [value]="3">3 (Default)</option>
                    <option [value]="4">4</option>
                    <option [value]="5">5 (Lowest)</option>
                  </select>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-bold text-white/60">Status</label>
                  <select class="select-modern w-full" [value]="createStatus()" (change)="onCreateStatus($event)">
                    @for (s of createStatuses(); track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-bold text-white/60">Scheduled for</label>
                  <input
                    type="datetime-local"
                    class="input-modern w-full"
                    [value]="createScheduledFor()"
                    (input)="onCreateScheduledFor($event)"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold text-white/60">Description</label>
                <textarea
                  class="input-modern min-h-[96px] w-full"
                  placeholder="Optional details…"
                  [value]="createDescription()"
                  (input)="onCreateDescription($event)"
                ></textarea>
              </div>

              @if (createStatus() === 'BLOCKED') {
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs font-bold text-white/60">Blocked reason code</label>
                    <input
                      class="input-modern w-full"
                      placeholder="e.g. WAITING_ON_VENDOR"
                      [value]="createBlockedCode()"
                      (input)="onCreateBlockedCode($event)"
                    />
                  </div>

                  <div>
                    <label class="mb-1 block text-xs font-bold text-white/60">Blocked details</label>
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
                <button class="btn-modern btn-secondary" (click)="resetCreate()" [disabled]="isCreating()">
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
  private readonly pageSize = 100;

  readonly isBrowser = signal<boolean>(this.supabase.isBrowser());
  readonly incidentStatuses = [...INCIDENT_WORK_STATUSES];
  readonly priorityOptions = [1, 2, 3, 4, 5];

  readonly searchText = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly priorityFilter = signal<string>('ALL');
  readonly isLoading = signal<boolean>(false);
  readonly isRevalidating = signal<boolean>(false);
  readonly errorText = signal<string>('');

  readonly authHint = signal<boolean>(false);
  readonly needsProvisioning = signal<boolean>(false);

  readonly userEmail = signal<string>('');
  readonly userId = signal<string>('');
  readonly userRole = signal<string>('');

  readonly isWritable = computed<boolean>(() => this.userRole() === 'ADMIN' || this.userRole() === 'OPS');

  readonly currentPage = signal<number>(1);
  readonly hasMore = signal<boolean>(true);
  readonly rows = signal<IncidentQueueRow[]>([]);

  readonly lastUpdatedLabel = computed<string>(() => {
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

  readonly filteredTableRows = computed<IncidentQueueTableRow[]>(() => {
    const q = this.searchText().trim().toLowerCase();
    const status = this.statusFilter();
    const priority = this.priorityFilter();

    return this.tableRows().filter((row) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (priority !== 'ALL' && String(row.priority) !== priority) return false;
      if (q && !this.matches(row, q)) return false;
      return true;
    });
  });

  readonly activeFilterCount = computed<number>(() => {
    let count = 0;
    if (this.searchText().trim()) count += 1;
    if (this.statusFilter() !== 'ALL') count += 1;
    if (this.priorityFilter() !== 'ALL') count += 1;
    return count;
  });

  readonly statusPillCounts = computed<{ label: string; count: number }[]>(() =>
    this.incidentStatuses
      .map((label) => ({
        label,
        count: this.tableRows().filter((row) => row.status === label).length,
      }))
      .filter((item) => item.count > 0),
  );

  readonly createStatuses = signal<string[]>([...CLIENT_CREATABLE_INCIDENT_STATUSES]);

  readonly isCreateOpen = signal<boolean>(false);
  readonly isCreating = signal<boolean>(false);
  readonly createError = signal<string>('');

  readonly createSummary = signal<string>('');
  readonly createDescription = signal<string>('');
  readonly createPriority = signal<number>(3);
  readonly createStatus = signal<string>('NEW');
  readonly createScheduledFor = signal<string>('');
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

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.statusFilter.set(select?.value ?? 'ALL');
  }

  onPriorityFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.priorityFilter.set(select?.value ?? 'ALL');
  }

  resetFilters(): void {
    this.searchText.set('');
    this.statusFilter.set('ALL');
    this.priorityFilter.set('ALL');
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
    if (blocking) {
      this.isLoading.set(true);
    } else {
      this.isRevalidating.set(true);
    }

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

        const targetPages = Math.max(1, Math.min(pagesToReload, 10));
        let merged: IncidentQueueRow[] = [];
        let moreAvailable = true;
        let loadedPages = 0;

        for (let p = 1; p <= targetPages; p += 1) {
          const fetched = await this.fetchPage(p);
          merged = [...merged, ...fetched.batch];
          moreAvailable = fetched.hasMore;
          loadedPages = p;
          if (!fetched.hasMore) break;
        }

        return {
          rows: merged,
          currentPage: loadedPages,
          hasMore: moreAvailable,
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
      if (blocking) {
        this.isLoading.set(false);
      } else {
        this.isRevalidating.set(false);
      }
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
    if (profileError) {
      this.errorText.set(profileError.message);
    }

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

      const payload: {
        type: 'INCIDENT';
        status: string;
        priority: number;
        summary: string;
        description: string | null;
        scheduled_for: string | null;
        blocked_reason_code: string | null;
        blocked_reason_detail: string | null;
      } = {
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

    return haystack.some((value) => value.toLowerCase().includes(q));
  }
}
