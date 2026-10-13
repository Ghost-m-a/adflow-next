"use client";

import { FormEvent, useMemo, useState } from "react";
import { FileUpload, type UploadedFile } from "@/components/uploads/FileUpload";

export type OrganizationOption = {
  _id: string;
  name: string;
  type: "advertiser" | "agency";
  defaultCurrency?: string;
  role?: string;
};

type CreatedCampaign = { _id?: string; [key: string]: unknown };

type CampaignFormProps = {
  organizations: OrganizationOption[];
  onCreated: (campaign: CreatedCampaign) => void;
};

const PLATFORM_OPTIONS = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X" },
  { value: "twitch", label: "Twitch" },
  { value: "blog", label: "Blog" },
  { value: "other", label: "Other" },
];

const CATEGORIES = [
  "Gaming",
  "Beauty",
  "Fitness",
  "Technology",
  "Fashion",
  "Food",
  "Travel",
  "Finance",
  "Education",
  "Entertainment",
  "Music",
  "Sports",
  "Lifestyle",
  "Business",
];

const GOALS = [
  { value: "awareness", label: "Brand awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "traffic", label: "Website traffic" },
  { value: "leads", label: "Lead generation" },
  { value: "sales", label: "Sales & conversions" },
  { value: "content", label: "Content creation" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50";

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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-500/10 text-sm font-semibold text-brand-300">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function CampaignForm({
  organizations,
  onCreated,
}: CampaignFormProps) {
  const [organizationId, setOrganizationId] = useState("");

  /* Identity */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brief, setBrief] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUpload, setCoverUpload] = useState<UploadedFile | null>(null);
  const [logoUpload, setLogoUpload] = useState<UploadedFile | null>(null);
  const [category, setCategory] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");

  /* Platforms */
  const [supportedPlatforms, setSupportedPlatforms] = useState<string[]>([]);
  const [goal, setGoal] = useState("awareness");

  /* Reward model */
  const [rewardModel, setRewardModel] = useState<"per_creator" | "cpm" | "hybrid">(
    "cpm",
  );
  const [budget, setBudget] = useState("1000");
  const [maxCreators, setMaxCreators] = useState("50");
  const [rewardPerCreator, setRewardPerCreator] = useState("25");
  const [rewardPerThousand, setRewardPerThousand] = useState("2");
  const [rewardPerVideo, setRewardPerVideo] = useState("");
  const [minimumPayout, setMinimumPayout] = useState("10");

  /* Content */
  const [requirementsInput, setRequirementsInput] = useState("");
  const [referenceMaterialsInput, setReferenceMaterialsInput] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState<"draft" | "active">("draft");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const eligibleOrganizations = useMemo(
    () =>
      organizations.filter((o) =>
        ["owner", "admin", "manager"].includes(o.role?.toLowerCase() ?? ""),
      ),
    [organizations],
  );

  const selectedOrg = eligibleOrganizations.find((o) => o._id === organizationId);
  const currency = selectedOrg?.defaultCurrency || "USD";

  function togglePlatform(value: string) {
    setSupportedPlatforms((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value],
    );
  }

  function splitLines(value: string): string[] {
    return value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  const hashtags = hashtagsInput
    .split(/[,\s]+/)
    .map((h) => h.replace(/^#/, "").trim())
    .filter(Boolean);

  const totalRewardPool =
    rewardModel === "per_creator"
      ? Number(rewardPerCreator) * Number(maxCreators)
      : Number(budget);

  const canSubmit =
    !saving &&
    !!organizationId &&
    title.trim().length >= 3 &&
    description.trim().length >= 20 &&
    supportedPlatforms.length > 0 &&
    Number(budget) > 0 &&
    Number(maxCreators) >= 1;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!organizationId) {
      setError("Select an organization.");
      return;
    }
    if (supportedPlatforms.length === 0) {
      setError("Select at least one platform.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          title: title.trim(),
          description: description.trim(),
          brief: brief.trim(),
          platform: supportedPlatforms[0], // primary platform for legacy code
          supportedPlatforms,
          goal,
          budget: Number(budget),
          currency,
          rewardPerCreator: Number(rewardPerCreator) || 0,
          maxCreators: Number(maxCreators),
          targetNiches: [],
          targetCountries: [],
          requirements: splitLines(requirementsInput),
          referenceMaterials: splitLines(referenceMaterialsInput),
          hashtags,
          category: category || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          rewardModel,
          rewardPerThousand: rewardPerThousand ? Number(rewardPerThousand) : undefined,
          rewardPerVideo: rewardPerVideo ? Number(rewardPerVideo) : undefined,
          minimumPayout: minimumPayout ? Number(minimumPayout) : 0,
          applicationDeadline: deadline || undefined,
          isPublic,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const details = data.issues
          ?.map((i: { message: string }) => i.message)
          .join(" ");
        throw new Error(details || data.error || "Unable to create campaign.");
      }

      onCreated(data.campaign as CreatedCampaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-400/15 bg-gradient-to-br from-brand-500/10 via-[#111426] to-[#0b1020] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            Campaign studio
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Create a campaign
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Set up a content rewards campaign. Cover image, platforms, reward rates,
            and content requirements are all shown on the public card.
          </p>
        </div>
      </div>

      {/* 01 — Organization */}
      <section className={sectionClass}>
        <SectionHeading
          number="01"
          title="Organization"
          description="Which organization owns this campaign?"
        />
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className={inputClass}
          required
        >
          <option value="">Select an organization</option>
          {eligibleOrganizations.map((org) => (
            <option key={org._id} value={org._id}>
              {org.name} · {org.type}
            </option>
          ))}
        </select>
        {eligibleOrganizations.length === 0 && (
          <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
            You need to be an owner, admin, or manager to create campaigns.
          </p>
        )}
      </section>

      {/* 02 — Identity */}
      <section className={sectionClass}>
        <SectionHeading
          number="02"
          title="Identity"
          description="The cover, logo, and naming that appear on the campaign card."
        />

        <div className="space-y-5">
          <label className={labelClass}>
            Title <span className="text-rose-400">*</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Warhammer 40,000: Dark Heresy — Steam Wishlist"
              maxLength={120}
              required
            />
          </label>

          <label className={labelClass}>
            Short description <span className="text-rose-400">*</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              rows={3}
              maxLength={2000}
              required
              placeholder="One or two sentences shown under the title."
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FileUpload
                kind="campaign-cover"
                label="Cover image"
                helper="16:9 recommended · JPG, PNG, WebP · max 8 MB"
                preview="wide"
                value={coverUpload}
                onChange={(file) => {
                  setCoverUpload(file);
                  setCoverImageUrl(file?.url ?? "");
                }}
              />
              <label className={labelClass}>
                <span className="mt-2 block text-xs text-text-subtle">
                  Or paste a URL:
                </span>
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </label>
            </div>

            <div>
              <FileUpload
                kind="campaign-logo"
                label="Logo / brand mark"
                helper="Square recommended · JPG, PNG, WebP"
                preview="square"
                value={logoUpload}
                onChange={(file) => {
                  setLogoUpload(file);
                  setLogoUrl(file?.url ?? "");
                }}
              />
              <label className={labelClass}>
                <span className="mt-2 block text-xs text-text-subtle">
                  Or paste a URL:
                </span>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </label>
            </div>
          </div>

          {coverImageUrl && (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt="Cover preview"
                className="aspect-[16/9] w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Hashtags
              <input
                value={hashtagsInput}
                onChange={(e) => setHashtagsInput(e.target.value)}
                className={inputClass}
                placeholder="gaming, gta, gameplay"
              />
              <span className={helperClass}>
                Comma or space separated. Shown as #tags on the card.
              </span>
            </label>
          </div>

          <label className={labelClass}>
            Campaign brief
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className={inputClass}
              rows={4}
              maxLength={10000}
              placeholder="Full brief for creators: direction, tone, key messages, links."
            />
          </label>
        </div>
      </section>

      {/* 03 — Platforms */}
      <section className={sectionClass}>
        <SectionHeading
          number="03"
          title="Platforms"
          description="Which platforms can creators publish on?"
        />

        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p) => {
            const active = supportedPlatforms.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={[
                  "rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                  active
                    ? "border-brand-400/50 bg-brand-500/15 text-brand-200"
                    : "border-white/10 bg-[#0b1020] text-slate-400 hover:border-white/20 hover:text-white",
                ].join(" ")}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {supportedPlatforms.length > 0 && (
          <p className={helperClass}>
            {supportedPlatforms.length} selected — first one is used as the
            primary platform.
          </p>
        )}

        <label className={`${labelClass} mt-5`}>
          Campaign objective
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className={inputClass}
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>
      </section>

      {/* 04 — Reward model */}
      <section className={sectionClass}>
        <SectionHeading
          number="04"
          title="Reward model"
          description="How creators get paid for approved content."
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                value: "cpm",
                label: "Cost per 1K views",
                desc: "Pay per 1,000 verified views on approved content.",
              },
              {
                value: "per_creator",
                label: "Fixed per creator",
                desc: "Flat reward per accepted creator.",
              },
              {
                value: "hybrid",
                label: "Hybrid",
                desc: "Base reward plus CPM on top.",
              },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setRewardModel(m.value)}
              className={[
                "rounded-xl border p-4 text-left transition",
                rewardModel === m.value
                  ? "border-brand-400/50 bg-brand-500/10"
                  : "border-white/[0.08] bg-[#0b1020] hover:border-white/15",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold text-white">
                {m.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                {m.desc}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>
            Total budget ({currency}) <span className="text-rose-400">*</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className={labelClass}>
            Creator slots
            <input
              type="number"
              min="1"
              step="1"
              value={maxCreators}
              onChange={(e) => setMaxCreators(e.target.value)}
              className={inputClass}
            />
            <span className={helperClass}>Maximum number of accepted creators.</span>
          </label>

          <label className={labelClass}>
            Minimum payout ({currency})
            <input
              type="number"
              min="0"
              step="0.01"
              value={minimumPayout}
              onChange={(e) => setMinimumPayout(e.target.value)}
              className={inputClass}
            />
            <span className={helperClass}>Threshold before a creator can withdraw.</span>
          </label>

          {rewardModel === "cpm" || rewardModel === "hybrid" ? (
            <label className={labelClass}>
              CPM — rate per 1,000 views ({currency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={rewardPerThousand}
                onChange={(e) => setRewardPerThousand(e.target.value)}
                className={inputClass}
                placeholder="e.g. 2.00"
              />
              <span className={helperClass}>
                Shown as <strong>{currency} 2.00/1K</strong> on the card.
              </span>
            </label>
          ) : null}

          {rewardModel === "per_creator" || rewardModel === "hybrid" ? (
            <label className={labelClass}>
              Fixed reward per creator ({currency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={rewardPerCreator}
                onChange={(e) => setRewardPerCreator(e.target.value)}
                className={inputClass}
              />
            </label>
          ) : null}

          <label className={labelClass}>
            Reward per approved video ({currency}) — optional
            <input
              type="number"
              min="0"
              step="0.01"
              value={rewardPerVideo}
              onChange={(e) => setRewardPerVideo(e.target.value)}
              className={inputClass}
              placeholder="Leave empty if not applicable"
            />
            <span className={helperClass}>
              Flat bonus on top of the CPM, paid once per approved video.
            </span>
          </label>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryTile
            label="Total budget"
            value={`${currency} ${Number(budget || 0).toLocaleString()}`}
          />
          <SummaryTile
            label="Reward pool"
            value={`${currency} ${totalRewardPool.toLocaleString()}`}
          />
          <SummaryTile
            label="Min payout"
            value={`${currency} ${Number(minimumPayout || 0).toLocaleString()}`}
          />
        </div>
      </section>

      {/* 05 — Content requirements */}
      <section className={sectionClass}>
        <SectionHeading
          number="05"
          title="Content requirements"
          description="Shown as a numbered list on the campaign page."
        />

        <label className={labelClass}>
          Requirements (one per line)
          <textarea
            value={requirementsInput}
            onChange={(e) => setRequirementsInput(e.target.value)}
            className={inputClass}
            rows={5}
            placeholder={
              "Video must be at least 60 seconds\nTag the official brand account\nInclude the Steam wishlist link in the description"
            }
          />
        </label>

        <label className={`${labelClass} mt-5`}>
          Reference materials (one URL per line)
          <textarea
            value={referenceMaterialsInput}
            onChange={(e) => setReferenceMaterialsInput(e.target.value)}
            className={inputClass}
            rows={3}
            placeholder={
              "https://brand.com/game-brief.pdf\nhttps://drive.google.com/.../assets"
            }
          />
          <span className={helperClass}>
            Locked until a creator joins the campaign.
          </span>
        </label>

        <label className={`${labelClass} mt-5`}>
          Application deadline
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </label>
      </section>

      {/* 06 — Publishing */}
      <section className={sectionClass}>
        <SectionHeading
          number="06"
          title="Publishing"
          description="Choose whether to publish now or save as a draft."
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0b1020] p-4">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
          <span>
            <span className="block text-sm font-medium text-white">
              Show in the public marketplace
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Eligible creators can discover and join this campaign when active.
            </span>
          </span>
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <StatusTile
            active={status === "draft"}
            onClick={() => setStatus("draft")}
            dot="bg-slate-400"
            title="Save as draft"
            description="Prepare before activating."
          />
          <StatusTile
            active={status === "active"}
            onClick={() => setStatus("active")}
            dot="bg-emerald-400"
            title="Publish campaign"
            description="Go live immediately."
          />
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm leading-6 text-rose-300"
        >
          <span className="mt-0.5 font-bold">!</span>
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Uses <span className="font-medium text-slate-300">{currency}</span> from
          the selected organization.
        </p>
        <button
          type="submit"
          disabled={!canSubmit || eligibleOrganizations.length === 0}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create campaign"}
        </button>
      </div>
    </form>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0b1020] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusTile({
  active,
  onClick,
  dot,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  dot: string;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border p-4 text-left transition",
        active
          ? "border-brand-400/40 bg-brand-500/10"
          : "border-white/[0.08] bg-[#0b1020] hover:border-white/15",
      ].join(" ")}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-white">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {title}
      </span>
      <span className="mt-2 block text-xs leading-5 text-slate-400">
        {description}
      </span>
    </button>
  );
}
