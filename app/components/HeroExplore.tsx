"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "./hero-explore.css";

const images = [
  {
    src: "/hero2.png",
    alt: "Luxury Men's Watch",
    label: "Timepieces",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="8" />
        <polyline points="12 6 12 12 16 14" />
        <path d="M9 2h6M9 22h6" />
      </svg>
    ),
  },
  {
    src: "/hero1.png",
    alt: "Tech Accessories",
    label: "Tech",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    src: "/hero4.png",
    alt: "Home Décor",
    label: "Décor",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    src: "/hero3.png",
    alt: "Women's Watch",
    label: "Elegance",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export default function HeroExplore() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      section.classList.add("he-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add("he-visible");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(section);

    const fallback = setTimeout(() => {
      section.classList.add("he-visible");
    }, 800);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="he-section"
      aria-label="Explore Aurexia"
    >
      {/* WATERMARK */}
      <div className="he-watermark" aria-hidden="true">
        TECH4U
      </div>

      <div className="he-grain" aria-hidden="true" />
      <div className="he-bg-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="he-top-accent" aria-hidden="true" />
      <div className="he-bottom-accent" aria-hidden="true" />

      <div className="he-container">
        {/* LEFT SIDE */}
        <div className="he-left">
          <div className="he-eyebrow-row">
            <span className="he-eyebrow-dot" aria-hidden="true" />
            <span className="he-eyebrow">Luxury Collections</span>
            <div className="he-eyebrow-line" />
          </div>

          <h2 className="he-heading">
            Luxury Tech
            <br />
            <em>&amp; Lifestyle</em>
            <br />
            <span className="he-heading-accent">Essentials</span>
          </h2>

          <div className="he-divider" aria-hidden="true">
            <span className="he-divider-line" />
            <span className="he-divider-diamond" />
            <span className="he-divider-line he-divider-line--short" />
          </div>

          <p className="he-para">
            Discover premium watches, automotive accessories, home décor, and
            modern tech essentials designed for style, performance, and everyday
            living.
          </p>

          <Link href="/accessories" className="he-btn" aria-label="Shop Now">
            <span className="he-btn-text">Shop Now</span>
            <span className="he-btn-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="he-btn-glow" aria-hidden="true" />
          </Link>

          <div className="he-stats">
            <div className="he-stat">
              <span className="he-stat-num">
                500<span className="he-stat-plus">+</span>
              </span>
              <span className="he-stat-label">Products</span>
            </div>
            <div className="he-stat-divider" />
            <div className="he-stat">
              <span className="he-stat-num">
                50<span className="he-stat-plus">k+</span>
              </span>
              <span className="he-stat-label">Customers</span>
            </div>
            <div className="he-stat-divider" />
            <div className="he-stat">
              <span className="he-stat-num">
                4<span className="he-stat-star">.9★</span>
              </span>
              <span className="he-stat-label">Rating</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — 4 Images Grid */}
        <div className="he-right">
          <div
            className="he-grid-corner he-grid-corner--tl"
            aria-hidden="true"
          />
          <div
            className="he-grid-corner he-grid-corner--br"
            aria-hidden="true"
          />

          <div className="he-grid">
            {images.map((img, i) => (
              <div
                key={i}
                className="he-img-card"
                style={{ "--delay": `${i * 0.12}s` } as React.CSSProperties}
              >
                <div className="he-img-shimmer" aria-hidden="true" />
                <div className="he-img-wrap">
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="he-img"
                    loading={i < 2 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    decoding="auto"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = "0";
                    }}
                  />
                </div>
                <div className="he-img-overlay" aria-hidden="true" />

                {/* NAME BOX at bottom */}
                <div className="he-img-namebox">
                  <span className="he-img-namebox-icon">{img.icon}</span>
                  <span className="he-img-namebox-text">{img.label}</span>
                </div>

                <div className="he-img-bar" aria-hidden="true" />
              </div>
            ))}
          </div>

          <div className="he-ring" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
