import { CourseModel } from "../models/course";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Removes courses once their end date has passed, so finished terms don't
 * linger in the app.
 *
 * This deletes rather than archives, which also removes the enrolment history
 * for that course — who took part, and who approved them. Every removal is
 * logged with the number of enrolment records it took. To keep the history
 * instead, replace the delete with `isActive: false` and filter inactive
 * courses out of the parent-facing list.
 */
export async function cleanUpEndedCourses(): Promise<void> {
  try {
    const removed = await CourseModel.deleteEnded();
    for (const course of removed) {
      console.log(
        `[courses] removed finished course "${course.name}" (${course.enrolments} enrolment records deleted)`
      );
    }
  } catch (error) {
    // A failed sweep must never take the API down; the next one retries.
    console.error("[courses] cleanup failed:", error);
  }
}

/** Runs at boot, then daily — a course can finish while the server is up. */
export function scheduleCourseCleanup(): void {
  void cleanUpEndedCourses();
  const timer = setInterval(() => void cleanUpEndedCourses(), DAY_MS);
  timer.unref?.();
}
