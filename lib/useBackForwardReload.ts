// lib/useBackForwardReload.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * ✅ Chrome back/forward navigation ko force reload karta hai
 * Hydration error nahi aata — page fully reload hota hai
 */
export function useBackForwardReload() {
  const router = useRouter();

  useEffect(() => {
    // Track if this is a back/forward navigation
    let isBackForward = false;

    // Listen for beforeunload to detect back/forward
    const handleBeforeUnload = () => {
      isBackForward = false;
    };

    // Listen for pageshow event (fires when page comes from bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      // persisted = true means page came from bfcache (back/forward navigation)
      if (event.persisted) {
        isBackForward = true;
        // Force reload the page to get fresh data
        window.location.reload();
      }
    };

    // Listen for popstate (back/forward navigation in SPA mode)
    const handlePopState = () => {
      // Small delay to check if page changed
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const previousPath = sessionStorage.getItem("lastPath");

        if (previousPath && previousPath !== currentPath) {
          // Path changed via back/forward — force reload
          sessionStorage.setItem("lastPath", currentPath);
          window.location.reload();
        } else {
          sessionStorage.setItem("lastPath", currentPath);
        }
      }, 10);
    };

    // Store initial path
    sessionStorage.setItem("lastPath", window.location.pathname);

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);
}
