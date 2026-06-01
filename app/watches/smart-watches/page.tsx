"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function SmartWatches() {
  return (
    <Subcategory
      category="Watches"
      subcategory="Smart Watches"
      title="Advanced <em>Smart Watches</em>"
      description="Stay connected and track your fitness with our premium smartwatch collection"
      breadcrumb={{
        parent: "Watches",
        parentHref: "/watches",
      }}
    />
  );
}
