"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function Cables() {
  return (
    <Subcategory
      category="Accessories"
      subcategory="Cables"
      title="Premium <em>Cables</em>"
      description="Durable braided cables, USB-C to C, Lightning cables, and data sync solutions"
      breadcrumb={{
        parent: "Accessories",
        parentHref: "/accessories",
      }}
    />
  );
}
