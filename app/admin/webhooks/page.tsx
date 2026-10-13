"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Webhook,
} from "lucide-react";

type Event = {
  _id: string;
  provider: string;
  eventType: string;
  externalId: string;
  status: "received" | "processed" | "failed";
  error: string | null;
  processedAt: string | null;
  createdAt: string;
};

type Stats = {
  received: number;
  processed: number;
  failed: number;
  total: number;
};

type ProviderRow = { provider: string; count: number };

const STATUSES = ["all", "received", "processed", "failed"] as const;
type StatusFilter = (typeof STATUSES)[number];

export default function AdminWebhooksPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (provider !== "all") params.set("provider", provider);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/webhooks?${params}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load webhooks.");
      setEvents(data.events || []);
      setStats(data.stats);
      setProviders(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load webhooks.");
    } finally {
      setLoading(false);
    }
  }, [provider, status, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry(id: string) {
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry failed.");
      setNotice("Event retried successfully.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
      await load();
    }
  }

  async function retryAll() {
    if (!window.confirm("Retry every failed webhook? (up to 50)")) return;
    setRetrying(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/webhooks/retry-all", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk retry failed.");
      setNotice(
        `Retried ${data.attempted} events — ${data.succeeded} succeeded, ${data.failed} failed.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Webhook events
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Every inbound webhook, with payload inspection and one-click retry.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          {stats && stats.failed > 0 && (
            <Button onClick={() => void retryAll()} loading={retrying}>
              <RotateCcw size={15} /> Retry all failed
            </Button>
          )}
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Received" value={stats.received} tone="amber" />
          <StatTile label="Processed" value={stats.processed} tone="emerald" />
          <StatTile label="Failed" value={stats.failed} tone="red" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
        >
          <option value="all">All providers</option>
          {providers.map((p) => (
            <option key={p.provider} value={p.provider}>
              {p.provider} ({p.count})
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={[
                "rounded-full px-4 py-2 text-sm font-medium capitalize transition",
                status === s
                  ? "bg-brand-500 text-white"
                  : "border border-border bg-surface-2 text-text-muted hover:bg-white/5",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

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
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Webhook size={20} />}
          title="No webhook events"
          description="Incoming webhooks from advertisers will appear here."
        />
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <Card key={e._id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/webhooks/${e._id}`}
                      className="font-mono text-sm font-medium hover:text-brand-300"
                    >
                      {e._id.slice(-10)}
                    </Link>
                    <Badge
                      variant={
                        e.status === "processed"
                          ? "success"
                          : e.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {e.status}
                    </Badge>
                    <span className="text-xs text-text-subtle">
                      {e.provider} · {e.eventType}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-text-subtle">
                    {e.externalId} ·{" "}
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                  {e.error && (
                    <p className="mt-1 truncate text-xs text-red-300">
                      {e.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/webhooks/${e._id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                  {e.status === "failed" && (
                    <Button size="sm" onClick={() => void retry(e._id)}>
                      <RotateCcw size={14} /> Retry
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "emerald" | "red";
}) {
  const styles = {
    default: "border-border bg-surface-1",
    amber: "border-amber-400/20 bg-amber-400/[0.06]",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.06]",
    red: "border-red-400/20 bg-red-400/[0.06]",
  };
  const icons = {
    default: null,
    amber: <AlertCircle size={16} />,
    emerald: <CheckCircle2 size={16} />,
    red: <AlertCircle size={16} />,
  };
  return (
    <Card className={styles[tone]}>
      <CardContent className="p-5">
        {icons[tone] && <div className="text-text-muted">{icons[tone]}</div>}
        <p className="mt-2 text-sm text-text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
