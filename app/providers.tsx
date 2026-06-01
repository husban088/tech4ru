// app/providers.tsx
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
import { useEffect, useState, useRef, useCallback } from "react";
import Footer from "./components/Footer";
import SaleBannerPopup from "./components/SaleBannerPopup";
import { initSaleStore } from "@/lib/saleStore";

// ✅ PERF: Debounce helper — ResizeObserver ko throttle karo
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

function AppShell({
  children,
}: {
  children: React.ReactNode;
  shellKey: number;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [stickyHeight, setStickyHeight] = useState(0);
  const pathname = usePathname();
  const { fetchCart, setOnCartOpen } = useCartStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cartInitialized = useRef(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    initSaleStore();
  }, []);

  useEffect(() => {
    const { fetchCouponSettings } = useCouponStore.getState();
    fetchCouponSettings();
  }, []);

  // ✅ PERF: Debounced measure — resize pe har frame mein recalc nahi hoga
  const measure = useCallback(
    debounce(() => {
      if (wrapperRef.current) {
        const h = wrapperRef.current.offsetHeight;
        if (h > 0) setStickyHeight(h);
      }
    }, 100), // 100ms debounce — enough for smooth resize
    [],
  );

  useEffect(() => {
    if (!isClient) return;
    measure();

    if (observerRef.current) observerRef.current.disconnect();

    // ✅ PERF: ResizeObserver with debounced callback
    observerRef.current = new ResizeObserver(measure);
    if (wrapperRef.current) observerRef.current.observe(wrapperRef.current);

    // ✅ PERF: passive: true — scroll/resize listeners main thread block nahi karenge
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isClient, measure]);

  // ✅ PERF: Scroll to top on route change — requestAnimationFrame use karo
  useEffect(() => {
    // ✅ rAF — browser next paint se pehle smoothly scroll karega
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }, [pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
  }, [pathname]);

  const isPanelPage = pathname?.startsWith("/panel") ?? false;
  const isHomePage = pathname === "/";

  useEffect(() => {
    if (!isClient) return;
    if (cartInitialized.current) return;
    cartInitialized.current = true;
    setOnCartOpen(() => setCartOpen(true));
    const { initialized } = useCartStore.getState();
    if (!initialized) fetchCart();
  }, [isClient, setOnCartOpen, fetchCart]);

  const contentPaddingTop = isPanelPage
    ? undefined
    : {
        paddingTop:
          stickyHeight > 0 ? stickyHeight : "var(--navbar-height, 64px)",
      };

  return (
    <>
      {isClient && isHomePage && <SaleBannerPopup />}

      {!isPanelPage && (
        <div ref={wrapperRef} className="navbar-sticky-wrapper">
          <AnnouncementBar />
          <Navbar
            onMenuOpen={() => setSidebarOpen(true)}
            onSearchOpen={() => setSearchOpen(true)}
            onCartOpen={() => setCartOpen(true)}
          />
        </div>
      )}

      {isClient && (
        <>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <SearchSidebar
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
          />
          <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
        </>
      )}

      <div className="flex flex-col flex-1" style={contentPaddingTop}>
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

export default function Providers({ children }: { children: React.ReactNode }) {
  const [shellKey] = useState(0);

  useEffect(() => {
    /*
     * ✅ PERF FIX: Back/forward navigation handling
     *
     * PEHLE KI PROBLEM:
     * - window.location.reload() on visibilitychange + focus + popstate
     * - Yeh bahut aggressive tha — normal tab switch pe bhi reload ho jaata
     * - Har reload pe Supabase calls restart — slow + expensive
     *
     * NAYA APPROACH:
     * - Sirf pageshow(persisted=true) pe reload karo — yeh exact bfcache restore hai
     * - popstate pe reload NAHI karo — Next.js apna routing handle karta hai
     * - visibilitychange pe reload NAHI karo — tab switch pe reload annoying hai
     *
     * RESULT: Back/forward pe ek baar reload, warna zero unnecessary reloads
     */

    let lastReloadTime = 0;
    const RELOAD_COOLDOWN = 5000;

    function handlePageShow(e: PageTransitionEvent) {
      // ✅ Sirf actual bfcache restore pe reload karo
      if (!e.persisted) return;

      const now = Date.now();
      if (now - lastReloadTime < RELOAD_COOLDOWN) return;

      lastReloadTime = now;
      window.location.reload();
    }

    // ✅ PERF: Sirf pageshow — baaki sab event listeners HATA diye
    // visibilitychange aur focus pe reload = unnecessary jank
    // popstate pe reload = Next.js routing tod deta tha
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <AppShell key={shellKey} shellKey={shellKey}>
      {children}
    </AppShell>
  );
}
