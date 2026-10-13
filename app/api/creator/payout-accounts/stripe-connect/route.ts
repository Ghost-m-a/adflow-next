import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/requireSession";
import { getStripe } from "@/lib/stripe/client";
import { connectToDatabase } from "@/lib/db/mongodb";
import PayoutAccount from "@/models/PayoutAccount";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts Stripe Connect Express onboarding for the current creator.
 * Returns the hosted onboarding URL.
 */
export async function POST() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL;
    const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL;

    if (!clientId || !refreshUrl || !returnUrl) {
      return NextResponse.json(
        { error: "Stripe Connect is not configured." },
        { status: 503 },
      );
    }

    const user = await User.findById(session.userId)
      .select("email name")
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Reuse an existing connected account if we already created one.
    const existing = await PayoutAccount.findOne({
      userId: session.userId,
      type: "stripe_connect",
    }).lean();

    const stripe = getStripe();

    let connectedAccountId: string;
    const existingAccountId = existing?.details
      ? (existing.details as unknown as Map<string, string>).get?.(
          "stripeAccountId",
        )
      : undefined;

    if (existingAccountId) {
      connectedAccountId = existingAccountId;
    } else {
      // Create the Express account.
      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // TODO: derive from user.country
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          userId: session.userId,
        },
      });

      connectedAccountId = account.id;

      // Persist the connected account for future reference.
      await PayoutAccount.create({
        userId: session.userId,
        type: "stripe_connect",
        label: "Stripe (auto-created)",
        currency: "USD",
        details: { stripeAccountId: connectedAccountId },
        isDefault: false,
        isVerified: false,
      });
    }

    // Create the onboarding link.
    const accountLink = await stripe.accountLinks.create({
      account: connectedAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({
      onboardingUrl: accountLink.url,
      expiresAt: accountLink.expires_at,
      connectedAccountId,
    });
  } catch (error) {
    console.error("Stripe Connect onboarding failed:", error);
    return NextResponse.json(
      { error: "Unable to start onboarding." },
      { status: 500 },
    );
  }
}
