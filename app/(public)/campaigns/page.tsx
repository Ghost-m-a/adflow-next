"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, EmptyState, Input } from "@/components/ui";
import { Compass, Sparkles } from "lucide-react";

type Campaign = {
  _id: string;
  slug: string;
  title: string;
  description: string;
  platform: string;
  supportedPlatforms: string[];
  goal: string;
  category: string;
  coverImageUrl: string;
  logoUrl: string;
  currency: string;
  rewardPerThousand: number;
  rewardPerCreator: number;
  rewardModel: "per_creator" | "cpm" | "hybrid";
  budget: number;
  maxCreators: number;
  hashtags: string[];
  organization: { name?: string; logoUrl?: string; isVerified?: boolean } | null;
};

const PLATFORM_FILTERS = [
  { value: "", label: "All platforms" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "twitch", label: "Twitch" },
  { value: "x", label: "X" },
];

const GOAL_FILTERS = [
  { value: "", label: "All goals" },
  { value: "awareness", label: "Awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "sales", label: "Sales" },
  { value: "content", label: "Content" },
];

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶",
  instagram: "◉",
  tiktok: "♪",
  facebook: "f",
  x: "𝕏",
  twitch: "◈",
  blog: "¶",
  other: "●",
};

export default function PublicCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (platform) params.set("platform", platform);
      if (goal) params.set("goal", goal);

      const res = await fetch(`/api/marketplace/campaigns?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load campaigns.");
      setCampaigns(data.campaigns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, [q, platform, goal]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void load();
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
          Public directory
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Browse campaigns</h1>
        <p className="mt-3 max-w-2xl text-text-muted">
          Active content-rewards campaigns from advertisers. Join, publish, and earn.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-surface-1 p-4 md:grid-cols-[1fr_180px_180px_auto]"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search campaigns..."
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
        >
          {PLATFORM_FILTERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
        >
          {GOAL_FILTERS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-text-muted">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<Compass size={20} />}
            title="No matching campaigns yet"
            description="Try another search, or check back when advertisers publish new campaigns."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => {
              const platforms =
                c.supportedPlatforms?.length
                  ? c.supportedPlatforms
                  : c.platform
                    ? [c.platform]
                    : [];
              const isCpm =
                c.rewardModel === "cpm" || c.rewardModel === "hybrid";

              return (
                <Link
                  key={c._id}
                  href={`/campaigns/${c.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d111c] transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-500/20 via-[#111426] to-[#0b1020]">
                    {c.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl font-black text-white/10">
                        {c.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {platforms.slice(0, 3).map((p) => (
                        <span
                          key={p}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-[10px] font-bold text-white backdrop-blur-sm"
                        >
                          {PLATFORM_ICONS[p] ?? p.charAt(0).toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Active
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-text-subtle">
                      {c.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.logoUrl}
                          alt=""
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ) : c.organization?.name ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/20 text-[8px] font-bold text-brand-300">
                          {c.organization.name.charAt(0).toUpperCase()}
                        </span>
                      ) : null}
                      <span className="truncate">
                        {c.category || c.organization?.name || "Campaign"}
                      </span>
                    </div>

                    <h3 className="mt-2 line-clamp-2 font-semibold">{c.title}</h3>

                    <div className="mt-3 flex items-baseline gap-3">
                      <span className="text-lg font-bold">
                        {isCpm
                          ? `${c.currency} ${(c.rewardPerThousand ?? 0).toFixed(2)}/1K`
                          : `${c.currency} ${c.rewardPerCreator.toFixed(2)}`}
                      </span>
                      <span className="text-sm text-text-muted">
                        {c.budget >= 1000
                          ? `${c.currency} ${(c.budget / 1000).toFixed(1)}K`
                          : `${c.currency} ${c.budget.toLocaleString()}`}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {c.hashtags?.slice(0, 3).map((h) => (
                        <span
                          key={h}
                          className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-text-muted"
                        >
                          #{h}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 transition group-hover:text-brand-200">
                      <Sparkles size={14} /> View campaign
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
