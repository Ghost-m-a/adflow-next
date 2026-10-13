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
    <>
      {/* Hero */}
      <section className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:px-10">
        <div className="pointer-events-none absolute left-1/3 top-10 -z-0 h-80 w-80 rounded-full bg-brand-600/20 blur-[120px]" />

        <div className="relative z-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-4 py-2 text-sm text-brand-200">
            <span className="h-2 w-2 rounded-full bg-brand-400" />
            One platform. Multiple ways to earn.
          </div>

          <h1 className="max-w-2xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Turn your
            <span className="block text-brand-400">influence</span>
            into income.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-text-muted">
            ADFLOW connects brands with creators and affiliates. Launch campaigns,
            publish content, track results, and reward performance from one platform.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand-950/40 transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Start earning →
            </Link>
            <Link
              href="/campaigns"
              className="rounded-xl border border-border-strong px-6 py-3.5 font-semibold transition hover:bg-white/5"
            >
              Explore campaigns
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-text-muted">
            <span>✓ Content rewards</span>
            <span>✓ Affiliate commissions</span>
            <span>✓ Performance tracking</span>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative z-10">
          <div className="rounded-3xl border border-border bg-surface-1/70 p-5 backdrop-blur sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Creator overview</p>
                <h2 className="mt-1 text-xl font-bold">Your performance</h2>
              </div>
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                Live preview
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-surface-2 p-5">
                <p className="text-sm text-text-muted">Total earnings</p>
                <p className="mt-3 text-3xl font-bold">$2,840</p>
                <p className="mt-2 text-xs text-emerald-300">Illustrative</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface-2 p-5">
                <p className="text-sm text-text-muted">Conversions</p>
                <p className="mt-3 text-3xl font-bold">186</p>
                <p className="mt-2 text-xs text-brand-300">Campaign performance</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-surface-2 p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Earnings activity</p>
                <span className="text-xs text-text-subtle">Example data</span>
              </div>
              <div className="mt-6 flex h-36 items-end gap-3">
                {[34, 49, 40, 68, 54, 83, 65, 96, 72, 100, 81, 92].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-brand-700 to-brand-400 opacity-90"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-border bg-white/[0.02] px-6 py-24 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
              Built for both sides
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Better partnerships. Measurable results.
            </h2>
            <p className="mt-4 leading-7 text-text-muted">
              Whether you are growing a brand or building an audience, ADFLOW
              gives you a place to collaborate and measure outcomes.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-border bg-surface-1 p-7 transition hover:-translate-y-1 hover:border-brand-400/40"
              >
                <p className="text-sm font-bold text-brand-400">{feature.number}</p>
                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-text-muted">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="rounded-3xl border border-brand-400/20 bg-gradient-to-br from-brand-500/15 via-surface-1 to-canvas px-7 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to grow with ADFLOW?
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-text-muted">
            Join the platform built to connect great content, trusted partnerships,
            and performance-based rewards.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex rounded-xl bg-brand-500 px-6 py-3.5 font-semibold text-white hover:bg-brand-600"
          >
            Create your account
          </Link>
        </div>
      </section>
    </>
  );
}
