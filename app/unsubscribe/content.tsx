"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";

export function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "done" | "error">(
    token ? "confirm" : "error",
  );
  const [message, setMessage] = useState(
    token ? "" : "Missing unsubscribe token.",
  );

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing unsubscribe token.");
    }
  }, [token]);

  async function confirm() {
    setState("busy");
    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to unsubscribe.");
      setMessage(data.message || "You've been unsubscribed.");
      setState("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to unsubscribe.");
      setState("error");
    }
  }

  if (state === "confirm") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Unsubscribe
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Stop receiving this type of email?
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          You&apos;ll still receive transactional emails like password resets
          and email verification. You can re-enable this category any time from
          your settings.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/settings/email"
            className="inline-flex items-center justify-center rounded-xl border border-border-strong px-5 py-3 text-sm font-medium text-text hover:bg-white/5"
          >
            Manage preferences
          </Link>
          <Button onClick={() => void confirm()}>Confirm unsubscribe</Button>
        </div>
      </>
    );
  }

  if (state === "busy") {
    return <p className="text-sm text-text-muted">Updating…</p>;
  }

  if (state === "done") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Done
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Unsubscribed</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">{message}</p>
        <Link
          href="/settings/email"
          className="mt-6 inline-flex rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Manage all preferences
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
        Error
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        Could not unsubscribe
      </h1>
      <p className="mt-3 text-sm leading-6 text-text-muted">{message}</p>
      <Link
        href="/settings/email"
        className="mt-6 inline-flex rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Open preferences
      </Link>
    </>
  );
}
