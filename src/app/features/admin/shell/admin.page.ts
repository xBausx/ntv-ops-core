import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-black text-white">
      <div class="max-w-[1440px] mx-auto px-8 py-8">
        <div class="flex items-start justify-between gap-6">
          <div class="flex flex-col gap-2">
            <div class="inline-flex items-center gap-3">
              <span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600"></span>
              <span class="text-xs uppercase tracking-[0.22em] text-white/70">Ops Core</span>
            </div>

            <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Admin</h1>

            <p class="text-sm text-white/70 max-w-2xl">
              Restricted operations: XLSX import, external reference linking, and operational configuration.
            </p>
          </div>

          <a routerLink="/dashboard" class="text-sm font-semibold text-white/80 hover:text-white transition">
            Back to Launchpad →
          </a>
        </div>

        <div class="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
            <h2 class="text-base font-bold">XLSX Import (MVP)</h2>
            <p class="mt-3 text-sm text-white/70">
              Next: upload XLSX → Edge Function parses → idempotent upserts into
              <span class="text-white">players</span>, <span class="text-white">work_items</span>,
              <span class="text-white">work_item_players</span>, <span class="text-white">external_refs</span>.
            </p>
            <div class="mt-4 text-xs text-white/50">
              Audit: write <span class="text-white">IMPORTED_FROM_XLSX</span> events per work item.
            </div>
          </div>

          <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
            <h2 class="text-base font-bold">External References</h2>
            <p class="mt-3 text-sm text-white/70">
              Link/unlink Monday/HubSpot/Sheets references to players or work items (admin-only).
            </p>
            <div class="mt-4 text-xs text-white/50">
              Source: <span class="text-white">public.external_refs</span>
            </div>
          </div>

          <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
            <h2 class="text-base font-bold">Roles</h2>
            <p class="mt-3 text-sm text-white/70">
              Roles are stored in <span class="text-white">public.profiles</span>.
              For now, manage via service role / SQL (no self-referential RLS policies).
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminPageComponent {}