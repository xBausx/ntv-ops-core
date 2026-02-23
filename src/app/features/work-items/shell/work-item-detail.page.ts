import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-work-item-detail-page',
  standalone: true,
  imports: [RouterLink, NgIf, AsyncPipe],
  template: `
    <div class="min-h-screen bg-black text-white">
      <div class="max-w-[1440px] mx-auto px-8 py-8">
        <ng-container *ngIf="workId$ | async as workId">
          <div class="flex items-start justify-between gap-6">
            <div class="flex flex-col gap-2">
              <div class="inline-flex items-center gap-3">
                <span
                  class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600"
                ></span>
                <span class="text-xs uppercase tracking-[0.22em] text-white/70">Ops Core</span>
              </div>

              <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Work Item</h1>

              <div class="text-sm text-white/70">
                Work ID:
                <span class="font-semibold text-white break-all">{{ workId }}</span>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <a
                routerLink="/installations"
                class="text-sm font-semibold text-white/80 hover:text-white transition"
              >
                ← Install Queue
              </a>
              <a
                routerLink="/incidents"
                class="text-sm font-semibold text-white/80 hover:text-white transition"
              >
                Incident Queue →
              </a>
            </div>
          </div>

          <div class="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <!-- Summary -->
            <div class="border border-white/10 bg-white/5 rounded-2xl p-6 xl:col-span-2">
              <div class="flex items-center justify-between gap-4">
                <h2 class="text-base font-bold">Summary</h2>
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">MVP</span>
              </div>

              <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <div class="text-xs uppercase tracking-[0.18em] text-white/60">Fields</div>
                <div class="mt-2 text-sm text-white/70">
                  Next: load from <span class="text-white">public.work_items</span> by
                  <span class="text-white">work_id</span> and show:
                  <span class="text-white">type</span>, <span class="text-white">status</span>,
                  <span class="text-white">priority</span>, <span class="text-white">scheduled_for</span>,
                  <span class="text-white">sla_due</span>, <span class="text-white">assignee</span>.
                </div>
              </div>

              <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <div class="text-xs uppercase tracking-[0.18em] text-white/60">Notes</div>
                <div class="mt-2 text-sm text-white/70">
                  Notes will be written as append-only events
                  (<span class="text-white">work_events</span>) to preserve audit integrity.
                </div>
              </div>
            </div>

            <!-- Linked Players -->
            <div class="border border-white/10 bg-white/5 rounded-2xl p-6">
              <h2 class="text-base font-bold">Linked Players</h2>

              <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <p class="text-sm text-white/70">
                  Next: query <span class="text-white">work_item_players</span> +
                  <span class="text-white">players</span> and list linked license UUIDs.
                </p>

                <div class="mt-3 text-xs text-white/50">
                  Clicking a player will navigate to:
                  <span class="text-white font-semibold">/players/:licenseUuid</span>
                </div>
              </div>
            </div>

            <!-- Timeline -->
            <div class="border border-white/10 bg-white/5 rounded-2xl p-6 xl:col-span-3">
              <div class="flex items-center justify-between gap-4">
                <h2 class="text-base font-bold">Audit Timeline</h2>
                <span class="text-xs text-white/60">
                  Source: <span class="text-white">public.work_events</span>
                </span>
              </div>

              <div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <p class="text-sm text-white/70">
                  Next: render events (created + status changes) in reverse chronological order.
                </p>
                <div class="mt-3 text-xs text-white/50">
                  We already auto-log:
                  <span class="text-white">WORK_ITEM_CREATED</span> and
                  <span class="text-white">STATUS_CHANGED</span>.
                </div>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class WorkItemDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly workId$ = this.route.paramMap.pipe(map((p) => p.get('workId') ?? ''));
}