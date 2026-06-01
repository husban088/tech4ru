"use client";

import React from "react";
import Link from "next/link";
import "./ReviewSection.css";

// ✅ FIXED: Updated CartItem interface to match the actual data structure
interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  variant_name?: string;
  variant_price?: number;
  variant_image?: string;
  quantity: number;
  pieces_per_unit?: number;
  product?: {
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    subcategory?: string;
    condition?: string;
    is_featured?: boolean;
    is_active?: boolean;
    price?: number;
    original_price?: number;
    images?: string[];
    stock?: number;
  } | null;
}

// FormData interface with all fields including card info
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  zip: string;
  country: string;
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

interface ReviewSectionProps {
  items: CartItem[];
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    zip: string;
    cardNumber: string;
    cardName: string;
    expiry: string;
  };
  selectedCountryCode: string;
  selectedFlag: string;
  formatPrice: (price: number) => string;
}

export default function ReviewSection({
  items,
  form,
  selectedCountryCode,
  selectedFlag,
  formatPrice,
}: ReviewSectionProps) {
  return (
    <div className="rs-review-section">
      <h2 className="rs-section-title">
        <em>03.</em> Review Your Order
      </h2>

      <div className="rs-review-blocks">
        <div className="rs-review-block">
          <p className="rs-review-block-title">Shipping To</p>
          <p className="rs-review-block-val">
            {form.firstName} {form.lastName}
            <br />
            {form.address}
            {form.apartment ? `, ${form.apartment}` : ""}
            <br />
            {form.city}, {form.zip}
            <br />
            📞 {selectedCountryCode} {form.phone}
            <br />
            📧 {form.email}
          </p>
        </div>
        <div className="rs-review-block">
          <p className="rs-review-block-title">Payment</p>
          <p className="rs-review-block-val">
            Card ending in{" "}
            {form.cardNumber && form.cardNumber.replace(/\s/g, "").length >= 4
              ? form.cardNumber.replace(/\s/g, "").slice(-4)
              : "••••"}
            <br />
            {form.cardName || "—"}
            <br />
            Expires: {form.expiry || "—"}
          </p>
        </div>
      </div>

      <ul className="rs-review-items">
        {items.map((item) => {
          const product = item.product ?? {
            id: item.product_id,
            name: item.variant_name || "Product",
            description: "",
            category: "",
            subcategory: "",
            condition: "new",
            is_featured: false,
            is_active: true,
            price: item.variant_price ?? 0,
            images: [],
          };
          const ppu = item.pieces_per_unit ?? 1;
          const pricePerPiece = item.variant_price ?? product.price ?? 0;
          const itemTotal = pricePerPiece * ppu * item.quantity;
          const rowPhysicalPieces = ppu * item.quantity;
          const productName = product.name ?? item.variant_name ?? "Product";
          const displayName =
            item.variant_name && item.variant_name !== "Standard"
              ? `${productName} (${item.variant_name})${
                  ppu > 1 ? ` - ${ppu}-Piece` : ""
                }`
              : ppu > 1
              ? `${productName} (${ppu}-Piece)`
              : productName;
          return (
            <li key={item.id} className="rs-review-item">
              <div className="rs-review-item-info">
                <p className="rs-review-item-name">{displayName}</p>
                <p className="rs-review-item-variant">
                  {product.subcategory ?? ""} × {item.quantity} unit
                  {item.quantity !== 1 ? "s" : ""}
                  {ppu > 1 && ` (${rowPhysicalPieces} total pieces)`}
                </p>
              </div>
              <span className="rs-review-item-price">
                {formatPrice(itemTotal)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="rs-review-terms">
        By placing your order, you agree to our{" "}
        <Link href="/terms" className="rs-review-link">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="rs-review-link">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
