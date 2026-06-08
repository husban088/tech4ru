// app/panel/orders/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import PanelNavbar from "@/app/components/PanelNavbar";
import "./orders.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  product_id?: string;
  product_name?: string;
  variant_id?: string;
  variant_name?: string;
  variant_image?: string;
  quantity: number;
  price: number;
  pieces_per_unit?: number;
}

interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  zip: string;
  country: string;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  payment_method?: string;
  status: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  courier_name?: string;
  courier_country?: string;
  tracking_number?: string;
  courier_tracking_url?: string;
  estimated_days?: string;
  shipped_at?: string;
}

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  msg: string;
  exiting?: boolean;
};

// ─── COURIER CONFIG ───────────────────────────────────────────────────────────

const COURIER_CONFIG: Record<
  string,
  {
    flag: string;
    label: string;
    couriers: { id: string; name: string; days: string }[];
  }
> = {
  Pakistan: {
    flag: "🇵🇰",
    label: "Pakistan",
    couriers: [
      { id: "leopard", name: "Leopard Courier", days: "2–3 business days" },
      { id: "tcs", name: "TCS Courier", days: "2–4 business days" },
      { id: "postex", name: "PostEx", days: "1–3 business days" },
      { id: "trax", name: "Trax", days: "2–4 business days" },
      { id: "blueex", name: "BlueEx", days: "2–3 business days" },
      { id: "call_courier", name: "Call Courier", days: "1–2 business days" },
      { id: "m&p", name: "M&P Courier", days: "2–4 business days" },
      { id: "swyft", name: "Swyft Logistics", days: "1–3 business days" },
      { id: "others", name: "Others (Custom)", days: "—" },
    ],
  },
  "United Kingdom": {
    flag: "🇬🇧",
    label: "United Kingdom",
    couriers: [
      { id: "royal_mail", name: "Royal Mail", days: "1–3 business days" },
      { id: "dpd_uk", name: "DPD UK", days: "1–2 business days" },
      { id: "evri", name: "Evri (Hermes)", days: "2–4 business days" },
      { id: "parcelforce", name: "Parcelforce", days: "1–2 business days" },
      { id: "yodel", name: "Yodel", days: "2–4 business days" },
      { id: "ups_uk", name: "UPS UK", days: "1–3 business days" },
      { id: "fedex_uk", name: "FedEx UK", days: "1–2 business days" },
      { id: "others", name: "Others (Custom)", days: "—" },
    ],
  },
  Australia: {
    flag: "🇦🇺",
    label: "Australia",
    couriers: [
      { id: "auspost", name: "Australia Post", days: "3–7 business days" },
      { id: "startrack", name: "StarTrack", days: "1–5 business days" },
      {
        id: "courier_please",
        name: "Courier Please",
        days: "2–5 business days",
      },
      { id: "tnt_aus", name: "TNT Australia", days: "2–5 business days" },
      {
        id: "fastway_aus",
        name: "Fastway Couriers",
        days: "3–6 business days",
      },
      { id: "dhl_aus", name: "DHL Australia", days: "2–4 business days" },
      { id: "others", name: "Others (Custom)", days: "—" },
    ],
  },
  "United States": {
    flag: "🇺🇸",
    label: "United States",
    couriers: [
      { id: "usps", name: "USPS", days: "2–5 business days" },
      { id: "ups_us", name: "UPS", days: "1–5 business days" },
      { id: "fedex_us", name: "FedEx", days: "1–5 business days" },
      { id: "amazon_us", name: "Amazon Logistics", days: "1–3 business days" },
      { id: "ontrac", name: "OnTrac", days: "1–3 business days" },
      { id: "others", name: "Others (Custom)", days: "—" },
    ],
  },
  "United Arab Emirates": {
    flag: "🇦🇪",
    label: "UAE",
    couriers: [
      { id: "aramex", name: "Aramex", days: "1–3 business days" },
      { id: "dhl_uae", name: "DHL UAE", days: "1–2 business days" },
      { id: "fetchr", name: "Fetchr", days: "1–3 business days" },
      { id: "smsa_uae", name: "SMSA Express", days: "1–3 business days" },
      { id: "others", name: "Others (Custom)", days: "—" },
    ],
  },
  Canada: {
    flag: "🇨🇦",
    label: "Canada",
    couriers: [
      { id: "canada_post", name: "Canada Post", days: "3–7 business days" },
      { id: "purolator", name: "Purolator", days: "1–5 business days" },
      { id: "ups_ca", name: "UPS Canada", days: "1–5 business days" },
      { id: "fedex_ca", name: "FedEx Canada", days: "1–5 business days" },
      { id: "others", name: "Others (Custom)", days: "—" },
    ],
  },
};

const COURIER_TRACKING_URLS: Record<string, string> = {
  leopard: "https://www.leopardscourier.com/leopards-tracking/?track_numbers=",
  tcs: "https://www.tcs.com.pk/tracking.php?rno=",
  postex: "https://postex.pk/tracking/",
  trax: "https://www.trax.pk/tracking?tracking_number=",
  blueex: "https://blueex.com/track-shipment?track=",
  call_courier: "https://callcourier.com.pk/tracking?tracking_no=",
  "m&p": "https://moversnpackers.com.pk/tracking?consignment=",
  swyft: "https://swyftlogistics.com/tracking?awb=",
  royal_mail: "https://www.royalmail.com/track-your-item#/tracking-results/",
  dpd_uk: "https://track.dpd.co.uk/parcels/",
  evri: "https://www.evri.com/track-a-parcel#/parcel/",
  parcelforce: "https://www.parcelforce.com/track-trace?trackNumber=",
  yodel: "https://www.yodel.co.uk/tracking/",
  ups_uk: "https://www.ups.com/track?loc=en_GB&tracknum=",
  fedex_uk: "https://www.fedex.com/fedextrack/?trknbr=",
  auspost: "https://auspost.com.au/mypost/track/#/details/",
  startrack: "https://startrack.com.au/tracking?id=",
  courier_please: "https://www.couriersplease.com.au/tools/track?consignment=",
  tnt_aus:
    "https://www.tnt.com/express/en_au/site/tracking.html?searchType=con&cons=",
  fastway_aus: "https://www.fastway.com.au/tools/track?l=&dest=&cnum=",
  dhl_aus:
    "https://www.dhl.com/au-en/home/tracking/tracking-express.html?submit=1&tracking-id=",
  usps: "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
  ups_us: "https://www.ups.com/track?tracknum=",
  fedex_us: "https://www.fedex.com/fedextrack/?trknbr=",
  amazon_us: "https://www.amazon.com/gp/your-account/ship-track?itemId=",
  ontrac: "https://www.ontrac.com/tracking/?number=",
  aramex: "https://www.aramex.com/us/en/track/results?ShipmentNumber=",
  dhl_uae: "https://www.dhl.com/ae-en/home/tracking.html?tracking-id=",
  fetchr: "https://www.fetchr.com/tracking?number=",
  smsa_uae: "https://www.smsaexpress.com/trackingdetails?tracknumbers=",
  canada_post:
    "https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=",
  purolator:
    "https://www.purolator.com/en/track-and-manage/track-your-packages?pin=",
  ups_ca: "https://www.ups.com/track?loc=en_CA&tracknum=",
  fedex_ca: "https://www.fedex.com/en-ca/tracking.html?tracknumbers=",
  dhl: "https://www.dhl.com/en/express/tracking.html?AWB=",
  fedex: "https://www.fedex.com/fedextrack/?trknbr=",
  ups: "https://www.ups.com/track?tracknum=",
  aramex_generic: "https://www.aramex.com/us/en/track/results?ShipmentNumber=",
};

function getCourierTrackingUrl(
  courierId: string,
  trackingNum?: string,
): string {
  const base = COURIER_TRACKING_URLS[courierId] || "";
  if (!base) return "";
  return trackingNum ? base + encodeURIComponent(trackingNum) : base;
}

const OTHER_COURIERS = [
  { id: "dhl", name: "DHL", days: "3–7 business days" },
  { id: "fedex", name: "FedEx", days: "2–5 business days" },
  { id: "ups", name: "UPS", days: "3–7 business days" },
  { id: "aramex", name: "Aramex", days: "3–6 business days" },
  { id: "others", name: "Others (Custom)", days: "—" },
];

function getCouriersForCountry(country: string) {
  const key = Object.keys(COURIER_CONFIG).find(
    (k) =>
      country.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(country.toLowerCase()),
  );
  return key ? COURIER_CONFIG[key] : null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPKR(amount: number) {
  return "PKR " + Number(amount).toLocaleString("en-PK");
}

const STATUS_OPTIONS = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const NOTIFY_STATUSES = ["shipped", "delivered", "cancelled"];

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastBar({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="ords-toast-wrap">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`ords-toast ords-toast--${t.type}${t.exiting ? " exiting" : ""}`}
        >
          <div className="ords-toast-icon">
            {t.type === "success" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {t.type === "error" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {t.type === "info" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
              </svg>
            )}
          </div>
          <div className="ords-toast-body">
            <p className="ords-toast-msg">{t.msg}</p>
          </div>
          <button className="ords-toast-close" onClick={() => onRemove(t.id)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Notification Badge ───────────────────────────────────────────────────────

function NotifBadge({
  whatsapp,
  email,
}: {
  whatsapp: boolean | null;
  email: boolean | null;
}) {
  if (whatsapp === null && email === null) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        marginTop: "8px",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: "20px",
          background: whatsapp
            ? "rgba(37,211,102,0.15)"
            : "rgba(239,68,68,0.1)",
          color: whatsapp ? "#16a34a" : "#dc2626",
          border: `1px solid ${whatsapp ? "rgba(37,211,102,0.3)" : "rgba(239,68,68,0.2)"}`,
        }}
      >
        📱 WA {whatsapp ? "✓" : "✗"}
      </span>
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: "20px",
          background: email ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.1)",
          color: email ? "#1d4ed8" : "#dc2626",
          border: `1px solid ${email ? "rgba(59,130,246,0.25)" : "rgba(239,68,68,0.2)"}`,
        }}
      >
        📧 Email {email ? "✓" : "✗"}
      </span>
    </div>
  );
}

// ─── Shipping Info Display ──────────────────────────────────────────────────

function ShippingInfoBadge({ order }: { order: Order }) {
  if (order.status !== "shipped" || !order.courier_name) return null;
  return (
    <div
      style={{
        margin: "8px 0 0",
        padding: "8px 12px",
        background: "rgba(21,101,192,0.08)",
        border: "1px solid rgba(21,101,192,0.2)",
        borderRadius: "10px",
        fontSize: "12px",
        color: "#1565c0",
      }}
    >
      🚚 <strong>{order.courier_name}</strong>
      {order.courier_country && (
        <span style={{ opacity: 0.7 }}> ({order.courier_country})</span>
      )}
      {order.estimated_days && <span> · Est. {order.estimated_days}</span>}
      {order.tracking_number && (
        <div style={{ marginTop: "3px", color: "#444", fontSize: "11px" }}>
          📦 Tracking: <strong>{order.tracking_number}</strong>
        </div>
      )}
      {order.courier_tracking_url && order.tracking_number && (
        <div style={{ marginTop: "3px" }}>
          <a
            href={order.courier_tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#1565c0",
              fontSize: "11px",
              textDecoration: "underline",
            }}
          >
            🔗 Track on courier site →
          </a>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--ords-sans)",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "#aaa",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "10px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontFamily: "var(--ords-sans)",
  fontSize: "0.82rem",
  outline: "none",
  boxSizing: "border-box",
};

// ─── Cancel Reason Modal ──────────────────────────────────────────────────────

function CancelReasonModal({
  order,
  onClose,
  onConfirm,
  loading,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [selectedReason, setSelectedReason] = useState("");

  const commonReasons = [
    "Customer requested cancellation",
    "Out of stock / unavailable",
    "Payment issue",
    "Shipping address issue",
    "Duplicate order",
    "Other (please specify)",
  ];

  const finalReason =
    selectedReason === "Other (please specify)" ? customReason : selectedReason;
  const canConfirm = finalReason.trim().length >= 5 && !loading;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 20001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: "24px",
          padding: "clamp(20px, 5vw, 32px)",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "calc(100dvh - 40px)",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
          position: "relative",
          margin: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#888",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>❌</div>
          <h2 style={{ color: "#ef4444", margin: 0, fontSize: "1.5rem" }}>
            Cancel Order
          </h2>
          <p style={{ color: "#888", fontSize: "0.8rem", marginTop: "6px" }}>
            Order #{order.order_number} · {order.first_name} {order.last_name}
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{ ...labelStyle, color: "#ef4444", marginBottom: "12px" }}
          >
            ❗ Reason for Cancellation{" "}
            <span style={{ color: "#ef4444" }}>*</span>
          </label>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {commonReasons.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setSelectedReason(r);
                  if (r !== "Other (please specify)") setCustomReason("");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${selectedReason === r ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                  background:
                    selectedReason === r
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(255,255,255,0.03)",
                  color: selectedReason === r ? "#ef4444" : "#ccc",
                  fontFamily: "var(--ords-sans)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {r === "Other (please specify)" ? "✏️ " : "• "}
                {r}
              </button>
            ))}
          </div>

          {selectedReason === "Other (please specify)" && (
            <div style={{ marginTop: "16px" }}>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please explain the reason for cancellation in detail..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontFamily: "var(--ords-sans)",
                  fontSize: "0.85rem",
                  resize: "vertical",
                  outline: "none",
                }}
                autoFocus
              />
              {customReason && customReason.length < 5 && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "0.7rem",
                    marginTop: "6px",
                  }}
                >
                  Please enter at least 5 characters
                </p>
              )}
            </div>
          )}
        </div>

        {finalReason && finalReason.length >= 5 && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "24px",
            }}
          >
            <p
              style={{
                color: "#ef4444",
                fontSize: "0.7rem",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              📋 CANCELLATION REASON
            </p>
            <p style={{ color: "#ccc", fontSize: "0.85rem", margin: 0 }}>
              {finalReason}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "#888",
              fontFamily: "var(--ords-sans)",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Go Back
          </button>
          <button
            onClick={() => {
              if (canConfirm) onConfirm(finalReason);
            }}
            disabled={!canConfirm}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: canConfirm
                ? "linear-gradient(135deg, #dc2626, #991b1b)"
                : "rgba(255,255,255,0.08)",
              color: canConfirm ? "#fff" : "#555",
              fontFamily: "var(--ords-sans)",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "⏳ Cancelling..." : "❌ Confirm Cancellation"}
          </button>
        </div>

        <p
          style={{
            color: "#666",
            fontSize: "0.65rem",
            textAlign: "center",
            marginTop: "16px",
          }}
        >
          Customer will be notified via WhatsApp + Email with the cancellation
          reason
        </p>
      </div>
    </div>
  );
}

// ─── Shipping Modal ──────────────────────────────────────────────────────────

function ShippingModal({
  order,
  onClose,
  onConfirm,
  loading,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (data: {
    courierCountry: string;
    courierName: string;
    courierKey: string;
    estimatedDays: string;
    trackingNumber: string;
    courierTrackingUrl: string;
  }) => void;
  loading: boolean;
}) {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierTrackingUrl, setCourierTrackingUrl] = useState("");
  const [customEstimate, setCustomEstimate] = useState("");
  const [urlManuallyEdited, setUrlManuallyEdited] = useState(false);
  const [customCourierName, setCustomCourierName] = useState("");

  useEffect(() => {
    if (order.country) {
      const matched = Object.keys(COURIER_CONFIG).find(
        (k) =>
          order.country.toLowerCase().includes(k.toLowerCase()) ||
          k.toLowerCase().includes(order.country.toLowerCase()),
      );
      if (matched) setSelectedCountry(matched);
    }
  }, [order.country]);

  const countryData = selectedCountry ? COURIER_CONFIG[selectedCountry] : null;
  const couriers = countryData ? countryData.couriers : OTHER_COURIERS;
  const isOthers = selectedCourier === "others";
  const selectedCourierObj = couriers.find((c) => c.id === selectedCourier);
  const effectiveCourierName = isOthers
    ? customCourierName.trim()
    : selectedCourierObj?.name || "";
  const estimatedDays =
    customEstimate || (isOthers ? "" : selectedCourierObj?.days) || "";

  // Auto-generate tracking URL when courier or tracking number changes
  useEffect(() => {
    if (!urlManuallyEdited && selectedCourier) {
      let autoUrl = "";
      if (isOthers && customCourierName.trim()) {
        const encodedCourierName = encodeURIComponent(customCourierName.trim());
        const encodedTracking = encodeURIComponent(trackingNumber.trim() || "");
        autoUrl = `https://www.google.com/search?q=${encodedCourierName}+tracking+${encodedTracking}`;
      } else {
        autoUrl = getCourierTrackingUrl(
          selectedCourier,
          trackingNumber.trim() || undefined,
        );
      }
      setCourierTrackingUrl(autoUrl);
    }
  }, [
    selectedCourier,
    trackingNumber,
    urlManuallyEdited,
    isOthers,
    customCourierName,
  ]);

  const canConfirm =
    selectedCountry &&
    selectedCourier &&
    trackingNumber.trim() &&
    (!isOthers || customCourierName.trim()) &&
    !loading;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 20000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(218,165,32,0.25)",
          borderRadius: "20px",
          padding: "clamp(16px, 5vw, 32px)",
          maxWidth: "520px",
          width: "100%",
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          position: "relative",
          margin: "auto",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#888",
            padding: 0,
            lineHeight: 1,
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div
          style={{
            textAlign: "center",
            marginBottom: "20px",
            paddingRight: "28px",
          }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>🚚</div>
          <h2
            style={{
              color: "#daa520",
              fontFamily: "var(--ords-serif)",
              margin: 0,
              fontSize: "clamp(1rem, 4vw, 1.3rem)",
            }}
          >
            Mark as Shipped
          </h2>
          <p
            style={{
              color: "#888",
              fontFamily: "var(--ords-sans)",
              fontSize: "clamp(0.65rem, 2.5vw, 0.75rem)",
              margin: "5px 0 0",
            }}
          >
            Order #{order.order_number} · {order.first_name} {order.last_name}
          </p>
          <p
            style={{
              color: "#666",
              fontFamily: "var(--ords-sans)",
              fontSize: "clamp(0.6rem, 2vw, 0.7rem)",
              margin: "3px 0 0",
            }}
          >
            📍 {order.city}, {order.country}
          </p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={labelStyle}>📦 Step 1: Delivery Country</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {Object.entries(COURIER_CONFIG).map(([key, val]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedCountry(key);
                  setSelectedCourier("");
                  setCustomCourierName("");
                  setCustomEstimate("");
                  setUrlManuallyEdited(false);
                }}
                style={{
                  padding: "7px 12px",
                  borderRadius: "40px",
                  border: `1px solid ${selectedCountry === key ? "#daa520" : "rgba(255,255,255,0.1)"}`,
                  background:
                    selectedCountry === key
                      ? "rgba(218,165,32,0.15)"
                      : "rgba(255,255,255,0.04)",
                  color: selectedCountry === key ? "#daa520" : "#999",
                  fontFamily: "var(--ords-sans)",
                  fontSize: "clamp(0.62rem, 2.5vw, 0.72rem)",
                  fontWeight: selectedCountry === key ? 700 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {val.flag} {val.label}
              </button>
            ))}
          </div>
        </div>

        {selectedCountry && (
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>
              🏢 Step 2: Courier Company ({countryData?.flag} {selectedCountry})
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "7px" }}
            >
              {couriers.map((c) => {
                const isActive = selectedCourier === c.id;
                const isOthersBtn = c.id === "others";
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCourier(c.id);
                      setCustomEstimate("");
                      setUrlManuallyEdited(false);
                      if (!isOthersBtn) setCustomCourierName("");
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: `1px solid ${isActive ? (isOthersBtn ? "#9ca3af" : "#daa520") : "rgba(255,255,255,0.08)"}`,
                      background: isActive
                        ? isOthersBtn
                          ? "rgba(156,163,175,0.1)"
                          : "rgba(218,165,32,0.12)"
                        : "rgba(255,255,255,0.03)",
                      color: isActive
                        ? isOthersBtn
                          ? "#d1d5db"
                          : "#daa520"
                        : "#ccc",
                      fontFamily: "var(--ords-sans)",
                      fontSize: "clamp(0.7rem, 2.5vw, 0.78rem)",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isOthersBtn && <span>✏️</span>}
                      {c.name}
                    </span>
                    {!isOthersBtn && (
                      <span
                        style={{
                          fontSize: "0.63rem",
                          opacity: 0.7,
                          flexShrink: 0,
                          marginLeft: "8px",
                        }}
                      >
                        ⏱ {c.days}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isOthers && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "14px",
                  background: "rgba(156,163,175,0.06)",
                  border: "1px solid rgba(156,163,175,0.2)",
                  borderRadius: "12px",
                }}
              >
                <label
                  style={{
                    ...labelStyle,
                    color: "#d1d5db",
                    marginBottom: "8px",
                  }}
                >
                  ✏️ Enter Courier Company Name
                </label>
                <input
                  type="text"
                  value={customCourierName}
                  onChange={(e) => setCustomCourierName(e.target.value)}
                  placeholder="e.g. Daewoo Express, J&T, Sonic Logistics..."
                  autoFocus
                  style={{
                    ...inputStyle,
                    border: customCourierName.trim()
                      ? "1px solid rgba(156,163,175,0.5)"
                      : "1px solid rgba(239,68,68,0.4)",
                  }}
                />
                {customCourierName.trim() && (
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      background: "rgba(156,163,175,0.1)",
                      borderRadius: "8px",
                      border: "1px solid rgba(156,163,175,0.2)",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>🚚</span>
                    <span
                      style={{
                        color: "#d1d5db",
                        fontFamily: "var(--ords-sans)",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    >
                      {customCourierName.trim()}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "0.65rem",
                        color: "#6b7280",
                        fontStyle: "italic",
                      }}
                    >
                      Custom courier
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedCourier && (
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>
              ⏱ Estimated Delivery{" "}
              {!isOthers && "(auto-filled — edit if needed)"}
            </label>
            <input
              type="text"
              value={
                customEstimate ||
                (isOthers ? "" : selectedCourierObj?.days || "")
              }
              onChange={(e) => setCustomEstimate(e.target.value)}
              placeholder="e.g. 2–3 business days"
              style={inputStyle}
            />
          </div>
        )}

        {selectedCourier && (!isOthers || customCourierName.trim()) && (
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>
              📦 Step 3: Tracking Number{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 33UY7896870801000931504"
              style={inputStyle}
            />
            <p
              style={{
                color: "#666",
                fontSize: "0.65rem",
                fontFamily: "var(--ords-sans)",
                margin: "4px 0 0",
              }}
            >
              Customer ke email + WhatsApp mein tracking number show hoga
            </p>
          </div>
        )}

        {selectedCourier && (!isOthers || customCourierName.trim()) && (
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              🔗 Step 4: Courier Tracking Link {!isOthers && "(auto-generated)"}
            </label>
            <input
              type="url"
              value={courierTrackingUrl}
              onChange={(e) => {
                setCourierTrackingUrl(e.target.value);
                setUrlManuallyEdited(true);
              }}
              placeholder={
                isOthers
                  ? "Auto-generated Google search URL"
                  : "Auto-fills when you select courier + tracking number"
              }
              style={inputStyle}
            />
            <p
              style={{
                color: "#666",
                fontSize: "0.65rem",
                fontFamily: "var(--ords-sans)",
                margin: "4px 0 0",
              }}
            >
              {isOthers
                ? "✅ Auto-generates Google search for: [Courier Name] + tracking [Number]"
                : "✅ Auto-generate hota hai — customer is link se direct apna parcel track kar sakta hai"}
            </p>
          </div>
        )}

        {selectedCourier && effectiveCourierName && (
          <div
            style={{
              background: "rgba(218,165,32,0.06)",
              border: "1px solid rgba(218,165,32,0.2)",
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "18px",
            }}
          >
            <p
              style={{
                color: "#daa520",
                fontFamily: "var(--ords-sans)",
                fontSize: "0.7rem",
                fontWeight: 700,
                margin: "0 0 8px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              📋 Shipping Summary
            </p>
            <div
              style={{
                color: "#ccc",
                fontFamily: "var(--ords-sans)",
                fontSize: "clamp(0.7rem, 2.5vw, 0.75rem)",
                lineHeight: 1.8,
              }}
            >
              <div>
                🌍 Country:{" "}
                <strong style={{ color: "#fff" }}>{selectedCountry}</strong>
              </div>
              <div>
                🏢 Courier:{" "}
                <strong style={{ color: "#fff" }}>
                  {effectiveCourierName}
                  {isOthers && (
                    <span
                      style={{
                        color: "#9ca3af",
                        fontWeight: 400,
                        fontSize: "0.65rem",
                        marginLeft: "6px",
                      }}
                    >
                      (Custom)
                    </span>
                  )}
                </strong>
              </div>
              {estimatedDays && (
                <div>
                  ⏱ Estimated:{" "}
                  <strong style={{ color: "#fff" }}>{estimatedDays}</strong>
                </div>
              )}
              {trackingNumber && (
                <div>
                  📦 Tracking:{" "}
                  <strong style={{ color: "#fff" }}>{trackingNumber}</strong>
                </div>
              )}
              {courierTrackingUrl && (
                <div style={{ wordBreak: "break-all" }}>
                  🔗 Track URL:{" "}
                  <strong style={{ color: "#5b9bd5", fontSize: "0.66rem" }}>
                    {courierTrackingUrl}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#888",
              fontFamily: "var(--ords-sans)",
              fontSize: "clamp(0.72rem, 2.5vw, 0.8rem)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!canConfirm) return;
              onConfirm({
                courierCountry: selectedCountry,
                courierName: effectiveCourierName,
                courierKey: isOthers ? "others" : selectedCourier,
                estimatedDays: estimatedDays,
                trackingNumber: trackingNumber,
                courierTrackingUrl: courierTrackingUrl,
              });
            }}
            disabled={!canConfirm}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: canConfirm
                ? "linear-gradient(135deg, #daa520, #b8860b)"
                : "rgba(255,255,255,0.08)",
              color: canConfirm ? "#1a1a1a" : "#555",
              fontFamily: "var(--ords-sans)",
              fontSize: "clamp(0.68rem, 2.5vw, 0.82rem)",
              fontWeight: 700,
              cursor: canConfirm ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {loading
              ? "⏳ Sending..."
              : "🚚 Confirm Shipment & Notify Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderModal({
  order,
  onClose,
  onStatusChange,
  updatingStatus,
  notifResult,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: string, order: Order) => void;
  updatingStatus: boolean;
  notifResult: { whatsapp: boolean | null; email: boolean | null } | null;
}) {
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="ords-modal-overlay" onClick={onClose}>
      <div className="ords-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ords-modal-close" onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="ords-modal-header">
          <div className="ords-modal-badge">Order Details</div>
          <h2 className="ords-modal-title">#{order.order_number}</h2>
          <p className="ords-modal-date">{formatDate(order.created_at)}</p>
        </div>

        {order.status === "shipped" && order.courier_name && (
          <div
            style={{
              margin: "0 0 16px",
              padding: "14px 18px",
              background: "rgba(21,101,192,0.08)",
              border: "1px solid rgba(21,101,192,0.25)",
              borderRadius: "14px",
              fontFamily: "var(--ords-sans)",
            }}
          >
            <p
              style={{
                color: "#5b9bd5",
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 8px",
              }}
            >
              🚚 Shipping Details
            </p>
            <div
              style={{ color: "#ccc", fontSize: "0.78rem", lineHeight: 1.8 }}
            >
              <div>
                🌍{" "}
                <strong style={{ color: "#fff" }}>
                  {order.courier_country}
                </strong>{" "}
                — {order.courier_name}
              </div>
              {order.estimated_days && (
                <div>
                  ⏱ Estimated:{" "}
                  <strong style={{ color: "#daa520" }}>
                    {order.estimated_days}
                  </strong>
                </div>
              )}
              {order.tracking_number && (
                <div>
                  📦 Tracking Number:{" "}
                  <strong
                    style={{
                      color: "#fff",
                      fontFamily: "monospace",
                      fontSize: "0.82rem",
                    }}
                  >
                    {order.tracking_number}
                  </strong>
                </div>
              )}
              {order.courier_tracking_url && (
                <div style={{ marginTop: "4px" }}>
                  🔗{" "}
                  <a
                    href={order.courier_tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#5b9bd5",
                      fontSize: "0.75rem",
                      wordBreak: "break-all",
                    }}
                  >
                    {order.courier_tracking_url}
                  </a>
                </div>
              )}
              {order.shipped_at && (
                <div style={{ color: "#666", fontSize: "0.7rem" }}>
                  Shipped: {formatDate(order.shipped_at)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ords-modal-status-section">
          <p
            style={{
              fontFamily: "var(--ords-sans)",
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ords-text-muted)",
              marginBottom: "0.75rem",
              textAlign: "center",
            }}
          >
            Update Order Status
          </p>

          {updatingStatus && (
            <p
              style={{
                textAlign: "center",
                fontFamily: "var(--ords-sans)",
                fontSize: "0.75rem",
                color: "var(--ords-text-muted)",
                marginBottom: "0.5rem",
              }}
            >
              ⏳ Updating... sending notifications...
            </p>
          )}

          <div className="ords-status-buttons">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                className={`ords-status-btn${order.status === s ? ` active ${s}` : ""}`}
                onClick={() => onStatusChange(order.id, s, order)}
                disabled={updatingStatus || order.status === s}
              >
                {s === "shipped"
                  ? "🚚 Shipped"
                  : s === "delivered"
                    ? "✅ Delivered"
                    : s === "cancelled"
                      ? "❌ Cancelled"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {notifResult && (
            <div style={{ textAlign: "center" }}>
              <NotifBadge
                whatsapp={notifResult.whatsapp}
                email={notifResult.email}
              />
            </div>
          )}

          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--ords-sans)",
              fontSize: "0.65rem",
              color: "var(--ords-text-muted)",
              marginTop: "0.6rem",
              opacity: 0.7,
            }}
          >
            📱 WhatsApp + 📧 Email auto-sent for: Shipped (with courier info),
            Delivered, Cancelled (with reason)
          </p>
        </div>

        <div className="ords-modal-grid">
          <div className="ords-modal-card">
            <h3>Customer</h3>
            <div className="ords-modal-info-row">
              <span className="label">Name</span>
              <span className="value">
                {order.first_name} {order.last_name}
              </span>
            </div>
            <div className="ords-modal-info-row">
              <span className="label">Email</span>
              <span className="value" style={{ wordBreak: "break-all" }}>
                {order.email}
              </span>
            </div>
            <div className="ords-modal-info-row">
              <span className="label">Phone</span>
              <span className="value">{order.phone}</span>
            </div>
          </div>

          <div className="ords-modal-card">
            <h3>Shipping Address</h3>
            <p className="ords-modal-address">
              {order.address}
              {order.apartment && (
                <>
                  <br />
                  {order.apartment}
                </>
              )}
              <br />
              {order.city}, {order.zip}
              <br />
              {order.country}
            </p>
          </div>

          <div className="ords-modal-card">
            <h3>Payment</h3>
            <div className="ords-modal-info-row">
              <span className="label">Subtotal</span>
              <span className="value">{formatPKR(order.subtotal)}</span>
            </div>
            <div className="ords-modal-info-row">
              <span className="label">Shipping</span>
              <span className="value">
                {order.shipping_cost === 0
                  ? "Free"
                  : formatPKR(order.shipping_cost)}
              </span>
            </div>
            <div className="ords-modal-info-row">
              <span className="label">Total</span>
              <span
                className="value payment-paid"
                style={{ fontWeight: 700, fontSize: "0.95rem" }}
              >
                {formatPKR(order.total_amount)}
              </span>
            </div>
            <div className="ords-modal-info-row">
              <span className="label">Status</span>
              <span className={`ords-card-status ${order.status}`}>
                {order.status}
              </span>
            </div>
            {order.payment_method && (
              <div className="ords-modal-info-row">
                <span className="label">Payment via</span>
                <span className="value" style={{ textTransform: "capitalize" }}>
                  {order.payment_method === "card"
                    ? "💳 Credit/Debit Card (Stripe)"
                    : order.payment_method === "paypal"
                      ? "🅿️ PayPal"
                      : order.payment_method}
                </span>
              </div>
            )}
            <a
              href={`https://wa.me/${order.phone.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(order.first_name)}%2C%20regarding%20your%20order%20%23${order.order_number}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                marginTop: "0.75rem",
                padding: "0.4rem 0.8rem",
                background: "rgba(37,211,102,0.12)",
                border: "1px solid rgba(37,211,102,0.3)",
                borderRadius: "40px",
                color: "#16a34a",
                fontFamily: "var(--ords-sans)",
                fontSize: "0.65rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.845L0 24l6.335-1.502A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.37l-.36-.213-3.727.883.936-3.618-.234-.372A9.818 9.818 0 112 12c0 5.42 4.398 9.818 9.818 9.818H12z" />
              </svg>
              WhatsApp Customer
            </a>
          </div>
        </div>

        <div className="ords-modal-items">
          <h3
            style={{
              fontFamily: "var(--ords-serif)",
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "var(--ords-text-primary)",
            }}
          >
            Ordered Items ({items.length})
          </h3>
          {items.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--ords-sans)",
                fontSize: "0.75rem",
                color: "var(--ords-text-muted)",
              }}
            >
              No item data available
            </p>
          ) : (
            <table className="ords-modal-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const ppu = item.pieces_per_unit ?? 1;
                  const itemTotal = item.price * ppu * item.quantity;
                  return (
                    <tr key={idx}>
                      <td data-label="Product">
                        <div className="ords-product-cell">
                          {item.variant_image && (
                            <img
                              src={item.variant_image}
                              alt=""
                              className="ords-product-thumb"
                            />
                          )}
                          <div>
                            <div className="ords-product-name">
                              {item.product_name || "Product"}
                            </div>
                            {item.variant_name &&
                              item.variant_name !== "Standard" && (
                                <div className="ords-product-variant">
                                  {item.variant_name}
                                </div>
                              )}
                            {ppu > 1 && (
                              <div className="ords-product-pieces">
                                {ppu} pieces/unit
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td data-label="Qty">{item.quantity}</td>
                      <td data-label="Price">{formatPKR(item.price)}</td>
                      <td
                        data-label="Total"
                        style={{
                          fontWeight: 600,
                          color: "var(--ords-gold-deep)",
                        }}
                      >
                        {formatPKR(itemTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="ords-modal-summary">
          <div className="ords-summary-row">
            <span>Subtotal</span>
            <span>{formatPKR(order.subtotal)}</span>
          </div>
          <div className="ords-summary-row">
            <span>Shipping</span>
            <span>
              {order.shipping_cost === 0
                ? "Free"
                : formatPKR(order.shipping_cost)}
            </span>
          </div>
          <div className="ords-summary-divider" />
          <div className="ords-summary-row ords-summary-total">
            <span>Total</span>
            <span>{formatPKR(order.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
  const previewItems = items.slice(0, 3);
  const remaining = items.length - previewItems.length;

  return (
    <div className="ords-card" onClick={onClick}>
      <div className="ords-card-header">
        <div className="ords-card-number">
          <span className="ords-card-label">Order Number</span>
          <span className="ords-card-value">#{order.order_number}</span>
        </div>
        <span className={`ords-card-status ${order.status}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      <div className="ords-card-body">
        <div className="ords-card-customer">
          <div className="ords-customer-name">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <strong>
              {order.first_name} {order.last_name}
            </strong>
          </div>
          <div className="ords-customer-email">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 8l10 6 10-6" />
            </svg>
            {order.email}
          </div>
          <div className="ords-customer-phone">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 011 1.18 2 2 0 012.96 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
            </svg>
            {order.phone}
          </div>
        </div>

        <ShippingInfoBadge order={order} />

        <div className="ords-card-items">
          <div className="ords-items-count">
            {items.length} ITEM{items.length !== 1 ? "S" : ""}
          </div>
          <div className="ords-items-preview">
            {previewItems.map((item, i) => (
              <span key={i} className="ords-item-preview">
                {item.product_name || "Product"}
                {item.variant_name && item.variant_name !== "Standard"
                  ? ` (${item.variant_name})`
                  : ""}{" "}
                ×{item.quantity}
              </span>
            ))}
            {remaining > 0 && (
              <span className="ords-item-more">+{remaining} more</span>
            )}
          </div>
        </div>

        <div className="ords-card-total">
          <span className="ords-total-label">Total Amount</span>
          <span className="ords-total-value">
            {formatPKR(order.total_amount)}
          </span>
        </div>

        <div className="ords-card-footer">
          <span className="ords-card-date">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(order.created_at)}
          </span>
          <span
            className="ords-card-payment paid"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              textTransform: "capitalize",
            }}
          >
            {order.payment_method === "paypal"
              ? "🅿️ PayPal"
              : order.payment_method === "card"
                ? "💳 Card"
                : "✅ Paid"}
          </span>
        </div>
      </div>

      <div className="ords-card-actions">
        <button
          className="ords-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          View Full Details →
        </button>
        <a
          href={`https://wa.me/${order.phone.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(order.first_name)}%2C%20regarding%20your%20order%20%23${order.order_number}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            marginTop: "0.5rem",
            padding: "0.5rem",
            background: "rgba(37,211,102,0.08)",
            border: "1px solid rgba(37,211,102,0.25)",
            borderRadius: "40px",
            color: "#16a34a",
            fontFamily: "var(--ords-sans)",
            fontSize: "0.65rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.845L0 24l6.335-1.502A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.37l-.36-.213-3.727.883.936-3.618-.234-.372A9.818 9.818 0 112 12c0 5.42 4.398 9.818 9.818 9.818H12z" />
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifResult, setNotifResult] = useState<{
    whatsapp: boolean | null;
    email: boolean | null;
  } | null>(null);
  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(
    null,
  );
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);

  const addToast = useCallback((type: Toast["type"], msg: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        350,
      );
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) {
        setFetchError(json.error || `HTTP ${res.status}`);
        addToast("error", `Failed to load orders: ${json.error || res.status}`);
      } else {
        setOrders(json.orders || []);
      }
    } catch (err: any) {
      setFetchError(err.message);
      addToast("error", "Network error loading orders");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateOrderLocal = (orderId: string, patch: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)),
    );
    setSelectedOrder((prev) =>
      prev?.id === orderId ? { ...prev, ...patch } : prev,
    );
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: string,
    orderObj?: Order,
  ) => {
    const currentOrder = orderObj || orders.find((o) => o.id === orderId);
    if (currentOrder?.status === newStatus) return;

    if (newStatus === "shipped") {
      setSelectedOrder(null);
      setNotifResult(null);
      setShippingModalOrder(currentOrder || null);
      return;
    }

    if (newStatus === "cancelled") {
      setSelectedOrder(null);
      setCancelModalOrder(currentOrder || null);
      return;
    }

    setUpdatingStatus(true);
    setNotifResult(null);

    try {
      if (["delivered"].includes(newStatus) && currentOrder) {
        const addressParts = [
          currentOrder.address,
          currentOrder.apartment,
          `${currentOrder.city}${currentOrder.zip ? ", " + currentOrder.zip : ""}`,
          currentOrder.country,
        ].filter(Boolean);
        const fullAddress = addressParts.join(", ");

        const res = await fetch("/api/admin/update-order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            status: newStatus,
            customerEmail: currentOrder.email,
            customerPhone: currentOrder.phone,
            customerName:
              `${currentOrder.first_name} ${currentOrder.last_name}`.trim(),
            orderNumber: currentOrder.order_number,
            orderItems: currentOrder.items,
            subtotal: currentOrder.subtotal,
            shippingCost: currentOrder.shipping_cost,
            totalAmount: currentOrder.total_amount,
            shippingAddress: fullAddress,
            paymentMethod: currentOrder.payment_method,
            customerCountry: currentOrder.country,
          }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);

        updateOrderLocal(orderId, { status: newStatus as Order["status"] });
        setNotifResult({
          whatsapp: json.whatsappSent ?? false,
          email: json.emailSent ?? false,
        });
        addToast(
          "success",
          `Status → "${newStatus}" | 📱 WA: ${json.whatsappSent ? "✅" : "❌"} | 📧 Email: ${json.emailSent ? "✅" : "❌"}`,
        );
      } else {
        const res = await fetch("/api/admin/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, status: newStatus }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        updateOrderLocal(orderId, { status: newStatus as Order["status"] });
        addToast("success", `Order status updated to "${newStatus}"`);
      }
    } catch (err: any) {
      addToast("error", err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelWithReason = async (reason: string) => {
    if (!cancelModalOrder) return;
    setUpdatingStatus(true);
    setNotifResult(null);

    try {
      const addressParts = [
        cancelModalOrder.address,
        cancelModalOrder.apartment,
        `${cancelModalOrder.city}${cancelModalOrder.zip ? ", " + cancelModalOrder.zip : ""}`,
        cancelModalOrder.country,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      const res = await fetch("/api/admin/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: cancelModalOrder.id,
          status: "cancelled",
          customerEmail: cancelModalOrder.email,
          customerPhone: cancelModalOrder.phone,
          customerName:
            `${cancelModalOrder.first_name} ${cancelModalOrder.last_name}`.trim(),
          orderNumber: cancelModalOrder.order_number,
          orderItems: cancelModalOrder.items,
          subtotal: cancelModalOrder.subtotal,
          shippingCost: cancelModalOrder.shipping_cost,
          totalAmount: cancelModalOrder.total_amount,
          shippingAddress: fullAddress,
          paymentMethod: cancelModalOrder.payment_method,
          customerCountry: cancelModalOrder.country,
          cancelReason: reason,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      updateOrderLocal(cancelModalOrder.id, {
        status: "cancelled" as Order["status"],
      });
      setNotifResult({
        whatsapp: json.whatsappSent ?? false,
        email: json.emailSent ?? false,
      });
      addToast(
        "success",
        `❌ Order Cancelled! Reason: ${reason.substring(0, 50)}${reason.length > 50 ? "..." : ""} | 📱 WA: ${json.whatsappSent ? "✅" : "❌"} | 📧 Email: ${json.emailSent ? "✅" : "❌"}`,
      );
      setCancelModalOrder(null);
    } catch (err: any) {
      addToast("error", err.message || "Failed to cancel order");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleShippingConfirm = async (data: {
    courierCountry: string;
    courierName: string;
    courierKey: string;
    estimatedDays: string;
    trackingNumber: string;
    courierTrackingUrl: string;
  }) => {
    if (!shippingModalOrder) return;
    setUpdatingStatus(true);
    setNotifResult(null);

    try {
      const addressParts = [
        shippingModalOrder.address,
        shippingModalOrder.apartment,
        `${shippingModalOrder.city}${shippingModalOrder.zip ? ", " + shippingModalOrder.zip : ""}`,
        shippingModalOrder.country,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      const res = await fetch("/api/admin/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: shippingModalOrder.id,
          status: "shipped",
          customerEmail: shippingModalOrder.email,
          customerPhone: shippingModalOrder.phone,
          customerName:
            `${shippingModalOrder.first_name} ${shippingModalOrder.last_name}`.trim(),
          orderNumber: shippingModalOrder.order_number,
          courierName: data.courierName,
          courierCountry: data.courierCountry,
          estimatedDays: data.estimatedDays,
          trackingNumber: data.trackingNumber,
          courierTrackingUrl: data.courierTrackingUrl,
          // ✅ YEH TEENO FIELDS ADD KIYE — image ke liye zaroori hain
          orderItems: shippingModalOrder.items,
          totalAmount: shippingModalOrder.total_amount,
          customerCountry: shippingModalOrder.country,
          shippingAddress: fullAddress,
          paymentMethod: shippingModalOrder.payment_method,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      updateOrderLocal(shippingModalOrder.id, {
        status: "shipped",
        courier_name: data.courierName,
        courier_country: data.courierCountry,
        estimated_days: data.estimatedDays,
        tracking_number: data.trackingNumber,
        courier_tracking_url: data.courierTrackingUrl,
        shipped_at: new Date().toISOString(),
      });

      setNotifResult({
        whatsapp: json.whatsappSent ?? false,
        email: json.emailSent ?? false,
      });
      addToast(
        "success",
        `🚚 Shipped via ${data.courierName}! Tracking: ${data.trackingNumber} | 📱 WA: ${json.whatsappSent ? "✅" : "❌"} | 📧 Email: ${json.emailSent ? "✅" : "❌"}`,
      );
      setShippingModalOrder(null);
    } catch (err: any) {
      addToast("error", err.message || "Failed to update shipping");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filtered = orders.filter((order) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !search ||
      order.order_number.toLowerCase().includes(s) ||
      order.first_name.toLowerCase().includes(s) ||
      order.last_name.toLowerCase().includes(s) ||
      order.email.toLowerCase().includes(s) ||
      order.phone.includes(search) ||
      order.city.toLowerCase().includes(s);
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    const matchesDate = !dateFilter || order.created_at.startsWith(dateFilter);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;

  return (
    <div className="ords-root">
      <div className="ords-ambient" />
      <div className="ords-grain" />

      <PanelNavbar />

      <div className="ords-content">
        <div className="ords-page-header">
          <p className="ords-eyebrow">
            <span className="ords-ey-line" />
            Admin Panel
            <span className="ords-ey-line" />
          </p>
          <h1 className="ords-page-title">
            Customer <em>Orders</em>
          </h1>
          <p className="ords-page-sub">
            All orders placed by customers — manage, track, and update status
          </p>
        </div>

        <div className="ords-stats-grid">
          <div className="ords-stat-card">
            <div className="ords-stat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                <path d="M16 3H8l-2 4h12l-2-4z" />
              </svg>
            </div>
            <div className="ords-stat-value">{totalOrders}</div>
            <div className="ords-stat-label">Total Orders</div>
          </div>
          <div className="ords-stat-card">
            <div className="ords-stat-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <div
              className="ords-stat-value"
              style={{ fontSize: "clamp(1rem, 4vw, 1.4rem)" }}
            >
              {formatPKR(totalRevenue)}
            </div>
            <div className="ords-stat-label">Total Revenue</div>
          </div>
          <div className="ords-stat-card">
            <div
              className="ords-stat-icon"
              style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="ords-stat-value">{pendingCount}</div>
            <div className="ords-stat-label">Pending Orders</div>
          </div>
          <div className="ords-stat-card">
            <div
              className="ords-stat-icon"
              style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="ords-stat-value">{deliveredCount}</div>
            <div className="ords-stat-label">Delivered</div>
          </div>
          <div className="ords-stat-card">
            <div
              className="ords-stat-icon"
              style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 5v3h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="ords-stat-value">{shippedCount}</div>
            <div className="ords-stat-label">Shipped</div>
          </div>
          <div className="ords-stat-card">
            <div
              className="ords-stat-icon"
              style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="ords-stat-value">{cancelledCount}</div>
            <div className="ords-stat-label">Cancelled</div>
          </div>
        </div>

        {fetchError && (
          <div className="ords-error-banner">
            <strong>⚠️ Error loading orders:</strong> {fetchError}
          </div>
        )}

        <div className="ords-filters-section">
          <div className="ords-search-bar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, phone, order number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="ords-clear-search"
                onClick={() => setSearch("")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="ords-filter-buttons">
            {["all", ...STATUS_OPTIONS].map((s) => (
              <button
                key={s}
                className={`ords-filter-btn${statusFilter === s ? " active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="ords-date-filter">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                className="ords-clear-date"
                onClick={() => setDateFilter("")}
              >
                Clear
              </button>
            )}
          </div>

          <button
            className="ords-filter-btn"
            onClick={fetchOrders}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="14"
              height="14"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {(search || statusFilter !== "all" || dateFilter) && (
          <p
            style={{
              fontFamily: "var(--ords-sans)",
              fontSize: "0.75rem",
              color: "var(--ords-text-muted)",
              marginBottom: "1.5rem",
            }}
          >
            Showing <strong>{filtered.length}</strong> of {totalOrders} orders
          </p>
        )}

        {loading ? (
          <div className="ords-loading">
            <div className="ords-spinner" />
            <p
              style={{
                fontFamily: "var(--ords-sans)",
                fontSize: "0.8rem",
                color: "var(--ords-text-muted)",
                marginTop: "1rem",
              }}
            >
              Loading all orders…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ords-empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path d="M16 3H8l-2 4h12l-2-4z" />
            </svg>
            <h3>
              {orders.length === 0 ? "No Orders Yet" : "No Matching Orders"}
            </h3>
            <p>
              {orders.length === 0
                ? "When customers place orders, they will appear here."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="ords-grid">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => {
                  setSelectedOrder(order);
                  setNotifResult(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => {
            setSelectedOrder(null);
            setNotifResult(null);
          }}
          onStatusChange={handleStatusChange}
          updatingStatus={updatingStatus}
          notifResult={notifResult}
        />
      )}

      {shippingModalOrder && (
        <ShippingModal
          order={shippingModalOrder}
          onClose={() => setShippingModalOrder(null)}
          onConfirm={handleShippingConfirm}
          loading={updatingStatus}
        />
      )}

      {cancelModalOrder && (
        <CancelReasonModal
          order={cancelModalOrder}
          onClose={() => setCancelModalOrder(null)}
          onConfirm={handleCancelWithReason}
          loading={updatingStatus}
        />
      )}

      <ToastBar toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
