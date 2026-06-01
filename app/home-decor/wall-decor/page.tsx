"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function WallDecor() {
  return (
    <Subcategory
      category="Home Decor"
      subcategory="Wall Decor"
      title="Artistic <em>Wall Decor</em>"
      description="Transform your walls with our curated collection of art, mirrors, and wall installations"
      breadcrumb={{
        parent: "Home Decor",
        parentHref: "/home-decor",
      }}
    />
  );
}
