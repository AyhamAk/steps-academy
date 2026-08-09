import { Course as PrismaCourse, CourseEnrollment, EnrollmentStatus, Student } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Course = PrismaCourse;
export type { EnrollmentStatus };

export type EnrollmentWithContext = CourseEnrollment & {
  course: Course;
  student: Student;
  requester: { id: string; name: string; email: string };
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
  description?: string | null;
  emoji?: string;
  instructor?: string | null;
  schedule?: string | null;
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
        description: input.description ?? null,
        emoji: input.emoji?.trim() || "🎓",
        instructor: input.instructor ?? null,
        schedule: input.schedule ?? null,
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
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.emoji !== undefined ? { emoji: input.emoji || "🎓" } : {}),
          ...(input.instructor !== undefined ? { instructor: input.instructor } : {}),
          ...(input.schedule !== undefined ? { schedule: input.schedule } : {}),
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

  /** Courses with their approved-enrolment counts, for computing spots left. */
  async listWithCounts(includeInactive = false) {
    const courses = await prisma.course.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { enrollments: { where: { status: "approved" } } } } },
    });
    return courses.map((course) => ({ ...course, approvedCount: course._count.enrollments }));
  },

  async countApproved(courseId: string): Promise<number> {
    return prisma.courseEnrollment.count({ where: { courseId, status: "approved" } });
  },
};

export const EnrollmentModel = {
  /**
   * Re-requesting after a rejection or cancellation reopens the same row as
   * pending, so a course/student pair keeps one auditable history rather than
   * accumulating duplicates.
   */
  async request(courseId: string, studentId: string, requestedBy: string) {
    return prisma.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId, studentId } },
      create: { courseId, studentId, requestedBy, status: "pending" },
      update: {
        status: "pending",
        requestedBy,
        requestedAt: new Date(),
        decidedBy: null,
        decidedAt: null,
        note: null,
      },
      include: enrollmentContext,
    });
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
  async listAll(status?: EnrollmentStatus, limit = 100, offset = 0) {
    return prisma.courseEnrollment.findMany({
      where: status ? { status } : {},
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
