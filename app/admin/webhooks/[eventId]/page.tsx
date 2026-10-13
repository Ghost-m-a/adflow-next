"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, RotateCcw } from "lucide-react";

type Event = {
  _id: string;
  provider: string;
  eventType: string;
  externalId: string;
  status: "received" | "processed" | "failed";
  error: string | null;
  processedAt: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

export default function AdminWebhookDetailPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/webhooks/${params.eventId}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/advertiser");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load event.");
      setEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load event.");
    } finally {
      setLoading(false);
    }
  }, [params.eventId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry() {
    setRetrying(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/webhooks/${params.eventId}/retry`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry failed.");
      setNotice("Event processed successfully.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
      await load();
    } finally {
      setRetrying(false);
    }
  }

  async function copyPayload() {
    if (!event) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(event.payload, null, 2),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!event) {
    return <p className="text-text-muted">Event not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/webhooks"
        className="text-sm text-text-muted hover:text-text"
      >
        ← All webhooks
      </Link>

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="font-mono">{event._id.slice(-12)}</span>
            </h1>
            <Badge
              variant={
                event.status === "processed"
                  ? "success"
                  : event.status === "failed"
                    ? "danger"
                    : "warning"
              }
            >
              {event.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            {event.provider} · {event.eventType} · {event.externalId}
          </p>
          <p className="mt-1 text-xs text-text-subtle">
            Received {new Date(event.createdAt).toLocaleString()}
            {event.processedAt &&
              ` · Processed ${new Date(event.processedAt).toLocaleString()}`}
          </p>
        </div>

        <div className="flex gap-2">
          {event.status === "failed" && (
            <Button onClick={() => void retry()} loading={retrying}>
              <RotateCcw size={15} /> Retry
            </Button>
          )}
          <Button variant="outline" onClick={() => void copyPayload()}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        </div>
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

      {event.error && (
        <Card className="border-red-400/20 bg-red-400/[0.04]">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-red-300">
              Processing error
            </p>
            <p className="mt-2 text-sm text-text-muted">{event.error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold">Payload</h2>
          <pre className="mt-3 max-h-[600px] overflow-auto rounded-xl border border-border bg-[#0b1020] p-4 text-xs leading-6 text-text-muted">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
