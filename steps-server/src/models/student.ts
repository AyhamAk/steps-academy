import { Student as PrismaStudent } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Student = PrismaStudent;

type CreateStudentInput = {
  name: string;
  birthDate?: string | null;
  notes?: string | null;
  guardianPhone?: string | null;
};

export const StudentModel = {
  async create(input: CreateStudentInput): Promise<Student> {
    return prisma.student.create({
      data: {
        name: input.name.trim(),
        birthDate: input.birthDate ?? null,
        notes: input.notes ?? null,
        guardianPhone: input.guardianPhone ?? null,
      },
    });
  },

  async update(id: string, input: Partial<CreateStudentInput>): Promise<Student | null> {
    try {
      return await prisma.student.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.guardianPhone !== undefined ? { guardianPhone: input.guardianPhone } : {}),
        },
      });
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.student.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async findById(id: string): Promise<Student | null> {
    return prisma.student.findUnique({ where: { id } });
  },

  /** Names already on the roster, lowercased, for de-duplicating a paste import. */
  async existingNames(): Promise<Set<string>> {
    const students = await prisma.student.findMany({ select: { name: true } });
    return new Set(students.map((student) => student.name.trim().toLowerCase()));
  },

  async listAll(): Promise<Student[]> {
    return prisma.student.findMany({ orderBy: { name: "asc" } });
  },

  /**
   * Students with their guardians in a single query. The admin list used to
   * run one guardian lookup per student, which is fine for eight children and
   * ruinous for several hundred.
   */
  async listWithGuardians({
    search,
    limit = 50,
    offset = 0,
  }: { search?: string; limit?: number; offset?: number } = {}) {
    const where = search?.trim()
      ? { name: { contains: search.trim(), mode: "insensitive" as const } }
      : {};

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
        include: {
          guardians: {
            include: { parent: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { tags: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      total,
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        birthDate: student.birthDate,
        notes: student.notes,
        photoCount: student._count.tags,
        guardians: student.guardians.map((link) => link.parent),
      })),
    };
  },

  async listByIds(ids: string[]): Promise<Student[]> {
    if (ids.length === 0) return [];
    return prisma.student.findMany({ where: { id: { in: ids } } });
  },

  /** The children this parent is a guardian of. */
  async listByParent(parentId: string): Promise<Student[]> {
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    });
    return links.map((link) => link.student);
  },

  async listGuardians(studentId: string) {
    const links = await prisma.parentStudent.findMany({
      where: { studentId },
      include: { parent: true },
    });
    return links.map((link) => link.parent);
  },

  /** Idempotent — re-linking an existing guardian is a no-op, not an error. */
  async linkParent(parentId: string, studentId: string): Promise<void> {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId },
      update: {},
    });
  },

  async unlinkParent(parentId: string, studentId: string): Promise<void> {
    await prisma.parentStudent
      .delete({ where: { parentId_studentId: { parentId, studentId } } })
      .catch(() => undefined);
  },

  /** Dashboard counters. All COUNT queries — nothing is loaded into memory. */
  async adminCounts() {
    const [students, parents, unlinkedStudents, events, photos, pendingRequests, courses] =
      await Promise.all([
        prisma.student.count(),
        prisma.user.count({ where: { role: "parent" } }),
        prisma.student.count({ where: { guardians: { none: {} } } }),
        prisma.event.count(),
        prisma.photo.count(),
        prisma.courseEnrollment.count({ where: { status: "pending" } }),
        prisma.course.count({ where: { isActive: true } }),
      ]);
    return { students, parents, unlinkedStudents, events, photos, pendingRequests, courses };
  },

  /** Student ids this parent may see photos of — the core visibility rule. */
  async visibleStudentIds(parentId: string): Promise<string[]> {
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });
    return links.map((link) => link.studentId);
  },
};
