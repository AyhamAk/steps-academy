/**
 * Turns whatever an admin typed into the album date field into "YYYY-MM-DD",
 * or null when it isn't a real date. Arabic keyboards type ٢٠٢٦-١٠-٠٨ and people
 * here write 8/10/2026 (day first), and both used to be stored as-is - the app
 * then rendered "undefined, undefined NaN" and the string sorting broke.
 */
export function normalizeIsoDate(raw: string): string | null {
  const ascii = raw
    .replace(/[‎‏؜‪-‮⁦-⁩]/g, "")
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

  const parts = ascii.split(/[-/.\s]+/);
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) return null;

  let year: number, month: number, day: number;
  if (parts[0].length === 4) {
    [year, month, day] = parts.map(Number);
  } else if (parts[2].length === 4) {
    [day, month, year] = parts.map(Number);
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
