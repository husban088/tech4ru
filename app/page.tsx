"use client";

import dynamic from "next/dynamic";
import HeroExplore from "./components/HeroExplore";
import ExploreAurexia from "./components/ExploreAurexia";

// ── Tier 2: SSR dynamic imports (below fold, SEO important) ──────────────────
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

// ── Tier 3: client-only, loaded after hydration ───────────────────────────────
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
      <HeroExplore />
      <ExploreAurexia />
      <TrustBadgesSection />
      <FeaturedProducts />
      <WhyChooseUs />
      <HomeReviews />
      <GlobalFAQSection />
    </main>
  );
}
