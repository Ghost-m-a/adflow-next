"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

type Conversion = {
  _id: string;
  campaignId: string;
  campaign: { title: string; slug: string } | null;
  creatorProfile: { username: string; displayName?: string } | null;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "reversed";
  source: string;
  externalId?: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
};

const FILTERS = ["pending", "approved", "rejected", "all"] as const;

export default function AdvertiserConversionsPage() {
  const router = useRouter();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/advertiser/conversions?status=${filter}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load conversions.");
      setConversions(data.conversions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load conversions.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, action: "approve" | "reject") {
    setWorking(id);
    setError("");
    try {
      const res = await fetch(`/api/conversions/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "reject" ? "Rejected by advertiser" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update conversion.");
      setConversions((current) => current.filter((c) => c._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update conversion.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Attribution
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Conversions
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Review and approve conversions reported by your tracking integrations.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
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
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : conversions.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={20} />}
          title={filter === "pending" ? "No pending conversions" : "No conversions found"}
          description={
            filter === "pending"
              ? "Conversions reported by your tracking integrations will appear here for review."
              : "Try another filter."
          }
        />
      ) : (
        <div className="space-y-3">
          {conversions.map((c) => (
            <Card key={c._id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold">
                      {c.campaign?.title ?? "Campaign"}
                    </h3>
                    <span
                      className={[
                        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        c.status === "pending"
                          ? "bg-amber-500/10 text-amber-300"
                          : c.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-red-500/10 text-red-300",
                      ].join(" ")}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-subtle">
                    {c.creatorProfile?.displayName ||
                      (c.creatorProfile?.username ? `@${c.creatorProfile.username}` : "Unattributed")}
                    {" · "}
                    {new Date(c.createdAt).toLocaleDateString()}
                    {" · source: "}
                    {c.source}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-text-subtle">Amount</p>
                    <p className="text-lg font-semibold">
                      {c.currency} {c.amount.toLocaleString()}
                    </p>
                  </div>

                  {c.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={working === c._id}
                        onClick={() => void review(c._id, "reject")}
                      >
                        <XCircle size={14} /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={working === c._id}
                        onClick={() => void review(c._id, "approve")}
                      >
                        <CheckCircle2 size={14} /> Approve
                      </Button>
                    </div>
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
