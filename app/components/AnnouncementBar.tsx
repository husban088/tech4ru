// app/components/AnnouncementBar.tsx
"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import "./AnnouncementBar.css";

export default function AnnouncementBar() {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const messages = [
    {
      icon: "🚚",
      textEn: "FREE SHIPPING WORLDWIDE",
      textAr: "شحن مجاني حول العالم",
      textDe: "KOSTENLOSER WELTWEITER VERSAND",
      subtextEn: "",
      subtextAr: "",
      subtextDe: "",
    },
    {
      icon: "⚡",
      textEn: "HURRY UP! LIMITED TIME OFFER",
      textAr: "اسرع! عرض لفترة محدودة",
      textDe: "BEEILEN SIE SICH! BEFRISTETES ANGEBOT",
      subtextEn: "",
      subtextAr: "",
      subtextDe: "",
    },
    {
      icon: "✨",
      textEn: "LUXURY IN EVERY DETAIL",
      textAr: "الفخامة في كل التفاصيل",
      textDe: "LUXUS IN JEDEM DETAIL",
      subtextEn: "Premium quality guaranteed",
      subtextAr: "جودة ممتازة مضمونة",
      subtextDe: "Premium Qualität garantiert",
    },
  ];

  // ── Rotate messages every 5s ──────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const currentMessage = messages[currentIndex];

  const getText = () => {
    if (language === "ar") return currentMessage.textAr;
    if (language === "de") return currentMessage.textDe;
    return currentMessage.textEn;
  };

  const getSubtext = () => {
    if (
      !currentMessage.subtextEn &&
      !currentMessage.subtextAr &&
      !currentMessage.subtextDe
    )
      return null;
    if (language === "ar") return currentMessage.subtextAr;
    if (language === "de") return currentMessage.subtextDe;
    return currentMessage.subtextEn;
  };

  const subtext = getSubtext();

  return (
    <div className="announcement-bar">
      {/* RED shimmer line */}
      <div className="red-shimmer" aria-hidden="true" />

      {/* Ambient glow */}
      <div className="announcement-glow" aria-hidden="true" />

      {/* Corner accents */}
      <div className="corner-accent corner-accent--tl" aria-hidden="true" />
      <div className="corner-accent corner-accent--tr" aria-hidden="true" />

      <div className="announcement-container">
        <div className="announcement-content">
          <span className="announcement-icon">{currentMessage.icon}</span>
          <div className="announcement-text-wrapper">
            <span className="announcement-text">{getText()}</span>
            {subtext && <span className="announcement-subtext">{subtext}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
