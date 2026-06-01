"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function CarAccessories() {
  return (
    <Subcategory
      category="Automotive"
      subcategory="Car Accessories"
      title="Premium <em>Car Accessories</em>"
      description="Upgrade your driving experience with our premium car accessories collection"
      breadcrumb={{
        parent: "Automotive",
        parentHref: "/automotive",
      }}
    />
  );
}
