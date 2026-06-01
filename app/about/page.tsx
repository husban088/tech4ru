"use client";

import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import WhyChooseUs from "@/app/components/WhyChooseUs"; // Import the WhyChooseUs component
import "./about.css";
import GlobalFAQSection from "@/app/components/GlobalFAQSection";

/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const aboutTranslations = {
  // Hero
  heroEyebrow: { en: "Our Story", ar: "قصتنا", de: "Unsere Geschichte" },
  heroTitle1: { en: "Born from a", ar: "ولد من", de: "Geboren aus einer" },
  heroTitleEm1: { en: "Passion", ar: "شغف", de: "Leidenschaft" },
  heroTitle2: { en: "for timeless", ar: "للخلود", de: "für zeitlose" },
  heroTitleEm2: { en: "Elegance", ar: "أناقة", de: "Eleganz" },
  heroSub: {
    en: "Tech4U was founded on a single belief — that luxury should feel personal, not distant. From our first timepiece to our latest mobile accessory, every object carries that promise.",
    ar: "تأسست تيك4يو على اعتقاد واحد - أن الفخامة يجب أن تبدو شخصية، وليست بعيدة. من ساعتنا الأولى إلى أحدث إكسسوارات الجوال، كل قطعة تحمل هذا الوعد.",
    de: "Tech4U wurde mit einer einzigen Überzeugung gegründet - dass Luxus persönlich und nicht distanziert sein sollte. Von unserer ersten Uhr bis zum neuesten Mobilzubehör trägt jedes Objekt dieses Versprechen.",
  },

  // Stats
  statFounded: { en: "Founded", ar: "تأسست", de: "Gegründet" },
  statTimepieces: { en: "Timepieces", ar: "ساعات", de: "Zeitmesser" },
  statMembers: { en: "Members", ar: "أعضاء", de: "Mitglieder" },
  statSatisfaction: { en: "Satisfaction", ar: "رضا", de: "Zufriedenheit" },

  // Statement
  statementEyebrow: {
    en: "Brand Statement",
    ar: "بيان العلامة التجارية",
    de: "Markenstatement",
  },
  statementQuote: {
    en: "We do not simply sell watches. We offer you a relationship with time — intimate, deliberate, and yours alone.",
    ar: "نحن لا نبيع الساعات فقط. نحن نقدم لك علاقة مع الوقت - حميمة، ومتعمدة، وخاصة بك وحدك.",
    de: "Wir verkaufen nicht einfach Uhren. Wir bieten Ihnen eine Beziehung zur Zeit - intim, bewusst und nur Ihnen allein.",
  },

  // Values Section
  valuesEyebrow: {
    en: "What We Stand For",
    ar: "ما نمثله",
    de: "Wofür wir stehen",
  },
  valuesTitle: { en: "Our", ar: "قيم", de: "Unsere" },
  valuesTitleEm: { en: "Values", ar: "نا", de: "Werte" },

  // Values Cards
  values: [
    {
      titleEn: "Craftsmanship",
      titleAr: "الحرفية",
      titleDe: "Handwerkskunst",
      descEn:
        "Every piece is born from hours of meticulous handwork, blending old-world artisan skill with modern precision engineering.",
      descAr:
        "كل قطعة تولد من ساعات من العمل اليدوي الدقيق، تمزج بين مهارة الحرفي القديم والهندسة الدقيقة الحديثة.",
      descDe:
        "Jedes Stück entsteht aus stundenlanger sorgfältiger Handarbeit, die alte Handwerkskunst mit moderner Präzisionstechnik verbindet.",
    },
    {
      titleEn: "Exclusivity",
      titleAr: "الحصرية",
      titleDe: "Exklusivität",
      descEn:
        "Our collections are strictly limited. When you wear Tech4U, you wear something few in the world ever will.",
      descAr:
        "مجموعاتنا محدودة للغاية. عندما ترتدي تيك4يو، فإنك ترتدي شيئًا لا يرتديه سوى القليل في العالم.",
      descDe:
        "Unsere Kollektionen sind streng limitiert. Wenn Sie Tech4U tragen, tragen Sie etwas, das nur wenige auf der Welt je tragen werden.",
    },
    {
      titleEn: "Legacy",
      titleAr: "الإرث",
      titleDe: "Vermächtnis",
      descEn:
        "We design heirlooms — objects meant to outlast trends, seasons, and generations.",
      descAr: "نصمم إرثًا - أشياء مصممة لتدوم أكثر من المواسم والأجيال.",
      descDe:
        "Wir entwerfen Erbstücke - Objekte, die Trends, Jahreszeiten und Generationen überdauern sollen.",
    },
    {
      titleEn: "Integrity",
      titleAr: "النزاهة",
      titleDe: "Integrität",
      descEn:
        "Transparent sourcing, ethical production, and honest pricing. Luxury without compromise.",
      descAr: "مصادر شفافة، إنتاج أخلاقي، وتسعير صادق. فخامة بدون تنازلات.",
      descDe:
        "Transparente Beschaffung, ethische Produktion und ehrliche Preise. Luxus ohne Kompromisse.",
    },
  ],

  // CTA Section
  ctaEyebrow: {
    en: "Begin Your Journey",
    ar: "ابدأ رحلتك",
    de: "Beginnen Sie Ihre Reise",
  },
  ctaTitle: {
    en: "Ready to wear",
    ar: "هل أنت مستعد لارتداء",
    de: "Bereit für",
  },
  ctaTitleEm: { en: "Tech4U?", ar: "تيك4يو؟", de: "Tech4U?" },
  ctaBtn1: {
    en: "Explore Collections",
    ar: "استكشف المجموعات",
    de: "Kollektionen entdecken",
  },
  ctaBtn2: { en: "Contact Us", ar: "اتصل بنا", de: "Kontaktieren Sie uns" },
};

const getAboutTranslation = (
  key: keyof typeof aboutTranslations,
  lang: "en" | "ar" | "de",
  subKey?: string,
): string => {
  if (
    subKey &&
    aboutTranslations[key] &&
    (aboutTranslations[key] as any)[subKey]
  ) {
    return (aboutTranslations[key] as any)[subKey][lang];
  }
  if (aboutTranslations[key] && (aboutTranslations[key] as any)[lang]) {
    return (aboutTranslations[key] as any)[lang];
  }
  return (aboutTranslations[key] as any)?.en || "";
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function About() {
  const { language, isRTLMode } = useLanguage();
  const lang = language as "en" | "ar" | "de";

  const stats = [
    { value: "2024", label: getAboutTranslation("statFounded", lang) },
    { value: "48+", label: getAboutTranslation("statTimepieces", lang) },
    { value: "12K+", label: getAboutTranslation("statMembers", lang) },
    { value: "100%", label: getAboutTranslation("statSatisfaction", lang) },
  ];

  const values = aboutTranslations.values.map((v, idx) => ({
    num: `0${idx + 1}`,
    title: lang === "en" ? v.titleEn : lang === "ar" ? v.titleAr : v.titleDe,
    desc: lang === "en" ? v.descEn : lang === "ar" ? v.descAr : v.descDe,
  }));

  return (
    <div className="ab-root" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="ab-ambient" aria-hidden="true" />
      <div className="ab-grain" aria-hidden="true" />

      <div className="ab-lines" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="ab-corner ab-corner--tl" aria-hidden="true" />
      <div className="ab-corner ab-corner--tr" aria-hidden="true" />

      {/* ══ HERO ══ */}
      <section className="ab-hero">
        <div className="ab-hero-inner">
          <p className="ab-eyebrow">
            <span className="ab-ey-line" />
            {getAboutTranslation("heroEyebrow", lang)}
            <span className="ab-ey-line" />
          </p>
          <h1 className="ab-hero-title">
            {getAboutTranslation("heroTitle1", lang)}{" "}
            <em>{getAboutTranslation("heroTitleEm1", lang)}</em>
            <br />
            {getAboutTranslation("heroTitle2", lang)}{" "}
            <em>{getAboutTranslation("heroTitleEm2", lang)}.</em>
          </h1>
          <p className="ab-hero-sub">{getAboutTranslation("heroSub", lang)}</p>

          <div className="ab-stats">
            {stats.map((s) => (
              <div key={s.label} className="ab-stat">
                <span className="ab-stat-value">{s.value}</span>
                <span className="ab-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ab-hero-ring" aria-hidden="true">
          <div className="ab-ring-1" />
          <div className="ab-ring-2" />
          <div className="ab-ring-dot" />
        </div>
      </section>

      {/* ══ BRAND STATEMENT ══ */}
      <section className="ab-statement">
        <div className="ab-statement-inner">
          <p className="ab-eyebrow">
            <span className="ab-ey-line" />
            {getAboutTranslation("statementEyebrow", lang)}
            <span className="ab-ey-line" />
          </p>
          <div className="ab-statement-num" aria-hidden="true">
            ✦
          </div>
          <blockquote className="ab-statement-quote">
            "{getAboutTranslation("statementQuote", lang)}"
          </blockquote>
        </div>
      </section>

      {/* ══ WHY CHOOSE US SECTION (IMPORTED) ══ */}
      <WhyChooseUs />

      {/* ══ VALUES ══ */}
      <section className="ab-values">
        <div className="ab-section-header">
          <p className="ab-eyebrow">
            <span className="ab-ey-line" />
            {getAboutTranslation("valuesEyebrow", lang)}
            <span className="ab-ey-line" />
          </p>
          <h2 className="ab-section-title">
            {getAboutTranslation("valuesTitle", lang)}{" "}
            <em>{getAboutTranslation("valuesTitleEm", lang)}</em>
          </h2>
        </div>

        <div className="ab-values-grid">
          {values.map((v) => (
            <div key={v.num} className="ab-value-card">
              <span className="ab-value-num" aria-hidden="true">
                {v.num}
              </span>
              <h3 className="ab-value-title">{v.title}</h3>
              <p className="ab-value-desc">{v.desc}</p>
              <div className="ab-value-line" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      <GlobalFAQSection />

      {/* ══ CTA ══ */}
      <section className="ab-cta">
        <div className="ab-cta-inner">
          <p className="ab-eyebrow">
            <span className="ab-ey-line" />
            {getAboutTranslation("ctaEyebrow", lang)}
            <span className="ab-ey-line" />
          </p>
          <h2 className="ab-cta-title">
            {getAboutTranslation("ctaTitle", lang)}{" "}
            <em>{getAboutTranslation("ctaTitleEm", lang)}</em>
          </h2>
          <div className="ab-cta-btns">
            <Link href="/watches" className="ab-cta-btn ab-cta-btn--primary">
              <span>{getAboutTranslation("ctaBtn1", lang)}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link href="/contact" className="ab-cta-btn ab-cta-btn--ghost">
              <span>{getAboutTranslation("ctaBtn2", lang)}</span>
            </Link>
          </div>
        </div>

        <div className="ab-cta-ring ab-cta-ring--1" aria-hidden="true" />
        <div className="ab-cta-ring ab-cta-ring--2" aria-hidden="true" />
      </section>
    </div>
  );
}
