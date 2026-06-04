"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useLanguage } from "@/app/context/LanguageContext";
import "./explore-aurexia.css";

/* ──────────────────────────────────────────
   COMPLETE TRANSLATIONS FOR ALL CATEGORIES
────────────────────────────────────────── */

const categoryTranslations = {
  labelMen: { en: "Men's", ar: "رجالي", de: "Herren" },
  labelWomen: { en: "Women's", ar: "نسائي", de: "Damen" },
  labelMobile: { en: "Mobile", ar: "جوال", de: "Mobil" },
  labelHome: { en: "Home", ar: "المنزل", de: "Zuhause" },
  titleGentleman: { en: "Gentleman's", ar: "الأناقة", de: "Gentleman" },
  titleFeminine: { en: "Feminine", ar: "الأنوثة", de: "Weiblich" },
  titleTech: { en: "Tech", ar: "تقنية", de: "Technik" },
  titleLiving: { en: "Living", ar: "المعيشة", de: "Wohnen" },
  italicTimepieces: { en: " Timepieces", ar: " الزمنية", de: " Zeitmesser" },
  italicElegance: { en: " Elegance", ar: " الرقي", de: " Eleganz" },
  italicAccessories: { en: " Accessories", ar: " الإكسسوارات", de: " Zubehör" },
  italicDecor: { en: " Décor", ar: " الديكور", de: " Dekor" },
  subGentleman: {
    en: "Precision. Power. Legacy.",
    ar: "دقة. قوة. إرث.",
    de: "Präzision. Kraft. Vermächtnis.",
  },
  subWomen: {
    en: "Grace. Radiance. Statement.",
    ar: "رشاقة. إشراق. بيان.",
    de: "Anmut. Ausstrahlung. Statement.",
  },
  subMobile: {
    en: "Minimal. Smart. Refined.",
    ar: "بسيط. ذكي. راقي.",
    de: "Minimal. Smart. Raffiniert.",
  },
  subHome: {
    en: "Atmosphere. Artistry. Space.",
    ar: "جو. فن. مساحة.",
    de: "Atmosphäre. Kunst. Raum.",
  },
  paraMen: {
    en: "Crafted for the man who moves the world. Surgical steel, sapphire crystal — worn on the wrist of ambition.",
    ar: "مصممة للرجل الذي يحرك العالم. فولاذ جراحي، كريستال ياقوتي — يرتديها معصم الطموح.",
    de: "Gefertigt für den Mann, der die Welt bewegt. Chirurgenstahl, Saphirglas — getragen am Handgelenk des Ehrgeizes.",
  },
  paraWomen: {
    en: "Where luxury meets femininity. Diamond-set dials and rose gold bracelet — time, reimagined as jewellery.",
    ar: "حيث تلتقي الفخامة بالأنوثة. موانئ مرصعة بالألماس وسوار من الورد الذهبي — الوقت، معاد تصوره كمجوهرات.",
    de: "Wo Luxus auf Weiblichkeit trifft. Diamantbesetzte Zifferblätter und Armband aus Roségold — Zeit, neu interpretiert als Schmuck.",
  },
  paraMobile: {
    en: "Precision-engineered accessories for the connected generation — cases, chargers and earbuds that elevate every touchpoint.",
    ar: "إكسسوارات هندسية دقيقة للجيل المتصل — حوافظ، شواحن، وسماعات أذن ترفع كل نقطة اتصال.",
    de: "Präzise gefertigtes Zubehör für die vernetzte Generation — Hüllen, Ladegeräte und Ohrhörer, die jeden Berührungspunkt aufwerten.",
  },
  paraHome: {
    en: "Curated pieces that transform four walls into a sanctuary. Artisanal objects that speak in the language of silence.",
    ar: "قطع منسقة تحول الجدران الأربعة إلى ملاذ. أشياء حرفية تتحدث بلغة الصمت.",
    de: "Kuratierte Stücke, die vier Wände in ein Heiligtum verwandeln. Kunsthandwerkliche Objekte, die in der Sprache der Stille sprechen.",
  },
  ctaMen: {
    en: "Explore Men's Watches",
    ar: "استكشف ساعات الرجال",
    de: "Herrenuhren entdecken",
  },
  ctaWomen: {
    en: "Explore Women's Watches",
    ar: "استكشف ساعات النساء",
    de: "Damenuhren entdecken",
  },
  ctaMobile: {
    en: "Shop Accessories",
    ar: "تسوق الإكسسوارات",
    de: "Zubehör kaufen",
  },
  ctaHome: { en: "Discover Décor", ar: "اكتشف الديكور", de: "Dekor entdecken" },
  tagWatches: { en: "Watches", ar: "ساعات", de: "Uhren" },
  tagAccessories: { en: "Accessories", ar: "إكسسوارات", de: "Zubehör" },
  tagDecor: { en: "Décor", ar: "ديكور", de: "Dekor" },
  eyebrowText: {
    en: "Curated Collections",
    ar: "مجموعات منسقة",
    de: "Kurierte Kollektionen",
  },
  headerTitle: { en: "Explore", ar: "استكشف", de: "Entdecken Sie" },
  brandName: { en: "Tech4U", ar: "تيك4يو", de: "Tech4U" },
  headerSub: {
    en: "Four worlds of luxury. One destination. Yours to discover.",
    ar: "أربعة عوالم من الفخامة. وجهة واحدة. لك لكتشفها.",
    de: "Vier Welten des Luxus. Ein Ziel. Zu entdecken.",
  },
};

const categories = [
  {
    id: 1,
    labelKey: "labelMen",
    titleKey: "titleGentleman",
    italicKey: "italicTimepieces",
    subKey: "subGentleman",
    paraKey: "paraMen",
    ctaKey: "ctaMen",
    href: "/watches/men",
    imageSrc: "/menwatch.jpg",
    placeholderClass: "ea-ph-men",
    tagKey: "tagWatches",
    accentColor: "#dc2626",
  },
  {
    id: 2,
    labelKey: "labelWomen",
    titleKey: "titleFeminine",
    italicKey: "italicElegance",
    subKey: "subWomen",
    paraKey: "paraWomen",
    ctaKey: "ctaWomen",
    href: "/watches/women",
    imageSrc: "/womenwatch.jpg",
    placeholderClass: "ea-ph-women",
    tagKey: "tagWatches",
    accentColor: "#dc2626",
  },
  {
    id: 3,
    labelKey: "labelMobile",
    titleKey: "titleTech",
    italicKey: "italicAccessories",
    subKey: "subMobile",
    paraKey: "paraMobile",
    ctaKey: "ctaMobile",
    href: "/accessories",
    imageSrc: "/mobacc.webp",
    placeholderClass: "ea-ph-mobile",
    tagKey: "tagAccessories",
    accentColor: "#dc2626",
  },
  {
    id: 4,
    labelKey: "labelHome",
    titleKey: "titleLiving",
    italicKey: "italicDecor",
    subKey: "subHome",
    paraKey: "paraHome",
    ctaKey: "ctaHome",
    href: "/home-decor",
    imageSrc: "/homedecor.jpg",
    placeholderClass: "ea-ph-decor",
    tagKey: "tagDecor",
    accentColor: "#dc2626",
  },
];

function getTranslation(
  key: keyof typeof categoryTranslations,
  lang: "en" | "ar" | "de",
): string {
  return (
    categoryTranslations[key]?.[lang] || categoryTranslations[key]?.en || key
  );
}

/* ──────────────────────────────────────────
   CARD COMPONENT — Black + Red Mixed Gradients
────────────────────────────────────────── */
function CategoryCard({
  cat,
  language,
  isRTL,
}: {
  cat: (typeof categories)[0];
  language: "en" | "ar" | "de";
  isRTL: boolean;
}) {
  const label = getTranslation(cat.labelKey as any, language);
  const title = getTranslation(cat.titleKey as any, language);
  const italic = getTranslation(cat.italicKey as any, language);
  const sub = getTranslation(cat.subKey as any, language);
  const para = getTranslation(cat.paraKey as any, language);
  const ctaLabel = getTranslation(cat.ctaKey as any, language);
  const tag = getTranslation(cat.tagKey as any, language);

  return (
    <article
      className="ea-card"
      style={{ "--accent": cat.accentColor } as React.CSSProperties}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Shimmer Effect */}
      <div className="ea-card-shimmer" aria-hidden="true" />
      {/* Bottom Bar - Black + Red Mixed Gradient */}
      <div className="ea-card-bar" aria-hidden="true" />

      <div className="ea-card-img-wrap">
        {cat.imageSrc ? (
          <img
            src={cat.imageSrc}
            alt={`${title}${italic}`}
            className="ea-card-img"
            loading="eager"
            fetchPriority="high"
            decoding="auto"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className={`ea-card-placeholder ${cat.placeholderClass}`} />
        )}
        <div className="ea-card-overlay-base" />
        <div className="ea-card-overlay-hover" />
      </div>

      <span className="ea-card-tag">{tag}</span>
      <span className="ea-card-label">{label}</span>

      <div className="ea-card-body">
        <p className="ea-card-sub">{sub}</p>
        <h3 className="ea-card-title">
          {title}
          <em>{italic}</em>
        </h3>
        <div className="ea-card-divider" />
        <p className="ea-card-para">{para}</p>

        <Link href={cat.href} className="ea-card-cta" prefetch={false}>
          <span>{ctaLabel}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M5 12h14M12 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div className="ea-card-corner ea-card-corner--tl" aria-hidden="true" />
      <div className="ea-card-corner ea-card-corner--br" aria-hidden="true" />
    </article>
  );
}

/* ──────────────────────────────────────────
   INNER COMPONENT
────────────────────────────────────────── */
function ExploreInner() {
  const { language, isRTLMode } = useLanguage();

  return (
    <section
      className="ea-section"
      aria-label="Explore Aurexia Categories"
      dir={isRTLMode ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      {/* Decorative elements - Black + Red Mixed Theme */}
      <div className="ea-grain" aria-hidden="true" />
      <div className="ea-ambient" aria-hidden="true" />
      <div className="ea-red-orb" aria-hidden="true" />
      <div className="ea-red-orb-right" aria-hidden="true" />

      <div className="ea-bg-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="ea-header">
        <div className="ea-eyebrow-row">
          <span className="ea-eyebrow">
            {getTranslation("eyebrowText", language)}
          </span>
          <div className="ea-eyebrow-line" />
        </div>
        <h2 className="ea-header-title">
          {getTranslation("headerTitle", language)}{" "}
          <em>{getTranslation("brandName", language)}</em>
        </h2>
        <p className="ea-header-sub">{getTranslation("headerSub", language)}</p>
      </div>

      {/* Mobile / Tablet nav row — visible only on ≤900px */}
      <div className="ea-mobile-nav-row" aria-hidden="false">
        <button
          className="ea-nav-btn ea-mobile-nav-btn ea-mobile-prev"
          aria-label="Previous category"
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="ea-nav-btn ea-mobile-nav-btn ea-mobile-next"
          aria-label="Next category"
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M9 18l6-6-6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="ea-slider-wrap">
        {/* Desktop nav buttons — visible only on >900px */}
        <button
          className="ea-nav-btn ea-nav-prev"
          aria-label="Previous category"
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          className="ea-nav-btn ea-nav-next"
          aria-label="Next category"
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M9 18l6-6-6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <Swiper
          modules={[Navigation, Pagination, Autoplay, A11y]}
          slidesPerView={1}
          spaceBetween={20}
          centeredSlides={false}
          loop={true}
          grabCursor={true}
          speed={300}
          watchSlidesProgress={true}
          resistanceRatio={0.85}
          touchRatio={1}
          touchAngle={45}
          simulateTouch={true}
          observer={true}
          observeParents={true}
          resizeObserver={true}
          dir={isRTLMode ? "rtl" : "ltr"}
          autoplay={{
            delay: 3800,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            prevEl: ".ea-nav-prev, .ea-mobile-prev",
            nextEl: ".ea-nav-next, .ea-mobile-next",
          }}
          onSwiper={(swiper) => {
            if (
              swiper.params.navigation &&
              typeof swiper.params.navigation !== "boolean"
            ) {
              swiper.params.navigation.prevEl = ".ea-nav-prev, .ea-mobile-prev";
              swiper.params.navigation.nextEl = ".ea-nav-next, .ea-mobile-next";
              swiper.navigation.init();
              swiper.navigation.update();
            }
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          breakpoints={{
            768: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 3, spaceBetween: 32 },
          }}
          className="ea-swiper"
        >
          {categories.map((cat) => (
            <SwiperSlide key={cat.id} className="ea-slide">
              <CategoryCard cat={cat} language={language} isRTL={isRTLMode} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="ea-footer-ornament" aria-hidden="true">
        <span className="ea-orn-line" />
        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
          <polygon points="10,1 12.9,7 19.5,8.1 14.7,12.7 16,19.5 10,16.2 4,19.5 5.3,12.7 0.5,8.1 7.1,7" />
        </svg>
        <span className="ea-orn-line" />
      </div>
    </section>
  );
}

export default function ExploreAurexia() {
  return <ExploreInner />;
}
