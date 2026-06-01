"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchSaleFromDB, listenToSaleChanges } from "@/lib/saleStore";

export default function SaleBannerPopup() {
  const [visible, setVisible] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user already closed banner in this session (run first)
  useEffect(() => {
    const wasClosed = sessionStorage.getItem("sale_banner_closed");
    if (wasClosed === "true") {
      setHasClosed(true);
    }
  }, []);

  // Fetch from DB on mount and listen for changes
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Always fetch fresh from DB — never trust localStorage
    fetchSaleFromDB().then(
      ({ percent: activePercent, bannerEnabled: enabled }) => {
        setPercent(activePercent);
        setBannerEnabled(enabled);
        setLoading(false);

        const wasClosed =
          sessionStorage.getItem("sale_banner_closed") === "true";
        if (activePercent && enabled && !wasClosed) {
          timer = setTimeout(() => setVisible(true), 400);
        }
      },
    );

    // Listen for real-time changes (admin panel toggle kare toh)
    const unsubscribe = listenToSaleChanges(
      ({ percent: newPercent, bannerEnabled: enabled }) => {
        setPercent(newPercent);
        setBannerEnabled(enabled);

        const wasClosed =
          sessionStorage.getItem("sale_banner_closed") === "true";
        if (newPercent && enabled && !wasClosed) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      },
    );

    // Cross-tab: custom event
    const handleCustomEvent = (e: CustomEvent) => {
      const { percent: newPercent, bannerEnabled: enabled } = e.detail;
      setPercent(newPercent);
      setBannerEnabled(enabled);

      const wasClosed = sessionStorage.getItem("sale_banner_closed") === "true";
      if (newPercent && enabled && !wasClosed) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener(
      "saleDataChanged",
      handleCustomEvent as EventListener,
    );

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      window.removeEventListener(
        "saleDataChanged",
        handleCustomEvent as EventListener,
      );
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setHasClosed(true);
    sessionStorage.setItem("sale_banner_closed", "true");
  }, []);

  // Don't render while loading, or if no sale, or banner disabled, or user closed it
  if (loading) return null;
  if (!percent) return null;
  if (!bannerEnabled) return null;

  const imageSrc = `/sale-banner-${percent}.png`;

  return (
    <>
      <style>{`
        .sb-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.80);
          backdrop-filter: blur(5px);
          z-index: 9998;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .sb-overlay.sb-visible {
          opacity: 1;
          pointer-events: auto;
        }

        .sb-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          z-index: 9999;
          transform: translate(-50%, -50%) scale(0.88);
          opacity: 0;
          transition: opacity 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                      transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          pointer-events: none;
          width: min(92vw, 680px);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.88),
                      0 0 0 1px rgba(218, 165, 32, 0.18);
        }
        .sb-popup.sb-visible {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
          pointer-events: auto;
        }

        .sb-img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 14px;
          background: #0a0a0a;
        }

        .sb-close {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10000;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(6px);
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .sb-close:hover {
          background: rgba(218, 165, 32, 0.75);
          transform: scale(1.08);
        }

        @media (max-width: 480px) {
          .sb-popup {
            width: 96vw;
            border-radius: 10px;
          }
          .sb-img {
            border-radius: 10px;
          }
        }

        @media (max-height: 600px) {
          .sb-img {
            max-height: 80vh;
          }
        }
      `}</style>

      <div
        className={`sb-overlay${visible ? " sb-visible" : ""}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`sb-popup${visible ? " sb-visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${percent}% Sale Banner`}
      >
        <button
          className="sb-close"
          onClick={handleClose}
          aria-label="Close banner"
        >
          ✕
        </button>

        <img
          src={imageSrc}
          alt={`${percent}% OFF Sale - Limited Time Offer`}
          className="sb-img"
          draggable={false}
        />
      </div>
    </>
  );
}
