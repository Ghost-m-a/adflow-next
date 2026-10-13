"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, EmptyState, Input } from "@/components/ui";
import { Megaphone } from "lucide-react";

type Campaign = {
  _id: string;
  title: string;
  description: string;
  platform: string;
  goal: string;
  status: string;
  budget: number;
  currency: string;
  rewardPerCreator: number;
  maxCreators: number;
  organization?: { name?: string } | null;
};

const STATUS_FILTERS = ["all", "draft", "active", "paused", "completed", "cancelled"] as const;

export default function AdvertiserCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load campaigns.");
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchesFilter = filter === "all" || c.status === filter;
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.organization?.name || "").toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [campaigns, filter, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Campaigns
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Search, filter, and manage your campaigns.
          </p>
        </div>
        <Link href="/advertiser/campaigns/new">
          <Button>+ Create campaign</Button>
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns or organizations..."
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm capitalize"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}{" "}
          <button onClick={() => void load()} className="underline">Retry</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-muted">Loading campaigns...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={20} />}
          title={campaigns.length ? "No matching campaigns" : "No campaigns yet"}
          description={
            campaigns.length
              ? "Try another search or status filter."
              : "Create your first campaign to start working with creators."
          }
          action={
            !campaigns.length ? (
              <Link href="/advertiser/campaigns/new">
                <Button>Create campaign</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c._id}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-brand-300">
                      {c.platform} · {c.goal}
                    </p>
                    <h3 className="mt-2 truncate text-lg font-semibold">{c.title}</h3>
                    {c.organization?.name && (
                      <p className="mt-1 text-xs text-text-subtle">{c.organization.name}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium capitalize text-brand-300 ring-1 ring-brand-500/20">
                    {c.status}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-text-muted">{c.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-text-subtle">Budget</p>
                    <p className="mt-1 font-semibold">{c.currency} {Number(c.budget).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-text-subtle">Per creator</p>
                    <p className="mt-1 font-semibold">{c.currency} {Number(c.rewardPerCreator).toLocaleString()}</p>
                  </div>
                </div>

                <Link
                  href={`/advertiser/campaigns/${c._id}`}
                  className="mt-auto pt-4 text-sm font-medium text-brand-300 hover:text-brand-200"
                >
                  View campaign →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
