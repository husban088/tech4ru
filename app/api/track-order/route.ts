// app/api/track-order/route.ts
// ✅ Public order tracking — customer apna order number + email se track kare
// ⚠️ Security: sirf tab order return karta hai jab email match kare

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/track-order?order_number=ORD-XXX&email=test@example.com
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = (searchParams.get("order_number") || "")
      .trim()
      .toUpperCase();
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: "order_number and email are required" },
        { status: 400 },
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const supabase = getClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .eq("email", email) // ✅ Security: email must match — prevents order snooping
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found (not a real error)
      console.error("[track-order] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      // Return null order — don't expose whether order exists or email is wrong
      return NextResponse.json({ order: null });
    }

    return NextResponse.json({ order: data });
  } catch (err: any) {
    console.error("[track-order] Exception:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
