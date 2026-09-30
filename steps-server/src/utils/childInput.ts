/** The most children one parent can add themselves; beyond it, ask the academy. */
export const MAX_SELF_ADDED_CHILDREN = 6;

export type ChildInput = { name: string; birthDate: string };

/**
 * Checks a child a parent typed in themselves: a name, and a real birth date
 * that isn't in the future. Returns the cleaned value, or the message to send
 * back as a 400.
 */
export function parseChildInput(raw: unknown): ChildInput | string {
  if (!raw || typeof raw !== "object") return "child with name and birthDate is required";
  const { name, birthDate } = raw as { name?: unknown; birthDate?: unknown };

  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return "child name is required";
  if (trimmed.length > 60) return "child name must be 60 characters or fewer";

  if (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return "child birthDate must be an ISO date (YYYY-MM-DD)";
  }
  // Round-trip through Date so 2026-02-31 is rejected rather than rolled over.
  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate) {
    return "child birthDate is not a real date";
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  if (birthDate > todayIso) return "child birthDate cannot be in the future";
  if (birthDate < "1990-01-01") return "child birthDate is too far in the past";

  return { name: trimmed, birthDate };
}
