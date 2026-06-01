// app/components/LanguageDropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { SupportedLanguage } from "@/lib/translations";

const LANG_FLAGS: Record<SupportedLanguage, string> = {
  en: "🇬🇧",
  ar: "🇦🇪",
  de: "🇩🇪",
};

interface LanguageDropdownProps {
  className?: string;
}

export default function LanguageDropdown({
  className = "",
}: LanguageDropdownProps) {
  const {
    language,
    setLanguage,
    showLanguageDropdown,
    availableLanguages,
    t,
    isRTLMode,
  } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!showLanguageDropdown || availableLanguages.length === 0) return null;

  const currentLang = availableLanguages.find((l) => l.code === language);

  return (
    <div
      ref={dropdownRef}
      className={`lang-wrapper ${className}`}
      style={{ position: "relative" }}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="lang-trigger"
        aria-label={t.common.selectLanguage}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="lang-flag">{LANG_FLAGS[language]}</span>
        <span className="lang-name">
          {currentLang?.nativeName || "English"}
        </span>
        <svg
          className={`lang-chevron${isOpen ? " open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="lang-menu"
          role="listbox"
          aria-label={t.common.selectLanguage}
          /* Menu opens left-aligned in RTL, right-aligned in LTR */
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            ...(isRTLMode ? { left: 0 } : { right: 0 }),
            minWidth: "200px",
            zIndex: 9999,
          }}
        >
          {availableLanguages.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isActive}
                className={`lang-option${isActive ? " active" : ""}`}
                onClick={() => {
                  setLanguage(lang.code as SupportedLanguage);
                  setIsOpen(false);
                }}
                /* Each option direction matches the language it represents */
                dir={lang.code === "ar" ? "rtl" : "ltr"}
              >
                <span className="lang-flag">{LANG_FLAGS[lang.code]}</span>
                <div className="lang-texts">
                  <span className="lang-native">{lang.nativeName}</span>
                  <span className="lang-english">{lang.name}</span>
                </div>
                {isActive && (
                  <svg
                    className="lang-check"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 7L5.5 10.5L12 3.5"
                      stroke="#daa520"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .lang-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(218, 165, 32, 0.08);
          border: 1px solid rgba(218, 165, 32, 0.25);
          border-radius: 40px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: inherit;
          transition: all 0.2s ease;
          white-space: nowrap;
          /* Direction for the trigger always follows page direction */
          direction: inherit;
        }

        .lang-trigger:hover {
          background: rgba(218, 165, 32, 0.15);
          border-color: rgba(218, 165, 32, 0.5);
          transform: translateY(-1px);
        }

        .lang-flag {
          font-size: 16px;
          line-height: 1;
          flex-shrink: 0;
        }

        .lang-name {
          font-size: 12px;
          font-weight: 600;
        }

        .lang-chevron {
          transition: transform 0.2s ease;
          opacity: 0.6;
          flex-shrink: 0;
          /* Chevron should not flip in RTL — it's a down arrow */
          margin-inline-start: 2px;
        }

        .lang-chevron.open {
          transform: rotate(180deg);
        }

        .lang-menu {
          background: #fff;
          border: 1px solid rgba(218, 165, 32, 0.2);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          animation: langFadeIn 0.15s ease;
        }

        @keyframes langFadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .lang-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
          /* Direction set per-button via dir attribute above */
        }

        .lang-option:hover {
          background: rgba(218, 165, 32, 0.07);
        }

        .lang-option.active {
          background: rgba(218, 165, 32, 0.1);
        }

        .lang-texts {
          display: flex;
          flex-direction: column;
          flex: 1;
          /* Text aligns to start of writing direction */
          text-align: start;
        }

        .lang-native {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .lang-english {
          font-size: 10px;
          color: #888;
        }

        .lang-check {
          flex-shrink: 0;
          margin-inline-start: auto;
        }

        /* Mobile: hide text label, show only flag */
        @media (max-width: 768px) {
          .lang-name {
            display: none;
          }
          .lang-trigger {
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
}
