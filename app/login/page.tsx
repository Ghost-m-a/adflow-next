"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function EyeIcon({ visible }: { visible: boolean }) {
   return (
      <svg
         aria-hidden="true"
         width="20"
         height="20"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="1.8"
         strokeLinecap="round"
         strokeLinejoin="round"
      >
         {visible ? (
            <>
               <path d="M3 3l18 18" />
               <path d="M10.6 10.6a2 2 0 002.8 2.8" />
               <path d="M9.9 5.2A11 11 0 0112 5c5.5 0 9 7 9 7a15 15 0 01-3.1 3.8" />
               <path d="M6.6 6.6C4.2 8.2 3 12 3 12s3.5 7 9 7a10 10 0 004-.8" />
            </>
         ) : (
            <>
               <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
               <circle cx="12" cy="12" r="3" />
            </>
         )}
      </svg>
   );
}

export default function LoginPage() {
   const router = useRouter();

   const [identifier, setIdentifier] = useState("");
   const [password, setPassword] = useState("");
   const [rememberMe, setRememberMe] = useState(false);
   const [showPassword, setShowPassword] = useState(false);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");

   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setError("");
      setLoading(true);

      try {
         const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
               identifier,
               password,
               rememberMe,
            }),
         });

         const data = await response.json();

         if (!response.ok) {
            setError(data.error || "Unable to sign in. Please try again.");
            return;
         }

         router.replace("/dashboard");
         router.refresh();
      } catch {
         setError("Unable to connect. Please check your connection.");
      } finally {
         setLoading(false);
      }
   }

   return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a12] px-4 py-10 text-white">
         <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
         <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />

         <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl sm:p-10">
            <Link
               href="/"
               className="mb-8 inline-flex items-center gap-2 text-xl font-black tracking-tight"
            >
               <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm">
                  A
               </span>
               ADFLOW
            </Link>

            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
               Welcome back
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
               Sign in to ADFLOW
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
               Access your campaigns, earnings, and creator dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
               <div>
                  <label
                     htmlFor="identifier"
                     className="mb-2 block text-sm font-medium text-slate-200"
                  >
                     Username or email
                  </label>

                  <input
                     id="identifier"
                     name="identifier"
                     type="text"
                     autoComplete="username"
                     required
                     maxLength={254}
                     value={identifier}
                     onChange={(event) => setIdentifier(event.target.value)}
                     placeholder="you@example.com or username"
                     className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
               </div>

               <div>
                  <label
                     htmlFor="password"
                     className="mb-2 block text-sm font-medium text-slate-200"
                  >
                     Password
                  </label>

                  <div className="relative">
                     <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        maxLength={128}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                     />

                     <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                           showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-white"
                     >
                        <EyeIcon visible={showPassword} />
                     </button>
                  </div>
               </div>

               <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                     <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) =>
                           setRememberMe(event.target.checked)
                        }
                        className="h-4 w-4 accent-violet-500"
                     />
                     Remember me
                  </label>

                  <Link
                     href="/forgot-password"
                     className="font-medium text-violet-300 hover:text-violet-200"
                  >
                     Forgot password?
                  </Link>
               </div>

               {error && (
                  <p
                     role="alert"
                     className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                  >
                     {error}
                  </p>
               )}

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-violet-600 px-4 py-3.5 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
               >
                  {loading ? "Signing in..." : "Sign in"}
               </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-400">
               Don&apos;t have an account?{" "}
               <Link
                  href="/signup"
                  className="font-semibold text-violet-300 hover:text-violet-200"
               >
                  Create one
               </Link>
            </p>

            <p className="mt-8 text-center text-xs leading-5 text-slate-500">
               By continuing, you agree to use ADFLOW in accordance with our{" "}
               <Link href="/terms" className="underline hover:text-slate-300">
                  Terms
               </Link>{" "}
               and{" "}
               <Link href="/privacy" className="underline hover:text-slate-300">
                  Privacy Policy
               </Link>
               .
            </p>
         </section>
      </main>
   );
}
