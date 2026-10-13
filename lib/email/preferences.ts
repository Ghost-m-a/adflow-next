export const EMAIL_PREFERENCE_KEYS = [
  "productUpdates",
  "campaigns",
  "payouts",
  "notificationDigest",
] as const;

export type EmailPreferenceKey = (typeof EMAIL_PREFERENCE_KEYS)[number];

export type EmailPreferences = Record<EmailPreferenceKey, boolean>;

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  productUpdates: true,
  campaigns: true,
  payouts: true,
  notificationDigest: true,
};

/** Labels for the settings UI. */
export const EMAIL_PREFERENCE_LABELS: Record<
  EmailPreferenceKey,
  { title: string; description: string }
> = {
  productUpdates: {
    title: "Product updates",
    description:
      "Feature announcements, tips, and occasional newsletters from ADFLOW.",
  },
  campaigns: {
    title: "Campaign activity",
    description:
      "New invitations, application decisions, and submission reviews.",
  },
  payouts: {
    title: "Payouts & payments",
    description:
      "Payout sent, conversion approved, and other money-related events.",
  },
  notificationDigest: {
    title: "Daily digest",
    description:
      "A single summary email when you have unread notifications.",
  },
};

/** Emails that always send regardless of preferences. */
export type EmailCategory = EmailPreferenceKey | "transactional";

/**
 * Categories that bypass preferences entirely — account security,
 * password resets, and email verification.
 */
export function isTransactional(category: EmailCategory): boolean {
  return category === "transactional";
}

/**
 * Normalize a preferences object by filling in any missing keys with
 * the default (true). Handles users created before this feature existed.
 */
export function normalizePreferences(
  prefs: Partial<EmailPreferences> | undefined | null,
): EmailPreferences {
  return {
    productUpdates: prefs?.productUpdates ?? true,
    campaigns: prefs?.campaigns ?? true,
    payouts: prefs?.payouts ?? true,
    notificationDigest: prefs?.notificationDigest ?? true,
  };
}
