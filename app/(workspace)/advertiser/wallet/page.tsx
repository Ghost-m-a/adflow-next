"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Skeleton,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet } from "lucide-react";

type Balance = {
  deposited: number;
  spent: number;
  pending: number;
  refunded: number;
  available: number;
};

type Entry = {
  _id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  createdAt: string;
  campaign: { _id: string; title: string; slug: string } | null;
};

type Organization = {
  _id: string;
  name: string;
  defaultCurrency: string;
  role: string;
};

const CURRENCIES = ["USD", "EGP", "EUR", "GBP", "SAR", "AED"];

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [committed, setCommitted] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);

  // 1. Load the user's organizations once.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/organizations/mine", { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        const orgs: Organization[] = data.organizations ?? [];
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setOrganizationId(orgs[0]._id);
        } else {
          setLoading(false);
        }
      } catch {
        setError("Unable to load organizations.");
        setLoading(false);
      }
    })();
  }, [router]);

  // 2. Load balances + transactions whenever the selected org changes.
  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/wallet/transactions?organizationId=${organizationId}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load wallet.");
      setBalances(data.balances ?? {});
      setCommitted(data.committed ?? {});
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 3. Handle redirect from the mock provider.
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setNotice("Deposit succeeded. Your wallet has been credited.");
      void load();
    } else if (status === "cancelled") {
      setNotice("Deposit was cancelled.");
    }
  }, [searchParams, load]);

  const selectedOrg = organizations.find((o) => o._id === organizationId);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Billing
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Wallet
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Fund campaigns, track spending, and manage your organization balance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {organizations.length > 1 && (
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
            >
              {organizations.map((o) => (
                <option key={o._id} value={o._id}>{o.name}</option>
              ))}
            </select>
          )}
          <Button onClick={() => setShowDeposit((v) => !v)}>
            <Plus size={15} />
            {showDeposit ? "Close" : "Deposit funds"}
          </Button>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {showDeposit && selectedOrg && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">Deposit funds</h2>
            <p className="mt-1 text-sm text-text-muted">
              Add funds to <strong>{selectedOrg.name}</strong>. Deposits are credited
              instantly in dev mode.
            </p>
            <DepositForm
              organizationId={selectedOrg._id}
              onDone={async () => {
                setShowDeposit(false);
                setNotice("Deposit succeeded. Wallet balance updated.");
                await load();
              }}
              onCancel={() => setShowDeposit(false)}
            />
          </CardContent>
        </Card>
      )}

      {organizations.length === 0 && !loading ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title="No organizations yet"
          description="Create an organization before adding funds to a wallet."
          action={
            <Link href="/organizations/new">
              <Button>Create organization</Button>
            </Link>
          }
        />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <>
          {/* Balances */}
          {Object.keys(balances).length === 0 ? (
            <EmptyState
              icon={<Wallet size={20} />}
              title="No wallet activity yet"
              description="Deposit funds to start funding campaigns and paying creators."
              action={<Button onClick={() => setShowDeposit(true)}>Deposit funds</Button>}
            />
          ) : (
            Object.entries(balances).map(([currency, b]) => {
              const committedAmount = committed[currency] ?? 0;
              const headroom = b.available - committedAmount;

              return (
                <Card key={currency}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold">{currency} wallet</h2>
                      {headroom < 0 && (
                        <Badge variant="danger">Over-committed</Badge>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Tile
                        label="Available"
                        value={`${currency} ${b.available.toFixed(2)}`}
                        accent="emerald"
                      />
                      <Tile
                        label="Committed to campaigns"
                        value={`${currency} ${committedAmount.toFixed(2)}`}
                        accent="amber"
                      />
                      <Tile
                        label="Spent (approved)"
                        value={`${currency} ${b.spent.toFixed(2)}`}
                      />
                      <Tile
                        label="Headroom"
                        value={`${currency} ${headroom.toFixed(2)}`}
                        accent={headroom >= 0 ? "emerald" : "danger"}
                      />
                    </div>

                    <p className="mt-3 text-xs text-text-subtle">
                      Deposited: {currency} {b.deposited.toFixed(2)} · Pending
                      charges: {currency} {b.pending.toFixed(2)} · Refunded:{" "}
                      {currency} {b.refunded.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Transaction history */}
          {entries.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Transaction history</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                {entries.map((e) => (
                  <div
                    key={e._id}
                    className="flex flex-col justify-between gap-3 border-b border-border bg-surface-1 p-4 last:border-b-0 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.description || e.type}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-subtle">
                        {e.reference} ·{" "}
                        {new Date(e.createdAt).toLocaleDateString()}
                        {e.campaign ? (
                          <>
                            {" · "}
                            <Link
                              href={`/advertiser/campaigns/${e.campaign._id}`}
                              className="text-brand-300 hover:text-brand-200"
                            >
                              {e.campaign.title}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "rounded-full px-2.5 py-0.5 text-xs capitalize",
                          e.status === "available"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : e.status === "pending"
                              ? "bg-amber-500/10 text-amber-300"
                              : e.status === "void"
                                ? "bg-white/5 text-text-muted"
                                : "bg-brand-500/10 text-brand-300",
                        ].join(" ")}
                      >
                        {e.status}
                      </span>
                      <span
                        className={[
                          "min-w-[110px] text-right text-sm font-semibold",
                          e.type === "credit" ? "text-emerald-300" : "",
                          e.type === "debit" ? "text-red-300" : "",
                          e.type === "fee" ? "text-sky-300" : "",
                        ].join(" ")}
                      >
                        {e.type === "credit" ? "+" : "−"}
                        {e.currency} {e.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="text-xs leading-6 text-text-subtle">
            Wallet balance is the sum of successful deposits minus approved
            conversions, pending charges, and platform fees. Campaigns with an
            active or paused status reserve budget until they complete or are
            cancelled.
          </p>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "emerald" | "amber" | "danger";
}) {
  const styles = {
    default: "border-border bg-surface-2",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.06]",
    amber: "border-amber-400/20 bg-amber-400/[0.06]",
    danger: "border-red-400/20 bg-red-400/[0.06]",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[accent]}`}>
      <p className="text-xs text-text-subtle">{label}</p>
      <p className="mt-1.5 font-semibold">{value}</p>
    </div>
  );
}

function DepositForm({
  organizationId,
  onDone,
  onCancel,
}: {
  organizationId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("500");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          amount: Number(amount),
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start deposit.");

      // Redirect to the mock checkout URL (which immediately lands back).
      if (data.deposit?.checkoutUrl) {
        window.location.href = data.deposit.checkoutUrl;
        return;
      }

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start deposit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Deposit {currency} {amount || "0"}
        </Button>
      </div>
    </form>
  );
}


function WalletFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16" />
      <Skeleton className="h-40" />
      <Skeleton className="h-72" />
    </div>
  );
}

export default function AdvertiserWalletPage() {
  return (
    <Suspense fallback={<WalletFallback />}>
      <WalletContent />
    </Suspense>
  );
}
