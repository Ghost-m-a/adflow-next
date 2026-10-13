"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Skeleton,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileVideo2, MessageSquare, RefreshCw, XCircle } from "lucide-react";

type Submission = {
  _id: string;
  campaign: { _id: string; title: string; slug: string } | null;
  creator: { username: string; displayName?: string } | null;
  title: string;
  description: string;
  contentType: string;
  contentUrl: string;
  rewardAmount: number;
  rewardCurrency: string;
  status: "submitted" | "approved" | "rejected" | "changes_requested" | "draft";
  submittedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

const FILTERS = ["submitted", "changes_requested", "approved", "rejected", "all"] as const;

export default function AdvertiserSubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("submitted");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/advertiser/submissions?status=${filter}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load submissions.");
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(
    id: string,
    decision: "approve" | "reject" | "request_changes",
  ) {
    const notes = (draftNotes[id] ?? "").trim();
    if (decision === "reject" && !notes) {
      setError("A reason is required when rejecting.");
      return;
    }

    setWorking(id);
    setError("");
    try {
      const res = await fetch(`/api/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to review.");
      setDraftNotes((d) => ({ ...d, [id]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Content review
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Submissions
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Review creator content submitted against your campaigns.
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
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={<FileVideo2 size={20} />}
          title={filter === "submitted" ? "No submissions awaiting review" : "No submissions found"}
          description={
            filter === "submitted"
              ? "When accepted creators submit content, it will appear here for review."
              : "Try another filter."
          }
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <Card key={s._id}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{s.title}</h3>
                    <p className="mt-1 text-xs text-text-subtle">
                      {s.campaign?.title ?? "Campaign"} ·{" "}
                      {s.creator?.displayName ||
                        (s.creator?.username ? `@${s.creator.username}` : "Creator")}{" "}
                      · {s.contentType}
                    </p>
                  </div>
                  <Badge
                    variant={
                      s.status === "approved" ? "success" :
                      s.status === "rejected" ? "danger" :
                      s.status === "submitted" ? "info" : "warning"
                    }
                  >
                    {s.status.replace("_", " ")}
                  </Badge>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-text-muted">
                  {s.description}
                </p>

                <a
                  href={s.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block break-all text-sm text-brand-300 hover:text-brand-200"
                >
                  {s.contentUrl}
                </a>

                <p className="mt-3 text-sm text-text-muted">
                  Reward: {s.rewardCurrency} {s.rewardAmount.toFixed(2)}
                </p>

                {s.reviewNotes && (
                  <p className="mt-3 rounded-xl border border-border bg-white/[0.03] p-3 text-xs text-text-muted">
                    Notes: {s.reviewNotes}
                  </p>
                )}

                {s.status === "submitted" && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <Input
                      value={draftNotes[s._id] ?? ""}
                      onChange={(e) =>
                        setDraftNotes((d) => ({ ...d, [s._id]: e.target.value }))
                      }
                      placeholder="Optional notes, or required reason for rejection"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={working === s._id}
                        onClick={() => void review(s._id, "request_changes")}
                      >
                        <MessageSquare size={14} /> Request changes
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={working === s._id}
                        onClick={() => void review(s._id, "reject")}
                      >
                        <XCircle size={14} /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={working === s._id}
                        onClick={() => void review(s._id, "approve")}
                      >
                        <CheckCircle2 size={14} />
                        {working === s._id ? "Approving…" : "Approve & pay"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
