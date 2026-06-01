// app/api/admin/update-order-status/route.ts
// ✅ LIVE RATES: fetchLiveRates from currency.ts — no hardcoded rates
// ✅ Only 3 status buttons: shipped | delivered | cancelled
// ✅ confirmed is handled by send-order-notification (on checkout)
// ✅ Currency by customer country in all emails + WhatsApp
// ✅ PAID PLAN: Product image sent with WhatsApp for ALL statuses
// ✅ When status = "delivered", customer email saved to
//    delivered_customers table → unlocks coupon codes for them

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendShippedWhatsApp,
  sendDeliveredWhatsApp,
  sendCancelledWhatsApp,
} from "@/lib/whatsapp";
import { sendStatusUpdateEmail, sendOwnerStatusAlert } from "@/lib/email-smtp";
import {
  fetchLiveRates,
  getCurrencyByCountry,
  currencies as staticCurrencies,
} from "@/lib/currency";

// ── Country name → 2-letter code ─────────────────────────────────────────────
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Pakistan: "PK",
  "United States": "US",
  USA: "US",
  US: "US",
  "United Kingdom": "GB",
  UK: "GB",
  GB: "GB",
  England: "GB",
  Australia: "AU",
  AU: "AU",
  Canada: "CA",
  CA: "CA",
  "United Arab Emirates": "AE",
  UAE: "AE",
  AE: "AE",
  Dubai: "AE",
  "Saudi Arabia": "SA",
  SA: "SA",
  KSA: "SA",
  India: "IN",
  IN: "IN",
  Germany: "DE",
  DE: "DE",
  Europe: "DE", // safety fallback
  France: "FR",
  FR: "FR",
  Italy: "IT",
  IT: "IT",
  Spain: "ES",
  ES: "ES",
  Netherlands: "NL",
  NL: "NL",
  Austria: "AT",
  AT: "AT",
  Belgium: "BE",
  BE: "BE",
  Portugal: "PT",
  PT: "PT",
};

// ── Server-side live rate cache (shared across requests in same process) ───────
let _ratesCache: Record<string, number> | null = null;
let _cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function getLiveRates(): Promise<Record<string, number> | null> {
  if (_ratesCache && Date.now() - _cacheTime < CACHE_TTL) {
    return _ratesCache;
  }
  const rates = await fetchLiveRates();
  if (rates) {
    _ratesCache = rates;
    _cacheTime = Date.now();
  }
  return rates;
}

// ── Get live currency config for a country ────────────────────────────────────
async function getCurrencyForCountry(country: string) {
  const countryCode = COUNTRY_NAME_TO_CODE[country] || "PK";
  const staticCurr = getCurrencyByCountry(countryCode);
  const rates = await getLiveRates();
  const liveRate = rates?.[staticCurr.code];
  return {
    code: staticCurr.code,
    symbol: staticCurr.symbol,
    rate: liveRate && liveRate > 0 ? liveRate : staticCurr.rate, // live first, static fallback
  };
}

// ── Format amount in target currency (always from PKR) ────────────────────────
function formatAmount(
  amountPKR: number,
  cfg: { code: string; symbol: string; rate: number },
): string {
  if (cfg.code === "PKR") {
    return `Rs. ${Math.round(amountPKR).toLocaleString("en-PK")}`;
  }
  if (cfg.code === "INR") {
    return `₹${Math.round(amountPKR * cfg.rate).toLocaleString("en-IN")}`;
  }
  const converted = amountPKR * cfg.rate;
  const codeStyle = ["AED", "SAR", "CHF", "SGD", "NZD", "HKD"].includes(
    cfg.code,
  );
  const formatted = converted.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return codeStyle ? `${cfg.symbol} ${formatted}` : `${cfg.symbol}${formatted}`;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function saveDeliveredCustomer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  email: string,
  orderNumber: string,
): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from("delivered_customers")
      .upsert(
        {
          email: email.trim().toLowerCase(),
          order_number: orderNumber,
          delivered_at: new Date().toISOString(),
        },
        { onConflict: "email,order_number" },
      );

    if (error) {
      console.error("❌ saveDeliveredCustomer DB error:", error.message);
    } else {
      console.log(
        `✅ Delivered customer saved: ${email} | order ${orderNumber}`,
      );
    }
  } catch (err: any) {
    console.error("❌ saveDeliveredCustomer exception:", err?.message || err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderId,
      status,
      customerEmail,
      customerPhone,
      customerName,
      orderNumber,
      courierName,
      courierCountry,
      estimatedDays,
      trackingNumber,
      courierTrackingUrl,
      shippingAddress,
      paymentMethod,
      items: itemsDirect,
      orderItems,
      totalAmount,
      customerCountry,
      cancelReason,
    } = body;

    const items = itemsDirect || orderItems || [];

    if (
      !orderId ||
      !status ||
      !customerEmail ||
      !customerName ||
      !orderNumber
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const validStatuses = ["shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    const country = customerCountry || "Pakistan";

    // ✅ Live rates fetched ONCE for the whole request
    const currencyCfg = await getCurrencyForCountry(country);
    const totalAmountNum = totalAmount || 0;
    const formattedTotal = formatAmount(totalAmountNum, currencyCfg);

    console.log(
      `🌍 [${orderNumber}] ${status.toUpperCase()} | Country: ${country} | Currency: ${currencyCfg.code} (live rate: ${currencyCfg.rate}) | Total: ${formattedTotal}`,
    );

    const supabase = getClient();
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "shipped") {
      if (courierName) updatePayload.courier_name = courierName;
      if (courierCountry) updatePayload.courier_country = courierCountry;
      if (estimatedDays) updatePayload.estimated_days = estimatedDays;
      if (trackingNumber) updatePayload.tracking_number = trackingNumber;
      if (courierTrackingUrl)
        updatePayload.courier_tracking_url = courierTrackingUrl;
      updatePayload.shipped_at = new Date().toISOString();
    }

    const { error: dbError } = await (supabase as any)
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (dbError) {
      console.error("❌ DB error:", dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    if (status === "delivered" && customerEmail) {
      await saveDeliveredCustomer(supabase, customerEmail, orderNumber);
    }

    // ✅ formattedItems use live-rate formatAmount
    const formattedItems = items.map((item: any) => ({
      name: item.product_name || item.name || "Product",
      variant: item.variant_name || null,
      quantity: item.quantity,
      price: item.price,
      piecesPerUnit: item.pieces_per_unit || 1,
      formattedPrice: formatAmount(
        (item.price || 0) * (item.pieces_per_unit || 1) * (item.quantity || 1),
        currencyCfg,
      ),
      pricePKR: (item.price || 0) * (item.pieces_per_unit || 1),
      variant_image: item.variant_image || null,
      image: item.image || null,
      product_image: item.product_image || null,
    }));

    const waItems = items.map((item: any) => ({
      name: item.product_name || item.name || "Product",
      variant: item.variant_name || null,
      quantity: item.quantity,
      price: item.price,
      piecesPerUnit: item.pieces_per_unit || 1,
      variant_image: item.variant_image || null,
      image: item.image || null,
      product_image: item.product_image || null,
    }));

    let customerEmailSent = false;
    let ownerEmailSent = false;
    let whatsappSent = false;

    if (status === "shipped") {
      const cn = courierName || "Courier";
      const tn = trackingNumber || "N/A";
      const ed = estimatedDays || "3-5 business days";

      const [emailResult, ownerResult, waResult] = await Promise.all([
        sendStatusUpdateEmail(
          customerEmail,
          customerName,
          orderNumber,
          "shipped",
          tn,
          cn,
          courierTrackingUrl,
          ed,
          items,
          formattedItems,
          formattedTotal,
          country,
        ),
        sendOwnerStatusAlert(
          orderNumber,
          customerName,
          customerEmail,
          customerPhone || "",
          "shipped",
          `${cn} | Tracking: ${tn} | Est: ${ed}`,
        ),
        customerPhone
          ? sendShippedWhatsApp(
              customerPhone,
              customerName,
              orderNumber,
              cn,
              tn,
              ed,
              courierTrackingUrl,
              waItems,
              totalAmountNum,
              country,
            )
          : Promise.resolve(false),
      ]);

      customerEmailSent = emailResult;
      ownerEmailSent = ownerResult;
      whatsappSent = waResult;
    } else if (status === "delivered") {
      const [emailResult, ownerResult, waResult] = await Promise.all([
        sendStatusUpdateEmail(
          customerEmail,
          customerName,
          orderNumber,
          "delivered",
          undefined,
          undefined,
          undefined,
          undefined,
          items,
          formattedItems,
          formattedTotal,
          country,
        ),
        sendOwnerStatusAlert(
          orderNumber,
          customerName,
          customerEmail,
          customerPhone || "",
          "delivered",
        ),
        customerPhone
          ? sendDeliveredWhatsApp(
              customerPhone,
              customerName,
              orderNumber,
              waItems,
              totalAmountNum,
              country,
            )
          : Promise.resolve(false),
      ]);

      customerEmailSent = emailResult;
      ownerEmailSent = ownerResult;
      whatsappSent = waResult;
    } else if (status === "cancelled") {
      const [emailResult, ownerResult, waResult] = await Promise.all([
        sendStatusUpdateEmail(
          customerEmail,
          customerName,
          orderNumber,
          "cancelled",
          undefined,
          undefined,
          undefined,
          undefined,
          items,
          formattedItems,
          formattedTotal,
          country,
          cancelReason,
        ),
        sendOwnerStatusAlert(
          orderNumber,
          customerName,
          customerEmail,
          customerPhone || "",
          "cancelled",
          cancelReason ? `Reason: ${cancelReason}` : undefined,
        ),
        customerPhone
          ? sendCancelledWhatsApp(
              customerPhone,
              customerName,
              orderNumber,
              cancelReason,
              waItems,
              totalAmountNum,
              country,
            )
          : Promise.resolve(false),
      ]);

      customerEmailSent = emailResult;
      ownerEmailSent = ownerResult;
      whatsappSent = waResult;
    }

    console.log(`📊 [${orderNumber}] ${status.toUpperCase()} results:`, {
      whatsapp: whatsappSent ? "✅" : "❌",
      customerEmail: customerEmailSent ? "✅" : "❌",
      ownerEmail: ownerEmailSent ? "✅" : "❌",
      country,
      currency: currencyCfg.code,
      liveRate: currencyCfg.rate,
      total: formattedTotal,
      itemsCount: items.length,
      hasImages: waItems.some(
        (i: any) => i.variant_image || i.image || i.product_image,
      ),
      couponEligibilitySaved: status === "delivered" ? "✅" : "n/a",
    });

    return NextResponse.json({
      success: true,
      status,
      whatsappSent,
      emailSent: customerEmailSent,
      ownerEmailSent,
    });
  } catch (err: any) {
    console.error("❌ update-order-status crash:", err?.message || err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
