"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type OrganizationType = "advertiser" | "agency";

export default function NewOrganizationPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<OrganizationType>("advertiser");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          description,
          website,
          defaultCurrency: currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create organization.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#15161c] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500";

  return (
    <main className="min-h-screen bg-[#101116] px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mb-8 text-sm text-gray-400 transition hover:text-white"
        >
          ← Back to dashboard
        </button>

        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-violet-400">
            Workspace setup
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Create an organization
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Set up your organization to create campaigns and work with creators.
            You will automatically become its owner.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/10 bg-[#17181f] p-6 sm:p-8"
        >
          <div>
            <label htmlFor="organization-name" className="text-sm font-medium">
              Organization name *
            </label>
            <input
              id="organization-name"
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Acme Marketing"
              maxLength={120}
              required
            />
          </div>

          <div>
            <label htmlFor="organization-type" className="text-sm font-medium">
              Organization type *
            </label>
            <select
              id="organization-type"
              className={fieldClass}
              value={type}
              onChange={(event) =>
                setType(event.target.value as OrganizationType)
              }
            >
              <option value="advertiser">Advertiser / Brand</option>
              <option value="agency">Marketing Agency</option>
            </select>
          </div>

          <div>
            <label htmlFor="organization-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="organization-description"
              className={fieldClass}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does your organization do?"
              maxLength={2000}
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="organization-website" className="text-sm font-medium">
              Website
            </label>
            <input
              id="organization-website"
              type="url"
              className={fieldClass}
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://example.com"
              maxLength={2048}
            />
          </div>

          <div>
            <label htmlFor="organization-currency" className="text-sm font-medium">
              Default currency *
            </label>
            <select
              id="organization-currency"
              className={fieldClass}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EGP">EGP — Egyptian Pound</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="SAR">SAR — Saudi Riyal</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-sm font-semibold text-violet-300">
              Organization owner
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Your account will be assigned the owner role, allowing you to
              manage campaigns and organization settings.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating organization..." : "Create organization"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
