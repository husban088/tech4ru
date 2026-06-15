"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// ── Tier 1: Hero — above fold, SSR + eager load ──────────────────────────────
const HeroExplore = dynamic(() => import("./components/HeroExplore"), {
  ssr: true,
  loading: () => (
    <div
      style={{ minHeight: "100svh", background: "#fff" }}
      aria-hidden="true"
    />
  ),
});

// ── Tier 1b: ExploreAurexia — just below hero ────────────────────────────────
const ExploreAurexia = dynamic(() => import("./components/ExploreAurexia"), {
  ssr: true,
  loading: () => <div style={{ minHeight: "500px" }} aria-hidden="true" />,
});

// ── Tier 2: SSR dynamic — below fold, SEO important ──────────────────────────
const TrustBadgesSection = dynamic(
  () => import("./components/TrustBadgesSection"),
  {
    ssr: true,
    loading: () => <div style={{ minHeight: "120px" }} aria-hidden="true" />,
  },
);

const FeaturedProducts = dynamic(
  () => import("./components/FeaturedProducts"),
  {
    ssr: true,
    loading: () => <div style={{ minHeight: "400px" }} aria-hidden="true" />,
  },
);

// ── Tier 3: Client-only — lazily loaded, never blocks hydration ───────────────
const WhyChooseUs = dynamic(() => import("./components/WhyChooseUs"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "300px" }} aria-hidden="true" />,
});

const HomeReviews = dynamic(() => import("./components/HomeReviews"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "300px" }} aria-hidden="true" />,
});

const GlobalFAQSection = dynamic(
  () => import("./components/GlobalFAQSection"),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: "200px" }} aria-hidden="true" />,
  },
);

export default function Home() {
  return (
    <main className="flex flex-col flex-1">
      {/* Above fold — no cv-auto, render immediately */}
      <HeroExplore />
      <ExploreAurexia />
      <TrustBadgesSection />
      <FeaturedProducts />

      {/* FIX: cv-auto sections — contain-intrinsic-size:auto 0px in globals.css
          means no layout jump when section enters viewport.
          Each section MUST have its own cv-auto wrapper so browser can
          skip them independently. Suspense wraps for streaming. */}
      <div className="cv-auto">
        <Suspense fallback={<div style={{ minHeight: "300px" }} />}>
          <WhyChooseUs />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<div style={{ minHeight: "300px" }} />}>
          <HomeReviews />
        </Suspense>
      </div>
      <div className="cv-auto">
        <Suspense fallback={<div style={{ minHeight: "200px" }} />}>
          <GlobalFAQSection />
        </Suspense>
      </div>
    </main>
  );
}
