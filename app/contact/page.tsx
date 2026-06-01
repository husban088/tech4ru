"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import "./contact.css";

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
interface FormFields {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  title: string;
  msg: string;
  exiting?: boolean;
}

/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const contactTranslations = {
  // Header
  eyebrow: { en: "Get In Touch", ar: "تواصل معنا", de: "Kontaktieren Sie uns" },
  heading1: { en: "We're Here", ar: "نحن هنا", de: "Wir sind hier" },
  heading2: { en: "For", ar: "من أجل", de: "Für" },
  headingEm: { en: "You", ar: "لك", de: "Sie" },
  sub: {
    en: "Whether you need help with an order or have a question, our dedicated team is ready to assist you.",
    ar: "سواء كنت بحاجة إلى مساعدة بشأن طلب أو لديك سؤال، فريقنا المتخصص جاهز لمساعدتك.",
    de: "Ob Sie Hilfe bei einer Bestellung benötigen oder eine Frage haben, unser engagiertes Team ist bereit, Ihnen zu helfen.",
  },

  // Info Cards
  boutiqueLabel: { en: "Our Boutique", ar: "متجرنا", de: "Unser Boutique" },
  boutiqueValue: {
    en: "Adelaide, Australia",
    ar: "أديلايد، أستراليا",
    de: "Adelaide, Australien",
  },
  whatsappLabel: { en: "WhatsApp", ar: "واتساب", de: "WhatsApp" },
  whatsappValue: {
    en: "+49 1578 2101282",
    ar: "+49 1578 2101282",
    de: "+49 1578 2101282",
  },
  emailLabel: { en: "Email Us", ar: "راسلنا", de: "E-Mail senden" },
  emailValue: {
    en: "info@tech4ru.com",
    ar: "info@tech4ru.com",
    de: "info@tech4ru.com",
  },
  emailSub: {
    en: "Response within 24 hours",
    ar: "الرد خلال 24 ساعة",
    de: "Antwort innerhalb von 24 Stunden",
  },

  // Social
  followLabel: {
    en: "Follow Tech4U",
    ar: "تابع تيك4يو",
    de: "Folgen Sie Tech4U",
  },

  // Map
  viewMaps: {
    en: "View on Maps →",
    ar: "عرض على الخريطة →",
    de: "Auf Karte anzeigen →",
  },

  // Form
  formEyebrow: { en: "Send Message", ar: "أرسل رسالة", de: "Nachricht senden" },
  formTitle: { en: "Let's", ar: "دعنا", de: "Lass uns" },
  formTitleEm: { en: "Connect", ar: "نتواصل", de: "verbinden" },
  formSub: {
    en: "Every message is read personally by our team.",
    ar: "كل رسالة يقرأها فريقنا شخصيًا.",
    de: "Jede Nachricht wird von unserem Team persönlich gelesen.",
  },

  // Form Labels
  nameLabel: { en: "Full Name", ar: "الاسم الكامل", de: "Vollständiger Name" },
  namePlaceholder: {
    en: "Your name (min. 4 chars)",
    ar: "اسمك (4 أحرف على الأقل)",
    de: "Ihr Name (mind. 4 Zeichen)",
  },
  nameError: {
    en: "Full name is required",
    ar: "الاسم الكامل مطلوب",
    de: "Vollständiger Name ist erforderlich",
  },
  nameErrorMin: {
    en: "Name must be at least 4 characters",
    ar: "يجب أن يكون الاسم 4 أحرف على الأقل",
    de: "Name muss mindestens 4 Zeichen lang sein",
  },

  emailFieldLabel: {
    en: "Email Address",
    ar: "البريد الإلكتروني",
    de: "E-Mail-Adresse",
  },
  emailPlaceholder: {
    en: "your@email.com",
    ar: "بريدك@example.com",
    de: "ihre@email.de",
  },
  emailError: {
    en: "Email address is required",
    ar: "البريد الإلكتروني مطلوب",
    de: "E-Mail-Adresse ist erforderlich",
  },
  emailErrorInvalid: {
    en: "Please enter a valid email address",
    ar: "يرجى إدخال بريد إلكتروني صحيح",
    de: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
  },

  subjectLabel: { en: "Subject", ar: "الموضوع", de: "Betreff" },
  subjectPlaceholder: {
    en: "How can we help?",
    ar: "كيف يمكننا مساعدتك؟",
    de: "Wie können wir helfen?",
  },
  subjectError: {
    en: "Subject is required",
    ar: "الموضوع مطلوب",
    de: "Betreff ist erforderlich",
  },

  messageLabel: { en: "Message", ar: "الرسالة", de: "Nachricht" },
  messagePlaceholder: {
    en: "Share your enquiry with us…",
    ar: "شارك استفسارك معنا...",
    de: "Teilen Sie Ihre Anfrage mit uns...",
  },
  messageError: {
    en: "Message cannot be empty",
    ar: "الرسالة لا يمكن أن تكون فارغة",
    de: "Nachricht darf nicht leer sein",
  },

  // Submit Button
  sendBtn: { en: "Send Message", ar: "إرسال الرسالة", de: "Nachricht senden" },
  sendingBtn: { en: "Sending…", ar: "جاري الإرسال...", de: "Senden…" },

  // Success State
  successEyebrow: {
    en: "Message Delivered",
    ar: "تم إرسال الرسالة",
    de: "Nachricht zugestellt",
  },
  successTitle: { en: "Thank You,", ar: "شكرًا لك،", de: "Danke," },
  successSub: {
    en: "We've received your message and will get back to you within 24 hours.",
    ar: "لقد تلقينا رسالتك وسنرد عليك خلال 24 ساعة.",
    de: "Wir haben Ihre Nachricht erhalten und werden uns innerhalb von 24 Stunden bei Ihnen melden.",
  },
  successBtn: {
    en: "Send Another Message",
    ar: "إرسال رسالة أخرى",
    de: "Weitere Nachricht senden",
  },

  // Toasts
  validationErrorTitle: {
    en: "Validation Error",
    ar: "خطأ في التحقق",
    de: "Validierungsfehler",
  },
  validationErrorMsg: {
    en: "Please fix the highlighted fields before sending.",
    ar: "يرجى إصلاح الحقول المميزة قبل الإرسال.",
    de: "Bitte korrigieren Sie die markierten Felder vor dem Senden.",
  },
  sendFailedTitle: {
    en: "Send Failed",
    ar: "فشل الإرسال",
    de: "Senden fehlgeschlagen",
  },
  networkErrorTitle: {
    en: "Network Error",
    ar: "خطأ في الشبكة",
    de: "Netzwerkfehler",
  },
  networkErrorMsg: {
    en: "Unable to connect. Please check your internet and try again.",
    ar: "غير قادر على الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.",
    de: "Verbindung fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
  },
};

const getContactTranslation = (
  key: keyof typeof contactTranslations,
  lang: "en" | "ar" | "de",
): string => {
  return (
    contactTranslations[key]?.[lang] || contactTranslations[key]?.en || key
  );
};

/* ═══════════════════════════════════════════
   CONTACT DETAILS — module level
═══════════════════════════════════════════ */
const getContactDetails = (lang: "en" | "ar" | "de") => [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: getContactTranslation("boutiqueLabel", lang),
    value: getContactTranslation("boutiqueValue", lang),
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true"
      >
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.03 1.19 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.08 6.08l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
    label: getContactTranslation("whatsappLabel", lang),
    value: getContactTranslation("whatsappValue", lang),
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    label: getContactTranslation("emailLabel", lang),
    value: getContactTranslation("emailValue", lang),
    sub: getContactTranslation("emailSub", lang),
  },
];

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/17a6uqbE89/",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/tech4ruu?igsh=NjRrZGl5dTd6cDNk",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@tech4ru?lang=en-GB",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.2 12.4a6.35 6.35 0 003.4 8.15 6.32 6.32 0 006.37-1.06 6.32 6.32 0 002.3-4.9V9.07a8.59 8.59 0 004.32 1.19V7.05a5 5 0 01-2-.36z" />
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════
   VALIDATION with translations
═══════════════════════════════════════════ */
function validateField(
  field: keyof FormFields,
  value: string,
  lang: "en" | "ar" | "de",
): string {
  switch (field) {
    case "name":
      if (!value.trim()) return getContactTranslation("nameError", lang);
      if (value.trim().length < 4)
        return getContactTranslation("nameErrorMin", lang);
      return "";
    case "email":
      if (!value.trim()) return getContactTranslation("emailError", lang);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
        return getContactTranslation("emailErrorInvalid", lang);
      return "";
    case "subject":
      if (!value.trim()) return getContactTranslation("subjectError", lang);
      return "";
    case "message":
      if (!value.trim()) return getContactTranslation("messageError", lang);
      return "";
    default:
      return "";
  }
}

/* ═══════════════════════════════════════════
   TOAST HOOK
═══════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback(
    (title: string, msg: string, type: Toast["type"] = "success") => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, title, msg, type }]);
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        );
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== id)),
          400,
        );
      }, 4000);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 400);
  }, []);

  return { toasts, show, dismiss };
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function Contact() {
  const { language, isRTLMode } = useLanguage();
  const lang = language;

  const [form, setForm] = useState<FormFields>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormFields, boolean>>
  >({});
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const { toasts, show: showToast, dismiss } = useToast();
  const contactDetails = getContactDetails(lang);

  useEffect(() => {
    const newErrors: FieldErrors = {};
    (Object.keys(touched) as (keyof FormFields)[]).forEach((field) => {
      if (touched[field]) {
        const err = validateField(field, form[field], lang);
        if (err) newErrors[field] = err;
      }
    });
    setErrors(newErrors);
  }, [form, touched, lang]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(field: keyof FormFields) {
    setFocused(null);
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({ name: true, email: true, subject: true, message: true });

    const newErrors: FieldErrors = {};
    (Object.keys(form) as (keyof FormFields)[]).forEach((field) => {
      const err = validateField(field, form[field], lang);
      if (err) newErrors[field] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast(
        getContactTranslation("validationErrorTitle", lang),
        getContactTranslation("validationErrorMsg", lang),
        "error",
      );
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) setErrors(data.errors);
        showToast(
          getContactTranslation("sendFailedTitle", lang),
          data.message || "Something went wrong. Please try again.",
          "error",
        );
      } else {
        showToast(
          getContactTranslation("successEyebrow", lang),
          getContactTranslation("successSub", lang),
          "success",
        );
        setSubmitted(true);
      }
    } catch {
      showToast(
        getContactTranslation("networkErrorTitle", lang),
        getContactTranslation("networkErrorMsg", lang),
        "error",
      );
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setForm({ name: "", email: "", subject: "", message: "" });
    setErrors({});
    setTouched({});
    setSubmitted(false);
  }

  function fieldClass(field: keyof FormFields) {
    const classes = ["co-field"];
    if (focused === field) classes.push("focused");
    if (form[field]) classes.push("filled");
    if (errors[field] && touched[field]) classes.push("co-field--error");
    return classes.join(" ");
  }

  return (
    <div className="co-root" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="co-grain" aria-hidden="true" />
      <div className="co-bg-geo" aria-hidden="true">
        <div className="co-geo-ring co-geo-ring--1" />
        <div className="co-geo-ring co-geo-ring--2" />
        <div className="co-geo-ring co-geo-ring--3" />
        <div className="co-geo-line co-geo-line--1" />
        <div className="co-geo-line co-geo-line--2" />
        <div className="co-geo-line co-geo-line--3" />
      </div>

      <div className="co-corner co-corner--tl" aria-hidden="true" />
      <div className="co-corner co-corner--tr" aria-hidden="true" />
      <div className="co-corner co-corner--bl" aria-hidden="true" />
      <div className="co-corner co-corner--br" aria-hidden="true" />

      <div className="co-container">
        <header className="co-header">
          <p className="co-eyebrow">
            <span className="co-ey-line" />
            <span className="co-ey-line-head">
              {getContactTranslation("eyebrow", lang)}
            </span>
            <span className="co-ey-line" />
          </p>
          <h1 className="co-heading">
            {getContactTranslation("heading1", lang)}
            <br />
            {getContactTranslation("heading2", lang)}{" "}
            <em>{getContactTranslation("headingEm", lang)}</em>
          </h1>
          <p className="co-sub">{getContactTranslation("sub", lang)}</p>
        </header>

        <div className="co-main">
          <aside className="co-info">
            <div className="co-info-cards">
              {contactDetails.map((item, i) => (
                <div
                  key={i}
                  className="co-info-card"
                  style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                >
                  <div className="co-info-icon">{item.icon}</div>
                  <div>
                    <p className="co-info-label">{item.label}</p>
                    <p className="co-info-value">{item.value}</p>
                    {item.sub && <p className="co-info-sub">{item.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="co-social">
              <p className="co-social-label">
                <span className="co-ey-line" style={{ width: 14 }} />
                {getContactTranslation("followLabel", lang)}
                <span className="co-ey-line" style={{ width: 14 }} />
              </p>
              <div className="co-social-icons">
                {socialLinks.map((social, idx) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="co-social-btn"
                    aria-label={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {social.icon}
                    <span className="co-social-tooltip">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            <div
              className="co-map-placeholder"
              role="button"
              tabIndex={0}
              aria-label="Open in Google Maps - Adelaide, Australia"
              onClick={() =>
                window.open(
                  "https://maps.google.com?q=Adelaide+Australia",
                  "_blank",
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  window.open(
                    "https://maps.google.com?q=Adelaide+Australia",
                    "_blank",
                  );
              }}
            >
              <div className="co-map-inner">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <p>{getContactTranslation("boutiqueValue", lang)}</p>
                <span className="co-map-view">
                  {getContactTranslation("viewMaps", lang)}
                </span>
              </div>
            </div>
          </aside>

          <section className="co-form-section">
            <div className="co-form-card">
              <div
                className="co-form-corner co-form-corner--tr"
                aria-hidden="true"
              />
              <div
                className="co-form-corner co-form-corner--bl"
                aria-hidden="true"
              />

              {submitted ? (
                <div className="co-success">
                  <div className="co-success-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="co-success-eyebrow">
                    <span className="co-ey-line" style={{ width: 20 }} />
                    {getContactTranslation("successEyebrow", lang)}
                    <span className="co-ey-line" style={{ width: 20 }} />
                  </p>
                  <h2 className="co-success-title">
                    {getContactTranslation("successTitle", lang)}{" "}
                    <em>{form.name.split(" ")[0] || "Friend"}</em>
                  </h2>
                  <p className="co-success-sub">
                    {getContactTranslation("successSub", lang)}
                  </p>
                  <button className="co-success-btn" onClick={resetForm}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ width: 14, height: 14 }}
                      aria-hidden="true"
                    >
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    {getContactTranslation("successBtn", lang)}
                  </button>
                </div>
              ) : (
                <>
                  <div className="co-form-header">
                    <p className="co-eyebrow">
                      <span className="co-ey-line" />
                      {getContactTranslation("formEyebrow", lang)}
                      <span className="co-ey-line" />
                    </p>
                    <h2 className="co-form-title">
                      {getContactTranslation("formTitle", lang)}{" "}
                      <em>{getContactTranslation("formTitleEm", lang)}</em>
                    </h2>
                    <p className="co-form-sub">
                      {getContactTranslation("formSub", lang)}
                    </p>
                  </div>

                  <form className="co-form" onSubmit={handleSubmit} noValidate>
                    <div className="co-form-row">
                      <div className={fieldClass("name")}>
                        <label className="co-label" htmlFor="co-name">
                          {getContactTranslation("nameLabel", lang)}
                        </label>
                        <div className="co-input-wrap">
                          <span className="co-input-icon" aria-hidden="true">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </span>
                          <input
                            id="co-name"
                            name="name"
                            type="text"
                            className="co-input"
                            placeholder={getContactTranslation(
                              "namePlaceholder",
                              lang,
                            )}
                            value={form.name}
                            onChange={handleChange}
                            onFocus={() => setFocused("name")}
                            onBlur={() => handleBlur("name")}
                            autoComplete="name"
                            aria-invalid={!!errors.name}
                            aria-describedby={
                              errors.name ? "err-name" : undefined
                            }
                          />
                        </div>
                        <div className="co-field-line" aria-hidden="true" />
                        {errors.name && touched.name && (
                          <p
                            className="co-field-error"
                            id="err-name"
                            role="alert"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div className={fieldClass("email")}>
                        <label className="co-label" htmlFor="co-email">
                          {getContactTranslation("emailFieldLabel", lang)}
                        </label>
                        <div className="co-input-wrap">
                          <span className="co-input-icon" aria-hidden="true">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </span>
                          <input
                            id="co-email"
                            name="email"
                            type="email"
                            className="co-input"
                            placeholder={getContactTranslation(
                              "emailPlaceholder",
                              lang,
                            )}
                            value={form.email}
                            onChange={handleChange}
                            onFocus={() => setFocused("email")}
                            onBlur={() => handleBlur("email")}
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            aria-describedby={
                              errors.email ? "err-email" : undefined
                            }
                          />
                        </div>
                        <div className="co-field-line" aria-hidden="true" />
                        {errors.email && touched.email && (
                          <p
                            className="co-field-error"
                            id="err-email"
                            role="alert"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={fieldClass("subject")}>
                      <label className="co-label" htmlFor="co-subject">
                        {getContactTranslation("subjectLabel", lang)}
                      </label>
                      <div className="co-input-wrap">
                        <span className="co-input-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </span>
                        <input
                          id="co-subject"
                          name="subject"
                          type="text"
                          className="co-input"
                          placeholder={getContactTranslation(
                            "subjectPlaceholder",
                            lang,
                          )}
                          value={form.subject}
                          onChange={handleChange}
                          onFocus={() => setFocused("subject")}
                          onBlur={() => handleBlur("subject")}
                          aria-invalid={!!errors.subject}
                          aria-describedby={
                            errors.subject ? "err-subject" : undefined
                          }
                        />
                      </div>
                      <div className="co-field-line" aria-hidden="true" />
                      {errors.subject && touched.subject && (
                        <p
                          className="co-field-error"
                          id="err-subject"
                          role="alert"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.subject}
                        </p>
                      )}
                    </div>

                    <div
                      className={`${fieldClass("message")} co-field--textarea`}
                    >
                      <label className="co-label" htmlFor="co-message">
                        {getContactTranslation("messageLabel", lang)}
                      </label>
                      <div className="co-input-wrap co-input-wrap--textarea">
                        <span
                          className="co-input-icon co-input-icon--top"
                          aria-hidden="true"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                        </span>
                        <textarea
                          id="co-message"
                          name="message"
                          className="co-textarea"
                          placeholder={getContactTranslation(
                            "messagePlaceholder",
                            lang,
                          )}
                          value={form.message}
                          onChange={handleChange}
                          onFocus={() => setFocused("message")}
                          onBlur={() => handleBlur("message")}
                          rows={5}
                          aria-invalid={!!errors.message}
                          aria-describedby={
                            errors.message ? "err-message" : undefined
                          }
                        />
                      </div>
                      <div className="co-field-line" aria-hidden="true" />
                      {errors.message && touched.message && (
                        <p
                          className="co-field-error"
                          id="err-message"
                          role="alert"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="co-submit-btn"
                      disabled={sending}
                      aria-busy={sending}
                    >
                      {sending ? (
                        <>
                          <span className="co-spinner" aria-hidden="true" />
                          {getContactTranslation("sendingBtn", lang)}
                        </>
                      ) : (
                        <>
                          <span>{getContactTranslation("sendBtn", lang)}</span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <path
                              d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="co-toast-wrap" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`co-toast co-toast--${t.type}${t.exiting ? " co-toast--exit" : ""}`}
            role="status"
          >
            <div className="co-toast-icon" aria-hidden="true">
              {t.type === "success" && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {t.type === "error" && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
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
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div className="co-toast-body">
              <p className="co-toast-title">{t.title}</p>
              <p className="co-toast-msg">{t.msg}</p>
            </div>
            <button
              className="co-toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
