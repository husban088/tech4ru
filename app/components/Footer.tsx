"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaTwitter,
  FaYoutube,
  FaPinterestP,
  FaLinkedinIn,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaPaypal,
  FaApple,
  FaGoogle,
} from "react-icons/fa";
import {
  MdKeyboardArrowRight,
  MdSend,
  MdCheckCircle,
  MdExpandLess,
  MdVibration,
  MdHome,
  MdSupportAgent,
  MdBusinessCenter,
  MdGavel,
  MdLocalShipping,
} from "react-icons/md";
import { GiCarKey, GiWatch, GiLaurelCrown } from "react-icons/gi";
import "./footer.css";

// ─── Pre-computed static particle positions ───────────────────────────────────
const PARTICLES = [
  { left: "5%", delay: "0s", duration: "8s" },
  { left: "12%", delay: "1.2s", duration: "12s" },
  { left: "20%", delay: "0.4s", duration: "6s" },
  { left: "27%", delay: "3.1s", duration: "9s" },
  { left: "34%", delay: "1.7s", duration: "7s" },
  { left: "41%", delay: "0.9s", duration: "11s" },
  { left: "48%", delay: "2.3s", duration: "8s" },
  { left: "55%", delay: "4.0s", duration: "10s" },
  { left: "62%", delay: "0.5s", duration: "6s" },
  { left: "69%", delay: "1.8s", duration: "13s" },
  { left: "74%", delay: "3.6s", duration: "7s" },
  { left: "79%", delay: "0.2s", duration: "9s" },
  { left: "83%", delay: "2.9s", duration: "11s" },
  { left: "87%", delay: "1.1s", duration: "8s" },
  { left: "90%", delay: "0.7s", duration: "6s" },
  { left: "93%", delay: "4.4s", duration: "14s" },
  { left: "7%", delay: "3.3s", duration: "10s" },
  { left: "15%", delay: "2.0s", duration: "7s" },
  { left: "58%", delay: "1.5s", duration: "9s" },
  { left: "96%", delay: "0.3s", duration: "12s" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [currentYear, setCurrentYear] = useState(2026);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { language, isRTLMode } = useLanguage();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    const footer = document.querySelector(".footer");
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const footerLinks = {
    pages: [
      { name: "Home", href: "/", icon: <MdHome /> },
      { name: "Accessories", href: "/accessories", icon: <MdVibration /> },
      { name: "Watches", href: "/watches", icon: <GiWatch /> },
      { name: "Automotive", href: "/automotive", icon: <GiCarKey /> },
      { name: "Home Decor", href: "/home-decor", icon: <MdHome /> },
      { name: "About Us", href: "/about", icon: <MdBusinessCenter /> },
      { name: "Contact", href: "/contact", icon: <MdSupportAgent /> },
    ],
    company: [
      { name: "About Us", href: "/about", icon: <MdBusinessCenter /> },
      { name: "Privacy Policy", href: "/privacy", icon: <MdGavel /> },
      { name: "Terms of Service", href: "/terms", icon: <MdGavel /> },
      {
        name: "Track Your Order",
        href: "/track-order",
        icon: <MdLocalShipping />,
      },
    ],
  };

  const socialLinks = [
    {
      name: "Facebook",
      icon: <FaFacebookF />,
      href: "https://www.facebook.com/share/17a6uqbE89/",
      gradient: "linear-gradient(135deg, #1877F2, #0d5bb5)",
    },
    {
      name: "Instagram",
      icon: <FaInstagram />,
      href: "https://www.instagram.com/tech4ruu?igsh=NjRrZGl5dTd6cDNk",
      gradient: "linear-gradient(135deg, #f09433, #d62976, #962fbf)",
    },
    {
      name: "TikTok",
      icon: <FaTiktok />,
      href: "https://www.tiktok.com/@tech4ru?lang=en-GB",
      gradient: "linear-gradient(135deg, #00f2ea, #ff0050)",
    },
    {
      name: "Twitter",
      icon: <FaTwitter />,
      href: "https://twitter.com/tech4u",
      gradient: "linear-gradient(135deg, #1DA1F2, #0d8bec)",
    },
    {
      name: "YouTube",
      icon: <FaYoutube />,
      href: "https://youtube.com/tech4u",
      gradient: "linear-gradient(135deg, #FF0000, #cc0000)",
    },
    {
      name: "Pinterest",
      icon: <FaPinterestP />,
      href: "https://pinterest.com/tech4u",
      gradient: "linear-gradient(135deg, #BD081C, #8a0613)",
    },
    {
      name: "LinkedIn",
      icon: <FaLinkedinIn />,
      href: "https://linkedin.com/company/tech4u",
      gradient: "linear-gradient(135deg, #0A66C2, #074a8a)",
    },
  ];

  const paymentMethods = [
    { name: "Visa", icon: <FaCcVisa /> },
    { name: "Mastercard", icon: <FaCcMastercard /> },
    { name: "American Express", icon: <FaCcAmex /> },
    { name: "PayPal", icon: <FaPaypal /> },
    { name: "Apple Pay", icon: <FaApple /> },
    { name: "Google Pay", icon: <FaGoogle /> },
  ];

  const categories = [
    { id: "pages", title: "Quick Links", icon: <MdHome /> },
    { id: "company", title: "Company", icon: <MdBusinessCenter /> },
  ];

  const features = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      title: "Free Delivery",
      subtitle: "For all orders",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "24/7 Help Center",
      subtitle: "Dedicated 24/7 support",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
        </svg>
      ),
      title: "Satisfied or Refunded",
      subtitle: "Free returns within 14 days",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "100% Secure Payments",
      subtitle: "Accept all payment methods",
    },
  ];

  const contactInfo = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: "Email Us",
      value: "info@tech4ru.com",
      href: "mailto:info@tech4ru.com",
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: "Our Location",
      value: "Adelaide, Australia",
      href: null,
    },
  ];

  return (
    <footer className="footer" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="footer-features">
        <div className="footer-features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="footer-feature-card">
              <div className="footer-feature-icon-wrap">
                <div className="footer-feature-icon-glow" />
                {feature.icon}
              </div>
              <div className="footer-feature-text">
                <span className="footer-feature-title">{feature.title}</span>
                <span className="footer-feature-subtitle">
                  {feature.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="footer-glass-overlay" />
      <div className="footer-particles">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="footer-particle"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div className="footer-gold-line">
        <div className="footer-gold-shine" />
      </div>

      <div className={`footer-container ${isVisible ? "visible" : ""}`}>
        <div className="footer-brand">
          <div className="footer-logo-wrapper">
            <Link href="/" className="footer-logo-3d">
              {/* Premium Text Logo - TECH4U */}
              <div className="footer-text-logo">
                <span className="footer-logo-tech">TECH</span>
                <span className="footer-logo-four">4</span>
                <span className="footer-logo-u">U</span>
              </div>
            </Link>
            <div className="footer-logo-gold-ring">
              <GiLaurelCrown />
            </div>
          </div>
          <p className="footer-tagline">
            <span className="tagline-gold">✦</span> WHERE INNOVATION MEETS
            ELEGANCE <span className="tagline-gold">✦</span>
          </p>
          <p className="footer-description">
            Curating the finest in watches, automotive elegance, home decor, and
            tech accessories for those who demand nothing but the extraordinary.
            <span className="footer-description-glow">EST. 2026</span>
          </p>
          <div className="footer-social">
            {socialLinks.map((social, index) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label={social.name}
                style={{
                  animationDelay: `${index * 0.05}s`,
                  background: social.gradient,
                }}
              >
                <span className="footer-social-icon">{social.icon}</span>
                <div className="footer-social-ripple" />
                <span className="footer-social-tooltip">{social.name}</span>
              </a>
            ))}
          </div>
          <div className="footer-contact-section">
            <div className="footer-contact-list">
              {contactInfo.map((item, idx) => (
                <div key={idx} className="footer-contact-item">
                  <div className="footer-contact-icon">{item.icon}</div>
                  <div className="footer-contact-text">
                    <span className="footer-contact-label">{item.label}</span>
                    {item.href ? (
                      <a href={item.href} className="footer-contact-value">
                        {item.value}
                      </a>
                    ) : (
                      <span className="footer-contact-value">{item.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-right-section">
          <div className="footer-links-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`footer-links-column ${hoveredColumn === category.id ? "hovered" : ""}`}
                onMouseEnter={() => setHoveredColumn(category.id)}
                onMouseLeave={() => setHoveredColumn(null)}
                onClick={() =>
                  setActiveCategory(
                    activeCategory === category.id ? null : category.id,
                  )
                }
              >
                <div className="footer-links-header">
                  <div className="footer-links-icon">{category.icon}</div>
                  <h4 className="footer-links-title">
                    {category.title}
                    <div className="footer-links-gold-dot" />
                  </h4>
                  <button className="footer-links-mobile-toggle">
                    <MdKeyboardArrowRight
                      className={
                        activeCategory === category.id ? "rotated" : ""
                      }
                    />
                  </button>
                </div>
                <ul
                  className={`footer-links-list ${activeCategory === category.id ? "active" : ""}`}
                >
                  {footerLinks[category.id as keyof typeof footerLinks].map(
                    (link, idx) => (
                      <li
                        key={link.name}
                        className="footer-link-item"
                        style={{ animationDelay: `${idx * 0.03}s` }}
                      >
                        <Link href={link.href} className="footer-link">
                          <span className="footer-link-icon-wrapper">
                            <span className="footer-link-icon">
                              {link.icon}
                            </span>
                          </span>
                          <span className="footer-link-text">{link.name}</span>
                          <span className="footer-link-arrow">
                            <MdKeyboardArrowRight />
                          </span>
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>

          <div className="footer-newsletter-wrapper">
            <div className="footer-newsletter">
              <div className="footer-newsletter-header">
                <div className="newsletter-glow" />
                <p className="footer-newsletter-title">Join the Inner Circle</p>
                <span className="newsletter-badge">VIP</span>
              </div>
              <p className="footer-newsletter-sub">
                Receive exclusive offers, early access, and curated luxury
                drops.
              </p>
              <form
                className="footer-newsletter-form"
                onSubmit={handleSubscribe}
              >
                <div className="footer-input-wrapper">
                  <input
                    type="email"
                    className="footer-newsletter-input"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="footer-newsletter-btn">
                    <span>Subscribe</span>
                    <MdSend />
                  </button>
                </div>
              </form>
              {subscribed && (
                <div className="footer-subscribe-success">
                  <MdCheckCircle />
                  <span>Welcome to the Inner Circle!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <div className="footer-payment">
            <span className="payment-label">Secure Payments</span>
            <div className="payment-icons">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="footer-payment-icon"
                  title={method.name}
                >
                  <div className="payment-card-front">{method.icon}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="footer-copyright">
            <div className="copyright-gold-line" />
            <p>
              © {currentYear}{" "}
              <span className="footer-copyright-brand">TECH4U</span>{" "}
              <span className="copyright-separator">◆</span> LUXURY IN EVERY
              DETAIL <span className="copyright-separator">◆</span> All rights
              reserved.
            </p>
            <div className="copyright-gold-line right" />
          </div>
          <button
            className="footer-back-to-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
          >
            <div className="back-to-top-ring">
              <MdExpandLess />
            </div>
            <span>Back to Top</span>
            <div className="back-to-top-glow" />
          </button>
        </div>
      </div>

      <div className="footer-bottom-gold">
        <div className="gold-wave" />
      </div>
      <div className="footer-orb orb-1" />
      <div className="footer-orb orb-2" />
      <div className="footer-orb orb-3" />
    </footer>
  );
}
