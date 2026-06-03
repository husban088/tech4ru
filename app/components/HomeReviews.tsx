// app/components/HomeReviews.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import "@/app/components/HomeReviews.css";

interface HomeReview {
  id: string;
  product_id: string;
  name: string;
  title: string;
  body: string;
  rating: number;
  images: string[];
  created_at: string;
  product_name?: string;
}

// ── Memory cache with TTL ──
let cachedReviews: HomeReview[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return (
    cachedReviews !== null &&
    cachedReviews.length > 0 &&
    Date.now() - cacheTimestamp < CACHE_TTL_MS
  );
}

// ── Fetch function — standalone, no mountedRef dependency ──
async function fetchReviewsFromDB(): Promise<HomeReview[]> {
  try {
    const { data: reviewData, error } = await supabase
      .from("product_reviews")
      .select("*")
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !reviewData || reviewData.length === 0) return [];

    const productIds = [...new Set(reviewData.map((r: any) => r.product_id))];
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    const productMap: Record<string, string> = {};
    (products || []).forEach((p: { id: string; name: string }) => {
      productMap[p.id] = p.name;
    });

    const formatted: HomeReview[] = reviewData.map((r: any) => ({
      ...r,
      product_name: productMap[r.product_id] || "Our Product",
    }));

    // Update cache
    cachedReviews = formatted;
    cacheTimestamp = Date.now();
    return formatted;
  } catch {
    return [];
  }
}

// ── Stars Component - YELLOW COLOR ─────────────────────────────────────
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="hr-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`hr-star${i <= Math.round(rating) ? " hr-star--filled" : ""}`}
          viewBox="0 0 24 24"
        >
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={i <= Math.round(rating) ? "#fbbf24" : "none"}
            stroke="#fbbf24"
            strokeWidth="1.5"
            opacity={i <= Math.round(rating) ? 1 : 0.35}
          />
        </svg>
      ))}
    </div>
  );
}

// ── Single Review Card ─────────────────────────────────────────────────
function ReviewCard({ review }: { review: HomeReview }) {
  const firstImage =
    review.images && review.images.length > 0 ? review.images[0] : null;
  const initial = review.name.charAt(0).toUpperCase();

  return (
    <div className="hr-card">
      <div className="hr-card-shimmer" />
      <div className="hr-card-quote">&ldquo;</div>
      <div className="hr-card-avatar-wrap">
        {firstImage ? (
          <img
            src={firstImage}
            alt={review.name}
            className="hr-card-avatar-img"
            draggable={false}
            suppressHydrationWarning
          />
        ) : (
          <div className="hr-card-avatar-fallback">{initial}</div>
        )}
        <div className="hr-card-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      <h4 className="hr-card-name">{review.name}</h4>
      <StarDisplay rating={review.rating} />
      <h3 className="hr-card-title">&ldquo;{review.title}&rdquo;</h3>
      <p className="hr-card-body">{review.body}</p>
      {review.product_name && (
        <div className="hr-card-product">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          {review.product_name}
        </div>
      )}
      <div className="hr-card-bottom-line" />
    </div>
  );
}

// ── Skeleton Card Component ──
function SkeletonCard() {
  return (
    <div className="hr-skeleton-card">
      <div className="hr-skeleton-circle" />
      <div className="hr-skeleton-line hr-skeleton-line--short" />
      <div className="hr-skeleton-stars" />
      <div className="hr-skeleton-line" />
      <div className="hr-skeleton-line" />
      <div className="hr-skeleton-line hr-skeleton-line--short" />
    </div>
  );
}

// ── Main Component ──
export default function HomeReviews() {
  const { isRTLMode } = useLanguage();
  const [reviews, setReviews] = useState<HomeReview[]>(() =>
    isCacheValid() ? cachedReviews! : [],
  );
  const [loading, setLoading] = useState(() => !isCacheValid());
  const [visibleCount, setVisibleCount] = useState(3);
  const [offset, setOffset] = useState(0);
  const [animDir, setAnimDir] = useState<"idle" | "left" | "right">("idle");
  const dragStart = useRef<number | null>(null);
  const touchStart = useRef<number | null>(null);
  const isDragging = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track if component is still mounted — reset on every mount, NOT in cleanup
  const mountedRef = useRef(true);

  // Responsive: update visible count
  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1024) setVisibleCount(3);
      else if (window.innerWidth >= 640) setVisibleCount(2);
      else setVisibleCount(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Core fetch — always safe, never hangs ──
  const loadReviews = useCallback(async (forceRefresh = false) => {
    // If valid cache and not forcing refresh, use it immediately
    if (isCacheValid() && !forceRefresh) {
      setReviews(cachedReviews!);
      setLoading(false);
      // Background silent refresh
      fetchReviewsFromDB().then((data) => {
        if (mountedRef.current && data.length > 0) {
          setReviews(data);
        }
      });
      return;
    }

    // If stale cache exists, show it immediately (no blank/skeleton flash)
    if (cachedReviews && cachedReviews.length > 0) {
      setReviews(cachedReviews);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const data = await fetchReviewsFromDB();
    if (mountedRef.current) {
      setReviews(data);
      setLoading(false);
    }
  }, []);

  // ── Initial fetch ──
  useEffect(() => {
    mountedRef.current = true;
    loadReviews();
    return () => {
      // Do NOT set mountedRef.current = false here
      // React remounts in dev Strict Mode and on navigation
      // Setting false in cleanup breaks state updates after remount
    };
  }, [loadReviews]);

  // ── Safety net: if still loading after 6s, force clear ──
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      // Force a fresh fetch ignoring cache
      fetchReviewsFromDB()
        .then((data) => {
          if (mountedRef.current) {
            setReviews(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mountedRef.current) setLoading(false);
        });
    }, 6000);
    return () => clearTimeout(timer);
  }, [loading]);

  // ── Tab visibility: coming back from another tab/page ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (isCacheValid()) {
        // Show cached immediately
        setReviews(cachedReviews!);
        setLoading(false);
        // Silent background refresh
        fetchReviewsFromDB().then((data) => {
          if (mountedRef.current && data.length > 0) setReviews(data);
        });
      } else {
        // No valid cache — fetch fresh
        loadReviews(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadReviews]);

  // ── Browser back/forward (bfcache + regular navigation) ──
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Restored from bfcache — force fresh fetch
        cachedReviews = null;
        cacheTimestamp = 0;
        loadReviews(true);
      } else if (!isCacheValid()) {
        loadReviews(true);
      } else {
        setReviews(cachedReviews!);
        setLoading(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [loadReviews]);

  // ── Online recovery ──
  useEffect(() => {
    const handleOnline = () => {
      if (!isCacheValid()) {
        loadReviews(true);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [loadReviews]);

  const totalSlides = reviews.length;
  const canPrev = offset > 0;
  const canNext = offset + visibleCount < totalSlides;

  const go = useCallback(
    (dir: "left" | "right") => {
      if (animDir !== "idle") return;

      if (dir === "right" && !canNext) {
        setAnimDir("right");
        setTimeout(() => {
          setOffset(0);
          setAnimDir("idle");
        }, 420);
        return;
      }
      if (dir === "left" && !canPrev) {
        setAnimDir("left");
        setTimeout(() => {
          setOffset(Math.max(0, totalSlides - visibleCount));
          setAnimDir("idle");
        }, 420);
        return;
      }

      setAnimDir(dir);
      setTimeout(() => {
        setOffset((prev) =>
          dir === "right"
            ? Math.min(prev + visibleCount, totalSlides - visibleCount)
            : Math.max(prev - visibleCount, 0),
        );
        setAnimDir("idle");
      }, 420);
    },
    [animDir, canNext, canPrev, totalSlides, visibleCount],
  );

  const next = useCallback(() => go("right"), [go]);
  const prev = useCallback(() => go("left"), [go]);

  // Autoplay
  const startAutoplay = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    if (totalSlides > visibleCount) {
      autoTimer.current = setInterval(() => next(), 5000);
    }
  }, [next, totalSlides, visibleCount]);

  const stopAutoplay = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
  }, []);

  useEffect(() => {
    if (reviews.length > visibleCount) startAutoplay();
    return stopAutoplay;
  }, [reviews.length, visibleCount, startAutoplay, stopAutoplay]);

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStart.current = e.clientX;
    isDragging.current = false;
    stopAutoplay();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      dragStart.current !== null &&
      Math.abs(e.clientX - dragStart.current) > 8
    ) {
      isDragging.current = true;
    }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    if (Math.abs(dx) > 55) dx > 0 ? prev() : next();
    dragStart.current = null;
    setTimeout(() => {
      isDragging.current = false;
    }, 60);
    startAutoplay();
  };
  const handleMouseLeave = () => {
    dragStart.current = null;
    isDragging.current = false;
    startAutoplay();
  };

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    stopAutoplay();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) dx > 0 ? prev() : next();
    touchStart.current = null;
    startAutoplay();
  };

  const visibleReviews = reviews.slice(offset, offset + visibleCount);
  const showNav = totalSlides > visibleCount;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "0";

  // Loading skeleton — only shown on very first load with no cache
  if (loading && reviews.length === 0) {
    return (
      <section className="hr-section" dir={isRTLMode ? "rtl" : "ltr"}>
        <div className="hr-bg-orb hr-bg-orb--1" />
        <div className="hr-bg-orb hr-bg-orb--2" />
        <div className="hr-bg-orb hr-bg-orb--3" />
        <div className="hr-bg-grid" />
        <div className="hr-content">
          <div className="hr-header">
            <div className="hr-eyebrow-row">
              <span className="hr-eyebrow">Customer Voices</span>
              <div className="hr-eyebrow-line" />
            </div>
            <h2 className="hr-title">
              What Our Customers <em>Say</em>
            </h2>
          </div>
          <div className="hr-skeleton-row">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section className="hr-section" dir={isRTLMode ? "rtl" : "ltr"}>
      {/* Background Orbs - Red */}
      <div className="hr-bg-orb hr-bg-orb--1" />
      <div className="hr-bg-orb hr-bg-orb--2" />
      <div className="hr-bg-orb hr-bg-orb--3" />

      {/* Grid Pattern - Red tint */}
      <div className="hr-bg-grid" />

      {/* Decorative Lines - Red tint */}
      <div className="hr-bg-lines">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Sparkles - Red */}
      <div className="hr-sparkle hr-sparkle--1" />
      <div className="hr-sparkle hr-sparkle--2" />
      <div className="hr-sparkle hr-sparkle--3" />
      <div className="hr-sparkle hr-sparkle--4" />
      <div className="hr-sparkle hr-sparkle--5" />
      <div className="hr-sparkle hr-sparkle--6" />

      <div className="hr-content">
        <div className="hr-header">
          <div className="hr-eyebrow-row">
            <span className="hr-eyebrow">Customer Voices</span>
            <div className="hr-eyebrow-line" />
          </div>
          <h2 className="hr-title">
            What Our Customers <em>Say</em>
          </h2>
          <div className="hr-accent-bar" />
          <p className="hr-subtitle">
            Real experiences from people who love what they bought
          </p>
        </div>

        <div className="hr-stats">
          <div className="hr-stat">
            <span className="hr-stat-num">{reviews.length}+</span>
            <span className="hr-stat-label">Verified Reviews</span>
          </div>
          <div className="hr-stat-sep" />
          <div className="hr-stat">
            <span className="hr-stat-num">{avgRating}</span>
            <span className="hr-stat-label">Average Rating</span>
          </div>
          <div className="hr-stat-sep" />
          <div className="hr-stat">
            <span className="hr-stat-num">98%</span>
            <span className="hr-stat-label">Happy Customers</span>
          </div>
        </div>

        <div
          className="hr-stage-wrap"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
        >
          {showNav && (
            <button
              className="hr-arrow hr-arrow--prev"
              onClick={prev}
              aria-label="Previous"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <polyline
                  points={isRTLMode ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}
                />
              </svg>
            </button>
          )}

          <div
            className={`hr-cards-grid hr-cards-grid--${visibleCount} hr-cards-grid--anim-${animDir}`}
          >
            {visibleReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {showNav && (
            <button
              className="hr-arrow hr-arrow--next"
              onClick={next}
              aria-label="Next"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <polyline
                  points={isRTLMode ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
                />
              </svg>
            </button>
          )}
        </div>

        {showNav && (
          <div className="hr-dots">
            {Array.from({ length: Math.ceil(totalSlides / visibleCount) }).map(
              (_, i) => {
                const pageOffset = i * visibleCount;
                const isActive =
                  offset >= pageOffset && offset < pageOffset + visibleCount;
                return (
                  <button
                    key={i}
                    className={`hr-dot${isActive ? " hr-dot--active" : ""}`}
                    onClick={() => {
                      stopAutoplay();
                      setOffset(
                        Math.min(pageOffset, totalSlides - visibleCount),
                      );
                      startAutoplay();
                    }}
                    aria-label={`Page ${i + 1}`}
                  />
                );
              },
            )}
          </div>
        )}
      </div>
    </section>
  );
}
