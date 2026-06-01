"use client";

import { useState, useEffect } from "react";
import "./EstimatedDelivery.css";

/* ═══════════════════════════════════════════
   DATE UTILITIES FOR ESTIMATED DELIVERY
═══════════════════════════════════════════ */

function getEstimatedDates(): {
  readyFrom: Date;
  readyTo: Date;
  deliveryFrom: Date;
  deliveryTo: Date;
} {
  const today = new Date();
  const readyFrom = new Date(today);
  readyFrom.setDate(today.getDate() + 2);
  const readyTo = new Date(today);
  readyTo.setDate(today.getDate() + 3);
  const deliveryFrom = new Date(today);
  deliveryFrom.setDate(today.getDate() + 6);
  const deliveryTo = new Date(today);
  deliveryTo.setDate(today.getDate() + 11);
  return { readyFrom, readyTo, deliveryFrom, deliveryTo };
}

function formatDateRange(start: Date, end: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (start.getMonth() === end.getMonth()) {
    return `${months[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${months[start.getMonth()]} ${start.getDate()} - ${
    months[end.getMonth()]
  } ${end.getDate()}`;
}

interface EstimatedDeliveryProps {
  className?: string;
}

export default function EstimatedDelivery({
  className = "",
}: EstimatedDeliveryProps) {
  const [estimatedDates, setEstimatedDates] = useState<{
    readyFrom: Date;
    readyTo: Date;
    deliveryFrom: Date;
    deliveryTo: Date;
  } | null>(null);

  useEffect(() => {
    setEstimatedDates(getEstimatedDates());
  }, []);

  if (!estimatedDates) {
    return (
      <section className={`pd-delivery-section ${className}`}>
        <div className="pd-delivery-skeleton">
          <div
            className="pd-skel-delivery-line"
            style={{ width: "60%", height: "20px" }}
          ></div>
          <div
            className="pd-skel-delivery-line"
            style={{ width: "80%", height: "15px", marginTop: "10px" }}
          ></div>
        </div>
      </section>
    );
  }

  return (
    <section className={`pd-delivery-section ${className}`}>
      {/* Ambient aqua orbs */}
      <div className="pd-delivery-orb" aria-hidden="true" />
      <div className="pd-delivery-orb-left" aria-hidden="true" />

      <div className="pd-delivery-header">
        <div className="pd-delivery-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <h3 className="pd-delivery-title">Estimated Delivery</h3>
          <p className="pd-delivery-sub">
            Order processing & shipping timeline
          </p>
        </div>
      </div>

      <div className="pd-delivery-timeline">
        <div className="pd-timeline-node">
          <div className="pd-timeline-dot" />
          <span className="pd-timeline-label">Order</span>
          <span className="pd-timeline-date">Today</span>
        </div>
        <div className="pd-timeline-line" />
        <div className="pd-timeline-node">
          <div className="pd-timeline-dot" />
          <span className="pd-timeline-label">Ready</span>
          <span className="pd-timeline-date">
            {formatDateRange(estimatedDates.readyFrom, estimatedDates.readyTo)}
          </span>
        </div>
        <div className="pd-timeline-line" />
        <div className="pd-timeline-node">
          <div className="pd-timeline-dot" />
          <span className="pd-timeline-label">Deliver</span>
          <span className="pd-timeline-date">
            {formatDateRange(
              estimatedDates.deliveryFrom,
              estimatedDates.deliveryTo,
            )}
          </span>
        </div>
      </div>

      <div className="pd-delivery-row">
        <span className="pd-delivery-row-label">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Processing Time
        </span>
        <span className="pd-delivery-row-value">2-3 business days</span>
      </div>

      <div className="pd-delivery-row">
        <span className="pd-delivery-row-label">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 12h-4l-3 9-4-18-3 9H2" />
          </svg>
          Shipping Time
        </span>
        <span className="pd-delivery-row-value">4-8 business days</span>
      </div>

      <div className="pd-delivery-status">
        {/* <span className="pd-delivery-status-text">
          {deliveryStatus.icon}
          {deliveryStatus.text}
        </span> */}
        <span className="pd-delivery-urgency">
          Free Delivery on All Orders – No Minimum Required
        </span>
      </div>
    </section>
  );
}
