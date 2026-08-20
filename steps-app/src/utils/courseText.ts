import { Course } from "../services/coursesApi";
import { Locale } from "../store/localeStore";

/**
 * A course's name in the reader's language.
 *
 * The academy fills in translations per course; anything they leave blank
 * falls back to the single `name` they typed, which is what every locale used
 * to show — an Arabic screen full of "Swimming Lessons".
 */
export function courseName(course: Course, locale: Locale): string {
  if (locale === "ar") return course.nameAr?.trim() || course.name;
  if (locale === "he") return course.nameHe?.trim() || course.name;
  return course.name;
}

/** As above, for the longer blurb. Null when there is no description at all. */
export function courseDescription(course: Course, locale: Locale): string | null {
  const translated =
    locale === "ar" ? course.descriptionAr : locale === "he" ? course.descriptionHe : null;
  return translated?.trim() || course.description || null;
}
