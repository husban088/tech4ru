// app/checkout/components/PayPalPayment.tsx
"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useState } from "react";
import { useCurrency } from "@/app/context/CurrencyContext";

interface PayPalPaymentProps {
  amount: number; // Raw PKR amount
  orderNumber: string;
  formData: any;
  subtotal: number;
  shipping: number;
  total: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ PayPal LIVE supported currencies (production mein sab kaam karta hai)
// ✅ PayPal SANDBOX limited hai — AED/SAR/INR sandbox mein UNPROCESSABLE_ENTITY deta hai
//    Isliye sandbox mein AED → USD fallback lagao
//    Production pe yeh fallback hatao (SANDBOX_CURRENCIES_ONLY set ko empty karo)
// ─────────────────────────────────────────────────────────────────────────────
const IS_SANDBOX =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.startsWith("AY") || // sandbox IDs start with AY
  process.env.NODE_ENV === "development";

// Currencies that fail in PayPal sandbox — production mein yeh theek kaam karte hain
const SANDBOX_UNSUPPORTED: Set<string> = new Set([
  "AED",
  "SAR",
  "INR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
]);

// ✅ All PayPal live-supported currencies
const PAYPAL_LIVE_SUPPORTED: Set<string> = new Set([
  "USD",
  "GBP",
  "AUD",
  "EUR",
  "CAD",
  "AED",
  "SAR",
  "INR",
  "NZD",
  "SGD",
  "JPY",
  "CNY",
  "BRL",
  "MXN",
  "SEK",
  "NOK",
  "DKK",
  "CHF",
  "HKD",
  "TWD",
  "THB",
  "MYR",
  "PHP",
  "IDR",
  "ZAR",
  "PLN",
  "CZK",
  "HUF",
  "ILS",
  "KRW",
  "NGN",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
]);

// ✅ FALLBACK rates only — used when CurrencyContext live rate is unavailable
// Primary source: detectedCurrency.rate from CurrencyContext (live, auto-updated from /api/live-rates)
// These fire ONLY if currency.rate is 0 or currency not detected yet
const PKR_FALLBACK_RATES: Record<string, number> = {
  USD: 0.003584,
  GBP: 0.002639,
  AUD: 0.005,
  EUR: 0.003049,
  CAD: 0.004878,
  AED: 0.013082,
  SAR: 0.013357,
  INR: 0.298507,
  NZD: 0.00594,
  SGD: 0.00484,
  JPY: 0.54,
  CNY: 0.02612,
  BRL: 0.01874,
  MXN: 0.0612,
  SEK: 0.0372,
  NOK: 0.0382,
  DKK: 0.02476,
  CHF: 0.00316,
  HKD: 0.0281,
  ZAR: 0.0652,
  QAR: 0.01311,
  KWD: 0.0011,
  PKR: 1.0,
};

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  PKR: "PK",
  USD: "US",
  GBP: "GB",
  AUD: "AU",
  EUR: "DE",
  CAD: "CA",
  AED: "AE",
  SAR: "SA",
  INR: "IN",
  NZD: "NZ",
  SGD: "SG",
  JPY: "JP",
  CNY: "CN",
  BRL: "BR",
  MXN: "MX",
  SEK: "SE",
  NOK: "NO",
  DKK: "DK",
  CHF: "CH",
};

// ✅ Zero-decimal currencies (no cents)
const ZERO_DECIMAL_CURRENCIES: Set<string> = new Set([
  "JPY",
  "KRW",
  "IDR",
  "TWD",
]);

// ✅ Code-style currencies: show "AED 366.47" not "$366.47 AED"
const CODE_STYLE_CURRENCIES: Set<string> = new Set([
  "AED",
  "SAR",
  "CHF",
  "SGD",
  "NZD",
  "HKD",
  "ZAR",
  "QAR",
  "KWD",
  "PKR",
  "SEK",
  "NOK",
  "DKK",
  "BHD",
  "OMR",
]);

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs",
  USD: "$",
  GBP: "£",
  AUD: "A$",
  EUR: "€",
  CAD: "C$",
  INR: "₹",
  AED: "AED",
  SAR: "SAR",
  NZD: "NZ$",
  SGD: "S$",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  MXN: "MX$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  CHF: "CHF",
  HKD: "HK$",
  ZAR: "R",
  QAR: "QR",
  KWD: "KD",
};

// ─────────────────────────────────────────────────────────────────────────────
// getPayPalCurrency — resolve karo kaunsi currency PayPal ko bhejna hai
// Sandbox mein AED/SAR/INR etc fail hote hain → USD fallback
// Production mein direct AED/SAR chalega
// ─────────────────────────────────────────────────────────────────────────────
function getPayPalCurrency(userCode: string): {
  paypalCurrency: string; // PayPal ko bhejo yeh
  displayCurrency: string; // User ko dikhao yeh (hamesha original)
  isFallback: boolean; // sandbox fallback laga?
} {
  const upper = (userCode || "USD").toUpperCase();

  if (!PAYPAL_LIVE_SUPPORTED.has(upper)) {
    return { paypalCurrency: "USD", displayCurrency: upper, isFallback: true };
  }

  // Sandbox mein AED/SAR etc → USD fallback
  if (IS_SANDBOX && SANDBOX_UNSUPPORTED.has(upper)) {
    return { paypalCurrency: "USD", displayCurrency: upper, isFallback: true };
  }

  return { paypalCurrency: upper, displayCurrency: upper, isFallback: false };
}

// ✅ Format display amount cleanly — no duplicate symbol/code
function formatDisplayAmount(amount: number, currency: string): string {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
  const formatted = isZeroDecimal ? amount.toLocaleString() : amount.toFixed(2);

  if (CODE_STYLE_CURRENCIES.has(currency)) {
    return `${currency} ${formatted}`; // "AED 366.47"
  }
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol}${formatted}`; // "$366.47"
}

export default function PayPalPayment({
  amount,
  orderNumber,
  formData,
  subtotal,
  shipping,
  total,
  onSuccess,
  onError: onPaymentError,
}: PayPalPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(
    "Processing your payment...",
  );

  const { currency: detectedCurrency, currencies: liveCurrencies } =
    useCurrency();
  const userCurrencyCode = detectedCurrency?.code || "USD";

  // ✅ KEY: Resolve PayPal currency (handles sandbox limitations)
  const { paypalCurrency, displayCurrency, isFallback } =
    getPayPalCurrency(userCurrencyCode);

  // ✅ LIVE RATE RESOLVER — CurrencyContext se live rate lo (from /api/live-rates)
  // liveCurrencies = CurrencyContext ka updated array with live rates applied
  // PKR_FALLBACK_RATES sirf tabhi fire hoga jab context abhi load nahi hua
  const getLiveRate = (targetCode: string): number => {
    const upper = targetCode.toUpperCase();
    const liveCurr = liveCurrencies.find((c) => c.code === upper);
    if (liveCurr && liveCurr.rate > 0 && liveCurr.code !== "PKR") {
      return liveCurr.rate; // ✅ Live rate from CurrencyContext (/api/live-rates)
    }
    return PKR_FALLBACK_RATES[upper] ?? PKR_FALLBACK_RATES["USD"]; // emergency fallback
  };

  // Convert PKR → display currency (for showing user the right amount)
  const displayRate = getLiveRate(displayCurrency);
  const displayAmount = parseFloat((amount * displayRate).toFixed(2));

  // Convert PKR → PayPal currency (what we actually charge)
  const paypalRate = getLiveRate(paypalCurrency);
  const rawPaypalAmount = amount * paypalRate;
  const paypalAmount = ZERO_DECIMAL_CURRENCIES.has(paypalCurrency)
    ? Math.max(1, Math.round(rawPaypalAmount))
    : Math.max(0.01, parseFloat(rawPaypalAmount.toFixed(2)));

  const countryCode = CURRENCY_TO_COUNTRY[userCurrencyCode] ?? "US";
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  console.log(
    `PayPal | User: ${userCurrencyCode} | Display: ${formatDisplayAmount(displayAmount, displayCurrency)} | Charging: ${paypalCurrency} ${paypalAmount} | Sandbox fallback: ${isFallback}`,
  );

  if (!amount || amount <= 0) {
    return (
      <div className="ps-paypal-error">
        <p>Unable to process payment. Invalid amount.</p>
      </div>
    );
  }

  if (!clientId || clientId === "your_paypal_client_id") {
    return (
      <div className="ps-paypal-error">
        <p>
          PayPal Client ID missing. Add NEXT_PUBLIC_PAYPAL_CLIENT_ID to
          .env.local
        </p>
      </div>
    );
  }

  // ── Create Order ─────────────────────────────────────────────────────────────
  const createOrder = async () => {
    setPaymentCancelled(false);
    try {
      const response = await fetch("/api/create-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paypalAmount, // ✅ Correct amount in paypalCurrency
          currency: paypalCurrency, // ✅ USD in sandbox, AED in production
          orderData: {
            orderNumber,
            description: `Order ${orderNumber} - Tech4U`,
            shippingAddress: {
              firstName: formData?.firstName || "",
              lastName: formData?.lastName || "",
              addressLine1: formData?.address || "",
              city: formData?.city || "",
              postalCode: formData?.zip || "",
              countryCode: countryCode,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("PayPal order creation failed:", data);
        throw new Error(data.error || "Failed to create PayPal order");
      }
      if (!data.orderId) throw new Error("No order ID received from PayPal");

      return data.orderId;
    } catch (error) {
      console.error("createOrder error:", error);
      onPaymentError(
        error instanceof Error ? error.message : "Failed to initialize PayPal",
      );
      throw error;
    }
  };

  // ── Capture ───────────────────────────────────────────────────────────────────
  const onApprove = async (data: any) => {
    setIsProcessing(true);
    setProcessingMessage("Payment approved! Completing your order...");

    try {
      const captureRes = await fetch("/api/capture-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.orderID,
          orderNumber,
          formData,
          subtotal: paypalAmount,
          shipping: 0,
          total: paypalAmount,
        }),
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok || !captureData.success) {
        console.error("PayPal capture failed:", captureData);
      } else {
        console.log("PayPal capture successful:", captureData.captureId);
      }
    } catch (error) {
      console.error("PayPal capture network error:", error);
    }

    try {
      sessionStorage.setItem("payment_just_completed", "true");
      sessionStorage.setItem("payment_order_number", orderNumber);
    } catch (e) {}

    onSuccess();
  };

  const handlePayPalError = (err: any) => {
    console.error("PayPal error:", err);
    setIsProcessing(false);
    onPaymentError(
      "PayPal payment failed. Please try again or use a different payment method.",
    );
  };

  const handleCancel = () => {
    setPaymentCancelled(true);
    setIsProcessing(false);
  };

  return (
    <PayPalScriptProvider
      key={`paypal-${paypalCurrency}`}
      options={{
        clientId: clientId,
        currency: paypalCurrency,
        intent: "capture",
        components: "buttons",
        locale: "en_US", // ✅ Always en_US — Arabic locales crash PayPal SDK
      }}
    >
      <div>
        {isProcessing ? (
          <div className="ps-loading">
            <div className="co-spinner" />
            <span>{processingMessage}</span>
          </div>
        ) : (
          <>
            {paymentCancelled && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 14px",
                  background: "#fff8e1",
                  border: "1px solid #f0b429",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#7c5a00",
                }}
              >
                Payment cancelled. Please try again.
              </div>
            )}

            <PayPalButtons
              fundingSource="paypal"
              key={`btn-${orderNumber}-${paypalCurrency}`}
              createOrder={createOrder}
              onApprove={onApprove}
              onError={handlePayPalError}
              onCancel={handleCancel}
              forceReRender={[paypalAmount, paypalCurrency, orderNumber]}
              style={{
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "paypal",
                height: 48,
              }}
            />

            {/* "You will be charged" — always show user's own currency */}
            <div className="ps-paypal-amount-info">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="14"
                height="14"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>
                You will be charged{" "}
                {/* ✅ Show user's actual currency (AED 366.47), even if PayPal charges USD internally in sandbox */}
                <strong>
                  {formatDisplayAmount(displayAmount, displayCurrency)}
                </strong>
              </span>
            </div>
          </>
        )}
      </div>
    </PayPalScriptProvider>
  );
}
