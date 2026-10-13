"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, Input } from "@/components/ui";

function ResetContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to reset password.");
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Invalid link</h1>
        <p className="mt-3 text-sm text-text-muted">
          This reset link is missing its token. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block font-semibold text-brand-300 hover:text-brand-200"
        >
          Request reset
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Password updated</h1>
        <p className="mt-3 text-sm text-text-muted">
          Redirecting to sign in…
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Reset password
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose a new password</h1>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
          maxLength={128}
          placeholder="At least 12 characters"
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          maxLength={128}
        />

        {error && (
          <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link href="/login" className="font-semibold text-brand-300 hover:text-brand-200">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <ResetContent />
    </Suspense>
  );
}
