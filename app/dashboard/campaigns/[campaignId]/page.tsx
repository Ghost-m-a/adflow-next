"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CampaignEditForm from "@/components/campaigns/CampaignEditForm";

type Campaign = {
  _id: string;
  title: string;
  description: string;
  brief?: string;
  platform: string;
  goal: string;
  status: string;
  budget: number;
  currency: string;
  rewardPerCreator: number;
  maxCreators: number;
  applicationDeadline?: string;
  startsAt?: string;
  endsAt?: string;
  targetNiches?: string[];
  targetCountries?: string[];
  requirements?: string[];
  isPublic: boolean;
  organization?: { name?: string } | null;
};

type CreatorProfile = {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  country?: string;
  niches?: string[];
  socialLinks?: { platform: string; url: string; handle?: string }[];
};

type Application = {
  _id: string;
  status: string;
  message: string;
  proposedRate?: number;
  createdAt: string;
  creatorProfileId: CreatorProfile | null;
};

export default function CampaignDetailsPage() {
  const params = useParams<{ campaignId: string }>();
  const router = useRouter();
  const campaignId = params.campaignId;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const campaignResponse = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}`,
        { cache: "no-store" },
      );

      if (campaignResponse.status === 401) {
        router.replace("/login");
        return;
      }

      const campaignData = await campaignResponse.json();

      if (!campaignResponse.ok) {
        throw new Error(campaignData.error || "Unable to load campaign.");
      }

      setCampaign(campaignData.campaign);

      const applicationResponse = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/applications`,
        { cache: "no-store" },
      );

      if (applicationResponse.status === 401) {
        router.replace("/login");
        return;
      }

      const applicationData = await applicationResponse.json();

      if (!applicationResponse.ok) {
        throw new Error(
          applicationData.error || "Unable to load creator applications.",
        );
      }

      setApplications(applicationData.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function reviewApplication(
    applicationId: string,
    status: "accepted" | "rejected",
  ) {
    setReviewingId(applicationId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to review application.");
      }

      setApplications((current) =>
        current.map((application) =>
          application._id === applicationId
            ? { ...application, status: data.application.status }
            : application,
        ),
      );

      setNotice(
        status === "accepted"
          ? "Creator accepted successfully."
          : "Application rejected successfully.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review application.");
    } finally {
      setReviewingId("");
    }
  }

  async function changeCampaignStatus(status: "active" | "paused" | "cancelled") {
    if (!campaign) return;

    if (
      status === "cancelled" &&
      !window.confirm("Cancel this campaign? Creators will no longer be able to apply.")
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update campaign.");
      }

      setCampaign(data.campaign);
      setNotice(`Campaign status changed to ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update campaign.");
    }
  }

  const acceptedCount = applications.filter(
    (application) => application.status === "accepted",
  ).length;

  const pendingCount = applications.filter(
    (application) => application.status === "pending",
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-sm text-violet-300 hover:text-violet-200"
        >
          ← Back to dashboard
        </Link>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading campaign…</div>
        ) : !campaign ? (
          <div className="py-20 text-center text-gray-400">Campaign unavailable.</div>
        ) : (
          <>
            {editing && !["completed", "cancelled"].includes(campaign.status) && (
              <CampaignEditForm
                campaign={campaign}
                onSaved={(updatedCampaign) => {
                  setCampaign((current) =>
                    current
                      ? { ...current, ...updatedCampaign }
                      : current,
                  );
                  setEditing(false);
                  setNotice("Campaign updated successfully.");
                  setError("");
                }}
                onCancel={() => setEditing(false)}
              />
            )}

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                    {campaign.platform} · {campaign.goal}
                  </p>
                  <h1 className="mt-2 break-words text-3xl font-bold">
                    {campaign.title}
                  </h1>
                  {campaign.organization?.name && (
                    <p className="mt-2 text-sm text-gray-400">
                      {campaign.organization.name}
                    </p>
                  )}
                  <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-gray-300">
                    {campaign.description}
                  </p>
                  {campaign.brief && (
                    <div className="mt-5">
                      <h2 className="font-semibold">Creator brief</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                        {campaign.brief}
                      </p>
                    </div>
                  )}
                </div>

                <span className="w-fit shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-sm capitalize text-gray-200">
                  {campaign.status}
                </span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Budget", `${campaign.currency} ${Number(campaign.budget).toLocaleString()}`],
                  ["Per creator", `${campaign.currency} ${Number(campaign.rewardPerCreator).toLocaleString()}`],
                  ["Accepted creators", `${acceptedCount} / ${campaign.maxCreators}`],
                  ["Pending applications", String(pendingCount)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-black/20 p-4">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-2 font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {!["completed", "cancelled"].includes(campaign.status) && (
                  <button
                    type="button"
                    onClick={() => setEditing((current) => !current)}
                    className="rounded-xl border border-violet-400/30 px-4 py-2.5 text-sm text-violet-200 hover:bg-violet-400/10"
                  >
                    {editing ? "Hide editor" : "Edit campaign"}
                  </button>
                )}

                {campaign.status === "active" && (
                  <button
                    onClick={() => void changeCampaignStatus("paused")}
                    className="rounded-xl border border-amber-400/20 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-400/10"
                  >
                    Pause campaign
                  </button>
                )}

                {(campaign.status === "paused" || campaign.status === "draft") && (
                  <button
                    onClick={() => void changeCampaignStatus("active")}
                    className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold hover:bg-violet-400"
                  >
                    Publish / activate
                  </button>
                )}

                {["draft", "active", "paused"].includes(campaign.status) && (
                  <button
                    onClick={() => void changeCampaignStatus("cancelled")}
                    className="rounded-xl border border-red-400/20 px-4 py-2.5 text-sm text-red-200 hover:bg-red-400/10"
                  >
                    Cancel campaign
                  </button>
                )}

                <button
                  onClick={() => void loadData()}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5"
                >
                  Refresh
                </button>
              </div>
            </section>

            <section className="mt-10">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-bold">Creator applications</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Review applicants and manage creator slots.
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {applications.length} application{applications.length === 1 ? "" : "s"}
                </span>
              </div>

              {applications.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-gray-400">
                  No applications yet. Applications will appear here when creators apply.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {applications.map((application) => {
                    const creator = application.creatorProfileId;
                    const pending = application.status === "pending";

                    return (
                      <article
                        key={application._id}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold">
                              {creator?.displayName || creator?.username || "Creator"}
                            </h3>
                            {creator?.username && (
                              <p className="mt-1 text-sm text-violet-300">
                                @{creator.username}
                              </p>
                            )}
                            {creator?.country && (
                              <p className="mt-1 text-xs text-gray-500">
                                Country: {creator.country}
                              </p>
                            )}
                            {!!creator?.niches?.length && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {creator.niches.map((niche) => (
                                  <span key={niche} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                                    {niche}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className={`w-fit rounded-full px-3 py-1.5 text-xs capitalize ${
                            application.status === "accepted"
                              ? "bg-emerald-400/10 text-emerald-200"
                              : application.status === "rejected"
                                ? "bg-red-400/10 text-red-200"
                                : "bg-amber-400/10 text-amber-200"
                          }`}>
                            {application.status}
                          </span>
                        </div>

                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                          {application.message}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span>
                            Applied: {new Date(application.createdAt).toLocaleDateString()}
                          </span>
                          {application.proposedRate != null && (
                            <span>
                              Proposed rate: {campaign.currency} {Number(application.proposedRate).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {!!creator?.socialLinks?.length && (
                          <div className="mt-4 flex flex-wrap gap-3">
                            {creator.socialLinks.map((link, index) => (
                              <a
                                key={`${link.platform}-${index}`}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-violet-300 underline hover:text-violet-200"
                              >
                                {link.platform}
                                {link.handle ? ` · ${link.handle}` : ""}
                              </a>
                            ))}
                          </div>
                        )}

                        {pending && (
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              disabled={!!reviewingId}
                              onClick={() => void reviewApplication(application._id, "accepted")}
                              className="rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                            >
                              {reviewingId === application._id ? "Processing…" : "Accept creator"}
                            </button>
                            <button
                              disabled={!!reviewingId}
                              onClick={() => void reviewApplication(application._id, "rejected")}
                              className="rounded-xl border border-red-400/20 px-4 py-2.5 text-sm text-red-200 hover:bg-red-400/10 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
  );
}
