"use client";

import { FormEvent, useState } from "react";

export type OrganizationOption = {
  _id: string;
  name: string;
  type: string;
  defaultCurrency: string;
  role: string;
};

type Props = {
  organizations: OrganizationOption[];
  onCreated: () => void;
};

export default function CampaignForm({ organizations, onCreated }: Props) {
  const [organizationId, setOrganizationId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [goal, setGoal] = useState("awareness");
  const [budget, setBudget] = useState("500");
  const [reward, setReward] = useState("50");
  const [maxCreators, setMaxCreators] = useState("10");
  const [niches, setNiches] = useState("");
  const [countries, setCountries] = useState("");
  const [requirements, setRequirements] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("draft");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!organizationId) {
      setError("Select an organization first.");
      return;
    }

    setSaving(true);
    try {
      const organization = organizations.find((item) => item._id === organizationId);

      const response = await fetch("/api/campaigns", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          title,
          description,
          brief,
          platform,
          goal,
          budget: Number(budget),
          currency: organization?.defaultCurrency || "USD",
          rewardPerCreator: Number(reward),
          maxCreators: Number(maxCreators),
          targetNiches: niches.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean),
          targetCountries: countries.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean),
          requirements: requirements.split("\n").map((value) => value.trim()).filter(Boolean),
          applicationDeadline: deadline || undefined,
          isPublic,
          status,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const details = data.issues?.map((issue: { message: string }) => issue.message).join(" ");
        throw new Error(details || data.error || "Unable to create campaign.");
      }

      setTitle("");
      setDescription("");
      setBrief("");
      setError("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "mt-1 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-3 text-sm text-white outline-none transition focus:border-violet-400";
  const labelClass = "block text-sm font-medium text-gray-300";

  if (organizations.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-100">
        You don't have an organization available for campaign management yet.
        Create an organization and make sure you have owner, admin, or manager
        permissions before creating campaigns.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div>
        <label className={labelClass}>Organization</label>
        <select className={fieldClass} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required>
          <option value="">Choose an organization</option>
          {organizations.filter((org) => ["owner", "admin", "manager"].includes(org.role)).map((org) => (
            <option key={org._id} value={org._id}>{org.name} · {org.role}</option>
          ))}
        </select>
        {organizations.every((org) => !["owner", "admin", "manager"].includes(org.role)) && (
          <p className="mt-2 text-xs text-amber-300">Your memberships don't currently have campaign management permission.</p>
        )}
      </div>

      <div>
        <label className={labelClass}>Campaign title</label>
        <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={120} required placeholder="Summer product launch" />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea className={fieldClass} value={description} onChange={(e) => setDescription(e.target.value)} minLength={20} maxLength={5000} required rows={4} placeholder="Explain the campaign, audience, and expected outcome..." />
      </div>

      <div>
        <label className={labelClass}>Creator brief (optional)</label>
        <textarea className={fieldClass} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={10000} rows={3} placeholder="Creative direction, messaging, and deliverables..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Platform</label>
          <select className={fieldClass} value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {["instagram", "tiktok", "youtube", "facebook", "x", "twitch", "blog", "other"].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Goal</label>
          <select className={fieldClass} value={goal} onChange={(e) => setGoal(e.target.value)}>
            {["awareness", "engagement", "traffic", "leads", "sales", "content"].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Total budget</label>
          <input className={fieldClass} type="number" min="1" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Reward per creator</label>
          <input className={fieldClass} type="number" min="0.01" step="0.01" value={reward} onChange={(e) => setReward(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Creator slots</label>
          <input className={fieldClass} type="number" min="1" max="1000000" step="1" value={maxCreators} onChange={(e) => setMaxCreators(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Application deadline (optional)</label>
          <input className={fieldClass} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Target niches</label>
        <input className={fieldClass} value={niches} onChange={(e) => setNiches(e.target.value)} placeholder="beauty, fitness, technology" />
        <p className="mt-1 text-xs text-gray-500">Separate values with commas.</p>
      </div>

      <div>
        <label className={labelClass}>Target countries</label>
        <input className={fieldClass} value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="EG, US, GB" />
        <p className="mt-1 text-xs text-gray-500">Use two-letter country codes separated by commas.</p>
      </div>

      <div>
        <label className={labelClass}>Requirements (one per line)</label>
        <textarea className={fieldClass} value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder={"Original content\nTag the brand\nInclude the campaign link"} />
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-white/10 p-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-violet-500" />
          Visible in creator marketplace
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={status === "active"} onChange={(e) => setStatus(e.target.checked ? "active" : "draft")} className="accent-violet-500" />
          Publish immediately
        </label>
      </div>

      <p className="text-xs text-gray-500">Total creator rewards cannot exceed the campaign budget. Publishing makes a public campaign eligible to appear in the marketplace.</p>

      <button type="submit" disabled={saving || !organizations.some((org) => org._id === organizationId && ["owner", "admin", "manager"].includes(org.role))} className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? "Creating campaign..." : "Create campaign"}
      </button>
    </form>
  );
}
