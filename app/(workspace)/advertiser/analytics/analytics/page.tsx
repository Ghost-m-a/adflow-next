"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Campaign = {
  _id: string;
  title: string;
  status: string;
  budget?: number;
  currency?: string;
  maxCreators?: number;
  rewardPerCreator?: number;
};

type Application = {
  _id: string;
  status: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/campaigns", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load campaign analytics.");
      }

      const campaignList: Campaign[] = data.campaigns || [];
      setCampaigns(campaignList);

      const applicationResults = await Promise.all(
        campaignList.map(async (campaign) => {
          try {
            const result = await fetch(
              `/api/campaigns/${campaign._id}/applications`,
              { cache: "no-store" }
            );

            if (!result.ok) return [];

            const resultData = await result.json();
            return (resultData.applications || []) as Application[];
          } catch {
            return [];
          }
        })
      );

      setApplications(applicationResults.flat());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load analytics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const completedCampaigns = campaigns.filter(
    (c) => c.status === "completed"
  );
  const pendingApplications = applications.filter(
    (a) => a.status === "pending"
  );
  const acceptedApplications = applications.filter(
    (a) => a.status === "accepted"
  );

  const totalBudget = campaigns.reduce(
    (total, campaign) => total + (Number(campaign.budget) || 0),
    0
  );

  const currencies = Array.from(
    new Set(campaigns.map((campaign) => campaign.currency || "EGP"))
  );

  const maxBudget = Math.max(
    1,
    ...campaigns.map((campaign) => Number(campaign.budget) || 0)
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-violet-600">
              Performance overview
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="mt-2 text-sm text-slate-500">
              Monitor your campaigns, allocated budgets, and creator
              applications.
            </p>
          </div>

          <button
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Loading analytics…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Total campaigns"
                value={campaigns.length}
                note="Campaigns you can access"
              />
              <Metric
                label="Active campaigns"
                value={activeCampaigns.length}
                note="Currently marked active"
                accent="green"
              />
              <Metric
                label="Applications"
                value={applications.length}
                note={`${pendingApplications.length} awaiting review`}
                accent="purple"
              />
              <Metric
                label="Accepted creators"
                value={acceptedApplications.length}
                note="Accepted applications"
                accent="blue"
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Campaign status</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Distribution of your accessible campaigns.
                </p>

                {campaigns.length === 0 ? (
                  <Empty message="Create your first campaign to see statistics." />
                ) : (
                  <div className="mt-6 space-y-4">
                    {[
                      "active",
                      "draft",
                      "paused",
                      "completed",
                      "cancelled",
                    ].map((status) => {
                      const count = campaigns.filter(
                        (campaign) => campaign.status === status
                      ).length;
                      const percentage = (count / campaigns.length) * 100;

                      return (
                        <div key={status}>
                          <div className="mb-2 flex justify-between text-sm">
                            <span className="capitalize text-slate-600">
                              {status}
                            </span>
                            <span className="font-semibold">
                              {count} ({Math.round(percentage)}%)
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-violet-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Campaign budgets</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configured budget amounts, grouped by currency.
                </p>

                <div className="mt-5 space-y-3">
                  {currencies.length === 0 ? (
                    <Empty message="Campaign budgets will appear here." />
                  ) : (
                    currencies.map((currency) => {
                      const amount = campaigns
                        .filter(
                          (campaign) =>
                            (campaign.currency || "EGP") === currency
                        )
                        .reduce(
                          (sum, campaign) =>
                            sum + (Number(campaign.budget) || 0),
                          0
                        );

                      return (
                        <div
                          key={currency}
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <p className="text-sm text-slate-500">
                            Total configured budget · {currency}
                          </p>
                          <p className="mt-1 text-2xl font-bold">
                            {amount.toLocaleString()} {currency}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Budget totals are grouped by currency. They represent
                  configured campaign budgets, not actual payments or verified
                  advertising spend.
                </p>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Campaign breakdown</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Budget allocation and application activity by campaign.
                  </p>
                </div>
                <Link
                  href="/dashboard/campaigns"
                  className="text-sm font-semibold text-violet-700 hover:underline"
                >
                  Manage campaigns →
                </Link>
              </div>

              {campaigns.length === 0 ? (
                <Empty message="No campaigns found." />
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => {
                    const budget = Number(campaign.budget) || 0;
                    const campaignApplications = applications.filter(
                      (application) => {
                        return (
                          (application as Application & {
                            campaignId?: string;
                          }).campaignId === campaign._id
                        );
                      }
                    );

                    return (
                      <div
                        key={campaign._id}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/campaigns/${campaign._id}`}
                              className="font-semibold hover:text-violet-700"
                            >
                              {campaign.title}
                            </Link>
                            <p className="mt-1 text-sm text-slate-500">
                              {budget.toLocaleString()}{" "}
                              {campaign.currency || "EGP"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              statusColors[campaign.status] ||
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {campaign.status}
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (budget / maxBudget) * 100
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                          <span>
                            {campaignApplications.length} applications
                          </span>
                          <span>
                            {campaignApplications.filter(
                              (a) => a.status === "accepted"
                            ).length}{" "}
                            accepted
                          </span>
                          {typeof campaign.maxCreators === "number" && (
                            <span>
                              Target: {campaign.maxCreators} creators
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              Analytics currently uses campaign and application records stored
              in ADFLOW. Impressions, clicks, conversions, creator reach, and
              actual spend require integrations with advertising platforms or
              additional tracking.
            </p>

            <div className="mt-4 text-sm text-slate-500">
              Completed campaigns: {completedCampaigns.length}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Combined configured budgets across all currencies:{" "}
              {totalBudget.toLocaleString()} (currencies are not converted).
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  note,
  accent = "slate",
}: {
  label: string;
  value: number;
  note: string;
  accent?: "slate" | "green" | "purple" | "blue";
}) {
  const styles = {
    slate: "bg-white border-slate-200",
    green: "bg-emerald-50 border-emerald-200",
    purple: "bg-violet-50 border-violet-200",
    blue: "bg-blue-50 border-blue-200",
  };

  return (
    <div className={`rounded-2xl border p-5 ${styles[accent]}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
      {message}
    </p>
  );
}
