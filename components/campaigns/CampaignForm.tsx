"use client";

import { FormEvent, useMemo, useState } from "react";

export type OrganizationOption = {
  _id: string;
  name: string;
  type: "advertiser" | "agency";
  defaultCurrency?: string;
  role?: string;
};

type CreatedCampaign = {
  _id?: string;
  [key: string]: unknown;
};

type CampaignFormProps = {
  organizations: OrganizationOption[];
  onCreated: (campaign: CreatedCampaign) => void;
};

const platforms = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X" },
  { value: "twitch", label: "Twitch" },
  { value: "blog", label: "Blog / Website" },
  { value: "other", label: "Other" },
];

const goals = [
  { value: "awareness", label: "Brand awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "traffic", label: "Website traffic" },
  { value: "leads", label: "Lead generation" },
  { value: "sales", label: "Sales & conversions" },
  { value: "content", label: "Content creation" },
];

const countries = [
  { value: "EG", label: "Egypt" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "IN", label: "India" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "BR", label: "Brazil" },
  { value: "JP", label: "Japan" },
  { value: "NG", label: "Nigeria" },
  { value: "ZA", label: "South Africa" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "block text-sm font-medium text-slate-200";

const helperClass = "mt-1.5 text-xs leading-5 text-slate-500";

const sectionClass =
  "rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6";

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-sm font-semibold text-violet-300">
        {number}
      </div>

      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function CampaignForm({
  organizations,
  onCreated,
}: CampaignFormProps) {
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

  const eligibleOrganizations = useMemo(
    () =>
      organizations.filter((organization) =>
        ["owner", "admin", "manager"].includes(
          organization.role?.toLowerCase() ?? "",
        ),
      ),
    [organizations],
  );

  const selectedOrganization = eligibleOrganizations.find(
    (organization) => organization._id === organizationId,
  );

  const currency = selectedOrganization?.defaultCurrency || "USD";

  const budgetValue = Number(budget);
  const rewardValue = Number(reward);
  const creatorCount = Number(maxCreators);

  const totalRewards = rewardValue * creatorCount;
  const remainingBudget = budgetValue - totalRewards;

  const canSubmit =
    !saving &&
    !!organizationId &&
    !!title.trim() &&
    !!description.trim() &&
    Number.isFinite(budgetValue) &&
    Number.isFinite(rewardValue) &&
    Number.isFinite(creatorCount) &&
    budgetValue > 0 &&
    rewardValue > 0 &&
    creatorCount >= 1 &&
    Number.isInteger(creatorCount) &&
    totalRewards <= budgetValue;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!organizationId) {
      setError("Select an organization to manage this campaign.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Campaign title and description are required.");
      return;
    }

    if (
      !Number.isFinite(budgetValue) ||
      !Number.isFinite(rewardValue) ||
      !Number.isFinite(creatorCount) ||
      budgetValue <= 0 ||
      rewardValue <= 0 ||
      creatorCount < 1 ||
      !Number.isInteger(creatorCount)
    ) {
      setError("Enter a valid budget, creator reward, and creator limit.");
      return;
    }

    if (totalRewards > budgetValue) {
      setError(
        "The total creator rewards cannot exceed the campaign budget.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          title: title.trim(),
          description: description.trim(),
          brief: brief.trim(),
          platform,
          goal,
          budget: budgetValue,
          currency,
          rewardPerCreator: rewardValue,
          maxCreators: creatorCount,
          targetNiches: niches
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),

          // An empty array means Global: no country restriction.
          targetCountries: countries ? [countries] : [],

          requirements: requirements
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),

          applicationDeadline: deadline || undefined,
          isPublic,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const details = data.issues
          ?.map((issue: { message: string }) => issue.message)
          .join(" ");

        throw new Error(
          details || data.error || "Unable to create campaign.",
        );
      }

      if (!data.campaign) {
        throw new Error(
          "The campaign may have been created, but the server response was unexpected. Refresh the page before trying again.",
        );
      }

      onCreated(data.campaign as CreatedCampaign);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong while creating your campaign.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-[#111426] to-[#0b1020] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Campaign studio
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Create a campaign
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Define your campaign, choose your audience, set creator rewards,
            and publish your brief to the ADflow marketplace.
          </p>
        </div>
      </div>

      {/* Organization */}
      <section className={sectionClass}>
        <SectionHeading
          number="01"
          title="Organization"
          description="Choose which organization owns and manages this campaign."
        />

        <label className={labelClass}>
          Campaign organization
          <select
            className={inputClass}
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            required
            disabled={saving}
          >
            <option value="">Select an organization</option>

            {eligibleOrganizations.map((organization) => (
              <option key={organization._id} value={organization._id}>
                {organization.name} · {organization.type}
              </option>
            ))}
          </select>
        </label>

        {eligibleOrganizations.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200">
            You need to be an organization owner, admin, or manager to create
            campaigns. Create an organization or ask an organization owner to
            grant you the appropriate role.
          </div>
        ) : (
          <p className={helperClass}>
            Only organizations where you have campaign management permissions
            are shown.
          </p>
        )}
      </section>

      {/* Basic information */}
      <section className={sectionClass}>
        <SectionHeading
          number="02"
          title="Campaign details"
          description="Tell creators what you're promoting and what success looks like."
        />

        <div className="space-y-5">
          <label className={labelClass}>
            Campaign title <span className="text-rose-400">*</span>
            <input
              className={inputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Summer product launch"
              maxLength={120}
              required
              disabled={saving}
            />
            <span className={helperClass}>
              Choose a clear, memorable name.
            </span>
          </label>

          <label className={labelClass}>
            Short description <span className="text-rose-400">*</span>
            <textarea
              className={inputClass}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe your product, audience, and campaign goals..."
              rows={3}
              maxLength={2000}
              required
              disabled={saving}
            />
          </label>

          <label className={labelClass}>
            Campaign brief
            <textarea
              className={inputClass}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Provide your creative direction, key messages, links, and deliverables..."
              rows={5}
              maxLength={10000}
              disabled={saving}
            />
            <span className={helperClass}>
              Give creators enough detail to understand the work and
              expectations.
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Platform
              <select
                className={inputClass}
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                disabled={saving}
              >
                {platforms.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Campaign objective
              <select
                className={inputClass}
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                disabled={saving}
              >
                {goals.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* Budget */}
      <section className={sectionClass}>
        <SectionHeading
          number="03"
          title="Budget & creator rewards"
          description="Set your spending limit and the maximum number of creators."
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <label className={labelClass}>
            Total budget ({currency})
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              required
              disabled={saving}
            />
          </label>

          <label className={labelClass}>
            Reward per creator ({currency})
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={reward}
              onChange={(event) => setReward(event.target.value)}
              required
              disabled={saving}
            />
          </label>

          <label className={labelClass}>
            Maximum creators
            <input
              className={inputClass}
              type="number"
              min="1"
              step="1"
              value={maxCreators}
              onChange={(event) => setMaxCreators(event.target.value)}
              required
              disabled={saving}
            />
          </label>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.08] bg-[#0b1020] p-4">
            <p className="text-xs text-slate-400">Total budget</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {currency}{" "}
              {Number.isFinite(budgetValue)
                ? budgetValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0b1020] p-4">
            <p className="text-xs text-slate-400">Potential rewards</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {currency}{" "}
              {Number.isFinite(totalRewards)
                ? totalRewards.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0b1020] p-4">
            <p className="text-xs text-slate-400">Remaining budget</p>
            <p
              className={`mt-2 text-xl font-semibold ${
                remainingBudget < 0 ? "text-rose-400" : "text-emerald-300"
              }`}
            >
              {currency}{" "}
              {Number.isFinite(remainingBudget)
                ? remainingBudget.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </p>
          </div>
        </div>

        {totalRewards > budgetValue && (
          <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-300">
            Your potential creator rewards exceed the budget. Reduce the reward
            or creator limit before creating the campaign.
          </p>
        )}
      </section>

      {/* Audience */}
      <section className={sectionClass}>
        <SectionHeading
          number="04"
          title="Target audience"
          description="Help the right creators discover your campaign."
        />

        <div className="space-y-5">
          <label className={labelClass}>
            Target niches
            <input
              className={inputClass}
              value={niches}
              onChange={(event) => setNiches(event.target.value)}
              placeholder="beauty, fitness, technology"
              disabled={saving}
            />
            <span className={helperClass}>
              Separate niches with commas.
            </span>
          </label>

          <label className={labelClass}>
            Target countries
            <select
              className={inputClass}
              value={countries}
              onChange={(event) => setCountries(event.target.value)}
              disabled={saving}
            >
              <option value="">🌍 Global — all countries</option>

              {countriesList.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label} ({country.value})
                </option>
              ))}
            </select>
            <span className={helperClass}>
              Global campaigns have no country restriction. Select a country
              to target creators in that location.
            </span>
          </label>
        </div>
      </section>

      {/* Requirements */}
      <section className={sectionClass}>
        <SectionHeading
          number="05"
          title="Creator requirements"
          description="Set expectations before creators apply."
        />

        <label className={labelClass}>
          Requirements
          <textarea
            className={inputClass}
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder={
              "Create original content\nTag our official account\nInclude the campaign link"
            }
            rows={4}
            disabled={saving}
          />
          <span className={helperClass}>
            Add one requirement per line. Each line will be saved separately.
          </span>
        </label>

        <label className={`${labelClass} mt-5`}>
          Application deadline
          <input
            className={inputClass}
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            disabled={saving}
          />
          <span className={helperClass}>
            Optional. Choose a future date and time if applications should
            close automatically.
          </span>
        </label>
      </section>

      {/* Publishing */}
      <section className={sectionClass}>
        <SectionHeading
          number="06"
          title="Publishing settings"
          description="Choose whether to publish immediately or prepare a draft."
        />

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0b1020] p-4 transition hover:border-white/15">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-violet-500"
              disabled={saving}
            />

            <span>
              <span className="block text-sm font-medium text-white">
                Show in creator marketplace
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                Allow eligible creators to discover this campaign when it is
                active.
              </span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStatus("draft")}
              disabled={saving}
              className={`rounded-xl border p-4 text-left transition ${
                status === "draft"
                  ? "border-violet-400/40 bg-violet-500/10"
                  : "border-white/[0.08] bg-[#0b1020] hover:border-white/15"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Save as draft
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">
                Prepare your campaign before activating it.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("active")}
              disabled={saving}
              className={`rounded-xl border p-4 text-left transition ${
                status === "active"
                  ? "border-emerald-400/40 bg-emerald-500/10"
                  : "border-white/[0.08] bg-[#0b1020] hover:border-white/15"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Publish campaign
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">
                Activate the campaign so eligible creators can apply.
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Errors */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm leading-6 text-rose-300"
        >
          <span className="mt-0.5 font-bold">!</span>
          <p>{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Your campaign will use your organization&apos;s default currency:{" "}
          <span className="font-medium text-slate-300">{currency}</span>.
        </p>

        <button
          type="submit"
          disabled={!canSubmit || eligibleOrganizations.length === 0}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#0b1020] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Creating campaign...
            </>
          ) : (
            <>
              Create campaign
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

const countriesList = countries;
