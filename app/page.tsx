"use client";

import dynamic from "next/dynamic";
import HeroExplore from "./components/HeroExplore";
import ExploreAurexia from "./components/ExploreAurexia";

/*
  ─── PERFORMANCE STRATEGY ───────────────────────────────────────────────────
  Components are split into 3 priority tiers:

  TIER 1 — Static imports (above-the-fold, loaded immediately):
    • HeroExplore      — first thing user sees; must never flash/jump
    • ExploreAurexia   — second section, visible without scrolling

  TIER 2 — Dynamic with ssr:true (below-fold but important for SEO/LCP):
    • TrustBadgesSection — short; loads fast
    • FeaturedProducts   — important for conversion; SSR keeps HTML ready

  TIER 3 — Dynamic with ssr:false (pure client, visible only after scroll):
    • WhyChooseUs, HomeReviews, GlobalFAQSection — no SSR needed, lazy
  ────────────────────────────────────────────────────────────────────────────
*/

// ── Tier 2: SSR-enabled dynamic imports ──────────────────────────────────────
// FIX: Original had ssr not specified (defaults to true for page components).
// Explicitly set ssr:true here to make the intent clear and ensure these
// sections render on the server for faster Largest Contentful Paint (LCP).
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
    // FIX: Reduced placeholder height to a realistic estimate so there's less
    // sudden layout shift when the real component renders.
    loading: () => <div style={{ minHeight: "400px" }} aria-hidden="true" />,
  },
);

// ── Tier 3: Client-only, below the fold ──────────────────────────────────────
// FIX: ssr:false on these means they are not included in the server bundle,
// reducing the HTML payload and Time To First Byte (TTFB). They are loaded
// only when the browser is idle (after hydration), so they never compete with
// the critical render path.
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
      {/* Tier 1: above fold — always immediately available */}
      <HeroExplore />
      <ExploreAurexia />

      {/* Tier 2: SSR, fast LCP */}
      <TrustBadgesSection />
      <FeaturedProducts />

      {/* Tier 3: client-only, below fold */}
      <WhyChooseUs />
      <HomeReviews />
      <GlobalFAQSection />
    </main>
  );
}
