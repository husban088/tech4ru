// app/context/CurrencyContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  currencies as staticCurrencies,
  Currency,
  getCurrencyByCountry,
  convertPrice,
  formatPrice,
  fetchLiveRates,
  forceRefreshRates,
  applyLiveRates,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: Currency;
  currencies: Currency[];
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceInPKR: number) => number;
  formatPrice: (priceInPKR: number) => string;
  refreshCurrency: () => Promise<void>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

const PKR =
  staticCurrencies.find((c) => c.code === "PKR") ?? staticCurrencies[0];

// ─── Read user's manual preference from localStorage ─────────────────
function getUserPref(): Currency | null {
  try {
    if (typeof window === "undefined") return null;
    const userSelected = localStorage.getItem("currencyUserSelected");
    if (userSelected !== "true") return null;
    const code = localStorage.getItem("preferredCurrency");
    if (!code) return null;
    return staticCurrencies.find((c) => c.code === code) ?? null;
  } catch {
    return null;
  }
}

// ─── Save user's manual selection to localStorage + cookie ───────────
function saveUserPref(code: string) {
  try {
    localStorage.setItem("preferredCurrency", code);
    localStorage.setItem("currencyUserSelected", "true");
    document.cookie = `preferredCurrency=${code}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `currencyUserSelected=true; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

// ─── Server-side country detection via our API route ─────────────────
async function detectCountryViaServer(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("/api/detect-country", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.country) return data.country as string;
    return null;
  } catch {
    return null;
  }
}

// ─── Client-side IP detection — race all APIs, first winner used ─────
async function detectCountryClientSide(): Promise<string> {
  const apis = [
    { url: "https://api.country.is/", parser: (d: any) => d.country },
    { url: "https://ipapi.co/json/", parser: (d: any) => d.country_code },
    {
      url: "https://freeipapi.com/api/json/",
      parser: (d: any) => d.countryCode,
    },
    { url: "https://ipwho.is/", parser: (d: any) => d.country_code },
  ];

  return new Promise<string>((resolve) => {
    let settled = false;
    let pending = apis.length;

    apis.forEach(({ url, parser }) => {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 3000);

      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          clearTimeout(tid);
          const code = parser(d);
          if (!settled && code && code.length === 2 && code !== "XX") {
            settled = true;
            resolve(code.toUpperCase());
          }
        })
        .catch(() => {
          clearTimeout(tid);
        })
        .finally(() => {
          pending--;
          // All APIs failed — fall back to PK
          if (!settled && pending === 0) resolve("PK");
        });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────
export function CurrencyProvider({
  children,
  initialCurrencyCode,
}: {
  children: React.ReactNode;
  // string = server detected (CDN header) or user preference from cookie
  // undefined = no server detection — client will detect
  initialCurrencyCode?: string;
}) {
  // ── Determine starting currency (runs on client mount) ──────────────
  const getStartingCurrency = (): Currency => {
    // Priority 1: User's manual localStorage preference (highest priority)
    const userPref = getUserPref();
    if (userPref) return userPref;

    // Priority 2: Server-detected via CDN headers (Cloudflare/Vercel)
    // initialCurrencyCode is undefined when no CDN header was found
    if (initialCurrencyCode) {
      const found = staticCurrencies.find(
        (c) => c.code === initialCurrencyCode,
      );
      if (found) return found;
    }

    // Priority 3: Show PKR while client detection runs
    return PKR;
  };

  const [liveCurrencies, setLiveCurrencies] =
    useState<Currency[]>(staticCurrencies);
  const [currency, setCurrencyState] = useState<Currency>(getStartingCurrency);
  const [loading, setLoading] = useState(false);
  const detectionDone = useRef(false);
  const lastRatesFetch = useRef<number>(0); // timestamp of last rates fetch
  const RATES_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in ms

  // ── User manually picks a currency ──────────────────────────────────
  const setCurrency = useCallback(
    (newCurrency: Currency) => {
      // Use live rate version if available
      const live =
        liveCurrencies.find((c) => c.code === newCurrency.code) ?? newCurrency;
      setCurrencyState(live);
      saveUserPref(live.code);
    },
    [liveCurrencies],
  );

  // ── Fetch live rates in background — never blocks UI ────────────────
  const applyRates = useCallback((currCode: string, force = false) => {
    const fetcher = force ? forceRefreshRates : fetchLiveRates;
    fetcher()
      .then((rates) => {
        if (!rates) return;
        lastRatesFetch.current = Date.now();
        const updated = applyLiveRates(rates);
        setLiveCurrencies(updated);
        // Update current currency with live rate too
        const updatedCurr = updated.find((c) => c.code === currCode);
        if (updatedCurr) setCurrencyState(updatedCurr);
      })
      .catch(() => {});
  }, []);

  // ── Main detection effect — runs once on mount ───────────────────────
  useEffect(() => {
    if (detectionDone.current) return;
    detectionDone.current = true;

    const currentCode = currency.code;

    // Always fetch live rates for accurate prices (background, non-blocking)
    applyRates(currentCode);

    // ✅ FIXED: Only skip client detection if server ACTUALLY detected
    // initialCurrencyCode = undefined means no CDN header → MUST run client detection
    // initialCurrencyCode = "PKR" could mean user is in Pakistan (server detected)
    //   OR it could be a fallback — but now get-initial-currency returns null for fallback
    //   so if we receive "PKR" here, server genuinely detected Pakistan ✅
    if (initialCurrencyCode !== undefined) {
      // Server already determined the currency — trust it, skip client APIs
      // This covers: user cookie, Cloudflare header, Vercel header, AWS header
      console.log("✅ Using server-detected currency:", initialCurrencyCode);
      return;
    }

    // ✅ User manually selected in this session — respect their choice
    if (typeof window !== "undefined") {
      try {
        if (localStorage.getItem("currencyUserSelected") === "true") {
          console.log("✅ Using user localStorage preference");
          return;
        }
      } catch {}
    }

    // ✅ No server detection, no user preference → run client-side detection
    // This handles: local dev, shared hosting, no CDN setup
    const detect = async () => {
      setLoading(true);
      try {
        // Try our server API first (reads CDN headers on server)
        let country = await detectCountryViaServer();

        // If server API also fails, race all external IP APIs
        if (!country) {
          country = await detectCountryClientSide();
        }

        const detected = getCurrencyByCountry(country);
        console.log(`🌍 Client detected: ${country} → ${detected.code}`);

        setCurrencyState(detected);
        applyRates(detected.code);

        // Sync language dropdown for Germany users
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("force-language-dropdown", {
              detail: { country: country === "DE" ? "DE" : "OTHER" },
            }),
          );
        }

        // Save auto-detected currency (NOT as user preference — no "currencyUserSelected")
        try {
          localStorage.setItem("preferredCurrency", detected.code);
          document.cookie = `preferredCurrency=${detected.code}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    detect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh live rates every 6 hours ───────────────────────────
  // Also refreshes when user comes back to the tab after a long absence
  useEffect(() => {
    // Periodic timer: refresh rates every 6 hours
    const interval = setInterval(() => {
      const currCode = currency.code;
      console.log("🔄 Auto-refreshing live rates (6h interval)");
      applyRates(currCode, true); // force=true to bypass cache
    }, RATES_REFRESH_INTERVAL);

    // Visibility change: refresh if tab was hidden for >6 hours
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastRatesFetch.current;
        if (elapsed > RATES_REFRESH_INTERVAL) {
          console.log("🔄 Tab refocused — refreshing stale rates");
          applyRates(currency.code, true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currency.code, applyRates, RATES_REFRESH_INTERVAL]);

  // ── Force re-detect (e.g. user clicks "detect my currency") ─────────
  const refreshCurrency = useCallback(async () => {
    detectionDone.current = false;

    // Clear auto-detected preference (but NOT user manual selection)
    try {
      if (
        typeof window !== "undefined" &&
        localStorage.getItem("currencyUserSelected") !== "true"
      ) {
        localStorage.removeItem("preferredCurrency");
        document.cookie =
          "preferredCurrency=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    } catch {}

    setLoading(true);
    try {
      let country = await detectCountryViaServer();
      if (!country) country = await detectCountryClientSide();
      const detected = getCurrencyByCountry(country);
      setCurrencyState(detected);
      applyRates(detected.code, true); // force=true — bypass cache on manual refresh
    } finally {
      setLoading(false);
    }
  }, [applyRates]);

  const convert = useCallback(
    (pkr: number) => convertPrice(pkr, currency),
    [currency],
  );
  const format = useCallback(
    (pkr: number) => formatPrice(pkr, currency),
    [currency],
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencies: liveCurrencies,
        setCurrency,
        convertPrice: convert,
        formatPrice: format,
        refreshCurrency,
        loading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
