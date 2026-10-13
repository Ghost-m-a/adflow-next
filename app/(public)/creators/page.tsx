"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardContent, EmptyState, Input } from "@/components/ui";
import { BadgeCheck, Users } from "lucide-react";

type Profile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  country: string;
  niches: string[];
  isVerified: boolean;
  approvedConversions: number;
};

export default function CreatorsDirectoryPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [niche, setNiche] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (niche.trim()) params.set("niche", niche.trim());
      if (country.trim()) params.set("country", country.trim());

      const res = await fetch(`/api/creators/discover?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load creators.");
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load creators.");
    } finally {
      setLoading(false);
    }
  }, [q, niche, country]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void load();
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
          Public directory
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Discover creators</h1>
        <p className="mt-3 max-w-2xl text-text-muted">
          Verified creators ranked by approved conversions and audience fit.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-surface-1 p-4 md:grid-cols-[1fr_180px_180px_auto]"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, or bio"
        />
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Niche (e.g. fitness)"
        />
        <Input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country (e.g. EG)"
          maxLength={2}
        />
        <Button type="submit">Search</Button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-text-muted">Loading creators…</p>
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No creators found"
            description="Try another search term or clear the filters."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((p) => (
              <Link key={p.userId} href={`/creators/${p.username}`} className="block">
                <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand-400/40">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatarUrl}
                          alt={p.displayName}
                          className="h-12 w-12 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15 font-bold text-brand-300">
                          {(p.displayName || p.username).charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="truncate font-semibold">{p.displayName}</h2>
                          {p.isVerified && (
                            <BadgeCheck size={15} className="shrink-0 text-brand-400" />
                          )}
                        </div>
                        <p className="truncate text-xs text-text-subtle">
                          @{p.username}
                          {p.country ? ` · ${p.country}` : ""}
                        </p>
                      </div>
                    </div>

                    {p.bio && (
                      <p className="mt-3 line-clamp-2 text-sm text-text-muted">
                        {p.bio}
                      </p>
                    )}

                    {p.niches.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.niches.slice(0, 3).map((n) => (
                          <Badge key={n} variant="brand">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="mt-auto pt-4 text-xs text-text-subtle">
                      <span className="font-semibold text-emerald-300">
                        {p.approvedConversions}
                      </span>{" "}
                      approved conversions
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
