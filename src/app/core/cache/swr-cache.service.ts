import { Injectable } from '@angular/core';

type CacheEntry<T> = {
  data: T;
  fetchedAt: number; // epoch ms
  inFlight?: Promise<T>;
};

@Injectable({ providedIn: 'root' })
export class SwrCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  read<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    return entry?.data ?? null;
  }

  fetchedAt(key: string): number | null {
    const entry = this.store.get(key);
    return entry?.fetchedAt ?? null;
  }

  write<T>(key: string, data: T): void {
    this.store.set(key, { data, fetchedAt: Date.now() });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  isStale(key: string, ttlMs: number): boolean {
    const ts = this.fetchedAt(key);
    if (!ts) return true;
    return Date.now() - ts > ttlMs;
  }

  /**
   * Revalidate cache entry (dedupes concurrent calls).
   * - If a fetch is already in-flight for this key, returns the same promise.
   * - On success, writes data + updates fetchedAt.
   */
  async revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.store.get(key) as CacheEntry<T> | undefined;

    if (existing?.inFlight) {
      return existing.inFlight;
    }

    const inFlight = (async () => {
      const data = await fetcher();
      this.store.set(key, { data, fetchedAt: Date.now() });
      return data;
    })();

    this.store.set(key, { data: existing?.data as T, fetchedAt: existing?.fetchedAt ?? 0, inFlight });

    try {
      return await inFlight;
    } finally {
      const after = this.store.get(key) as CacheEntry<T> | undefined;
      if (after?.inFlight === inFlight) {
        // Clear inFlight flag but keep data/fetchedAt
        this.store.set(key, { data: after.data, fetchedAt: after.fetchedAt });
      }
    }
  }
}