import Link from "next/link";
import styles from "@/styles/components/campaigns/CampaignCard.module.css";

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

const statusClassNames: Record<string, string> = {
  active: styles.status_active,
  draft: styles.status_draft,
  paused: styles.status_paused,
  completed: styles.status_completed,
  cancelled: styles.status_cancelled,
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
  const statusClass = statusClassNames[campaign.status] ?? styles.status_draft;

  return (
    <article className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>
            {campaign.platform} · {campaign.goal}
          </p>
          <h3 className={styles.title}>{campaign.title}</h3>
          {campaign.organization?.name && (
            <p className={styles.org}>{campaign.organization.name}</p>
          )}
        </div>

        {!marketplace && (
          <span className={`${styles.status} ${statusClass}`}>
            {campaign.status}
          </span>
        )}
      </div>

      <p className={styles.description}>{campaign.description}</p>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Total budget</p>
          <p className={styles.metricValue}>
            {campaign.currency} {Number(campaign.budget).toLocaleString()}
          </p>
        </div>

        <div className={styles.metric}>
          <p className={styles.metricLabel}>Per creator</p>
          <p className={styles.metricValue}>
            {campaign.currency} {Number(campaign.rewardPerCreator).toLocaleString()}
          </p>
        </div>
      </div>

      <div className={styles.meta}>
        <span>Up to {campaign.maxCreators} creators</span>
        {campaign.applicationDeadline && (
          <span>
            Deadline: {new Date(campaign.applicationDeadline).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className={styles.footer}>
        {marketplace ? (
          <button
            onClick={() => onApply?.(campaign)}
            className={styles.applyButton}
          >
            Apply to campaign
          </button>
        ) : (
          <Link
            href={`/dashboard/campaigns/${campaign._id}`}
            className={styles.viewLink}
          >
            View campaign
          </Link>
        )}
      </div>
    </article>
  );
}
