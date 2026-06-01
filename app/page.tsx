"use client";

import dynamic from "next/dynamic";

// ✅ PERF: Hero aur ExploreAurexia — above the fold, eager load karo
import HeroExplore from "./components/HeroExplore";
import ExploreAurexia from "./components/ExploreAurexia";

// ✅ PERF: Baaki sab below the fold — lazy load karo
// User jab tak scroll karega, tab tak load honge — First Paint fast hoga
const TrustBadgesSection = dynamic(
  () => import("./components/TrustBadgesSection"),
  {
    loading: () => <div style={{ minHeight: "120px" }} />, // placeholder — layout shift nahi hoga
  },
);

const FeaturedProducts = dynamic(
  () => import("./components/FeaturedProducts"),
  {
    loading: () => <div style={{ minHeight: "400px" }} />,
  },
);

const WhyChooseUs = dynamic(() => import("./components/WhyChooseUs"), {
  loading: () => <div style={{ minHeight: "300px" }} />,
});

const HomeReviews = dynamic(() => import("./components/HomeReviews"), {
  loading: () => <div style={{ minHeight: "300px" }} />,
});

const GlobalFAQSection = dynamic(
  () => import("./components/GlobalFAQSection"),
  {
    loading: () => <div style={{ minHeight: "200px" }} />,
  },
);

export default function Home() {
  return (
    <main className="flex flex-col flex-1 page-fade-in">
      {/* ✅ Above fold — immediately rendered */}
      <HeroExplore />
      <ExploreAurexia />

      {/* ✅ Below fold — lazy loaded */}
      <TrustBadgesSection />
      <FeaturedProducts />
      <WhyChooseUs />
      <HomeReviews />
      <GlobalFAQSection />
    </main>
  );
}
