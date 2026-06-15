"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/pagination";
import "@/app/styles/featured-products.css";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/lib/cartStore";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import QuickView from "./QuickView";
import { useSaleSync, applyDiscount } from "@/lib/saleStore";
import { swiperPerfProps } from "@/lib/useFastSwiper";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface QuickViewProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  original_price?: number;
  category: string;
  subcategory: string;
  images: string[];
  stock: number;
  description?: string;
  condition?: string;
  is_featured?: boolean;
  is_active?: boolean;
  stockStatus?: "in_stock" | "out_of_stock" | "low_stock";
  lowStockThreshold?: number | null;
}

interface FeaturedProduct {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  category: string;
  subcategory: string;
  condition: string;
  is_featured: boolean;
  is_active: boolean;
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

interface CachedData {
  products: FeaturedProduct[];
  variantsMap: Record<string, ProductVariant[]>;
  variantImagesMap: VariantImagesMap;
  fetchedAt?: number;
}

/* ── Translations ── */
const fpTranslations = {
  eyebrow: {
    en: "Curated Selection",
    ar: "مجموعة منسقة",
    de: "Kurierte Auswahl",
  },
  title: { en: "Featured", ar: "المميزة", de: "Ausgewählte" },
  titleItalic: { en: "Products", ar: "المنتجات", de: "Produkte" },
  subtitle: {
    en: "Handpicked luxury essentials across our finest categories",
    ar: "أساسيات فاخرة منتقاة عبر أفضل الفئات",
    de: "Handverlesene Luxus-Essentials aus unseren besten Kategorien",
  },
  viewAllPrefix: { en: "View All ", ar: "عرض الكل ", de: "Alle anzeigen " },
  tabs: {
    Accessories: { en: "Accessories", ar: "الإكسسوارات", de: "Zubehör" },
    Watches: { en: "Watches", ar: "الساعات", de: "Uhren" },
    Automotive: { en: "Automotive", ar: "السيارات", de: "Automobil" },
    "Home Decor": { en: "Home Decor", ar: "ديكور المنزل", de: "Wohnkultur" },
  },
  emptyTitle: {
    en: "No featured products found",
    ar: "لا توجد منتجات مميزة",
    de: "Keine ausgewählten Produkte gefunden",
  },
  emptySub: {
    en: "Check back soon for new arrivals",
    ar: "تفقد قريبًا للحصول على إصدارات جديدة",
    de: "Schauen Sie bald wieder vorbei für neue Artikel",
  },
};

const getFpTranslation = (
  key: keyof typeof fpTranslations,
  lang: "en" | "ar" | "de",
  subKey?: string,
): string => {
  if (subKey && fpTranslations[key] && (fpTranslations[key] as any)[subKey]) {
    return (fpTranslations[key] as any)[subKey][lang];
  }
  if (fpTranslations[key] && (fpTranslations[key] as any)[lang]) {
    return (fpTranslations[key] as any)[lang];
  }
  return (fpTranslations[key] as any)?.en || "";
};

/* ── Helpers ── */
const truncateProductName = (name: string, maxLength = 50) =>
  name.length <= maxLength ? name : name.substring(0, maxLength).trim() + "...";

const getStockStatus = (
  stock: number,
  threshold?: number | null,
): "in_stock" | "out_of_stock" | "low_stock" => {
  if (stock === 0) return "out_of_stock";
  if (stock >= 999999) return "in_stock";
  if (threshold && threshold > 0 && stock <= threshold) return "low_stock";
  return "in_stock";
};

/* ── Fetch function with retry + timeout ── */
async function fetchFeaturedTabData(
  tab: string,
  attempt = 0,
): Promise<CachedData> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 600;
  // FIX: 8s timeout per attempt — without this, slow wifi causes fetch to hang
  // forever and the skeleton never resolves. On timeout we fall to cached data.
  const FETCH_TIMEOUT_MS = 8000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let productsData: any[] | null = null;
    let error: any = null;

    try {
      const result = await supabase
        .from("products")
        .select("*, product_variants(*, variant_images(*))")
        .eq("is_active", true)
        .eq("is_featured", true)
        .eq("category", tab)
        .order("created_at", { ascending: false })
        .abortSignal(controller.signal);
      productsData = result.data;
      error = result.error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (error) {
      // FIX: On error, check if abort (timeout) or real error
      const isAbort =
        error?.message?.includes("abort") || error?.name === "AbortError";
      if (!isAbort && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        return fetchFeaturedTabData(tab, attempt + 1);
      }
      // FIX: Return whatever we have in tabCache rather than empty array
      // This means slow wifi shows stale data instead of blank
      if (tabCache[tab]?.products?.length) return tabCache[tab];
      return { products: [], variantsMap: {}, variantImagesMap: {} };
    }

    if (!productsData || productsData.length === 0) {
      return { products: [], variantsMap: {}, variantImagesMap: {} };
    }

    const formattedProducts: FeaturedProduct[] = productsData.map(
      (item: any) => ({
        id: item.id,
        name: item.name,
        brand: item.brand || undefined,
        description: item.description || undefined,
        category: item.category,
        subcategory: item.subcategory,
        condition: item.condition || "new",
        is_featured: item.is_featured || false,
        is_active: item.is_active || true,
        rating:
          item.rating != null && item.rating > 0 ? item.rating : undefined,
        reviews_count:
          item.reviews_count != null && item.reviews_count > 0
            ? item.reviews_count
            : undefined,
      }),
    );

    const variantsByProduct: Record<string, ProductVariant[]> = {};
    const variantImagesMap: VariantImagesMap = {};

    productsData.forEach((product: any) => {
      const variants = product.product_variants || [];
      variantsByProduct[product.id] = variants.map((variant: any) => ({
        id: variant.id,
        product_id: variant.product_id,
        attribute_type: variant.attribute_type,
        attribute_value: variant.attribute_value,
        price: variant.price,
        original_price: variant.original_price,
        description: variant.description,
        stock: variant.stock,
        low_stock_threshold: variant.low_stock_threshold,
        images: [],
        stockStatus: getStockStatus(variant.stock, variant.low_stock_threshold),
      }));

      variants.forEach((variant: any) => {
        const images = (variant.variant_images || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((img: any) => img.image_url);
        if (images.length > 0) variantImagesMap[variant.id] = images;
      });
    });

    const result: CachedData = {
      products: formattedProducts,
      variantsMap: variantsByProduct,
      variantImagesMap,
      fetchedAt: Date.now(),
    };

    tabCache[tab] = result;
    persistCacheToSession(tab, result);
    return result;
  } catch (err: any) {
    const isAbort =
      err?.name === "AbortError" || err?.message?.includes("abort");
    if (!isAbort && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      return fetchFeaturedTabData(tab, attempt + 1);
    }
    // FIX: On any failure (including wifi off), return cached data if available
    if (tabCache[tab]?.products?.length) return tabCache[tab];
    return { products: [], variantsMap: {}, variantImagesMap: {} };
  }
}

const ALL_TABS = ["Accessories", "Watches", "Automotive", "Home Decor"];
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_KEY = "fp_cache_v2";

// Module-level cache — persists across re-renders and tab changes
const tabCache: Record<string, CachedData> = {};

// ── sessionStorage helpers ──────────────────────────────────────────────────
// FIX: Module-level cache clears on page reload (it's just JS memory).
// sessionStorage survives reload, so we seed tabCache from it on startup.
// This means products show INSTANTLY even after a hard refresh.
function persistCacheToSession(tab: string, data: CachedData) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    stored[tab] = { ...data, fetchedAt: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
  } catch {
    // sessionStorage can throw if storage quota exceeded — silently ignore
  }
}

function seedCacheFromSession() {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    const now = Date.now();
    for (const tab of ALL_TABS) {
      const entry = stored[tab];
      if (
        entry &&
        Array.isArray(entry.products) &&
        entry.products.length > 0 &&
        now - (entry.fetchedAt || 0) < CACHE_TTL_MS
      ) {
        tabCache[tab] = entry;
      }
    }
  } catch {
    // ignore parse errors
  }
}

// Seed immediately when module loads (runs once per page)
seedCacheFromSession();

/* ─────────────────────────────────────────────────────────────
   STAR COMPONENTS - YELLOW COLOR
───────────────────────────────────────────────────────────── */
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

/* ── SKELETON ── */
function SkeletonCard() {
  return (
    <div className="fp-card fp-card--skeleton">
      <div className="fp-card-img fp-skel-img" style={{ paddingTop: "100%" }} />
      <div className="fp-card-body">
        <div
          className="fp-skel-line"
          style={{ width: "45%", marginBottom: 8 }}
        />
        <div className="fp-skel-line" style={{ width: "85%" }} />
        <div className="fp-skel-line" style={{ width: "65%" }} />
        <div className="fp-skel-line" style={{ width: "40%", marginTop: 12 }} />
      </div>
    </div>
  );
}

function LoadingSpinner({ size = 18 }: { size?: number }) {
  return (
    <div
      className="fp-spinner"
      style={{
        width: size,
        height: size,
        border: "2px solid rgba(220, 38, 38, 0.2)",
        borderTopColor: "#dc2626",
        borderRadius: "50%",
        animation: "fp-spin 0.8s linear infinite",
        display: "inline-block",
      }}
    />
  );
}

/* ── VARIANT THUMBNAILS ── */
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
    <div className="fp-card-variants" dir={isRTL ? "rtl" : "ltr"}>
      <span className="fp-variant-label">
        {getIcon()} {getTypeLabel()}:
      </span>
      <div className="fp-variant-thumbnails">
        {displayVariants.map((variant) => {
          const variantImage = getVariantImage(variant.id);
          const isActive = currentValue === variant.attribute_value;
          return (
            <button
              key={variant.id}
              className={`fp-variant-thumb ${isActive ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(variant);
              }}
              title={variant.attribute_value}
            >
              {variantImage ? (
                <div className="fp-variant-thumb-img">
                  <img
                    src={variantImage}
                    alt={variant.attribute_value}
                    suppressHydrationWarning
                  />
                </div>
              ) : (
                <div className="fp-variant-thumb-placeholder">
                  <span className="fp-variant-thumb-text">
                    {variant.attribute_value.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="fp-variant-thumb-label">
                {variant.attribute_value}
              </span>
            </button>
          );
        })}
        {hasMore && (
          <div className="fp-variant-more">+{variants.length - 4}</div>
        )}
      </div>
    </div>
  );
}

/* ── PRODUCT CARD ── */
function ProductCard({
  product,
  variants,
  variantImagesMap,
  onQuickView,
  isRTL,
}: {
  product: FeaturedProduct;
  variants: ProductVariant[];
  variantImagesMap: VariantImagesMap;
  onQuickView: (
    product: FeaturedProduct,
    variants: ProductVariant[],
    selectedVariant: ProductVariant | null,
    productImages: string[],
    productPrice: number,
    productStock: number,
    stockStatus: "in_stock" | "out_of_stock" | "low_stock",
    lowStockThreshold: number | null | undefined,
    variantImages: VariantImagesMap,
  ) => void;
  isRTL: boolean;
}) {
  const { formatPrice } = useCurrency();
  const { language: cardLang } = useLanguage();
  const router = useRouter();

  const [isHovered, setIsHovered] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length > 0 ? variants[0] : null,
  );
  const [currentImages, setCurrentImages] = useState<string[]>(() => {
    const firstVariant = variants[0];
    if (firstVariant && variantImagesMap[firstVariant.id]) {
      return variantImagesMap[firstVariant.id];
    }
    return [];
  });
  const [quickViewLoading, setQuickViewLoading] = useState(false);
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const { addToCart } = useCartStore();

  const liveRating =
    product.rating != null && product.rating > 0 ? product.rating : null;
  const liveReviewCount =
    product.reviews_count != null && product.reviews_count > 0
      ? product.reviews_count
      : null;

  const colorVariants = variants.filter((v) => v.attribute_type === "color");
  const sizeVariants = variants.filter((v) => v.attribute_type === "size");
  const materialVariants = variants.filter(
    (v) => v.attribute_type === "material",
  );
  const capacityVariants = variants.filter(
    (v) => v.attribute_type === "capacity",
  );

  const getVariantImage = useCallback(
    (variantId: string): string | null =>
      variantImagesMap[variantId]?.[0] || null,
    [variantImagesMap],
  );
  const getVariantImages = useCallback(
    (variantId: string): string[] => variantImagesMap[variantId] || [],
    [variantImagesMap],
  );

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setCurrentImages(getVariantImages(variant.id));
    setIsHovered(false);
  };

  const displayImage = currentImages[0] ?? null;

  const discount =
    selectedVariant?.original_price &&
    selectedVariant.original_price > selectedVariant.price
      ? Math.round(
          ((selectedVariant.original_price - selectedVariant.price) /
            selectedVariant.original_price) *
            100,
        )
      : null;

  const stockStatus = getStockStatus(
    selectedVariant?.stock || 0,
    selectedVariant?.low_stock_threshold,
  );
  const isLowStock = stockStatus === "low_stock";
  const isOutOfStock = stockStatus === "out_of_stock";
  const currentStock = selectedVariant?.stock || 0;

  const getStockLabel = () => {
    if (cardLang === "de") {
      if (isOutOfStock) return "Nicht auf Lager";
      if (isLowStock) return `Nur noch ${currentStock} vorrätig`;
      return "Auf Lager";
    }
    if (isOutOfStock) return "Out of Stock";
    if (isLowStock) return `Only ${currentStock} left`;
    return "In Stock";
  };

  const getStockClass = () => {
    if (isOutOfStock) return "out";
    if (isLowStock) return "low";
    return "in";
  };

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedVariant) {
      alert("Please select a variant first");
      return;
    }
    if (isOutOfStock) {
      alert("This product is out of stock");
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
        images: currentImages.length > 0 ? currentImages : [],
        price: selectedVariant.price,
        original_price: selectedVariant.original_price,
        stock: selectedVariant.stock,
        stockStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await addToCart(productToAdd, selectedVariant, 1, 1);
    } catch (err) {
      console.error("Add to cart error:", err);
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
    onQuickView(
      product,
      variants,
      selectedVariant,
      currentImages,
      selectedVariant?.price || 0,
      selectedVariant?.stock || 0,
      stockStatus,
      selectedVariant?.low_stock_threshold,
      variantImagesMap,
    );
    setQuickViewLoading(false);
  };

  const { saleData } = useSaleSync();
  const activeSalePercent = saleData?.percent;
  const basePrice = selectedVariant?.price || 0;
  const discountedPrice =
    activeSalePercent && activeSalePercent > 0
      ? applyDiscount(basePrice, activeSalePercent)
      : basePrice;
  const originalForDisplay =
    activeSalePercent && activeSalePercent > 0 && basePrice > 0
      ? basePrice
      : selectedVariant?.original_price || null;
  const displaySalePrice = formatPrice(discountedPrice);
  const displayOriginalPrice =
    originalForDisplay && originalForDisplay > discountedPrice
      ? formatPrice(originalForDisplay)
      : null;
  const totalDiscount =
    activeSalePercent && activeSalePercent > 0 ? activeSalePercent : discount;

  const productSlug = product.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
  const productHref = `/product/${productSlug}--${product.id}`;

  return (
    <Link
      href={productHref}
      prefetch={true}
      className="fp-card"
      style={{ cursor: "pointer", display: "block", textDecoration: "none" }}
    >
      <div
        className="fp-card-img"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            loading="eager"
            fetchPriority="high"
            decoding="auto"
            suppressHydrationWarning
          />
        ) : (
          <div className="fp-card-placeholder">
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
        <div className="fp-card-badges">
          {product.condition === "new" && !totalDiscount && (
            <span className="fp-badge fp-badge--new">
              {cardLang === "de" ? "Neu" : "New"}
            </span>
          )}
          {isLowStock && (
            <span className="fp-badge fp-badge--low">
              {cardLang === "de" ? "Wenig Bestand" : "Low Stock"}
            </span>
          )}
        </div>
        <div className="fp-icon-buttons">
          <button
            className="fp-icon-btn fp-icon-btn--view"
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
            className="fp-icon-btn fp-icon-btn--cart"
            onClick={handleAddToCart}
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

      <div className="fp-card-body" dir={isRTL ? "rtl" : "ltr"}>
        <p className="fp-card-brand">{product.brand || "\u00A0"}</p>
        <h3 className="fp-card-name" title={product.name}>
          {truncateProductName(product.name, 45)}
        </h3>
        <div className="fp-card-price-row">
          <span className="fp-card-price">{displaySalePrice}</span>
          {displayOriginalPrice && (
            <span className="fp-card-orig">{displayOriginalPrice}</span>
          )}
          {totalDiscount && totalDiscount > 0 && (
            <span className="fp-card-discount">-{totalDiscount}%</span>
          )}
        </div>
        <div className="fp-card-rating">
          {liveRating !== null &&
            liveReviewCount !== null &&
            liveReviewCount > 0 && (
              <>
                <StarDisplay rating={liveRating} size={17} />
                <span className="fp-card-rating-count">
                  ({liveReviewCount})
                </span>
              </>
            )}
        </div>
        <div className="fp-card-variants-wrapper">
          {colorVariants.length > 0 && (
            <VariantThumbnails
              variants={colorVariants}
              type="color"
              onSelect={handleVariantSelect}
              currentValue={selectedVariant?.attribute_value || ""}
              variantImagesMap={variantImagesMap}
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
              variantImagesMap={variantImagesMap}
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
              variantImagesMap={variantImagesMap}
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
              variantImagesMap={variantImagesMap}
              getVariantImage={getVariantImage}
              isRTL={isRTL}
            />
          )}
        </div>
        <div className={`fp-card-stock ${getStockClass()}`}>
          {getStockLabel()}
        </div>
      </div>
      <div className="fp-card-line" />
      <style jsx>{`
        @keyframes fp-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN FEATURED PRODUCTS COMPONENT
───────────────────────────────────────────────────────────── */
export default function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState("Accessories");
  const activeTabRef = useRef("Accessories");
  const { language, isRTLMode } = useLanguage();

  const [products, setProducts] = useState<FeaturedProduct[]>(
    // FIX: tabCache is already seeded from sessionStorage at module load,
    // so this will have data on page reload, not just SPA navigation
    () => tabCache["Accessories"]?.products || [],
  );
  const [variantsMap, setVariantsMap] = useState<
    Record<string, ProductVariant[]>
  >(() => tabCache["Accessories"]?.variantsMap || {});
  const [variantImagesMap, setVariantImagesMap] = useState<
    Record<string, string[]>
  >(() => tabCache["Accessories"]?.variantImagesMap || {});
  // FIX: isLoading starts false if we already have data from sessionStorage cache
  const [isLoading, setIsLoading] = useState(
    () => (tabCache["Accessories"]?.products?.length ?? 0) === 0,
  );

  const [quickViewProduct, setQuickViewProduct] =
    useState<QuickViewProduct | null>(null);
  const [quickViewVariants, setQuickViewVariants] = useState<ProductVariant[]>(
    [],
  );
  const [quickViewSelectedVariant, setQuickViewSelectedVariant] =
    useState<ProductVariant | null>(null);
  const [quickViewVariantImagesMap, setQuickViewVariantImagesMap] = useState<
    Record<string, string[]>
  >({});
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const [swiperKey, setSwiperKey] = useState(0);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const swiperRef = useRef<SwiperType | null>(null);

  const loadProductsForTab = useCallback(
    async (tab: string, forceRefresh = false) => {
      const cached = tabCache[tab];
      const cacheAge = cached?.fetchedAt
        ? Date.now() - cached.fetchedAt
        : Infinity;
      const cacheValid =
        (cached?.products?.length ?? 0) > 0 && cacheAge < CACHE_TTL_MS;
      const cachedHasProducts = (cached?.products?.length ?? 0) > 0;

      if (cacheValid && !forceRefresh) {
        const cached = tabCache[tab];
        setProducts(cached.products);
        setVariantsMap(cached.variantsMap);
        setVariantImagesMap(cached.variantImagesMap);
        setIsLoading(false);
        setSwiperKey((prev) => prev + 1);
        // Background silent refresh to get latest data
        fetchFeaturedTabData(tab)
          .then((data) => {
            if (activeTabRef.current === tab && data.products.length > 0) {
              setProducts(data.products);
              setVariantsMap(data.variantsMap);
              setVariantImagesMap(data.variantImagesMap);
            }
          })
          .catch(() => {});
        return;
      }

      // Show stale data instantly while refreshing (no blank screen)
      if (cachedHasProducts && !forceRefresh) {
        setProducts(cached!.products);
        setVariantsMap(cached!.variantsMap);
        setVariantImagesMap(cached!.variantImagesMap);
        setIsLoading(false);
        setSwiperKey((prev) => prev + 1);
      }

      // Only show loading spinner if there's truly nothing to show
      if (!cachedHasProducts) {
        setIsLoading(true);
      }

      try {
        const data = await fetchFeaturedTabData(tab);
        // ALWAYS update if we're still on this tab — even empty state
        if (activeTabRef.current === tab) {
          setProducts(data.products);
          setVariantsMap(data.variantsMap);
          setVariantImagesMap(data.variantImagesMap);
          if (data.products.length > 0) {
            setSwiperKey((prev) => prev + 1);
          }
        }
      } catch {
        // On error, do NOT clear products — keep whatever was showing
      } finally {
        // ALWAYS clear loading so UI never hangs
        setIsLoading(false);
      }
    },
    [],
  );

  // FIX: Single, simple mount effect. This is the ONLY effect that can set
  // isLoading=true on initial mount, and it ALWAYS resolves (finally block),
  // so the skeleton can never get permanently stuck here.
  useEffect(() => {
    let cancelled = false;
    const tab = "Accessories";
    activeTabRef.current = tab;
    const cached = tabCache[tab];
    const hasCached = (cached?.products?.length ?? 0) > 0;

    if (hasCached) {
      setProducts(cached!.products);
      setVariantsMap(cached!.variantsMap);
      setVariantImagesMap(cached!.variantImagesMap);
      setIsLoading(false);
      setSwiperKey((prev) => prev + 1);
    }

    (async () => {
      try {
        const data = await fetchFeaturedTabData(tab);
        if (cancelled || activeTabRef.current !== tab) return;
        if (data.products.length > 0) {
          setProducts(data.products);
          setVariantsMap(data.variantsMap);
          setVariantImagesMap(data.variantImagesMap);
          setSwiperKey((prev) => prev + 1);
        }
      } catch {
        // keep whatever was already showing
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Preload other tabs in background (no loading state change)
    ALL_TABS.filter((t) => t !== tab).forEach((otherTab) => {
      if ((tabCache[otherTab]?.products?.length ?? 0) === 0) {
        fetchFeaturedTabData(otherTab).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabChange = useCallback(
    async (tab: string) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      activeTabRef.current = tab;
      await loadProductsForTab(tab);
    },
    [activeTab, loadProductsForTab],
  );

  useEffect(() => {
    const channel = supabase
      .channel("fp-realtime-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload: any) => {
          const record = payload.new || payload.old || {};
          const affectedCategory = record.category;
          const isFeaturedNew = payload.new?.is_featured ?? false;
          const isFeaturedOld = payload.old?.is_featured ?? false;
          if (!isFeaturedNew && !isFeaturedOld) return;
          if (!affectedCategory || !ALL_TABS.includes(affectedCategory)) return;
          delete tabCache[affectedCategory];
          if (activeTabRef.current === affectedCategory) {
            loadProductsForTab(affectedCategory, true);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProductsForTab]);

  // FIX: visibilitychange / pageshow / bfcache handlers removed.
  // These previously could re-trigger setIsLoading(true) in edge cases
  // (e.g. seedCacheFromSession failing to repopulate tabCache), leaving
  // the skeleton stuck forever with no fetch to resolve it. The realtime
  // subscription above + the safety-net timer below are sufficient to
  // keep data fresh without risking a stuck loading state.

  // Safety net: if loading is somehow stuck, force-resolve it.
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      seedCacheFromSession();
      const tab = activeTabRef.current;
      const cached = tabCache[tab];
      if ((cached?.products?.length ?? 0) > 0) {
        setProducts(cached!.products);
        setVariantsMap(cached!.variantsMap);
        setVariantImagesMap(cached!.variantImagesMap);
        setIsLoading(false);
        setSwiperKey((prev) => prev + 1);
        return;
      }
      fetchFeaturedTabData(tab, 0)
        .then((data) => {
          if (data.products.length > 0) {
            setProducts(data.products);
            setVariantsMap(data.variantsMap);
            setVariantImagesMap(data.variantImagesMap);
            setSwiperKey((prev) => prev + 1);
          }
        })
        .finally(() => setIsLoading(false));
    }, 4000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (swiperRef.current && products.length > 0) {
      const t = setTimeout(() => {
        try {
          swiperRef.current?.update();
          swiperRef.current?.slideTo(0, 0);
        } catch {
          // swiper may be destroyed between renders — ignore
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [products]);

  const handleQuickView = (
    product: FeaturedProduct,
    variants: ProductVariant[],
    selectedVariant: ProductVariant | null,
    productImages: string[],
    productPrice: number,
    productStock: number,
    stockStatus: "in_stock" | "out_of_stock" | "low_stock",
    lowStockThreshold: number | null | undefined,
    variantImages: VariantImagesMap,
  ) => {
    setQuickViewProduct({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: productPrice,
      original_price: selectedVariant?.original_price,
      category: product.category,
      subcategory: product.subcategory,
      images: productImages,
      stock: productStock,
      description: selectedVariant?.description || product.description,
      condition: product.condition,
      is_featured: product.is_featured,
      is_active: product.is_active,
      stockStatus,
      lowStockThreshold,
    });
    setQuickViewVariants(variants);
    setQuickViewSelectedVariant(selectedVariant);
    setQuickViewVariantImagesMap(variantImages);
    setQuickViewOpen(true);
  };

  const activeTabData = [
    { key: "Accessories", label: "Accessories", href: "/accessories" },
    { key: "Watches", label: "Watches", href: "/watches" },
    { key: "Automotive", label: "Automotive", href: "/automotive" },
    { key: "Home Decor", label: "Home Decor", href: "/home-decor" },
  ].find((t) => t.key === activeTab);

  const SKELETON_COUNT = 4;

  return (
    <>
      <section className="fp-section" dir={isRTLMode ? "rtl" : "ltr"}>
        {/* Subtle grid texture */}
        <div className="fp-grid-texture" aria-hidden="true" />

        <div className="fp-container">
          <div className="fp-header">
            <div className="fp-eyebrow-row">
              <span className="fp-eyebrow">
                {getFpTranslation("eyebrow", language)}
              </span>
              <div className="fp-eyebrow-line" />
            </div>
            <h2 className="fp-title">
              {getFpTranslation("title", language)}{" "}
              <em>{getFpTranslation("titleItalic", language)}</em>
            </h2>
            <p className="fp-subtitle">
              {getFpTranslation("subtitle", language)}
            </p>

            <div className="fp-tabs" style={{ marginTop: "2rem" }}>
              {ALL_TABS.map((tab) => (
                <button
                  key={tab}
                  className={`fp-tab${activeTab === tab ? " fp-tab--active" : ""}`}
                  onClick={() => handleTabChange(tab)}
                >
                  {
                    fpTranslations.tabs[
                      tab as keyof typeof fpTranslations.tabs
                    ][language]
                  }
                </button>
              ))}
            </div>
          </div>

          <div className="fp-nav">
            <button ref={prevRef} className="fp-nav-btn" aria-label="Previous">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polyline
                  points={isRTLMode ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}
                />
              </svg>
            </button>
            <button ref={nextRef} className="fp-nav-btn" aria-label="Next">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polyline
                  points={isRTLMode ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
                />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="fp-skeleton-grid">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div
              className="fp-empty-state"
              style={{ textAlign: "center", padding: "3rem 1rem" }}
            >
              <p style={{ fontSize: "1rem", opacity: 0.5, margin: 0 }}>
                {getFpTranslation("emptyTitle", language)}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  opacity: 0.35,
                  marginTop: "0.5rem",
                }}
              >
                {getFpTranslation("emptySub", language)}
              </p>
            </div>
          ) : (
            <Swiper
              key={swiperKey}
              {...swiperPerfProps}
              modules={[Pagination, Navigation, A11y]}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                if (
                  swiper.params.navigation &&
                  typeof swiper.params.navigation !== "boolean"
                ) {
                  swiper.params.navigation.prevEl = prevRef.current;
                  swiper.params.navigation.nextEl = nextRef.current;
                  swiper.navigation.init();
                  swiper.navigation.update();
                }
              }}
              navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
              pagination={{ clickable: true }}
              spaceBetween={1}
              slidesPerView={1}
              speed={300}
              // FIX: force these AFTER swiperPerfProps spread so a misconfigured
              // perf preset (e.g. loop:true with too few slides) can never
              // crash Swiper's init and freeze the component mid-render.
              loop={false}
              observer={true}
              observeParents={true}
              breakpoints={{
                480: { slidesPerView: 2, spaceBetween: 1 },
                768: { slidesPerView: 3, spaceBetween: 1 },
                1024: { slidesPerView: 4, spaceBetween: 1 },
              }}
              className="fp-swiper"
              dir={isRTLMode ? "rtl" : "ltr"}
            >
              {products.map((product) => (
                <SwiperSlide key={product.id}>
                  <ProductCard
                    product={product}
                    variants={variantsMap[product.id] || []}
                    variantImagesMap={variantImagesMap}
                    onQuickView={handleQuickView}
                    isRTL={isRTLMode}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          )}

          <div className="fp-view-all-wrap">
            <Link
              href={activeTabData?.href || "/"}
              className="fp-view-all"
              prefetch={false}
            >
              <span>
                {getFpTranslation("viewAllPrefix", language)}
                {fpTranslations.tabs[
                  activeTab as keyof typeof fpTranslations.tabs
                ]?.[language] || activeTab}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline
                  points={isRTLMode ? "12 5 5 12 12 19" : "12 5 19 12 12 19"}
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <QuickView
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        product={quickViewProduct}
        variants={quickViewVariants}
        selectedVariant={quickViewSelectedVariant}
        variantImagesMap={quickViewVariantImagesMap}
      />
    </>
  );
}
