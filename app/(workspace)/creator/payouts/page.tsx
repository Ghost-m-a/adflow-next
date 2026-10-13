import { EmptyState } from "@/components/ui";
import { Wallet } from "lucide-react";

export const metadata = { title: "Payouts · Creator · ADFLOW" };

export default function CreatorPayoutsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Payouts
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Request withdrawals and review payout history.
        </p>
      </header>

      <EmptyState
        icon={<Wallet size={20} />}
        title="No payouts yet"
        description="Once your available balance reaches the threshold, you can request a payout."
      />
    </div>
  );
}
