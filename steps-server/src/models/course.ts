import {
  Course as PrismaCourse,
  CourseEnrollment,
  EnrollmentStatus,
  Student,
  WeekDay,
} from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Course = PrismaCourse;
export type { EnrollmentStatus };

export type EnrollmentWithContext = CourseEnrollment & {
  course: Course;
  student: Student;
  requester: { id: string; name: string; email: string } | null;
  decider: { id: string; name: string } | null;
};

const enrollmentContext = {
  course: true,
  student: true,
  requester: { select: { id: true, name: true, email: true } },
  decider: { select: { id: true, name: true } },
} as const;

type CourseInput = {
  name: string;
  nameAr?: string | null;
  nameHe?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  descriptionHe?: string | null;
  emoji?: string;
  instructor?: string | null;
  weekDays?: WeekDay[];
  startTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number;
  accentColor?: string | null;
  isActive?: boolean;
};

export const CourseModel = {
  async create(input: CourseInput): Promise<Course> {
    return prisma.course.create({
      data: {
        name: input.name.trim(),
        // Blank translations are stored as null, so the app's fallback to
        // `name` triggers on an empty admin field as well as a missing one.
        nameAr: input.nameAr?.trim() || null,
        nameHe: input.nameHe?.trim() || null,
        description: input.description ?? null,
        descriptionAr: input.descriptionAr?.trim() || null,
        descriptionHe: input.descriptionHe?.trim() || null,
        emoji: input.emoji?.trim() || "🎓",
        instructor: input.instructor ?? null,
        weekDays: input.weekDays ?? [],
        startTime: input.startTime ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        capacity: input.capacity ?? 0,
        accentColor: input.accentColor ?? null,
        isActive: input.isActive ?? true,
      },
    });
  },

  async update(id: string, input: Partial<CourseInput>): Promise<Course | null> {
    try {
      return await prisma.course.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.nameAr !== undefined ? { nameAr: input.nameAr?.trim() || null } : {}),
          ...(input.nameHe !== undefined ? { nameHe: input.nameHe?.trim() || null } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.descriptionAr !== undefined
            ? { descriptionAr: input.descriptionAr?.trim() || null }
            : {}),
          ...(input.descriptionHe !== undefined
            ? { descriptionHe: input.descriptionHe?.trim() || null }
            : {}),
          ...(input.emoji !== undefined ? { emoji: input.emoji || "🎓" } : {}),
          ...(input.instructor !== undefined ? { instructor: input.instructor } : {}),
          ...(input.weekDays !== undefined ? { weekDays: input.weekDays } : {}),
          ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
          ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
          ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.course.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async findById(id: string): Promise<Course | null> {
    return prisma.course.findUnique({ where: { id } });
  },

  /**
   * Courses with their approved and pending counts. Two aggregates rather
   * than loading enrolments, so this stays cheap with hundreds of families.
   */
  async listWithCounts(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const [courses, pendingGroups] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { enrollments: { where: { status: "approved" } } } } },
      }),
      prisma.courseEnrollment.groupBy({
        by: ["courseId"],
        where: { status: "pending" },
        _count: { _all: true },
      }),
    ]);
    const pendingByCourse = new Map(pendingGroups.map((g) => [g.courseId, g._count._all]));
    return courses.map((course) => ({
      ...course,
      approvedCount: course._count.enrollments,
      pendingCount: pendingByCourse.get(course.id) ?? 0,
    }));
  },

  async countApproved(courseId: string): Promise<number> {
    return prisma.courseEnrollment.count({ where: { courseId, status: "approved" } });
  },

  /** Courses whose end date has passed. */
  async listEnded(): Promise<Course[]> {
    const todayIso = new Date().toISOString().slice(0, 10);
    return prisma.course.findMany({ where: { endDate: { lt: todayIso, not: null } } });
  },

  /**
   * Deletes finished courses. Their enrolment rows go with them (cascade), so
   * each deletion is logged with what it took — this is the only place in the
   * app that removes records nobody asked to remove.
   */
  async deleteEnded(): Promise<{ name: string; enrolments: number }[]> {
    const ended = await this.listEnded();
    const removed: { name: string; enrolments: number }[] = [];

    for (const course of ended) {
      const enrolments = await prisma.courseEnrollment.count({ where: { courseId: course.id } });
      await prisma.course.delete({ where: { id: course.id } });
      removed.push({ name: course.name, enrolments });
    }
    return removed;
  },
};

export const EnrollmentModel = {
  /**
   * Joins the course outright when there's room, and joins the waiting list
   * when there isn't.
   *
   * The capacity check and the write happen in one serializable transaction:
   * two parents tapping the last place at the same moment would otherwise
   * both read "1 left" and both be let in. On a serialization conflict the
   * caller retries, and a persistent failure falls back to the waiting list —
   * erring towards an extra review rather than an over-full course.
   *
   * Re-joining after leaving reopens the same row, so a course/student pair
   * keeps one auditable history rather than accumulating duplicates.
   */
  async join(courseId: string, studentId: string, requestedBy: string) {
    return prisma.$transaction(
      async (tx) => {
        const course = await tx.course.findUnique({
          where: { id: courseId },
          select: { capacity: true },
        });
        const approved = await tx.courseEnrollment.count({
          where: { courseId, status: "approved" },
        });

        // capacity 0 means unlimited.
        const hasRoom = !course || course.capacity === 0 || approved < course.capacity;
        const status: EnrollmentStatus = hasRoom ? "approved" : "pending";
        // An automatic join has no decider — that's what distinguishes it from
        // one an admin let in off the waiting list.
        const decidedAt = hasRoom ? new Date() : null;

        return tx.courseEnrollment.upsert({
          where: { courseId_studentId: { courseId, studentId } },
          create: { courseId, studentId, requestedBy, status, decidedAt },
          update: {
            status,
            requestedBy,
            requestedAt: new Date(),
            decidedBy: null,
            decidedAt,
            note: null,
          },
          include: enrollmentContext,
        });
      },
      { isolationLevel: "Serializable" }
    );
  },

  async findById(id: string): Promise<EnrollmentWithContext | null> {
    return prisma.courseEnrollment.findUnique({ where: { id }, include: enrollmentContext });
  },

  async findByCourseAndStudent(courseId: string, studentId: string) {
    return prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      include: enrollmentContext,
    });
  },

  async decide(
    id: string,
    status: Extract<EnrollmentStatus, "approved" | "rejected">,
    decidedBy: string,
    note?: string | null
  ): Promise<EnrollmentWithContext | null> {
    try {
      return await prisma.courseEnrollment.update({
        where: { id },
        data: { status, decidedBy, decidedAt: new Date(), note: note ?? null },
        include: enrollmentContext,
      });
    } catch {
      return null;
    }
  },

  async cancel(id: string): Promise<EnrollmentWithContext | null> {
    try {
      return await prisma.courseEnrollment.update({
        where: { id },
        data: { status: "cancelled", decidedAt: new Date() },
        include: enrollmentContext,
      });
    } catch {
      return null;
    }
  },

  /** Admin board. Pending first, then most recently decided. */
  async listAll(
    filter: { status?: EnrollmentStatus; courseId?: string } = {},
    limit = 100,
    offset = 0
  ) {
    return prisma.courseEnrollment.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.courseId ? { courseId: filter.courseId } : {}),
      },
      include: enrollmentContext,
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      take: limit,
      skip: offset,
    });
  },

  async countPending(): Promise<number> {
    return prisma.courseEnrollment.count({ where: { status: "pending" } });
  },

  /** Every enrolment for a parent's children, for showing status on the cards. */
  async listForStudents(studentIds: string[]) {
    if (studentIds.length === 0) return [];
    return prisma.courseEnrollment.findMany({
      where: { studentId: { in: studentIds } },
      include: { student: { select: { id: true, name: true } } },
    });
  },
};
