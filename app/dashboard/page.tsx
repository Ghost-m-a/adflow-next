"use client";

import AppShell from "@/components/AppShell";
import CampaignForm, {
  type OrganizationOption,
} from "@/components/campaigns/CampaignForm";
import CampaignCard, {
  type CampaignCardData,
} from "@/components/campaigns/CampaignCard";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CirclePlus,
  Compass,
  Megaphone,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Campaign = CampaignCardData & {
  organizationId: string;
};

type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

const filters: { label: string; value: "all" | CampaignStatus }[] = [
  { label: "All campaigns", value: "all" },
  { label: "Active", value: "active" },
  { label: "Drafts", value: "draft" },
  { label: "Paused", value: "paused" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const panelClass =
  "rounded-2xl border border-white/[0.08] bg-[#0d111c]";

export default function DashboardPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all");
  const [search, setSearch] = useState("");

  function handleNewCampaign() {
    if (loading) return;

    if (organizations.length === 0) {
      router.push("/dashboard/organizations/new?next=campaign");
      return;
    }

    setShowForm(true);
    window.setTimeout(() => {
      document
        .getElementById("campaign-creation-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [campaignResponse, organizationResponse] = await Promise.all([
        fetch("/api/campaigns", {
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/organizations/mine", {
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);

      if (
        campaignResponse.status === 401 ||
        organizationResponse.status === 401
      ) {
        router.replace("/login");
        return;
      }

      const campaignData = await campaignResponse.json();
      const organizationData = await organizationResponse.json();

      if (!campaignResponse.ok) {
        throw new Error(
          campaignData.error || "Could not load your campaigns.",
        );
      }

      if (!organizationResponse.ok) {
        throw new Error(
          organizationData.error || "Could not load your organizations.",
        );
      }

      setCampaigns(
        Array.isArray(campaignData.campaigns) ? campaignData.campaigns : [],
      );

      setOrganizations(
        Array.isArray(organizationData.organizations)
          ? organizationData.organizations
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load your dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("createCampaign") === "1") {
      setShowForm(true);
      router.replace("/dashboard");
    }
  }, [router]);

  const stats = useMemo(
    () => ({
      total: campaigns.length,
      active: campaigns.filter((campaign) => campaign.status === "active")
        .length,
      drafts: campaigns.filter((campaign) => campaign.status === "draft")
        .length,
      budget: campaigns.reduce(
        (sum, campaign) => sum + Number(campaign.budget || 0),
        0,
      ),
    }),
    [campaigns],
  );

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesStatus =
        filter === "all" || campaign.status === filter;

      const matchesSearch =
        !normalizedSearch ||
        campaign.title.toLowerCase().includes(normalizedSearch) ||
        campaign.description.toLowerCase().includes(normalizedSearch) ||
        campaign.platform.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [campaigns, filter, search]);

  const statCards = [
    {
      label: "Total campaigns",
      value: stats.total.toLocaleString(),
      detail: "Across your organizations",
      icon: Megaphone,
      iconClass: "bg-violet-500/10 text-violet-300",
      trendIcon: ArrowUpRight,
    },
    {
      label: "Active campaigns",
      value: stats.active.toLocaleString(),
      detail: "Currently running",
      icon: Activity,
      iconClass: "bg-emerald-500/10 text-emerald-300",
      trendIcon: ArrowUpRight,
    },
    {
      label: "Draft campaigns",
      value: stats.drafts.toLocaleString(),
      detail: "Ready for preparation",
      icon: CirclePlus,
      iconClass: "bg-amber-500/10 text-amber-300",
      trendIcon: ArrowDownRight,
    },
    {
      label: "Combined budget",
      value: stats.budget.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
      detail: "Currencies are not converted",
      icon: Wallet,
      iconClass: "bg-sky-500/10 text-sky-300",
      trendIcon: ArrowUpRight,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome header */}
        <section className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.12] via-[#111426] to-[#0d111c] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-violet-500/[0.12] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-90px] right-[25%] h-48 w-48 rounded-full bg-blue-500/[0.07] blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                Your workspace
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Campaign dashboard
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
                Plan campaigns, collaborate with creators, and keep your
                advertising activity organized in one place.
              </p>

              <p className="mt-3 text-xs text-slate-500">
                {organizations.length}{" "}
                {organizations.length === 1 ? "organization" : "organizations"}{" "}
                connected to your account
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/marketplace"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-violet-400/30 hover:bg-white/[0.06]"
              >
                <Compass size={17} />
                Marketplace
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (showForm) {
                    setShowForm(false);
                  } else {
                    handleNewCampaign();
                  }
                }}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showForm ? <X size={17} /> : <CirclePlus size={17} />}
                {showForm ? "Close form" : "New campaign"}
              </button>
            </div>
          </div>
        </section>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm leading-6 text-rose-200">{error}</p>

            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-300/20 px-3 py-2 text-sm text-rose-100 hover:bg-rose-300/10"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        )}

        {/* Overview cards */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                Performance overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                A summary of your campaign activity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              title="Refresh dashboard data"
              aria-label="Refresh dashboard data"
              className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-2.5 text-slate-400 transition hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => {
              const Icon = item.icon;
              const TrendIcon = item.trendIcon;

              return (
                <article
                  key={item.label}
                  className={`${panelClass} p-5 transition duration-200 hover:border-white/[0.14]`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconClass}`}
                    >
                      <Icon size={20} />
                    </div>

                    <TrendIcon size={16} className="text-slate-600" />
                  </div>

                  <p className="mt-5 text-sm text-slate-400">{item.label}</p>

                  <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-white">
                    {loading ? "—" : item.value}
                    {item.label === "Combined budget" && (
                      <span className="ml-2 text-xs font-medium text-slate-500">
                        mixed currencies
                      </span>
                    )}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Campaign creation form */}
        {showForm && (
          <section
            id="campaign-creation-form"
            className="scroll-mt-24 rounded-2xl border border-violet-400/20 bg-[#0b0f19] p-4 sm:p-6 lg:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
                  Campaign studio
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                  Create a campaign
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Set your campaign goals, creator rewards, target audience,
                  and publishing preferences.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close campaign form"
                className="rounded-lg border border-white/[0.08] p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {organizations.length === 0 ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
                <p className="text-sm leading-6 text-amber-100">
                  Create an organization before creating a campaign.
                </p>
                <Link
                  href="/dashboard/organizations/new?next=campaign"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-[#111]"
                >
                  <Building2 size={16} />
                  Create organization
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <CampaignForm
                organizations={organizations}
                onCreated={() => {
                  setShowForm(false);
                  void loadData();
                }}
              />
            )}
          </section>
        )}

        {/* Campaign list */}
        <section>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Your campaigns
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review your campaigns and manage their progress.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:min-w-[230px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search campaigns..."
                  aria-label="Search campaigns"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0d111c] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/40"
                />
              </div>

              <label className="sr-only" htmlFor="campaign-status-filter">
                Filter campaigns by status
              </label>
              <select
                id="campaign-status-filter"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as "all" | CampaignStatus)
                }
                className="rounded-xl border border-white/[0.08] bg-[#0d111c] px-4 py-2.5 text-sm text-slate-200 outline-none transition focus:border-violet-400/40"
              >
                {filters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter chips */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => {
              const selected = filter === item.value;
              const count =
                item.value === "all"
                  ? campaigns.length
                  : campaigns.filter(
                      (campaign) => campaign.status === item.value,
                    ).length;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                    selected
                      ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                      : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-white"
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      selected
                        ? "bg-violet-400/15 text-violet-200"
                        : "bg-white/[0.06] text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className={`${panelClass} mt-5 p-12 text-center`}>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
              <p className="mt-4 text-sm text-slate-400">
                Loading your campaigns...
              </p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className={`${panelClass} mt-5 px-5 py-14 text-center`}>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                {search ? (
                  <Search size={23} className="text-slate-400" />
                ) : (
                  <Megaphone size={23} className="text-slate-400" />
                )}
              </div>

              <h3 className="mt-5 text-base font-semibold text-white">
                {search
                  ? "No matching campaigns"
                  : campaigns.length
                    ? "No campaigns in this status"
                    : "Your campaign workspace is ready"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                {search
                  ? "Try another search term or clear the search field."
                  : campaigns.length
                    ? "Choose a different status filter to view other campaigns."
                    : "Create your first campaign to start connecting with creators and growing your reach."}
              </p>

              {!search && campaigns.length === 0 && (
                <button
                  type="button"
                  onClick={handleNewCampaign}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  <CirclePlus size={17} />
                  Create your first campaign
                </button>
              )}

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-5 text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {filteredCampaigns.length} of {campaigns.length}{" "}
                  campaigns
                </span>
                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="text-violet-300 hover:text-violet-200"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign._id}
                    campaign={campaign}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Organization shortcut */}
        <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
              <Building2 size={21} />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Organization management
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Manage your business workspaces and organization settings.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/organizations"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-violet-400/30 hover:bg-white/[0.04]"
          >
            Manage organizations
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
