"use client";

import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import {
  ShieldCheck,
  Truck,
  Award,
  Gem,
  CreditCard,
  Headphones,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { swiperPerfProps } from "@/lib/useFastSwiper";
import "./WhyChooseUs.css";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const t = {
  title: {
    en: "Why Choose",
    ar: "لماذا تختار",
    de: "Warum wählen",
  },
  titleEm: {
    en: "Tech4U",
    ar: "تيك4يو",
    de: "Tech4U",
  },
  subtitle: {
    en: "Premium products, verified authenticity, and world-class service — everything curated to elevate your lifestyle.",
    ar: "منتجات فاخرة، أصالة موثّقة، وخدمة عالمية — كل شيء مختار لترتقي بأسلوب حياتك.",
    de: "Premium-Produkte, geprüfte Echtheit und erstklassiger Service — alles kuratiert, um Ihren Lebensstil zu verbessern.",
  },
  cards: [
    {
      id: "01",
      icon: ShieldCheck,
      titleEn: "Certified Authenticity",
      titleAr: "مصادقة معتمدة",
      titleDe: "Zertifizierte Echtheit",
      descEn:
        "Every timepiece ships with a certificate of authenticity. Zero counterfeits — ever. Your investment is real.",
      descAr: "كل ساعة تُشحن مع شهادة أصالة. لا مزيفات أبداً. استثمارك حقيقي.",
      descDe:
        "Jedes Zeitmesser wird mit einem Echtheitszertifikat geliefert. Null Fälschungen — niemals.",
    },
    {
      id: "02",
      icon: Truck,
      titleEn: "Global Express Delivery",
      titleAr: "توصيل سريع عالمي",
      titleDe: "Weltweite Expresslieferung",
      descEn:
        "Insured, tracked shipping all over the world. Your order arrives pristine — or we make it right.",
      descAr:
        "شحن مؤمّن ومتتبع في جميع أنحاء العالم. طلبك يصل بحالة ممتازة — أو نصلحه.",
      descDe: "Versicherter, verfolgbarer Versand auf der ganzen Welt.",
    },
    {
      id: "03",
      icon: Award,
      titleEn: "Buyer Protection",
      titleAr: "حماية المشتري",
      titleDe: "Käuferschutz",
      descEn:
        "Full purchase protection on every order. If it's not exactly as described, you're fully covered.",
      descAr:
        "حماية كاملة للشراء على كل طلب. إذا لم يكن كما هو موصوف تماماً، فأنت مغطى بالكامل.",
      descDe: "Vollständiger Kaufschutz bei jeder Bestellung.",
    },
    {
      id: "04",
      icon: Gem,
      titleEn: "Curated for Collectors",
      titleAr: "مختار للمقتنين",
      titleDe: "Für Sammler kuratiert",
      descEn:
        "Each piece is hand-selected by experts. Limited inventory means you're never wearing what everyone else owns.",
      descAr:
        "يتم اختيار كل قطعة يدوياً من قبل خبراء. المخزون المحدود يعني أنك لن ترتدي ما يمتلكه الجميع.",
      descDe:
        "Jedes Stück wird von Experten handverlesen. Begrenztes Inventar.",
    },
    {
      id: "05",
      icon: CreditCard,
      titleEn: "Secure Multi-Currency Checkout",
      titleAr: "دفع آمن بعملات متعددة",
      titleDe: "Sicheres Mehrwährungs-Checkout",
      descEn:
        "Pay in USD, GBP, AUD, EUR, AED and more. Stripe & PayPal encryption — your data is never stored.",
      descAr:
        "ادفع بالدولار الأمريكي والجنيه الإسترليني والدولار الأسترالي واليورو والدرهم وغيرها.",
      descDe: "Bezahlen Sie in USD, GBP, AUD, EUR, AED und mehr.",
    },
    {
      id: "06",
      icon: Headphones,
      titleEn: "White-Glove Support",
      titleAr: "دعم على أعلى مستوى",
      titleDe: "Erstklassiger Support",
      descEn:
        "A real human responds — fast. Whether it's a sizing question or a returns request, we treat every customer as a VIP.",
      descAr:
        "إنسان حقيقي يرد بسرعة. سواء كان سؤالاً عن المقاس أو طلب إرجاع، نعامل كل عميل كشخص مميز.",
      descDe:
        "Ein echter Mensch antwortet — schnell. Wir behandeln jeden Kunden als VIP.",
    },
  ],
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT - Swiper Slider with Autoplay
═══════════════════════════════════════════ */
export default function WhyChooseUs() {
  const { language, isRTLMode } = useLanguage();
  const lang = language as "en" | "ar" | "de";
  const sectionRef = useRef<HTMLElement | null>(null);
  const swiperRef = useRef<any>(null);
  const isRTL = isRTLMode;

  // Scroll reveal animation for section
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add("wcu-visible");
          }
        });
      },
      { threshold: 0.15 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="wcu-section"
      dir={isRTL ? "rtl" : "ltr"}
      aria-label="Why Choose Tech4U"
    >
      {/* Background Texture */}
      <div className="wcu-bg-texture" aria-hidden="true" />
      <div className="wcu-bg-glow" aria-hidden="true" />

      <div className="wcu-container">
        {/* HEADING */}
        <div className="wcu-heading-wrap">
          <p className="wcu-eyebrow">Luxury Excellence Since 2020</p>
          <h2 className="wcu-heading">
            Why <span className="wcu-gradient-text">Choose</span> Us
          </h2>
          <div className="wcu-heading-line" />
          <p className="wcu-subheading">Authentic · Secure · Premium</p>
        </div>

        {/* Navigation Buttons */}
        <div className="wcu-nav-buttons">
          <button className="wcu-nav-prev" aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points={isRTL ? "9 18 15 12 9 6" : "15 18 9 12 15 6"} />
            </svg>
          </button>
          <button className="wcu-nav-next" aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points={isRTL ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
            </svg>
          </button>
        </div>

        {/* Swiper Slider with Autoplay */}
        <Swiper
          ref={swiperRef}
          {...swiperPerfProps}
          modules={[Autoplay, Navigation, Pagination]}
          spaceBetween={24}
          slidesPerView={1}
          centeredSlides={false}
          loop={true}
          speed={300}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            prevEl: ".wcu-nav-prev",
            nextEl: ".wcu-nav-next",
          }}
          pagination={{
            clickable: true,
            el: ".wcu-pagination",
            bulletClass: "wcu-bullet",
            bulletActiveClass: "wcu-bullet-active",
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
          }}
        >
          {t.cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <SwiperSlide key={i}>
                <div className="wcu-card">
                  {/* Top accent bar */}
                  <div className="wcu-card-bar" />

                  {/* Number watermark */}
                  <span className="wcu-watermark">{card.id}</span>

                  {/* Icon with RED + BLACK gradient */}
                  <div className="wcu-icon-wrap">
                    <Icon className="wcu-icon" />
                  </div>

                  {/* Content */}
                  <div className="wcu-card-content">
                    <h3 className="wcu-card-title">
                      {lang === "en"
                        ? card.titleEn
                        : lang === "ar"
                          ? card.titleAr
                          : card.titleDe}
                    </h3>
                    <p className="wcu-card-desc">
                      {lang === "en"
                        ? card.descEn
                        : lang === "ar"
                          ? card.descAr
                          : card.descDe}
                    </p>
                  </div>

                  {/* Hover shine */}
                  <div className="wcu-shine" aria-hidden="true" />

                  {/* Bottom border glow */}
                  <div className="wcu-card-glow" />
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Pagination */}
        <div className="wcu-pagination" />
      </div>
    </section>
  );
}
