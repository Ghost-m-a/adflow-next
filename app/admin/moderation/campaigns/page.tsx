"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Eye, RefreshCw, XCircle } from "lucide-react";

type Campaign = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  moderationStatus: "pending" | "approved" | "rejected" | "not_required";
  moderationNotes?: string;
  organization: { _id: string; name: string; slug: string } | null;
  budget: number;
  currency: string;
  coverImageUrl: string;
  category: string;
  createdAt: string;
  moderatedAt?: string | null;
};

const FILTERS = ["pending", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

export default function AdminCampaignModerationPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openFor, setOpenFor] = useState<Campaign | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/moderation/campaigns?status=${filter}`,
        { cache: "no-store" },
      );
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load queue.");
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load queue.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setWorking(id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/moderation/campaigns/${id}/approve`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to approve.");
      setNotice("Campaign approved and published.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve.");
    } finally {
      setWorking(null);
    }
  }

  async function submitReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!openFor) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }

    setWorking(openFor._id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/moderation/campaigns/${openFor._id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: trimmed }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to reject.");
      setNotice("Campaign sent back to the advertiser as a draft.");
      setOpenFor(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin · Moderation
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Campaign review
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Approve new campaigns before they go live in the marketplace.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium capitalize transition",
              filter === f
                ? "bg-brand-500 text-white"
                : "border border-border bg-surface-2 text-text-muted hover:bg-white/5",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title={`No ${filter} campaigns`}
          description="New campaigns that need a decision will appear here."
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c._id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 gap-4">
                  {c.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverImageUrl}
                      alt=""
                      className="h-16 w-28 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-lg font-black text-brand-300">
                      {c.title.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{c.title}</h3>
                      <Badge
                        variant={filter === "pending" ? "warning" : "danger"}
                      >
                        {c.moderationStatus}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-subtle">
                      {c.organization?.name ?? "—"} · {c.currency}{" "}
                      {c.budget.toLocaleString()} · {c.category || "—"}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                      {c.description}
                    </p>
                    {c.moderationNotes && (
                      <p className="mt-2 text-xs text-red-300">
                        Rejected: {c.moderationNotes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <Link href={`/campaigns/${c.slug}`} target="_blank">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye size={14} /> Preview
                    </Button>
                  </Link>

                  {filter === "pending" && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setOpenFor(c);
                          setReason("");
                          setError("");
                        }}
                      >
                        <XCircle size={14} /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={working === c._id}
                        onClick={() => void approve(c._id)}
                      >
                        <CheckCircle2 size={14} /> Approve
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {openFor && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenFor(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#101522] shadow-2xl"
          >
            <div className="border-b border-white/[0.08] p-5">
              <p className="text-xs uppercase tracking-wider text-red-300">
                Reject campaign
              </p>
              <h2 className="mt-1 text-lg font-semibold">{openFor.title}</h2>
            </div>

            <form onSubmit={submitReject} className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs text-amber-200">
                The campaign will revert to draft and the advertiser will be
                notified with your reason.
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
                minLength={5}
                maxLength={2000}
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Why is this campaign not ready?"
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenFor(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Confirm rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
