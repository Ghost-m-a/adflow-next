import Link from "next/link";

export default function TermsPage() {
   return (
      <main className="min-h-screen bg-[#080a12] px-5 py-12 text-slate-200">
         <article className="mx-auto max-w-3xl">
            <Link href="/" className="font-bold text-violet-300">
               ← Back to ADFLOW
            </Link>

            <h1 className="mt-8 text-4xl font-bold text-white">
               Terms and Conditions
            </h1>

            <p className="mt-3 text-sm text-slate-500">
               Last updated: October 10, 2026
            </p>

            <div className="mt-8 space-y-7 leading-7 text-slate-300">
               <section>
                  <h2 className="text-xl font-semibold text-white">
                     1. Using ADFLOW
                  </h2>
                  <p className="mt-2">
                     These terms describe the general conditions for accessing
                     and using ADFLOW. By creating an account, you agree to
                     provide accurate information and use the platform lawfully.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     2. Accounts and security
                  </h2>
                  <p className="mt-2">
                     You are responsible for safeguarding your credentials and
                     activities performed through your account. Do not
                     impersonate another person, share misleading information,
                     or attempt to access another user&apos;s account.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     3. Campaigns and content
                  </h2>
                  <p className="mt-2">
                     Campaigns, promotional content, tracking, rewards, and
                     payments must follow applicable laws and the specific rules
                     displayed for each campaign. Do not submit fraudulent
                     traffic, fabricated conversions, or content you do not have
                     permission to use.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     4. Prohibited activity
                  </h2>
                  <p className="mt-2">
                     Attempts to compromise platform security, manipulate
                     campaign results, abuse other users, or violate applicable
                     law may result in account restrictions or suspension.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     5. Availability and changes
                  </h2>
                  <p className="mt-2">
                     Features may change as the platform develops. We will work
                     to maintain the service but cannot guarantee uninterrupted
                     availability.
                  </p>
               </section>

               <section>
                  <h2 className="text-xl font-semibold text-white">
                     6. Contact and legal review
                  </h2>
                  <p className="mt-2">
                     These are initial template terms for development. Before
                     launching publicly, replace them with terms reviewed for
                     your business, payment model, operating countries, and
                     applicable consumer and privacy laws.
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
