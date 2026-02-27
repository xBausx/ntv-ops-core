import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Button } from '@ntv360/component-pantry';
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
    <div class="min-h-screen bg-neutral-950 text-white flex">
      <!-- Left nav -->
      <aside class="w-72 shrink-0 border-r border-white/10 bg-gradient-to-b from-black to-neutral-950/95 backdrop-blur-xl flex flex-col">
        <!-- Header -->
        <div class="h-16 flex items-center px-6 border-b border-white/10 relative">
          <div class="leading-tight">
            <div class="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Ops Core
            </div>
            <div class="text-xs font-semibold text-white/60 -mt-0.5">NTV360 Night Ops</div>
          </div>
          
          <!-- Subtle glow accent -->
          <div class="absolute top-0 left-6 w-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <!-- Navigation -->
        <nav class="p-4 flex-1 space-y-1">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-gradient-to-r from-white/10 to-white/5 border-white/20 shadow-lg transform scale-[1.02]"
              class="group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-white/5 hover:to-white/10 transition-all duration-200 ease-out border border-transparent hover:border-white/10 hover:shadow-md hover:transform hover:scale-[1.01]"
            >
              <span class="flex items-center gap-4">
                <span class="relative">
                  <span
                    class="h-2 w-2 rounded-full bg-gradient-to-r from-blue-400 to-violet-400 opacity-60 group-hover:opacity-100 transition-all duration-200 group-hover:scale-125"
                  ></span>
                  <span class="absolute inset-0 h-2 w-2 rounded-full bg-gradient-to-r from-blue-400 to-violet-400 opacity-30 group-hover:opacity-60 blur-sm transition-all duration-200"></span>
                </span>
                <span>{{ item.label }}</span>
              </span>

              <span class="text-[10px] font-bold text-white/20 group-hover:text-white/40 transition-colors duration-200">
                →
              </span>
            </a>
          }
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-white/10 bg-white/[0.02]">
          @if (!isBrowser()) {
            <div class="flex items-center gap-2 px-3 py-2">
              <div class="h-2 w-2 rounded-full bg-amber-400 opacity-60"></div>
              <span class="text-xs font-semibold text-white/40">SSR mode</span>
            </div>
          } @else {
            <div class="space-y-3">
              <a
                routerLink="/login"
                class="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-white/50 hover:text-white/70 transition-colors duration-200 rounded-xl hover:bg-white/5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Switch account
              </a>
              
              <button
                (click)="signOut()"
                [disabled]="isSigningOut()"
                class="w-full btn-modern btn-secondary text-xs py-2"
              >
                @if (isSigningOut()) {
                  <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing out…
                } @else {
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Sign out
                }
              </button>
            </div>
          }
        </div>
      </aside>

      <!-- Main content -->
      <main class="flex-1 min-w-0">
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
    // Initialize immediately
    this.currentUrl.set(this.router.url ?? '/');

    // Keep updated on navigation
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
    return url.startsWith('/installations') || url.startsWith('/incidents') || url.startsWith('/players');
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