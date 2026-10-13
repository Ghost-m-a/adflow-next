import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Reset password
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Forgot your password?</h1>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        We&apos;ll email you a link to reset it.
      </p>

      <form className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Send reset link
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-300 hover:text-brand-200">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
