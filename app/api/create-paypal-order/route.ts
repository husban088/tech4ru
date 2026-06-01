// app/api/create-paypal-order/route.ts
import { NextRequest, NextResponse } from "next/server";

const PAYPAL_API_URL =
  process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

// ✅ Only PKR needs fallback — all other currencies passed as-is
const PAYPAL_CURRENCY_FALLBACK: Record<string, string> = {
  PKR: "USD",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === "your_paypal_client_id") {
    throw new Error(
      "PayPal credentials not configured. Please add NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local"
    );
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
    const { amount, currency = "USD", orderData } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // ✅ Only fallback PKR → USD. Everything else (AUD, GBP, EUR etc.) passes through.
    const rawCurrency = currency.toUpperCase();
    const finalCurrency = PAYPAL_CURRENCY_FALLBACK[rawCurrency] ?? rawCurrency;

    let accessToken;
    try {
      accessToken = await getPayPalAccessToken();
    } catch (tokenError) {
      console.error("Token error:", tokenError);
      return NextResponse.json(
        {
          error:
            "PayPal authentication failed. Please check your API credentials.",
        },
        { status: 401 }
      );
    }

    // ✅ Build shipping address block if provided
    // This pre-fills the billing/shipping form in PayPal's own popup
    const shippingAddr = orderData?.shippingAddress;
    const hasAddress = shippingAddr?.addressLine1 || shippingAddr?.firstName;

    const shippingBlock = hasAddress
      ? {
          shipping: {
            name: {
              full_name: `${shippingAddr.firstName || ""} ${
                shippingAddr.lastName || ""
              }`.trim(),
            },
            address: {
              address_line_1: shippingAddr.addressLine1 || "",
              admin_area_2: shippingAddr.city || "",
              postal_code: shippingAddr.postalCode || "",
              country_code: shippingAddr.countryCode || "US",
            },
          },
        }
      : {};

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: finalCurrency, // ✅ AUD/GBP/EUR/USD etc — correct currency
              value: amount.toFixed(2), // ✅ Converted amount
            },
            description: orderData?.description || "Order from Tech4U",
            custom_id: orderData?.orderNumber,
            // ✅ Pre-fill billing/shipping in PayPal's form
            ...shippingBlock,
          },
        ],
        application_context: {
          brand_name: "Tech4U",
          landing_page: "BILLING", // Opens PayPal directly on card/billing page
          user_action: "PAY_NOW",
          // ✅ Use provided address so PayPal's form pre-fills it
          shipping_preference: hasAddress
            ? "SET_PROVIDED_ADDRESS"
            : "GET_FROM_FILE",
          return_url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/checkout`,
          cancel_url: `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/checkout`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("PayPal order creation error:", data);
      return NextResponse.json(
        { error: data.message || "Failed to create PayPal order" },
        { status: response.status }
      );
    }

    const approvalUrl = data.links?.find(
      (link: any) => link.rel === "approve"
    )?.href;

    return NextResponse.json({
      orderId: data.id,
      approvalUrl,
      currency: finalCurrency,
    });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
