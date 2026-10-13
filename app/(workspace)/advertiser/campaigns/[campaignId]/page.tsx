"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, Input, Skeleton } from "@/components/ui";
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  Lock,
  XCircle,
} from "lucide-react";

type Campaign = {
  _id: string;
  slug: string;
  title: string;
  description: string;
  brief?: string;
  platform: string;
  supportedPlatforms?: string[];
  goal: string;
  status: string;
  budget: number;
  currency: string;
  rewardPerCreator: number;
  maxCreators: number;
  category?: string;
  hashtags?: string[];
  coverImageUrl?: string;
  logoUrl?: string;
  rewardModel?: "per_creator" | "cpm" | "hybrid";
  rewardPerThousand?: number;
  rewardPerVideo?: number;
  minimumPayout?: number;
  referenceMaterials?: string[];
  requirements?: string[];
  organization?: { name?: string; logoUrl?: string } | null;
};

type Application = {
  _id: string;
  status: string;
  message: string;
  createdAt: string;
  creatorId?: string;
  creatorProfileId?: {
    displayName?: string;
    username?: string;
    country?: string;
  } | null;
};

type TrackingLinkRow = {
  _id: string;
  creatorId: string;
  creatorProfile: { username?: string; displayName?: string } | null;
  token: string;
  destinationUrl: string;
  clicks: number;
  conversions: number;
  isActive: boolean;
};

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const router = useRouter();
  const campaignId = params.campaignId;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [links, setLinks] = useState<TrackingLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [destinationDraft, setDestinationDraft] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [inviteEmailOrUsername, setInviteEmailOrUsername] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cRes, aRes, lRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" }),
        fetch(`/api/campaigns/${campaignId}/applications`, { cache: "no-store" }),
        fetch(`/api/campaigns/${campaignId}/tracking-links`, { cache: "no-store" }),
      ]);

      if (cRes.status === 401) {
        router.replace("/login");
        return;
      }

      const cData = await cRes.json();
      if (!cRes.ok) throw new Error(cData.error || "Unable to load campaign.");
      setCampaign(cData.campaign);

      if (aRes.ok) {
        const aData = await aRes.json();
        setApplications(aData.applications || []);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setLinks(lData.links || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(appId: string, status: "accepted" | "rejected") {
    setReviewing(appId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/applications/${appId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update application.");
      setNotice(status === "accepted" ? "Creator accepted." : "Application rejected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update.");
    } finally {
      setReviewing(null);
    }
  }

  async function generateLink(creatorId: string) {
    const destination = destinationDraft[creatorId]?.trim();
    if (!destination || !/^https?:\/\/\S+$/i.test(destination)) {
      setError("Enter a valid destination URL (https://...).");
      return;
    }
    setGenerating(creatorId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/tracking-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creatorId, destinationUrl: destination }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to generate link.");
      setNotice("Tracking link generated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate link.");
    } finally {
      setGenerating(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-[3/1] w-full" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!campaign) return <p className="text-text-muted">Campaign not found.</p>;

  const linkByCreator = new Map(links.map((l) => [l.creatorId, l]));
  const acceptedCount = applications.filter((a) => a.status === "accepted").length;
  const progress = Math.min(
    100,
    campaign.maxCreators > 0 ? (acceptedCount / campaign.maxCreators) * 100 : 0,
  );
  const platforms = campaign.supportedPlatforms?.length
    ? campaign.supportedPlatforms
    : [campaign.platform];

  return (
    <div className="space-y-6">
      <Link
        href="/advertiser/campaigns"
        className="text-xs text-text-muted hover:text-text"
      >
        ← Back to campaigns
      </Link>

      {/* ===================== Hero banner ===================== */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]">
        <div className="relative aspect-[3/1] w-full bg-gradient-to-br from-brand-500/20 via-[#111426] to-[#0b1020]">
          {campaign.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          {/* Top-left platform chips */}
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            {platforms.slice(0, 5).map((p) => (
              <span
                key={p}
                className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-sm"
              >
                {p}
              </span>
            ))}
          </div>

          {/* Bottom row: brand + title */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                {campaign.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={campaign.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded-full border border-white/20 object-cover"
                  />
                ) : campaign.organization?.name ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                    {campaign.organization.name.charAt(0).toUpperCase()}
                  </span>
                ) : null}
                <span className="text-sm font-medium text-white">
                  {campaign.organization?.name ?? "Campaign"}
                </span>
                <Badge variant="brand">{campaign.status}</Badge>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {campaign.title}
              </h1>

              {campaign.hashtags && campaign.hashtags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {campaign.hashtags.map((h) => (
                    <span key={h} className="text-xs font-medium text-white/70">
                      #{h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== Action row ===================== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300">
            {campaign.rewardModel ?? "per_creator"}
          </span>
          <span className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-text-muted">
            {campaign.category ?? "Uncategorized"}
          </span>
          <span className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-text-muted">
            {platforms.length} platform{platforms.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex gap-2">
          <a
            href={`/campaigns/${campaign.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-white/5 hover:text-text"
          >
            <ExternalLink size={14} />
            Preview public page
          </a>
        </div>
      </div>

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

      {/* ===================== Rate cards per platform ===================== */}
      <div className="grid gap-4 sm:grid-cols-3">
        {platforms.slice(0, 3).map((p) => (
          <Card key={p}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                {p}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <Rate label="Per 1K views" value={`${campaign.currency} ${(campaign.rewardPerThousand ?? 0).toFixed(2)}`} />
                <Rate label="Per video" value={`${campaign.currency} ${(campaign.rewardPerVideo ?? 0).toFixed(2)}`} />
                <Rate label="Min payout" value={`${campaign.currency} ${(campaign.minimumPayout ?? 0).toFixed(2)}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===================== Budget progress ===================== */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-subtle">
                Budget used
              </p>
              <p className="mt-1 text-2xl font-bold">
                {campaign.currency} 0.00
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-text-subtle">
                Total budget
              </p>
              <p className="mt-1 text-lg font-semibold text-text-muted">
                {campaign.currency} {campaign.budget.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: "0%" }} />
          </div>

          <p className="mt-3 text-xs text-text-subtle">
            {acceptedCount} of {campaign.maxCreators} slots filled
          </p>
        </CardContent>
      </Card>

      {/* ===================== Content & reference ===================== */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold">
              Content requirements
              <span className="ml-2 text-xs font-normal text-text-subtle">
                {(campaign.requirements?.length ?? 0)} required
              </span>
            </h2>
            {campaign.requirements && campaign.requirements.length > 0 ? (
              <ol className="mt-4 space-y-2 text-sm text-text-muted">
                {campaign.requirements.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-text-subtle">{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-text-subtle">No requirements set.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Reference materials
              <Lock size={12} className="text-text-subtle" />
              <span className="text-xs font-normal text-text-subtle">
                {campaign.referenceMaterials?.length ?? 0} file
                {campaign.referenceMaterials?.length === 1 ? "" : "s"}
              </span>
            </h2>
            {campaign.referenceMaterials && campaign.referenceMaterials.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-text-muted">
                {campaign.referenceMaterials.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Link2 size={13} className="shrink-0 text-text-subtle" />
                    <a
                      href={r}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-brand-300 hover:text-brand-200"
                    >
                      {r}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-text-subtle">No reference materials.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===================== Description / brief ===================== */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Brief</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-muted">
            {campaign.description}
          </p>
          {campaign.brief && (
            <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-6 text-text-muted">
              {campaign.brief}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ===================== Applications ===================== */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Creator applications</h2>
            <p className="mt-1 text-sm text-text-muted">
              Accept creators, then generate their tracking link.
            </p>
          </div>
          <span className="text-sm text-text-subtle">
            {applications.length} application
            {applications.length === 1 ? "" : "s"}
          </span>
        </div>

        {applications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-text-muted">
            No applications yet.
          </p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const profile = app.creatorProfileId;
              const creatorId = app.creatorId ?? "";
              const link = creatorId ? linkByCreator.get(creatorId) : undefined;
              const isPending = app.status === "pending";
              const isAccepted = app.status === "accepted";

              return (
                <Card key={app._id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {profile?.displayName ||
                            (profile?.username ? `@${profile.username}` : "Creator")}
                        </h3>
                        {profile?.country && (
                          <p className="mt-1 text-xs text-text-subtle">
                            {profile.country}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          app.status === "accepted"
                            ? "success"
                            : app.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {app.status}
                      </Badge>
                    </div>

                    {app.message && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-text-muted">
                        {app.message}
                      </p>
                    )}

                    {isPending && (
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={reviewing === app._id}
                          onClick={() => void review(app._id, "rejected")}
                        >
                          <XCircle size={14} /> Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={reviewing === app._id}
                          onClick={() => void review(app._id, "accepted")}
                        >
                          <CheckCircle2 size={14} /> Accept
                        </Button>
                      </div>
                    )}

                    {isAccepted && (
                      <div className="mt-4 rounded-xl border border-border bg-white/[0.02] p-4">
                        {link ? (
                          <>
                            <p className="text-xs uppercase tracking-wide text-text-subtle">
                              Tracking link
                            </p>
                            <p className="mt-1 break-all text-xs">
                              {typeof window !== "undefined"
                                ? `${window.location.origin}/r/${link.token}`
                                : "—"}
                            </p>
                            <p className="mt-3 text-xs text-text-muted">
                              Destination:{" "}
                              <span className="break-all">{link.destinationUrl}</span>
                            </p>
                            <div className="mt-3 flex gap-3 text-xs">
                              <span className="rounded-lg bg-white/[0.04] px-2 py-1">
                                {link.clicks} clicks
                              </span>
                              <span className="rounded-lg bg-white/[0.04] px-2 py-1">
                                {link.conversions} conversions
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-text-muted">
                              Set the destination URL. Their tracking link will redirect
                              there.
                            </p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <Input
                                value={destinationDraft[creatorId] ?? ""}
                                onChange={(e) =>
                                  setDestinationDraft((d) => ({
                                    ...d,
                                    [creatorId]: e.target.value,
                                  }))
                                }
                                placeholder="https://your-site.com/landing"
                              />
                              <Button
                                onClick={() => void generateLink(creatorId)}
                                disabled={generating === creatorId}
                              >
                                <Link2 size={15} />
                                Generate
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================== Invite a creator ===================== */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Invite a creator</h2>
          <p className="mt-1 text-sm text-text-muted">
            Send a direct invitation. When accepted, the creator joins the campaign automatically.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={inviteEmailOrUsername}
              onChange={(e) => setInviteEmailOrUsername(e.target.value)}
              placeholder="Creator username or email"
            />
            <Button
              disabled={inviting || inviteEmailOrUsername.trim().length < 3}
              onClick={async () => {
                setInviting(true);
                setError("");
                setNotice("");
                try {
                  // Look up the creator by username via the public profiles endpoint.
                  const lookup = await fetch(
                    `/api/creators/${encodeURIComponent(inviteEmailOrUsername.trim().replace(/^@/, ""))}`,
                    { cache: "no-store" },
                  );
                  if (!lookup.ok) {
                    throw new Error("Creator not found by that username.");
                  }
                  const profileData = await lookup.json();
                  const creatorUserId = profileData?.profile?.userId;
                  if (!creatorUserId) {
                    throw new Error("Creator not found.");
                  }

                  const res = await fetch(
                    `/api/campaigns/${campaignId}/invitations`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ creatorId: creatorUserId }),
                    },
                  );
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Unable to invite.");

                  setNotice("Invitation sent.");
                  setInviteEmailOrUsername("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Unable to invite.");
                } finally {
                  setInviting(false);
                }
              }}
            >
              {inviting ? "Sending…" : "Send invite"}
            </Button>
          </div>

          <p className="mt-2 text-xs text-text-subtle">
            Tip: browse <Link href="/creators" className="text-brand-300 hover:text-brand-200">creators</Link> and copy their username.
          </p>
        </CardContent>
      </Card>

      {/* ===================== Progress vs slots ===================== */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Slots filled</h2>
            <span className="text-sm text-text-muted">
              {acceptedCount} / {campaign.maxCreators}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Rate({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-subtle">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
