"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "./hero-explore.css";

/* ──────────────────────────────────────────
   HERO EXPLORE SECTION - TOP RED TO BOTTOM BLACK GRADIENT
   Left: Heading + Para + Button | Right: 4 Images Grid (uniform sizes, fully visible)
   All Text: WHITE
────────────────────────────────────────── */

const images = [
  {
    src: "/hero2.png",
    alt: "Luxury Men's Watch",
    label: "Timepieces",
  },
  {
    src: "/hero1.png",
    alt: "Tech Accessories",
    label: "Tech",
  },
  {
    src: "/hero4.png",
    alt: "Home Décor",
    label: "Décor",
  },
  {
    src: "/hero3.png",
    alt: "Women's Watch",
    label: "Elegance",
  },
];

export default function HeroExplore() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Add visible immediately if already in viewport (above the fold)
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

    // Safety fallback — always show after 800ms even if observer doesn't fire
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
      {/* Background Decorations */}
      <div className="he-grain" aria-hidden="true" />
      <div className="he-ambient" aria-hidden="true" />
      <div className="he-orb-left" aria-hidden="true" />
      <div className="he-orb-right" aria-hidden="true" />
      <div className="he-bg-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Main Content */}
      <div className="he-container">
        {/* ── LEFT SIDE ── */}
        <div className="he-left">
          {/* Eyebrow */}
          <div className="he-eyebrow-row">
            <span className="he-eyebrow">Luxury Collections</span>
            <div className="he-eyebrow-line" />
          </div>

          {/* Heading */}
          <h2 className="he-heading">
            Luxury Tech
            <br />
            <em>&amp; Lifestyle</em>
            <br />
            <span className="he-heading-accent">Essentials</span>
          </h2>

          {/* Decorative line */}
          <div className="he-divider" aria-hidden="true">
            <span className="he-divider-line" />
            <span className="he-divider-diamond" />
            <span className="he-divider-line he-divider-line--short" />
          </div>

          {/* Paragraph */}
          <p className="he-para">
            Discover premium watches, automotive accessories, home décor, and
            modern tech essentials designed for style, performance, and everyday
            living.
          </p>

          {/* CTA Button - White text on Red/Black gradient */}
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

          {/* Stats Row - White Text */}
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

        {/* ── RIGHT SIDE — 4 Images Grid (Uniform Sizes, Fully Visible) ── */}
        <div className="he-right">
          {/* Corner ornaments - Red */}
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
                {/* Shimmer */}
                <div className="he-img-shimmer" aria-hidden="true" />
                {/* Label - White text on gradient */}
                <span className="he-img-label">{img.label}</span>
                {/* Image - plain img tag, foran show, no Next.js overhead */}
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
                {/* Overlay */}
                <div className="he-img-overlay" aria-hidden="true" />
                {/* Bottom glow bar - Gradient */}
                <div className="he-img-bar" aria-hidden="true" />
              </div>
            ))}
          </div>

          {/* Floating ring decoration - Red */}
          <div className="he-ring" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
