"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Skeleton,
} from "@/components/ui";
import { Check, Copy, KeyRound, Trash2, Webhook } from "lucide-react";

type ApiKey = {
  _id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

type WebhookEndpoint = {
  _id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  consecutiveFailures: number;
  lastDeliveryAt: string | null;
};

type Org = { _id: string; name: string; role: string };

const SCOPES = [
  "read:campaigns",
  "write:campaigns",
  "read:conversions",
  "write:conversions",
  "read:analytics",
] as const;

const EVENTS = [
  "conversion.created",
  "conversion.approved",
  "conversion.rejected",
  "submission.approved",
  "submission.rejected",
  "payout.paid",
  "payout.failed",
  "invitation.accepted",
] as const;

export default function ApiSettingsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newKey, setNewKey] = useState<{ name: string; value: string } | null>(null);
  const [newSecret, setNewSecret] = useState<{ url: string; secret: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Load orgs once.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/organizations/mine", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      const list: Org[] = (data.organizations ?? []).filter(
        (o: Org) => o.role === "owner" || o.role === "admin",
      );
      setOrgs(list);
      if (list[0]) setOrgId(list[0]._id);
    })();
  }, [router]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const [kRes, wRes] = await Promise.all([
        fetch(`/api/api-keys?organizationId=${orgId}`, { cache: "no-store" }),
        fetch(`/api/webhooks/endpoints?organizationId=${orgId}`, {
          cache: "no-store",
        }),
      ]);
      const kData = await kRes.json();
      const wData = await wRes.json();
      if (!kRes.ok) throw new Error(kData.error || "Unable to load keys.");
      if (!wRes.ok) throw new Error(wData.error || "Unable to load webhooks.");
      setKeys(kData.keys || []);
      setEndpoints(wData.endpoints || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(value: string, tag: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(tag);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  async function createKey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "");
    const scopes = formData.getAll("scopes").map(String);

    setError("");
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, name, scopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create key.");
      setNewKey({ name: data.record.name, value: data.key });
      setNotice("API key created. Copy it now — it will not be shown again.");
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create key.");
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Applications using it will fail.")) return;
    try {
      const res = await fetch(
        `/api/api-keys/${id}?organizationId=${orgId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to revoke.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke.");
    }
  }

  async function createWebhook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("wname") ?? "");
    const url = String(formData.get("url") ?? "");
    const events = formData.getAll("events").map(String);

    setError("");
    try {
      const res = await fetch("/api/webhooks/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, name, url, events }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create webhook.");
      setNewSecret({ url, secret: data.endpoint.secret });
      setNotice("Webhook created. Save the signing secret.");
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create webhook.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Developers
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Manage API keys and outbound webhooks.
          </p>
        </div>

        {orgs.length > 1 && (
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
          >
            {orgs.map((o) => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
        )}
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

      {newKey && (
        <Card className="border-brand-400/30 bg-brand-500/[0.04]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-brand-300" />
              <p className="font-semibold">Your new API key</p>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Copy this key now. It will not be shown again.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-border bg-[#0b1020] p-3 font-mono text-xs">
                {newKey.value}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copy(newKey.value, "newkey")}
              >
                {copied === "newkey" ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              onClick={() => setNewKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API keys */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">API keys</h2>

        <Card>
          <CardContent className="p-5">
            <form onSubmit={createKey} className="space-y-3">
              <Input
                name="name"
                label="Key name"
                placeholder="e.g. Production integration"
                required
                minLength={2}
                maxLength={100}
              />

              <div>
                <p className="mb-1.5 text-sm font-medium">Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs"
                    >
                      <input type="checkbox" name="scopes" value={s} />
                      <span className="font-mono">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit">Create key</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-24" />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound size={20} />}
            title="No API keys yet"
            description="Create a key to access the public API for this organization."
          />
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <Card key={k._id}>
                <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{k.name}</p>
                      <code className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                        {k.prefix}…
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-text-subtle">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt &&
                        ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <Badge key={s} variant="default">{s}</Badge>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void revokeKey(k._id)}
                    className="self-start rounded-lg p-2 text-red-300 hover:bg-red-500/10"
                    aria-label="Revoke key"
                  >
                    <Trash2 size={15} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Webhooks */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Webhook endpoints</h2>

        <Card>
          <CardContent className="p-5">
            <form onSubmit={createWebhook} className="space-y-3">
              <Input
                name="wname"
                label="Endpoint name"
                placeholder="e.g. Production receiver"
                required
                minLength={2}
                maxLength={100}
              />
              <Input
                name="url"
                label="Endpoint URL"
                type="url"
                placeholder="https://example.com/webhooks/adflow"
                required
              />

              <div>
                <p className="mb-1.5 text-sm font-medium">Subscribe to events</p>
                <div className="flex flex-wrap gap-2">
                  {EVENTS.map((e) => (
                    <label
                      key={e}
                      className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs"
                    >
                      <input type="checkbox" name="events" value={e} />
                      <span className="font-mono">{e}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit">Add webhook</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {newSecret && (
          <Card className="border-brand-400/30 bg-brand-500/[0.04]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Webhook size={16} className="text-brand-300" />
                <p className="font-semibold">Signing secret</p>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Verify every request with this secret. It will not be shown again.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg border border-border bg-[#0b1020] p-3 font-mono text-xs">
                  {newSecret.secret}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void copy(newSecret.secret, "secret")}
                >
                  {copied === "secret" ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-3"
                onClick={() => setNewSecret(null)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Skeleton className="h-24" />
        ) : endpoints.length === 0 ? (
          <EmptyState
            icon={<Webhook size={20} />}
            title="No webhooks yet"
            description="Add an endpoint to receive events when conversions are approved, payouts complete, and more."
          />
        ) : (
          <div className="space-y-2">
            {endpoints.map((w) => (
              <Card key={w._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{w.name}</p>
                      <p className="mt-0.5 break-all text-xs text-text-muted">
                        {w.url}
                      </p>
                    </div>
                    <Badge variant={w.isActive ? "success" : "default"}>
                      {w.isActive ? "active" : "paused"}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {w.events.map((e) => (
                      <Badge key={e} variant="default">
                        {e}
                      </Badge>
                    ))}
                  </div>

                  {w.consecutiveFailures > 0 && (
                    <p className="mt-2 text-xs text-amber-300">
                      {w.consecutiveFailures} consecutive failure
                      {w.consecutiveFailures === 1 ? "" : "s"}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-6 text-text-subtle">
        API requests are authenticated with the <code className="font-mono">X-API-Key</code>{" "}
        header. Webhook deliveries are signed with{" "}
        <code className="font-mono">X-ADFLOW-Signature</code> — HMAC-SHA256 of{" "}
        <code className="font-mono">{`{timestamp}.{body}`}</code>.
      </p>
    </div>
  );
}
