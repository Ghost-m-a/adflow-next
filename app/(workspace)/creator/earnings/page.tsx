"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { Activity } from "lucide-react";

type Balance = { pending: number; available: number; held: number; paid: number };

type Entry = {
  _id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  createdAt: string;
};

export default function CreatorEarningsPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/creator/earnings", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load earnings.");
      setBalances(data.balances || {});
      setThresholds(data.thresholds || {});
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load earnings.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const currencies = Object.keys(balances);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Earnings
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Your verified earnings, pending commissions, and paid-out amounts.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      ) : currencies.length === 0 ? (
        <EmptyState
          icon={<Activity size={20} />}
          title="No earnings yet"
          description="Earnings from verified conversions will appear here."
          action={
            <Link href="/creator/marketplace">
              <Button>Discover campaigns</Button>
            </Link>
          }
        />
      ) : (
        <>
          {currencies.map((currency) => {
            const b = balances[currency];
            const threshold = thresholds[currency] ?? 0;
            const canRequest = b.available >= threshold;

            return (
              <Card key={currency}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">{currency}</h2>
                    <span className="text-xs text-text-subtle">
                      Min payout: {currency} {threshold}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <Bucket label="Pending" value={b.pending} currency={currency} />
                    <Bucket label="Available" value={b.available} currency={currency} accent="emerald" />
                    <Bucket label="Held" value={b.held} currency={currency} accent="amber" />
                    <Bucket label="Paid" value={b.paid} currency={currency} />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link
                      href="/creator/payouts"
                      className={[
                        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                        canRequest
                          ? "bg-brand-500 text-white hover:bg-brand-600"
                          : "cursor-not-allowed border border-border text-text-subtle",
                      ].join(" ")}
                    >
                      {canRequest ? "Request payout" : "Below minimum"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <section>
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              {entries.length === 0 ? (
                <p className="p-6 text-sm text-text-muted">No ledger activity yet.</p>
              ) : (
                entries.map((e) => (
                  <div
                    key={e._id}
                    className="flex flex-col justify-between gap-2 border-b border-border bg-surface-1 p-4 last:border-b-0 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.description || "Reward"}
                      </p>
                      <p className="mt-0.5 text-xs text-text-subtle">
                        {e.reference} · {new Date(e.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "rounded-full px-2.5 py-0.5 text-xs capitalize",
                          e.status === "available"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : e.status === "pending"
                              ? "bg-amber-500/10 text-amber-300"
                              : e.status === "held"
                                ? "bg-sky-500/10 text-sky-300"
                                : e.status === "paid"
                                  ? "bg-brand-500/10 text-brand-300"
                                  : "bg-white/5 text-text-muted",
                        ].join(" ")}
                      >
                        {e.status}
                      </span>
                      <span className="min-w-[90px] text-right text-sm font-semibold">
                        {e.type === "reversal" ? "−" : "+"}
                        {e.currency} {e.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Bucket({
  label,
  value,
  currency,
  accent = "default",
}: {
  label: string;
  value: number;
  currency: string;
  accent?: "default" | "emerald" | "amber";
}) {
  const styles = {
    default: "border-border bg-surface-2",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.05]",
    amber: "border-amber-400/20 bg-amber-400/[0.05]",
  };
  return (
    <div className={`rounded-xl border p-3.5 ${styles[accent]}`}>
      <p className="text-xs text-text-subtle">{label}</p>
      <p className="mt-1.5 font-semibold">
        {currency} {value.toFixed(2)}
      </p>
    </div>
  );
}
