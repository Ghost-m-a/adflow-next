import Link from "next/link";

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href="/creators" className="text-sm text-brand-300 hover:text-brand-200">
        ← Back to creators
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">@{username}</h1>
      <p className="mt-3 text-text-muted">Creator profile placeholder.</p>
    </section>
  );
}
