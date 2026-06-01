// app/api/capture-paypal-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PAYPAL_API_URL =
  process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === "your_paypal_client_id") {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("PayPal token error:", error);
    throw new Error(`Failed to get PayPal token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, orderNumber, formData, subtotal, shipping, total } =
      await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    // Capture the payment
    const response = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await response.json();

    if (!response.ok) {
      console.error("PayPal capture error:", captureData);
      return NextResponse.json(
        { error: captureData.message || "Payment capture failed" },
        { status: response.status }
      );
    }

    if (captureData.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Payment capture failed with status: ${captureData.status}` },
        { status: 400 }
      );
    }

    // ✅ Update order in Supabase with PayPal transaction ID
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "paypal",
          payment_id: captureData.id,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("order_number", orderNumber);

      if (updateError) {
        console.error("Error updating order:", updateError);
      }
    } catch (dbError) {
      console.warn("Database update skipped:", dbError);
    }

    return NextResponse.json({
      success: true,
      captureId: captureData.id,
      payerEmail: captureData.payer?.email_address,
      payerName: captureData.payer?.name?.given_name
        ? `${captureData.payer.name.given_name} ${
            captureData.payer.name.surname || ""
          }`
        : null,
    });
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to capture payment. Please try again." },
      { status: 500 }
    );
  }
}
