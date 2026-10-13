import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { Users } from "lucide-react";

export const metadata = { title: "Creators · ADFLOW" };

export default function CreatorsDirectoryPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
          Public directory
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Discover creators</h1>
        <p className="mt-3 max-w-2xl text-text-muted">
          Verified creators and their performance history.
        </p>
      </header>

      <EmptyState
        icon={<Users size={20} />}
        title="No public creator profiles yet"
        description="When creators publish their profiles, they'll show up here."
        action={
          <Link
            href="/signup"
            className="inline-flex rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Join as a creator
          </Link>
        }
      />
    </section>
  );
}
