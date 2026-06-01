// lib/currency.ts
// ✅ RATES UPDATED: 2 May 2026 — Pakistan Open Market
// Source: Daily Pakistan / forex.pk open market rates
// Base currency: PKR (1 PKR = X foreign)
// Formula: rate = 1 / (PKR per 1 foreign unit)

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // 1 PKR = this many units of foreign currency
  flag: string;
  phoneCode: string;
  countryCode: string;
}

export const currencies: Currency[] = [
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    rate: 0.003584, // 1 USD = 279 PKR
    flag: "🇺🇸",
    phoneCode: "+1",
    countryCode: "US",
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    rate: 0.002639, // 1 GBP = 379 PKR
    flag: "🇬🇧",
    phoneCode: "+44",
    countryCode: "GB",
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    rate: 0.003049, // 1 EUR = 328 PKR
    flag: "🇪🇺",
    phoneCode: "+352",
    countryCode: "EU",
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    rate: 0.005, // 1 AUD = 200 PKR
    flag: "🇦🇺",
    phoneCode: "+61",
    countryCode: "AU",
  },
  {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    rate: 0.004878, // 1 CAD = 205 PKR
    flag: "🇨🇦",
    phoneCode: "+1",
    countryCode: "CA",
  },
  {
    code: "AED",
    symbol: "AED", // ✅ FIX: Arabic symbol removed — causes PayPal crash
    name: "UAE Dirham",
    rate: 0.013082, // 1 AED = 76.45 PKR
    flag: "🇦🇪",
    phoneCode: "+971",
    countryCode: "AE",
  },
  {
    code: "SAR",
    symbol: "SAR", // ✅ FIX: Arabic symbol removed — causes PayPal crash
    name: "Saudi Riyal",
    rate: 0.013357, // 1 SAR = 74.87 PKR
    flag: "🇸🇦",
    phoneCode: "+966",
    countryCode: "SA",
  },
  {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    rate: 0.298507, // 1 INR = 3.35 PKR
    flag: "🇮🇳",
    phoneCode: "+91",
    countryCode: "IN",
  },
  {
    code: "PKR",
    symbol: "Rs.",
    name: "Pakistani Rupee",
    rate: 1, // Base currency
    flag: "🇵🇰",
    phoneCode: "+92",
    countryCode: "PK",
  },
];

export let defaultCurrency: Currency =
  currencies.find((c) => c.code === "PKR") || currencies[0];

// ── Live Rate Fetcher ──────────────────────────────────────────────────────────
// ✅ Multi-API with automatic fallback chain
// ✅ Server-side route preferred (no CORS) — client APIs as fallback
// ✅ Cache: 6 hours (rates don't change every minute)
// ✅ Last-known rates always preserved — never shows wrong price
// ✅ Auto-refresh: CurrencyContext calls this periodically

let _ratesCacheTime = 0;
let _ratesLive: Record<string, number> | null = null;
const RATES_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ── Hardcoded fallback rates (updated May 2026) ───────────────────────────────
// Used ONLY when ALL APIs fail — prevents showing wrong $0.00 prices
const FALLBACK_RATES_PKR_BASE: Record<string, number> = {
  USD: 0.003584, // 1 PKR = 0.003584 USD  (1 USD ≈ 279 PKR)
  GBP: 0.002639, // 1 PKR = 0.002639 GBP  (1 GBP ≈ 379 PKR)
  EUR: 0.003049, // 1 PKR = 0.003049 EUR  (1 EUR ≈ 328 PKR)
  AUD: 0.005, // 1 PKR = 0.005000 AUD  (1 AUD ≈ 200 PKR)
  CAD: 0.004878, // 1 PKR = 0.004878 CAD  (1 CAD ≈ 205 PKR)
  AED: 0.013082, // 1 PKR = 0.013082 AED  (1 AED ≈ 76.45 PKR)
  SAR: 0.013357, // 1 PKR = 0.013357 SAR  (1 SAR ≈ 74.87 PKR)
  INR: 0.298507, // 1 PKR = 0.298507 INR  (1 INR ≈ 3.35 PKR)
  PKR: 1,
};

// ── Fetch with timeout helper ─────────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(tid);
    return res;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// ── Normalize rates: any base → PKR-base rates ────────────────────────────────
// open.er-api gives PKR-base directly.
// exchangerate.host gives USD-base → we convert.
function normalizeToPKRBase(
  rates: Record<string, number>,
  base: "PKR" | "USD",
): Record<string, number> {
  if (base === "PKR") return rates;

  // USD-base: rates[X] = how many X per 1 USD
  // We need: how many X per 1 PKR = rates[X] / rates[PKR]
  const pkrPerUsd = rates["PKR"];
  if (!pkrPerUsd || pkrPerUsd <= 0) return {};

  const normalized: Record<string, number> = { PKR: 1 };
  for (const [code, val] of Object.entries(rates)) {
    if (code === "PKR") continue;
    normalized[code] = val / pkrPerUsd; // X per 1 PKR
  }
  return normalized;
}

// ── Main live rate fetcher ────────────────────────────────────────────────────
export async function fetchLiveRates(): Promise<Record<string, number> | null> {
  // Return cached rates if still fresh (within TTL)
  if (_ratesLive && Date.now() - _ratesCacheTime < RATES_CACHE_TTL) {
    return _ratesLive;
  }

  // ── API chain: try each in order, stop at first success ──────────────────
  // Priority 1: Our own Next.js server route — no CORS, most reliable
  // Priority 2: open.er-api.com — free, CORS-enabled, PKR base
  // Priority 3: exchangerate-api.com — free tier, PKR base
  // Priority 4: Fallback hardcoded rates (always works)

  // 1. Own server API (server reads external APIs without CORS restriction)
  try {
    const res = await fetchWithTimeout("/api/live-rates", 4000);
    if (res.ok) {
      const data = await res.json();
      if (data.rates && data.rates.USD) {
        _ratesLive = data.rates; // already PKR-base from our route
        _ratesCacheTime = Date.now();
        console.log("✅ Live rates from /api/live-rates");
        return _ratesLive;
      }
    }
  } catch {
    // continue
  }

  // 2. open.er-api.com (CORS-safe, PKR base, free)
  try {
    const res = await fetchWithTimeout(
      "https://open.er-api.com/v6/latest/PKR",
      5000,
    );
    if (res.ok) {
      const data = await res.json();
      const rates = data.rates as Record<string, number>;
      if (rates?.USD) {
        _ratesLive = rates;
        _ratesCacheTime = Date.now();
        console.log("✅ Live rates from open.er-api.com");
        return _ratesLive;
      }
    }
  } catch {
    // continue
  }

  // 3. exchangerate-api.com (CORS-safe, PKR base, free tier)
  try {
    const res = await fetchWithTimeout(
      "https://api.exchangerate-api.com/v4/latest/PKR",
      5000,
    );
    if (res.ok) {
      const data = await res.json();
      const rates = data.rates as Record<string, number>;
      if (rates?.USD) {
        _ratesLive = rates;
        _ratesCacheTime = Date.now();
        console.log("✅ Live rates from exchangerate-api.com");
        return _ratesLive;
      }
    }
  } catch {
    // continue
  }

  // 4. If we have stale cached rates — return them (better than null/hardcoded)
  if (_ratesLive) {
    console.warn("⚠️ All live APIs failed — using stale cached rates");
    return _ratesLive;
  }

  // 5. Absolute last resort: hardcoded fallback (only if never fetched before)
  console.warn("⚠️ All APIs failed — using hardcoded fallback rates");
  return FALLBACK_RATES_PKR_BASE;
}

// ── Force refresh (bypass cache) ──────────────────────────────────────────────
// Called when user manually refreshes currency or app comes back online
export async function forceRefreshRates(): Promise<Record<
  string,
  number
> | null> {
  _ratesCacheTime = 0; // invalidate cache
  return fetchLiveRates();
}

// ── Apply live rates to currencies array ──────────────────────────────────────
export function applyLiveRates(liveRates: Record<string, number>): Currency[] {
  return currencies.map((c) => {
    if (c.code === "PKR") return c;
    const liveRate = liveRates[c.code];
    if (liveRate && liveRate > 0) {
      return { ...c, rate: liveRate };
    }
    return c;
  });
}

// Country → Currency mapping
const countryToCurrency: Record<string, string> = {
  US: "USD",
  CA: "CAD",
  MX: "USD",
  GB: "GBP",
  DE: "EUR", // Germany → EUR ✅
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  PT: "EUR",
  IE: "EUR",
  AT: "EUR",
  CH: "EUR",
  SE: "USD",
  NO: "USD",
  DK: "USD",
  AU: "AUD",
  NZ: "AUD",
  JP: "USD",
  CN: "USD",
  HK: "USD",
  SG: "USD",
  IN: "INR",
  PK: "PKR",
  BD: "USD",
  LK: "USD",
  NP: "USD",
  AE: "AED", // Dubai/UAE → AED ✅ (English, no Arabic)
  SA: "SAR", // Saudi Arabia → SAR ✅
  QA: "AED", // Qatar → AED
  KW: "AED", // Kuwait → AED
  OM: "AED", // Oman → AED
  BH: "AED", // Bahrain → AED
  ZA: "USD",
  NG: "USD",
};

export function getCurrencyByCountry(countryCode: string): Currency {
  const currencyCode = countryToCurrency[countryCode] || "USD";
  return currencies.find((c) => c.code === currencyCode) || currencies[0];
}

export function convertPrice(
  priceInPKR: number,
  targetCurrency: Currency,
): number {
  return priceInPKR * targetCurrency.rate;
}

export function formatPrice(priceInPKR: number, currency: Currency): string {
  const converted = convertPrice(priceInPKR, currency);
  const formatted = converted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // PKR: "Rs. 1,234.00" — space after symbol; others: "$1,234.00"
  if (currency.code === "PKR") return `${currency.symbol} ${formatted}`;
  return `${currency.symbol}${formatted}`;
}

// Country detection APIs
export async function detectUserCountry(): Promise<string> {
  const apis = [
    {
      url: "https://api.country.is/",
      parser: (data: any) => data.country,
    },
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);
      if (!response.ok) continue;
      const data = await response.json();
      const countryCode = api.parser(data);
      if (countryCode?.length === 2) return countryCode;
    } catch {
      continue;
    }
  }

  // Browser language fallback
  if (typeof navigator !== "undefined") {
    const lang = navigator.language;
    const langMap: Record<string, string> = {
      "ur-PK": "PK",
      "ar-AE": "AE",
      "ar-SA": "SA",
      "hi-IN": "IN",
      "en-US": "US",
      "en-GB": "GB",
      "en-AU": "AU",
      "en-CA": "CA",
    };
    if (langMap[lang]) return langMap[lang];
    if (lang.startsWith("ur")) return "PK";
    if (lang.startsWith("ar")) return "AE";
    if (lang.startsWith("en-AU")) return "AU";
    if (lang.startsWith("en-CA")) return "CA";
    if (lang.startsWith("en-GB")) return "GB";
    if (lang.startsWith("en")) return "US";
  }

  return "PK";
}

export function saveCurrencyPreference(currencyCode: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("preferredCurrency", currencyCode);
    document.cookie = `preferredCurrency=${currencyCode}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export function loadCurrencyPreference(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("preferredCurrency");
  }
  return null;
}

export function clearCurrencyPreference(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("preferredCurrency");
    document.cookie =
      "preferredCurrency=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}
