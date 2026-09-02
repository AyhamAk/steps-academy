/**
 * Which part of the academy a child belongs to, worked out from their age.
 *
 * The academy splits into a nursery for under-threes and courses for everyone
 * older, so a child's band follows from their birth date and never needs to be
 * stored separately — one less field for an admin to keep in step with reality.
 */
export type AgeBand = "nursery" | "courses";

export const AGE_BANDS: Record<AgeBand, { min: number; max: number }> = {
  nursery: { min: 0, max: 3 },
  courses: { min: 3, max: 7 },
};

/**
 * Whole years, or null when there is no usable birth date — which is the normal
 * case for a child an admin added without one, and before the API that carries
 * birth dates has been deployed.
 */
export function ageInYears(birthDate: string | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;

  let years = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  // Not had their birthday yet this year.
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) years -= 1;
  return years < 0 ? null : years;
}

/** Null when the age is unknown — the caller then shows no band at all. */
export function bandForAge(age: number | null): AgeBand | null {
  if (age == null) return null;
  return age < AGE_BANDS.nursery.max ? "nursery" : "courses";
}

export function bandForChild(birthDate: string | null | undefined): AgeBand | null {
  return bandForAge(ageInYears(birthDate));
}
