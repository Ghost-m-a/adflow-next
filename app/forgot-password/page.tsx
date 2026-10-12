import Link from "next/link";

export default function ForgotPasswordPage() {
   return (
      <main className="flex min-h-screen items-center justify-center bg-[#080a12] px-4 py-10 text-white">
         <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
            <Link href="/" className="text-xl font-black tracking-tight">
               ADFLOW
            </Link>

            <h1 className="mt-8 text-3xl font-bold">Forgot your password?</h1>

            <p className="mt-4 leading-7 text-slate-400">
               Password recovery has not been configured yet. Once email
               delivery and secure reset tokens are set up, you will be able to
               request a password-reset link here.
            </p>

            <Link
               href="/login"
               className="mt-7 block w-full rounded-xl bg-violet-600 px-4 py-3.5 text-center font-semibold transition hover:bg-violet-500"
            >
               Back to sign in
            </Link>
         </section>
      </main>
   );
}
