/** Angular Imports */
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** Third Party Imports */
import { Button, Card } from '@ntv360/component-pantry';

/** Local Imports */
import { SupabaseService, SwrCacheService } from '@core';
import {
  CLIENT_EDITABLE_WORK_STATUSES,
  type LinkedPlayer,
  type WorkDetailCacheState,
  type WorkEvent,
  type WorkItem,
} from './models/work-item.models';

@Component({
  selector: 'app-work-detail-page',
  standalone: true,
  imports: [Card, Button, DatePipe, RouterLink],
  template: `
    <section class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <a
            [routerLink]="backLink()"
            class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45 transition hover:text-white/75"
          >
            <span aria-hidden="true">←</span>
            <span>Back to {{ backLabel() }}</span>
          </a>

          <h1 class="mt-2 truncate text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            @if (workItem()) {
              {{ workItem()!.summary }}
            } @else {
              Work Item
            }
          </h1>

          <div class="mt-2 text-sm text-white/60">
            Work ID:
            <span class="font-semibold text-white/75">{{ workId() }}</span>
          </div>

          @if (lastUpdatedLabel()) {
            <div
              class="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-white/45"
            >
              <span>Last updated:</span>
              <span class="ml-1 text-white/65">{{ lastUpdatedLabel() }}</span>
              @if (isRevalidating()) {
                <span class="ml-2 text-white/30">(refreshing…)</span>
              }
            </div>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ntv-button (click)="refreshHard()" [disabled]="isLoading() || !isBrowser()">
            Refresh
          </ntv-button>
        </div>
      </div>

      <!-- Status strip + actions -->
      <ntv-card>
        <div class="p-4 md:p-5">
          @if (!isBrowser()) {
            <div class="rounded-xl border border-white/10 bg-white/5 p-4">
              <p class="text-sm font-semibold text-white/70">SSR render</p>
              <p class="mt-1 text-sm text-white/60">Data loads in the browser only.</p>
            </div>
          } @else {
            @if (authHint()) {
              <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                <p class="text-sm font-semibold text-white/70">Sign-in required</p>
                <p class="mt-1 text-sm text-white/60">
                  Go to
                  <a routerLink="/login" class="font-semibold text-white/80 underline hover:text-white">
                    /login
                  </a>
                  to authenticate.
                </p>
              </div>
            }

            @if (needsProvisioning()) {
              <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p class="text-sm font-bold text-amber-200">Account not provisioned</p>
                <p class="mt-1 text-sm text-amber-100/80">
                  You’re signed in but missing a role row in
                  <span class="font-semibold">public.profiles</span>.
                </p>
              </div>
            }

            @if (errorText()) {
              <div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p class="text-sm font-bold text-red-200">Error</p>
                <p class="mt-1 whitespace-pre-wrap text-sm text-red-100/80">{{ errorText() }}</p>
              </div>
            }

            @if (isLoading() && !workItem()) {
              <div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p class="text-sm font-semibold text-white/75">Loading…</p>
              </div>
            } @else if (!authHint() && !needsProvisioning() && !workItem()) {
              <div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p class="text-sm font-semibold text-white/75">Not found</p>
                <p class="mt-1 text-sm text-white/60">No work item returned for this ID.</p>
              </div>
            } @else if (workItem()) {
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-white/40">Type</div>
                  <div class="mt-1 text-sm font-extrabold text-white/85">{{ workItem()!.type }}</div>
                </div>

                <div class="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-blue-200/70">Status</div>
                  <div class="mt-1 text-sm font-extrabold text-blue-100">{{ workItem()!.status }}</div>
                </div>

                <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div class="text-[10px] font-bold uppercase tracking-wide text-white/40">Priority</div>
                  <div class="mt-1 text-sm font-extrabold text-white/85">{{ workItem()!.priority }}</div>
                </div>
              </div>

              <!-- Update status -->
              <div class="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div class="text-sm text-white/60">
                    Client updates currently support
                    <span class="font-semibold text-white/75">NEW</span>,
                    <span class="font-semibold text-white/75">SCHEDULED</span>,
                    <span class="font-semibold text-white/75">IN_PROGRESS</span>, and
                    <span class="font-semibold text-white/75">BLOCKED</span>.
                    <span class="font-semibold text-white/75">VERIFIED</span> and
                    <span class="font-semibold text-white/75">CLOSED</span> require a privileged backend operation.
                  </div>

                  <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
                    <div class="text-[10px] font-bold uppercase tracking-wide text-white/40">Role</div>
                    <div class="text-sm font-extrabold text-white/75">{{ userRole() || '—' }}</div>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">
                      New status
                    </label>
                    <select
                      class="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/[0.06]"
                      [value]="statusDraft()"
                      (change)="onStatusDraft($event)"
                      [disabled]="!isWritable()"
                    >
                      @for (s of statuses(); track s) {
                        <option [value]="s">{{ s }}</option>
                      }
                    </select>
                  </div>

                  @if (statusDraft() === 'BLOCKED') {
                    <div>
                      <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">
                        Blocked reason code
                      </label>
                      <input
                        class="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06]"
                        placeholder="e.g. PARTS_WAITING"
                        [value]="blockedCodeDraft()"
                        (input)="onBlockedCodeDraft($event)"
                        [disabled]="!isWritable()"
                      />
                    </div>

                    <div>
                      <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">
                        Blocked details
                      </label>
                      <input
                        class="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06]"
                        placeholder="Explain what's blocking…"
                        [value]="blockedDetailDraft()"
                        (input)="onBlockedDetailDraft($event)"
                        [disabled]="!isWritable()"
                      />
                    </div>
                  } @else {
                    <div class="flex items-end lg:col-span-2">
                      <div class="text-sm text-white/50">
                        Tip: choose
                        <span class="font-semibold text-white/70">BLOCKED</span>
                        to set blocked reason fields.
                      </div>
                    </div>
                  }
                </div>

                <div class="mt-4 flex items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.10] hover:text-white disabled:opacity-50"
                    (click)="resetDraft()"
                    [disabled]="!isWritable() || isSavingStatus()"
                  >
                    Reset
                  </button>

                  <ntv-button (click)="saveStatus()" [disabled]="!isWritable() || isSavingStatus()">
                    @if (isSavingStatus()) {
                      Saving…
                    } @else {
                      Save
                    }
                  </ntv-button>
                </div>

                @if (!isWritable()) {
                  <div class="mt-3 text-xs font-semibold text-white/40">
                    Read-only access: status updates require role OPS or ADMIN.
                  </div>
                }
              </div>

              <!-- Add note -->
              <div class="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div class="text-sm font-extrabold text-white/80">Add note</div>
                <div class="mt-1 text-sm text-white/60">
                  Adds an append-only audit event:
                  <span class="font-semibold text-white/75">NOTE_ADDED</span>.
                </div>

                <div class="mt-4">
                  <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-white/50">Note</label>
                  <textarea
                    class="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06]"
                    placeholder="What happened? What did you check? What's the next step?"
                    [value]="noteDraft()"
                    (input)="onNoteDraft($event)"
                    [disabled]="!isWritable()"
                  ></textarea>
                </div>

                <div class="mt-3 flex items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.10] hover:text-white disabled:opacity-50"
                    (click)="noteDraft.set('')"
                    [disabled]="!isWritable() || isSavingNote()"
                  >
                    Clear
                  </button>

                  <ntv-button
                    (click)="addNote()"
                    [disabled]="!isWritable() || isSavingNote() || noteDraft().trim().length === 0"
                  >
                    @if (isSavingNote()) {
                      Adding…
                    } @else {
                      Add note
                    }
                  </ntv-button>
                </div>
              </div>
            }
          }
        </div>
      </ntv-card>

      <!-- Linked players + search/link/unlink -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="flex items-center justify-between">
            <div class="text-sm font-extrabold text-white/80">Linked players</div>
            <div class="text-xs font-semibold text-white/40">{{ players().length }}</div>
          </div>

          <!-- Player search -->
          <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div class="text-sm font-extrabold text-white/80">Player search</div>
                <div class="mt-1 text-sm text-white/60">
                  Search by hostname/site/dealer/license UUID. Click <span class="font-semibold">Add</span> to link.
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="rounded-xl px-3 py-2 text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                  (click)="clearSearch()"
                  [disabled]="isSearching()"
                >
                  Clear
                </button>

                <ntv-button
                  (click)="searchPlayers()"
                  [disabled]="isSearching() || playerSearch().trim().length < 2"
                >
                  @if (isSearching()) { Searching… } @else { Search }
                </ntv-button>
              </div>
            </div>

            <div class="mt-3">
              <input
                class="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                placeholder="Type at least 2 characters…"
                [value]="playerSearch()"
                (input)="onPlayerSearchInput($event)"
                (keydown.enter)="searchPlayers()"
              />
            </div>

            @if (searchError()) {
              <div class="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <div class="text-sm font-bold text-red-200">Search failed</div>
                <div class="mt-1 text-sm text-red-100/80 whitespace-pre-wrap">{{ searchError() }}</div>
              </div>
            }

            @if (searchResults().length > 0) {
              <div class="mt-4 space-y-2">
                @for (p of searchResults(); track p.license_uuid) {
                  <div class="rounded-xl border border-white/10 bg-black/30 p-3 flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-sm font-extrabold text-white/80 truncate">
                        {{ p.hostname || '(no hostname)' }}
                      </div>
                      <div class="mt-1 text-xs text-white/60 break-all">
                        <span class="text-white/30">license_uuid:</span>
                        <span class="text-white/70 font-semibold">{{ p.license_uuid }}</span>
                      </div>
                      <div class="mt-2 text-xs text-white/60 flex flex-wrap gap-x-4 gap-y-1">
                        <span><span class="text-white/30">Site:</span> <span class="text-white/70 font-semibold">{{ p.site_alias || '—' }}</span></span>
                        <span><span class="text-white/30">Dealer:</span> <span class="text-white/70 font-semibold">{{ p.dealer_alias || '—' }}</span></span>
                      </div>
                    </div>

                    <div class="shrink-0 flex flex-col items-end gap-2">
                      <div class="flex items-center gap-2">
                        @if (p.dashboard_url) {
                          <a class="text-xs font-bold text-white/70 hover:text-white underline" [href]="p.dashboard_url" target="_blank" rel="noreferrer">
                            Dashboard ↗
                          </a>
                        }
                        @if (p.mesh_url) {
                          <a class="text-xs font-bold text-white/70 hover:text-white underline" [href]="p.mesh_url" target="_blank" rel="noreferrer">
                            Mesh ↗
                          </a>
                        }
                      </div>

                      @if (linkedSet().has(p.license_uuid)) {
                        <div class="text-xs font-bold text-white/40">Linked</div>
                      } @else {
                        <button
                          class="rounded-xl px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                          (click)="addFromSearch(p.license_uuid)"
                          [disabled]="!isWritable() || isLinking() || isUnlinking()"
                        >
                          Add
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else if (!isSearching() && playerSearch().trim().length >= 2) {
              <div class="mt-3 text-sm text-white/50">
                No matches.
              </div>
            }
          </div>

          @if (linkError()) {
            <div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <div class="text-sm font-bold text-red-200">Linking failed</div>
              <div class="mt-1 text-sm text-red-100/80 whitespace-pre-wrap">{{ linkError() }}</div>
            </div>
          }

          @if (unlinkError()) {
            <div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <div class="text-sm font-bold text-red-200">Unlink failed</div>
              <div class="mt-1 text-sm text-red-100/80 whitespace-pre-wrap">{{ unlinkError() }}</div>
            </div>
          }

          <!-- Bulk link input -->
          @if (isWritable()) {
            <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-sm font-extrabold text-white/80">Bulk link by license UUID</div>
              <div class="mt-1 text-sm text-white/60">
                Paste one or more <span class="font-semibold">license_uuid</span> values (comma/newline separated).
              </div>

              <div class="mt-3">
                <textarea
                  class="w-full min-h-[96px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                  placeholder="uuid1&#10;uuid2&#10;uuid3"
                  [value]="linkInput()"
                  (input)="onLinkInput($event)"
                  [disabled]="isLinking()"
                ></textarea>
              </div>

              <div class="mt-3 flex items-center justify-end gap-2">
                <button
                  class="rounded-xl px-3 py-2 text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                  (click)="linkInput.set('')"
                  [disabled]="isLinking()"
                >
                  Clear
                </button>

                <ntv-button
                  (click)="linkPlayers()"
                  [disabled]="isLinking() || parsedLinkUuids().length === 0"
                >
                  @if (isLinking()) { Linking… } @else { Link ({{ parsedLinkUuids().length }}) }
                </ntv-button>
              </div>

              @if (linkInput().trim().length > 0 && parsedLinkUuids().length === 0) {
                <div class="mt-2 text-xs font-semibold text-white/40">
                  No valid UUIDs detected. Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                </div>
              }
            </div>
          } @else {
            <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Read-only: linking/unlinking requires role OPS or ADMIN.
            </div>
          }

          <!-- Linked list -->
          @if (players().length === 0) {
            <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              No players linked.
            </div>
          } @else {
            <div class="mt-4 space-y-2">
              @for (p of players(); track p.license_uuid) {
                <div class="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="text-sm font-extrabold text-white/80 truncate">
                      {{ p.hostname || '(no hostname)' }}
                    </div>
                    <div class="mt-1 text-xs text-white/60">
                      <span class="text-white/30">license_uuid:</span>
                      <span class="text-white/70 font-semibold">{{ p.license_uuid }}</span>
                    </div>
                    <div class="mt-2 text-xs text-white/60 flex flex-wrap gap-x-4 gap-y-1">
                      <span><span class="text-white/30">Site:</span> <span class="text-white/70 font-semibold">{{ p.site_alias || '—' }}</span></span>
                      <span><span class="text-white/30">Dealer:</span> <span class="text-white/70 font-semibold">{{ p.dealer_alias || '—' }}</span></span>
                    </div>
                  </div>

                  <div class="shrink-0 flex flex-col gap-2 items-end">
                    <div class="flex items-center gap-2">
                      @if (p.dashboard_url) {
                        <a class="text-xs font-bold text-white/70 hover:text-white underline" [href]="p.dashboard_url" target="_blank" rel="noreferrer">
                          Dashboard ↗
                        </a>
                      }
                      @if (p.mesh_url) {
                        <a class="text-xs font-bold text-white/70 hover:text-white underline" [href]="p.mesh_url" target="_blank" rel="noreferrer">
                          Mesh ↗
                        </a>
                      }
                    </div>

                    @if (isWritable()) {
                      <button
                        class="rounded-xl px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                        (click)="unlinkPlayer(p.license_uuid)"
                        [disabled]="isUnlinking()"
                      >
                        Unlink
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </ntv-card>

      <!-- Timeline -->
      <ntv-card>
        <div class="p-4 md:p-5">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div class="text-sm font-extrabold text-white/80">Timeline</div>
              <div class="mt-1 text-sm text-white/55">
                Append-only event history for this work item, including notes and state transitions.
              </div>
            </div>

            <div
              class="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-white/45"
            >
              {{ events().length }} events
            </div>
          </div>

          @if (events().length === 0) {
            <div class="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/60">
              No events yet.
            </div>
          } @else {
            <div class="mt-4 space-y-3">
              @for (e of events(); track e.event_id) {
                <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/15 hover:bg-white/[0.05]">
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <div class="text-sm font-extrabold text-white/85">{{ e.event_type }}</div>
                        <span class="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-white/45">
                          {{ e.created_at | date:'MMM d, y h:mm a' }}
                        </span>
                      </div>

                      @if (e.created_by) {
                        <div class="mt-2 text-xs text-white/45">
                          Created by
                          <span class="font-semibold text-white/65">{{ e.created_by }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="mt-4">
                    <div class="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                      Payload
                    </div>
                    <pre
                      class="overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/70"
                    ><code>{{ stringify(e.payload) }}</code></pre>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </ntv-card>
    </section>
  `,
})
export class WorkDetailPageComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly swr = inject(SwrCacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ttlMs = 15_000;
  private readonly installQueueCacheKey = 'queue:installations:v1';
  private readonly incidentQueueCacheKey = 'queue:incidents:v1';

  readonly isLoading = signal<boolean>(false);
  readonly isRevalidating = signal<boolean>(false);

  readonly isSavingStatus = signal<boolean>(false);
  readonly isSavingNote = signal<boolean>(false);
  readonly errorText = signal<string>('');

  readonly authHint = signal<boolean>(false);
  readonly needsProvisioning = signal<boolean>(false);

  readonly userRole = signal<string>('');
  readonly workId = signal<string>('');

  readonly workItem = signal<WorkItem | null>(null);
  readonly events = signal<WorkEvent[]>([]);
  readonly players = signal<LinkedPlayer[]>([]);

  readonly statuses = signal<string[]>([...CLIENT_EDITABLE_WORK_STATUSES]);
  readonly isWritable = computed(() => this.userRole() === 'ADMIN' || this.userRole() === 'OPS');

  readonly statusDraft = signal<string>('NEW');
  readonly blockedCodeDraft = signal<string>('');
  readonly blockedDetailDraft = signal<string>('');
  readonly noteDraft = signal<string>('');

  readonly linkInput = signal<string>('');
  readonly isLinking = signal<boolean>(false);
  readonly linkError = signal<string>('');

  readonly isUnlinking = signal<boolean>(false);
  readonly unlinkError = signal<string>('');

  readonly playerSearch = signal<string>('');
  readonly isSearching = signal<boolean>(false);
  readonly searchError = signal<string>('');
  readonly searchResults = signal<LinkedPlayer[]>([]);

  readonly linkedSet = computed(() => new Set(this.players().map((player) => player.license_uuid)));

  readonly parsedLinkUuids = computed(() => {
    const raw = this.linkInput();
    if (!raw) {
      return [];
    }

    const parts = raw
      .split(/[\s,;]+/g)
      .map((value) => value.trim())
      .filter(Boolean);

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const uniqueValues = new Set<string>();
    for (const part of parts) {
      if (uuidRe.test(part)) {
        uniqueValues.add(part.toLowerCase());
      }
    }

    return Array.from(uniqueValues);
  });

  readonly backLink = computed(() => {
    const workItem = this.workItem();
    if (!workItem) {
      return '/installations';
    }

    if (workItem.type === 'INCIDENT') {
      return '/incidents';
    }

    if (workItem.type === 'TASK') {
      return '/installations';
    }

    return '/installations';
  });

  readonly backLabel = computed(() => {
    const workItem = this.workItem();
    if (!workItem) {
      return 'Install Queue';
    }

    if (workItem.type === 'INCIDENT') {
      return 'Incident Queue';
    }

    if (workItem.type === 'TASK') {
      return 'Queues';
    }

    return 'Install Queue';
  });

  readonly lastUpdatedLabel = computed(() => {
    const id = this.workId();
    if (!id) {
      return '';
    }

    const fetchedAt = this.swr.fetchedAt(this.cacheKeyFor(id));
    if (!fetchedAt) {
      return '';
    }

    return new Date(fetchedAt).toLocaleString();
  });

  public isBrowser(): boolean {
    return this.supabase.isBrowser();
  }

  public constructor() {
    this.workId.set(this.route.snapshot.paramMap.get('work_id') ?? '');

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      const id = paramMap.get('work_id') ?? '';
      if (id && id !== this.workId()) {
        this.workId.set(id);
        void this.initLoad(false);
      }
    });

    if (this.supabase.isBrowser()) {
      void this.initLoad(false);
    }
  }

  private cacheKeyFor(workId: string): string {
    return `work:${workId}:v1`;
  }

  private invalidateRelatedQueueCaches(): void {
    const type = this.workItem()?.type;

    if (type === 'INCIDENT') {
      this.swr.invalidate(this.incidentQueueCacheKey);
      return;
    }

    if (type === 'INSTALL' || type === 'TASK') {
      this.swr.invalidate(this.installQueueCacheKey);
      return;
    }

    this.swr.invalidate(this.installQueueCacheKey);
    this.swr.invalidate(this.incidentQueueCacheKey);
  }

  private applyState(state: WorkDetailCacheState): void {
    this.authHint.set(state.authHint);
    this.needsProvisioning.set(state.needsProvisioning);
    this.userRole.set(state.userRole);

    this.workItem.set(state.workItem);
    this.events.set(state.events);
    this.players.set(state.players);

    if (state.workItem) {
      this.statusDraft.set(state.workItem.status);
      this.blockedCodeDraft.set(state.workItem.blocked_reason_code ?? '');
      this.blockedDetailDraft.set(state.workItem.blocked_reason_detail ?? '');
    }
  }

  private async initLoad(force: boolean): Promise<void> {
    this.errorText.set('');

    const id = this.workId();
    if (!this.supabase.isBrowser() || !id) {
      return;
    }

    const key = this.cacheKeyFor(id);
    const cached = this.swr.read<WorkDetailCacheState>(key);

    if (cached) {
      this.applyState(cached);
    } else {
      this.applyState({
        workItem: null,
        events: [],
        players: [],
        userRole: '',
        authHint: false,
        needsProvisioning: false,
      });
    }

    const shouldRevalidate = force || this.swr.isStale(key, this.ttlMs);
    if (!shouldRevalidate) {
      return;
    }

    const isBlockingLoad = !cached;
    if (isBlockingLoad) {
      this.isLoading.set(true);
    } else {
      this.isRevalidating.set(true);
    }

    try {
      const state = await this.swr.revalidate<WorkDetailCacheState>(key, async () => this.fetchFreshState(id));
      this.applyState(state);
    } catch (error: unknown) {
      this.errorText.set(String(error));
    } finally {
      if (isBlockingLoad) {
        this.isLoading.set(false);
      } else {
        this.isRevalidating.set(false);
      }
    }
  }

  public async refreshHard(): Promise<void> {
    const id = this.workId();
    if (!id) {
      return;
    }

    this.swr.invalidate(this.cacheKeyFor(id));
    await this.initLoad(true);
  }

  private async fetchFreshState(workId: string): Promise<WorkDetailCacheState> {
    const client = this.supabase.client();

    const baseState: WorkDetailCacheState = {
      workItem: null,
      events: [],
      players: [],
      userRole: '',
      authHint: false,
      needsProvisioning: false,
    };

    const sessionResult = await client.auth.getSession();
    const session = sessionResult.data.session;

    if (!session) {
      return { ...baseState, authHint: true };
    }

    const { data: profile } = await client.from('profiles').select('role').maybeSingle();

    const role = profile?.role ?? '';
    if (!role) {
      return { ...baseState, needsProvisioning: true };
    }

    const { data: workItemData, error: workItemError } = await client
      .from('work_items')
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
        updated_at
      `,
      )
      .eq('work_id', workId)
      .maybeSingle();

    if (workItemError) {
      throw new Error(workItemError.message);
    }

    const workItem = (workItemData as WorkItem) ?? null;

    const { data: eventData, error: eventError } = await client
      .from('work_events')
      .select('event_id, work_id, event_type, payload, created_by, created_at')
      .eq('work_id', workId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (eventError) {
      throw new Error(eventError.message);
    }

    const { data: linkedPlayerRows, error: linkedPlayerRowsError } = await client
      .from('work_item_players')
      .select('license_uuid')
      .eq('work_id', workId);

    if (linkedPlayerRowsError) {
      throw new Error(linkedPlayerRowsError.message);
    }

    const licenseUuids = (linkedPlayerRows ?? []).map((row) => row.license_uuid).filter(Boolean);
    let players: LinkedPlayer[] = [];

    if (licenseUuids.length > 0) {
      const { data: playerData, error: playerError } = await client
        .from('players')
        .select('license_uuid, hostname, site_alias, dealer_alias, dashboard_url, mesh_url')
        .in('license_uuid', licenseUuids)
        .limit(200);

      if (playerError) {
        throw new Error(playerError.message);
      }

      players = (playerData ?? []) as LinkedPlayer[];
    }

    return {
      workItem,
      events: (eventData ?? []) as WorkEvent[],
      players,
      userRole: role,
      authHint: false,
      needsProvisioning: false,
    };
  }

  public onStatusDraft(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.statusDraft.set(select?.value ?? 'NEW');
  }

  public onBlockedCodeDraft(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.blockedCodeDraft.set(input?.value ?? '');
  }

  public onBlockedDetailDraft(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.blockedDetailDraft.set(input?.value ?? '');
  }

  public onNoteDraft(event: Event): void {
    const input = event.target as HTMLTextAreaElement | null;
    this.noteDraft.set(input?.value ?? '');
  }

  public onLinkInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement | null;
    this.linkInput.set(input?.value ?? '');
  }

  public onPlayerSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.playerSearch.set(input?.value ?? '');
  }

  public clearSearch(): void {
    this.searchError.set('');
    this.searchResults.set([]);
    this.playerSearch.set('');
  }

  public resetDraft(): void {
    const workItem = this.workItem();
    if (!workItem) {
      return;
    }

    this.statusDraft.set(workItem.status);
    this.blockedCodeDraft.set(workItem.blocked_reason_code ?? '');
    this.blockedDetailDraft.set(workItem.blocked_reason_detail ?? '');
  }

  public async saveStatus(): Promise<void> {
    this.errorText.set('');
    if (!this.supabase.isBrowser() || !this.isWritable()) {
      return;
    }

    const workItem = this.workItem();
    if (!workItem) {
      return;
    }

    const newStatus = this.statusDraft();
    const isBlocked = newStatus === 'BLOCKED';

    if (newStatus === 'VERIFIED' || newStatus === 'CLOSED') {
      this.errorText.set(
        `${newStatus} must be performed by a privileged backend operation. Use the future Verify/Close server action instead.`,
      );
      return;
    }

    this.isSavingStatus.set(true);
    try {
      const client = this.supabase.client();

      const patch: Partial<WorkItem> & {
        blocked_reason_code?: string | null;
        blocked_reason_detail?: string | null;
      } = {
        status: newStatus,
        blocked_reason_code: isBlocked ? (this.blockedCodeDraft().trim() || null) : null,
        blocked_reason_detail: isBlocked ? (this.blockedDetailDraft().trim() || null) : null,
      };

      const { error } = await client.from('work_items').update(patch).eq('work_id', workItem.work_id);
      if (error) {
        this.errorText.set(error.message);
        return;
      }

      this.invalidateRelatedQueueCaches();
      await this.refreshHard();
    } catch (error: unknown) {
      this.errorText.set(String(error));
    } finally {
      this.isSavingStatus.set(false);
    }
  }

  public async addNote(): Promise<void> {
    this.errorText.set('');
    if (!this.supabase.isBrowser() || !this.isWritable()) {
      return;
    }

    const text = this.noteDraft().trim();
    if (!text) {
      return;
    }

    const workItem = this.workItem();
    if (!workItem) {
      return;
    }

    this.isSavingNote.set(true);
    try {
      const client = this.supabase.client();
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const { error } = await client.from('work_events').insert({
        work_id: workItem.work_id,
        event_type: 'NOTE_ADDED',
        payload: { text },
        created_by: userId,
      });

      if (error) {
        this.errorText.set(error.message);
        return;
      }

      this.noteDraft.set('');
      this.invalidateRelatedQueueCaches();
      await this.refreshHard();
    } catch (error: unknown) {
      this.errorText.set(String(error));
    } finally {
      this.isSavingNote.set(false);
    }
  }

  public async searchPlayers(): Promise<void> {
    this.searchError.set('');

    if (!this.supabase.isBrowser()) {
      return;
    }

    const queryRaw = this.playerSearch().trim();
    if (queryRaw.length < 2) {
      return;
    }

    const query = queryRaw.replace(/[(),]/g, ' ').trim();
    const like = `%${query}%`;

    this.isSearching.set(true);
    try {
      const client = this.supabase.client();

      const { data, error } = await client
        .from('players')
        .select('license_uuid, hostname, site_alias, dealer_alias, dashboard_url, mesh_url')
        .or(
          [
            `license_uuid.ilike.${like}`,
            `hostname.ilike.${like}`,
            `site_alias.ilike.${like}`,
            `dealer_alias.ilike.${like}`,
          ].join(','),
        )
        .limit(20);

      if (error) {
        this.searchError.set(error.message);
        this.searchResults.set([]);
        return;
      }

      this.searchResults.set((data ?? []) as LinkedPlayer[]);
    } catch (error: unknown) {
      this.searchError.set(String(error));
      this.searchResults.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  public async addFromSearch(licenseUuid: string): Promise<void> {
    if (!this.isWritable()) {
      return;
    }

    await this.linkSinglePlayer(licenseUuid);
  }

  private async linkSinglePlayer(licenseUuid: string): Promise<void> {
    this.linkError.set('');
    if (!this.supabase.isBrowser() || !this.isWritable()) {
      return;
    }

    const workItem = this.workItem();
    if (!workItem) {
      return;
    }

    this.isLinking.set(true);
    try {
      const client = this.supabase.client();
      const { error } = await client.from('work_item_players').insert({
        work_id: workItem.work_id,
        license_uuid: licenseUuid,
      });

      if (error) {
        this.linkError.set(error.message);
        return;
      }

      this.invalidateRelatedQueueCaches();
      await this.refreshHard();
    } catch (error: unknown) {
      this.linkError.set(String(error));
    } finally {
      this.isLinking.set(false);
    }
  }

  public async linkPlayers(): Promise<void> {
    this.linkError.set('');
    if (!this.supabase.isBrowser() || !this.isWritable()) {
      return;
    }

    const workItem = this.workItem();
    if (!workItem) {
      return;
    }

    const uuids = this.parsedLinkUuids();
    if (uuids.length === 0) {
      return;
    }

    this.isLinking.set(true);
    try {
      const client = this.supabase.client();
      const payload = uuids.map((license_uuid) => ({ work_id: workItem.work_id, license_uuid }));
      const { error } = await client.from('work_item_players').insert(payload);

      if (error) {
        this.linkError.set(error.message);
        return;
      }

      this.linkInput.set('');
      this.invalidateRelatedQueueCaches();
      await this.refreshHard();
    } catch (error: unknown) {
      this.linkError.set(String(error));
    } finally {
      this.isLinking.set(false);
    }
  }

  public async unlinkPlayer(licenseUuid: string): Promise<void> {
    this.unlinkError.set('');
    if (!this.supabase.isBrowser() || !this.isWritable()) {
      return;
    }

    const workItem = this.workItem();
    if (!workItem) {
      return;
    }

    this.isUnlinking.set(true);
    try {
      const client = this.supabase.client();
      const { error } = await client
        .from('work_item_players')
        .delete()
        .eq('work_id', workItem.work_id)
        .eq('license_uuid', licenseUuid);

      if (error) {
        this.unlinkError.set(error.message);
        return;
      }

      this.invalidateRelatedQueueCaches();
      await this.refreshHard();
    } catch (error: unknown) {
      this.unlinkError.set(String(error));
    } finally {
      this.isUnlinking.set(false);
    }
  }

  public stringify(payload: unknown): string {
    try {
      return JSON.stringify(payload ?? {}, null, 2);
    } catch {
      return String(payload);
    }
  }
}