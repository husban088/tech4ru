"use client";

import Subcategory from "@/app/components/SubcategoryPage";

export default function KitchenEssentials() {
  return (
    <Subcategory
      category="Home Decor"
      subcategory="Kitchen Essentials"
      title="Premium <em>Kitchen Essentials</em>"
      description="Elevate your cooking experience with our premium kitchenware collection"
      breadcrumb={{
        parent: "Home Decor",
        parentHref: "/home-decor",
      }}
    />
  );
}
