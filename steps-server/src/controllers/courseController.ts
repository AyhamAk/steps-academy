import { EnrollmentStatus } from "@prisma/client";
import { Request, Response } from "express";

import { sendPushToUsers } from "../lib/push";
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
    requestedBy: {
      id: enrollment.requester.id,
      name: enrollment.requester.name,
      email: enrollment.requester.email,
    },
    decidedAt: enrollment.decidedAt,
    decidedBy: enrollment.decider ? { id: enrollment.decider.id, name: enrollment.decider.name } : null,
  };
}

/**
 * Courses with spots remaining. Parents additionally get their own children's
 * enrolment status — never anyone else's.
 */
export async function listCourses(req: Request, res: Response) {
  const isAdmin = req.userRole === "admin";
  const courses = await CourseModel.listWithCounts(isAdmin);

  const myStudentIds = isAdmin ? [] : await StudentModel.visibleStudentIds(req.userId!);
  const myEnrollments = await EnrollmentModel.listForStudents(myStudentIds);

  res.json({
    courses: courses.map((course) => ({
      id: course.id,
      name: course.name,
      description: course.description,
      emoji: course.emoji,
      instructor: course.instructor,
      schedule: course.schedule,
      startDate: course.startDate,
      endDate: course.endDate,
      capacity: course.capacity,
      accentColor: course.accentColor,
      isActive: course.isActive,
      approvedCount: course.approvedCount,
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

export async function createCourse(req: Request, res: Response) {
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }
  const course = await CourseModel.create(req.body);
  res.status(201).json({ course });
}

export async function updateCourse(req: Request, res: Response) {
  const course = await CourseModel.update(param(req, "courseId"), req.body);
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ course });
}

export async function deleteCourse(req: Request, res: Response) {
  const removed = await CourseModel.remove(param(req, "courseId"));
  if (!removed) return res.status(404).json({ message: "Course not found" });
  res.json({ message: "Course deleted" });
}

/** Parent asks to enrol one of their own children. Always starts as pending. */
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

  const enrollment = await EnrollmentModel.request(courseId, studentId, req.userId!);
  res.status(201).json({ enrollment: serializeEnrollment(enrollment) });
}

/** Parent withdraws their own still-pending request. */
export async function cancelEnrollment(req: Request, res: Response) {
  const enrollment = await EnrollmentModel.findById(param(req, "enrollmentId"));
  if (!enrollment) return res.status(404).json({ message: "Request not found" });

  const guardianOf = await StudentModel.visibleStudentIds(req.userId!);
  if (!guardianOf.includes(enrollment.studentId)) {
    return res.status(403).json({ message: "You are not a guardian of this child" });
  }
  if (enrollment.status !== "pending") {
    return res.status(409).json({ message: "Only a pending request can be cancelled" });
  }

  const cancelled = await EnrollmentModel.cancel(enrollment.id);
  res.json({ enrollment: cancelled ? serializeEnrollment(cancelled) : null });
}

/** Admin board: every request, newest first, optionally filtered by status. */
export async function listEnrollments(req: Request, res: Response) {
  const statusParam = req.query.status as string | undefined;
  const valid: EnrollmentStatus[] = ["pending", "approved", "rejected", "cancelled"];
  const status = valid.includes(statusParam as EnrollmentStatus)
    ? (statusParam as EnrollmentStatus)
    : undefined;

  const [enrollments, pendingCount] = await Promise.all([
    EnrollmentModel.listAll(status),
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
      { type: "course", childName: enrollment.student.name, eventName: enrollment.course.name }
    );
    await sendPushToUsers(guardians, {
      title: status === "approved" ? "Course request approved 🎉" : "Course request declined",
      body:
        status === "approved"
          ? `${enrollment.student.name} is enrolled in ${enrollment.course.name}.`
          : `${enrollment.student.name}'s request for ${enrollment.course.name} wasn't approved.`,
      data: { type: "course" },
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
