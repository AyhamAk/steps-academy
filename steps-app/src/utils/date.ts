import { Translations } from "../i18n/translations";

// Parses a "YYYY-MM-DD" date-only string as a local calendar date, avoiding
// the UTC-midnight interpretation `new Date(iso)` would give (which can shift
// the displayed day by one depending on the device's timezone).
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatEventDate(date: Date, t: Translations): string {
  return `${t.common.weekdays[date.getDay()]}, ${t.common.months[date.getMonth()]} ${date.getDate()}`;
}

/** "12 March 2022" / "12 مارس 2022" — a birthday needs the year, an event doesn't. */
export function formatBirthDate(date: Date, t: Translations): string {
  return `${date.getDate()} ${t.common.months[date.getMonth()]} ${date.getFullYear()}`;
}

/** "2022-03-12" from a local calendar date — the inverse of parseIsoDate. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatIsoDate(iso: string, t: Translations): string {
  return formatEventDate(parseIsoDate(iso), t);
}

/**
 * "3 hours ago" against now, in the active language. Lives here rather than in
 * a screen because both Home's announcement card and the admin feedback list
 * date things the same way.
 */
export function formatRelativeTime(date: Date, t: Translations): string {
  const diffMinutes = Math.round((Date.now() - date.getTime()) / (1000 * 60));
  if (diffMinutes < 1) return t.home.timeAgo.justNow;
  if (diffMinutes < 60) return t.home.timeAgo.minutes(diffMinutes);
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return t.home.timeAgo.hours(diffHours);
  const diffDays = Math.round(diffHours / 24);
  return t.home.timeAgo.days(diffDays);
}
