"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isOwner } from "@/lib/checkOwner";
import { useCartStore } from "@/lib/cartStore";
import "./navbar.css";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../context/LanguageContext";
import { SupportedLanguage } from "@/lib/translations";
import LanguageDropdown from "./LanguageDropdown";

interface NavbarProps {
  onMenuOpen: () => void;
  onSearchOpen: () => void;
  onCartOpen: () => void;
}

// ✅ Category translations
const categoryLabels: Record<string, Record<"en" | "ar" | "de", string>> = {
  "/accessories": { en: "Accessories", ar: "الإكسسوارات", de: "Zubehör" },
  "/watches": { en: "Watches", ar: "الساعات", de: "Uhren" },
  "/automotive": { en: "Automotive", ar: "السيارات", de: "Automobil" },
  "/home-decor": { en: "Home Decor", ar: "ديكور المنزل", de: "Wohnkultur" },
};

// ✅ Subcategory translations
const subcategoryTranslations: Record<
  string,
  Record<"en" | "ar" | "de", string>
> = {
  Chargers: { en: "Chargers", ar: "شواحن", de: "Ladegeräte" },
  Cables: { en: "Cables", ar: "كابلات", de: "Kabel" },
  "Phone Holders": {
    en: "Phone Holders",
    ar: "حوامل الهاتف",
    de: "Telefonhalter",
  },
  "Tech Gadgets": { en: "Tech Gadgets", ar: "أدوات تقنية", de: "Tech-Gadgets" },
  "Smart Accessories": {
    en: "Smart Accessories",
    ar: "إكسسوارات ذكية",
    de: "Intelligentes Zubehör",
  },
  "Men Watches": { en: "Men Watches", ar: "ساعات رجالية", de: "Herrenuhren" },
  "Women Watches": {
    en: "Women Watches",
    ar: "ساعات نسائية",
    de: "Damenuhren",
  },
  "Smart Watches": {
    en: "Smart Watches",
    ar: "ساعات ذكية",
    de: "Smartwatches",
  },
  "Luxury Watches": {
    en: "Luxury Watches",
    ar: "ساعات فاخرة",
    de: "Luxusuhren",
  },
  "Car Accessories": {
    en: "Car Accessories",
    ar: "إكسسوارات السيارة",
    de: "Auto-Zubehör",
  },
  "Car Cleaning Tools": {
    en: "Car Cleaning Tools",
    ar: "أدوات تنظيف السيارة",
    de: "Auto-Reinigungswerkzeuge",
  },
  "Interior Accessories": {
    en: "Interior Accessories",
    ar: "إكسسوارات داخلية",
    de: "Innenausstattung",
  },
  "Wall Decor": { en: "Wall Decor", ar: "ديكور الحائط", de: "Wanddekoration" },
  Lighting: { en: "Lighting", ar: "إضاءة", de: "Beleuchtung" },
  "Kitchen Essentials": {
    en: "Kitchen Essentials",
    ar: "أساسيات المطبخ",
    de: "Küchenutensilien",
  },
  "Storage & Organizers": {
    en: "Storage & Organizers",
    ar: "تخزين ومنظمات",
    de: "Aufbewahrung & Organizer",
  },
};

function getTranslatedSubcategory(
  originalName: string,
  language: SupportedLanguage,
): string {
  return subcategoryTranslations[originalName]?.[language] || originalName;
}

const categorySubcategories: Record<string, { name: string; href: string }[]> =
  {
    "/accessories": [
      { name: "Chargers", href: "/accessories/chargers" },
      { name: "Cables", href: "/accessories/cables" },
      { name: "Phone Holders", href: "/accessories/phone-holders" },
      { name: "Tech Gadgets", href: "/accessories/tech-gadgets" },
      { name: "Smart Accessories", href: "/accessories/smart-accessories" },
    ],
    "/watches": [
      { name: "Men Watches", href: "/watches/men-watches" },
      { name: "Women Watches", href: "/watches/women-watches" },
      { name: "Smart Watches", href: "/watches/smart-watches" },
      { name: "Luxury Watches", href: "/watches/luxury-watches" },
    ],
    "/automotive": [
      { name: "Car Accessories", href: "/automotive/car-accessories" },
      { name: "Car Cleaning Tools", href: "/automotive/car-cleaning-tools" },
      { name: "Phone Holders", href: "/automotive/phone-holders" },
      {
        name: "Interior Accessories",
        href: "/automotive/interior-accessories",
      },
    ],
    "/home-decor": [
      { name: "Wall Decor", href: "/home-decor/wall-decor" },
      { name: "Lighting", href: "/home-decor/lighting" },
      { name: "Kitchen Essentials", href: "/home-decor/kitchen-essentials" },
      { name: "Storage & Organizers", href: "/home-decor/storage-organizers" },
    ],
  };

export default function Navbar({
  onMenuOpen,
  onSearchOpen,
  onCartOpen,
}: NavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(undefined);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  const { currency, currencies, setCurrency } = useCurrency();
  const {
    t,
    showLanguageDropdown,
    setLanguage,
    language,
    availableLanguages,
    isRTLMode,
  } = useLanguage();

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/accessories", label: categoryLabels["/accessories"][language] },
    { href: "/watches", label: categoryLabels["/watches"][language] },
    { href: "/automotive", label: categoryLabels["/automotive"][language] },
    { href: "/home-decor", label: categoryLabels["/home-decor"][language] },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];

  // Only track scroll for shadow effect, not for hiding navbar
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setUserEmail(session.user.email ?? null);
        } else {
          setUser(null);
          setUserEmail(null);
        }
      } catch {
        setUser(null);
        setUserEmail(null);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setUserEmail(null);
      } else {
        setUser(session.user);
        setUserEmail(session.user.email ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ OWNER CHECK
  const isOwnerUser = userEmail === "info@tech4ru.com";
  const authResolved = user !== undefined;
  const isSignedIn = authResolved && user !== null;

  const handleCurrencySelect = (cur: (typeof currencies)[0]) => {
    setCurrency(cur);
    setCurrencyOpen(false);

    if (cur.code === "EUR") {
      window.dispatchEvent(
        new CustomEvent("force-language-dropdown", {
          detail: { country: "DE" },
        }),
      );
    } else if (cur.code === "AED") {
      window.dispatchEvent(
        new CustomEvent("force-language-dropdown", {
          detail: { country: "OTHER" },
        }),
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("force-language-dropdown", {
          detail: { country: "OTHER" },
        }),
      );
    }
  };

  const handleDropdownEnter = (href: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setOpenDropdown(href);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const handleCurrencyMouseEnter = () => {
    if (currencyTimeoutRef.current) clearTimeout(currencyTimeoutRef.current);
    setCurrencyOpen(true);
  };

  const handleCurrencyMouseLeave = () => {
    currencyTimeoutRef.current = setTimeout(() => setCurrencyOpen(false), 200);
  };

  const navigateTo = (href: string) => {
    window.location.href = href;
  };

  return (
    <nav
      className={`navbar${scrolled ? " scrolled" : ""}`}
      dir={isRTLMode ? "rtl" : "ltr"}
    >
      <div className="navbar-container">
        {/* LEFT — Currency & Search */}
        <div className="navbar-left">
          {mounted && isOwnerUser && (
            <div
              className="currency-dropdown"
              onMouseEnter={handleCurrencyMouseEnter}
              onMouseLeave={handleCurrencyMouseLeave}
            >
              <button className="currency-btn">
                <span className="currency-flag">{currency.flag}</span>
                <span className="currency-symbol">{currency.symbol}</span>
                <span className="currency-code">{currency.code}</span>
                <svg
                  className={`currency-arrow ${currencyOpen ? "open" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {currencyOpen && (
                <div className="currency-menu">
                  {currencies.map((cur) => (
                    <button
                      key={cur.code}
                      className={`currency-option${currency.code === cur.code ? " active" : ""}`}
                      onClick={() => handleCurrencySelect(cur)}
                    >
                      <span className="currency-option-flag">{cur.flag}</span>
                      <span className="currency-option-symbol">
                        {cur.symbol}
                      </span>
                      <span className="currency-option-code">{cur.code}</span>
                      <span className="currency-option-name">{cur.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="nav-icon-btn search-btn"
            onClick={(e) => {
              e.preventDefault();
              onSearchOpen();
            }}
            aria-label={t.nav.search}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <span className="nav-icon-tooltip">{t.nav.search}</span>
          </button>
        </div>

        {/* CENTER — TEXT LOGO */}
        <div className="navbar-center">
          <a
            href="/"
            className="navbar-logo"
            onClick={(e) => {
              e.preventDefault();
              navigateTo("/");
            }}
          >
            <span className="logo-tech">TECH</span>
            <span className="logo-four">4</span>
            <span className="logo-u">U</span>
          </a>
        </div>

        {/* RIGHT — Language Dropdown + User + Cart */}
        <div className="navbar-right">
          {showLanguageDropdown && (
            <LanguageDropdown className="nav-desktop-only" />
          )}

          <div className="nav-desktop-only">
            <a
              href={isSignedIn ? "/profile" : "/signin"}
              className="nav-icon-btn user-btn"
              aria-label={isSignedIn ? "My Profile" : t.nav.home}
              onClick={(e) => {
                e.preventDefault();
                navigateTo(isSignedIn ? "/profile" : "/signin");
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {isSignedIn && <span className="user-active-dot" />}
              <span className="nav-icon-tooltip">
                {isSignedIn ? "Profile" : "Sign In"}
              </span>
            </a>
          </div>

          <button
            className="nav-icon-btn cart-btn"
            onClick={(e) => {
              e.preventDefault();
              onCartOpen();
            }}
            aria-label={t.nav.cart}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            <span className="nav-icon-tooltip">{t.nav.cart}</span>
          </button>

          <button
            className="nav-icon-btn menu-btn mobile-only"
            onClick={(e) => {
              e.preventDefault();
              onMenuOpen();
            }}
            aria-label={t.nav.menu}
          >
            <span />
            <span />
            <span />
            <span className="nav-icon-tooltip">{t.nav.menu}</span>
          </button>
        </div>
      </div>

      {/* BOTTOM NAV — Desktop */}
      <div className="navbar-bottom desktop-only">
        <ul className="nav-links">
          {navLinks.map((link) => {
            const hasDropdown = categorySubcategories[link.href];
            const isActive = pathname === link.href;
            return (
              <li
                key={link.href}
                className={`nav-item${hasDropdown ? " has-dropdown" : ""}${openDropdown === link.href ? " dropdown-active" : ""}`}
                onMouseEnter={() =>
                  hasDropdown && handleDropdownEnter(link.href)
                }
                onMouseLeave={handleDropdownLeave}
              >
                <a
                  href={link.href}
                  className={isActive ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(link.href);
                  }}
                >
                  {link.label}
                  {hasDropdown && (
                    <svg
                      className="dropdown-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </a>
                {hasDropdown && openDropdown === link.href && (
                  <div
                    className="dropdown-menu"
                    onMouseEnter={() => handleDropdownEnter(link.href)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    {categorySubcategories[link.href].map((sub) => (
                      <a
                        key={sub.href}
                        href={sub.href}
                        className={`dropdown-item${pathname === sub.href ? " active" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo(sub.href);
                        }}
                      >
                        {getTranslatedSubcategory(sub.name, language)}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            );
          })}

          {isOwnerUser && (
            <li className="nav-item">
              <a
                href="/panel"
                className={pathname === "/panel" ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/panel";
                }}
              >
                Panel
              </a>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
