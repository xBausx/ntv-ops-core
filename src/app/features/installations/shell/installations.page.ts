import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-installations-page',
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

            <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Install Queue</h1>

            <p class="text-sm text-white/70 max-w-2xl">
              Spreadsheet replacement for “Today Forward” with saved views, strict statuses, and audit events.
            </p>
          </div>

          <a routerLink="/dashboard" class="text-sm font-semibold text-white/80 hover:text-white transition">
            Back to Launchpad →
          </a>
        </div>

        <div class="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
            <h2 class="text-base font-bold">Saved Views (MVP)</h2>
            <div class="mt-3 flex flex-wrap gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Today</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Tomorrow</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">This Week</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Blocked</span>
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">Unassigned</span>
            </div>
            <p class="mt-3 text-sm text-white/60">
              Next we’ll back these with query params and <span class="text-white">v_install_queue</span>.
            </p>
          </div>

          <div class="border border-white/10 bg-white/5 rounded-2xl p-6 xl:col-span-2">
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-base font-bold">Queue</h2>
              <span class="text-xs text-white/60">
                Source: <span class="text-white">public.v_install_queue</span>
              </span>
            </div>

            <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <p class="text-sm text-white/70">
                Grid goes here next. We’ll start with pantry table if it meets needs; otherwise we’ll wrap a grid library
                behind an internal abstraction.
              </p>

              <div class="mt-3 text-xs text-white/50">
                Required columns (MVP): scheduled_for, status, priority, dealer/site, license_uuid, hostname, assignee, SLA due.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class InstallationsPageComponent {}