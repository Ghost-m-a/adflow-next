"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  name?: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  platformRole?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
};

type MeResponse = {
  user?: Profile;
  error?: string;
} & Partial<Profile>;

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/me", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = (await response.json()) as MeResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to load your profile.");
        }

        const currentUser = data.user ?? data;

        if (!currentUser.username || !currentUser.email) {
          throw new Error("The account response is missing profile information.");
        }

        if (!cancelled) {
          setProfile(currentUser as Profile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#080b12] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-xl font-black">
          AD<span className="text-violet-400">FLOW</span>
        </Link>

        <div className="mt-10">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-5 text-3xl font-bold">Profile settings</h1>
          <p className="mt-2 text-gray-400">
            Review the account information associated with your ADFLOW profile.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
          {loading ? (
            <p className="text-sm text-gray-400">Loading your profile...</p>
          ) : error ? (
            <div>
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
              >
                Refresh page
              </button>
            </div>
          ) : profile ? (
            <>
              <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name || profile.username}
                    className="h-16 w-16 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20 text-lg font-bold text-violet-200">
                    {(profile.name?.trim() || profile.username)
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">
                    {profile.name || profile.username}
                  </h2>
                  <p className="mt-1 truncate text-sm text-gray-400">
                    @{profile.username}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-white/[0.08]">
                <div className="grid gap-1 py-5 sm:grid-cols-[160px_1fr] sm:gap-4">
                  <dt className="text-sm text-gray-400">Full name</dt>
                  <dd className="break-words text-sm font-medium">
                    {profile.name || "Not provided"}
                  </dd>
                </div>

                <div className="grid gap-1 py-5 sm:grid-cols-[160px_1fr] sm:gap-4">
                  <dt className="text-sm text-gray-400">Username</dt>
                  <dd className="break-words text-sm font-medium">
                    @{profile.username}
                  </dd>
                </div>

                <div className="grid gap-1 py-5 sm:grid-cols-[160px_1fr] sm:gap-4">
                  <dt className="text-sm text-gray-400">Email address</dt>
                  <dd className="break-words text-sm font-medium">
                    {profile.email}
                  </dd>
                </div>

                <div className="grid gap-1 py-5 sm:grid-cols-[160px_1fr] sm:gap-4">
                  <dt className="text-sm text-gray-400">Account type</dt>
                  <dd className="text-sm font-medium">
                    {profile.platformRole === "admin" ? "Administrator" : "User"}
                  </dd>
                </div>

                {profile.isEmailVerified !== undefined && (
                  <div className="grid gap-1 py-5 sm:grid-cols-[160px_1fr] sm:gap-4">
                    <dt className="text-sm text-gray-400">Email verification</dt>
                    <dd className="text-sm font-medium">
                      {profile.isEmailVerified ? "Verified" : "Not verified"}
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-5 rounded-xl border border-violet-400/15 bg-violet-400/[0.06] p-4 text-sm leading-6 text-gray-300">
                These details are currently read-only. Profile editing and
                persistent avatar uploads require a profile-update API, which
                has not been connected yet.
              </p>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
