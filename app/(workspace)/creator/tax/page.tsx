"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
} from "@/components/ui";
import { AlertCircle, CheckCircle2, FileText, ShieldCheck } from "lucide-react";

type TaxStatus = {
  required: boolean;
  onFile: boolean;
  approved: boolean;
  threshold: number;
  earningsByCurrency: Record<string, number>;
  usdEarnings: number;
  profile: {
    status: "pending" | "approved" | "rejected";
    formType: string;
    tinLast4: string;
    country: string;
    reviewedAt: string | null;
    reviewNotes: string | null;
  } | null;
  canRequestPayout: boolean;
};

const US_PERSON_FORM = "W-9";
const NON_US_FORM = "W-8BEN";

export default function CreatorTaxPage() {
  const router = useRouter();
  const [status, setStatus] = useState<TaxStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/creator/tax", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !status) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tax information
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Submit your tax form to unlock payouts once you cross the reporting
          threshold.
        </p>
      </header>

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

      {/* Earnings summary */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-subtle">
                Lifetime earnings
              </p>
              <p className="mt-1 text-2xl font-bold">
                USD {status.usdEarnings.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-text-subtle">
                Threshold: USD {status.threshold}
              </p>
            </div>

            <div className="text-right">
              {status.canRequestPayout ? (
                <Badge variant="success">
                  <CheckCircle2 size={12} /> Payouts enabled
                </Badge>
              ) : (
                <Badge variant="warning">
                  <AlertCircle size={12} /> Action required
                </Badge>
              )}
            </div>
          </div>

          {Object.keys(status.earningsByCurrency).length > 1 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {Object.entries(status.earningsByCurrency).map(([c, v]) => (
                <div key={c} className="rounded-lg bg-white/[0.03] p-3 text-xs">
                  <p className="text-text-subtle">{c}</p>
                  <p className="mt-1 font-semibold">{v.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status card */}
      {status.profile ? (
        <Card
          className={
            status.profile.status === "rejected"
              ? "border-red-400/20 bg-red-400/[0.03]"
              : status.profile.status === "approved"
                ? "border-emerald-400/20 bg-emerald-400/[0.03]"
                : ""
          }
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    status.profile.status === "approved"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : status.profile.status === "rejected"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-amber-500/15 text-amber-300",
                  ].join(" ")}
                >
                  {status.profile.status === "approved" ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <FileText size={18} />
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    Form {status.profile.formType} · TIN ••••{status.profile.tinLast4}
                  </p>
                  <p className="mt-1 text-xs text-text-subtle">
                    {status.profile.country} ·{" "}
                    {status.profile.status === "pending"
                      ? "Awaiting review"
                      : status.profile.status === "approved"
                        ? `Approved${status.profile.reviewedAt ? ` ${new Date(status.profile.reviewedAt).toLocaleDateString()}` : ""}`
                        : "Rejected"}
                  </p>
                </div>
              </div>

              {status.profile.status === "rejected" && (
                <Badge variant="danger">Rejected</Badge>
              )}
              {status.profile.status === "pending" && (
                <Badge variant="warning">Under review</Badge>
              )}
              {status.profile.status === "approved" && (
                <Badge variant="success">On file</Badge>
              )}
            </div>

            {status.profile.reviewNotes && (
              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-3 text-sm text-red-200">
                {status.profile.reviewNotes}
              </p>
            )}

            {status.profile.status === "rejected" && (
              <Button
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Resubmit form
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                <FileText size={18} />
              </div>
              <div>
                <p className="font-semibold">No tax form on file</p>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  {status.required
                    ? "Your earnings have crossed the reporting threshold. Submit a tax form to continue receiving payouts."
                    : "You can submit your tax form now to avoid interruptions later."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <TaxForm
          onSubmitted={() => {
            setShowForm(false);
            setNotice("Tax form submitted. We'll review it shortly.");
            void load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <p className="text-xs leading-6 text-text-subtle">
        Your tax identification number is encrypted at rest with AES-256-GCM
        and is only decrypted when required for reporting.
      </p>
    </div>
  );
}

function TaxForm({
  onSubmitted,
  onCancel,
}: {
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [formType, setFormType] = useState(US_PERSON_FORM);
  const [legalName, setLegalName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("US");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [tin, setTin] = useState("");
  const [isUsPerson, setIsUsPerson] = useState(true);
  const [treatyCountry, setTreatyCountry] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleUsPerson(next: boolean) {
    setIsUsPerson(next);
    setFormType(next ? US_PERSON_FORM : NON_US_FORM);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/creator/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType,
          legalName,
          businessName,
          country,
          address: { line1, line2, city, state, postalCode },
          tin,
          isUsPerson,
          treatyCountry: treatyCountry || undefined,
          signatureName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">Tax form</h2>
        <p className="mt-1 text-sm text-text-muted">
          Complete the fields below. Fields marked * are required.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => toggleUsPerson(true)}
              className={[
                "rounded-xl border p-4 text-left transition",
                isUsPerson
                  ? "border-brand-400/50 bg-brand-500/10"
                  : "border-border bg-surface-2 hover:border-white/20",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold">US person (W-9)</span>
              <span className="mt-1 block text-xs text-text-muted">
                US citizens, residents, and US entities.
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleUsPerson(false)}
              className={[
                "rounded-xl border p-4 text-left transition",
                !isUsPerson
                  ? "border-brand-400/50 bg-brand-500/10"
                  : "border-border bg-surface-2 hover:border-white/20",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold">Non-US person (W-8BEN)</span>
              <span className="mt-1 block text-xs text-text-muted">
                Individuals and entities outside the United States.
              </span>
            </button>
          </div>

          <Input
            label="Legal name *"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            required
            maxLength={200}
          />

          <Input
            label="Business name (optional)"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            maxLength={200}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Country (2-letter code) *"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              required
            />
            <Input
              label="Tax identification number *"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              placeholder={isUsPerson ? "SSN or EIN" : "Foreign TIN"}
              maxLength={20}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Address line 1 *" value={line1} onChange={(e) => setLine1(e.target.value)} required />
            <Input label="Address line 2" value={line2} onChange={(e) => setLine2(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="City *" value={city} onChange={(e) => setCity(e.target.value)} required />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
            <Input label="Postal code *" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
          </div>

          {!isUsPerson && (
            <Input
              label="Treaty country (optional)"
              value={treatyCountry}
              onChange={(e) => setTreatyCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="Two-letter code, if claiming treaty benefits"
              maxLength={2}
            />
          )}

          <Input
            label="Signature (type your full legal name) *"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            required
            maxLength={200}
          />

          <p className="rounded-xl border border-border bg-white/[0.02] p-3 text-xs leading-5 text-text-muted">
            By typing your name you certify that the information provided is
            true, correct, and complete. You may be subject to penalties for
            falsification.
          </p>

          {error && (
            <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Submit tax form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
