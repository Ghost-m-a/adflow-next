"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, RotateCcw, X } from "lucide-react";

type Conversion = {
  _id: string;
  campaignId: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "reversed";
  source: string;
  externalId: string | null;
  createdAt: string;
  approvedAt: string | null;
};

const FILTERS = ["approved", "reversed", "all"] as const;

export default function AdminRefundsPage() {
  const router = useRouter();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("approved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<Conversion | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/finance/refunds?status=${filter}`,
        { cache: "no-store" },
      );
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load refunds.");
      setConversions(data.conversions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load refunds.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load, router]);

  async function submitRefund(e: React.FormEvent<HTMLFormElement>) {
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
      const res = await fetch("/api/admin/finance/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversionId: openFor._id, reason: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to refund.");

      setNotice(
        `Refund processed. ${data.entriesCreated} offset entries created, ${data.entriesVoided} originals voided.`,
      );
      setOpenFor(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refund.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin · Finance
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Refunds
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Reverse approved conversions and restore advertiser balances.
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
      ) : conversions.length === 0 ? (
        <EmptyState
          icon={<RotateCcw size={20} />}
          title={`No ${filter} conversions`}
          description="Approved conversions can be refunded to restore advertiser and creator balances."
        />
      ) : (
        <div className="space-y-3">
          {conversions.map((c) => (
            <Card key={c._id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-mono text-sm">
                      {c._id.slice(-10)}
                    </h3>
                    <Badge
                      variant={
                        c.status === "approved"
                          ? "success"
                          : c.status === "reversed"
                            ? "warning"
                            : "default"
                      }
                    >
                      {c.status}
                    </Badge>
                    <span className="text-xs capitalize text-text-subtle">
                      {c.source}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-subtle">
                    Campaign {c.campaignId.slice(-8)} ·{" "}
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-text-subtle">Amount</p>
                    <p className="text-lg font-semibold">
                      {c.currency} {c.amount.toFixed(2)}
                    </p>
                  </div>

                  {c.status === "approved" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setOpenFor(c);
                        setReason("");
                        setError("");
                      }}
                    >
                      <RotateCcw size={14} /> Refund
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Refund modal */}
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
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-red-300">
                  Refund conversion
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {openFor.currency} {openFor.amount.toFixed(2)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenFor(null)}
                aria-label="Close"
                className="rounded-lg p-2 text-text-muted hover:bg-white/5 hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submitRefund} className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs text-amber-200">
                This creates offsetting ledger entries. The advertiser&apos;s balance
                is restored, the creator&apos;s earning is clawed back, and the
                platform fee is reversed. Originals are marked void.
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Reason (required)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  minLength={5}
                  maxLength={500}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Explain why this conversion is being refunded."
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenFor(null)}
                  disabled={working === openFor._id}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={working === openFor._id}
                >
                  Confirm refund
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
