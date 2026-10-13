"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, PasswordInput } from "@/components/ui";
import { RefreshCw } from "lucide-react";
import { suggestUsername, isValidUsername } from "@/lib/utils/username";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live-suggest a username from the name until the user edits the
  // username field manually.
  useEffect(() => {
    if (usernameEdited) return;
    if (name.trim().length < 2) {
      setUsername("");
      return;
    }
    setUsername(suggestUsername(name));
  }, [name, usernameEdited]);

  function regenerateSuggestion() {
    if (name.trim().length < 2) return;
    setUsernameEdited(false);
    setUsername(suggestUsername(name));
  }

  const usernameValid = username.length === 0 || isValidUsername(username);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms and Conditions to continue.");
      return;
    }
    if (!isValidUsername(username)) {
      setError(
        "Username must be 3–30 characters using lowercase letters, numbers, and underscores.",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name,
          username: username.toLowerCase(),
          email,
          password,
          acceptedTerms: true,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to create your account.");
        return;
      }

      router.replace("/advertiser");
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
        Get started
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        Join ADFLOW to discover campaigns, collaborate, and grow.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          placeholder="Your full name"
        />

        <div>
          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              setUsernameEdited(true);
              setUsername(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 30),
              );
            }}
            required
            minLength={3}
            maxLength={30}
            placeholder="your_username"
            error={
              username.length > 0 && !usernameValid
                ? "Use 3–30 lowercase letters, numbers, or underscores."
                : undefined
            }
          />

          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <p className="text-xs text-text-subtle">
              {usernameEdited
                ? "Edit freely — or restore the suggested one."
                : "Suggested from your name. Edit if you like."}
            </p>

            <button
              type="button"
              onClick={regenerateSuggestion}
              disabled={name.trim().length < 2}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-300 transition hover:text-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={11} />
              {usernameEdited ? "Restore suggestion" : "Regenerate"}
            </button>
          </div>
        </div>

        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          placeholder="you@example.com"
        />

        <PasswordInput
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
          maxLength={128}
          placeholder="At least 12 characters"
          helper="Minimum 12 characters."
        />

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          maxLength={128}
          placeholder="Repeat password"
          error={
            confirmPassword.length > 0 && confirmPassword !== password
              ? "Passwords do not match."
              : undefined
          }
        />

        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-text-muted">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              className="font-medium text-brand-300 underline hover:text-brand-200"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-brand-300 underline hover:text-brand-200"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-300 hover:text-brand-200"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
