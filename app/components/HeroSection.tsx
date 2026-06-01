"use client";

import "./hero.css";

export default function HeroSection() {
  return (
    <section className="hero-section" aria-label="Hero banner">
      <img
        src="/herobanner.png"
        alt="Hero Banner"
        className="hero-banner-img"
        draggable={false}
      />
    </section>
  );
}
