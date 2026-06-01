// app/context/LanguageContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  SupportedLanguage,
  Translation,
  getTranslation,
  isRTL,
  SHOW_LANGUAGE_DROPDOWN_COUNTRIES,
  UAE_DROPDOWN_LANGUAGES,
} from "@/lib/translations";

interface AvailableLanguage {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: Translation;
  isRTLMode: boolean;
  showLanguageDropdown: boolean;
  availableLanguages: AvailableLanguage[];
  detectedCountry: string | null;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "preferredLanguage";
const COUNTRY_CACHE_KEY = "detectedCountryCache";
const COUNTRY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ── Apply language to DOM immediately (dir + lang + body class) ──────────────
function applyLangToDOM(lang: SupportedLanguage) {
  if (typeof document === "undefined") return;
  const rtl = isRTL(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.body.dir = rtl ? "rtl" : "ltr";
  document.body.classList.toggle("rtl", rtl);
  document.body.classList.toggle("ltr", !rtl);
}

// ── Country detection with session cache ────────────────────────────────────
async function detectCountry(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) {
      const { country, time } = JSON.parse(cached);
      if (Date.now() - time < COUNTRY_CACHE_TTL && country?.length === 2) {
        return country;
      }
    }
  } catch {}

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch("/api/detect-country", {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.country?.length === 2) {
        cacheCountry(data.country);
        return data.country;
      }
    }
  } catch {}

  const apis: { url: string; parse: (d: any) => string }[] = [
    { url: "https://api.country.is/", parse: (d) => d.country },
    { url: "https://ipapi.co/json/", parse: (d) => d.country_code },
    { url: "https://freeipapi.com/api/json/", parse: (d) => d.countryCode },
  ];

  const promises = apis.map(async ({ url, parse }) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      const code = parse(data);
      if (typeof code === "string" && code.length === 2) return code;
      throw new Error("invalid");
    } catch {
      clearTimeout(t);
      throw new Error("failed");
    }
  });

  try {
    const country = await Promise.any(promises);
    cacheCountry(country);
    return country;
  } catch {}

  return null;
}

function cacheCountry(country: string) {
  try {
    sessionStorage.setItem(
      COUNTRY_CACHE_KEY,
      JSON.stringify({ country, time: Date.now() }),
    );
  } catch {}
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableLangs, setAvailableLangs] = useState<AvailableLanguage[]>([]);

  const applyLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    applyLangToDOM(lang);
  }, []);

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      applyLanguage(lang);
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {}
    },
    [applyLanguage],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let savedLang: SupportedLanguage | null = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
        if (
          stored &&
          (["en", "ar", "de"] as SupportedLanguage[]).includes(stored)
        ) {
          savedLang = stored;
        }
      } catch {}

      const countryCode = await detectCountry();
      if (cancelled) return;
      setDetectedCountry(countryCode);

      if (countryCode === "DE") {
        // GERMANY: Always German, NO dropdown shown ever
        setShowDropdown(false);
        setAvailableLangs([]);
        // Only override if user never explicitly chose a different language
        if (!savedLang || savedLang === "de" || savedLang === "en") {
          applyLanguage("de");
          try {
            localStorage.setItem(STORAGE_KEY, "de");
          } catch {}
        } else {
          applyLanguage(savedLang);
        }
      } else if (
        countryCode &&
        SHOW_LANGUAGE_DROPDOWN_COUNTRIES.includes(countryCode)
      ) {
        // UAE: Show English + Arabic dropdown
        setShowDropdown(true);
        setAvailableLangs(UAE_DROPDOWN_LANGUAGES);
        if (savedLang === "ar" || savedLang === "en") {
          applyLanguage(savedLang);
        } else {
          applyLanguage("en");
          try {
            localStorage.setItem(STORAGE_KEY, "en");
          } catch {}
        }
      } else {
        // All other countries: English only, no dropdown
        setShowDropdown(false);
        setAvailableLangs([]);
        // If they had Arabic or German saved from a previous visit, reset
        if (savedLang === "ar") {
          applyLanguage("en");
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        } else {
          applyLanguage("en");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [applyLanguage]);

  // Currency-triggered country override from Navbar
  useEffect(() => {
    const handler = (e: Event) => {
      const country = (e as CustomEvent).detail?.country as string;
      if (country === "AE") {
        setShowDropdown(true);
        setAvailableLangs(UAE_DROPDOWN_LANGUAGES);
        setDetectedCountry("AE");
        setLanguageState((prev) => {
          const valid: SupportedLanguage =
            prev === "en" || prev === "ar" ? prev : "en";
          applyLangToDOM(valid);
          return valid;
        });
      } else if (country === "DE") {
        setShowDropdown(false);
        setAvailableLangs([]);
        applyLanguage("de");
      } else if (country === "OTHER") {
        setShowDropdown(false);
        setAvailableLangs([]);
        applyLanguage("en");
      }
    };
    window.addEventListener("force-language-dropdown", handler);
    return () => window.removeEventListener("force-language-dropdown", handler);
  }, [applyLanguage]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: getTranslation(language),
    isRTLMode: isRTL(language),
    showLanguageDropdown: showDropdown,
    availableLanguages: availableLangs,
    detectedCountry,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be inside <LanguageProvider>");
  return ctx;
}
