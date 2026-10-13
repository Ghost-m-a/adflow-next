"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Input, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldOff, ShieldCheck } from "lucide-react";

type UserRow = {
  _id: string;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

const FILTERS = ["all", "active", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<UserRow | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/admin/moderation/users?${params}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load users.");
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [filter, q, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void load();
  }

  async function unsuspend(id: string) {
    setWorking(id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/moderation/users/${id}/unsuspend`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to unsuspend.");
      setNotice("User restored.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unsuspend.");
    } finally {
      setWorking(null);
    }
  }

  async function submitSuspend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!openFor) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }

    setWorking(openFor._id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/moderation/users/${openFor._id}/suspend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: trimmed }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to suspend.");
      setNotice("User suspended.");
      setOpenFor(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to suspend.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin · Moderation
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Users
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Suspend or restore accounts. Administrators are excluded.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, or email"
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
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
      </form>

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No users match"
          description="Try another search term or filter."
        />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u._id}>
              <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">
                      {u.name || u.username || "User"}
                    </p>
                    <Badge variant={u.isActive ? "success" : "danger"}>
                      {u.isActive ? "active" : "suspended"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-subtle">
                    @{u.username} · {u.email}
                  </p>
                  <p className="mt-1 text-[11px] text-text-subtle">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                    {u.lastLoginAt &&
                      ` · Last seen ${new Date(u.lastLoginAt).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {u.isActive ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setOpenFor(u);
                        setReason("");
                        setError("");
                      }}
                    >
                      <ShieldOff size={14} /> Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={working === u._id}
                      onClick={() => void unsuspend(u._id)}
                    >
                      <ShieldCheck size={14} /> Restore
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {openFor && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenFor(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#101522] shadow-2xl"
          >
            <div className="border-b border-white/[0.08] p-5">
              <p className="text-xs uppercase tracking-wider text-red-300">
                Suspend user
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {openFor.name || openFor.username}
              </h2>
            </div>

            <form onSubmit={submitSuspend} className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs text-amber-200">
                The user will be signed out on their next request and blocked
                from signing back in.
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
                minLength={5}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Reason for suspension"
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenFor(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Confirm suspension
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
