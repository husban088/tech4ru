"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function CarCleaningTools() {
  return (
    <Subcategory
      category="Automotive"
      subcategory="Car Cleaning Tools"
      title="Professional <em>Car Cleaning Tools</em>"
      description="Keep your vehicle spotless with our premium cleaning tools and products"
      breadcrumb={{
        parent: "Automotive",
        parentHref: "/automotive",
      }}
    />
  );
}
