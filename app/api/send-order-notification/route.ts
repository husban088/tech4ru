// app/api/send-order-notification/route.ts
// ✅ LIVE RATES: fetchLiveRates from currency.ts — no hardcoded rates
// ✅ FIXED: amountsPreConverted flag — no double conversion
// ✅ FIXED: formattedItems passed to WhatsApp — no double conversion in item prices
// ✅ AED/SAR plain text symbols — no Arabic chars
// ✅ Currency code-based lookup (not just country name)

import { NextRequest, NextResponse } from "next/server";
import {
  sendOrderConfirmationEmail,
  sendOwnerOrderAlert,
} from "@/lib/email-smtp";
import { sendConfirmedWhatsApp } from "@/lib/whatsapp";
import {
  fetchLiveRates,
  getCurrencyByCountry,
  currencies as staticCurrencies,
} from "@/lib/currency";

// ── Country name → 2-letter code (for getCurrencyByCountry) ──────────────────
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
  Europe: "DE",
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

// ── Server-side live rate cache ───────────────────────────────────────────────
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

// ── Get currency config with LIVE rate ───────────────────────────────────────
async function getCurrencyConfig(currencyCode?: string, country?: string) {
  const rates = await getLiveRates();

  // Priority 1: explicit currency code passed
  if (currencyCode) {
    const upper = currencyCode.toUpperCase();
    const staticCurr = staticCurrencies.find((c) => c.code === upper);
    if (staticCurr) {
      const liveRate = rates?.[upper];
      return {
        code: upper,
        symbol: staticCurr.symbol,
        rate: liveRate && liveRate > 0 ? liveRate : staticCurr.rate,
      };
    }
  }

  // Priority 2: detect from country name
  const countryCode = (country && COUNTRY_NAME_TO_CODE[country]) || "PK";
  const staticCurr = getCurrencyByCountry(countryCode);
  const liveRate = rates?.[staticCurr.code];
  return {
    code: staticCurr.code,
    symbol: staticCurr.symbol,
    rate: liveRate && liveRate > 0 ? liveRate : staticCurr.rate,
  };
}

// ── Format amount ─────────────────────────────────────────────────────────────
// amountsPreConverted=true  → amount is already in target currency, just format
// amountsPreConverted=false → amount is PKR, convert first
function formatAmount(
  amount: number,
  cfg: { symbol: string; rate: number; code: string },
  alreadyConverted: boolean,
): string {
  const finalAmount = alreadyConverted ? amount : amount * cfg.rate;

  if (cfg.code === "PKR") {
    return `Rs. ${Math.round(finalAmount).toLocaleString("en-PK")}`;
  }
  if (cfg.code === "INR") {
    return `₹${Math.round(finalAmount).toLocaleString("en-IN")}`;
  }
  if (cfg.code === "JPY" || cfg.code === "KRW") {
    return `${cfg.symbol}${Math.round(finalAmount).toLocaleString()}`;
  }
  const formatted = finalAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const codeStyle = ["AED", "SAR", "CHF", "SGD", "NZD", "HKD"].includes(
    cfg.code,
  );
  return codeStyle ? `${cfg.symbol} ${formatted}` : `${cfg.symbol}${formatted}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderNumber,
      email,
      phone,
      name,
      items,
      subtotal,
      shipping,
      total,
      shippingAddress,
      paymentMethod,
      currency,
      customerCountry,
      amountsPreConverted,
    } = body;

    if (!orderNumber || !email || !name || !items?.length) {
      console.error("Missing required fields:", {
        orderNumber: !!orderNumber,
        email: !!email,
        name: !!name,
        itemsCount: items?.length ?? 0,
      });
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const country = customerCountry || "Pakistan";
    const alreadyConverted = amountsPreConverted === true;

    // ✅ Live rates fetched here — one call for the whole request
    const currencyCfg = await getCurrencyConfig(currency, country);

    const totalAmountNum = total ?? 0;
    const formattedTotal = formatAmount(
      totalAmountNum,
      currencyCfg,
      alreadyConverted,
    );
    const customerPhone = phone || "";

    console.log(
      `[${orderNumber}] Country: "${country}" | Currency: ${currencyCfg.code} (live rate: ${currencyCfg.rate}) | PreConverted: ${alreadyConverted}`,
    );
    console.log(`Total: ${totalAmountNum} → ${formattedTotal}`);

    // ── formattedItems for email + WhatsApp ──────────────────────────────────
    // ✅ FIX: formattedItems are used by BOTH email and WhatsApp
    // This prevents double-conversion in whatsapp.ts item price calculation
    const formattedItems = items.map((item: any) => {
      const ppu = item.piecesPerUnit ?? item.pieces_per_unit ?? 1;
      const perUnit = item.price ?? 0;
      const qty = item.quantity ?? 1;

      // ✅ If pre-converted: item.price is already in target currency per unit
      // If not pre-converted: item.price is PKR per unit (includes ppu), convert it
      const lineTotal = alreadyConverted ? perUnit * qty : perUnit * ppu * qty;

      return {
        name: item.name ?? item.product_name ?? "Product",
        variant: item.variant ?? item.variant_name ?? null,
        quantity: qty,
        formattedPrice: formatAmount(lineTotal, currencyCfg, alreadyConverted),
        pricePKR: lineTotal,
        image: item.image ?? null,
        variant_image: item.variant_image ?? null,
        product_image: item.product_image ?? null,
      };
    });

    // ── waItems for WhatsApp (image fields needed for sendImageThenText) ──────
    const waItems = items.map((item: any) => ({
      name: item.name ?? item.product_name ?? "Product",
      variant: item.variant ?? item.variant_name ?? null,
      quantity: item.quantity ?? 1,
      price: item.price ?? 0,
      piecesPerUnit: item.piecesPerUnit ?? item.pieces_per_unit ?? 1,
      variant_image: item.variant_image ?? null,
      image: item.image ?? null,
      product_image: item.product_image ?? null,
    }));

    let customerEmailSent = false;
    let ownerEmailSent = false;
    let whatsappSent = false;

    // ── 1. WhatsApp ───────────────────────────────────────────────────────────
    if (customerPhone) {
      try {
        whatsappSent = await sendConfirmedWhatsApp(
          customerPhone,
          name,
          orderNumber,
          formattedTotal,
          waItems,
          country,
          formattedItems, // ✅ pre-formatted item prices — no double conversion
        );
        console.log(
          whatsappSent
            ? `WhatsApp sent → ${customerPhone}`
            : `WhatsApp failed → ${customerPhone}`,
        );
      } catch (err: any) {
        console.error("WhatsApp error:", err?.message || err);
      }
    } else {
      console.warn("No phone — WhatsApp skipped");
    }

    // ── 2. Customer Email ─────────────────────────────────────────────────────
    try {
      customerEmailSent = await sendOrderConfirmationEmail(
        email,
        orderNumber,
        name,
        items,
        totalAmountNum,
        shippingAddress || "",
        paymentMethod || "N/A",
        currencyCfg.code,
        formattedTotal,
        formattedItems,
        country,
      );
      console.log(
        customerEmailSent
          ? `Customer email sent (${currencyCfg.code}: ${formattedTotal})`
          : "Customer email failed",
      );
    } catch (err: any) {
      console.error("Customer Email error:", err?.message || err);
    }

    // ── 3. Owner Alert ────────────────────────────────────────────────────────
    try {
      ownerEmailSent = await sendOwnerOrderAlert(
        orderNumber,
        name,
        email,
        customerPhone,
        items,
        totalAmountNum,
        shippingAddress || "",
        paymentMethod || "N/A",
        currencyCfg.code,
        formattedTotal,
        formattedItems,
        country,
      );
      console.log(ownerEmailSent ? "Owner email sent" : "Owner email failed");
    } catch (err: any) {
      console.error("Owner Email error:", err?.message || err);
    }

    console.log(`Results [${orderNumber}]:`, {
      currency: currencyCfg.code,
      liveRate: currencyCfg.rate,
      formattedTotal,
      whatsapp: whatsappSent ? "sent" : "failed",
      customerEmail: customerEmailSent ? "sent" : "failed",
      ownerEmail: ownerEmailSent ? "sent" : "failed",
    });

    return NextResponse.json({
      success: true,
      results: { emailSent: customerEmailSent, whatsappSent, ownerEmailSent },
    });
  } catch (error: any) {
    console.error("send-order-notification crash:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
