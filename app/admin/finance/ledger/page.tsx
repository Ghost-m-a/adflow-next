"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, Input, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw } from "lucide-react";

type Entry = {
  _id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  createdAt: string;
  user: { username?: string; email?: string; name?: string } | null;
  organization: { name?: string; slug?: string } | null;
};

const TYPES = ["all", "credit", "debit", "fee", "reversal", "adjustment"] as const;
const STATUSES = ["all", "pending", "available", "held", "paid", "void"] as const;
const CURRENCIES = ["all", "USD", "EGP", "EUR", "GBP", "SAR", "AED"] as const;

export default function AdminLedgerPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("all");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);
      if (currency !== "all") params.set("currency", currency);
      if (reference.trim()) params.set("reference", reference.trim());

      const res = await fetch(`/api/admin/finance/ledger?${params}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load ledger.");
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load ledger.");
    } finally {
      setLoading(false);
    }
  }, [type, status, currency, reference, router]);

  useEffect(() => {
    void load();
  }, [load, router]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin · Finance
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Ledger
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Every financial movement on the platform, newest first.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-surface-1 p-4 md:grid-cols-[1fr_140px_140px_140px_auto]"
      >
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Search reference (e.g. conv:, deposit:)"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm capitalize"
        >
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm capitalize"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as (typeof CURRENCIES)[number])}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm uppercase"
        >
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button type="submit">Search</Button>
      </form>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="No ledger entries match these filters"
          description="Try adjusting the filters or clearing the reference search."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-subtle">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">Party</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e._id}
                    className="border-b border-border last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          e.type === "credit"
                            ? "success"
                            : e.type === "debit"
                              ? "danger"
                              : e.type === "fee"
                                ? "info"
                                : "default"
                        }
                      >
                        {e.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize text-text-muted">
                        {e.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {e.type === "credit" ? "+" : "−"}
                      {e.currency} {e.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-subtle">
                      {e.reference}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {e.organization?.name
                        ? `Org: ${e.organization.name}`
                        : e.user?.username
                          ? `@${e.user.username}`
                          : "—"}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-text-muted">
                      {e.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
