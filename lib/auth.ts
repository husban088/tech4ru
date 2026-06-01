// lib/auth.ts
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════
   SESSION HOOK - For client components
═══════════════════════════════════════════ */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

/* ═══════════════════════════════════════════
   SIGN OUT FUNCTION
═══════════════════════════════════════════ */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      console.error("Sign out error:", error);
    }

    clearAuthStorage();
    clearSessionStorage();
    clearAuthCookies();

    return { success: true };
  } catch (err) {
    console.error("Sign out exception:", err);
    clearAuthStorage();
    clearSessionStorage();
    clearAuthCookies();
    return { success: false, error: "Failed to sign out" };
  }
}

/* ═══════════════════════════════════════════
   CLEAR STORAGE FUNCTIONS
═══════════════════════════════════════════ */
export function clearAuthStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.error("Error clearing localStorage:", e);
  }
}

export function clearSessionStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch (e) {
    console.error("Error clearing sessionStorage:", e);
  }
}

export function clearAuthCookies() {
  try {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name.startsWith("sb-") || name.includes("supabase")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
      }
    });
  } catch (e) {
    console.error("Error clearing cookies:", e);
  }
}

/* ═══════════════════════════════════════════
   GET CURRENT USER
═══════════════════════════════════════════ */
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/* ═══════════════════════════════════════════
   CHECK IF USER IS AUTHENTICATED
═══════════════════════════════════════════ */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    return false;
  }
}

/* ═══════════════════════════════════════════
   GET USER PROFILE
═══════════════════════════════════════════ */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/* ═══════════════════════════════════════════
   UPDATE USER PROFILE
═══════════════════════════════════════════ */
export async function updateUserProfile(userId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
}
