export const metadata = { title: "Pricing · ADFLOW" };

const tiers = [
  {
    name: "Starter",
    price: "Free",
    features: ["Create campaigns", "Basic marketplace access", "5 active campaigns"],
  },
  {
    name: "Growth",
    price: "$49/mo",
    features: ["Unlimited campaigns", "Advanced analytics", "Priority support", "Team members"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["Agency workspaces", "SSO", "Dedicated success manager", "Custom contracts"],
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">Pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Plans that scale with you</h1>
        <p className="mx-auto mt-3 max-w-2xl text-text-muted">
          Start free. Upgrade when you&apos;re ready to run more campaigns.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={[
              "rounded-3xl border p-6",
              tier.highlight
                ? "border-brand-500/40 bg-brand-500/[0.06]"
                : "border-border bg-surface-1",
            ].join(" ")}
          >
            <h2 className="text-lg font-semibold">{tier.name}</h2>
            <p className="mt-4 text-3xl font-bold">{tier.price}</p>
            <ul className="mt-6 space-y-2 text-sm text-text-muted">
              {tier.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <button className="mt-6 w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600">
              Get started
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
