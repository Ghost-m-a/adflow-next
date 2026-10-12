"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CampaignForm, { type OrganizationOption } from "@/components/campaigns/CampaignForm";
import CampaignCard, { type CampaignCardData } from "@/components/campaigns/CampaignCard";

type Campaign = CampaignCardData & {
  organizationId: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");

  function handleNewCampaign() {
    if (loading) return;

    if (organizations.length === 0) {
      router.push("/dashboard/organizations/new?next=campaign");
      return;
    }

    setShowForm(true);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [campaignResponse, organizationResponse] = await Promise.all([
        fetch("/api/campaigns", { cache: "no-store" }),
        fetch("/api/organizations/mine", { cache: "no-store" }),
      ]);

      if (campaignResponse.status === 401 || organizationResponse.status === 401) {
        router.replace("/login");
        return;
      }

      const campaignData = await campaignResponse.json();
      const organizationData = await organizationResponse.json();

      if (!campaignResponse.ok) throw new Error(campaignData.error || "Could not load campaigns.");
      if (!organizationResponse.ok) throw new Error(organizationData.error || "Could not load organizations.");

      setCampaigns(campaignData.campaigns || []);
      setOrganizations(organizationData.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
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

  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter((campaign) => campaign.status === "active").length,
    drafts: campaigns.filter((campaign) => campaign.status === "draft").length,
    budget: campaigns.reduce((sum, campaign) => sum + Number(campaign.budget || 0), 0),
  }), [campaigns]);

  const filtered = campaigns.filter((campaign) => filter === "all" || campaign.status === filter);

  return (
    <>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-400">Workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Campaign dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Create campaigns, track their status, and manage your creator partnerships.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/marketplace" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 hover:border-violet-400/40">Creator marketplace</Link>
            <button onClick={() => showForm ? setShowForm(false) : handleNewCampaign()} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400">
              {showForm ? "Close form" : "+ New campaign"}
            </button>
          </div>
        </div>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total campaigns", value: stats.total.toLocaleString() },
            { label: "Active campaigns", value: stats.active.toLocaleString() },
            { label: "Drafts", value: stats.drafts.toLocaleString() },
            { label: "Combined budget", value: stats.budget.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="mt-3 text-3xl font-bold">{item.value}</p>
              {item.label === "Combined budget" && <p className="mt-1 text-xs text-gray-500">Across your organizations' campaigns; mixed currencies are not converted.</p>}
            </div>
          ))}
        </section>

        {showForm && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Create a campaign</h2>
            <p className="mb-6 mt-1 text-sm text-gray-400">Campaign creation is restricted to organization owners, admins, and managers.</p>
            <CampaignForm organizations={organizations} onCreated={() => { setShowForm(false); void loadData(); }} />
          </section>
        )}

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Your campaigns</h2>
              <p className="mt-1 text-sm text-gray-500">Campaign data is loaded from your database.</p>
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-white/10 bg-[#0b1020] px-4 py-2.5 text-sm text-white">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-white/10 p-10 text-center text-sm text-gray-400">Loading campaigns…</div>
          ) : filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center">
              <h3 className="font-semibold">{campaigns.length ? "No campaigns match this filter" : "Your campaigns will appear here"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                {campaigns.length ? "Choose another status to see more campaigns." : "Create your first campaign to start working with creators."}
              </p>
              {!campaigns.length && <button onClick={handleNewCampaign} disabled={loading} className="mt-5 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold hover:bg-violet-400">Create your first campaign</button>}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((campaign) => <CampaignCard key={campaign._id} campaign={campaign} />)}
            </div>
          )}
        </section>
    </>
  );
}
