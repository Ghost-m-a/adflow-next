import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { Book, LifeBuoy, Mail } from "lucide-react";

export const metadata = { title: "Help & support · ADFLOW" };

export default function HelpPage() {
  const topics = [
    {
      icon: Book,
      title: "Getting started",
      body: "Set up your organization, fund a wallet, and publish your first campaign.",
    },
    {
      icon: LifeBuoy,
      title: "Campaign troubleshooting",
      body: "Common questions about budgets, tracking links, and conversion approvals.",
    },
    {
      icon: Mail,
      title: "Contact support",
      body: "Reach out to support@adflow.example and we'll get back to you within one business day.",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Help & support
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Guides, answers, and ways to reach us.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {topics.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.title}>
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                  <Icon size={18} />
                </div>
                <h2 className="mt-4 font-semibold">{t.title}</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  {t.body}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-text-subtle">
        Looking for something else? Visit the{" "}
        <Link href="/advertiser" className="text-brand-300 hover:text-brand-200">
          advertiser workspace
        </Link>{" "}
        or the{" "}
        <Link href="/creator" className="text-brand-300 hover:text-brand-200">
          creator workspace
        </Link>
        .
      </p>
    </div>
  );
}
