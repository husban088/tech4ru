import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrencyByCountry } from "@/lib/currency";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // User ne khud currency choose ki hai — kabhi override mat karo
  if (req.cookies.get("currencyUserSelected")?.value === "true") {
    return res;
  }

  // Pehle se detect ho chuki hai — dobara kaam mat karo
  if (req.cookies.get("preferredCurrency")?.value) {
    return res;
  }

  const countryHeaders = [
    "cf-ipcountry", // Cloudflare — VPN-aware
    "x-vercel-ip-country", // Vercel
    "cloudfront-viewer-country", // AWS CloudFront
    "x-country",
    "x-geo-country",
  ];

  for (const header of countryHeaders) {
    const val = req.headers.get(header);
    if (val && val.length === 2 && val !== "XX" && val !== "T1") {
      const currency = getCurrencyByCountry(val.toUpperCase());
      res.cookies.set("preferredCurrency", currency.code, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 din
        sameSite: "lax",
      });
      break;
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
