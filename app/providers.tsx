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
import { useEffect, useState, useRef } from "react";
import Footer from "./components/Footer";
import SaleBannerPopup from "./components/SaleBannerPopup";
import { initSaleStore } from "@/lib/saleStore";

function AppShell({
  children,
  shellKey,
}: {
  children: React.ReactNode;
  shellKey: number;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const pathname = usePathname();
  const { fetchCart, setOnCartOpen } = useCartStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cartInitialized = useRef(false);

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

  useEffect(() => {
    if (!isClient || !wrapperRef.current) return;
    const updateHeight = () => {
      if (wrapperRef.current) {
        const h = wrapperRef.current.offsetHeight;
        if (h > 0) setNavbarHeight(h);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [isClient]);

  useEffect(() => {
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
        paddingTop: navbarHeight > 0 ? navbarHeight : 120,
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
    let lastReloadTime = 0;
    const RELOAD_COOLDOWN = 3000;
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      const now = Date.now();
      if (now - lastReloadTime < RELOAD_COOLDOWN) return;
      lastReloadTime = now;
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
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
