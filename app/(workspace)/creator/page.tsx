import Link from "next/link";
import { Button, Card, CardContent, EmptyState } from "@/components/ui";
import { Compass, Link2, Megaphone, Wallet } from "lucide-react";
import { RecommendedCampaigns } from "@/components/matching/RecommendedCampaigns";

export const metadata = { title: "Overview · Creator · ADFLOW" };

export default function CreatorOverviewPage() {
  const stats = [
    { label: "Active campaigns", value: "0", icon: Megaphone },
    { label: "Pending applications", value: "0", icon: Compass },
    { label: "Clicks (30d)", value: "0", icon: Link2 },
    { label: "Available earnings", value: "$0.00", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Creator overview
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Track your applications, tracking links, and earnings.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-5 text-sm text-text-muted">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <RecommendedCampaigns />

      <EmptyState
        icon={<Compass size={20} />}
        title="Start by discovering campaigns"
        description="Browse active campaigns in the marketplace and apply to ones that fit your audience."
        action={
          <Link href="/creator/marketplace">
            <Button>Discover campaigns</Button>
          </Link>
        }
      />
    </div>
  );
}
