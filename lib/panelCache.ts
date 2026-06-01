// lib/panelCache.ts
// ✅ In-memory cache utility for admin panel pages
// Fast, no network, survives route changes within same session

type CacheEntry<T> = {
  data: T;
  ts: number;
};

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class PanelCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Get cached value. Returns null if missing or expired. */
  get<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.ts > ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  /** Store value in cache with current timestamp. */
  set<T>(key: string, data: T): void {
    this.store.set(key, { data, ts: Date.now() });
  }

  /** Remove a specific key from cache. */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Clear entire cache. */
  clear(): void {
    this.store.clear();
  }
}

// ✅ Singleton — ek hi instance puri app mein
export const panelCache = new PanelCache();
