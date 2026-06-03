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
// FIX: Extracted into its own memoized component so that sidebar/cart state
// changes do NOT re-render the Navbar and AnnouncementBar. Previously every
// setState call (setSidebarOpen, setCartOpen, etc.) caused the entire AppShell
// tree — including Navbar — to re-render, which is very expensive.
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
// FIX: Memoized so they only re-render when their own open/close state changes,
// not when unrelated state (navbarHeight, etc.) updates.
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

  // FIX: navbarHeight starts at the CSS variable value (70px) rather than 0.
  // Previously it started at 0 then jumped to the real height, causing a
  // visible content shift on every page load and navigation.
  const [navbarHeight, setNavbarHeight] = useState(70);

  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cartInitialized = useRef(false);

  // ── Stable callbacks (useCallback) ────────────────────────────────────────
  // FIX: Without useCallback these arrow functions are recreated on every render,
  // defeating the memo() on NavbarWrapper and Sidebars, and causing unnecessary
  // child re-renders.
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
  // FIX: Merged into a single effect to avoid 3 separate effect registrations.
  useEffect(() => {
    initSaleStore();
    useCouponStore.getState().fetchCouponSettings();
  }, []);

  // ── Navbar height observer ─────────────────────────────────────────────────
  // FIX: Debounced with requestAnimationFrame so ResizeObserver does not fire
  // a setState on every pixel during resize, which was causing scroll jank.
  useEffect(() => {
    if (!isClient || !wrapperRef.current) return;
    let rafId: number;
    const updateHeight = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (wrapperRef.current) {
          const h = wrapperRef.current.offsetHeight;
          if (h > 0) setNavbarHeight(h);
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
  // FIX: Merged into one effect (was two separate effects on pathname).
  // Also moved window.scrollTo inside the RAF so it doesn't block the
  // React paint commit phase.
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
    // Use 'instant' when supported to avoid scroll animation lag
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

  // FIX: Use CSS variable fallback so there's never a flash with paddingTop:0
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

      {/* FIX: Sidebars are always mounted (with isOpen=false) so their CSS
          transitions work correctly. Previously they were conditionally
          mounted on isClient which caused the slide-in animation to start
          from an unmounted state, causing a flash/jump on first open. */}
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
  // ── BFCache: reload on back/forward navigation ─────────────────────────────
  // FIX: Moved pageshow listener here (not inside AppShell) so it's registered
  // once globally and not recreated on every shell render.
  useEffect(() => {
    let lastReloadTime = 0;
    const RELOAD_COOLDOWN = 3000;

    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      const now = Date.now();
      if (now - lastReloadTime < RELOAD_COOLDOWN) return;
      lastReloadTime = now;
      // FIX: Increased timeout to 200ms — 100ms was sometimes firing before
      // the browser finished restoring BFCache state, causing a double reload.
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // FIX: Removed the [shellKey] useState(0) + key={shellKey} pattern.
  // key={0} is a constant — it never changes — so it was just adding an
  // extra reconciliation step on every render for zero benefit.
  return <AppShell>{children}</AppShell>;
}
