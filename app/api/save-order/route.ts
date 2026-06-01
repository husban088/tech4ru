// app/api/save-order/route.ts
// ✅ Server-side Supabase order save
// Browser cancel se safe — server pe save hota hai
// ============================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (service role — RLS bypass)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      order_number,
      first_name,
      last_name,
      email,
      phone,
      address,
      apartment,
      city,
      zip,
      country,
      subtotal,
      shipping_cost,
      total_amount,
      payment_method,
      status,
      items,
      currency,
    } = body;

    console.log("💾 Saving order to Supabase:", order_number);

    // ✅ Check karo duplicate order nahi hai
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", order_number)
      .single();

    if (existing) {
      console.log("⚠️ Order already exists:", order_number);
      return NextResponse.json({ success: true, duplicate: true });
    }

    const { data, error } = await supabase.from("orders").insert({
      order_number,
      user_id: null,
      first_name: first_name?.trim() || "",
      last_name: last_name?.trim() || "",
      email: email?.trim().toLowerCase() || "",
      phone,
      address: address?.trim() || "",
      apartment: apartment?.trim() || null,
      city: city?.trim() || "",
      zip: zip?.trim() || "",
      country: country || "",
      subtotal: subtotal || 0,
      shipping_cost: shipping_cost || 0,
      total_amount: total_amount || 0,
      payment_method: payment_method || "card",
      status: status || "pending",
      currency: currency || "PKR",
      items: items || [],
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ Supabase insert error:", error.code, error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    console.log("✅ Order saved to Supabase:", order_number);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("❌ save-order route error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
