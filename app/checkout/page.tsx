// app/checkout/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cartStore";
import "./checkout.css";
import { useCurrency } from "../context/CurrencyContext";

// Import components
import ShippingSection from "@/app/checkout/components/ShippingSection";
import CartSummary from "@/app/checkout/components/CartSummary";
import PaymentSection from "@/app/checkout/components/PaymentSection";

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
  state: string; // ✅ NEW: Australian state
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  apartment?: string;
  city?: string;
  zip?: string;
  state?: string; // ✅ NEW
}

// Currency code → country code mapping
const currencyToCountry: Record<string, string> = {
  PKR: "PK",
  USD: "US",
  GBP: "GB",
  EUR: "DE",
  AUD: "AU",
  CAD: "CA",
  AED: "AE",
  SAR: "SA",
  INR: "IN",
};

const currencyToPhone: Record<
  string,
  {
    code: string;
    flag: string;
    example: string;
    name: string;
    minDigits: number;
    maxDigits: number;
  }
> = {
  PKR: {
    code: "+92",
    flag: "🇵🇰",
    example: "3001234567",
    name: "Pakistan",
    minDigits: 10,
    maxDigits: 11,
  },
  USD: {
    code: "+1",
    flag: "🇺🇸",
    example: "2125551234",
    name: "United States",
    minDigits: 10,
    maxDigits: 10,
  },
  GBP: {
    code: "+44",
    flag: "🇬🇧",
    example: "7123456789",
    name: "United Kingdom",
    minDigits: 10,
    maxDigits: 11,
  },
  EUR: {
    code: "+49",
    flag: "🇪🇺",
    example: "15123456789",
    name: "Europe",
    minDigits: 9,
    maxDigits: 12,
  },
  AUD: {
    code: "+61",
    flag: "🇦🇺",
    example: "412345678",
    name: "Australia",
    minDigits: 9,
    maxDigits: 9,
  },
  CAD: {
    code: "+1",
    flag: "🇨🇦",
    example: "4165551234",
    name: "Canada",
    minDigits: 10,
    maxDigits: 10,
  },
  AED: {
    code: "+971",
    flag: "🇦🇪",
    example: "501234567",
    name: "UAE",
    minDigits: 9,
    maxDigits: 9,
  },
  SAR: {
    code: "+966",
    flag: "🇸🇦",
    example: "501234567",
    name: "Saudi Arabia",
    minDigits: 9,
    maxDigits: 9,
  },
  INR: {
    code: "+91",
    flag: "🇮🇳",
    example: "9876543210",
    name: "India",
    minDigits: 10,
    maxDigits: 10,
  },
};

// ✅ Australian state full names for display
const AUSTRALIAN_STATE_NAMES: Record<string, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
};

const STORAGE_KEY = "checkout_form_data";

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `T4U-${timestamp}-${random}`;
}

// ============================================
// MAIN CHECKOUT COMPONENT
// ============================================
export default function Checkout() {
  const router = useRouter();

  const {
    items,
    loading,
    fetchCart,
    clearCart,
    getSubtotal,
    getCartCount,
    initialized,
  } = useCartStore();

  const { formatPrice, currency } = useCurrency();

  const [isHydrated, setIsHydrated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [cartFetched, setCartFetched] = useState(false);

  const [focused, setFocused] = useState<string | null>(null);
  const [orderNumber] = useState(() => generateOrderNumber());
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ✅ Toast aur redirecting state checkout page pe nahi chahiye
  // Toast order-success page pe show hoga directly

  const [checkoutStep, setCheckoutStep] = useState<"shipping" | "payment">(
    "shipping",
  );
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");

  // ✅ Double-fire guard ref
  const successCalledRef = useRef(false);

  const phoneInfo = currencyToPhone[currency.code] || currencyToPhone["USD"];
  const detectedCountryCode = currencyToCountry[currency.code] || "US";

  // ✅ Is the customer in Australia?
  const isAustralia = currency.code === "AUD";

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    apartment: "",
    city: "",
    zip: "",
    country: detectedCountryCode,
    state: "", // ✅ NEW
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setIsHydrated(true);
    if (!initialized || items.length === 0) {
      fetchCart().then(() => {
        setCartFetched(true);
      });
    } else {
      setCartFetched(true);
    }
  }, [isMounted, initialized, items.length, fetchCart]);

  useEffect(() => {
    if (isMounted) {
      setForm((prev) => ({ ...prev, country: detectedCountryCode }));
    }
  }, [detectedCountryCode, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const savedForm = localStorage.getItem(STORAGE_KEY);
    if (savedForm) {
      try {
        setForm((prev) => ({ ...prev, ...JSON.parse(savedForm) }));
      } catch {}
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    if (form.firstName) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    }
  }, [form, isMounted]);

  const setFormField =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
      if (errors[key as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const getFieldError = (field: keyof FormData): string | undefined => {
    return touched[field] ? errors[field as keyof FormErrors] : undefined;
  };

  const validateField = (
    field: keyof FormData,
    value: string,
  ): string | undefined => {
    switch (field) {
      case "firstName":
        if (!value.trim()) return "First name is required";
        if (value.trim().length < 2) return "At least 2 characters";
        return undefined;
      case "lastName":
        if (!value.trim()) return "Last name is required";
        if (value.trim().length < 2) return "At least 2 characters";
        return undefined;
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]{2,}$/.test(value.trim()))
          return "Enter a valid email address";
        return undefined;
      case "phone": {
        if (!value.trim()) return "Phone number is required";
        const digitsOnly = value.replace(/[\s\-\(\)]/g, "");
        const { minDigits, maxDigits, example } = phoneInfo;
        if (digitsOnly.length < minDigits || digitsOnly.length > maxDigits) {
          return `Enter a valid ${phoneInfo.name} number (e.g. ${example})`;
        }
        if (!/^\d+$/.test(digitsOnly)) {
          return "Phone number must contain digits only";
        }
        return undefined;
      }
      case "address":
        if (!value.trim()) return "Address is required";
        return undefined;
      case "city":
        if (!value.trim()) return "City is required";
        return undefined;
      case "zip":
        if (!value.trim()) return "ZIP/Postcode is required";
        if (value.trim().length < 3) return "Enter a valid postcode";
        return undefined;
      // ✅ NEW: State validation — only required for Australia
      case "state":
        if (isAustralia && !value.trim()) return "Please select your state";
        return undefined;
      default:
        return undefined;
    }
  };

  const validateAll = (): boolean => {
    // ✅ Include "state" in validation fields only for Australia
    const fields: (keyof FormData)[] = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "city",
      "zip",
      ...(isAustralia ? (["state"] as (keyof FormData)[]) : []),
    ];
    const newErrors: FormErrors = {};
    let valid = true;
    fields.forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
        valid = false;
      }
    });
    setErrors(newErrors);
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return valid;
  };

  const subtotal = getSubtotal();
  const cartCount = getCartCount();
  const shipping = 0;
  const total = subtotal;
  const validItems = items;

  const fullPhone = `${phoneInfo.code}${form.phone}`;
  const customerName = `${form.firstName} ${form.lastName}`;

  // ✅ shippingAddress — state included for Australia
  const stateDisplay =
    isAustralia && form.state
      ? AUSTRALIAN_STATE_NAMES[form.state] || form.state
      : null;

  const shippingAddress = [
    form.address,
    form.apartment,
    form.city,
    stateDisplay, // ✅ State added here
    form.zip,
    phoneInfo.name,
  ]
    .filter(Boolean)
    .join(", ");

  const handleContinueToPayment = () => {
    if (!validateAll()) return;
    if (validItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setCheckoutStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================
  // ✅ MAIN FIX — handlePaymentSuccess
  // ============================================
  const handlePaymentSuccess = useCallback(() => {
    // ✅ Double-fire guard
    if (successCalledRef.current) return;
    successCalledRef.current = true;

    // ✅ STEP 1: Snapshot lo (cart clear hone se pehle)
    const snapItems = [...items];
    const snapSubtotal = getSubtotal();
    const snapCount = getCartCount();

    // ✅ STEP 2: Order items prepare karo
    const orderItems = validItems.map((item) => {
      const product = item.product ?? {
        name: item.variant_name || "Product",
        price: item.variant_price ?? 0,
      };
      const ppu = item.pieces_per_unit ?? 1;
      const pricePerPiece = item.variant_price ?? (product as any).price ?? 0;
      const pricePerUnit = pricePerPiece * ppu;
      const lineTotalPKR = pricePerUnit * item.quantity;
      const imageUrl =
        item.variant_image ||
        (product as any).main_images?.[0] ||
        (product as any).images?.[0] ||
        null;
      return {
        product_id: item.product_id,
        product_name: (product as any).name ?? item.variant_name ?? "Product",
        variant_id: item.variant_id ?? null,
        variant_name: item.variant_name ?? null,
        variant_image: item.variant_image ?? null,
        quantity: item.quantity,
        price: pricePerUnit,
        pieces_per_unit: ppu,
        name: (product as any).name,
        variant: item.variant_name || null,
        piecesPerUnit: ppu, // ✅ FIXED: actual pieces_per_unit use hoga, not hardcoded 1
        pricePKR: lineTotalPKR,
        image: imageUrl,
      };
    });

    // ✅ STEP 3: sessionStorage — order-success page ke liye data
    // ✅ state field bhi include hai — order success page pe show hogi
    try {
      sessionStorage.setItem("payment_just_completed", "true");
      sessionStorage.setItem("payment_order_number", orderNumber);
      sessionStorage.setItem(
        "order_success_data",
        JSON.stringify({
          orderNumber,
          form, // ✅ form.state included
          paymentMethod,
          snapItems,
          snapSubtotal,
          snapCount,
          phoneInfoName: phoneInfo.name,
          fullPhone,
          shippingAddress, // ✅ State already inside shippingAddress
          currencyCode: currency.code,
          // ✅ Explicit state fields for order-success page
          customerState: form.state,
          customerStateName: stateDisplay,
        }),
      );
    } catch {}

    // ✅ STEP 4: Seedha order-success page pe jao — koi overlay nahi
    // Toast wahan show hoga (order-success/page.tsx mein PaymentSuccessToast)
    router.push("/order-success");

    // ✅ STEP 6: save-order — Supabase mein state bhi save hoga
    fetch("/api/save-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_number: orderNumber,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: fullPhone,
        address: form.address,
        apartment: form.apartment || null,
        city: form.city,
        zip: form.zip,
        country: phoneInfo.name,
        state: stateDisplay || null, // ✅ NEW: Australian state Supabase mein save hoga
        subtotal,
        shipping_cost: shipping,
        total_amount: total,
        payment_method: paymentMethod,
        status: "pending",
        currency: currency.code,
        items: orderItems,
      }),
      keepalive: true,
    }).catch((err) => console.error("save-order background error:", err));

    // ✅ STEP 7: WhatsApp + Email notification
    // ✅ FIX: Pre-convert PKR amounts to user currency BEFORE sending
    // Notification route ko PKR + currency code dono bhejne se wo dobara convert karta tha
    // Ab converted amounts directly bhejo — route sirf format kare, convert na kare
    const currencyRate = currency?.rate ?? 1; // 1 PKR = X foreign units
    const convertedSubtotal = parseFloat(
      (snapSubtotal * currencyRate).toFixed(2),
    );
    const convertedShipping = parseFloat((shipping * currencyRate).toFixed(2));
    const convertedTotal = parseFloat((snapSubtotal * currencyRate).toFixed(2)); // shipping=0 so same

    fetch("/api/send-order-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber,
        email: form.email,
        phone: fullPhone,
        name: customerName,
        items: orderItems,
        subtotal: convertedSubtotal,
        shipping: convertedShipping,
        total: convertedTotal,
        shippingAddress,
        paymentMethod:
          paymentMethod === "card" ? "Credit/Debit Card (Stripe)" : "PayPal",
        currency: currency.code,
        amountsPreConverted: true,
        customerCountry:
          phoneInfo.name === "Europe" ? "Germany" : phoneInfo.name,
      }),
    }).catch((err) => console.error("notification background error:", err));

    // ✅ STEP 8: Cart clear
    clearCart().catch(() => {});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [
    items,
    getSubtotal,
    getCartCount,
    orderNumber,
    form,
    paymentMethod,
    phoneInfo.name,
    fullPhone,
    shippingAddress,
    currency.code,
    validItems,
    subtotal,
    shipping,
    total,
    customerName,
    clearCart,
    stateDisplay,
    isAustralia,
  ]);

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error);
  };

  // isRedirecting block removed — router.push handles redirect cleanly

  if (
    !isMounted ||
    !isHydrated ||
    !cartFetched ||
    (loading && items.length === 0)
  ) {
    return (
      <div className="co-root">
        <div className="co-grain" aria-hidden="true" />
        <div className="co-wrap">
          <div className="co-spinner" style={{ margin: "4rem auto" }} />
        </div>
      </div>
    );
  }

  // ============================================
  // EMPTY CART STATE
  // ============================================
  if (!loading && items.length === 0) {
    return (
      <div className="co-root">
        <div className="co-grain" aria-hidden="true" />
        <div className="co-wrap">
          <div className="co-empty-state">
            <div className="co-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <h2 className="co-empty-title">Your cart is empty</h2>
            <p className="co-empty-sub">
              Add some items to your cart before checkout.
            </p>
            <Link href="/watches" className="co-empty-btn">
              Continue Shopping →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN CHECKOUT UI
  // ============================================
  return (
    <>
      <div className="co-root">
        <div className="co-grain" aria-hidden="true" />
        <div className="co-lines" aria-hidden="true">
          {[...Array(5)].map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="co-ambient" aria-hidden="true" />
        <div className="co-corner co-corner--tl" aria-hidden="true" />
        <div className="co-corner co-corner--tr" aria-hidden="true" />

        <div className="co-wrap">
          {/* Header */}
          <div className="co-header">
            <p className="co-eyebrow">
              <span className="co-ey-line" />
              Secure Checkout
              <span className="co-ey-line" />
            </p>
            <h1 className="co-title">
              Complete <em>Your Order</em>
            </h1>

            {/* Step Indicator */}
            <div className="co-steps">
              <div
                className={`co-step ${
                  checkoutStep === "shipping"
                    ? "co-step--active"
                    : "co-step--done"
                }`}
              >
                <div className="co-step-circle">
                  {checkoutStep === "payment" ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      width="14"
                      height="14"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    "1"
                  )}
                </div>
                <span>Shipping</span>
              </div>
              <div className="co-step-line" />
              <div
                className={`co-step ${
                  checkoutStep === "payment" ? "co-step--active" : ""
                }`}
              >
                <div className="co-step-circle">2</div>
                <span>Payment</span>
              </div>
            </div>
          </div>

          <div className="co-layout">
            <div className="co-form-col">
              {/* STEP 1: SHIPPING */}
              {checkoutStep === "shipping" && (
                <>
                  <ShippingSection
                    form={form}
                    setFormField={setFormField}
                    getFieldError={getFieldError}
                    handleBlur={handleBlur}
                    focused={focused}
                    setFocused={setFocused}
                    selectedFlag={phoneInfo.flag}
                    selectedCountryCode={phoneInfo.code}
                    phoneExample={phoneInfo.example}
                    selectedCountry={detectedCountryCode}
                    onCountryChange={(code) =>
                      setForm((f) => ({ ...f, country: code, phone: "" }))
                    }
                  />

                  <div className="co-nav-btns">
                    <Link href="/cart" className="co-back-btn">
                      ← Cart
                    </Link>
                    <button
                      className="co-next-btn co-continue-btn"
                      onClick={handleContinueToPayment}
                    >
                      Continue to Payment →
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: PAYMENT */}
              {checkoutStep === "payment" && (
                <>
                  <button
                    className="co-back-step-btn"
                    onClick={() => setCheckoutStep("shipping")}
                  >
                    ← Back to Shipping
                  </button>

                  <PaymentSection
                    totalAmount={total}
                    orderNumber={orderNumber}
                    formData={{
                      firstName: form.firstName,
                      lastName: form.lastName,
                      email: form.email,
                      phone: form.phone,
                      address: form.address,
                      apartment: form.apartment,
                      city: form.city,
                      zip: form.zip,
                    }}
                    subtotal={subtotal}
                    shipping={shipping}
                    total={total}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                    onPaymentMethodChange={setPaymentMethod}
                  />
                </>
              )}
            </div>

            {/* Cart Summary Sidebar */}
            <div className="co-summary-col">
              <CartSummary
                items={validItems}
                subtotal={subtotal}
                shipping={shipping}
                total={total}
                cartCount={cartCount}
                formatPrice={formatPrice}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
