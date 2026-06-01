// app/cart/page.tsx - WITH COUPON CODE SYSTEM + SPINNER LOADER
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/cartStore";
import { useCouponStore } from "@/lib/couponStore";
import "./cart.css";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "@/lib/supabase";

/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const cartPageTranslations = {
  yourSelection: { en: "Your Selection", ar: "اختيارك", de: "Ihre Auswahl" },
  yourCart: { en: "Your Cart", ar: "سلة التسوق", de: "Ihr Warenkorb" },
  item: { en: "Item", ar: "عنصر", de: "Artikel" },
  items: { en: "Items", ar: "عناصر", de: "Artikel" },
  itemsInCart: { en: "in Cart", ar: "في السلة", de: "im Warenkorb" },
  freeShipping: {
    en: "Free Shipping",
    ar: "شحن مجاني",
    de: "Kostenloser Versand",
  },
  loadingCart: {
    en: "Loading your cart...",
    ar: "جاري تحميل سلة التسوق...",
    de: "Ihr Warenkorb wird geladen...",
  },
  emptyTitle: {
    en: "Your cart is empty",
    ar: "سلة التسوق فارغة",
    de: "Ihr Warenkorb ist leer",
  },
  emptySub: {
    en: "Explore our luxury collections to begin.",
    ar: "استكشف مجموعاتنا الفاخرة لتبدأ.",
    de: "Entdecken Sie unsere Luxus-Kollektionen, um zu beginnen.",
  },
  discoverCollections: {
    en: "Discover Collections",
    ar: "استكشف المجموعات",
    de: "Kollektionen entdecken",
  },
  continueShopping: {
    en: "Continue Shopping",
    ar: "مواصلة التسوق",
    de: "Weiter einkaufen",
  },
  haveCoupon: {
    en: "Have a coupon code?",
    ar: "هل لديك رمز خصم؟",
    de: "Haben Sie einen Gutscheincode?",
  },
  couponPlaceholder: {
    en: "Enter coupon code",
    ar: "أدخل رمز الخصم",
    de: "Gutscheincode eingeben",
  },
  apply: { en: "Apply", ar: "تطبيق", de: "Anwenden" },
  discountPercentOff: { en: "off", ar: "خصم", de: "Rabatt" },
  orderSummary: {
    en: "Order Summary",
    ar: "ملخص الطلب",
    de: "Bestellübersicht",
  },
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي", de: "Zwischensumme" },
  discount: { en: "Discount", ar: "خصم", de: "Rabatt" },
  shipping: { en: "Shipping", ar: "الشحن", de: "Versand" },
  total: { en: "Total", ar: "الإجمالي", de: "Gesamt" },
  proceedToCheckout: {
    en: "Proceed to Checkout",
    ar: "المتابعة للدفع",
    de: "Zur Kasse gehen",
  },
  secureCheckout: { en: "Secure Checkout", ar: "دفع آمن", de: "Sichere Kasse" },
  thirtyDayReturns: {
    en: "30-Day Returns",
    ar: "إرجاع خلال 30 يومًا",
    de: "30-Tage-Rückgabe",
  },
  luxuryPackaging: {
    en: "Luxury Packaging",
    ar: "تغليف فاخر",
    de: "Luxusverpackung",
  },
  freeShippingBadge: {
    en: "Free Shipping",
    ar: "شحن مجاني",
    de: "Kostenloser Versand",
  },
  outOfStock: { en: "Out of Stock", ar: "غير متوفر", de: "Nicht auf Lager" },
  lowStock: {
    en: "Low Stock",
    ar: "مخزون محدود",
    de: "Niedriger Lagerbestand",
  },
  lowStockLeft: { en: "left", ar: "متبقي", de: "vorrätig" },
  inStock: { en: "In Stock", ar: "متوفر", de: "Auf Lager" },
  pieces: { en: "pcs", ar: "قطعة", de: "Stk" },
  pcsTotal: { en: "pcs total", ar: "قطعة إجمالي", de: "Stk insgesamt" },
  unit: { en: "unit", ar: "وحدة", de: "Einheit" },
  units: { en: "units", ar: "وحدات", de: "Einheiten" },
  perPc: { en: "/ pc", ar: "/ قطعة", de: "/ Stk" },
};

const getCartPageTranslation = (
  key: keyof typeof cartPageTranslations,
  lang: "en" | "ar" | "de",
): string => {
  return (
    cartPageTranslations[key]?.[lang] || cartPageTranslations[key]?.en || key
  );
};

export default function Cart() {
  const { language, isRTLMode } = useLanguage();
  const lang = language;

  const {
    items,
    loading,
    initialized,
    fetchCart,
    updateQuantity,
    removeFromCart,
    getSubtotal,
    getCartCount,
  } = useCartStore();
  const { formatPrice, currency, loading: currencyLoading } = useCurrency();

  const {
    appliedCode,
    discountPercent,
    discountLabel,
    applyCoupon,
    removeCoupon,
    getDiscountAmount,
    getFinalTotal,
    fetchCouponSettings,
    coupon10Enabled,
    coupon20Enabled,
    settingsLoading,
    applyingCoupon,
  } = useCouponStore();

  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [settingsRefreshed, setSettingsRefreshed] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setIsHydrated(true);
    if (!initialized || items.length === 0) {
      fetchCart();
    }
  }, [isMounted, initialized, items.length, fetchCart]);

  // ✅ Fetch coupon settings
  useEffect(() => {
    const loadSettings = async () => {
      console.log("🔄 Cart page: Fetching coupon settings...");
      await fetchCouponSettings();
      setSettingsRefreshed(true);
    };
    loadSettings();
  }, [fetchCouponSettings]);

  // ✅ Get logged-in user email
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || "");
    });
  }, []);

  const subtotalPKR = getSubtotal();
  const cartCount = getCartCount();
  const discountAmountPKR = getDiscountAmount(subtotalPKR);
  const shippingPKR = 0;
  const totalPKR = getFinalTotal(subtotalPKR) + shippingPKR;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponMessage({ text: "Please enter a coupon code.", success: false });
      return;
    }

    console.log("🔄 Applying coupon with userEmail:", userEmail);
    const result = await applyCoupon(couponInput, userEmail);
    setCouponMessage({ text: result.message, success: result.success });
    if (result.success) {
      setCouponInput("");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponMessage(null);
    setCouponInput("");
  };

  const handleCouponKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyCoupon();
    }
  };

  if (!isMounted || !isHydrated || (!initialized && loading)) {
    return (
      <div className="cart-root" dir={isRTLMode ? "rtl" : "ltr"}>
        <div className="cart-grain" aria-hidden="true" />
        <div className="cart-wrap">
          <div className="cart-empty">
            <div className="cart-spinner" />
            <p className="cart-empty-title">
              {getCartPageTranslation("loadingCart", lang)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && initialized) {
    return (
      <div className="cart-root" dir={isRTLMode ? "rtl" : "ltr"}>
        <div className="cart-grain" aria-hidden="true" />
        <div className="cart-lines" aria-hidden="true">
          {[...Array(5)].map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="cart-ambient" aria-hidden="true" />
        <div className="cart-corner cart-corner--tl" aria-hidden="true" />
        <div className="cart-corner cart-corner--tr" aria-hidden="true" />
        <div className="cart-wrap">
          <div className="cart-page-header">
            <p className="cart-eyebrow">
              <span className="cart-ey-line" />
              {getCartPageTranslation("yourSelection", lang)}
              <span className="cart-ey-line" />
            </p>
            <h1 className="cart-page-title">
              {getCartPageTranslation("yourCart", lang)}
            </h1>
          </div>
          <div className="cart-empty">
            <div className="cart-empty-icon">
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
            <h2 className="cart-empty-title">
              {getCartPageTranslation("emptyTitle", lang)}
            </h2>
            <p className="cart-empty-sub">
              {getCartPageTranslation("emptySub", lang)}
            </p>
            <Link href="/watches" className="cart-empty-cta">
              <span>{getCartPageTranslation("discoverCollections", lang)}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="14"
                height="14"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-root" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="cart-grain" aria-hidden="true" />
      <div className="cart-lines" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="cart-ambient" aria-hidden="true" />
      <div className="cart-corner cart-corner--tl" aria-hidden="true" />
      <div className="cart-corner cart-corner--tr" aria-hidden="true" />

      <div className="cart-wrap">
        <div className="cart-page-header">
          <p className="cart-eyebrow">
            <span className="cart-ey-line" />
            {getCartPageTranslation("yourSelection", lang)}
            <span className="cart-ey-line" />
          </p>
          <h1 className="cart-page-title">
            {items.length === 0 ? (
              getCartPageTranslation("yourCart", lang)
            ) : (
              <>
                <em>{cartCount}</em>{" "}
                {cartCount === 1
                  ? getCartPageTranslation("item", lang)
                  : getCartPageTranslation("items", lang)}{" "}
                {getCartPageTranslation("itemsInCart", lang)}
              </>
            )}
          </h1>
        </div>

        {items.length > 0 && (
          <div className="cart-ship-bar cart-ship-bar--done">
            <p className="cart-ship-text cart-ship-text--done">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="13"
                height="13"
              >
                <polyline
                  points="20 6 9 17 4 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {getCartPageTranslation("freeShipping", lang)}
            </p>
          </div>
        )}

        <div className="cart-layout">
          <div className="cart-items-col">
            <ul className="cart-list">
              {items.map((item, i) => {
                const product = item.product ?? {
                  id: item.product_id,
                  name: item.variant_name || "Product",
                  description: "",
                  category: "",
                  subcategory: "",
                  condition: "new",
                  is_featured: false,
                  is_active: true,
                  price: item.variant_price ?? 0,
                  original_price: item.variant_original_price ?? undefined,
                  images: item.variant_image ? [item.variant_image] : [],
                  stock: item.variantStock ?? 0,
                };

                const ppu = item.pieces_per_unit ?? 1;
                const itemPricePKR = item.variant_price ?? product.price ?? 0;
                const itemTotalPKR = itemPricePKR * ppu * item.quantity;
                const totalPieces = ppu * item.quantity;

                const displayImage =
                  item.variant_image || product.images?.[0] || null;
                const tierLabel = ppu > 1 ? ` (${ppu}-Piece)` : "";
                const variantSuffix =
                  item.variant_name && item.variant_name !== "Standard"
                    ? ` — ${item.variant_name}`
                    : "";
                const displayName = `${product.name}${tierLabel}${variantSuffix}`;

                const rawStock = item.variantStock ?? 999999;
                const stockStatus = item.variantStockStatus ?? "in_stock";
                const isOutOfStock =
                  stockStatus === "out_of_stock" || rawStock === 0;
                const isLowStock = stockStatus === "low_stock";

                const canDecrement = item.quantity >= 1 && !isOutOfStock; // qty===1 pe bhi allow — minus pe delete hoga
                const canIncrement =
                  !isOutOfStock &&
                  (rawStock >= 999999 || item.quantity * ppu < rawStock);

                const getStockLabel = () => {
                  if (isOutOfStock)
                    return getCartPageTranslation("outOfStock", lang);
                  if (isLowStock)
                    return `${getCartPageTranslation("lowStock", lang)} (${rawStock} ${getCartPageTranslation("lowStockLeft", lang)})`;
                  return getCartPageTranslation("inStock", lang);
                };

                return (
                  <li
                    key={item.id}
                    className={`cart-item${i > 0 ? " cart-item--sep" : ""}`}
                  >
                    <div className="cart-item-img-wrap">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={product.name ?? "Product"}
                          className="cart-item-img"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <div className="cart-item-img-placeholder">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.8"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="cart-item-details">
                      {product.brand && (
                        <p className="cart-item-brand">{product.brand}</p>
                      )}
                      <h3 className="cart-item-name">{displayName}</h3>
                      <p className="cart-item-variant">{product.subcategory}</p>

                      {ppu > 1 && (
                        <p
                          style={{
                            fontSize: "0.68rem",
                            color: "#888",
                            margin: "0.15rem 0",
                          }}
                        >
                          {formatPrice(itemPricePKR)} × {ppu}{" "}
                          {getCartPageTranslation("pieces", lang)} ×{" "}
                          {item.quantity}{" "}
                          {item.quantity !== 1
                            ? getCartPageTranslation("units", lang)
                            : getCartPageTranslation("unit", lang)}{" "}
                          = {totalPieces}{" "}
                          {getCartPageTranslation("pcsTotal", lang)}
                        </p>
                      )}
                      {ppu === 1 && item.quantity > 1 && (
                        <p
                          style={{
                            fontSize: "0.68rem",
                            color: "#888",
                            margin: "0.15rem 0",
                          }}
                        >
                          {formatPrice(itemPricePKR)}{" "}
                          {getCartPageTranslation("perPc", lang)}
                        </p>
                      )}

                      <p
                        className={`cart-item-stock ${isOutOfStock ? "out" : isLowStock ? "low" : "in"}`}
                      >
                        {getStockLabel()}
                      </p>

                      <div className="cart-item-row">
                        <div className="cart-qty">
                          <button
                            className={`cart-qty-btn${item.quantity === 1 ? " cart-qty-btn--delete" : ""}`}
                            onClick={async () => {
                              const newQty = item.quantity - 1;
                              if (newQty <= 0) {
                                // quantity 0 → delete karo
                                await removeFromCart(item.id);
                              } else {
                                await updateQuantity(item.id, newQty);
                              }
                            }}
                            aria-label={
                              item.quantity === 1
                                ? "Remove item"
                                : "Decrease quantity"
                            }
                            disabled={!canDecrement}
                            title={
                              item.quantity === 1 ? "Remove item" : "Decrease"
                            }
                          >
                            {item.quantity === 1 ? (
                              /* quantity===1 pe trash icon — click karo delete hoga */
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <polyline
                                  points="3 6 5 6 21 6"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M19 6l-1 14H6L5 6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M10 11v6M14 11v6"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M9 6V4h6v2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M5 12h14" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                          <span className="cart-qty-num">
                            {item.quantity}
                            {ppu > 1 && (
                              <span
                                style={{
                                  fontSize: "0.58rem",
                                  opacity: 0.65,
                                  marginLeft: 2,
                                }}
                              >
                                ×{ppu}
                              </span>
                            )}
                          </span>
                          <button
                            className="cart-qty-btn"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                            disabled={!canIncrement}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                d="M12 5v14M5 12h14"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="cart-item-price">
                          {formatPrice(itemTotalPKR)}
                        </p>
                      </div>
                    </div>

                    <button
                      className="cart-item-remove"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${product.name}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Link href="/watches" className="cart-continue-link">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="14"
                height="14"
              >
                <path
                  d="M19 12H5M12 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {getCartPageTranslation("continueShopping", lang)}
            </Link>
          </div>

          <div className="cart-summary-col">
            <div className="cart-summary-card">
              <p className="cart-summary-heading">
                <span className="cart-ey-line" />
                {getCartPageTranslation("orderSummary", lang)}
                <span className="cart-ey-line" />
              </p>

              <div className="cart-coupon-section">
                <p className="cart-coupon-label">
                  {getCartPageTranslation("haveCoupon", lang)}
                </p>

                {!appliedCode ? (
                  <div className="cart-coupon-row">
                    <input
                      type="text"
                      className="cart-coupon-input"
                      placeholder={getCartPageTranslation(
                        "couponPlaceholder",
                        lang,
                      )}
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponMessage(null);
                      }}
                      onKeyDown={handleCouponKeyDown}
                      maxLength={20}
                      disabled={applyingCoupon}
                    />
                    <button
                      className="cart-coupon-btn"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || applyingCoupon}
                    >
                      {applyingCoupon ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            className="cart-btn-spinner"
                            style={{
                              width: "14px",
                              height: "14px",
                              border: "2px solid rgba(255,255,255,0.2)",
                              borderTopColor: "#fff",
                              borderRadius: "50%",
                              animation: "spin 0.6s linear infinite",
                              display: "inline-block",
                            }}
                          ></span>
                          Applying...
                        </span>
                      ) : (
                        getCartPageTranslation("apply", lang)
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="cart-coupon-applied">
                    <div className="cart-coupon-badge">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="14"
                        height="14"
                      >
                        <polyline
                          points="20 6 9 17 4 12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>
                        <strong>{appliedCode}</strong> — {discountLabel}
                      </span>
                    </div>
                    <button
                      className="cart-coupon-remove"
                      onClick={handleRemoveCoupon}
                      aria-label="Remove coupon"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {couponMessage && (
                  <p
                    className={
                      couponMessage.success
                        ? "cart-coupon-success"
                        : "cart-coupon-error"
                    }
                  >
                    {couponMessage.text}
                  </p>
                )}
              </div>

              <div className="cart-breakdown">
                <div className="cart-breakdown-row">
                  <span>
                    {getCartPageTranslation("subtotal", lang)} ({cartCount}{" "}
                    {cartCount === 1
                      ? getCartPageTranslation("item", lang)
                      : getCartPageTranslation("items", lang)}
                    )
                  </span>
                  <span>{formatPrice(subtotalPKR)}</span>
                </div>

                {appliedCode && discountAmountPKR > 0 && (
                  <div className="cart-breakdown-row cart-breakdown-row--discount">
                    <span>
                      {getCartPageTranslation("discount", lang)} (
                      {discountPercent}%{" "}
                      {getCartPageTranslation("discountPercentOff", lang)} —{" "}
                      {appliedCode})
                    </span>
                    <span className="cart-discount-value">
                      − {formatPrice(discountAmountPKR)}
                    </span>
                  </div>
                )}

                <div className="cart-breakdown-row">
                  <span>{getCartPageTranslation("shipping", lang)}</span>
                  <span className="free-shipping-text">
                    {getCartPageTranslation("freeShipping", lang)}
                  </span>
                </div>

                <div className="cart-breakdown-divider" />

                <div className="cart-breakdown-row cart-breakdown-row--total">
                  <span>{getCartPageTranslation("total", lang)}</span>
                  <span>{formatPrice(totalPKR)}</span>
                </div>
              </div>

              <Link href="/checkout" className="cart-checkout-btn">
                <span>{getCartPageTranslation("proceedToCheckout", lang)}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="14"
                  height="14"
                >
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <div className="cart-trust">
                {[
                  { icon: "🔒", labelKey: "secureCheckout" },
                  { icon: "↩", labelKey: "thirtyDayReturns" },
                  { icon: "✦", labelKey: "luxuryPackaging" },
                  { icon: "🚚", labelKey: "freeShippingBadge" },
                ].map((b) => (
                  <div key={b.labelKey} className="cart-trust-badge">
                    <span className="cart-trust-icon">{b.icon}</span>
                    <span className="cart-trust-label">
                      {getCartPageTranslation(
                        b.labelKey as keyof typeof cartPageTranslations,
                        lang,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cart-coupon-section {
          margin-bottom: 1.25rem;
          padding: 1rem;
          border: 1px solid rgba(218, 165, 32, 0.2);
          border-radius: 8px;
          background: rgba(218, 165, 32, 0.03);
        }
        .cart-coupon-label {
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #888;
          margin: 0 0 0.6rem;
        }
        .cart-coupon-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        @media (max-width: 480px) {
          .cart-coupon-row {
            flex-direction: column;
          }
          .cart-coupon-row .cart-coupon-input,
          .cart-coupon-row .cart-coupon-btn {
            width: 100%;
          }
        }
        .cart-coupon-input {
          flex: 1;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(218, 165, 32, 0.3);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          color: inherit;
          font-size: 0.82rem;
          font-family: monospace;
          letter-spacing: 0.05em;
          outline: none;
          transition: border-color 0.2s;
        }
        .cart-coupon-input:focus {
          border-color: rgba(218, 165, 32, 0.7);
        }
        .cart-coupon-input::placeholder {
          color: #555;
          font-size: 0.75rem;
          letter-spacing: 0.02em;
        }
        .cart-coupon-btn {
          padding: 0.5rem 1rem;
          background: rgba(218, 165, 32, 0.15);
          border: 1px solid rgba(218, 165, 32, 0.4);
          border-radius: 6px;
          color: #daa520;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-coupon-btn:hover:not(:disabled) {
          background: rgba(218, 165, 32, 0.25);
          border-color: rgba(218, 165, 32, 0.7);
        }
        .cart-coupon-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cart-coupon-applied {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .cart-coupon-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          background: rgba(46, 125, 50, 0.12);
          border: 1px solid rgba(46, 125, 50, 0.3);
          border-radius: 6px;
          color: #2e7d32;
          font-size: 0.8rem;
          flex: 1;
        }
        .cart-coupon-remove {
          background: none;
          border: 1px solid rgba(180, 0, 0, 0.25);
          border-radius: 6px;
          color: #c62828;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0.35rem 0.6rem;
          transition: all 0.2s;
          line-height: 1;
        }
        .cart-coupon-remove:hover {
          background: rgba(180, 0, 0, 0.08);
        }
        .cart-coupon-success {
          margin: 0.6rem 0 0;
          padding: 0.5rem 0.75rem;
          background: rgba(46, 125, 50, 0.1);
          border: 1px solid rgba(46, 125, 50, 0.25);
          border-radius: 6px;
          color: #2e7d32;
          font-size: 0.78rem;
          line-height: 1.5;
        }
        .cart-coupon-error {
          margin: 0.6rem 0 0;
          padding: 0.5rem 0.75rem;
          background: rgba(198, 40, 40, 0.08);
          border: 1px solid rgba(198, 40, 40, 0.2);
          border-radius: 6px;
          color: #c62828;
          font-size: 0.78rem;
          line-height: 1.5;
        }
        .cart-breakdown-row--discount {
          color: #2e7d32;
        }
        .cart-discount-value {
          color: #2e7d32;
          font-weight: 600;
        }
        .free-shipping-text {
          color: #2e7d32;
          font-weight: 500;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
