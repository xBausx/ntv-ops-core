/** Angular Imports */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/** Local Imports */
import { SupabaseService, SwrCacheService } from '@core';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

interface QuickStat {
  label: string;
  value: string;
  subtitle: string;
  color: string;
  route: string;
  loading: boolean;
}

interface Stats {
  new: string;
  inProgress: string;
  verified: string;
}

interface IncidentStats {
  urgent: string;
  active: string;
  resolved: string;
}

interface SystemService {
  name: string;
  status: string;
  statusColor: string;
}

type DashboardMetrics = {
  installsActive: number;
  installsUrgent: number;

  incidentsOpen: number;
  incidentsCritical: number;

  playersTotal: number;

  scheduledCount: number;
  nextScheduledLabel: string;

  installNew: number;
  installInProgress: number;
  installVerified: number;

  incidentResolved: number;
};

type CacheState = {
  metrics: DashboardMetrics;
};

const ACTIVE_STATUSES = ['NEW', 'SCHEDULED', 'IN_PROGRESS', 'BLOCKED'] as const;
const DONE_STATUSES = ['VERIFIED', 'CLOSED'] as const;
const INSTALL_IN_PROGRESS_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'BLOCKED'] as const;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly swr = inject(SwrCacheService);

  private readonly cacheKey = 'dashboard:metrics:v1';
  private readonly ttlMs = 20_000;

  readonly isLoading = signal<boolean>(true);
  readonly isRevalidating = signal<boolean>(false);
  readonly errorText = signal<string>('');

  readonly metrics = signal<DashboardMetrics | null>(null);

  readonly lastUpdatedLabel = computed(() => {
    const ts = this.swr.fetchedAt(this.cacheKey);
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  });

  readonly quickStats = computed<QuickStat[]>(() => {
    const m = this.metrics();
    const showSkeleton = this.isLoading() && !m;

    const installsActive = m?.installsActive ?? 0;
    const installsUrgent = m?.installsUrgent ?? 0;

    const incidentsOpen = m?.incidentsOpen ?? 0;
    const incidentsCritical = m?.incidentsCritical ?? 0;

    const playersTotal = m?.playersTotal ?? 0;

    const scheduledCount = m?.scheduledCount ?? 0;
    const nextScheduledLabel = m?.nextScheduledLabel ?? '—';

    return [
      {
        label: 'Active Installs',
        value: showSkeleton ? '—' : this.formatInt(installsActive),
        subtitle: showSkeleton ? '—' : installsUrgent > 0 ? `${installsUrgent} urgent` : 'No urgent',
        color: 'bg-blue-400',
        route: '/installations',
        loading: showSkeleton,
      },
      {
        label: 'Open Incidents',
        value: showSkeleton ? '—' : this.formatInt(incidentsOpen),
        subtitle: showSkeleton ? '—' : incidentsCritical > 0 ? `${incidentsCritical} critical` : 'No critical',
        color: 'bg-red-400',
        route: '/incidents',
        loading: showSkeleton,
      },
      {
        label: 'Players Registered',
        value: showSkeleton ? '—' : this.formatInt(playersTotal),
        subtitle: showSkeleton ? '—' : 'Registry count',
        color: 'bg-green-400',
        route: '/players',
        loading: showSkeleton,
      },
      {
        label: 'Scheduled Work',
        value: showSkeleton ? '—' : this.formatInt(scheduledCount),
        subtitle: showSkeleton ? '—' : nextScheduledLabel,
        color: 'bg-amber-400',
        route: '/installations',
        loading: showSkeleton,
      },
    ];
  });

  readonly installStats = computed<Stats>(() => {
    const m = this.metrics();
    if (!m) return { new: '—', inProgress: '—', verified: '—' };

    return {
      new: this.formatInt(m.installNew),
      inProgress: this.formatInt(m.installInProgress),
      verified: this.formatInt(m.installVerified),
    };
  });

  readonly incidentStats = computed<IncidentStats>(() => {
    const m = this.metrics();
    if (!m) return { urgent: '—', active: '—', resolved: '—' };

    return {
      urgent: this.formatInt(m.incidentsCritical),
      active: this.formatInt(m.incidentsOpen),
      resolved: this.formatInt(m.incidentResolved),
    };
  });

  readonly systemServices = computed<SystemService[]>(() => [
    { name: 'Supabase', status: 'Operational', statusColor: 'bg-green-400' },
    { name: 'NCompass', status: 'Operational', statusColor: 'bg-green-400' },
    { name: 'MeshCentral', status: 'Operational', statusColor: 'bg-green-400' },
  ]);

  ngOnInit(): void {
    if (!this.supabase.isBrowser()) {
      this.isLoading.set(false);
      return;
    }
    void this.initLoad();
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  navigateToStat(route: string): void {
    this.router.navigateByUrl(route);
  }

  async refreshHard(): Promise<void> {
    this.swr.invalidate(this.cacheKey);
    this.isLoading.set(true);
    await this.loadMetrics();
  }

  private async initLoad(): Promise<void> {
    const cached = this.swr.read<CacheState>(this.cacheKey);
    if (cached?.metrics) {
      this.metrics.set(cached.metrics);
      this.isLoading.set(false);
    }

    if (this.swr.isStale(this.cacheKey, this.ttlMs)) {
      if (cached?.metrics) {
        this.isRevalidating.set(true);
        try {
          await this.loadMetrics();
        } finally {
          this.isRevalidating.set(false);
        }
      } else {
        await this.loadMetrics();
      }
    }
  }

  private async loadMetrics(): Promise<void> {
    this.errorText.set('');

    try {
      const state = await this.swr.revalidate<CacheState>(this.cacheKey, async () => {
        const metrics = await this.fetchMetrics();
        return { metrics };
      });

      this.metrics.set(state.metrics);
    } catch (e: any) {
      this.errorText.set(String(e?.message ?? e ?? 'Failed to load dashboard metrics.'));
      // leave existing metrics (if any) on screen
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchMetrics(): Promise<DashboardMetrics> {
    const client = this.supabase.client();

    const sessionRes = await client.auth.getSession();
    const session = sessionRes.data.session;
    if (!session) {
      return {
        installsActive: 0,
        installsUrgent: 0,
        incidentsOpen: 0,
        incidentsCritical: 0,
        playersTotal: 0,
        scheduledCount: 0,
        nextScheduledLabel: 'Sign-in required',
        installNew: 0,
        installInProgress: 0,
        installVerified: 0,
        incidentResolved: 0,
      };
    }

    const nowIso = new Date().toISOString();

    const [
      installsActive,
      installsUrgent,
      incidentsOpen,
      incidentsCritical,
      playersTotal,
      scheduledCount,
      nextScheduledIso,
      installNew,
      installInProgress,
      installVerified,
      incidentResolved,
    ] = await Promise.all([
      this.countWorkItems({ type: 'INSTALL', statuses: [...ACTIVE_STATUSES] }),
      this.countWorkItems({ type: 'INSTALL', statuses: [...ACTIVE_STATUSES], priorityLte: 1 }),

      this.countWorkItems({ type: 'INCIDENT', statuses: [...ACTIVE_STATUSES] }),
      this.countWorkItems({ type: 'INCIDENT', statuses: [...ACTIVE_STATUSES], priorityLte: 1 }),

      this.countPlayers(),

      this.countScheduledWork([...ACTIVE_STATUSES]),
      this.fetchNextScheduledIso(nowIso, [...ACTIVE_STATUSES]),

      this.countWorkItems({ type: 'INSTALL', statuses: ['NEW'] }),
      this.countWorkItems({ type: 'INSTALL', statuses: [...INSTALL_IN_PROGRESS_STATUSES] }),
      this.countWorkItems({ type: 'INSTALL', statuses: ['VERIFIED'] }),

      this.countWorkItems({ type: 'INCIDENT', statuses: [...DONE_STATUSES] }),
    ]);

    const nextScheduledLabel = this.formatNextScheduled(nextScheduledIso);

    return {
      installsActive,
      installsUrgent,
      incidentsOpen,
      incidentsCritical,
      playersTotal,
      scheduledCount,
      nextScheduledLabel,
      installNew,
      installInProgress,
      installVerified,
      incidentResolved,
    };
  }

  private async countPlayers(): Promise<number> {
    const { count, error } = await this.supabase
      .client()
      .from('players')
      .select('license_uuid', { count: 'exact', head: true });

    if (error) throw error;
    return count ?? 0;
  }

  private async countWorkItems(opts: {
    type: 'INSTALL' | 'INCIDENT';
    statuses: string[];
    priorityLte?: number;
  }): Promise<number> {
    let q = this.supabase
      .client()
      .from('work_items')
      .select('work_id', { count: 'exact', head: true })
      .eq('type', opts.type)
      .in('status', opts.statuses);

    if (typeof opts.priorityLte === 'number') {
      q = q.lte('priority', opts.priorityLte);
    }

    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  private async countScheduledWork(activeStatuses: string[]): Promise<number> {
    const { count, error } = await this.supabase
      .client()
      .from('work_items')
      .select('work_id', { count: 'exact', head: true })
      .not('scheduled_for', 'is', null)
      .in('status', activeStatuses);

    if (error) throw error;
    return count ?? 0;
  }

  private async fetchNextScheduledIso(nowIso: string, activeStatuses: string[]): Promise<string | null> {
    const { data, error } = await this.supabase
      .client()
      .from('work_items')
      .select('scheduled_for')
      .not('scheduled_for', 'is', null)
      .gte('scheduled_for', nowIso)
      .in('status', activeStatuses)
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data?.scheduled_for as string | null) ?? null;
  }

  private formatNextScheduled(nextIso: string | null): string {
    if (!nextIso) return 'None scheduled';

    const t = new Date(nextIso).getTime();
    const now = Date.now();
    const diffMs = t - now;

    if (!Number.isFinite(diffMs)) return '—';
    if (diffMs <= 0) return 'Due now';

    const mins = Math.max(1, Math.round(diffMs / 60000));
    if (mins < 60) return `Next in ${mins}m`;

    const hrs = Math.round(mins / 60);
    if (hrs < 48) return `Next in ${hrs}h`;

    const days = Math.round(hrs / 24);
    return `Next in ${days}d`;
  }

  private formatInt(n: number): string {
    return new Intl.NumberFormat().format(n);
  }
}