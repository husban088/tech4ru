"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/lib/cartStore";
import { useCurrency } from "../context/CurrencyContext";
import "@/app/styles/home-popup.css";

/* ─────────────────────────────────────────────────────────────
   TYPES (mirrored from FeaturedProducts for consistency)
───────────────────────────────────────────────────────────── */
interface PopupProduct {
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

interface PopupVariant {
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

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const ALL_POPUP_TABS = ["Accessories", "Watches", "Automotive", "Home Decor"];

const POPUP_SEEN_KEY = "hp_popup_seen_v1";

function getStockStatus(
  stock: number,
  threshold?: number | null,
): "in_stock" | "out_of_stock" | "low_stock" {
  if (stock === 0) return "out_of_stock";
  if (stock >= 999999) return "in_stock";
  if (threshold && threshold > 0 && stock <= threshold) return "low_stock";
  return "in_stock";
}

function truncate(name: string, max = 40): string {
  return name.length <= max ? name : name.substring(0, max).trim() + "…";
}

function buildSlug(name: string, id: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 60) +
    "--" +
    id
  );
}

/* ─────────────────────────────────────────────────────────────
   STAR DISPLAY
───────────────────────────────────────────────────────────── */
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      style={{ display: "block" }}
    >
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? "#c9a84c" : "none"}
        stroke="#c9a84c"
        strokeWidth="1.5"
        opacity={filled ? 1 : 0.3}
      />
    </svg>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="hpop-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= Math.round(rating)} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOADING SPINNER
───────────────────────────────────────────────────────────── */
function Spinner() {
  return <div className="hpop-spinner" />;
}

/* ─────────────────────────────────────────────────────────────
   CATEGORY ICON
───────────────────────────────────────────────────────────── */
function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "Watches":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="7" />
          <polyline points="12 9 12 12 13.5 13.5" />
          <path d="M16.5 3.5L15 7M7.5 3.5L9 7M7.5 20.5L9 17M16.5 20.5L15 17" />
        </svg>
      );
    case "Automotive":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M5 17H3v-4l2-5h14l2 5v4h-2M5 17a2 2 0 104 0M15 17a2 2 0 104 0" />
          <path d="M3 13h18" />
        </svg>
      );
    case "Home Decor":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
      );
    default: // Accessories
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 8v4l3 3" />
        </svg>
      );
  }
}

/* ─────────────────────────────────────────────────────────────
   SINGLE PRODUCT CARD (inside popup)
───────────────────────────────────────────────────────────── */
function PopupCard({
  product,
  variants,
  variantImagesMap,
  onNavigate,
}: {
  product: PopupProduct;
  variants: PopupVariant[];
  variantImagesMap: VariantImagesMap;
  onNavigate: (slug: string) => void;
}) {
  const { formatPrice } = useCurrency();
  const { addToCart } = useCartStore();

  const firstVariant = variants[0] ?? null;
  const [selectedVariant, setSelectedVariant] = useState<PopupVariant | null>(
    firstVariant,
  );
  const [cartLoading, setCartLoading] = useState(false);
  const [cartDone, setCartDone] = useState(false);

  const images: string[] = selectedVariant
    ? (variantImagesMap[selectedVariant.id] ?? [])
    : [];
  const displayImage = images[0] ?? null;

  const stockStatus = getStockStatus(
    selectedVariant?.stock ?? 0,
    selectedVariant?.low_stock_threshold,
  );
  const isOut = stockStatus === "out_of_stock";
  const isLow = stockStatus === "low_stock";

  const discount =
    selectedVariant?.original_price &&
    selectedVariant.original_price > selectedVariant.price
      ? Math.round(
          ((selectedVariant.original_price - selectedVariant.price) /
            selectedVariant.original_price) *
            100,
        )
      : null;

  const slug = buildSlug(product.name, product.id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVariant || isOut || cartLoading) return;
    setCartLoading(true);
    try {
      await addToCart(
        {
          id: product.id,
          name: product.name,
          description: selectedVariant.description || product.description || "",
          category: product.category,
          subcategory: product.subcategory,
          brand: product.brand || "",
          condition: product.condition,
          is_featured: product.is_featured,
          is_active: product.is_active,
          images,
          price: selectedVariant.price,
          original_price: selectedVariant.original_price,
          stock: selectedVariant.stock,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        selectedVariant,
        1,
        1,
      );
      setCartDone(true);
      setTimeout(() => setCartDone(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setCartLoading(false);
    }
  };

  // color variants for quick switching
  const colorVariants = variants
    .filter((v) => v.attribute_type === "color")
    .slice(0, 4);

  return (
    <div
      className="hpop-card"
      onClick={() => onNavigate(slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onNavigate(slug)}
    >
      {/* Image */}
      <div className="hpop-card-img">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="hpop-card-placeholder">
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

        {/* Badges */}
        <div className="hpop-card-badges">
          {product.condition === "new" && !discount && (
            <span className="hpop-badge hpop-badge--new">New</span>
          )}
          {discount && discount > 0 && (
            <span className="hpop-badge hpop-badge--sale">-{discount}%</span>
          )}
          {isLow && (
            <span className="hpop-badge hpop-badge--low">Low Stock</span>
          )}
        </div>

        {/* Category label */}
        <div className="hpop-card-cat">
          <span className="hpop-card-cat-icon">
            <CategoryIcon category={product.category} />
          </span>
          {product.category}
        </div>

        {/* Cart button overlay */}
        <button
          className={`hpop-cart-btn ${cartDone ? "hpop-cart-btn--done" : ""}`}
          onClick={handleAddToCart}
          disabled={isOut || cartLoading}
          aria-label="Add to cart"
        >
          {cartLoading ? (
            <Spinner />
          ) : cartDone ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
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

      {/* Body */}
      <div className="hpop-card-body">
        {product.brand && <p className="hpop-card-brand">{product.brand}</p>}
        <h4 className="hpop-card-name" title={product.name}>
          {truncate(product.name, 38)}
        </h4>

        <div className="hpop-card-price-row">
          <span className="hpop-card-price">
            {selectedVariant ? formatPrice(selectedVariant.price) : "—"}
          </span>
          {selectedVariant?.original_price && (
            <span className="hpop-card-orig">
              {formatPrice(selectedVariant.original_price)}
            </span>
          )}
        </div>

        {product.rating &&
        product.reviews_count &&
        product.reviews_count > 0 ? (
          <div className="hpop-card-rating">
            <StarRow rating={product.rating} />
            <span className="hpop-card-rating-count">
              ({product.reviews_count})
            </span>
          </div>
        ) : null}

        {/* Color swatches */}
        {colorVariants.length > 1 && (
          <div className="hpop-color-row">
            {colorVariants.map((v) => {
              const img = variantImagesMap[v.id]?.[0];
              return (
                <button
                  key={v.id}
                  className={`hpop-color-swatch ${selectedVariant?.id === v.id ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariant(v);
                  }}
                  title={v.attribute_value}
                >
                  {img ? (
                    <img src={img} alt={v.attribute_value} />
                  ) : (
                    <span>{v.attribute_value.charAt(0)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div
          className={`hpop-stock hpop-stock--${stockStatus === "in_stock" ? "in" : stockStatus === "low_stock" ? "low" : "out"}`}
        >
          {isOut
            ? "Out of Stock"
            : isLow
              ? `Only ${selectedVariant?.stock} left`
              : "In Stock"}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DATA FETCHER — one product per category
───────────────────────────────────────────────────────────── */
interface PopupData {
  product: PopupProduct;
  variants: PopupVariant[];
  variantImagesMap: VariantImagesMap;
}

async function fetchOnePerCategory(): Promise<PopupData[]> {
  const results: PopupData[] = [];

  await Promise.all(
    ALL_POPUP_TABS.map(async (cat) => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, product_variants(*, variant_images(*))")
          .eq("is_active", true)
          .eq("is_featured", true)
          .eq("category", cat)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) return;

        const item = data[0];

        const product: PopupProduct = {
          id: item.id,
          name: item.name,
          brand: item.brand || undefined,
          description: item.description || undefined,
          category: item.category,
          subcategory: item.subcategory,
          condition: item.condition || "new",
          is_featured: item.is_featured || false,
          is_active: item.is_active || true,
          rating: item.rating && item.rating > 0 ? item.rating : undefined,
          reviews_count:
            item.reviews_count && item.reviews_count > 0
              ? item.reviews_count
              : undefined,
        };

        const variantImagesMap: VariantImagesMap = {};
        const variants: PopupVariant[] = (item.product_variants || []).map(
          (v: any) => {
            const imgs = (v.variant_images || [])
              .sort((a: any, b: any) => a.display_order - b.display_order)
              .map((img: any) => img.image_url);
            if (imgs.length > 0) variantImagesMap[v.id] = imgs;
            return {
              id: v.id,
              product_id: v.product_id,
              attribute_type: v.attribute_type,
              attribute_value: v.attribute_value,
              price: v.price,
              original_price: v.original_price,
              description: v.description,
              stock: v.stock,
              low_stock_threshold: v.low_stock_threshold,
              images: [],
            };
          },
        );

        results.push({ product, variants, variantImagesMap });
      } catch (err) {
        console.error(`Error fetching category ${cat}:`, err);
      }
    }),
  );

  // Sort to match ALL_POPUP_TABS order
  return ALL_POPUP_TABS.reduce<PopupData[]>((acc, cat) => {
    const found = results.find((r) => r.product.category === cat);
    if (found) acc.push(found);
    return acc;
  }, []);
}

/* ─────────────────────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="hpop-card hpop-card--skeleton">
      <div className="hpop-card-img hpop-skel-img" />
      <div className="hpop-card-body">
        <div
          className="hpop-skel-line"
          style={{ width: "40%", marginBottom: 8 }}
        />
        <div className="hpop-skel-line" style={{ width: "80%" }} />
        <div
          className="hpop-skel-line"
          style={{ width: "55%", marginTop: 10 }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN POPUP COMPONENT
───────────────────────────────────────────────────────────── */
export default function HomePopup() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<PopupData[]>([]);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* Show popup INSTANTLY on mount — skeleton shows first, data loads behind */
  useEffect(() => {
    // 1. Show popup right away (skeleton visible)
    setIsVisible(true);
    const openTimer = setTimeout(() => setIsOpen(true), 20);

    // 2. Fetch data in background — fills in cards when ready
    fetchOnePerCategory().then((data) => {
      setItems(data);
      setLoading(false);
    });

    return () => clearTimeout(openTimer);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setIsVisible(false), 400);
  }, []);

  /* Close on overlay click (outside popup panel) */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) handleClose();
    },
    [handleClose],
  );

  /* Close on Escape key */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  /* Navigate to product and close popup */
  const handleNavigate = useCallback(
    (slug: string) => {
      handleClose();
      setTimeout(() => router.push(`/product/${slug}`), 350);
    },
    [handleClose, router],
  );

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className={`hpop-overlay ${isOpen ? "hpop-overlay--open" : ""}`}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label="Featured Products"
    >
      <div className={`hpop-panel ${isOpen ? "hpop-panel--open" : ""}`}>
        {/* Decorative corner lines */}
        <span className="hpop-corner hpop-corner--tl" />
        <span className="hpop-corner hpop-corner--tr" />
        <span className="hpop-corner hpop-corner--bl" />
        <span className="hpop-corner hpop-corner--br" />

        {/* Header */}
        <div className="hpop-header">
          <div className="hpop-header-eyebrow">
            <span className="hpop-ey-line" />
            <span>Curated for You</span>
            <span className="hpop-ey-line" />
          </div>
          <h2 className="hpop-title">
            This Season's
            <br />
            <em>Finest Picks</em>
          </h2>
          <p className="hpop-subtitle">
            One standout piece from every category — handpicked for excellence
          </p>

          {/* Close button */}
          <button
            className="hpop-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Gold divider */}
        <div className="hpop-divider" />

        {/* Products grid */}
        <div className="hpop-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : items.map(({ product, variants, variantImagesMap }) => (
                <PopupCard
                  key={product.id}
                  product={product}
                  variants={variants}
                  variantImagesMap={variantImagesMap}
                  onNavigate={handleNavigate}
                />
              ))}
        </div>

        {/* Footer */}
        <div className="hpop-footer">
          <button className="hpop-explore-btn" onClick={handleClose}>
            <span>Continue Exploring</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
