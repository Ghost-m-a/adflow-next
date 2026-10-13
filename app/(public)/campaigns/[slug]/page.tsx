import Link from "next/link";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href="/campaigns" className="text-sm text-brand-300 hover:text-brand-200">
        ← Back to campaigns
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Campaign</h1>
      <p className="mt-3 text-text-muted">
        Detail page placeholder for <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">{slug}</code>.
      </p>
    </section>
  );
}
