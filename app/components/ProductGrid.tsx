"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/lib/cartStore";
import "@/app/styles/product-grid.css";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import FilterSidebar from "@/app/components/ProductGridFilters";
import "@/app/styles/grid-controls.css";
import { getSalePercent, applyDiscount } from "@/lib/saleStore";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  subcategory: string;
  images: string[];
  stock: number;
  brand?: string;
  condition: string;
  is_featured: boolean;
  is_active: boolean;
  specs: Record<string, string>;
  created_at: string;
  low_stock_threshold?: number | null;
  stockStatus?: "in_stock" | "out_of_stock" | "low_stock";
  variantId?: string;
  rating?: number;
  reviews_count?: number;
}

interface ProductVariant {
  id: string;
  product_id: string;
  attribute_type: "color" | "size" | "material" | "capacity" | "standard";
  attribute_value: string;
  price: number;
  original_price?: number;
  description?: string;
  stock: number;
  low_stock_threshold?: number;
  images: string[];
  stockStatus?: "in_stock" | "out_of_stock" | "low_stock";
}

interface VariantImagesMap {
  [variantId: string]: string[];
}

interface ExtendedProduct extends Product {
  variants?: ProductVariant[];
  variantImagesMap?: VariantImagesMap;
  selectedVariantId?: string;
}

interface ProductGridProps {
  category: string;
  subcategory?: string;
  limit?: number;
  featured?: boolean;
  onQuickView?: (productId: string) => void;
}

// ─── Translations ──────────────────────────────────────────────────────────
const pgTranslations = {
  filters: { en: "Filters", ar: "تصفية", de: "Filter" },
  newest: { en: "Newest First", ar: "الأحدث أولاً", de: "Neueste zuerst" },
  priceLowHigh: {
    en: "Price: Low → High",
    ar: "السعر: من الأقل إلى الأعلى",
    de: "Preis: Niedrig → Hoch",
  },
  priceHighLow: {
    en: "Price: High → Low",
    ar: "السعر: من الأعلى إلى الأقل",
    de: "Preis: Hoch → Niedrig",
  },
  featuredFirst: {
    en: "Featured First",
    ar: "المميزة أولاً",
    de: "Ausgewählte zuerst",
  },
  item: { en: "item", ar: "عنصر", de: "Artikel" },
  items: { en: "items", ar: "عناصر", de: "Artikel" },
  noProductsTitle: {
    en: "No products found",
    ar: "لا توجد منتجات",
    de: "Keine Produkte gefunden",
  },
  noProductsSub: {
    en: "Check back soon for new arrivals",
    ar: "تفقد قريبًا للحصول على إصدارات جديدة",
    de: "Schauen Sie bald wieder vorbei für neue Artikel",
  },
  noResultsSub: {
    en: "No results for",
    ar: "لا توجد نتائج لـ",
    de: "Keine Ergebnisse für",
  },
  searchPlaceholder: {
    en: "Search products...",
    ar: "ابحث عن منتجات...",
    de: "Produkte suchen...",
  },
  outOfStock: { en: "Out of Stock", ar: "غير متوفر", de: "Nicht auf Lager" },
  lowStock: { en: "Only", ar: "فقط", de: "Nur noch" },
  left: { en: "left", ar: "متبقي", de: "vorrätig" },
  inStock: { en: "In Stock", ar: "متوفر", de: "Auf Lager" },
};

const getPgTranslation = (
  key: keyof typeof pgTranslations,
  lang: "en" | "ar" | "de",
): string => {
  return pgTranslations[key]?.[lang] || pgTranslations[key]?.en || key;
};

const truncateProductName = (name: string, maxLength: number = 45): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength).trim() + "...";
};

const getStockStatus = (
  stock: number,
  threshold?: number | null,
): "in_stock" | "out_of_stock" | "low_stock" => {
  if (stock === 0) return "out_of_stock";
  if (stock >= 999999) return "in_stock";
  if (threshold && threshold > 0 && stock <= threshold) return "low_stock";
  return "in_stock";
};

async function fetchProductsWithVariants(
  category: string,
  subcategory?: string,
  limit?: number,
  featured?: boolean,
  attempt = 0,
): Promise<ExtendedProduct[]> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 600;

  try {
    let query = supabase
      .from("products")
      .select("*, product_variants(*, variant_images(*))")
      .eq("is_active", true)
      .eq("category", category);

    if (subcategory) query = query.eq("subcategory", subcategory);
    if (featured) query = query.eq("is_featured", true);
    query = query.order("created_at", { ascending: false });
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error || !data) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        return fetchProductsWithVariants(
          category,
          subcategory,
          limit,
          featured,
          attempt + 1,
        );
      }
      return [];
    }

    const typePriority: Record<string, number> = {
      standard: 0,
      color: 1,
      size: 2,
      material: 3,
      capacity: 4,
    };

    const result = data.map((item: any) => {
      const variants = (item.product_variants || []).map((variant: any) => {
        const variantImages = (variant.variant_images || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((img: any) => img.image_url);

        return {
          id: variant.id,
          product_id: variant.product_id,
          attribute_type: variant.attribute_type,
          attribute_value: variant.attribute_value,
          price: variant.price,
          original_price: variant.original_price,
          description: variant.description,
          stock: variant.stock,
          low_stock_threshold: variant.low_stock_threshold,
          images: variantImages,
          stockStatus: getStockStatus(
            variant.stock,
            variant.low_stock_threshold,
          ),
        };
      });

      const sortedVariants = [...variants].sort(
        (a, b) =>
          (typePriority[a.attribute_type] || 5) -
          (typePriority[b.attribute_type] || 5),
      );
      const bestVariant = sortedVariants[0];

      const variantImagesMap: VariantImagesMap = {};
      variants.forEach((variant: ProductVariant) => {
        if (variant.images && variant.images.length > 0) {
          variantImagesMap[variant.id] = variant.images;
        }
      });

      return {
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: bestVariant?.price ?? item.price ?? 0,
        original_price:
          bestVariant?.original_price ?? item.original_price ?? undefined,
        category: item.category,
        subcategory: item.subcategory,
        images:
          bestVariant?.images?.length > 0
            ? bestVariant.images
            : item.images || [],
        stock: bestVariant?.stock ?? item.stock ?? 0,
        brand: item.brand || undefined,
        condition: item.condition || "new",
        is_featured: item.is_featured || false,
        is_active: item.is_active ?? true,
        specs: item.specs || {},
        created_at: item.created_at || new Date().toISOString(),
        low_stock_threshold:
          bestVariant?.low_stock_threshold ?? item.low_stock_threshold ?? null,
        stockStatus:
          bestVariant?.stockStatus ||
          getStockStatus(
            bestVariant?.stock ?? item.stock ?? 0,
            bestVariant?.low_stock_threshold ?? item.low_stock_threshold,
          ),
        variantId: bestVariant?.id,
        variants: sortedVariants,
        variantImagesMap,
        rating:
          item.rating != null && item.rating > 0 ? item.rating : undefined,
        reviews_count:
          item.reviews_count != null && item.reviews_count > 0
            ? item.reviews_count
            : undefined,
      };
    });

    return result;
  } catch {
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      return fetchProductsWithVariants(
        category,
        subcategory,
        limit,
        featured,
        attempt + 1,
      );
    }
    return [];
  }
}

/* ─── Star Components ─────────────────────────────────────────────────────── */
function StarIcon({ filled, size = 11 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? "#b8963e" : "none"}
        stroke="#b8963e"
        strokeWidth="1.5"
        opacity={filled ? 1 : 0.35}
      />
    </svg>
  );
}

function StarDisplay({ rating, size = 17 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= Math.round(rating)} size={size} />
      ))}
    </div>
  );
}

function VariantThumbnails({
  variants,
  type,
  onSelect,
  currentValue,
  variantImagesMap,
  getVariantImage,
  isRTL,
}: {
  variants: ProductVariant[];
  type: string;
  onSelect: (variant: ProductVariant) => void;
  currentValue: string;
  variantImagesMap: VariantImagesMap;
  getVariantImage: (variantId: string) => string | null;
  isRTL: boolean;
}) {
  const { language: vtLang } = useLanguage();
  if (!variants || variants.length === 0) return null;

  const getIcon = () => {
    switch (type) {
      case "color":
        return "🎨";
      case "size":
        return "📏";
      case "material":
        return "🔧";
      case "capacity":
        return "⚡";
      default:
        return "•";
    }
  };

  const getTypeLabel = () => {
    if (vtLang === "de") {
      switch (type) {
        case "color":
          return "Farben";
        case "size":
          return "Größen";
        case "material":
          return "Materialien";
        case "capacity":
          return "Kapazitäten";
        default:
          return type;
      }
    }
    switch (type) {
      case "color":
        return "Colors";
      case "size":
        return "Sizes";
      case "material":
        return "Materials";
      case "capacity":
        return "Capacities";
      default:
        return type;
    }
  };

  const displayVariants = variants.slice(0, 4);
  const hasMore = variants.length > 4;

  return (
    <div className="pg-card-variants" dir={isRTL ? "rtl" : "ltr"}>
      <span className="pg-variant-label">
        {getIcon()} {getTypeLabel()}:
      </span>
      <div className="pg-variant-thumbnails">
        {displayVariants.map((variant) => {
          const variantImage = getVariantImage(variant.id);
          const isActive = currentValue === variant.attribute_value;
          const labelText =
            variant.attribute_value.length > 10
              ? variant.attribute_value.slice(0, 9) + "…"
              : variant.attribute_value;
          return (
            <button
              key={variant.id}
              className={`pg-variant-thumb ${isActive ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(variant);
              }}
              title={variant.attribute_value}
            >
              {variantImage ? (
                <div className="pg-variant-thumb-img">
                  <img src={variantImage} alt={variant.attribute_value} />
                </div>
              ) : (
                <div className="pg-variant-thumb-placeholder">
                  <span className="pg-variant-thumb-text">
                    {variant.attribute_value.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="pg-variant-thumb-label">{labelText}</span>
            </button>
          );
        })}
        {hasMore && (
          <span className="pg-variant-more">+{variants.length - 4}</span>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner({ size = 18 }: { size?: number }) {
  return (
    <div
      className="pg-spinner"
      style={{
        width: size,
        height: size,
        border: "2px solid rgba(218,165,32,0.2)",
        borderTopColor: "#daa520",
        borderRadius: "50%",
        animation: "pg-spin 0.8s linear infinite",
        display: "inline-block",
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <div
      className="pg-card"
      style={{
        pointerEvents: "none",
        animation: "pg-skeleton-pulse 1.4s ease-in-out infinite",
      }}
    >
      <div
        className="pg-card-img"
        style={{ background: "rgba(0,0,0,0.06)", borderRadius: 8 }}
      />
      <div className="pg-card-body" style={{ gap: 10 }}>
        <div
          style={{
            height: 12,
            width: "40%",
            background: "rgba(0,0,0,0.06)",
            borderRadius: 4,
          }}
        />
        <div
          style={{
            height: 16,
            width: "80%",
            background: "rgba(0,0,0,0.08)",
            borderRadius: 4,
          }}
        />
        <div
          style={{
            height: 14,
            width: "55%",
            background: "rgba(218,165,32,0.15)",
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

function ProductCardComponent({
  productData,
  onQuickView,
  formatPrice,
  addToCart,
  isRTL,
}: {
  productData: ExtendedProduct;
  onQuickView?: (productId: string) => void;
  formatPrice: (value: number) => string;
  addToCart: (
    product: any,
    variant: any,
    quantity: number,
    maxStock?: number,
  ) => Promise<void>;
  isRTL: boolean;
}) {
  const router = useRouter();
  const { language: cardLanguage } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    productData.variants && productData.variants.length > 0
      ? productData.variants[0]
      : null,
  );
  const [currentImages, setCurrentImages] = useState<string[]>(() => {
    if (
      productData.variants &&
      productData.variants.length > 0 &&
      productData.variantImagesMap
    ) {
      const firstVariant = productData.variants[0];
      if (firstVariant && productData.variantImagesMap[firstVariant.id]) {
        return productData.variantImagesMap[firstVariant.id];
      }
    }
    return productData.images || [];
  });
  const [addToCartLoading, setAddToCartLoading] = useState(false);

  // ✅ Rating static — no per-card websocket (auth lock fix)
  const liveRating =
    productData.rating != null && productData.rating > 0
      ? productData.rating
      : null;
  const liveReviewCount =
    productData.reviews_count != null && productData.reviews_count > 0
      ? productData.reviews_count
      : null;

  const colorVariants =
    productData.variants?.filter((v) => v.attribute_type === "color") || [];
  const sizeVariants =
    productData.variants?.filter((v) => v.attribute_type === "size") || [];
  const materialVariants =
    productData.variants?.filter((v) => v.attribute_type === "material") || [];
  const capacityVariants =
    productData.variants?.filter((v) => v.attribute_type === "capacity") || [];

  const getVariantImage = useCallback(
    (variantId: string): string | null => {
      if (
        productData.variantImagesMap &&
        productData.variantImagesMap[variantId]
      ) {
        const images = productData.variantImagesMap[variantId];
        return images && images.length > 0 ? images[0] : null;
      }
      return null;
    },
    [productData.variantImagesMap],
  );

  const getVariantImages = useCallback(
    (variantId: string): string[] => {
      if (
        productData.variantImagesMap &&
        productData.variantImagesMap[variantId]
      ) {
        return productData.variantImagesMap[variantId];
      }
      return [];
    },
    [productData.variantImagesMap],
  );

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setCurrentImages(getVariantImages(variant.id));
    setIsHovered(false);
  };

  const displayImage = currentImages.length > 0 ? currentImages[0] : null;

  const discount =
    selectedVariant?.original_price &&
    selectedVariant.original_price > selectedVariant.price
      ? Math.round(
          ((selectedVariant.original_price - selectedVariant.price) /
            selectedVariant.original_price) *
            100,
        )
      : productData.original_price &&
          productData.original_price > productData.price
        ? Math.round(
            ((productData.original_price - productData.price) /
              productData.original_price) *
              100,
          )
        : null;

  const stockStatus = selectedVariant
    ? getStockStatus(selectedVariant.stock, selectedVariant.low_stock_threshold)
    : productData.stockStatus ||
      getStockStatus(productData.stock, productData.low_stock_threshold);
  const isLowStock = stockStatus === "low_stock";
  const isOutOfStock = stockStatus === "out_of_stock";
  const currentStock = selectedVariant?.stock || productData.stock || 0;

  const truncatedName = truncateProductName(productData.name, 45);

  const activeSalePercent = getSalePercent();
  const basePrice = selectedVariant?.price ?? productData.price;
  const baseOriginalPrice =
    selectedVariant?.original_price ?? productData.original_price ?? null;

  const finalPrice = activeSalePercent
    ? applyDiscount(basePrice, activeSalePercent)
    : basePrice;
  const originalPriceForDisplay =
    activeSalePercent && basePrice > 0
      ? basePrice
      : baseOriginalPrice && baseOriginalPrice > basePrice
        ? baseOriginalPrice
        : null;

  const displaySalePrice = formatPrice(finalPrice);
  const displayOriginalPrice =
    originalPriceForDisplay && originalPriceForDisplay > finalPrice
      ? formatPrice(originalPriceForDisplay)
      : null;
  const totalDiscount = activeSalePercent ? activeSalePercent : discount;

  const handleAddToCartClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedVariant && !productData.variantId) {
      alert("Please select a variant first");
      return;
    }
    if (isOutOfStock) {
      alert("This product is out of stock");
      return;
    }
    if (addToCartLoading) return;

    setAddToCartLoading(true);

    const variantToUse =
      selectedVariant ||
      (productData.variantId
        ? {
            id: productData.variantId,
            product_id: productData.id,
            attribute_type: "standard" as const,
            attribute_value: "Standard",
            price: productData.price,
            original_price: productData.original_price,
            stock: productData.stock,
            low_stock_threshold: productData.low_stock_threshold ?? undefined,
            is_active: true,
          }
        : null);

    const productToAdd = {
      id: productData.id,
      name: productData.name,
      description:
        selectedVariant?.description || productData.description || "",
      category: productData.category,
      subcategory: productData.subcategory,
      brand: productData.brand || "",
      condition: productData.condition,
      is_featured: productData.is_featured,
      is_active: productData.is_active,
      images: currentImages.length > 0 ? currentImages : productData.images,
      price: selectedVariant?.price || productData.price,
      original_price:
        selectedVariant?.original_price || productData.original_price,
      stock: currentStock,
      stockStatus: stockStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await addToCart(productToAdd, variantToUse, 1, 1);
    } finally {
      setAddToCartLoading(false);
    }
  };

  const handleQuickViewClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) onQuickView(productData.id);
  };

  const slug = productData.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
  const productHref = `/product/${slug}--${productData.id}`;

  return (
    <Link
      href={productHref}
      prefetch={true}
      className="pg-card"
      style={{ cursor: "pointer", textDecoration: "none", display: "block" }}
    >
      <div
        className="pg-card-img"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={productData.name}
            loading="eager"
            fetchPriority="high"
            decoding="auto"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div className="pg-card-placeholder">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        <div className="pg-card-badges">
          {productData.condition === "new" && !totalDiscount && (
            <span className="pg-badge pg-badge--new">
              {cardLanguage === "de" ? "Neu" : "New"}
            </span>
          )}
          {isLowStock && (
            <span className="pg-badge pg-badge--low">
              {cardLanguage === "de" ? "Wenig Bestand" : "Low Stock"}
            </span>
          )}
          {totalDiscount && totalDiscount > 0 ? (
            <span className="pg-badge pg-badge--sale">-{totalDiscount}%</span>
          ) : null}
        </div>
        <div className="pg-icon-buttons">
          {onQuickView && (
            <button
              className="pg-icon-btn pg-icon-btn--view"
              onClick={handleQuickViewClick}
              aria-label="Quick View"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z" />
              </svg>
            </button>
          )}
          <button
            className="pg-icon-btn pg-icon-btn--cart"
            onClick={handleAddToCartClick}
            aria-label="Add to Cart"
            disabled={addToCartLoading || isOutOfStock}
          >
            {addToCartLoading ? (
              <LoadingSpinner size={18} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="pg-card-body" dir={isRTL ? "rtl" : "ltr"}>
        <p className="pg-card-brand">{productData.brand || "\u00A0"}</p>
        <h3 className="pg-card-name" title={productData.name}>
          {truncatedName}
        </h3>
        <div className="pg-card-price-row">
          <span className="pg-card-price">{displaySalePrice}</span>
          {displayOriginalPrice && (
            <span className="pg-card-orig">{displayOriginalPrice}</span>
          )}
        </div>
        <div className="pg-card-rating">
          {liveRating !== null &&
            liveReviewCount !== null &&
            liveReviewCount > 0 && (
              <>
                <StarDisplay rating={liveRating} size={17} />
                <span className="pg-card-rating-count">
                  ({liveReviewCount})
                </span>
              </>
            )}
        </div>
        <div className="pg-card-variants-wrapper">
          {colorVariants.length > 0 && (
            <VariantThumbnails
              variants={colorVariants}
              type="color"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={productData.variantImagesMap || {}}
              getVariantImage={getVariantImage}
              isRTL={isRTL}
            />
          )}
          {sizeVariants.length > 0 && (
            <VariantThumbnails
              variants={sizeVariants}
              type="size"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={productData.variantImagesMap || {}}
              getVariantImage={getVariantImage}
              isRTL={isRTL}
            />
          )}
          {materialVariants.length > 0 && (
            <VariantThumbnails
              variants={materialVariants}
              type="material"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={productData.variantImagesMap || {}}
              getVariantImage={getVariantImage}
              isRTL={isRTL}
            />
          )}
          {capacityVariants.length > 0 && (
            <VariantThumbnails
              variants={capacityVariants}
              type="capacity"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={productData.variantImagesMap || {}}
              getVariantImage={getVariantImage}
              isRTL={isRTL}
            />
          )}
        </div>
        <div
          className={`pg-card-stock ${isOutOfStock ? "out" : isLowStock ? "low" : "in"}`}
        >
          {isOutOfStock
            ? getPgTranslation("outOfStock", cardLanguage)
            : isLowStock
              ? `${getPgTranslation("lowStock", cardLanguage)} ${currentStock} ${getPgTranslation("left", cardLanguage)}`
              : getPgTranslation("inStock", cardLanguage)}
        </div>
      </div>
      <div className="pg-card-line" />
    </Link>
  );
}

// ─── Module-level product cache — only stores successful non-empty results ────
const pgCache: Record<string, { data: ExtendedProduct[]; fetchedAt: number }> =
  {};

function getPgCacheKey(
  category: string,
  subcategory?: string,
  limit?: number,
  featured?: boolean,
) {
  return `${category}|${subcategory ?? ""}|${limit ?? ""}|${featured ? "1" : "0"}`;
}

// ─── Main ProductGrid Component ───────────────────────────────────────────────
export default function ProductGrid({
  category,
  subcategory,
  limit,
  featured = false,
  onQuickView,
}: ProductGridProps) {
  const { language, isRTLMode } = useLanguage();
  const cacheKey = getPgCacheKey(category, subcategory, limit, featured);

  // Only hydrate from cache if it has real products
  const [products, setProducts] = useState<ExtendedProduct[]>(() =>
    pgCache[cacheKey]?.data?.length > 0 ? pgCache[cacheKey].data : [],
  );
  const [loading, setLoading] = useState(
    () => !(pgCache[cacheKey]?.data?.length > 0),
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  // Use null on server to avoid hydration mismatch — set real value after mount
  const [columns, setColumns] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    category: "All",
    subcategory: "All",
    color: "All",
    size: "All",
    capacity: "All",
    material: "All",
  });
  const { formatPrice } = useCurrency();
  const { addToCart } = useCartStore();

  // Set columns after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    setColumns(4);
  }, []);

  // Load products — always clears loading, handles empty results, no stale state
  useEffect(() => {
    const key = getPgCacheKey(category, subcategory, limit, featured);
    let cancelled = false;

    // Cache hit — show instantly, silent background refresh
    if ((pgCache[key]?.data?.length ?? 0) > 0) {
      setProducts(pgCache[key].data);
      setLoading(false);
      // Refresh only if cache is older than 1 minute
      const cacheAge = Date.now() - (pgCache[key].fetchedAt || 0);
      if (cacheAge > 60000) {
        fetchProductsWithVariants(category, subcategory, limit, featured)
          .then((data) => {
            if (cancelled) return;
            if (data.length > 0) {
              pgCache[key] = { data, fetchedAt: Date.now() };
              setProducts(data);
            }
          })
          .catch(() => {});
      }
      return () => {
        cancelled = true;
      };
    }

    // No cache — fresh fetch
    setLoading(true);

    // Safety timer — if everything fails, unstick the UI after 10s
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        // One last silent retry
        fetchProductsWithVariants(category, subcategory, limit, featured)
          .then((data) => {
            if (!cancelled && data.length > 0) {
              pgCache[key] = { data, fetchedAt: Date.now() };
              setProducts(data);
            }
          })
          .catch(() => {});
      }
    }, 10000);

    fetchProductsWithVariants(category, subcategory, limit, featured)
      .then((data) => {
        if (cancelled) return;
        clearTimeout(safetyTimer);
        // Always update products — even empty so empty-state renders correctly
        if (data.length > 0) {
          pgCache[key] = { data, fetchedAt: Date.now() };
        }
        setProducts(data);
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(safetyTimer);
          // On error keep whatever was showing — don't blank the screen
        }
      })
      .finally(() => {
        // ALWAYS stop loading — skeleton never stuck
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [category, subcategory, limit, featured]);

  // Real-time updates for product changes
  useEffect(() => {
    const key = getPgCacheKey(category, subcategory, limit, featured);
    const refresh = async () => {
      try {
        const data = await fetchProductsWithVariants(
          category,
          subcategory,
          limit,
          featured,
        );
        if (data.length > 0) {
          pgCache[key] = { data, fetchedAt: Date.now() };
          setProducts(data);
        }
        // If data.length === 0, keep existing products — don't blank screen
      } catch {
        // On error, silently keep existing products
      }
    };

    const channel = supabase
      .channel(`pg-products-changes-${cacheKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        refresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category, subcategory, limit, featured]);

  // Tab switch back — show cached products instantly, refresh silently
  useEffect(() => {
    const key = getPgCacheKey(category, subcategory, limit, featured);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      // Restore cache immediately — no flicker, no skeleton
      if ((pgCache[key]?.data?.length ?? 0) > 0) {
        setProducts(pgCache[key].data);
      }
      // ALWAYS clear loading — even if cache is empty, never hang
      setLoading(false);
      // Silent background refresh
      fetchProductsWithVariants(category, subcategory, limit, featured)
        .then((data) => {
          if (data.length > 0) {
            pgCache[key] = { data, fetchedAt: Date.now() };
            setProducts(data);
          }
        })
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [category, subcategory, limit, featured]);

  // Handle back/forward navigation (bfcache pageshow)
  useEffect(() => {
    const key = getPgCacheKey(category, subcategory, limit, featured);
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // bfcache restore — always refetch fresh
        if ((pgCache[key]?.data?.length ?? 0) > 0) {
          setProducts(pgCache[key].data);
          setLoading(false);
        } else {
          setLoading(true);
        }
        fetchProductsWithVariants(category, subcategory, limit, featured)
          .then((data) => {
            if (data.length > 0) {
              pgCache[key] = { data, fetchedAt: Date.now() };
              setProducts(data);
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        // Normal page show — show cache if available, ALWAYS clear loading
        if ((pgCache[key]?.data?.length ?? 0) > 0) {
          setProducts(pgCache[key].data);
        }
        // ALWAYS clear loading so UI never hangs
        setLoading(false);
        // Silent background refresh
        fetchProductsWithVariants(category, subcategory, limit, featured)
          .then((data) => {
            if (data.length > 0) {
              pgCache[key] = { data, fetchedAt: Date.now() };
              setProducts(data);
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [category, subcategory, limit, featured]);

  const getFilterOptions = useMemo(() => {
    const categoriesSet = new Set<string>();
    const subcategoriesSet = new Set<string>();
    const colors = new Set<string>();
    const sizes = new Set<string>();
    const capacities = new Set<string>();
    const materials = new Set<string>();

    products.forEach((product) => {
      categoriesSet.add(product.category);
      subcategoriesSet.add(product.subcategory);
      product.variants?.forEach((variant) => {
        if (variant.attribute_type === "color")
          colors.add(variant.attribute_value);
        if (variant.attribute_type === "size")
          sizes.add(variant.attribute_value);
        if (variant.attribute_type === "capacity")
          capacities.add(variant.attribute_value);
        if (variant.attribute_type === "material")
          materials.add(variant.attribute_value);
      });
    });

    return {
      categories: Array.from(categoriesSet).sort(),
      subcategories: Array.from(subcategoriesSet).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort(),
      capacities: Array.from(capacities).sort(),
      materials: Array.from(materials).sort(),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    if (selectedFilters.category !== "All")
      filtered = filtered.filter(
        (p) => p.category === selectedFilters.category,
      );
    if (selectedFilters.subcategory !== "All")
      filtered = filtered.filter(
        (p) => p.subcategory === selectedFilters.subcategory,
      );
    if (selectedFilters.color !== "All")
      filtered = filtered.filter((p) =>
        p.variants?.some(
          (v) =>
            v.attribute_type === "color" &&
            v.attribute_value === selectedFilters.color,
        ),
      );
    if (selectedFilters.size !== "All")
      filtered = filtered.filter((p) =>
        p.variants?.some(
          (v) =>
            v.attribute_type === "size" &&
            v.attribute_value === selectedFilters.size,
        ),
      );
    if (selectedFilters.capacity !== "All")
      filtered = filtered.filter((p) =>
        p.variants?.some(
          (v) =>
            v.attribute_type === "capacity" &&
            v.attribute_value === selectedFilters.capacity,
        ),
      );
    if (selectedFilters.material !== "All")
      filtered = filtered.filter((p) =>
        p.variants?.some(
          (v) =>
            v.attribute_type === "material" &&
            v.attribute_value === selectedFilters.material,
        ),
      );
    return filtered;
  }, [products, selectedFilters]);

  const filteredAndSorted = useMemo(() => {
    let filtered = [...filteredProducts];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.brand && p.brand.toLowerCase().includes(s)) ||
          p.subcategory.toLowerCase().includes(s),
      );
    }
    switch (sort) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "featured":
        filtered.sort(
          (a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0),
        );
        break;
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return filtered;
  }, [filteredProducts, search, sort]);

  const handleFilterChange = (filterType: string, value: string) => {
    setSelectedFilters((prev) => ({ ...prev, [filterType]: value }));
  };

  const handleClearAllFilters = () => {
    setSelectedFilters({
      category: "All",
      subcategory: "All",
      color: "All",
      size: "All",
      capacity: "All",
      material: "All",
    });
  };

  const activeFilterCount = Object.values(selectedFilters).filter(
    (v) => v !== "All",
  ).length;

  // Show skeleton while loading
  if (loading) {
    const skeletonCount = limit ?? 8;
    return (
      <>
        <style>{`@keyframes pg-spin { to { transform: rotate(360deg); } } @keyframes pg-skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
        <div
          className={`pg-grid${columns ? ` pg-grid--cols-${columns}` : " pg-grid--cols-4"}`}
        >
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </>
    );
  }

  // No products at all — show empty state (not skeleton, not blank grid)
  if (products.length === 0) {
    return (
      <div
        className="pg-empty"
        style={{ textAlign: "center", padding: "3rem 1rem" }}
      >
        <p
          className="pg-empty-title"
          style={{ opacity: 0.5, fontSize: "1rem", margin: 0 }}
        >
          {getPgTranslation("noProductsTitle", language)}
        </p>
        <p style={{ opacity: 0.35, fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {getPgTranslation("noProductsSub", language)}
        </p>
      </div>
    );
  }

  // Search OR filter returned no results — show message
  if (filteredAndSorted.length === 0) {
    return (
      <div
        className="pg-empty"
        style={{ textAlign: "center", padding: "3rem 1rem" }}
      >
        <p
          className="pg-empty-title"
          style={{ opacity: 0.5, fontSize: "0.9rem", margin: 0 }}
        >
          {search ? (
            <>
              {getPgTranslation("noResultsSub", language)} &ldquo;{search}
              &rdquo;
            </>
          ) : (
            getPgTranslation("noProductsTitle", language)
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pg-spin { to { transform: rotate(360deg); } }
      `}</style>
      {!limit && (
        <>
          <div className="grid-controls-bar" dir={isRTLMode ? "rtl" : "ltr"}>
            <div className="grid-controls-left">
              <button
                className="filter-trigger"
                onClick={() => setIsFilterOpen(true)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polygon points="22 3 2 3 10 13 10 21 14 18 14 13 22 3" />
                </svg>
                {getPgTranslation("filters", language)}
                {activeFilterCount > 0 && (
                  <span className="filter-active-dot" />
                )}
              </button>
              <div className="per-row-selector">
                <button
                  className={`per-row-btn ${columns === 2 ? "active" : ""}`}
                  onClick={() => setColumns(2)}
                  data-tooltip="2 columns"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="8" height="18" rx="1" />
                    <rect x="13" y="3" width="8" height="18" rx="1" />
                  </svg>
                </button>
                <button
                  className={`per-row-btn ${columns === 3 ? "active" : ""}`}
                  onClick={() => setColumns(3)}
                  data-tooltip="3 columns"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="2" y="3" width="6" height="18" rx="1" />
                    <rect x="9" y="3" width="6" height="18" rx="1" />
                    <rect x="16" y="3" width="6" height="18" rx="1" />
                  </svg>
                </button>
                <button
                  className={`per-row-btn ${columns === 4 || columns === null ? "active" : ""}`}
                  onClick={() => setColumns(4)}
                  data-tooltip="4 columns"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="1" y="3" width="5" height="18" rx="1" />
                    <rect x="7" y="3" width="5" height="18" rx="1" />
                    <rect x="13" y="3" width="5" height="18" rx="1" />
                    <rect x="19" y="3" width="4" height="18" rx="1" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid-controls-right">
              <select
                className="grid-sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">
                  {getPgTranslation("newest", language)}
                </option>
                <option value="price-asc">
                  {getPgTranslation("priceLowHigh", language)}
                </option>
                <option value="price-desc">
                  {getPgTranslation("priceHighLow", language)}
                </option>
                <option value="featured">
                  {getPgTranslation("featuredFirst", language)}
                </option>
              </select>
              <span className="grid-result-count">
                <em>{filteredAndSorted.length}</em>{" "}
                {filteredAndSorted.length === 1
                  ? getPgTranslation("item", language)
                  : getPgTranslation("items", language)}
              </span>
            </div>
          </div>
          <FilterSidebar
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={getFilterOptions}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAllFilters}
          />
        </>
      )}
      <div
        className={`pg-grid${columns ? ` pg-grid--cols-${columns}` : " pg-grid--cols-4"}`}
        dir={isRTLMode ? "rtl" : "ltr"}
        suppressHydrationWarning
      >
        {filteredAndSorted.map((product) => (
          <ProductCardComponent
            key={product.id}
            productData={product}
            onQuickView={onQuickView}
            formatPrice={formatPrice}
            addToCart={addToCart}
            isRTL={isRTLMode}
          />
        ))}
      </div>
    </>
  );
}
