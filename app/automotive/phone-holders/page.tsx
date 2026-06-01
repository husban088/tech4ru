"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function AutomotivePhoneHolders() {
  return (
    <Subcategory
      category="Automotive"
      subcategory="Phone Holders"
      title="Car <em>Phone Holders</em>"
      description="Secure magnetic mounts and dashboard holders for safe driving"
      breadcrumb={{
        parent: "Automotive",
        parentHref: "/automotive",
      }}
    />
  );
}
