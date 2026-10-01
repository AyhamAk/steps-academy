import { toE164 } from "./phone";

/** The family details an admin enters for a child, as on the academy's roster sheet. */
export type FamilyInput = {
  nationalId?: string | null;
  groupName?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
  fatherPhone?: string | null;
};

function text(value: unknown, max: number): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Checks the family fields of a create or update. Only keys present in `raw`
 * are returned, so an update leaves the others alone; an empty value clears
 * the field. Returns the message to send back when something is invalid.
 *
 * - nationalId: digits only, padded to the 9 of a teudat zehut (a spreadsheet
 *   drops the leading zero).
 * - phones: any way an Israeli mobile is written, stored as E.164. A mistyped
 *   number would link the wrong family, so it is refused, not dropped.
 */
export function parseFamilyInput(raw: Record<string, unknown>): FamilyInput | { error: string } {
  const out: FamilyInput = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(raw, key);

  if (has("nationalId")) {
    const digits = String(raw.nationalId ?? "").replace(/\D/g, "");
    if (digits && (digits.length < 5 || digits.length > 9)) {
      return { error: "The ID number should be 9 digits" };
    }
    out.nationalId = digits ? digits.padStart(9, "0") : null;
  }
  if (has("groupName")) out.groupName = text(raw.groupName, 40);
  if (has("motherName")) out.motherName = text(raw.motherName, 60);

  for (const key of ["motherPhone", "fatherPhone"] as const) {
    if (!has(key)) continue;
    const value = text(raw[key], 30);
    if (!value) {
      out[key] = null;
      continue;
    }
    const phone = toE164(value);
    if (!phone) {
      return { error: `"${value}" isn't a mobile number (05x-xxx-xxxx)` };
    }
    out[key] = phone;
  }

  if (out.motherPhone && out.motherPhone === out.fatherPhone) {
    return { error: "The mother's and father's numbers are the same" };
  }
  return out;
}
