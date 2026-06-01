"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import "./profile.css";

type ProfileData = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
};

// Type for Supabase response
type SupabaseResponse<T> = {
  data: T | null;
  error: any;
};

const profileTranslations = {
  member: { en: "Member", ar: "عضو", de: "Mitglied" },
  status: { en: "Status", ar: "الحالة", de: "Status" },
  active: { en: "Active", ar: "نشط", de: "Aktiv" },
  joined: { en: "Joined", ar: "انضم", de: "Beigetreten" },
  updated: { en: "Updated", ar: "تم التحديث", de: "Aktualisiert" },
  signOut: { en: "Sign Out", ar: "تسجيل الخروج", de: "Abmelden" },
  yourAccount: { en: "Your Account", ar: "حسابك", de: "Ihr Konto" },
  myProfile: { en: "My", ar: "ملفي", de: "Mein" },
  profileEm: { en: "Profile", ar: "الشخصي", de: "Profil" },
  manageInfo: {
    en: "Manage your personal information",
    ar: "إدارة معلوماتك الشخصية",
    de: "Verwalten Sie Ihre persönlichen Daten",
  },
  profileInfo: {
    en: "Profile Info",
    ar: "معلومات الملف",
    de: "Profilinformationen",
  },
  security: { en: "Security", ar: "الأمان", de: "Sicherheit" },
  username: { en: "Username", ar: "اسم المستخدم", de: "Benutzername" },
  usernamePlaceholder: {
    en: "your_username",
    ar: "اسم_المستخدم",
    de: "ihr_benutzername",
  },
  emailAddress: {
    en: "Email Address",
    ar: "البريد الإلكتروني",
    de: "E-Mail-Adresse",
  },
  memberSince: { en: "Member Since", ar: "عضو منذ", de: "Mitglied seit" },
  userId: { en: "User ID", ar: "معرف المستخدم", de: "Benutzer-ID" },
  newPassword: {
    en: "New Password",
    ar: "كلمة المرور الجديدة",
    de: "Neues Passwort",
  },
  confirmPassword: {
    en: "Confirm New Password",
    ar: "تأكيد كلمة المرور الجديدة",
    de: "Neues Passwort bestätigen",
  },
  passwordPlaceholder: { en: "••••••••", ar: "••••••••", de: "••••••••" },
  saveChanges: {
    en: "Save Changes",
    ar: "حفظ التغييرات",
    de: "Änderungen speichern",
  },
  updatePassword: {
    en: "Update Password",
    ar: "تحديث كلمة المرور",
    de: "Passwort aktualisieren",
  },
  emailNote: {
    en: "Email address cannot be changed. Only username is editable.",
    ar: "لا يمكن تغيير البريد الإلكتروني. فقط اسم المستخدم قابل للتعديل.",
    de: "E-Mail-Adresse kann nicht geändert werden.",
  },
  passwordNote: {
    en: "Password must be at least 6 characters long.",
    ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
    de: "Passwort muss mindestens 6 Zeichen lang sein.",
  },
  usernameEmpty: {
    en: "Username cannot be empty.",
    ar: "اسم المستخدم لا يمكن أن يكون فارغًا.",
    de: "Benutzername darf nicht leer sein.",
  },
  usernameTaken: {
    en: "This username is already taken.",
    ar: "اسم المستخدم هذا مستخدم بالفعل.",
    de: "Dieser Benutzername ist bereits vergeben.",
  },
  updateSuccess: {
    en: "Profile updated successfully!",
    ar: "تم تحديث الملف الشخصي بنجاح!",
    de: "Profil erfolgreich aktualisiert!",
  },
  updateFailed: {
    en: "Failed to update profile.",
    ar: "فشل تحديث الملف الشخصي.",
    de: "Profilaktualisierung fehlgeschlagen.",
  },
  passwordShort: {
    en: "Password must be at least 6 characters.",
    ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
    de: "Passwort muss mindestens 6 Zeichen lang sein.",
  },
  passwordMismatch: {
    en: "Passwords do not match.",
    ar: "كلمات المرور غير متطابقة.",
    de: "Passwörter stimmen nicht überein.",
  },
  passwordChangeSuccess: {
    en: "Password changed successfully!",
    ar: "تم تغيير كلمة المرور بنجاح!",
    de: "Passwort erfolgreich geändert!",
  },
  passwordChangeFailed: {
    en: "Failed to change password.",
    ar: "فشل تغيير كلمة المرور.",
    de: "Passwortänderung fehlgeschlagen.",
  },
};

const getT = (
  key: keyof typeof profileTranslations,
  lang: "en" | "ar" | "de",
): string =>
  profileTranslations[key]?.[lang] || profileTranslations[key]?.en || key;

// ── Module-level profile cache — survives SPA navigation ──
let _cachedProfile: ProfileData | null = null;
let _cacheTs = 0;
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Wrap any promise with a hard timeout ──
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout:${ms}ms`)), ms),
    ),
  ]);
}

// ── Type-safe Supabase fetch helper ──
async function fetchWithTimeout<T>(
  queryOrPromise: PromiseLike<{ data: T | null; error: any }>,
  ms: number,
): Promise<{ data: T | null; error: any }> {
  try {
    return await withTimeout(Promise.resolve(queryOrPromise), ms);
  } catch (error) {
    return { data: null, error };
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { language, isRTLMode } = useLanguage();
  const lang = language as "en" | "ar" | "de";

  const [profile, setProfile] = useState<ProfileData | null>(
    () => _cachedProfile,
  );
  const [loading, setLoading] = useState(!_cachedProfile);
  const [activeTab, setActiveTab] = useState<"info" | "security">("info");
  const [username, setUsername] = useState(_cachedProfile?.username || "");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    type: "error" | "success";
    msg: string;
  } | null>(null);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getInitials = (name: string) =>
    name?.slice(0, 2)?.toUpperCase() || "??";

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(
        lang === "ar" ? "ar-AE" : lang === "de" ? "de-DE" : "en-US",
        { year: "numeric", month: "long", day: "numeric" },
      );
    } catch {
      return "—";
    }
  };

  const applyProfile = useCallback((data: ProfileData) => {
    if (!mountedRef.current) return;
    setProfile(data);
    setUsername(data.username);
    setLoading(false);
  }, []);

  // ── Main profile loader ──
  const loadProfile = useCallback(
    async (force = false) => {
      if (!mountedRef.current) return;

      // Serve from cache immediately if fresh
      if (
        !force &&
        _cachedProfile &&
        Date.now() - _cacheTs < PROFILE_CACHE_TTL
      ) {
        applyProfile(_cachedProfile);
        return;
      }

      if (!_cachedProfile && mountedRef.current) setLoading(true);

      try {
        // Get user with timeout
        const { data: userData, error: userError } = await fetchWithTimeout<{
          user: any;
        }>(supabase.auth.getUser(), 7000);

        if (!mountedRef.current) return;

        if (userError || !userData?.user) {
          setLoading(false);
          router.replace("/signin?redirectTo=/profile");
          return;
        }

        const user = userData.user;

        // Fetch profile row with timeout
        const { data: profileData, error: profileError } =
          await fetchWithTimeout<any>(
            supabase.from("profiles").select("*").eq("id", user.id).single(),
            8000,
          );

        if (!mountedRef.current) return;

        let finalProfile: ProfileData | null = null;

        if (profileError || !profileData) {
          // Profile missing — try to create it
          try {
            const { data: newProfile, error: insertError } =
              await fetchWithTimeout<any>(
                supabase
                  .from("profiles")
                  .insert({
                    id: user.id,
                    username:
                      user.user_metadata?.username ||
                      user.email?.split("@")[0] ||
                      "user",
                    email: user.email || "",
                  })
                  .select()
                  .single(),
                8000,
              );

            if (!insertError && newProfile) {
              finalProfile = newProfile as ProfileData;
            }
          } catch {
            // Insert failed
          }

          // Fallback if still no profile
          if (!finalProfile) {
            finalProfile = {
              id: user.id,
              username:
                user.user_metadata?.username ||
                user.email?.split("@")[0] ||
                "user",
              email: user.email || "",
              created_at: user.created_at || new Date().toISOString(),
              updated_at:
                user.updated_at || user.created_at || new Date().toISOString(),
            };
          }
        } else {
          finalProfile = profileData as ProfileData;
        }

        if (finalProfile) {
          _cachedProfile = finalProfile;
          _cacheTs = Date.now();
          if (mountedRef.current) applyProfile(finalProfile);
        }
      } catch {
        if (!mountedRef.current) return;
        if (_cachedProfile) {
          applyProfile(_cachedProfile);
        } else {
          setLoading(false);
        }
      }
    },
    [router, applyProfile],
  );

  // ── On mount: immediate render ──
  useEffect(() => {
    // Show cached profile instantly
    if (_cachedProfile) {
      applyProfile(_cachedProfile);
      // Refresh in background
      loadProfile(true);
    } else {
      loadProfile(false);
    }

    const handleOnline = () => {
      if (mountedRef.current) loadProfile(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        if (_cachedProfile) {
          applyProfile(_cachedProfile);
          if (Date.now() - _cacheTs > PROFILE_CACHE_TTL) {
            loadProfile(true);
          }
        } else {
          loadProfile(true);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadProfile, applyProfile]);

  // ── Save username ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || saving) return;
    setAlert(null);
    setSaving(true);

    try {
      const trimmed = username.trim();
      if (!trimmed) {
        setAlert({ type: "error", msg: getT("usernameEmpty", lang) });
        setSaving(false);
        return;
      }

      // Check if username already taken
      const { data: existing, error: checkError } = await fetchWithTimeout<any>(
        supabase
          .from("profiles")
          .select("id")
          .eq("username", trimmed)
          .neq("id", profile.id)
          .maybeSingle(),
        8000,
      );

      if (!checkError && existing) {
        setAlert({ type: "error", msg: getT("usernameTaken", lang) });
        setSaving(false);
        return;
      }

      // Update username
      const { data: updated, error: updateError } = await fetchWithTimeout<any>(
        supabase
          .from("profiles")
          .update({ username: trimmed })
          .eq("id", profile.id)
          .select()
          .single(),
        8000,
      );

      if (updateError || !updated) throw new Error("Update failed");

      _cachedProfile = updated as ProfileData;
      _cacheTs = Date.now();
      if (mountedRef.current) {
        setProfile(updated as ProfileData);
        setUsername(updated.username);
        setAlert({ type: "success", msg: getT("updateSuccess", lang) });
      }
    } catch {
      if (mountedRef.current) {
        setAlert({ type: "error", msg: getT("updateFailed", lang) });
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  // ── Change password ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passLoading) return;
    setAlert(null);
    setPassLoading(true);

    try {
      if (!newPass || newPass.length < 6) {
        setAlert({ type: "error", msg: getT("passwordShort", lang) });
        setPassLoading(false);
        return;
      }
      if (newPass !== confirmPass) {
        setAlert({ type: "error", msg: getT("passwordMismatch", lang) });
        setPassLoading(false);
        return;
      }

      const { error } = await fetchWithTimeout<any>(
        supabase.auth.updateUser({ password: newPass }),
        10000,
      );

      if (error) throw error;

      if (mountedRef.current) {
        setNewPass("");
        setConfirmPass("");
        setAlert({ type: "success", msg: getT("passwordChangeSuccess", lang) });
      }
    } catch {
      if (mountedRef.current) {
        setAlert({ type: "error", msg: getT("passwordChangeFailed", lang) });
      }
    } finally {
      if (mountedRef.current) setPassLoading(false);
    }
  };

  // ── Sign out ──
  const handleSignOut = async () => {
    if (signOutLoading) return;
    setSignOutLoading(true);

    _cachedProfile = null;
    _cacheTs = 0;

    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout:5000ms")), 5000),
        ),
      ]);
    } catch {
      // Ignore
    }

    router.replace("/signin");
  };

  // ── Show loading skeleton (only on first load, not on refresh) ──
  if (loading && !_cachedProfile) {
    return (
      <div className="pf-loading" dir={isRTLMode ? "rtl" : "ltr"}>
        <div className="pf-loading-ring">
          <div className="pf-loading-inner" />
        </div>
        <p className="pf-loading-text">
          {lang === "ar"
            ? "جار التحميل..."
            : lang === "de"
              ? "Laden..."
              : "Loading Profile..."}
        </p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="pf-root" dir={isRTLMode ? "rtl" : "ltr"}>
      <div className="pf-grain" aria-hidden="true" />
      <div className="pf-container">
        {/* ── Sidebar ── */}
        <aside className="pf-aside">
          <div className="pf-avatar-wrap">
            <div className="pf-avatar-ring">
              <div className="pf-avatar">
                <span className="pf-avatar-initials">
                  {getInitials(profile.username)}
                </span>
              </div>
            </div>
          </div>
          <div className="pf-aside-info">
            <p className="pf-aside-eyebrow">
              <span className="pf-ey-line" />
              {getT("member", lang)}
              <span className="pf-ey-line" />
            </p>
            <h2 className="pf-aside-name">{profile.username}</h2>
            <p className="pf-aside-email">{profile.email}</p>
            <div className="pf-aside-divider" aria-hidden="true" />
          </div>
          <div className="pf-aside-meta">
            <div className="pf-meta-item">
              <span className="pf-meta-label">{getT("status", lang)}</span>
              <span className="pf-meta-value">
                <span className="pf-dot" />
                <span className="pf-meta-active">{getT("active", lang)}</span>
              </span>
            </div>
            <div className="pf-meta-item">
              <span className="pf-meta-label">{getT("joined", lang)}</span>
              <span className="pf-meta-value">
                {formatDate(profile.created_at)}
              </span>
            </div>
            <div className="pf-meta-item">
              <span className="pf-meta-label">{getT("updated", lang)}</span>
              <span className="pf-meta-value">
                {formatDate(profile.updated_at)}
              </span>
            </div>
          </div>
          <button
            className="pf-signout-btn"
            onClick={handleSignOut}
            disabled={signOutLoading}
          >
            {signOutLoading ? (
              <span className="pf-spinner pf-spinner--red" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            )}
            {getT("signOut", lang)}
          </button>
        </aside>

        {/* ── Main content ── */}
        <main className="pf-main">
          <div className="pf-main-header">
            <p className="pf-main-eyebrow">
              <span className="pf-ey-line" />
              {getT("yourAccount", lang)}
            </p>
            <h1 className="pf-main-title">
              {getT("myProfile", lang)} <em>{getT("profileEm", lang)}</em>
            </h1>
            <p className="pf-main-sub">{getT("manageInfo", lang)}</p>
          </div>

          <div className="pf-tabs">
            <button
              className={`pf-tab${activeTab === "info" ? " pf-tab--active" : ""}`}
              onClick={() => {
                setActiveTab("info");
                setAlert(null);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {getT("profileInfo", lang)}
            </button>
            <button
              className={`pf-tab${activeTab === "security" ? " pf-tab--active" : ""}`}
              onClick={() => {
                setActiveTab("security");
                setAlert(null);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              {getT("security", lang)}
            </button>
          </div>

          {alert && (
            <div className={`pf-alert pf-alert--${alert.type}`} role="alert">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="14"
                height="14"
              >
                {alert.type === "success" ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </>
                )}
              </svg>
              {alert.msg}
            </div>
          )}

          {/* ── Profile Info Tab ── */}
          {activeTab === "info" && (
            <form className="pf-form" onSubmit={handleSaveProfile} noValidate>
              <div className="pf-form-grid">
                <div className="pf-field">
                  <label className="pf-label">{getT("username", lang)}</label>
                  <div className="pf-input-wrap">
                    <span className="pf-input-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="pf-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={getT("usernamePlaceholder", lang)}
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="pf-field">
                  <label className="pf-label">
                    {getT("emailAddress", lang)}
                  </label>
                  <div className="pf-input-wrap">
                    <span className="pf-input-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      className="pf-input"
                      value={profile.email}
                      readOnly
                      style={{ opacity: 0.7 }}
                    />
                  </div>
                </div>
                <div className="pf-field">
                  <label className="pf-label">
                    {getT("memberSince", lang)}
                  </label>
                  <div className="pf-input-wrap">
                    <span className="pf-input-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="pf-input"
                      value={formatDate(profile.created_at)}
                      readOnly
                      style={{ opacity: 0.7 }}
                    />
                  </div>
                </div>
              </div>
              <p className="pf-form-info">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="13"
                  height="13"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {getT("emailNote", lang)}
              </p>
              <button type="submit" className="pf-save-btn" disabled={saving}>
                {saving ? (
                  <span className="pf-spinner" />
                ) : (
                  <>
                    {getT("saveChanges", lang)}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Security Tab ── */}
          {activeTab === "security" && (
            <form
              className="pf-form"
              onSubmit={handleChangePassword}
              noValidate
            >
              <div className="pf-form-grid pf-form-grid--single">
                <div className="pf-field">
                  <label className="pf-label">
                    {getT("newPassword", lang)}
                  </label>
                  <div className="pf-input-wrap">
                    <span className="pf-input-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showNew ? "text" : "password"}
                      className="pf-input"
                      placeholder={getT("passwordPlaceholder", lang)}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="pf-eye-btn"
                      onClick={() => setShowNew(!showNew)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        {showNew ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="pf-field">
                  <label className="pf-label">
                    {getT("confirmPassword", lang)}
                  </label>
                  <div className="pf-input-wrap">
                    <span className="pf-input-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="pf-input"
                      placeholder={getT("passwordPlaceholder", lang)}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="pf-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        {showConfirm ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <p className="pf-form-info">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="13"
                  height="13"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {getT("passwordNote", lang)}
              </p>
              <button
                type="submit"
                className="pf-save-btn"
                disabled={passLoading}
              >
                {passLoading ? (
                  <span className="pf-spinner" />
                ) : (
                  <>
                    {getT("updatePassword", lang)}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
