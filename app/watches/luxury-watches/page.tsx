"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function LuxuryWatches() {
  return (
    <Subcategory
      category="Watches"
      subcategory="Luxury Watches"
      title="Luxury <em>Timepieces</em>"
      description="Experience unparalleled craftsmanship with our curated luxury watch collection"
      breadcrumb={{
        parent: "Watches",
        parentHref: "/watches",
      }}
    />
  );
}
