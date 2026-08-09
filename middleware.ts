import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Country → Currency map ───────────────────────────────────────────────
// NOTE: Keep this in sync with lib/currency.ts's getCurrencyByCountry logic.
// Agar wahan zyada countries handle hote hain, unko yahan bhi copy kar lo.
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  PK: "PKR",
  AE: "AED",
  US: "USD",
  GB: "GBP",
  // ...baaki countries currency.ts se copy kar lo
};
const DEFAULT_CURRENCY = "USD";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Agar user ne already manually currency select ki hui hai, kuch mat karo
  const userSelected = req.cookies.get("currencyUserSelected")?.value;
  if (userSelected === "true") {
    return res;
  }

  // Agar geo-detect cookie already set hai (pichli request se), skip karo
  if (req.cookies.get("preferredCurrency")?.value) {
    return res;
  }

  // Geo headers se country detect karo (Vercel edge pe yeh already available hain,
  // koi extra network call nahi lagti — bilkul fast)
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("cloudfront-viewer-country") ||
    "";

  const code =
    (country && COUNTRY_CURRENCY_MAP[country.toUpperCase()]) ||
    DEFAULT_CURRENCY;

  // Cookie set karo — client-side CurrencyContext isko read kar lega,
  // koi server-side blocking call nahi, koi dynamic rendering force nahi hogi
  res.cookies.set("preferredCurrency", code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 din
    sameSite: "lax",
  });

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js)$).*)",
  ],
};