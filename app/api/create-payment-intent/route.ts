// app/api/create-payment-intent/route.ts
// ✅ All countries supported: USA, UK, Australia, UAE, Germany, Canada, India, etc.
// ✅ PKR → USD auto fallback (Stripe PKR support nahi karta)
// ✅ Zero-decimal currencies handled (JPY, KRW, etc.)
// ✅ Stripe minimum amount check per currency
// ✅ automatic_payment_methods = any card from any country works

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

// ── Supported Stripe currencies ───────────────────────────────────────────────
const SUPPORTED_CURRENCIES = new Set([
  "usd",
  "gbp",
  "aud",
  "eur",
  "cad",
  "inr",
  "aed",
  "sar",
  "sgd",
  "nzd",
  "jpy",
  "chf",
  "hkd",
  "mxn",
  "nok",
  "sek",
  "dkk",
  "pln",
  "czk",
  "huf",
  "ron",
  "thb",
  "myr",
  "php",
]);

// ── PKR (and any unsupported currency) → USD fallback ────────────────────────
const CURRENCY_FALLBACK: Record<string, string> = {
  pkr: "usd", // Pakistan → USD (Stripe PKR support nahi karta)
};

// ── Zero-decimal currencies (no cents — amount as-is) ────────────────────────
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

// ── Stripe minimum charge (in smallest unit) per currency ─────────────────────
const STRIPE_MINIMUMS: Record<string, number> = {
  usd: 50, // $0.50
  gbp: 30, // £0.30
  eur: 50, // €0.50
  aud: 50, // A$0.50
  cad: 50, // C$0.50
  aed: 200, // AED 2.00
  sar: 200, // SAR 2.00
  inr: 50, // ₹0.50
  sgd: 50, // S$0.50
  nzd: 50, // NZ$0.50
  jpy: 50, // ¥50
  chf: 50, // CHF 0.50
  hkd: 400, // HK$4.00
};

// ── Convert amount to Stripe integer units ────────────────────────────────────
function toStripeAmount(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.max(1, Math.round(amount));
  }
  return Math.round(amount * 100); // e.g. 10.00 USD → 1000 cents
}

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = "usd", metadata } = body;

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!amount || typeof amount !== "number" || amount <= 0) {
      console.error("❌ Invalid amount:", amount);
      return NextResponse.json(
        { error: "Invalid amount — must be a positive number" },
        { status: 400 },
      );
    }

    // ── Normalize + fallback ──────────────────────────────────────────────────
    const rawCurrency = currency.toLowerCase().trim();
    const finalCurrency = CURRENCY_FALLBACK[rawCurrency] ?? rawCurrency;

    const useCurrency = SUPPORTED_CURRENCIES.has(finalCurrency)
      ? finalCurrency
      : "usd"; // Unknown currency → USD silently (payment nahi rukti)

    if (!SUPPORTED_CURRENCIES.has(finalCurrency)) {
      console.warn(
        `⚠️ Unsupported currency "${finalCurrency}" — falling back to USD`,
      );
    }

    // ── Convert to Stripe integer units ───────────────────────────────────────
    const stripeAmount = toStripeAmount(amount, useCurrency);

    // ── Minimum amount check ──────────────────────────────────────────────────
    const minimum = STRIPE_MINIMUMS[useCurrency] ?? 50;
    if (stripeAmount < minimum) {
      console.error(
        `❌ Amount too small: ${stripeAmount} (min ${minimum}) for ${useCurrency}`,
      );
      return NextResponse.json(
        {
          error: `Amount too small. Minimum for ${useCurrency.toUpperCase()} is ${
            ZERO_DECIMAL_CURRENCIES.has(useCurrency)
              ? minimum
              : (minimum / 100).toFixed(2)
          }`,
        },
        { status: 400 },
      );
    }

    const stripe = getStripe();

    console.log(
      `💳 Creating PaymentIntent: ${stripeAmount} ${useCurrency.toUpperCase()} | Order: ${metadata?.orderNumber || "N/A"} | Customer: ${metadata?.customerEmail || "N/A"}`,
    );

    // ── Create Stripe PaymentIntent ───────────────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: useCurrency,

      // ✅ automatic_payment_methods: true
      // → Stripe khud decide karta hai best payment method per country
      // → Visa, Mastercard, Amex, Apple Pay, Google Pay sab kuch
      // → USA, UK, Australia, UAE, Germany — kisi bhi country ka card chale
      automatic_payment_methods: {
        enabled: true,
      },

      metadata: {
        orderNumber: metadata?.orderNumber || "",
        customerEmail: metadata?.customerEmail || "",
        customerName: metadata?.customerName || "",
        originalCurrency: metadata?.originalCurrency || "PKR",
        originalAmount: String(metadata?.originalAmount || amount),
      },
    });

    console.log(
      `✅ PaymentIntent created: ${paymentIntent.id} | ${stripeAmount} ${useCurrency.toUpperCase()}`,
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      currency: useCurrency, // frontend ko final currency pata chale
      amount: stripeAmount, // Stripe units mein
    });
  } catch (err: any) {
    console.error("❌ create-payment-intent error:", err?.message || err);

    if (err?.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err?.type === "StripeAuthenticationError") {
      console.error(
        "❌ Stripe key invalid — check STRIPE_SECRET_KEY in .env.local",
      );
      return NextResponse.json(
        { error: "Payment system configuration error" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 },
    );
  }
}
