// app/api/live-rates/route.ts
// ✅ Server-side live rate fetcher — no CORS issues
// ✅ Multi-API fallback chain (3 sources)
// ✅ Next.js cache: revalidate every 6 hours (server-level caching)
// ✅ Returns PKR-base rates: { rates: { USD: 0.003584, GBP: 0.002639, ... } }
//
// HOW IT WORKS:
// Browser calls /api/live-rates → this route fetches from external APIs on server
// Server has no CORS restriction → more APIs available + faster
// Next.js caches the response for 6h → external API not hit on every request

import { NextResponse } from "next/server";

// Hardcoded fallback (May 2026) — used only if ALL APIs fail
const FALLBACK: Record<string, number> = {
  USD: 0.003584,
  GBP: 0.002639,
  EUR: 0.003049,
  AUD: 0.005,
  CAD: 0.004878,
  AED: 0.013082,
  SAR: 0.013357,
  INR: 0.298507,
  PKR: 1,
};

async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(tid);
    return res;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// Convert USD-base rates to PKR-base rates
function usdBaseToPkrBase(
  rates: Record<string, number>,
): Record<string, number> {
  const pkrPerUsd = rates["PKR"];
  if (!pkrPerUsd || pkrPerUsd <= 0) return {};
  const out: Record<string, number> = { PKR: 1 };
  for (const [code, val] of Object.entries(rates)) {
    if (code === "PKR") continue;
    out[code] = val / pkrPerUsd; // X per 1 PKR
  }
  return out;
}

export async function GET() {
  const needed = ["USD", "GBP", "EUR", "AUD", "CAD", "AED", "SAR", "INR"];

  // ── API 1: open.er-api.com — PKR base, free, no key ──────────────────────
  try {
    const res = await fetchWithTimeout("https://open.er-api.com/v6/latest/PKR");
    if (res.ok) {
      const data = await res.json();
      const rates = data.rates as Record<string, number>;
      if (rates?.USD) {
        console.log("✅ live-rates: open.er-api.com");
        // Keep only currencies we need + PKR
        const filtered: Record<string, number> = { PKR: 1 };
        for (const code of needed) {
          if (rates[code]) filtered[code] = rates[code];
        }
        return NextResponse.json(
          { rates: filtered, source: "open.er-api.com", ts: Date.now() },
          {
            headers: {
              // Next.js ISR-style: serve cached, revalidate in background after 6h
              "Cache-Control":
                "public, s-maxage=21600, stale-while-revalidate=3600",
            },
          },
        );
      }
    }
  } catch {
    // continue to next API
  }

  // ── API 2: exchangerate-api.com — PKR base, free, no key ─────────────────
  try {
    const res = await fetchWithTimeout(
      "https://api.exchangerate-api.com/v4/latest/PKR",
    );
    if (res.ok) {
      const data = await res.json();
      const rates = data.rates as Record<string, number>;
      if (rates?.USD) {
        console.log("✅ live-rates: exchangerate-api.com");
        const filtered: Record<string, number> = { PKR: 1 };
        for (const code of needed) {
          if (rates[code]) filtered[code] = rates[code];
        }
        return NextResponse.json(
          { rates: filtered, source: "exchangerate-api.com", ts: Date.now() },
          {
            headers: {
              "Cache-Control":
                "public, s-maxage=21600, stale-while-revalidate=3600",
            },
          },
        );
      }
    }
  } catch {
    // continue
  }

  // ── API 3: frankfurter.app — EUR base, server-side only (blocks browser CORS)
  try {
    const res = await fetchWithTimeout(
      "https://api.frankfurter.app/latest?from=PKR&to=USD,GBP,EUR,AUD,CAD,AED,SAR,INR",
    );
    if (res.ok) {
      const data = await res.json();
      // frankfurter returns { base: "PKR", rates: { USD: X, GBP: Y, ... } }
      const rates = data.rates as Record<string, number>;
      if (rates?.USD) {
        console.log("✅ live-rates: frankfurter.app");
        const filtered: Record<string, number> = { PKR: 1, ...rates };
        return NextResponse.json(
          { rates: filtered, source: "frankfurter.app", ts: Date.now() },
          {
            headers: {
              "Cache-Control":
                "public, s-maxage=21600, stale-while-revalidate=3600",
            },
          },
        );
      }
    }
  } catch {
    // all failed
  }

  // ── Fallback: hardcoded rates ─────────────────────────────────────────────
  console.warn("⚠️ live-rates: all APIs failed — using hardcoded fallback");
  return NextResponse.json(
    { rates: FALLBACK, source: "fallback", ts: Date.now() },
    {
      status: 200,
      headers: {
        // Short cache for fallback — retry sooner
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    },
  );
}
