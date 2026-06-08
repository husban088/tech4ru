"use client";

import dynamic from "next/dynamic";

// ── Tier 1: Hero — above fold, loads immediately ─────────────────────────────
// FIX: HeroExplore ab bhi eagerly imported hai — ye LCP element hai.
// Lekin loading fallback add kiya taake layout shift na ho during hydration.
const HeroExplore = dynamic(() => import("./components/HeroExplore"), {
  ssr: true,
  loading: () => (
    <div
      style={{ minHeight: "100svh", background: "#fff" }}
      aria-hidden="true"
    />
  ),
});

// ── Tier 1b: ExploreAurexia — just below hero, preload aggressively ──────────
const ExploreAurexia = dynamic(() => import("./components/ExploreAurexia"), {
  ssr: true,
  loading: () => <div style={{ minHeight: "500px" }} aria-hidden="true" />,
});

// ── Tier 2: SSR dynamic imports — below fold, SEO important ──────────────────
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

// ── Tier 3: Client-only, load after hydration ─────────────────────────────────
// FIX: ssr:false sections use cv-auto class (content-visibility:auto) so
// browser skips layout+paint until they approach viewport.
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
      {/* Above fold — render immediately */}
      <HeroExplore />
      <ExploreAurexia />
      <TrustBadgesSection />
      <FeaturedProducts />

      {/* Below fold — content-visibility:auto skips paint until near viewport */}
      {/* FIX: cv-auto class defined in globals.css — massive scroll perf gain */}
      <div className="cv-auto">
        <WhyChooseUs />
      </div>
      <div className="cv-auto">
        <HomeReviews />
      </div>
      <div className="cv-auto">
        <GlobalFAQSection />
      </div>
    </main>
  );
}
