// app/providers/CartProvider.tsx
"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/lib/cartStore";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const fetchCart = useCartStore((state) => state.fetchCart);
  const initialized = useCartStore((state) => state.initialized);
  const items = useCartStore((state) => state.items);
  const hasLoadedFromStorage = useRef(false);

  // First: Load from localStorage immediately on mount
  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    hasLoadedFromStorage.current = true;

    try {
      const persisted = localStorage.getItem("cart-storage");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        if (parsed.state?.items?.length > 0) {
          console.log(
            "✅ Cart loaded from localStorage:",
            parsed.state.items.length,
            "items"
          );
        }
      }
    } catch (e) {
      console.error("Failed to load cart from storage:", e);
    }
  }, []);

  // Second: Fetch from DB but preserve localStorage items
  useEffect(() => {
    if (!initialized && fetchCart) {
      fetchCart();
    }
  }, [fetchCart, initialized]);

  // Debug: Log cart state changes
  useEffect(() => {
    if (items.length > 0) {
      console.log("📦 Cart has", items.length, "items");
    }
  }, [items.length]);

  return <>{children}</>;
}
