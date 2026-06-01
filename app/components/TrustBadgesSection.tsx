"use client";

import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useLanguage } from "@/app/context/LanguageContext";
import { swiperPerfProps } from "@/lib/useFastSwiper";
import "./TrustBadgesSection.css";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const t = {
  title: {
    en: "Shop with",
    ar: "تسوّق مع",
    de: "Einkaufen mit",
  },
  titleEm: {
    en: "Confidence",
    ar: "الثقة",
    de: "Vertrauen",
  },
  subtitle: {
    en: "Every order is protected, authenticated, and backed by our world-class guarantee.",
    ar: "كل طلب محمي وموثّق ومدعوم بضمان عالمي المستوى.",
    de: "Jede Bestellung ist geschützt, authentifiziert und durch unsere erstklassige Garantie abgesichert.",
  },
  badges: [
    {
      icon: "shipping",
      num: "01",
      titleEn: "Free Worldwide Shipping",
      titleAr: "شحن مجاني حول العالم",
      titleDe: "Kostenloser Weltweiter Versand",
      descEn:
        "No hidden fees. Insured & tracked delivery to your doorstep in 3-7 business days.",
      descAr:
        "بدون رسوم خفيفة. توصيل مؤمن ومتتبع إلى عتبة داركم في 3-7 أيام عمل.",
      descDe:
        "Keine versteckten Gebühren. Versicherte & verfolgbare Lieferung zu Ihnen nach Hause in 3-7 Werktagen.",
    },
    {
      icon: "secure",
      num: "02",
      titleEn: "Secure Payments",
      titleAr: "مدفوعات آمنة",
      titleDe: "Sichere Zahlungen",
      descEn:
        "Stripe & PayPal encrypted checkout. Multi-currency support: USD, GBP, EUR, AED, and more.",
      descAr:
        "دفع مشفر عبر سترايب وباي بال. دعم العملات المتعددة: دولار، جنيه، يورو، درهم والمزيد.",
      descDe:
        "Stripe & PayPal verschlüsselter Checkout. Multi-Währungsunterstützung: USD, GBP, EUR, AED und mehr.",
    },
    {
      icon: "support",
      num: "03",
      titleEn: "24/7 Concierge Support",
      titleAr: "دعم كونسيرج على مدار الساعة",
      titleDe: "24/7 Concierge-Support",
      descEn:
        "Real humans, not bots. White-glove assistance for every query, big or small.",
      descAr:
        "بشر حقيقيون، ليس روبوتات. مساعدة راقية لكل استفسار، كبيراً كان أم صغيراً.",
      descDe:
        "Echte Menschen, keine Bots. Erstklassige Unterstützung für jede Frage, ob groß oder klein.",
    },
    {
      icon: "guarantee",
      num: "04",
      titleEn: "100% Money-Back Guarantee",
      titleAr: "ضمان استعادة الأموال بنسبة 100%",
      titleDe: "100% Geld-zurück-Garantie",
      descEn:
        "30-day hassle-free returns. Full refund if you're not completely satisfied.",
      descAr:
        "إرجاع خالي من المتاعب لمدة 30 يومًا. استرداد كامل إذا لم تكن راضيًا تمامًا.",
      descDe:
        "30-tägige, problemlose Rückgaben. Volle Rückerstattung, wenn Sie nicht vollständig zufrieden sind.",
    },
    {
      icon: "authentic",
      num: "05",
      titleEn: "100% Authentic",
      titleAr: "أصلي 100%",
      titleDe: "100% Authentisch",
      descEn:
        "Certificate of authenticity with every purchase. Zero counterfeits — ever.",
      descAr: "شهادة أصالة مع كل عملية شراء. لا مزيفات أبداً.",
      descDe: "Echtheitszertifikat bei jedem Kauf. Null Fälschungen — niemals.",
    },
    {
      icon: "returns",
      num: "06",
      titleEn: "Easy Returns",
      titleAr: "إرجاع سهل",
      titleDe: "Einfache Rückgaben",
      descEn:
        "Free returns within 30 days. No questions asked, no restocking fees.",
      descAr: "إرجاع مجاني خلال 30 يومًا. بدون أسئلة، بدون رسوم إعادة تخزين.",
      descDe:
        "Kostenlose Rückgaben innerhalb von 30 Tagen. Keine Fragen, keine Wiederauffüllungsgebühren.",
    },
  ],
};

/* ═══════════════════════════════════════════
   SVG ICONS - White color
═══════════════════════════════════════════ */
function BadgeIcon({ name }: { name: string }) {
  switch (name) {
    case "shipping":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 5v3h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case "secure":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "support":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case "guarantee":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "authentic":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
        </svg>
      );
    case "returns":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M3 10h13a5 5 0 0 1 0 10h-4" />
          <polyline points="8 15 3 10 8 5" />
        </svg>
      );
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function TrustBadgesSection() {
  const { language, isRTLMode } = useLanguage();
  const lang = language as "en" | "ar" | "de";
  const swiperRef = useRef<any>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const isRTL = isRTLMode;

  // Scroll reveal animation
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // If already visible (above fold), show immediately
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      section
        .querySelectorAll<HTMLElement>(".tbs-card-inner")
        .forEach((card) => card.classList.add("tbs-visible"));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cards =
            entry.target.querySelectorAll<HTMLElement>(".tbs-card-inner");
          cards.forEach((card) => {
            if (entry.isIntersecting) card.classList.add("tbs-visible");
          });
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="tbs-root" dir={isRTL ? "rtl" : "ltr"}>
      {/* Fine grid texture - Red tint */}
      <div className="tbs-texture" aria-hidden="true" />

      {/* Top fade - Red gradient */}
      <div className="tbs-top-fade" aria-hidden="true" />

      {/* Ambient Glow - Red glow */}
      <div className="tbs-ambient" aria-hidden="true" />

      <div className="tbs-container">
        {/* Header Section */}
        <div className="tbs-header">
          <div className="tbs-eyebrow-row">
            <span className="tbs-eyebrow">Why Choose Us</span>
            <div className="tbs-eyebrow-line" />
          </div>
          <h2 className="tbs-title">
            Shop with <span className="tbs-title-gradient">Confidence</span>
          </h2>
          <div className="tbs-accent-bar" />
          <p className="tbs-subtitle">{t.subtitle[lang]}</p>
        </div>

        {/* Swiper Slider */}
        <div className="tbs-slider-wrapper">
          {/* Nav Buttons — single set, wired via onSwiper */}
          <div className="tbs-nav-buttons">
            <button
              ref={prevRef}
              className="tbs-nav-prev"
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline
                  points={isRTL ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}
                />
              </svg>
            </button>
            <button ref={nextRef} className="tbs-nav-next" aria-label="Next">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline
                  points={isRTL ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
                />
              </svg>
            </button>
          </div>

          <Swiper
            ref={swiperRef}
            {...swiperPerfProps}
            modules={[Autoplay, Navigation, Pagination]}
            spaceBetween={24}
            slidesPerView={1}
            centeredSlides={false}
            loop={true}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onSwiper={(swiper) => {
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
            pagination={{
              clickable: true,
              el: ".tbs-pagination",
              bulletClass: "tbs-bullet",
              bulletActiveClass: "tbs-bullet-active",
            }}
            breakpoints={{
              640: {
                slidesPerView: 1.2,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 24,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
              1280: {
                slidesPerView: 3,
                spaceBetween: 32,
              },
            }}
          >
            {t.badges.map((badge, idx) => {
              return (
                <SwiperSlide key={idx}>
                  <div className="tbs-card">
                    <div
                      className="tbs-card-inner"
                      style={
                        { "--delay": `${idx * 0.1}s` } as React.CSSProperties
                      }
                    >
                      {/* Number watermark - Red gradient */}
                      <span className="tbs-watermark">{badge.num}</span>

                      {/* Icon with Red + Black gradient background (like QuickHighlights) */}
                      <div className="tbs-icon-wrap tbs-icon-gradient">
                        <BadgeIcon name={badge.icon} />
                        <div className="tbs-icon-ring" />
                      </div>

                      {/* Title - Black with Red hover */}
                      <h3 className="tbs-card-title">
                        {lang === "en"
                          ? badge.titleEn
                          : lang === "ar"
                            ? badge.titleAr
                            : badge.titleDe}
                      </h3>

                      {/* Description */}
                      <p className="tbs-card-desc">
                        {lang === "en"
                          ? badge.descEn
                          : lang === "ar"
                            ? badge.descAr
                            : badge.descDe}
                      </p>

                      {/* Decorative line - Red gradient */}
                      <div className="tbs-line tbs-line-gradient" />

                      {/* Shine sweep */}
                      <div className="tbs-shine" aria-hidden="true" />

                      {/* Bottom accent bar - Red gradient */}
                      <div className="tbs-bottom-bar tbs-bottom-gradient" />

                      {/* Hover glow overlay - Red glow */}
                      <div className="tbs-glow-overlay" aria-hidden="true" />
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          <div className="tbs-pagination" />
        </div>
      </div>
    </section>
  );
}
