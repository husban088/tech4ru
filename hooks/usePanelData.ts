// hooks/usePanelData.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { panelCache } from "@/lib/panelCache";

type FetchFn<T> = () => Promise<T>;

type UsePanelDataOptions = {
  ttl?: number; // Cache TTL in ms (default: 5 min)
  revalidate?: boolean; // Background mein fresh data fetch karo (default: true)
};

type UsePanelDataResult<T> = {
  data: T | null;
  loading: boolean; // Sirf tab true jab koi cached data bhi nahi
  error: string | null;
  refresh: () => Promise<void>; // Force fresh fetch
};

/**
 * Panel pages ke liye smart data hook.
 *
 * ✅ Agar cache mein data hai → FORAN dikhao (loading: false)
 * ✅ Background mein fresh data fetch karo (silent update)
 * ✅ Agar cache nahi → loading dikhao, phir data
 *
 * Usage:
 * const { data: products, loading } = usePanelData("products", fetchProducts);
 */
export function usePanelData<T>(
  cacheKey: string,
  fetchFn: FetchFn<T>,
  options: UsePanelDataOptions = {}
): UsePanelDataResult<T> {
  const { ttl, revalidate = true } = options;

  // ✅ Synchronously check cache — initial state mein hi set karo
  const cached = panelCache.get<T>(cacheKey, ttl);

  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState<boolean>(cached === null);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchData = async (silent = false) => {
    if (isFetching.current) return;
    isFetching.current = true;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      panelCache.set(cacheKey, result);
      setData(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Data load nahi ho saka";
      if (!silent) setError(message);
    } finally {
      if (!silent) setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    if (cached !== null) {
      // ✅ Cache hai — data already set hai
      // Background mein silently refresh karo (revalidate)
      if (revalidate) {
        fetchData(true); // silent = true, loading nahi dikhega
      }
    } else {
      // ✅ Cache nahi — fresh fetch karo
      fetchData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const refresh = async () => {
    panelCache.invalidate(cacheKey);
    await fetchData(false);
  };

  return { data, loading, error, refresh };
}
