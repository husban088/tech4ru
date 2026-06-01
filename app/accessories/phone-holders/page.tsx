"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function PhoneHolders() {
  return (
    <Subcategory
      category="Accessories"
      subcategory="Phone Holders"
      title="Secure <em>Phone Holders</em>"
      description="Magnetic car mounts, desk stands, and universal phone grips for hands-free convenience"
      breadcrumb={{
        parent: "Accessories",
        parentHref: "/accessories",
      }}
    />
  );
}
