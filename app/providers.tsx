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
// memo() prevents re-render when sidebar/cart state changes — Navbar is expensive
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
// memo() prevents re-render when navbar height or unrelated state changes
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Stable callbacks — required for memo() to work on children ────────────
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

  // ── One-time store initialisations ────────────────────────────────────────
  useEffect(() => {
    initSaleStore();
    useCouponStore.getState().fetchCouponSettings();
  }, []);

  // ── Navbar height observer ─────────────────────────────────────────────────
  // FIX: rAF debounce — ResizeObserver fires many times per second during resize.
  // Without debounce, every pixel of resize causes a setState + re-render,
  // which causes scroll jank because the main thread is busy.
  useEffect(() => {
    if (!isClient || !wrapperRef.current) return;
    let rafId: number;

    const updateHeight = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (wrapperRef.current) {
          const h = wrapperRef.current.offsetHeight;
          // FIX: Only setState if height actually changed — avoids pointless renders
          if (h > 0) setNavbarHeight((prev) => (prev === h ? prev : h));
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

  // ── Scroll-to-top & panel close on route change ───────────────────────────
  // FIX: 'instant' scroll behavior avoids scroll animation competing with
  // React's route transition render — was a major source of jank on navigation
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
    setCartOpen(false);

    const supportsScrollBehavior =
      "scrollBehavior" in document.documentElement.style;
    if (supportsScrollBehavior) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } else {
      requestAnimationFrame(() => window.scrollTo(0, 0));
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

      {/* FIX: Always mounted (isOpen=false) so CSS transitions work correctly.
          Conditional mounting causes first-open flash because transition
          starts from unmounted (display:none) state. */}
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
  // FIX: BFCache handler at top level — registered once, not per shell render
  useEffect(() => {
    let lastReloadTime = 0;
    const RELOAD_COOLDOWN = 3000;

    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      const now = Date.now();
      if (now - lastReloadTime < RELOAD_COOLDOWN) return;
      lastReloadTime = now;
      // 200ms gives browser time to finish restoring BFCache state
      setTimeout(() => window.location.reload(), 200);
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return <AppShell>{children}</AppShell>;
}
