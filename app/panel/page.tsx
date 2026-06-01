"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PanelNavbar from "@/app/components/PanelNavbar";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/app/context/CurrencyContext";
import { convertPriceFromPKR } from "@/lib/panelCurrency";
import "./panel.css";
import "./panel-dashboard.css";
import { getSalePercent, applyDiscount } from "@/lib/saleStore";

// ─── Module-level cache — instant display on every revisit & navigation ────────
// Survives SPA navigation, back/forward, tab switches — never resets on re-mount
let _panelCache: PanelProduct[] | null = null;
let _panelCacheTs = 0;
const PANEL_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// ─── Types ───────────────────────────────────────────────────────────────────

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  title: string;
  msg: string;
  exiting?: boolean;
};

type StockStatus = "in_stock" | "out_of_stock" | "low_stock";

interface ProductVariantData {
  id: string;
  attribute_type: string;
  attribute_value: string;
  price: number;
  original_price?: number | null;
  stock: number;
  low_stock_threshold?: number | null;
  variant_images?: { image_url: string; display_order: number }[];
}

interface PanelProduct {
  id: string;
  name: string;
  brand?: string;
  category: string;
  subcategory: string;
  condition: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  // Derived from variants
  displayPrice: number;
  displayOriginalPrice?: number | null;
  displayImage?: string;
  stockStatus: StockStatus;
  stockCount: number;
  variantCount: number;
  discount?: number | null;
}

// ─── Category/Subcategory Structure ──────────────────────────────────────────

const CATEGORY_STRUCTURE: Record<string, string[]> = {
  Accessories: [
    "Chargers",
    "Cables",
    "Phone Holders",
    "Tech Gadgets",
    "Smart Accessories",
  ],
  Watches: ["Men Watches", "Women Watches", "Smart Watches", "Luxury Watches"],
  Automotive: ["Car Accessories", "Car Cleaning Tools", "Interior Accessories"],
  "Home Decor": [
    "Wall Decor",
    "Lighting",
    "Kitchen Essentials",
    "Storage & Organizers",
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStockStatus(stock: number, threshold?: number | null): StockStatus {
  if (stock === 0) return "out_of_stock";
  if (stock >= 999999) return "in_stock";
  if (threshold && threshold > 0 && stock <= threshold) return "low_stock";
  return "in_stock";
}

function truncate(name: string, max = 45) {
  return name.length <= max ? name : name.substring(0, max).trim() + "…";
}

// ─── Toast Container ─────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="p-toast-wrap">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`p-toast p-toast--${t.type}${t.exiting ? " exiting" : ""}`}
        >
          <div className="p-toast-icon">
            {t.type === "success" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {t.type === "error" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {t.type === "info" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
              </svg>
            )}
          </div>
          <div className="p-toast-body">
            <p className="p-toast-title">{t.title}</p>
            <p className="p-toast-msg">{t.msg}</p>
          </div>
          <button className="p-toast-close" onClick={() => onRemove(t.id)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  product,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  product: PanelProduct | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!product) return null;
  return (
    <div className="p-modal-overlay" onClick={onCancel}>
      <div className="p-modal" onClick={(e) => e.stopPropagation()}>
        <button className="p-modal-close" onClick={onCancel}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="p-modal-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </div>
        <h3 className="p-modal-title">Delete Product?</h3>
        <p className="p-modal-text">
          Are you sure you want to delete{" "}
          <strong>"{truncate(product.name, 40)}"</strong>? This action cannot be
          undone.
        </p>
        <div className="p-modal-actions">
          <button
            className="p-modal-cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="p-modal-confirm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel Product Card ───────────────────────────────────────────────────────

function PanelProductCard({
  product,
  onDelete,
  formatPrice,
  activeSalePercent,
}: {
  product: PanelProduct;
  onDelete: (product: PanelProduct) => void;
  formatPrice: (v: number) => string;
  activeSalePercent: number | null;
}) {
  const [imgError, setImgError] = useState(false);

  // ── Sale Discount Logic ──
  // Panel mein bhi same sale apply hogi jo frontend pe active hai
  const finalDisplayPrice = activeSalePercent
    ? applyDiscount(product.displayPrice, activeSalePercent)
    : product.displayPrice;

  // Original price for strikethrough:
  // Agar sale active hai → actual displayPrice original ban jaata hai
  // Warna existing displayOriginalPrice use hogi
  const finalOriginalPrice =
    activeSalePercent && product.displayPrice > 0
      ? product.displayPrice
      : (product.displayOriginalPrice ?? null);

  const totalDiscount = activeSalePercent
    ? activeSalePercent
    : (product.discount ?? null);

  const stockLabel =
    product.stockStatus === "out_of_stock"
      ? "Out of Stock"
      : product.stockStatus === "low_stock"
        ? `Low Stock (${product.stockCount})`
        : product.stockCount >= 999999
          ? "In Stock"
          : `In Stock (${product.stockCount})`;

  const stockClass =
    product.stockStatus === "out_of_stock"
      ? "out"
      : product.stockStatus === "low_stock"
        ? "low"
        : "in";

  return (
    <div className="pd-card">
      {/* ── Image ── */}
      <div className="pd-card-img">
        {product.displayImage && !imgError ? (
          <img
            src={product.displayImage}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="pd-card-placeholder">
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
        <div className="pd-card-badges">
          {product.is_featured && (
            <span className="pd-badge pd-badge--featured">Featured</span>
          )}
          {!product.is_active && (
            <span className="pd-badge pd-badge--inactive">Inactive</span>
          )}
          {totalDiscount && totalDiscount > 0 && (
            <span className="pd-badge pd-badge--discount">
              -{totalDiscount}%
            </span>
          )}
        </div>

        {/* ── Delete (top-left icon) ── */}
        <button
          className="pd-action-btn pd-action-btn--delete"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(product);
          }}
          title="Delete Product"
          aria-label="Delete Product"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </button>

        {/* ── Edit (top-right icon) ── */}
        <Link
          href={`/panel/edit-product/${product.id}`}
          className="pd-action-btn pd-action-btn--edit"
          onClick={(e) => e.stopPropagation()}
          title="Edit Product"
          aria-label="Edit Product"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </Link>
      </div>

      {/* ── Body ── */}
      <div className="pd-card-body">
        {product.brand && <p className="pd-card-brand">{product.brand}</p>}
        <h3 className="pd-card-name" title={product.name}>
          {truncate(product.name, 45)}
        </h3>

        {/* Price Row */}
        <div className="pd-card-price-row">
          <span className="pd-card-price">
            {formatPrice(finalDisplayPrice)}
          </span>
          {finalOriginalPrice && finalOriginalPrice > finalDisplayPrice && (
            <span className="pd-card-orig">
              {formatPrice(finalOriginalPrice)}
            </span>
          )}
          {totalDiscount && totalDiscount > 0 && (
            <span className="pd-card-discount-text">-{totalDiscount}%</span>
          )}
        </div>

        {/* Subcategory tag */}
        <div className="pd-card-tags">
          <span className="pd-tag">{product.subcategory}</span>
          {product.variantCount > 1 && (
            <span className="pd-tag pd-tag--variant">
              {product.variantCount} variants
            </span>
          )}
        </div>

        {/* Stock */}
        <div className={`pd-card-stock ${stockClass}`}>{stockLabel}</div>
      </div>

      {/* Bottom line */}
      <div className="pd-card-line" />
    </div>
  );
}

// ─── Subcategory Block ────────────────────────────────────────────────────────

function SubcategoryBlock({
  subcategory,
  products,
  onDelete,
  formatPrice,
  search,
  activeSalePercent,
}: {
  subcategory: string;
  products: PanelProduct[];
  onDelete: (product: PanelProduct) => void;
  formatPrice: (v: number) => string;
  search: string;
  activeSalePercent: number | null;
}) {
  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())),
      )
    : products;

  if (filtered.length === 0) return null;

  return (
    <div className="pd-subcategory-block">
      <div className="pd-subcategory-header">
        <h3 className="pd-subcategory-title">{subcategory}</h3>
        <span className="pd-subcategory-count">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </span>
      </div>
      <div className="pd-products-grid">
        {filtered.map((product) => (
          <PanelProductCard
            key={product.id}
            product={product}
            onDelete={onDelete}
            formatPrice={formatPrice}
            activeSalePercent={activeSalePercent}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  subcategories,
  productsBySubcategory,
  onDelete,
  formatPrice,
  search,
  activeSalePercent,
}: {
  category: string;
  subcategories: string[];
  productsBySubcategory: Record<string, PanelProduct[]>;
  onDelete: (product: PanelProduct) => void;
  formatPrice: (v: number) => string;
  search: string;
  activeSalePercent: number | null;
}) {
  const [expanded, setExpanded] = useState(true);

  const totalInCategory = subcategories.reduce(
    (acc, sub) => acc + (productsBySubcategory[sub]?.length || 0),
    0,
  );

  const filteredTotal = subcategories.reduce((acc, sub) => {
    const prods = productsBySubcategory[sub] || [];
    const filtered = search
      ? prods.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())),
        )
      : prods;
    return acc + filtered.length;
  }, 0);

  if (filteredTotal === 0) return null;

  return (
    <div className="pd-category-section">
      <div
        className="pd-category-header"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="pd-category-header-left">
          <span
            className="pd-category-expand"
            style={{
              transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.25s ease",
              display: "inline-flex",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
          <h2 className="pd-category-title">{category}</h2>
        </div>
        <span className="pd-category-count">
          {filteredTotal} {filteredTotal === 1 ? "product" : "products"}
        </span>
      </div>

      {expanded && (
        <div className="pd-subcategories-container">
          {subcategories.map((sub) => {
            const prods = productsBySubcategory[sub] || [];
            if (prods.length === 0 && !search) return null;
            return (
              <SubcategoryBlock
                key={sub}
                subcategory={sub}
                products={prods}
                onDelete={onDelete}
                formatPrice={formatPrice}
                search={search}
                activeSalePercent={activeSalePercent}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel Dashboard Page ────────────────────────────────────────────────

export default function PanelDashboardPage() {
  const { currency, formatPrice } = useCurrency();

  const [loading, setLoading] = useState(() => !_panelCache);

  const [allProducts, setAllProducts] = useState<PanelProduct[]>(
    () => _panelCache || [],
  );
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PanelProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Sale Discount State (localStorage se, client-only) ──
  const [activeSalePercent, setActiveSalePercent] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setActiveSalePercent(getSalePercent());
  }, []);

  // ─── Toast helpers ────────────────────────────────────────────────────────

  const addToast = (type: Toast["type"], title: string, msg: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, msg }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
    }, 4000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
  };

  // ─── Fetch Products (cache-aware + timeout) ──────────────────────────────

  const processProducts = (data: any[]): PanelProduct[] =>
    data.map((item: any) => {
      const variants: ProductVariantData[] = item.product_variants || [];
      const sorted = [...variants].sort((a, b) => {
        if (a.attribute_type === "standard") return -1;
        if (b.attribute_type === "standard") return 1;
        return a.price - b.price;
      });
      const best = sorted[0];
      let displayImage: string | undefined;
      for (const v of sorted) {
        const imgs = (v.variant_images || []).sort(
          (a: any, b: any) => a.display_order - b.display_order,
        );
        if (imgs.length > 0) {
          displayImage = imgs[0].image_url;
          break;
        }
      }
      const displayPrice = best?.price ?? 0;
      const displayOriginalPrice = best?.original_price ?? null;
      const stockCount = best?.stock ?? 0;
      const stockStatus = getStockStatus(stockCount, best?.low_stock_threshold);
      const discount =
        displayOriginalPrice && displayOriginalPrice > displayPrice
          ? Math.round(
              ((displayOriginalPrice - displayPrice) / displayOriginalPrice) *
                100,
            )
          : null;
      return {
        id: item.id,
        name: item.name,
        brand: item.brand || undefined,
        category: item.category,
        subcategory: item.subcategory,
        condition: item.condition || "new",
        is_featured: item.is_featured || false,
        is_active: item.is_active !== false,
        created_at: item.created_at,
        displayPrice,
        displayOriginalPrice,
        displayImage,
        stockStatus,
        stockCount,
        variantCount: variants.length,
        discount,
      };
    });

  const fetchProducts = useCallback(async (silent = false) => {
    // If silent (background refresh) — never show spinner
    if (!silent) {
      if (!_panelCache) setLoading(true);
    }
    // 15-second hard timeout — loading never hangs forever
    const timeoutId = setTimeout(() => {
      if (!_panelCache) setLoading(false);
    }, 15000);
    try {
      const fetchPromise = supabase
        .from("products")
        .select("*, product_variants(*, variant_images(*))")
        .order("created_at", { ascending: false });
      const timeoutRace = new Promise<{ data: null; error: Error }>((res) =>
        setTimeout(
          () => res({ data: null, error: new Error("timeout") }),
          12000,
        ),
      );
      const { data, error } = (await Promise.race([
        fetchPromise,
        timeoutRace,
      ])) as any;
      clearTimeout(timeoutId);
      if (error || !data) {
        if (!silent)
          addToast("error", "Load Failed", "Could not fetch products");
        return;
      }
      const processed = processProducts(data);
      _panelCache = processed;
      _panelCacheTs = Date.now();
      setAllProducts(processed);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Fetch error:", err);
      if (!silent) addToast("error", "Load Failed", "Could not fetch products");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If cache is fresh (< 3 min), show instantly — skip fetch
    if (_panelCache && Date.now() - _panelCacheTs < PANEL_CACHE_TTL) {
      setAllProducts(_panelCache);
      setLoading(false);
      return;
    }
    fetchProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Visibility & pageshow handlers — instant cache display ──────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Show cache immediately — never blank/spinner
        if (_panelCache) {
          setAllProducts(_panelCache);
          setLoading(false);
        }
        // Silent background refresh only if cache stale
        const age = Date.now() - _panelCacheTs;
        if (age > PANEL_CACHE_TTL) {
          fetchProducts(true);
        }
      }
    };
    const handlePageShow = (_e: PageTransitionEvent) => {
      // bfcache restore — show cached data instantly
      if (_panelCache) {
        setAllProducts(_panelCache);
        setLoading(false);
        // Always do a silent refresh after coming back from edit pages
        fetchProducts(true);
      } else {
        fetchProducts(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProducts]);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // Delete variant images and bulk pricing
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", deleteTarget.id);

      if (variants && variants.length > 0) {
        const ids = variants.map((v: any) => v.id);
        await supabase.from("variant_images").delete().in("variant_id", ids);
        await supabase
          .from("bulk_pricing_tiers")
          .delete()
          .in("variant_id", ids);
      }

      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", deleteTarget.id);
      await supabase
        .from("product_faqs")
        .delete()
        .eq("product_id", deleteTarget.id);
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      const updated = (prev: PanelProduct[]) =>
        prev.filter((p) => p.id !== deleteTarget.id);
      setAllProducts((prev) => {
        const next = updated(prev);
        // Update module-level cache so pageshow/visibility shows fresh list
        _panelCache = next;
        _panelCacheTs = Date.now();
        return next;
      });
      addToast(
        "success",
        "Deleted",
        `"${truncate(deleteTarget.name, 30)}" has been removed.`,
      );
    } catch (err) {
      console.error("Delete error:", err);
      addToast("error", "Delete Failed", "Could not delete the product.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ─── Derived Stats ────────────────────────────────────────────────────────

  const totalProducts = allProducts.length;
  const totalActive = allProducts.filter((p) => p.is_active).length;
  const totalFeatured = allProducts.filter((p) => p.is_featured).length;
  const totalOutOfStock = allProducts.filter(
    (p) => p.stockStatus === "out_of_stock",
  ).length;

  // Group by category → subcategory
  const grouped: Record<string, Record<string, PanelProduct[]>> = {};
  for (const cat of Object.keys(CATEGORY_STRUCTURE)) {
    grouped[cat] = {};
    for (const sub of CATEGORY_STRUCTURE[cat]) {
      grouped[cat][sub] = allProducts.filter(
        (p) => p.category === cat && p.subcategory === sub,
      );
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-root">
      <div className="p-ambient" aria-hidden="true" />
      <div className="p-grain" aria-hidden="true" />
      <PanelNavbar />

      <div className="p-content">
        {/* ── Page Header ── */}
        <div className="p-page-header">
          <p className="p-eyebrow">
            <span className="p-ey-line" />
            Inventory Dashboard
            <span className="p-ey-line" />
          </p>
          <h1 className="p-page-title">
            Product <em>Management</em>
          </h1>
          <p className="p-page-sub">
            All products across every category and subcategory
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="p-stats-grid">
          {[
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 3h-8l-2 4h12l-2-4z" />
                </svg>
              ),
              value: totalProducts,
              label: "Total Products",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ),
              value: totalActive,
              label: "Active",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ),
              value: totalFeatured,
              label: "Featured",
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              ),
              value: totalOutOfStock,
              label: "Out of Stock",
            },
          ].map((stat, i) => (
            <div key={i} className="p-stat-card">
              <div className="p-stat-icon">{stat.icon}</div>
              <div className="p-stat-value">{stat.value}</div>
              <div className="p-stat-label">{stat.label}</div>
              <div className="p-stat-line" />
            </div>
          ))}
        </div>

        {/* ── Controls ── */}
        <div className="pd-controls">
          <div className="pd-search-wrap">
            <svg
              className="pd-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="pd-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or brand…"
            />
            {search && (
              <button className="pd-search-clear" onClick={() => setSearch("")}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <Link href="/panel/add-product" className="pd-add-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Product
          </Link>
        </div>

        {/* Search info */}
        {search && (
          <p className="pd-search-info">
            Showing results for <em>"{search}"</em>
          </p>
        )}

        {/* ── Products by Category ── */}
        {loading ? (
          <div className="pd-loading">
            <div className="pd-spinner" />
            <p>Loading products…</p>
          </div>
        ) : totalProducts === 0 ? (
          <div className="p-empty">
            <div className="p-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 3h-8l-2 4h12l-2-4z" />
              </svg>
            </div>
            <p className="p-empty-title">No Products Yet</p>
            <p className="p-empty-sub">
              Start by adding your first product to the store.
            </p>
            <Link
              href="/panel/add-product"
              className="pd-add-btn"
              style={{ marginTop: "1rem" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add First Product
            </Link>
          </div>
        ) : (
          <div className="pd-categories-container">
            {Object.entries(CATEGORY_STRUCTURE).map(
              ([category, subcategories]) => (
                <CategorySection
                  key={category}
                  category={category}
                  subcategories={subcategories}
                  productsBySubcategory={grouped[category] || {}}
                  onDelete={setDeleteTarget}
                  formatPrice={formatPrice}
                  search={search}
                  activeSalePercent={activeSalePercent}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <style>{`@keyframes pd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
