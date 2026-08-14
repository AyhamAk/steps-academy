/**
 * The academy's country. Local numbers are written as 050-123-4567, but
 * wa.me needs full international digits, so a leading 0 becomes this.
 * Change here if the academy ever operates outside Israel — it's the one
 * value in this file with a reason to move.
 */
export const COUNTRY_CALLING_CODE = "972";

/**
 * Turns however a phone number was typed into the bare international digits
 * wa.me expects: no +, no dashes, no spaces.
 *
 * "050-123-4567" / "0501234567" / "+972501234567" / "972 50 123 4567"
 * all collapse to "972501234567".
 *
 * Returns null when there aren't enough digits to be a real number, so the
 * caller can fall back to the share sheet instead of opening WhatsApp on
 * nonsense.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;

  // A leading 0 is the local trunk prefix and is dropped when
  // internationalising — 050… becomes 97250….
  if (digits.startsWith("0")) {
    return COUNTRY_CALLING_CODE + digits.slice(1);
  }
  // Already international, whether or not it was written with a +.
  if (digits.startsWith(COUNTRY_CALLING_CODE)) {
    return digits;
  }
  // A bare local number with no trunk prefix (e.g. "501234567").
  return COUNTRY_CALLING_CODE + digits;
}

/** `Layla, 050-123-4567` per line. The name is required; the phone isn't. */
export function parseRosterPaste(text: string): { name: string; phone: string | null }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Accept comma, tab or semicolon — whichever the spreadsheet produced.
      const [name, ...rest] = line.split(/[,;\t]/);
      const phone = rest.join("").trim();
      return { name: name.trim(), phone: phone || null };
    })
    .filter((entry) => entry.name.length > 0);
}
