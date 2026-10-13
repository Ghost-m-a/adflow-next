"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, PasswordInput } from "@/components/ui";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [totp, setTotp] = useState("");

  // Surface OAuth errors passed via ?error=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const e = url.searchParams.get("error");
    if (!e) return;
    const map: Record<string, string> = {
      oauth_denied: "Google sign-in was cancelled.",
      oauth_start_failed: "Could not start Google sign-in.",
      oauth_missing_params: "Google sign-in response was incomplete.",
      oauth_state_missing: "Google sign-in session expired. Try again.",
      oauth_state_mismatch: "Security check failed. Try signing in again.",
      oauth_not_configured: "Google sign-in is not available right now.",
      oauth_callback_failed: "Google sign-in failed. Please try again.",
      account_suspended: "This account is currently disabled.",
    };
    setError(map[e] ?? "Sign-in failed.");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          identifier,
          password,
          rememberMe,
          ...(requiresTwoFactor ? { totp } : {}),
        }),
      });
      const data = await res.json();

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setError("");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }

      router.replace("/advertiser");
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Welcome back
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Sign in to ADFLOW
      </h1>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        Access your campaigns, earnings, and creator dashboard.
      </p>

      <div className="mt-6 space-y-4">
        <GoogleButton label="Continue with Google" />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-canvas px-2 uppercase tracking-wider text-text-subtle">
              or
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Username or email"
          name="identifier"
          autoComplete="username"
          required
          maxLength={254}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@example.com or username"
        />

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />

        {requiresTwoFactor && (
          <div>
            <label
              htmlFor="totp"
              className="mb-1.5 block text-sm font-medium"
            >
              Two-factor code
            </label>
            <input
              id="totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={totp}
              onChange={(e) =>
                setTotp(
                  e.target.value.replace(/[^\dA-Za-z-]/g, "").slice(0, 10),
                )
              }
              placeholder="6 digits or backup code"
              autoFocus
              className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="mt-1.5 text-xs text-text-subtle">
              Enter the 6-digit code from your authenticator app, or a backup
              code.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="font-medium text-brand-300 hover:text-brand-200"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {requiresTwoFactor ? "Verify and sign in" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-300 hover:text-brand-200"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
