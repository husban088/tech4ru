// lib/saleStore.ts
// ✅ FIXED — Supabase auth lock conflict khatam
// - fetchSaleFromDB sirf ek baar chalti hai (singleton promise)
// - Agar fetch chal rahi hai toh same promise return hoti hai — duplicate calls nahi
// - React Strict Mode mein bhi double-mount se koi issue nahi

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

let currentSalePercent: number | null = null;
let currentBannerEnabled: boolean = false;
let hasFetchedOnce: boolean = false;

// ✅ KEY FIX: Singleton promise — ek waqt mein sirf EK DB call
let fetchPromise: Promise<{
  percent: number | null;
  bannerEnabled: boolean;
}> | null = null;

let listeners: ((data: {
  percent: number | null;
  bannerEnabled: boolean;
}) => void)[] = [];

// ─────────────────────────────────────────────
// Internal: clear sale cache
// ─────────────────────────────────────────────
function clearSaleCache() {
  currentSalePercent = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("active_sale_percent");
    sessionStorage.removeItem("active_sale_percent");
    localStorage.removeItem("sale_percent");
    sessionStorage.removeItem("sale_percent");
  }
}

// ─────────────────────────────────────────────
// fetchSaleFromDB — SINGLETON — ek baar fetch, baaki cached
// ─────────────────────────────────────────────
export async function fetchSaleFromDB(): Promise<{
  percent: number | null;
  bannerEnabled: boolean;
}> {
  if (typeof window === "undefined")
    return { percent: currentSalePercent, bannerEnabled: currentBannerEnabled };

  // ✅ Already fetched — cached value return karo (no DB call)
  if (hasFetchedOnce) {
    return { percent: currentSalePercent, bannerEnabled: currentBannerEnabled };
  }

  // ✅ Fetch chal rahi hai — same promise return karo (no duplicate lock)
  if (fetchPromise) {
    return fetchPromise;
  }

  // ✅ Pehli aur aakhri baar DB call — promise save karo
  fetchPromise = (async () => {
    try {
      const [saleRes, bannerRes] = await Promise.all([
        supabase
          .from("site_settings")
          .select("value")
          .eq("key", "active_sale_percent")
          .maybeSingle(),
        supabase
          .from("site_settings")
          .select("value")
          .eq("key", "sale_banner_enabled")
          .maybeSingle(),
      ]);

      // ── Sale Percent ──
      let percent: number | null = null;
      if (saleRes.data) {
        const p = saleRes.data.value;
        if (p !== null && p !== 0 && [10, 20, 30].includes(Number(p))) {
          percent = Number(p);
          currentSalePercent = percent;
          localStorage.setItem("active_sale_percent", String(percent));
          sessionStorage.setItem("active_sale_percent", String(percent));
        } else {
          clearSaleCache();
        }
      } else {
        clearSaleCache();
      }

      // ── Banner Enabled ──
      let bannerEnabled = false;
      if (bannerRes.data) {
        bannerEnabled = bannerRes.data.value === true;
        currentBannerEnabled = bannerEnabled;
        localStorage.setItem("sale_banner_enabled", String(bannerEnabled));
        sessionStorage.setItem("sale_banner_enabled", String(bannerEnabled));
      } else {
        currentBannerEnabled = false;
        localStorage.setItem("sale_banner_enabled", "false");
        sessionStorage.setItem("sale_banner_enabled", "false");
      }

      hasFetchedOnce = true;
      fetchPromise = null; // ✅ Promise clear — next manual refresh ke liye
      notifyListeners();
      return { percent, bannerEnabled };
    } catch (err) {
      console.warn("[saleStore] fetchSaleFromDB failed:", err);
      hasFetchedOnce = true;
      fetchPromise = null;
      return { percent: null, bannerEnabled: false };
    }
  })();

  return fetchPromise;
}

// ─────────────────────────────────────────────
// getSalePercent
// ─────────────────────────────────────────────
export function getSalePercent(): number | null {
  if (typeof window === "undefined") return currentSalePercent;
  if (!hasFetchedOnce) return null;
  return currentSalePercent;
}

// ─────────────────────────────────────────────
// isBannerEnabled
// ─────────────────────────────────────────────
export function isBannerEnabled(): boolean {
  if (typeof window === "undefined") return currentBannerEnabled;
  if (!hasFetchedOnce) return false;
  return currentBannerEnabled;
}

// ─────────────────────────────────────────────
// setSalePercent — DB mein save/delete karo
// Admin action — yahan lock conflict theek hai
// ─────────────────────────────────────────────
export async function setSalePercent(
  percent: 10 | 20 | 30 | null,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const TIMEOUT_MS = 8000;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS),
  );

  try {
    if (percent === null) {
      clearSaleCache();
      currentSalePercent = null;

      const deleteOp = supabase
        .from("site_settings")
        .delete()
        .eq("key", "active_sale_percent");

      const { error: deleteError } = (await Promise.race([
        deleteOp,
        timeout,
      ])) as Awaited<typeof deleteOp>;

      if (deleteError) throw deleteError;

      // Verify deletion
      const verifyOp = supabase
        .from("site_settings")
        .select("value")
        .eq("key", "active_sale_percent")
        .maybeSingle();

      const verifyTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Verify timeout")), 5000),
      );

      const verifyResult = (await Promise.race([
        verifyOp,
        verifyTimeout,
      ])) as Awaited<typeof verifyOp>;

      if (verifyResult.data !== null) {
        const forceOp = supabase.from("site_settings").upsert(
          {
            key: "active_sale_percent",
            value: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );
        const forceTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Force timeout")), 5000),
        );
        const { error: forceError } = (await Promise.race([
          forceOp,
          forceTimeout,
        ])) as Awaited<typeof forceOp>;
        if (forceError) throw forceError;
        await supabase
          .from("site_settings")
          .delete()
          .eq("key", "active_sale_percent");
      }

      clearSaleCache();
      currentSalePercent = null;
    } else {
      const dbOp = supabase.from("site_settings").upsert(
        {
          key: "active_sale_percent",
          value: percent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      const { error } = (await Promise.race([dbOp, timeout])) as Awaited<
        typeof dbOp
      >;
      if (error) throw error;

      currentSalePercent = percent;
      localStorage.setItem("active_sale_percent", String(percent));
      sessionStorage.setItem("active_sale_percent", String(percent));
    }

    // ✅ Force re-fetch next time
    hasFetchedOnce = false;
    fetchPromise = null;

    hasFetchedOnce = true;
    notifyListeners();
    return true;
  } catch (err) {
    console.error("[saleStore] setSalePercent failed:", err);
    return false;
  }
}

// ─────────────────────────────────────────────
// setBannerEnabled
// ─────────────────────────────────────────────
export async function setBannerEnabled(enabled: boolean): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), 8000),
  );

  try {
    const dbOp = supabase.from("site_settings").upsert(
      {
        key: "sale_banner_enabled",
        value: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    const { error } = (await Promise.race([dbOp, timeout])) as Awaited<
      typeof dbOp
    >;
    if (error) throw error;

    currentBannerEnabled = enabled;
    localStorage.setItem("sale_banner_enabled", String(enabled));
    sessionStorage.setItem("sale_banner_enabled", String(enabled));

    notifyListeners();
    return true;
  } catch (err) {
    console.error("[saleStore] setBannerEnabled failed:", err);
    return false;
  }
}

// ─────────────────────────────────────────────
// applyDiscount
// ─────────────────────────────────────────────
export function applyDiscount(price: number, percent: number | null): number {
  if (!percent || percent <= 0) return price;
  return Math.round(price * (1 - percent / 100));
}

// ─────────────────────────────────────────────
// Internal: notify listeners
// ─────────────────────────────────────────────
function notifyListeners() {
  const payload = {
    percent: currentSalePercent,
    bannerEnabled: currentBannerEnabled,
  };
  listeners.forEach((l) => l(payload));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("saleDataChanged", { detail: payload }),
    );
  }
}

// ─────────────────────────────────────────────
// listenToSaleChanges
// ─────────────────────────────────────────────
export function listenToSaleChanges(
  callback: (data: { percent: number | null; bannerEnabled: boolean }) => void,
) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

// ─────────────────────────────────────────────
// initSaleStore — app start pe once call karo
// ✅ Providers.tsx mein sirf ek baar — singleton handle kar leta hai
// ─────────────────────────────────────────────
export async function initSaleStore() {
  await fetchSaleFromDB();
}

// ─────────────────────────────────────────────
// useSaleSync — React hook
// ─────────────────────────────────────────────
export function useSaleSync() {
  const [saleData, setSaleData] = useState<{
    percent: number | null;
    bannerEnabled: boolean;
  }>({
    percent: hasFetchedOnce ? currentSalePercent : null,
    bannerEnabled: hasFetchedOnce ? currentBannerEnabled : false,
  });
  const [loading, setLoading] = useState(!hasFetchedOnce);

  useEffect(() => {
    // ✅ Agar data already hai — no new DB call
    if (hasFetchedOnce) {
      setSaleData({
        percent: currentSalePercent,
        bannerEnabled: currentBannerEnabled,
      });
      setLoading(false);
    } else {
      // ✅ fetchSaleFromDB singleton — multiple components se call karo, sirf ek DB request
      fetchSaleFromDB().then((data) => {
        setSaleData(data);
        setLoading(false);
      });
    }

    const unsubscribe = listenToSaleChanges((data) => setSaleData(data));
    const handleCustomEvent = (e: CustomEvent) => setSaleData(e.detail);
    window.addEventListener(
      "saleDataChanged",
      handleCustomEvent as EventListener,
    );

    return () => {
      unsubscribe();
      window.removeEventListener(
        "saleDataChanged",
        handleCustomEvent as EventListener,
      );
    };
  }, []);

  return { saleData, loading };
}

// ─────────────────────────────────────────────
// useProductPrice — single price hook
// ─────────────────────────────────────────────
export function useProductPrice(basePrice: number | null) {
  const { saleData, loading } = useSaleSync();
  const originalPrice = basePrice ?? 0;

  const salePrice =
    saleData.percent && saleData.percent > 0 && originalPrice > 0
      ? applyDiscount(originalPrice, saleData.percent)
      : null;

  const finalPrice = salePrice ?? originalPrice;

  return {
    originalPrice,
    salePrice,
    finalPrice,
    salePercent: saleData.percent,
    loading,
  };
}

// ─────────────────────────────────────────────
// applyBulkDiscount
// ─────────────────────────────────────────────
export function applyBulkDiscount(
  originalPrice: number,
  quantity: number,
  bulkTiers: { min_qty: number; price_per_unit: number }[],
  salePercent: number | null = null,
): {
  pricePerUnit: number;
  originalPerUnit: number;
  totalPrice: number;
  totalOriginalPrice: number;
  saving: number;
  savingPerUnit: number;
  discountPercent: number;
  bulkTierApplied: boolean;
} {
  const sortedTiers = [...bulkTiers].sort((a, b) => b.min_qty - a.min_qty);
  const matchedTier = sortedTiers.find((t) => quantity >= t.min_qty);

  let pricePerUnit: number;
  let bulkTierApplied = false;

  if (matchedTier) {
    pricePerUnit = matchedTier.price_per_unit;
    bulkTierApplied = true;
  } else {
    pricePerUnit = originalPrice;
  }

  if (salePercent && salePercent > 0) {
    pricePerUnit = applyDiscount(pricePerUnit, salePercent);
  }

  const roundedPricePerUnit = Math.round(pricePerUnit);
  const totalPrice = Math.round(roundedPricePerUnit * quantity);
  const totalOriginalPrice = Math.round(originalPrice * quantity);
  const saving = totalOriginalPrice - totalPrice;
  const savingPerUnit = Math.round(originalPrice - roundedPricePerUnit);
  const discountPercent =
    originalPrice > 0
      ? Math.round(
          ((originalPrice - roundedPricePerUnit) / originalPrice) * 100,
        )
      : 0;

  return {
    pricePerUnit: roundedPricePerUnit,
    originalPerUnit: Math.round(originalPrice),
    totalPrice,
    totalOriginalPrice,
    saving,
    savingPerUnit,
    discountPercent,
    bulkTierApplied,
  };
}

// ─────────────────────────────────────────────
// generateBulkPricingTable
// ─────────────────────────────────────────────
export function generateBulkPricingTable(
  originalPrice: number,
  bulkTiers: { min_qty: number; price_per_unit: number }[],
  salePercent: number | null = null,
  maxQty: number = 100,
): Array<{
  quantity: number;
  pricePerUnit: number;
  originalPerUnit: number;
  totalPrice: number;
  totalOriginalPrice: number;
  saving: number;
  savingPerUnit: number;
  discountPercent: number;
  bulkTierApplied: boolean;
}> {
  const rows = [];
  for (let qty = 1; qty <= maxQty; qty++) {
    const result = applyBulkDiscount(
      originalPrice,
      qty,
      bulkTiers,
      salePercent,
    );
    rows.push({ quantity: qty, ...result });
  }
  return rows;
}
