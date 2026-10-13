/**
 * Attribution window resolution.
 *
 * The window is measured in days and applied to the timestamp of the
 * recorded ClickEvent. A conversion qualifies if it happens inside
 * this window relative to the click.
 */

export const DEFAULT_ATTRIBUTION_DAYS = 7;

export function attributionWindowDays(): number {
  const raw = process.env.ATTRIBUTION_WINDOW_DAYS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, 90)
    : DEFAULT_ATTRIBUTION_DAYS;
}

export function attributionWindowMs(): number {
  return attributionWindowDays() * 24 * 60 * 60 * 1000;
}

export function isWithinWindow(clickedAt: Date, convertedAt: Date): boolean {
  const delta = convertedAt.getTime() - clickedAt.getTime();
  return delta >= 0 && delta <= attributionWindowMs();
}

/**
 * Given a list of clicks (newest first) and a conversion timestamp,
 * return the most recent click inside the window, or null.
 */
export function pickAttributedClick<T extends { createdAt: Date }>(
  clicks: T[],
  convertedAt: Date,
): T | null {
  for (const click of clicks) {
    if (isWithinWindow(click.createdAt, convertedAt)) return click;
    if (click.createdAt.getTime() > convertedAt.getTime()) continue;
    break;
  }
  return null;
}
