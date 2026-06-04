"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase, Product, ProductVariant } from "@/lib/supabase";
import "@/app/styles/product-detail.css";
import { useCartStore } from "@/lib/cartStore";
import { useCurrency } from "@/app/context/CurrencyContext";
import ProductReviews from "@/app/components/ProductReviews";
import EstimatedDelivery from "@/app/components/EstimatedDelivery";
import TrustBadges from "@/app/components/TrustBadges";
import ProductGallery from "@/app/components/ProductGallery";
import RelatedProducts from "@/app/components/RelatedProducts";
import DescriptionModal from "@/app/components/DescriptionModal";
import ProductFAQSection from "@/app/components/ProductFAQSection";
import type { ProductFAQItem } from "@/app/components/ProductFAQSection";
import { getSalePercent, applyDiscount } from "@/lib/saleStore";
import ProductVideoSection from "@/app/components/ProductVideoSection";

// ─── MODULE-LEVEL IN-MEMORY CACHE ────────────────────────────────────────────
// Only stores successful, non-null fetches. Never caches errors or nulls.
const _productCache = new Map<string, any>();
const _inFlight = new Map<string, Promise<any>>();
// ─────────────────────────────────────────────────────────────────────────────

// ─── SESSION STORAGE CACHE ───────────────────────────────────────────────────
// Survives tab switches, wifi drops, laptop sleep — anything short of a full page reload.
// We store a compact version (no heavy nested data bloat) under a versioned key.
const SESSION_CACHE_VERSION = "t4u_pd_v1";

function sessionGet(key: string): any | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_VERSION}:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sessionSet(key: string, data: any): void {
  try {
    sessionStorage.setItem(
      `${SESSION_CACHE_VERSION}:${key}`,
      JSON.stringify(data),
    );
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

function sessionDel(key: string): void {
  try {
    sessionStorage.removeItem(`${SESSION_CACHE_VERSION}:${key}`);
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
}

function extractIdFromSlug(raw: string): { id: string | null; slug: string } {
  if (!raw) return { id: null, slug: "" };
  const uuidRe =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (uuidRe.test(raw) && raw.trim().length === 36) {
    return { id: raw.trim(), slug: raw.trim() };
  }
  const doubleDashIdx = raw.lastIndexOf("--");
  if (doubleDashIdx !== -1) {
    const possibleId = raw.slice(doubleDashIdx + 2);
    if (uuidRe.test(possibleId)) {
      return { id: possibleId, slug: raw.slice(0, doubleDashIdx) };
    }
  }
  const uuidMatch = raw.match(uuidRe);
  if (uuidMatch) {
    return {
      id: uuidMatch[0],
      slug: raw.replace(uuidMatch[0], "").replace(/-+$/, ""),
    };
  }
  return { id: null, slug: raw };
}

function normalizeDescImages(val: any): string[] {
  if (!val) return [];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return val ? [val] : [];
    }
  }
  if (Array.isArray(val)) return val.filter(Boolean);
  return [];
}

function processProductData(data: any): any {
  const variants = (data.product_variants || []).map((variant: any) => {
    const variantImages = (variant.variant_images || [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((img: any) => img.image_url);
    return {
      ...variant,
      images: variantImages,
      description_images: normalizeDescImages(variant.description_images),
      description_rich: variant.description_rich || variant.description || "",
      variant_images: variant.variant_images || [],
    };
  });
  return {
    ...data,
    product_variants: variants,
    _description: data.description || "",
    _description_images: normalizeDescImages(data.description_images),
  };
}

/* ── Fetch by ID — 10s timeout, 3 retries ── */
async function fetchById(id: string): Promise<any | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const fetchResult = await Promise.race([
        supabase
          .from("products")
          .select(
            "*, description, description_images, product_variants(*, description_rich, description_images, description, variant_images(*))",
          )
          .eq("id", id)
          .eq("is_active", true)
          .single(),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: new Error("timeout") }),
            10000,
          ),
        ),
      ]);

      const { data, error } = fetchResult as any;

      if (!error && data) {
        const result = processProductData(data);
        _productCache.set(id, result);
        _productCache.set(slugify(result.name), result);
        sessionSet(id, result);
        return result;
      }

      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }
  return null;
}

/* ── Fetch by slug — single query with broad search, no waterfall ── */
async function fetchBySlugSearch(slug: string): Promise<any | null> {
  const nameApprox = slug.replace(/-/g, " ").replace(/_/g, " ");
  // Use first 2 words only — broad enough to avoid double-query fallback
  const searchTerm = nameApprox.split(" ").slice(0, 2).join(" ");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*, description, description_images, product_variants(*, description_rich, description_images, description, variant_images(*))",
        )
        .eq("is_active", true)
        .ilike("name", `%${searchTerm}%`)
        .limit(20);

      if (error || !data || data.length === 0) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const matched =
        data.find((item: any) => slugify(item.name) === slug) ||
        data.find(
          (item: any) =>
            slugify(item.name).startsWith(slug) ||
            slug.startsWith(slugify(item.name)),
        ) ||
        data[0]; // best-effort if nothing exact matches

      if (!matched) return null;

      const result = processProductData(matched);
      _productCache.set(slug, result);
      _productCache.set(matched.id, result);
      _productCache.set(slugify(matched.name), result);
      sessionSet(slug, result);
      sessionSet(matched.id, result);
      return result;
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  return null;
}

/* ── Unified cached fetch — never caches null results or failed promises ── */
async function fetchProductCached(key: string): Promise<any | null> {
  // 1. Return from in-memory cache immediately if available
  if (_productCache.has(key)) return _productCache.get(key)!;

  // 2. Also check the extracted ID from the key (cross-key cache hit)
  const { id: extractedId } = extractIdFromSlug(key);
  if (extractedId && extractedId !== key && _productCache.has(extractedId)) {
    const hit = _productCache.get(extractedId)!;
    _productCache.set(key, hit); // cross-populate
    return hit;
  }

  // 3. Check sessionStorage (survives tab switches and laptop sleep)
  const sessionHit =
    sessionGet(key) ||
    (extractedId && extractedId !== key ? sessionGet(extractedId) : null);
  if (sessionHit) {
    _productCache.set(key, sessionHit); // re-warm in-memory cache
    if (extractedId && extractedId !== key)
      _productCache.set(extractedId, sessionHit);
    return sessionHit;
  }

  // 3. If already in-flight, wait for that same promise
  if (_inFlight.has(key)) return _inFlight.get(key)!;

  const { id, slug } = extractIdFromSlug(key);

  const promise = (id ? fetchById(id) : fetchBySlugSearch(slug)).finally(() => {
    // Always remove from in-flight when done — whether success or null
    _inFlight.delete(key);
  });

  _inFlight.set(key, promise);
  return promise;
}

function _invalidateProductCache(key: string) {
  _productCache.delete(key);
  _inFlight.delete(key);
  sessionDel(key);
}

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
type TabKey = "description" | "shipping";

interface Toast {
  id: number;
  msg: string;
  type: "success" | "info";
  exiting?: boolean;
}

interface VariantImagesMap {
  [variantId: string]: string[];
}

interface BulkPricingTier {
  id?: string;
  variant_id: string;
  min_quantity: number;
  max_quantity: number;
  tier_price: number;
  discount_percentage: number | null;
  discount_price: number | null;
}

interface VariantWithDetails extends ProductVariant {
  description_images?: string[];
  description_rich?: string;
  variant_images?: { image_url: string; display_order: number }[];
}

/* ═══════════════════════════════════════════
   TOAST HOOK
═══════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        350,
      );
    }, 2800);
  }, []);

  return { toasts, show };
}

/* ═══════════════════════════════════════════
   STAR COMPONENTS
═══════════════════════════════════════════ */
function StarIcon({
  filled,
  half = false,
  size = 14,
}: {
  filled: boolean;
  half?: boolean;
  size?: number;
}) {
  if (half) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="half-grad">
            <stop offset="50%" stopColor="#b8963e" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polygon
          points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
          fill="url(#half-grad)"
          stroke="#b8963e"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
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

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= Math.round(rating)} size={size} />
      ))}
    </div>
  );
}

const createMarkup = (html: string) => ({ __html: html });

const truncateProductName = (name: string, maxLength: number = 60): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength).trim() + "...";
};

/* ═══════════════════════════════════════════
   BULK PRICING COMPONENT
═══════════════════════════════════════════ */
function BulkPricingSelector({
  tiers,
  unitPrice,
  onSelect,
  selectedTier,
  formatPrice,
}: {
  tiers: BulkPricingTier[];
  unitPrice: number;
  onSelect: (tier: BulkPricingTier | null) => void;
  selectedTier: BulkPricingTier | null;
  formatPrice: (value: number) => string;
}) {
  if (tiers.length === 0) return null;

  const getTierLabel = (tier: BulkPricingTier): string => {
    if (tier.min_quantity === tier.max_quantity) {
      return `${tier.min_quantity} Piece${tier.min_quantity > 1 ? "s" : ""}`;
    }
    return `${tier.min_quantity} – ${tier.max_quantity} Pieces`;
  };

  return (
    <div className="pd-bulk-section">
      <div className="pd-bulk-header">
        <span className="pd-bulk-title">Quantity Discounts:</span>
        {selectedTier && (
          <button
            className="pd-bulk-clear"
            onClick={() => onSelect(null)}
            title="Remove bulk selection"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        )}
      </div>
      <div className="pd-bulk-tiers">
        {tiers.map((tier, idx) => {
          const isSelected = selectedTier?.id === tier.id;
          const perPiece = tier.tier_price / tier.min_quantity;
          const saving = unitPrice - perPiece;
          const isBestValue = idx === tiers.length - 1 && tiers.length > 1;
          return (
            <button
              key={tier.id ?? idx}
              className={`pd-bulk-tier ${isSelected ? "active" : ""} ${
                isBestValue ? "best-value" : ""
              }`}
              onClick={() => onSelect(isSelected ? null : tier)}
            >
              <div className="pd-bulk-tier-qty">
                {getTierLabel(tier)}
                {isBestValue && (
                  <span className="pd-bulk-best">Best Value</span>
                )}
              </div>
              <div className="pd-bulk-tier-price">
                {formatPrice(tier.tier_price)}
              </div>
              <div className="pd-bulk-tier-perpiece">
                {formatPrice(perPiece)}/pc
              </div>
              {saving > 0 && (
                <div className="pd-bulk-tier-saving">
                  Save {formatPrice(saving)}/pc
                </div>
              )}
              {tier.discount_percentage && tier.discount_percentage > 0 && (
                <div className="pd-bulk-tier-discount">
                  {tier.discount_percentage}% OFF
                </div>
              )}
              {isSelected && (
                <div className="pd-bulk-check">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selectedTier && (
        <div className="pd-bulk-selected">
          <span className="pd-bulk-selected-label">Selected:</span>
          <span className="pd-bulk-selected-value">
            {selectedTier.min_quantity} pieces
          </span>
          <span className="pd-bulk-selected-total">
            Total: {formatPrice(selectedTier.tier_price)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CATEGORY → ROUTE MAP
═══════════════════════════════════════════ */
const categoryRoute: Record<string, string> = {
  Accessories: "/accessories",
  Watches: "/watches",
  Automotive: "/automotive",
  "Home Decor": "/home-decor",
};

const categoryLabel: Record<string, string> = {
  Accessories: "Mobile Accessories",
  Watches: "Watches",
  Automotive: "Automotive",
  "Home Decor": "Home Décor",
};

/* ═══════════════════════════════════════════
   MAIN PAGE
═════════════════════════════════════════════ */
export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();

  const rawParams = params as any;
  const rawKey: string = (() => {
    if (rawParams?.id) return (rawParams.id as string).toLowerCase();
    if (!rawParams?.slug) return "";
    if (Array.isArray(rawParams.slug)) {
      return rawParams.slug.join("--").toLowerCase();
    }
    return (rawParams.slug as string).toLowerCase();
  })();

  const { id: urlId, slug: urlSlug } = extractIdFromSlug(rawKey);
  const cacheKey = urlId || rawKey;

  const [product, setProduct] = useState<Product | null>(() => {
    if (!cacheKey) return null;
    const memHit = _productCache.get(cacheKey);
    if (memHit) return memHit;
    const sessHit = sessionGet(cacheKey);
    if (sessHit) {
      _productCache.set(cacheKey, sessHit); // re-warm in-memory cache
      return sessHit;
    }
    return null;
  });
  const [variants, setVariants] = useState<VariantWithDetails[]>([]);
  const [variantImagesMap, setVariantImagesMap] = useState<VariantImagesMap>(
    {},
  );
  const [selectedVariant, setSelectedVariant] =
    useState<VariantWithDetails | null>(null);
  const [loading, setLoading] = useState(() => {
    if (!cacheKey) return true;
    if (_productCache.has(cacheKey)) return false;
    try {
      if (sessionStorage.getItem(`${SESSION_CACHE_VERSION}:${cacheKey}`))
        return false;
    } catch {}
    return true;
  });
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const [bulkTiers, setBulkTiers] = useState<BulkPricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<BulkPricingTier | null>(
    null,
  );
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [liveRating, setLiveRating] = useState<number | null>(null);
  const [liveReviewCount, setLiveReviewCount] = useState<number | null>(null);
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [currentDescription, setCurrentDescription] = useState<string>("");
  const [currentDescriptionImages, setCurrentDescriptionImages] = useState<
    string[]
  >([]);
  const [faqs, setFaqs] = useState<ProductFAQItem[]>([]);

  const { toasts, show: showToast } = useToast();
  const { addToCart } = useCartStore();
  const { formatPrice, currency } = useCurrency();

  const [activeSalePercent, setActiveSalePercent] = useState<number | null>(
    null,
  );
  useEffect(() => {
    setActiveSalePercent(getSalePercent());
  }, []);

  // ── Hydrate all state from a product data object ──
  const hydrateFromData = useCallback((productData: any) => {
    setProduct(productData);
    setNotFound(false);
    setLiveRating(productData.rating || null);
    setLiveReviewCount(productData.reviews_count || null);

    document.title = `${productData.name} | Tech4U`;

    const variantsData: VariantWithDetails[] =
      productData.product_variants || [];

    // ── Compute product-level desc/images ──
    const productDesc =
      productData._description || productData.description || "";
    const productDescImages: string[] = Array.isArray(
      productData._description_images || productData.description_images,
    )
      ? productData._description_images || productData.description_images
      : [];

    if (variantsData.length > 0) {
      const sortedVariants = [...variantsData].sort((a: any, b: any) => {
        const order: Record<string, number> = {
          standard: 0,
          color: 1,
          size: 2,
          material: 3,
          capacity: 4,
        };
        return (order[a.attribute_type] ?? 5) - (order[b.attribute_type] ?? 5);
      });
      setVariants(sortedVariants);
      const firstVariant = sortedVariants[0];
      setSelectedVariant(firstVariant);

      // ── Pick description + images for the initially selected (first) variant ──
      const firstVariantDesc =
        firstVariant?.description_rich ||
        (firstVariant as any)?.description ||
        "";
      const firstVariantDescImages: string[] = Array.isArray(
        (firstVariant as VariantWithDetails)?.description_images,
      )
        ? ((firstVariant as VariantWithDetails).description_images as string[])
        : [];

      // Priority: variant desc images → product desc images → variant fallback
      const finalDesc = firstVariantDesc || productDesc;
      const finalDescImages =
        firstVariantDescImages.length > 0
          ? firstVariantDescImages
          : productDescImages.length > 0
            ? productDescImages
            : [];

      setCurrentDescription(finalDesc);
      setCurrentDescriptionImages(finalDescImages);

      const imagesByVariant: VariantImagesMap = {};
      variantsData.forEach((v: any) => {
        const imgs = (v.variant_images || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((img: any) => img.image_url);
        if (imgs.length > 0) imagesByVariant[v.id] = imgs;
      });
      setVariantImagesMap(imagesByVariant);
    } else {
      setVariants([]);
      setSelectedVariant(null);

      // No variants — use product-level desc/images with fallback
      const fallbackVariant = (productData.product_variants || []).find(
        (v: any) => v.description_rich || v.description,
      );
      const finalDesc =
        productDesc ||
        fallbackVariant?.description_rich ||
        fallbackVariant?.description ||
        "";
      const finalDescImages =
        productDescImages.length > 0
          ? productDescImages
          : fallbackVariant?.description_images || [];

      setCurrentDescription(finalDesc);
      setCurrentDescriptionImages(finalDescImages);
    }
  }, []);

  // ── If cache already had the product, hydrate instantly ──
  useEffect(() => {
    if (!cacheKey) return;
    const cached =
      _productCache.get(cacheKey) ||
      sessionGet(cacheKey) ||
      (urlId && urlId !== cacheKey ? _productCache.get(urlId) : null) ||
      (urlId && urlId !== cacheKey ? sessionGet(urlId) : null);
    if (cached) {
      if (!_productCache.has(cacheKey)) _productCache.set(cacheKey, cached);
      if (urlId && !_productCache.has(urlId)) _productCache.set(urlId, cached);
      hydrateFromData(cached);
      setLoading(false);
      setNotFound(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main fetch effect ──
  useEffect(() => {
    if (!cacheKey) return;

    const searchParams = new URLSearchParams(window.location.search);
    const forceRefresh = searchParams.get("refresh") === "1";

    if (forceRefresh) {
      _invalidateProductCache(cacheKey);
      if (urlId) _invalidateProductCache(urlId);
      if (urlSlug) _invalidateProductCache(urlSlug);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!forceRefresh && _productCache.has(cacheKey)) {
      hydrateFromData(_productCache.get(cacheKey));
      setLoading(false);
      setNotFound(false);
      return;
    }

    let active = true;
    setLoading(true);
    setNotFound(false);

    // Hard timeout: 15s max — if fetch takes longer, show notFound
    // (Generous timeout for slow connections; fetchById already has 10s internal timeout)
    const hardTimeout = setTimeout(() => {
      if (!active) return;
      if (_productCache.has(cacheKey)) {
        hydrateFromData(_productCache.get(cacheKey));
        setLoading(false);
        setNotFound(false);
      } else {
        // Before showing not found, check sessionStorage one last time
        const sessHit = sessionGet(cacheKey);
        if (sessHit) {
          _productCache.set(cacheKey, sessHit);
          hydrateFromData(sessHit);
          setLoading(false);
          setNotFound(false);
        } else {
          setLoading(false);
          setNotFound(true);
        }
      }
    }, 15000);

    const doFetch = async () => {
      try {
        const data = await fetchProductCached(cacheKey);
        if (!active) return; // component unmounted — do nothing
        clearTimeout(hardTimeout);
        if (data) {
          hydrateFromData(data);
          setLoading(false);
          setNotFound(false);
          return;
        }
        // First attempt returned null — invalidate and retry quickly (800ms)
        await new Promise((r) => setTimeout(r, 800));
        if (!active) return;
        _invalidateProductCache(cacheKey);
        // Also try with urlId directly if we have it (fallback for slug-parse edge cases)
        const retryData =
          (await fetchProductCached(cacheKey)) ||
          (urlId && urlId !== cacheKey
            ? await fetchProductCached(urlId)
            : null);
        if (!active) return;
        clearTimeout(hardTimeout);
        if (retryData) {
          hydrateFromData(retryData);
          setLoading(false);
          setNotFound(false);
        } else {
          // Last resort: check sessionStorage before giving up
          const sessHit =
            sessionGet(cacheKey) || (urlId ? sessionGet(urlId) : null);
          if (sessHit) {
            _productCache.set(cacheKey, sessHit);
            hydrateFromData(sessHit);
            setLoading(false);
            setNotFound(false);
          } else {
            setLoading(false);
            setNotFound(true);
          }
        }
      } catch {
        if (!active) return;
        clearTimeout(hardTimeout);
        // Check cache and sessionStorage one last time before giving up
        if (_productCache.has(cacheKey)) {
          hydrateFromData(_productCache.get(cacheKey));
          setLoading(false);
          setNotFound(false);
        } else {
          const sessHit =
            sessionGet(cacheKey) || (urlId ? sessionGet(urlId) : null);
          if (sessHit) {
            _productCache.set(cacheKey, sessHit);
            hydrateFromData(sessHit);
            setLoading(false);
            setNotFound(false);
          } else {
            setLoading(false);
            setNotFound(true);
          }
        }
      }
    };

    doFetch();

    return () => {
      active = false;
      clearTimeout(hardTimeout);
    };
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wifi reconnect retry ──
  useEffect(() => {
    if (!cacheKey) return;
    function handleOnline() {
      if (_productCache.has(cacheKey)) {
        hydrateFromData(_productCache.get(cacheKey));
        setLoading(false);
        setNotFound(false);
        return;
      }
      // Check sessionStorage before hitting network
      const sessionHit = sessionGet(cacheKey);
      if (sessionHit) {
        _productCache.set(cacheKey, sessionHit);
        hydrateFromData(sessionHit);
        setLoading(false);
        setNotFound(false);
        // Silent refresh now that we're back online
        fetchProductCached(cacheKey)
          .then((data) => {
            if (data) hydrateFromData(data);
          })
          .catch(() => {});
        return;
      }
      if (notFound || (!product && !loading)) {
        _productCache.delete(cacheKey);
        _inFlight.delete(cacheKey);
        setLoading(true);
        setNotFound(false);
        fetchProductCached(cacheKey).then((data) => {
          if (data) {
            hydrateFromData(data);
            setLoading(false);
          } else {
            setLoading(false);
            setNotFound(true);
          }
        });
      }
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [cacheKey, notFound, product, loading, hydrateFromData]);

  // ── Back/forward navigation, tab switch, popstate ──
  useEffect(() => {
    if (!cacheKey) return;

    function showFromCache() {
      const searchParams = new URLSearchParams(window.location.search);
      const forceRefresh = searchParams.get("refresh") === "1";
      if (forceRefresh) {
        _invalidateProductCache(cacheKey);
        if (urlId) _invalidateProductCache(urlId);
        if (urlSlug) _invalidateProductCache(urlSlug);
        window.history.replaceState({}, "", window.location.pathname);
      }

      // ── In-memory cache hit (try cacheKey and urlId) ──
      if (!forceRefresh) {
        const memHit =
          _productCache.get(cacheKey) ||
          (urlId && urlId !== cacheKey ? _productCache.get(urlId) : null);
        if (memHit) {
          hydrateFromData(memHit);
          setLoading(false);
          setNotFound(false);
          return;
        }
      }

      // ── SessionStorage hit (survives tab switch / laptop sleep / wifi drop) ──
      if (!forceRefresh) {
        const sessionHit =
          sessionGet(cacheKey) ||
          (urlId && urlId !== cacheKey ? sessionGet(urlId) : null);
        if (sessionHit) {
          _productCache.set(cacheKey, sessionHit);
          if (urlId) _productCache.set(urlId, sessionHit);
          hydrateFromData(sessionHit);
          setLoading(false);
          setNotFound(false);
          // Silent background refresh to keep data fresh
          fetchProductCached(cacheKey)
            .then((data) => {
              if (data) hydrateFromData(data);
            })
            .catch(() => {});
          return;
        }
      }

      // ── No cache — use functional update to read current product without wiping it ──
      setProduct((currentProduct) => {
        if (currentProduct && !forceRefresh) {
          // Product already visible — NEVER wipe it. Silent background refresh only.
          fetchProductCached(cacheKey)
            .then((data) => {
              if (data) hydrateFromData(data);
            })
            .catch(() => {});
          return currentProduct; // keep showing existing product
        }

        // No product in state — show loading and fetch
        // Use setTimeout to avoid setState-inside-setState warning
        setTimeout(() => {
          setLoading(true);
          setNotFound(false);
          fetchProductCached(cacheKey)
            .then((data) => {
              if (data) {
                hydrateFromData(data);
                setLoading(false);
                setNotFound(false);
              } else {
                // Check sessionStorage + urlId before showing error
                const fallback =
                  sessionGet(cacheKey) ||
                  (urlId && urlId !== cacheKey ? sessionGet(urlId) : null);
                if (fallback) {
                  _productCache.set(cacheKey, fallback);
                  hydrateFromData(fallback);
                  setLoading(false);
                  setNotFound(false);
                } else {
                  setLoading(false);
                  setNotFound(true);
                }
              }
            })
            .catch(() => {
              const fallback =
                sessionGet(cacheKey) ||
                (urlId && urlId !== cacheKey ? sessionGet(urlId) : null);
              if (fallback) {
                _productCache.set(cacheKey, fallback);
                hydrateFromData(fallback);
                setLoading(false);
                setNotFound(false);
              } else {
                setLoading(false);
                setNotFound(true);
              }
            });
        }, 0);

        // Return currentProduct (null here) — do NOT wipe if somehow it was set
        return currentProduct;
      });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") showFromCache();
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // bfcache restore: always do a fresh silent refresh after showing cache
        showFromCache();
        fetchProductCached(cacheKey)
          .then((data) => {
            if (data) hydrateFromData(data);
          })
          .catch(() => {});
      } else {
        showFromCache();
      }
    };
    const handlePopState = () => showFromCache();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [cacheKey, hydrateFromData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time product updates — invalidates cache when admin edits ──
  useEffect(() => {
    const productId = (product as any)?.id;
    if (!productId) return;

    const channel = supabase
      .channel(`pd-product-changes-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `id=eq.${productId}`,
        },
        () => {
          // Invalidate cache and silently refresh
          _invalidateProductCache(productId);
          _invalidateProductCache(cacheKey);
          fetchProductCached(cacheKey)
            .then((data) => {
              if (data) hydrateFromData(data);
            })
            .catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [(product as any)?.id, cacheKey, hydrateFromData]);

  // ── description/images are set inside hydrateFromData — no separate effect needed ──

  // ── Fetch bulk pricing tiers when variant changes ──
  useEffect(() => {
    if (!selectedVariant?.id) {
      setBulkTiers([]);
      setSelectedTier(null);
      return;
    }
    setLoadingTiers(true);
    setSelectedTier(null);
    const variantId = selectedVariant.id;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("bulk_pricing_tiers")
          .select("*")
          .eq("variant_id", variantId)
          .order("min_quantity", { ascending: true });
        setBulkTiers(!error && data ? data : []);
      } catch {
        setBulkTiers([]);
      } finally {
        setLoadingTiers(false);
      }
    })();
  }, [selectedVariant?.id]);

  // ── Real-time rating updates ──
  useEffect(() => {
    const productId = (product as any)?.id;
    if (!productId) return;
    const channel = supabase
      .channel(`product-rating-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "product_reviews",
          filter: `product_id=eq.${productId}`,
        },
        async () => {
          const { data } = await supabase
            .from("products")
            .select("rating, reviews_count")
            .eq("id", productId)
            .single();
          if (data) {
            setLiveRating(data.rating);
            setLiveReviewCount(data.reviews_count);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [product]);

  // ── Fetch FAQs when product loads ──
  useEffect(() => {
    const productId = (product as any)?.id;
    if (!productId) {
      setFaqs([]);
      return;
    }
    const id = productId;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("product_faqs")
          .select("id, question, answer, display_order")
          .eq("product_id", id)
          .order("display_order", { ascending: true });
        setFaqs(!error && data ? (data as ProductFAQItem[]) : []);
      } catch {
        setFaqs([]);
      }
    })();
  }, [(product as any)?.id]);

  // ── IntersectionObserver for reveal animations ──
  // NOTE: Video section (.pd-video-section) is explicitly excluded —
  // it must always stay visible regardless of scroll position.
  useEffect(() => {
    const els = document.querySelectorAll(".pd-reveal, .rp-reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && e.target.classList.add("visible"),
        ),
      { threshold: 0.12 },
    );
    els.forEach((el) => {
      // Never observe video section or anything inside it
      if (!el.closest(".pd-video-section")) {
        obs.observe(el);
      }
    });
    return () => obs.disconnect();
  }, [loading, product]);

  // ── Derived values ──
  const currentImages =
    selectedVariant?.id && variantImagesMap[selectedVariant.id]
      ? variantImagesMap[selectedVariant.id]
      : (product as any)?.images || [];

  // ── Raw base price (before any sale discount) ──
  const rawVariantPrice = selectedVariant?.price || product?.price || 0;

  // ── Sale-discounted unit price (single piece) ──
  const saleUnitPrice = activeSalePercent
    ? applyDiscount(rawVariantPrice, activeSalePercent)
    : rawVariantPrice;

  // ── Original single-piece price set by admin ──
  const singlePieceOriginal =
    (selectedVariant as any)?.original_price ||
    (product as any)?.original_price ||
    0;

  const getCurrentPrice = (): number => {
    // When a bulk tier is selected, tier_price is the TOTAL for min_quantity pieces
    if (selectedTier) return selectedTier.tier_price;
    return saleUnitPrice;
  };

  const getPerPiecePrice = (): number => {
    if (selectedTier)
      return selectedTier.tier_price / selectedTier.min_quantity;
    return saleUnitPrice;
  };

  const getQuantityToAdd = (): number => {
    return selectedTier ? selectedTier.min_quantity : qty;
  };

  const currentPrice = getCurrentPrice();
  const currentPerPiecePrice = getPerPiecePrice();

  const getOriginalPriceDisplay = (): number => {
    if (selectedTier) {
      // Original total = sale unit price × quantity (what they'd pay without bulk discount)
      // This correctly shows the saving from the bulk tier on top of the sale price
      const totalWithoutBulk = saleUnitPrice * selectedTier.min_quantity;
      if (totalWithoutBulk > selectedTier.tier_price) return totalWithoutBulk;
      return 0;
    }
    // No tier: compare against admin original_price or raw variant price (pre-sale)
    if (activeSalePercent && rawVariantPrice > 0) return rawVariantPrice;
    return singlePieceOriginal;
  };

  const currentOriginalPrice = getOriginalPriceDisplay();

  const getDiscountPercentage = (): number => {
    if (selectedTier) {
      // Discount % = how much cheaper per piece vs the sale unit price
      const perPiece = selectedTier.tier_price / selectedTier.min_quantity;
      if (saleUnitPrice > 0 && perPiece < saleUnitPrice)
        return Math.round(((saleUnitPrice - perPiece) / saleUnitPrice) * 100);
      return 0;
    }
    if (activeSalePercent && activeSalePercent > 0) return activeSalePercent;
    if (singlePieceOriginal > 0 && rawVariantPrice < singlePieceOriginal)
      return Math.round(
        ((singlePieceOriginal - rawVariantPrice) / singlePieceOriginal) * 100,
      );
    return 0;
  };

  const discount = getDiscountPercentage();

  const savings = (() => {
    if (selectedTier) {
      // Saving per piece vs buying at the sale unit price
      const perPiece = selectedTier.tier_price / selectedTier.min_quantity;
      return Math.max(0, saleUnitPrice - perPiece);
    }
    // No tier: saving vs original price
    const origPrice = currentOriginalPrice > 0 ? currentOriginalPrice : 0;
    return origPrice > currentPerPiecePrice
      ? origPrice - currentPerPiecePrice
      : 0;
  })();

  const currentStock = selectedVariant?.stock || product?.stock || 0;
  const stockClass =
    currentStock === 0 ? "out" : currentStock < 5 ? "low" : "in";
  const stockLabel =
    currentStock === 0
      ? "Out of Stock"
      : currentStock < 5
        ? `Only ${currentStock} Left`
        : "In Stock";

  const variantsByType: Record<string, VariantWithDetails[]> = {};
  variants.forEach((v) => {
    if (!variantsByType[v.attribute_type])
      variantsByType[v.attribute_type] = [];
    variantsByType[v.attribute_type].push(v);
  });

  const getVariantImage = (variantId: string): string | null => {
    const imgs = variantImagesMap[variantId];
    return imgs && imgs.length > 0 ? imgs[0] : null;
  };

  function handleVariantSelect(variant: VariantWithDetails) {
    setSelectedVariant(variant);
    setSelectedTier(null);
    setQty(1);

    // ── Update description + description images when variant changes ──
    const p = product as any;
    const productDesc = p?._description || p?.description || "";
    const productDescImages: string[] = normalizeDescImages(
      p?._description_images || p?.description_images,
    );

    // Prefer variant-level description/images if they exist
    const variantDesc =
      variant.description_rich || (variant as any).description || "";
    const variantDescImages: string[] = normalizeDescImages(
      (variant as VariantWithDetails).description_images,
    );

    // Use variant desc/images if present, else fall back to product-level
    const finalDesc = variantDesc || productDesc;
    const finalDescImages =
      variantDescImages.length > 0 ? variantDescImages : productDescImages;

    setCurrentDescription(finalDesc);
    setCurrentDescriptionImages(finalDescImages);
  }

  function handleAddToCart() {
    if (!product || currentStock === 0) return;
    const quantityToAdd = getQuantityToAdd();
    // When a bulk tier is selected, pieces_per_unit = tier min_quantity and quantity = 1 unit
    const piecesPerUnit = selectedTier ? selectedTier.min_quantity : 1;
    const productToAdd = {
      id: product.id,
      name: product.name,
      description: selectedVariant?.description || product.description || "",
      category: product.category,
      subcategory: product.subcategory,
      brand: (product as any).brand || "",
      condition: (product as any).condition,
      is_featured: (product as any).is_featured,
      is_active: product.is_active,
      images: currentImages,
      price: currentPerPiecePrice,
      original_price: selectedTier
        ? saleUnitPrice // per-piece original when bulk selected
        : currentOriginalPrice,
      stock: currentStock,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addToCart(productToAdd, selectedVariant, quantityToAdd, piecesPerUnit);
    if (selectedTier) {
      showToast(
        `${quantityToAdd} × ${product.name} (bulk) added to cart`,
        "success",
      );
    } else {
      showToast(`${quantityToAdd} × ${product.name} added to cart`, "success");
    }
  }

  function handleBuyNow() {
    if (!product || currentStock === 0) return;
    handleAddToCart();
    router.push("/checkout");
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="pd-root" style={{ minHeight: "80vh" }}>
        <style>{`
          @keyframes pd-skel-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .pd-skel {
            border-radius: 8px;
            background: linear-gradient(
              90deg,
              rgba(184,134,11,0.07) 25%,
              rgba(218,165,32,0.15) 50%,
              rgba(184,134,11,0.07) 75%
            );
            background-size: 200% 100%;
            animation: pd-skel-shimmer 1.6s infinite;
          }
          .pd-skel-wrap {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem 2rem 4rem;
          }
          .pd-skel-grid {
            display: grid;
            grid-template-columns: minmax(0,560px) 1fr;
            gap: 3.5rem;
            align-items: start;
            margin-top: 1.5rem;
          }
          .pd-skel-thumbs {
            display: flex;
            flex-direction: row;
            gap: 8px;
            margin-top: 10px;
            overflow: hidden;
          }
          .pd-skel-info {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding-top: 6px;
          }
          .pd-skel-tags {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .pd-skel-actions {
            display: flex;
            gap: 10px;
            margin-top: 4px;
          }
          @media (max-width: 1024px) {
            .pd-skel-grid {
              grid-template-columns: 1fr;
              gap: 2rem;
            }
            .pd-skel-gallery {
              max-width: 520px;
              width: 100%;
              margin: 0 auto;
            }
          }
          @media (max-width: 600px) {
            .pd-skel-wrap { padding: 1.25rem 1rem 3rem; }
            .pd-skel-grid { gap: 1.5rem; margin-top: 1rem; }
            .pd-skel-thumbs { gap: 6px; }
          }
        `}</style>

        <div className="pd-skel-wrap">
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            {[55, 16, 80, 16, 65].map((w, i) => (
              <div
                key={i}
                className="pd-skel"
                style={{ width: w, height: 12, flexShrink: 0 }}
              />
            ))}
          </div>

          <div className="pd-skel-grid">
            <div className="pd-skel-gallery">
              <div
                className="pd-skel"
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 20,
                  marginBottom: 10,
                }}
              />
              <div className="pd-skel-thumbs">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="pd-skel"
                    style={{
                      width: 66,
                      height: 66,
                      borderRadius: 10,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="pd-skel-info">
              <div className="pd-skel" style={{ width: "30%", height: 11 }} />
              <div className="pd-skel" style={{ width: "90%", height: 26 }} />
              <div className="pd-skel" style={{ width: "70%", height: 26 }} />
              <div className="pd-skel" style={{ width: "45%", height: 16 }} />
              <div
                style={{
                  height: 1,
                  background: "rgba(184,134,11,0.12)",
                  borderRadius: 1,
                }}
              />
              <div
                className="pd-skel"
                style={{ width: "50%", height: 40, borderRadius: 10 }}
              />
              <div className="pd-skel" style={{ width: "25%", height: 13 }} />
              <div className="pd-skel-tags">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="pd-skel"
                    style={{ width: 76, height: 38, borderRadius: 8 }}
                  />
                ))}
              </div>
              <div className="pd-skel" style={{ width: "28%", height: 14 }} />
              <div className="pd-skel-actions">
                <div
                  className="pd-skel"
                  style={{ width: 110, height: 52, borderRadius: 10 }}
                />
                <div
                  className="pd-skel"
                  style={{ flex: 1, height: 52, borderRadius: 10 }}
                />
                <div
                  className="pd-skel"
                  style={{ width: 52, height: 52, borderRadius: 10 }}
                />
              </div>
              <div
                className="pd-skel"
                style={{ width: "100%", height: 52, borderRadius: 10 }}
              />
              <div className="pd-skel-tags" style={{ marginTop: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="pd-skel"
                    style={{ flex: 1, height: 64, borderRadius: 10 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    if (notFound) {
      return (
        <div style={{ padding: "4rem", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h2 style={{ marginBottom: 8 }}>Product not found</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
            This product could not be found. Please check the link or try again.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                // Clear ALL cache keys for this product before retrying
                _productCache.delete(cacheKey);
                _inFlight.delete(cacheKey);
                if (urlId) {
                  _productCache.delete(urlId);
                  _inFlight.delete(urlId);
                }
                sessionDel(cacheKey);
                if (urlId) sessionDel(urlId);
                setLoading(true);
                setNotFound(false);
                // Try fetching by urlId directly first (most reliable)
                const fetchKey = urlId || cacheKey;
                fetchProductCached(fetchKey)
                  .then((data) => {
                    if (data) {
                      // Cross-populate cache so future lookups hit
                      if (urlId && urlId !== cacheKey)
                        _productCache.set(cacheKey, data);
                      hydrateFromData(data);
                      setLoading(false);
                    } else {
                      // Final fallback: try the other key
                      const altKey = fetchKey === cacheKey ? urlId : cacheKey;
                      if (altKey) {
                        return fetchProductCached(altKey).then((d) => {
                          if (d) {
                            hydrateFromData(d);
                            setLoading(false);
                          } else {
                            setLoading(false);
                            setNotFound(true);
                          }
                        });
                      }
                      setLoading(false);
                      setNotFound(true);
                    }
                  })
                  .catch(() => {
                    setLoading(false);
                    setNotFound(true);
                  });
              }}
              style={{
                padding: "10px 24px",
                background: "#b8963e",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
              }}
            >
              🔄 Try Again
            </button>
            <a
              href="/"
              style={{
                padding: "10px 24px",
                background: "rgba(255,255,255,0.08)",
                color: "#daa520",
                border: "1px solid rgba(218,165,32,0.3)",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              ← Continue Shopping
            </a>
          </div>
        </div>
      );
    }
    // Still loading (no product, no notFound) — keep showing skeleton
    return null;
  }

  const catHref = categoryRoute[(product as any).category] || "/";
  const catLabel =
    categoryLabel[(product as any).category] || (product as any).category;
  const images =
    currentImages.length > 0 ? currentImages : (product as any).images || [];
  const hasDescription = currentDescription && currentDescription.length > 0;
  const truncatedProductName = truncateProductName(product.name);

  return (
    <div className="pd-root">
      <div className="pd-ambient" aria-hidden="true" />
      <div className="pd-grain" aria-hidden="true" />
      <div className="pd-lines" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="pd-content">
        {/* ── Breadcrumb ── */}
        <nav className="pd-breadcrumb">
          <Link href="/">Home</Link>
          <span className="pd-breadcrumb-sep">›</span>
          <Link href={catHref}>{catLabel}</Link>
          <span className="pd-breadcrumb-sep">›</span>
          {(product as any).subcategory && (
            <>
              <Link
                href={`${catHref}/${(product as any).subcategory
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {(product as any).subcategory}
              </Link>
            </>
          )}
        </nav>

        <div className="pd-grid">
          {/* ── GALLERY ── */}
          {(() => {
            const mainImgs: string[] = (product as any)?.main_images || [];
            return (
              <ProductGallery
                images={currentImages}
                productName={product.name}
                mainImages={mainImgs}
              />
            );
          })()}

          {/* ── PRODUCT INFO ── */}
          <div className="pd-info">
            {(product as any).brand && (
              <p className="pd-brand">{(product as any).brand}</p>
            )}
            <h5 className="pd-title" title={product.name}>
              {truncatedProductName}
            </h5>

            {liveRating !== null &&
              liveReviewCount !== null &&
              liveReviewCount > 0 && (
                <div className="pd-rating-display">
                  <div className="pd-rating-stars-sm">
                    <StarDisplay rating={liveRating} size={14} />
                  </div>
                  <span className="pd-rating-val">{liveRating.toFixed(1)}</span>
                  <span className="pd-rating-total">
                    ({liveReviewCount} review{liveReviewCount !== 1 ? "s" : ""})
                  </span>
                </div>
              )}

            <div className="pd-sep">
              <span className="pd-sep-line" />
              <span className="pd-sep-diamond" />
              <span
                className="pd-sep-line"
                style={{
                  background:
                    "linear-gradient(to left, var(--pd-gold), transparent)",
                }}
              />
            </div>

            {/* ── Price Block ── */}
            <div className="pd-price-block">
              <div className="pd-price-row">
                <span className="pd-price">{formatPrice(currentPrice)}</span>
                {currentOriginalPrice > 0 &&
                  currentOriginalPrice > currentPrice && (
                    <span className="pd-price-original">
                      {formatPrice(currentOriginalPrice)}
                    </span>
                  )}
                {discount > 0 && (
                  <span className="pd-discount-pill">−{discount}% OFF</span>
                )}
              </div>
              {selectedTier && (
                <p className="pd-per-piece-info">
                  Per piece: {formatPrice(currentPerPiecePrice)}
                  {savings > 0 && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        color: "#22c55e",
                        fontSize: "0.78em",
                      }}
                    >
                      (Save {formatPrice(savings)}/pc)
                    </span>
                  )}
                </p>
              )}
              {!selectedTier && savings > 0 && (
                <p className="pd-savings">✦ You save {formatPrice(savings)}</p>
              )}
            </div>

            {/* ── Variant Selectors ── */}
            {Object.entries(variantsByType).map(([type, typeVariants]) => {
              const selectedForType = typeVariants.find(
                (v) => v.id === selectedVariant?.id,
              );
              return (
                <div key={type} className="pd-attr">
                  <span className="pd-attr-label">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {selectedForType && (
                      <>
                        <span className="pd-attr-label-sep">:</span>
                        <span className="pd-attr-label-value">
                          {selectedForType.attribute_value}
                        </span>
                      </>
                    )}
                    {!selectedForType && ":"}
                  </span>
                  <div className="pd-attr-tags">
                    {typeVariants.map((variant) => (
                      <button
                        key={variant.id}
                        className={`pd-attr-tag ${
                          selectedVariant?.id === variant.id ? "active" : ""
                        }`}
                        onClick={() => handleVariantSelect(variant)}
                        title={variant.attribute_value}
                      >
                        {variant.id && getVariantImage(variant.id!) && (
                          <img
                            src={getVariantImage(variant.id!)!}
                            alt={variant.attribute_value}
                            className="pd-attr-img"
                          />
                        )}
                        <span>{variant.attribute_value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ── Bulk Pricing Selector ── */}
            {bulkTiers.length > 0 && !loadingTiers && (
              <BulkPricingSelector
                tiers={bulkTiers}
                unitPrice={saleUnitPrice}
                onSelect={setSelectedTier}
                selectedTier={selectedTier}
                formatPrice={formatPrice}
              />
            )}

            {/* ── Stock Status ── */}
            <div className={`pd-stock ${stockClass}`}>
              <span className="pd-stock-dot" />
              {stockLabel}
            </div>

            {/* ── Actions ── */}
            <div className="pd-actions">
              {!selectedTier && (
                <div className="pd-qty-row">
                  <span className="pd-qty-label">Qty</span>
                  <div className="pd-qty-ctrl">
                    <button
                      className="pd-qty-btn"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="pd-qty-val">{qty}</span>
                    <button
                      className="pd-qty-btn"
                      onClick={() =>
                        setQty((q) => Math.min(currentStock, q + 1))
                      }
                      disabled={qty >= currentStock || currentStock === 0}
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
                    </button>
                  </div>
                </div>
              )}

              {selectedTier && (
                <div className="pd-bulk-qty-display">
                  <span className="pd-bulk-qty-label">Quantity:</span>
                  <span className="pd-bulk-qty-value">
                    {selectedTier.min_quantity} pieces
                  </span>
                  <span className="pd-bulk-qty-total">
                    Total: {formatPrice(selectedTier.tier_price)}
                  </span>
                </div>
              )}

              <div className="pd-cta-row">
                <button
                  className="pd-add-cart"
                  disabled={currentStock === 0}
                  onClick={handleAddToCart}
                >
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
                  {currentStock === 0
                    ? "Out of Stock"
                    : selectedTier
                      ? `Add to Cart (${selectedTier.min_quantity} pcs)`
                      : `Add to Cart (${qty} pc${qty > 1 ? "s" : ""})`}
                </button>

                <button
                  className={`pd-wishlist${wishlist ? " active" : ""}`}
                  onClick={() => {
                    setWishlist((w) => !w);
                    showToast(
                      wishlist ? "Removed from wishlist" : "Added to wishlist",
                      "success",
                    );
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </button>
              </div>

              {currentStock > 0 && (
                <button className="pd-buy-now" onClick={handleBuyNow}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
                  </svg>
                  Buy Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── VIDEO SECTION ── always visible, never hidden by scroll/reveal animations ── */}
        <div
          className="pd-video-section"
          style={{ opacity: 1, transform: "none", visibility: "visible" }}
        >
          <ProductVideoSection
            videoUrl={(product as any)?.video_url || null}
            productName={product.name}
          />
        </div>

        {/* ── TABS SECTION ── */}
        <div className="pd-tabs-section">
          <div className="pd-tab-bar">
            {[
              { key: "description", label: "Description" },
              { key: "shipping", label: "Shipping & Returns" },
            ].map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                className={`pd-tab-btn${activeTab === key ? " active" : ""}`}
                onClick={() => setActiveTab(key as TabKey)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "description" && (
            <div className="pd-tab-panel">
              <div className="pd-description-full">
                {hasDescription ? (
                  <div
                    className="pd-description-rich"
                    dangerouslySetInnerHTML={createMarkup(currentDescription)}
                  />
                ) : (
                  <p className="pd-no-description">
                    No detailed description available for this product.
                  </p>
                )}
              </div>

              {currentDescriptionImages &&
                currentDescriptionImages.length > 0 && (
                  <div className="pd-desc-images-section">
                    <div className="pd-desc-images-header">
                      <span className="pd-desc-images-line" />
                      <span className="pd-desc-images-line" />
                    </div>
                    <div className="pd-desc-images-grid pd-desc-images-grid--responsive">
                      {currentDescriptionImages.map((imgUrl, idx) => (
                        <div key={idx} className="pd-desc-img-card">
                          <div className="pd-desc-img-inner">
                            <img
                              src={imgUrl}
                              alt={`${product.name} detail ${idx + 1}`}
                              className="pd-desc-img"
                              loading="eager"
                              decoding="async"
                              draggable={false}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <div className="pd-desc-img-overlay">
                              <span className="pd-desc-img-num">
                                0{idx + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="pd-tab-panel">
              <div className="pd-shipping-content">
                <div className="pd-shipping-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <p className="pd-desc-long">
                  Free shipping on all orders over PKR 3,000. Standard delivery
                  takes 3-5 business days. Easy returns within 30 days of
                  delivery. For international shipping, please contact our
                  customer support team for rates and delivery estimates.
                </p>
                <div className="pd-shipping-features">
                  <div className="pd-ship-feature">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Free Delivery on Orders over PKR 3,000</span>
                  </div>
                  <div className="pd-ship-feature">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>30-Day Easy Returns</span>
                  </div>
                  <div className="pd-ship-feature">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Secure Packaging & Insurance</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FAQ Section ── */}
        {faqs.length > 0 && <ProductFAQSection faqs={faqs} />}

        {/* ── Estimated Delivery ── */}
        <EstimatedDelivery />

        {/* ── Trust Badges ── */}
        <TrustBadges />

        {/* ── Reviews & Ratings ── */}
        {(product as any)?.id && (
          <ProductReviews productId={(product as any).id} />
        )}

        {/* ── Related Products ── */}
        {product.id && (
          <RelatedProducts
            productId={product.id}
            category={(product as any).category}
            currentProductName={product.name}
            limit={4}
          />
        )}
      </div>

      {/* ── Description Modal ── */}
      <DescriptionModal
        isOpen={isDescModalOpen}
        onClose={() => setIsDescModalOpen(false)}
        description={
          currentDescription ||
          "No detailed description available for this product."
        }
        images={currentDescriptionImages}
        productName={
          product.name +
          (selectedVariant && selectedVariant.attribute_type !== "standard"
            ? ` (${selectedVariant.attribute_value})`
            : "")
        }
      />

      {/* ── Toast Notifications ── */}
      <div className="pd-toast-wrap">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pd-toast pd-toast--${t.type}${
              t.exiting ? " exiting" : ""
            }`}
          >
            <div className="pd-toast-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="pd-toast-msg">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
