import { EmptyState } from "@/components/ui";
import { FileCheck2 } from "lucide-react";

export const metadata = { title: "Submissions · Creator · ADFLOW" };

export default function CreatorSubmissionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Content submissions
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Submit content for accepted campaigns and track approval status.
        </p>
      </header>

      <EmptyState
        icon={<FileCheck2 size={20} />}
        title="No submissions yet"
        description="Once you're accepted into a campaign, submit your content here."
      />
    </div>
  );
}
