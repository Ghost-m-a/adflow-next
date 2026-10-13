"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Skeleton,
} from "@/components/ui";
import { Building2, Plus, TrendingUp } from "lucide-react";

type Org = {
  _id: string;
  name: string;
  type: string;
  role: string;
  defaultCurrency: string;
};

type Client = {
  _id: string;
  name: string;
  slug: string;
  clientLabel: string;
  defaultCurrency: string;
  createdAt: string;
  stats: { totalCampaigns: number; activeCampaigns: number };
};

type Overview = {
  agency: { _id: string; name: string };
  clientCount: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudgetByCurrency: Record<string, number>;
  committedByCurrency: Record<string, number>;
  clients: Array<{ _id: string; name: string }>;
};

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Load the user's organizations.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/organizations/mine", { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        const list: Org[] = data.organizations ?? [];
        setOrgs(list);

        // Pick the first agency the user owns; otherwise the first org.
        const owned = list.find((o) => o.role === "owner");
        if (owned) setAgencyId(owned._id);
      } catch {
        setError("Unable to load organizations.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError("");
    try {
      const [oRes, cRes] = await Promise.all([
        fetch(`/api/agency/overview?agencyId=${agencyId}`, { cache: "no-store" }),
        fetch(`/api/agency/clients?agencyId=${agencyId}`, { cache: "no-store" }),
      ]);
      if (oRes.status === 403 || cRes.status === 403) {
        setError("You must be the agency owner to use this page.");
        return;
      }
      const oData = await oRes.json();
      const cData = await cRes.json();
      if (!oRes.ok) throw new Error(oData.error || "Unable to load overview.");
      if (!cRes.ok) throw new Error(cData.error || "Unable to load clients.");
      setOverview(oData);
      setClients(cData.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function enableAgency() {
    if (!agencyId) return;
    setError("");
    try {
      const res = await fetch("/api/agency/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: agencyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to enable.");
      setNotice("Agency mode enabled.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enable.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Agency
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Client workspaces
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Manage multiple client organizations from one account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {orgs.length > 1 && (
            <select
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
            >
              {orgs
                .filter((o) => o.role === "owner")
                .map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
            </select>
          )}
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={15} /> {showForm ? "Close" : "New client"}
          </Button>
        </div>
      </header>

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
          {error.includes("agency owner") && (
            <Button
              variant="outline"
              size="sm"
              className="ml-3"
              onClick={() => void enableAgency()}
            >
              Enable agency mode
            </Button>
          )}
        </div>
      )}

      {showForm && agencyId && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">Create a client workspace</h2>
            <ClientForm
              agencyId={agencyId}
              onCreated={() => {
                setShowForm(false);
                setNotice("Client workspace created.");
                void load();
              }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Clients" value={overview.clientCount.toString()} />
            <Stat label="Total campaigns" value={overview.totalCampaigns.toString()} />
            <Stat
              label="Active campaigns"
              value={overview.activeCampaigns.toString()}
              accent="emerald"
            />
            <Stat
              label="Total budget"
              value={Object.entries(overview.totalBudgetByCurrency)
                .map(([c, v]) => `${c} ${v.toLocaleString()}`)
                .join(" · ") || "—"}
              accent="brand"
            />
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Clients</h2>
            {clients.length === 0 ? (
              <EmptyState
                icon={<Building2 size={20} />}
                title="No clients yet"
                description="Create a client workspace to manage their campaigns separately."
                action={<Button onClick={() => setShowForm(true)}>Create client</Button>}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {clients.map((c) => (
                  <Card key={c._id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">{c.clientLabel}</h3>
                          <p className="mt-1 text-xs text-text-subtle">
                            {c.name}
                          </p>
                        </div>
                        <Badge variant="brand">{c.defaultCurrency}</Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-white/[0.03] p-3">
                          <p className="text-text-subtle">Campaigns</p>
                          <p className="mt-1 font-semibold">
                            {c.stats.totalCampaigns}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-3">
                          <p className="text-text-subtle">Active</p>
                          <p className="mt-1 font-semibold text-emerald-300">
                            {c.stats.activeCampaigns}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/advertiser/campaigns?organizationId=${c._id}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 hover:text-brand-200"
                      >
                        <TrendingUp size={14} /> Open campaigns
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function ClientForm({
  agencyId,
  onCreated,
  onCancel,
}: {
  agencyId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          name,
          clientLabel: label || undefined,
          defaultCurrency: currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create client.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create client.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <Input
        label="Client name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Northwind Traders"
        required
        minLength={2}
        maxLength={120}
      />
      <Input
        label="Internal label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Optional — how you refer to them internally"
        maxLength={120}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium">Default currency</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
        >
          {["USD", "EGP", "EUR", "GBP", "SAR", "AED"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

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
          Create client
        </Button>
      </div>
    </form>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "emerald" | "brand";
}) {
  const styles = {
    default: "border-border bg-surface-1",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.06]",
    brand: "border-brand-400/20 bg-brand-500/[0.06]",
  };
  return (
    <Card className={styles[accent]}>
      <CardContent className="p-5">
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mt-2 break-words text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
