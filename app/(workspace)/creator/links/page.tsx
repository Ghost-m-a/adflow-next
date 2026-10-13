"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ui";
import { Check, Copy, Link2 } from "lucide-react";

type Link = {
  _id: string;
  campaignId: string;
  campaign: { title: string; slug: string; status: string; currency: string; rewardPerCreator: number } | null;
  isActive: boolean;
  clicks: number;
  conversions: number;
  createdAt: string;
  fullUrl: string;
};

export default function CreatorLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/creator/links", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load links.");
      setLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load links.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyLink(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Fallback: select the input text.
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tracking links
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Share these links in your content. Every click and conversion is attributed back to you.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<Link2 size={20} />}
          title="No tracking links yet"
          description="Once an advertiser generates a link for you on an accepted campaign, it will appear here."
          action={
            <Button onClick={() => router.push("/creator/marketplace")}>
              Discover campaigns
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <Card key={link._id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">
                      {link.campaign?.title ?? "Campaign"}
                    </h2>
                    <p className="mt-1 text-xs capitalize text-text-subtle">
                      {link.campaign?.status ?? "unknown"} ·{" "}
                      {link.campaign?.currency ?? "USD"}{" "}
                      {link.campaign?.rewardPerCreator ?? 0} per conversion
                    </p>
                  </div>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      link.isActive
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-white/5 text-text-muted",
                    ].join(" ")}
                  >
                    {link.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    value={link.fullUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={() => void copyLink(link.fullUrl, link._id)}
                  >
                    {copied === link._id ? (
                      <>
                        <Check size={15} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={15} /> Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-text-subtle">Clicks</p>
                    <p className="mt-1 font-semibold">{link.clicks}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-text-subtle">Conversions</p>
                    <p className="mt-1 font-semibold">{link.conversions}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-text-subtle">Conversion rate</p>
                    <p className="mt-1 font-semibold">
                      {link.clicks > 0
                        ? `${((link.conversions / link.clicks) * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
