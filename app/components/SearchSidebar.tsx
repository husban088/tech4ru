"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./searchsidebar.css";
import { useCurrency } from "../context/CurrencyContext";

interface SearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  brand?: string;
  category: string;
  subcategory: string;
  price: number;
  original_price?: number;
  images: string[];
  slug?: string;
  stockStatus?: "in_stock" | "out_of_stock" | "low_stock";
}

const trendingSearches = [
  "Watches",
  "Accessories",
  "Chargers",
  "Phone Holders",
  "Smart Watches",
  "Luxury Watches",
];

const RECENT_SEARCHES_KEY = "tech4u_recent_searches";
const MAX_RECENT = 5;

export default function SearchSidebar({ isOpen, onClose }: SearchSidebarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allProductsCache, setAllProductsCache] = useState<SearchResult[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { formatPrice } = useCurrency();

  // Mark client-side after hydration
  useEffect(() => {
    setIsClient(true);
    setMounted(true);
  }, []);

  // ============================================================
  // FETCH ALL PRODUCTS ONCE FOR CACHING (only on client)
  // ============================================================
  useEffect(() => {
    if (!isClient) return;

    async function fetchAllProducts() {
      try {
        // Fetch all active products
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, name, brand, category, subcategory, images, is_active")
          .eq("is_active", true);

        if (productsError) {
          console.error("Error fetching products:", productsError);
          return;
        }

        if (!products || products.length === 0) return;

        // Fetch all variants with images
        const productIds = products.map((p) => p.id);
        const { data: variants, error: variantsError } = await supabase
          .from("product_variants")
          .select(
            `
            id,
            product_id,
            price,
            original_price,
            attribute_type,
            stock,
            variant_images (
              image_url,
              display_order
            )
          `,
          )
          .in("product_id", productIds)
          .eq("is_active", true);

        if (variantsError) {
          console.error("Error fetching variants:", variantsError);
        }

        // Build variant map with images
        const variantMap: Record<string, any> = {};
        variants?.forEach((variant) => {
          if (
            !variantMap[variant.product_id] ||
            variant.attribute_type === "standard"
          ) {
            // Get the first image from variant_images
            let variantImage = null;
            if (variant.variant_images && variant.variant_images.length > 0) {
              const sortedImages = [...variant.variant_images].sort(
                (a, b) => (a.display_order || 0) - (b.display_order || 0),
              );
              variantImage = sortedImages[0]?.image_url;
            }

            variantMap[variant.product_id] = {
              price: variant.price,
              original_price: variant.original_price,
              stock: variant.stock,
              variantImage: variantImage,
            };
          }
        });

        // Format products with their images
        const formattedProducts: SearchResult[] = products.map((product) => {
          // Get product images from product.images array first
          let productImages: string[] = [];

          if (
            product.images &&
            Array.isArray(product.images) &&
            product.images.length > 0
          ) {
            productImages = product.images;
          } else {
            // Try to get from variant
            const variantData = variantMap[product.id];
            if (variantData?.variantImage) {
              productImages = [variantData.variantImage];
            }
          }

          return {
            id: product.id,
            name: product.name,
            brand: product.brand,
            category: product.category,
            subcategory: product.subcategory,
            price: variantMap[product.id]?.price || 0,
            original_price: variantMap[product.id]?.original_price,
            images: productImages,
          };
        });

        setAllProductsCache(formattedProducts);

        // Also set trending products (featured)
        const { data: featuredProducts } = await supabase
          .from("products")
          .select("id, name, brand, category, subcategory, images")
          .eq("is_active", true)
          .eq("is_featured", true)
          .limit(4);

        if (featuredProducts && featuredProducts.length > 0) {
          const featuredFormatted: SearchResult[] = featuredProducts.map(
            (p) => {
              let featuredImages: string[] = [];
              if (p.images && Array.isArray(p.images) && p.images.length > 0) {
                featuredImages = p.images;
              } else {
                const variantData = variantMap[p.id];
                if (variantData?.variantImage) {
                  featuredImages = [variantData.variantImage];
                }
              }

              return {
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                subcategory: p.subcategory,
                price: variantMap[p.id]?.price || 0,
                original_price: variantMap[p.id]?.original_price,
                images: featuredImages,
              };
            },
          );
          setTrendingProducts(featuredFormatted);
        }
      } catch (err) {
        console.error("Error in fetchAllProducts:", err);
      }
    }

    fetchAllProducts();
  }, [isClient]);

  // ============================================================
  // REAL-TIME SEARCH FROM CACHE (INSTANT RESULTS)
  // ============================================================
  const performSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      setShowResults(true);

      // Search in cached products (instant, no delay)
      const searchTerm = searchQuery.trim().toLowerCase();

      const filteredResults = allProductsCache.filter((product) => {
        return (
          product.name.toLowerCase().includes(searchTerm) ||
          (product.brand && product.brand.toLowerCase().includes(searchTerm)) ||
          product.category.toLowerCase().includes(searchTerm) ||
          product.subcategory.toLowerCase().includes(searchTerm)
        );
      });

      // Limit to 20 results
      setResults(filteredResults.slice(0, 20));
      setLoading(false);
    },
    [allProductsCache],
  );

  // Debounced search - triggers as user types
  useEffect(() => {
    if (!isClient) return;

    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const delayDebounce = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query, performSearch, isClient]);

  // Load recent searches from localStorage (only on client)
  useEffect(() => {
    if (!isClient) return;

    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent searches", e);
      }
    }
  }, [isClient]);

  // Save recent search
  const saveRecentSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (s) => s.toLowerCase() !== searchTerm.toLowerCase(),
      );
      const updated = [searchTerm, ...filtered].slice(0, MAX_RECENT);
      if (typeof window !== "undefined") {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, []);

  // Handle search submit (Enter key or View All button)
  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
    onClose();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, saveRecentSearch, onClose, router]);

  // Handle result click
  const handleResultClick = useCallback(
    (productId: string, productName: string) => {
      saveRecentSearch(productName);
      onClose();
      router.push(`/product/${productId}`);
    },
    [saveRecentSearch, onClose, router],
  );

  // Handle trending/quick link click
  const handleQuickSearch = useCallback(
    (term: string) => {
      setQuery(term);
      saveRecentSearch(term);
      performSearch(term);
      onClose();
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [saveRecentSearch, onClose, router, performSearch],
  );

  // Focus input when sidebar opens
  useEffect(() => {
    if (!isClient) return;

    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setQuery("");
      setResults([]);
      setShowResults(false);
    }
  }, [isOpen, isClient]);

  // Handle escape key
  useEffect(() => {
    if (!isClient) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
      if (e.key === "Enter" && isOpen && query) handleSearch();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, query, handleSearch, isClient]);

  // Body scroll lock
  useEffect(() => {
    if (!isClient) return;

    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isClient]);

  const handleSidebarClick = (e: React.MouseEvent) => e.stopPropagation();

  // Category links for quick access
  const categoryLinks = [
    { name: "Watches", href: "/watches", icon: "⌚" },
    { name: "Accessories", href: "/accessories", icon: "📱" },
    { name: "Automotive", href: "/automotive", icon: "🚗" },
    { name: "Home Decor", href: "/home-decor", icon: "🏠" },
  ];

  // Don't render anything on server to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <>
      <div
        className={`ss-overlay${isOpen ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sidebarRef}
        className={`ss-sidebar${isOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={handleSidebarClick}
        suppressHydrationWarning
      >
        <div className="ss-deco-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="ss-header">
          <div className="ss-header-top">
            <div className="ss-header-label">
              <span className="ss-label-line" />
              <span className="ss-label-text">Search</span>
              <span className="ss-label-line" />
            </div>
            <button
              className="ss-close-btn"
              onClick={onClose}
              aria-label="Close search"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <h2 className="ss-title">
            Discover <em>Luxury</em>
          </h2>
        </div>

        <div
          className={`ss-input-wrap${focused ? " focused" : ""}${query ? " filled" : ""}`}
        >
          <span className="ss-input-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            className="ss-input"
            placeholder="Search watches, accessories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Search products"
            suppressHydrationWarning
          />
          {query && (
            <button
              className="ss-clear-btn"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <div className="ss-input-line" aria-hidden="true" />
        </div>

        <div className="ss-content">
          {showResults && query && (
            <div className="ss-results">
              {loading ? (
                <div className="ss-loading">
                  <div className="ss-loading-spinner" />
                  <p>Searching products...</p>
                </div>
              ) : results.length > 0 ? (
                <>
                  <p className="ss-results-label">
                    Found <em>{results.length}</em> result
                    {results.length !== 1 ? "s" : ""} for "{query}"
                  </p>
                  <div className="ss-results-list">
                    {results.map((product) => (
                      <button
                        key={product.id}
                        className="ss-result-item"
                        onClick={() =>
                          handleResultClick(product.id, product.name)
                        }
                      >
                        <div className="ss-result-img">
                          {product.images &&
                          product.images.length > 0 &&
                          product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              suppressHydrationWarning
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (
                                  parent &&
                                  parent.querySelector(
                                    ".ss-result-placeholder-fallback",
                                  )
                                ) {
                                  // Already has fallback
                                } else if (parent) {
                                  const fallback =
                                    document.createElement("div");
                                  fallback.className =
                                    "ss-result-placeholder ss-result-placeholder-fallback";
                                  fallback.innerHTML = `
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                                      <circle cx="8.5" cy="8.5" r="1.5"/>
                                      <polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                  `;
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <div className="ss-result-placeholder">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ss-result-info">
                          {product.brand && (
                            <span className="ss-result-brand">
                              {product.brand}
                            </span>
                          )}
                          <span className="ss-result-name">{product.name}</span>
                          <span className="ss-result-category">
                            {product.subcategory || product.category}
                          </span>
                          <span className="ss-result-price">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                        <span className="ss-result-arrow">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button className="ss-view-all" onClick={handleSearch}>
                    View all results for "{query}"
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="ss-no-results">
                  <div className="ss-no-results-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <p>No products found for "{query}"</p>
                  <p className="ss-no-results-sub">Try different keywords</p>
                </div>
              )}
            </div>
          )}

          {!showResults && (
            <>
              <div className="ss-section">
                <p className="ss-section-label">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="14"
                    height="14"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  Trending
                </p>
                <div className="ss-tags">
                  {trendingSearches.map((tag) => (
                    <button
                      key={tag}
                      className="ss-tag"
                      onClick={() => handleQuickSearch(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {recentSearches.length > 0 && (
                <div className="ss-section">
                  <div className="ss-section-header">
                    <p className="ss-section-label">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        width="14"
                        height="14"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Recent
                    </p>
                    <button
                      className="ss-clear-recent"
                      onClick={clearRecentSearches}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="ss-recent-list">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        className="ss-recent-btn"
                        onClick={() => handleQuickSearch(item)}
                      >
                        <span className="ss-recent-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                          </svg>
                        </span>
                        <span>{item}</span>
                        <span className="ss-recent-arrow">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              d="M7 17L17 7M7 7h10v10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {trendingProducts.length > 0 && (
                <div className="ss-section">
                  <p className="ss-section-label">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="14"
                      height="14"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Featured Products
                  </p>
                  <div className="ss-featured-list">
                    {trendingProducts.map((product) => (
                      <button
                        key={product.id}
                        className="ss-featured-item"
                        onClick={() =>
                          handleResultClick(product.id, product.name)
                        }
                      >
                        <div className="ss-featured-img">
                          {product.images &&
                          product.images.length > 0 &&
                          product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              suppressHydrationWarning
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (
                                  parent &&
                                  !parent.querySelector(
                                    ".ss-featured-placeholder-fallback",
                                  )
                                ) {
                                  const fallback =
                                    document.createElement("div");
                                  fallback.className =
                                    "ss-featured-placeholder ss-featured-placeholder-fallback";
                                  fallback.innerHTML = `
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                                      <circle cx="8.5" cy="8.5" r="1.5"/>
                                    </svg>
                                  `;
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <div className="ss-featured-placeholder">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ss-featured-info">
                          <span className="ss-featured-name">
                            {product.name}
                          </span>
                          <span className="ss-featured-price">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ss-section">
                <p className="ss-section-label">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="14"
                    height="14"
                  >
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                  Categories
                </p>
                <div className="ss-quick-links">
                  {categoryLinks.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      className="ss-quick-card"
                      onClick={onClose}
                      prefetch={false}
                    >
                      <span className="ss-quick-icon">{cat.icon}</span>
                      <span>{cat.name}</span>
                      <svg
                        className="ss-quick-arrow"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="ss-footer">
          <p>
            Press <kbd>ESC</kbd> to close · <kbd>↵</kbd> to search
          </p>
        </div>
      </div>
    </>
  );
}
