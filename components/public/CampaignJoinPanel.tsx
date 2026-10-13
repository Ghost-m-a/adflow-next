"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { Check, LogIn, Sparkles, X } from "lucide-react";

type Props = {
  campaignId: string;
  campaignTitle: string;
  currency: string;
  rewardPerThousand: number;
  rewardPerCreator: number;
  rewardModel: "per_creator" | "cpm" | "hybrid";
  isAcceptingApplications: boolean;
  slotsFilled: number;
  maxCreators: number;
};

type Me = { id: string; username: string; name?: string; platformRole?: string } | null;

export function CampaignJoinPanel(props: Props) {
  const router = useRouter();
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [hasApplied, setHasApplied] = useState(false);

  // Detect auth state once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) setMe(null);
          return;
        }
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) setMe(data.user ?? data ?? null);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check existing applications for this campaign once signed in.
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/creator/applications", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const already = (data.applications ?? []).some((a: {
          campaignId?: string | { _id?: string };
        }) => {
          const id =
            typeof a.campaignId === "string"
              ? a.campaignId
              : a.campaignId?._id;
          return id === props.campaignId;
        });
        if (!cancelled) setHasApplied(already);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [me, props.campaignId]);

  const slotsLeft = Math.max(0, props.maxCreators - props.slotsFilled);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (message.trim().length < 10) {
      setError("Tell the advertiser why you're a good fit (at least 10 characters).");
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = { message: message.trim() };
      if (proposedRate.trim()) body.proposedRate = Number(proposedRate);

      const res = await fetch(
        `/api/campaigns/${props.campaignId}/applications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();

      if (res.status === 401) {
        router.push(`/login?next=/campaigns`);
        return;
      }
      if (!res.ok) {
        const issues = data.issues
          ?.map((i: { message: string }) => i.message)
          .join(" ");
        throw new Error(issues || data.error || "Unable to apply.");
      }

      setHasApplied(true);
      setOpen(false);
      setMessage("");
      setProposedRate("");
      setNotice("Application submitted. Track its status under My applications.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply.");
    } finally {
      setBusy(false);
    }
  }

  // Not accepting applications: show a read-only banner.
  if (!props.isAcceptingApplications) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-text-muted">
        This campaign is not currently accepting new applications.
      </div>
    );
  }

  // Already applied
  if (hasApplied) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
          <Check size={16} /> You&apos;ve applied to this campaign
        </div>
        <p className="mt-2 text-sm text-text-muted">
          The advertiser will review your application and reach out if they accept.
        </p>
        <Link
          href="/creator/applications"
          className="mt-3 inline-flex text-sm font-medium text-emerald-200 underline"
        >
          View my applications
        </Link>
      </div>
    );
  }

  // State: not signed in
  if (me === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-text-subtle">
            Reward
          </div>
          <div className="text-xs text-text-subtle">{slotsLeft} slots left</div>
        </div>
        <p className="mt-2 text-2xl font-bold">
          {props.rewardModel === "cpm" && props.rewardPerThousand > 0
            ? `${props.currency} ${props.rewardPerThousand.toFixed(2)} / 1K views`
            : `${props.currency} ${props.rewardPerCreator.toFixed(2)} per creator`}
        </p>
        <Link
          href={`/login`}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <LogIn size={15} /> Sign in to apply
        </Link>
      </div>
    );
  }

  // State: signed in, not yet applied
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-text-subtle">
            Reward
          </div>
          <div className="text-xs text-text-subtle">{slotsLeft} slots left</div>
        </div>
        <p className="mt-2 text-2xl font-bold">
          {props.rewardModel === "cpm" && props.rewardPerThousand > 0
            ? `${props.currency} ${props.rewardPerThousand.toFixed(2)} / 1K views`
            : `${props.currency} ${props.rewardPerCreator.toFixed(2)} per creator`}
        </p>

        <Button
          className="mt-4 w-full"
          size="lg"
          onClick={() => setOpen(true)}
        >
          <Sparkles size={15} /> Join campaign
        </Button>

        {notice && (
          <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-xs text-emerald-200">
            {notice}
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#101522] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-brand-300">
                  Apply to
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {props.campaignTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-2 text-text-muted hover:bg-white/5 hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="join-message"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Why are you a good fit?
                </label>
                <textarea
                  id="join-message"
                  required
                  minLength={10}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Introduce yourself, your audience, and how you'd approach this campaign."
                />
              </div>

              <Input
                label="Proposed rate (optional)"
                type="number"
                min="0"
                step="0.01"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                placeholder={
                  props.rewardPerCreator > 0
                    ? `Campaign reward: ${props.currency} ${props.rewardPerCreator.toFixed(2)}`
                    : "Leave empty to accept the advertised rate"
                }
              />

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={busy}>
                  Submit application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
