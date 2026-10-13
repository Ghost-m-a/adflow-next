"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing token.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to verify email.");
        setState("ok");
        setMessage("Your email is now verified.");
      } catch (err) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Unable to verify.");
      }
    })();
  }, [token]);

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Email verification
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {state === "loading" ? "Verifying…" : state === "ok" ? "Verified" : "Verification failed"}
      </h1>
      <p className="mt-3 text-sm text-text-muted">{message}</p>

      <Link
        href="/advertiser"
        className="mt-6 inline-block rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Open ADFLOW
      </Link>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <VerifyContent />
    </Suspense>
  );
}
