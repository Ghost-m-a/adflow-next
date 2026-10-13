"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { Mail, ShieldCheck } from "lucide-react";
import {
  EMAIL_PREFERENCE_KEYS,
  EMAIL_PREFERENCE_LABELS,
  normalizePreferences,
  type EmailPreferenceKey,
  type EmailPreferences,
} from "@/lib/email/preferences";

export default function EmailPreferencesPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<EmailPreferenceKey | "all" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me/email-preferences", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load preferences.");
      setPrefs(normalizePreferences(data.preferences));
      setEmail(data.email ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load preferences.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(key: EmailPreferenceKey, value: boolean) {
    if (!prefs) return;
    setSaving(key);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/me/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setPrefs(normalizePreferences(data.preferences));
      setNotice("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
      // Revert on failure.
      setPrefs((curr) => (curr ? { ...curr, [key]: !value } : curr));
    } finally {
      setSaving(null);
    }
  }

  async function pauseAll() {
    if (!window.confirm("Disable every optional email category?")) return;
    setSaving("all");
    setError("");
    setNotice("");
    try {
      const payload: Record<string, boolean> = {};
      for (const key of EMAIL_PREFERENCE_KEYS) payload[key] = false;

      const res = await fetch("/api/me/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
      setPrefs(normalizePreferences(data.preferences));
      setNotice("All optional emails paused.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(null);
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
            Email preferences
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Choose which emails ADFLOW sends to{" "}
            <span className="text-text">{email || "your inbox"}</span>.
          </p>
        </div>
        <Button variant="outline" onClick={() => void pauseAll()}>
          Pause all optional
        </Button>
      </header>

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading || !prefs ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Transactional emails are always sent
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    Password resets, email verification, and account security
                    notices are required and cannot be disabled.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {EMAIL_PREFERENCE_KEYS.map((key) => {
              const label = EMAIL_PREFERENCE_LABELS[key];
              const enabled = prefs[key];
              const busy = saving === key;

              return (
                <Card key={key}>
                  <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                        <Mail size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{label.title}</p>
                        <p className="mt-1 text-sm leading-6 text-text-muted">
                          {label.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      disabled={busy}
                      onClick={() => void update(key, !enabled)}
                      className={[
                        "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
                        enabled ? "bg-brand-500" : "bg-white/[0.1]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          enabled ? "translate-x-[22px]" : "translate-x-0.5",
                        ].join(" ")}
                      />
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
