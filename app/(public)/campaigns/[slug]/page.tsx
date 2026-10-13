import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BadgeCheck,
  Clock,
    Lock,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { CampaignJoinPanel } from "@/components/public/CampaignJoinPanel";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  getCampaignLeaderboard,
  getPublicCampaignBySlug,
  getRelatedCampaigns,
} from "@/services/public-campaign.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const campaign = await getPublicCampaignBySlug(slug);
  if (!campaign) return { title: "Campaign not found · ADFLOW" };
  return {
    title: `${campaign.title} · ADFLOW`,
    description: campaign.description.slice(0, 160),
    openGraph: campaign.coverImageUrl
      ? { images: [{ url: campaign.coverImageUrl }] }
      : undefined,
  };
}

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

function money(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function PublicCampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectToDatabase();
  const campaign = await getPublicCampaignBySlug(slug);
  if (!campaign) notFound();

  const [leaders, related] = await Promise.all([
    getCampaignLeaderboard(campaign._id),
    getRelatedCampaigns({ _id: campaign._id, category: campaign.category }),
  ]);

  const platforms = campaign.supportedPlatforms;
  const spentPct =
    campaign.budget > 0
      ? Math.min(100, (campaign.slotsFilled * campaign.rewardPerCreator) / campaign.budget * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ===================== Hero ===================== */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]">
        <div className="relative aspect-[3/1] w-full bg-gradient-to-br from-brand-500/20 via-[#111426] to-[#0b1020]">
          {campaign.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          {/* Platform chips */}
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            {platforms.slice(0, 5).map((p) => (
              <span
                key={p}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-[11px] font-bold text-white backdrop-blur-sm"
                title={p}
              >
                {PLATFORM_ICONS[p] ?? p.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>

          {/* Brand + title */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                {campaign.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={campaign.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded-full border border-white/20 object-cover"
                  />
                ) : campaign.organization?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={campaign.organization.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded-full border border-white/20 object-cover"
                  />
                ) : campaign.organization ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                    {campaign.organization.name.charAt(0).toUpperCase()}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                  {campaign.organization?.name ?? "Campaign"}
                  {campaign.organization?.isVerified && (
                    <BadgeCheck size={14} className="text-brand-300" />
                  )}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                {campaign.title}
              </h1>

              {campaign.hashtags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {campaign.hashtags.map((h) => (
                    <span key={h} className="text-xs font-medium text-white/70">
                      #{h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== Top action row ===================== */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge variant="brand">
          {campaign.rewardModel === "cpm"
            ? "CPM"
            : campaign.rewardModel === "hybrid"
              ? "Hybrid"
              : "Fixed"}
        </Badge>
        {campaign.category && <Badge>{campaign.category}</Badge>}
        <Badge variant="info">{campaign.goal}</Badge>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-subtle">
          <Users size={12} />
          {campaign.slotsFilled} / {campaign.maxCreators} creators
        </span>
      </div>

      {/* ===================== Two-column: content + join panel ===================== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ---------- Left column ---------- */}
        <div className="space-y-6">
          {/* Per-platform rate cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            {platforms.slice(0, 3).map((p) => (
              <Card key={p}>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                    {p}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-text-subtle">Per 1K views</p>
                      <p className="mt-1 font-semibold">
                        {money(campaign.rewardPerThousand, campaign.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-subtle">Per video</p>
                      <p className="mt-1 font-semibold">
                        {money(campaign.rewardPerVideo, campaign.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-subtle">Min payout</p>
                      <p className="mt-1 font-semibold">
                        {money(campaign.minimumPayout, campaign.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Budget progress */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-subtle">
                    Slots filled
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {campaign.slotsFilled} / {campaign.maxCreators}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-text-subtle">
                    Total budget
                  </p>
                  <p className="mt-1 text-lg font-semibold text-text-muted">
                    {money(campaign.budget, campaign.currency)}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                  style={{ width: `${spentPct}%` }}
                />
              </div>

              {campaign.rewardPerCreator > 0 && (
                <p className="mt-3 text-xs text-emerald-300">
                  {money(campaign.rewardPerCreator, campaign.currency)} per
                  accepted creator — {campaign.maxCreators - campaign.slotsFilled}{" "}
                  slot
                  {campaign.maxCreators - campaign.slotsFilled === 1 ? "" : "s"} left
                </p>
              )}
            </CardContent>
          </Card>

          {/* Requirements + reference materials */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-sm font-semibold">
                  Content requirements
                  <span className="ml-2 text-xs font-normal text-text-subtle">
                    {campaign.requirements.length}
                  </span>
                </h2>
                {campaign.requirements.length > 0 ? (
                  <ol className="mt-4 space-y-2 text-sm text-text-muted">
                    {campaign.requirements.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-text-subtle">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-text-subtle">
                    No specific requirements listed.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  Reference materials
                  <Lock size={12} className="text-text-subtle" />
                  <span className="text-xs font-normal text-text-subtle">
                    {campaign.referenceMaterials.length}
                  </span>
                </h2>
                {campaign.referenceMaterials.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-text-muted">
                    {campaign.referenceMaterials.slice(0, 4).map((r, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 opacity-60"
                      >
                        <Lock size={12} className="shrink-0 text-text-subtle" />
                        <span className="truncate">Locked until you join</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-text-subtle">
                    No reference materials.
                  </p>
                )}
                <p className="mt-3 text-xs text-text-subtle">
                  Materials unlock automatically once you&apos;re accepted.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Description / brief */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold">About this campaign</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-muted">
                {campaign.description}
              </p>
              {campaign.brief && (
                <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-6 text-text-muted">
                  {campaign.brief}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Creator leaderboard */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold">
                Top creators on this campaign
              </h2>
              {leaders.length === 0 ? (
                <p className="mt-3 text-sm text-text-subtle">
                  No approved conversions yet — be the first to earn here.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {leaders.map((leader, i) => (
                    <Link
                      key={leader.userId}
                      href={`/creators/${leader.username}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-3 transition hover:border-brand-400/30"
                    >
                      <span className="text-xs font-bold text-text-subtle">
                        #{i + 1}
                      </span>
                      {leader.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={leader.avatarUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                          {(leader.displayName || leader.username || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {leader.displayName || `@${leader.username}`}
                        </p>
                        <p className="text-xs text-text-subtle">
                          {leader.approvedConversions} approved
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------- Right column: join panel ---------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <CampaignJoinPanel
            campaignId={campaign._id}
            campaignTitle={campaign.title}
            currency={campaign.currency}
            rewardPerThousand={campaign.rewardPerThousand}
            rewardPerCreator={campaign.rewardPerCreator}
            rewardModel={campaign.rewardModel}
            isAcceptingApplications={campaign.isAcceptingApplications}
            slotsFilled={campaign.slotsFilled}
            maxCreators={campaign.maxCreators}
          />

          {campaign.applicationDeadline && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs text-amber-200">
              <Clock size={14} />
              Apply by{" "}
              {new Date(campaign.applicationDeadline).toLocaleDateString(
                undefined,
                { month: "long", day: "numeric", year: "numeric" },
              )}
            </div>
          )}

          {campaign.organization && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-text-subtle">
                  Advertiser
                </p>
                <div className="mt-3 flex items-center gap-3">
                  {campaign.organization.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={campaign.organization.logoUrl}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-sm font-bold text-brand-300">
                      {campaign.organization.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {campaign.organization.name}
                    </p>
                    {campaign.organization.isVerified && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-300">
                        <BadgeCheck size={12} /> Verified
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* ===================== Related campaigns ===================== */}
      {related.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">More campaigns</h2>
            <Link
              href="/campaigns"
              className="text-sm font-medium text-brand-300 hover:text-brand-200"
            >
              View all →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r._id}
                href={`/campaigns/${r.slug}`}
                className="group block overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d111c] transition hover:-translate-y-0.5 hover:border-white/20"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-500/20 via-[#111426] to-[#0b1020]">
                  {r.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl font-black text-white/10">
                      {r.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {r.supportedPlatforms.slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-[10px] font-bold text-white backdrop-blur-sm"
                      >
                        {PLATFORM_ICONS[p] ?? p.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  {r.category && (
                    <p className="text-[11px] uppercase tracking-wider text-text-subtle">
                      {r.category}
                    </p>
                  )}
                  <h3 className="mt-1 line-clamp-2 font-semibold">{r.title}</h3>
                  <p className="mt-2 text-sm font-medium">
                    {r.currency} {r.rewardPerThousand.toFixed(2)}/1K
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
