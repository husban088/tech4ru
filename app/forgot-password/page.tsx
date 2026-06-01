// app/forgot-password/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import "./forgot-password.css";
import { clearAuthStorage } from "@/lib/auth";

const fpTranslations = {
  brandEyebrow: {
    en: "Account Recovery",
    ar: "استعادة الحساب",
    de: "Konto Wiederherstellen",
  },
  brandTitle: { en: "Tech4U", ar: "تيك4يو", de: "Tech4U" },
  brandTagline1: { en: "Secure your", ar: "تأمين", de: "Sichern Sie" },
  brandTagline2: { en: "luxury", ar: "وصولك", de: "Ihren" },
  brandTaglineEm: { en: "access.", ar: "الفاخر.", de: "Luxuszugang." },
  brandNote: {
    en: "Enter your registered email and we'll send you a secure link to reset your password instantly.",
    ar: "أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا آمنًا لإعادة تعيين كلمة المرور الخاصة بك فورًا.",
    de: "Geben Sie Ihre registrierte E-Mail-Adresse ein und wir senden Ihnen sofort einen sicheren Link zum Zurücksetzen Ihres Passworts.",
  },

  formEyebrow: {
    en: "Forgot Password",
    ar: "نسيت كلمة المرور",
    de: "Passwort vergessen",
  },
  formTitle: { en: "Forgot", ar: "نسيت", de: "Passwort" },
  formTitleEm: { en: "Password?", ar: "كلمة المرور؟", de: "vergessen?" },
  formSub: {
    en: "We'll send a reset link to your email",
    ar: "سنرسل رابط إعادة تعيين إلى بريدك الإلكتروني",
    de: "Wir senden Ihnen einen Link zum Zurücksetzen an Ihre E-Mail",
  },

  emailLabel: {
    en: "Email Address",
    ar: "البريد الإلكتروني",
    de: "E-Mail-Adresse",
  },
  emailPlaceholder: {
    en: "your@email.com",
    ar: "بريدك@example.com",
    de: "ihre@email.de",
  },

  sendLink: {
    en: "Send Reset Link",
    ar: "إرسال رابط إعادة التعيين",
    de: "Link zum Zurücksetzen senden",
  },
  sending: { en: "Sending...", ar: "جاري الإرسال...", de: "Sende..." },

  orText: { en: "or", ar: "أو", de: "oder" },
  switchText: {
    en: "Remember your password?",
    ar: "هل تذكر كلمة المرور؟",
    de: "Passwort erinnert?",
  },
  switchLink: { en: "Sign in", ar: "تسجيل الدخول", de: "Anmelden" },

  successTitle: { en: "Check your", ar: "تفقد", de: "Überprüfen Sie" },
  successTitleEm: { en: "inbox", ar: "بريدك الوارد", de: "Ihren Posteingang" },
  successDesc: {
    en: "We've sent a password reset link to",
    ar: "لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى",
    de: "Wir haben einen Link zum Zurücksetzen des Passworts gesendet an",
  },
  successNote: {
    en: "Open the email and click the link to set a new password. The link expires in 1 hour.",
    ar: "افتح البريد الإلكتروني وانقر على الرابط لتعيين كلمة مرور جديدة. تنتهي صلاحية الرابط بعد ساعة واحدة.",
    de: "Öffnen Sie die E-Mail und klicken Sie auf den Link, um ein neues Passwort festzulegen. Der Link läuft in 1 Stunde ab.",
  },
  backToSignin: {
    en: "Back to Sign In",
    ar: "العودة إلى تسجيل الدخول",
    de: "Zurück zur Anmeldung",
  },

  errorDefault: {
    en: "Something went wrong",
    ar: "حدث خطأ ما",
    de: "Etwas ist schief gelaufen",
  },
};

const getFpTranslation = (
  key: keyof typeof fpTranslations,
  lang: "en" | "ar" | "de",
  subKey?: string,
): string => {
  if (subKey && fpTranslations[key] && (fpTranslations[key] as any)[subKey]) {
    return (fpTranslations[key] as any)[subKey][lang];
  }
  if (fpTranslations[key] && (fpTranslations[key] as any)[lang]) {
    return (fpTranslations[key] as any)[lang];
  }
  return (fpTranslations[key] as any)?.en || key;
};

export default function ForgotPassword() {
  const { language, isRTLMode } = useLanguage();
  const lang = language;

  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    setRedirectUrl(`${window.location.origin}/reset-password`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      clearAuthStorage();
      await supabase.auth.signOut();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: redirectUrl || `${window.location.origin}/reset-password`,
        },
      );

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || getFpTranslation("errorDefault", lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-root" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="fp-grain" aria-hidden="true" />
      <div className="fp-bg-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="fp-corner fp-corner--tl" aria-hidden="true" />
      <div className="fp-corner fp-corner--tr" aria-hidden="true" />
      <div className="fp-corner fp-corner--bl" aria-hidden="true" />
      <div className="fp-corner fp-corner--br" aria-hidden="true" />

      <div className="fp-card">
        {/* LEFT: Brand Panel */}
        <div className="fp-brand">
          <div className="fp-brand-inner">
            <p className="fp-brand-eyebrow">
              <span className="fp-ey-line" />
              {getFpTranslation("brandEyebrow", lang)}
              <span className="fp-ey-line" />
            </p>
            <h1 className="fp-brand-title">
              {getFpTranslation("brandTitle", lang)}
            </h1>
            <p className="fp-brand-tagline">
              {getFpTranslation("brandTagline1", lang)}
              <br />
              {getFpTranslation("brandTagline2", lang)}{" "}
              <em>{getFpTranslation("brandTaglineEm", lang)}</em>
            </p>
            <div className="fp-brand-divider" aria-hidden="true" />
            <p className="fp-brand-note">
              {getFpTranslation("brandNote", lang)}
            </p>
            <div className="fp-ring" aria-hidden="true">
              <div className="fp-ring-inner" />
            </div>
          </div>
        </div>

        {/* RIGHT: Form Panel */}
        <div className="fp-form-panel">
          <div className="fp-form-wrap">
            {!sent ? (
              <>
                <div className="fp-form-header">
                  <p className="fp-form-eyebrow">
                    <span className="fp-ey-line" />
                    {getFpTranslation("formEyebrow", lang)}
                    <span className="fp-ey-line" />
                  </p>
                  <h2 className="fp-form-title">
                    {getFpTranslation("formTitle", lang)}{" "}
                    <em>{getFpTranslation("formTitleEm", lang)}</em>
                  </h2>
                  <p className="fp-form-sub">
                    {getFpTranslation("formSub", lang)}
                  </p>
                </div>

                <form className="fp-form" onSubmit={handleSubmit} noValidate>
                  {error && (
                    <div className="fp-error-box" role="alert">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        width="14"
                        height="14"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <div
                    className={`fp-field${focused ? " fp-field--focused" : ""}${email ? " fp-field--filled" : ""}`}
                  >
                    <label className="fp-label" htmlFor="fp-email">
                      {getFpTranslation("emailLabel", lang)}
                    </label>
                    <div className="fp-input-wrap">
                      <span className="fp-input-icon" aria-hidden="true">
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
                        id="fp-email"
                        type="email"
                        className="fp-input"
                        placeholder={getFpTranslation("emailPlaceholder", lang)}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="fp-field-line" aria-hidden="true" />
                  </div>

                  <button
                    type="submit"
                    className="fp-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="fp-spinner" />
                    ) : (
                      <>
                        <span>{getFpTranslation("sendLink", lang)}</span>
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
                      </>
                    )}
                  </button>
                </form>

                <div className="fp-or" aria-hidden="true">
                  <span className="fp-or-line" />
                  <span className="fp-or-text">
                    {getFpTranslation("orText", lang)}
                  </span>
                  <span className="fp-or-line" />
                </div>

                <p className="fp-switch">
                  {getFpTranslation("switchText", lang)}{" "}
                  <Link href="/signin" className="fp-switch-link">
                    {getFpTranslation("switchLink", lang)}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="12"
                      height="12"
                    >
                      <path
                        d="M9 18l6-6-6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </p>
              </>
            ) : (
              <div className="fp-success">
                <div className="fp-success-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <p className="fp-success-eyebrow">
                  <span className="fp-ey-line" />
                  Email Sent
                  <span className="fp-ey-line" />
                </p>
                <h2 className="fp-success-title">
                  {getFpTranslation("successTitle", lang)}{" "}
                  <em>{getFpTranslation("successTitleEm", lang)}</em>
                </h2>
                <p className="fp-success-desc">
                  {getFpTranslation("successDesc", lang)}
                </p>
                <p className="fp-success-email">{email}</p>
                <p className="fp-success-note">
                  {getFpTranslation("successNote", lang)}
                </p>
                <Link href="/signin" className="fp-back-btn">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M19 12H5M12 5l-7 7 7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {getFpTranslation("backToSignin", lang)}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
