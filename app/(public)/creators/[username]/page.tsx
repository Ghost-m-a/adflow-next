import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui";
import { BadgeCheck, Building2, Globe2, Users } from "lucide-react";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getPublicProfile } from "@/services/creator-profile.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: `@${username} · ADFLOW` };
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  await connectToDatabase();
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/creators"
        className="text-sm text-text-muted hover:text-text"
      >
        ← Back to creators
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-20 w-20 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">
              {(profile.displayName || profile.username).charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {profile.displayName}
              </h1>
              {profile.isVerified && (
                <BadgeCheck size={20} className="text-brand-400" />
              )}
            </div>
            <p className="mt-1 text-sm text-text-muted">@{profile.username}</p>
            {profile.country && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-text-subtle">
                <Globe2 size={12} /> {profile.country}
              </p>
            )}
            {profile.niches.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.niches.map((n) => (
                  <Badge key={n} variant="brand">
                    {n}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-text-subtle">
            Member since {new Date(profile.joinedAt).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </header>

      {profile.bio && (
        <Card className="mt-8">
          <CardContent className="p-5 sm:p-6">
            <p className="whitespace-pre-wrap text-sm leading-6 text-text-muted">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Verified performance */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Verified performance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Approved conversions"
            value={profile.stats.approvedConversions.toLocaleString()}
            icon={<Users size={18} />}
          />
          <Stat
            label="Total conversions"
            value={profile.stats.totalConversions.toLocaleString()}
            icon={<Users size={18} />}
          />
          <Stat
            label="Approval rate"
            value={
              profile.stats.approvalRate !== null
                ? `${(profile.stats.approvalRate * 100).toFixed(1)}%`
                : "—"
            }
            icon={<BadgeCheck size={18} />}
          />
          <Stat
            label="Campaigns"
            value={`${profile.stats.campaignsActive} active · ${profile.stats.campaignsCompleted} done`}
            icon={<Building2 size={18} />}
          />
        </div>

        {profile.stats.totalEarningsByCurrency.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {profile.stats.totalEarningsByCurrency.map((e) => (
              <div
                key={e.currency}
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-3"
              >
                <p className="text-xs text-emerald-300">Verified earnings · {e.currency}</p>
                <p className="mt-1 font-semibold">
                  {e.currency} {e.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {profile.stats.totalConversions === 0 && (
          <EmptyState
            icon={<Users size={20} />}
            title="No verified performance yet"
            description="Once this creator's conversions are approved, they'll appear here."
            className="mt-4"
          />
        )}
      </section>

      {/* Social links */}
      {profile.socialLinks.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Social</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {profile.socialLinks.map((s, i) => (
              <a
                key={`${s.platform}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-sm font-medium capitalize text-text-muted transition hover:border-brand-400/40 hover:text-text"
              >
                {s.platform}
                {s.handle ? ` · ${s.handle}` : ""}
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 rounded-2xl border border-brand-400/20 bg-brand-500/[0.06] p-5">
        <p className="text-sm text-text-muted">
          Want to work with @{profile.username}? Publish a campaign and invite
          them from the advertiser workspace.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/advertiser/campaigns/new"
            className="inline-flex rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Create a campaign
          </Link>
          <Link
            href="/advertiser"
            className="inline-flex rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text hover:bg-white/5"
          >
            Go to advertiser workspace
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-brand-300">{icon}</div>
        <p className="mt-3 text-sm text-text-muted">{label}</p>
        <p className="mt-1 break-words text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
