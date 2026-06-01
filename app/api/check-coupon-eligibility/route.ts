// app/api/check-coupon-eligibility/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const { email, couponCode } = await req.json();

    const emailLower = (email || "").trim().toLowerCase();
    const code = (couponCode || "").trim().toUpperCase();

    // ── DISC4U10: Open for everyone — no check needed ──
    if (code === "DISC4U10" || !code) {
      // If no specific code is passed, or it's DISC4U10, always eligible
      console.log(`✅ Coupon eligibility: DISC4U10 is open for everyone`);
      return NextResponse.json({
        eligible: true,
        reason: "public_coupon",
        message: "10% discount applied successfully!",
      });
    }

    // ── DISC4U20: Owner-only ──
    if (code === "DISC4U20") {
      if (!emailLower) {
        return NextResponse.json(
          { eligible: false, message: "Email is required to use this coupon." },
          { status: 400 },
        );
      }

      const couponOwnerEmail = (process.env.COUPON_OWNER_EMAIL || "")
        .trim()
        .toLowerCase();

      if (couponOwnerEmail && emailLower === couponOwnerEmail) {
        console.log(`✅ Coupon eligibility: OWNER bypass for ${emailLower}`);
        return NextResponse.json({
          eligible: true,
          reason: "owner",
          message: "Owner access granted.",
        });
      }

      // Also check delivered_customers table for DISC4U20
      const supabase = getClient();
      const { data, error } = await supabase
        .from("delivered_customers")
        .select("id, order_number, delivered_at")
        .ilike("email", emailLower)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("❌ Eligibility DB error:", error.message);
        return NextResponse.json(
          {
            eligible: false,
            message: "Could not verify eligibility. Please try again.",
          },
          { status: 500 },
        );
      }

      if (data) {
        console.log(`✅ DISC4U20 eligible: delivered customer ${emailLower}`);
        return NextResponse.json({
          eligible: true,
          reason: "delivered_customer",
          orderNumber: data.order_number,
          deliveredAt: data.delivered_at,
        });
      }

      console.log(`❌ DISC4U20 NOT eligible — ${emailLower}`);
      return NextResponse.json({
        eligible: false,
        message: "20% discount coupon is only available for the store owner.",
      });
    }

    // Unknown code
    return NextResponse.json({
      eligible: false,
      message: "Invalid coupon code.",
    });
  } catch (err: any) {
    console.error("❌ check-coupon-eligibility crash:", err?.message || err);
    return NextResponse.json(
      { eligible: false, message: "Server error. Please try again." },
      { status: 500 },
    );
  }
}
