"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function StorageOrganizers() {
  return (
    <Subcategory
      category="Home Decor"
      subcategory="Storage & Organizers"
      title="Elegant <em>Storage Solutions</em>"
      description="Declutter your space with our stylish and functional storage solutions"
      breadcrumb={{
        parent: "Home Decor",
        parentHref: "/home-decor",
      }}
    />
  );
}
