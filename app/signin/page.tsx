"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isOwner } from "@/lib/checkOwner";
import { useLanguage } from "@/app/context/LanguageContext";
import "./signin.css";

/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const signinTranslations = {
  // Brand Panel
  brandEyebrow: {
    en: "Welcome Back",
    ar: "مرحباً بعودتك",
    de: "Willkommen zurück",
  },
  brandTitle: { en: "Tech4U", ar: "تيك4يو", de: "Tech4U" },
  brandTagline1: {
    en: "Luxury lives in every",
    ar: "الفخامة تعيش في كل",
    de: "Luxus lebt in jedem",
  },
  brandTaglineEm: { en: "detail.", ar: "تفصيل.", de: "Detail." },
  brandQuote: {
    en: "Time is the most precious luxury — wear it well.",
    ar: "الوقت هو أثمن رفاهية - ارتديه جيدًا.",
    de: "Zeit ist der kostbarste Luxus - tragen Sie sie gut.",
  },

  // Form Panel
  formEyebrow: {
    en: "Member Access",
    ar: "وصول الأعضاء",
    de: "Mitgliederzugang",
  },
  formTitle: { en: "Sign", ar: "تسجيل", de: "Anmelden" },
  formTitleEm: { en: "In", ar: "الدخول", de: "" },
  formSub: {
    en: "Enter your credentials to access your account",
    ar: "أدخل بيانات الاعتماد الخاصة بك للوصول إلى حسابك",
    de: "Geben Sie Ihre Anmeldeinformationen ein, um auf Ihr Konto zuzugreifen",
  },

  // Form Labels
  identifierLabel: {
    en: "Username or Email",
    ar: "اسم المستخدم أو البريد الإلكتروني",
    de: "Benutzername oder E-Mail",
  },
  identifierPlaceholder: {
    en: "your@email.com or username",
    ar: "بريدك@example.com أو اسم المستخدم",
    de: "ihre@email.de oder Benutzername",
  },

  passwordLabel: { en: "Password", ar: "كلمة المرور", de: "Passwort" },
  passwordPlaceholder: { en: "••••••••", ar: "••••••••", de: "••••••••" },

  // Forgot password
  forgotLink: {
    en: "Forgot password?",
    ar: "نسيت كلمة المرور؟",
    de: "Passwort vergessen?",
  },

  // Submit Button
  signInBtn: { en: "Sign In", ar: "تسجيل الدخول", de: "Anmelden" },

  // or divider
  orText: { en: "or", ar: "أو", de: "oder" },

  // Switch to signup
  switchText: {
    en: "Don't have an account?",
    ar: "ليس لديك حساب؟",
    de: "Sie haben kein Konto?",
  },
  switchLink: {
    en: "Sign up for free",
    ar: "اشترك مجانًا",
    de: "Kostenlos registrieren",
  },

  // Error messages
  usernameNotFound: {
    en: "No account found with that username.",
    ar: "لم يتم العثور على حساب بهذا الاسم.",
    de: "Kein Konto mit diesem Benutzernamen gefunden.",
  },
  invalidCredentials: {
    en: "Incorrect credentials. Please check your email/username and password.",
    ar: "بيانات اعتماد غير صحيحة. يرجى التحقق من بريدك الإلكتروني/اسم المستخدم وكلمة المرور.",
    de: "Falsche Anmeldeinformationen. Bitte überprüfen Sie Ihre E-Mail/Benutzername und Passwort.",
  },
  resetSuccess: {
    en: "Password reset successful! Please sign in with your new password.",
    ar: "تم إعادة تعيين كلمة المرور بنجاح! يرجى تسجيل الدخول بكلمة المرور الجديدة.",
    de: "Passwort-Reset erfolgreich! Bitte melden Sie sich mit Ihrem neuen Passwort an.",
  },
};

const getSigninTranslation = (
  key: keyof typeof signinTranslations,
  lang: "en" | "ar" | "de",
): string => {
  return signinTranslations[key]?.[lang] || signinTranslations[key]?.en || key;
};

const CACHE_KEY = "panel_auth_ok";

function setCachedAuth(ok: boolean) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ok, ts: Date.now() }));
  } catch {}
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function SignIn() {
  const { language, isRTLMode } = useLanguage();
  const lang = language;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirectTo");
        const owner = isOwner(session.user.email);
        if (owner) {
          setCachedAuth(true);
          window.location.replace(
            redirectTo?.startsWith("/panel") ? redirectTo : "/panel",
          );
        } else {
          window.location.replace("/profile");
        }
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "success") {
      setResetSuccess(getSigninTranslation("resetSuccess", lang));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let emailToUse = identifier.trim();
    const isEmail = identifier.includes("@");

    if (!isEmail) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", identifier.trim())
        .maybeSingle();

      if (profileError || !profile) {
        setError(getSigninTranslation("usernameNotFound", lang));
        setLoading(false);
        return;
      }
      emailToUse = profile.email;
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email: emailToUse, password });

    if (signInError) {
      setError(getSigninTranslation("invalidCredentials", lang));
      setLoading(false);
      return;
    }

    const userEmail = signInData?.user?.email ?? null;
    const ownerUser = isOwner(userEmail);
    setCachedAuth(ownerUser);

    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirectTo");

    if (ownerUser) {
      window.location.replace(
        redirectTo?.startsWith("/panel") ? redirectTo : "/panel",
      );
    } else {
      window.location.replace("/profile");
    }
  };

  return (
    <div className="si-root" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="si-grain" aria-hidden="true" />
      <div className="si-bg-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="si-corner si-corner--tl" aria-hidden="true" />
      <div className="si-corner si-corner--tr" aria-hidden="true" />
      <div className="si-corner si-corner--bl" aria-hidden="true" />
      <div className="si-corner si-corner--br" aria-hidden="true" />

      <div className="si-card">
        {/* LEFT: Brand Panel */}
        <div className="si-brand">
          <div className="si-brand-inner">
            <p className="si-brand-eyebrow">
              <span className="si-ey-line" />
              {getSigninTranslation("brandEyebrow", lang)}
              <span className="si-ey-line" />
            </p>
            <h1 className="si-brand-title">
              {getSigninTranslation("brandTitle", lang)}
            </h1>
            <p className="si-brand-tagline">
              {getSigninTranslation("brandTagline1", lang)}
              <br />
              <em>{getSigninTranslation("brandTaglineEm", lang)}</em>
            </p>
            <div className="si-brand-divider" aria-hidden="true" />
            <p className="si-brand-quote">
              {getSigninTranslation("brandQuote", lang)}
            </p>
            <div className="si-watch-ring" aria-hidden="true">
              <div className="si-watch-inner" />
            </div>
          </div>
        </div>

        {/* RIGHT: Form Panel */}
        <div className="si-form-panel">
          <div className="si-form-wrap">
            {resetSuccess && (
              <div className="si-success-box" role="alert">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {resetSuccess}
              </div>
            )}

            <div className="si-form-header">
              <p className="si-form-eyebrow">
                <span className="si-ey-line" />
                {getSigninTranslation("formEyebrow", lang)}
                <span className="si-ey-line" />
              </p>
              <h2 className="si-form-title">
                {getSigninTranslation("formTitle", lang)}{" "}
                <em>{getSigninTranslation("formTitleEm", lang)}</em>
              </h2>
              <p className="si-form-sub">
                {getSigninTranslation("formSub", lang)}
              </p>
            </div>

            <form className="si-form" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="si-error-box" role="alert">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Username/Email */}
              <div
                className={`si-field${focused === "id" ? " si-field--focused" : ""}${identifier ? " si-field--filled" : ""}`}
              >
                <label className="si-label" htmlFor="si-identifier">
                  {getSigninTranslation("identifierLabel", lang)}
                </label>
                <div className="si-input-wrap">
                  <span className="si-input-icon" aria-hidden="true">
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
                    id="si-identifier"
                    type="text"
                    className="si-input"
                    placeholder={getSigninTranslation(
                      "identifierPlaceholder",
                      lang,
                    )}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onFocus={() => setFocused("id")}
                    onBlur={() => setFocused(null)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="si-field-line" aria-hidden="true" />
              </div>

              {/* Password */}
              <div
                className={`si-field${focused === "pw" ? " si-field--focused" : ""}${password ? " si-field--filled" : ""}`}
              >
                <label className="si-label" htmlFor="si-password">
                  {getSigninTranslation("passwordLabel", lang)}
                </label>
                <div className="si-input-wrap">
                  <span className="si-input-icon" aria-hidden="true">
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
                    id="si-password"
                    type={showPass ? "text" : "password"}
                    className="si-input"
                    placeholder={getSigninTranslation(
                      "passwordPlaceholder",
                      lang,
                    )}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("pw")}
                    onBlur={() => setFocused(null)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="si-eye-btn"
                    onClick={() => setShowPass((prev) => !prev)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
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
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="si-field-line" aria-hidden="true" />
              </div>

              <div className="si-forgot-row">
                <Link href="/forgot-password" className="si-forgot-link">
                  {getSigninTranslation("forgotLink", lang)}
                </Link>
              </div>

              <button
                type="submit"
                className="si-submit-btn"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="si-btn-loader">
                    <span className="si-spinner" />
                  </span>
                ) : (
                  <>
                    {getSigninTranslation("signInBtn", lang)}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
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

            <div className="si-or" aria-hidden="true">
              <span className="si-or-line" />
              <span className="si-or-text">
                {getSigninTranslation("orText", lang)}
              </span>
              <span className="si-or-line" />
            </div>

            <p className="si-switch">
              {getSigninTranslation("switchText", lang)}{" "}
              <Link href="/signup" className="si-switch-link">
                {getSigninTranslation("switchLink", lang)}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="12"
                  height="12"
                  aria-hidden="true"
                >
                  <path
                    d="M9 18l6-6-6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
