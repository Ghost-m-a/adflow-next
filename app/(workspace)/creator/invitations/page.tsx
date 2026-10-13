"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { Building2, Mail } from "lucide-react";

type Invitation = {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    slug: string;
    currency: string;
    status: string;
    rewardPerCreator: number;
    category?: string;
    coverImageUrl?: string;
  } | null;
  organization: { _id: string; name: string; logoUrl?: string } | null;
  message: string;
  status: "pending" | "accepted" | "declined" | "expired" | "revoked";
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
};

const FILTERS = ["pending", "accepted", "declined", "all"] as const;

export default function CreatorInvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/creator/campaign-invitations", {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load invitations.");
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load invitations.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(id: string, action: "accept" | "decline") {
    setWorking(id);
    setError("");
    try {
      const res = await fetch(
        `/api/creator/campaign-invitations/${id}/${action}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to respond.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to respond.");
    } finally {
      setWorking(null);
    }
  }

  const visible = invitations.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Invitations
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Advertisers who want to work with you. Accept to join the campaign
          immediately.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium capitalize transition",
              filter === f
                ? "bg-brand-500 text-white"
                : "border border-border bg-surface-2 text-text-muted hover:bg-white/5",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Mail size={20} />}
          title={
            invitations.length
              ? `No ${filter} invitations`
              : "No invitations yet"
          }
          description={
            invitations.length
              ? "Try another filter."
              : "When an advertiser invites you to a campaign, it will show up here."
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((inv) => {
            const expired = new Date(inv.expiresAt) < new Date();
            const isPending = inv.status === "pending" && !expired;
            const busy = working === inv._id;

            return (
              <Card key={inv._id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {inv.organization?.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={inv.organization.logoUrl}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : inv.organization?.name ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15 text-[9px] font-bold text-brand-300">
                            {inv.organization.name.charAt(0).toUpperCase()}
                          </span>
                        ) : null}
                        <span className="truncate text-xs text-text-subtle">
                          {inv.organization?.name ?? "Advertiser"}
                        </span>
                      </div>
                      <h3 className="mt-2 truncate font-semibold">
                        {inv.campaign?.title ?? "Campaign"}
                      </h3>
                      {inv.campaign && (
                        <p className="mt-1 text-xs text-text-subtle">
                          {inv.campaign.currency} {inv.campaign.rewardPerCreator}{" "}
                          per creator · {inv.campaign.category || "—"}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant={
                        inv.status === "accepted"
                          ? "success"
                          : inv.status === "declined" || inv.status === "revoked"
                            ? "danger"
                            : expired
                              ? "default"
                              : "warning"
                      }
                    >
                      {expired && inv.status === "pending" ? "expired" : inv.status}
                    </Badge>
                  </div>

                  {inv.message && (
                    <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-white/[0.02] p-3 text-sm text-text-muted">
                      {inv.message}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-text-subtle">
                    {inv.status === "pending"
                      ? `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`
                      : inv.respondedAt
                        ? `Responded ${new Date(inv.respondedAt).toLocaleDateString()}`
                        : ""}
                  </p>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Link
                      href={
                        inv.campaign ? `/campaigns/${inv.campaign.slug}` : "/campaigns"
                      }
                    >
                      <Button variant="outline" size="sm">
                        <Building2 size={14} /> View campaign
                      </Button>
                    </Link>

                    {isPending && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() => void respond(inv._id, "decline")}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void respond(inv._id, "accept")}
                        >
                          {busy ? "Accepting…" : "Accept"}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
