import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-text">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-black tracking-tight">
            AD<span className="text-brand-400">FLOW</span>
            <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
              admin
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-text-muted">
            <Link href="/admin/payouts" className="hover:text-text">Payouts</Link>
            <Link href="/advertiser" className="hover:text-text">Exit</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
