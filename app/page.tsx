import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Content campaigns",
    description:
      "Collaborate with brands, create sponsored content, and earn rewards for approved work.",
  },
  {
    number: "02",
    title: "Affiliate marketing",
    description:
      "Share trackable links and earn commissions from validated conversions.",
  },
  {
    number: "03",
    title: "Transparent analytics",
    description:
      "Follow clicks, conversions, campaign performance, and your earnings in one place.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080b12] text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="text-2xl font-black tracking-tight">
          AD<span className="text-violet-400">FLOW</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
          <Link href="#how-it-works" className="transition hover:text-white">
            How it works
          </Link>
          <Link href="#features" className="transition hover:text-white">
            Features
          </Link>
          <Link href="/campaigns" className="transition hover:text-white">
            Explore campaigns
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-400"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute left-1/3 top-10 -z-0 h-80 w-80 rounded-full bg-violet-600/20 blur-[120px]" />

        <div className="relative z-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            One platform. Multiple ways to earn.
          </div>

          <h1 className="max-w-2xl text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Turn your
            <span className="block text-violet-400">influence</span>
            into income.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-gray-400">
            ADFLOW connects brands with creators and affiliates. Launch
            campaigns, publish content, track results, and reward performance
            from one platform.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-violet-500 px-6 py-3.5 font-semibold shadow-lg shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-violet-400"
            >
              Start earning
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>

            <Link
              href="/campaigns"
              className="rounded-xl border border-white/15 px-6 py-3.5 font-semibold transition hover:border-white/30 hover:bg-white/5"
            >
              Explore campaigns
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-400">
            <span>✓ Content rewards</span>
            <span>✓ Affiliate commissions</span>
            <span>✓ Performance tracking</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-violet-950/20 backdrop-blur sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Creator overview</p>
                <h2 className="mt-1 text-xl font-bold">Your performance</h2>
              </div>
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                Live dashboard preview
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#101521] p-5">
                <p className="text-sm text-gray-400">Total earnings</p>
                <p className="mt-3 text-3xl font-bold">$2,840</p>
                <p className="mt-2 text-xs text-emerald-300">
                  Illustrative preview
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#101521] p-5">
                <p className="text-sm text-gray-400">Conversions</p>
                <p className="mt-3 text-3xl font-bold">186</p>
                <p className="mt-2 text-xs text-violet-300">
                  Campaign performance
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#101521] p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Earnings activity</p>
                <span className="text-xs text-gray-500">Example data</span>
              </div>

              <div
                className="mt-6 flex h-36 items-end gap-3"
                aria-label="Illustrative earnings chart"
              >
                {[34, 49, 40, 68, 54, 83, 65, 96, 72, 100, 81, 92].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-violet-700 to-violet-400 opacity-90"
                      style={{ height: `${height}%` }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-[#101521] p-4">
              <div>
                <p className="font-medium">Sponsored content campaign</p>
                <p className="mt-1 text-sm text-gray-400">
                  Reward for approved content
                </p>
              </div>
              <span className="rounded-lg bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-300">
                Content
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-t border-white/10 bg-white/[0.02] px-6 py-24 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
              Built for both sides
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Better partnerships. Measurable results.
            </h2>
            <p className="mt-4 leading-7 text-gray-400">
              Whether you are growing a brand or building an audience, ADFLOW
              gives you a place to collaborate and measure outcomes.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-white/10 bg-[#0c101a] p-7 transition hover:-translate-y-1 hover:border-violet-400/40"
              >
                <p className="text-sm font-bold text-violet-400">
                  {feature.number}
                </p>
                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-gray-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-6 py-24 lg:px-10"
      >
        <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-[#101521] to-[#080b12] px-7 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to grow with ADFLOW?
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-400">
            Join the platform built to connect great content, trusted
            partnerships, and performance-based rewards.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex rounded-xl bg-violet-500 px-6 py-3.5 font-semibold transition hover:bg-violet-400"
          >
            Create your account
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ADFLOW. All rights reserved.</p>
          <p>Campaigns, creators, and measurable growth.</p>
        </div>
      </footer>
    </main>
  );
}
