"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import styles from "@/styles/components/Topbar.module.css";

type CurrentUser = {
  _id?: string;
  id?: string;
  name?: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  platformRole?: string;
};

type MeResponse = {
  user?: CurrentUser;
  error?: string;
  message?: string;
} & Partial<CurrentUser>;

function getInitials(user: CurrentUser | null) {
  const name = user?.name?.trim();
  if (name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }
  return user?.username?.slice(0, 2).toUpperCase() || "U";
}

function UserAvatar({ user, size = "normal" }: { user: CurrentUser; size?: "normal" | "large" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const dimension = size === "large" ? "h-12 w-12" : "h-10 w-10";

  useEffect(() => { setImageFailed(false); }, [user.avatarUrl]);

  return (
    <div className={`${dimension} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-300/25 bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white`}>
      {user.avatarUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={user.name || user.username} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : (getInitials(user))}
    </div>
  );
}

export default function Topbar() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("adflow-theme");
    const dark = savedTheme !== "light";
    setIsDark(dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    document.documentElement.dataset.theme = nextIsDark ? "dark" : "light";
    localStorage.setItem("adflow-theme", nextIsDark ? "dark" : "light");
  }

  const loadUser = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/me", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) { router.replace("/login"); return; }

      const data = (await response.json()) as MeResponse;
      if (!response.ok) throw new Error(data.error || "Unable to load your account.");

      const currentUser = data.user ?? data;
      if (!currentUser.username || !currentUser.email) {
        throw new Error("The account response is missing user information.");
      }
      setUser({ ...currentUser, avatarUrl: currentUser.avatarUrl || null } as CurrentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your account.");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void loadUser(); }, [loadUser]);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setMenuOpen(false); }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST", credentials: "same-origin", headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(data.error || data.message || "Logout failed. Please try again.");
      }
      setUser(null); setMenuOpen(false);
      router.replace("/login"); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed. Please try again.");
      setLoggingOut(false);
    }
  }

  const displayName = user?.name?.trim() || user?.username || "Your account";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.brand} aria-label="ADFLOW dashboard">
          AD<span className={styles.brandAccent}>FLOW</span>
        </Link>

        <div className={styles.right}>
          <Link href="/dashboard" className={styles.dashboardLink}>Dashboard</Link>
          <NotificationBell />

          <div className={styles.menuWrap} ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(open => !open)}
              disabled={loading || !user}
              aria-label="Open user menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={styles.trigger}
            >
              {user ? <UserAvatar user={user} /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10" />}
              <span className={styles.triggerText}>
                <span className={styles.triggerName}>{loading ? "Loading account..." : displayName}</span>
                <span className={styles.triggerSub}>{loading ? "Please wait" : "My account"}</span>
              </span>
              <svg viewBox="0 0 20 20" fill="none" className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ""}`} aria-hidden="true">
                <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {menuOpen && user && (
              <div role="menu" aria-label="User account menu" className={styles.menu}>
                <div className={styles.menuHeader}>
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="large" />
                    <div className="min-w-0 flex-1">
                      <p className={styles.menuUserName}>{displayName}</p>
                      <p className={styles.menuUserMeta}>@{user.username}</p>
                      <p className={styles.menuUserMeta}>{user.email}</p>
                    </div>
                  </div>
                  {user.platformRole === "admin" && (
                    <span className={styles.adminBadge}>Platform admin</span>
                  )}
                </div>

                <div className={styles.menuBody}>
                  <button type="button" role="menuitem" onClick={toggleTheme} className={styles.menuItem}>
                    <span className="flex-1">{isDark ? "Light mode" : "Dark mode"}</span>
                  </button>
                  <Link href="/dashboard/settings" role="menuitem" onClick={() => setMenuOpen(false)} className={styles.menuItem}>
                    <span className="flex-1">Profile settings</span>
                  </Link>
                  <Link href="/" role="menuitem" onClick={() => setMenuOpen(false)} className={styles.menuItem}>
                    <span className="flex-1">Visit homepage</span>
                  </Link>
                </div>

                <div className={styles.menuFooter}>
                  <button type="button" role="menuitem" onClick={() => void handleLogout()} disabled={loggingOut} className={styles.logout}>
                    {loggingOut ? "Logging out..." : "Log out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorBar}>
          <p role="alert" className={styles.errorText}>{error}</p>
        </div>
      )}
    </header>
  );
}
