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
// memo() prevents re-render when sidebar/cart state changes
// ─────────────────────────────────────────────────────────────────────────────
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

  // Start at CSS var value (70px) — prevents height jump on mount
  const [navbarHeight, setNavbarHeight] = useState(70);

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
  // rAF debounce — fires max once per frame, not per pixel of resize
  // CSS var --navbar-height used as fallback (set in globals.css) so
  // initial render never needs a JS measurement
  useEffect(() => {
    if (!isClient || !wrapperRef.current) return;
    let rafId: number;
    let lastH = 0;

    const updateHeight = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!wrapperRef.current) return;
        const h = wrapperRef.current.offsetHeight;
        // Only update state if height ACTUALLY changed — prevents cascade re-renders
        if (h > 0 && h !== lastH) {
          lastH = h;
          setNavbarHeight(h);
          // Also update CSS var so child components can read it without JS
          document.documentElement.style.setProperty(
            "--navbar-height",
            `${h}px`,
          );
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
    // Batch all state updates in one tick — React 18 auto-batches these
    setSidebarOpen(false);
    setSearchOpen(false);
    setCartOpen(false);

    // Use native scroll — fastest path, no React involvement
    if ("scrollBehavior" in document.documentElement.style) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
    } else {
      window.scrollTo(0, 0);
    }
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

  const contentStyle = isPanelPage ? undefined : { paddingTop: navbarHeight };

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

      <div className="flex flex-col flex-1" style={contentStyle}>
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
  // FIX: BFCache handler — only refresh cart/coupon state, NOT full page reload.
  // window.location.reload() was killing performance — browser has to re-fetch
  // everything, re-run all JS, re-paint. Instead we just re-sync the stores
  // that actually need fresh data (cart count, coupon validity).
  // This gives the "fresh state" you need without the reload jank.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      // Page was restored from BFCache — just re-sync stores, don't reload
      const { initialized, fetchCart } = useCartStore.getState();
      if (initialized) {
        // Re-fetch cart silently in background — no reload, no jank
        fetchCart().catch(() => {
          // If fetch fails (offline etc.) — silently ignore, stale cart is fine
        });
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
