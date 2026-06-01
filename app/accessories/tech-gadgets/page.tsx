"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function TechGadgets() {
  return (
    <Subcategory
      category="Accessories"
      subcategory="Tech Gadgets"
      title="Innovative <em>Tech Gadgets</em>"
      description="Smart trackers, USB hubs, cooling fans, and essential tech tools"
      breadcrumb={{
        parent: "Accessories",
        parentHref: "/accessories",
      }}
    />
  );
}
