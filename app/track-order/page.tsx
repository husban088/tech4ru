// app/track-order/page.tsx
// ✅ Customer apna order number + email se track kar sakta hai
// ✅ Complete order details (checkout form + cart items) show hote hain
// ✅ Live tracking timeline (shipped_at + estimated_days se build hoti hai)
// ✅ Direct courier website ka link bhi milta hai
// ✅ FULLY RESPONSIVE - Luxury Design

"use client";

import { useState, useEffect } from "react";
import "./track-order.css";

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

interface TrackingCheckpoint {
  date: string;
  location: string;
  status: string;
  message: string;
  tag: string;
}

interface Order {
  id: string;
  order_number: string;
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
  live_tracking_data?: {
    checkpoints?: TrackingCheckpoint[];
    delivered?: boolean;
    tracking_url?: string;
  };
}

interface LiveTracking {
  tracking_number: string;
  courier: string;
  delivered: boolean;
  estimated_delivery: string;
  last_updated: string;
  status_message: string;
  checkpoints: TrackingCheckpoint[];
  tracking_url: string;
  used_api: boolean;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: string; className: string }
> = {
  pending: { label: "Pending", icon: "⏳", className: "pending" },
  processing: { label: "Processing", icon: "⚙️", className: "processing" },
  confirmed: { label: "Confirmed", icon: "✅", className: "confirmed" },
  shipped: { label: "Shipped", icon: "🚚", className: "shipped" },
  delivered: { label: "Delivered", icon: "📦", className: "delivered" },
  cancelled: { label: "Cancelled", icon: "❌", className: "cancelled" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPKR(amount: number) {
  return "PKR " + Number(amount).toLocaleString("en-PK");
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [liveTracking, setLiveTracking] = useState<LiveTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleTrack() {
    const num = orderNumber.trim().toUpperCase();
    const em = email.trim().toLowerCase();

    if (!num || !em) {
      setError("Please enter both order number and email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);
    setLiveTracking(null);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/track-order?order_number=${encodeURIComponent(num)}&email=${encodeURIComponent(em)}`,
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }

      if (!json.order) {
        setError(
          "No order found with this order number and email. Please check your details and try again.",
        );
        return;
      }

      setOrder(json.order);

      if (json.order.tracking_number && json.order.courier_name) {
        fetchLiveTracking(
          json.order.tracking_number,
          json.order.courier_name,
          json.order.id,
        );
      }
    } catch (err: any) {
      setError("Network error. Please check your connection and try again.");
      console.error("[TrackOrder] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLiveTracking(
    trackingNum: string,
    courierName: string,
    orderId: string,
  ) {
    setTrackingLoading(true);
    try {
      const res = await fetch(
        `/api/track-live?tracking=${encodeURIComponent(trackingNum)}&courier=${encodeURIComponent(courierName)}&orderId=${encodeURIComponent(orderId)}`,
      );
      const json = await res.json();

      if (res.ok && json.checkpoints) {
        setLiveTracking(json);
      }
    } catch (err) {
      console.error("[TrackOrder] Live tracking error:", err);
    } finally {
      setTrackingLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleTrack();
  }

  const statusCfg = order
    ? STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
    : null;

  return (
    <div className="trk-root">
      {/* Background Effects */}
      <div className="trk-bg-grain"></div>
      <div className="trk-bg-glow"></div>

      {/* Topbar */}
      <div className="trk-topbar">
        <a href="/" className="trk-back-link">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Home
        </a>
        <div className="trk-brand">TECH4U</div>
      </div>

      <div className="trk-container">
        {/* Header */}
        <div className="trk-header">
          <div className="trk-header-icon">
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
          <h1 className="trk-title">Track Your Order</h1>
          <p className="trk-subtitle">
            Enter your order number and email to see real-time updates
          </p>
        </div>

        {/* Search Card */}
        <div className="trk-search-card">
          <div className="trk-search-grid">
            <div className="trk-field">
              <label className="trk-label">Order Number</label>
              <div className="trk-input-wrap">
                <svg
                  className="trk-input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M9 12h6M7 3v3M17 3v3" strokeLinecap="round" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                </svg>
                <input
                  type="text"
                  placeholder="e.g. ORD-ABC123"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="trk-input"
                />
              </div>
            </div>
            <div className="trk-field">
              <label className="trk-label">Email Address</label>
              <div className="trk-input-wrap">
                <svg
                  className="trk-input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="trk-input"
                />
              </div>
            </div>
          </div>
          <button onClick={handleTrack} disabled={loading} className="trk-btn">
            {loading ? (
              <>
                <span className="trk-btn-spinner"></span>
                Searching...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                Track Order
              </>
            )}
          </button>

          {error && (
            <div className="trk-error">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {!searched && (
            <div className="trk-tip">
              💡 Your order number is in your confirmation email — it looks like{" "}
              <strong>ORD-XXXX</strong>
            </div>
          )}
        </div>

        {/* Order Results */}
        {order && statusCfg && (
          <div className="trk-result">
            {/* Header Card */}
            <div className="trk-result-header">
              <div>
                <div className="trk-result-label">Order Number</div>
                <div className="trk-result-num">#{order.order_number}</div>
                <div className="trk-result-date">
                  Placed on {formatDate(order.created_at)}
                </div>
              </div>
              <div className="trk-result-right">
                <div className={`trk-status-badge ${statusCfg.className}`}>
                  {statusCfg.icon} {statusCfg.label}
                </div>
                {order.courier_country && (
                  <div className="trk-country-badge">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="14"
                      height="14"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    {order.courier_country}
                  </div>
                )}
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="trk-two-col">
              {/* Left Column */}
              <div className="trk-left-col">
                {/* Order Summary */}
                <div className="trk-section">
                  <h3 className="trk-section-title">📋 Order Summary</h3>
                  <div className="trk-section-body">
                    <div className="trk-row">
                      <span>Order Number</span>
                      <span>#{order.order_number}</span>
                    </div>
                    <div className="trk-row">
                      <span>Placed On</span>
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    <div className="trk-row">
                      <span>Payment Method</span>
                      <span>{order.payment_method || "N/A"}</span>
                    </div>
                    <div className="trk-row">
                      <span>Order Status</span>
                      <span
                        className={`trk-status-text ${statusCfg.className}`}
                      >
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="trk-section">
                  <h3 className="trk-section-title">👤 Customer Details</h3>
                  <div className="trk-section-body">
                    <div className="trk-row">
                      <span>Name</span>
                      <span>
                        {order.first_name} {order.last_name}
                      </span>
                    </div>
                    <div className="trk-row">
                      <span>Email</span>
                      <span>{order.email}</span>
                    </div>
                    <div className="trk-row">
                      <span>Phone</span>
                      <span>{order.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="trk-section">
                  <h3 className="trk-section-title">📍 Shipping Address</h3>
                  <div className="trk-section-body">
                    <div className="trk-row">
                      <span>Address</span>
                      <span>{order.address}</span>
                    </div>
                    {order.apartment && (
                      <div className="trk-row">
                        <span>Apt/Suite</span>
                        <span>{order.apartment}</span>
                      </div>
                    )}
                    <div className="trk-row">
                      <span>City</span>
                      <span>{order.city}</span>
                    </div>
                    <div className="trk-row">
                      <span>ZIP/Postal</span>
                      <span>{order.zip}</span>
                    </div>
                    <div className="trk-row">
                      <span>Country</span>
                      <span>{order.country}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Details */}
                {order.courier_name && (
                  <div className="trk-section">
                    <h3 className="trk-section-title">🚚 Shipping Details</h3>
                    <div className="trk-section-body">
                      <div className="trk-row">
                        <span>Courier</span>
                        <span>{order.courier_name}</span>
                      </div>
                      {order.courier_country && (
                        <div className="trk-row">
                          <span>Ship To</span>
                          <span>{order.courier_country}</span>
                        </div>
                      )}
                      {order.tracking_number && (
                        <div className="trk-row">
                          <span>Tracking #</span>
                          <span className="trk-tracking-number">
                            {order.tracking_number}
                          </span>
                        </div>
                      )}
                      {order.estimated_days && (
                        <div className="trk-row">
                          <span>Est. Delivery</span>
                          <span>{order.estimated_days}</span>
                        </div>
                      )}
                      {order.shipped_at && (
                        <div className="trk-row">
                          <span>Shipped At</span>
                          <span>{formatDate(order.shipped_at)}</span>
                        </div>
                      )}
                      {order.courier_tracking_url && order.tracking_number && (
                        <a
                          href={order.courier_tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="trk-courier-link"
                        >
                          🔗 Track on {order.courier_name} website →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="trk-right-col">
                {/* Order Items */}
                <div className="trk-section">
                  <h3 className="trk-section-title">🛒 Your Items</h3>
                  <div className="trk-section-body">
                    {order.items && order.items.length > 0 ? (
                      <>
                        {order.items.map((item, i) => (
                          <div key={i} className="trk-item">
                            {item.variant_image && (
                              <div className="trk-item-image">
                                <img
                                  src={item.variant_image}
                                  alt={item.product_name || "Product"}
                                />
                              </div>
                            )}
                            <div className="trk-item-info">
                              <div className="trk-item-name">
                                {item.product_name || "Product"}
                              </div>
                              {item.variant_name && (
                                <div className="trk-item-variant">
                                  {item.variant_name}
                                </div>
                              )}
                              {item.pieces_per_unit &&
                                item.pieces_per_unit > 1 && (
                                  <div className="trk-item-variant">
                                    {item.pieces_per_unit} pieces/unit
                                  </div>
                                )}
                              <div className="trk-item-meta">
                                <span>Qty: {item.quantity}</span>
                                <span className="trk-item-price">
                                  {formatPKR(item.price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="trk-price-breakdown">
                          <div className="trk-price-row">
                            <span>Subtotal</span>
                            <span>{formatPKR(order.subtotal)}</span>
                          </div>
                          <div className="trk-price-row">
                            <span>Shipping</span>
                            <span>
                              {order.shipping_cost > 0
                                ? formatPKR(order.shipping_cost)
                                : "Free"}
                            </span>
                          </div>
                          <div className="trk-price-total">
                            <span>Total</span>
                            <span>{formatPKR(order.total_amount)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="trk-empty-text">No items found.</p>
                    )}
                  </div>
                </div>

                {/* Live Tracking Timeline */}
                {(order.status === "shipped" || order.status === "delivered") &&
                  order.tracking_number && (
                    <div className="trk-section">
                      <h3 className="trk-section-title">
                        📡 Live Tracking Timeline
                      </h3>
                      <div className="trk-section-body">
                        {trackingLoading ? (
                          <div className="trk-tracking-loading">
                            <span className="trk-spinner-small"></span>
                            <span>Fetching live tracking...</span>
                          </div>
                        ) : liveTracking ? (
                          <LiveTrackingView tracking={liveTracking} />
                        ) : (
                          <p className="trk-empty-text">
                            Tracking information not available yet. Please check
                            back soon.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Tracking View Component ─────────────────────────────────────────────

function LiveTrackingView({ tracking }: { tracking: LiveTracking }) {
  return (
    <div>
      <div className="trk-tracking-status">
        <div>
          <div className="trk-tracking-status-label">Current Status</div>
          <div
            className={`trk-tracking-status-value ${tracking.delivered ? "delivered" : "shipped"}`}
          >
            {tracking.delivered
              ? "📦 Delivered"
              : `🚚 ${tracking.status_message}`}
          </div>
        </div>
        <div className="trk-tracking-status-right">
          <div className="trk-tracking-status-label">Est. Delivery</div>
          <div className="trk-tracking-status-date">
            {formatDateShort(tracking.estimated_delivery)}
          </div>
        </div>
      </div>

      {tracking.tracking_url && (
        <a
          href={tracking.tracking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="trk-track-live-btn"
        >
          🔗 Open Live Tracking on {tracking.courier} →
        </a>
      )}

      <div className="trk-timeline">
        {tracking.checkpoints.map((cp, i) => {
          const isFirst = i === 0;
          const isDelivered = cp.tag === "Delivered";
          return (
            <div key={i} className="trk-timeline-item">
              {i < tracking.checkpoints.length - 1 && (
                <div className="trk-timeline-line"></div>
              )}
              <div
                className={`trk-timeline-dot ${isDelivered ? "delivered" : isFirst ? "active" : ""}`}
              ></div>
              <div className="trk-timeline-content">
                <div className="trk-timeline-status">{cp.status}</div>
                <div className="trk-timeline-msg">{cp.message}</div>
                <div className="trk-timeline-date">
                  📍 {cp.location} · {formatDate(cp.date)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="trk-last-updated">
        Last updated: {formatDate(tracking.last_updated)}
      </p>
    </div>
  );
}
