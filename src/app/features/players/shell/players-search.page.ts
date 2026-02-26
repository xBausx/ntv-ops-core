import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Input } from '@ntv360/component-pantry';

@Component({
  selector: 'app-players-search-page',
  standalone: true,
  imports: [RouterLink, Input],
  template: `
    <div class="min-h-screen bg-black text-white flex flex-col">
      <div class="w-full max-w-none mx-auto px-6 xl:px-10 2xl:px-12 py-6 flex flex-1 flex-col min-h-0">
        <div class="flex items-start justify-between gap-6">
          <div class="flex flex-col gap-2">
            <div class="inline-flex items-center gap-3">
              <span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600"></span>
              <span class="text-xs uppercase tracking-[0.22em] text-white/70">Ops Core</span>
            </div>

            <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Player Search</h1>

            <p class="text-sm text-white/70 max-w-2xl">
              Search by <span class="text-white font-semibold">license_uuid</span>, hostname, dealer, or site.
              Jump to the player profile with Dashboard + MeshCentral deep links.
            </p>
          </div>

          <a routerLink="/dashboard" class="text-sm font-semibold text-white/80 hover:text-white transition">
            Back to Launchpad →
          </a>
        </div>

        <div class="mt-6 flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
          <!-- Search box -->
          <div class="border border-white/10 bg-white/5 rounded-2xl p-6 xl:w-[360px] xl:shrink-0">
            <h2 class="text-base font-bold">Search</h2>

            <label class="mt-4 block text-xs uppercase tracking-[0.18em] text-white/60">
              License UUID / Hostname / Dealer / Site
            </label>

            <!-- Temporary plain input until we verify pantry ntv-input usage -->
            <ntv-input
                class="mt-2 w-full"
                type="text"
                placeholder="e.g., 2f1c... or NTV-PLAYER-001 or dealer/site"
            ></ntv-input>

            <div class="mt-3 text-xs text-white/50">
              Next: wire this to Supabase query (players + mappings) and show results.
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">license_uuid</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">hostname</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">dealer</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">site</span>
            </div>
          </div>

          <!-- Results placeholder -->
          <div class="border border-white/10 bg-white/5 rounded-2xl p-6 flex flex-col flex-1 min-w-0 min-h-0">
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-base font-bold">Results</h2>
              <span class="text-xs text-white/60">
                Source: <span class="text-white">public.players</span>
              </span>
            </div>

            <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <p class="text-sm text-white/70">
                Results list goes here next (table/cards). Clicking a row navigates to:
                <span class="text-white font-semibold">/players/:licenseUuid</span>
              </p>

              <div class="mt-3 text-xs text-white/50">
                MVP fields: license_uuid, hostname, dealer/site, license_type, screen, tags, dashboard_url, mesh_url.
              </div>
            </div>

            <div class="mt-6 flex items-center gap-3 text-sm">
              <span class="text-white/60">Quick nav:</span>
              <a routerLink="/installations" class="font-semibold text-white/80 hover:text-white transition">Install Queue</a>
              <span class="text-white/30">•</span>
              <a routerLink="/incidents" class="font-semibold text-white/80 hover:text-white transition">Incident Queue</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PlayersSearchPageComponent {}