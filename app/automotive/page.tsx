"use client";

import Link from "next/link";
import "@/app/styles/product-grid.css";
import ProductGrid from "../components/ProductGrid";

const SUBCATEGORIES = [
  {
    name: "Car Accessories",
    href: "/automotive/car-accessories",
    description: "Essential car add-ons and upgrades",
  },
  {
    name: "Car Cleaning Tools",
    href: "/automotive/car-cleaning-tools",
    description: "Professional detailing and cleaning kits",
  },
  {
    name: "Phone Holders",
    href: "/automotive/phone-holders",
    description: "Secure mounts for safe driving",
  },
  {
    name: "Interior Accessories",
    href: "/automotive/interior-accessories",
    description: "Upgrade your car's interior",
  },
];

export default function Automotive() {
  return (
    <div className="sub-root">
      <div className="sub-ambient" aria-hidden="true" />
      <div className="sub-grain" aria-hidden="true" />
      <div className="sub-lines" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="sub-hero">
        <div className="sub-hero-inner">
          <div className="sub-breadcrumb">
            <Link href="/" className="sub-breadcrumb-link">
              Home
            </Link>
            <span className="sub-breadcrumb-sep">/</span>
            <span className="sub-breadcrumb-current">Automotive</span>
          </div>
          <h1 className="sub-title">
            Auto <em>Essentials</em>
          </h1>
          <p className="sub-description">
            Premium car accessories and maintenance tools for your vehicle
          </p>
          <div className="sub-deco">
            <div className="sub-deco-line" />
            <div className="sub-deco-diamond" />
            <div className="sub-deco-line" />
          </div>
        </div>
      </div>

      <div className="sub-main">
        <div className="cat-subnav">
          {SUBCATEGORIES.map((cat) => (
            <Link key={cat.name} href={cat.href} className="cat-subnav-item">
              <span className="cat-subnav-name">{cat.name}</span>
              <span className="cat-subnav-desc">{cat.description}</span>
            </Link>
          ))}
        </div>

        <div className="cat-section">
          <div className="cat-section-header">
            <h2 className="cat-section-title">All Automotive</h2>
            <div className="cat-section-line" />
          </div>
          <ProductGrid category="Automotive" />
        </div>
      </div>
    </div>
  );
}
