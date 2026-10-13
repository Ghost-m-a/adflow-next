"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { CircleDollarSign, RefreshCw, RotateCcw, Users } from "lucide-react";

type Overview = {
  totals: {
    depositsAllTime: Record<string, number>;
    platformFeesAllTime: Record<string, number>;
    approvedSpendAllTime: Record<string, number>;
    pendingPayoutsByCurrency: Array<{
      currency: string;
      amount: number;
      count: number;
    }>;
    totalOrganizations: number;
    totalCreators: number;
  };
  last30d: {
    deposits: Record<string, number>;
    platformFees: Record<string, number>;
    approvedSpend: Record<string, number>;
    refunds: Record<string, number>;
  };
};

function sumValues(map: Record<string, number>) {
  return Object.values(map).reduce((s, v) => s + v, 0);
}

function formatCurrencies(map: Record<string, number>) {
  const entries = Object.entries(map);
  if (entries.length === 0) return "—";
  return entries
    .map(([currency, value]) => `${currency} ${value.toLocaleString()}`)
    .join(" · ");
}

export default function AdminFinancePage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/finance/overview", {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to load overview.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load overview.");
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
            Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Finance overview
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Platform revenue, deposits, spend, and refunds.
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

      {loading || !data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </>
      ) : (
        <>
          {/* ===================== KPI cards ===================== */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Platform fees (all time)"
              value={formatCurrencies(data.totals.platformFeesAllTime)}
              note="Net revenue from approved conversions"
              icon={<CircleDollarSign size={18} />}
              accent="brand"
            />
            <Stat
              label="Total deposits"
              value={formatCurrencies(data.totals.depositsAllTime)}
              note="All successful wallet top-ups"
              icon={<CircleDollarSign size={18} />}
              accent="emerald"
            />
            <Stat
              label="Approved spend"
              value={formatCurrencies(data.totals.approvedSpendAllTime)}
              note="Total charged to advertisers"
              icon={<CircleDollarSign size={18} />}
            />
            <Stat
              label="Refunded (30d)"
              value={formatCurrencies(data.last30d.refunds)}
              note="Reversed conversions"
              icon={<RotateCcw size={18} />}
              accent="red"
            />
          </div>

          {/* ===================== 30-day window ===================== */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">Last 30 days</h2>
              <p className="mt-1 text-sm text-text-muted">
                Fresh activity across the platform.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Mini label="Deposits" map={data.last30d.deposits} tone="emerald" />
                <Mini label="Platform fees" map={data.last30d.platformFees} tone="brand" />
                <Mini label="Approved spend" map={data.last30d.approvedSpend} />
              </div>

              {sumValues(data.last30d.platformFees) > 0 && (
                <p className="mt-5 text-xs leading-6 text-text-subtle">
                  Total fee revenue this window:{" "}
                  <span className="font-medium text-brand-300">
                    {formatCurrencies(data.last30d.platformFees)}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* ===================== Platform shape ===================== */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Active organizations"
              value={data.totals.totalOrganizations.toString()}
              note="Not suspended"
              icon={<Users size={18} />}
            />
            <Stat
              label="Active users"
              value={data.totals.totalCreators.toString()}
              note="isActive: true"
              icon={<Users size={18} />}
            />
            <Stat
              label="Pending payouts"
              value={
                data.totals.pendingPayoutsByCurrency.length === 0
                  ? "—"
                  : data.totals.pendingPayoutsByCurrency
                      .map(
                        (p) =>
                          `${p.currency} ${p.amount.toLocaleString()} (${p.count})`,
                      )
                      .join(" · ")
              }
              note="Awaiting admin action"
              icon={<CircleDollarSign size={18} />}
              accent="amber"
            />
          </div>

          {/* ===================== Quick links ===================== */}
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickLink href="/admin/finance/deposits" label="Review deposits" />
            <QuickLink href="/admin/finance/refunds" label="Process refund" />
            <QuickLink href="/admin/payouts" label="Settle payouts" />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  icon,
  accent = "surface",
}: {
  label: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
  accent?: "surface" | "emerald" | "brand" | "amber" | "red";
}) {
  const styles = {
    surface: "border-border bg-surface-1",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.06]",
    brand: "border-brand-400/20 bg-brand-500/[0.06]",
    amber: "border-amber-400/20 bg-amber-400/[0.06]",
    red: "border-red-400/20 bg-red-400/[0.06]",
  };
  return (
    <Card className={styles[accent]}>
      <CardContent className="p-5">
        {icon && <div className="text-brand-300">{icon}</div>}
        <p className="mt-3 text-sm text-text-muted">{label}</p>
        <p className="mt-1 break-words text-lg font-bold">{value}</p>
        <p className="mt-2 text-xs text-text-subtle">{note}</p>
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  map,
  tone = "default",
}: {
  label: string;
  map: Record<string, number>;
  tone?: "default" | "emerald" | "brand";
}) {
  const styles = {
    default: "border-border bg-surface-2",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.05]",
    brand: "border-brand-400/20 bg-brand-500/[0.05]",
  };
  const entries = Object.entries(map);
  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <p className="text-xs text-text-subtle">{label}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-lg font-semibold">—</p>
      ) : (
        <div className="mt-2 space-y-1">
          {entries.map(([currency, value]) => (
            <p key={currency} className="text-sm font-semibold">
              {currency} {value.toLocaleString()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 p-4 text-sm font-medium transition hover:border-brand-400/40 hover:bg-white/[0.03]"
    >
      {label}
      <span className="text-text-subtle">→</span>
    </Link>
  );
}
