"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isOwner } from "@/lib/checkOwner";

const CACHE_KEY = "panel_auth_ok";
const CACHE_TTL = 30 * 60 * 1000;

function getCachedAuth(): boolean {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const { ok, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return false;
    }
    return ok === true;
  } catch {
    return false;
  }
}

function setCachedAuth() {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ok: true, ts: Date.now() }),
    );
  } catch {}
}

function clearCachedAuth() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

// Supabase localStorage se directly session email nikalo — synchronous, instant
function getEmailFromLocalStorage(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        (key.startsWith("sb-") || key.includes("supabase")) &&
        key.endsWith("-auth-token")
      ) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const email =
          parsed?.user?.email || parsed?.currentSession?.user?.email || null;
        if (email) return email;
      }
    }
  } catch {}
  return null;
}

function isAuthorizedSync(): boolean {
  if (typeof window === "undefined") return false;
  if (getCachedAuth()) return true;
  const email = getEmailFromLocalStorage();
  if (email && isOwner(email)) {
    setCachedAuth();
    return true;
  }
  return false;
}

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bgVerifyDone = useRef(false);

  // No "loading" state — directly true ya false
  const [authorized, setAuthorized] = useState<boolean>(() =>
    isAuthorizedSync(),
  );

  useEffect(() => {
    // Already authorized — background verify karo silently
    if (authorized) {
      if (!bgVerifyDone.current) {
        bgVerifyDone.current = true;
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            if (!session?.user || !isOwner(session.user.email)) {
              clearCachedAuth();
              setAuthorized(false);
              window.location.replace(
                "/signin?redirectTo=" + encodeURIComponent(pathname),
              );
            } else {
              setCachedAuth(); // refresh timestamp
            }
          })
          .catch(() => {
            // Network error — authorized rehne do
          });
      }
      return;
    }

    // Not authorized sync — async check karo
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user && isOwner(session.user.email)) {
          setCachedAuth();
          setAuthorized(true);
        } else {
          clearCachedAuth();
          window.location.replace(
            "/signin?redirectTo=" + encodeURIComponent(pathname),
          );
        }
      })
      .catch(() => {
        window.location.replace(
          "/signin?redirectTo=" + encodeURIComponent(pathname),
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BFCache — Chrome back/forward button
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      if (isAuthorizedSync()) {
        setAuthorized(true);
      } else {
        window.location.replace(
          "/signin?redirectTo=" + encodeURIComponent(pathname),
        );
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [pathname]);

  // Authorized — foran children, zero delay, zero spinner
  if (authorized) {
    return (
      <div className="panel-content" style={{ paddingTop: "0px" }}>
        {children}
      </div>
    );
  }

  // Unauthorized — null return karo (redirect hoga turant)
  return null;
}
