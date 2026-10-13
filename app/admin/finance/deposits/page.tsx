"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RefreshCw, Wallet, XCircle } from "lucide-react";

type Deposit = {
  _id: string;
  organization: { _id: string; name: string; slug: string } | null;
  initiatedBy: { _id: string; username: string; email: string; name: string } | null;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "cancelled";
  provider: string;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
};

const FILTERS = ["pending", "succeeded", "failed", "cancelled", "all"] as const;

export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/finance/deposits?status=${filter}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load deposits.");
      setDeposits(data.deposits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load deposits.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load, router]);

  async function act(id: string, action: "confirm" | "fail") {
    let reason = "";
    if (action === "fail") {
      reason = window.prompt("Reason for failing this deposit?") ?? "";
      if (!reason) return;
    }

    setWorking(id);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/finance/deposits/${id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action === "fail" ? { reason } : {}),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update deposit.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update deposit.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin · Finance
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Deposits
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Confirm or fail manual wallet top-ups.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium capitalize transition",
              filter === f
                ? "bg-brand-500 text-white"
                : "border border-border bg-surface-2 text-text-muted hover:bg-white/5",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : deposits.length === 0 ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title={`No ${filter === "all" ? "" : filter} deposits`}
          description="Deposits will appear here when advertisers fund their wallet."
        />
      ) : (
        <div className="space-y-3">
          {deposits.map((d) => (
            <Card key={d._id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">
                      {d.organization?.name ?? "Organization"}
                    </h3>
                    <Badge
                      variant={
                        d.status === "succeeded"
                          ? "success"
                          : d.status === "failed"
                            ? "danger"
                            : d.status === "cancelled"
                              ? "default"
                              : "warning"
                      }
                    >
                      {d.status}
                    </Badge>
                    <span className="text-xs capitalize text-text-subtle">
                      {d.provider}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-text-subtle">
                    Initiated by {d.initiatedBy?.email ?? d.initiatedBy?.username ?? "—"}{" "}
                    · {new Date(d.createdAt).toLocaleString()}
                  </p>
                  {d.failureReason && (
                    <p className="mt-1 text-xs text-red-300">
                      {d.failureReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-text-subtle">Amount</p>
                    <p className="text-lg font-semibold">
                      {d.currency} {d.amount.toFixed(2)}
                    </p>
                  </div>

                  {d.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={working === d._id}
                        onClick={() => void act(d._id, "fail")}
                      >
                        <XCircle size={14} /> Fail
                      </Button>
                      <Button
                        size="sm"
                        disabled={working === d._id}
                        onClick={() => void act(d._id, "confirm")}
                      >
                        <CheckCircle2 size={14} /> Confirm
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
