"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

const TYPES = [
  { value: "bank_transfer", label: "Bank transfer", fields: ["iban", "accountHolder"] },
  { value: "paypal", label: "PayPal", fields: ["email"] },
  { value: "wise", label: "Wise", fields: ["email"] },
  { value: "manual", label: "Manual / other", fields: ["instructions"] },
] as const;

const CURRENCIES = ["USD", "EGP", "EUR", "GBP", "SAR", "AED"];

export function PayoutAccountForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("bank_transfer");
  const [label, setLabel] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const config = TYPES.find((t) => t.value === type)!;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/creator/payout-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          label: label.trim(),
          currency,
          isDefault,
          details: fields,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add account.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Account type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <Input
        label="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. My main bank account"
        required
        maxLength={120}
      />

      {config.fields.map((field) => (
        <Input
          key={field}
          label={field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
          value={fields[field] ?? ""}
          onChange={(e) => setFields((f) => ({ ...f, [field]: e.target.value }))}
          required
        />
      ))}

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Set as default for this currency
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Add account
        </Button>
      </div>
    </form>
  );
}
