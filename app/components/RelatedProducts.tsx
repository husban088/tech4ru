"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/lib/cartStore";
import { useCurrency } from "@/app/context/CurrencyContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { useSaleSync, applyDiscount } from "@/lib/saleStore";
import "./RelatedProducts.css";

/* ─────────────────────────────────────────────
   INTERFACES
───────────────────────────────────────────── */
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

interface ExtendedProduct {
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
  rating?: number;
  reviews_count?: number;
  low_stock_threshold?: number | null;
  stockStatus?: "in_stock" | "out_of_stock" | "low_stock";
  variants: ProductVariant[];
  variantImagesMap: VariantImagesMap;
}

interface RelatedProductsProps {
  productId: string;
  category: string;
  currentProductName?: string;
  limit?: number;
}

/* ── Translations ── */
const rpTranslations = {
  eyebrow: {
    en: "You May Also Like",
    ar: "قد يعجبك أيضًا",
    de: "Das könnte Ihnen auch gefallen",
  },
  title: { en: "You May Also", ar: "قد يعجبك", de: "Das könnte Ihnen" },
  titleItalic: { en: "Like", ar: "أيضًا", de: "auch gefallen" },
  subtitle: {
    en: "Discover more premium products from the same collection",
    ar: "اكتشف المزيد من المنتجات المميزة من نفس المجموعة",
    de: "Entdecken Sie weitere Premium-Produkte aus derselben Kollektion",
  },
  inStock: { en: "In Stock", ar: "متوفر", de: "Auf Lager" },
  outOfStock: { en: "Out of Stock", ar: "غير متوفر", de: "Nicht auf Lager" },
  lowStock: {
    en: "Only {stock} left",
    ar: "متبقي فقط {stock}",
    de: "Nur noch {stock} vorrätig",
  },
  new: { en: "New", ar: "جديد", de: "Neu" },
  featured: { en: "Featured", ar: "مميز", de: "Ausgewählt" },
};

const getRpTranslation = (
  key: keyof typeof rpTranslations,
  lang: "en" | "ar" | "de",
  params?: { stock?: number },
): string => {
  let text = "";
  if (rpTranslations[key] && (rpTranslations[key] as any)[lang]) {
    text = (rpTranslations[key] as any)[lang];
  } else {
    text = (rpTranslations[key] as any)?.en || "";
  }
  if (params?.stock && key === "lowStock") {
    text = text.replace("{stock}", params.stock.toString());
  }
  return text;
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const truncateProductName = (name: string, maxLength = 45): string => {
  if (!name) return "";
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

const typePriority: Record<string, number> = {
  standard: 0,
  color: 1,
  size: 2,
  material: 3,
  capacity: 4,
};

/* ─────────────────────────────────────────────
   STAR COMPONENTS - YELLOW COLOR (Same as Featured)
───────────────────────────────────────────── */
function StarIcon({ filled, size = 11 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? "#fbbf24" : "none"}
        stroke="#fbbf24"
        strokeWidth="1.5"
        opacity={filled ? 1 : 0.35}
      />
    </svg>
  );
}

function StarDisplay({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= Math.round(rating)} size={size} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOADING SPINNER
───────────────────────────────────────────── */
function LoadingSpinner({ size = 18 }: { size?: number }) {
  return (
    <div
      className="rp-spinner"
      style={{
        width: size,
        height: size,
        border: "2px solid rgba(0, 255, 255, 0.2)",
        borderTopColor: "#0ff",
        borderRadius: "50%",
        animation: "rp-spin 0.8s linear infinite",
        display: "inline-block",
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   VARIANT THUMBNAILS COMPONENT
───────────────────────────────────────────── */
function VariantThumbnails({
  variants,
  type,
  onSelect,
  currentValue,
  variantImagesMap,
  isRTL,
}: {
  variants: ProductVariant[];
  type: string;
  onSelect: (variant: ProductVariant) => void;
  currentValue: string;
  variantImagesMap: VariantImagesMap;
  isRTL: boolean;
}) {
  const { language } = useLanguage();

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
    if (language === "de") {
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

  const getVariantImage = (variantId: string): string | null => {
    const images = variantImagesMap[variantId];
    return images && images.length > 0 ? images[0] : null;
  };

  return (
    <div className="rp-card-variants" dir={isRTL ? "rtl" : "ltr"}>
      <span className="rp-variant-label">
        {getIcon()} {getTypeLabel()}:
      </span>
      <div className="rp-variant-thumbnails">
        {displayVariants.map((variant) => {
          const variantImage = getVariantImage(variant.id);
          const isActive = currentValue === variant.attribute_value;
          return (
            <button
              key={variant.id}
              className={`rp-variant-thumb ${isActive ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(variant);
              }}
              title={variant.attribute_value}
            >
              {variantImage ? (
                <div className="rp-variant-thumb-img">
                  <img
                    src={variantImage}
                    alt={variant.attribute_value}
                    suppressHydrationWarning
                  />
                </div>
              ) : (
                <div className="rp-variant-thumb-placeholder">
                  <span className="rp-variant-thumb-text">
                    {variant.attribute_value.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="rp-variant-thumb-label">
                {variant.attribute_value}
              </span>
            </button>
          );
        })}
        {hasMore && (
          <div className="rp-variant-more">+{variants.length - 4}</div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FETCH RELATED PRODUCTS
───────────────────────────────────────────── */
async function fetchRelatedProducts(
  productId: string,
  category: string,
  limit = 4,
): Promise<ExtendedProduct[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*, variant_images(*))")
      .eq("is_active", true)
      .eq("category", category)
      .neq("id", productId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error("RelatedProducts fetch error:", error);
      return [];
    }

    if (data.length === 0) {
      return [];
    }

    return data.map((item: any) => {
      const variants: ProductVariant[] = (item.product_variants || []).map(
        (variant: any) => {
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
        },
      );

      const sortedVariants = [...variants].sort(
        (a, b) =>
          (typePriority[a.attribute_type] ?? 5) -
          (typePriority[b.attribute_type] ?? 5),
      );

      const variantImagesMap: VariantImagesMap = {};
      variants.forEach((v) => {
        if (v.images && v.images.length > 0) {
          variantImagesMap[v.id] = v.images;
        }
      });

      const bestVariant = sortedVariants[0];

      const images =
        bestVariant?.images?.length > 0
          ? bestVariant.images
          : item.images || [];

      const stock = bestVariant?.stock ?? item.stock ?? 0;
      const lowStockThreshold =
        bestVariant?.low_stock_threshold ?? item.low_stock_threshold ?? null;

      return {
        id: item.id,
        name: item.name || "",
        description: item.description || "",
        price: bestVariant?.price ?? item.price ?? 0,
        original_price:
          bestVariant?.original_price ?? item.original_price ?? undefined,
        category: item.category,
        subcategory: item.subcategory,
        images,
        stock,
        brand: item.brand || undefined,
        condition: item.condition || "new",
        is_featured: item.is_featured || false,
        is_active: item.is_active ?? true,
        rating: item.rating,
        reviews_count: item.reviews_count,
        low_stock_threshold: lowStockThreshold,
        stockStatus: getStockStatus(stock, lowStockThreshold),
        variants: sortedVariants,
        variantImagesMap,
      };
    });
  } catch (err) {
    console.error("RelatedProducts unexpected error:", err);
    return [];
  }
}

/* ─────────────────────────────────────────────
   RELATED PRODUCT CARD
───────────────────────────────────────────── */
function RelatedProductCard({
  product,
  formatPrice,
  addToCart,
  isRTL,
}: {
  product: ExtendedProduct;
  formatPrice: (value: number) => string;
  addToCart: (
    product: any,
    variant: any,
    quantity: number,
    maxStock?: number,
  ) => Promise<void>;
  isRTL: boolean;
}) {
  const { language } = useLanguage();
  const { saleData } = useSaleSync();

  const [isHovered, setIsHovered] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null,
  );
  const [currentImages, setCurrentImages] = useState<string[]>(() => {
    if (
      product.variants.length > 0 &&
      product.variantImagesMap[product.variants[0].id]
    ) {
      return product.variantImagesMap[product.variants[0].id];
    }
    return product.images || [];
  });
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [quickViewLoading, setQuickViewLoading] = useState(false);

  const [liveRating, setLiveRating] = useState<number | null>(
    product.rating != null && product.rating > 0 ? product.rating : null,
  );
  const [liveReviewCount, setLiveReviewCount] = useState<number | null>(
    product.reviews_count != null && product.reviews_count > 0
      ? product.reviews_count
      : null,
  );

  // Realtime subscription for new reviews
  useEffect(() => {
    const channel = supabase
      .channel(`rp-live-${product.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "product_reviews",
          filter: `product_id=eq.${product.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("products")
            .select("rating, reviews_count")
            .eq("id", product.id)
            .single();
          if (data) {
            if (data.rating != null && data.rating > 0) {
              setLiveRating(data.rating);
            }
            if (data.reviews_count != null && data.reviews_count > 0) {
              setLiveReviewCount(data.reviews_count);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id]);

  const colorVariants = product.variants.filter(
    (v) => v.attribute_type === "color",
  );
  const sizeVariants = product.variants.filter(
    (v) => v.attribute_type === "size",
  );
  const materialVariants = product.variants.filter(
    (v) => v.attribute_type === "material",
  );
  const capacityVariants = product.variants.filter(
    (v) => v.attribute_type === "capacity",
  );

  const getVariantImages = useCallback(
    (variantId: string): string[] => product.variantImagesMap[variantId] || [],
    [product.variantImagesMap],
  );

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    const newImages = getVariantImages(variant.id);
    setCurrentImages(newImages);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const displayImage = currentImages[0] ?? null;

  const basePrice = selectedVariant?.price ?? product.price;
  const activeSalePercent = saleData?.percent;
  const discountedPrice =
    activeSalePercent && activeSalePercent > 0
      ? applyDiscount(basePrice, activeSalePercent)
      : basePrice;
  const originalForDisplay =
    activeSalePercent && activeSalePercent > 0 && basePrice > 0
      ? basePrice
      : (selectedVariant?.original_price ?? product.original_price ?? null);
  const displaySalePrice = formatPrice(discountedPrice);
  const displayOriginalPrice =
    originalForDisplay && originalForDisplay > discountedPrice
      ? formatPrice(originalForDisplay)
      : null;
  const totalDiscount =
    activeSalePercent && activeSalePercent > 0 ? activeSalePercent : null;

  const currentStock = selectedVariant?.stock ?? product.stock;
  const stockStatus = getStockStatus(currentStock, product.low_stock_threshold);
  const isLowStock = stockStatus === "low_stock";
  const isOutOfStock = stockStatus === "out_of_stock";

  const getStockLabel = () => {
    if (isOutOfStock) return getRpTranslation("outOfStock", language);
    if (isLowStock)
      return getRpTranslation("lowStock", language, { stock: currentStock });
    return getRpTranslation("inStock", language);
  };

  const getStockClass = () => {
    if (isOutOfStock) return "out";
    if (isLowStock) return "low";
    return "in";
  };

  const truncatedName = truncateProductName(product.name, 45);

  const productSlug = product.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
  const productHref = `/product/${productSlug}--${product.id}`;

  const handleAddToCartClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) {
      alert(getRpTranslation("outOfStock", language));
      return;
    }
    if (addToCartLoading) return;
    setAddToCartLoading(true);
    try {
      const productToAdd = {
        id: product.id,
        name: product.name,
        description: selectedVariant?.description || product.description || "",
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand || "",
        condition: product.condition,
        is_featured: product.is_featured,
        is_active: product.is_active,
        images: currentImages.length > 0 ? currentImages : product.images,
        price: discountedPrice,
        original_price: originalForDisplay || undefined,
        stock: currentStock,
        low_stock_threshold: product.low_stock_threshold,
        stockStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await addToCart(productToAdd, selectedVariant, 1, 1);
    } finally {
      setAddToCartLoading(false);
    }
  };

  const handleQuickViewClick = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewLoading(true);
    await new Promise((r) => setTimeout(r, 80));
    window.location.href = productHref;
    setQuickViewLoading(false);
  };

  return (
    <Link
      href={productHref}
      prefetch={true}
      className="rp-card"
      style={{ cursor: "pointer", display: "block", textDecoration: "none" }}
    >
      <div
        className="rp-card-img"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            suppressHydrationWarning
          />
        ) : (
          <div className="rp-img-placeholder">
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

        <div className="rp-card-badges">
          {product.is_featured && (
            <span className="rp-badge rp-badge--feat">
              {getRpTranslation("featured", language)}
            </span>
          )}
          {product.condition === "new" && !totalDiscount && (
            <span className="rp-badge rp-badge--new">
              {getRpTranslation("new", language)}
            </span>
          )}
          {totalDiscount && totalDiscount > 0 && (
            <span className="rp-badge rp-badge--sale">-{totalDiscount}%</span>
          )}
          {isLowStock && (
            <span className="rp-badge rp-badge--low">
              {getRpTranslation("lowStock", language, { stock: currentStock })}
            </span>
          )}
        </div>

        <div className="rp-icon-buttons">
          <button
            className="rp-icon-btn rp-icon-btn--view"
            onClick={handleQuickViewClick}
            aria-label="Quick View"
            disabled={quickViewLoading}
          >
            {quickViewLoading ? (
              <LoadingSpinner size={18} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z" />
              </svg>
            )}
          </button>
          <button
            className="rp-icon-btn rp-icon-btn--cart"
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

      <div className="rp-card-body" dir={isRTL ? "rtl" : "ltr"}>
        <p className="rp-card-brand">{product.brand || "\u00A0"}</p>
        <h3 className="rp-card-name" title={product.name}>
          {truncatedName}
        </h3>

        <div className="rp-card-price-row">
          <span className="rp-card-price">{displaySalePrice}</span>
          {displayOriginalPrice && (
            <span className="rp-card-orig">{displayOriginalPrice}</span>
          )}
          {totalDiscount && totalDiscount > 0 && (
            <span className="rp-card-discount">-{totalDiscount}%</span>
          )}
        </div>

        <div className="rp-rating">
          {liveRating !== null &&
            liveReviewCount !== null &&
            liveReviewCount > 0 && (
              <>
                <StarDisplay rating={liveRating} size={17} />
                <span className="rp-rating-count">({liveReviewCount})</span>
              </>
            )}
        </div>

        <div className="rp-card-variants-wrapper">
          {colorVariants.length > 0 && (
            <VariantThumbnails
              variants={colorVariants}
              type="color"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={product.variantImagesMap}
              isRTL={isRTL}
            />
          )}
          {sizeVariants.length > 0 && (
            <VariantThumbnails
              variants={sizeVariants}
              type="size"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={product.variantImagesMap}
              isRTL={isRTL}
            />
          )}
          {materialVariants.length > 0 && (
            <VariantThumbnails
              variants={materialVariants}
              type="material"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={product.variantImagesMap}
              isRTL={isRTL}
            />
          )}
          {capacityVariants.length > 0 && (
            <VariantThumbnails
              variants={capacityVariants}
              type="capacity"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={product.variantImagesMap}
              isRTL={isRTL}
            />
          )}
        </div>

        <div className={`rp-card-stock ${getStockClass()}`}>
          {getStockLabel()}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rp-skeleton-card">
      <div className="rp-skeleton-img" />
      <div className="rp-skeleton-body">
        <div className="rp-skeleton-line" style={{ width: "45%" }} />
        <div className="rp-skeleton-line" style={{ width: "85%" }} />
        <div className="rp-skeleton-line" style={{ width: "65%" }} />
        <div className="rp-skeleton-line" style={{ width: "40%" }} />
        <div className="rp-skeleton-line" style={{ width: "70%" }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function RelatedProducts({
  productId,
  category,
  limit = 4,
}: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const { formatPrice } = useCurrency();
  const { addToCart } = useCartStore();
  const { language, isRTLMode } = useLanguage();

  useEffect(() => {
    if (!productId || !category) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchRelatedProducts(productId, category, limit).then((data) => {
      if (!cancelled) {
        setRelatedProducts(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId, category, limit]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [relatedProducts]);

  if (loading) {
    return (
      <section className="rp-section" dir={isRTLMode ? "rtl" : "ltr"}>
        <div className="rp-grid-texture" aria-hidden="true" />
        <div className="rp-header">
          <div className="rp-eyebrow-row">
            <span className="rp-eyebrow">
              {getRpTranslation("eyebrow", language)}
            </span>
            <div className="rp-eyebrow-line" />
          </div>
          <h2 className="rp-title">
            {getRpTranslation("title", language)}{" "}
            <em>{getRpTranslation("titleItalic", language)}</em>
          </h2>
          <p className="rp-subtitle">
            {getRpTranslation("subtitle", language)}
          </p>
        </div>
        <div className="rp-grid">
          {[...Array(limit)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (relatedProducts.length === 0) return null;

  return (
    <section
      className="rp-section rp-reveal"
      ref={sectionRef}
      dir={isRTLMode ? "rtl" : "ltr"}
    >
      <div className="rp-grid-texture" aria-hidden="true" />
      <div className="rp-header">
        <div className="rp-eyebrow-row">
          <span className="rp-eyebrow">
            {getRpTranslation("eyebrow", language)}
          </span>
          <div className="rp-eyebrow-line" />
        </div>
        <h2 className="rp-title">
          {getRpTranslation("title", language)}{" "}
          <em>{getRpTranslation("titleItalic", language)}</em>
        </h2>
        <p className="rp-subtitle">{getRpTranslation("subtitle", language)}</p>
      </div>
      <div className="rp-grid">
        {relatedProducts.map((product) => (
          <RelatedProductCard
            key={product.id}
            product={product}
            formatPrice={formatPrice}
            addToCart={addToCart}
            isRTL={isRTLMode}
          />
        ))}
      </div>

      <style>{`
        @keyframes rp-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rp-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
}
