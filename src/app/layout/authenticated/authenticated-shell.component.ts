import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SupabaseService } from '@core';

type NavItem = {
  label: string;
  path: string;
};

@Component({
  selector: 'app-authenticated-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen bg-neutral-950 text-white">
      <!-- Left nav -->
      <aside class="flex w-72 shrink-0 flex-col border-r border-white/10 bg-black/60 backdrop-blur-xl">
        <!-- Header -->
        <div class="relative flex h-16 items-center border-b border-white/10 px-6">
          <div class="flex items-center gap-3">
            <span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-400 to-violet-400"></span>
            <div class="leading-tight">
              <div class="text-lg font-extrabold tracking-tight text-white">Ops Core</div>
              <div class="text-xs font-semibold text-white/50">NTV360 Night Ops</div>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 p-4">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="border-white/14 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]"
              class="group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-white/65 transition duration-200 ease-out hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
            >
              <span class="flex items-center gap-4">
                <span class="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span class="h-2 w-2 rounded-full bg-white/35 transition duration-200 group-hover:bg-white/60"></span>
                </span>
                <span>{{ item.label }}</span>
              </span>

              <span class="text-[10px] font-bold text-white/20 transition-colors duration-200 group-hover:text-white/35">
                →
              </span>
            </a>
          }
        </nav>

        <!-- Footer -->
        <div class="border-t border-white/10 bg-white/[0.02] p-4">
          @if (!isBrowser()) {
            <div class="flex items-center gap-2 px-3 py-2">
              <div class="h-2 w-2 rounded-full bg-amber-400/80"></div>
              <span class="text-xs font-semibold text-white/40">SSR mode</span>
            </div>
          } @else {
            <div class="space-y-3">
              <a
                routerLink="/login"
                class="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-white/50 transition-colors duration-200 hover:bg-white/[0.05] hover:text-white/70"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  ></path>
                </svg>
                Switch account
              </a>

              <button
                (click)="signOut()"
                [disabled]="isSigningOut()"
                class="w-full btn-modern btn-secondary text-xs py-2"
              >
                @if (isSigningOut()) {
                  <svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing out…
                } @else {
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    ></path>
                  </svg>
                  Sign out
                }
              </button>
            </div>
          }
        </div>
      </aside>

      <!-- Main content -->
      <main class="min-w-0 flex-1">
        <div [class]="containerClass()">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AuthenticatedShellComponent {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Install Queue', path: '/installations' },
    { label: 'Incident Queue', path: '/incidents' },
    { label: 'Players', path: '/players' },
    { label: 'Admin', path: '/admin' },
  ];

  private readonly currentUrl = signal<string>('/');
  readonly isWide = computed(() => this.isWideRoute(this.currentUrl()));

  readonly containerClass = computed(() =>
    this.isWide()
      ? 'max-w-none mx-auto px-6 xl:px-10 py-6'
      : 'max-w-[1440px] mx-auto px-8 py-6',
  );

  readonly isSigningOut = signal<boolean>(false);

  constructor(destroyRef: DestroyRef) {
    this.currentUrl.set(this.router.url ?? '/');

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects ?? e.url ?? '/');
      });
  }

  isBrowser(): boolean {
    return this.supabase.isBrowser();
  }

  private isWideRoute(url: string): boolean {
    return (
      url.startsWith('/installations') ||
      url.startsWith('/incidents') ||
      url.startsWith('/players') ||
      url.startsWith('/dashboard')
    );
  }

  async signOut(): Promise<void> {
    if (!this.supabase.isBrowser()) return;

    this.isSigningOut.set(true);
    try {
      await this.supabase.client().auth.signOut();
      await this.router.navigateByUrl('/login');
    } finally {
      this.isSigningOut.set(false);
    }
  }
}