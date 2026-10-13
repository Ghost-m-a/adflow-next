"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Building2, RefreshCw } from "lucide-react";

type Row = {
  _id: string;
  name: string;
  slug: string;
  balances: Array<{
    currency: string;
    deposited: number;
    spent: number;
    fees: number;
    available: number;
  }>;
  activeCampaignsBudget: Array<{ currency: string; amount: number }>;
};

export default function AdminOrganizationFinancesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/finance/organizations", {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load organizations.");
      setRows(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin · Finance
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Organization balances
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Wallet balance, spend, fees, and campaign commitments per organization.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} />}
          title="No organizations"
          description="Once organizations are created and funded, their balances will show up here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{r.name}</h2>
                    <p className="text-xs text-text-subtle">{r.slug}</p>
                  </div>
                </div>

                {r.balances.length === 0 ? (
                  <p className="mt-4 text-sm text-text-subtle">
                    No wallet activity.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {r.balances.map((b) => {
                      const committed =
                        r.activeCampaignsBudget.find(
                          (x) => x.currency === b.currency,
                        )?.amount ?? 0;
                      const headroom = b.available - committed;

                      return (
                        <div
                          key={b.currency}
                          className="rounded-xl border border-border bg-white/[0.02] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{b.currency}</p>
                            <p
                              className={[
                                "text-xs",
                                headroom < 0 ? "text-red-300" : "text-emerald-300",
                              ].join(" ")}
                            >
                              Headroom: {b.currency} {headroom.toFixed(2)}
                            </p>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                            <Field
                              label="Deposited"
                              value={b.deposited}
                              currency={b.currency}
                            />
                            <Field
                              label="Spent"
                              value={b.spent}
                              currency={b.currency}
                            />
                            <Field
                              label="Fees"
                              value={b.fees}
                              currency={b.currency}
                            />
                            <Field
                              label="Available"
                              value={b.available}
                              currency={b.currency}
                              tone="emerald"
                            />
                          </div>
                          {committed > 0 && (
                            <p className="mt-2 text-[11px] text-text-subtle">
                              Committed to active campaigns: {b.currency}{" "}
                              {committed.toFixed(2)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: "emerald";
}) {
  return (
    <div>
      <p className="text-text-subtle">{label}</p>
      <p
        className={
          tone === "emerald" ? "font-medium text-emerald-300" : "font-medium"
        }
      >
        {currency} {value.toFixed(2)}
      </p>
    </div>
  );
}
