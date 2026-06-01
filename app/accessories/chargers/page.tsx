"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function Chargers() {
  return (
    <Subcategory
      category="Accessories"
      subcategory="Chargers"
      title="Fast <em>Chargers</em>"
      description="High-speed GaN chargers, wireless charging pads, and multi-port adapters for all your devices"
      breadcrumb={{
        parent: "Accessories",
        parentHref: "/accessories",
      }}
    />
  );
}
