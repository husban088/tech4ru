// lib/get-initial-currency.ts
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { currencies, getCurrencyByCountry, defaultCurrency } from "./currency";

// Returns Currency if detected/user-selected, OR null if no CDN header found
// null = client-side detection will run in CurrencyContext
export async function getInitialCurrency() {
  try {
    const cookieStore = await cookies();

    // Priority 1: User manually selected currency — always respect
    if (
      cookieStore.get("currencyUserSelected")?.value === "true" &&
      cookieStore.get("preferredCurrency")?.value
    ) {
      const code = cookieStore.get("preferredCurrency")!.value;
      const saved = currencies.find((c) => c.code === code);
      if (saved) {
        console.log("📀 User-selected from cookie:", saved.code);
        // Return with a flag so CurrencyContext knows this is user preference
        return { currency: saved, source: "user" as const };
      }
    }

    // Priority 2: CDN/Edge headers — most reliable geo-detection
    // Cloudflare cf-ipcountry is VPN-aware, Vercel x-vercel-ip-country also reliable
    const h = await headers();
    for (const header of [
      "cf-ipcountry", // Cloudflare (best — VPN aware)
      "x-vercel-ip-country", // Vercel
      "cloudfront-viewer-country", // AWS CloudFront
      "x-country",
      "x-geo-country",
    ]) {
      const val = h.get(header);
      // Validate: must be 2-char ISO code, not "XX" (unknown) or "T1" (Tor)
      if (val && val.length === 2 && val !== "XX" && val !== "T1") {
        const detected = getCurrencyByCountry(val.toUpperCase());
        console.log(`🌍 [${header}] ${val} → ${detected.code}`);
        return { currency: detected, source: "server" as const };
      }
    }

    // No CDN header found — return null so client-side detection runs
    // Do NOT return PKR here — that would block client detection for DE/AE users
    console.log("⚠️ No CDN header — client will detect currency");
    return null;
  } catch (err) {
    console.error("getInitialCurrency error:", err);
    return null;
  }
}
