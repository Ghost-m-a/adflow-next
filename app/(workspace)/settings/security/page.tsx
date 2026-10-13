"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, CardContent, Input, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";

type Step = "idle" | "setting_up" | "showing_codes" | "enabled";

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Setup state
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  // Backup codes shown once
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Disable state
  const [disableToken, setDisableToken] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const user = data.user ?? data;
        setEnabled(Boolean(user.twoFactorEnabled));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function startSetup() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/me/two-factor/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start setup.");
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStep("setting_up");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/me/two-factor/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to confirm.");
      setBackupCodes(data.backupCodes);
      setEnabled(true);
      setStep("showing_codes");
      setToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to confirm.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/me/two-factor/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: disableToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to disable.");
      setEnabled(false);
      setShowDisable(false);
      setDisableToken("");
      setNotice("Two-factor authentication disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to disable.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  // Generate QR data URL client-side once we have the otpauth URL.
  useEffect(() => {
    if (!otpauthUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(otpauthUrl, {
          width: 240,
          margin: 1,
          color: { dark: "#ffffff", light: "#0b0f19" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        // Fallback — user can copy the secret manually.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [otpauthUrl]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Security
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Protect your account with an authenticator app.
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

      {step === "showing_codes" ? (
        <Card className="border-emerald-400/20 bg-emerald-400/[0.03]">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-emerald-400" />
              <h2 className="text-base font-semibold">
                Two-factor authentication enabled
              </h2>
            </div>
            <p className="mt-2 text-sm text-text-muted">
              Save these backup codes somewhere safe. Each code can be used
              once if you lose access to your authenticator app. They
              won&apos;t be shown again.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-[#0b1020] p-4 font-mono text-sm sm:grid-cols-5">
              {backupCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void copyCodes()}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy all"}
              </Button>
              <Button onClick={() => setStep("enabled")}>Done</Button>
            </div>
          </CardContent>
        </Card>
      ) : step === "setting_up" ? (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">
              Scan the QR code
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Open your authenticator app (Google Authenticator, 1Password,
              Authy, …) and scan the code below.
            </p>

            <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR code"
                  className="h-48 w-48 rounded-xl border border-border"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-dashed border-border text-xs text-text-subtle">
                  Generating…
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-subtle">
                  Can&apos;t scan? Enter this secret manually:
                </p>
                <div className="mt-1 break-all rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs">
                  {secret}
                </div>

                <form onSubmit={confirmSetup} className="mt-5 space-y-3">
                  <Input
                    label="Verification code"
                    value={token}
                    onChange={(e) =>
                      setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="6 digits"
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep("idle");
                        setToken("");
                        setSecret("");
                        setOtpauthUrl("");
                        setQrDataUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={token.length !== 6}>
                      Verify & enable
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    enabled
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-white/[0.04] text-text-muted",
                  ].join(" ")}
                >
                  {enabled ? <ShieldCheck size={18} /> : <KeyRound size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Two-factor authentication</p>
                    <Badge variant={enabled ? "success" : "default"}>
                      {enabled ? "enabled" : "disabled"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    {enabled
                      ? "You'll be asked for a code from your authenticator app on sign-in from a new device."
                      : "Add an extra layer of security with an authenticator app."}
                  </p>
                </div>
              </div>

              {!enabled ? (
                <Button onClick={() => void startSetup()} loading={busy}>
                  Enable 2FA
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => setShowDisable((v) => !v)}
                >
                  <ShieldOff size={15} /> Disable
                </Button>
              )}
            </div>

            {enabled && showDisable && (
              <form
                onSubmit={disable}
                className="mt-5 space-y-3 border-t border-border pt-5"
              >
                <p className="text-sm text-text-muted">
                  Enter a code from your authenticator app to disable 2FA.
                </p>
                <Input
                  label="Verification code"
                  value={disableToken}
                  onChange={(e) =>
                    setDisableToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6 digits"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDisable(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    loading={busy}
                    disabled={disableToken.length !== 6}
                  >
                    Confirm disable
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
