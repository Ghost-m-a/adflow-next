/**
 * Generates a plausible username from a person's full name.
 * Returns lowercase letters, numbers, and underscores only.
 *
 * Examples:
 *   "Dr. Zakarinović"  → "dr_zakarinovic"
 *   "Jane Doe"         → "jane_doe"
 *   "María García-López" → "maria_garcia_lopez"
 *   "阿里 王"           → "user_1234"  (fallback)
 */
export function suggestUsername(name: string, fallbackSeed?: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-zA-Z0-9_\s-]+/g, " ") // drop punctuation
    .trim()
    .toLowerCase();

  const words = normalized.split(/[\s-]+/).filter(Boolean);

  let suggestion = words
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .join("_");

  // If the name had no usable ASCII, fall back to a seed-based one.
  if (!suggestion) {
    const seed = (fallbackSeed ?? Date.now().toString(36)).replace(/\W/g, "");
    suggestion = `user_${seed.slice(-4)}`;
  }

  // Enforce the 3–30 character rule with valid characters.
  suggestion = suggestion.slice(0, 30);
  if (suggestion.length < 3) {
    suggestion = `${suggestion}_user`.slice(0, 30);
  }

  return suggestion;
}

/** Checks if a username matches the server's registration rules. */
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(username);
}
