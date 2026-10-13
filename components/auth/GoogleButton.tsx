"use client";

import { useEffect, useState } from "react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.36 0-4.35-1.59-5.06-3.72H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.94 10.7a5.4 5.4 0 0 1 0-3.4V4.96H.96a9 9 0 0 0 0 8.08l2.98-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.96l2.98 2.34C4.65 5.17 6.64 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleButton({
  label = "Continue with Google",
  next,
}: {
  label?: string;
  next?: string;
}) {
  // Read `next` from the URL on the client only. This avoids
  // useSearchParams(), which would require a Suspense boundary
  // during static prerendering.
  const [resolvedNext, setResolvedNext] = useState<string | undefined>(next);

  useEffect(() => {
    if (next) return; // explicit prop wins

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("next");

    if (fromUrl && fromUrl.startsWith("/") && !fromUrl.startsWith("//")) {
      setResolvedNext(fromUrl);
    }
  }, [next]);

  const href = resolvedNext
    ? `/api/auth/google?next=${encodeURIComponent(resolvedNext)}`
    : "/api/auth/google";

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm font-medium text-text transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <GoogleIcon />
      {label}
    </a>
  );
}
