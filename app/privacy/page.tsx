import Link from "next/link";

export default function PrivacyPage() {
   return (
      <main className="min-h-screen bg-[#080a12] px-5 py-12 text-slate-200">
         <article className="mx-auto max-w-3xl">
            <Link href="/" className="font-bold text-violet-300">
               ← Back to ADFLOW
            </Link>

            <h1 className="mt-8 text-4xl font-bold text-white">
               Privacy Policy
            </h1>

            <p className="mt-3 text-sm text-slate-500">
               Last updated: October 10, 2026
            </p>

            <div className="mt-8 space-y-7 leading-7 text-slate-300">
               <section>
                  <h2 className="text-xl font-semibold text-white">
                     1. Information collected
                  </h2>
                  <p className="mt-2">
                     ADFLOW may process account information such as your name,
                     username, email address, authentication data, profile
                     details, campaign activity, and records needed to operate
                     the service. Passwords should be stored only as secure
                     hashes, never as plaintext.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     2. How information is used
                  </h2>
                  <p className="mt-2">
                     Information may be used to create and secure accounts,
                     operate campaigns, track activity, provide customer
                     support, prevent abuse, and meet legal or accounting
                     obligations.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     3. Sharing and service providers
                  </h2>
                  <p className="mt-2">
                     Information may be processed by service providers needed to
                     run the platform, such as database, hosting, storage,
                     analytics, or payment providers. Configure these providers
                     and their data handling practices before launching the
                     service.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     4. Security and retention
                  </h2>
                  <p className="mt-2">
                     Reasonable technical measures should be used to protect
                     account data. Information should be retained only as long
                     as necessary for the purposes described here or as required
                     by law.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     5. Your choices
                  </h2>
                  <p className="mt-2">
                     Depending on applicable law, you may have rights to access,
                     correct, delete, or obtain a copy of personal information.
                     A production deployment should provide a contact channel
                     and procedures for handling these requests.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     6. This template
                  </h2>
                  <p className="mt-2">
                     This is a starter policy, not legal advice. Adapt it to
                     your actual data collection, hosting locations, cookies,
                     analytics, email services, payments, and applicable privacy
                     requirements before accepting real users.
                  </p>
               </section>
            </div>

            <Link
               href="/signup"
               className="mt-10 inline-block rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-500"
            >
               Return to signup
            </Link>
         </article>
      </main>
   );
}
