"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Activity } from "lucide-react";

type Campaign = {
  _id: string;
  title: string;
  status: string;
  budget?: number;
  currency?: string;
  maxCreators?: number;
};

type Application = { _id: string; status: string; campaignId?: string };

export default function AdvertiserAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/campaigns", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to load analytics.");
      const list: Campaign[] = d.campaigns || [];
      setCampaigns(list);

      const all: Application[] = [];
      await Promise.all(
        list.map(async (c) => {
          const ar = await fetch(`/api/campaigns/${c._id}/applications`, { cache: "no-store" });
          if (!ar.ok) return;
          const ad = await ar.json();
          (ad.applications || []).forEach((a: Application) =>
            all.push({ ...a, campaignId: c._id }),
          );
        }),
      );
      setApplications(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "active").length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const accepted = applications.filter((a) => a.status === "accepted").length;
    return { active, pending, accepted };
  }, [campaigns, applications]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Performance overview
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Monitor your campaigns, budgets, and creator applications.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh data"}
        </Button>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <Stat label="Total campaigns" value={campaigns.length} note="Accessible to you" />
            <Stat label="Active campaigns" value={stats.active} note="Currently running" accent="emerald" />
            <Stat label="Applications" value={applications.length} note={`${stats.pending} pending review`} accent="brand" />
            <Stat label="Accepted creators" value={stats.accepted} note="Accepted applications" accent="sky" />
          </>
        )}
      </div>

      <EmptyState
        icon={<Activity size={20} />}
        title={campaigns.length ? "Per-campaign analytics coming next" : "No campaigns yet"}
        description={
          campaigns.length
            ? "Clicks, conversions, and spend by campaign will appear here once tracking is enabled."
            : "Create a campaign to start collecting performance data."
        }
        action={
          !campaigns.length ? (
            <Link href="/advertiser/campaigns/new"><Button>Create campaign</Button></Link>
          ) : undefined
        }
      />
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
  value: number;
  note: string;
  accent?: "surface" | "emerald" | "brand" | "sky";
}) {
  const styles = {
    surface: "border-border bg-surface-1",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.06]",
    brand: "border-brand-400/20 bg-brand-500/[0.06]",
    sky: "border-sky-400/20 bg-sky-400/[0.06]",
  };
  return (
    <Card className={styles[accent]}>
      <CardContent className="p-5">
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        <p className="mt-2 text-xs text-text-subtle">{note}</p>
      </CardContent>
    </Card>
  );
}
