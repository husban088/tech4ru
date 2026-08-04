"use client";

import React, { useState, useEffect, useRef } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import StripePayment from "./StripePayment";
import PayPalPayment from "./PayPalPayment";
import ReceiptPaymentMethod from "@/app/components/ReceiptPaymentMethod";
import "./PaymentSection.css";
import { useCurrency } from "@/app/context/CurrencyContext";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  zip: string;
  country: string;
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

export type PaymentMethodKey = "card" | "paypal" | "cod" | "bank" | "jazzcash";

interface PaymentSectionProps {
  form?: {
    cardNumber: string;
    cardName: string;
    expiry: string;
    cvv: string;
  };
  setFormField?: (
    key: keyof FormData,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  getFieldError?: (field: keyof FormData) => string | undefined;
  handleBlur?: (field: keyof FormData) => void;
  focused?: string | null;
  setFocused?: (field: string | null) => void;
  totalAmount: number;
  orderNumber: string;
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    zip: string;
  };
  subtotal: number;
  shipping: number;
  total: number;
  onPaymentSuccess: (meta?: { receiptUrl?: string }) => void;
  onPaymentError: (error: string) => void;
  onPaymentMethodChange?: (method: PaymentMethodKey) => void;
}

// ── Currencies Stripe supports (lowercase) ────────────────────────────────────
const STRIPE_SUPPORTED = new Set([
  "usd",
  "gbp",
  "aud",
  "eur",
  "cad",
  "aed",
  "sar",
  "inr",
  "sgd",
  "nzd",
  "jpy",
  "chf",
]);

function getStripeReady(
  detectedCode: string,
  liveRate: number,
): {
  stripeCurrency: string;
  pkrRate: number;
} {
  const upper = (detectedCode || "USD").toUpperCase();
  const targetUpper = upper === "PKR" ? "USD" : upper;
  const stripeCurrency = targetUpper.toLowerCase();

  if (!STRIPE_SUPPORTED.has(stripeCurrency)) {
    return {
      stripeCurrency: "usd",
      pkrRate: liveRate > 0 && liveRate !== 1 ? liveRate : 0.003584,
    };
  }

  const pkrRate =
    upper === "PKR" || liveRate <= 0 || liveRate === 1 ? 0.003584 : liveRate;

  return { stripeCurrency, pkrRate };
}

function convertPKRtoFloat(pkrAmount: number, pkrRate: number): number {
  const raw = pkrAmount * pkrRate;
  return Math.max(0.5, parseFloat(raw.toFixed(2)));
}

// ── Icons for the accordion headers ───────────────────────────────────────────
const CardIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 8h20" />
    <circle cx="7" cy="16" r="1" />
    <circle cx="17" cy="16" r="1" />
  </svg>
);

const PayPalIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M7 8h10M7 12h6M7 16h4" />
    <rect x="3" y="4" width="18" height="16" rx="2" />
  </svg>
);

const CashIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 6v0M18 18v0" />
  </svg>
);

const BankIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M3 10l9-6 9 6" />
    <path d="M4 10v9h16v-9" />
    <path d="M9 21v-6h6v6" />
    <path d="M2 21h20" />
  </svg>
);

const JazzCashIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M3 10h18" />
    <circle cx="7.5" cy="15" r="1" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function PaymentSection({
  totalAmount,
  orderNumber,
  formData,
  subtotal,
  shipping,
  total,
  onPaymentSuccess,
  onPaymentError,
  onPaymentMethodChange,
  form = { cardNumber: "", cardName: "", expiry: "", cvv: "" },
  setFormField = () => () => {},
  getFieldError = () => undefined,
  handleBlur = () => {},
  focused = null,
  setFocused = () => {},
}: PaymentSectionProps) {
  const [activeMethod, setActiveMethod] = useState<PaymentMethodKey>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);
  const [isPlacingManualOrder, setIsPlacingManualOrder] = useState(false);

  const successCalledRef = useRef(false);

  const { formatPrice, currency: detectedCurrency } = useCurrency();

  // ✅ Manual-payment methods (COD / Bank Transfer / JazzCash) only make sense
  // for local Pakistani orders, so they only appear when the storefront has
  // detected the visitor is browsing in PKR.
  const isPakistan = (detectedCurrency?.code || "").toUpperCase() === "PKR";

  const liveRate = detectedCurrency?.rate ?? 0.003584;

  const { stripeCurrency, pkrRate } = getStripeReady(
    detectedCurrency?.code || "USD",
    liveRate,
  );

  const convertedTotal = convertPKRtoFloat(totalAmount, pkrRate);

  const handleMethodChange = (method: PaymentMethodKey) => {
    setActiveMethod((prev) => (prev === method ? prev : method));
    if (onPaymentMethodChange) onPaymentMethodChange(method);
  };

  // ✅ Create Stripe PaymentIntent when card selected
  useEffect(() => {
    if (activeMethod === "card" && convertedTotal > 0 && !clientSecret) {
      const createPaymentIntent = async () => {
        setIsLoadingStripe(true);
        try {
          const response = await fetch("/api/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: convertedTotal,
              currency: stripeCurrency,
              metadata: {
                orderNumber,
                customerEmail: formData?.email || "",
                customerName: formData
                  ? `${formData.firstName} ${formData.lastName}`.trim()
                  : "",
                originalCurrency: "PKR",
                originalAmount: totalAmount,
              },
            }),
          });

          const data = await response.json();

          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            console.error("❌ PaymentIntent failed:", data.error);
            onPaymentError(data.error || "Failed to initialize payment");
          }
        } catch (error) {
          console.error("❌ create-payment-intent network error:", error);
          onPaymentError(
            "Failed to initialize payment. Please refresh and try again.",
          );
        } finally {
          setIsLoadingStripe(false);
        }
      };

      createPaymentIntent();
    }
  }, [
    activeMethod,
    convertedTotal,
    stripeCurrency,
    orderNumber,
    formData?.email,
    formData?.firstName,
    formData?.lastName,
    clientSecret,
    onPaymentError,
  ]);

  const handlePaymentSuccess = (meta?: { receiptUrl?: string }) => {
    if (successCalledRef.current) return;
    successCalledRef.current = true;
    onPaymentSuccess(meta);
  };

  const handleCodPlaceOrder = () => {
    setIsPlacingManualOrder(true);
    handlePaymentSuccess();
  };

  const handleManualPlaceOrder = (receiptUrl: string) => {
    setIsPlacingManualOrder(true);
    handlePaymentSuccess({ receiptUrl });
  };

  const appearance = {
    theme: "flat" as const,
    variables: {
      colorPrimary: "#daa520",
      colorBackground: "#ffffff",
      colorText: "#1a1a1a",
      borderRadius: "12px",
    },
  };

  const methods: {
    key: PaymentMethodKey;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "card",
      label: "Credit / Debit Card",
      sublabel: "Visa, Mastercard & more",
      icon: <CardIcon />,
    },
    {
      key: "paypal",
      label: "PayPal",
      sublabel: "Pay securely with PayPal",
      icon: <PayPalIcon />,
    },
    ...(isPakistan
      ? ([
          {
            key: "cod",
            label: "Cash on Delivery",
            sublabel: "Pay when your order arrives",
            icon: <CashIcon />,
          },
          {
            key: "bank",
            label: "Bank Transfer",
            sublabel: "UBL Bank direct transfer",
            icon: <BankIcon />,
          },
          {
            key: "jazzcash",
            label: "JazzCash",
            sublabel: "Pay via JazzCash account",
            icon: <JazzCashIcon />,
          },
        ] as const)
      : []),
  ];

  const displayTotalPKR = `Rs ${totalAmount.toLocaleString("en-PK")}`;

  return (
    <div className="ps-payment-section">
      <h2 className="ps-section-title">
        <em>02.</em> Payment Details
      </h2>

      {/* Accordion method selector */}
      <div className="ps-accordion">
        {methods.map((m) => {
          const isOpen = activeMethod === m.key;
          return (
            <div
              key={m.key}
              className={`ps-accordion-item ${isOpen ? "ps-accordion-item--open" : ""}`}
            >
              <button
                type="button"
                className="ps-accordion-header"
                onClick={() => handleMethodChange(m.key)}
                aria-expanded={isOpen}
              >
                <span className="ps-accordion-header-left">
                  <span className="ps-accordion-icon">{m.icon}</span>
                  <span className="ps-accordion-text">
                    <span className="ps-accordion-label">{m.label}</span>
                    <span className="ps-accordion-sublabel">{m.sublabel}</span>
                  </span>
                </span>
                <span className="ps-accordion-chevron">
                  <ChevronIcon />
                </span>
              </button>

              <div className="ps-accordion-panel">
                <div className="ps-accordion-panel-inner">
                  {m.key === "card" && isOpen && (
                    <div className="ps-stripe-container">
                      {clientSecret ? (
                        <Elements
                          stripe={stripePromise}
                          options={{ clientSecret, appearance }}
                        >
                          <StripePayment
                            amount={convertedTotal}
                            currency={stripeCurrency}
                            orderNumber={orderNumber}
                            onSuccess={() => handlePaymentSuccess()}
                            onError={onPaymentError}
                            formatPrice={formatPrice}
                            totalAmountPKR={totalAmount}
                            customerName={
                              formData
                                ? `${formData.firstName} ${formData.lastName}`.trim()
                                : ""
                            }
                            customerEmail={formData?.email || ""}
                          />
                        </Elements>
                      ) : (
                        <div className="ps-loading">
                          <div className="co-spinner" />
                          <span>
                            {isLoadingStripe
                              ? "Initializing secure payment..."
                              : "Loading payment form..."}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {m.key === "paypal" && isOpen && (
                    <div className="ps-paypal-container">
                      <PayPalPayment
                        amount={totalAmount}
                        orderNumber={orderNumber}
                        formData={formData}
                        subtotal={subtotal}
                        shipping={shipping}
                        total={total}
                        onSuccess={() => handlePaymentSuccess()}
                        onError={onPaymentError}
                      />
                    </div>
                  )}

                  {m.key === "cod" && isOpen && (
                    <div className="ps-cod-container">
                      <div className="ps-manual-card">
                        <div className="ps-manual-card-header">
                          <span className="ps-manual-badge">
                            Cash on Delivery
                          </span>
                          <span className="ps-manual-amount">
                            {displayTotalPKR}
                          </span>
                        </div>
                        <p className="ps-manual-instructions">
                          Order deliver hone par cash mein payment karein.
                          Hamari delivery team aapke diye gaye address par order
                          pohcha degi — us waqt cash payment kar dein.
                        </p>
                        <div className="ps-cod-note">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4M12 16h.01" />
                          </svg>
                          <span>
                            Please keep exact change ready if possible.
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="ps-manual-place-btn"
                        onClick={handleCodPlaceOrder}
                        disabled={isPlacingManualOrder}
                      >
                        {isPlacingManualOrder ? (
                          <span
                            className="co-spinner"
                            style={{ width: 16, height: 16 }}
                          />
                        ) : (
                          "Place Order — Cash on Delivery"
                        )}
                      </button>
                    </div>
                  )}

                  {m.key === "bank" && isOpen && (
                    <ReceiptPaymentMethod
                      method="bank"
                      orderNumber={orderNumber}
                      displayTotal={displayTotalPKR}
                      onPlaceOrder={handleManualPlaceOrder}
                      onError={onPaymentError}
                    />
                  )}

                  {m.key === "jazzcash" && isOpen && (
                    <ReceiptPaymentMethod
                      method="jazzcash"
                      orderNumber={orderNumber}
                      displayTotal={displayTotalPKR}
                      onPlaceOrder={handleManualPlaceOrder}
                      onError={onPaymentError}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ps-secure-note">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          width="16"
          height="16"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span>SSL secured checkout • Your information is always encrypted</span>
      </div>
    </div>
  );
}
