"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, Skeleton } from "@/components/ui";

type Profile = {
  name?: string;
  username: string;
  email: string;
  platformRole?: string;
  isEmailVerified?: boolean;
};

export default function AdvertiserSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
        if (r.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Unable to load profile.");
        if (!cancelled) setProfile(data.user ?? data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Profile settings
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Review the account information associated with your ADFLOW profile.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : profile ? (
            <dl className="divide-y divide-border">
              <Row label="Full name" value={profile.name || "Not provided"} />
              <Row label="Username" value={`@${profile.username}`} />
              <Row label="Email" value={profile.email} />
              <Row label="Account type" value={profile.platformRole === "admin" ? "Administrator" : "User"} />
              {profile.isEmailVerified !== undefined && (
                <Row label="Email verification" value={profile.isEmailVerified ? "Verified" : "Not verified"} />
              )}
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}
