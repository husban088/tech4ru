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
// ssr:false + Suspense = these never block main thread during initial load
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
      {/* Above fold — render immediately, no Suspense overhead */}
      <HeroExplore />
      <ExploreAurexia />
      <TrustBadgesSection />
      <FeaturedProducts />

      {/* Below fold — cv-auto skips browser layout+paint until near viewport
          Suspense wraps each so they stream independently without blocking siblings */}
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
