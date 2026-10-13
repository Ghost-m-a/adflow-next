"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Sparkles, UserPlus } from "lucide-react";

type ScoredCreator = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  country: string;
  niches: string[];
  isVerified: boolean;
  score: number;
  reasons: Array<{ label: string; weight: number; detail: string }>;
  historical: {
    approvedConversions: number;
    approvalRate: number | null;
    totalEarningsUsd: number;
  };
};

export function SuggestedCreators({ campaignId }: { campaignId: string }) {
  const [creators, setCreators] = useState<ScoredCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/matches?limit=8`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Unable to load suggestions.");
      const data = await res.json();
      setCreators(data.matches ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(creator: ScoredCreator) {
    setInviting(creator.userId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId: creator.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to invite.");
      setNotice(`Invited @${creator.username}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to invite.");
    } finally {
      setInviting(null);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (creators.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-brand-400" />
        <h2 className="text-sm font-semibold">Suggested creators</h2>
        <span className="text-xs text-text-subtle">
          {creators.length} match{creators.length === 1 ? "" : "es"}
        </span>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {creators.map((c) => (
          <Card key={c.userId} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/creators/${c.username}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.avatarUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                      {(c.displayName || c.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.displayName}
                    </p>
                    <p className="truncate text-[11px] text-text-subtle">
                      @{c.username}
                    </p>
                  </div>
                </Link>
                <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                  {Math.round(c.score)}
                </span>
              </div>

              {c.reasons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.reasons.slice(0, 2).map((r) => (
                    <Badge
                      key={r.label}
                      variant={r.weight > 0 ? "brand" : "default"}
                    >
                      {r.label}
                    </Badge>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                disabled={inviting === c.userId}
                onClick={() => void invite(c)}
              >
                <UserPlus size={12} />
                {inviting === c.userId ? "Inviting…" : "Invite"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
