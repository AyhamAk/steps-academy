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

export function formatIsoDate(iso: string, t: Translations): string {
  return formatEventDate(parseIsoDate(iso), t);
}
