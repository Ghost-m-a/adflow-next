import Link from "next/link";

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
  organization?: { name?: string } | null;
};

const statusClasses: Record<string, string> = {
  active: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  draft: "bg-gray-400/10 text-gray-300 ring-white/10",
  paused: "bg-amber-400/10 text-amber-200 ring-amber-400/20",
  completed: "bg-sky-400/10 text-sky-200 ring-sky-400/20",
  cancelled: "bg-red-400/10 text-red-200 ring-red-400/20",
};

export default function CampaignCard({
  campaign,
  marketplace = false,
  onApply,
}: {
  campaign: CampaignCardData;
  marketplace?: boolean;
  onApply?: (campaign: CampaignCardData) => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-violet-400/30 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-300">{campaign.platform} · {campaign.goal}</p>
          <h3 className="mt-2 break-words text-lg font-semibold text-white">{campaign.title}</h3>
          {campaign.organization?.name && <p className="mt-1 text-xs text-gray-500">{campaign.organization.name}</p>}
        </div>
        {!marketplace && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs capitalize ring-1 ${statusClasses[campaign.status] || statusClasses.draft}`}>
            {campaign.status}
          </span>
        )}
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">{campaign.description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/20 p-3">
          <p className="text-xs text-gray-500">Total budget</p>
          <p className="mt-1 font-semibold text-white">{campaign.currency} {Number(campaign.budget).toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-black/20 p-3">
          <p className="text-xs text-gray-500">Per creator</p>
          <p className="mt-1 font-semibold text-white">{campaign.currency} {Number(campaign.rewardPerCreator).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>Up to {campaign.maxCreators} creators</span>
        {campaign.applicationDeadline && <span>Deadline: {new Date(campaign.applicationDeadline).toLocaleDateString()}</span>}
      </div>

      <div className="mt-auto pt-5">
        {marketplace ? (
          <button onClick={() => onApply?.(campaign)} className="w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">
            Apply to campaign
          </button>
        ) : (
          <Link href={`/dashboard/campaigns/${campaign._id}`} className="inline-flex rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-violet-400/40 hover:text-white">
            View campaign
          </Link>
        )}
      </div>
    </article>
  );
}
