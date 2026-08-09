import { Student as PrismaStudent } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Student = PrismaStudent;

type CreateStudentInput = {
  name: string;
  birthDate?: string | null;
  notes?: string | null;
};

export const StudentModel = {
  async create(input: CreateStudentInput): Promise<Student> {
    return prisma.student.create({
      data: {
        name: input.name.trim(),
        birthDate: input.birthDate ?? null,
        notes: input.notes ?? null,
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

  async listAll(): Promise<Student[]> {
    return prisma.student.findMany({ orderBy: { name: "asc" } });
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

  /** Student ids this parent may see photos of — the core visibility rule. */
  async visibleStudentIds(parentId: string): Promise<string[]> {
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });
    return links.map((link) => link.studentId);
  },
};
