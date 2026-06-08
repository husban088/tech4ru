"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PanelSidebar from "./PanelSidebar";
import "./panel-navbar.css";

interface PanelNavbarProps {
  signupCount?: number;
  signinCount?: number;
  contactCount?: number;
  cartCount?: number;
  productCount?: number;
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
    add: true,
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
    label: "Sale",
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

function PanelLink({
  href,
  label,
  icon,
  add,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  add?: boolean;
  isActive: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = href;
  };

  return (
    <a
      href={href}
      className={`pn-link${add ? " pn-link--add" : ""}${isActive ? " active" : ""}`}
      onClick={handleClick}
    >
      {icon}
      {label}
    </a>
  );
}

export default function PanelNavbar({
  signupCount = 0,
  contactCount = 0,
  cartCount = 0,
  productCount = 0,
}: PanelNavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) || false;
  };

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  // Server-side fallback — sirf logo dikhao
  if (!mounted) {
    return (
      <nav className="pn-nav">
        <div className="pn-inner">
          <div className="pn-logo">
            <div className="pn-logo-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>
            <div className="pn-logo-text">
              <span className="pn-logo-title">TECH4U</span>
              <span className="pn-logo-sub">Admin Panel</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ✅ FIXED: No isAuthorized check here — layout.tsx already handles auth
  // Navbar hamesha render hoga agar mounted hai — layout ne already verify kar diya hai
  return (
    <>
      <nav className={`pn-nav${scrolled ? " scrolled" : ""}`}>
        <div className="pn-inner">
          {/* Mobile Menu Button */}
          <button
            className="pn-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <line x1="3" y1="7" x2="21" y2="7" strokeLinecap="round" />
              <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
              <line x1="3" y1="17" x2="21" y2="17" strokeLinecap="round" />
            </svg>
          </button>

          {/* Logo */}
          <a
            href="/"
            className="pn-logo"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/";
            }}
          >
            <div className="pn-logo-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>
            <div className="pn-logo-text">
              <span className="pn-logo-title">TECH4U</span>
              <span className="pn-logo-sub">Admin Panel</span>
            </div>
          </a>

          {/* Desktop Links */}
          <ul
            className="pn-links"
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            {panelLinks.map((link) => (
              <li key={link.href}>
                <PanelLink
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  add={link.add}
                  isActive={isActive(link.href, link.exact ?? false)}
                />
              </li>
            ))}
          </ul>

          {/* Right Actions */}
          <div className="pn-actions">
            <div className="pn-icon-btn" title="Total Products">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                <path d="M16 3H8l-2 4h12l-2-4z" />
              </svg>
              {productCount > 0 && (
                <span className="pn-badge">{productCount}</span>
              )}
            </div>

            <div className="pn-icon-btn" title="Cart Orders">
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
              {cartCount > 0 && <span className="pn-badge">{cartCount}</span>}
            </div>

            <div className="pn-divider" />

            <div className="pn-admin-badge">
              <span className="pn-admin-dot" />
              <span className="pn-admin-label">Admin</span>
            </div>

            <button
              className="pn-icon-btn pn-signout-btn"
              title="Sign Out"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {signingOut && <span className="pn-signout-spinner" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <PanelSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  );
}
