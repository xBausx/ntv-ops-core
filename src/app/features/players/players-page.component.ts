/** Angular Imports */
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Local Imports */
import { SupabaseService, SwrCacheService } from '@core';
import {
  type PlayerCacheState,
  type PlayerRow,
  type PlayerTableRow,
} from './models/player.models';

@Component({
  selector: 'app-players-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-shell gap-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <h1 class="page-title">Players</h1>
          <p class="mt-1 max-w-3xl text-sm text-white/60">
            Search player mappings and jump quickly into the canonical player profile.
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
          <button class="btn-modern btn-secondary" (click)="refreshHard()" [disabled]="isLoading() || !isBrowser()">
            Refresh
          </button>
        </div>
      </div>

      <div class="card-modern shrink-0 p-4 md:p-5">
        <div class="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_180px_180px_160px_auto] xl:items-end">
          <div class="min-w-0">
            <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Search</label>
            <input
              class="input-modern w-full"
              placeholder="Search license UUID, hostname, site, dealer, tags…"
              [value]="searchText()"
              (input)="onSearchInput($event)"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Site</label>
            <select class="select-modern w-full" [value]="siteFilter()" (change)="onSiteFilterChange($event)">
              <option value="ALL">All sites</option>
              @for (site of siteOptions(); track site) {
                <option [value]="site">{{ site }}</option>
              }
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Dealer</label>
            <select class="select-modern w-full" [value]="dealerFilter()" (change)="onDealerFilterChange($event)">
              <option value="ALL">All dealers</option>
              @for (dealer of dealerOptions(); track dealer) {
                <option [value]="dealer">{{ dealer }}</option>
              }
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Type</label>
            <select class="select-modern w-full" [value]="licenseTypeFilter()" (change)="onLicenseTypeFilterChange($event)">
              <option value="ALL">All types</option>
              @for (type of licenseTypeOptions(); track type) {
                <option [value]="type">{{ type }}</option>
              }
            </select>
          </div>

          <div class="flex flex-wrap items-center gap-2 xl:justify-end">
            <button class="btn-modern btn-secondary" (click)="resetFilters()" [disabled]="activeFilterCount() === 0">
              Reset filters
            </button>
          </div>
        </div>

        <div class="filter-summary-row mt-2">
          <div class="filter-chip-rail">
            <span class="table-chip table-chip-compact">
              Filters <span class="text-white/75">{{ activeFilterCount() }}</span>
            </span>

            @if (siteFilter() !== 'ALL') {
              <span class="table-chip table-chip-compact" [title]="siteFilter()">{{ siteFilter() }}</span>
            }

            @if (dealerFilter() !== 'ALL') {
              <span class="table-chip table-chip-compact" [title]="dealerFilter()">{{ dealerFilter() }}</span>
            }

            @if (licenseTypeFilter() !== 'ALL') {
              <span class="table-chip table-chip-compact" [title]="licenseTypeFilter()">{{ licenseTypeFilter() }}</span>
            }
          </div>
        </div>
      </div>

      <div class="card-modern table-page-card p-4 md:p-5">
        <div class="table-toolbar-modern">
          <div>
            <div class="text-sm font-bold text-white/80">Player Registry</div>
            <div class="mt-1 text-xs text-white/45">
              Source <span class="font-semibold text-white/65">players</span>
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
            <span class="table-chip">Filters {{ activeFilterCount() }}</span>
            <span class="table-chip">Loaded {{ rows().length }}</span>
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
          } @else {
            <div class="table-region mt-4">
              @if (filteredTableRows().length > 0) {
                <div class="table-scroll-region players-table-scroll-region">
                  <table class="table-modern table-dense players-table w-full">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Site</th>
                        <th>Dealer</th>
                        <th>Type</th>
                        <th>Screen</th>
                        <th>Links</th>
                      </tr>
                    </thead>

                    <tbody>
                      @for (player of filteredTableRows(); track player.license_uuid) {
                        <tr class="cursor-pointer">
                          <td>
                            <div class="players-primary-cell">
                              <a
                                [routerLink]="['/players', player.license_uuid]"
                                class="col-primary transition hover:text-white"
                              >
                                {{ player.hostname || player.license_uuid }}
                              </a>

                              <div class="mt-1 text-xs text-white/55">
                                <span class="font-semibold text-white/65">UUID:</span>
                                <span class="inline-block max-w-[220px] truncate align-bottom">
                                  {{ player.license_uuid }}
                                </span>
                              </div>

                              @if (player.tags?.length) {
                                <div class="mt-2 flex flex-wrap gap-1.5">
                                  @for (tag of player.tags!; track tag) {
                                    <span class="table-chip">{{ tag }}</span>
                                  }
                                </div>
                              }
                            </div>
                          </td>

                          <td class="col-secondary">
                            {{ player.site_alias || '—' }}
                          </td>

                          <td class="col-muted">
                            {{ player.dealer_alias || '—' }}
                          </td>

                          <td class="col-secondary">
                            {{ player.license_type || '—' }}
                          </td>

                          <td class="col-secondary">
                            {{ player.screen || '—' }}
                          </td>

                          <td>
                            <div class="players-links-cell">
                              <a
                                [routerLink]="['/players', player.license_uuid]"
                                class="btn-modern btn-secondary players-link-button"
                              >
                                Profile
                              </a>

                              @if (player.dashboard_url) {
                                <a
                                  [href]="player.dashboard_url"
                                  target="_blank"
                                  rel="noreferrer"
                                  class="btn-modern btn-secondary players-link-button"
                                >
                                  Dashboard
                                </a>
                              }

                              @if (player.mesh_url) {
                                <a
                                  [href]="player.mesh_url"
                                  target="_blank"
                                  rel="noreferrer"
                                  class="btn-modern btn-secondary players-link-button"
                                >
                                  Mesh
                                </a>
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="table-scroll-region players-table-scroll-region">
                  <div class="table-empty-state">
                    <div>
                      <p class="text-sm font-semibold text-white/75">No results</p>
                      <p class="mt-1 text-sm text-white/60">Import players or widen the current filters.</p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="table-footer-region">
              @if (filteredTableRows().length > 0) {
                @if (hasMore()) {
                  <button class="btn-modern btn-secondary" (click)="onLoadMore()" [disabled]="isLoading()">
                    Load more
                  </button>
                } @else if (rows().length > 0) {
                  <div class="text-xs font-semibold text-white/40">All rows loaded.</div>
                }
              } @else {
                <div class="text-xs font-semibold text-white/30">Adjust the filters to widen the player list.</div>
              }
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class PlayersPageComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly swr = inject(SwrCacheService);

  private readonly cacheKey = 'players:queue:v1';
  private readonly ttlMs = 30_000;
  private readonly pageSize = 100;

  readonly isBrowser = signal<boolean>(this.supabase.isBrowser());
  readonly searchText = signal<string>('');
  readonly siteFilter = signal<string>('ALL');
  readonly dealerFilter = signal<string>('ALL');
  readonly licenseTypeFilter = signal<string>('ALL');
  readonly isLoading = signal<boolean>(false);
  readonly isRevalidating = signal<boolean>(false);
  readonly errorText = signal<string>('');

  readonly authHint = signal<boolean>(false);
  readonly needsProvisioning = signal<boolean>(false);

  readonly userEmail = signal<string>('');
  readonly userId = signal<string>('');
  readonly userRole = signal<string>('');

  private readonly currentPage = signal<number>(1);
  readonly hasMore = signal<boolean>(true);
  readonly rows = signal<PlayerRow[]>([]);

  readonly lastUpdatedLabel = computed<string>(() => {
    const ts = this.swr.fetchedAt(this.cacheKey);
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  });

  readonly tableRows = computed<PlayerTableRow[]>(() =>
    this.rows().map((p) => ({
      ...p,
      tags_display: (p.tags ?? []).join(', '),
    })),
  );

  readonly siteOptions = computed<string[]>(() => this.uniqueOptions(this.tableRows().map((row) => row.site_alias)));
  readonly dealerOptions = computed<string[]>(() => this.uniqueOptions(this.tableRows().map((row) => row.dealer_alias)));
  readonly licenseTypeOptions = computed<string[]>(() => this.uniqueOptions(this.tableRows().map((row) => row.license_type)));

  readonly filteredTableRows = computed<PlayerTableRow[]>(() => {
    const q = this.searchText().trim().toLowerCase();
    const site = this.siteFilter();
    const dealer = this.dealerFilter();
    const licenseType = this.licenseTypeFilter();

    return this.tableRows().filter((row) => {
      if (site !== 'ALL' && (row.site_alias ?? '') !== site) return false;
      if (dealer !== 'ALL' && (row.dealer_alias ?? '') !== dealer) return false;
      if (licenseType !== 'ALL' && (row.license_type ?? '') !== licenseType) return false;
      if (q && !this.matches(row, q)) return false;
      return true;
    });
  });

  readonly activeFilterCount = computed<number>(() => {
    let count = 0;
    if (this.searchText().trim()) count += 1;
    if (this.siteFilter() !== 'ALL') count += 1;
    if (this.dealerFilter() !== 'ALL') count += 1;
    if (this.licenseTypeFilter() !== 'ALL') count += 1;
    return count;
  });

  constructor() {
    if (this.supabase.isBrowser()) {
      void this.initLoad();
    }
  }

  private async initLoad(): Promise<void> {
    const cached = this.swr.read<PlayerCacheState>(this.cacheKey);
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
          await this.load(false);
        } finally {
          this.isRevalidating.set(false);
        }
      } else {
        await this.load(false);
      }
    }
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchText.set(input?.value ?? '');
  }

  onSiteFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.siteFilter.set(select?.value ?? 'ALL');
  }

  onDealerFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.dealerFilter.set(select?.value ?? 'ALL');
  }

  onLicenseTypeFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.licenseTypeFilter.set(select?.value ?? 'ALL');
  }

  resetFilters(): void {
    this.searchText.set('');
    this.siteFilter.set('ALL');
    this.dealerFilter.set('ALL');
    this.licenseTypeFilter.set('ALL');
  }

  async refreshHard(): Promise<void> {
    this.swr.invalidate(this.cacheKey);
    await this.load(false);
  }

  async load(append: boolean): Promise<void> {
    this.errorText.set('');
    this.authHint.set(false);
    this.needsProvisioning.set(false);

    if (!this.supabase.isBrowser()) return;

    const blocking = this.rows().length === 0 || append;
    if (blocking) this.isLoading.set(true);
    else this.isRevalidating.set(true);

    try {
      const nextPage = append ? this.currentPage() + 1 : 1;

      const state = await this.swr.revalidate<PlayerCacheState>(this.cacheKey, async () => {
        const baseRows = append ? this.rows() : [];
        const basePage = append ? this.currentPage() : 0;
        const fetched = await this.fetchPage(nextPage);

        return {
          rows: append ? [...baseRows, ...fetched.batch] : fetched.batch,
          currentPage: append ? basePage + 1 : 1,
          hasMore: fetched.hasMore,
          userEmail: this.userEmail(),
          userId: this.userId(),
          userRole: this.userRole(),
        };
      });

      this.rows.set(state.rows);
      this.currentPage.set(state.currentPage);
      this.hasMore.set(state.hasMore);

      this.swr.write<PlayerCacheState>(this.cacheKey, {
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

  private async fetchPage(page: number): Promise<{ batch: PlayerRow[]; hasMore: boolean }> {
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
      .from('players')
      .select(
        `
        license_uuid,
        hostname,
        dealer_alias,
        site_alias,
        license_type,
        screen,
        dashboard_url,
        mesh_device_id,
        mesh_url,
        tags
      `,
      )
      .order('hostname', { ascending: true })
      .range(from, to);

    if (error) {
      this.errorText.set(error.message);
      return { batch: [], hasMore: false };
    }

    const batch = (data ?? []) as PlayerRow[];
    return { batch, hasMore: batch.length === this.pageSize };
  }

  private uniqueOptions(values: Array<string | null>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]
      .sort((a, b) => a.localeCompare(b));
  }

  private matches(player: PlayerTableRow, q: string): boolean {
    const haystack: string[] = [
      player.license_uuid,
      player.hostname ?? '',
      player.site_alias ?? '',
      player.dealer_alias ?? '',
      player.license_type ?? '',
      player.screen ?? '',
      player.tags_display ?? '',
      player.mesh_device_id ?? '',
    ];

    return haystack.some((value) => value.toLowerCase().includes(q));
  }
}
