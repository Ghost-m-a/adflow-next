import { EmptyState } from "@/components/ui";
import { Building2 } from "lucide-react";

export const metadata = { title: "Team · Advertiser · ADFLOW" };

export default function AdvertiserTeamPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Team
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Manage your organization members, roles, and permissions.
        </p>
      </header>

      <EmptyState
        icon={<Building2 size={20} />}
        title="Team management coming soon"
        description="Invite team members, assign roles, and control access to campaigns and billing."
      />
    </div>
  );
}
