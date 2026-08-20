import { Translations } from "../i18n/translations";
import { Course } from "../services/coursesApi";
import { formatTime, WEEK_DAYS } from "../services/scheduleApi";
import { parseIsoDate } from "./date";

/** "Sun · Wed · 3:30 PM", or null when the academy hasn't set one. */
export function formatCourseDays(course: Course, t: Translations): string | null {
  // Ordered by the week, not by the order they were tapped in the picker.
  const days = WEEK_DAYS.filter((day) => course.weekDays.includes(day)).map(
    (day) => t.home.weekDays[day]
  );
  const time = course.startTime ? formatTime(course.startTime) : null;
  const parts = [days.join(" · "), time].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** "1 September – 30 November", or a single date if only one end is set. */
export function formatCourseDates(course: Course, t: Translations): string | null {
  // Full month names, never truncated. Cutting Arabic to three letters turned
  // سبتمبر into سبت, which is the word for Saturday — the date range read as a
  // weekday. Nothing guarantees a locale's months stay distinct once clipped.
  const short = (iso: string) => {
    const date = parseIsoDate(iso);
    return `${date.getDate()} ${t.common.months[date.getMonth()]}`;
  };
  if (course.startDate && course.endDate) return `${short(course.startDate)} – ${short(course.endDate)}`;
  if (course.startDate) return t.courses.startsOn(short(course.startDate));
  if (course.endDate) return t.courses.endsOn(short(course.endDate));
  return null;
}

/** True once the end date has passed — used to mark a course as finished. */
export function hasCourseEnded(course: Course): boolean {
  if (!course.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseIsoDate(course.endDate) < today;
}
