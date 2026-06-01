"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function WomenWatches() {
  return (
    <Subcategory
      category="Watches"
      subcategory="Women Watches"
      title="Elegant <em>Women's Watches</em>"
      description="From minimalist designs to diamond-adorned luxury, find your perfect timepiece"
      breadcrumb={{
        parent: "Watches",
        parentHref: "/watches",
      }}
    />
  );
}
