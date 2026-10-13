import Link from "next/link";
import { Suspense } from "react";
import { UnsubscribeContent } from "./content";

export const metadata = { title: "Unsubscribe · ADFLOW" };

export default function UnsubscribePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xl font-black tracking-tight"
        >
          AD<span className="text-brand-400">FLOW</span>
        </Link>

        <div className="rounded-3xl border border-border bg-surface-1/70 p-7 backdrop-blur-xl sm:p-9">
          <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
            <UnsubscribeContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
