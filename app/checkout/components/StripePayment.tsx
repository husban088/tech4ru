// app/checkout/components/StripePayment.tsx
// ✅ Payment succeed hone pe owner ko email jati hai (stripe-payment-alert API)
// ✅ Webhook ki zaroorat nahi
// ✅ Double call prevent: successCalledRef

"use client";

import { useState, useRef } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface StripePaymentProps {
  amount: number;
  currency: string;
  orderNumber: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  formatPrice?: (pkrAmount: number) => string;
  totalAmountPKR?: number;
  // ✅ Customer info for owner email
  customerName?: string;
  customerEmail?: string;
}

export default function StripePayment({
  amount,
  currency,
  orderNumber,
  onSuccess,
  onError,
  formatPrice,
  totalAmountPKR,
  customerName = "",
  customerEmail = "",
}: StripePaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const successCalledRef = useRef(false);

  // ✅ Owner ko email bhejo — fire and forget (payment nahi rokti)
  const sendOwnerAlert = async (paymentIntentId: string) => {
    try {
      console.log("📧 Sending Stripe payment alert to owner...");
      const res = await fetch("/api/stripe-payment-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          customerName,
          customerEmail,
          amount, // float e.g. 13.75 AUD
          currency, // e.g. "aud"
          paymentIntentId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.log("✅ Owner payment alert email sent to:", data.to);
      } else {
        console.warn("⚠️ Owner alert email failed:", data.error);
      }
    } catch (err) {
      // Non-critical — don't block payment success
      console.warn("⚠️ Owner alert fetch error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;
    if (isProcessing) return;

    setIsProcessing(true);
    setPaymentError(null);

    console.log("💳 Stripe: Confirming payment for order:", orderNumber);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success?stripe_redirect=true`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("❌ Stripe payment error:", error);
        const errorMsg = error.message || "Payment failed. Please try again.";
        setPaymentError(errorMsg);
        onError(errorMsg);
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("✅ Stripe payment successful:", paymentIntent.id);

        if (!successCalledRef.current) {
          successCalledRef.current = true;

          // ✅ Owner ko email bhejo (background mein — payment nahi rokti)
          sendOwnerAlert(paymentIntent.id);

          // ✅ Customer success page pe bhejo
          onSuccess();
        }
      } else {
        console.log("🔄 Stripe: Redirecting for additional authentication...");
      }
    } catch (err: any) {
      console.error("❌ Stripe unexpected error:", err);
      const errorMsg = err.message || "Payment failed. Please try again.";
      setPaymentError(errorMsg);
      onError(errorMsg);
      setIsProcessing(false);
    }
  };

  // ✅ Currency symbol
  const getCurrencySymbol = (code: string): string => {
    const symbols: Record<string, string> = {
      usd: "$",
      gbp: "£",
      aud: "A$",
      eur: "€",
      cad: "C$",
      inr: "₹",
      aed: "د.إ",
      sar: "﷼",
    };
    return symbols[code.toLowerCase()] ?? code.toUpperCase();
  };

  const buttonLabel =
    formatPrice && totalAmountPKR !== undefined
      ? formatPrice(totalAmountPKR)
      : `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;

  return (
    <form onSubmit={handleSubmit} className="sp-stripe-form">
      <div className="sp-card-element-wrapper">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {paymentError && (
        <div className="sp-error-message">
          <span className="sp-error-icon">⚠️</span>
          <span>{paymentError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="sp-pay-button"
      >
        {isProcessing ? (
          <>
            <span className="sp-spinner" />
            Processing...
          </>
        ) : (
          <>Pay {buttonLabel}</>
        )}
      </button>
    </form>
  );
}
