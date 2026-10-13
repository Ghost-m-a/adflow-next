import { EmptyState } from "@/components/ui";
import { Activity } from "lucide-react";

export const metadata = { title: "Earnings · Creator · ADFLOW" };

export default function CreatorEarningsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Earnings
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Your verified earnings and pending payouts.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs text-text-muted">Pending</p>
          <p className="mt-2 text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs text-text-muted">Available</p>
          <p className="mt-2 text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs text-text-muted">Paid to date</p>
          <p className="mt-2 text-2xl font-bold">$0.00</p>
        </div>
      </div>

      <EmptyState
        icon={<Activity size={20} />}
        title="No earnings yet"
        description="Earnings from verified conversions will appear here."
      />
    </div>
  );
}
