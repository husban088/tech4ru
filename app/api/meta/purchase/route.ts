// app/api/meta/purchase/route.ts
// ✅ Example: Call this route after order is placed successfully

import { NextRequest, NextResponse } from "next/server";
import { trackPurchase } from "@/lib/meta-events";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      email,
      phone,
      firstName,
      lastName,
      orderId,
      value,
      currency,
      contentIds,
      eventId, // pass same eventId as browser fbq('track','Purchase',{},{eventID:'...'})
    } = body;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const userAgent = req.headers.get("user-agent") || "";

    // _fbc and _fbp cookies for better matching
    const fbc = req.cookies.get("_fbc")?.value;
    const fbp = req.cookies.get("_fbp")?.value;

    await trackPurchase(
      {
        email,
        phone,
        firstName,
        lastName,
        ipAddress,
        userAgent,
        fbc,
        fbp,
      },
      {
        value,
        currency: currency ?? "PKR",
        orderId,
        contentIds,
      },
      eventId,
      req.headers.get("referer") ?? undefined,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/meta/purchase] Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
