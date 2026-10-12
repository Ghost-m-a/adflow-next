"use client";

import { useState, type FormEvent } from "react";

type EditableCampaign = {
  _id: string;
  title: string;
  description: string;
  brief?: string;
  platform: string;
  goal: string;
  budget: number;
  currency: string;
  rewardPerCreator: number;
  maxCreators: number;
  targetNiches?: string[];
  targetCountries?: string[];
  requirements?: string[];
  applicationDeadline?: string;
  startsAt?: string;
  endsAt?: string;
  isPublic: boolean;
};

type Props = {
  campaign: EditableCampaign;
  onSaved: (campaign: EditableCampaign) => void;
  onCancel: () => void;
};

const platforms = [
  "instagram", "tiktok", "youtube", "facebook",
  "x", "twitch", "blog", "other",
];

const goals = [
  "awareness", "engagement", "traffic", "leads", "sales", "content",
];

function toLocalDateTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return local.toISOString().slice(0, 16);
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CampaignEditForm({
  campaign,
  onSaved,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [brief, setBrief] = useState(campaign.brief ?? "");
  const [platform, setPlatform] = useState(campaign.platform);
  const [goal, setGoal] = useState(campaign.goal);
  const [budget, setBudget] = useState(String(campaign.budget));
  const [currency, setCurrency] = useState(campaign.currency);
  const [reward, setReward] = useState(String(campaign.rewardPerCreator));
  const [maxCreators, setMaxCreators] = useState(String(campaign.maxCreators));
  const [niches, setNiches] = useState(
    (campaign.targetNiches ?? []).join(", "),
  );
  const [countries, setCountries] = useState(
    (campaign.targetCountries ?? []).join(", "),
  );
  const [requirements, setRequirements] = useState(
    (campaign.requirements ?? []).join("\n"),
  );
  const [deadline, setDeadline] = useState(
    toLocalDateTime(campaign.applicationDeadline),
  );
  const [startsAt, setStartsAt] = useState(
    toLocalDateTime(campaign.startsAt),
  );
  const [endsAt, setEndsAt] = useState(toLocalDateTime(campaign.endsAt));
  const [isPublic, setIsPublic] = useState(campaign.isPublic);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fieldClass =
    "mt-1 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-3 text-sm text-white outline-none focus:border-violet-400";
  const labelClass = "block text-sm font-medium text-gray-300";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    setSaving(true);

    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaign._id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            brief,
            platform,
            goal,
            budget: Number(budget),
            currency: currency.toUpperCase().trim(),
            rewardPerCreator: Number(reward),
            maxCreators: Number(maxCreators),
            targetNiches: splitCommaList(niches).map((item) =>
              item.toLowerCase(),
            ),
            targetCountries: splitCommaList(countries).map((item) =>
              item.toUpperCase(),
            ),
            requirements: requirements
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            // Empty strings intentionally clear optional dates.
            applicationDeadline: deadline,
            startsAt,
            endsAt,
            isPublic,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const details = data.issues
          ?.map((issue: { message: string }) => issue.message)
          .join(" ");

        throw new Error(
          details || data.error || "Unable to update campaign.",
        );
      }

      onSaved(data.campaign as EditableCampaign);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update campaign.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-5 rounded-2xl border border-violet-400/20 bg-white/[0.035] p-5 sm:p-7"
    >
      <div>
        <h2 className="text-xl font-bold">Edit campaign</h2>
        <p className="mt-1 text-sm text-gray-400">
          Changes are validated and saved on the server.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <div>
        <label className={labelClass}>Campaign title</label>
        <input
          className={fieldClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={3}
          maxLength={120}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={fieldClass}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          minLength={20}
          maxLength={5000}
          rows={4}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Creator brief</label>
        <textarea
          className={fieldClass}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          maxLength={10000}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Platform</label>
          <select
            className={fieldClass}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          >
            {platforms.map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Campaign goal</label>
          <select
            className={fieldClass}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          >
            {goals.map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Budget</label>
          <input
            className={fieldClass}
            type="number"
            min="1"
            max="100000000"
            step="0.01"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Currency (3-letter code)</label>
          <input
            className={fieldClass}
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            minLength={3}
            maxLength={3}
            pattern="[A-Za-z]{3}"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Reward per creator</label>
          <input
            className={fieldClass}
            type="number"
            min="0.01"
            max="100000000"
            step="0.01"
            value={reward}
            onChange={(event) => setReward(event.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Maximum creators</label>
          <input
            className={fieldClass}
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={maxCreators}
            onChange={(event) => setMaxCreators(event.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Application deadline</label>
          <input
            className={fieldClass}
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Campaign start date</label>
          <input
            className={fieldClass}
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Campaign end date</label>
          <input
            className={fieldClass}
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Target niches</label>
        <input
          className={fieldClass}
          value={niches}
          onChange={(event) => setNiches(event.target.value)}
          placeholder="beauty, fitness, technology"
        />
        <p className="mt-1 text-xs text-gray-500">
          Separate niches with commas.
        </p>
      </div>

      <div>
        <label className={labelClass}>Target countries</label>
        <input
          className={fieldClass}
          value={countries}
          onChange={(event) => setCountries(event.target.value)}
          placeholder="EG, US, GB"
        />
        <p className="mt-1 text-xs text-gray-500">
          Use two-letter country codes separated by commas.
        </p>
      </div>

      <div>
        <label className={labelClass}>Requirements (one per line)</label>
        <textarea
          className={fieldClass}
          value={requirements}
          onChange={(event) => setRequirements(event.target.value)}
          rows={4}
          placeholder={"Original content\nTag the brand\nInclude the campaign link"}
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="accent-violet-500"
        />
        Visible in the creator marketplace when the campaign is active
      </label>

      <p className="text-xs text-gray-500">
        Status is managed separately. Budget must cover all creator slots, and
        it cannot be reduced below committed rewards.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving changes..." : "Save changes"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
