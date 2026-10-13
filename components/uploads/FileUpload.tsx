"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { UploadCloud, X } from "lucide-react";

type Kind =
  | "campaign-cover"
  | "campaign-logo"
  | "reference-material"
  | "submission-thumbnail"
  | "avatar"
  | "other";

export type UploadedFile = {
  url: string;
  key: string;
  size: number;
  contentType: string;
};

export function FileUpload({
  kind,
  label,
  helper,
  preview,
  value,
  onChange,
  accept = "image/jpeg,image/png,image/webp,image/gif",
}: {
  kind: Kind;
  label?: string;
  helper?: string;
  preview?: "square" | "wide" | "none";
  value?: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);

      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onChange(data.upload as UploadedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="w-full">
      {label && <p className="mb-1.5 block text-sm font-medium">{label}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInput}
        className="sr-only"
      />

      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
          {preview === "square" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : preview === "wide" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.url}
              alt=""
              className="h-16 w-28 shrink-0 rounded-lg object-cover"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.url}</p>
            <p className="mt-0.5 text-xs text-text-subtle">
              {(value.size / 1024).toFixed(1)} KB · {value.contentType}
            </p>
          </div>

          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(null)}
            className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center transition hover:border-brand-400/40 disabled:opacity-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" />
            ) : (
              <UploadCloud size={18} />
            )}
          </span>
          <span className="text-sm font-medium">
            {busy ? "Uploading…" : "Click to upload"}
          </span>
          <span className="text-xs text-text-subtle">
            {helper ?? "JPG, PNG, WebP, or GIF · max 8 MB"}
          </span>
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
