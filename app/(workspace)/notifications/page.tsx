"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import {
  Bell,
  CheckCheck,
  CircleDollarSign,
  FileText,
  Megaphone,
  RefreshCw,
  Users,
} from "lucide-react";

type NotificationItem = {
  id: string;
  type: "campaign" | "application" | "payment" | "organization" | "system";
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

const FILTERS = ["all", "unread", "application", "payment", "campaign", "system"] as const;

function timeAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString();
}

function Icon({ type }: { type: NotificationItem["type"] }) {
  const Component =
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
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-400/15 bg-brand-400/10 text-brand-300">
      <Component size={18} />
    </span>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load notifications.");
      setItems(data.notifications || []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Unable to update.");
      const now = new Date().toISOString();
      setItems((curr) =>
        curr.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update.");
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    setBusy("all");
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      if (!res.ok) throw new Error("Unable to update.");
      const now = new Date().toISOString();
      setItems((curr) => curr.map((n) => ({ ...n, readAt: n.readAt ?? now })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update.");
    } finally {
      setBusy(null);
    }
  }

  const visible = items.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.readAt;
    return n.type === filter;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Inbox
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button onClick={() => void markAllRead()} disabled={busy === "all"}>
              <CheckCheck size={15} />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium capitalize transition",
              filter === f
                ? "bg-brand-500 text-white"
                : "border border-border bg-surface-2 text-text-muted hover:bg-white/5",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Bell size={20} />}
          title={items.length ? `No ${filter} notifications` : "No notifications yet"}
          description={
            items.length
              ? "Try another filter."
              : "Updates about campaigns, applications, and payments will appear here."
          }
        />
      ) : (
        <div className="space-y-2">
          {visible.map((n) => {
            const inner = (
              <Card
                key={n.id}
                className={
                  n.readAt
                    ? ""
                    : "border-brand-400/30 bg-brand-500/[0.04]"
                }
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon type={n.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {!n.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-muted">{n.message}</p>
                    <p className="mt-2 text-[11px] text-text-subtle">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );

            if (n.href) {
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => void markRead(n.id)}
                  className="block"
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => void markRead(n.id)}
                disabled={!!n.readAt || busy === n.id}
                className="block w-full text-left disabled:cursor-default"
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
