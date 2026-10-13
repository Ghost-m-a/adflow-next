"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, EmptyState } from "@/components/ui";
import { Users } from "lucide-react";

type Application = {
  _id: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  message?: string;
  proposedRate?: number;
  createdAt?: string;
  campaignId?: string;
  creatorProfileId?: {
    displayName?: string;
    username?: string;
    country?: string;
    niches?: string[];
  } | null;
};

type Campaign = { _id: string; title: string };

const STATUS_FILTERS = ["all", "pending", "accepted", "rejected", "withdrawn"] as const;

export default function AdvertiserApplicationsPage() {
  const [items, setItems] = useState<{ app: Application; campaign: Campaign }[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cRes = await fetch("/api/campaigns", { cache: "no-store" });
      const cData = await cRes.json();
      if (!cRes.ok) throw new Error(cData.error || "Unable to load campaigns.");
      const camps: Campaign[] = cData.campaigns || [];

      const results = await Promise.all(
        camps.map(async (c) => {
          const r = await fetch(`/api/campaigns/${c._id}/applications`, { cache: "no-store" });
          if (r.status === 403 || r.status === 404) return [];
          if (!r.ok) return [];
          const d = await r.json();
          return (d.applications || []).map((app: Application) => ({ app, campaign: c }));
        })
      );
      setItems(results.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(campaignId: string, applicationId: string, status: "accepted" | "rejected") {
    const key = `${campaignId}:${applicationId}`;
    setUpdating(key);
    setError("");
    try {
      const r = await fetch(`/api/campaigns/${campaignId}/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to update.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update.");
    } finally {
      setUpdating(null);
    }
  }

  const visible = items.filter(({ app }) => filter === "all" || app.status === filter);
  const pendingCount = items.filter(({ app }) => app.status === "pending").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Campaign management
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Creator applications
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Review applicants and manage your campaign partnerships.
          </p>
        </div>
        <Link href="/advertiser/campaigns">
          <Button variant="outline">View campaigns</Button>
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-text-muted">Total applications</p><p className="mt-2 text-3xl font-bold">{items.length}</p></CardContent></Card>
        <Card className="border-amber-400/20 bg-amber-400/[0.06]"><CardContent className="p-5"><p className="text-sm text-amber-300">Awaiting review</p><p className="mt-2 text-3xl font-bold text-amber-200">{pendingCount}</p></CardContent></Card>
        <Card className="border-emerald-400/20 bg-emerald-400/[0.06]"><CardContent className="p-5"><p className="text-sm text-emerald-300">Accepted</p><p className="mt-2 text-3xl font-bold text-emerald-200">{items.filter(({app}) => app.status === "accepted").length}</p></CardContent></Card>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium capitalize transition",
              filter === s
                ? "bg-brand-500 text-white"
                : "border border-border bg-surface-2 text-text-muted hover:bg-white/5",
            ].join(" ")}
          >
            {s === "all" ? "All applications" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading applications…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No applications found"
          description={filter === "all" ? "Applications submitted to campaigns you manage will appear here." : `No ${filter} applications.`}
          action={<Link href="/advertiser/campaigns"><Button>Go to campaigns</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {visible.map(({ app, campaign }) => {
            const profile = app.creatorProfileId;
            const key = `${campaign._id}:${app._id}`;
            const isPending = app.status === "pending";
            return (
              <Card key={key}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500/15 font-bold text-brand-300">
                        {(profile?.displayName || profile?.username || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold">
                          {profile?.displayName || (profile?.username ? `@${profile.username}` : "Creator")}
                        </h2>
                        {profile?.country && <p className="mt-1 text-xs text-text-subtle">{profile.country}</p>}
                      </div>
                    </div>
                    <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold capitalize text-brand-300">
                      {app.status}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-text-subtle">Applied to</p>
                    <Link href={`/advertiser/campaigns/${campaign._id}`} className="mt-1 inline-block font-semibold text-brand-300 hover:underline">
                      {campaign.title}
                    </Link>
                    {app.message && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-muted">{app.message}</p>}
                  </div>

                  {isPending && (
                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={updating === key}
                        onClick={() => void review(campaign._id, app._id, "rejected")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={updating === key}
                        onClick={() => void review(campaign._id, app._id, "accepted")}
                      >
                        {updating === key ? "Updating…" : "Accept creator"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
