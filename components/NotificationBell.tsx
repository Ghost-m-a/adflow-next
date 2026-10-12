"use client";

import {
  Bell,
  CheckCheck,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Megaphone,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: "campaign" | "application" | "payment" | "organization" | "system";
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  const Icon =
    type === "application"
      ? Users
      : type === "payment"
        ? CircleDollarSign
        : type === "campaign"
          ? Megaphone
          : type === "organization"
            ? FileText
            : Bell;

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/10 text-violet-300">
      <Icon size={18} />
    </span>
  );
}

export default function NotificationBell() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/notifications", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load notifications.");
      }

      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function markRead(item: NotificationItem) {
    if (item.readAt || updatingId) return;

    setUpdatingId(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(item.id)}/read`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to mark notification as read.");
      }

      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, readAt: data.readAt || new Date().toISOString() }
            : notification,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update notification.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function markAllRead() {
    if (!unreadCount || updatingId) return;

    setUpdatingId("all");
    setError("");

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "mark-all-read" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to mark notifications as read.");
      }

      const now = new Date().toISOString();
      setItems((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || now })),
      );
      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update notifications.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unreadCount
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-300 transition hover:border-violet-400/30 hover:bg-white/[0.07] hover:text-white"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-[#080b12] bg-violet-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+12px)] z-[120] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-[#101420] shadow-2xl shadow-black/50"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Notifications</h2>
              <p className="mt-1 text-xs text-slate-400">
                {unreadCount
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void loadNotifications()}
                disabled={loading}
                aria-label="Refresh notifications"
                title="Refresh"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="flex justify-end border-b border-white/[0.06] px-4 py-2">
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={updatingId !== ""}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-violet-200 disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mx-3 mt-3 rounded-lg bg-rose-400/10 p-3 text-xs text-rose-200">
              {error}
            </p>
          )}

          <div className="max-h-[min(65vh,480px)] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Loading notifications…
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
                  <Bell size={21} />
                </span>
                <p className="mt-3 text-sm font-medium text-white">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Updates about campaigns, applications, and payments will appear here.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const content = (
                  <div className="flex gap-3">
                    <NotificationIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">
                          {item.title}
                        </p>
                        {!item.readAt && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {item.message}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <div
                    key={item.id}
                    className={[
                      "border-b border-white/[0.055] px-4 py-4 transition hover:bg-white/[0.025]",
                      item.readAt ? "" : "bg-violet-400/[0.035]",
                    ].join(" ")}
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => {
                          void markRead(item);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                        <span className="sr-only">Open notification</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(item.readAt) || updatingId !== ""}
                        onClick={() => void markRead(item)}
                        className="block w-full text-left disabled:cursor-default"
                      >
                        {content}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/[0.08] p-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void loadNotifications();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
            >
              <ExternalLink size={14} />
              Refresh notification list
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
