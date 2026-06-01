"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function Lighting() {
  return (
    <Subcategory
      category="Home Decor"
      subcategory="Lighting"
      title="Ambient <em>Lighting</em>"
      description="Create the perfect atmosphere with our premium lighting collection"
      breadcrumb={{
        parent: "Home Decor",
        parentHref: "/home-decor",
      }}
    />
  );
}
