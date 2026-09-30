/** The one value to change if the academy moves country. */
export const COUNTRY_CALLING_CODE = "972";

/**
 * "050-123-4567", "0501234567", "+972 50 123 4567", "972501234567" and
 * "501234567" all become "+972501234567". Returns null for anything that is
 * not an Israeli mobile number (05x plus seven digits), so a typo is caught
 * before an SMS is paid for.
 *
 * Same rules as the app's toWhatsAppNumber, plus the leading "+".
 */
export function toE164(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(COUNTRY_CALLING_CODE)) digits = digits.slice(COUNTRY_CALLING_CODE.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Israeli mobiles: 5x followed by seven digits.
  if (!/^5\d{8}$/.test(digits)) return null;
  return `+${COUNTRY_CALLING_CODE}${digits}`;
}
