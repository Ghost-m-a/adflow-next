import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Lazily-instantiated Stripe client. Picks up the API version at
 * module-load time so we get consistent behavior across requests.
 *
 * Pinned to a specific version so future Stripe API changes don't
 * silently alter the shapes we handle.
 */
export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  cached = new Stripe(key, {
    // Pin the API version so a Stripe-side release can't break us.
    apiVersion: "2025-10-29.basil",
    typescript: true,
    appInfo: {
      name: "ADFLOW",
      version: "1.0.0",
    },
  });

  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
