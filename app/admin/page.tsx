import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { ArrowRight, CircleDollarSign, FileText, Wallet } from "lucide-react";

const SECTIONS = [
  {
    href: "/admin/finance",
    title: "Finance",
    description: "Platform revenue, KPIs, and 30-day trends.",
    icon: CircleDollarSign,
  },
  {
    href: "/admin/finance/deposits",
    title: "Deposits",
    description: "Review and confirm wallet top-ups.",
    icon: Wallet,
  },
  {
    href: "/admin/finance/refunds",
    title: "Refunds",
    description: "Reverse approved conversions.",
    icon: CircleDollarSign,
  },
  {
    href: "/admin/finance/ledger",
    title: "Ledger",
    description: "Every financial movement, filterable.",
    icon: FileText,
  },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Admin console
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Platform operations and finance.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="block">
              <Card className="transition hover:-translate-y-0.5 hover:border-brand-400/40">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                    <Icon size={18} />
                  </div>
                  <p className="mt-4 font-semibold">{s.title}</p>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    {s.description}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-300">
                    Open <ArrowRight size={12} />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
