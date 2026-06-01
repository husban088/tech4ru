// app/components/CurrencyCleaner.tsx
"use client";

import { useEffect } from "react";

export function CurrencyCleaner() {
  useEffect(() => {
    try {
      // ✅ ONLY clear stale data if user never manually selected a currency
      // AND the stored currency is not PKR (PKR is valid for Pakistan users)
      const userSelected = localStorage.getItem("currencyUserSelected");
      if (userSelected === "true") {
        // User manually picked — never touch their preference
        return;
      }
      // If no user selection, do nothing — let CurrencyContext auto-detect
      // Do NOT remove PKR — Pakistan users should see PKR immediately
    } catch (e) {
      console.error("CurrencyCleaner error:", e);
    }
  }, []);

  return null;
}
