/** Angular Imports */
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Third Party Imports */
import { Button, Card, Table } from '@ntv360/component-pantry';

/** Local Imports */
import { SupabaseService, SwrCacheService } from '@core';

type PlayerRow = {
  license_uuid: string;

  hostname: string | null;
  dealer_alias: string | null;
  site_alias: string | null;
  license_type: string | null;
  screen: string | null;

  dashboard_url: string | null;

  mesh_device_id: string | null;
  mesh_url: string | null;

  tags: string[] | null;
};

type PlayerTableRow = PlayerRow & {
  tags_display: string;
};

type CacheState = {
  rows: PlayerRow[];
  currentPage: number;
  hasMore: boolean;
  userEmail: string;
  userId: string;
  userRole: string;
};

@Component({
  selector: 'app-players-page',
  standalone: true,
  imports: [Card, Button, Table, RouterLink],
  template: `
    <section class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Players</h1>
          <p class="mt-1 text-sm text-white/60">
            Search player mappings (license UUID → hostname/site/dealer + deep links to Dashboard/MeshCentral).
          </p>

          @if (lastUpdatedLabel()) {
            <div class="mt-2 text-xs font-semibold text-white/40">
              Last updated: <span class="text-white/60">{{ lastUpdatedLabel() }}</span>
              @if (isRevalidating()) {
                <span class="ml-2 text-white/30">(refreshing…)</span>
              }
            </div>
          }
        </div>

        <div class="flex items-center gap-2">
          <ntv-button (click)="refreshHard()" [disabled]="isLoading() || !isBrowser()">
            Refresh
          </ntv-button>
        </div>
      </div>

      <!-- Search -->
      <ntv-card>
        <div class="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
          <div class="flex-1">
            <label class="block text-xs font-bold text-white/60 mb-1">Search</label>
            <input
              class="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              placeholder="Search license UUID, hostname, site, dealer, tags…"
              [value]="searchText()"
              (input)="onSearchInput($event)"
            />
          </div>

          <div class="flex items-center gap-2">
            <button
              class="rounded-xl px-3 py-2 text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition"
              (click)="onClear()"
            >
              Clear
            </button>
          </div>
        </div>
      </ntv-card>

      <!-- Results -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="flex items-center justify-between gap-4">
            <div class="text-sm font-bold text-white/70">
              Results
              <span class="ml-2 text-xs font-semibold text-white/40">
                ({{ filteredTableRows().length }} loaded)
              </span>
            </div>

            <div class="text-xs font-semibold text-white/40 text-right">
              <div>
                Source: <span class="text-white/60">players</span>
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
                  Import players (Admin) or load more rows, then search.
                </p>
              </div>
            } @else if (filteredTableRows().length > 0) {
              <div class="mt-4">
                <ntv-table
                  [columns]="columns()"
                  [value]="filteredTableRows()"
                  [data]="filteredTableRows()"
                  [filterEnabled]="true"
                  [hasIndex]="true"
                  tableHeight="calc(100vh - 340px)"
                  (showMoreRequested)="onLoadMore()"
                >
                </ntv-table>

                @if (!hasMore() && rows().length > 0) {
                  <div class="mt-3 text-xs font-semibold text-white/40">
                    All rows loaded.
                  </div>
                }
              </div>
            }
          }
        </div>
      </ntv-card>
    </section>
  `,
})
export class PlayersPageComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly swr = inject(SwrCacheService);

  private readonly cacheKey = 'players:queue:v1';
  private readonly ttlMs = 30_000;

  readonly isBrowser = signal<boolean>(this.supabase.isBrowser());

  readonly searchText = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly isRevalidating = signal<boolean>(false);
  readonly errorText = signal<string>('');

  readonly authHint = signal<boolean>(false);
  readonly needsProvisioning = signal<boolean>(false);

  readonly userEmail = signal<string>('');
  readonly userId = signal<string>('');
  readonly userRole = signal<string>('');

  private readonly pageSize = 200;
  private readonly currentPage = signal<number>(1);
  readonly hasMore = signal<boolean>(true);

  readonly rows = signal<PlayerRow[]>([]);

  readonly lastUpdatedLabel = computed(() => {
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

  readonly filteredTableRows = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const all = this.tableRows();
    if (!q) return all;

    return all.filter((p) => this.matches(p, q));
  });

  readonly columns = signal<any[]>([
    { field: 'hostname', header: 'Hostname', visible: true, filter: true, filterType: 'text', width: '220px' },
    { field: 'site_alias', header: 'Site', visible: true, filter: true, filterType: 'text', width: '180px' },
    { field: 'dealer_alias', header: 'Dealer', visible: true, filter: true, filterType: 'text', width: '180px' },
    { field: 'license_type', header: 'Type', visible: true, filter: true, filterType: 'text', width: '140px' },
    { field: 'screen', header: 'Screen', visible: true, filter: true, filterType: 'text', width: '120px' },
    { field: 'tags_display', header: 'Tags', visible: true, filter: true, filterType: 'text', width: '220px' },
    { field: 'mesh_device_id', header: 'Mesh ID', visible: false, filter: true, filterType: 'text', width: '220px' },
    { field: 'dashboard_url', header: 'Dashboard URL', visible: false, filter: true, filterType: 'text', width: '280px' },
    { field: 'mesh_url', header: 'Mesh URL', visible: false, filter: true, filterType: 'text', width: '280px' },
    { field: 'license_uuid', header: 'License UUID', visible: true, filter: true, filterType: 'text', width: '320px' },
  ]);

  constructor() {
    if (this.supabase.isBrowser()) {
      void this.initLoad();
    }
  }

  private async initLoad(): Promise<void> {
    // 1) Hydrate from cache (instant)
    const cached = this.swr.read<CacheState>(this.cacheKey);
    if (cached) {
      this.rows.set(cached.rows ?? []);
      this.currentPage.set(cached.currentPage ?? 1);
      this.hasMore.set(cached.hasMore ?? true);
      this.userEmail.set(cached.userEmail ?? '');
      this.userId.set(cached.userId ?? '');
      this.userRole.set(cached.userRole ?? '');
    }

    // 2) Revalidate if stale
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

  onClear(): void {
    this.searchText.set('');
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

      const state = await this.swr.revalidate<CacheState>(this.cacheKey, async () => {
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

      this.swr.write<CacheState>(this.cacheKey, {
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
    const hasMore = batch.length === this.pageSize;
    return { batch, hasMore };
  }

  private matches(p: PlayerTableRow, q: string): boolean {
    const haystack: string[] = [
      p.license_uuid,
      p.hostname ?? '',
      p.site_alias ?? '',
      p.dealer_alias ?? '',
      p.license_type ?? '',
      p.screen ?? '',
      p.tags_display ?? '',
      p.mesh_device_id ?? '',
    ];
    return haystack.some((v) => (v ?? '').toLowerCase().includes(q));
  }
}