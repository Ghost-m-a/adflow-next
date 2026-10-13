import { EmptyState } from "@/components/ui";
import { Wallet } from "lucide-react";

export const metadata = { title: "Wallet · Advertiser · ADFLOW" };

export default function AdvertiserWalletPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Wallet
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Budgets, spending, and transaction history.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs text-text-muted">Available balance</p>
          <p className="mt-2 text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs text-text-muted">Pending charges</p>
          <p className="mt-2 text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs text-text-muted">Spent this month</p>
          <p className="mt-2 text-2xl font-bold">$0.00</p>
        </div>
      </div>

      <EmptyState
        icon={<Wallet size={20} />}
        title="No transactions yet"
        description="Once you start funding campaigns and paying creators, transactions will appear here."
      />
    </div>
  );
}
