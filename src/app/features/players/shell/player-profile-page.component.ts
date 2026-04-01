/** Angular Imports */
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

/** Local Imports */
import { SupabaseService } from '@core';
import type { PlayerRow } from '../models/player.models';

type LinkedWorkItem = {
  work_id: string;
  type: string;
  status: string;
  priority: number;
  summary: string;
  scheduled_for: string | null;
  updated_at: string;
};

@Component({
  selector: 'app-player-profile-page',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <section class="space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Player Profile</div>
          <h1 class="mt-1 page-title">{{ pageTitle() }}</h1>
          <p class="mt-1 max-w-3xl text-sm text-white/60">
            Canonical player mapping with deep links and associated work history.
          </p>
        </div>

        <a routerLink="/players" class="text-sm font-semibold text-white/70 underline hover:text-white">
          Back to Players →
        </a>
      </div>

      @if (!isBrowser()) {
        <div class="card-modern">
          <div class="p-4 md:p-5">
            <p class="text-sm font-semibold text-white/75">SSR render</p>
            <p class="mt-1 text-sm text-white/60">Player data loads in the browser only.</p>
          </div>
        </div>
      } @else {
        @if (authHint()) {
          <div class="card-modern">
            <div class="p-4 md:p-5">
              <p class="text-sm font-semibold text-white/75">Sign-in required</p>
              <p class="mt-1 text-sm text-white/60">
                Go to
                <a routerLink="/login" class="font-semibold text-white/80 underline hover:text-white">/login</a>
                to authenticate.
              </p>
            </div>
          </div>
        }

        @if (needsProvisioning()) {
          <div class="card-modern">
            <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 md:p-5">
              <p class="text-sm font-bold text-amber-200">Account not provisioned</p>
              <p class="mt-1 text-sm text-amber-100/80">
                You’re signed in, but missing a role row in <span class="font-semibold">public.profiles</span>.
              </p>
            </div>
          </div>
        }

        @if (errorText()) {
          <div class="card-modern">
            <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 md:p-5">
              <p class="text-sm font-bold text-red-200">Load failed</p>
              <p class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">{{ errorText() }}</p>
            </div>
          </div>
        }

        @if (isLoading()) {
          <div class="card-modern">
            <div class="p-4 md:p-5">
              <p class="text-sm font-semibold text-white/75">Loading player…</p>
            </div>
          </div>
        } @else if (player()) {
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div class="card-modern">
              <div class="p-4 md:p-5">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-extrabold text-white/80">Player mapping</div>
                    <p class="mt-1 text-sm text-white/60">
                      Core identity and operational mapping details for this player.
                    </p>
                  </div>

                  <div class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-white/45">
                    Canonical
                  </div>
                </div>

                <dl class="mt-4 grid gap-4 md:grid-cols-2">
                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">License UUID</dt>
                    <dd class="mt-1 break-all text-sm text-white/85">{{ player()!.license_uuid }}</dd>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">Hostname</dt>
                    <dd class="mt-1 text-sm text-white/80">{{ player()!.hostname || '—' }}</dd>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">Dealer</dt>
                    <dd class="mt-1 text-sm text-white/80">{{ player()!.dealer_alias || '—' }}</dd>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">Site</dt>
                    <dd class="mt-1 text-sm text-white/80">{{ player()!.site_alias || '—' }}</dd>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">License Type</dt>
                    <dd class="mt-1 text-sm text-white/80">{{ player()!.license_type || '—' }}</dd>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">Screen</dt>
                    <dd class="mt-1 text-sm text-white/80">{{ player()!.screen || '—' }}</dd>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">Mesh Device ID</dt>
                    <dd class="mt-1 break-all text-sm text-white/80">{{ player()!.mesh_device_id || '—' }}</dd>
                  </div>

                  <div class="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <dt class="text-xs font-bold uppercase tracking-wide text-white/40">Tags</dt>
                    <dd class="mt-1 text-sm text-white/80">{{ tagsLabel() }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div class="card-modern">
              <div class="p-4 md:p-5">
                <div class="text-sm font-extrabold text-white/80">Deep links</div>
                <p class="mt-1 text-sm text-white/60">
                  Direct links to external operational tools.
                </p>

                <div class="mt-4 flex flex-col gap-3">
                  @if (player()!.dashboard_url) {
                    <a
                      [href]="player()!.dashboard_url!"
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center justify-between rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    >
                      <span>Open Dashboard</span>
                      <span>↗</span>
                    </a>
                  } @else {
                    <div class="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
                      Dashboard link unavailable
                    </div>
                  }

                  @if (player()!.mesh_url) {
                    <a
                      [href]="player()!.mesh_url!"
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center justify-between rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    >
                      <span>Open MeshCentral</span>
                      <span>↗</span>
                    </a>
                  } @else {
                    <div class="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
                      MeshCentral link unavailable
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="card-modern">
            <div class="p-4 md:p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="text-sm font-extrabold text-white/80">Associated work</div>
                  <p class="mt-1 text-sm text-white/60">
                    Work linked through <span class="font-semibold">work_item_players</span>.
                  </p>
                </div>

                <a routerLink="/players" class="text-sm font-semibold text-white/70 underline hover:text-white">
                  Search another player →
                </a>
              </div>

              @if (linkedWorkItems().length === 0) {
                <div class="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p class="text-sm font-semibold text-white/75">No linked work found</p>
                </div>
              } @else {
                <div class="table-scroll-region mt-4 overflow-x-auto">
                  <table class="table-modern table-dense w-full">
                    <thead>
                      <tr>
                        <th>Work</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Summary</th>
                        <th>Scheduled</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of linkedWorkItems(); track item.work_id) {
                        <tr class="cursor-pointer">
                          <td class="col-muted text-truncate">
                            {{ item.work_id }}
                          </td>
                          <td class="col-secondary">{{ item.type }}</td>

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

                          <td class="col-primary">
                            {{ item.summary }}
                          </td>

                          <td class="col-secondary">
                            {{ item.scheduled_for ? formatDate(item.scheduled_for) : '—' }}
                          </td>

                          <td class="text-right">
                            <a
                              [routerLink]="['/work', item.work_id]"
                              class="btn-modern btn-secondary"
                            >
                              Open
                            </a>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="card-modern">
            <div class="p-4 md:p-5">
              <p class="text-sm font-semibold text-white/75">Player not found</p>
              <p class="mt-1 text-sm text-white/60">
                The requested player mapping could not be found.
              </p>
            </div>
          </div>
        }
      }
    </section>
  `,
})
export class PlayerProfilePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);

  readonly isBrowser = signal<boolean>(this.supabase.isBrowser());
  readonly isLoading = signal<boolean>(false);
  readonly errorText = signal<string>('');

  readonly authHint = signal<boolean>(false);
  readonly needsProvisioning = signal<boolean>(false);

  readonly player = signal<PlayerRow | null>(null);
  readonly linkedWorkItems = signal<LinkedWorkItem[]>([]);

  readonly licenseUuid = signal<string>('');

  readonly pageTitle = computed(() => {
    const p = this.player();
    return p?.hostname || this.licenseUuid() || 'Player';
  });

  readonly tagsLabel = computed(() => {
    const tags = this.player()?.tags ?? [];
    return tags.length ? tags.join(', ') : '—';
  });

  constructor() {
    if (!this.supabase.isBrowser()) return;

    const licenseUuid = this.route.snapshot.paramMap.get('license_uuid') ?? '';
    this.licenseUuid.set(licenseUuid);

    void this.loadProfile(licenseUuid);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString();
  }

  private async loadProfile(licenseUuid: string): Promise<void> {
    this.errorText.set('');
    this.authHint.set(false);
    this.needsProvisioning.set(false);
    this.isLoading.set(true);

    try {
      const client = this.supabase.client();

      const sessionRes = await client.auth.getSession();
      const session = sessionRes.data.session;

      if (!session) {
        this.authHint.set(true);
        this.player.set(null);
        this.linkedWorkItems.set([]);
        return;
      }

      const { data: profile, error: profileError } = await client.from('profiles').select('role').maybeSingle();

      if (profileError) this.errorText.set(profileError.message);

      const role = profile?.role ?? '';
      if (!role) {
        this.needsProvisioning.set(true);
        this.player.set(null);
        this.linkedWorkItems.set([]);
        return;
      }

      const { data: playerData, error: playerError } = await client
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
        .eq('license_uuid', licenseUuid)
        .maybeSingle();

      if (playerError) {
        this.errorText.set(playerError.message);
        this.player.set(null);
        this.linkedWorkItems.set([]);
        return;
      }

      this.player.set((playerData as PlayerRow | null) ?? null);

      if (!playerData) {
        this.linkedWorkItems.set([]);
        return;
      }

      const { data: links, error: linksError } = await client
        .from('work_item_players')
        .select('work_id')
        .eq('license_uuid', licenseUuid);

      if (linksError) {
        this.errorText.set(linksError.message);
        this.linkedWorkItems.set([]);
        return;
      }

      const workIds = (links ?? []).map((row) => row.work_id).filter(Boolean);

      if (workIds.length === 0) {
        this.linkedWorkItems.set([]);
        return;
      }

      const { data: workItems, error: workItemsError } = await client
        .from('work_items')
        .select(
          `
          work_id,
          type,
          status,
          priority,
          summary,
          scheduled_for,
          updated_at
        `,
        )
        .in('work_id', workIds)
        .order('updated_at', { ascending: false });

      if (workItemsError) {
        this.errorText.set(workItemsError.message);
        this.linkedWorkItems.set([]);
        return;
      }

      this.linkedWorkItems.set((workItems ?? []) as LinkedWorkItem[]);
    } catch (e) {
      this.errorText.set(String(e));
      this.player.set(null);
      this.linkedWorkItems.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
