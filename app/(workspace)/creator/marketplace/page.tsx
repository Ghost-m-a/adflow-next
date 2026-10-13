"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Input } from "@/components/ui";
import { Compass } from "lucide-react";

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
  applicationDeadline?: string;
  organization?: { name?: string } | null;
};

type Application = {
  _id: string;
  status: string;
  createdAt: string;
  campaignId: { title?: string } | string;
};

export default function MarketplacePage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (platform) params.set("platform", platform);
      if (goal) params.set("goal", goal);

      const [campaignsRes, appsRes] = await Promise.all([
        fetch(`/api/marketplace/campaigns?${params}`, { cache: "no-store" }),
        fetch("/api/creator/applications", { cache: "no-store" }),
      ]);

      if (campaignsRes.status === 401) {
        router.replace("/login");
        return;
      }

      const campaignsData = await campaignsRes.json();
      if (!campaignsRes.ok) {
        throw new Error(campaignsData.error || "Unable to load campaigns.");
      }
      setCampaigns(campaignsData.campaigns || []);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load marketplace.");
    } finally {
      setLoading(false);
    }
  }, [query, platform, goal, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
          ADFLOW Marketplace
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Find your next collaboration
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Discover active campaigns from advertisers and apply with a message about why you&apos;re a good fit.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-surface-1 p-4 md:grid-cols-[1fr_180px_180px_auto]"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search campaigns..."
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
        >
          <option value="">All platforms</option>
          {["instagram", "tiktok", "youtube", "facebook", "x", "twitch", "blog", "other"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
        >
          <option value="">All goals</option>
          {["awareness", "engagement", "traffic", "leads", "sales", "content"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Available campaigns</h2>
          <span className="text-sm text-text-subtle">{campaigns.length} found</span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center text-sm text-text-muted">
            Finding campaigns…
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<Compass size={20} />}
            title="No matching campaigns yet"
            description="Try another search or check back when advertisers publish new campaigns."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((c) => (
              <Card key={c._id}>
                <CardContent className="flex h-full flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-300">
                    {c.platform} · {c.goal}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{c.title}</h3>
                  {c.organization?.name && (
                    <p className="mt-1 text-xs text-text-subtle">{c.organization.name}</p>
                  )}
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
                    href={`/campaigns/${c._id}`}
                    className="mt-4 inline-flex rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    View campaign
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">My applications</h2>
        <p className="mt-1 text-sm text-text-muted">Your submitted applications and their current status.</p>

        {applications.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-surface-1 p-6 text-sm text-text-muted">
            No applications to show. Apply to a campaign to get started.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            {applications.map((a) => {
              const campaign = typeof a.campaignId === "object" ? a.campaignId : null;
              return (
                <div
                  key={a._id}
                  className="flex flex-col justify-between gap-3 border-b border-border bg-surface-1 p-4 last:border-b-0 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium">{campaign?.title || "Campaign"}</p>
                    <p className="mt-1 text-xs text-text-subtle">
                      Applied {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={[
                      "self-start rounded-full px-3 py-1 text-xs capitalize sm:self-auto",
                      a.status === "accepted"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : a.status === "rejected"
                          ? "bg-red-400/10 text-red-300"
                          : "bg-amber-400/10 text-amber-200",
                    ].join(" ")}
                  >
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
