"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import CampaignCard, { type CampaignCardData } from "@/components/campaigns/CampaignCard";

type Campaign = CampaignCardData & {
  _id: string;
  targetNiches?: string[];
  targetCountries?: string[];
  requirements?: string[];
};

type Application = {
  _id: string;
  status: string;
  message: string;
  createdAt: string;
  campaignId: { title?: string; platform?: string; status?: string } | string;
};

export default function MarketplacePage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [message, setMessage] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (platform) params.set("platform", platform);
      if (goal) params.set("goal", goal);

      const response = await fetch(`/api/marketplace/campaigns?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load campaigns.");
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load marketplace.");
    } finally {
      setLoading(false);
    }
  }, [query, platform, goal]);

  const loadApplications = useCallback(async () => {
    const response = await fetch("/api/creator/applications", { cache: "no-store" });
    if (response.status === 401) return;
    if (!response.ok) return;
    const data = await response.json();
    setApplications(data.applications || []);
  }, []);

  useEffect(() => { void loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { void loadApplications(); }, [loadApplications]);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`/api/campaigns/${selected._id}/applications`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(proposedRate.trim() ? { proposedRate: Number(proposedRate) } : {}),
        }),
      });
      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        const details = data.issues?.map((issue: { message: string }) => issue.message).join(" ");
        throw new Error(details || data.error || "Unable to apply.");
      }

      setNotice("Application submitted successfully.");
      setSelected(null);
      setMessage("");
      setProposedRate("");
      await loadApplications();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-400">ADFLOW marketplace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find your next collaboration</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Discover active campaigns from advertisers and apply with a message about why you're a good fit.</p>
          </div>
          <Link href="/dashboard" className="self-start rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 hover:border-violet-400/40 sm:self-auto">Campaign dashboard</Link>
        </div>

        {notice && <div role="status" className="mt-6 rounded-xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm text-violet-100">{notice}</div>}

        <form onSubmit={(event) => { event.preventDefault(); void loadCampaigns(); }} className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_180px_180px_auto]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search campaigns..." className="min-w-0 rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm text-white outline-none focus:border-violet-400" />
          <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-xl border border-white/10 bg-[#0b1020] px-3 py-3 text-sm text-white">
            <option value="">All platforms</option>
            {["instagram", "tiktok", "youtube", "facebook", "x", "twitch", "blog", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={goal} onChange={(event) => setGoal(event.target.value)} className="rounded-xl border border-white/10 bg-[#0b1020] px-3 py-3 text-sm text-white">
            <option value="">All goals</option>
            {["awareness", "engagement", "traffic", "leads", "sales", "content"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold hover:bg-violet-400">Search</button>
        </form>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Available campaigns</h2>
            <span className="text-sm text-gray-500">{campaigns.length} found</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 p-10 text-center text-sm text-gray-400">Finding campaigns…</div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
              <h3 className="font-semibold">No matching campaigns yet</h3>
              <p className="mt-2 text-sm text-gray-400">Try another search or check back when advertisers publish new campaigns.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign._id} campaign={campaign} marketplace onApply={() => setSelected(campaign)} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">My applications</h2>
          <p className="mt-1 text-sm text-gray-500">Your submitted applications and their current status.</p>
          {applications.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 p-6 text-sm text-gray-400">No applications to show. Sign in and apply to a campaign to get started.</div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              {applications.map((application) => {
                const campaign = typeof application.campaignId === "object" ? application.campaignId : null;
                return (
                  <div key={application._id} className="flex flex-col justify-between gap-3 border-b border-white/10 p-4 last:border-b-0 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium">{campaign?.title || "Campaign"}</p>
                      <p className="mt-1 text-xs text-gray-500">Applied {new Date(application.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`self-start rounded-full px-3 py-1 text-xs capitalize sm:self-auto ${application.status === "accepted" ? "bg-emerald-400/10 text-emerald-300" : application.status === "rejected" ? "bg-red-400/10 text-red-300" : "bg-amber-400/10 text-amber-200"}`}>{application.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="apply-title" className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#101522] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-violet-300">{selected.platform} · {selected.goal}</p>
                <h2 id="apply-title" className="mt-2 text-xl font-semibold">Apply to {selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close application form" className="rounded-lg px-3 py-1 text-xl text-gray-400 hover:bg-white/5 hover:text-white">×</button>
            </div>
            <form onSubmit={apply} className="mt-6 space-y-4">
              <div>
                <label htmlFor="application-message" className="text-sm font-medium text-gray-300">Why are you a good fit?</label>
                <textarea id="application-message" required minLength={10} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] p-3 text-sm text-white outline-none focus:border-violet-400" placeholder="Introduce yourself and explain how you would approach this campaign." />
              </div>
              <div>
                <label htmlFor="proposed-rate" className="text-sm font-medium text-gray-300">Proposed rate (optional)</label>
                <input id="proposed-rate" type="number" min="0" step="0.01" value={proposedRate} onChange={(event) => setProposedRate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] p-3 text-sm text-white outline-none focus:border-violet-400" placeholder={`Campaign reward: ${selected.currency} ${selected.rewardPerCreator}`} />
              </div>
              <p className="text-xs leading-5 text-gray-500">You must be logged in and have a creator profile. Duplicate applications are rejected by the server.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50">{submitting ? "Submitting…" : "Submit application"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
