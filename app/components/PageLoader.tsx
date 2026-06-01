"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import "./PageLoader.css";

export default function PageLoader() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  const hasShownLoader = useRef(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Mark client-side after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Animate progress bar
  useEffect(() => {
    if (!loading) return;

    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const increment = Math.random() * 12 + 3;
        return Math.min(prev + increment, 95);
      });
    }, 150);

    animationRef.current = interval;

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [loading]);

  // Handle loader visibility based on pathname and page reload
  useEffect(() => {
    if (!isClient) return;

    const isHomePage = pathname === "/";

    // Check if this is a page reload
    let isReload = false;
    try {
      const navigationEntry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      isReload = navigationEntry?.type === "reload";
    } catch (e) {
      // Fallback - check if performance.navigation exists (deprecated but works)
      if (
        typeof performance !== "undefined" &&
        (performance as any).navigation
      ) {
        isReload = (performance as any).navigation.type === 1;
      }
    }

    // Show loader only on home page reloads
    if (isHomePage && isReload && !hasShownLoader.current) {
      hasShownLoader.current = true;
      setLoading(true);
      setProgress(0);

      // Complete the loader animation
      const timer = setTimeout(() => {
        setProgress(100);
        // Hide loader after completion
        setTimeout(() => {
          setLoading(false);
          hasShownLoader.current = false;
        }, 500);
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }
  }, [pathname, isClient]);

  // Don't render anything on server to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  if (!loading) return null;

  // Format progress percentage
  const displayProgress = Math.min(Math.floor(progress), 100);

  return (
    <div className="page-loader" suppressHydrationWarning>
      <div className="loader-backdrop" suppressHydrationWarning />

      {/* Grain Texture */}
      <div className="loader-grain" suppressHydrationWarning />

      {/* Gold Ambient Glow */}
      <div className="loader-ambient" suppressHydrationWarning />

      {/* Main Loader Container */}
      <div className="loader-container" suppressHydrationWarning>
        {/* Rotating Rings */}
        <div className="loader-rings" suppressHydrationWarning>
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
          <div className="ring ring-4" />
        </div>

        {/* Logo Text */}
        <div className="loader-logo" suppressHydrationWarning>
          <span className="logo-techs">TECH</span>
          <span className="logo-fours">4U</span>
          <div className="logo-luxury-line">
            <span className="luxury-line" />
          </div>
        </div>

        {/* Loading Bar */}
        <div className="loader-bar-wrapper" suppressHydrationWarning>
          <div
            className="loader-bar"
            style={{ width: `${displayProgress}%` }}
            suppressHydrationWarning
          />
        </div>

        {/* Loading Percentage */}
        <div className="loader-percentage" suppressHydrationWarning>
          <span className="percent-number">{displayProgress}</span>
          <span className="percent-sign">%</span>
        </div>

        {/* Loading Text */}
        <p className="loader-text" suppressHydrationWarning>
          Loading Experience
        </p>
      </div>

      {/* Decorative Corners */}
      <div className="loader-corner corner-tl" suppressHydrationWarning />
      <div className="loader-corner corner-tr" suppressHydrationWarning />
      <div className="loader-corner corner-bl" suppressHydrationWarning />
      <div className="loader-corner corner-br" suppressHydrationWarning />
    </div>
  );
}
