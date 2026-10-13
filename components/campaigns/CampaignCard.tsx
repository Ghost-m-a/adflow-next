import Link from "next/link";
import {
  Clock,
  Eye,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react";

export type CampaignCardData = {
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
  createdAt?: string;
  applicationDeadline?: string;
  organization?: { name?: string; logoUrl?: string } | null;

  /* Whop-style fields (optional for backwards compat) */
  coverImageUrl?: string;
  logoUrl?: string;
  category?: string;
  hashtags?: string[];
  supportedPlatforms?: string[];
  rewardModel?: "per_creator" | "cpm" | "hybrid";
  rewardPerThousand?: number;
  rewardPerVideo?: number;
  minimumPayout?: number;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500 text-emerald-50" },
  draft: { label: "Draft", className: "bg-white/15 text-white" },
  paused: { label: "Paused", className: "bg-amber-500 text-amber-50" },
  completed: { label: "Completed", className: "bg-sky-500 text-sky-50" },
  cancelled: { label: "Cancelled", className: "bg-red-500 text-red-50" },
};

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶",
  instagram: "◉",
  tiktok: "♪",
  facebook: "f",
  x: "𝕏",
  twitch: "◈",
  blog: "¶",
  other: "●",
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 86400) return `${Math.max(1, Math.floor(s / 3600))}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  if (s < 2592000) return `${Math.floor(s / 604800)}w ago`;
  return `${Math.floor(s / 2592000)}mo ago`;
}

function formatMoney(value: number, currency: string): string {
  if (value >= 1_000_000) {
    return `${currency} ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${currency} ${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return `${currency} ${value.toLocaleString()}`;
}

export default function CampaignCard({
  campaign,
  marketplace = false,
  onApply,
}: {
  campaign: CampaignCardData;
  marketplace?: boolean;
  onApply?: (campaign: CampaignCardData) => void;
}) {
  const rate =
    campaign.rewardModel === "cpm"
      ? campaign.rewardPerThousand
      : campaign.rewardPerThousand ?? campaign.rewardPerCreator;

  const isCpm = campaign.rewardModel === "cpm" || campaign.rewardPerThousand;

  // Derived: no real spend data is stored on the campaign, so we show
  // the configured budget as the total and let analytics compute the rest.
  const budgetLabel = formatMoney(campaign.budget, campaign.currency);

  // Progress = 0 by default; the advertiser page overlays real progress.
  const progressPct = 0;

  const status = STATUS_LABEL[campaign.status] ?? STATUS_LABEL.draft;
  const platforms =
    campaign.supportedPlatforms?.length
      ? campaign.supportedPlatforms
      : campaign.platform
        ? [campaign.platform]
        : [];

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d111c] transition hover:-translate-y-0.5 hover:border-white/20">
      {/* Cover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-500/20 via-[#111426] to-[#0b1020]">
        {campaign.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white/10">
            {campaign.title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Gradient for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Platform chips (top-left) */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {platforms.slice(0, 4).map((p) => (
            <span
              key={p}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-[11px] font-bold text-white backdrop-blur-sm"
              title={p}
            >
              {PLATFORM_ICONS[p] ?? p.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>

        {/* Status (top-right) */}
        <span
          className={[
            "absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            status.className,
          ].join(" ")}
        >
          {status.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category + brand */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-text-subtle">
            {campaign.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.logoUrl}
                alt=""
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : campaign.organization?.name ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/20 text-[8px] font-bold text-brand-300">
                {campaign.organization.name.charAt(0).toUpperCase()}
              </span>
            ) : null}
            <span className="truncate">
              {campaign.category || campaign.organization?.name || "Campaign"}
            </span>
          </div>

          {!marketplace && (
            <button
              type="button"
              aria-label="More options"
              className="rounded-md p-1 text-text-subtle hover:bg-white/[0.06] hover:text-text"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal size={14} />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-white">
          {campaign.title}
        </h3>

        {/* Reward row */}
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-lg font-bold text-white">
            {isCpm ? `${campaign.currency} ${(rate ?? 0).toFixed(2)}/1K` : `Fixed`}
          </span>
          <span className="text-sm font-medium text-text-muted">
            {budgetLabel}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-text-subtle">
          <span className="inline-flex items-center gap-1">
            <Eye size={11} />
            {campaign.maxCreators} slots
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {timeAgo(campaign.createdAt)}
          </span>
        </div>

        {/* Hashtags */}
        {campaign.hashtags && campaign.hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {campaign.hashtags.slice(0, 3).map((h) => (
              <span
                key={h}
                className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-text-muted"
              >
                #{h}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-4">
          {marketplace ? (
            <button
              onClick={() => onApply?.(campaign)}
              className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Join campaign
            </button>
          ) : (
            <Link
              href={`/advertiser/campaigns/${campaign._id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 transition hover:text-brand-200"
            >
              <TrendingUp size={14} />
              View campaign
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
