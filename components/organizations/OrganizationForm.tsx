"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

export type OrganizationDraft = {
  name: string;
  type: "advertiser" | "agency";
  description: string;
  website: string;
  defaultCurrency: string;
};

const CURRENCIES = ["USD", "EGP", "EUR", "GBP", "SAR", "AED"];

export function OrganizationForm({
  mode,
  organizationId,
  initial,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  organizationId?: string;
  initial?: Partial<OrganizationDraft>;
  onSuccess: (org: { _id: string; name: string; [key: string]: unknown }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<OrganizationDraft["type"]>(
    initial?.type ?? "advertiser",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [currency, setCurrency] = useState(initial?.defaultCurrency ?? "USD");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const endpoint =
        mode === "create"
          ? "/api/organizations"
          : `/api/organizations/${organizationId}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim(),
          website: website.trim(),
          defaultCurrency: currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      onSuccess(data.organization);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Organization name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Acme Marketing"
        maxLength={120}
        required
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium">Organization type *</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as OrganizationDraft["type"])}
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
        >
          <option value="advertiser">Advertiser / Brand</option>
          <option value="agency">Marketing Agency</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does your organization do?"
          maxLength={2000}
          rows={4}
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <Input
        label="Website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="https://example.com"
        maxLength={2048}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium">Default currency *</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {mode === "create" ? "Create organization" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
