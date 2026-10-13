import { EmptyState } from "@/components/ui";
import { Users } from "lucide-react";

export const metadata = { title: "Applications · Creator · ADFLOW" };

export default function CreatorApplicationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          My applications
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Campaign applications you&apos;ve submitted and their current status.
        </p>
      </header>

      <EmptyState
        icon={<Users size={20} />}
        title="No applications yet"
        description="Apply to a campaign in the marketplace to get started."
      />
    </div>
  );
}
