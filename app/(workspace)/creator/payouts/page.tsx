"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { Plus, Trash2, Wallet, XCircle } from "lucide-react";
import { PayoutAccountForm } from "@/components/payouts/PayoutAccountForm";

type Balance = { pending: number; available: number; held: number; paid: number };

type Payout = {
  _id: string;
  amount: number;
  currency: string;
  status: "requested" | "processing" | "paid" | "failed" | "cancelled";
  reference: string;
  destinationLabel: string;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
};

type Account = {
  _id: string;
  type: string;
  label: string;
  currency: string;
  isDefault: boolean;
  isVerified: boolean;
  detailsMasked: Record<string, string>;
};

export default function CreatorPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, aRes] = await Promise.all([
        fetch("/api/creator/payouts", { cache: "no-store" }),
        fetch("/api/creator/payout-accounts", { cache: "no-store" }),
      ]);
      if (pRes.status === 401) {
        router.replace("/login");
        return;
      }
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.error || "Unable to load payouts.");
      setPayouts(pData.payouts || []);
      setBalances(pData.balances || {});

      if (aRes.ok) {
        const aData = await aRes.json();
        setAccounts(aData.accounts || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payouts.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestPayout(currency: string) {
    setRequesting(currency);
    setError("");
    try {
      const res = await fetch("/api/creator/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to request payout.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request payout.");
    } finally {
      setRequesting(null);
    }
  }

  async function cancelPayout(payoutId: string) {
    if (!window.confirm("Cancel this payout request?")) return;
    setError("");
    try {
      const res = await fetch(`/api/creator/payouts/${payoutId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to cancel.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel.");
    }
  }

  async function deleteAccount(accountId: string) {
    if (!window.confirm("Remove this payout account?")) return;
    try {
      const res = await fetch(`/api/creator/payout-accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Unable to remove.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove.");
    }
  }

  const openStatuses = ["requested", "processing"];
  const hasOpenPayout = payouts.some((p) => openStatuses.includes(p.status));

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Payouts
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Request withdrawals and review payout history.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowAddAccount((v) => !v)}>
          <Plus size={15} />
          {showAddAccount ? "Hide account form" : "Add payout account"}
        </Button>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {showAddAccount && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">New payout account</h2>
            <PayoutAccountForm
              onCreated={() => {
                setShowAddAccount(false);
                void load();
              }}
              onCancel={() => setShowAddAccount(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Balance / request section */}
      <section>
        <h2 className="text-lg font-semibold">Available to withdraw</h2>
        {loading ? (
          <Skeleton className="mt-4 h-40" />
        ) : Object.keys(balances).length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            You have no earnings yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(balances).map(([currency, b]) => {
              const hasAccount = accounts.some((a) => a.currency === currency);
              const canRequest = !hasOpenPayout && b.available > 0 && hasAccount;

              return (
                <Card key={currency}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-text-muted">{currency}</p>
                      {!hasAccount && (
                        <span className="text-xs text-amber-300">
                          No account set
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {currency} {b.available.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-text-subtle">
                      Held: {currency} {b.held.toFixed(2)} · Pending: {currency}{" "}
                      {b.pending.toFixed(2)}
                    </p>
                    <Button
                      className="mt-4 w-full"
                      disabled={!canRequest || requesting === currency}
                      loading={requesting === currency}
                      onClick={() => void requestPayout(currency)}
                    >
                      Request payout
                    </Button>
                    {hasOpenPayout && (
                      <p className="mt-2 text-center text-xs text-text-subtle">
                        You have an open payout. Wait for it to finish.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Accounts */}
      <section>
        <h2 className="text-lg font-semibold">Payout accounts</h2>
        {accounts.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            Add a payout account to request withdrawals.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {accounts.map((a) => (
              <Card key={a._id}>
                <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.label}</p>
                      {a.isDefault && (
                        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-300">
                          Default
                        </span>
                      )}
                      <span className="text-xs capitalize text-text-subtle">
                        {a.type.replace("_", " ")} · {a.currency}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-subtle">
                      {Object.entries(a.detailsMasked)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ") || "No details"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteAccount(a._id)}
                    aria-label="Remove account"
                    className="self-start rounded-lg p-2 text-red-300 hover:bg-red-500/10 sm:self-auto"
                  >
                    <Trash2 size={15} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="text-lg font-semibold">Payout history</h2>

        {loading ? (
          <Skeleton className="mt-4 h-32" />
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={<Wallet size={20} />}
            title="No payouts yet"
            description="Once your available balance reaches the threshold, you can request a payout."
            className="mt-4"
          />
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            {payouts.map((p) => (
              <div
                key={p._id}
                className="flex flex-col justify-between gap-3 border-b border-border bg-surface-1 p-4 last:border-b-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.currency} {p.amount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-text-subtle">
                    {p.reference} · {p.destinationLabel} ·{" "}
                    {new Date(p.requestedAt).toLocaleDateString()}
                  </p>
                  {p.failureReason && (
                    <p className="mt-1 text-xs text-red-300">{p.failureReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium capitalize",
                      p.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : p.status === "processing"
                          ? "bg-sky-500/10 text-sky-300"
                          : p.status === "requested"
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-red-500/10 text-red-300",
                    ].join(" ")}
                  >
                    {p.status}
                  </span>
                  {p.status === "requested" && (
                    <button
                      type="button"
                      onClick={() => void cancelPayout(p._id)}
                      aria-label="Cancel payout"
                      className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-6 text-text-subtle">
        Payouts are reviewed before processing. Conversion approvals and payout
        requests are separate events — an approved conversion becomes available,
        and a payout commits that balance until it succeeds or fails.
      </p>
    </div>
  );
}
