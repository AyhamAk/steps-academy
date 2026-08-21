import { EnrollmentStatus } from "@prisma/client";
import { Request, Response } from "express";

import { sendPushToUsers } from "../lib/push";
import {
  childLeftCourse,
  coursePlaceConfirmed,
  coursePlaceDeclined,
  waitlistRequest,
} from "../lib/pushCopy";
import { CourseModel, EnrollmentModel, EnrollmentWithContext } from "../models/course";
import { NotificationModel } from "../models/notification";
import { StudentModel } from "../models/student";
import { UserModel } from "../models/user";

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function serializeEnrollment(enrollment: EnrollmentWithContext) {
  return {
    id: enrollment.id,
    courseId: enrollment.courseId,
    courseName: enrollment.course.name,
    studentId: enrollment.studentId,
    studentName: enrollment.student.name,
    status: enrollment.status,
    note: enrollment.note,
    requestedAt: enrollment.requestedAt,
    // Null once the requesting parent has deleted their account.
    requestedBy: enrollment.requester
      ? {
          id: enrollment.requester.id,
          name: enrollment.requester.name,
          email: enrollment.requester.email,
        }
      : null,
    decidedAt: enrollment.decidedAt,
    decidedBy: enrollment.decider ? { id: enrollment.decider.id, name: enrollment.decider.name } : null,
    /** Approved with no decider — the course had room and they just joined. */
    joinedAutomatically: enrollment.status === "approved" && enrollment.decider === null,
  };
}

/**
 * Courses with spots remaining. Parents additionally get their own children's
 * enrolment status — never anyone else's.
 */
export async function listCourses(req: Request, res: Response) {
  const isAdmin = req.userRole === "admin";
  const all = await CourseModel.listWithCounts(isAdmin);

  // A course can finish between nightly sweeps — never show a parent a course
  // that has already ended.
  const todayIso = new Date().toISOString().slice(0, 10);
  const courses = all.filter((course) => !course.endDate || course.endDate >= todayIso);

  const myStudentIds = isAdmin ? [] : await StudentModel.visibleStudentIds(req.userId!);
  const myEnrollments = await EnrollmentModel.listForStudents(myStudentIds);

  res.json({
    courses: courses.map((course) => ({
      id: course.id,
      name: course.name,
      nameAr: course.nameAr,
      nameHe: course.nameHe,
      description: course.description,
      descriptionAr: course.descriptionAr,
      descriptionHe: course.descriptionHe,
      emoji: course.emoji,
      instructor: course.instructor,
      weekDays: course.weekDays,
      startTime: course.startTime,
      startDate: course.startDate,
      endDate: course.endDate,
      capacity: course.capacity,
      accentColor: course.accentColor,
      isActive: course.isActive,
      approvedCount: course.approvedCount,
      pendingCount: course.pendingCount,
      // null means unlimited rather than "full"
      spotsLeft: course.capacity > 0 ? Math.max(course.capacity - course.approvedCount, 0) : null,
      myEnrollments: myEnrollments
        .filter((enrollment) => enrollment.courseId === course.id)
        .map((enrollment) => ({
          id: enrollment.id,
          studentId: enrollment.studentId,
          studentName: enrollment.student.name,
          status: enrollment.status,
        })),
    })),
  });
}

const WEEK_DAYS = ["sun", "mon", "tue", "wed", "thu"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Shared by create and update; only checks fields that were actually sent. */
function validateCourse(body: Record<string, unknown>): string | null {
  if (body.weekDays !== undefined) {
    if (!Array.isArray(body.weekDays) || body.weekDays.some((d) => !WEEK_DAYS.includes(d as string))) {
      return "weekDays must be an array of sun, mon, tue, wed or thu";
    }
  }
  if (body.startTime !== undefined && body.startTime !== null) {
    if (typeof body.startTime !== "string" || !TIME_PATTERN.test(body.startTime)) {
      return "startTime must be in 24-hour HH:MM format";
    }
  }
  for (const key of ["startDate", "endDate"] as const) {
    const value = body[key];
    if (value !== undefined && value !== null) {
      if (typeof value !== "string" || !DATE_PATTERN.test(value)) return `${key} must be YYYY-MM-DD`;
    }
  }
  const { startDate, endDate } = body as { startDate?: string; endDate?: string };
  if (startDate && endDate && endDate < startDate) {
    return "endDate cannot be before startDate";
  }
  return null;
}

export async function createCourse(req: Request, res: Response) {
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }
  const error = validateCourse(req.body);
  if (error) return res.status(400).json({ message: error });

  const course = await CourseModel.create(req.body);
  res.status(201).json({ course });
}

export async function updateCourse(req: Request, res: Response) {
  const error = validateCourse(req.body);
  if (error) return res.status(400).json({ message: error });

  const course = await CourseModel.update(param(req, "courseId"), req.body);
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ course });
}

export async function deleteCourse(req: Request, res: Response) {
  const removed = await CourseModel.remove(param(req, "courseId"));
  if (!removed) return res.status(404).json({ message: "Course not found" });
  res.json({ message: "Course deleted" });
}

/**
 * Parent enrols one of their own children. Joins outright if the course has
 * room, otherwise joins the waiting list for an admin to decide.
 */
export async function requestEnrollment(req: Request, res: Response) {
  const { studentId } = req.body as { studentId?: string };
  if (!studentId) {
    return res.status(400).json({ message: "studentId is required" });
  }

  const courseId = param(req, "courseId");
  const course = await CourseModel.findById(courseId);
  if (!course || !course.isActive) {
    return res.status(404).json({ message: "Course not found" });
  }

  // A parent may only request for a child they're actually a guardian of.
  const guardianOf = await StudentModel.visibleStudentIds(req.userId!);
  if (!guardianOf.includes(studentId)) {
    return res.status(403).json({ message: "You are not a guardian of this child" });
  }

  const existing = await EnrollmentModel.findByCourseAndStudent(courseId, studentId);
  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    return res.status(409).json({
      message:
        existing.status === "approved"
          ? "This child is already enrolled in this course"
          : "A request for this child is already pending",
      enrollment: serializeEnrollment(existing),
    });
  }

  // One retry covers the common serialization conflict of two parents taking
  // the last place at once; a second failure means the course really is busy.
  let enrollment;
  try {
    enrollment = await EnrollmentModel.join(courseId, studentId, req.userId!);
  } catch {
    try {
      enrollment = await EnrollmentModel.join(courseId, studentId, req.userId!);
    } catch {
      return res.status(409).json({ message: "Couldn't join right now, please try again" });
    }
  }

  // Only the waiting list needs the academy's attention.
  if (enrollment.status === "pending") {
    const admins = await UserModel.listAdmins();
    if (admins.length > 0) {
      await sendPushToUsers(admins, (locale) =>
        waitlistRequest(enrollment.student.name, enrollment.course.name, locale)
      );
    }
  }

  res.status(201).json({ enrollment: serializeEnrollment(enrollment) });
}

/**
 * Parent withdraws a request, or takes their child out of a course they were
 * already approved for — plans change, and cancelling frees the place for
 * someone else.
 */
export async function cancelEnrollment(req: Request, res: Response) {
  const enrollment = await EnrollmentModel.findById(param(req, "enrollmentId"));
  if (!enrollment) return res.status(404).json({ message: "Request not found" });

  const guardianOf = await StudentModel.visibleStudentIds(req.userId!);
  if (!guardianOf.includes(enrollment.studentId)) {
    return res.status(403).json({ message: "You are not a guardian of this child" });
  }
  if (enrollment.status !== "pending" && enrollment.status !== "approved") {
    return res.status(409).json({ message: "This enrolment has already ended" });
  }

  const wasApproved = enrollment.status === "approved";
  const cancelled = await EnrollmentModel.cancel(enrollment.id);

  // Leaving a course the academy had approved is news; withdrawing a request
  // that was never decided isn't.
  if (wasApproved) {
    const admins = await UserModel.listAdmins();
    if (admins.length > 0) {
      await sendPushToUsers(admins, (locale) =>
        childLeftCourse(enrollment.student.name, enrollment.course.name, locale)
      );
    }
  }

  res.json({ enrollment: cancelled ? serializeEnrollment(cancelled) : null });
}

/** Admin board: every request, newest first, optionally filtered by status. */
export async function listEnrollments(req: Request, res: Response) {
  const statusParam = req.query.status as string | undefined;
  const valid: EnrollmentStatus[] = ["pending", "approved", "rejected", "cancelled"];
  const status = valid.includes(statusParam as EnrollmentStatus)
    ? (statusParam as EnrollmentStatus)
    : undefined;

  const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
  const [enrollments, pendingCount] = await Promise.all([
    EnrollmentModel.listAll({ status, courseId }),
    EnrollmentModel.countPending(),
  ]);

  res.json({ enrollments: enrollments.map(serializeEnrollment), pendingCount });
}

export async function decideEnrollment(req: Request, res: Response) {
  const { status, note } = req.body as { status?: string; note?: string };
  if (status !== "approved" && status !== "rejected") {
    return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
  }

  const existing = await EnrollmentModel.findById(param(req, "enrollmentId"));
  if (!existing) return res.status(404).json({ message: "Request not found" });

  // Capacity is only enforced at approval time — requests may exceed it, the
  // admin decides who gets the remaining places.
  if (status === "approved" && existing.course.capacity > 0) {
    const approved = await CourseModel.countApproved(existing.courseId);
    if (existing.status !== "approved" && approved >= existing.course.capacity) {
      return res.status(409).json({ message: "This course is already full" });
    }
  }

  const enrollment = await EnrollmentModel.decide(existing.id, status, req.userId!, note);
  if (!enrollment) return res.status(404).json({ message: "Request not found" });

  // Tell the child's guardians what was decided.
  const guardians = await StudentModel.listGuardians(enrollment.studentId);
  if (guardians.length > 0) {
    await NotificationModel.createForUsers(
      guardians.map((guardian) => guardian.id),
      {
        type: "course",
        childName: enrollment.student.name,
        courseId: enrollment.courseId,
        courseName: enrollment.course.name,
      }
    );
    await sendPushToUsers(guardians, (locale) => {
      const copy =
        status === "approved"
          ? coursePlaceConfirmed(enrollment.student.name, enrollment.course.name, locale)
          : coursePlaceDeclined(enrollment.student.name, enrollment.course.name, locale);
      return { ...copy, data: { type: "course", courseId: enrollment.courseId } };
    });
  }

  res.json({ enrollment: serializeEnrollment(enrollment) });
}

/** Small summary for the admin dashboard badge. */
export async function enrollmentSummary(_req: Request, res: Response) {
  res.json({ pendingCount: await EnrollmentModel.countPending() });
}

export async function listParentsForAdmin(_req: Request, res: Response) {
  res.json({ parents: await UserModel.listParents() });
}
