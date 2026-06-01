// app/reset-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import "./reset-password.css";

const rpTranslations = {
  brandEyebrow: {
    en: "New Password",
    ar: "كلمة مرور جديدة",
    de: "Neues Passwort",
  },
  brandTitle: { en: "Tech4U", ar: "تيك4يو", de: "Tech4U" },
  brandTagline1: { en: "Secure your", ar: "تأمين", de: "Sichern Sie" },
  brandTagline2: { en: "luxury", ar: "وصولك", de: "Ihren" },
  brandTaglineEm: { en: "access.", ar: "الفاخر.", de: "Luxuszugang." },
  brandNote: {
    en: "Choose a strong password to keep your Tech4U account safe and secure.",
    ar: "اختر كلمة مرور قوية للحفاظ على أمان حسابك في تيك4يو.",
    de: "Wählen Sie ein starkes Passwort, um Ihr Tech4U-Konto sicher zu halten.",
  },

  formEyebrow: {
    en: "Set New Password",
    ar: "تعيين كلمة مرور جديدة",
    de: "Neues Passwort festlegen",
  },
  formTitle: { en: "Reset", ar: "إعادة تعيين", de: "Passwort" },
  formTitleEm: { en: "Password", ar: "كلمة المرور", de: "zurücksetzen" },
  formSub: {
    en: "Enter and confirm your new password below",
    ar: "أدخل وأكد كلمة المرور الجديدة أدناه",
    de: "Geben Sie unten Ihr neues Passwort ein und bestätigen Sie es",
  },

  newPasswordLabel: {
    en: "New Password",
    ar: "كلمة المرور الجديدة",
    de: "Neues Passwort",
  },
  confirmPasswordLabel: {
    en: "Confirm Password",
    ar: "تأكيد كلمة المرور",
    de: "Passwort bestätigen",
  },
  passwordPlaceholder: {
    en: "Min. 6 characters",
    ar: "6 أحرف على الأقل",
    de: "Mind. 6 Zeichen",
  },
  confirmPlaceholder: {
    en: "Repeat your password",
    ar: "كرر كلمة المرور",
    de: "Passwort wiederholen",
  },

  resetButton: {
    en: "Reset Password",
    ar: "إعادة تعيين كلمة المرور",
    de: "Passwort zurücksetzen",
  },
  resetting: {
    en: "Resetting...",
    ar: "جاري إعادة التعيين...",
    de: "Zurücksetzen...",
  },

  switchText: {
    en: "Remember your password?",
    ar: "هل تذكر كلمة المرور؟",
    de: "Passwort erinnert?",
  },
  switchLink: { en: "Sign in", ar: "تسجيل الدخول", de: "Anmelden" },

  waitingTitle: {
    en: "Verifying reset link...",
    ar: "جاري التحقق من رابط إعادة التعيين...",
    de: "Link wird überprüft...",
  },
  waitingSub: {
    en: "Please wait while we verify your password reset link.",
    ar: "يرجى الانتظار أثناء التحقق من رابط إعادة تعيين كلمة المرور الخاصة بك.",
    de: "Bitte warten Sie, während wir Ihren Link zum Zurücksetzen des Passworts überprüfen.",
  },
  waitingNote: {
    en: "If nothing happens, your link may have expired.",
    ar: "إذا لم يحدث شيء، فقد يكون رابطك قد انتهت صلاحيته.",
    de: "Wenn nichts passiert, ist Ihr Link möglicherweise abgelaufen.",
  },
  requestNew: {
    en: "Request a new one",
    ar: "اطلب رابطًا جديدًا",
    de: "Neuen anfordern",
  },

  successTitle: { en: "Password", ar: "تم", de: "Passwort" },
  successTitleEm: { en: "Reset!", ar: "إعادة التعيين!", de: "zurückgesetzt!" },
  successDesc: {
    en: "Your password has been updated successfully. Redirecting you to sign in...",
    ar: "تم تحديث كلمة المرور الخاصة بك بنجاح. جاري إعادة توجيهك إلى تسجيل الدخول...",
    de: "Ihr Passwort wurde erfolgreich aktualisiert. Sie werden zur Anmeldung weitergeleitet...",
  },

  signInNow: {
    en: "Sign In Now",
    ar: "تسجيل الدخول الآن",
    de: "Jetzt anmelden",
  },

  errorShort: {
    en: "Password must be at least 6 characters.",
    ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
    de: "Das Passwort muss mindestens 6 Zeichen lang sein.",
  },
  errorMismatch: {
    en: "Passwords do not match. Please try again.",
    ar: "كلمات المرور غير متطابقة. يرجى المحاولة مرة أخرى.",
    de: "Passwörter stimmen nicht überein. Bitte versuchen Sie es erneut.",
  },
  errorDefault: {
    en: "Failed to reset password. Please try again.",
    ar: "فشل إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.",
    de: "Passwort zurücksetzen fehlgeschlagen. Bitte versuchen Sie es erneut.",
  },
};

const getRpTranslation = (
  key: keyof typeof rpTranslations,
  lang: "en" | "ar" | "de",
  subKey?: string,
): string => {
  if (subKey && rpTranslations[key] && (rpTranslations[key] as any)[subKey]) {
    return (rpTranslations[key] as any)[subKey][lang];
  }
  if (rpTranslations[key] && (rpTranslations[key] as any)[lang]) {
    return (rpTranslations[key] as any)[lang];
  }
  return (rpTranslations[key] as any)?.en || key;
};

export default function ResetPassword() {
  const { language, isRTLMode } = useLanguage();
  const lang = language;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      } else if (event === "SIGNED_IN" && session) {
        setReady(true);
      }
    });

    const checkExistingSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      }
    };
    checkExistingSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(getRpTranslation("errorShort", lang));
      return;
    }
    if (password !== confirmPassword) {
      setError(getRpTranslation("errorMismatch", lang));
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || getRpTranslation("errorDefault", lang));
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    setDone(true);
    setLoading(false);

    setTimeout(() => {
      window.location.href = "/signin?reset=success";
    }, 2000);
  };

  return (
    <div className="rp-root" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="rp-grain" aria-hidden="true" />
      <div className="rp-bg-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="rp-corner rp-corner--tl" aria-hidden="true" />
      <div className="rp-corner rp-corner--tr" aria-hidden="true" />
      <div className="rp-corner rp-corner--bl" aria-hidden="true" />
      <div className="rp-corner rp-corner--br" aria-hidden="true" />

      <div className="rp-card">
        {/* LEFT: Brand Panel */}
        <div className="rp-brand">
          <div className="rp-brand-inner">
            <p className="rp-brand-eyebrow">
              <span className="rp-ey-line" />
              {getRpTranslation("brandEyebrow", lang)}
              <span className="rp-ey-line" />
            </p>
            <h1 className="rp-brand-title">
              {getRpTranslation("brandTitle", lang)}
            </h1>
            <p className="rp-brand-tagline">
              {getRpTranslation("brandTagline1", lang)}
              <br />
              {getRpTranslation("brandTagline2", lang)}{" "}
              <em>{getRpTranslation("brandTaglineEm", lang)}</em>
            </p>
            <div className="rp-brand-divider" aria-hidden="true" />
            <p className="rp-brand-note">
              {getRpTranslation("brandNote", lang)}
            </p>
            <div className="rp-ring" aria-hidden="true">
              <div className="rp-ring-inner" />
            </div>
          </div>
        </div>

        {/* RIGHT: Form Panel */}
        <div className="rp-form-panel">
          <div className="rp-form-wrap">
            {done ? (
              <div className="rp-success">
                <div className="rp-success-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="rp-success-eyebrow">
                  <span className="rp-ey-line" />
                  Success
                  <span className="rp-ey-line" />
                </p>
                <h2 className="rp-success-title">
                  {getRpTranslation("successTitle", lang)}{" "}
                  <em>{getRpTranslation("successTitleEm", lang)}</em>
                </h2>
                <p className="rp-success-desc">
                  {getRpTranslation("successDesc", lang)}
                </p>
                <Link href="/signin" className="rp-back-btn">
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
                  {getRpTranslation("signInNow", lang)}
                </Link>
              </div>
            ) : !ready ? (
              <div className="rp-waiting">
                <div className="rp-spinner-wrap">
                  <span className="rp-spinner-large" />
                </div>
                <p className="rp-waiting-title">
                  {getRpTranslation("waitingTitle", lang)}
                </p>
                <p className="rp-waiting-sub">
                  {getRpTranslation("waitingSub", lang)}
                </p>
                <p className="rp-waiting-note">
                  {getRpTranslation("waitingNote", lang)}{" "}
                  <Link href="/forgot-password" className="rp-link">
                    {getRpTranslation("requestNew", lang)}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div className="rp-form-header">
                  <p className="rp-form-eyebrow">
                    <span className="rp-ey-line" />
                    {getRpTranslation("formEyebrow", lang)}
                    <span className="rp-ey-line" />
                  </p>
                  <h2 className="rp-form-title">
                    {getRpTranslation("formTitle", lang)}{" "}
                    <em>{getRpTranslation("formTitleEm", lang)}</em>
                  </h2>
                  <p className="rp-form-sub">
                    {getRpTranslation("formSub", lang)}
                  </p>
                </div>

                <form className="rp-form" onSubmit={handleSubmit} noValidate>
                  {error && (
                    <div className="rp-error-box" role="alert">
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
                    className={`rp-field${focused === "pw" ? " rp-field--focused" : ""}${password ? " rp-field--filled" : ""}`}
                  >
                    <label className="rp-label" htmlFor="rp-password">
                      {getRpTranslation("newPasswordLabel", lang)}
                    </label>
                    <div className="rp-input-wrap">
                      <span className="rp-input-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                      </span>
                      <input
                        id="rp-password"
                        type={showPass ? "text" : "password"}
                        className="rp-input"
                        placeholder={getRpTranslation(
                          "passwordPlaceholder",
                          lang,
                        )}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocused("pw")}
                        onBlur={() => setFocused(null)}
                        autoComplete="new-password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="rp-eye-btn"
                        onClick={() => setShowPass(!showPass)}
                      >
                        {showPass ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="rp-field-line" aria-hidden="true" />
                  </div>

                  <div
                    className={`rp-field${focused === "cp" ? " rp-field--focused" : ""}${confirmPassword ? " rp-field--filled" : ""}`}
                  >
                    <label className="rp-label" htmlFor="rp-confirm">
                      {getRpTranslation("confirmPasswordLabel", lang)}
                    </label>
                    <div className="rp-input-wrap">
                      <span className="rp-input-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <input
                        id="rp-confirm"
                        type={showConfirm ? "text" : "password"}
                        className="rp-input"
                        placeholder={getRpTranslation(
                          "confirmPlaceholder",
                          lang,
                        )}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={() => setFocused("cp")}
                        onBlur={() => setFocused(null)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="rp-eye-btn"
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        {showConfirm ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="rp-field-line" aria-hidden="true" />
                  </div>

                  <button
                    type="submit"
                    className="rp-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="rp-spinner" />
                    ) : (
                      <>
                        <span>{getRpTranslation("resetButton", lang)}</span>
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

                <p className="rp-switch">
                  {getRpTranslation("switchText", lang)}{" "}
                  <Link href="/signin" className="rp-switch-link">
                    {getRpTranslation("switchLink", lang)}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
