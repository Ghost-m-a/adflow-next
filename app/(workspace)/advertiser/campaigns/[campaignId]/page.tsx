"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
} from "@/components/ui";
import { CheckCircle2, Link2, XCircle } from "lucide-react";

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

type Application = {
  _id: string;
  status: string;
  message: string;
  proposedRate?: number;
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
      setError(err instanceof Error ? err.message : "Unable to update application.");
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
      setNotice("Tracking link generated. Share it with the creator.");
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
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!campaign) {
    return <p className="text-text-muted">Campaign not found.</p>;
  }

  const linkByCreator = new Map(links.map((l) => [l.creatorId, l]));

  return (
    <div className="space-y-6">
      <Link href="/advertiser/campaigns" className="text-xs text-text-muted hover:text-text">
        ← Back to campaigns
      </Link>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
              {campaign.platform} · {campaign.goal}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {campaign.title}
            </h1>
            {campaign.organization?.name && (
              <p className="mt-1 text-sm text-text-muted">{campaign.organization.name}</p>
            )}
          </div>
          <Badge variant="brand">{campaign.status}</Badge>
        </div>
        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-text-muted">
          {campaign.description}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Budget" value={`${campaign.currency} ${campaign.budget.toLocaleString()}`} />
        <Stat label="Per conversion" value={`${campaign.currency} ${campaign.rewardPerCreator.toLocaleString()}`} />
        <Stat label="Creators" value={`${applications.filter((a) => a.status === "accepted").length} / ${campaign.maxCreators}`} />
        <Stat label="Tracking links" value={String(links.length)} />
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

      <section>
        <h2 className="text-lg font-semibold">Creator applications</h2>
        <p className="mt-1 text-sm text-text-muted">
          Accept creators, then generate their unique tracking link.
        </p>

        {applications.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-text-muted">
            No applications yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
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
                          {profile?.displayName || (profile?.username ? `@${profile.username}` : "Creator")}
                        </h3>
                        {profile?.country && (
                          <p className="mt-1 text-xs text-text-subtle">{profile.country}</p>
                        )}
                      </div>
                      <Badge variant={
                        app.status === "accepted" ? "success" :
                        app.status === "rejected" ? "danger" : "warning"
                      }>
                        {app.status}
                      </Badge>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm text-text-muted">
                      {app.message}
                    </p>

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
                      <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
                        {link ? (
                          <>
                            <p className="text-xs uppercase tracking-wide text-text-subtle">
                              Tracking link
                            </p>
                            <p className="mt-1 break-all text-xs">
                              {typeof window !== "undefined" && link.token
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => void generateLink(creatorId)}
                              disabled={generating === creatorId}
                            >
                              Regenerate
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-text-muted">
                              Set the destination URL for this creator. Their tracking link
                              will redirect there.
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
                                <Link2 size={15} /> Generate link
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className="mt-1.5 font-semibold">{value}</p>
    </div>
  );
}
