// app/api/detect-country/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const h = await headers();
    const NO_CACHE = {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    };

    // ✅ Check all possible country headers (VPN se bhi detect hoga)
    const countryHeaders = [
      "cf-ipcountry", // Cloudflare
      "x-vercel-ip-country", // Vercel
      "cloudfront-viewer-country", // AWS
      "x-country",
      "x-geo-country",
      "x-real-country",
      "x-forwarded-for-country",
    ];

    for (const header of countryHeaders) {
      const val = h.get(header);
      if (
        val &&
        val.length === 2 &&
        val !== "XX" &&
        val !== "T1" &&
        val !== "EU"
      ) {
        console.log(`✅ Country detected from header ${header}: ${val}`);
        return NextResponse.json(
          { country: val.toUpperCase(), source: header, success: true },
          { headers: { ...NO_CACHE, Vary: header } },
        );
      }
    }

    // ✅ Fallback: Get from IP using server-side API
    try {
      const ip =
        h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "";
      const ipRes = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(3000),
      });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.country_code && ipData.country_code.length === 2) {
          return NextResponse.json(
            { country: ipData.country_code, source: "ipapi", success: true },
            { headers: NO_CACHE },
          );
        }
      }
    } catch (e) {
      console.log("IP API fallback failed:", e);
    }

    return NextResponse.json(
      { country: null, success: false },
      { headers: NO_CACHE },
    );
  } catch (error) {
    console.error("Country detection error:", error);
    return NextResponse.json(
      { country: null, success: false },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
