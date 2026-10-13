import { EmptyState } from "@/components/ui";
import { FileVideo2 } from "lucide-react";

export const metadata = { title: "Submissions · Advertiser · ADFLOW" };

export default function AdvertiserSubmissionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Submissions
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Review creator content submitted against your campaigns.
        </p>
      </header>

      <EmptyState
        icon={<FileVideo2 size={20} />}
        title="No submissions yet"
        description="When accepted creators submit content, it will appear here for review."
      />
    </div>
  );
}
