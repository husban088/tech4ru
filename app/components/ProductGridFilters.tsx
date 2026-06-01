"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";
import "./ProductGridFilters.css";

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    categories: string[];
    subcategories: string[];
    colors: string[];
    sizes: string[];
    capacities: string[];
    materials: string[];
  };
  selectedFilters: {
    category: string;
    subcategory: string;
    color: string;
    size: string;
    capacity: string;
    material: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearAll: () => void;
}

// Translations for filter sidebar
const filterTranslations = {
  title: { en: "Filters", ar: "تصفية", de: "Filter" },
  clearAll: { en: "Clear All", ar: "مسح الكل", de: "Alle löschen" },
  applyFilters: {
    en: "Apply Filters",
    ar: "تطبيق التصفية",
    de: "Filter anwenden",
  },
  categories: { en: "Category", ar: "الفئة", de: "Kategorie" },
  subcategories: {
    en: "Subcategory",
    ar: "الفئة الفرعية",
    de: "Unterkategorie",
  },
  colors: { en: "Colors", ar: "الألوان", de: "Farben" },
  sizes: { en: "Sizes", ar: "المقاسات", de: "Größen" },
  capacities: { en: "Capacity", ar: "السعة", de: "Kapazität" },
  materials: { en: "Material", ar: "المواد", de: "Material" },
  all: { en: "All", ar: "الكل", de: "Alle" },
};

function getFilterTranslation(
  key: keyof typeof filterTranslations,
  lang: "en" | "ar" | "de",
): string {
  return filterTranslations[key]?.[lang] || filterTranslations[key]?.en || key;
}

export default function FilterSidebar({
  isOpen,
  onClose,
  filters,
  selectedFilters,
  onFilterChange,
  onClearAll,
}: FilterSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { language, isRTLMode } = useLanguage();

  // Wait for client mount before using portal (Next.js SSR safety)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filterSections = [
    {
      id: "category",
      labelKey: "categories",
      icon: "🏷️",
      items: filters.categories,
    },
    {
      id: "subcategory",
      labelKey: "subcategories",
      icon: "📂",
      items: filters.subcategories,
    },
    { id: "color", labelKey: "colors", icon: "🎨", items: filters.colors },
    { id: "size", labelKey: "sizes", icon: "📏", items: filters.sizes },
    {
      id: "capacity",
      labelKey: "capacities",
      icon: "⚡",
      items: filters.capacities,
    },
    {
      id: "material",
      labelKey: "materials",
      icon: "🔧",
      items: filters.materials,
    },
  ];

  const getActiveCount = () => {
    return Object.values(selectedFilters).filter((v) => v && v !== "All")
      .length;
  };

  const activeCount = getActiveCount();

  const content = (
    <>
      <div
        className={`filter-overlay ${isOpen ? "active" : ""}`}
        onClick={onClose}
      />

      <div
        ref={sidebarRef}
        className={`filter-sidebar ${isOpen ? "open" : ""}`}
        dir={isRTLMode ? "rtl" : "ltr"}
      >
        <div className="filter-header">
          <div className="filter-header-left">
            <span className="filter-icon">⚡</span>
            <h3 className="filter-title">
              {getFilterTranslation("title", language)}
            </h3>
            {activeCount > 0 && (
              <span className="filter-count">{activeCount}</span>
            )}
          </div>
          <button className="filter-close" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="filter-body">
          {filterSections.map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.id} className="filter-section">
                  <button
                    className={`filter-section-header ${activeSection === section.id ? "active" : ""}`}
                    onClick={() =>
                      setActiveSection(
                        activeSection === section.id ? null : section.id,
                      )
                    }
                  >
                    <span className="filter-section-icon">{section.icon}</span>
                    <span className="filter-section-label">
                      {getFilterTranslation(
                        section.labelKey as keyof typeof filterTranslations,
                        language,
                      )}
                    </span>
                    {selectedFilters[
                      section.id as keyof typeof selectedFilters
                    ] &&
                      selectedFilters[
                        section.id as keyof typeof selectedFilters
                      ] !== "All" && (
                        <span className="filter-section-active-dot" />
                      )}
                    <svg
                      className={`filter-section-arrow ${activeSection === section.id ? "open" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {activeSection === section.id && (
                    <div className="filter-section-content">
                      <button
                        className={`filter-chip ${
                          !selectedFilters[
                            section.id as keyof typeof selectedFilters
                          ] ||
                          selectedFilters[
                            section.id as keyof typeof selectedFilters
                          ] === "All"
                            ? "active"
                            : ""
                        }`}
                        onClick={() => onFilterChange(section.id, "All")}
                      >
                        {getFilterTranslation("all", language)}
                      </button>
                      {section.items.map((item) => (
                        <button
                          key={item}
                          className={`filter-chip ${
                            selectedFilters[
                              section.id as keyof typeof selectedFilters
                            ] === item
                              ? "active"
                              : ""
                          }`}
                          onClick={() => onFilterChange(section.id, item)}
                        >
                          {section.id === "color" && (
                            <span
                              className="filter-color-dot"
                              style={{ backgroundColor: item.toLowerCase() }}
                            />
                          )}
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
          )}
        </div>

        <div className="filter-footer">
          {activeCount > 0 && (
            <button className="filter-clear-btn" onClick={onClearAll}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              {getFilterTranslation("clearAll", language)} ({activeCount})
            </button>
          )}
          <button className="filter-apply-btn" onClick={onClose}>
            {getFilterTranslation("applyFilters", language)}
          </button>
        </div>
      </div>
    </>
  );

  // createPortal mounts directly on document.body — completely escapes
  // any parent stacking context (navbar, layout wrappers, etc.)
  if (!mounted) return null;
  return createPortal(content, document.body);
}
