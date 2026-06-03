"use client";

import dynamic from "next/dynamic";
import HeroExplore from "./components/HeroExplore";
import ExploreAurexia from "./components/ExploreAurexia";

const TrustBadgesSection = dynamic(
  () => import("./components/TrustBadgesSection"),
  {
    loading: () => <div style={{ minHeight: "120px" }} />,
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
