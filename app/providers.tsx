"use client";

import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/cartStore";
import { useCouponStore } from "@/lib/couponStore";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import AnnouncementBar from "./components/AnnouncementBar";
import SearchSidebar from "./components/SearchSidebar";
import CartSidebar from "./components/CartSidebar";
import WhatsAppWidget from "./components/WhatsAppWidget";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import Footer from "./components/Footer";
import SaleBannerPopup from "./components/SaleBannerPopup";
import { initSaleStore } from "@/lib/saleStore";

// ─── NavbarWrapper ────────────────────────────────────────────────────────────
const NavbarWrapper = memo(function NavbarWrapper({
  wrapperRef,
  onMenuOpen,
  onSearchOpen,
  onCartOpen,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onMenuOpen: () => void;
  onSearchOpen: () => void;
  onCartOpen: () => void;
}) {
  return (
    <div ref={wrapperRef} className="navbar-sticky-wrapper">
      <AnnouncementBar />
      <Navbar
        onMenuOpen={onMenuOpen}
        onSearchOpen={onSearchOpen}
        onCartOpen={onCartOpen}
      />
    </div>
  );
});

// ─── Sidebars ─────────────────────────────────────────────────────────────────
const Sidebars = memo(function Sidebars({
  sidebarOpen,
  searchOpen,
  cartOpen,
  onCloseSidebar,
  onCloseSearch,
  onCloseCart,
}: {
  sidebarOpen: boolean;
  searchOpen: boolean;
  cartOpen: boolean;
  onCloseSidebar: () => void;
  onCloseSearch: () => void;
  onCloseCart: () => void;
}) {
  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={onCloseSidebar} />
      <SearchSidebar isOpen={searchOpen} onClose={onCloseSearch} />
      <CartSidebar isOpen={cartOpen} onClose={onCloseCart} />
    </>
  );
});

// ─── AppShell ─────────────────────────────────────────────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cartInitialized = useRef(false);

  // ── Stable callbacks ────────────────────────────────────────────────────────
  const { fetchCart, setOnCartOpen } = useCartStore();
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  // ── Hydration flag ─────────────────────────────────────────────────────────
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ── One-time store initialisations ─────────────────────────────────────────
  useEffect(() => {
    initSaleStore();
    useCouponStore.getState().fetchCouponSettings();
  }, []);

  // ── Navbar height observer ──────────────────────────────────────────────────
  // FIX: CSS var ONLY — no React state, no re-render on resize.
  // Setting React state (setNavbarHeight) on every resize was causing
  // the ENTIRE AppShell to re-render mid-scroll = main thread block = jank.
  // Now we only write to a CSS variable — zero React involvement.
  // The content div reads --navbar-height via inline style (set once on mount).
  useEffect(() => {
    if (!isClient || !wrapperRef.current) return;
    let rafId: number;
    let lastH = 0;

    const updateHeight = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!wrapperRef.current) return;
        const h = wrapperRef.current.offsetHeight;
        if (h > 0 && h !== lastH) {
          lastH = h;
          // Only update CSS var — no setState, no re-render
          document.documentElement.style.setProperty(
            "--navbar-height",
            `${h}px`,
          );
          // Also update the content wrapper padding directly via DOM
          // to avoid React re-render
          const contentEl = document.getElementById("app-content");
          if (contentEl) {
            contentEl.style.paddingTop = `${h}px`;
          }
        }
      });
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(wrapperRef.current);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [isClient]);

  // ── Scroll-to-top & panel close on route change ────────────────────────────
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
    setCartOpen(false);

    // FIX: Use scrollTo with instant behavior — no smooth scroll jank
    // behavior:'instant' is the fastest path, avoids animation frame queue
    window.scrollTo(0, 0);
  }, [pathname]);

  const isPanelPage = pathname?.startsWith("/panel") ?? false;
  const isHomePage = pathname === "/";

  // ── Cart initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isClient || cartInitialized.current) return;
    cartInitialized.current = true;
    setOnCartOpen(() => setCartOpen(true));
    const { initialized } = useCartStore.getState();
    if (!initialized) fetchCart();
  }, [isClient, setOnCartOpen, fetchCart]);

  return (
    <>
      {isClient && isHomePage && <SaleBannerPopup />}

      {!isPanelPage && (
        <NavbarWrapper
          wrapperRef={wrapperRef}
          onMenuOpen={openSidebar}
          onSearchOpen={openSearch}
          onCartOpen={openCart}
        />
      )}

      {/* Always mounted (isOpen=false) so CSS transitions work — no flash */}
      {isClient && (
        <Sidebars
          sidebarOpen={sidebarOpen}
          searchOpen={searchOpen}
          cartOpen={cartOpen}
          onCloseSidebar={closeSidebar}
          onCloseSearch={closeSearch}
          onCloseCart={closeCart}
        />
      )}

      {/* FIX: id="app-content" — ResizeObserver updates padding directly
          via DOM, no React state/re-render needed.
          Initial paddingTop uses CSS var (set in globals.css = 70px)
          so no flash on first paint. */}
      <div
        id="app-content"
        className="flex flex-col flex-1"
        style={
          isPanelPage ? undefined : { paddingTop: "var(--navbar-height, 70px)" }
        }
      >
        {children}
      </div>

      {!isPanelPage && (
        <>
          <Footer />
          {isClient && <WhatsAppWidget />}
        </>
      )}
    </>
  );
}

// ─── Providers ────────────────────────────────────────────────────────────────
export default function Providers({ children }: { children: React.ReactNode }) {
  // FIX: BFCache handler — re-sync stores only, no reload
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      const { initialized, fetchCart } = useCartStore.getState();
      if (initialized) {
        fetchCart().catch(() => {});
      }
      useCouponStore
        .getState()
        .fetchCouponSettings()
        .catch(() => {});
    }

    window.addEventListener("pageshow", handlePageShow, { passive: true });
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return <AppShell>{children}</AppShell>;
}
