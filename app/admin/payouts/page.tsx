"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { RefreshCw } from "lucide-react";

type Payout = {
  _id: string;
  user: { _id: string; name?: string; username?: string; email?: string };
  amount: number;
  currency: string;
  status: "requested" | "processing" | "paid" | "failed" | "cancelled";
  reference: string;
  provider: string;
  destinationLabel: string;
  requestedAt: string;
};

const FILTERS = ["requested", "processing", "paid", "failed", "all"] as const;

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("requested");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts?status=${filter}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.replace("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load payouts.");
      setPayouts(data.payouts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payouts.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(payoutId: string, action: "mark-paid" | "mark-failed") {
    const reason =
      action === "mark-failed"
        ? window.prompt("Reason for failing this payout?") ?? ""
        : undefined;
    if (action === "mark-failed" && !reason) return;

    setWorking(payoutId);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update payout.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update payout.");
    } finally {
      setWorking(null);
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
            Payouts
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Review and settle creator payout requests.
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
        <Skeleton className="h-32" />
      ) : payouts.length === 0 ? (
        <EmptyState title="No payouts to review" description="Nothing in this filter." />
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <Card key={p._id}>
              <CardContent className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.user?.name || p.user?.username || "Creator"} ·{" "}
                    {p.user?.email}
                  </p>
                  <p className="mt-1 text-xs text-text-subtle">
                    {p.reference} · {p.destinationLabel} ·{" "}
                    {new Date(p.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-lg font-semibold">
                    {p.currency} {p.amount.toFixed(2)}
                  </p>
                  <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs capitalize text-brand-300">
                    {p.status}
                  </span>
                  {(p.status === "requested" || p.status === "processing") && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={working === p._id}
                        onClick={() => void act(p._id, "mark-failed")}
                      >
                        Fail
                      </Button>
                      <Button
                        size="sm"
                        disabled={working === p._id}
                        onClick={() => void act(p._id, "mark-paid")}
                      >
                        Mark paid
                      </Button>
                    </>
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
