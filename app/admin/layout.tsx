"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  RotateCcw,
  Wallet,
  Receipt,
  Users,
  Gavel,
  Webhook,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Finance", href: "/admin/finance", icon: CircleDollarSign },
  { label: "Deposits", href: "/admin/finance/deposits", icon: Wallet },
  { label: "Refunds", href: "/admin/finance/refunds", icon: RotateCcw },
  { label: "Ledger", href: "/admin/finance/ledger", icon: FileText },
  { label: "Organizations", href: "/admin/finance/organizations", icon: Building2 },
  { label: "Campaign review", href: "/admin/moderation/campaigns", icon: Gavel },
  { label: "Users", href: "/admin/moderation/users", icon: Users },
  { label: "Tax", href: "/admin/tax", icon: Receipt },
  { label: "Payouts", href: "/admin/payouts", icon: Wallet },
  { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-canvas text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            AD<span className="text-brand-400">FLOW</span>
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
              admin
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                    active
                      ? "bg-brand-500/15 text-brand-200"
                      : "text-text-muted hover:bg-white/5 hover:text-text",
                  ].join(" ")}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link
              href="/advertiser"
              className="text-text-muted hover:text-text"
            >
              Exit admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
