import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-player-profile-page',
  standalone: true,
  imports: [RouterLink, NgIf, AsyncPipe],
  template: `
    <div class="min-h-screen bg-black text-white">
      <div class="max-w-[1440px] mx-auto px-8 py-8">
        <ng-container *ngIf="licenseUuid$ | async as licenseUuid">
          <div class="flex items-start justify-between gap-6">
            <div class="flex flex-col gap-2">
              <div class="inline-flex items-center gap-3">
                <span
                  class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600"
                ></span>
                <span class="text-xs uppercase tracking-[0.22em] text-white/70">Ops Core</span>
              </div>

              <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Player Profile</h1>

              <div class="text-sm text-white/70">
                License UUID:
                <span class="font-semibold text-white break-all">{{ licenseUuid }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <a
                routerLink="/players"
                class="text-sm font-semibold text-white/80 hover:text-white transition"
              >
                ← Back to Search
              </a>
            </div>
          </div>

          <div class="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <!-- Core details -->
            <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
              <h2 class="text-base font-bold">Core</h2>

              <div class="mt-4 space-y-3 text-sm">
                <div class="flex items-center justify-between gap-4">
                  <span class="text-white/60">Hostname</span>
                  <span class="text-white/40">—</span>
                </div>

                <div class="flex items-center justify-between gap-4">
                  <span class="text-white/60">Dealer</span>
                  <span class="text-white/40">—</span>
                </div>

                <div class="flex items-center justify-between gap-4">
                  <span class="text-white/60">Site</span>
                  <span class="text-white/40">—</span>
                </div>

                <div class="flex items-center justify-between gap-4">
                  <span class="text-white/60">License Type</span>
                  <span class="text-white/40">—</span>
                </div>

                <div class="flex items-center justify-between gap-4">
                  <span class="text-white/60">Screen</span>
                  <span class="text-white/40">—</span>
                </div>
              </div>

              <div class="mt-5 text-xs text-white/50">
                Next: load from <span class="text-white">public.players</span> by
                <span class="text-white">license_uuid</span>.
              </div>
            </div>

            <!-- Links -->
            <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
              <h2 class="text-base font-bold">Links</h2>

              <div class="mt-4 space-y-3">
                <div class="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div class="text-xs uppercase tracking-[0.18em] text-white/60">NCompass Dashboard</div>
                  <div class="mt-2 text-sm text-white/70">
                    Deep link stored in <span class="text-white">players.dashboard_url</span>
                  </div>
                  <div class="mt-3">
                    <span class="inline-flex items-center gap-2 text-sm font-semibold text-white/40">
                      Open Dashboard →
                    </span>
                  </div>
                </div>

                <div class="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div class="text-xs uppercase tracking-[0.18em] text-white/60">MeshCentral</div>
                  <div class="mt-2 text-sm text-white/70">
                    Stored: <span class="text-white">mesh_device_id</span> + <span class="text-white">mesh_url</span>
                  </div>
                  <div class="mt-3">
                    <span class="inline-flex items-center gap-2 text-sm font-semibold text-white/40">
                      Connect →
                    </span>
                  </div>
                </div>
              </div>

              <div class="mt-5 text-xs text-white/50">
                Next: enable buttons when URLs are present.
              </div>
            </div>

            <!-- Work + history -->
            <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
              <h2 class="text-base font-bold">Work</h2>

              <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <p class="text-sm text-white/70">Open work items + history will render here.</p>
                <div class="mt-3 text-xs text-white/50">
                  Data sources:
                  <span class="text-white">work_item_players</span>,
                  <span class="text-white">work_items</span>,
                  <span class="text-white">work_events</span>.
                </div>
              </div>

              <div class="mt-6 text-xs text-white/50">
                Next: add a query that fetches open work items (status not CLOSED) and recent history.
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class PlayerProfilePageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly licenseUuid$ = this.route.paramMap.pipe(map((p) => p.get('licenseUuid') ?? ''));
}