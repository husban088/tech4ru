"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "./panel-sidebar.css";

interface PanelSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const panelLinks = [
  {
    href: "/panel",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/panel/add-product",
    label: "Add Product",
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/panel/orders",
    label: "Orders",
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path d="M16 3H8l-2 4h12l-2-4z" />
        <line x1="3" y1="11" x2="21" y2="11" />
      </svg>
    ),
  },
  {
    href: "/panel/sale",
    label: "Sale Settings",
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href: "/panel/coupons",
    label: "Coupons",
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M20 12V8H4v4M12 4v4M8 8h8M20 12v4H4v-4M8 16h8" />
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M9 8h6M9 16h6" />
      </svg>
    ),
  },
];

export default function PanelSidebar({ isOpen, onClose }: PanelSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) || false;
  };

  const handleNavigate = (href: string) => {
    window.location.href = href;
    onClose();
  };

  // Close sidebar on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="ps-overlay" onClick={onClose} />

      {/* Sidebar */}
      <div className="ps-sidebar">
        <div className="ps-header">
          <div className="ps-logo">
            <div className="ps-logo-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>
            <div className="ps-logo-text">
              <span className="ps-logo-title">TECH4U</span>
              <span className="ps-logo-sub">Admin Panel</span>
            </div>
          </div>
          <button
            className="ps-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="ps-nav">
          <p className="ps-nav-label">Menu</p>
          <ul className="ps-nav-list">
            {panelLinks.map((link) => (
              <li key={link.href}>
                <button
                  className={`ps-nav-link ${isActive(link.href, link.exact) ? "active" : ""}`}
                  onClick={() => handleNavigate(link.href)}
                >
                  <span className="ps-nav-icon">{link.icon}</span>
                  <span className="ps-nav-text">{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ps-footer">
          <p className="ps-footer-text">© 2026 Tech4U Admin</p>
        </div>
      </div>
    </>
  );
}
