"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function InteriorAccessories() {
  return (
    <Subcategory
      category="Automotive"
      subcategory="Interior Accessories"
      title="Luxury <em>Interior Accessories</em>"
      description="Enhance your car's cabin with premium interior accessories"
      breadcrumb={{
        parent: "Automotive",
        parentHref: "/automotive",
      }}
    />
  );
}
