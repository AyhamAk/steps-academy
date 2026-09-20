import { EnrollmentWithContext } from "../models/course";
import { NotificationModel } from "../models/notification";
import { StudentModel } from "../models/student";

import { sendPushToUsers } from "./push";
import { coursePlaceConfirmed, coursePlaceDeclined } from "./pushCopy";

/**
 * Tells a child's guardians what was decided about their course place.
 *
 * Shared by the app's admin screens and the control panel: a decision made in
 * the browser has to reach the family exactly as one made on a phone does,
 * and duplicating this was the easiest way for the two to drift apart.
 */
export async function notifyEnrollmentDecision(
  enrollment: EnrollmentWithContext,
  status: "approved" | "rejected",
): Promise<void> {
  const guardians = await StudentModel.listGuardians(enrollment.studentId);
  if (guardians.length === 0) return;

  await NotificationModel.createForUsers(
    guardians.map((guardian) => guardian.id),
    {
      type: "course",
      childName: enrollment.student.name,
      courseId: enrollment.courseId,
      courseName: enrollment.course.name,
    },
  );

  await sendPushToUsers(guardians, (locale) => {
    const copy =
      status === "approved"
        ? coursePlaceConfirmed(enrollment.student.name, enrollment.course.name, locale)
        : coursePlaceDeclined(enrollment.student.name, enrollment.course.name, locale);
    return { ...copy, data: { type: "course", courseId: enrollment.courseId } };
  });
}
