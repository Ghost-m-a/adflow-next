"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { CheckCircle2, FileText, RefreshCw, XCircle } from "lucide-react";

type Profile = {
  _id: string;
  user: { _id: string; name: string; username: string; email: string; country: string } | null;
  formType: string;
  legalName: string;
  businessName: string | null;
  country: string;
  address: { line1: string; line2?: string; city: string; state?: string; postalCode: string };
  tinLast4: string;
  isUsPerson: boolean;
  treatyCountry: string | null;
  signatureName: string;
  signedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewNotes: string | null;
  createdAt: string;
};

const FILTERS = ["pending", "approved", "rejected"] as const;

export default function AdminTaxPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<Profile | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tax?status=${filter}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setWorking(id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/tax/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to approve.");
      setNotice("Tax form approved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve.");
    } finally {
      setWorking(null);
    }
  }

  async function submitReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!openFor) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }

    setWorking(openFor._id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/tax/${openFor._id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to reject.");
      setNotice("Tax form rejected.");
      setOpenFor(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Admin · Compliance
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Tax forms
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Review creator tax information before approving payouts.
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

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title={`No ${filter} forms`}
          description="Submitted tax forms will appear here for review."
        />
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <Card key={p._id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">
                        {p.user?.name || p.user?.username || "User"}
                      </h3>
                      <Badge
                        variant={
                          p.status === "approved"
                            ? "success"
                            : p.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {p.status}
                      </Badge>
                      <Badge variant="default">{p.formType}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-subtle">
                      {p.user?.email} · {p.country}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {p.status === "pending" && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setOpenFor(p);
                            setReason("");
                          }}
                        >
                          <XCircle size={14} /> Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={working === p._id}
                          onClick={() => void approve(p._id)}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-xl border border-border bg-white/[0.02] p-4 text-sm sm:grid-cols-2">
                  <Field label="Legal name" value={p.legalName} />
                  <Field label="Business name" value={p.businessName ?? "—"} />
                  <Field label="TIN" value={`•••• ${p.tinLast4}`} />
                  <Field label="Country" value={p.country} />
                  <Field
                    label="Address"
                    value={[
                      p.address.line1,
                      p.address.line2,
                      `${p.address.city}${p.address.state ? `, ${p.address.state}` : ""} ${p.address.postalCode}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <Field
                    label="Signature"
                    value={`${p.signatureName} · ${new Date(p.signedAt).toLocaleDateString()}`}
                  />
                </div>

                {p.reviewNotes && (
                  <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-3 text-sm text-red-200">
                    {p.reviewNotes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {openFor && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenFor(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#101522] shadow-2xl"
          >
            <div className="border-b border-white/[0.08] p-5">
              <p className="text-xs uppercase tracking-wider text-red-300">
                Reject tax form
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {openFor.user?.name || openFor.user?.username}
              </h2>
            </div>

            <form onSubmit={submitReject} className="space-y-4 p-5">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
                minLength={5}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Why can't this form be approved?"
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setOpenFor(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Confirm rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-text-subtle">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  );
}
