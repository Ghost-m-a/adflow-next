"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Skeleton,
} from "@/components/ui";
import { FileCheck2, Plus, Send, X } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/uploads/FileUpload";

type Campaign = {
  _id: string;
  title: string;
  slug: string;
  currency: string;
  rewardPerCreator: number;
  status: string;
};

type Submission = {
  _id: string;
  campaign: { _id: string; title: string; slug: string; currency: string } | null;
  title: string;
  description: string;
  contentType: string;
  contentUrl: string;
  rewardAmount: number;
  rewardCurrency: string;
  status: "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
  submittedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

const STATUS_TABS = [
  "all",
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "rejected",
] as const;

const CONTENT_TYPES = ["post", "video", "story", "reel", "article", "newsletter", "other"];

export default function CreatorSubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [eligible, setEligible] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_TABS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/creator/submissions", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load submissions.");
      setSubmissions(data.submissions || []);
      setEligible(data.eligibleCampaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitForReview(id: string) {
    setWorking(id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/submissions/${id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to submit.");
      setNotice("Submission sent for review.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit.");
    } finally {
      setWorking(null);
    }
  }

  const visible = submissions.filter(
    (s) => filter === "all" || s.status === filter,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Content submissions
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Submit your published content for accepted campaigns and track approval.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Close form" : "New submission"}
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">New submission</h2>
            <SubmissionForm
              eligible={eligible}
              onCreated={() => {
                setShowForm(false);
                setNotice("Draft created. Submit it for review when ready.");
                void load();
              }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
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
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 size={20} />}
          title={submissions.length ? `No ${filter.replace("_", " ")} submissions` : "No submissions yet"}
          description={
            submissions.length
              ? "Try another filter."
              : "Once you're accepted into a campaign, you can submit your published content here."
          }
          action={
            !submissions.length && eligible.length > 0 ? (
              <Button onClick={() => setShowForm(true)}>Create submission</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((s) => (
            <Card key={s._id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{s.title}</h3>
                    <p className="mt-1 text-xs text-text-subtle">
                      {s.campaign?.title ?? "Campaign"} ·{" "}
                      {s.contentType} ·{" "}
                      {s.rewardCurrency} {s.rewardAmount.toFixed(2)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      s.status === "approved" ? "success" :
                      s.status === "rejected" ? "danger" :
                      s.status === "submitted" ? "info" :
                      s.status === "changes_requested" ? "warning" : "default"
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

                {s.reviewNotes && (
                  <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs text-amber-200">
                    Reviewer: {s.reviewNotes}
                  </p>
                )}

                {(s.status === "draft" || s.status === "changes_requested") && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      disabled={working === s._id}
                      onClick={() => void submitForReview(s._id)}
                    >
                      <Send size={14} />
                      {working === s._id ? "Submitting…" : "Submit for review"}
                    </Button>
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

function SubmissionForm({
  eligible,
  onCreated,
  onCancel,
}: {
  eligible: Campaign[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [campaignId, setCampaignId] = useState(eligible[0]?._id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("post");
  const [contentUrl, setContentUrl] = useState("");
  const [thumbnail, setThumbnail] = useState<UploadedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          contentType,
          contentUrl: contentUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.map((i: { message: string }) => i.message).join(" ");
        throw new Error(detail || data.error || "Unable to create submission.");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create submission.");
    } finally {
      setSaving(false);
    }
  }

  if (eligible.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">
        You don&apos;t have any accepted campaigns yet. Apply to a campaign first.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Campaign</label>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
          required
        >
          {eligible.map((c) => (
            <option key={c._id} value={c._id}>
              {c.title} · {c.currency} {c.rewardPerCreator}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Instagram Reel — product review"
        required
        minLength={3}
        maxLength={200}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the content, key messages, and how it fits the campaign."
          rows={4}
          minLength={10}
          maxLength={2000}
          required
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Content type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <Input
          label="Content URL"
          type="url"
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          placeholder="https://..."
          required
        />
      </div>

      <FileUpload
        kind="submission-thumbnail"
        label="Thumbnail (optional)"
        helper="A preview image for the submitted content"
        preview="wide"
        value={thumbnail}
        onChange={setThumbnail}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save draft
        </Button>
      </div>
    </form>
  );
}
