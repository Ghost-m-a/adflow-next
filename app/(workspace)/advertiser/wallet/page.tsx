"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Wallet } from "lucide-react";

type Conversion = {
  _id: string;
  amount: number;
  currency: string;
  status: string;
};

export default function AdvertiserWalletPage() {
  const router = useRouter();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/advertiser/conversions?status=all", {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load wallet.");
      setConversions(data.conversions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  // Aggregate by currency.
  const totals: Record<string, { pending: number; approved: number }> = {};
  for (const c of conversions) {
    if (!totals[c.currency]) totals[c.currency] = { pending: 0, approved: 0 };
    if (c.status === "pending") totals[c.currency].pending += c.amount;
    if (c.status === "approved") totals[c.currency].approved += c.amount;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Wallet
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Spending committed to approved conversions, grouped by currency.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-32" />
      ) : Object.keys(totals).length === 0 ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title="No transactions yet"
          description="Once conversions are recorded against your campaigns, they will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(totals).map(([currency, t]) => (
            <Card key={currency}>
              <CardContent className="p-5">
                <p className="text-sm text-text-muted">{currency}</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs text-text-subtle">Pending approval</p>
                    <p className="mt-0.5 text-xl font-semibold text-amber-300">
                      {currency} {t.pending.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-subtle">Approved (spent)</p>
                    <p className="mt-0.5 text-xl font-semibold text-emerald-300">
                      {currency} {t.approved.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs leading-6 text-text-subtle">
        This is the sum of conversion amounts recorded against your campaigns.
        Actual settlement through a payment provider will be added once billing
        is integrated.
      </p>
    </div>
  );
}
