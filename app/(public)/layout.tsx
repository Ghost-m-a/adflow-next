import type { ReactNode } from "react";
import Link from "next/link";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-text">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-black tracking-tight">
            AD<span className="text-brand-400">FLOW</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-text-muted md:flex">
            <Link href="/campaigns" className="hover:text-text">Campaigns</Link>
            <Link href="/creators" className="hover:text-text">Creators</Link>
            <Link href="/pricing" className="hover:text-text">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm hover:bg-white/5">Log in</Link>
            <Link href="/signup" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Get started</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-border px-4 py-8 text-sm text-text-subtle sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} ADFLOW</p>
          <p>Campaigns, creators, and measurable growth.</p>
        </div>
      </footer>
    </div>
  );
}
