"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

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
    const parts = name.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  return user?.username?.slice(0, 2).toUpperCase() || "U";
}

function UserAvatar({
  user,
  size = "normal",
}: {
  user: CurrentUser;
  size?: "normal" | "large";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const dimension = size === "large" ? "h-12 w-12" : "h-10 w-10";

  useEffect(() => {
    setImageFailed(false);
  }, [user.avatarUrl]);

  return (
    <div
      className={`${dimension} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-300/25 bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white`}
    >
      {user.avatarUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.name || user.username}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(user)
      )}
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
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = (await response.json()) as MeResponse;

      if (!response.ok) {
        throw new Error(data.error || "Unable to load your account.");
      }

      const currentUser = data.user ?? data;

      if (!currentUser.username || !currentUser.email) {
        throw new Error("The account response is missing user information.");
      }

      setUser({
        ...currentUser,
        avatarUrl: currentUser.avatarUrl || null,
      } as CurrentUser);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load your account."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

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
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        throw new Error(
          data.error || data.message || "Logout failed. Please try again."
        );
      }

      setUser(null);
      setMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Logout failed. Please try again."
      );
      setLoggingOut(false);
    }
  }

  const displayName =
    user?.name?.trim() || user?.username || "Your account";

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#080b12]/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-2 pl-14 pr-3 sm:gap-4 sm:pl-16 sm:pr-6 lg:px-8">
        <Link
          href="/dashboard"
          className="shrink-0 text-xl font-black tracking-tight sm:text-2xl"
          aria-label="ADFLOW dashboard"
        >
          AD<span className="text-violet-400">FLOW</span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex"
          >
            Dashboard
          </Link>

          <NotificationBell />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={loading || !user}
              aria-label="Open user menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex max-w-[230px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 pr-3 text-left transition hover:border-violet-400/40 hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-70"
            >
              {user ? (
                <UserAvatar user={user} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 text-gray-300"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M4 21a8 8 0 0 1 16 0"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}

              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-[130px] truncate text-sm font-semibold">
                  {loading ? "Loading account..." : displayName}
                </span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  {loading ? "Please wait" : "My account"}
                </span>
              </span>

              <svg
                viewBox="0 0 20 20"
                fill="none"
                className={`hidden h-4 w-4 shrink-0 text-gray-400 transition-transform sm:block ${
                  menuOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menuOpen && user && (
              <div
                role="menu"
                aria-label="User account menu"
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#111521] shadow-2xl shadow-black/40"
              >
                <div className="border-b border-white/[0.08] bg-white/[0.025] p-5">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="large" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {displayName}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-400">
                        @{user.username}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {user.platformRole === "admin" && (
                    <span className="mt-3 inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                      Platform admin
                    </span>
                  )}
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-gray-200 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDark ? (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-400" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
                        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-gray-400" aria-hidden="true">
                        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <span className="flex-1">{isDark ? "Light mode" : "Dark mode"}</span>
                    <span className="text-xs text-gray-500">{isDark ? "Off" : "On"}</span>
                  </button>

                  <Link
                    href="/dashboard/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-200 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="flex-1">Profile settings</span>
                    <span className="text-gray-500">›</span>
                  </Link>

                  <Link
                    href="/"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-200 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9.5 20v-6h5v6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="flex-1">Visit homepage</span>
                    <span className="text-gray-500">›</span>
                  </Link>
                </div>

                <div className="border-t border-white/[0.08] p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-60"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M10 17l5-5-5-5M15 12H3m9-8h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>
                      {loggingOut ? "Logging out..." : "Log out"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:px-8">
          <p
            role="alert"
            className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300"
          >
            {error}
          </p>
        </div>
      )}
    </header>
  );
}
