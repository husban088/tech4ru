// app/panel/coupons/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCouponStore } from "@/lib/couponStore";
import "./coupons-panel.css";

export default function CouponsPanel() {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    coupon10Enabled,
    coupon20Enabled,
    settingsLoading,
    fetchCouponSettings,
    updateCouponSettings,
  } = useCouponStore();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [local10Enabled, setLocal10Enabled] = useState(false);
  const [local20Enabled, setLocal20Enabled] = useState(false);

  // Load settings on mount
  useEffect(() => {
    fetchCouponSettings();
  }, [fetchCouponSettings]);

  // Update local state when store changes
  useEffect(() => {
    setLocal10Enabled(coupon10Enabled);
    setLocal20Enabled(coupon20Enabled);
  }, [coupon10Enabled, coupon20Enabled]);

  const handleSave = async () => {
    setSaving(true);
    const success = await updateCouponSettings(local10Enabled, local20Enabled);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert("Failed to save coupon settings. Please try again.");
    }
    setSaving(false);
  };

  // ✅ Handle close - navigate back to panel dashboard
  const handleClose = () => {
    router.push("/panel");
  };

  // ✅ Handle escape key press
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, []);

  // ✅ Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (!settingsLoading) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [settingsLoading]);

  if (settingsLoading) {
    return (
      <div className="coupons-panel-loader">
        <div className="loader-spinner"></div>
        <div className="loader-text">Loading coupon settings...</div>
      </div>
    );
  }

  return (
    <div className="coupons-panel-overlay">
      <div className="coupons-panel-container" ref={modalRef}>
        {/* ✅ Close button - Top right corner */}
        <button
          className="coupons-panel-close-btn"
          onClick={handleClose}
          aria-label="Close panel"
          title="Close (Esc)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <path
              d="M18 6L6 18M6 6l12 12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="coupons-panel-card">
          <div className="coupons-panel-header">
            <h1 className="coupons-panel-title">🎫 Coupon Code Manager</h1>
            <p className="coupons-panel-description">
              Enable or disable coupon codes. Only enabled coupons will work for
              customers.
            </p>
          </div>

          <div className="coupons-grid">
            {/* Coupon 10% */}
            <div
              className={`coupon-card ${local10Enabled ? "coupon-card--active" : "coupon-card--inactive"}`}
            >
              <div className="coupon-card-header">
                <div className="coupon-code-badge">DISC4U10</div>
                <div className="coupon-discount-badge">10% OFF</div>
              </div>

              <div className="coupon-card-body">
                <p className="coupon-description">
                  Give customers 10% discount on their entire order.
                </p>

                <div className="coupon-toggle-wrapper">
                  <label className="coupon-toggle-switch">
                    <input
                      type="checkbox"
                      checked={local10Enabled}
                      onChange={(e) => setLocal10Enabled(e.target.checked)}
                      disabled={saving}
                    />
                    <span className="coupon-toggle-slider"></span>
                    <span className="coupon-toggle-label">
                      {local10Enabled ? "✅ Enabled" : "❌ Disabled"}
                    </span>
                  </label>
                </div>

                {local10Enabled && (
                  <div className="coupon-status active">
                    <span className="status-icon">✓</span>
                    <span>Customers can use DISC4U10 for 10% off</span>
                  </div>
                )}
                {!local10Enabled && (
                  <div className="coupon-status inactive">
                    <span className="status-icon">✗</span>
                    <span>DISC4U10 is currently disabled</span>
                  </div>
                )}
              </div>
            </div>

            {/* Coupon 20% */}
            <div
              className={`coupon-card ${local20Enabled ? "coupon-card--active" : "coupon-card--inactive"}`}
            >
              <div className="coupon-card-header">
                <div className="coupon-code-badge">DISC4U20</div>
                <div className="coupon-discount-badge">20% OFF</div>
              </div>

              <div className="coupon-card-body">
                <p className="coupon-description">
                  Give customers 20% discount on their entire order.
                </p>

                <div className="coupon-toggle-wrapper">
                  <label className="coupon-toggle-switch">
                    <input
                      type="checkbox"
                      checked={local20Enabled}
                      onChange={(e) => setLocal20Enabled(e.target.checked)}
                      disabled={saving}
                    />
                    <span className="coupon-toggle-slider"></span>
                    <span className="coupon-toggle-label">
                      {local20Enabled ? "✅ Enabled" : "❌ Disabled"}
                    </span>
                  </label>
                </div>

                {local20Enabled && (
                  <div className="coupon-status active">
                    <span className="status-icon">✓</span>
                    <span>Customers can use DISC4U20 for 20% off</span>
                  </div>
                )}
                {!local20Enabled && (
                  <div className="coupon-status inactive">
                    <span className="status-icon">✗</span>
                    <span>DISC4U20 is currently disabled</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="coupons-panel-actions">
            <button
              onClick={handleSave}
              disabled={saving}
              className="save-button"
            >
              {saving ? (
                <>
                  <span className="save-spinner"></span>
                  Saving...
                </>
              ) : (
                "💾 Save Changes"
              )}
            </button>

            {/* ✅ Cancel/Close button */}
            <button onClick={handleClose} className="cancel-button">
              ✕ Cancel
            </button>
          </div>

          {saved && (
            <div className="success-message">
              <div className="success-message-main">
                ✓ Coupon settings saved successfully!
              </div>
              <div className="success-message-sub">
                {local10Enabled && "DISC4U10 (10% OFF) is enabled. "}
                {local20Enabled && "DISC4U20 (20% OFF) is enabled. "}
                {!local10Enabled &&
                  !local20Enabled &&
                  "All coupons are disabled."}
              </div>
            </div>
          )}

          <div className="info-note">
            <div className="info-icon">ℹ️</div>
            <div className="info-text">
              <strong>How it works:</strong>
              <br />
              • Enable a coupon code to make it active for customers
              <br />
              • Disabled coupons will show "not active" message when customers
              try to use them
              <br />
              • Changes apply immediately for all users
              <br />• Customers enter codes exactly as shown: DISC4U10 or
              DISC4U20
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
