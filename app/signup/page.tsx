"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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

function suggestUsername(name: string) {
   return name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30);
}

export default function SignupPage() {
   const router = useRouter();

   const [name, setName] = useState("");
   const [username, setUsername] = useState("");
   const [usernameEdited, setUsernameEdited] = useState(false);
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
   const [acceptedTerms, setAcceptedTerms] = useState(false);
   const [avatarPreview, setAvatarPreview] = useState("");
   const [avatarError, setAvatarError] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");

   useEffect(() => {
      if (!usernameEdited) {
         setUsername(suggestUsername(name));
      }
   }, [name, usernameEdited]);

   function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];

      setAvatarError("");
      setAvatarPreview("");

      if (!file) return;

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
         setAvatarError("Choose a JPG, PNG, or WebP image.");
         event.target.value = "";
         return;
      }

      if (file.size > 2 * 1024 * 1024) {
         setAvatarError("Your profile image must be 2 MB or smaller.");
         event.target.value = "";
         return;
      }

      const reader = new FileReader();

      reader.onload = () => {
         if (typeof reader.result === "string") {
            setAvatarPreview(reader.result);
         }
      };

      reader.onerror = () => {
         setAvatarError("Unable to preview this image. Please try another.");
      };

      reader.readAsDataURL(file);
   }

   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setError("");

      if (password !== confirmPassword) {
         setError("Your passwords do not match.");
         return;
      }

      if (password.length < 12) {
         setError("Your password must have at least 12 characters.");
         return;
      }

      if (!acceptedTerms) {
         setError("Please accept the Terms and Conditions to continue.");
         return;
      }

      setLoading(true);

      try {
         const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
               name,
               username: username.toLowerCase(),
               email,
               password,
               acceptedTerms,
            }),
         });

         const data = await response.json();

         if (!response.ok) {
            setError(data.error || "Unable to create your account.");
            return;
         }

         // The selected image is currently preview-only.
         // It is not uploaded or saved to MongoDB by this endpoint.
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

         <section className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-9">
            <Link
               href="/"
               className="mb-7 inline-flex items-center gap-2 text-xl font-black tracking-tight"
            >
               <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm">
                  A
               </span>
               ADFLOW
            </Link>

            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
               Get started
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
               Create your account
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
               Join ADFLOW to discover campaigns, collaborate, and grow.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
               <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                     {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                           src={avatarPreview}
                           alt="Profile preview"
                           className="h-full w-full object-cover"
                        />
                     ) : (
                        <svg
                           aria-hidden="true"
                           width="32"
                           height="32"
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="1.5"
                           className="text-slate-400"
                        >
                           <circle cx="12" cy="8" r="4" />
                           <path d="M4 21a8 8 0 0116 0" />
                        </svg>
                     )}
                  </div>

                  <div>
                     <label
                        htmlFor="avatar"
                        className="inline-flex cursor-pointer rounded-lg border border-white/15 px-4 py-2 text-sm font-medium transition hover:border-violet-400 hover:bg-white/5"
                     >
                        Upload profile photo
                     </label>
                     <input
                        id="avatar"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        className="sr-only"
                     />
                     <p className="mt-2 text-xs text-slate-500">
                        JPG, PNG or WebP · Maximum 2 MB
                     </p>
                     {avatarError && (
                        <p role="alert" className="mt-1 text-xs text-red-300">
                           {avatarError}
                        </p>
                     )}
                  </div>
               </div>

               <div>
                  <label
                     htmlFor="name"
                     className="mb-2 block text-sm font-medium text-slate-200"
                  >
                     Full name
                  </label>
                  <input
                     id="name"
                     name="name"
                     type="text"
                     autoComplete="name"
                     required
                     minLength={2}
                     maxLength={100}
                     value={name}
                     onChange={(event) => setName(event.target.value)}
                     placeholder="Your full name"
                     className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
               </div>

               <div>
                  <label
                     htmlFor="username"
                     className="mb-2 block text-sm font-medium text-slate-200"
                  >
                     Username
                  </label>
                  <input
                     id="username"
                     name="username"
                     type="text"
                     autoComplete="username"
                     required
                     minLength={3}
                     maxLength={30}
                     pattern="[a-zA-Z0-9_]+"
                     value={username}
                     onChange={(event) => {
                        setUsernameEdited(true);
                        setUsername(
                           event.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, "")
                              .slice(0, 30),
                        );
                     }}
                     placeholder="your_username"
                     className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                     Suggested from your name. Use 3–30 letters, numbers, or
                     underscores.
                  </p>
                  {usernameEdited && (
                     <button
                        type="button"
                        onClick={() => setUsernameEdited(false)}
                        className="mt-1 text-xs font-medium text-violet-300 hover:text-violet-200"
                     >
                        Use suggested username
                     </button>
                  )}
               </div>

               <div>
                  <label
                     htmlFor="email"
                     className="mb-2 block text-sm font-medium text-slate-200"
                  >
                     Email address
                  </label>
                  <input
                     id="email"
                     name="email"
                     type="email"
                     autoComplete="email"
                     required
                     maxLength={254}
                     value={email}
                     onChange={(event) => setEmail(event.target.value)}
                     placeholder="you@example.com"
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
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 12 characters"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                     />
                     <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                           showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-white"
                     >
                        <EyeIcon visible={showPassword} />
                     </button>
                  </div>
               </div>

               <div>
                  <label
                     htmlFor="confirmPassword"
                     className="mb-2 block text-sm font-medium text-slate-200"
                  >
                     Confirm password
                  </label>
                  <div className="relative">
                     <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        maxLength={128}
                        value={confirmPassword}
                        onChange={(event) =>
                           setConfirmPassword(event.target.value)
                        }
                        placeholder="Enter your password again"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                     />
                     <button
                        type="button"
                        onClick={() =>
                           setShowConfirmPassword((value) => !value)
                        }
                        aria-label={
                           showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                        }
                        aria-pressed={showConfirmPassword}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-white"
                     >
                        <EyeIcon visible={showConfirmPassword} />
                     </button>
                  </div>
               </div>

               <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                     type="checkbox"
                     checked={acceptedTerms}
                     onChange={(event) =>
                        setAcceptedTerms(event.target.checked)
                     }
                     required
                     className="mt-1 h-4 w-4 shrink-0 accent-violet-500"
                  />
                  <span>
                     I agree to the{" "}
                     <Link
                        href="/terms"
                        target="_blank"
                        className="font-medium text-violet-300 underline hover:text-violet-200"
                     >
                        Terms and Conditions
                     </Link>{" "}
                     and acknowledge the{" "}
                     <Link
                        href="/privacy"
                        target="_blank"
                        className="font-medium text-violet-300 underline hover:text-violet-200"
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

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-violet-600 px-4 py-3.5 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
               >
                  {loading ? "Creating account..." : "Create account"}
               </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-400">
               Already have an account?{" "}
               <Link
                  href="/login"
                  className="font-semibold text-violet-300 hover:text-violet-200"
               >
                  Sign in
               </Link>
            </p>
         </section>
      </main>
   );
}
