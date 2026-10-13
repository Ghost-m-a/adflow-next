import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { Code2, Mail, ShieldCheck, User } from "lucide-react";

export const metadata = { title: "Settings · ADFLOW" };

export default function SettingsIndexPage() {
  const items = [
    {
      href: "/advertiser/settings",
      title: "Profile",
      description: "Your name, username, avatar, and account type.",
      icon: User,
    },
    {
      href: "/settings/email",
      title: "Email preferences",
      description: "Choose which emails ADFLOW sends you.",
      icon: Mail,
    },
    {
      href: "/settings/security",
      title: "Security",
      description: "Two-factor authentication and account protection.",
      icon: ShieldCheck,
    },
    {
      href: "/settings/api",
      title: "Developers",
      description: "API keys and outbound webhook endpoints.",
      icon: Code2,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Manage your profile, email preferences, and security.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block">
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand-400/40">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                    <Icon size={18} />
                  </div>
                  <p className="mt-4 font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    {item.description}
                  </p>
                  <p className="mt-3 text-xs font-medium text-brand-300">
                    Open →
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
