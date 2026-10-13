import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { Megaphone } from "lucide-react";

export const metadata = { title: "Campaigns · ADFLOW" };

export default function CampaignsDirectoryPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
          Public directory
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Browse campaigns</h1>
        <p className="mt-3 max-w-2xl text-text-muted">
          Active campaigns from advertisers looking to work with creators.
        </p>
      </header>

      <EmptyState
        icon={<Megaphone size={20} />}
        title="No public campaigns yet"
        description="Once advertisers publish active campaigns, they'll appear here."
        action={
          <Link
            href="/signup"
            className="inline-flex rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Create an account
          </Link>
        }
      />
    </section>
  );
}
