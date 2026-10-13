"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, TrendingUp } from "lucide-react";
import { TimeSeriesChart } from "@/components/analytics/TimeSeriesChart";

type Range = "7d" | "30d" | "90d" | "all";

type Overview = {
  clicks: number;
  conversions: number;
  approved: number;
  pending: number;
  rejected: number;
  ctr: number | null;
  conversionRate: number | null;
  approvalRate: number | null;
  spendByCurrency: Array<{
    currency: string;
    approvedSpend: number;
    pendingSpend: number;
  }>;
};

type CampaignMetric = {
  _id: string;
  title: string;
  status: string;
  currency: string;
  budget: number;
  clicks: number;
  conversions: number;
  approved: number;
  pending: number;
  spend: number;
  ctr: number | null;
  conversionRate: number | null;
  cpa: number | null;
};

type CreatorMetric = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  conversions: number;
  approved: number;
  earnings: number;
  currency: string;
};

type TimePoint = {
  date: string;
  clicks: number;
  conversions: number;
  approved: number;
};

type AnalyticsResponse = {
  range: Range;
  campaignId: string | null;
  overview: Overview;
  campaigns: CampaignMetric[];
  creators: CreatorMetric[];
  timeseries: TimePoint[];
  campaignList: Array<{
    _id: string;
    title: string;
    status: string;
    currency: string;
    budget: number;
  }>;
};

const RANGES: { label: string; value: Range }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" },
];

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [range, setRange] = useState<Range>(
    (searchParams.get("range") as Range) || "30d",
  );
  const [campaignId, setCampaignId] = useState(
    searchParams.get("campaignId") || "",
  );

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range });
      if (campaignId) params.set("campaignId", campaignId);

      const res = await fetch(`/api/advertiser/analytics?${params}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const json = (await res.json()) as AnalyticsResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || "Unable to load analytics.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [range, campaignId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const overview = data?.overview;
  const totalSpend =
    overview?.spendByCurrency.reduce((sum, c) => sum + c.approvedSpend, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Performance overview
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Clicks, conversions, spend, and creator performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
            aria-label="Filter by campaign"
          >
            <option value="">All campaigns</option>
            {data?.campaignList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>

          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Range selector */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition",
              range === r.value
                ? "bg-brand-500 text-white"
                : "border border-border bg-surface-2 text-text-muted hover:bg-white/5",
            ].join(" ")}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !overview ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))
        ) : (
          <>
            <Stat
              label="Clicks"
              value={overview.clicks.toLocaleString()}
              note={`CTR ${formatPct(overview.ctr)}`}
            />
            <Stat
              label="Conversions"
              value={overview.conversions.toLocaleString()}
              note={`${overview.approved} approved · ${overview.pending} pending`}
              accent="amber"
            />
            <Stat
              label="Approval rate"
              value={formatPct(overview.approvalRate)}
              note={`Conversion rate ${formatPct(overview.conversionRate)}`}
              accent="emerald"
            />
            <Stat
              label="Approved spend"
              value={
                overview.spendByCurrency.length > 0
                  ? overview.spendByCurrency
                      .map((c) => formatMoney(c.approvedSpend, c.currency))
                      .join(" · ")
                  : "—"
              }
              note="Approved conversions only"
              accent="brand"
            />
          </>
        )}
      </div>

      {/* Time series */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Activity</h2>
            <TrendingUp size={18} className="text-text-muted" />
          </div>

          <div className="mt-5">
            {loading || !data ? (
              <Skeleton className="h-56" />
            ) : (
              <TimeSeriesChart data={data.timeseries} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Currency breakdown */}
      {overview && overview.spendByCurrency.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Spend by currency</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {overview.spendByCurrency.map((c) => (
              <Card key={c.currency}>
                <CardContent className="p-5">
                  <p className="text-sm text-text-muted">{c.currency}</p>
                  <p className="mt-2 text-2xl font-bold">
                    {formatMoney(c.approvedSpend, c.currency)}
                  </p>
                  <p className="mt-1 text-xs text-text-subtle">
                    Pending: {formatMoney(c.pendingSpend, c.currency)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Campaign performance */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Campaign performance</h2>
          {data && (
            <span className="text-sm text-text-subtle">
              {data.campaigns.length} campaign
              {data.campaigns.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {loading || !data ? (
          <Skeleton className="h-64" />
        ) : data.campaigns.length === 0 ? (
          <EmptyState
            icon={<Activity size={20} />}
            title="No campaign activity"
            description="Once tracking links record clicks and conversions, per-campaign metrics will appear here."
            action={
              <Link href="/advertiser/campaigns">
                <Button variant="outline">Manage campaigns</Button>
              </Link>
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-text-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Campaign</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                    <th className="px-4 py-3 text-right font-medium">Conv.</th>
                    <th className="px-4 py-3 text-right font-medium">Approved</th>
                    <th className="px-4 py-3 text-right font-medium">CTR</th>
                    <th className="px-4 py-3 text-right font-medium">CVR</th>
                    <th className="px-4 py-3 text-right font-medium">CPA</th>
                    <th className="px-4 py-3 text-right font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-border last:border-b-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/advertiser/campaigns/${c._id}`}
                            className="truncate font-medium hover:text-brand-300"
                          >
                            {c.title}
                          </Link>
                          <Badge
                            variant={
                              c.status === "active"
                                ? "success"
                                : c.status === "paused"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {c.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.clicks.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.conversions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-300">
                        {c.approved.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {formatPct(c.ctr)}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {formatPct(c.conversionRate)}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {c.cpa !== null
                          ? `${c.currency} ${c.cpa.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {c.spend > 0
                          ? `${c.currency} ${c.spend.toLocaleString()}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* Creator leaderboard */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Top creators</h2>
            <p className="mt-1 text-sm text-text-muted">
              Ranked by approved conversions in this window.
            </p>
          </div>
          {data && (
            <span className="text-sm text-text-subtle">
              {data.creators.length} creator
              {data.creators.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {loading || !data ? (
          <Skeleton className="h-64" />
        ) : data.creators.length === 0 ? (
          <EmptyState
            icon={<Activity size={20} />}
            title="No creator performance yet"
            description="Once conversions are attributed to creators, the leaderboard will rank them by verified results."
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-text-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Creator</th>
                    <th className="px-4 py-3 text-right font-medium">Conversions</th>
                    <th className="px-4 py-3 text-right font-medium">Approved</th>
                    <th className="px-4 py-3 text-right font-medium">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.creators.map((c, i) => (
                    <tr
                      key={c.userId}
                      className="border-b border-border last:border-b-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-text-subtle">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                            {(c.displayName || c.username || "?").charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {c.displayName || `@${c.username}` || "Creator"}
                            </p>
                            {c.displayName && c.username && (
                              <p className="truncate text-xs text-text-subtle">
                                @{c.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.conversions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-300">
                        {c.approved.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {c.currency} {c.earnings.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <p className="text-xs leading-6 text-text-subtle">
        Totals reflect {range === "all" ? "all time" : `the last ${range.replace("d", " days")}`}.
        Currencies are not converted — spend is grouped by its original currency.
        {totalSpend > 0 && " "}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  accent = "surface",
}: {
  label: string;
  value: string;
  note: string;
  accent?: "surface" | "amber" | "emerald" | "brand";
}) {
  const styles = {
    surface: "border-border bg-surface-1",
    amber: "border-amber-400/20 bg-amber-400/[0.06]",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.06]",
    brand: "border-brand-400/20 bg-brand-500/[0.06]",
  };

  return (
    <Card className={styles[accent]}>
      <CardContent className="p-5">
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mt-2 break-words text-2xl font-bold">{value}</p>
        <p className="mt-2 text-xs text-text-subtle">{note}</p>
      </CardContent>
    </Card>
  );
}


function AnalyticsFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function AdvertiserAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsFallback />}>
      <AnalyticsContent />
    </Suspense>
  );
}
