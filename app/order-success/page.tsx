"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/app/context/CurrencyContext";
import { supabase } from "@/lib/supabase";
import "./OrderSuccess.css";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface OrderData {
  orderNumber: string;
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    zip: string;
    state?: string;
  };
  paymentMethod: "card" | "paypal";
  snapItems: CartItem[];
  snapSubtotal: number;
  snapCount: number;
  phoneInfoName: string;
  fullPhone: string;
  shippingAddress: string;
  currencyCode: string;
  customerState?: string;
  customerStateName?: string;
}

// ─── Owner Email Constant ───────────────────────────────────────────────────
const OWNER_EMAIL = "info@tech4ru.com";

// ─── Notification Badge ───────────────────────────────────────────────────────

function NotifStatusBadge({
  sent,
  sending,
}: {
  sent: boolean | null;
  sending: boolean;
}) {
  if (sending || sent === null) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "#888",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: "12px",
            height: "12px",
            border: "2px solid #daa520",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        Sending...
      </span>
    );
  }
  if (sent === true) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          color: "#22c55e",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        ✅ Sent Successfully
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        color: "#f59e0b",
        fontSize: "13px",
        fontWeight: 600,
      }}
    >
      ⚠️ Failed to send
    </span>
  );
}

// ─── OrderSuccessUI Component ────────────────────────────────────────────────

interface OrderSuccessUIProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  zip: string;
  country?: string;
  state?: string;
  stateName?: string;
  currencyCode?: string;
  orderNumber: string;
  paymentMethod: "card" | "paypal";
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  cartCount: number;
  notifStatus: {
    email: boolean | null;
    whatsapp: boolean | null;
    sending: boolean;
  };
  fullPhone: string;
  shippingAddress: string;
  formatPrice: (price: number) => string;
  isOwner: boolean; // ✅ NEW PROP
}

// ─── Payment Success Toast ────────────────────────────────────────────────────
function PaymentSuccessToast({
  paymentMethod,
  onDismiss,
}: {
  paymentMethod: "card" | "paypal";
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in immediately
    const t1 = setTimeout(() => setVisible(true), 50);
    // Auto dismiss after 4.5s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        left: "50%",
        transform: visible
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(-110%)",
        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "14px",
        background: "linear-gradient(135deg, #1a1a1a 0%, #111 100%)",
        border: "1px solid rgba(218,165,32,0.5)",
        borderRadius: "16px",
        padding: "16px 22px",
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(218,165,32,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
        minWidth: "300px",
        maxWidth: "90vw",
        cursor: "pointer",
      }}
      onClick={() => {
        setVisible(false);
        setTimeout(onDismiss, 400);
      }}
    >
      {/* Green check icon */}
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(34,197,94,0.35)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="20"
          height="20"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: "15px",
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          Payment Successful! 🎉
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: "12px",
            color: "#888",
            fontWeight: 400,
          }}
        >
          Paid via {paymentMethod === "card" ? "Stripe" : "PayPal"} • Order
          confirmed
        </p>
      </div>

      {/* Gold accent bar on left edge */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "12px",
          bottom: "12px",
          width: "3px",
          borderRadius: "0 2px 2px 0",
          background: "linear-gradient(180deg, #daa520, #f5c842)",
        }}
      />

      {/* Close X */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#555"
        strokeWidth="2"
        width="14"
        height="14"
        style={{ flexShrink: 0 }}
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  );
}

function OrderSuccessUI({
  firstName,
  lastName,
  email,
  address,
  apartment,
  city,
  zip,
  country,
  state,
  stateName,
  currencyCode,
  orderNumber,
  paymentMethod,
  items,
  subtotal,
  shipping,
  total,
  cartCount,
  notifStatus,
  fullPhone,
  formatPrice,
  isOwner, // ✅ DESTRUCTURED
}: OrderSuccessUIProps) {
  const [visible, setVisible] = useState(false);
  const [checkAnim, setCheckAnim] = useState(false);
  const [showToast, setShowToast] = useState(true); // ✅ Toast by default shown
  const confettiRef = useRef<HTMLCanvasElement>(null);

  const isAustralia = currencyCode === "AUD";

  const orderDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setCheckAnim(true), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Gold confetti burst
  useEffect(() => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = [
      "#daa520",
      "#f5c842",
      "#fff8e1",
      "#b8860b",
      "#ffe082",
      "#c8a415",
      "#ffd54f",
    ];

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rot: number;
      rotV: number;
      shape: "rect" | "circle";
      opacity: number;
    }[] = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 12 + 4),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.5 ? "rect" : "circle",
        opacity: 1,
      });
    }

    let frame: number;
    let tick = 0;

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.vx *= 0.99;
        p.rot += p.rotV;
        if (tick > 60) p.opacity -= 0.012;
        ctx!.save();
        ctx!.globalAlpha = Math.max(0, p.opacity);
        ctx!.fillStyle = p.color;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        if (p.shape === "rect") {
          ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }
      tick++;
      if (alive) frame = requestAnimationFrame(draw);
    }

    const startDelay = setTimeout(() => {
      frame = requestAnimationFrame(draw);
    }, 350);
    return () => {
      clearTimeout(startDelay);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={`os-root ${visible ? "os-root--visible" : ""}`}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ✅ Payment Success Toast — page load pe seedha show hoga */}
      {showToast && (
        <PaymentSuccessToast
          paymentMethod={paymentMethod}
          onDismiss={() => setShowToast(false)}
        />
      )}

      <canvas
        ref={confettiRef}
        className="os-confetti-canvas"
        aria-hidden="true"
      />
      <div className="os-ambient" aria-hidden="true" />
      <div className="os-grain" aria-hidden="true" />
      <div className="os-lines" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="os-corner os-corner--tl" aria-hidden="true" />
      <div className="os-corner os-corner--tr" aria-hidden="true" />
      <div className="os-corner os-corner--bl" aria-hidden="true" />
      <div className="os-corner os-corner--br" aria-hidden="true" />

      <div className="os-wrap">
        {/* ── LEFT COLUMN ── */}
        <div className="os-left">
          {/* Checkmark ring */}
          <div
            className={`os-check-ring ${checkAnim ? "os-check-ring--burst" : ""}`}
          >
            <div className="os-check-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="40"
                height="40"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h1 className="os-title">Order Confirmed!</h1>
          <p className="os-sub">
            Thank you <strong>{firstName}</strong>! Your order has been placed
            successfully.
          </p>

          {/* ─────────────────────────────────────────────────────────────────
              ✅ NOTIFICATION STATUS CARD - SIRF OWNER KE LIYE
              Agar isOwner = true tabhi dikhega, warna bilkul hide
          ───────────────────────────────────────────────────────────────── */}
          {isOwner && (
            <div
              style={{
                background: "linear-gradient(135deg, #141414 0%, #1e1e1e 100%)",
                border: "1px solid rgba(218,165,32,0.2)",
                borderRadius: "14px",
                padding: "18px 22px",
                marginBottom: "24px",
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <span style={{ fontSize: "18px" }}>📬</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#daa520",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Order Confirmation Sent
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "#666",
                      fontWeight: 400,
                    }}
                  >
                    Notifications dispatched to:
                  </p>
                </div>
              </div>

              {/* Email row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span style={{ fontSize: "18px" }}>📧</span>
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        marginBottom: "2px",
                      }}
                    >
                      Email
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#bbb",
                        fontFamily: "monospace",
                      }}
                    >
                      {email}
                    </div>
                  </div>
                </div>
                <NotifStatusBadge
                  sent={notifStatus.email}
                  sending={notifStatus.sending}
                />
              </div>

              {/* WhatsApp row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span style={{ fontSize: "18px" }}>💬</span>
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        marginBottom: "2px",
                      }}
                    >
                      WhatsApp
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#bbb",
                        fontFamily: "monospace",
                      }}
                    >
                      {fullPhone || "—"}
                    </div>
                  </div>
                </div>
                {fullPhone ? (
                  <NotifStatusBadge
                    sent={notifStatus.whatsapp}
                    sending={notifStatus.sending}
                  />
                ) : (
                  <span style={{ fontSize: "12px", color: "#444" }}>
                    No phone
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Rest of the UI (Order Details Card, Timeline, etc.) continues here */}
          {/* Order Details Card */}
          <div className="os-details-card">
            <div className="os-details-title">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="16"
                height="16"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              Order Details
            </div>
            <div className="os-detail-item">
              <span className="os-detail-label">Order Number</span>
              <span
                className="os-detail-val"
                style={{ fontFamily: "monospace", color: "#daa520" }}
              >
                {orderNumber}
              </span>
            </div>
            <div className="os-detail-item">
              <span className="os-detail-label">Customer Name</span>
              <span className="os-detail-val">
                {firstName} {lastName}
              </span>
            </div>
            <div className="os-detail-item">
              <span className="os-detail-label">Email Address</span>
              <span className="os-detail-val">{email}</span>
            </div>
            <div className="os-detail-item">
              <span className="os-detail-label">Phone Number</span>
              <span className="os-detail-val">{fullPhone}</span>
            </div>
            <div className="os-detail-item">
              <span className="os-detail-label">Order Date</span>
              <span className="os-detail-val">{orderDate}</span>
            </div>

            <div className="os-details-divider" />

            <div className="os-details-title">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="16"
                height="16"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Shipping Address
            </div>
            <div className="os-detail-addr">
              <div className="os-detail-addr-line">
                {address}
                {apartment ? `, ${apartment}` : ""}
              </div>
              <div className="os-detail-addr-line">
                {city}
                {isAustralia && stateName ? `, ${stateName}` : ""}
                {zip ? ` — ${zip}` : ""}
              </div>
              {isAustralia && state && (
                <div style={{ marginTop: "4px", marginBottom: "2px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "rgba(218,165,32,0.1)",
                      color: "#daa520",
                      border: "1px solid rgba(218,165,32,0.3)",
                      borderRadius: "6px",
                      padding: "2px 9px",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      fontFamily: "monospace",
                    }}
                  >
                    {state}
                  </span>
                </div>
              )}
              {country && (
                <div className="os-detail-addr-line os-detail-addr-country">
                  {country}
                </div>
              )}
            </div>

            <div className="os-details-divider" />

            <div className="os-details-title">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="16"
                height="16"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 8h20" />
              </svg>
              Payment Method
            </div>
            <div className="os-payment-badge-row">
              <div className="os-payment-badge">
                {paymentMethod === "card" ? (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="18"
                      height="18"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M2 8h20M7 16h2M13 16h4" />
                    </svg>
                    Credit / Debit Card via Stripe
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="18"
                      height="18"
                    >
                      <path d="M7 8h10M7 12h6M7 16h4" />
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                    </svg>
                    PayPal
                  </>
                )}
              </div>
              <div className="os-payment-confirmed">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="13"
                  height="13"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Payment Confirmed
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="os-timeline">
            <div className="os-timeline-item os-timeline-item--done">
              <div className="os-tl-dot" />
              <div className="os-tl-text">
                <strong>Order Placed</strong>
                <span>Confirmed &amp; payment received</span>
              </div>
            </div>
            <div className="os-timeline-item">
              <div className="os-tl-dot os-tl-dot--pulse" />
              <div className="os-tl-text">
                <strong>Processing</strong>
                <span>Your items are being prepared</span>
              </div>
            </div>
            <div className="os-timeline-item os-timeline-item--muted">
              <div className="os-tl-dot os-tl-dot--empty" />
              <div className="os-tl-text">
                <strong>Shipped</strong>
                <span>You'll receive tracking info via WhatsApp</span>
              </div>
            </div>
            <div className="os-timeline-item os-timeline-item--muted">
              <div className="os-tl-dot os-tl-dot--empty" />
              <div className="os-tl-text">
                <strong>Delivered</strong>
                <span>Enjoy your luxury purchase</span>
              </div>
            </div>
          </div>

          <Link href="/" className="os-home-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="os-right">
          <div className="os-summary-card">
            <div className="os-summary-header">
              <p className="os-summary-title">
                <span className="os-ey-line" />
                Order Summary
                <span className="os-ey-line" />
              </p>
              <span className="os-summary-date">{orderDate}</span>
            </div>

            <ul className="os-items-list">
              {items.map((item) => {
                const product = item.product ?? {
                  name: item.variant_name || "Product",
                  images: item.variant_image ? [item.variant_image] : [],
                  price: item.variant_price ?? 0,
                };
                const ppu = item.pieces_per_unit ?? 1;
                const pricePerPiece =
                  item.variant_price ?? (product as any).price ?? 0;
                const itemTotal = pricePerPiece * ppu * item.quantity;
                const displayImage =
                  item.variant_image || (product as any).images?.[0] || null;
                const productName =
                  (product as any).name ?? item.variant_name ?? "Product";
                const displayName =
                  item.variant_name && item.variant_name !== "Standard"
                    ? `${productName} (${item.variant_name})`
                    : productName;
                const totalPieces = ppu * item.quantity;

                return (
                  <li key={item.id} className="os-item">
                    <div className="os-item-img">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={productName}
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                            borderRadius: "8px",
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
                    <div className="os-item-info">
                      <p className="os-item-name">{displayName}</p>
                      <p className="os-item-qty">
                        {ppu > 1 ? `${ppu} pieces × ` : ""}
                        {item.quantity} {item.quantity === 1 ? "unit" : "units"}
                        {ppu > 1 && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "0.7rem",
                              opacity: 0.65,
                              marginTop: "2px",
                            }}
                          >
                            ({totalPieces} total pieces)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="os-item-price">
                      {formatPrice(itemTotal)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="os-breakdown">
              <div className="os-breakdown-row">
                <span>
                  Subtotal ({cartCount} {cartCount === 1 ? "item" : "items"})
                </span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="os-breakdown-row">
                <span>Shipping</span>
                <span className="os-free-ship">Free</span>
              </div>
              <div className="os-breakdown-divider" />
              <div className="os-breakdown-row os-breakdown-total">
                <span>Total Paid</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="os-perks">
              <div className="os-perk">
                <span className="os-perk-icon">🔒</span>
                <span>Secure Checkout</span>
              </div>
              <div className="os-perk">
                <span className="os-perk-icon">🚚</span>
                <span>Free Shipping</span>
              </div>
              <div className="os-perk">
                <span className="os-perk-icon">↩</span>
                <span>30-Day Returns</span>
              </div>
              <div className="os-perk">
                <span className="os-perk-icon">✦</span>
                <span>Luxury Packaging</span>
              </div>
            </div>

            <div className="os-summary-footer">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="15"
                height="15"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              SSL secured • Paid via{" "}
              {paymentMethod === "card" ? "Stripe" : "PayPal"}
            </div>
          </div>

          <div className="os-stamp">
            <div className="os-stamp-inner">
              <div className="os-stamp-icon">✦</div>
              <div className="os-stamp-text">VERIFIED</div>
              <div className="os-stamp-sub">LUXURY ORDER</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: read Supabase session from localStorage SYNCHRONOUSLY ───────────
// getSession() is async and causes a second render. Instead we read the token
// directly from localStorage — Supabase stores it there — so isOwner is known
// before the very first render, no reload needed.
function readOwnerFromLocalStorage(): boolean {
  try {
    // Supabase v2 stores session under key: sb-<projectRef>-auth-token
    // We scan all localStorage keys to find it without needing the project ref.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const email =
          parsed?.user?.email ?? parsed?.session?.user?.email ?? null;
        if (email === OWNER_EMAIL) return true;
      }
    }
  } catch {
    // localStorage not available (SSR) or parse error — safe fallback
  }
  return false;
}

// ─── Main Page Export ─────────────────────────────────────────────────────────

export default function OrderSuccessPage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [ready, setReady] = useState(false);

  // ✅ Read owner status SYNCHRONOUSLY from localStorage — zero delay, no reload
  const [isOwner, setIsOwner] = useState<boolean>(() =>
    readOwnerFromLocalStorage(),
  );

  const [notifStatus, setNotifStatus] = useState<{
    email: boolean | null;
    whatsapp: boolean | null;
    sending: boolean;
  }>({ email: null, whatsapp: null, sending: true });

  // ── Step 1: Load order data from sessionStorage ──────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("order_success_data");

    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      const data: OrderData = JSON.parse(raw);
      setOrderData(data);
      setReady(true);
    } catch {
      router.replace("/");
    }
  }, [router]);

  // ── Step 2: Keep isOwner in sync if auth state changes (login/logout) ──────
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setIsOwner(email === OWNER_EMAIL);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Step 3: Send notifications once order data is ready ──────────────────────
  useEffect(() => {
    if (!orderData) return;

    const alreadySent = sessionStorage.getItem(
      `notif_sent_${orderData.orderNumber}`,
    );
    if (alreadySent) {
      setNotifStatus({ email: true, whatsapp: true, sending: false });
      return;
    }

    const {
      orderNumber,
      form,
      snapItems,
      snapSubtotal,
      fullPhone,
      shippingAddress,
      paymentMethod,
      currencyCode,
      phoneInfoName,
    } = orderData;

    const items = snapItems.map((item) => {
      const ppu = item.pieces_per_unit ?? 1;
      const pricePerPiece =
        item.variant_price ?? (item.product as any)?.price ?? 0;
      const pricePKR = pricePerPiece * ppu;

      return {
        name: (item.product as any)?.name ?? item.variant_name ?? "Product",
        variant:
          item.variant_name && item.variant_name !== "Standard"
            ? item.variant_name
            : null,
        quantity: item.quantity,
        price: pricePKR,
        pricePKR: pricePKR,
        piecesPerUnit: ppu,
        image: item.variant_image ?? (item.product as any)?.images?.[0] ?? null,
      };
    });

    const totalPKR = snapSubtotal;

    const sendNotifications = async () => {
      try {
        console.log(`📤 Sending notifications for order ${orderNumber}...`);

        const res = await fetch("/api/send-order-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber,
            email: form.email,
            phone: fullPhone,
            name: `${form.firstName} ${form.lastName}`.trim(),
            items,
            subtotal: totalPKR,
            shipping: 0,
            total: totalPKR,
            shippingAddress,
            paymentMethod,
            currency: currencyCode || "PKR",
            customerCountry: phoneInfoName || "Pakistan",
          }),
        });

        const result = await res.json();
        console.log("📊 Notification API response:", result);

        if (result.success) {
          const emailOk = result.results?.emailSent === true;
          const whatsappOk = result.results?.whatsappSent === true;

          setNotifStatus({
            email: emailOk,
            whatsapp: fullPhone ? whatsappOk : null,
            sending: false,
          });

          if (emailOk) {
            sessionStorage.setItem(
              `notif_sent_${orderData.orderNumber}`,
              "true",
            );
          }
        } else {
          console.error("Notification API error:", result.error);
          setNotifStatus({ email: false, whatsapp: false, sending: false });
        }
      } catch (err) {
        console.error("❌ Notification fetch error:", err);
        setNotifStatus({ email: false, whatsapp: false, sending: false });
      }
    };

    sendNotifications();
  }, [orderData]);

  // ── Loading spinner ──────────────────────────────────────────────────────────
  if (!ready || !orderData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf8f3",
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: 44,
            height: 44,
            border: "3px solid #f3f3f3",
            borderTop: "3px solid #daa520",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <OrderSuccessUI
      firstName={orderData.form.firstName}
      lastName={orderData.form.lastName}
      email={orderData.form.email}
      phone={orderData.form.phone}
      address={orderData.form.address}
      apartment={orderData.form.apartment}
      city={orderData.form.city}
      zip={orderData.form.zip}
      country={orderData.phoneInfoName}
      state={orderData.customerState}
      stateName={orderData.customerStateName}
      currencyCode={orderData.currencyCode}
      orderNumber={orderData.orderNumber}
      paymentMethod={orderData.paymentMethod}
      items={orderData.snapItems}
      subtotal={orderData.snapSubtotal}
      shipping={0}
      total={orderData.snapSubtotal}
      cartCount={orderData.snapCount}
      notifStatus={notifStatus}
      fullPhone={orderData.fullPhone}
      shippingAddress={orderData.shippingAddress}
      formatPrice={formatPrice}
      isOwner={isOwner} // ✅ PASSING ISOWNER PROP
    />
  );
}
