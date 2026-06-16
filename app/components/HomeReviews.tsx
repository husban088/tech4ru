// app/components/HomeReviews.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import "@/app/components/HomeReviews.css";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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

// ── Fetch function ──
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

    cachedReviews = formatted;
    cacheTimestamp = Date.now();
    return formatted;
  } catch {
    return [];
  }
}

// ── Stars Component ──
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

// ── Single Review Card ──
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
            loading="lazy"
            decoding="async"
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

// ── Skeleton Card ──
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
  const mountedRef = useRef(true);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // ── Core fetch ──
  const loadReviews = useCallback(async (forceRefresh = false) => {
    if (isCacheValid() && !forceRefresh) {
      setReviews(cachedReviews!);
      setLoading(false);
      fetchReviewsFromDB().then((data) => {
        if (mountedRef.current && data.length > 0) setReviews(data);
      });
      return;
    }

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
  }, [loadReviews]);

  // ── Safety net: clear loading after 6s ──
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
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

  // ── Tab visibility ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (isCacheValid()) {
        setReviews(cachedReviews!);
        setLoading(false);
        fetchReviewsFromDB().then((data) => {
          if (mountedRef.current && data.length > 0) setReviews(data);
        });
      } else {
        loadReviews(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadReviews]);

  // ── bfcache / pageshow ──
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
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
      if (!isCacheValid()) loadReviews(true);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [loadReviews]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "0";

  // Loading skeleton
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
      {/* Background Orbs */}
      <div className="hr-bg-orb hr-bg-orb--1" />
      <div className="hr-bg-orb hr-bg-orb--2" />
      <div className="hr-bg-orb hr-bg-orb--3" />
      <div className="hr-bg-grid" />

      {/* Decorative Lines */}
      <div className="hr-bg-lines">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Sparkles */}
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

        {/* Nav row — top-right on mobile/tablet, hidden on desktop (desktop uses side arrows) */}
        <div className="hr-mobile-nav-row">
          <button ref={prevRef} className="hr-arrow" aria-label="Previous">
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
          <button ref={nextRef} className="hr-arrow" aria-label="Next">
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
        </div>

        {/* Swiper Stage */}
        <div className="hr-stage-wrap">
          {/* Desktop side arrows */}
          <button
            className="hr-arrow hr-arrow--prev hr-arrow--desktop"
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

          <Swiper
            modules={[Navigation, Pagination]}
            loop={true}
            grabCursor={true}
            speed={280}
            resistanceRatio={0.85}
            touchRatio={1}
            touchAngle={45}
            simulateTouch={true}
            /* FIX: Autoplay REMOVED — same reason as ExploreAurexia.
               JS timer running every 4.5s + slideNext() call blocks
               the main thread and kills native scroll momentum. */
            navigation={{
              prevEl: ".hr-arrow--prev",
              nextEl: ".hr-arrow--next",
            }}
            onSwiper={(swiper) => {
              // Wire mobile nav buttons via refs
              if (prevRef.current && nextRef.current) {
                prevRef.current.onclick = () => swiper.slidePrev();
                nextRef.current.onclick = () => swiper.slideNext();
              }
            }}
            pagination={{
              clickable: true,
              el: ".hr-dots",
              bulletClass: "hr-dot",
              bulletActiveClass: "hr-dot--active",
              renderBullet: (_index: number, className: string) =>
                `<button class="${className}" />`,
            }}
            breakpoints={{
              0: { slidesPerView: 1, spaceBetween: 16 },
              640: { slidesPerView: 2, spaceBetween: 20 },
              1024: { slidesPerView: 3, spaceBetween: 28 },
            }}
            className="hr-swiper"
          >
            {reviews.map((review) => (
              <SwiperSlide key={review.id} className="hr-slide">
                <ReviewCard review={review} />
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            className="hr-arrow hr-arrow--next hr-arrow--desktop"
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
        </div>

        {/* Pagination dots */}
        <div className="hr-dots" />
      </div>
    </section>
  );
}
