"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function MenWatches() {
  return (
    <Subcategory
      category="Watches"
      subcategory="Men Watches"
      title="Classic <em>Men's Watches</em>"
      description="Discover our collection of sophisticated timepieces designed for the modern gentleman"
      breadcrumb={{
        parent: "Watches",
        parentHref: "/watches",
      }}
    />
  );
}
