// app/checkout/components/CartSummary.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useCurrency } from "@/app/context/CurrencyContext";
import { useCouponStore } from "@/lib/couponStore";
import { supabase } from "@/lib/supabase";
import "./CartSummary.css";

interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  variant_name?: string;
  variant_price?: number;
  variant_image?: string;
  quantity: number;
  pieces_per_unit?: number;
  product?: {
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    subcategory?: string;
    condition?: string;
    is_featured?: boolean;
    is_active?: boolean;
    price?: number;
    original_price?: number;
    images?: string[];
    stock?: number;
  } | null;
}

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping?: number;
  total: number;
  cartCount: number;
  formatPrice?: (price: number) => string;
}

export default function CartSummary({
  items,
  subtotal,
  shipping = 0,
  total,
  cartCount,
  formatPrice: propFormatPrice,
}: CartSummaryProps) {
  const {
    formatPrice: contextFormatPrice,
    currency,
    loading: currencyLoading,
  } = useCurrency();

  const formatPrice = propFormatPrice || contextFormatPrice;
  const currencyCode = currency?.code || "PKR";

  const [userEmail, setUserEmail] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);
  const [settingsRefreshed, setSettingsRefreshed] = useState(false);

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
  } = useCouponStore();

  // ✅ Force fetch coupon settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      console.log("🔄 CartSummary: Fetching coupon settings...");
      await fetchCouponSettings();
      setSettingsRefreshed(true);
      console.log(
        "✅ CartSummary: Settings loaded - 10%:",
        coupon10Enabled,
        "20%:",
        coupon20Enabled,
      );
    };
    loadSettings();
  }, [fetchCouponSettings]);

  // ✅ Get logged-in user email for owner check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || "");
      console.log(
        "📧 User email from auth:",
        session?.user?.email || "not logged in",
      );
    });
  }, []);

  const discountAmountPKR = getDiscountAmount(subtotal);
  const finalShipping = 0;
  const finalTotal = getFinalTotal(subtotal) + finalShipping;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponMessage({ text: "Please enter a coupon code.", success: false });
      return;
    }

    console.log("🔄 Applying coupon with userEmail:", userEmail);
    console.log("🔄 Current coupon settings - 10% enabled:", coupon10Enabled);

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

  // Show loading while fetching settings
  if (settingsLoading && !settingsRefreshed) {
    return (
      <div className="cs-summary-card">
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div
            className="loader-spinner"
            style={{
              margin: "0 auto 1rem",
              width: "30px",
              height: "30px",
              border: "2px solid rgba(218,165,32,0.2)",
              borderTopColor: "#daa520",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          ></div>
          <p>Loading coupon settings...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="cs-summary-card">
      <p className="cs-summary-title">
        <span className="cs-ey-line" />
        Order Summary{" "}
        {!currencyLoading && (
          <span style={{ fontSize: "0.7rem", marginLeft: "0.5rem" }}>
            ({currencyCode})
          </span>
        )}
        <span className="cs-ey-line" />
      </p>

      {/* Items list */}
      <ul className="cs-summary-items">
        {items.slice(0, 3).map((item) => {
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
            images: item.variant_image ? [item.variant_image] : [],
          };
          const ppu = item.pieces_per_unit ?? 1;
          const pricePerPiece = item.variant_price ?? product.price ?? 0;
          const itemTotal = pricePerPiece * ppu * item.quantity;
          const displayImage =
            item.variant_image || product.images?.[0] || null;
          const productName = product.name ?? item.variant_name ?? "Product";

          const tierLabel = ppu > 1 ? ` (${ppu}-Piece)` : "";
          const variantSuffix =
            item.variant_name && item.variant_name !== "Standard"
              ? ` — ${item.variant_name}`
              : "";
          const displayName = `${productName}${tierLabel}${variantSuffix}`;

          const totalPieces = ppu * item.quantity;

          return (
            <li key={item.id} className="cs-summary-item">
              <div className="cs-summary-item-img">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={productName}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
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
                )}
              </div>
              <div className="cs-summary-item-info">
                <p className="cs-summary-item-name">{displayName}</p>
                <p className="cs-summary-item-variant">
                  {ppu > 1 ? `${ppu} pieces per unit × ` : ""}
                  {item.quantity} {item.quantity === 1 ? "unit" : "units"}
                  {ppu > 1 && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        opacity: 0.7,
                        marginLeft: "4px",
                      }}
                    >
                      ({totalPieces} total pieces)
                    </span>
                  )}
                </p>
              </div>
              <span className="cs-summary-item-price">
                {formatPrice(itemTotal)}
              </span>
            </li>
          );
        })}
      </ul>

      {items.length > 3 && (
        <div className="cs-summary-more">
          +{items.length - 3} more item
          {items.length - 3 > 1 ? "s" : ""}
        </div>
      )}

      {/* ✅ COUPON CODE SECTION */}
      <div className="cs-coupon-section">
        <p className="cs-coupon-label">Have a coupon code?</p>

        {!appliedCode ? (
          <div className="cs-coupon-row">
            <input
              type="text"
              className="cs-coupon-input"
              placeholder="Enter coupon code"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase());
                setCouponMessage(null);
              }}
              onKeyDown={handleCouponKeyDown}
              maxLength={20}
            />
            <button
              className="cs-coupon-btn"
              onClick={handleApplyCoupon}
              disabled={!couponInput.trim()}
            >
              Apply
            </button>
          </div>
        ) : (
          <div className="cs-coupon-applied">
            <div className="cs-coupon-badge">
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
              className="cs-coupon-remove"
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
              couponMessage.success ? "cs-coupon-success" : "cs-coupon-error"
            }
          >
            {couponMessage.text}
          </p>
        )}
      </div>

      <div className="cs-summary-breakdown">
        <div className="cs-summary-row">
          <span>
            Subtotal ({cartCount} {cartCount === 1 ? "item" : "items"})
          </span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {appliedCode && discountAmountPKR > 0 && (
          <div className="cs-summary-row cs-summary-row--discount">
            <span>
              Discount ({discountPercent}% off — {appliedCode})
            </span>
            <span className="cs-discount-value">
              − {formatPrice(discountAmountPKR)}
            </span>
          </div>
        )}

        <div className="cs-summary-row">
          <span>Shipping</span>
          <span className="free-shipping-text">Free</span>
        </div>

        <div className="cs-summary-divider" />

        <div className="cs-summary-row cs-summary-total">
          <span>Total ({currencyCode})</span>
          <span className="total-amount">{formatPrice(finalTotal)}</span>
        </div>
      </div>

      <div className="free-shipping-banner">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="16"
          height="16"
        >
          <polyline
            points="20 6 9 17 4 12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Free Shipping</span>
      </div>

      <div className="cs-perks">
        <div className="cs-perk">
          <span className="cs-perk-icon">🔒</span>
          <span className="cs-perk-text">Secure Checkout</span>
        </div>
        <div className="cs-perk">
          <span className="cs-perk-icon">↩</span>
          <span className="cs-perk-text">30-Day Easy Returns</span>
        </div>
        <div className="cs-perk">
          <span className="cs-perk-icon">✦</span>
          <span className="cs-perk-text">Luxury Packaging</span>
        </div>
        <div className="cs-perk">
          <span className="cs-perk-icon">🚚</span>
          <span className="cs-perk-text">Free Shipping</span>
        </div>
      </div>

      <style jsx>{`
        .cs-coupon-section {
          margin: 1rem 0 1.25rem;
          padding: 0.85rem 1rem;
          border: 1px solid rgba(218, 165, 32, 0.15);
          border-radius: 12px;
          background: rgba(218, 165, 32, 0.03);
        }

        .cs-coupon-label {
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #888;
          margin: 0 0 0.6rem;
        }

        .cs-coupon-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .cs-coupon-input {
          flex: 1;
          background: #f5f0e8;
          border: 1px solid rgba(218, 165, 32, 0.3);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          color: #1a1a1a;
          font-size: 0.78rem;
          font-family: monospace;
          letter-spacing: 0.05em;
          outline: none;
          transition: border-color 0.2s;
        }

        .cs-coupon-input:focus {
          border-color: rgba(218, 165, 32, 0.7);
        }

        .cs-coupon-input::placeholder {
          color: #aaa;
          font-size: 0.7rem;
          letter-spacing: 0.02em;
        }

        .cs-coupon-btn {
          padding: 0.5rem 1rem;
          background: rgba(218, 165, 32, 0.15);
          border: 1px solid rgba(218, 165, 32, 0.4);
          border-radius: 8px;
          color: #b8860b;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .cs-coupon-btn:hover:not(:disabled) {
          background: rgba(218, 165, 32, 0.25);
          border-color: var(--cart-gold, #daa520);
        }

        .cs-coupon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .cs-coupon-applied {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .cs-coupon-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          background: rgba(46, 125, 50, 0.1);
          border: 1px solid rgba(46, 125, 50, 0.3);
          border-radius: 8px;
          color: #2e7d32;
          font-size: 0.78rem;
          flex: 1;
        }

        .cs-coupon-remove {
          background: none;
          border: 1px solid rgba(180, 0, 0, 0.25);
          border-radius: 6px;
          color: #c62828;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0.35rem 0.6rem;
          transition: all 0.2s;
        }

        .cs-coupon-remove:hover {
          background: rgba(180, 0, 0, 0.08);
        }

        .cs-coupon-success {
          margin: 0.6rem 0 0;
          padding: 0.5rem 0.75rem;
          background: rgba(46, 125, 50, 0.08);
          border: 1px solid rgba(46, 125, 50, 0.2);
          border-radius: 8px;
          color: #2e7d32;
          font-size: 0.72rem;
          line-height: 1.5;
        }

        .cs-coupon-error {
          margin: 0.6rem 0 0;
          padding: 0.5rem 0.75rem;
          background: rgba(198, 40, 40, 0.08);
          border: 1px solid rgba(198, 40, 40, 0.2);
          border-radius: 8px;
          color: #c62828;
          font-size: 0.72rem;
          line-height: 1.5;
        }

        .cs-summary-row--discount {
          color: #2e7d32;
        }

        .cs-discount-value {
          color: #2e7d32;
          font-weight: 600;
        }

        .free-shipping-text {
          color: #2e7d32;
          font-weight: 500;
        }

        .loader-spinner {
          width: 30px;
          height: 30px;
          border: 2px solid rgba(218, 165, 32, 0.2);
          border-top-color: #daa520;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
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
