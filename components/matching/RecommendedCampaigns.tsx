"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, CardContent, Skeleton } from "@/components/ui";
import { Sparkles } from "lucide-react";

type ScoredCampaign = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  currency: string;
  rewardPerThousand: number;
  budget: number;
  coverImageUrl: string;
  score: number;
  reasons: Array<{ label: string; weight: number; detail: string }>;
};

export function RecommendedCampaigns() {
  const [campaigns, setCampaigns] = useState<ScoredCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/creator/matches", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setCampaigns((data.matches ?? []).slice(0, 6));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-brand-400" />
        <h2 className="text-lg font-semibold">Recommended for you</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <Link
            key={c._id}
            href={`/campaigns/${c.slug}`}
            className="group block overflow-hidden rounded-2xl border border-border bg-surface-1 transition hover:-translate-y-0.5 hover:border-brand-400/40"
          >
            <div className="relative aspect-[16/9] bg-gradient-to-br from-brand-500/20 via-surface-2 to-canvas">
              {c.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-black text-white/10">
                  {c.title.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute right-3 top-3 rounded-full bg-brand-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {Math.round(c.score)} pts
              </span>
            </div>

            <CardContent className="p-4">
              {c.category && (
                <p className="text-[11px] uppercase tracking-wider text-text-subtle">
                  {c.category}
                </p>
              )}
              <h3 className="mt-1 line-clamp-2 font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm font-medium">
                {c.currency} {c.rewardPerThousand.toFixed(2)}/1K
              </p>

              {c.reasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.reasons.slice(0, 2).map((r) => (
                    <Badge key={r.label} variant={r.weight > 0 ? "brand" : "default"}>
                      {r.label}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Link>
        ))}
      </div>
    </section>
  );
}
