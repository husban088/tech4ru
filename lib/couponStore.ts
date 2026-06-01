// lib/couponStore.ts
// ✅ FIXED — Supabase auth lock conflict khatam
// - fetchCouponSettings sirf ek baar DB call karta hai (singleton promise)
// - Duplicate calls same promise return karti hain — no extra locks
// - React Strict Mode double-mount safe

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "./supabase";

interface CouponStore {
  appliedCode: string | null;
  discountPercent: number;
  discountLabel: string;
  coupon10Enabled: boolean;
  coupon20Enabled: boolean;
  settingsLoading: boolean;
  applyingCoupon: boolean;
  fetchCouponSettings: () => Promise<void>;
  updateCouponSettings: (
    coupon10Enabled: boolean,
    coupon20Enabled: boolean,
  ) => Promise<boolean>;
  applyCoupon: (
    code: string,
    userEmail: string,
  ) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  getDiscountAmount: (subtotal: number) => number;
  getFinalTotal: (subtotal: number) => number;
}

// ✅ Module-level singleton — store ke bahar (re-render pe reset nahi hoga)
let couponFetchPromise: Promise<void> | null = null;
let couponFetchedOnce = false;

export const useCouponStore = create<CouponStore>()(
  persist(
    (set, get) => ({
      appliedCode: null,
      discountPercent: 0,
      discountLabel: "",
      coupon10Enabled: false,
      coupon20Enabled: false,
      settingsLoading: true,
      applyingCoupon: false,

      fetchCouponSettings: async () => {
        // ✅ Already fetched — skip (no DB call, no lock)
        if (couponFetchedOnce) {
          set({ settingsLoading: false });
          return;
        }

        // ✅ Fetch chal rahi hai — same promise return (no duplicate lock)
        if (couponFetchPromise) {
          return couponFetchPromise;
        }

        // ✅ Pehli aur sirf ek DB call
        couponFetchPromise = (async () => {
          try {
            set({ settingsLoading: true });

            // ✅ Do alag queries ki bajaye ek query se dono values fetch karo
            const { data, error } = await supabase
              .from("site_settings")
              .select("key, value")
              .in("key", ["coupon_10_enabled", "coupon_20_enabled"]);

            if (error) {
              console.error("[couponStore] DB error:", error);
            }

            const row10 = data?.find((r) => r.key === "coupon_10_enabled");
            const row20 = data?.find((r) => r.key === "coupon_20_enabled");

            const coupon10Enabled = row10?.value === true;
            const coupon20Enabled = row20?.value === true;

            set({
              coupon10Enabled,
              coupon20Enabled,
              settingsLoading: false,
            });

            // Cache in localStorage for offline fallback
            localStorage.setItem("coupon_10_enabled", String(coupon10Enabled));
            localStorage.setItem("coupon_20_enabled", String(coupon20Enabled));

            couponFetchedOnce = true;
            couponFetchPromise = null;
          } catch (err) {
            console.error("[couponStore] Failed to fetch settings:", err);

            // Fallback to localStorage cache
            const cached10 = localStorage.getItem("coupon_10_enabled");
            const cached20 = localStorage.getItem("coupon_20_enabled");

            if (cached10 !== null && cached20 !== null) {
              set({
                coupon10Enabled: cached10 === "true",
                coupon20Enabled: cached20 === "true",
                settingsLoading: false,
              });
            } else {
              set({ settingsLoading: false });
            }

            couponFetchedOnce = true;
            couponFetchPromise = null;
          }
        })();

        return couponFetchPromise;
      },

      updateCouponSettings: async (
        coupon10Enabled: boolean,
        coupon20Enabled: boolean,
      ) => {
        try {
          // ✅ Do alag upserts ki bajaye batch — ek lock
          const { error } = await supabase.from("site_settings").upsert(
            [
              {
                key: "coupon_10_enabled",
                value: coupon10Enabled,
                updated_at: new Date().toISOString(),
              },
              {
                key: "coupon_20_enabled",
                value: coupon20Enabled,
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: "key" },
          );

          if (error) throw error;

          set({ coupon10Enabled, coupon20Enabled });
          localStorage.setItem("coupon_10_enabled", String(coupon10Enabled));
          localStorage.setItem("coupon_20_enabled", String(coupon20Enabled));

          // ✅ Force re-fetch next time (admin ne change kiya)
          couponFetchedOnce = false;

          const { appliedCode, removeCoupon } = get();
          if (appliedCode === "DISC4U10" && !coupon10Enabled) removeCoupon();
          if (appliedCode === "DISC4U20" && !coupon20Enabled) removeCoupon();

          return true;
        } catch (err) {
          console.error("[couponStore] Failed to update coupon settings:", err);
          return false;
        }
      },

      applyCoupon: async (code: string, userEmail: string) => {
        const trimmed = code.trim().toUpperCase();
        const emailLower = (userEmail || "").trim().toLowerCase();

        if (!trimmed) {
          return { success: false, message: "Please enter a coupon code." };
        }

        const { coupon10Enabled, coupon20Enabled } = get();

        const validCodes = ["DISC4U10", "DISC4U20"];
        if (!validCodes.includes(trimmed)) {
          return {
            success: false,
            message: `"${trimmed}" is not a valid coupon code.`,
          };
        }

        if (trimmed === "DISC4U10" && !coupon10Enabled) {
          return {
            success: false,
            message:
              "This coupon code is currently not active. Please try another code.",
          };
        }
        if (trimmed === "DISC4U20" && !coupon20Enabled) {
          return {
            success: false,
            message:
              "This coupon code is currently not active. Please try another code.",
          };
        }

        if (trimmed === "DISC4U10") {
          set({
            appliedCode: trimmed,
            discountPercent: 10,
            discountLabel: "10% Off",
          });
          return {
            success: true,
            message: "🎉 10% discount applied successfully!",
          };
        }

        // DISC4U20: Owner-only eligibility check
        set({ applyingCoupon: true });

        try {
          const res = await fetch("/api/check-coupon-eligibility", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailLower, couponCode: trimmed }),
          });

          const data = await res.json();

          if (!res.ok || !data.eligible) {
            set({ applyingCoupon: false });
            return {
              success: false,
              message:
                data.message ||
                "20% discount coupon is only available for store owner.",
            };
          }

          set({
            appliedCode: trimmed,
            discountPercent: 20,
            discountLabel: "20% Off",
            applyingCoupon: false,
          });
          return {
            success: true,
            message: "🎉 20% discount applied successfully!",
          };
        } catch (err) {
          console.error("[couponStore] Eligibility check failed:", err);
          set({ applyingCoupon: false });
          return {
            success: false,
            message:
              "Could not verify eligibility. Please try again in a moment.",
          };
        }
      },

      removeCoupon: () => {
        set({ appliedCode: null, discountPercent: 0, discountLabel: "" });
        // ✅ Persist storage bhi clear karo — warna reload pe wapas aa jata hai
        try {
          const stored = localStorage.getItem("coupon-storage");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state) {
              parsed.state.appliedCode = null;
              parsed.state.discountPercent = 0;
              parsed.state.discountLabel = "";
              localStorage.setItem("coupon-storage", JSON.stringify(parsed));
            }
          }
        } catch (_) {}
      },

      getDiscountAmount: (subtotal: number) => {
        const { discountPercent } = get();
        if (!discountPercent) return 0;
        return (subtotal * discountPercent) / 100;
      },

      getFinalTotal: (subtotal: number) => {
        const discountAmount = get().getDiscountAmount(subtotal);
        return subtotal - discountAmount;
      },
    }),
    {
      name: "coupon-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        appliedCode: state.appliedCode,
        discountPercent: state.discountPercent,
        discountLabel: state.discountLabel,
      }),
    },
  ),
);
