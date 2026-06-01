"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function SmartAccessories() {
  return (
    <Subcategory
      category="Accessories"
      subcategory="Smart Accessories"
      title="Smart <em>Accessories</em>"
      description="Connected devices, smart plugs, and intelligent home accessories"
      breadcrumb={{
        parent: "Accessories",
        parentHref: "/accessories",
      }}
    />
  );
}
