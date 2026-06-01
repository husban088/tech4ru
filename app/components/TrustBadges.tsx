"use client";

import "./TrustBadges.css";

interface TrustBadgesProps {
  className?: string;
}

export default function TrustBadges({ className = "" }: TrustBadgesProps) {
  const trustItems = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
      label: "Secure Payment",
      description: "256-bit SSL encryption",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 12h-4V8" />
        </svg>
      ),
      label: "30-Day Returns",
      description: "Money back guarantee",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      label: "100% Authentic",
      description: "Verified products only",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      ),
      label: "24/7 Support",
      description: "Live chat & email",
    },
  ];

  return (
    <section className={`pd-trust-section ${className}`}>
      <div className="pd-trust-grid">
        {trustItems.map((item, index) => (
          <div key={index} className="pd-trust-item">
            <div className="pd-trust-icon">{item.icon}</div>
            <span className="pd-trust-label">{item.label}</span>
            <span className="pd-trust-desc">{item.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
