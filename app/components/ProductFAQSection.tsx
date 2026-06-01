"use client";

import { useState } from "react";
import "./ProductFAQSection.css";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ProductFAQItem = {
  id?: string;
  question: string;
  answer: string;
  display_order: number;
};

type Props = {
  faqs: ProductFAQItem[];
};

// ─── Single FAQ Item ──────────────────────────────────────────────────────────
function FAQItem({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: ProductFAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`pfaq-item${isOpen ? " pfaq-item--open" : ""}`}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Decorative index number */}
      <span className="pfaq-item__num" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Question trigger button */}
      <button
        type="button"
        className="pfaq-item__trigger"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="pfaq-item__question">{faq.question}</span>
        <span className="pfaq-item__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
              className="pfaq-icon-vertical"
            />
          </svg>
        </span>
      </button>

      {/* Answer — pure CSS max-height accordion */}
      <div className="pfaq-item__body" role="region" aria-hidden={!isOpen}>
        <div className="pfaq-item__answer">
          <div className="pfaq-answer-bar" aria-hidden="true" />
          <p>{faq.answer}</p>
        </div>
      </div>

      {/* Separator */}
      <div className="pfaq-item__line" aria-hidden="true" />
    </div>
  );
}

// ─── Main FAQ Section ─────────────────────────────────────────────────────────
export default function ProductFAQSection({ faqs }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) return null;

  const sorted = [...faqs].sort((a, b) => a.display_order - b.display_order);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className="pfaq-section" aria-label="Frequently Asked Questions">
      <div className="pfaq-bg-grid" aria-hidden="true" />
      <div className="pfaq-bg-glow pfaq-bg-glow--1" aria-hidden="true" />
      <div className="pfaq-bg-glow pfaq-bg-glow--2" aria-hidden="true" />

      <div className="pfaq-header">
        <div className="pfaq-header__eyebrow">
          <span className="pfaq-ey-line" aria-hidden="true" />
          <span className="pfaq-ey-text">Have Questions?</span>
          <span className="pfaq-ey-line" aria-hidden="true" />
        </div>
        <h2 className="pfaq-header__title">
          Frequently Asked
          <em> Questions</em>
        </h2>
        <p className="pfaq-header__sub">
          Everything you need to know about this product
        </p>
      </div>

      <div className="pfaq-list">
        {sorted.map((faq, i) => (
          <FAQItem
            key={faq.id ?? i}
            faq={faq}
            index={i}
            isOpen={openIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      <div className="pfaq-footer">
        <span className="pfaq-footer__badge">
          {sorted.length} Question{sorted.length !== 1 ? "s" : ""} Answered
        </span>
      </div>
    </section>
  );
}
