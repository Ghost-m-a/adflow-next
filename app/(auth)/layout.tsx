import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xl font-black tracking-tight">
          AD<span className="text-brand-400">FLOW</span>
        </Link>
        <div className="rounded-3xl border border-border bg-surface-1/70 p-7 backdrop-blur-xl sm:p-9">
          {children}
        </div>
      </div>
    </div>
  );
}
