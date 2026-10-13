import { EmptyState } from "@/components/ui";
import { Link2 } from "lucide-react";

export const metadata = { title: "Tracking links · Creator · ADFLOW" };

export default function CreatorLinksPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tracking links
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Your unique referral links for each active campaign.
        </p>
      </header>

      <EmptyState
        icon={<Link2 size={20} />}
        title="No tracking links yet"
        description="Once you're approved for a campaign, your unique tracking link will appear here."
      />
    </div>
  );
}
